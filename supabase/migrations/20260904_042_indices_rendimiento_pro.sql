-- supabase/migrations/20260904_042_indices_rendimiento_pro.sql
-- Optimizaciones de rendimiento para Supabase Pro (Plan $25/mes)
--
-- Al tener el plan Pro, las consultas aprovechan mejor la memoria RAM y el pooler Supavisor.
-- Estos índices compuestos B-Tree permiten que `list()` en dataService.js cargue en milisegundos:
-- evitan el 'Sort' secuencial en disco/memoria al filtrar por `tenant_id` y ordenar por `updated_at`.

-- 1. Índices compuestos para carga de tablas maestras y catálogos
create index if not exists idx_clientes_tenant_updated on app.clientes(tenant_id, updated_at desc);
create index if not exists idx_empleados_tenant_updated on app.empleados(tenant_id, updated_at desc);
create index if not exists idx_cargos_tenant_updated on app.cargos(tenant_id, updated_at desc);
create index if not exists idx_proveedores_tenant_updated on app.proveedores(tenant_id, updated_at desc);
create index if not exists idx_obras_tenant_updated on app.obras(tenant_id, updated_at desc);
create index if not exists idx_cotizaciones_tenant_updated on app.cotizaciones(tenant_id, updated_at desc);
create index if not exists idx_certificaciones_tenant_updated on app.certificaciones(tenant_id, updated_at desc);
create index if not exists idx_informes_tenant_updated on app.informes(tenant_id, updated_at desc);
create index if not exists idx_cuentas_tenant_updated on app.cuentas_por_pagar(tenant_id, updated_at desc);
create index if not exists idx_pagos_tenant_updated on app.pagos(tenant_id, updated_at desc);
create index if not exists idx_horarios_tenant_updated on app.horarios(tenant_id, updated_at desc);
create index if not exists idx_catalogo_tenant_updated on app.catalogo_items(tenant_id, updated_at desc);
create index if not exists idx_empresa_config_tenant_updated on app.empresa_config(tenant_id, updated_at desc);
create index if not exists idx_contabilidad_config_tenant_updated on app.contabilidad_config(tenant_id, updated_at desc);
create index if not exists idx_plan_cuentas_tenant_updated on app.plan_cuentas(tenant_id, updated_at desc);
create index if not exists idx_asientos_tenant_updated on app.asientos_contables(tenant_id, updated_at desc);
create index if not exists idx_nominas_tenant_updated on app.nominas_generadas(tenant_id, updated_at desc);

-- 2. Índices de búsqueda operativa frecuente
create index if not exists idx_cotizaciones_numero on app.cotizaciones(tenant_id, numero);
create index if not exists idx_obras_fechas on app.obras(tenant_id, fecha_inicio, fecha_fin);
create index if not exists idx_informes_tipo_fecha on app.informes(tenant_id, tipo, fecha desc);
create index if not exists idx_asientos_fecha_origen on app.asientos_contables(tenant_id, fecha desc, origen);
create index if not exists idx_pagos_fecha_cuenta on app.pagos(tenant_id, fecha desc, cuenta_por_pagar_id);

-- 3. Si la columna CUFE no existe en cuentas_por_pagar, se añade de forma segura
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'app' and table_name = 'cuentas_por_pagar' and column_name = 'cufe'
  ) then
    alter table app.cuentas_por_pagar add column cufe text;
  end if;

  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'app' and table_name = 'cuentas_por_pagar' and column_name = 'eventos_radian'
  ) then
    alter table app.cuentas_por_pagar add column eventos_radian jsonb default '[]'::jsonb;
  end if;
end $$;

create index if not exists idx_cuentas_cufe on app.cuentas_por_pagar(tenant_id, cufe) where cufe is not null;
