// Puerta de entrada de WhatsApp.
//
// Meta manda aqui cada mensaje que le escriben al numero de la empresa. Esta
// funcion NO cotiza: recibe, guarda, evita duplicados y contesta. El motor de
// cotizacion ya existe -armar-cotizacion- y se llama despues, cuando el modo
// configurado lo pida.
//
// Desplegar:  supabase functions deploy whatsapp-entrada --no-verify-jwt
//
//   OJO CON --no-verify-jwt. Es obligatorio: Meta no manda ningun token de
//   Supabase, asi que con la verificacion encendida rechazaria todos los
//   mensajes con un 401 y el webhook nunca funcionaria. A cambio, la funcion
//   queda abierta a internet, y por eso lo primero que hace es comprobar la
//   firma del cuerpo con el secreto de la aplicacion de Meta: sin esa firma
//   valida, no se procesa nada.
//
// Secretos:
//   supabase secrets set WA_VERIFY_TOKEN=<inventado, para el GET de alta>
//   supabase secrets set WA_APP_SECRET=<«App Secret» de la app de Meta>
//   supabase secrets set WA_TOKEN=<token permanente del System User>

import { createClient } from "jsr:@supabase/supabase-js@2";

const WA_VERIFY_TOKEN = Deno.env.get("WA_VERIFY_TOKEN") ?? "";
const WA_APP_SECRET   = Deno.env.get("WA_APP_SECRET") ?? "";
const WA_TOKEN        = Deno.env.get("WA_TOKEN") ?? "";
const WA_API          = Deno.env.get("WA_API") ?? "https://graph.facebook.com/v21.0";

// Un pedido de cotizacion son unas frases. Mas que esto se guarda recortado:
// no se procesa un libro ni se llena la base con el.
const MAX_TEXTO = 4000;

