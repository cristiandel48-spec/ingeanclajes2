import { getSupabaseClient } from "./backend/supabaseClient";
import { ITEMS_DB } from "../data/seed";

// Puente con la funcion «armar-cotizacion», que interpreta un dictado y
// devuelve un borrador de cotizacion.
//
// La clave de la IA vive en el servidor, no aqui: lo que va en el bundle de
// Vite queda a la vista de cualquiera. Este archivo solo manda el texto y
// recoge la propuesta.

const FUNCION = "armar-cotizacion";

// El catalogo viaja con la peticion para que la IA use las descripciones
// exactas del sistema en vez de inventarse nombres de servicio.
const catalogoPlano = () =>
  ITEMS_DB.flatMap((grupo) => grupo.items.map((item) => `${item.desc} (${item.unit})`));

// El catalogo esta escrito sin tildes ("LINEA DE VIDA HORIZONTAL") y la IA
// responde con la ortografia correcta ("LÍNEA DE VIDA HORIZONTAL"). Comparando
// letra a letra no coincidian y todos los servicios se descartaban.
const sinTildes = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Palabras que no distinguen un servicio de otro y solo estorban al comparar.
const VACIAS = new Set(["DE", "DEL", "LA", "EL", "LOS", "LAS", "EN", "Y", "CON", "A"]);
const clave = (texto) => sinTildes(texto).split(" ").filter((p) => p && !VACIAS.has(p));

/**
 * Busca el item real del catalogo a partir de la descripcion que devolvio la
 * IA. Primero por coincidencia limpia; si no, por palabras, para que "linea de
 * vida horizontal en cubierta" encuentre "LINEA DE VIDA HORIZONTAL".
 */
// El catalogo esta en singular ("PUNTO DE ANCLAJE EPOXICO") y la gente pide en
// plural ("cuatro puntos de anclaje epoxico"). Comparando palabras completas
// "PUNTO" no estaba en lo pedido y el servicio se descartaba entero, tanto al
// dictar como al importar un documento.
//
// Basta con que una empiece por la otra: PUNTO/PUNTOS, ANCLAJE/ANCLAJES,
// VERTICAL/VERTICALES. Se piden cuatro letras para no emparejar por un
// pedacito suelto.
function estaLaPalabra(palabra, pedidas) {
  return pedidas.some((otra) =>
    otra === palabra ||
    (palabra.length >= 4 && otra.length >= 4 &&
      (otra.startsWith(palabra) || palabra.startsWith(otra))));
}

export function buscarItemCatalogo(desc) {
  const buscado = sinTildes(desc);
  if (!buscado) return null;

  const todos = ITEMS_DB.flatMap((grupo) =>
    grupo.items.map((item) => ({ ...item, categoria: grupo.categoria })),
  );

  const exacto = todos.find((item) => sinTildes(item.desc) === buscado);
  if (exacto) return exacto;

  // Se queda el del catalogo cuyas palabras esten todas en lo dictado, y
  // entre esos el mas especifico (el de mas palabras).
  const palabrasBuscadas = clave(desc);
  const candidatos = todos
    .map((item) => ({ item, palabras: clave(item.desc) }))
    .filter(({ palabras }) => palabras.length && palabras.every((p) => estaLaPalabra(p, palabrasBuscadas)))
    .sort((a, b) => b.palabras.length - a.palabras.length);

  return candidatos[0]?.item ?? null;
}

async function motivoDelError(error) {
  const respuesta = error?.context;
  if (respuesta && typeof respuesta.clone === "function") {
    try {
      const cuerpo = await respuesta.clone().json();
      if (cuerpo?.error) return cuerpo.error;
    } catch {
      // No vino JSON: se cae al mensaje generico de abajo.
    }
  }
  // Igual que en usuarios.js: supabase-js no distingue "no existe la funcion"
  // de "no hubo red", y en la practica casi siempre es lo primero.
  if (/failed to send a request/i.test(error?.message || "")) {
    return (
      "No se pudo contactar la función «" + FUNCION + "» de Supabase. " +
      "Lo más probable es que todavía no esté publicada: revisa que aparezca " +
      "con ese nombre exacto en Supabase → Edge Functions."
    );
  }
  return error?.message || "No se pudo interpretar el dictado.";
}

/**
 * Manda el texto dictado y devuelve el borrador.
 * Lanza un Error con un mensaje ya entendible si algo falla.
 */
export async function armarCotizacionDesdeTexto(texto) {
  const dictado = String(texto || "").trim();
  if (!dictado) throw new Error("Primero dicta o escribe lo que quieres cotizar.");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(FUNCION, {
    body: { texto: dictado, catalogo: catalogoPlano() },
  });

  if (error) throw new Error(await motivoDelError(error));
  if (data?.error) throw new Error(data.error);

  // Los items se cruzan con el catalogo real: la descripcion y la unidad
  // salen SIEMPRE del sistema, nunca del modelo.
  //
  // Con el precio se distingue quien lo decidio. Si la persona dicto un valor
  // ("a 100 mil cada uno") manda ese, porque es una decision suya y no un
  // invento del modelo. Si no dijo nada, manda el del catalogo.
  const items = [];
  // Lo que se pidio y no existe en el catalogo. Antes solo se contaba, y al
  // importar un documento hace falta poder decir QUE quedo fuera: si el
  // cliente pidio seis arneses, hay que verlo escrito para decidir.
  const fuera = [];

  for (const propuesto of data?.items ?? []) {
    const real = buscarItemCatalogo(propuesto.desc);
    if (!real) {
      fuera.push({ desc: String(propuesto.desc || ""), cant: propuesto.cant });
      continue;
    }
    const dictado = Number(propuesto.vu) > 0 ? Number(propuesto.vu) : null;
    items.push({
      desc: real.desc,
      unit: real.unit,
      cant: propuesto.cant,
      vu: dictado ?? real.vu,
      vuCatalogo: real.vu,
      precioDictado: dictado !== null,
      // Lo que decia el documento, para poder mostrar con que se emparejo.
      textoOriginal: String(propuesto.desc || ""),
    });
  }

  return {
    cliente: data?.cliente ?? "",
    contacto: data?.contacto ?? "",
    ciudad: data?.ciudad ?? "",
    obra: data?.obra ?? "",
    telefono: data?.telefono ?? "",
    alcance: data?.alcance ?? "",
    items,
    fuera,
    avisos: [
      ...(data?.avisos ?? []),
      ...(fuera.length > 0
        ? [`${fuera.length} servicio(s) mencionados no están en el catálogo y quedaron fuera. Agrégalos a mano.`]
        : []),
    ],
  };
}
