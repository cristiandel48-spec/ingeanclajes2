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

/** Busca el item real del catalogo a partir de la descripcion que devolvio la IA. */
export function buscarItemCatalogo(desc) {
  const buscado = String(desc || "").trim().toUpperCase();
  if (!buscado) return null;
  for (const grupo of ITEMS_DB) {
    const exacto = grupo.items.find((item) => item.desc.toUpperCase() === buscado);
    if (exacto) return { ...exacto, categoria: grupo.categoria };
  }
  return null;
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
  const items = (data?.items ?? [])
    .map((propuesto) => {
      const real = buscarItemCatalogo(propuesto.desc);
      if (!real) return null;
      const dictado = Number(propuesto.vu) > 0 ? Number(propuesto.vu) : null;
      return {
        desc: real.desc,
        unit: real.unit,
        cant: propuesto.cant,
        vu: dictado ?? real.vu,
        vuCatalogo: real.vu,
        precioDictado: dictado !== null,
      };
    })
    .filter(Boolean);

  const descartados = (data?.items ?? []).length - items.length;

  return {
    cliente: data?.cliente ?? "",
    contacto: data?.contacto ?? "",
    ciudad: data?.ciudad ?? "",
    obra: data?.obra ?? "",
    telefono: data?.telefono ?? "",
    alcance: data?.alcance ?? "",
    items,
    avisos: [
      ...(data?.avisos ?? []),
      ...(descartados > 0
        ? [`${descartados} servicio(s) mencionados no están en el catálogo y quedaron fuera. Agrégalos a mano.`]
        : []),
    ],
  };
}
