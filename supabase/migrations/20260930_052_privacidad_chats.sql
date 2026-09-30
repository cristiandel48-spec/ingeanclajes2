-- ── Migración 052: Confidencialidad y Privacidad de Chats de Soporte ──────────
-- Agrega columnas explícitas de creador a app.soporte_tickets para garantizar
-- que las conversaciones entre usuarios sean estrictamente privadas.

alter table if exists app.soporte_tickets
  add column if not exists creador_id uuid references auth.users(id) on delete set null,
  add column if not exists creador_email text default '',
  add column if not exists creador_nombre text default '';

create index if not exists soporte_tickets_creador_idx
  on app.soporte_tickets (tenant_id, creador_id);

comment on column app.soporte_tickets.creador_id is
  'Identificador del usuario que inició la conversación de soporte.';
comment on column app.soporte_tickets.creador_email is
  'Correo del usuario que inició la conversación de soporte.';
comment on column app.soporte_tickets.creador_nombre is
  'Nombre del usuario que inició la conversación de soporte.';
