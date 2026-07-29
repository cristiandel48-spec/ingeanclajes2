-- ============================================================
--  DEJAR LA BASE LIMPIA PARA ENTREGAR AL CLIENTE
-- ============================================================
--
--  BORRA DATOS DE FORMA PERMANENTE. No se puede deshacer.
--
--  Antes de ejecutarlo:
--    1. Table Editor > cada tabla > boton Export > descarga el CSV,
--       o al menos de las tablas que te importen.
--    2. Ejecuta solo el PASO 1 y revisa las cantidades.
--    3. Si estas de acuerdo, ejecuta el PASO 2.
--
--  NO toca:
--    - app.tenants ni app.memberships  -> perderias el acceso
--    - app.plan_cuentas                -> es el plan contable, no un ejemplo
--    - app.contabilidad_config         -> es configuracion
--    - El catalogo de servicios y precios (vive en el codigo, no aqui)
-- ============================================================


-- ------------------------------------------------------------
-- PASO 1: ver que hay antes de borrar (no modifica nada)
-- ------------------------------------------------------------
select 'obras'              as tabla, count(*) from app.obras
union all select 'cotizaciones',        count(*) from app.cotizaciones
union all select 'clientes',            count(*) from app.clientes
union all select 'proveedores',         count(*) from app.proveedores
union all select 'empleados',           count(*) from app.empleados
union all select 'cargos',              count(*) from app.cargos
union all select 'pagos',               count(*) from app.pagos
union all select 'cuentas_por_pagar',   count(*) from app.cuentas_por_pagar
union all select 'certificaciones',     count(*) from app.certificaciones
union all select 'informes',            count(*) from app.informes
union all select 'horarios',            count(*) from app.horarios
union all select 'asientos_contables',  count(*) from app.asientos_contables
union all select 'nominas_generadas',   count(*) from app.nominas_generadas
union all select 'obra_empleados',      count(*) from app.obra_empleados
order by tabla;


-- ------------------------------------------------------------
-- PASO 2: borrar. Descomenta el bloque (quita el /* y el */)
--         solo cuando ya revisaste el paso 1.
--
-- El orden importa: primero las tablas que apuntan a obras y
-- empleados, si no Postgres rechaza el borrado por las llaves.
-- ------------------------------------------------------------
/*
begin;

delete from app.obra_empleados;
delete from app.nominas_generadas;
delete from app.asientos_contables;
delete from app.informes;
delete from app.certificaciones;
delete from app.horarios;
delete from app.pagos;
delete from app.cuentas_por_pagar;
delete from app.cotizaciones;
delete from app.obras;
delete from app.empleados;
delete from app.cargos;
delete from app.clientes;
delete from app.proveedores;

commit;
*/


-- ------------------------------------------------------------
-- PASO 3: comprobar que todo quedo en cero y que NO perdiste
--         el acceso (tenants y memberships deben seguir ahi).
-- ------------------------------------------------------------
-- select 'obras' as tabla, count(*) from app.obras
-- union all select 'cotizaciones', count(*) from app.cotizaciones
-- union all select 'empleados',    count(*) from app.empleados
-- union all select 'clientes',     count(*) from app.clientes
-- union all select 'ACCESO tenants',     count(*) from app.tenants
-- union all select 'ACCESO memberships', count(*) from app.memberships
-- order by tabla;
