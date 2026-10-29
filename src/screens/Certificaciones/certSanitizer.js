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
 * Busca la dirección fiscal del cliente exclusivamente en el directorio de clientes.
 * Nunca toma el nombre o sede de la obra como dirección fiscal.
 */
export function buscarDireccionFiscalCliente(clientes, obra, clienteTexto = "", nitTexto = "") {
  const lista = Array.isArray(clientes) ? clientes : [];

  // 1. Por obra vinculada buscando ficha en clientes
  if (obra) {
    const c = clienteDeObra(lista, obra);
    if (c?.direccion?.trim() && !esDireccionDeObra(c.direccion, obra)) {
      return c.direccion.trim();
    }
  }

  // 2. Por NIT en el directorio de clientes
  const nitNorm = normalizarDocumento(nitTexto || obra?.nit || "");
  if (nitNorm) {
    const porNit = lista.find((x) => normalizarDocumento(x?.nit) === nitNorm);
    if (porNit?.direccion?.trim() && !esDireccionDeObra(porNit.direccion, obra)) {
      return porNit.direccion.trim();
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
      return porNombre.direccion.trim();
    }
  }

  return "";
}

/**
 * Sanea el párrafo del sistema certificado de un certificado:
 * - Si hay dirección fiscal real, actualiza o inyecta "ubicada en ...".
 * - Si NO hay dirección fiscal (o la guardada era el nombre de la obra),
 *   elimina cualquier mención errónea a "ubicada en la CAUCASIA EPM" o "ubicada en la".
 */
export function sanitizarTextoSistema(sistema, direccionFiscal = "", lugar = "") {
  const t = String(sistema || "").trim();
  if (!t) return "";

  const dirLimpia = String(direccionFiscal || "").trim().replace(/[.\s]+$/, "");
  const dirSinPrefijo = dirLimpia.replace(/^(ubicad[ao]\s+en\s+(?:la\s+|el\s+)?|en\s+(?:la\s+|el\s+)?)/i, "").trim();

  // Si la dirección provista es en realidad nombre de obra, descartarla
  if (dirSinPrefijo && (esDireccionDeObra(dirSinPrefijo, null, lugar) || dirSinPrefijo.toLowerCase().includes("caucasia epm"))) {
    return sanitizarTextoSistema(t, "", lugar);
  }

  if (dirSinPrefijo) {
    const prefijo = /^(calle|carrera|cra|cl\b|diagonal|transversal|avenida|av\b)/i.test(dirSinPrefijo) ? "la " : "";
    const textoDir = `ubicada en ${prefijo}${dirSinPrefijo.toUpperCase()}`;

    // Si ya tiene una cláusula "ubicada en ..." o "con DIRECCIÓN: ..."
    if (/,\s*(?:ubicad[ao]\s+en\s+(?:la\s+|el\s+)?|con\s+DIRECCI[OÓ]N:\s*)[^,]+/i.test(t)) {
      return normalizarTextoCertificacion(
        t.replace(/,\s*(?:ubicad[ao]\s+en\s+(?:la\s+|el\s+)?|con\s+DIRECCI[OÓ]N:\s*)[^,]+/i, `, ${textoDir}`)
      );
    }

    // Si no la tiene pero tiene "a solicitud de", inyectar antes
    if (/,\s*a\s+solicitud\s+de/i.test(t)) {
      return normalizarTextoCertificacion(
        t.replace(/,\s*a\s+solicitud\s+de/i, `, ${textoDir}, a solicitud de`)
      );
    }
  }

  // Sin dirección fiscal: eliminar cualquier cláusula espuria de dirección
  let limpio = t;

  // 1. Eliminar "ubicada en la CAUCASIA EPM" o variaciones
  limpio = limpio.replace(/,\s*ubicad[ao]\s+en\s+(?:la\s+|el\s+)?CAUCASIA(?:\s+EPM)?[^,]*/gi, "");

  // 2. Eliminar "ubicada en ..." si coincide con el lugar
  if (lugar) {
    const lugarEscapado = lugar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    limpio = limpio.replace(new RegExp(`,\\s*ubicad[ao]\\s+en\\s+(?:la\\s+|el\\s+)?${lugarEscapado}[^,]*`, "gi"), "");
  }

  // 3. Eliminar cláusulas vacías o huérfanas tipo "ubicada en la," o "ubicada en,"
  limpio = limpio.replace(/,\s*ubicad[ao]\s+en\s*(?:la\s*|el\s*)?(?=,\s*a solicitud de|,\s*con NIT|,\s*fueron inspeccionados|$)/gi, "");

  // 4. Si la dirección que tenía era claramente de obra, eliminarla
  limpio = limpio.replace(/,\s*ubicad[ao]\s+en\s+(?:la\s+|el\s+)?[^,]+?(?=,\s*a solicitud de|,\s*con NIT)/gi, (match) => {
    const cuerpoMatch = match.replace(/^,\s*ubicad[ao]\s+en\s+(?:la\s+|el\s+)?/i, "").trim();
    if (esDireccionDeObra(cuerpoMatch, null, lugar) || cuerpoMatch.toLowerCase().includes("caucasia")) {
      return "";
    }
    return match;
  });

  return normalizarTextoCertificacion(limpio);
}

/**
 * Sanea y actualiza un certificado completo con la información fiscal del directorio de clientes.
 */
export function sanitizarCertificado(cert, { clientes = [], obras = [] } = {}) {
  if (!cert) return cert;

  const obra = (obras || []).find((o) => o.id === cert.obraId);
  const dirFiscal = buscarDireccionFiscalCliente(clientes, obra, cert.cliente, cert.nit);

  let direccionFinal = "";
  if (dirFiscal) {
    direccionFinal = dirFiscal;
  } else if (cert.direccion && !esDireccionDeObra(cert.direccion, obra, cert.lugar)) {
    direccionFinal = cert.direccion.trim();
  }

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
