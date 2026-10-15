// Tareas de producción y obra para Ingeanclajes
// Lista limpia (sin tareas artificiales de ejemplo)

export const SEED_TAREAS_IDS = new Set([
  "TAR-001",
  "TAR-002",
  "TAR-003",
  "TAR-004",
  "TAR-005",
  "TAR-006",
  "TAR-007",
]);

export function limpiarTareasEjemplo(tareas = []) {
  if (!Array.isArray(tareas)) return [];
  return tareas.filter((t) => {
    if (!t || !t.id) return false;
    if (SEED_TAREAS_IDS.has(t.id)) return false;
    if (/^TAR-00[1-9]$/.test(t.id)) return false;
    if (t.__ejemplo) return false;
    if (String(t.id).startsWith("ejemplo-")) return false;

    // Filtro por títulos conocidos de las tareas de muestra
    const tit = String(t.titulo || "").toLowerCase().trim();
    if (
      tit.includes("póliza todo riesgo") ||
      tit.includes("cotización comercial cot-2026-089") ||
      tit.includes("anclajes químicos hilti") ||
      tit.includes("prueba de tracción a 4 cáncamos") ||
      tit.includes("informe de actividades y bitácora") ||
      tit.includes("revisar y firmar informe técnico") ||
      tit.includes("instalación de 48m de guaya")
    ) {
      return false;
    }

    return true;
  });
}

export const TAREAS_PRODUCCION_INIT = [];
