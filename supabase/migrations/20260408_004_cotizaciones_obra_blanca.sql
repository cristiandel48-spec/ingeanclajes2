alter table if exists app.cotizaciones
add column if not exists requerimiento_cliente text;
