-- Migracion 066: retirar de la base los modulos que ya no estan en uso.
--
-- Soporte se quito de la aplicacion y WhatsApp no esta publicado (la funcion
-- whatsapp-entrada no existe en Supabase). Pero sus tablas y funciones seguian
-- abiertas: las de Soporte, incluso a quien no tiene sesion (migracion 053), y
-- app.cliente_por_telefono devolvia nombre, contacto, correo y ciudad de un
-- cliente a cualquiera que conociera el telefono. Que la pantalla no este en
-- el menu no cierra la puerta de la base.
--
-- Aqui se les QUITA TODO ACCESO, sin borrar datos: el historial de chats y de
-- mensajes se conserva. Si algun dia se reactiva un modulo, basta con volver a
-- conceder los permisos. Solo la llave de servicio (panel de Supabase,
-- funciones del servidor) puede seguir leyendolas.
--
-- De paso se cierran a anon dos funciones que la migracion 051 habia abierto
-- sin necesidad (es_admin, registrar_actividad): solo tienen sentido con
-- sesion.
--
-- Es idempotente: se puede volver a ejecutar sin error.

-- ── Soporte ──────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('app.soporte_mensajes') is not null then
    revoke all on app.soporte_mensajes from anon, authenticated, public;
    drop policy if exists soporte_mensajes_select on app.soporte_mensajes;
    drop policy if exists soporte_mensajes_insert on app.soporte_mensajes;
    drop policy if exists soporte_mensajes_update on app.soporte_mensajes;
    drop policy if exists soporte_mensajes_delete on app.soporte_mensajes;
    if exists (select 1 from pg_publication_tables
                where pubname = 'supabase_realtime' and schemaname = 'app' and tablename = 'soporte_mensajes') then
      alter publication supabase_realtime drop table app.soporte_mensajes;
    end if;
  end if;

  if to_regclass('app.soporte_tickets') is not null then
    revoke all on app.soporte_tickets from anon, authenticated, public;
    drop policy if exists soporte_tickets_select on app.soporte_tickets;
    drop policy if exists soporte_tickets_insert on app.soporte_tickets;
    drop policy if exists soporte_tickets_update on app.soporte_tickets;
    drop policy if exists soporte_tickets_delete on app.soporte_tickets;
    if exists (select 1 from pg_publication_tables
                where pubname = 'supabase_realtime' and schemaname = 'app' and tablename = 'soporte_tickets') then
      alter publication supabase_realtime drop table app.soporte_tickets;
    end if;
  end if;

  if to_regprocedure('app.al_insertar_soporte_mensaje()') is not null then
    revoke execute on function app.al_insertar_soporte_mensaje() from anon, authenticated, public;
  end if;
end $$;

-- ── WhatsApp ─────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('app.wa_mensajes') is not null then
    revoke all on app.wa_mensajes from anon, authenticated, public;
    drop policy if exists wa_mensajes_tenant_select on app.wa_mensajes;
  end if;

  if to_regclass('app.wa_config') is not null then
    revoke all on app.wa_config from anon, authenticated, public;
    drop policy if exists wa_config_tenant_select on app.wa_config;
  end if;

  -- Solo la usaria la funcion del servidor de WhatsApp, con la llave de
  -- servicio.
  if to_regprocedure('app.cliente_por_telefono(uuid, text)') is not null then
    revoke execute on function app.cliente_por_telefono(uuid, text) from anon, authenticated, public;
    grant execute on function app.cliente_por_telefono(uuid, text) to service_role;
  end if;
end $$;

-- ── Funciones que no tienen sentido sin sesion ───────────────────────────────
revoke execute on function app.es_admin(uuid) from anon, public;
grant execute on function app.es_admin(uuid) to authenticated, service_role;
revoke execute on function app.registrar_actividad() from anon, public;
grant execute on function app.registrar_actividad() to authenticated, service_role;

-- Comprobacion: quien puede leer estas tablas ahora. Debe salir vacio, o solo
-- con postgres y service_role.
select table_name, grantee, string_agg(privilege_type, ', ') as permisos
  from information_schema.role_table_grants
 where table_schema = 'app'
   and table_name in ('soporte_tickets', 'soporte_mensajes', 'wa_mensajes', 'wa_config')
   and grantee in ('anon', 'authenticated', 'public')
 group by table_name, grantee
 order by table_name, grantee;
