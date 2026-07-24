-- 20260414_013_contabilidad.sql
-- Ajustes de persistencia CxP/proveedores y modulo contable base

begin;

alter table if exists app.proveedores
  add column if not exists banco text,
  add column if not exists numero_cuenta text,
  add column if not exists categoria text;

alter table if exists app.cuentas_por_pagar
  add column if not exists saldo_pendiente_actual numeric(14,2) not null default 0,
  add column if not exists monto_pagado numeric(14,2) not null default 0,
  add column if not exists pagos_historial jsonb not null default '[]'::jsonb,
  add column if not exists fecha_pago date;

create table if not exists app.contabilidad_config (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  razon_social text,
  nit text,
  marco_normativo text,
  marco_normativo_label text,
  moneda text,
  uvt numeric(14,2) not null default 0,
  auto_cxp boolean not null default true,
  cuenta_banco text,
  cuenta_caja text,
  cuenta_clientes text,
  cuenta_proveedores text,
  cuenta_iva_descontable text,
  cuenta_iva_generado text,
  cuenta_retefuente text,
  cuenta_reteiva text,
  cuenta_reteica text,
  cuenta_ingreso_servicios text,
  cuenta_costo_materiales text,
  cuenta_costo_servicios_obra text,
  cuenta_gasto_servicios text,
  cuenta_gasto_honorarios text,
  cuenta_gasto_arrendamiento text,
  cuenta_gasto_diverso text,
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists app.plan_cuentas (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  codigo text not null,
  nombre text not null,
  naturaleza text not null,
  grupo_reporte text not null,
  categoria_estado text,
  permite_movimientos boolean not null default true,
  requiere_tercero boolean not null default false,
  requiere_centro_costo boolean not null default false,
  cuenta_padre text,
  activo boolean not null default true,
  descripcion text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create table if not exists app.asientos_contables (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  consecutivo text,
  fecha date,
  periodo text,
  tipo_comprobante text,
  estado text not null default 'Contabilizado',
  automatico boolean not null default false,
  origen text,
  origen_ref text,
  descripcion text,
  tercero_id text,
  tercero_nombre text,
  soporte text,
  lineas jsonb not null default '[]'::jsonb,
  total_debito numeric(14,2) not null default 0,
  total_credito numeric(14,2) not null default 0,
  diferencia numeric(14,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plan_cuentas_naturaleza_chk'
  ) then
    alter table app.plan_cuentas
      add constraint plan_cuentas_naturaleza_chk
      check (naturaleza in ('debito', 'credito'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'plan_cuentas_grupo_reporte_chk'
  ) then
    alter table app.plan_cuentas
      add constraint plan_cuentas_grupo_reporte_chk
      check (grupo_reporte in ('activo', 'pasivo', 'patrimonio', 'ingreso', 'costo', 'gasto'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'asientos_contables_estado_chk'
  ) then
    alter table app.asientos_contables
      add constraint asientos_contables_estado_chk
      check (estado in ('Borrador', 'Contabilizado', 'Anulado'));
  end if;
end $$;

create index if not exists idx_plan_cuentas_codigo
  on app.plan_cuentas(tenant_id, codigo);

create index if not exists idx_plan_cuentas_grupo
  on app.plan_cuentas(tenant_id, grupo_reporte, activo);

create index if not exists idx_asientos_contables_fecha
  on app.asientos_contables(tenant_id, fecha);

create index if not exists idx_asientos_contables_origen
  on app.asientos_contables(tenant_id, origen, origen_ref);

alter table app.contabilidad_config enable row level security;
alter table app.plan_cuentas enable row level security;
alter table app.asientos_contables enable row level security;

drop trigger if exists contabilidad_config_updated_at on app.contabilidad_config;
create trigger contabilidad_config_updated_at
before update on app.contabilidad_config
for each row execute procedure app.set_updated_at();

drop trigger if exists plan_cuentas_updated_at on app.plan_cuentas;
create trigger plan_cuentas_updated_at
before update on app.plan_cuentas
for each row execute procedure app.set_updated_at();

drop trigger if exists asientos_contables_updated_at on app.asientos_contables;
create trigger asientos_contables_updated_at
before update on app.asientos_contables
for each row execute procedure app.set_updated_at();

drop policy if exists contabilidad_config_tenant_all on app.contabilidad_config;
create policy contabilidad_config_tenant_all on app.contabilidad_config
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists plan_cuentas_tenant_all on app.plan_cuentas;
create policy plan_cuentas_tenant_all on app.plan_cuentas
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists asientos_contables_tenant_all on app.asientos_contables;
create policy asientos_contables_tenant_all on app.asientos_contables
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

commit;
