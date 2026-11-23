import { esUsuarioCamila, esUsuarioCristian } from "./agendaEspecial";
import { puedeVer } from "./permisos";

// Claves de persistencia para los avisos de bienvenida de modulos.
export const CLAVE_AVISO_HORARIOS = "ingeanclajes_aviso_horarios_v2";
export const CLAVE_AVISO_INVENTARIO = "ingeanclajes_aviso_inventario_v2";

// Usuarios que reciben el recorrido interactivo al iniciar sesion:
// Paola Escobar, Richard Buelvas, Camila Sepulveda y Cristian Florez.
export function personaDestinoAviso(membresia, authUserEmail) {
  if (!membresia || membresia.activo === false) return null;
  if (esUsuarioCristian(membresia, authUserEmail)) return "Cristian";
  const email = String(membresia.email || authUserEmail || "").toLowerCase();
  const nombre = String(membresia.nombre || "").toLowerCase();
  const texto = `${nombre} ${email}`;
  if (texto.includes("cristian") || texto.includes("florez") || texto.includes("flórez")) return "Cristian";
  if (texto.includes("paola") || texto.includes("escobar")) return "Paola";
  if (texto.includes("richard") || texto.includes("buelvas")) return "Richard";
  if (esUsuarioCamila(membresia, authUserEmail)) return "Camila";
  return null;
}

export function claveAvisoUsuario(base, membresia, authUserEmail, nombre) {
  if (!nombre) return "";
  return `${base}:${String(membresia?.email || authUserEmail || nombre).toLowerCase()}`;
}

export function leerMarcaAviso(almacen, clave) {
  if (!clave) return false;
  try {
    return almacen.getItem(clave) === "1";
  } catch {
    return false;
  }
}

export function guardarMarcaAviso(almacen, clave) {
  if (!clave) return;
  try {
    almacen.setItem(clave, "1");
  } catch {
    // Sin almacenamiento disponible: el aviso se cierra igual en pantalla.
  }
}

export function avisoModuloPendiente(base, modulo, membresia, authUserEmail) {
  const nombre = personaDestinoAviso(membresia, authUserEmail);
  if (!nombre || !puedeVer(membresia, modulo)) return false;
  const clave = claveAvisoUsuario(base, membresia, authUserEmail, nombre);
  return !leerMarcaAviso(localStorage, clave) && !leerMarcaAviso(sessionStorage, clave);
}
