alter table if exists app.obras
  add column if not exists cotizacion_id text,
  add column if not exists subtotal_cotizacion numeric(14,2),
  add column if not exists utilidad_cotizacion numeric(14,2),
  add column if not exists base_ingreso_contable numeric(14,2),
  add column if not exists iva_generado_cotizacion numeric(14,2);
