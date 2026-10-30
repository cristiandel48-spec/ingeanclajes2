import { normalizarRazonSocial, normalizarDocumento, normalizarTextoCertificacion } from "../../lib/normalizarEntrada";
import { clienteDeObra, claveRazonSocial } from "../../lib/quienRecibe";

/**
 * Determina si una cadena de dirección corresponde en realidad a una sede,
 * nombre o lugar de obra (y no a la dirección fiscal del cliente).
 */
export function esDireccionDeObra(direccion, obra, certLugar = "") {
  if (!direccion || typeof direccion !== "string") return false;
  const d = direccion.trim().toLowerCase();
  if (!d) return false;

  // Casos conocidos donde se guardó el nombre del proyecto o sede como dirección
  if (d.includes("caucasia epm") || d.includes("com caucasia")) return true;

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

/**
 * Limpia y desduplica una dirección fiscal para que nunca contenga frases repetidas
 * ni números desprendidos por error de tipeo/separación.
 */
export function limpiarDireccionFiscal(raw) {
  let d = String(raw || "").trim().replace(/[.\s]+$/, "");
  if (!d) return "";

  // Quitar prefijos comunes
  d = d.replace(/^(?:con\s+direcci[oó]n(?:\s+en)?\s*(?:la\s+|el\s+)?|con\s+direcci[oó]n\s+|ubicad[ao]\s+en\s*(?:la\s+|el\s+)?|en\s*(?:la\s+|el\s+)?|la\s+|el\s+)/i, "").trim();

  // Si trae un número huérfano al inicio como "75, CALLE 40 SUR..."
  const mPrefijoNum = d.match(/^(\d+[a-zA-Z]?),\s*(calle|carrera|cra|cl|diagonal|transversal|av|avenida|circular)\b(.+)$/i);
  if (mPrefijoNum) {
    const num = mPrefijoNum[1];
    const via = mPrefijoNum[2];
    const resto = mPrefijoNum[3];
    // Reubicar el número en su lugar habitual tras la vía
    d = `${via}${resto}`.replace(/,\s*(envigado|medell[ií]n|itag[uü][ií]|sabaneta|bello|antioquia)/i, ` - ${num}, $1`);
    if (!d.includes(num)) d = `${via}${resto} - ${num}`;
  }

  // Detectar y eliminar repeticiones de bloques completos (ej: "A, B, C, A, B, C, A, B, C" -> "A, B, C")
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

  // Desduplicar fragmentos adyacentes idénticos
  const tokens = d.split(/,\s*/);
  const tokensUnicos = [];
  for (const t of tokens) {
    const tTrim = t.trim();
    if (!tTrim) continue;
    if (tokensUnicos.length > 0 && tokensUnicos[tokensUnicos.length - 1].toLowerCase() === tTrim.toLowerCase()) {
      continue;
    }
    tokensUnicos.push(tTrim);
  }

  return tokensUnicos.join(", ").trim();
}

/**
 * Busca la dirección fiscal del cliente exclusivamente en el directorio de clientes.
 * Nunca toma el nombre o sede de la obra como dirección fiscal.
 */
export function buscarDireccionFiscalCliente(clientes, obra, clienteTexto = "", nitTexto = "") {
  const lista = Array.isArray(clientes) ? clientes : [];

  // 1. Por obra vinculada buscando ficha en clientes
  if (obra) {
    const c = clienteDeObra(lista, obra);
    if (c?.direccion?.trim() && !esDireccionDeObra(c.direccion, obra)) {
      return limpiarDireccionFiscal(c.direccion.trim());
    }
  }

  // 2. Por NIT en el directorio de clientes
  const nitNorm = normalizarDocumento(nitTexto || obra?.nit || "");
  if (nitNorm) {
    const porNit = lista.find((x) => normalizarDocumento(x?.nit) === nitNorm);
    if (porNit?.direccion?.trim() && !esDireccionDeObra(porNit.direccion, obra)) {
      return limpiarDireccionFiscal(porNit.direccion.trim());
    }
  }

  // 3. Por razón social / nombre del cliente en el directorio
  const nombreNorm = normalizarRazonSocial(clienteTexto || obra?.cliente || "");
  if (nombreNorm) {
    const clave = claveRazonSocial(nombreNorm);
    const porNombre = lista.find((x) =>
      normalizarRazonSocial(x?.nombre || "") === nombreNorm ||
      (clave.length >= 3 && claveRazonSocial(x?.nombre || "") === clave)
    );
    if (porNombre?.direccion?.trim() && !esDireccionDeObra(porNombre.direccion, obra)) {
      return limpiarDireccionFiscal(porNombre.direccion.trim());
    }
  }

  return "";
}

/**
 * Sanea el párrafo del sistema certificado de un certificado:
 * - Corrige "la sede" a "la obra".
 * - Elimina repeticiones y deja una sola dirección fiscal limpia.
 * - Es 100% idempotente (no duplica texto en ejecuciones sucesivas).
 */
export function sanitizarTextoSistema(sistema, direccionFiscal = "", lugar = "") {
  let t = String(sistema || "").trim();
  if (!t) return "";

  // 1. En certificaciones de ingeniería de alturas es "la obra", nunca "la sede"
  t = t.replace(/\binstalad[ao]s?\s+en\s+(?:la\s+(?:sede|obra)\s+)+/gi, "instalados en la obra ");
  t = t.replace(/\ben\s+la\s+sede\b/gi, "en la obra");

  const dirLimpia = limpiarDireccionFiscal(direccionFiscal);

  // Si la dirección provista es en realidad nombre de obra, descartarla
  if (dirLimpia && (esDireccionDeObra(dirLimpia, null, lugar) || dirLimpia.toLowerCase().includes("caucasia epm"))) {
    return sanitizarTextoSistema(t, "", lugar);
  }

  // 2. Eliminar cualquier bloque antiguo de dirección ubicado ANTES de "a solicitud de"
  t = t.replace(/,\s*(?:con\s+direcci[oó]n(?:\s+en)?|ubicad[ao]\s+en)[\s\S]*?(?=,\s*a\s+solicitud\s+de|,\s*con\s+NIT|,\s*fueron\s+inspeccionados|$)/i, "");

  // 3. Gestionar el bloque de dirección después del cliente
  const regexSolicitud = /(,\s*(?:a\s+solicitud\s+de\s+[^(,]+?(?:\s*\([^)]+\))?|con\s+NIT:\s*[0-9kK.-]+(?:s*\([^)]+\))?))(?:,\s*(?:con\s+direcci[oó]n(?:\s+en)?|ubicad[ao]\s+en)[\s\S]*?)?(?=,\s*(?:fueron\s+inspeccionados|cumplen\s+a\s+cabalidad)|$)/i;

  if (dirLimpia) {
    const dirSinPrefijo = dirLimpia.replace(/^(?:con\s+direcci[oó]n(?:\s+en)?\s*(?:la\s+|el\s+)?|con\s+direcci[oó]n\s+|ubicad[ao]\s+en\s*(?:la\s+|el\s+)?|en\s*(?:la\s+|el\s+)?|la\s+|el\s+)/i, "").trim();
    const textoDir = `con dirección ${dirSinPrefijo.toUpperCase()}`;

    if (regexSolicitud.test(t)) {
      t = t.replace(regexSolicitud, `$1, ${textoDir}`);
    } else {
      t = t.replace(/(?:,\s*(?:con\s+direcci[oó]n(?:\s+en)?|ubicad[ao]\s+en)[\s\S]*?)?(?=,\s*(?:fueron\s+inspeccionados|cumplen\s+a\s+cabalidad)|$)/i, `, ${textoDir}`);
    }
  } else {
    if (regexSolicitud.test(t)) {
      t = t.replace(regexSolicitud, "$1");
    }
    t = t.replace(/,\s*(?:con\s+direcci[oó]n(?:\s+en)?|ubicad[ao]\s+en)[\s\S]*?(?=,\s*(?:fueron\s+inspeccionados|cumplen\s+a\s+cabalidad)|$)/i, "");
  }

  // Limpiar cualquier residuo de CAUCASIA EPM
  t = t.replace(/,\s*(?:con\s+direcci[oó]n(?:\s+en)?|ubicad[ao]\s+en)\s*(?:la\s+|el\s+)?CAUCASIA(?:\s+EPM)?[^,]*/gi, "");

  return normalizarTextoCertificacion(t);
}

/**
 * Sanea y actualiza un certificado completo con la información fiscal del directorio de clientes.
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
