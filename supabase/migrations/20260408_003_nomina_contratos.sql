alter table app.empleados
add column if not exists tipo_contrato text;

alter table app.empleados
add column if not exists fecha_ingreso date;

alter table app.empleados
add column if not exists fecha_salida date;

alter table app.empleados
add column if not exists causa_retiro text;
