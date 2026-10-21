-- Tiempo para la migracion de fotos (R2, fase 2). TEMPORAL.
--
-- La llave de servicio hereda un limite de 8 segundos por consulta, y hay
-- registros de 14 a 17 MB (INF-001, OB-031, INF-032, OB-014): leerlos o
-- escribirlos tarda mas y la base corta la consulta. Mientras se corre
-- scripts/migrar-fotos-storage.mjs se le dan 5 minutos.
--
-- No afecta a los usuarios de la aplicacion: usan el rol authenticated, que
-- tiene su propio limite (60 s).
--
-- AL TERMINAR LA MIGRACION, volver a dejarlo como estaba:
--   alter role service_role reset statement_timeout;
--   notify pgrst, 'reload config';

alter role service_role set statement_timeout = '5min';
notify pgrst, 'reload config';
