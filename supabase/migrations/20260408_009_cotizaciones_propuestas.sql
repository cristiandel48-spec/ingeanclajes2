alter table if exists app.cotizaciones
add column if not exists propuesta_nombre text;

alter table if exists app.cotizaciones
add column if not exists propuesta_alcance text;

alter table if exists app.cotizaciones
add column if not exists propuesta_activa_id text;

alter table if exists app.cotizaciones
add column if not exists propuestas jsonb not null default '[]'::jsonb;
