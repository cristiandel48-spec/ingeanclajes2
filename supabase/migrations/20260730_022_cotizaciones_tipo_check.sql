-- CAUSA RAIZ de que las cotizaciones no se guardaran.
--
-- app.cotizaciones tenia una restriccion CHECK sobre tipo_cotizacion que no
-- incluia 'puntos_anclaje'. La aplicacion ofrece tres tipos (linea de vida,
-- puntos de anclaje y obra blanca), asi que toda cotizacion de puntos de
-- anclaje era rechazada por la base con el error:
--
--   23514: new row for relation "cotizaciones" violates check constraint
--          "cotizaciones_tipo_cotizacion_check"
--
-- La restriccion no estaba en estas migraciones: se creo directamente en el
-- panel de Supabase y quedo desactualizada cuando la aplicacion sumo el
-- tercer tipo. Aqui queda versionada.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.cotizaciones
  drop constraint if exists cotizaciones_tipo_cotizacion_check;

alter table app.cotizaciones
  add constraint cotizaciones_tipo_cotizacion_check
  check (
    tipo_cotizacion is null
    or tipo_cotizacion in ('linea_vida', 'puntos_anclaje', 'obra_blanca')
  );

comment on column app.cotizaciones.tipo_cotizacion is
  'Tipo de trabajo: linea_vida, puntos_anclaje u obra_blanca. Define las definiciones tecnicas y los anexos que salen impresos.';
