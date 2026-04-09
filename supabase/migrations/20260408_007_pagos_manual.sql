alter table if exists app.pagos
add column if not exists tipo text;

alter table if exists app.pagos
add column if not exists estado text;
