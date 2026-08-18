import { getSupabaseClient } from "./backend/supabaseClient";
import { buscarItemCatalogo, catalogoPlano } from "./catalogo";

// Puente con la funcion «armar-cotizacion», que interpreta un dictado y
// devuelve un borrador de cotizacion.
//
// La clave de la IA vive en el servidor, no aqui: lo que va en el bundle de
// Vite queda a la vista de cualquiera. Este archivo solo manda el texto y
// recoge la propuesta.
//
// El catalogo llega desde fuera -de la base, a traves del contexto- y no se
// importa del codigo: los precios se cambian desde la pantalla y esto tiene
// que usar los de verdad, no los de la semilla.

const FUNCION = "armar-cotizacion";

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
export async function armarCotizacionDesdeTexto(texto, catalogo = []) {
  const dictado = String(texto || "").trim();
  if (!dictado) throw new Error("Primero dicta o escribe lo que quieres cotizar.");

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke(FUNCION, {
    body: { texto: dictado, catalogo: catalogoPlano(catalogo) },
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
    const real = buscarItemCatalogo(propuesto.desc, catalogo);
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
