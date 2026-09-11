-- ── Soporte e Incidencias en Tiempo Real ─────────────────────────────────────
-- Permite a usuarios y administradores comunicarse en vivo para reportar y
-- resolver problemas de obra, cotizaciones y dudas técnicas.

create table if not exists app.soporte_tickets (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references app.tenants(id) on delete cascade,
  numero          serial,
  usuario_id      uuid references auth.users(id) on delete set null,
  usuario_nombre  text not null default 'Usuario',
  usuario_email   text default '',
  asunto          text not null,
  obra_id         text,
  obra_nombre     text,
  prioridad       text not null default 'media', -- 'baja' | 'media' | 'alta' | 'urgente'
  estado          text not null default 'pendiente', -- 'pendiente' | 'en_curso' | 'resuelto'
  ultimo_mensaje  text default '',
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

comment on table app.soporte_tickets is
  'Casos y tickets de incidencias abiertas por usuarios o clientes para Ingeanclajes.';

create index if not exists soporte_tickets_tenant_estado
  on app.soporte_tickets (tenant_id, estado, actualizado_en desc);

create index if not exists soporte_tickets_usuario
  on app.soporte_tickets (tenant_id, usuario_id, creado_en desc);

-- ── Mensajes del Chat ────────────────────────────────────────────────────────
create table if not exists app.soporte_mensajes (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references app.tenants(id) on delete cascade,
  ticket_id       uuid not null references app.soporte_tickets(id) on delete cascade,
  remitente_id    uuid references auth.users(id) on delete set null,
  remitente_nombre text not null default 'Usuario',
  remitente_rol   text default 'usuario',
  es_admin        boolean not null default false,
  texto           text not null,
  adjunto_url     text,
  leido           boolean not null default false,
  creado_en       timestamptz not null default now()
);

comment on table app.soporte_mensajes is
  'Historial de mensajes de chat en tiempo real para cada ticket de soporte.';

create index if not exists soporte_mensajes_ticket_idx
  on app.soporte_mensajes (tenant_id, ticket_id, creado_en asc);

-- ── Row Level Security (RLS) ────────────────────────────────────────────────
alter table app.soporte_tickets enable row level security;
alter table app.soporte_mensajes enable row level security;

-- Políticas para soporte_tickets
drop policy if exists soporte_tickets_select on app.soporte_tickets;
create policy soporte_tickets_select on app.soporte_tickets
for select
using (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists soporte_tickets_insert on app.soporte_tickets;
create policy soporte_tickets_insert on app.soporte_tickets
for insert
with check (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists soporte_tickets_update on app.soporte_tickets;
create policy soporte_tickets_update on app.soporte_tickets
for update
using (tenant_id in (select app.current_user_tenant_ids()));

-- Políticas para soporte_mensajes
drop policy if exists soporte_mensajes_select on app.soporte_mensajes;
create policy soporte_mensajes_select on app.soporte_mensajes
for select
using (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists soporte_mensajes_insert on app.soporte_mensajes;
create policy soporte_mensajes_insert on app.soporte_mensajes
for insert
with check (tenant_id in (select app.current_user_tenant_ids()));

-- ── Actualización automática de actualizado_en y ultimo_mensaje ──────────────
create or replace function app.al_insertar_soporte_mensaje()
returns trigger
language plpgsql
security definer
as $$
begin
  update app.soporte_tickets
     set actualizado_en = new.creado_en,
         ultimo_mensaje = new.texto
   where id = new.ticket_id;
  return new;
end;
$$;

drop trigger if exists trg_soporte_mensaje_insert on app.soporte_mensajes;
create trigger trg_soporte_mensaje_insert
  after insert on app.soporte_mensajes
  for each row execute function app.al_insertar_soporte_mensaje();
