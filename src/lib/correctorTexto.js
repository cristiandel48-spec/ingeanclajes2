import { getSupabaseClient } from "./backend/supabaseClient";

// Puente con la funcion «corregir-texto», que repasa la ortografia de lo que
// se escribe en las cotizaciones y en los informes.
//
// La clave de la IA vive en el servidor, no aqui: lo que va en el bundle de
// Vite queda a la vista de cualquiera.

const FUNCION = "corregir-texto";

async function motivoDelError(error) {
  const respuesta = error?.context;
  if (respuesta && typeof respuesta.clone === "function") {
    try {
      const cuerpo = await respuesta.clone().json();
      if (cuerpo?.error) return cuerpo.error;
    } catch {
      // No vino JSON: se cae al mensaje de abajo.
    }
  }
  if (/failed to send a request/i.test(error?.message || "")) {
    return "El corrector no está publicado todavía. Hay que subir la función «corregir-texto» en Supabase.";
  }
  return error?.message || "No se pudo corregir el texto.";
}

/**
 * Devuelve el texto con la ortografia repasada.
 *
 * @returns {Promise<{corregido:string, cambios:boolean, aviso?:string}>}
 */
export async function corregirTexto(texto) {
  const original = String(texto ?? "");
  if (!original.trim()) return { corregido: original, cambios: false };

  const supabase = getSupabaseClient();
  if (!supabase) throw new Error("No hay conexión con el servidor.");

  const { data, error } = await supabase.functions.invoke(FUNCION, { body: { texto: original } });
  if (error) throw new Error(await motivoDelError(error));
  if (data?.error) throw new Error(data.error);

  const corregido = String(data?.corregido ?? original);
  return { corregido, cambios: corregido !== original, aviso: data?.aviso };
}

/**
 * Las diferencias entre dos textos, palabra a palabra, para poder enseñar que
 * cambio antes de aceptarlo.
 *
 * No se aplica nada a ciegas: estos textos salen impresos en documentos que se
 * entregan al cliente, y quien firma tiene que poder ver que se le toco.
 *
 * @returns {Array<{tipo:"igual"|"quitado"|"puesto", texto:string}>}
 */
export function diferencias(antes, despues) {
  const a = String(antes ?? "").split(/(\s+)/);
  const b = String(despues ?? "").split(/(\s+)/);

  // Trozo comun mas largo, que es lo que permite señalar solo lo que cambio
  // en vez de pintar el texto entero como distinto.
  const tabla = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      tabla[i][j] = a[i] === b[j] ? tabla[i + 1][j + 1] + 1 : Math.max(tabla[i + 1][j], tabla[i][j + 1]);
    }
  }

  const partes = [];
  const agregar = (tipo, texto) => {
    if (!texto) return;
    const ultima = partes[partes.length - 1];
    if (ultima && ultima.tipo === tipo) ultima.texto += texto;
    else partes.push({ tipo, texto });
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { agregar("igual", a[i]); i += 1; j += 1; }
    else if (tabla[i + 1][j] >= tabla[i][j + 1]) { agregar("quitado", a[i]); i += 1; }
    else { agregar("puesto", b[j]); j += 1; }
  }
  while (i < a.length) { agregar("quitado", a[i]); i += 1; }
  while (j < b.length) { agregar("puesto", b[j]); j += 1; }

  return partes;
}
