-- Una obra entregada deja de editarse, salvo por un administrador.
--
-- POR QUE EN LA BASE Y NO SOLO EN LA PANTALLA: esconder el desplegable evita
-- el error humano, que es el riesgo de todos los dias, pero no impide nada.
-- Cualquiera con una sesion valida puede escribir la tabla por fuera de la
-- aplicacion, porque la unica politica que hay sobre app.obras deja hacer todo
-- a cualquier miembro de la empresa:
--
--   create policy obras_tenant_all on app.obras
--   for all using (tenant_id in (select app.current_user_tenant_ids()));
--
-- POR QUE UN DISPARADOR Y NO UNA POLITICA RLS: la aplicacion guarda por lotes
-- -un upsert con muchas obras a la vez-. Si la base RECHAZARA la fila
-- bloqueada, se caeria el lote entero y alguien que edito otra obra distinta
-- perderia su trabajo sin entender por que. Ya paso con «ON CONFLICT DO UPDATE
-- command cannot affect row a second time». Asi que el disparador no falla:
-- deja pasar la fila y le devuelve a los campos protegidos el valor que tenian.
--
-- QUE NO SE BLOQUEA: el cobro. A uno le siguen pagando despues de entregar, y
-- ese es justo el momento en que hay que poder registrar el abono. Por eso
-- `pagado` y `saldo` quedan libres. El estado ya no dice nada de la plata: como
-- va el cobro se deduce del saldo (ver src/lib/flujoObra.js).
--
-- Es idempotente: se puede volver a ejecutar sin error.

-- ── 1. Los datos que quedaron del modelo viejo ───────────────────────────────
-- «Pagado» era un estado de obra y se escribia encima del avance al saldar.
-- Se pasa a «Finalizado»: solo se saldaba lo ya entregado. El cobro no se
-- pierde, sigue en `saldo`.
update app.obras
   set estado = 'Finalizado'
 where estado = 'Pagado';

-- ── 2. Quien es administrador ────────────────────────────────────────────────
-- Mismo molde que app.current_user_tenant_ids().
create or replace function app.es_admin(p_tenant uuid)
returns boolean
language sql
stable
security definer
set search_path = app, public
as $$
  select exists (
    select 1
      from app.memberships m
     where m.user_id = auth.uid()
       and m.tenant_id = p_tenant
       and m.role = 'admin'
       and coalesce(m.activo, true)
  );
$$;

comment on function app.es_admin(uuid) is
  'Si quien esta haciendo el cambio es administrador de esa empresa. Se lee de '
  'la sesion (auth.uid()), no de lo que mande la aplicacion, asi que no se '
  'puede falsear desde el cliente.';

-- ── 3. El bloqueo ────────────────────────────────────────────────────────────
create or replace function app.proteger_obra_cerrada()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
begin
  -- Solo protege lo que YA estaba entregado. Cerrar una obra por primera vez
  -- -pasarla a Finalizado- es un cambio normal y no se estorba.
  if coalesce(old.estado, '') <> 'Finalizado' then
    return new;
  end if;

  if app.es_admin(old.tenant_id) then
    return new;
  end if;

  -- El trabajo, congelado.
  new.estado       := old.estado;
  new.avance       := old.avance;
  new.cliente      := old.cliente;
  new.nit          := old.nit;
  new.proyecto     := old.proyecto;
  new.ciudad       := old.ciudad;
  new.direccion    := old.direccion;
  new.total        := old.total;
  new.costos       := old.costos;
  new.fecha_inicio := old.fecha_inicio;
  new.fecha_fin    := old.fecha_fin;

  -- La plata NO se toca aqui: `pagado` y `saldo` siguen entrando, que para eso
  -- se separo el cobro del avance.

  return new;
end;
$$;

drop trigger if exists proteger_obra_cerrada on app.obras;
create trigger proteger_obra_cerrada
  before update on app.obras
  for each row
  execute function app.proteger_obra_cerrada();

comment on function app.proteger_obra_cerrada() is
  'Devuelve a su valor anterior los campos de una obra ya finalizada, salvo '
  'que quien guarde sea administrador. No lanza error a proposito: la '
  'aplicacion guarda por lotes y un error tumbaria el lote entero.';
