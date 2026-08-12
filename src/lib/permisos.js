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

// Ningun modulo se concede por defecto: cada quien entra solo a lo que se le
// marca. Antes el dashboard era obligatorio para todos, pero resume la plata
// de la empresa -cobros pendientes, totales- y eso no lo ve el personal
// operativo. Ahora la pantalla de aterrizaje es el primer modulo permitido.
export const MODULOS_MINIMOS = [];

// Modulos del rol Administrador y de nadie mas. No se pueden conceder
// marcando una casilla.
//
// - usuarios: si se pudiera dar, cualquiera con ese modulo se daria el resto.
// - dashboard: es el resumen economico de la empresa.
export const MODULOS_SOLO_ADMIN = ["usuarios", "dashboard", "auditoria"];

// Y esto solo lo ve el dueño, ni siquiera los demas administradores.
//
// La auditoria dice quien creo y quien toco cada documento. Es informacion
// sobre el propio equipo, y quien la mira no deberia poder ser mirado por los
// demas: si la ve todo el que sea administrador, deja de servir para lo que
// se pidio.
//
// OJO: esto lo esconde del MENU, no lo blinda en la base. Igual que los
// permisos por modulo, es la interfaz la que decide, asi que alguien con
// conocimientos tecnicos y una sesion valida podria consultar las columnas
// por fuera de la aplicacion. Para bloqueo de verdad harian falta politicas
// RLS por tabla.
export const MODULOS_SOLO_DUENO = ["auditoria"];

export function esAdmin(membresia) {
  return membresia?.role === "admin";
}

// Cuentas de soporte del desarrollo, que no se listan en la pantalla de
// Usuarios. Existen y funcionan igual: solo se dejan fuera de esa lista.
//
// OJO: esto es cosmetico, no seguridad. La cuenta sigue estando en la base,
// en el panel de Supabase y en los registros de acceso. No sirve para
// esconder un acceso de quien lo busque de verdad.
//
// Se puede definir en VITE_CUENTAS_SOPORTE (separadas por coma) para no
// dejarlas escritas en el codigo.
const CUENTAS_SOPORTE = (
  import.meta.env?.VITE_CUENTAS_SOPORTE ?? "cristiandel48@gmail.com"
)
  .split(",")
  .map((correo) => correo.trim().toLowerCase())
  .filter(Boolean);

export function esCuentaSoporte(correo) {
  return CUENTAS_SOPORTE.includes(String(correo ?? "").trim().toLowerCase());
}

/**
 * El dueño del programa. Es la misma lista de correos de arriba: quien lo
 * mantiene es tambien quien puede ver la auditoria.
 */
export function esDueno(membresia) {
  return esCuentaSoporte(membresia?.email);
}

/** Quita del listado del equipo las cuentas de soporte. */
export function sinCuentasSoporte(usuarios) {
  return (usuarios ?? []).filter((usuario) => !esCuentaSoporte(usuario?.email));
}

// Cifras de dinero dentro de un modulo operativo.
//
// A la obra entra quien organiza el trabajo: asigna personal, manda turnos,
// sube las fotos del avance. Esa persona no tiene por que ver cuanto se cobro,
// cuanto falta por cobrar ni el jornal de sus companeros. Es informacion
// confidencial y va aparte del permiso de entrar al modulo.
//
// Mientras la membresia carga (null) se oculta: es preferible que aparezca un
// segundo despues a que asome un dato que no debia verse.
export function puedeVerDinero(membresia) {
  return esAdmin(membresia);
}

// Modulos permitidos, ya resueltos. null en la base significa "todos".
export function modulosPermitidos(membresia) {
  const todos = NAV_ITEMS.map((item) => item.id);
  if (!membresia || !membresia.activo) return [];

  // Lo del dueño se descuenta antes que nada, incluso para un administrador.
  const visibles = esDueno(membresia)
    ? todos
    : todos.filter((id) => !MODULOS_SOLO_DUENO.includes(id));

  if (esAdmin(membresia)) return visibles;

  const asignados = membresia.modulos == null ? visibles : membresia.modulos;
  const marcados = new Set([...MODULOS_MINIMOS, ...asignados]);
  return visibles.filter((id) => marcados.has(id) && !MODULOS_SOLO_ADMIN.includes(id));
}

export function puedeVer(membresia, moduloId) {
  return modulosPermitidos(membresia).includes(moduloId);
}

// Dar de alta a un trabajador desde la obra o desde horarios.
//
// Va aparte de entrar a nomina: quien organiza el trabajo necesita registrar
// al que llega hoy a la obra, pero no tiene por que ver salarios ni cuentas.
// Se concede a quien ya entra a alguno de esos dos modulos, que es donde se
// topa con el problema de que la persona no aparece en la lista.
export function puedeCrearPersonal(membresia) {
  return puedeVer(membresia, "obras") || puedeVer(membresia, "horarios");
}

// Donde aterriza cada quien al entrar. El administrador cae en el dashboard;
// los demas, en el primer modulo que tengan asignado, en el orden del menu.
// null significa que la cuenta no tiene ningun modulo: hay que decirselo en
// vez de dejar la pantalla en blanco.
export function pantallaInicial(membresia) {
  const permitidos = modulosPermitidos(membresia);
  if (!permitidos.length) return null;
  return permitidos.includes("dashboard") ? "dashboard" : permitidos[0];
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
