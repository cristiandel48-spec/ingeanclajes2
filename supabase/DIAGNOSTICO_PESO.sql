-- Que columna se esta llevando el espacio y, sobre todo, la transferencia.
--
-- La aplicacion carga las tablas con select("*"), asi que TODO lo que pese
-- aqui se descarga entero cada vez que alguien abre el programa. Por eso
-- interesa el peso por columna y no solo por tabla: hay que saber que se puede
-- dejar de traer.
--
-- Es de solo lectura: no cambia nada.

select 'informes' as tabla, 'actividades (fotos del informe)' as columna,
       pg_size_pretty(sum(pg_column_size(actividades))) as peso
  from app.informes
union all
select 'informes', 'fotos', pg_size_pretty(sum(pg_column_size(fotos)))
  from app.informes
union all
select 'informes', 'todo lo demas',
       pg_size_pretty(sum(pg_column_size(informes.*) - pg_column_size(actividades) - pg_column_size(fotos)))
  from app.informes

union all
select 'obras', 'bitacora (avance y fotos)', pg_size_pretty(sum(pg_column_size(bitacora)))
  from app.obras
union all
select 'obras', 'img_plano + img_sat',
       pg_size_pretty(sum(pg_column_size(img_plano) + pg_column_size(img_sat)))
  from app.obras
union all
select 'obras', 'todo lo demas',
       pg_size_pretty(sum(pg_column_size(obras.*) - pg_column_size(bitacora)
                          - pg_column_size(img_plano) - pg_column_size(img_sat)))
  from app.obras

union all
select 'cotizaciones', 'fotos_cotizacion', pg_size_pretty(sum(pg_column_size(fotos_cotizacion)))
  from app.cotizaciones
union all
select 'cotizaciones', 'map_img', pg_size_pretty(sum(pg_column_size(map_img)))
  from app.cotizaciones
union all
select 'cotizaciones', 'todo lo demas',
       pg_size_pretty(sum(pg_column_size(cotizaciones.*) - pg_column_size(fotos_cotizacion)
                          - pg_column_size(map_img)))
  from app.cotizaciones;

-- Cuantas filas hay que cargar en cada arranque, para entender el volumen.
select
  (select count(*) from app.informes)     as informes,
  (select count(*) from app.obras)        as obras,
  (select count(*) from app.cotizaciones) as cotizaciones;
