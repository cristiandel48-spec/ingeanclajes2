-- Control de documentos: codigo y version de cada formato.
--
-- Lo piden los sistemas de gestion -ISO 9001, ISO 45001, el SG-SST-: cada
-- formato se identifica con su codigo y su version, para saber cual es la
-- plantilla vigente y que no circulen versiones viejas.
--
-- Va en una sola columna jsonb y no en nueve columnas sueltas porque son tres
-- documentos con tres datos cada uno, y manana pueden ser cinco documentos.
-- Asi se agregan sin tocar la base.
--
-- Forma:
--   {
--     "cotizacion":    {"codigo":"IA-FT-01","version":"1","fecha":"2026-08-14"},
--     "informe":       {"codigo":"IA-FT-02","version":"1","fecha":"2026-08-14"},
--     "certificacion": {"codigo":"IA-FT-03","version":"1","fecha":"2026-08-14"}
--   }
--
-- Un codigo vacio significa «este documento no lleva cuadro de control», y
-- entonces no se imprime nada.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.empresa_config
  add column if not exists control_documental jsonb;

comment on column app.empresa_config.control_documental is
  'Codigo, version y fecha de cada formato. La version se sube desde la '
  'pantalla cuando se modifica la plantilla, sin publicar una version nueva '
  'del programa: eso es lo que de verdad hace falta para cumplir.';

-- Los primeros codigos de la empresa. Solo se ponen si la fila existe y aun no
-- tiene nada, para no pisar lo que se configure despues.
update app.empresa_config
   set control_documental = jsonb_build_object(
         'cotizacion',    jsonb_build_object('codigo', 'IA-FT-01', 'version', '1', 'fecha', '2026-08-14'),
         'informe',       jsonb_build_object('codigo', 'IA-FT-02', 'version', '1', 'fecha', '2026-08-14'),
         'certificacion', jsonb_build_object('codigo', 'IA-FT-03', 'version', '1', 'fecha', '2026-08-14')
       )
 where id = 'empresa'
   and control_documental is null;
