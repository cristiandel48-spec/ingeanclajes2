# Cotización automática por WhatsApp

Diseño del flujo que atiende un mensaje de WhatsApp y responde con una
cotización, apoyado en lo que **ya existe** en ingeanclajes2.

---

## Antes de nada: qué ya está hecho

| Pieza | Estado |
|---|---|
| Base con `clientes`, `cotizaciones`, `obras` y RLS por empresa | ✅ funcionando |
| `armar-cotizacion` — interpreta texto libre y devuelve ítems del catálogo | ✅ funcionando |
| Catálogo de servicios con precios (`ITEMS_DB`) | ✅ funcionando |
| Cálculo de utilidad e IVA (`getQuoteProposals`) | ✅ funcionando |
| PDF de la cotización con su numeración | ✅ funcionando |
| Envío de correo con el PDF adjunto (Edge Function) | ✅ funcionando |
| **Recibir y responder por WhatsApp** | ❌ falta |
| **Registrar la conversación y evitar duplicados** | ❌ falta |

Lo que falta es **la puerta de entrada**, no el motor. Eso cambia por completo
qué conviene construir.

---

## 1. Plataforma: Edge Function de Supabase, no Zapier ni Make

**Recomendación: el webhook vive en una Edge Function**, al lado de
`armar-cotizacion` y `corregir-texto`.

Por qué, en este caso concreto:

- **El motor ya está en Supabase.** `armar-cotizacion` interpreta el pedido y
  cruza contra el catálogo real. Con Zapier o Make habría que sacar los datos
  fuera, procesarlos y devolverlos: tres saltos de red para algo que aquí es
  una llamada local.
- **La clave de la IA y la de servicio no salen.** Con una plataforma externa
  hay que darle una API key de Supabase con permisos amplios y guardarla en un
  tercero.
- **Coste.** Zapier cobra por tarea; cada mensaje serían 5–6 tareas. Con 300
  mensajes al mes son 1.800 tareas, que ya obliga a un plan de pago. Las Edge
  Functions entran en el plan que ya se paga.
- **RLS.** Las tablas filtran por `tenant_id` mediante políticas. Una Edge
  Function se autentica como servicio y respeta ese modelo; una plataforma
  externa tendría que replicar la lógica de empresa a mano.

**Cuándo elegiría n8n** (autoalojado, no Zapier): si se quisiera que Camila
—o quien lleve el CRM— pudiera cambiar el flujo sin tocar código, o si se
fueran a conectar muchos canales más (correo, formulario web, Instagram). En
ese caso, n8n llama a las mismas Edge Functions; no las reemplaza.

**Zapier y Power Automate los descarto** para esto: el coste por tarea y la
falta de control sobre reintentos y idempotencia no compensan.

---

## 2. Trigger: webhook de WhatsApp Cloud API

WhatsApp Cloud API (Meta) manda un `POST` a la URL que se registre.

```
POST https://<proyecto>.supabase.co/functions/v1/whatsapp-entrada
```

Del cuerpo se usan **cuatro campos**:

| Campo del webhook | Para qué |
|---|---|
| `entry[].changes[].value.messages[0].id` | **Identificador único del mensaje.** Es la clave de la idempotencia |
| `...messages[0].from` | Teléfono del remitente, en formato internacional (`573148634072`) |
| `...messages[0].text.body` | El texto del pedido |
| `...messages[0].timestamp` | Cuándo lo mandó, en epoch |
| `...contacts[0].profile.name` | Nombre del perfil de WhatsApp, como respaldo si el cliente no está en la base |

### Verificación del webhook

Meta hace primero un `GET` con `hub.challenge`. La función debe responderlo
tal cual, o no deja registrar la URL:

```ts
if (peticion.method === "GET") {
  const url = new URL(peticion.url);
  if (url.searchParams.get("hub.verify_token") === Deno.env.get("WA_VERIFY_TOKEN")) {
    return new Response(url.searchParams.get("hub.challenge"));
  }
  return new Response("no", { status: 403 });
}
```

### Responder rápido, procesar después

Meta espera un `200` en menos de **20 segundos** y reintenta si no lo recibe.
Interpretar el pedido con la IA puede tardar más. Por eso:

1. Se guarda el mensaje y se responde `200` de inmediato.
2. El trabajo pesado va en segundo plano (`EdgeRuntime.waitUntil`).

Sin esto, Meta reintenta, y cada reintento sería otra cotización.

