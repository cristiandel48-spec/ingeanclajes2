-- Bitacora de avance de la obra: lo que la gente de campo alimenta dia a dia
-- (actividad, descripcion, observaciones y fotos con su comentario). El
-- informe de actividades se arma con estos registros, filtrados por periodo.
alter table if exists app.obras
  add column if not exists bitacora jsonb not null default '[]'::jsonb;
