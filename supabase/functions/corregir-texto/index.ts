// Corrige la ortografia de un texto escrito a mano en la aplicacion.
//
// Los textos de las cotizaciones y de los informes se escriben deprisa y en
// obra, y salen impresos tal cual en documentos que se entregan al cliente:
// "instlados", "traccion", "recertificacion". Esto los repasa.
//
// QUE HACE Y QUE NO:
//   · Corrige ortografia, tildes y puntuacion.
//   · NO reescribe. No cambia el estilo, no resume, no agrega ni quita
//     informacion. Si el texto ya esta bien, lo devuelve igual.
//   · NO toca numeros, medidas, marcas ni referencias tecnicas: "5.000 lb",
//     "ASTM A36", "enerpac", "COT-012" se quedan como estan.
//
// POR QUE ESO IMPORTA: son documentos que firman y entregan. Un modelo que
// "mejora la redaccion" puede cambiar lo que se certifica. Aqui solo se le
// permite arreglar como esta escrito, no que dice.
//
// Vive en el servidor porque la clave de la IA jamas puede viajar al
// navegador: todo lo que va en el bundle de Vite queda a la vista.
//
// Desplegar:  supabase functions deploy corregir-texto
// Secretos:   los mismos que armar-cotizacion (GROQ_API_KEY)

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const IA_URL = Deno.env.get("IA_URL") ?? "https://api.groq.com/openai/v1/chat/completions";
// Mismo secreto que «armar-cotizacion»: cambiando IA_MODELO en Supabase se
// arreglan las dos a la vez. El anterior -llama-3.3-70b-versatile- lo retiro
// Groq el 16/08/2026.
const IA_MODELO = Deno.env.get("IA_MODELO") ?? "openai/gpt-oss-120b";

// Los campos mas largos -la descripcion de un informe- rondan los 1.500
// caracteres. El tope deja aire de sobra y corta que alguien mande un libro.
const MAX_CARACTERES = 6000;

const responder = (cuerpo: unknown, status = 200) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const INSTRUCCIONES = `Eres un corrector ortográfico de español de Colombia.

Tu ÚNICA tarea es corregir errores de ortografía, tildes y puntuación en el texto que recibas.

REGLAS ESTRICTAS:
1. NO reescribas. Conserva las mismas palabras, el mismo orden y el mismo tono.
2. NO resumas, NO amplíes, NO expliques, NO cambies el estilo.
3. NO toques números, medidas, unidades ni referencias: "5.000 lb", "3/8", "ASTM A36",
   "150 mm x 150 mm", "COT-012", "C-26118", "Resolución 4272 de 2021".
4. NO corrijas marcas ni nombres propios aunque te parezcan mal escritos:
   "enerpac", "Artico Safe Work", "CREAFAM", "BYCSA".
5. Respeta los saltos de línea exactamente como vienen.
6. Respeta las MAYÚSCULAS: si una palabra o una línea entera viene en mayúsculas,
   devuélvela en mayúsculas.
7. Vocabulario técnico de trabajo en alturas que es CORRECTO y no debes cambiar:
   línea de vida, punto de anclaje, guardacable, tensor, eslinga, arnés, mosquetón,
   absorbedor de energía, deslizador, larguero, peldaño, cubierta, anticorrosivo,
   tornillería, porosidad, aplome, cresta alta.
8. Si el texto ya está correcto, devuélvelo EXACTAMENTE igual.

Responde SOLO con un JSON así, sin explicaciones ni texto alrededor:
{"corregido": "el texto corregido aquí"}`;

Deno.serve(async (peticion) => {
  if (peticion.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (peticion.method !== "POST") return responder({ error: "Método no permitido" }, 405);

  const clave = Deno.env.get("GROQ_API_KEY") ?? Deno.env.get("IA_API_KEY");
  if (!clave) {
    return responder({
      error: "Falta configurar la clave de la IA. En Supabase: Edge Functions > Secrets > GROQ_API_KEY.",
    }, 500);
  }

  // Solo con sesion abierta: si no, la funcion queda abierta a internet y
  // cualquiera gasta la cuota.
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

    const { texto } = await peticion.json();
    const original = String(texto ?? "");
    if (!original.trim()) return responder({ corregido: original, cambios: false });
    if (original.length > MAX_CARACTERES) {
      return responder({ error: `El texto es muy largo (máximo ${MAX_CARACTERES} caracteres).` }, 400);
    }

    const respuesta = await fetch(IA_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IA_MODELO,
        // Temperatura en cero: corregir ortografia no es una tarea creativa,
        // y con temperatura alta el modelo empieza a "mejorar" la redaccion.
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: INSTRUCCIONES },
          { role: "user", content: original },
        ],
      }),
    });

    if (!respuesta.ok) {
      const detalle = await respuesta.text();
      console.error("La IA respondió con error:", respuesta.status, detalle);
      return responder({ error: "El corrector no respondió. Inténtalo de nuevo en un momento." }, 502);
    }

    const cuerpo = await respuesta.json();
    const contenido = cuerpo?.choices?.[0]?.message?.content ?? "";

    let corregido = "";
    try {
      corregido = String(JSON.parse(contenido)?.corregido ?? "");
    } catch {
      console.error("La IA no devolvió un JSON válido:", contenido.slice(0, 300));
      return responder({ error: "El corrector devolvió una respuesta que no se pudo leer." }, 502);
    }

    if (!corregido.trim()) {
      return responder({ corregido: original, cambios: false });
    }

    // RED DE SEGURIDAD: si el resultado se aleja mucho del original, el modelo
    // reescribio en vez de corregir y se descarta. Una correccion ortografica
    // cambia tildes y letras sueltas, no la longitud del texto.
    const diferencia = Math.abs(corregido.length - original.length) / Math.max(original.length, 1);
    if (diferencia > 0.25) {
      console.error("Se descarta la corrección: cambió demasiado.", {
        largoOriginal: original.length,
        largoCorregido: corregido.length,
      });
      return responder({
        corregido: original,
        cambios: false,
        aviso: "El corrector devolvió un texto muy distinto al original y se descartó por seguridad.",
      });
    }

    return responder({ corregido, cambios: corregido !== original });
  } catch (fallo) {
    console.error("Fallo corrigiendo el texto:", fallo);
    return responder({ error: "No se pudo corregir el texto. Inténtalo de nuevo." }, 500);
  }
});
