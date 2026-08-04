-- Direccion de la obra en la cotizacion.
--
-- Se capturaba en la ficha del cliente y en la obra, pero no aqui, que es
-- donde suele empezar todo: al cotizar ya se sabe donde queda el trabajo.
-- Desde aqui viaja a la ficha del cliente y a la obra cuando se aprueba.
alter table if exists app.cotizaciones
  add column if not exists direccion text;
