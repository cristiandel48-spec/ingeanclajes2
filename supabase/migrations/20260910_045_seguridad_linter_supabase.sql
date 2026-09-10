-- Migración 045: Resolver advertencias de seguridad del Supabase Database Linter
--
-- 1. function_search_path_mutable:
--    Fija search_path explícito (app, public) en las funciones que lo tenían mutable.
--
-- 2. anon_security_definer_function_executable & authenticated_security_definer_function_executable:
--    Revoca permisos de ejecución innecesarios en funciones SECURITY DEFINER y de trigger:
--    - Funciones de trigger: Nunca deben ser invocables vía API REST / RPC.
--    - crear_cotizacion_whatsapp: Solo debe ser invocable por service_role (Edge Function del webhook).
--    - current_user_tenant_ids, es_admin, siguiente_numero_cotizacion: Revocar a anon (solo authenticated y service_role).
--
-- 3. pg_graphql_anon_table_exposed & pg_graphql_authenticated_table_exposed:
--    La aplicación opera 100% a través de la API REST (PostgREST) y Realtime de Supabase.
--    No utiliza GraphQL. Desactivar la extensión pg_graphql elimina la superficie de ataque
--    y las 54 alertas de tablas expuestas en el esquema GraphQL.

-- ── 1. Fijar search_path en funciones de trigger y utilidades ─────────────────
alter function app.contar_fotos_obra() set search_path = app, public;
alter function app.contar_fotos_informe() set search_path = app, public;
alter function app.marcar_catalogo_actualizado() set search_path = app, public;
alter function app.set_updated_at() set search_path = app, public;

-- ── 2. Restringir permisos de ejecución en funciones ──────────────────────────

-- 2.1. Funciones disparadoras (Triggers): No deben exponerse como endpoint RPC
revoke execute on function app.marcar_autoria_cotizacion() from public, anon, authenticated;
revoke execute on function app.marcar_autoria_documento() from public, anon, authenticated;
revoke execute on function app.contar_fotos_obra() from public, anon, authenticated;
revoke execute on function app.contar_fotos_informe() from public, anon, authenticated;
revoke execute on function app.marcar_catalogo_actualizado() from public, anon, authenticated;
revoke execute on function app.set_updated_at() from public, anon, authenticated;
revoke execute on function app.proteger_obra_cerrada() from public, anon, authenticated;

-- 2.2. crear_cotizacion_whatsapp: Solo para la Edge Function del webhook de WhatsApp (service_role)
revoke execute on function app.crear_cotizacion_whatsapp(uuid, text, text, text, text, text, jsonb, numeric, numeric, text) from public, anon, authenticated;
grant execute on function app.crear_cotizacion_whatsapp(uuid, text, text, text, text, text, jsonb, numeric, numeric, text) to service_role;

-- 2.3. Funciones de sesión y utilidades internas: Revocar a anónimos, permitir a autenticados
revoke execute on function app.current_user_tenant_ids() from public, anon;
grant execute on function app.current_user_tenant_ids() to authenticated, service_role;

revoke execute on function app.es_admin(uuid) from public, anon;
grant execute on function app.es_admin(uuid) to authenticated, service_role;

revoke execute on function app.siguiente_numero_cotizacion(uuid) from public, anon;
grant execute on function app.siguiente_numero_cotizacion(uuid) to authenticated, service_role;

-- ── 3. Desactivar pg_graphql (no utilizado en este proyecto) ─────────────────
drop extension if exists pg_graphql cascade;
