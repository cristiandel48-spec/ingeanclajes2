-- Accesos por persona. La jefa (rol 'admin') crea las cuentas del equipo y
-- marca a que modulos entra cada quien.
--
-- Los modulos son los mismos identificadores del menu de la aplicacion
-- (dashboard, cotizacion, obras, contabilidad, nomina, ...). Ver
-- src/config/navigation.jsx: esa es la lista viva.
--
-- Regla: modulos = NULL significa "todos". Se usa para el rol 'admin', que
-- no se restringe. Un arreglo vacio significa "ninguno".
--
-- IMPORTANTE sobre el alcance: esto oculta modulos en la interfaz, que fue lo
-- pedido. NO es un blindaje a nivel de base de datos: las politicas RLS siguen
-- dando acceso por empresa, no por modulo, asi que alguien con conocimientos
-- tecnicos y una sesion valida podria consultar las tablas por fuera de la
-- aplicacion. Si mas adelante se quiere bloqueo real, hay que agregar
-- politicas por tabla que consulten app.usuario_tiene_modulo().
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.memberships add column if not exists nombre text;
alter table app.memberships add column if not exists email text;
alter table app.memberships add column if not exists modulos text[];
alter table app.memberships add column if not exists activo boolean not null default true;
alter table app.memberships add column if not exists updated_at timestamptz not null default now();

comment on column app.memberships.modulos is
  'Identificadores del menu a los que entra esta persona. NULL = todos (rol admin).';
comment on column app.memberships.activo is
  'Permite quitar el acceso sin borrar la fila ni perder el historial.';

-- Para poder administrar el equipo hay que ver a los companeros de empresa.
-- La politica anterior solo dejaba ver la fila propia.
drop policy if exists memberships_select_own on app.memberships;
drop policy if exists memberships_select_tenant on app.memberships;
create policy memberships_select_tenant on app.memberships
for select
using (tenant_id in (select app.current_user_tenant_ids()));

-- Escribir membresias sigue siendo exclusivo de service_role: lo hace la
-- funcion de borde gestionar-usuarios, que antes comprueba que quien llama
-- sea admin de esa empresa. Sin politicas de insert/update/delete, el cliente
-- con anon key no puede tocarlas.

-- Responde si una persona tiene acceso a un modulo. Queda disponible desde ya
-- para cuando se quiera pasar al bloqueo real por tabla.
create or replace function app.usuario_tiene_modulo(p_tenant_id uuid, p_modulo text)
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
      and m.tenant_id = p_tenant_id
      and m.activo
      and (m.modulos is null or p_modulo = any(m.modulos))
  );
$$;

drop trigger if exists memberships_updated_at on app.memberships;
create trigger memberships_updated_at before update on app.memberships
for each row execute function app.set_updated_at();

-- El correo de quien ya existe se rellena desde auth.users para que la
-- pantalla de usuarios no salga vacia la primera vez.
update app.memberships m
set email = u.email
from auth.users u
where u.id = m.user_id
  and m.email is null;

-- Comprobacion
select m.email, m.role, m.activo, m.modulos
from app.memberships m
order by m.created_at;
