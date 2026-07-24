-- 20260413_012_cxp_tributos.sql
-- Agrega campos tributarios a app.cuentas_por_pagar y app.proveedores

begin;

-- =========================
-- PROVEEDORES
-- =========================
alter table if exists app.proveedores
  add column if not exists responsable_iva boolean not null default true,
  add column if not exists regimen_tributario text,
  add column if not exists agente_reteiva boolean not null default false,
  add column if not exists autorretenedor_renta boolean not null default false,
  add column if not exists municipio_ica text,
  add column if not exists codigo_ica text;

-- =========================
-- CUENTAS POR PAGAR
-- =========================
alter table if exists app.cuentas_por_pagar
  add column if not exists tipo_operacion text,
  add column if not exists subtotal numeric(14,2) not null default 0,
  add column if not exists tarifa_iva numeric(7,4) not null default 0,
  add column if not exists valor_iva numeric(14,2) not null default 0,

  add column if not exists concepto_ret_fuente text,
  add column if not exists base_ret_fuente numeric(14,2) not null default 0,
  add column if not exists tarifa_ret_fuente numeric(7,4) not null default 0,
  add column if not exists valor_ret_fuente numeric(14,2) not null default 0,

  add column if not exists aplica_reteiva boolean not null default false,
  add column if not exists base_reteiva numeric(14,2) not null default 0,
  add column if not exists tarifa_reteiva numeric(7,4) not null default 0,
  add column if not exists valor_reteiva numeric(14,2) not null default 0,

  add column if not exists municipio_reteica text,
  add column if not exists actividad_ica text,
  add column if not exists codigo_ica text,
  add column if not exists base_reteica numeric(14,2) not null default 0,
  add column if not exists tarifa_reteica numeric(9,4) not null default 0,
  add column if not exists valor_reteica numeric(14,2) not null default 0,

  add column if not exists valor_bruto_factura numeric(14,2) not null default 0,
  add column if not exists valor_total_retenciones numeric(14,2) not null default 0,
  add column if not exists valor_total_pagar numeric(14,2) not null default 0,

  add column if not exists observacion_tributaria text;

-- =========================
-- CHECK CONSTRAINTS
-- PostgreSQL no soporta "add constraint if not exists"
-- por eso se hace con bloque DO
-- =========================

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cuentas_por_pagar_tipo_operacion_chk'
  ) then
    alter table app.cuentas_por_pagar
      add constraint cuentas_por_pagar_tipo_operacion_chk
      check (
        tipo_operacion is null
        or tipo_operacion in ('bien', 'servicio', 'honorario', 'arrendamiento', 'otro')
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cuentas_por_pagar_concepto_ret_fuente_chk'
  ) then
    alter table app.cuentas_por_pagar
      add constraint cuentas_por_pagar_concepto_ret_fuente_chk
      check (
        concepto_ret_fuente is null
        or concepto_ret_fuente in ('compras', 'servicios', 'honorarios', 'comisiones', 'arrendamientos', 'otros')
      );
  end if;
end $$;

-- =========================
-- ÍNDICES
-- =========================
create index if not exists idx_cuentas_por_pagar_fecha on app.cuentas_por_pagar(tenant_id, fecha);
create index if not exists idx_cuentas_por_pagar_fecha_vence on app.cuentas_por_pagar(tenant_id, fecha_vence);
create index if not exists idx_cuentas_por_pagar_proveedor on app.cuentas_por_pagar(tenant_id, proveedor_id);
create index if not exists idx_cuentas_por_pagar_obra on app.cuentas_por_pagar(tenant_id, obra_id);

-- =========================
-- TABLA DE PARAMETRIZACIÓN
-- =========================
create table if not exists app.config_retenciones (
  tenant_id uuid not null references app.tenants(id) on delete cascade,
  id text not null,
  tipo text not null,
  concepto text,
  municipio text,
  codigo_ica text,
  base_minima_uvt numeric(12,4),
  base_minima_pesos numeric(14,2),
  tarifa numeric(9,4) not null default 0,
  vigente_desde date not null,
  vigente_hasta date,
  activo boolean not null default true,
  fuente_normativa text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, id)
);

create index if not exists idx_config_retenciones_tipo on app.config_retenciones(tenant_id, tipo, activo);
create index if not exists idx_config_retenciones_municipio on app.config_retenciones(tenant_id, municipio, activo);

alter table app.config_retenciones enable row level security;

drop trigger if exists config_retenciones_updated_at on app.config_retenciones;
create trigger config_retenciones_updated_at
before update on app.config_retenciones
for each row execute procedure app.set_updated_at();

drop policy if exists config_retenciones_tenant_all on app.config_retenciones;
create policy config_retenciones_tenant_all on app.config_retenciones
for all
using (tenant_id in (select app.current_user_tenant_ids()))
with check (tenant_id in (select app.current_user_tenant_ids()));

commit;