-- NIT o cedula del cliente en la cotizacion.
--
-- Al aprobar, el NIT pasa a la obra y de ahi al comprobante contable, que
-- lo exige como identificacion del tercero. Antes solo se obtenia si el
-- cliente ya estaba registrado en el modulo de Clientes; si no, el asiento
-- quedaba sin NIT.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.cotizaciones
  add column if not exists nit text;

comment on column app.cotizaciones.nit is
  'NIT o cedula del cliente. Se copia a la obra al aprobar y viaja al comprobante contable como identificacion del tercero.';
