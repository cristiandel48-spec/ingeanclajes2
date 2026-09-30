-- ── Migración 051: Restaurar Permisos de Ejecución RLS y Corregir Warnings ──
-- 1. Permite que todas las tablas y políticas RLS puedan evaluar current_user_tenant_ids sin error 42501.
-- 2. Asegura que los triggers de soporte funcionen como SECURITY INVOKER.
-- 3. Habilita Realtime en Supabase para las tablas de chat y tickets.

-- Permiso de uso en el esquema app
grant usage on schema app to postgres, anon, authenticated, service_role;

-- 1. Restaurar permisos de ejecución para funciones esenciales de RLS
-- (Obligatorio para que los usuarios autenticados y anónimos puedan consultar las tablas)
grant execute on function app.current_user_tenant_ids() to postgres, anon, authenticated, service_role, public;
grant execute on function app.es_admin(uuid) to postgres, anon, authenticated, service_role, public;
grant execute on function app.siguiente_numero_cotizacion(uuid) to postgres, anon, authenticated, service_role, public;
grant execute on function app.registrar_actividad() to postgres, anon, authenticated, service_role, public;

-- 2. Función de trigger de soporte como SECURITY INVOKER con search_path explícito
create or replace function app.al_insertar_soporte_mensaje()
returns trigger
language plpgsql
security invoker
set search_path = app, public, pg_temp
as $$
begin
  update app.soporte_tickets
     set actualizado_en = new.creado_en,
         ultimo_mensaje = new.texto
   where id = new.ticket_id;
  return new;
end;
$$;

grant execute on function app.al_insertar_soporte_mensaje() to postgres, anon, authenticated, service_role, public;

-- 3. Habilitar replicación Realtime de Supabase para soporte
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'app' and tablename = 'soporte_mensajes'
  ) then
    alter publication supabase_realtime add table app.soporte_mensajes;
  end if;

  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'app' and tablename = 'soporte_tickets'
  ) then
    alter publication supabase_realtime add table app.soporte_tickets;
  end if;
exception
  when others then null;
end $$;
