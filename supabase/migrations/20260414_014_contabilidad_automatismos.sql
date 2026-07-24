begin;

alter table if exists app.contabilidad_config
  add column if not exists auto_cxc boolean not null default true,
  add column if not exists auto_nomina boolean not null default true,
  add column if not exists cuenta_nomina_sueldos text,
  add column if not exists cuenta_nomina_extras text,
  add column if not exists cuenta_nomina_auxilio text,
  add column if not exists cuenta_nomina_liquidaciones text,
  add column if not exists cuenta_nomina_por_pagar text,
  add column if not exists cuenta_salud_por_pagar text,
  add column if not exists cuenta_pension_por_pagar text,
  add column if not exists cuenta_otras_deducciones_nomina text;

commit;
