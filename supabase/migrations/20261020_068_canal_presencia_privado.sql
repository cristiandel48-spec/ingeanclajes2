-- Migracion 068: el canal de presencia en tiempo real pasa a ser privado.
--
-- El canal donde la aplicacion anuncia quien esta conectado, y por donde el
-- dueño manda «cerrar sesion» y «sistema apagado», era publico: cualquiera con
-- la llave publica de la aplicacion -sin iniciar sesion- podia unirse, ver los
-- correos de quienes estaban conectados y mandar ordenes falsas.
--
-- Ahora la aplicacion se une a un canal PRIVADO (presencia-erp-ingeanclajes-
-- privado) y Supabase Realtime consulta estas reglas antes de dejar entrar:
--
--   - Leer (recibir avisos y ver quien esta conectado): miembros activos.
--   - Anunciar que uno esta conectado (presence): miembros activos.
--   - Mandar ordenes (broadcast: cerrar sesion, apagado): solo el dueño.
--
-- Es idempotente: se puede volver a ejecutar sin error.

drop policy if exists presencia_leer on realtime.messages;
create policy presencia_leer on realtime.messages
for select
to authenticated
using (
  realtime.topic() = 'presencia-erp-ingeanclajes-privado'
  and exists (
    select 1 from app.memberships m
     where m.user_id = auth.uid() and coalesce(m.activo, true)
  )
);

drop policy if exists presencia_escribir on realtime.messages;
create policy presencia_escribir on realtime.messages
for insert
to authenticated
with check (
  realtime.topic() = 'presencia-erp-ingeanclajes-privado'
  and exists (
    select 1 from app.memberships m
     where m.user_id = auth.uid() and coalesce(m.activo, true)
  )
  and (
    realtime.messages.extension = 'presence'
    or (realtime.messages.extension = 'broadcast' and app.es_dueno())
  )
);

-- Comprobacion: las dos reglas deben aparecer.
select policyname, cmd
  from pg_policies
 where schemaname = 'realtime' and tablename = 'messages'
   and policyname in ('presencia_leer', 'presencia_escribir');
