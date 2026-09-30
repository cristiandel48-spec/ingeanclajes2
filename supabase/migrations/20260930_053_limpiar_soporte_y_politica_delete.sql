-- ── Migración 053: Limpiar Soporte, Permisos y Política DELETE ──────────────────
-- 1. Vacía los mensajes y tickets anteriores para iniciar desde cero.
-- 2. Garantiza permisos de DELETE para usuarios y roles en soporte_tickets y soporte_mensajes.
-- 3. Agrega políticas RLS para DELETE.
-- 4. Asegura columnas de creador para privacidad.
-- 5. Configura Realtime de manera segura sin provocar error 42710.

-- 1. Vaciar tablas de mensajes y tickets
delete from app.soporte_mensajes;
delete from app.soporte_tickets;

-- 2. Asegurar columnas de creador si no existen y columna leido
alter table if exists app.soporte_tickets
  add column if not exists creador_id uuid references auth.users(id) on delete set null,
  add column if not exists creador_email text default '',
  add column if not exists creador_nombre text default '';

create index if not exists soporte_tickets_creador_idx
  on app.soporte_tickets (tenant_id, creador_id);

alter table if exists app.soporte_mensajes
  add column if not exists leido boolean not null default false;

create index if not exists soporte_mensajes_leido_idx
  on app.soporte_mensajes (tenant_id, ticket_id, leido);

-- 3. Permisos en el esquema app y tablas de soporte
grant usage on schema app to postgres, anon, authenticated, service_role;
grant select, insert, update, delete on app.soporte_tickets to postgres, anon, authenticated, service_role;
grant select, insert, update, delete on app.soporte_mensajes to postgres, anon, authenticated, service_role;

-- 4. Políticas RLS para DELETE y UPDATE (para marcar mensajes como leídos)
drop policy if exists soporte_tickets_delete on app.soporte_tickets;
create policy soporte_tickets_delete on app.soporte_tickets
for delete
using (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists soporte_mensajes_delete on app.soporte_mensajes;
create policy soporte_mensajes_delete on app.soporte_mensajes
for delete
using (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists soporte_mensajes_update on app.soporte_mensajes;
create policy soporte_mensajes_update on app.soporte_mensajes
for update
using (tenant_id in (select app.current_user_tenant_ids()));

-- 5. Permisos de funciones de RLS y triggers
grant execute on function app.current_user_tenant_ids() to postgres, anon, authenticated, service_role, public;
grant execute on function app.es_admin(uuid) to postgres, anon, authenticated, service_role, public;
grant execute on function app.siguiente_numero_cotizacion(uuid) to postgres, anon, authenticated, service_role, public;
grant execute on function app.registrar_actividad() to postgres, anon, authenticated, service_role, public;
grant execute on function app.al_insertar_soporte_mensaje() to postgres, anon, authenticated, service_role, public;

-- 6. Habilitar Realtime de manera segura (evita error 42710)
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
