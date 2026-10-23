-- Migracion 077: quien recibe la documentacion de cada obra.
--
-- POR QUE: para enviar el informe de actividades a firma de recibido
-- (migracion 076) hace falta el correo del cliente, y la obra no lo tenia: el
-- informe solo lo encontraba si la obra venia de una cotizacion con correo de
-- contacto. Ahora la obra guarda a quien se le entregan los documentos -casi
-- siempre el residente o el interventor de esa obra, que no siempre es el
-- contacto comercial de la cotizacion-.
--
-- La aplicacion lo pide antes del primer registro de bitacora, lo copia de la
-- cotizacion al aprobarla y lo sube al directorio de clientes si alli no hay
-- correo.
--
-- APLICAR ANTES de publicar la version de la aplicacion que lo usa: sin estas
-- columnas el guardado de obras cae a la fila de respaldo, que no lleva la
-- bitacora.
--
-- Es idempotente: se puede volver a ejecutar sin error.

alter table app.obras add column if not exists recibe_nombre text;
alter table app.obras add column if not exists recibe_email text;

comment on column app.obras.recibe_nombre is
  'Quien recibe los documentos de la obra (informes) por parte del cliente.';
comment on column app.obras.recibe_email is
  'Correo al que se envian los informes para firma de recibido.';
