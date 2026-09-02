// Utilidades de auditoría y autoría
// Garantiza que cuentas técnicas o de desarrollo no queden registradas
// en el historial de modificaciones, manteniendo limpios los reportes para administración.

export function esAutorOculto(nombreOEmail) {
  if (!nombreOEmail) return false;
  const str = String(nombreOEmail).toLowerCase().trim();
  return (
    str.includes("cristiandel48") ||
    str.includes("cristiandel48gmail") ||
    str.includes("cristian florez") ||
    str.includes("cristian flórez")
  );
}

export function resolverAutorGuardado(membresia, previoNombre = "") {
  const nombre = membresia?.nombre || membresia?.email || "";
  if (esAutorOculto(nombre)) {
    // Si quien está guardando es la cuenta técnica de Cristian,
    // conservar el autor anterior o dejar en blanco para no ensuciar el historial.
    return esAutorOculto(previoNombre) ? "" : (previoNombre || "");
  }
  return nombre;
}

export function limpiarCreador(nombre, fecha) {
  if (!nombre || esAutorOculto(nombre)) {
    return fecha ? "Administración" : "no registrado";
  }
  return nombre;
}

export function limpiarModificador(nombre) {
  if (!nombre || esAutorOculto(nombre)) {
    return "";
  }
  return nombre;
}
