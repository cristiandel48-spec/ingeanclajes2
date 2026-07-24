alter table if exists app.empleados
  add column if not exists prestaciones_sociales jsonb not null default '[]'::jsonb;

alter table if exists app.contabilidad_config
  add column if not exists cuenta_prima_servicios text,
  add column if not exists cuenta_cesantias text,
  add column if not exists cuenta_intereses_cesantias text,
  add column if not exists cuenta_prima_por_pagar text,
  add column if not exists cuenta_cesantias_por_pagar text,
  add column if not exists cuenta_intereses_cesantias_por_pagar text;
