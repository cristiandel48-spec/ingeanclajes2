-- «No guarda la cotizacion»: cotizaciones_tipo_cotizacion_check
--
--   23514: new row for relation "cotizaciones" violates check constraint
--          "cotizaciones_tipo_cotizacion_check"
--
-- CAUSA RAIZ. La restriccion enumeraba los tipos de cotizacion permitidos
-- (linea_vida, puntos_anclaje, obra_blanca). Pero el selector de tipo de la
-- pantalla de cotizaciones no ofrece una lista fija: sale de las categorias
-- del catalogo, que es editable (migracion 037). Cada categoria se guarda
-- con su nombre normalizado -«escaleras», «sistemasdecaminado»…- y, ademas,
-- «estructuras_metalicas» es una opcion base que tampoco estaba en la lista.
-- Cualquier cotizacion de un tipo que no fuera uno de los tres de origen
-- era rechazada por la base.
--
-- La migracion 022 ya habia tenido que ampliar esta lista una vez, y lo unico
-- que hizo fue retrasar el mismo fallo: una lista cerrada sobre un valor que
-- la persona puede ampliar desde el catalogo se queda desactualizada cada vez
-- que se crea una categoria.
--
-- CORRECCION. Se quita la enumeracion. En su lugar queda una comprobacion de
-- cordura que no depende del catalogo: o es nulo o es un texto no vacio y de
-- longitud razonable.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.cotizaciones
  drop constraint if exists cotizaciones_tipo_cotizacion_check;

alter table app.cotizaciones
  add constraint cotizaciones_tipo_cotizacion_check
  check (
    tipo_cotizacion is null
    or char_length(btrim(tipo_cotizacion)) between 1 and 80
  );

comment on column app.cotizaciones.tipo_cotizacion is
  'Tipo de trabajo. Texto libre: lo define el selector de la pantalla, que se arma con las categorias del catalogo (editable), asi que no se enumera aqui. Define las definiciones tecnicas y los anexos que salen impresos.';
