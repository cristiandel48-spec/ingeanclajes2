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
function limpiarPrefijoComercial(texto = "") {
  let limpio = String(texto || "").trim();
  const prefijos = [
    /^suministro\s*,\s*transporte\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^suministro\s*,\s*montaje\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^suministro\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^suministro\s*y\s*montaje\s+de\s+/i,
    /^suministro\s*y\s*adecuaci[oó]n\s+de\s+/i,
    /^suministro\s+de\s+/i,
    /^fabricaci[oó]n\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^fabricaci[oó]n\s*y\s*montaje\s+de\s+/i,
    /^instalaci[oó]n\s*y\s*montaje\s+de\s+/i,
    /^instalaci[oó]n\s+de\s+/i,
    /^montaje\s+de\s+/i,
    /^adecuaci[oó]n\s+de\s+/i,
    /^provisi[oó]n\s*e\s*instalaci[oó]n\s+de\s+/i,
    /^provisi[oó]n\s+de\s+/i,
    /^inspecci[oó]n\s*y\s*certificaci[oó]n\s+(anual\s+)?de\s+/i,
    /^certificaci[oó]n\s+(anual\s+)?de\s+/i,
  ];

  for (const regex of prefijos) {
    limpio = limpio.replace(regex, "");
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

// Convierte un ítem cotizado a redacción gramatical para certificado
export function formatearItemParaCertificado(item = {}) {
  const cant = Math.max(1, Math.round(Number(item.cant || item.cantidad || 1)));
  const descRaw = item.desc || item.descripcion || item.nombre || "";
  if (!descRaw.trim()) return null;

  // Filtrar ítems administrativos que no corresponden a sistemas físicos
  const esAdministrativo = /\b(vi[aá]ticos|transporte|alimentaci[oó]n|p[oó]liza|administraci[oó]n|curso|capacitaci[oó]n|examen|seguridad\s+social|arl|alquiler|andr[oó]meda)\b/i.test(descRaw);
  if (esAdministrativo && !/\b(l[ií]nea|anclaje|escalera|baranda|arn[eé]s)\b/i.test(descRaw)) {
    return null;
  }

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

  // Determinar género gramatical para el número 1
  const esFemenino = /^(l[ií]nea|escala|escalera|canastilla|red|baranda|estructura)/i.test(limpio);

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

/**
 * Genera la descripción de los sistemas a certificar tomando como base
 * los ítems aprobados de la cotización vinculada.
 *
 * Ejemplo de retorno:
 * "cuatro (4) líneas de vida horizontales de 12 m en cable de acero de 5/16\" - un (1) punto de anclaje de 5.000 lbf"
 */
export function redactarSistemasDesdeCotizacion(cotizacion) {
  if (!cotizacion) return { texto: "", cantidadTotal: 0, itemsRedactados: [] };

  // Obtener propuestas e ítems
  const items = [];
  if (Array.isArray(cotizacion.propuestas) && cotizacion.propuestas.length) {
    // Si hay propuesta activa, priorizarla; si no, la primera propuesta
    const activa = cotizacion.propuestas.find((p) => p.id === cotizacion.propuestaActivaId) || cotizacion.propuestas[0];
    if (Array.isArray(activa.items)) items.push(...activa.items);
  } else if (Array.isArray(cotizacion.items) && cotizacion.items.length) {
    items.push(...cotizacion.items);
  }

  if (!items.length) return { texto: "", cantidadTotal: 0, itemsRedactados: [] };

  const redactados = [];
  let sumaCantidades = 0;

  for (const it of items) {
    const formatted = formatearItemParaCertificado(it);
    if (formatted) {
      redactados.push(formatted);
      const c = Math.max(1, Math.round(Number(it.cant || it.cantidad || 1)));
      sumaCantidades += c;
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
