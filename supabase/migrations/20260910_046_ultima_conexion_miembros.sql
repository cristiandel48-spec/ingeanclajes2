-- Migración 046: Registrar última hora de conexión y actividad de usuarios
--
-- 1. Agrega la columna `ultima_conexion` a la tabla `app.memberships`.
-- 2. Inicializa con el último inicio de sesión de `auth.users` o fecha de creación.
-- 3. Crea la función `app.registrar_actividad()` para que el cliente reporte heartbeat periódico de forma segura.

alter table app.memberships
  add column if not exists ultima_conexion timestamptz;

comment on column app.memberships.ultima_conexion is
  'Fecha y hora de la última interacción o inicio de sesión en el ERP.';

-- Inicializar con el último acceso registrado en auth.users o la fecha de creación
update app.memberships m
   set ultima_conexion = coalesce(m.ultima_conexion, u.last_sign_in_at, m.created_at)
  from auth.users u
 where m.user_id = u.id;

-- Función segura para registrar actividad periódica del usuario activo
create or replace function app.registrar_actividad()
returns timestamptz
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_ahora timestamptz := now();
begin
  if auth.uid() is not null then
    update app.memberships
       set ultima_conexion = v_ahora
     where user_id = auth.uid();
  end if;
  return v_ahora;
end;
$$;

revoke execute on function app.registrar_actividad() from public, anon;
grant execute on function app.registrar_actividad() to authenticated, service_role;
