// Reporte de actividad por usuario: cuantas cotizaciones, informes de
// actividades, certificaciones y ejecuciones de obra hizo cada persona en
// cada mes.
//
// Aqui solo esta el conteo, sin pantalla ni archivos, para poder probarlo.
//
// Quien «hizo» un documento es quien lo creo, con el mismo criterio de la
// pantalla de Auditoria (limpiarCreador): si los dos sitios contaran distinto,
// nadie sabria cual creer. Eso incluye que lo guardado por la cuenta tecnica
// y los registros viejos sin autor queden a nombre de Camila Sepulveda.

import { esAutorOculto, limpiarCreador, normalizarNombrePersona } from "./autorAuditoria";

export const TIPOS_REPORTE = [
  { id: "cotizaciones", label: "Cotizaciones", corto: "Cotizaciones", singular: "Cotización" },
  { id: "informes", label: "Informes de actividades", corto: "Informes", singular: "Informe de actividades" },
  { id: "certificaciones", label: "Certificaciones", corto: "Certificaciones", singular: "Certificación" },
  { id: "obras", label: "Ejecuciones de obra", corto: "Obras", singular: "Ejecución de obra" },
  { id: "visitas", label: "Visitas agendadas", corto: "Visitas", singular: "Visita" },
];

// Las visitas salen de la agenda, y la agenda es privada (migracion 075): la
// base solo le entrega a cada quien sus propios compromisos. Por eso el
// reporte solo puede contar las visitas de quien lo esta viendo; en las demas
// personas no se pone un cero, que seria mentira, sino que se deja sin dato.
export const SIN_DATO = "—";

export const SIN_REGISTRAR = "Sin registrar";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const clave = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Dia en hora de Colombia («2026-11-03») de una fecha guardada.
 *
 * La base guarda la hora en UTC: un documento hecho el 31 de octubre a las
 * 8 de la noche esta guardado como 1 de noviembre a la 1 de la mañana, y
 * contado tal cual caeria en el mes que no es. Colombia no cambia la hora,
 * asi que son siempre cinco horas menos.
 *
 * Una fecha sin hora («2026-11-03») ya es el dia: no se convierte.
 */
