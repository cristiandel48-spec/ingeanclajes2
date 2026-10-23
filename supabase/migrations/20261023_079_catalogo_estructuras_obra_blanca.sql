-- Migracion 079: categorias «Estructuras Metalicas» y «Obra Blanca» en el
-- catalogo.
--
-- POR QUE: en la cotizacion, «Tipo de trabajo / sistema» ofrece Estructuras
-- metalicas y Obra blanca, pero el catalogo de la base no tenia esas
-- categorias. Al elegirlas, el catalogo rapido mostraba otra -Lineas de Vida o
-- Servicios-, que no tenia nada que ver. Ahora cada tipo tiene su categoria y
-- la pantalla solo muestra la que corresponde.
--
-- Estructuras Metalicas sale con los precios que ya tenia la semilla del
-- codigo (src/data/seed.js). Obra Blanca no tenia items: se crean en cero para
-- que se revisen y se les ponga precio desde la pantalla Catalogo.
--
-- Es idempotente: `on conflict do nothing` respeta lo que se cambie despues.

insert into app.catalogo_items (tenant_id, id, categoria, descripcion, unidad, precio_base)
select t.id, v.id, v.categoria, v.descripcion, v.unidad, v.precio
  from app.tenants t
 cross join (values
    ('EM-PLAT-AIRES',  'Estructuras Metálicas', 'ESTRUCTURA METÁLICA CON PLATAFORMA PARA AIRES ACONDICIONADOS', 'ML',  8000000),
    ('EM-PLATAFORMA',  'Estructuras Metálicas', 'PLATAFORMA METÁLICA ESTRUCTURAL',                             'ML',  6500000),
    ('EM-FAB-MONTAJE', 'Estructuras Metálicas', 'FABRICACIÓN Y MONTAJE DE ESTRUCTURA METÁLICA',                'Kg',    18500),
    ('EM-SOPORTE',     'Estructuras Metálicas', 'SOPORTE METÁLICO EN PERFIL ESTRUCTURAL',                      'Und',  350000),
    ('OB-ANCLAJE-EMP', 'Obra Blanca',           'PUNTO DE ANCLAJE EMPOTRADO EN OBRA BLANCA',                   'Und',       0),
    ('OB-PLATINA-EMP', 'Obra Blanca',           'PLATINA EMPOTRADA PARA SISTEMA ANTICAÍDAS',                   'Und',       0),
    ('OB-ACOMPANA',    'Obra Blanca',           'ACOMPAÑAMIENTO TÉCNICO EN OBRA BLANCA',                       'Dia',       0),
    ('OB-RESANE',      'Obra Blanca',           'RESANE Y ACABADO EN PUNTOS DE INSTALACIÓN',                   'Und',       0)
 ) as v(id, categoria, descripcion, unidad, precio)
    on conflict (tenant_id, id) do nothing;

-- Comprobacion:
-- select categoria, count(*) from app.catalogo_items group by categoria order by categoria;
