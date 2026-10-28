-- Que tiene guardado de verdad la base sobre quien recibe los documentos.
--
-- Sirve cuando algo que se escribio en la ventana «quien recibe los informes
-- de esta obra» no aparece despues en la ficha del cliente. Lo que se escribe
-- ahi se guarda en DOS sitios a la vez -en la obra y en la ficha del cliente-
-- y la ficha se busca por NIT o por nombre, asi que con un nombre distinto o
-- con dos fichas del mismo cliente el dato puede acabar en la fila de al lado.
--
-- Es de solo lectura: no cambia nada.
--
-- Cambia 'inteckno' por el trozo de nombre del cliente que quieras mirar.

-- 1. Todas las fichas de clientes que se parezcan a ese nombre. Si sale mas de
--    una, ahi esta el problema: el dato se guardo en la otra.
select 'ficha de cliente' as donde,
       c.id, c.nombre, c.nit,
       c.contacto,
       coalesce(nullif(c.email, ''), '— vacio —')           as email,
       coalesce(nullif(c.contacto_cedula, ''), '— vacio —') as cedula,
       coalesce(nullif(c.contacto_cargo, ''), '— vacio —')  as cargo
  from app.clientes c
 where c.nombre ilike '%inteckno%'
 order by c.nombre;

-- 2. Las obras de ese cliente y lo que cada una tiene guardado. Si la obra si
--    lo tiene y la ficha no, el dato se escribio pero no subio al directorio.
select 'obra' as donde,
       o.id, o.cliente, o.nit, o.proyecto,
       coalesce(nullif(o.recibe_nombre, ''), '— vacio —')    as recibe_nombre,
       coalesce(nullif(o.recibe_email, ''), '— vacio —')     as recibe_email,
       coalesce(nullif(o.recibe_documento, ''), '— vacio —') as recibe_cedula,
       coalesce(nullif(o.recibe_cargo, ''), '— vacio —')     as recibe_cargo
  from app.obras o
 where o.cliente ilike '%inteckno%'
 order by o.id;

-- 3. Fichas repetidas en todo el directorio: dos filas con el mismo nombre o
--    el mismo NIT. Es la causa mas comun de que un dato «no viaje»: viaja,
--    pero a la otra ficha. Se arreglan con «Unificar» en la pantalla de
--    Clientes.
select lower(btrim(nombre)) as nombre_normalizado,
       count(*)             as fichas,
       string_agg(id || ' · ' || coalesce(nullif(email, ''), 'sin correo'), '  |  ' order by id) as detalle
  from app.clientes
 group by lower(btrim(nombre))
having count(*) > 1
 order by fichas desc, nombre_normalizado;
