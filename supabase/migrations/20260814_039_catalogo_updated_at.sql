-- ARREGLO URGENTE: la aplicacion no cargaba.
--
--   column catalogo_items.updated_at does not exist
--
-- Todas las tablas que carga la aplicacion tienen `updated_at`, y el cargador
-- ordena por ella. La 035 creo catalogo_items con `actualizado_en`, que se
-- salio de ese patron sin ganar nada. Al registrar el catalogo como una
-- entidad mas, la consulta pedia una columna que no existia y se caia la carga
-- ENTERA: la aplicacion se quedaba sin datos, no solo sin catalogo.
--
-- Se renombra para que encaje con el resto. Es una tabla nueva y el unico que
-- usaba ese nombre era su propio disparador.
--
-- Es idempotente: si ya se renombro, no hace nada.

alter table app.catalogo_items
  rename column actualizado_en to updated_at;

-- El disparador escribia en el nombre viejo.
create or replace function app.marcar_catalogo_actualizado()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists marcar_catalogo_actualizado on app.catalogo_items;
create trigger marcar_catalogo_actualizado
  before insert or update on app.catalogo_items
  for each row
  execute function app.marcar_catalogo_actualizado();
