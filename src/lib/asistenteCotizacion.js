import { getSupabaseClient } from "./backend/supabaseClient";
import { buscarItemCatalogo, catalogoPlano, itemsPlanos } from "./catalogo";
import { estimarCostosHeuristico, obtenerConfigCostos, separarMaterialNuevoEnRevision } from "./costosCotizacion";

// Puente con la función «armar-cotizacion», que interpreta un dictado o documento
// y devuelve un borrador de cotización.
//
// La clave de la IA vive en el servidor, no aquí: lo que va en el bundle de
// Vite queda a la vista de cualquiera. Este archivo solo manda el texto y
// recoge la propuesta.

const FUNCION = "armar-cotizacion";

// Si el token JWT expiró tras 1 hora con la pestaña abierta, renueva la sesión
// automáticamente y reintenta una vez antes de rendirse.
async function invocarFuncionConRefresco(supabase, body) {
  let tokenFresco = null;
  try {
    const { data: sesionActual } = await supabase.auth.getSession();
    const expiraEn = Number(sesionActual?.session?.expires_at || 0);
    const ahoraSeg = Math.floor(Date.now() / 1000);
    if (expiraEn && expiraEn - ahoraSeg < 60) {
      const { data: renovada } = await supabase.auth.refreshSession();
      tokenFresco = renovada?.session?.access_token || null;
    }
  } catch {
    // Si falla la comprobación previa, seguimos con el invoke normal.
  }

  const opcionesBase = tokenFresco
    ? { body, headers: { Authorization: `Bearer ${tokenFresco}` } }
    : { body };
  const res = await supabase.functions.invoke(FUNCION, opcionesBase);
  const status = res?.error?.context?.status;
  if (status === 401) {
    try {
      const { data: renovada } = await supabase.auth.refreshSession();
      const nuevoToken = renovada?.session?.access_token;
      if (nuevoToken) {
        return await supabase.functions.invoke(FUNCION, {
          body,
          headers: { Authorization: `Bearer ${nuevoToken}` },
        });
      }
    } catch {
      // Devuelve el error 401 original si la sesión realmente venció.
    }
  }
  return res;
}

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

/**
 * Estima materiales, mano de obra y consumibles/transporte con IA para
 * trabajos a medida o reformas (uso interno de administradores).
 * Si la función remota falla o aún no está actualizada, responde con una
 * estimación local editable usando el catálogo real de insumos.
 */