// Tope por telefono en 24 horas. Corta al cliente que manda diez mensajes
// seguidos y tambien un posible bucle con otro bot al otro lado.
const MAX_POR_TELEFONO_24H = 10;

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ── Firma del cuerpo ─────────────────────────────────────────────────────────
// Meta firma cada envio con el App Secret. Es lo unico que distingue un mensaje
// de verdad de alguien que descubrio la direccion y manda lo que quiere.
async function firmaValida(cuerpo: string, cabecera: string | null) {
  if (!WA_APP_SECRET) return false;      // sin secreto configurado no se acepta nada
  if (!cabecera?.startsWith("sha256=")) return false;

  const clave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(WA_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const firmado = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(cuerpo));
  const esperado = [...new Uint8Array(firmado)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const recibido = cabecera.slice("sha256=".length);

  // Comparacion en tiempo constante: comparar con === filtra informacion por
  // el tiempo que tarda en fallar.
  if (esperado.length !== recibido.length) return false;
  let diferencia = 0;
  for (let i = 0; i < esperado.length; i += 1) {
    diferencia |= esperado.charCodeAt(i) ^ recibido.charCodeAt(i);
  }
  return diferencia === 0;
}

// ── Mandar un mensaje de vuelta ─────────────────────────────────────────────
async function responderWhatsApp(phoneNumberId: string, para: string, texto: string) {
  const respuesta = await fetch(`${WA_API}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WA_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: para,
      type: "text",
      text: { body: texto },
    }),
  });
  if (!respuesta.ok) {
    throw new Error(`WhatsApp respondio ${respuesta.status}: ${await respuesta.text()}`);
  }
}

// «Buenos dias» segun la hora de Colombia, no la del servidor.
function saludo(fecha = new Date()) {
  const hora = Number(
    new Intl.DateTimeFormat("es-CO", {
      timeZone: "America/Bogota", hour: "numeric", hour12: false,
    }).format(fecha),
  );
  if (hora < 12) return "Buenos días";
  if (hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

// ── Lo que se contesta ──────────────────────────────────────────────────────
// De momento solo el acuse. Es a proposito: una cotizacion de esta empresa
// depende de metros medidos en sitio y de una visita tecnica, y un total
// mandado sin que nadie lo mire puede tomarse como oferta en firme. Cuando se
// vea que el interprete acierta con los pedidos reales, se pasa el modo de la
// empresa a «preliminar» y se agregan los valores. El resto del flujo no
// cambia.
function mensajeAcuse(nombre: string | null) {
  const quien = nombre ? `, ${nombre}` : "";
  return [
    `${saludo()}${quien} 👋`,
    "",
    "Recibimos su solicitud y ya quedó registrada. Un asesor la revisa y lo contacta hoy mismo para confirmarle los detalles.",
    "",
    "Si quiere adelantar, cuéntenos por aquí *qué necesita*, *cuántos metros* y *en qué ciudad*.",
    "",
    "Ingeanclajes S.A.S",
  ].join("\n");
}

Deno.serve(async (peticion) => {
  const url = new URL(peticion.url);

  // ── Alta del webhook ──────────────────────────────────────────────────────
  // Meta llama una vez con un GET y espera que se le devuelva su challenge tal
  // cual. Sin esto no deja registrar la direccion.
  if (peticion.method === "GET") {
    const token = url.searchParams.get("hub.verify_token");
    const reto = url.searchParams.get("hub.challenge");
    if (WA_VERIFY_TOKEN && token === WA_VERIFY_TOKEN && reto) {
      return new Response(reto, { status: 200 });
    }
    return new Response("no", { status: 403 });
  }

  if (peticion.method !== "POST") {
    return new Response("solo POST", { status: 405 });
  }

  const crudo = await peticion.text();
  if (!(await firmaValida(crudo, peticion.headers.get("x-hub-signature-256")))) {
    console.error("Firma invalida: se descarta el envio.");
    return new Response("firma invalida", { status: 401 });
  }

  // A partir de aqui se responde 200 SIEMPRE. Meta espera respuesta en menos
  // de 20 segundos y reintenta si no la recibe; cada reintento seria otro
  // mensaje. Lo que falle se guarda y se mira en el CRM, no se le devuelve a
  // Meta como error.
  try {
    const cuerpo = JSON.parse(crudo);
    const cambio = cuerpo?.entry?.[0]?.changes?.[0]?.value;
    const mensaje = cambio?.messages?.[0];

    // Los avisos de entrega y lectura llegan por aqui tambien. No son un
    // mensaje del cliente y se ignoran sin ruido.
    if (!mensaje) return new Response("ok", { status: 200 });

    const phoneNumberId = String(cambio?.metadata?.phone_number_id ?? "");
    const { data: config } = await db
      .from("wa_config")
      .select("tenant_id, activo, modo")
      .eq("phone_number_id", phoneNumberId)
      .maybeSingle();

    if (!config) {
      console.error(`Llego un mensaje de un numero sin configurar: ${phoneNumberId}`);
      return new Response("ok", { status: 200 });
    }
    if (!config.activo) return new Response("ok", { status: 200 });

    const telefono = String(mensaje.from ?? "");
    const perfil = cambio?.contacts?.[0]?.profile?.name ?? null;
    const esTexto = mensaje.type === "text";
    const texto = esTexto ? String(mensaje.text?.body ?? "").slice(0, MAX_TEXTO) : null;

    // El id del mensaje es unico y estable: si Meta reintenta, este insert no
    // hace nada y se corta aqui. Es toda la defensa contra los duplicados.
    const { data: guardado, error: errorGuardar } = await db
      .from("wa_mensajes")
      .insert({
        tenant_id: config.tenant_id,
        wa_message_id: String(mensaje.id),
        telefono,
        perfil_nombre: perfil,
        texto,
        estado: esTexto ? "recibido" : "ignorado",
      })
      .select("wa_message_id")
      .maybeSingle();

    if (errorGuardar) {
      // 23505 = clave repetida: ya se habia procesado. No es un fallo.
      if (errorGuardar.code === "23505") return new Response("ok", { status: 200 });
      throw errorGuardar;
    }
    if (!guardado) return new Response("ok", { status: 200 });

    // El trabajo va aparte para poder contestarle a Meta ya mismo.
    const trabajo = (async () => {
      const cerrar = (campos: Record<string, unknown>) =>
        db.from("wa_mensajes")
          .update({ ...campos, actualizado_en: new Date().toISOString() })
          .eq("tenant_id", config.tenant_id)
          .eq("wa_message_id", String(mensaje.id));

      try {
        if (!esTexto) {
          await responderWhatsApp(phoneNumberId, telefono,
            "Recibimos su mensaje. Por aquí solo podemos leer texto: cuéntenos en un mensaje escrito qué necesita y con gusto lo atendemos.");
          await cerrar({ estado: "ignorado", respuesta: "no es texto" });
          return;
        }

        // Tope por telefono en las ultimas 24 horas.
        const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await db
          .from("wa_mensajes")
          .select("wa_message_id", { count: "exact", head: true })
          .eq("tenant_id", config.tenant_id)
          .eq("telefono", telefono)
          .gte("recibido_en", desde);

        if ((count ?? 0) > MAX_POR_TELEFONO_24H) {
          await cerrar({ estado: "ignorado", respuesta: "por encima del tope diario" });
          return;
        }

        // Si ya es cliente, se le saluda por su nombre. La comparacion de
        // telefonos la hace la base, que para eso tiene el indice.
        const { data: encontrados } = await db.rpc("cliente_por_telefono", {
          p_tenant: config.tenant_id,
          p_telefono: telefono,
        });
        const suyo = Array.isArray(encontrados) ? encontrados[0] : encontrados;

        const nombre = suyo?.contacto || suyo?.nombre || perfil || null;
        const respuesta = mensajeAcuse(nombre);

        await responderWhatsApp(phoneNumberId, telefono, respuesta);
        await cerrar({ estado: "respondido", respuesta });
      } catch (fallo) {
        console.error("No se pudo atender el mensaje:", fallo);
        await cerrar({
          estado: "fallido",
          error: String((fallo as Error)?.message ?? fallo).slice(0, 500),
        });
      }
    })();

    // @ts-ignore EdgeRuntime lo aporta Supabase en tiempo de ejecucion.
    if (typeof EdgeRuntime !== "undefined") EdgeRuntime.waitUntil(trabajo);
    else await trabajo;

    return new Response("ok", { status: 200 });
  } catch (fallo) {
    // Ni aqui se devuelve error: si se devolviera, Meta reintentaria y el
    // problema se multiplicaria. Queda en los registros de la funcion.
    console.error("Fallo procesando el webhook:", fallo);
    return new Response("ok", { status: 200 });
  }
});
