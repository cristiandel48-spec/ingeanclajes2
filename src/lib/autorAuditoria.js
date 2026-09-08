// Utilidades de auditoría y autoría
// Garantiza que se muestre el nombre de la persona responsable de operaciones
// (Camila Sepúlveda u otro miembro del equipo). La cuenta de desarrollo técnico
// (Cristian Flórez) NO debe aparecer en el historial ni en los registros.

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

export function normalizarNombrePersona(nombreOEmail, fallback = "Camila Sepúlveda") {
  if (!nombreOEmail) return fallback;
  const str = String(nombreOEmail).trim();
  const lower = str.toLowerCase();

  // La cuenta técnica de Cristian Flórez y "Administración" nunca deben aparecer
  if (
    lower.includes("cristiandel48") ||
    lower.includes("cristian florez") ||
    lower.includes("cristian flórez") ||
    lower === "administración" ||
    lower === "administracion"
  ) {
    return fallback || "Camila Sepúlveda";
  }

  if (lower.includes("camila")) {
    return "Camila Sepúlveda";
  }

  // Si viene un correo electrónico, formatear como nombre legible
  if (str.includes("@")) {
    const usuario = str.split("@")[0].replace(/[._-]/g, " ");
    return usuario.charAt(0).toUpperCase() + usuario.slice(1);
  }

  return str;
}

export function resolverAutorGuardado(membresia, previoNombre = "") {
  const nombre = membresia?.nombre?.trim() || membresia?.email?.trim() || "";
  if (esAutorOculto(nombre)) {
    // Si quien guarda es la cuenta técnica de Cristian,
    // se asigna a Camila Sepúlveda o se preserva el autor previo
    if (previoNombre && !esAutorOculto(previoNombre)) {
      return normalizarNombrePersona(previoNombre, "Camila Sepúlveda");
    }
    return "Camila Sepúlveda";
  }
  return normalizarNombrePersona(nombre, "Camila Sepúlveda");
}

export function limpiarCreador(nombre, fecha, userId = null, mapUsuarios = null) {
  // 1. Si tenemos userId y está en el mapa de usuarios
  if (userId && mapUsuarios && mapUsuarios.has(userId)) {
    const nombreEncontrado = mapUsuarios.get(userId);
    if (nombreEncontrado && !esAutorOculto(nombreEncontrado)) {
      return normalizarNombrePersona(nombreEncontrado, "Camila Sepúlveda");
    }
  }

  // 2. Normalizar el nombre existente
  if (nombre) {
    const normalizado = normalizarNombrePersona(nombre, "Camila Sepúlveda");
    if (normalizado && normalizado !== "no registrado") {
      return normalizado;
    }
  }

  // 3. Si hay fecha de creación, asignar a Camila Sepúlveda
  return fecha ? "Camila Sepúlveda" : "no registrado";
}

export function limpiarModificador(nombre, userId = null, mapUsuarios = null) {
  if (userId && mapUsuarios && mapUsuarios.has(userId)) {
    const nombreEncontrado = mapUsuarios.get(userId);
    if (nombreEncontrado && !esAutorOculto(nombreEncontrado)) {
      return normalizarNombrePersona(nombreEncontrado, "Camila Sepúlveda");
    }
  }

  if (!nombre) return "";

  if (esAutorOculto(nombre)) {
    return "Camila Sepúlveda";
  }

  const normalizado = normalizarNombrePersona(nombre, "");
  if (
    normalizado.toLowerCase() === "administración" ||
    normalizado.toLowerCase() === "administracion"
  ) {
    return "Camila Sepúlveda";
  }

  return normalizado;
}

