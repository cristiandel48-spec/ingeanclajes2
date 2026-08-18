-- Crear la cotizacion en borrador desde WhatsApp.
--
-- Hasta ahora el mensaje se contestaba y quedaba registrado, pero el asesor
-- tenia que volver a teclear la cotizacion. Esto la deja hecha, en borrador,
-- para abrirla, revisarla y enviarla.
--
-- VA COMO FUNCION Y NO COMO INSERT DESDE LA EDGE FUNCTION por el consecutivo:
-- calcular «el ultimo mas uno» desde fuera tiene una carrera. Dos mensajes que
-- entren a la vez leerian el mismo numero y se pisarian, o chocarian con la
-- clave. Con un lock por empresa dentro de la misma transaccion, el segundo
-- espera al primero y coge el numero siguiente.
--
-- Es idempotente: se puede volver a ejecutar sin error.

-- ── El siguiente numero libre ───────────────────────────────────────────────
create or replace function app.siguiente_numero_cotizacion(p_tenant uuid)
returns text
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_ultimo int;
begin
  -- Serializa a los que pidan numero de la misma empresa. Se suelta solo al
  -- terminar la transaccion.
  perform pg_advisory_xact_lock(hashtext(p_tenant::text || ':cotizacion'));

  select coalesce(max((regexp_match(upper(trim(numero)), '^C\s*-?\s*(\d+)$'))[1]::int), 0)
    into v_ultimo
    from app.cotizaciones
   where tenant_id = p_tenant
     and upper(trim(coalesce(numero, ''))) ~ '^C\s*-?\s*\d+$';

  -- La numeracion real de la empresa arranca en 26116: antes de usar el
  -- sistema se emitieron cotizaciones a mano y no se pueden repetir.
  return 'C-' || greatest(v_ultimo + 1, 26116);
end;
$$;

comment on function app.siguiente_numero_cotizacion(uuid) is
  'El siguiente consecutivo de cotizacion, con lock por empresa para que dos '
  'mensajes simultaneos de WhatsApp no cojan el mismo numero.';

-- ── La cotizacion en borrador ───────────────────────────────────────────────
create or replace function app.crear_cotizacion_whatsapp(
  p_tenant    uuid,
  p_cliente   text,
  p_contacto  text,
  p_telefono  text,
  p_ciudad    text,
  p_obra      text,
  p_items     jsonb,      -- [{desc, cant, unit, vu}]
  p_utilidad  numeric,
  p_total     numeric,
  p_alcance   text
)
returns table (id text, numero text)
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_numero text;
  v_id     text;
  v_ultimo int;
begin
  v_numero := app.siguiente_numero_cotizacion(p_tenant);

  -- El id sigue la misma forma que los que crea la aplicacion (COT-001), y se
  -- toma del mayor que exista, no de cuantas hay: contar filas repite ids en
  -- cuanto se borra una del medio.
  select coalesce(max((regexp_match(id, '^COT-(\d+)$'))[1]::int), 0)
    into v_ultimo
    from app.cotizaciones
   where tenant_id = p_tenant
     and id ~ '^COT-\d+$';

  v_id := 'COT-' || lpad((v_ultimo + 1)::text, 3, '0');

  insert into app.cotizaciones (
    tenant_id, id, numero, fecha, validez_dias,
    cliente, contacto, telefono, ciudad, obra,
    items, utilidad_pct, total,
    propuesta_alcance, estado, origen
  ) values (
    p_tenant, v_id, v_numero, current_date, 30,
    nullif(trim(coalesce(p_cliente, '')), ''),
    nullif(trim(coalesce(p_contacto, '')), ''),
    nullif(trim(coalesce(p_telefono, '')), ''),
    nullif(trim(coalesce(p_ciudad, '')), ''),
    nullif(trim(coalesce(p_obra, '')), ''),
    coalesce(p_items, '[]'::jsonb),
    coalesce(p_utilidad, 10),
    coalesce(p_total, 0),
    nullif(trim(coalesce(p_alcance, '')), ''),
    -- «Borrador» y no «Pendiente»: Pendiente significa que se le mando al
    -- cliente y se espera respuesta. Esta no la ha visto nadie todavia.
    'Borrador',
    'whatsapp'
  );

  return query select v_id, v_numero;
end;
$$;

comment on function app.crear_cotizacion_whatsapp is
  'Crea la cotizacion que sale de un mensaje de WhatsApp, en estado Borrador. '
  'El consecutivo y el id se calculan aqui dentro, con lock, para que dos '
  'mensajes a la vez no se pisen.';
