-- Textos editables del documento de cotizacion (saludo, marco tecnico, SST,
-- proximos pasos, datos de contacto y firma).
--
-- Se guardan en una sola columna JSONB en vez de una columna por texto: asi
-- agregar un texto nuevo no requiere otra migracion. Las claves ausentes usan
-- los valores por defecto de src/lib/cotizacionTextos.js.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.cotizaciones
  add column if not exists textos_documento jsonb not null default '{}'::jsonb;

comment on column app.cotizaciones.textos_documento is
  'Textos fijos del documento sobreescritos para esta cotizacion. Claves vacias o ausentes usan el valor por defecto de la aplicacion.';
