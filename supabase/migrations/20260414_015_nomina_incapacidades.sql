alter table if exists app.empleados
  add column if not exists incapacidades jsonb not null default '[]'::jsonb;
