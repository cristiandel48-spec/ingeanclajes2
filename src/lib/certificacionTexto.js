// Generación y redacción de texto técnico-legal para certificaciones
// a partir de cotizaciones y memorias técnicas según Resolución 4272 de 2021.

const NUMEROS_ES = {
  1: "uno",
  2: "dos",
  3: "tres",
  4: "cuatro",
  5: "cinco",
  6: "seis",
  7: "siete",
  8: "ocho",
  9: "nueve",
  10: "diez",
  11: "once",
  12: "doce",
  13: "trece",
  14: "catorce",
  15: "quince",
  16: "dieciséis",
  17: "diecisiete",
  18: "dieciocho",
  19: "diecinueve",
  20: "veinte",
  21: "veintiún",
  22: "veintidós",
  23: "veintitrés",
  24: "veinticuatro",
  25: "veinticinco",
  26: "veintiséis",
  27: "veintisiete",
  28: "veintiocho",
  29: "veintinueve",
  30: "treinta",
  35: "treinta y cinco",
  40: "cuarenta",
  45: "cuarenta y cinco",
  50: "cincuenta",
  60: "sesenta",
  70: "setenta",
  80: "ochenta",
  90: "noventa",
  100: "cien",
};

export function enteroALetras(n) {
  const num = Math.round(Number(n) || 0);
  if (num <= 0) return "cero";
  if (NUMEROS_ES[num]) return NUMEROS_ES[num];
  if (num < 100) {
    const d = Math.floor(num / 10) * 10;
    const u = num % 10;
    return `${NUMEROS_ES[d] || d} y ${NUMEROS_ES[u] || u}`;
  }
  return String(num);
}

// Limpia prefijos comerciales típicos de facturación o cotización
export function limpiarPrefijoComercial(texto = "") {
  let limpio = String(texto || "").trim();
  const prefijos = [
    /^suministro\s*,\s*fabricaci[oó]n\s*,\s*transporte\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^suministro\s*,\s*transporte\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^suministro\s*,\s*fabricaci[oó]n\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^suministro\s*,\s*montaje\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^suministro\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^suministro\s*y\s*montaje\s+de\s+/i,
    /^suministro\s*y\s*adecuaci[oó]n\s+de\s+/i,
    /^suministro\s+de\s+/i,
    /^fabricaci[oó]n\s*,\s*suministro\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^fabricaci[oó]n\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^fabricaci[oó]n\s*y\s*montaje\s+de\s+/i,
    /^instalaci[oó]n\s*y\s*montaje\s+de\s+/i,
    /^instalaci[oó]n\s+de\s+/i,
    /^montaje\s+de\s+/i,
    /^adecuaci[oó]n\s+de\s+/i,
    /^provisi[oó]n\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^provisi[oó]n\s+de\s+/i,
    /^(?:servicio\s+de\s+)?(?:(?:inspecci[oó]n|reinspecci[oó]n|mantenimiento(?:\s+preventivo)?)\s*(?:,\s*|\s+y\s+|\s+e\s+))*(?:recertificaci[oó]n|certificaci[oó]n)(?:\s+t[eé]cnica)?(?:\s+anual)?(?:\s+de)?\s+/i,
    /^(?:servicio\s+de\s+)?(?:inspecci[oó]n|reinspecci[oó]n|mantenimiento(?:\s+preventivo)?)(?:\s+t[eé]cnica|\s+anual)*\s+de\s+/i,
  ];

  for (const regex of prefijos) {
    const candidato = limpio.replace(regex, "").trim();
    if (candidato) {
      limpio = candidato;
    }
  }

  // Quitar puntos al final
  return limpio.replace(/[.\s]+$/, "").trim();
}