export function fechaColombia(valor) {
  if (!valor) return "";
  const texto = String(valor).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  const t = new Date(texto).getTime();
  if (Number.isNaN(t)) return "";
  return new Date(t - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

export function mesActualColombia(ahora = new Date()) {
  return fechaColombia(ahora.toISOString()).slice(0, 7);
}

/** «2026-11» menos 2 -> «2026-09». */
export function restarMeses(mes, cuantos) {
  const [anio, numero] = String(mes).split("-").map(Number);
  const d = new Date(Date.UTC(anio, numero - 1 - cuantos, 1));
  return d.toISOString().slice(0, 7);
}

/** «2026-11» -> «Noviembre 2026». */
export function tituloMes(mes) {
  const [anio, numero] = String(mes || "").split("-");
  const nombre = MESES[Number(numero) - 1];
  return nombre ? `${nombre} ${anio}` : String(mes || "");
}

export function tituloPeriodo(desde, hasta) {
  return desde === hasta ? tituloMes(desde) : `${tituloMes(desde)} – ${tituloMes(hasta)}`;
}

/** Todos los meses entre los dos, incluidos, del mas reciente al mas viejo. */
export function listaMeses(desde, hasta) {
  const valido = (m) => /^\d{4}-\d{2}$/.test(String(m || ""));
  if (!valido(desde) || !valido(hasta)) return [];
  const [inicio, fin] = desde <= hasta ? [desde, hasta] : [hasta, desde];
  const meses = [];
  // Tope de diez años: un rango mal escrito no debe colgar la pantalla.
  for (let mes = fin; mes >= inicio && meses.length < 120; mes = restarMeses(mes, 1)) {
    meses.push(mes);
  }
  return meses;
}

const conteoVacio = () => ({ cotizaciones: 0, informes: 0, certificaciones: 0, obras: 0, visitas: 0, total: 0 });

/**
 * @param {object} datos
 * @param {Array} datos.cotizaciones, datos.informes, datos.certs, datos.obras
 *   Tal como estan en la aplicacion (con creadoPor, creadoPorNombre, creadoEn).
 * @param {Array} datos.agenda  Compromisos de la agenda de quien ve el reporte.
 *   Solo se cuentan las visitas, en el mes para el que estan agendadas.
 * @param {string} datos.agendaDe  Nombre (o correo) del dueño de esa agenda.
 * @param {Array} datos.usuarios  Miembros del equipo (user_id, nombre, email, activo).
 * @param {string} datos.desde, datos.hasta  Meses «AAAA-MM», incluidos.
 */
export function armarReporteActividad({
  cotizaciones = [],
  informes = [],
  certs = [],
  obras = [],
  agenda = [],
  agendaDe = "",
  usuarios = [],
  desde,
  hasta,
} = {}) {
  const meses = listaMeses(desde, hasta);
  const enRango = new Set(meses);

  const mapUsuarios = new Map();
  for (const u of usuarios || []) {
    const id = u?.user_id || u?.id;
    if (id) mapUsuarios.set(id, u.nombre || u.email || "");
  }

  const porUsuario = new Map();
  const filaDe = (nombre) => {
    const k = clave(nombre);
    if (!porUsuario.has(k)) {
      porUsuario.set(k, { usuario: nombre, porMes: {}, totales: conteoVacio() });
    }
    return porUsuario.get(k);
  };

  // El equipo activo sale aunque no haya hecho nada en el periodo: que alguien
  // este en cero tambien es informacion.
  for (const u of usuarios || []) {
    if (!u || u.activo === false) continue;
    if (esAutorOculto(u.nombre) || esAutorOculto(u.email)) continue;
    const nombre = normalizarNombrePersona(u.nombre || u.email, "");
    if (nombre) filaDe(nombre);
  }

  const totales = { porMes: {}, general: conteoVacio() };
  const detalle = [];

  const contar = (tipo, { nombre, userId, fecha, codigo, referencia }) => {
    const dia = fechaColombia(fecha);
    const mes = dia.slice(0, 7);
    if (!enRango.has(mes)) return;

    const autor = limpiarCreador(nombre, fecha, userId, mapUsuarios);
    const usuario = !autor || autor === "no registrado" ? SIN_REGISTRAR : autor;

    const fila = filaDe(usuario);
    fila.porMes[mes] ??= conteoVacio();
    totales.porMes[mes] ??= conteoVacio();
    for (const conteo of [fila.porMes[mes], fila.totales, totales.porMes[mes], totales.general]) {
      conteo[tipo] += 1;
      conteo.total += 1;
    }

    detalle.push({
      tipo,
      tipoLabel: TIPOS_REPORTE.find((t) => t.id === tipo)?.singular || tipo,
      codigo: String(codigo || ""),
      referencia: String(referencia || ""),
      usuario: fila.usuario,
      fecha: dia,
      mes,
    });
  };

  for (const c of cotizaciones || []) {
    contar("cotizaciones", {
      nombre: c.creadoPorNombre, userId: c.creadoPor, fecha: c.creadoEn || c.fecha,
      codigo: c.numero || c.id, referencia: [c.cliente, c.obra].filter(Boolean).join(" · "),
    });
  }
  for (const i of informes || []) {
    contar("informes", {
      nombre: i.creadoPorNombre, userId: i.creadoPor, fecha: i.creadoEn || i.fechaInforme,
      codigo: i.id, referencia: i.proyecto || i.localizacion || "",
    });
  }
  for (const c of certs || []) {
    contar("certificaciones", {
      nombre: c.creadoPorNombre, userId: c.creadoPor, fecha: c.creadoEn || c.fecha,
      codigo: c.numero || c.id, referencia: [c.cliente, c.sistema].filter(Boolean).join(" · "),
    });
  }
  for (const o of obras || []) {
    contar("obras", {
      nombre: o.creadoPorNombre, userId: o.creadoPor, fecha: o.creadoEn || o.fechaInicio,
      codigo: o.id, referencia: [o.proyecto, o.cliente].filter(Boolean).join(" · "),
    });
  }

  // Visitas: las de la agenda de quien ve el reporte, por la fecha de la
  // visita. Las estrellitas y demas compromisos (llamadas, reuniones) no son
  // visitas y no entran.
  const duenoAgenda = agendaDe ? normalizarNombrePersona(agendaDe, "") : "";
  if (duenoAgenda) {
    filaDe(duenoAgenda);
    for (const a of agenda || []) {
      if ((a?.tipo || "visita") !== "visita") continue;
      contar("visitas", {
        nombre: duenoAgenda, userId: null, fecha: a.fecha || a.creadoEn,
        codigo: a.id, referencia: [a.titulo || a.obra, a.cliente].filter(Boolean).join(" · "),
      });
    }
  }
  for (const fila of porUsuario.values()) {
    fila.visitasVisibles = Boolean(duenoAgenda) && clave(fila.usuario) === clave(duenoAgenda);
  }

  // Primero quien mas hizo; «Sin registrar» siempre al final, y solo si tiene algo.
  const filas = [...porUsuario.values()]
    .filter((f) => f.usuario !== SIN_REGISTRAR || f.totales.total > 0)
    .sort((a, b) => {
      if (a.usuario === SIN_REGISTRAR) return 1;
      if (b.usuario === SIN_REGISTRAR) return -1;
      return b.totales.total - a.totales.total || a.usuario.localeCompare(b.usuario, "es");
    });

  detalle.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.tipoLabel.localeCompare(b.tipoLabel, "es"));

  return { desde: meses[meses.length - 1] || "", hasta: meses[0] || "", meses, filas, totales, detalle, visitasDe: duenoAgenda };
}

/**
 * Lo que se escribe en una casilla: la cifra, o «—» en las visitas de quien
 * no es el dueño de la agenda (no se sabe cuantas tiene; ver SIN_DATO).
 */
export function valorCasilla(fila, conteo, tipo) {
  if (tipo === "visitas" && fila && !fila.visitasVisibles) return SIN_DATO;
  return conteo?.[tipo] || 0;
}

/**
 * Una linea por usuario y mes, para el Excel: es la forma que se deja filtrar
 * y sumar. Salen todos los meses del periodo, tambien los que estan en cero.
 */
export function filasPorUsuarioYMes(reporte) {
  const lineas = [];
  for (const fila of reporte.filas) {
    for (const mes of reporte.meses) {
      lineas.push({ usuario: fila.usuario, mes, fila, ...(fila.porMes[mes] || conteoVacio()) });
    }
  }
  return lineas;
}
