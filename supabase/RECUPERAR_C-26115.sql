-- Inserta la cotizacion C-26115 (INGE S.A.S / Fiscalia General de la Nacion),
-- reconstruida desde el PDF porque no alcanzo a guardarse desde la aplicacion.
--
-- Ejecutar en Supabase > SQL Editor. Es reejecutable: si ya existe, actualiza.
--
-- REQUIERE la migracion 021 (columna contacto). Aplicala antes:
--   alter table app.cotizaciones add column if not exists contacto text;

insert into app.cotizaciones (
  tenant_id, id, numero, fecha, validez_dias,
  cliente, nit, contacto, telefono, obra, ciudad,
  estado, total, utilidad_pct,
  forma_pago, tiempo_ejecucion, tipo_cotizacion,
  propuesta_nombre, propuesta_activa_id, items, propuestas
)
select
  t.id,
  'COT-C26115',
  'C-26115',
  '2026-07-31',
  30,
  'INGE S.A.S',
  '900303011-7',
  'ISABEL CESPEDES',
  '3117454736',
  'FISCALIA GENERAL DE LA NACION',
  'MEDELLIN',
  'Pendiente',
  15666000,
  10,
  '50% ANTICIPO, 50% CONCLUIR LABORES',
  '5 DIAS CALENDARIO DEPENDIENDO DE LAS CONDICIONES CLIMATICAS',
  'puntos_anclaje',
  'Propuesta # 1',
  'PROP-C26115-1',
  '[{"id":1,"desc":"ANCLAJE ARTICO ACERO GALVANIZADO","cant":50,"unit":"Und","vu":280000}]'::jsonb,
  '[{"id":"PROP-C26115-1","nombre":"Propuesta # 1","tipoCotizacion":"puntos_anclaje","util":10,"total":15666000,
     "formaPago":"50% ANTICIPO, 50% CONCLUIR LABORES",
     "tiempoEjec":"5 DIAS CALENDARIO DEPENDIENDO DE LAS CONDICIONES CLIMATICAS",
     "items":[{"id":1,"desc":"ANCLAJE ARTICO ACERO GALVANIZADO","cant":50,"unit":"Und","vu":280000}]}]'::jsonb
from app.tenants t
where t.slug = 'ingeanclajes'
on conflict (tenant_id, id) do update set
  numero            = excluded.numero,
  fecha             = excluded.fecha,
  cliente           = excluded.cliente,
  nit               = excluded.nit,
  contacto          = excluded.contacto,
  telefono          = excluded.telefono,
  obra              = excluded.obra,
  ciudad            = excluded.ciudad,
  total             = excluded.total,
  forma_pago        = excluded.forma_pago,
  tiempo_ejecucion  = excluded.tiempo_ejecucion,
  items             = excluded.items,
  propuestas        = excluded.propuestas;

-- Comprobacion
select id, numero, cliente, obra, total, estado
from app.cotizaciones
order by numero;
