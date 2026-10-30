import {
  normalizarRazonSocial,
  normalizarDocumento,
  normalizarTextoCertificacion,
  limpiarConectoresRepetidosCertificacion,
} from "../../lib/normalizarEntrada";
import { clienteDeObra, claveRazonSocial } from "../../lib/quienRecibe";
import { DEPARTAMENTOS_COLOMBIA } from "../../data/colombiaUbicaciones";

const normGeo = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,()]/g, " ")
    .replace(/^(?:municipio|departamento|dpto|ciudad|distrito)\s+de\s+/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const UBICACIONES_COLOMBIA = (() => {
  const set = new Set([
    "COLOMBIA",
    "BOGOTA",
    "BOGOTA D C",
    "BOGOTA DC",
    "DISTRITO CAPITAL",
    "CUNDINAMARCA",
    "VALLE",
    "VALLE DEL CAUCA",
    "VALLE DEL CUAUCA",
    "NORTE DE SANTANDER",
    "SAN ANDRES",
    "SAN ANDRES Y PROVIDENCIA",
  ]);
  for (const dep of DEPARTAMENTOS_COLOMBIA || []) {
    if (dep?.nombre) {
      set.add(normGeo(dep.nombre));
      for (const parte of String(dep.nombre).split(/[/-]/)) {
        const n = normGeo(parte);
        if (n) set.add(n);
      }
    }
    for (const mun of dep?.municipios || []) {
      const m = normGeo(mun);
      if (m) set.add(m);
    }
  }
  return set;
})();

function esUbicacionGeografica(segmento, ciudadCliente = "") {
  const limpio = normGeo(segmento);
  if (!limpio) return false;
  // Si tiene números (ej. "CALLE 10 # 20-30" o "BODEGA 39"), no es solo municipio/departamento
  if (/\d/.test(limpio)) return false;

  if (UBICACIONES_COLOMBIA.has(limpio)) return true;

  if (ciudadCliente) {
    const cNorm = normGeo(ciudadCliente);
    if (cNorm && limpio === cNorm) return true;
    for (const p of String(ciudadCliente).split(/[,/-]/)) {
      const pn = normGeo(p);
      if (pn && limpio === pn) return true;
    }
  }

  // Combinaciones como "ENVIGADO - ANTIOQUIA" o "MEDELLIN / ANTIOQUIA"
  const subPartes = String(segmento).split(/\s*[-/]\s*/).filter(Boolean);
  if (subPartes.length > 1 && subPartes.every((sp) => UBICACIONES_COLOMBIA.has(normGeo(sp)))) {
    return true;
  }

  return false;
}

function quitarColaGeograficaGuion(segmento, ciudadCliente = "") {
  let actual = String(segmento || "").trim();
  // Quita sufijos tipo " - ENVIGADO - ANTIOQUIA" al final del segmento sin tocar números de placa como "- 75"
  let cambio = true;
  while (cambio) {
    cambio = false;
    const idx = actual.lastIndexOf(" - ");
    if (idx > 0) {
      const cola = actual.slice(idx + 3).trim();
      if (cola && !/\d/.test(cola) && esUbicacionGeografica(cola, ciudadCliente)) {
        actual = actual.slice(0, idx).trim();
        cambio = true;
      }
    }
  }
  return actual;
}

/**
 * Detecta listados múltiples de frentes/peajes/sedes de obra sin nomenclatura vial
 * (ej: "TORCA, EL BOTE, LA MESA, IBAGUE, LA VIRGINIA...").
 */
export function esListaDeSedesDeObra(direccion) {
  const texto = String(direccion || "").trim();
  if (!texto) return false;
  const partes = texto.split(/\s*[,;]\s*/).filter(Boolean);
  if (partes.length >= 3 && !/\d/.test(texto)) return true;
  return false;
}

/**
 * Determina si una cadena de dirección corresponde en realidad a una sede,
 * nombre o lugar de obra (y no a la dirección fiscal del cliente).
 */
export function esDireccionDeObra(direccion, obra, certLugar = "") {
  if (!direccion || typeof direccion !== "string") return false;
  const d = direccion.trim().toLowerCase();
  if (!d) return false;

  // Casos conocidos donde se guardó el nombre del proyecto o listado de sedes como dirección
  if (d.includes("caucasia epm") || d.includes("com caucasia")) return true;
  if (esListaDeSedesDeObra(direccion)) return true;

  const lugar = String(certLugar || "").trim().toLowerCase();
  if (lugar && (d === lugar || d.includes(lugar) || lugar.includes(d))) return true;

  if (obra) {
    const proyecto = String(obra.proyecto || "").trim().toLowerCase();
    const nombre = String(obra.nombre || "").trim().toLowerCase();
    const dirObra = String(obra.direccion || "").trim().toLowerCase();
    const ciudad = String(obra.ciudad || "").trim().toLowerCase();

    if (proyecto && (d === proyecto || d.includes(proyecto))) return true;
    if (nombre && (d === nombre || d.includes(nombre))) return true;
    if (ciudad && d === ciudad) return true;
    if (dirObra && d === dirObra && (d === proyecto || d.includes("epm") || !/\d/.test(d))) return true;
  }

  return false;
}

const COMPLEMENTO_INTERIOR_RE =
  /^(?:OFICINA|OF\.?|INT(?:ERIOR)?|BODEGA|BOD\.?|LOCAL|LOC\.?|APTO\.?|APARTAMENTO|PISO|TORRE|BLOQUE|EDIFICIO|CONSULTORIO|MODULO|MÓDULO|ETAPA|CASA|LOTE|MANZANA|PARQUEADERO|SUITE)\b/i;

/**
 * Limpia y deja UNA SOLA dirección del cliente, sin municipio y sin departamento.
 */
export function limpiarDireccionFiscal(raw, ciudadCliente = "") {
  let d = String(raw || "").trim().replace(/[.\s]+$/, "");
  if (!d) return "";
  if (esListaDeSedesDeObra(d)) return "";

  // Quitar prefijos comunes
  d = d.replace(/^(?:con\s+direcci[oó]n(?:\s+en)?\s*(?:la\s+|el\s+)?|con\s+direcci[oó]n\s+|ubicad[ao]\s+en\s*(?:la\s+|el\s+)?|en\s*(?:la\s+|el\s+)?|la\s+|el\s+)/i, "").trim();

  // Si trae un número huérfano al inicio como "75, CALLE 40 SUR NO 24 E, ENVIGADO..."
  const mPrefijoNum = d.match(/^(\d+[a-zA-Z]?),\s*((?:calle|carrera|cra|cl|diagonal|transversal|av|avenida|circular)\b[^,;]*)(.*)$/i);
  if (mPrefijoNum) {
    const num = mPrefijoNum[1];
    const viaPrincipal = mPrefijoNum[2].trim();
    const resto = mPrefijoNum[3] || "";
    d = `${viaPrincipal} - ${num}${resto}`;
  }

  // Detectar y eliminar repeticiones de bloques completos
  const partes = d.split(/,\s*/);
  const mitad = Math.floor(partes.length / 2);
  for (let tam = 1; tam <= mitad; tam++) {
    const patron = partes.slice(0, tam).join(", ").toLowerCase();
    let esRepeticion = true;
    for (let i = tam; i < partes.length; i += tam) {
      const pedazo = partes.slice(i, i + tam).join(", ").toLowerCase();
      if (pedazo !== patron && !patron.startsWith(pedazo)) {
        esRepeticion = false;
        break;
      }
    }
    if (esRepeticion && partes.length >= tam * 2) {
      d = partes.slice(0, tam).join(", ");
      break;
    }
  }

  // Separar segmentos, quitar municipio y departamento, y desduplicar
  const tokens = d.split(/\s*[,;]+\s*/);
  const tokensLimpios = [];
  for (const t of tokens) {
    const sinColaGeo = quitarColaGeograficaGuion(t, ciudadCliente);
    if (!sinColaGeo) continue;
    if (esUbicacionGeografica(sinColaGeo, ciudadCliente)) continue;
    if (
      tokensLimpios.length > 0 &&
      tokensLimpios[tokensLimpios.length - 1].toLowerCase() === sinColaGeo.toLowerCase()
    ) {
      continue;
    }
    tokensLimpios.push(sinColaGeo);
  }

  if (!tokensLimpios.length) return "";

  // Conservar únicamente UNA dirección (más su complemento interior inmediato si aplica, ej. "OFICINA 402")
  if (tokensLimpios.length > 1 && COMPLEMENTO_INTERIOR_RE.test(tokensLimpios[1])) {
    return `${tokensLimpios[0]}, ${tokensLimpios[1]}`.trim();
  }

  return tokensLimpios[0].trim();
}

/**
 * Busca la dirección del cliente exclusivamente en la tabla de clientes,
 * devolviendo una sola dirección limpia sin municipio ni departamento.
 */
export function buscarDireccionFiscalCliente(clientes, obra, clienteTexto = "", nitTexto = "") {
  const lista = Array.isArray(clientes) ? clientes : [];

  const extraerDeFicha = (c) => {
    const raw = String(c?.direccion || "").trim();
    if (!raw) return "";
    if (raw.toLowerCase().includes("caucasia epm") || raw.toLowerCase().includes("com caucasia")) return "";
    if (esListaDeSedesDeObra(raw)) return "";
    if (obra && esDireccionDeObra(raw, obra)) return "";
    return limpiarDireccionFiscal(raw, c?.ciudad || "");
  };

  // 1. Por obra vinculada buscando ficha en clientes
  if (obra) {
    const c = clienteDeObra(lista, obra);
    const dir = extraerDeFicha(c);
    if (dir) return dir;
  }

  // 2. Por NIT en el directorio de clientes
  const nitNorm = normalizarDocumento(nitTexto || obra?.nit || "");
  if (nitNorm) {
    const porNit = lista.find((x) => normalizarDocumento(x?.nit) === nitNorm);
    const dir = extraerDeFicha(porNit);
    if (dir) return dir;
  }

  // 3. Por razón social / nombre del cliente en el directorio
  const nombreNorm = normalizarRazonSocial(clienteTexto || obra?.cliente || "");
  if (nombreNorm) {
    const clave = claveRazonSocial(nombreNorm);
    const porNombre = lista.find(
      (x) =>
        normalizarRazonSocial(x?.nombre || "") === nombreNorm ||
        (clave.length >= 3 && claveRazonSocial(x?.nombre || "") === clave)
    );
    const dir = extraerDeFicha(porNombre);
    if (dir) return dir;
  }

  return "";
}

/**
 * Sanea el párrafo del sistema certificado de un certificado:
 * - Corrige "la sede" a "la obra".
 * - Elimina repeticiones, municipios, departamentos y deja una sola dirección limpia.
 * - Es 100% idempotente (no duplica texto en ejecuciones sucesivas).
 */
export function sanitizarTextoSistema(sistema, direccionFiscal = "", lugar = "") {
  let t = String(sistema || "").trim();
  if (!t) return "";

  // 0. Limpiar conectores repetidos o huérfanos preexistentes ("a solicitud, a solicitud de ...")
  t = limpiarConectoresRepetidosCertificacion(t);

  // 1. En certificaciones de ingeniería de alturas es "la obra", nunca "la sede"
  t = t.replace(/\binstalad[ao]s?\s+en\s+(?:la\s+(?:sede|obra)\s+)+/gi, "instalados en la obra ");
  t = t.replace(/\ben\s+la\s+sede\b/gi, "en la obra");

  const dirLimpia = limpiarDireccionFiscal(direccionFiscal);

  // Si la dirección provista es en realidad nombre de obra o lista de sedes, descartarla
  if (dirLimpia && (esDireccionDeObra(dirLimpia, null, lugar) || dirLimpia.toLowerCase().includes("caucasia epm"))) {
    return sanitizarTextoSistema(t, "", lugar);
  }

  // 2. Eliminar todos los bloques previos de dirección (tanto antes como después de "a solicitud de")
  t = t.replace(
    /,\s*(?:con\s+DIRECCI[OÓ]N\s*:\s*|con\s+direcci[oó]n(?:\s+en)?\s*(?:la\s+|el\s+)?|ubicad[ao]\s+en\s*(?:la\s+|el\s+)?)[\s\S]*?(?=(?:,\s*(?:instalad[ao]s?\s+en|a\s+solicitud\s+de|por\s+encargo\s+de|con\s+NIT|con\s+direcci[oó]n|ubicad[ao]\s+en|fueron\s+inspeccionados|cumplen\s+a\s+cabalidad)\b)|$)/gi,
    ""
  );

  // 3. Insertar una única dirección limpia después del cliente (soportando paréntesis múltiples como "(MALL SANTANA) (NIT: ...)")
  const regexSolicitud =
    /(,\s*(?:a\s+solicitud\s+de\s+[\s\S]+?|con\s+NIT:\s*[0-9kK.\s-]+(?:\s*\([^)]+\))?))(?=,\s*(?:fueron\s+inspeccionados|cumplen\s+a\s+cabalidad)\b|$)/i;

  if (dirLimpia) {
    const dirSinPrefijo = dirLimpia
      .replace(/^(?:con\s+direcci[oó]n(?:\s+en)?\s*(?:la\s+|el\s+)?|con\s+direcci[oó]n\s+|ubicad[ao]\s+en\s*(?:la\s+|el\s+)?|en\s*(?:la\s+|el\s+)?|la\s+|el\s+)/i, "")
      .trim();
    const textoDir = `con dirección ${dirSinPrefijo.toUpperCase()}`;

    if (regexSolicitud.test(t)) {
      t = t.replace(regexSolicitud, `$1, ${textoDir}`);
    } else {
      t = t.replace(/(?=,\s*(?:fueron\s+inspeccionados|cumplen\s+a\s+cabalidad)\b|$)/i, `, ${textoDir}`);
    }
  }

  // Limpiar cualquier residuo de CAUCASIA EPM
  t = t.replace(/,\s*(?:con\s+direcci[oó]n(?:\s+en)?|ubicad[ao]\s+en)\s*(?:la\s+|el\s+)?CAUCASIA(?:\s+EPM)?[^,]*/gi, "");
  t = t.replace(/\bcon\s+direcci[oó]n\s+en\s+(?:la\s+|el\s+)?/gi, "con dirección ");
  t = t.replace(/\bcon\s+direcci[oó]n\s+en\b/gi, "con dirección ");

  return normalizarTextoCertificacion(t);
}

