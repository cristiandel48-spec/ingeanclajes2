alter table if exists app.contabilidad_config
  add column if not exists cuenta_utilidad_obra text;
