import { getSupabaseClient } from "./backend/supabaseClient";
import { buscarItemCatalogo, catalogoPlano, itemsPlanos } from "./catalogo";

// Puente con la función «armar-cotizacion», que interpreta un dictado o documento
// y devuelve un borrador de cotización.
//
// La clave de la IA vive en el servidor, no aquí: lo que va en el bundle de
// Vite queda a la vista de cualquiera. Este archivo solo manda el texto y
// recoge la propuesta.

const FUNCION = "armar-cotizacion";

async function motivoDelError(error) {
  const respuesta = error?.context;
  if (respuesta && typeof respuesta.clone === "function") {
    try {
      const cuerpo = await respuesta.clone().json();
      if (cuerpo?.error) return cuerpo.error;
    } catch {
      // No vino JSON: se cae al mensaje genérico de abajo.
    }
  }
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
 * Limpia y recorta el texto para que no supere el límite permitido
 * por la Edge Function (4000 caracteres en la versión actual en producción).
 * Remueve texto legal repetitivo, resoluciones SST y firmas accesorias
 * asegurando que los datos comerciales (cliente, contacto, teléfono,
 * descripción de ítems, cantidades y valores) quepan siempre.
 */
export function prepararTextoParaIa(texto, maximo = 3900) {
  if (!texto) return "";
  let limpio = String(texto)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (limpio.length <= maximo) return limpio;

  // Cortar secciones de texto legal / SST / resoluciones que no aportan datos comerciales
  const patronesCorteLegal = [
    /\n\s*SISTEMA DE GESTION DE SEGURIDAD/i,
    /\n\s*SISTEMA DE GESTI[OÓ]N DE SEGURIDAD/i,
    /\n\s*SISTEMA DE GESTI[OÓ]N/i,
    /\n\s*SG-SST/i,
    /\n\s*RESOLUCI[OÓ]N\s+0312/i,
    /\n\s*POL[IÍ]TICA DE TRATAMIENTO DE DATOS/i,
    /\n\s*T[EÉ]RMINOS Y CONDICIONES GENERALES/i,
    /\n\s*DOCUMENTACI[OÓ]N EXIGIDA POR EL CONTRATANTE/i,
  ];

  for (const patron of patronesCorteLegal) {
    const idx = limpio.search(patron);
    if (idx > 500 && idx <= maximo) {
      limpio = limpio.slice(0, idx).trim();
      break;
    }
  }

  // Si todavía supera el cupo, compactar saltos de línea dobles
  if (limpio.length > maximo) {
    limpio = limpio.replace(/\n{2,}/g, "\n").trim();
  }

  // Si aún supera el cupo, cortar limpiamente en el último salto de línea
  if (limpio.length > maximo) {
    const corte = limpio.lastIndexOf("\n", maximo);
    limpio = (corte > 1000 ? limpio.slice(0, corte) : limpio.slice(0, maximo)).trim();
  }

  return limpio;
}

/**
 * Extractor de respaldo local que opera directamente sobre las líneas del texto
 * en caso de que la Edge Function o el servicio externo de IA falle o se desconecte.
 */
export function extraerDatosHeuristicos(texto = "", catalogo = []) {
  const lineas = String(texto || "").split("\n").map((l) => l.trim()).filter(Boolean);
  let cliente = "";
  let contacto = "";
  let telefono = "";
  let ciudad = "";

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];
    if (/^SEÑORES[:\s]*$/i.test(l) && lineas[i + 1]) {
      cliente = lineas[i + 1].trim();
    } else if (/^SEÑORES[:\s]+(.+)$/i.test(l)) {
      cliente = l.replace(/^SEÑORES[:\s]+/i, "").trim();
    } else if (!cliente && /^CLIENTE[:\s]+(.+)$/i.test(l)) {
      cliente = l.replace(/^CLIENTE[:\s]+/i, "").trim();
    }

    if (/^CONTACTO[:\s]+(.+)$/i.test(l)) {
      contacto = l.replace(/^CONTACTO[:\s]+/i, "").trim();
    } else if (!contacto && /^ATENCI[OÓ]N[:\s]+(.+)$/i.test(l)) {
      contacto = l.replace(/^ATENCI[OÓ]N[:\s]+/i, "").trim();
    }

    if (/^TEL[EÉ]FONO[:\s]+(.+)$/i.test(l)) {
      telefono = l.replace(/^TEL[EÉ]FONO[:\s]+/i, "").replace(/\D/g, "");
    } else if (!telefono && /^CEL(?:ULAR)?[:\s]+(.+)$/i.test(l)) {
      telefono = l.replace(/^CEL(?:ULAR)?[:\s]+/i, "").replace(/\D/g, "");
    }

    if (/^CIUDAD[:\s]+(.+)$/i.test(l)) {
      ciudad = l.replace(/^CIUDAD[:\s]+/i, "").trim();
    }
  }

  const items = [];
  const fuera = [];
  const planos = itemsPlanos(catalogo);

  for (const l of lineas) {
    for (const item of planos) {
      const descNorm = item.desc.toLowerCase();
      if (l.toLowerCase().includes(descNorm)) {
        const nums = l.match(/\b\d+(\.\d+)?\b/g);
        let cant = 1;
        if (nums && nums.length > 0) {
          const n0 = Number(nums[0]);
          if (n0 > 0 && n0 < 10000) cant = n0;
        }
        items.push({
          desc: item.desc,
          unit: item.unit,
          cant,
          vu: item.vu,
          vuCatalogo: item.vu,
          precioDictado: false,
          textoOriginal: l,
        });
        break;
      }
    }
  }

  return {
    cliente,
    contacto,
    ciudad,
    obra: "",
    telefono,
    alcance: "",
    items,
    fuera,
    avisos: [
      "Extracción directa de datos realizada desde el texto del documento.",
    ],
  };
}

