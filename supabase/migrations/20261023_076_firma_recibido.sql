-- Migracion 076: firma de recibido del cliente.
--
-- POR QUE: el informe se mandaba como adjunto y no quedaba prueba de que el
-- cliente lo hubiera recibido. Si despues decia que no le llego el trabajo o
-- la documentacion, no habia con que mostrar lo contrario.
--
-- COMO FUNCIONA:
--
--   1. Desde el informe se pulsa «Enviar para firma». El PDF se guarda en el
--      bucket privado «firmas» y se le saca la huella SHA-256: con ella se
--      puede demostrar despues que el documento firmado es ese y no otro.
--   2. Al cliente le llega un correo con un enlace unico (token de 128 bits).
--      Cada vez que lo abre queda registrado, aunque no firme.
--   3. Para firmar, pide un codigo de 6 digitos que llega a ESE correo: asi se
--      prueba que quien firma controla la direccion a la que se envio.
--      Escribe nombre, documento y cargo, firma con el dedo o el mouse y
--      acepta el texto de recibido.
--   4. Queda la hora del servidor, la IP, el navegador, el correo verificado
--      y la huella. Con eso se arma la «Constancia de recepcion» que se pega
--      al final del PDF, con un QR que abre la verificacion publica.
--
-- Es una firma electronica en el sentido de la Ley 527 de 1999 y el Decreto
-- 2364 de 2012: identifica a quien firma (correo verificado con codigo y sus
-- datos) y deja constancia de que acepto. No es una firma digital
-- certificada.
--
-- Toda escritura la hace la funcion «firma-recibido» con la llave de servicio:
-- el navegador del equipo solo puede LEER el estado de sus envios, y el del
-- cliente no toca la base. La verificacion publica es una funcion que solo
-- devuelve lo que ya va impreso en la constancia.
--
-- Es idempotente: se puede volver a ejecutar sin error.

