-- Migracion 062: verificacion real de los certificados por QR.
--
-- Antes, la pagina de verificacion mostraba «Certificacion Oficial Valida»
-- con los datos que venian escritos en la direccion del QR: no consultaba
-- nada. Cualquiera podia armar un enlace con un folio y un cliente inventados
-- y la pagina lo daba por bueno con la marca y la matricula del ingeniero.
--
-- Ahora:
--
--   1. Cada certificado tiene un codigo_verificacion aleatorio, imposible de
--      adivinar. Es lo que lleva el QR nuevo (?v=2&k=<codigo>).
--   2. app.verificar_certificado(slug, codigo) devuelve el certificado tal
--      como esta guardado. Si el codigo no existe, no devuelve nada.
--   3. Para los QR que ya se imprimieron (llevan folio y cliente en la
--      direccion), app.verificar_certificado_folio(slug, folio, cliente) lo
--      busca en la base y exige que coincidan los dos. Asi un folio suelto no
--      sirve para recorrer la lista de clientes.
--
-- Las dos funciones son security definer y solo devuelven columnas que ya
-- estan impresas en el certificado. Se pueden llamar sin sesion (anon),
-- porque quien escanea el QR es el cliente o un inspector, no un usuario.
--
-- Es idempotente: se puede volver a ejecutar sin error.

-- Un valor volatil por defecto se calcula fila por fila: los certificados
-- que ya existen reciben cada uno su propio codigo.
alter table app.certificaciones
  add column if not exists codigo_verificacion text
  default replace(gen_random_uuid()::text, '-', '');

update app.certificaciones
   set codigo_verificacion = replace(gen_random_uuid()::text, '-', '')
 where codigo_verificacion is null;

create unique index if not exists idx_certificaciones_codigo_verificacion
  on app.certificaciones(codigo_verificacion);

comment on column app.certificaciones.codigo_verificacion is
  'Codigo aleatorio que lleva el QR del certificado. Lo consulta app.verificar_certificado.';

create or replace function app.verificar_certificado(p_slug text, p_codigo text)
returns table (
  numero text,
  id text,
  tipo text,
  fecha date,
  cliente text,
  nit text,
  direccion text,
  sistema text,
  normativa text,
  ingeniero text,
  matricula text,
  estado text,
  prox_mant date
)
language sql
stable
security definer
set search_path = app, public
as $$
  select c.numero, c.id, c.tipo, c.fecha, c.cliente, c.nit, c.direccion,
         c.sistema, c.normativa, c.ingeniero, c.matricula, c.estado, c.prox_mant
    from app.certificaciones c
    join app.tenants t on t.id = c.tenant_id
   where t.slug = p_slug
     and length(coalesce(p_codigo, '')) >= 16
     and c.codigo_verificacion = p_codigo
   limit 1;
$$;

create or replace function app.verificar_certificado_folio(p_slug text, p_folio text, p_cliente text)
returns table (
  numero text,
  id text,
  tipo text,
  fecha date,
  cliente text,
  nit text,
  direccion text,
  sistema text,
  normativa text,
  ingeniero text,
  matricula text,
  estado text,
  prox_mant date
)
language sql
stable
security definer
set search_path = app, public
as $$
  select c.numero, c.id, c.tipo, c.fecha, c.cliente, c.nit, c.direccion,
         c.sistema, c.normativa, c.ingeniero, c.matricula, c.estado, c.prox_mant
    from app.certificaciones c
    join app.tenants t on t.id = c.tenant_id
   where t.slug = p_slug
     and trim(coalesce(p_folio, '')) <> ''
     and trim(coalesce(p_cliente, '')) <> ''
     and (c.numero = trim(p_folio) or c.id = trim(p_folio))
     and lower(trim(c.cliente)) = lower(trim(p_cliente))
   limit 1;
$$;

-- Postgres da EXECUTE a PUBLIC por defecto: se quita y se concede solo lo
-- necesario.
revoke execute on function app.verificar_certificado(text, text) from public;
revoke execute on function app.verificar_certificado_folio(text, text, text) from public;
grant execute on function app.verificar_certificado(text, text) to anon, authenticated, service_role;
grant execute on function app.verificar_certificado_folio(text, text, text) to anon, authenticated, service_role;