---

## 3. Idempotencia: una tabla, una restricción

**El `id` del mensaje de WhatsApp es único y estable.** Esa es toda la
estrategia:

```sql
create table if not exists app.wa_mensajes (
  tenant_id      uuid not null references app.tenants(id) on delete cascade,
  wa_message_id  text not null,          -- el id que manda Meta
  telefono       text not null,
  texto          text,
  recibido_en    timestamptz not null default now(),
  estado         text not null default 'recibido',
    -- recibido → procesando → respondido | fallido | ignorado
  cotizacion_id  text,                   -- la que se generó, si se generó
  error          text,
  intentos       int not null default 0,
  primary key (tenant_id, wa_message_id)
);
```

La clave primaria hace el trabajo:

```sql
insert into app.wa_mensajes (tenant_id, wa_message_id, telefono, texto)
values ($1, $2, $3, $4)
on conflict (tenant_id, wa_message_id) do nothing
returning wa_message_id;
```

**Si no devuelve fila, ese mensaje ya se procesó**: se responde `200` y se
corta. Un reintento de Meta no genera una segunda cotización.

### Evitar bucles

Tres validaciones antes de procesar:

1. **Ignorar los mensajes propios.** El webhook también notifica lo que
   envía el negocio (`statuses`, y mensajes con `from` igual al número
   propio). Si `from === WA_PHONE_NUMBER`, se descarta.
2. **Solo `type === "text"`.** Audios, ubicaciones y stickers se registran
   como `ignorado` y se responde pidiendo que escriba el pedido.
3. **Tope por remitente.** Máximo **3 cotizaciones automáticas por teléfono
   cada 24 horas**. Al cuarto mensaje se avisa a la empresa y se responde que
   un asesor va a contestar. Esto corta el caso de un cliente que manda diez
   mensajes seguidos y también un posible bucle con otro bot.

---

## 4. Arquitectura

```
Cliente en WhatsApp
        │  POST
        ▼
┌───────────────────────────────────────────────┐
│  Edge Function  whatsapp-entrada              │
│                                               │
│  1. ¿es GET? → responder hub.challenge        │
│  2. insert on conflict do nothing             │
│     └─ ya existía → 200 y fuera               │
│  3. validar: no propio, texto, bajo el tope   │
│  4. responder 200  ◄── antes de los 20 s      │
│                                               │
│  waitUntil:                                   │
│  5. buscar cliente por teléfono               │
│  6. llamar a armar-cotizacion (Groq)          │
│  7. cruzar con catálogo y calcular            │
│  8. guardar cotización en estado Borrador     │
│  9. enviar respuesta por WhatsApp             │
│ 10. marcar respondido / fallido               │
└───────────────────────────────────────────────┘
```

---

## 5. Tablas

### Las que ya existen y se reutilizan

**`app.clientes`** — se busca por `telefono`. Ya tiene `nombre`, `nit`,
`ciudad`, `direccion`, `contacto`, `email`.

El teléfono en la base está como lo escribió una persona (`315 288 9541`,
`3152889541`) y WhatsApp lo manda como `573152889541`. Hay que comparar
**solo los últimos 10 dígitos**:

```sql
create index if not exists clientes_tel_norm
  on app.clientes (right(regexp_replace(coalesce(telefono,''), '\D', '', 'g'), 10));
```

**`app.cotizaciones`** — la cotización generada se guarda aquí, con la misma
estructura que las que se hacen a mano. Reutiliza numeración, PDF y el flujo
de aprobación. Se le añade `origen`:

```sql
alter table app.cotizaciones
  add column if not exists origen text default 'manual';
  -- 'manual' | 'whatsapp'
```

**El catálogo** sigue en `ITEMS_DB` (`src/data/seed.js`). Si se quiere que los
precios se cambien sin publicar versión, hay que subirlo a una tabla:

```sql
create table if not exists app.catalogo_items (
  tenant_id     uuid not null references app.tenants(id) on delete cascade,
  id            text not null,
  categoria     text,
  descripcion   text not null,
  unidad        text not null,
  precio_base   numeric(14,2) not null,
  disponible    boolean not null default true,
  vigente_desde date not null default current_date,
  vigente_hasta date,
  primary key (tenant_id, id)
);
```

### Precio por cliente

Si un cliente tiene tarifa propia:

