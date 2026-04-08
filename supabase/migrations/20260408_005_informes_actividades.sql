alter table if exists app.informes
add column if not exists actividades jsonb not null default '[]'::jsonb;
