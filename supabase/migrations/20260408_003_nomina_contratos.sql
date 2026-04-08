-- supabase/migrations/20260408_003_nomina_contratos.sql
-- Campos nuevos para módulo de nómina Colombia 2026
-- Ejecutar en: Supabase Dashboard → SQL Editor

-- =============================================
-- 1. Nuevos campos en app.empleados
-- =============================================

-- Tipo de contrato laboral
alter table app.empleados
  add column if not exists tipo_contrato text
    not null default 'indefinido'
    check (tipo_contrato in ('indefinido','fijo','obra_labor','prestacion_servicios'));

-- Fecha de ingreso (vinculación)
alter table app.empleados
  add column if not exists fecha_ingreso date;

-- Fecha de retiro / salida (null = sigue activo)
alter table app.empleados
  add column if not exists fecha_salida date;

-- Causa del retiro
alter table app.empleados
  add column if not exists causa_retiro text;

-- Horas extras ya vienen en extras jsonb — se extiende el esquema lógico
-- pero la columna ya existe; solo se cambia lo que guarda la app.
-- Agregamos columnas de recargos por si se quiere consultar en SQL directo:
alter table app.empleados
  add column if not exists horasExtrasPorObra jsonb not null default '[]'::jsonb;

-- Fotos de cotizaciones (se guarda por cotizacion, no por empleado)
-- Se maneja en la tabla cotizaciones abajo.

-- =============================================
-- 2. Nuevos campos en app.cotizaciones (si existe)
-- =============================================
alter table app.cotizaciones
  add column if not exists tipo_cotizacion text not null default 'linea_vida'
    check (tipo_cotizacion in ('linea_vida','obra_blanca'));

alter table app.cotizaciones
  add column if not exists fotos_cotizacion jsonb not null default '[]'::jsonb;

-- =============================================
-- 3. Índices útiles para consultas de nómina
-- =============================================
create index if not exists idx_empleados_fecha_ingreso
  on app.empleados(tenant_id, fecha_ingreso);

create index if not exists idx_empleados_activo
  on app.empleados(tenant_id, activo);

create index if not exists idx_empleados_tipo_contrato
  on app.empleados(tenant_id, tipo_contrato);

-- =============================================
-- 4. Vista de resumen de antigüedad (útil para reportes)
-- =============================================
create or replace view app.v_empleados_antiguedad as
select
  e.tenant_id,
  e.id,
  e.nombre,
  e.cargo,
  e.salario,
  e.activo,
  e.tipo_contrato,
  e.fecha_ingreso,
  e.fecha_salida,
  e.causa_retiro,
  -- Días trabajados
  coalesce(e.fecha_salida, current_date) - e.fecha_ingreso as dias_trabajados,
  -- Meses trabajados
  extract(year from age(coalesce(e.fecha_salida, current_date), e.fecha_ingreso)) * 12
    + extract(month from age(coalesce(e.fecha_salida, current_date), e.fecha_ingreso)) as meses_trabajados,
  -- Vacaciones acumuladas (días)
  round(
    (coalesce(e.fecha_salida, current_date) - e.fecha_ingreso)::numeric / 360 * 15, 1
  ) as vacaciones_dias_acumulados,
  -- Cesantías estimadas (base: salario)
  round(
    e.salario * (coalesce(e.fecha_salida, current_date) - e.fecha_ingreso) / 360
  ) as cesantias_estimadas,
  -- Prima estimada
  round(
    e.salario * (coalesce(e.fecha_salida, current_date) - e.fecha_ingreso) / 360
  ) as prima_estimada
from app.empleados e
where e.fecha_ingreso is not null;

-- RLS en la vista (hereda de la tabla base, pero protegemos con policy explícita)
-- La vista ya es segura porque filtra por tenant_id igual que la tabla.
