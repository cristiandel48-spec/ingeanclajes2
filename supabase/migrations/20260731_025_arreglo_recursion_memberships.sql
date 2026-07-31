-- ARREGLA "stack depth limit exceeded" al iniciar sesion.
--
-- La migracion 024 cambio la politica de lectura de app.memberships para que
-- cada quien pudiera ver a sus companeros de empresa:
--
--   using (tenant_id in (select app.current_user_tenant_ids()))
--
-- pero app.current_user_tenant_ids() consulta app.memberships, y esa consulta
-- vuelve a aplicar la politica, que vuelve a llamar a la funcion. Recursion
-- infinita: Postgres la corta con "stack depth limit exceeded" y la aplicacion
-- lo mostraba como "tu cuenta no tiene acceso".
--
-- La funcion pasa a SECURITY DEFINER: corre con los permisos de su dueno, asi
-- que lee app.memberships sin aplicar RLS y la recursion se rompe. Sigue
-- devolviendo unicamente los tenants de quien llama (auth.uid()), asi que no
-- abre nada que antes estuviera cerrado. Es el patron recomendado por Supabase
-- para funciones usadas dentro de politicas.
--
-- Es idempotente: se puede volver a ejecutar sin error.

create or replace function app.current_user_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = app, public
as $$
  select m.tenant_id
  from app.memberships m
  where m.user_id = auth.uid();
$$;

-- La politica de 024 se deja tal cual: con la funcion arreglada ya no recursa.
drop policy if exists memberships_select_own on app.memberships;
drop policy if exists memberships_select_tenant on app.memberships;
create policy memberships_select_tenant on app.memberships
for select
using (tenant_id in (select app.current_user_tenant_ids()));

-- Comprobacion: si esto devuelve filas sin error, quedo resuelto.
select m.email, m.role, m.activo, m.modulos
from app.memberships m
order by m.created_at;
