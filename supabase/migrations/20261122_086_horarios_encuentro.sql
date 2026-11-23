-- Migracion 086: punto de encuentro de cada turno.
--
-- La planilla «Actividades y clientes» dice, junto a la fecha, donde se
-- encuentra la cuadrilla: «Salida desde la oficina» casi siempre, o «Llegada a
-- la universidad» cuando van directo a la obra. Vacio significa «Salida desde
-- la oficina», asi que los turnos ya guardados no necesitan tocarse.
--
-- Idempotente: se puede ejecutar mas de una vez. Mientras no se aplique, la
-- planilla muestra «Salida desde la oficina» en todas las filas y un punto de
-- encuentro distinto no queda guardado.

alter table app.horarios
  add column if not exists encuentro text;

comment on column app.horarios.encuentro is 'Punto de encuentro del turno (planilla Actividades y clientes). Vacio = Salida desde la oficina.';
