-- El formulario pide "Contacto" y el nombre sale impreso en la portada del
-- PDF, pero la tabla no tenia esa columna: al reabrir la cotizacion el dato
-- aparecia vacio. Se agrega para que se conserve.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.cotizaciones
  add column if not exists contacto text;

comment on column app.cotizaciones.contacto is
  'Persona de contacto del cliente. Sale en la portada de la cotizacion y se copia a la obra al aprobar.';
