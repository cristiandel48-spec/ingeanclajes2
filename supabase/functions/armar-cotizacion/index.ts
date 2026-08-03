// Arma el borrador de una cotizacion a partir de un texto dictado.
//
// La persona dice algo como "cotizacion para Constructora Velez en Medellin,
// 120 metros de linea de vida horizontal y 4 puntos de anclaje epoxico" y
// esta funcion devuelve los campos separados y los items del catalogo que
// mejor encajan. NO crea nada: devuelve una propuesta que la persona revisa
// y acepta o descarta en pantalla.
//
// Vive en el servidor porque la clave de la IA jamas puede viajar al
// navegador: todo lo que va en el bundle de Vite queda a la vista de
// cualquiera, y con esa clave se puede gastar la cuota ajena.
//
// Desplegar:  supabase functions deploy armar-cotizacion
// Secretos:   supabase secrets set GROQ_API_KEY=...
//
// El proveedor se cambia con variables de entorno, sin tocar codigo:
//   IA_URL     (por defecto, la API de Groq, compatible con OpenAI)
//   IA_MODELO  (por defecto, un modelo rapido de Groq)
// Cualquier servicio con API compatible con OpenAI sirve igual.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IA_URL = Deno.env.get("IA_URL") ?? "https://api.groq.com/openai/v1/chat/completions";
const IA_MODELO = Deno.env.get("IA_MODELO") ?? "llama-3.3-70b-versatile";

// Un dictado de cotizacion son unas pocas frases. El tope corta de raiz que
// alguien mande un libro y consuma la cuota gratuita de una sentada.
const MAX_CARACTERES = 4000;

const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

function construirInstruccion(catalogo: string) {
  return [
    "Eres un asistente de una empresa colombiana que instala sistemas anticaidas:",
    "lineas de vida, puntos de anclaje, escaleras y certificaciones.",
    "",
    "Recibes la transcripcion de alguien dictando los datos de una cotizacion.",
    "Devuelves UNICAMENTE un objeto JSON con esta forma exacta:",
    "{",
    '  "cliente": string,        // razon social o nombre; "" si no se dijo',
    '  "contacto": string,       // persona de contacto; "" si no se dijo',
    '  "ciudad": string,         // ciudad de la obra; "" si no se dijo',
    '  "obra": string,           // sitio o nombre de la obra; "" si no se dijo',
    '  "telefono": string,       // solo digitos; "" si no se dijo',
    '  "alcance": string,        // descripcion del trabajo, redactada formal',
    '  "items": [{ "desc": string, "cant": number, "vu": number|null }],',
    '  "avisos": [string]        // que quedo dudoso o no se entendio',
    "}",
    "",
    "REGLAS:",
    "- `desc` de cada item debe ser EXACTAMENTE uno de los del catalogo. Si lo",
    "  dictado no encaja con ninguno, no lo inventes: dejalo fuera y explicalo",
    "  en `avisos`.",
    "- `vu` es el valor unitario. SOLO se pone si la persona dijo un precio",
    "  para ese item concreto (\"a 100 mil cada uno\", \"a 150.000 la unidad\").",
    "  Si no dijo precio, `vu` va en null y el sistema usa el del catalogo.",
    "  Nunca calcules ni supongas un precio: o lo dijeron, o va null.",
    "- No inventes cantidades, precios, nombres ni telefonos. Lo que no se dijo",
    "  va vacio. Es preferible un campo en blanco a un dato falso.",
    "- El dictado viene de voz: puede traer errores. Si un nombre propio suena",
    "  dudoso, ponlo igual y avisa en `avisos` que hay que revisarlo.",
    "- `alcance` se redacta en espanol formal, en tercera persona, sin saludos.",
    "- Responde solo el JSON, sin explicaciones ni ```.",
    "",
    "CATALOGO DE SERVICIOS (usa estas descripciones tal cual):",
    catalogo,
  ].join("\n");
}

