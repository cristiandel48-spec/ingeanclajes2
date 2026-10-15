-- ======================================================
-- MIGRACIÓN 058: DOCUMENTOS Y NOTAS DE EQUIPO (ESTILO NOTION)
-- Espacio colaborativo de documentación interactiva de obras,
-- proyectos, subpáginas y checklists compartidos con el equipo.
-- ======================================================

create table if not exists app.documentos_equipo (
  tenant_id            uuid not null references app.tenants(id) on delete cascade,
  id                   text not null,
  titulo               text not null default 'Sin título',
  icono                text not null default '📄',
  obra_id              text,
  obra_nombre          text,
  responsable          text,
  favorito             boolean not null default false,
  fecha_creacion       text,
  fecha_actualizacion  text,
  enlaces              jsonb not null default '[]'::jsonb,
  bloques              jsonb not null default '[]'::jsonb,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  primary key (tenant_id, id)
);

comment on table app.documentos_equipo is
  'Documentos interactivos, notas de obra, subpáginas y checklists estilo Notion para el equipo.';

create index if not exists documentos_equipo_tenant_idx
  on app.documentos_equipo (tenant_id, updated_at desc);

alter table app.documentos_equipo enable row level security;

-- Políticas de acceso para todos los miembros de la empresa
drop policy if exists documentos_equipo_select on app.documentos_equipo;
create policy documentos_equipo_select on app.documentos_equipo
for select
using (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists documentos_equipo_insert on app.documentos_equipo;
create policy documentos_equipo_insert on app.documentos_equipo
for insert
with check (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists documentos_equipo_update on app.documentos_equipo;
create policy documentos_equipo_update on app.documentos_equipo
for update
using (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists documentos_equipo_delete on app.documentos_equipo;
create policy documentos_equipo_delete on app.documentos_equipo
for delete
using (tenant_id in (select app.current_user_tenant_ids()));
