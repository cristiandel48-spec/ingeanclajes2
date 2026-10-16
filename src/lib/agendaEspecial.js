/**
 * Utilidades para fechas especiales y estrellitas en el calendario.
 *
 * Permite a Cristian Flores marcar fechas especiales con una estrellita (⭐)
 * que son visibles de manera privada y exclusiva para Camila Sepúlveda (y Cristian).
 * Para cualquier otro usuario de la empresa, estas fechas no se muestran.
 */

export const EMAIL_CAMILA = "camilascadavid@gmail.com";
export const EMAIL_CAMILA_ALT = "sistemasingeanclajes@gmail.com";
export const EMAIL_CRISTIAN = "cristiandel48@gmail.com";

/**
 * Determina si el usuario conectado es Cristian Flores
 */
export function esUsuarioCristian(membresia, authUserEmail = "") {
  const email = (membresia?.email || authUserEmail || "").toLowerCase().trim();
  const nombre = (membresia?.nombre || "").toLowerCase().trim();

  return (
    email === EMAIL_CRISTIAN ||
    email.includes("cristian") ||
    email.includes("cristiandel48") ||
    nombre.includes("cristian") ||
    nombre.includes("florez") ||
    nombre.includes("flórez")
  );
}

/**
 * Determina si el usuario conectado es Camila Sepúlveda
 */
export function esUsuarioCamila(membresia, authUserEmail = "") {
  const email = (membresia?.email || authUserEmail || "").toLowerCase().trim();
  const nombre = (membresia?.nombre || "").toLowerCase().trim();

  return (
    email === EMAIL_CAMILA ||
    email === EMAIL_CAMILA_ALT ||
    email.includes("camila") ||
    nombre.includes("camila") ||
    nombre.includes("sepulveda") ||
    nombre.includes("sepúlveda")
  );
}

/**
 * Determina si un compromiso o registro de agenda es una Fecha Especial con estrellita
 */
export function esCompromisoEspecial(item) {
  if (!item) return false;
  return (
    item.tipo === "especial" ||
    item.prioridad === "estrella" ||
    item.esEspecial === true ||
    String(item.id || "").startsWith("ESP-")
  );
}

/**
 * Filtra la lista de agenda asegurando que las fechas especiales solo sean
 * visibles para Cristian Flores y Camila Sepúlveda.
 */
export function filtrarAgendaPorPermiso(listaAgenda, { esCristian, esCamila }) {
  if (!Array.isArray(listaAgenda)) return [];
  // Cristian y Camila tienen acceso a ver las fechas especiales
  if (esCristian || esCamila) {
    return listaAgenda;
  }
  // Cualquier otro usuario o empleado regular NO ve las fechas especiales
  return listaAgenda.filter((item) => !esCompromisoEspecial(item));
}

/**
 * Obtiene la fecha especial de un día (si existe)
 */
export function obtenerFechaEspecialDelDia(eventosDelDia) {
  if (!Array.isArray(eventosDelDia)) return null;
  return eventosDelDia.find(esCompromisoEspecial) || null;
}

/**
 * Obtiene todas las fechas especiales de un mes determinado
 */
export function obtenerFechasEspecialesDelMes(listaAgenda, anio, mes) {
  if (!Array.isArray(listaAgenda)) return [];
  const mStr = String(mes + 1).padStart(2, "0");
  const prefix = `${anio}-${mStr}`;
  return listaAgenda.filter(
    (item) => esCompromisoEspecial(item) && String(item.fecha || "").startsWith(prefix)
  );
}

/**
 * Sugerencias rápidas para el modal de fecha especial
 */
export const SUGERENCIAS_FECHAS_ESPECIALES = [
  { label: "❤️ Aniversario", titulo: "Nuestro Aniversario ❤️" },
  { label: "🎂 Cumpleaños Camila", titulo: "Cumpleaños de Camila 🎂" },
  { label: "✨ Día Especial", titulo: "Día Especial ✨" },
  { label: "🥂 Cena Romántica", titulo: "Cena Romántica 🥂" },
  { label: "🌹 Detalle Especial", titulo: "Un detalle especial para ti 🌹" },
  { label: "✈️ Viaje Juntos", titulo: "Viaje / Escapada Juntos ✈️" },
];
