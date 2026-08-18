-- El catalogo de servicios, en la base.
--
-- POR QUE: hasta ahora vive en el codigo (src/data/seed.js, ITEMS_DB). Eso
-- sirve mientras solo lo use la pantalla, pero la funcion que atiende WhatsApp
-- corre en el servidor y no puede leer el bundle del navegador. Y ademas
-- cambiar un precio obligaba a publicar una version nueva.
--
-- OJO: por ahora hay DOS copias del catalogo -esta tabla y ITEMS_DB-. La
-- pantalla sigue leyendo el archivo y WhatsApp lee la tabla. Se siembra con
-- los mismos valores para que digan lo mismo. El paso siguiente es que la
-- pantalla lea de aqui y el archivo quede solo como semilla inicial.
--
-- Es idempotente: el `on conflict do nothing` respeta los precios que se hayan
-- cambiado despues.

create table if not exists app.catalogo_items (
  tenant_id     uuid not null references app.tenants(id) on delete cascade,
  id            text not null,
  categoria     text,
  descripcion   text not null,
  unidad        text not null,
  precio_base   numeric(14,2) not null,
  -- Un servicio que se deja de prestar no se borra: se apaga, para que las
  -- cotizaciones viejas sigan diciendo de donde salio su precio.
  disponible    boolean not null default true,
  actualizado_en timestamptz not null default now(),
  primary key (tenant_id, id)
);

comment on table app.catalogo_items is
  'Servicios que se cotizan, con su precio. Lo lee la automatizacion de '
  'WhatsApp; la pantalla todavia usa la copia de src/data/seed.js.';

alter table app.catalogo_items enable row level security;

drop policy if exists catalogo_tenant_select on app.catalogo_items;
create policy catalogo_tenant_select on app.catalogo_items
for select
using (tenant_id in (select app.current_user_tenant_ids()));

-- ── La siembra, con los precios que hoy estan en el codigo ──────────────────
insert into app.catalogo_items (tenant_id, id, categoria, descripcion, unidad, precio_base)
select t.id, v.id, v.categoria, v.descripcion, v.unidad, v.precio
  from app.tenants t
 cross join (values
    ('LVH',            'Lineas de Vida',    'LINEA DE VIDA HORIZONTAL',             'ML',     280000),
    ('LVV',            'Lineas de Vida',    'LINEA DE VIDA VERTICAL',               'ML',     320000),
    ('LV-CONEXION',    'Lineas de Vida',    'LINEA DE VIDA CONEXION / TRANSVERSAL', 'ML',     280000),
    ('LV-RECERT',      'Lineas de Vida',    'RECERTIFICACION LINEA DE VIDA',        'ML',      45000),
    ('ESC-FIJA-LVV',   'Escaleras',         'ESCALERA FIJA CON LINEA DE VIDA VERTICAL', 'Metro', 1200000),
    ('ESC-GATO',       'Escaleras',         'ESCALERA TIPO GATO',                   'Metro',  850000),
    ('ESC-MARINERA',   'Escaleras',         'ESCALERA MARINERA',                    'Metro',  950000),
    ('ANC-EPOXICO',    'Anclajes',          'PUNTO DE ANCLAJE EPOXICO',             'Und',    380000),
    ('ANC-SOLDADO',    'Anclajes',          'PUNTO DE ANCLAJE SOLDADO',             'Und',    290000),
    ('ANC-FACHADA',    'Anclajes',          'PUNTO DE ANCLAJE EN FACHADA',          'Und',    420000),
    ('ANC-ARTICO',     'Anclajes',          'ANCLAJE ARTICO ACERO GALVANIZADO',     'Und',    450000),
    ('SIST-CUBIERTA',  'Sistemas Completos','SISTEMA ANTICAIDA CUBIERTA (COMPLETO)','Global', 8500000),
    ('BARANDILLA',     'Sistemas Completos','BARANDILLA DE PROTECCION EN CABLE',    'ML',     320000),
    ('PASARELA',       'Sistemas Completos','PASARELA DE SEGURIDAD EN CUBIERTA',    'ML',     550000),
    ('CERT-ANTICAIDA', 'Servicios',         'CERTIFICACION SISTEMA ANTICAIDA',      'Global', 1200000),
    ('RECERT-ANUAL',   'Servicios',         'RECERTIFICACION ANUAL',                'Global',  650000),
    ('INSPECCION',     'Servicios',         'INSPECCION Y DIAGNOSTICO',             'Global',  400000),
    ('COORD-SST',      'Servicios',         'COORDINADOR SST EN OBRA',              'Dia',     280000)
 ) as v(id, categoria, descripcion, unidad, precio)
    on conflict (tenant_id, id) do nothing;

-- Comprobacion:
-- select id, descripcion, unidad, precio_base from app.catalogo_items order by id;
