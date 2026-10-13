-- ======================================================
-- MIGRACIÓN 056: TABLA DE AGENDA Y VISITAS TÉCNICAS
-- Módulo de visitas a obras, llamadas de seguimiento y comités
-- para María Camila Sepúlveda e Ingeanclajes S.A.S.
-- ======================================================

create table if not exists app.agenda (
  tenant_id                 uuid not null references app.tenants(id) on delete cascade,
  id                        text not null,
  tipo                      text not null default 'visita',
  titulo                    text,
  obra                      text,
  cliente                   text,
  ciudad                    text,
  fecha                     text,
  hora                      text,
  contacto                  text,
  telefono                  text,
  notas                     text,
  requerimiento_sst         text,
  link_reunion              text,
  estado                    text not null default 'pendiente',
  prioridad                 text not null default 'normal',
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  primary key (tenant_id, id)
);

comment on table app.agenda is
  'Agenda de visitas a obras, seguimiento telefónico y reuniones de coordinación.';

-- Habilitar seguridad por fila (Row Level Security)
alter table app.agenda enable row level security;

-- Políticas de acceso multi-tenant
drop policy if exists agenda_tenant_select on app.agenda;
create policy agenda_tenant_select on app.agenda
for select
using (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists agenda_tenant_insert on app.agenda;
create policy agenda_tenant_insert on app.agenda
for insert
with check (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists agenda_tenant_update on app.agenda;
create policy agenda_tenant_update on app.agenda
for update
using (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists agenda_tenant_delete on app.agenda;
create policy agenda_tenant_delete on app.agenda
for delete
using (tenant_id in (select app.current_user_tenant_ids()));