/**
 * Manda el texto dictado o extraído y devuelve el borrador interpretado.
 * Lanza un Error con un mensaje ya entendible si algo falla.
 */
export async function armarCotizacionDesdeTexto(texto, catalogo = []) {
  const dictado = prepararTextoParaIa(texto, 3900);
  if (!dictado) throw new Error("Primero dicta o escribe lo que quieres cotizar.");

  const supabase = getSupabaseClient();
  let data;
  let error;
  try {
    const res = await supabase.functions.invoke(FUNCION, {
      body: { texto: dictado, catalogo: catalogoPlano(catalogo) },
    });
    data = res.data;
    error = res.error;
  } catch (errInvocacion) {
    error = errInvocacion;
  }

  if (error || data?.error) {
    // Si la IA falla (ej. error 500, 502, límite de cuota o red),
    // intentamos extracción directa del documento para no dejar al usuario varado
    const heuristico = extraerDatosHeuristicos(texto, catalogo);
    if (heuristico.cliente || heuristico.items.length) {
      const motivo = error ? await motivoDelError(error) : data?.error;
      return {
        ...heuristico,
        avisos: [
          `Aviso del servicio de IA: ${motivo}. Se recuperaron los datos comerciales directamente del texto.`,
          ...heuristico.avisos,
        ],
      };
    }
    if (error) throw new Error(await motivoDelError(error));
    if (data?.error) throw new Error(data.error);
  }

  const items = [];
  const fuera = [];

  for (const propuesto of data?.items ?? []) {
    const real = buscarItemCatalogo(propuesto.desc, catalogo);
    if (!real) {
      fuera.push({ desc: String(propuesto.desc || ""), cant: propuesto.cant });
      continue;
    }
    const vuDictado = Number(propuesto.vu) > 0 ? Number(propuesto.vu) : null;
    items.push({
      desc: real.desc,
      unit: real.unit,
      cant: propuesto.cant,
      vu: vuDictado ?? real.vu,
      vuCatalogo: real.vu,
      precioDictado: vuDictado !== null,
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
