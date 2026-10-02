-- 1. Actualizar cargos a mayúsculas en la tabla de empleados
update app.empleados
set cargo = upper(trim(cargo))
where cargo is not null and cargo <> upper(trim(cargo));

-- 2. Actualizar nombres de cargos a mayúsculas en el catálogo de cargos
update app.cargos
set nombre = upper(trim(nombre))
where nombre is not null and nombre <> upper(trim(nombre));

-- 3. Si al pasar a mayúsculas quedaron cargos duplicados en app.cargos para un mismo tenant,
-- conservar uno y eliminar los duplicados redundantes
delete from app.cargos a using app.cargos b
where a.tenant_id = b.tenant_id
  and a.nombre = b.nombre
  and a.ctid > b.ctid;