Deno.serve(async (peticion) => {
  if (peticion.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (peticion.method !== "POST") return responder({ error: "Método no permitido" }, 405);

  const clave = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("IA_API_KEY");
  if (!clave) {
    return responder({
      error: "Falta configurar la clave de la IA. En Supabase: Edge Functions > Secrets > GROQ_API_KEY.",
    }, 500);
  }

  // Solo alguien con sesion abierta en la empresa puede usar esto. Sin esta
  // comprobacion la funcion queda abierta a internet y cualquiera gasta la
  // cuota.
  const autorizacion = peticion.headers.get("Authorization") ?? "";
  if (!autorizacion.startsWith("Bearer ")) {
    return responder({ error: "Falta la sesión. Vuelve a iniciar sesión." }, 401);
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: autorizacion } } },
    );
    const { data: { user }, error: errorUsuario } = await supabase.auth.getUser();
    if (errorUsuario || !user) {
      return responder({ error: "Tu sesión expiró. Inicia sesión de nuevo." }, 401);
    }

    const { texto, catalogo } = await peticion.json();
    const dictado = String(texto ?? "").trim();
    if (!dictado) return responder({ error: "No llegó ningún texto que interpretar." }, 400);
    if (dictado.length > MAX_CARACTERES) {
      return responder({ error: `El texto es muy largo (máximo ${MAX_CARACTERES} caracteres).` }, 400);
    }

    const listaCatalogo = Array.isArray(catalogo) && catalogo.length
      ? catalogo.map((linea: unknown) => "- " + String(linea)).join("\n")
      : "- (sin catálogo: deja `items` vacío y avisa que no se pudo cargar)";

    const respuestaIa = await fetch(IA_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clave}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IA_MODELO,
        // Temperatura baja: aqui se quiere extraer lo que se dijo, no redactar
        // con creatividad.
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: construirInstruccion(listaCatalogo) },
          { role: "user", content: dictado },
        ],
      }),
    });

    if (!respuestaIa.ok) {
      const detalle = await respuestaIa.text();
      console.error("Fallo la IA:", respuestaIa.status, detalle);
      // El limite de la capa gratuita es el fallo mas probable y tiene arreglo
      // distinto: no es un error, es esperar.
      if (respuestaIa.status === 429) {
        return responder({ error: "Se alcanzó el límite de uso gratuito por ahora. Espera unos minutos y vuelve a intentar." }, 429);
      }
      if (respuestaIa.status === 401 || respuestaIa.status === 403) {
        return responder({ error: "La clave de la IA no es válida o venció. Hay que actualizarla en Supabase." }, 500);
      }
      return responder({ error: "El servicio de IA no respondió bien. Intenta de nuevo en un momento." }, 502);
    }

    const datos = await respuestaIa.json();
    const contenido = datos?.choices?.[0]?.message?.content ?? "";

    let propuesta;
    try {
      propuesta = JSON.parse(contenido);
    } catch {
      console.error("La IA no devolvió JSON:", contenido.slice(0, 500));
      return responder({ error: "La IA devolvió algo que no se pudo leer. Vuelve a intentar." }, 502);
    }

    // Se normaliza aqui para que el navegador reciba siempre la misma forma,
    // diga lo que diga el modelo.
    return responder({
      cliente: String(propuesta.cliente ?? ""),
      contacto: String(propuesta.contacto ?? ""),
      ciudad: String(propuesta.ciudad ?? ""),
      obra: String(propuesta.obra ?? ""),
      telefono: String(propuesta.telefono ?? "").replace(/\D/g, ""),
      alcance: String(propuesta.alcance ?? ""),
      items: Array.isArray(propuesta.items)
        ? propuesta.items
            .filter((item: { desc?: unknown }) => item && item.desc)
            .map((item: { desc: unknown; cant: unknown; vu: unknown }) => ({
              desc: String(item.desc),
              cant: Number(item.cant) > 0 ? Number(item.cant) : 1,
              // null = no se dicto precio, manda el catalogo.
              vu: Number(item.vu) > 0 ? Number(item.vu) : null,
            }))
        : [],
      avisos: Array.isArray(propuesta.avisos) ? propuesta.avisos.map(String) : [],
    });
  } catch (error) {
    console.error("Error armando la cotización:", error);
    return responder({ error: "No se pudo interpretar el dictado. Intenta de nuevo." }, 500);
  }
});
