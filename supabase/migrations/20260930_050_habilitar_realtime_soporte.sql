-- ── Habilitar Realtime para soporte_mensajes y soporte_tickets ──────────────────
-- Permite que Supabase Realtime transmita inserciones y cambios a través de WebSocket
-- complementando el motor de sondeo continuo (polling de 3.5s) para máxima velocidad y fiabilidad.

do $$
begin
  -- Agregar app.soporte_mensajes a la publicación supabase_realtime si no está
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'app'
       and tablename = 'soporte_mensajes'
  ) then
    alter publication supabase_realtime add table app.soporte_mensajes;
  end if;

  -- Agregar app.soporte_tickets a la publicación supabase_realtime si no está
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'app'
       and tablename = 'soporte_tickets'
  ) then
    alter publication supabase_realtime add table app.soporte_tickets;
  end if;
exception
  when others then
    -- En caso de que la publicación supabase_realtime tenga restricciones de permisos
    null;
end $$;
