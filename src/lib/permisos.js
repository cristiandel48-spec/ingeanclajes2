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
    id: "contador",
    label: "Contador / Tributario",
    detalle: "Acceso contable completo: causaciones, facturas DIAN, contabilidad, pagos e informes.",
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

// Módulos sugeridos por defecto para el rol de Contador
export const MODULOS_CONTADOR = [
  "proveedores",
  "contabilidad",
  "pagos",
  "nomina",
  "financiero",
];

// Cada quien entra a lo que se le marca, más su lista personal de tareas, que
// es suya y no muestra datos de nadie mas.
export const MODULOS_MINIMOS = ["tareas"];

// Modulos del rol Administrador y de nadie mas. No se pueden conceder
// marcando una casilla.
//
// - usuarios: si se pudiera dar, cualquiera con ese modulo se daria el resto.
// - dashboard: es el resumen economico de la empresa.
export const MODULOS_SOLO_ADMIN = ["usuarios", "dashboard", "auditoria"];

// Y esto solo lo ve el dueño, ni siquiera los demas administradores.
// La auditoria estuvo abierta a los administradores; volvio a ser solo del
// dueño por decision suya.
export const MODULOS_SOLO_DUENO = ["auditoria"];

export function esAdmin(membresia) {
  return membresia?.role === "admin";
}

export function esContador(membresia) {
  return membresia?.role === "contador";
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

/**
 * Determina si el usuario actual es Camila Sepúlveda, Cristian Flórez o un Administrador del sistema
 * para recibir alertas comerciales y recordatorios de cotizaciones sin respuesta.
 */
export function esDestinatarioAlerta(membresia) {
  if (!membresia) return false;
  const role = String(membresia.role || "").toLowerCase().trim();
  const nombre = String(membresia.nombre || "").toLowerCase().trim();
  const email = String(membresia.email || "").toLowerCase().trim();

  if (role === "admin" || role === "superadmin" || role === "owner" || role === "administrador") return true;
  if (esDueno(membresia)) return true;

  if (nombre.includes("camila") || nombre.includes("sepulveda") || nombre.includes("sepúlveda")) return true;
  if (nombre.includes("cristian") || nombre.includes("florez") || nombre.includes("flórez")) return true;
  if (email.includes("camila") || email.includes("cristian")) return true;

  return false;
}

/**
 * Determina si el usuario actual tiene permisos para aprobar o rechazar Órdenes de Compra.
 * Está asignado a María Camila Sepúlveda y a los Administradores / Dueños del sistema.
 */
export function puedeAprobarOrdenCompra(membresia) {
  if (!membresia) return false;
  if (esAdmin(membresia) || esDueno(membresia)) return true;
  const role = String(membresia.role || "").toLowerCase().trim();
  if (role === "admin" || role === "superadmin" || role === "owner" || role === "administrador") return true;
  const nombre = String(membresia.nombre || "").toLowerCase().trim();
  const email = String(membresia.email || "").toLowerCase().trim();
  return (
    nombre.includes("camila") ||
    nombre.includes("sepulveda") ||
    nombre.includes("sepúlveda") ||
    email.includes("camila")
  );
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
  return esAdmin(membresia) || esContador(membresia);
}

// Tablas que la base solo deja leer y escribir con cierto modulo (migracion
// 063). Tiene que coincidir con app.tiene_acceso_modulo: si la aplicacion
// intentara guardar una de estas sin permiso, la base lo rechaza y el
// autoguardado completo de esa persona se detiene.
export const ENTIDADES_RESTRINGIDAS = {
  pagos: ["pagos"],
  contabilidad_config: ["contabilidad"],
  plan_cuentas: ["contabilidad"],
  asientos_contables: ["contabilidad"],
  nominas_generadas: ["nomina"],
};

// Tablas que todos leen pero solo MODIFICAN quienes tienen alguno de estos
// modulos (migracion 069). Incluye los cruces que hace la aplicacion: aprobar
// una cotizacion crea la obra, Horarios toca obras, renombrar un cliente
// cambia sus obras, cotizaciones y certificados, Obras registra gastos...
// Tiene que coincidir con la migracion.
export const ENTIDADES_ESCRITURA = {
  obras: ["obras", "cotizacion", "horarios", "clientes"],
  cotizaciones: ["cotizacion", "obras", "clientes"],
  clientes: ["clientes", "cotizacion"],
  certificaciones: ["certificaciones", "vencimientos", "clientes"],
  informes: ["informes"],
  horarios: ["horarios", "obras"],
  cuentas: ["obras", "pagos"],
  empleados: ["nomina", "obras", "horarios"],
  cargos: ["nomina", "obras", "horarios"],
  agenda: ["agenda"],
  proveedores: ["pagos"],
  ordenes_compra: ["pagos"],
};

// Mismo criterio que la base: administrador o contador, modulos sin limitar
// (null) o alguno de los modulos marcados. Se mira la lista tal como esta
// guardada, no la del menu, porque es la que consulta la base.
function tieneAlgunModulo(membresia, requeridos) {
  if (!membresia || membresia.activo === false) return false;
  if (["admin", "contador"].includes(membresia.role)) return true;
  if (membresia.modulos == null) return true;
  return requeridos.some((modulo) => membresia.modulos.includes(modulo));
}

export function tieneAccesoTabla(membresia, entidad) {
  const requeridos = ENTIDADES_RESTRINGIDAS[entidad];
  if (!requeridos) return true;
  return tieneAlgunModulo(membresia, requeridos);
}

export function puedeEscribirTabla(membresia, entidad) {
  if (!tieneAccesoTabla(membresia, entidad)) return false;
  const requeridos = ENTIDADES_ESCRITURA[entidad];
  if (!requeridos) return true;
  // El rol Consulta es de solo lectura en la base.
  if (membresia?.role === "viewer") return false;
  return tieneAlgunModulo(membresia, requeridos);
}

/** Tablas que esta persona no puede guardar: se saltan al autoguardar. */
export function entidadesSinPermiso(membresia) {
  const todas = new Set([...Object.keys(ENTIDADES_RESTRINGIDAS), ...Object.keys(ENTIDADES_ESCRITURA)]);
  return [...todas].filter((entidad) => !puedeEscribirTabla(membresia, entidad));
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
  if (permitidos.includes("dashboard")) return "dashboard";
  // Los modulos que tiene todo el mundo no cuentan como pantalla de inicio:
  // cada quien sigue entrando a su primer modulo de trabajo.
  const principales = permitidos.filter((id) => !MODULOS_MINIMOS.includes(id));
  return principales.length ? principales[0] : permitidos[0];
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