export async function estimarCostosConIa({
  titulo = "",
  saludo = "",
  incluyeTexto = "",
  tiempoEjec = "",
  observaciones = "",
  notasInternas = "",
  obra = "",
  ciudad = "",
  alcance = "",
  requerimientoCliente = "",
  items = [],
  configCostos = null,
  soloSinReceta = false,
} = {}) {
  const cfg = configCostos || obtenerConfigCostos([]);
  const listaItems = Array.isArray(items)
    ? items
        .filter((it) => it && (String(it.desc || "").trim() || Number(it.cant || 0) > 0))
        .map((it) => ({
          desc: String(it.desc || "").trim(),
          cant: Math.max(0, Number(it.cant) || 0),
          unit: String(it.unit || "Und").trim(),
          vu: Math.max(0, Number(it.vu) || 0),
        }))
    : [];

  if (
    !listaItems.length &&
    !String(titulo).trim() &&
    !String(saludo).trim() &&
    !String(alcance).trim() &&
    !String(requerimientoCliente).trim()
  ) {
    throw new Error("Agrega al menos un ítem o describe el proyecto antes de calcular con IA.");
  }

  let data = null;
  let error = null;
  try {
    const supabase = getSupabaseClient();
    const res = await invocarFuncionConRefresco(supabase, {
      modo: "estimar_costos",
      soloSinReceta: Boolean(soloSinReceta),
      proyecto: {
        titulo: String(titulo || "").slice(0, 400),
        saludo: String(saludo || "").slice(0, 2500),
        incluyeTexto: String(incluyeTexto || "").slice(0, 1500),
        tiempoEjec: String(tiempoEjec || "").slice(0, 200),
        observaciones: String(observaciones || "").slice(0, 1000),
        notasInternas: String(notasInternas || "").slice(0, 1000),
        obra: String(obra || "").slice(0, 200),
        ciudad: String(ciudad || "").slice(0, 120),
        alcance: String(alcance || "").slice(0, 1500),
        requerimientoCliente: String(requerimientoCliente || "").slice(0, 1500),
      },
      items: listaItems,
      insumosCatalogo: (cfg.insumos || []).map((ins) => ({
        id: ins.id,
        nombre: ins.nombre,
        categoria: ins.categoria,
        unidad: ins.unidad,
        costoUnitario: ins.costoUnitario,
      })),
    });
    data = res.data;
    error = res.error;
  } catch (err) {
    error = err;
  }

  if (error || data?.error || !Array.isArray(data?.lineas) || data.lineas.length === 0) {
    const motivo = error ? await motivoDelError(error) : data?.error || "La IA no devolvió líneas.";
    const respaldo = estimarCostosHeuristico({
      titulo,
      saludo,
      incluyeTexto,
      observaciones,
      alcance,
      requerimientoCliente,
      items: listaItems,
      configCostos: cfg,
    });
    return {
      ...respaldo,
      avisos: [
        `Se usó la estimación local de respaldo (${motivo}).`,
        ...respaldo.avisos,
      ],
    };
  }

  const mapaInsumos = new Map((cfg.insumos || []).map((ins) => [ins.id, ins]));
  const categoriasValidas = new Set(["material", "mano_obra", "logistica"]);

  const lineas = data.lineas
    .filter((l) => l && String(l.nombre || "").trim() && Number(l.cant) > 0)
    .map((l, idx) => {
      const catalogoMatch = l.insumoId ? mapaInsumos.get(String(l.insumoId)) : null;
      const cant = Math.max(0.1, Number(l.cant) || 1);
      // Si el insumo está en el catálogo de la empresa, siempre manda el costo unitario del catálogo.
      const costoUnitario = catalogoMatch
        ? catalogoMatch.costoUnitario
        : Math.max(0, Math.round(Number(l.costoUnitario) || 0));
      const categoria = catalogoMatch
        ? catalogoMatch.categoria
        : categoriasValidas.has(l.categoria)
        ? l.categoria
        : "material";
      const nombreIa = String(l.nombre || "").trim();
      return {
        id: `ia-${Date.now()}-${idx + 1}`,
        insumoId: catalogoMatch ? catalogoMatch.id : null,
        // Conserva el nombre técnico específico que devolvió la IA si viene detallado (p. ej. medidas exactas)
        nombre: nombreIa || catalogoMatch?.nombre || "Insumo",
        categoria,
        unidad: catalogoMatch ? catalogoMatch.unidad : String(l.unidad || "Und").trim() || "Und",
        cant: Math.round(cant * 10) / 10,
        costoUnitario,
        subtotal: Math.round(cant * costoUnitario),
        origen: "ia",
        nota: String(l.nota || "").trim(),
      };
    });

  const avisosFinales = Array.isArray(data.avisos) ? data.avisos.map(String) : [];

  // En un mantenimiento o una recertificacion el sistema ya existe: no se
  // compra cable, postes ni anclajes. La instruccion se lo dice a la IA, pero
  // no siempre obedece -llego a costear $9,7 M de materiales para un servicio
  // de $4,5 M-, asi que la regla se aplica aqui, donde si se cumple. Lo que se
  // retira se dice con su valor, para que nadie crea que desaparecio solo.
  const { lineas: conservadas, retiradas } = separarMaterialNuevoEnRevision(lineas, { titulo, items: listaItems });
  if (retiradas.length) {
    const total = retiradas.reduce((s, l) => s + (Number(l.subtotal) || 0), 0);
    lineas.splice(0, lineas.length, ...conservadas);
    avisosFinales.unshift(
      `Se retiraron ${retiradas.length} material(es) de instalación nueva que propuso la IA ` +
      `($ ${Math.round(total).toLocaleString("es-CO")}): ${retiradas.map((l) => l.nombre).join(", ")}. ` +
      "Es un mantenimiento o recertificación; si vas a reemplazar alguno, agrégalo con «+ Agregar material / gasto»."
    );
  }

  // Red de seguridad: si la IA omitió por completo la mano de obra o la logística,
  // se complementan automáticamente desde el motor APU/local para nunca dejar $ 0.
  const faltaManoObra = !lineas.some((l) => l.categoria === "mano_obra");
  const faltaLogistica = !lineas.some((l) => l.categoria === "logistica");
  if (!soloSinReceta && (faltaManoObra || faltaLogistica)) {
    const complemento = estimarCostosHeuristico({
      titulo,
      saludo,
      incluyeTexto,
      observaciones,
      alcance,
      requerimientoCliente,
      items: listaItems,
      configCostos: cfg,
    });
    const agregadas = [];
    for (const cLinea of complemento.lineas) {
      if (faltaManoObra && cLinea.categoria === "mano_obra") {
        lineas.push({ ...cLinea, id: `ia-comp-mo-${lineas.length + 1}` });
        agregadas.push("mano de obra");
      }
      if (faltaLogistica && cLinea.categoria === "logistica") {
        lineas.push({ ...cLinea, id: `ia-comp-log-${lineas.length + 1}` });
        agregadas.push("transporte/consumibles");
      }
    }
    const rubros = [...new Set(agregadas)];
    if (rubros.length) {
      avisosFinales.push(
        `Se complementó ${rubros.join(" y ")} con base en tus tarifas de Catálogo para no subestimar el costo.`
      );
    }
  }

  const ordenCat = { material: 1, mano_obra: 2, logistica: 3 };
  lineas.sort((a, b) => (ordenCat[a.categoria] || 9) - (ordenCat[b.categoria] || 9));

  return {
    lineas,
    resumen: String(data.resumen || "Estimación generada con IA."),
    avisos: avisosFinales,
    esRespaldoLocal: false,
  };
}
