create table if not exists app.nominas_generadas (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  mes text,
  corte text,
  label text,
  fecha_inicio date,
  fecha_fin date,
  dias_referencia integer,
  generado_en timestamptz not null default now(),
  totals jsonb not null default '{}'::jsonb,
  registros jsonb not null default '[]'::jsonb,
  registros_banco jsonb not null default '[]'::jsonb,
  plano_banco text,
  archivo_banco text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index if not exists idx_nominas_generadas_periodo on app.nominas_generadas(tenant_id, mes, corte);
create index if not exists idx_nominas_generadas_generado_en on app.nominas_generadas(tenant_id, generado_en desc);

alter table app.nominas_generadas enable row level security;

drop trigger if exists nominas_generadas_updated_at on app.nominas_generadas;
create trigger nominas_generadas_updated_at before update on app.nominas_generadas
for each row execute procedure app.set_updated_at();

drop policy if exists nominas_generadas_tenant_all on app.nominas_generadas;
create policy nominas_generadas_tenant_all on app.nominas_generadas
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));
