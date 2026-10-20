-- Migracion 065: el numero de cotizacion (C-26120) no se repite.
--
-- El numero lo calcula el navegador como «el mayor que conozco + 1». Con dos
-- personas cotizando a la vez, o una pestaña abierta desde hace horas, los dos
-- sacaban el mismo y dos clientes recibian el mismo consecutivo.
--
-- Ahora, al INSERTAR una cotizacion nueva, si su numero ya lo tiene otra de
-- la misma empresa, la base le asigna el siguiente con
-- app.siguiente_numero_cotizacion (el mismo cerrojo que usa la entrada por
-- WhatsApp). La aplicacion recibe el numero que quedo y lo muestra.
--
-- Una cotizacion que ya existe no se renumera nunca: los numeros que ya se
-- entregaron a un cliente se quedan como estan, aunque hubiera repetidos de
-- antes.
--
-- El id interno (COT-001) lo protege la aplicacion: los registros nuevos se
-- insertan en vez de hacer upsert, y si el id esta ocupado se busca el
-- siguiente libre (src/lib/backend/dataService.js, insertMany).
--
-- Es idempotente: se puede volver a ejecutar sin error.

create or replace function app.asignar_numero_cotizacion()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
begin
  if new.numero is null or upper(trim(new.numero)) !~ '^C\s*-?\s*\d+$' then
    return new;
  end if;

  -- La aplicacion guarda con upsert: una cotizacion que ya existe llega
  -- primero como INSERT. Esa no se toca.
  if exists (
    select 1 from app.cotizaciones c
     where c.tenant_id = new.tenant_id and c.id = new.id
  ) then
    return new;
  end if;

  -- Mismo cerrojo que siguiente_numero_cotizacion: dos cotizaciones nuevas al
  -- mismo tiempo se atienden una detras de otra.
  perform pg_advisory_xact_lock(hashtext(new.tenant_id::text || ':cotizacion'));

  if exists (
    select 1 from app.cotizaciones c
     where c.tenant_id = new.tenant_id
       and upper(regexp_replace(c.numero, '\s', '', 'g')) = upper(regexp_replace(new.numero, '\s', '', 'g'))
  ) then
    new.numero := app.siguiente_numero_cotizacion(new.tenant_id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_asignar_numero_cotizacion on app.cotizaciones;
create trigger trg_asignar_numero_cotizacion
before insert on app.cotizaciones
for each row execute function app.asignar_numero_cotizacion();

-- El consecutivo no se le da a quien no tiene sesion (la migracion 051 lo
-- habia abierto a anon). Lo usan la aplicacion y la funcion de WhatsApp.
revoke execute on function app.siguiente_numero_cotizacion(uuid) from public, anon;
grant execute on function app.siguiente_numero_cotizacion(uuid) to authenticated, service_role;

-- Comprobacion: numeros de cotizacion repetidos que ya existian. No se
-- cambian, pero conviene saber cuales son.
select upper(regexp_replace(numero, '\s', '', 'g')) as numero, count(*) as veces, string_agg(id, ', ') as ids
  from app.cotizaciones
 where numero is not null
 group by 1
having count(*) > 1
 order by 1;