// Normaliza unidades técnicas para que queden legibles y elegantes
function normalizarUnidadesTecnicas(texto = "") {
  return texto
    .replace(/\bml\b/gi, "m")
    .replace(/\bmetros\b/gi, "m")
    .replace(/\bmetro\b/gi, "m")
    .replace(/\blbf\b/gi, "lbf")
    .replace(/\blbs\b/gi, "lb")
    .replace(/\bkn\b/gi, "kN")
    .replace(/\binox\b/gi, "en acero inoxidable")
    .replace(/\bacero\s+inoxidable\s+en\s+acero\s+inoxidable/gi, "en acero inoxidable")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Si un ítem cotizado es un gasto de la obra y no un sistema que se entrega:
 * viáticos, pólizas, cursos, alquiler… Esos no van en el certificado ni en el
 * acta de entrega, que hablan de lo que queda instalado.
 */
export function esItemAdministrativo(descripcion = "") {
  const texto = String(descripcion || "");
  const administrativo = /\b(vi[aá]ticos|transporte|alimentaci[oó]n|p[oó]liza|administraci[oó]n|curso|capacitaci[oó]n|examen|seguridad\s+social|arl|alquiler|andr[oó]meda)\b/i.test(texto);
  return administrativo && !/\b(l[ií]nea|anclaje|escalera|baranda|arn[eé]s)\b/i.test(texto);
}

const SUSTANTIVO_FEMENINO_RE =
  /^(l[ií]neas?|escalas?|escaleras?|canastillas?|redes?|red\b|barandas?|barandillas?|estructuras?|plataformas?|pasarelas?|puertas?|compuertas?|jaulas?|cuerdas?|eslingas?)/i;

const SUSTANTIVO_PLURAL_RE =
  /^(puntos|anclajes|l[ií]neas|escaleras|escalas|sistemas|barandas|barandillas|estructuras|postes|redes|canastillas|plataformas|pasarelas)\b/i;

function formatearConCantidad(cant, cuerpo) {
  let limpio = cuerpo.trim();
  const esFemenino = SUSTANTIVO_FEMENINO_RE.test(limpio);

  if (cant === 1) {
    const prefijo = esFemenino ? "una (1)" : "un (1)";
    // Asegurar singular
    limpio = limpio
      .replace(/^l[ií]neas\s+de\s+vida\s+horizontales/i, "línea de vida horizontal")
      .replace(/^l[ií]neas\s+de\s+vida\s+verticales/i, "línea de vida vertical")
      .replace(/^l[ií]neas\s+de\s+vida/i, "línea de vida")
      .replace(/^puntos\s+de\s+anclaje\s+fijos/i, "punto de anclaje fijo")
      .replace(/^puntos\s+de\s+anclaje/i, "punto de anclaje")
      .replace(/^escaleras\s+verticales/i, "escalera vertical")
      .replace(/^escaleras\s+/i, "escalera ")
      .replace(/^postes\s+/i, "poste ")
      .replace(/^anclajes\s+/i, "anclaje ");

    return `${prefijo} ${limpio}`;
  }

  // Cantidad mayor a 1
  const palabras = enteroALetras(cant);
  const prefijo = `${palabras} (${cant})`;

  // Pluralizar adecuadamente sustantivos y adjetivos iniciales
  limpio = limpio
    .replace(/^l[ií]nea\s+de\s+vida\s+horizontal/i, "líneas de vida horizontales")
    .replace(/^l[ií]nea\s+de\s+vida\s+vertical/i, "líneas de vida verticales")
    .replace(/^l[ií]nea\s+de\s+vida/i, "líneas de vida")
    .replace(/^punto\s+de\s+anclaje\s+fijo/i, "puntos de anclaje fijos")
    .replace(/^punto\s+de\s+anclaje/i, "puntos de anclaje")
    .replace(/^escalera\s+vertical/i, "escaleras verticales")
    .replace(/^escalera\s+/i, "escaleras ")
    .replace(/^poste\s+/i, "postes ")
    .replace(/^anclaje\s+/i, "anclajes ")
    .replace(/^conector\s+/i, "conectores ");

  return `${prefijo} ${limpio}`;
}

// Convierte un ítem cotizado a redacción gramatical para certificado
export function formatearItemParaCertificado(item = {}) {
  const cant = Math.max(1, Math.round(Number(item.cant || item.cantidad || 1)));
  const descRaw = String(item.desc || item.descripcion || item.nombre || "");
  if (!descRaw.trim()) return null;

  // Filtrar ítems administrativos que no corresponden a sistemas físicos
  if (esItemAdministrativo(descRaw)) return null;

  const esServicioInspeccion =
    /^(?:servicio\s+de\s+)?(?:inspecci[oó]n|reinspecci[oó]n|mantenimiento|recertificaci[oó]n|certificaci[oó]n)\b/i.test(
      descRaw.trim()
    );
  const unidadRaw = String(item.unit || item.unidad || "").trim();
  const esUnidadGlobal = /^(?:glb|global|servicio|lote)\b/i.test(unidadRaw);

  let limpio = limpiarPrefijoComercial(descRaw).toLowerCase();

  // Normalizar unidades y preservar siglas técnicas estándar
  limpio = normalizarUnidadesTecnicas(limpio)
    .replace(/\bansi\b/gi, "ANSI")
    .replace(/\bosha\b/gi, "OSHA")
    .replace(/\bkn\b/g, "kN")
    .replace(/\bb7\b/gi, "B7")
    .replace(/\ba4\b/gi, "A4")
    .replace(/\bhilti\b/gi, "Hilti")
    .replace(/\bsikadur\b/gi, "Sikadur");

  // 1. Si el texto ya trae cantidad formateada en letras y número ("cuatro (4) ..."), no anteponer otra cantidad
  if (/^[a-záéíóúñ]+(?:\s+y\s+[a-záéíóúñ]+)?\s*\(\s*\d+\s*\)\s+/i.test(limpio)) {
    return limpio;
  }

  // 2. Si la descripción misma ya empieza con un número explícito ("4 líneas de vida...", "18 puntos de anclaje...")
  const mNumInicial = limpio.match(/^(\d+)\s+([a-záéíóúñ][\s\S]*)$/i);
  if (mNumInicial) {
    const cantEnTexto = Math.max(1, Math.round(Number(mNumInicial[1]) || 1));
    return formatearConCantidad(cantEnTexto, mNumInicial[2]);
  }

  // 3. Si es 1 servicio global / recertificación anual sobre sistemas en plural ("RECERTIFICACIÓN ANUAL PUNTOS DE ANCLAJE"),
  //    no forzar "un (1) punto de anclaje": la cantidad 1 es del servicio global, no de un único punto.
  if (cant === 1 && (esServicioInspeccion || esUnidadGlobal) && SUSTANTIVO_PLURAL_RE.test(limpio)) {
    return limpio;
  }

  return formatearConCantidad(cant, limpio);
}

/** Obtiene los ítems de la propuesta activa (o la primera) de una cotización, con respaldo en cotizacion.items. */
export function itemsDeCotizacionActiva(cotizacion) {
  if (!cotizacion) return [];
  if (Array.isArray(cotizacion.propuestas) && cotizacion.propuestas.length) {
    const activa =
      cotizacion.propuestas.find((p) => p.id === cotizacion.propuestaActivaId) || cotizacion.propuestas[0];
    if (Array.isArray(activa?.items) && activa.items.length) return activa.items;
  }
  return Array.isArray(cotizacion.items) ? cotizacion.items : [];
}

/**
 * Genera la descripción de los sistemas a certificar tomando como base
 * los ítems aprobados de la cotización vinculada.
 *
 * Ejemplo de retorno:
 * "cuatro (4) líneas de vida horizontales de 12 m en cable de acero de 5/16\" - un (1) punto de anclaje de 5.000 lbf"
 */
export function redactarSistemasDesdeCotizacion(cotizacion) {
  if (!cotizacion) return { texto: "", cantidadTotal: 0, itemsRedactados: [] };

  const items = itemsDeCotizacionActiva(cotizacion);
  if (!items.length) return { texto: "", cantidadTotal: 0, itemsRedactados: [] };

  // Agrupar ítems idénticos para evitar repeticiones del mismo ítem en la misma frase
  const agrupados = new Map();
  for (const it of items) {
    const desc = String(it?.desc || it?.descripcion || it?.nombre || "").trim();
    if (!desc || esItemAdministrativo(desc)) continue;
    const unidad = String(it?.unit || it?.unidad || "UND").trim();
    const cant = Math.max(1, Math.round(Number(it?.cant || it?.cantidad || 1)));
    const clave = `${limpiarPrefijoComercial(desc).toLowerCase()}|${unidad.toLowerCase()}`;
    const previo = agrupados.get(clave);
    if (previo) {
      previo.cant += cant;
    } else {
      agrupados.set(clave, { ...it, desc, unidad, cant });
    }
  }

  const redactados = [];
  let sumaCantidades = 0;

  for (const it of agrupados.values()) {
    const formatted = formatearItemParaCertificado(it);
    if (formatted) {
      redactados.push(formatted);
      sumaCantidades += it.cant;
    }
  }

  if (!redactados.length) return { texto: "", cantidadTotal: 0, itemsRedactados: [] };

  const textoUnido = redactados.join(" - ");

  return {
    texto: textoUnido,
    cantidadTotal: sumaCantidades || 1,
    itemsRedactados: redactados,
  };
}
