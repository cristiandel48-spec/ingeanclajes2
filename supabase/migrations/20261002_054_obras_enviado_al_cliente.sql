-- Migración 054: Campo para marcar obras enviadas al cliente
-- Agrega enviado_al_cliente y fecha_envio_cliente a app.obras

alter table if exists app.obras
  add column if not exists enviado_al_cliente boolean not null default false,
  add column if not exists fecha_envio_cliente timestamptz;

comment on column app.obras.enviado_al_cliente is 'Indica si el informe o documentación de la obra fue enviado al cliente';
comment on column app.obras.fecha_envio_cliente is 'Fecha y hora en que se marcó como enviado al cliente';

-- Actualiza la función proteger_obra_cerrada para permitir actualizar
-- enviado_al_cliente y fecha_envio_cliente incluso si la obra está en estado Finalizado
create or replace function app.proteger_obra_cerrada()
returns trigger
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_pagado numeric(14,2);
  v_saldo  numeric(14,2);
  v_enviado boolean;
  v_fecha_envio timestamptz;
begin
  -- Solo protege lo que YA estaba entregado.
  if coalesce(old.estado, '') <> 'Finalizado' then
    return new;
  end if;

  if app.es_admin(old.tenant_id) then
    return new;
  end if;

  -- Se permite cambiar cobros y el estado de envío al cliente aun estando cerrada
  v_pagado      := new.pagado;
  v_saldo       := new.saldo;
  v_enviado     := new.enviado_al_cliente;
  v_fecha_envio := new.fecha_envio_cliente;

  new := old;

  new.pagado              := v_pagado;
  new.saldo               := v_saldo;
  new.enviado_al_cliente  := v_enviado;
  new.fecha_envio_cliente := v_fecha_envio;
  new.updated_at          := now();

  return new;
end;
$$;
