-- Puerta de entrada de WhatsApp: los mensajes que llegan y su estado.
--
-- El motor de cotizacion ya existe -armar-cotizacion cruza el pedido con el
-- catalogo-. Lo que falta es recibir el mensaje, no volver a procesarlo si
-- Meta lo reintenta, y dejar registro de que se hizo con el.
--
-- Es idempotente: se puede volver a ejecutar sin error.

-- ── De que numero de WhatsApp es cada empresa ────────────────────────────────
-- El tenant NO viene en el mensaje: se resuelve por el numero que recibio. Asi,
-- si algun dia hay mas de una empresa, cada una escribe en su sitio y un
-- mensaje no puede caer en la empresa equivocada.
create table if not exists app.wa_config (
  tenant_id        uuid not null references app.tenants(id) on delete cascade,
  phone_number_id  text not null,
  -- El numero tal cual, solo para poder reconocerlo en el panel.
  numero_visible   text,
  -- Con esto se apaga la automatizacion sin tocar codigo ni borrar el webhook.
  activo           boolean not null default true,
  -- 'acuse'       -> solo confirma que llego y avisa al asesor
  -- 'preliminar'  -> ademas manda los valores, marcados como preliminares
  modo             text not null default 'acuse',
  creado_en        timestamptz not null default now(),
  primary key (phone_number_id)
);

comment on table app.wa_config is
  'Que empresa atiende cada numero de WhatsApp. La clave es el phone_number_id '
  'porque es lo que manda Meta en el webhook, no el numero escrito.';

comment on column app.wa_config.modo is
  'acuse = responde que se recibio y avisa al asesor. preliminar = ademas manda '
  'los valores. Se empieza en acuse: una cotizacion de esta empresa depende de '
  'metros medidos en sitio, y un total mandado solo puede tomarse como oferta '
  'en firme.';

-- ── Los mensajes ────────────────────────────────────────────────────────────
create table if not exists app.wa_mensajes (
  tenant_id      uuid not null references app.tenants(id) on delete cascade,
  -- El id que manda Meta. Es unico y estable, y es TODA la estrategia contra
  -- los duplicados: si Meta reintenta, el insert no hace nada y no se genera
  -- una segunda cotizacion.
  wa_message_id  text not null,
  telefono       text not null,
  -- Nombre del perfil de WhatsApp. Sirve de respaldo cuando quien escribe no
  -- esta en la base de clientes.
  perfil_nombre  text,
  texto          text,
  recibido_en    timestamptz not null default now(),
  -- recibido -> procesando -> respondido | fallido | ignorado
  estado         text not null default 'recibido',
  cotizacion_id  text,
  respuesta      text,
  error          text,
  intentos       int not null default 0,
  actualizado_en timestamptz not null default now(),
  primary key (tenant_id, wa_message_id)
);

comment on table app.wa_mensajes is
  'Cada mensaje entrante de WhatsApp y que se hizo con el. La columna estado '
  'hace ademas de cola: lo que quede en recibido o fallido con menos de tres '
  'intentos se puede recoger despues.';

-- Para la pantalla del CRM: la conversacion de un telefono, lo mas nuevo
-- primero, y lo que quedo pendiente de atender.
create index if not exists wa_mensajes_telefono
  on app.wa_mensajes (tenant_id, telefono, recibido_en desc);
create index if not exists wa_mensajes_pendientes
  on app.wa_mensajes (tenant_id, estado, recibido_en)
  where estado in ('recibido', 'fallido');

-- ── Encontrar al cliente por su telefono ────────────────────────────────────
-- En la base el telefono esta como lo escribio una persona -«315 288 9541»,
-- «3152889541»- y WhatsApp lo manda con el indicativo: «573152889541». Se
-- comparan los ultimos 10 digitos, que es la parte que siempre coincide.
create index if not exists clientes_tel_norm
  on app.clientes (tenant_id, right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 10));

-- Busca al cliente por telefono usando ese indice. Va como funcion y no como
-- consulta desde la Edge Function porque la comparacion es una expresion: sin
-- esto habria que traerse la tabla de clientes entera y filtrarla en memoria
-- en cada mensaje.
create or replace function app.cliente_por_telefono(p_tenant uuid, p_telefono text)
returns table (id text, nombre text, contacto text, email text, ciudad text)
language sql
stable
security definer
set search_path = app, public
as $$
  select c.id, c.nombre, c.contacto, c.email, c.ciudad
    from app.clientes c
   where c.tenant_id = p_tenant
     and right(regexp_replace(coalesce(c.telefono, ''), '\D', '', 'g'), 10)
       = right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 10)
     and length(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g')) >= 10
   limit 1;
$$;

comment on function app.cliente_por_telefono(uuid, text) is
  'El telefono en la base esta escrito a mano -«315 288 9541»- y WhatsApp lo '
  'manda con indicativo -«573152889541»-. Se comparan los ultimos 10 digitos, '
  'que es la parte que siempre coincide. Exige 10 digitos para no emparejar '
  'numeros cortos con cualquiera.';

-- ── De donde salio cada cotizacion ──────────────────────────────────────────
alter table app.cotizaciones
  add column if not exists origen text not null default 'manual';

comment on column app.cotizaciones.origen is
  'manual | whatsapp. Sirve para saber cuales nacieron solas y revisar si el '
  'interprete esta acertando antes de darle mas cuerda.';

-- ── Permisos ────────────────────────────────────────────────────────────────
-- Las dos tablas nuevas se leen desde la aplicacion con la sesion de la
-- persona, igual que el resto, y solo de su empresa.
alter table app.wa_mensajes enable row level security;
alter table app.wa_config   enable row level security;

drop policy if exists wa_mensajes_tenant_select on app.wa_mensajes;
create policy wa_mensajes_tenant_select on app.wa_mensajes
for select
using (tenant_id in (select app.current_user_tenant_ids()));

drop policy if exists wa_config_tenant_select on app.wa_config;
create policy wa_config_tenant_select on app.wa_config
for select
using (tenant_id in (select app.current_user_tenant_ids()));

-- Escribir es cosa de la Edge Function, que entra con la clave de servicio y
-- se salta RLS. Desde el navegador no se escribe: asi nadie puede inventarse
-- un mensaje entrante ni marcar como respondido lo que no se respondio.
