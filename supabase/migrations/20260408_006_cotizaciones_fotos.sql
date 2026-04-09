alter table if exists app.cotizaciones
add column if not exists tipo_cotizacion text;

alter table if exists app.cotizaciones
add column if not exists fotos_cotizacion jsonb not null default '[]'::jsonb;
