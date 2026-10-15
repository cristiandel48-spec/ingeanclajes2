/**
 * Semilla de Documentos y Notas de Obra estilo Notion + Apple.
 * Lista limpia (sin ejemplos artificiales) para que el equipo cree sus propios documentos.
 */

export const SEED_DOC_IDS = new Set([
  "doc-previsora",
  "doc-python",
  "doc-claves",
  "doc-cierre",
  "doc-tareas-diarias",
  "doc-normas",
]);

export function limpiarDocumentosEjemplo(documentos = []) {
  if (!Array.isArray(documentos)) return [];
  return documentos.filter((d) => {
    if (!d || !d.id) return false;
    if (SEED_DOC_IDS.has(d.id)) return false;
    if (d.__ejemplo) return false;
    if (String(d.id).startsWith("ejemplo-")) return false;

    // Filtro por títulos conocidos de las semillas
    const tit = String(d.titulo || "").toLowerCase().trim();
    if (
      tit.includes("normas internas de seguridad") ||
      tit.includes("previsora vivir") ||
      tit.includes("python intermedio") ||
      tit.includes("usuarios y contraseñas") ||
      tit.includes("calendario de cierre") ||
      tit.includes("tareas diarias e - a")
    ) {
      return false;
    }

    return true;
  }).map((d) => {
    // Limpiar bloques de ejemplo automáticos que no se desean ("Primeros pendientes", "Logros y retos del ciclo")
    const bloquesLimpios = (d.bloques || []).filter((b) => {
      if (!b) return false;
      const tit = String(b.titulo || "").toLowerCase().trim();
      if (
        tit === "primeros pendientes" ||
        tit === "logros y retos del ciclo" ||
        tit.includes("logros y retos") ||
        tit.includes("primeros pendientes")
      ) {
        return false;
      }
      return true;
    });
    return { ...d, bloques: bloquesLimpios };
  });
}

export const DOCUMENTOS_EQUIPO_INIT = [];