create table if not exists app.firmas_documento (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references app.tenants(id) on delete cascade,

  -- Que se envio. Hoy solo «informe»; la tabla sirve igual para cotizaciones
  -- y certificados mas adelante.
  tipo_documento text not null default 'informe' check (tipo_documento in ('informe', 'cotizacion', 'certificado')),
  documento_id text not null,
  documento_numero text,
  titulo text,
  cliente text,

  -- A quien y por quien.
  para_email text not null,
  para_nombre text,
  enviado_por uuid,
  enviado_por_email text,
  enviado_en timestamptz not null default now(),
  vence_en timestamptz not null default (now() + interval '30 days'),

  -- El enlace del correo. Nunca se muestra en la verificacion publica.
  token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  -- El que va en el QR de la constancia. Distinto del token: quien vea la
  -- constancia puede verificarla, pero no firmar ni ver el enlace original.
  codigo_verificacion text not null unique default replace(gen_random_uuid()::text, '-', ''),

  -- El documento exacto que se envio.
  pdf_ruta text not null,
  pdf_sha256 text not null,
  pdf_bytes integer,
  pdf_nombre text,

  estado text not null default 'enviado' check (estado in ('enviado', 'abierto', 'firmado', 'anulado')),

  -- Aperturas del enlace.
  abierto_en timestamptz,
  abierto_ip text,
  abierto_agente text,
  veces_abierto integer not null default 0,

  -- Codigo de un solo uso. Se guarda solo su huella, nunca el codigo.
  codigo_hash text,
  codigo_vence_en timestamptz,
  codigo_intentos integer not null default 0,
  codigos_enviados integer not null default 0,
  codigo_enviado_en timestamptz,

  -- La firma.
  firmado_en timestamptz,
  firmante_nombre text,
  firmante_documento text,
  firmante_cargo text,
  firmante_empresa text,
  firmante_email text,
  -- Lo que el cliente quiera dejar anotado al firmar (pendientes, reparos).
  firmante_observaciones text,
  firma_imagen text,
  firma_ip text,
  firma_agente text,
  texto_aceptado text,

  anulado_en timestamptz,
  anulado_por_email text,

  -- Rastro de todo lo que paso, en orden: [{evento, en, ip, agente, detalle}].
  eventos jsonb not null default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_firmas_documento_doc
  on app.firmas_documento(tenant_id, tipo_documento, documento_id);

drop trigger if exists trg_firmas_documento_updated_at on app.firmas_documento;
create trigger trg_firmas_documento_updated_at
before update on app.firmas_documento
for each row execute function app.set_updated_at();

comment on table app.firmas_documento is
  'Envios de documentos al cliente para firma de recibido. Solo escribe la funcion firma-recibido.';

-- El equipo ve el estado de los envios de su empresa. No inserta ni cambia:
-- eso pasa por la funcion, que valida y deja el rastro.
alter table app.firmas_documento enable row level security;

drop policy if exists firmas_documento_leer on app.firmas_documento;
create policy firmas_documento_leer on app.firmas_documento
for select to authenticated
using (tenant_id in (select app.current_user_tenant_ids()));

-- Los permisos por defecto del esquema dan todo a «authenticated»: se quitan
-- y se devuelve solo la lectura de columnas. El token del enlace y la huella
-- del codigo quedan fuera: la aplicacion no los necesita, y con el token
-- cualquiera del equipo podria firmar en nombre del cliente.
revoke all on app.firmas_documento from anon, authenticated;
grant select (
  id, tenant_id, tipo_documento, documento_id, documento_numero, titulo, cliente,
  para_email, para_nombre, enviado_por, enviado_por_email, enviado_en, vence_en,
  codigo_verificacion, pdf_ruta, pdf_sha256, pdf_bytes, pdf_nombre, estado,
  abierto_en, abierto_ip, abierto_agente, veces_abierto,
  codigo_vence_en, codigo_intentos, codigos_enviados, codigo_enviado_en,
  firmado_en, firmante_nombre, firmante_documento, firmante_cargo, firmante_empresa,
  firmante_email, firmante_observaciones, firma_imagen, firma_ip, firma_agente, texto_aceptado,
  anulado_en, anulado_por_email, eventos, created_at, updated_at
) on app.firmas_documento to authenticated;
grant all on app.firmas_documento to service_role;

-- Bucket privado de los PDF enviados a firma. Lo sube la funcion; el equipo
-- lo puede descargar para armar la copia con la constancia.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('firmas', 'firmas', false, 26214400, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists firmas_leer on storage.objects;
create policy firmas_leer on storage.objects
for select to authenticated
using (
  bucket_id = 'firmas'
  and (storage.foldername(name))[1] in (select t::text from app.current_user_tenant_ids() t)
);

-- Verificacion publica del QR de la constancia. Devuelve solo lo que ya va
-- impreso en ella; sin el codigo exacto no devuelve nada.
create or replace function app.verificar_firma(p_codigo text)
returns table (
  tipo_documento text,
  documento_numero text,
  titulo text,
  cliente text,
  estado text,
  enviado_en timestamptz,
  para_email text,
  abierto_en timestamptz,
  firmado_en timestamptz,
  firmante_nombre text,
  firmante_documento text,
  firmante_cargo text,
  firmante_empresa text,
  pdf_sha256 text
)
language sql
stable
security definer
set search_path = app, public
as $$
  select f.tipo_documento, f.documento_numero, f.titulo, f.cliente, f.estado,
         f.enviado_en,
         -- El correo va enmascarado: c***@dominio.com
         regexp_replace(f.para_email, '^(.).*(@.*)$', '\1***\2'),
         f.abierto_en, f.firmado_en, f.firmante_nombre,
         -- Del documento solo los ultimos 4 digitos.
         case when f.firmante_documento is null then null
              else '***' || right(f.firmante_documento, 4) end,
         f.firmante_cargo, f.firmante_empresa, f.pdf_sha256
    from app.firmas_documento f
   where length(coalesce(p_codigo, '')) >= 16
     and f.codigo_verificacion = p_codigo
   limit 1;
$$;

revoke execute on function app.verificar_firma(text) from public;
grant execute on function app.verificar_firma(text) to anon, authenticated, service_role;

-- Comprobacion:
-- select id, public from storage.buckets where id = 'firmas';
-- select policyname from pg_policies where tablename = 'firmas_documento';
