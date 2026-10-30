import { normalizarTextoCertificacion } from "../../lib/normalizarEntrada";

const STRONG_STYLE = { fontWeight: 700, color: "#0f172a" };

function conNegritasFallback(texto, datos) {
  const trozos = [...new Set((datos || []).map((d) => String(d || "").trim()).filter((d) => d.length > 2))]
    .sort((a, b) => b.length - a.length);
  if (!trozos.length) return texto;

  const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patron = new RegExp(`(${trozos.map(escapar).join("|")})`, "gi");

  return String(texto || "")
    .split(patron)
    .map((parte, i) =>
      trozos.some((t) => t.toLowerCase() === parte.toLowerCase()) ? (
        <strong key={i} style={STRONG_STYLE}>
          {parte}
        </strong>
      ) : (
        <span key={i}>{parte}</span>
      )
    );
}

/**
 * Formatea de manera unificada el párrafo de certificación resaltando en negrita
 * exactamente el verbo oficial y los 4 datos variables de la certificación:
 * 1. Sistema / actividad certificada
 * 2. Obra / lugar de instalación
 * 3. Cliente y NIT
 * 4. Dirección del cliente
 */
export function renderTextoSistema(cert) {
  const raw = String(cert?.sistema || "").trim();
  if (!raw) return null;

  // Normalizar variantes como "INGEANCLAJES S.A.S CERTIFICA: los sistemas..." -> "CERTIFICA que los sistemas..."
  const preNormalizado = raw
    .replace(/^INGEANCLAJES\s+S\.?A\.?S\.?\s+/i, "")
    .replace(/^(CERTIFICA|RECERTIFICA)\s*:\s*(?=los\s+sistemas\b)/i, "$1 que ");

  const textoLimpio = normalizarTextoCertificacion(preNormalizado);

  const mVerbo = textoLimpio.match(/^(CERTIFICA|RECERTIFICA)(\s+que\s+)([\s\S]*)$/i);
  if (!mVerbo) {
    return conNegritasFallback(textoLimpio, [
      "CERTIFICA",
      "RECERTIFICA",
      cert?.detalle,
      cert?.lugar,
      cert?.cliente,
      cert?.nit,
      cert?.direccion,
      ...(textoLimpio.match(/\(NIT:\s*[^)]+\)/gi) || []),
    ]);
  }

  const verbo = mVerbo[1].toUpperCase();
  const conectorQue = mVerbo[2];
  const cuerpo = mVerbo[3];

  // Rango exacto de cada cláusula variable dentro del párrafo estándar
  const CLAUSULA_RE =
    /(los\s+sistemas\s+de\s+protecci[oó]n\s+contra\s+ca[ií]das\s+consistentes\s+en:\s*)([\s\S]+?)(?=,\s*(?:instalad[ao]s?\s+en|a\s+solicitud\s+de|con\s+NIT|con\s+direcci[oó]n|ubicad[ao]\s+en|fueron\s+inspeccionados)\b|$)|(,\s*instalad[ao]s?\s+en\s+(?:la\s+obra\s+|la\s+sede\s+|el\s+proyecto\s+|las\s+instalaciones\s+de\s+)?)([\s\S]+?)(?=,\s*(?:a\s+solicitud\s+de|con\s+NIT|con\s+direcci[oó]n|ubicad[ao]\s+en|fueron\s+inspeccionados)\b|$)|(,\s*a\s+solicitud\s+de\s+)([\s\S]+?)(?=,\s*(?:con\s+direcci[oó]n|ubicad[ao]\s+en|fueron\s+inspeccionados|cumplen\s+a\s+cabalidad)\b|$)|(,\s*con\s+NIT:\s*)([\s\S]+?)(?=,\s*(?:con\s+direcci[oó]n|ubicad[ao]\s+en|fueron\s+inspeccionados|cumplen\s+a\s+cabalidad)\b|$)|(,\s*(?:con\s+direcci[oó]n(?:\s+en)?|ubicad[ao]\s+en)\s*(?:la\s+|el\s+)?)([\s\S]+?)(?=,\s*(?:fueron\s+inspeccionados|cumplen\s+a\s+cabalidad)\b|$)/gi;

  const nodos = [
    <strong key="verbo" style={STRONG_STYLE}>
      {verbo}
    </strong>,
    <span key="que">{conectorQue}</span>,
  ];

  let cursor = 0;
  let match;
  let k = 0;

  while ((match = CLAUSULA_RE.exec(cuerpo)) !== null) {
    if (match.index > cursor) {
      nodos.push(<span key={`txt-${k++}`}>{cuerpo.slice(cursor, match.index)}</span>);
    }

    // Pares (prefijo normal, valor en negrita): [1,2], [3,4], [5,6], [7,8], [9,10]
    for (let g = 1; g <= 9; g += 2) {
      if (match[g] !== undefined) {
        nodos.push(<span key={`pre-${k++}`}>{match[g]}</span>);
        nodos.push(
          <strong key={`val-${k++}`} style={STRONG_STYLE}>
            {match[g + 1]}
          </strong>
        );
        break;
      }
    }

    cursor = match.index + match[0].length;
  }

  if (cursor < cuerpo.length) {
    nodos.push(<span key="resto">{cuerpo.slice(cursor)}</span>);
  }

  // Si el cuerpo no coincidió con ninguna cláusula estándar (redacción libre tras "CERTIFICA que"), usar fallback
  if (k === 0) {
    return conNegritasFallback(textoLimpio, [
      verbo,
      cert?.detalle,
      cert?.lugar,
      cert?.cliente,
      cert?.nit,
      cert?.direccion,
      ...(textoLimpio.match(/\(NIT:\s*[^)]+\)/gi) || []),
    ]);
  }

  return nodos;
}
