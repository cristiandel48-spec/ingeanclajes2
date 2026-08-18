-- Cuanto pesa cada foto que ya esta guardada.
--
-- La aplicacion reduce las fotos al subirlas -1400 px, calidad 0,72-, lo que
-- deja unos 300 KB. Si el promedio sale muy por encima, es que esas fotos
-- entraron ANTES de que existiera esa reduccion, y entonces no hay que
-- cambiar la compresion: hay que pasarles la herramienta que ya existe.
--
-- «pesadas» son las que superan el umbral que usa la aplicacion para darlas
-- por sin reducir (700.000 caracteres).
--
-- Es de solo lectura.

with fotos_informes as (
  select length(foto->>'img') as tam
    from app.informes,
         lateral jsonb_array_elements(coalesce(actividades, '[]'::jsonb)) as act,
         lateral jsonb_array_elements(
           case when jsonb_typeof(act->'fotos') = 'array' then act->'fotos' else '[]'::jsonb end
         ) as foto
   where coalesce(foto->>'img', '') <> ''
),
fotos_obras as (
  select length(foto->>'img') as tam
    from app.obras,
         lateral jsonb_array_elements(coalesce(bitacora, '[]'::jsonb)) as reg,
         lateral jsonb_array_elements(
           case when jsonb_typeof(reg->'fotos') = 'array' then reg->'fotos' else '[]'::jsonb end
         ) as foto
   where coalesce(foto->>'img', '') <> ''
)
select 'informes' as donde,
       count(*)                                        as fotos,
       pg_size_pretty(sum(tam)::bigint)                as ocupan,
       pg_size_pretty(avg(tam)::bigint)                as promedio_cada_una,
       pg_size_pretty(max(tam)::bigint)                as la_mas_grande,
       count(*) filter (where tam > 700000)            as sin_reducir
  from fotos_informes
union all
select 'obras',
       count(*),
       pg_size_pretty(sum(tam)::bigint),
       pg_size_pretty(avg(tam)::bigint),
       pg_size_pretty(max(tam)::bigint),
       count(*) filter (where tam > 700000)
  from fotos_obras;
