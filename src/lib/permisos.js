// Que ve cada persona segun su rol y los modulos que le marcaron.
//
// El rol 'admin' no se restringe nunca: es quien administra al equipo. Para
// los demas, modulos es la lista de identificadores del menu a los que entra.

import { NAV_ITEMS } from "../config/navigation";

export const ROLES = [
  {
    id: "admin",
    label: "Administrador",
    detalle: "Ve todo y puede crear usuarios y darles accesos.",
  },
  {
    id: "manager",
    label: "Coordinador",
    detalle: "Entra solo a los módulos que se le marquen.",
  },
  {
    id: "operator",
    label: "Operativo",
    detalle: "Entra solo a los módulos que se le marquen.",
  },
  {
    id: "viewer",
    label: "Consulta",
    detalle: "Entra solo a los módulos que se le marquen.",
  },
];

export const ROL_LABEL = Object.fromEntries(ROLES.map((r) => [r.id, r.label]));

// Todo el mundo necesita una pantalla de aterrizaje.
export const MODULOS_MINIMOS = ["dashboard"];

// Administrar el equipo es del rol Administrador y de nadie mas. No se puede
// conceder marcando una casilla: si se pudiera, cualquiera con ese modulo se
// daria a si mismo el resto.
export const MODULOS_SOLO_ADMIN = ["usuarios"];

export function esAdmin(membresia) {
  return membresia?.role === "admin";
}

// Modulos permitidos, ya resueltos. null en la base significa "todos".
export function modulosPermitidos(membresia) {
  const todos = NAV_ITEMS.map((item) => item.id);
  if (!membresia || !membresia.activo) return [];
  if (esAdmin(membresia)) return todos;

  const asignados = membresia.modulos == null ? todos : membresia.modulos;
  const marcados = new Set([...MODULOS_MINIMOS, ...asignados]);
  return todos.filter((id) => marcados.has(id) && !MODULOS_SOLO_ADMIN.includes(id));
}

export function puedeVer(membresia, moduloId) {
  return modulosPermitidos(membresia).includes(moduloId);
}

// Secciones del menu filtradas; las que quedan sin items no se muestran.
export function filtrarSecciones(secciones, membresia) {
  const permitidos = new Set(modulosPermitidos(membresia));
  return secciones
    .map((seccion) => ({
      ...seccion,
      items: seccion.items.filter((item) => permitidos.has(item.id)),
    }))
    .filter((seccion) => seccion.items.length > 0);
}