/**
 * Sanea y actualiza un certificado completo con la dirección única del cliente (tabla clientes,
 * sin municipio ni departamento).
 */
export function sanitizarCertificado(cert, { clientes = [], obras = [] } = {}) {
  if (!cert) return cert;

  const obra = (obras || []).find((o) => o.id === cert.obraId);
  let dirFiscal = buscarDireccionFiscalCliente(clientes, obra, cert.cliente, cert.nit);

  if (!dirFiscal && cert.direccion && !esDireccionDeObra(cert.direccion, obra, cert.lugar)) {
    dirFiscal = cert.direccion.trim();
  }

  const direccionFinal = limpiarDireccionFiscal(dirFiscal);
  const sistemaFinal = sanitizarTextoSistema(cert.sistema, direccionFinal, cert.lugar);

  if (direccionFinal === (cert.direccion || "") && sistemaFinal === (cert.sistema || "")) {
    return cert;
  }

  return {
    ...cert,
    direccion: direccionFinal,
    sistema: sistemaFinal,
  };
}

/**
 * Sanea una lista de certificados de una sola vez.
 */
export function sanitizarListaCertificados(certs, { clientes = [], obras = [] } = {}) {
  if (!Array.isArray(certs)) return certs;
  let cambio = false;
  const resultado = certs.map((c) => {
    const s = sanitizarCertificado(c, { clientes, obras });
    if (s !== c) cambio = true;
    return s;
  });
  return cambio ? resultado : certs;
}
