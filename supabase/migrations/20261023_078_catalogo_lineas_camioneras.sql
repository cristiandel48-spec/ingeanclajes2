-- Migracion 078: categoria «Lineas de Vida Camioneras» en el catalogo.
--
-- POR QUE: la linea de vida camionera (aerea, sobre carrotanques y volquetas)
-- no estaba en el catalogo y se escribia a mano en cada cotizacion. Como su
-- nombre lleva «camioner», la aplicacion la toma como su propio tipo de
-- sistema: al elegirla, la propuesta lleva su ilustracion y su definicion, y
-- no los componentes de la linea de vida horizontal de cubierta.
--
-- PRECIOS EN CERO A PROPOSITO: no hay precios de referencia para estos
-- servicios. Se ponen desde la pantalla Catalogo (solo el administrador).
-- Mientras esten en cero, el item entra a la cotizacion con valor 0 y hay que
-- escribirlo.
--
-- Es idempotente: `on conflict do nothing` respeta lo que se cambie despues.

insert into app.catalogo_items (tenant_id, id, categoria, descripcion, unidad, precio_base)
select t.id, v.id, v.categoria, v.descripcion, v.unidad, 0
  from app.tenants t
 cross join (values
    ('LVC-POSTE',   'Lineas de Vida Camioneras', 'POSTE TIPO CUELLO DE CISNE CON PEDESTAL',                'Und'),
    ('LVC-DADO',    'Lineas de Vida Camioneras', 'DADO DE CIMENTACION EN CONCRETO PARA POSTE',             'Und'),
    ('LVC-CABLE',   'Lineas de Vida Camioneras', 'LINEA DE VIDA CAMIONERA EN CABLE DE ACERO GALVANIZADO',  'ML'),
    ('LVC-CARRO',   'Lineas de Vida Camioneras', 'CARRO DESLIZANTE PARA LINEA DE VIDA CAMIONERA',          'Und'),
    ('LVC-SRL',     'Lineas de Vida Camioneras', 'LINEA AUTORRETRACTIL PARA LINEA DE VIDA CAMIONERA',      'Und'),
    ('LVC-DISENO',  'Lineas de Vida Camioneras', 'DISEÑO Y MEMORIA DE CALCULO DE LINEA DE VIDA CAMIONERA', 'Global'),
    ('LVC-CERT',    'Lineas de Vida Camioneras', 'CERTIFICACION DE LINEA DE VIDA CAMIONERA',               'Global')
 ) as v(id, categoria, descripcion, unidad)
    on conflict (tenant_id, id) do nothing;

-- Comprobacion:
-- select id, descripcion, unidad, precio_base from app.catalogo_items
--  where categoria = 'Lineas de Vida Camioneras' order by id;
