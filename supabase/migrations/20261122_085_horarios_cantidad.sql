-- Migracion 085: cantidad de cada turno.
--
-- La planilla «Actividades y clientes» que se manda al grupo de WhatsApp lleva
-- una columna CANTIDADES (cuantas lineas de vida, anclajes o puntos se
-- instalan ese dia). El turno no tenia donde guardarla y la columna salia
-- vacia. Es texto para admitir «10», «3 ML» o «2 escaleras».
--
-- Idempotente: se puede ejecutar mas de una vez. Mientras no se aplique, la
-- app guarda el turno sin la cantidad (toLegacyRow) y no se rompe nada.

alter table app.horarios
  add column if not exists cantidad text;

comment on column app.horarios.cantidad is 'Cantidad a instalar o intervenir en el turno (planilla Actividades y clientes).';
