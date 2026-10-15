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
]);

export function limpiarDocumentosEjemplo(documentos = []) {
  if (!Array.isArray(documentos)) return [];
  return documentos.filter(
    (d) =>
      d &&
      d.id &&
      !SEED_DOC_IDS.has(d.id) &&
      !d.__ejemplo &&
      !String(d.id).startsWith("ejemplo-")
  );
}

export const DOCUMENTOS_EQUIPO_INIT = [];
