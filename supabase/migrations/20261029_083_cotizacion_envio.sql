-- Migracion 083: cuando y a quien se envio la cotizacion.
--
-- Al enviarla por correo la cotizacion pasa a «Enviada» y la pantalla anota
-- la fecha y el correo del cliente, pero no habia donde guardarlos: al
-- recargar se perdian, el listado dejaba de decir «Enviada el … a …» y al
-- desaprobarla volvia a «Pendiente» en vez de «Enviada».
--
-- Idempotente: se puede ejecutar mas de una vez.

alter table app.cotizaciones
  add column if not exists enviada_en timestamptz,
  add column if not exists enviada_a text;

comment on column app.cotizaciones.enviada_en is 'Cuando se le envio la cotizacion al cliente por correo.';
comment on column app.cotizaciones.enviada_a is 'Correo al que se envio la cotizacion.';
