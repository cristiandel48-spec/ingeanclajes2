// Evita certificaciones e informes repetidos.
//
// Pasó en una obra real: la misma obra quedó certificada tres veces el mismo
// día (una certificación y dos recertificaciones). Una obra si puede tener
// varios documentos -una sede por informe, una certificación por sede, un
// informe por quincena-, así que no basta con mirar la obra: se mira la obra
// junto con la sede y, en los informes, el período.

import { normalizarMayusculas, normalizarRazonSocial } from "./normalizarEntrada";

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Para comparar textos escritos a mano: sin tildes, mayúsculas, sin signos.
const comparable = (texto) => normalizarMayusculas(String(texto || ""))
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^A-Z0-9 ]/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Una certificación cuenta mientras no esté anulada, reemplazada por una
// recertificación, ni vencida.
function certificacionVigente(c, hoy) {
  if (/anulad|revocad|recertificad/i.test(String(c?.estado || ""))) return false;
  return !c?.proxMant || c.proxMant >= hoy;
}

function mismaObra(a, b) {
  if (a?.obraId && b?.obraId) return a.obraId === b.obraId;
  // Sin obra vinculada se compara por cliente.
  return Boolean(a?.cliente) && normalizarRazonSocial(a.cliente) === normalizarRazonSocial(b?.cliente || "");
}

/**
 * La certificación vigente que ya cubre la misma obra y sede, o null.
 *
 * La sede es el «lugar» del formulario, que va escrito dentro del texto de
 * lo certificado. Si el formulario no dice sede, cualquier certificación
 * vigente de la obra cuenta como la misma.
 */
export function certificacionRepetida(certs, nueva, { editId = null, hoy = hoyIso() } = {}) {
  const sede = comparable(nueva?.lugar);
  return (certs || []).find((c) => {
    if (!c || c.id === editId) return false;
    if (!mismaObra(c, nueva) || !certificacionVigente(c, hoy)) return false;
    if (!sede) return true;
    return comparable(c.sistema).includes(sede) || comparable(c.lugar) === sede;
  }) || null;
}

const seCruzan = (a1, a2, b1, b2) => {
  const ini1 = a1 || a2;
  const fin1 = a2 || a1;
  const ini2 = b1 || b2;
  const fin2 = b2 || b1;
  if (!ini1 || !ini2) return false;
  return ini1 <= fin2 && ini2 <= fin1;
};

/**
 * El informe que ya cubre la misma obra, la misma sede (el proyecto) y un
 * período que se cruza con el del nuevo, o null.
 */
export function informeRepetido(informes, nuevo, { editId = null } = {}) {
  const proyecto = comparable(nuevo?.proyecto);
  return (informes || []).find((i) => {
    if (!i || i.id === editId) return false;
    if (!mismaObra(i, nuevo)) return false;
    if (proyecto && comparable(i.proyecto) && comparable(i.proyecto) !== proyecto) return false;
    return seCruzan(i.periodoInicio, i.periodoFin, nuevo?.periodoInicio, nuevo?.periodoFin);
  }) || null;
}
