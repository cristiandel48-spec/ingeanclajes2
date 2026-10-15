// Tareas de producción y obra para Ingeanclajes
// Lista limpia (sin tareas artificiales de ejemplo)

export const SEED_TAREAS_IDS = new Set([
  "TAR-001",
  "TAR-002",
  "TAR-003",
  "TAR-004",
  "TAR-005",
]);

export function limpiarTareasEjemplo(tareas = []) {
  if (!Array.isArray(tareas)) return [];
  return tareas.filter(
    (t) =>
      t &&
      t.id &&
      !SEED_TAREAS_IDS.has(t.id) &&
      !t.__ejemplo &&
      !String(t.id).startsWith("ejemplo-")
  );
}

export const TAREAS_PRODUCCION_INIT = [];