```sql
create table if not exists app.precios_cliente (
  tenant_id   uuid not null references app.tenants(id) on delete cascade,
  cliente_id  text not null,
  item_id     text not null,
  precio      numeric(14,2) not null,
  vigente_desde date not null default current_date,
  vigente_hasta date,
  primary key (tenant_id, cliente_id, item_id)
);
```

Orden de búsqueda del precio: **precio del cliente vigente hoy → precio base
del catálogo → si no hay, el ítem no se cotiza y se marca "a confirmar"**.

### Relaciones

```
clientes (telefono) ──┬── wa_mensajes (telefono)
                      └── cotizaciones (cliente) ── catalogo_items
                                   │
                            precios_cliente
```

---

## 6. Autenticación

### Supabase

La Edge Function usa `SUPABASE_SERVICE_ROLE_KEY`, que **ya está en los
secretos**. Es la única forma de escribir sin sesión de usuario. Nunca sale
del servidor.

El `tenant_id` no viene del mensaje: se resuelve por el **número de WhatsApp
que recibió** (`phone_number_id` del webhook), guardado en una tabla de
configuración. Así, si algún día hay más de una empresa, cada número escribe
en su sitio.

### WhatsApp

Dos secretos nuevos:

```bash
supabase secrets set WA_TOKEN=EAAG...          # token permanente del System User
supabase secrets set WA_PHONE_NUMBER_ID=1234   # id del número, no el número
supabase secrets set WA_VERIFY_TOKEN=<inventado, para el GET de verificación>
```

**Usar un token permanente de System User**, no el temporal de pruebas: ese
caduca a las 24 horas y el flujo se cae sin avisar.

---

## 7. La respuesta

```
Buenos días, Juan Carlos 👋

Recibimos su solicitud:
• Línea de vida horizontal · 120 metros
• Puntos de anclaje · 4 unidades

COTIZACIÓN PRELIMINAR C-26122
──────────────────────────────
Línea de vida horizontal
  120 ML × $270.000        $ 32.400.000
Punto de anclaje epóxico
  4 UN × $185.000          $    740.000
──────────────────────────────
Subtotal                   $ 33.140.000
Utilidad (10%)             $  3.314.000
IVA (19% sobre utilidad)   $    629.660
TOTAL                      $ 37.083.660

Incluye transporte, certificados de fábrica y
recertificación gratis al año siguiente.

⚠️ Valores preliminares sujetos a visita técnica.
La cotización en firme la confirma un asesor.

¿Quiere que agendemos la visita? Responda SÍ y lo
llamamos hoy mismo.

Ingeanclajes S.A.S · 315 288 9541
```

### Mapeo de campos

| En el mensaje | De dónde sale |
|---|---|
| `Juan Carlos` | `clientes.contacto`, o el nombre del perfil de WhatsApp |
| `Buenos días / tardes` | Hora del `timestamp`, zona `America/Bogota` |
| Descripción del ítem | `catalogo_items.descripcion` — **nunca lo que devolvió la IA** |
| Cantidad | Lo que interpretó `armar-cotizacion` |
| Precio unitario | `precios_cliente` → `catalogo_items.precio_base` |
| Utilidad e IVA | `getQuoteProposals` (10% y 19% sobre la utilidad) |
| `C-26122` | `getNextCotizacionNumero` |
| Texto de lo que incluye | `DEFAULT_COT_INCLUYE` |

**La descripción y la unidad salen siempre del catálogo, no del modelo.** Es
la misma regla que ya sigue `asistenteCotizacion.js`, y por el mismo motivo:
que la IA no invente un servicio que no se presta.

---

## 8. Errores

