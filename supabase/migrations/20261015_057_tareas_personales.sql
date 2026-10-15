-- ======================================================
-- MIGRACIÓN 057: TAREAS PERSONALES (LISTA DE CHEQUEO)
-- Lista de tareas diarias de cada usuario dentro del módulo
-- "Recordatorio de agendas y visitas en obra". Cada persona
-- ve y edita SOLO sus propias tareas.
-- ======================================================

create table if not exists app.tareas_personales (
  tenant_id      uuid not null references app.tenants(id) on delete cascade,
  id             text not null,
  -- Dueño de la tarea. Lo pone la base al insertar: el programa no lo envía,
  -- así nadie puede crear tareas a nombre de otro.
  usuario_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  texto          text not null default '',
  fecha          text,
  completada     boolean not null default false,
  completada_en  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (tenant_id, id)
);

comment on table app.tareas_personales is
  'Tareas diarias personales (tipo lista de chequeo) de cada usuario.';

create index if not exists tareas_personales_usuario
  on app.tareas_personales (tenant_id, usuario_id, updated_at);

alter table app.tareas_personales enable row level security;

-- Privacidad: además de pertenecer a la empresa, la fila tiene que ser tuya.
drop policy if exists tareas_personales_select on app.tareas_personales;
create policy tareas_personales_select on app.tareas_personales
for select
using (
  tenant_id in (select app.current_user_tenant_ids())
  and usuario_id = (select auth.uid())
);

drop policy if exists tareas_personales_insert on app.tareas_personales;
create policy tareas_personales_insert on app.tareas_personales
for insert
with check (
  tenant_id in (select app.current_user_tenant_ids())
  and usuario_id = (select auth.uid())
);

drop policy if exists tareas_personales_update on app.tareas_personales;
create policy tareas_personales_update on app.tareas_personales
for update
using (
  tenant_id in (select app.current_user_tenant_ids())
  and usuario_id = (select auth.uid())
)
with check (usuario_id = (select auth.uid()));

drop policy if exists tareas_personales_delete on app.tareas_personales;
create policy tareas_personales_delete on app.tareas_personales
for delete
using (
  tenant_id in (select app.current_user_tenant_ids())
  and usuario_id = (select auth.uid())
);
