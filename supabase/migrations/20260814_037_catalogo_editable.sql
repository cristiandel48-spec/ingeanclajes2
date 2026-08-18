-- El catalogo se edita desde la aplicacion.
--
-- La 035 creo la tabla y la dejo solo de lectura, porque la unica que escribia
-- era la funcion de WhatsApp -que entra con la clave de servicio y se salta
-- RLS-. Ahora los precios se cambian desde la pantalla, asi que hace falta
-- poder escribir.
--
-- QUIEN PUEDE: solo el administrador. Un precio mal puesto se va derecho a una
-- cotizacion y de ahi a un cliente; no es algo que deba poder cambiar quien
-- entra a registrar el avance de una obra.
--
-- Es idempotente: se puede volver a ejecutar sin error.

drop policy if exists catalogo_admin_insert on app.catalogo_items;
create policy catalogo_admin_insert on app.catalogo_items
for insert
with check (
  tenant_id in (select app.current_user_tenant_ids())
  and app.es_admin(tenant_id)
);

drop policy if exists catalogo_admin_update on app.catalogo_items;
create policy catalogo_admin_update on app.catalogo_items
for update
using (
  tenant_id in (select app.current_user_tenant_ids())
  and app.es_admin(tenant_id)
)
with check (
  tenant_id in (select app.current_user_tenant_ids())
  and app.es_admin(tenant_id)
);

-- Borrar no se permite a nadie, ni al administrador: un servicio que se deja
-- de prestar se APAGA -disponible = false-, para que las cotizaciones viejas
-- sigan diciendo de donde salio su precio. Si de verdad hay que borrar una
-- fila, se hace desde el panel de Supabase y a conciencia.

-- Deja constancia de cuando se toco el precio por ultima vez.
create or replace function app.marcar_catalogo_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := now();
  return new;
end;
$$;

drop trigger if exists marcar_catalogo_actualizado on app.catalogo_items;
create trigger marcar_catalogo_actualizado
  before insert or update on app.catalogo_items
  for each row
  execute function app.marcar_catalogo_actualizado();