| Situación | Qué hace |
|---|---|
| **Cliente no existe** | Se crea con lo que hay: teléfono y nombre del perfil, `estado = 'Prospecto'`. Se cotiza igual, con precio de catálogo. Aparece en Clientes para completarlo |
| **Producto no está en el catálogo** | Se cotiza lo que sí se reconoció y se dice: *"Sobre [lo pedido] necesitamos revisarlo con un asesor"*. Nunca se inventa un precio |
| **Producto marcado no disponible** | Se cotiza igual pero se avisa del tiempo de entrega, y se sugieren los ítems de la misma categoría |
| **No se entendió nada** | Se pide que lo diga de otra forma, con un ejemplo: *"120 metros de línea de vida y 4 puntos de anclaje"*. Se marca `ignorado` |
| **Supabase falla** | Tres reintentos con espera creciente (1 s, 4 s, 16 s). Si sigue fallando: `estado = 'fallido'`, `error` con el motivo, y correo al administrador con la Edge Function de correo que ya existe |
| **La IA falla o tarda** | Sin cotización automática. Se responde acusando recibo y avisando que un asesor contesta, y se notifica a la empresa. **Nunca se responde con precios a medias** |
| **Envío de WhatsApp falla** | Reintento a los 30 s y a los 5 min. Si no, queda `fallido` y se avisa. El mensaje se ve igual en el CRM |
| **Límite de tasa (429)** | Respetar `Retry-After`. Los mensajes esperan en `wa_mensajes` con estado `recibido` y los recoge el reintento programado |
| **Fuera de la ventana de 24 h** | WhatsApp **no deja** enviar texto libre si el cliente no ha escrito en 24 horas. Hay que usar una plantilla aprobada por Meta. Como aquí siempre se responde a un mensaje entrante, la ventana está abierta — salvo que el proceso se retrase mucho, y por eso el reintento máximo es de 5 minutos |

---

## 9. Escalabilidad

**El volumen real no es el problema.** Ingeanclajes maneja unas 20
cotizaciones al mes; aunque WhatsApp multiplicara eso por diez, son 7
mensajes al día. Las Edge Functions aguantan eso sin despeinarse.

Lo que sí hay que cuidar:

- **La cuota de Groq.** El plan gratuito tiene límite por minuto. Con este
  volumen sobra, pero el tope de 3 cotizaciones por teléfono cada 24 h evita
  que alguien la agote a propósito.
- **La cola ya está.** `wa_mensajes` con su columna `estado` **es** la cola.
  No hace falta Redis ni nada aparte: un `pg_cron` cada 5 minutos recoge los
  que quedaron en `recibido` o `fallido` con menos de 3 intentos.
- **Caché del catálogo.** Se lee en cada mensaje pero cambia una vez al mes.
  Se puede guardar en memoria de la función con un TTL de 10 minutos.
- **Cuándo pasar a otra cosa:** por encima de ~100 mensajes al día, mover el
  procesamiento a una cola de verdad (pgmq en Supabase, o n8n con su cola).
  Hoy sería sobreingeniería.

---

## 10. Lo que hay que decidir antes de construir

**Esto es lo que más importa de todo el documento.**

Una cotización de Ingeanclajes no es un precio de catálogo: son 37 millones de
pesos que dependen de metros medidos en sitio, del tipo de cubierta, de si hay
que fabricar escalera, y de una visita técnica. El sistema ya lo refleja —hay
medición satelital, fotos, propuestas alternativas—.

**Mandar un total por WhatsApp sin que nadie lo mire tiene un riesgo comercial
real**: el cliente puede tomarlo como oferta en firme.

Tres opciones, de menos a más riesgo:

1. **Acuse + aviso interno.** El sistema responde "recibimos su solicitud, un
   asesor lo contacta", crea el borrador en el CRM y avisa por correo. El
   cliente siente respuesta inmediata y nadie se compromete a un precio.
2. **Preliminar con advertencia** (lo que está en la plantilla de arriba).
   Precios claramente marcados como sujetos a visita técnica.
3. **Cotización en firme automática.** No lo recomiendo para este negocio.

Mi recomendación: **empezar por la 1**, y pasar a la 2 cuando se vea que la
extracción acierta con los pedidos reales. El código es el mismo; lo único que
cambia es si la respuesta lleva o no los números.

---

## 11. Orden de construcción

| Paso | Qué | Depende de |
|---|---|---|
| 1 | Cuenta de WhatsApp Business API y número verificado en Meta | Nada del código |
| 2 | Migración: `wa_mensajes`, `origen` en cotizaciones, índice de teléfono | 1 |
| 3 | Edge Function `whatsapp-entrada`: verificación, idempotencia, `200` rápido | 2 |
| 4 | Responder acuse de recibo y crear borrador en el CRM (**opción 1**) | 3 |
| 5 | Ver una semana de mensajes reales y medir si `armar-cotizacion` acierta | 4 |
| 6 | Si acierta: añadir los números a la respuesta (**opción 2**) | 5 |
| 7 | Pantalla en el CRM para ver la conversación de cada cotización | 4 |

Los pasos 2 a 4 son unas pocas horas, porque el motor ya existe. **El paso 1
es el que más tarda**: Meta pide verificar el negocio y puede llevar días.
