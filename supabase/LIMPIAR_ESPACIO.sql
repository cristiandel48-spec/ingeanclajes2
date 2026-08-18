-- Recuperar el espacio que ocupan las versiones viejas de las filas.
--
-- POR QUE HACE FALTA: cada guardado reescribe la fila ENTERA, con sus fotos
-- dentro. Postgres no borra la version anterior: la marca como muerta y la
-- reutiliza mas tarde. En estas tablas la limpieza automatica nunca ha corrido
-- -last_autovacuum estaba en NULL-, asi que ese espacio sigue ocupado.
--
-- Las fotos reales suman 44 MB y las tablas ocupaban 108 MB. La diferencia es
-- lo que se recupera aqui.
--
-- ¡OJO! CADA «vacuum» SE EJECUTA SOLO, UNO POR UNO.
--
-- El editor de Supabase mete todas las sentencias de un script en una misma
-- transaccion, y VACUUM no puede correr dentro de una: responde «VACUUM cannot
-- run inside a transaction block» y no hace nada.
--
-- Lo comodo es SELECCIONAR con el raton la linea que se quiere correr y pulsar
-- Ctrl+Enter: se ejecuta solo lo seleccionado. Tambien vale borrar el editor y
-- pegar una sola linea cada vez.
--
-- SE EJECUTA POR PARTES, en este orden. No hay prisa entre una y otra.

-- ── PASO 1 · Poner al dia las estadisticas ──────────────────────────────────
-- Rapido y no bloquea nada. Sin esto, los numeros del paso 2 no son de fiar:
-- por eso salia «0 filas vivas» donde hay seis informes.
vacuum analyze app.informes;
vacuum analyze app.obras;
vacuum analyze app.cotizaciones;

-- ── PASO 2 · Mirar como quedo ───────────────────────────────────────────────
-- Ahora si son numeros reales. Si «ocupa» sigue muy por encima de lo que pesan
-- las fotos, hay espacio muerto y toca el paso 3.
select relname                                       as tabla,
       n_live_tup                                    as filas_vivas,
       n_dead_tup                                    as filas_muertas,
       pg_size_pretty(pg_total_relation_size(relid)) as ocupa
  from pg_stat_user_tables
 where schemaname = 'app'
   and relname in ('informes', 'obras', 'cotizaciones');

-- ── PASO 3 · Compactar de verdad ────────────────────────────────────────────
--
-- OJO: VACUUM FULL BLOQUEA LA TABLA MIENTRAS CORRE. Con estos tamanos son
-- segundos, pero durante ese rato nadie puede guardar. Hacerlo cuando no haya
-- nadie trabajando.
--
-- Reescribe la tabla compactada y devuelve el espacio al sistema. No cambia ni
-- un dato. Se ejecutan de una en una, empezando por la que mas ocupa.
vacuum full app.informes;
vacuum full app.obras;
vacuum full app.cotizaciones;

-- ── PASO 4 · Comprobar el resultado ─────────────────────────────────────────
select relname                                       as tabla,
       pg_size_pretty(pg_total_relation_size(relid)) as ocupa_ahora
  from pg_stat_user_tables
 where schemaname = 'app'
   and relname in ('informes', 'obras', 'cotizaciones')
 order by pg_total_relation_size(relid) desc;

-- Informes deberia bajar de 75 MB a algo cercano a los 30 MB que pesan sus
-- fotos, y obras de 17 MB a unos 14 MB.
