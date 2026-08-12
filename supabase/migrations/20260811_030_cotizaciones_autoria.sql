-- Quien creo cada cotizacion y quien fue el ultimo en tocarla.
--
-- POR QUE EN LA BASE Y NO EN LA APLICACION: si lo rellenara la pantalla al
-- guardar, bastaria con un guardado que no pase por ahi -una correccion a
-- mano, una version vieja de la aplicacion abierta en otra maquina- para que
-- el dato se perdiera o quedara mal. Puesto como disparador, se escribe
-- siempre, venga de donde venga el cambio, y no se puede falsear desde el
-- cliente: el usuario sale de la sesion, no de lo que mande la pantalla.
--
-- ALCANCE: solo el ultimo cambio, que es lo que se pidio. Si dos personas
-- editan la misma cotizacion, queda la segunda y la primera no se guarda en
-- ningun sitio. Para tener toda la vida del documento haria falta una tabla
-- de historial aparte; esto no la estorba, se puede agregar despues.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.cotizaciones
  add column if not exists creado_por             uuid,
  add column if not exists creado_por_nombre      text,
  add column if not exists creado_en              timestamptz,
  add column if not exists modificado_por         uuid,
  add column if not exists modificado_por_nombre  text,
  add column if not exists modificado_en          timestamptz;

comment on column app.cotizaciones.creado_por_nombre is
  'El nombre se guarda ademas del identificador: si la persona sale de la '
  'empresa y se borra su cuenta, la cotizacion sigue diciendo quien la hizo.';

-- Rellena la autoria en cada insercion y en cada cambio.
create or replace function app.marcar_autoria_cotizacion()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_nombre text;
begin
  -- El nombre de quien esta guardando, tomado de su ficha en la empresa.
  select coalesce(nullif(m.nombre, ''), m.email)
    into v_nombre
    from app.memberships m
   where m.user_id = auth.uid()
     and m.tenant_id = new.tenant_id
   limit 1;

  if tg_op = 'INSERT' then
    new.creado_por        := auth.uid();
    new.creado_por_nombre := v_nombre;
    new.creado_en         := now();
  else
    -- Quien la creo no cambia nunca, aunque la editen otros mil veces.
    new.creado_por        := old.creado_por;
    new.creado_por_nombre := old.creado_por_nombre;
    new.creado_en         := old.creado_en;
  end if;

  new.modificado_por        := auth.uid();
  new.modificado_por_nombre := v_nombre;
  new.modificado_en         := now();

  return new;
end;
$$;

drop trigger if exists trg_autoria_cotizacion on app.cotizaciones;
create trigger trg_autoria_cotizacion
before insert or update on app.cotizaciones
for each row execute function app.marcar_autoria_cotizacion();

-- Las cotizaciones que ya estaban se quedan sin autor: no hay de donde
-- sacarlo, nadie lo estaba guardando. Se les pone la fecha de su ultimo
-- cambio para que al menos se ordenen bien, y el nombre queda vacio, que en
-- la pantalla se lee como "no registrado".
update app.cotizaciones
   set modificado_en = coalesce(modificado_en, updated_at)
 where modificado_en is null;
