-- ======================================================
-- MIGRACIÓN 043: TABLA DE ÓRDENES DE COMPRA
-- Módulo de Órdenes de Compra con Aprobación de María Camila Sepúlveda
-- y conexión directa con Obras y Causación / Proveedores
-- ======================================================

create table if not exists app.ordenes_compra (
  tenant_id                 uuid not null references app.tenants(id) on delete cascade,
  id                        text not null,
  fecha                     text,
  fecha_entrega_esperada    text,
  proveedor_id              text,
  proveedor_nombre          text,
  solicitante               text,
  comprador                 text,
  obra_id                   text,
  obra_nombre               text,
  documento_origen          text,
  items                     jsonb not null default '[]'::jsonb,
  subtotal                  numeric(14,2) default 0,
  iva                       numeric(14,2) default 0,
  total                     numeric(14,2) default 0,
  estado_aprobacion         text not null default 'Pendiente',
  aprobado_por              text,
  aprobado_en               text,
  motivo_rechazo            text,
  estado_facturacion        text not null default 'Nada por facturar',
  factura_vinculada_id      text,
  num_factura_proveedor     text,
  observaciones             text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  primary key (tenant_id, id)
);

comment on table app.ordenes_compra is
  'Órdenes de compra vinculadas a obras con flujo de aprobación por María Camila Sepúlveda.';

-- Habilitar seguridad por fila (Row Level Security)
alter table app.ordenes_compra enable row level security;

-- Políticas de acceso multi-tenant
drop policy if exists ordenes_compra_tenant_select on app.ordenes_compra;
create policy ordenes_compra_tenant_select on app.ordenes_compra
for select
using (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists ordenes_compra_tenant_insert on app.ordenes_compra;
create policy ordenes_compra_tenant_insert on app.ordenes_compra
for insert
with check (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists ordenes_compra_tenant_update on app.ordenes_compra;
create policy ordenes_compra_tenant_update on app.ordenes_compra
for update
using (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists ordenes_compra_tenant_delete on app.ordenes_compra;
create policy ordenes_compra_tenant_delete on app.ordenes_compra
for delete
using (tenant_id in (select app.current_user_tenant_ids()));

-- Índices de rendimiento
create index if not exists idx_ordenes_compra_tenant_obra on app.ordenes_compra (tenant_id, obra_id);
create index if not exists idx_ordenes_compra_tenant_aprobacion on app.ordenes_compra (tenant_id, estado_aprobacion);
