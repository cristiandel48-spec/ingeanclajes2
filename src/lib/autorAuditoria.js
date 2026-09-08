// Utilidades de auditoría y autoría
// Garantiza que se muestre siempre el nombre de la persona real responsable (ej. Cristian Flórez,
// María Camila Sepúlveda, etc.) en lugar de etiquetas genéricas como "Administración".

export function esAutorOculto() {
  // Las personas reales que usan el sistema nunca se ocultan en la auditoría
  return false;
}

export function normalizarNombrePersona(nombreOEmail, fallback = "") {
  if (!nombreOEmail) return fallback;
  const str = String(nombreOEmail).trim();
  const lower = str.toLowerCase();

  if (
    lower.includes("cristiandel48") ||
    lower.includes("cristian florez") ||
    lower.includes("cristian flórez")
  ) {
    return "Cristian Flórez";
  }

  if (lower.includes("camila") && (lower.includes("sepulveda") || lower.includes("sepúlveda"))) {
    return "María Camila Sepúlveda";
  }

  if (lower === "administración" || lower === "administracion") {
    return fallback || "Cristian Flórez";
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
  if (!nombre) {
    return normalizarNombrePersona(previoNombre, "Cristian Flórez");
  }
  return normalizarNombrePersona(nombre, "Cristian Flórez");
}

export function limpiarCreador(nombre, fecha, userId = null, mapUsuarios = null) {
  // 1. Si tenemos userId y está registrado en los miembros de la empresa, usar su nombre real
  if (userId && mapUsuarios && mapUsuarios.has(userId)) {
    const nombreEncontrado = mapUsuarios.get(userId);
    if (nombreEncontrado) {
      return normalizarNombrePersona(nombreEncontrado, "Cristian Flórez");
    }
  }

  // 2. Si hay nombre guardado, normalizarlo (ej. convertir cristiandel48 o Administración a Cristian Flórez)
  if (nombre) {
    const normalizado = normalizarNombrePersona(nombre, "Cristian Flórez");
    if (normalizado && normalizado !== "no registrado") {
      return normalizado;
    }
  }

  // 3. Si hay fecha de creación, asignar al responsable administrativo (Cristian Flórez)
  return fecha ? "Cristian Flórez" : "no registrado";
}

export function limpiarModificador(nombre, userId = null, mapUsuarios = null) {
  // 1. Si tenemos userId y está en el mapa de usuarios
  if (userId && mapUsuarios && mapUsuarios.has(userId)) {
    const nombreEncontrado = mapUsuarios.get(userId);
    if (nombreEncontrado) {
      return normalizarNombrePersona(nombreEncontrado, "Cristian Flórez");
    }
  }

  if (!nombre) return "";

  const normalizado = normalizarNombrePersona(nombre, "");
  if (
    normalizado.toLowerCase() === "administración" ||
    normalizado.toLowerCase() === "administracion"
  ) {
    return "Cristian Flórez";
  }

  return normalizado;
}

