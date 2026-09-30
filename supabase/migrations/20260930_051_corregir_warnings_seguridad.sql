-- ── Migración 051: Corrección de Advertencias de Seguridad del Linter de Supabase ──
-- Resuelve las advertencias de seguridad:
-- 1. function_search_path_mutable (app.al_insertar_soporte_mensaje)
-- 2. anon_security_definer_function_executable (app.al_insertar_soporte_mensaje)
-- 3. authenticated_security_definer_function_executable (app.al_insertar_soporte_mensaje y app.siguiente_numero_cotizacion)
-- 4. Restringe permisos de ejecución al rol `anon` en funciones multi-tenant y de administración

-- 1. Corregir función de trigger de mensajes de soporte
-- Cambia a SECURITY INVOKER con search_path explícito e inmutable, revocando acceso anónimo
create or replace function app.al_insertar_soporte_mensaje()
returns trigger
language plpgsql
security invoker
set search_path = app, public, pg_temp
as $$
begin
  update app.soporte_tickets
     set actualizado_en = new.creado_en,
         ultimo_mensaje = new.texto
   where id = new.ticket_id;
  return new;
end;
$$;

revoke execute on function app.al_insertar_soporte_mensaje() from public, anon;
grant execute on function app.al_insertar_soporte_mensaje() to authenticated, service_role;

-- 2. Corregir app.siguiente_numero_cotizacion
-- Cambia a SECURITY INVOKER para que opere bajo las políticas RLS del usuario autenticado
create or replace function app.siguiente_numero_cotizacion(p_tenant uuid)
returns text
language plpgsql
security invoker
set search_path = app, public, pg_temp
as $$
declare
  v_ultimo int;
begin
  perform pg_advisory_xact_lock(hashtext(p_tenant::text || ':cotizacion'));

  select coalesce(max((regexp_match(upper(trim(numero)), '^C\s*-?\s*(\d+)$'))[1]::int), 0)
    into v_ultimo
    from app.cotizaciones
   where tenant_id = p_tenant
     and upper(trim(coalesce(numero, ''))) ~ '^C\s*-?\s*\d+$';

  return 'C-' || greatest(v_ultimo + 1, 26116);
end;
$$;

revoke execute on function app.siguiente_numero_cotizacion(uuid) from public, anon;
grant execute on function app.siguiente_numero_cotizacion(uuid) to authenticated, service_role;

-- 3. Revocar acceso anónimo en funciones de multi-tenancy y roles administrativos
revoke execute on function app.current_user_tenant_ids() from public, anon;
grant execute on function app.current_user_tenant_ids() to authenticated, service_role;

revoke execute on function app.es_admin(uuid) from public, anon;
grant execute on function app.es_admin(uuid) to authenticated, service_role;

revoke execute on function app.registrar_actividad() from public, anon;
grant execute on function app.registrar_actividad() to authenticated, service_role;
