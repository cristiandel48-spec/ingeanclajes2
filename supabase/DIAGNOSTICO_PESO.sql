-- Que columna se esta llevando el espacio y, sobre todo, la transferencia.
--
-- La aplicacion carga las tablas con select("*"), asi que TODO lo que pese
-- aqui se descarga entero cada vez que alguien abre el programa. Por eso
-- interesa el peso por columna y no solo por tabla: hay que saber que se puede
-- dejar de traer.
--
-- Es de solo lectura: no cambia nada.
--
-- Mira la columna `actas`, que existe desde la migracion 081. Si esta base
-- todavia no la tiene, corre antes VERIFICAR.sql y aplica lo que falte.

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
-- OJO: `actas` NO es una columna pesada, asi que esta si se descarga entera
-- cada vez que alguien abre el programa, y se vuelve a subir cada vez que se
-- guarda la obra. Dentro puede ir la firma de quien entrega, que es una
-- imagen. Si esto crece, hay que sacarla de ahi.
select 'obras', 'actas (incluye la firma de quien entrega)',
       pg_size_pretty(sum(pg_column_size(actas)))
  from app.obras
union all
select 'obras', 'todo lo demas',
       pg_size_pretty(sum(pg_column_size(obras.*) - pg_column_size(bitacora)
                          - pg_column_size(img_plano) - pg_column_size(img_sat)
                          - pg_column_size(actas)))
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

-- Las actas de entrega, una por una: cuales llevan firma subida y cuanto pesa.
-- La firma se guarda como imagen dentro del acta, y el acta dentro de la obra,
-- asi que cada una viaja en cada arranque. Una firma escaneada razonable ronda
-- los 40 KB; si alguna aparece con cientos de KB, se subio una foto sin
-- reducir y conviene volver a subirla mas liviana.
select o.id                                             as obra,
       a.value ->> 'id'                                 as acta,
       a.value ->> 'liderProyecto'                      as entrega,
       case when coalesce(a.value ->> 'firmaLider', '') = ''
            then 'sin firma subida' else 'con firma' end as firma,
       pg_size_pretty(length(coalesce(a.value ->> 'firmaLider', ''))::bigint) as peso_firma
  from app.obras o
  cross join lateral jsonb_array_elements(coalesce(o.actas, '[]'::jsonb)) as a(value)
 order by length(coalesce(a.value ->> 'firmaLider', '')) desc;
