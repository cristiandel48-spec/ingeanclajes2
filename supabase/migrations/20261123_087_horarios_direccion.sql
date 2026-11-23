-- Migracion 087: direccion escrita a mano en el turno.
--
-- La planilla «Actividades y clientes» tomaba la direccion de la obra, que
-- viene de la cotizacion, y muchas veces esa no es la exacta: es la de la
-- oficina del cliente y no la del sitio donde se trabaja. Ahora se puede
-- corregir en la hoja. Se guarda en el turno y no en la obra para no cambiar
-- la direccion que usan la cotizacion, el acta y los informes.
--
-- Vacio = la direccion de la obra, como hasta ahora, asi que los turnos ya
-- guardados no necesitan tocarse.
--
-- Idempotente: se puede ejecutar mas de una vez. Mientras no se aplique, la
-- hoja sigue mostrando la direccion de la obra y la escrita a mano no queda
-- guardada.

alter table app.horarios
  add column if not exists direccion text;

comment on column app.horarios.direccion is 'Direccion del sitio escrita a mano en la planilla. Vacio = la direccion de la obra.';
