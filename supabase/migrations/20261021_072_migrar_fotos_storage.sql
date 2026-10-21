-- Fotos viejas a Storage (hallazgo R2, fase 2).
--
-- La fase 1 (migracion 071) manda a Storage las fotos que se guardan desde
-- entonces. Las anteriores siguen dentro de las filas: informes 355 MB, obras
-- 170 MB, cotizaciones 14 MB. Las mueve el script
-- scripts/migrar-fotos-storage.mjs, registro por registro, y esta funcion es
-- la que escribe en la base.
--
-- POR QUE UNA FUNCION Y NO UN UPDATE COMUN: los disparadores de estas tablas
-- estan pensados para cambios de una persona, y el script no lo es.
--   - Autoria: dejarian «modificado por» en blanco en cada documento.
--   - Obras finalizadas: proteger_obra_cerrada ignoraria el cambio en
--     silencio.
--   - Version (updated_at): cambiaria, y quien tenga el registro abierto
--     recibiria un aviso falso de «otra persona lo cambio».
-- Cambiar una foto por su referencia no modifica el documento: al abrirlo se
-- ve igual. Por eso aqui se apagan los disparadores SOLO durante esta
-- actualizacion y solo en esta transaccion; quedan como estaban al terminar.
--
-- Protecciones:
--   - Solo la puede llamar la llave de servicio (el script), nadie desde la
--     aplicacion.
--   - Solo toca las columnas de fotos de las tres tablas.
--   - Solo actualiza si el registro sigue en la version que leyo el script:
--     si alguien lo guardo entretanto, no lo toca y el script lo reintenta
--     en otra pasada.
--
-- Es idempotente: se puede volver a ejecutar sin error.

create or replace function app.migrar_fotos_registro(
  p_tabla text,
  p_tenant uuid,
  p_id text,
  p_version timestamptz,
  p_valores jsonb
)
returns text
language plpgsql
security definer
set search_path = app, public
as $$
declare
  v_filas int := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Solo el script de migracion de fotos puede usar esta funcion.';
  end if;
  if p_tabla not in ('informes', 'obras', 'cotizaciones') then
    raise exception 'Tabla no permitida: %', p_tabla;
  end if;

  execute format('alter table app.%I disable trigger user', p_tabla);

  if p_tabla = 'informes' then
    update app.informes set
      actividades = case when p_valores ? 'actividades' then p_valores->'actividades' else actividades end,
      fotos       = case when p_valores ? 'fotos' then p_valores->'fotos' else fotos end
    where tenant_id = p_tenant and id = p_id and updated_at = p_version;
  elsif p_tabla = 'obras' then
    update app.obras set
      bitacora       = case when p_valores ? 'bitacora' then p_valores->'bitacora' else bitacora end,
      trazos         = case when p_valores ? 'trazos' then p_valores->'trazos' else trazos end,
      anclajes       = case when p_valores ? 'anclajes' then p_valores->'anclajes' else anclajes end,
      geo_mediciones = case when p_valores ? 'geo_mediciones' then p_valores->'geo_mediciones' else geo_mediciones end,
      img_plano      = case when p_valores ? 'img_plano' then p_valores->>'img_plano' else img_plano end,
      img_sat        = case when p_valores ? 'img_sat' then p_valores->>'img_sat' else img_sat end
    where tenant_id = p_tenant and id = p_id and updated_at = p_version;
  else
    update app.cotizaciones set
      fotos_cotizacion = case when p_valores ? 'fotos_cotizacion' then p_valores->'fotos_cotizacion' else fotos_cotizacion end,
      map_img          = case when p_valores ? 'map_img' then p_valores->>'map_img' else map_img end
    where tenant_id = p_tenant and id = p_id and updated_at = p_version;
  end if;
  get diagnostics v_filas = row_count;

  execute format('alter table app.%I enable trigger user', p_tabla);

  return case when v_filas = 1 then 'ok' else 'cambio' end;
end;
$$;

revoke all on function app.migrar_fotos_registro(text, uuid, text, timestamptz, jsonb) from public, anon, authenticated;
grant execute on function app.migrar_fotos_registro(text, uuid, text, timestamptz, jsonb) to service_role;

-- Comprobacion: debe salir la funcion, ejecutable solo por service_role.
-- select proname, proacl from pg_proc where proname = 'migrar_fotos_registro';
