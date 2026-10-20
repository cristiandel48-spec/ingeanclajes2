// Utilidades de integración con Correo, Google Calendar y Apple Calendar para la Agenda de Camila
import { enviarCotizacionPorCorreo } from "./backend/usuarios";
import { asuntoSeguro } from "./asuntoCorreo";
import { compromisoAParams, generarIcsCompromiso, parsearHora } from "./icsCompromiso";
import { today } from "./format";

export { generarIcsCompromiso, parsearHora };

export const EMAIL_CAMILA_DEFAULT = "camilascadavid@gmail.com";

export const DESTINATARIOS_AGENDA_DEFAULT = [
  EMAIL_CAMILA_DEFAULT,
];

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS_COMPLETO = [
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
];

export function getEmailNotificacionAgenda() {
  try {
    return localStorage.getItem("agenda_email_notificacion") || EMAIL_CAMILA_DEFAULT;
  } catch {
    return EMAIL_CAMILA_DEFAULT;
  }
}

export function setEmailNotificacionAgenda(email) {
  try {
    localStorage.setItem("agenda_email_notificacion", email);
  } catch {
    // Ignorar si localStorage no está disponible
  }
}

// El dia de la semana y la fecha por separado, que es como los pinta el
// correo: el dia arriba en pequeño y la fecha debajo, grande.
export function partesFechaLegible(isoStr) {
  if (!isoStr) return { diaSemana: "", fecha: "" };
  const [y, m, d] = isoStr.split("-").map(Number);
  if (!y || !m || !d) return { diaSemana: "", fecha: "" };
  const fecha = new Date(y, m - 1, d);
  return {
    diaSemana: DIAS_COMPLETO[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1],
    fecha: `${d} de ${MESES[m - 1]} de ${y}`,
  };
}

export function formatFechaLegible(isoStr) {
  const { diaSemana, fecha } = partesFechaLegible(isoStr);
  if (!fecha) return "";
  return `${diaSemana}, ${fecha}`;
}

// Convierte cualquier hora a formato "HH:mm" (24h) para input type="time"
export function horaA24h(str) {
  if (!str) return "09:00";
  const { h, m } = parsearHora(str);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Convierte formato "HH:mm" (24h) a formato legible "hh:mm AM/PM"
export function horaA12h(time24) {
  if (!time24) return "09:00 AM";
  const str = String(time24).trim();
  // Si ya viene con AM o PM
  if (/AM|PM/i.test(str)) return str;

  const [hStr, mStr] = str.split(":");
  let h = parseInt(hStr || "9", 10);
  const m = mStr ? mStr.slice(0, 2) : "00";
  const ampm = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${m} ${ampm}`;
}

// Genera el enlace a Google Calendar para incluirlo en el correo
export function generarUrlGoogleCalendar(compromiso, emailInvitado = EMAIL_CAMILA_DEFAULT) {
  if (!compromiso) return "";
  const isoFecha = compromiso.fecha || today();
  const { h, m } = parsearHora(compromiso.hora);

  const pad = (n) => String(n).padStart(2, "0");
  const dStr = isoFecha.replace(/-/g, "");

  const hInicio = pad(h);
  const mInicio = pad(m);

  let hFinNum = h + 1;
  let mFinNum = m + 30;
  if (mFinNum >= 60) {
    hFinNum += 1;
    mFinNum -= 60;
  }
  if (hFinNum >= 24) hFinNum = 23;

  const hFin = pad(hFinNum);
  const mFin = pad(mFinNum);

  const fechas = `${dStr}T${hInicio}${mInicio}00/${dStr}T${hFin}${mFin}00`;

  const tipoLabel = compromiso.tipo === "visita"
    ? "Visita a Obra"
    : compromiso.tipo === "llamada"
    ? "Llamada de Seguimiento"
    : compromiso.tipo === "reunion"
    ? "Reunion de Coordinacion"
    : "Compromiso";

  const titulo = `${tipoLabel} - ${compromiso.obra || compromiso.titulo || "Ingeanclajes"}`;
  const ubicacion = `${compromiso.obra || ""} ${compromiso.ciudad || ""}`.trim();

  const partesDetalles = [
    compromiso.cliente ? `Cliente: ${compromiso.cliente}` : "",
    compromiso.contacto ? `Contacto: ${compromiso.contacto}${compromiso.telefono ? ` (${compromiso.telefono})` : ""}` : "",
    compromiso.requerimientoSst ? `SST: ${compromiso.requerimientoSst}` : "",
    compromiso.notas ? `Notas: ${compromiso.notas}` : "",
    compromiso.linkReunion ? `Reunión: ${compromiso.linkReunion}` : "",
  ].filter(Boolean);

  const detalles = partesDetalles.join(" · ") || "Ingeanclajes S.A.S.";

  const invitadosStr = Array.isArray(emailInvitado)
    ? emailInvitado.join(",")
    : String(emailInvitado || "");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    dates: fechas,
    details: detalles,
    location: ubicacion,
    add: invitadosStr,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Enlace para Apple Calendar (iPhone y Mac): lo atiende api/ics.js y
// devuelve el compromiso como archivo de calendario. Tocarlo abre «Agregar al
// calendario» en la app Calendario, sin cuenta de Google.
export function generarUrlAppleCalendar(compromiso) {
  if (!compromiso?.fecha) return "";
  const origen =
    typeof window !== "undefined" && window.location?.origin && !window.location.origin.includes("localhost")
      ? window.location.origin
      : "https://ingeanclajes2.vercel.app";
  return `${origen}/api/ics?${compromisoAParams(compromiso).toString()}`;
}

// Acorta una URL larga (ej. de Google Calendar) para que el correo no tenga enlaces de 5 líneas
export async function acortarUrl(urlLarga) {
  if (!urlLarga || typeof urlLarga !== "string" || !urlLarga.startsWith("http")) {
    return urlLarga;
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`https://da.gd/s?url=${encodeURIComponent(urlLarga)}`, {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (resp.ok) {
      const texto = (await resp.text()).trim();
      if (texto.startsWith("http")) {
        return texto;
      }
    }
  } catch (err) {
    console.warn("No se pudo acortar el enlace con da.gd, usando URL completa:", err);
  }
  return urlLarga;
}

const CORREO_VALIDO = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Los correos de los invitados se escriben a mano en un solo campo,
// separados por coma o punto y coma.
export function separarCorreos(texto = "") {
  return String(texto || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function correosInvalidos(texto = "") {
  return separarCorreos(texto).filter((c) => !CORREO_VALIDO.test(c));
}

function aBase64(texto) {
  const bytes = new TextEncoder().encode(texto);
  let bin = "";
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
}

// Envía notificación por correo automática a Camila en segundo plano desde sistemasingeanclajes@gmail.com
export async function enviarNotificacionAgendaPorCorreo(compromiso, destinatarios = EMAIL_CAMILA_DEFAULT) {
  const tipoLabel = compromiso.tipo === "visita"
    ? "Visita a Obra"
    : compromiso.tipo === "llamada"
    ? "Llamada de Seguimiento"
    : compromiso.tipo === "reunion"
    ? "Reunión"
    : "Compromiso";

  const asunto = asuntoSeguro(
    `Agenda Ingeanclajes: ${tipoLabel} - ${compromiso.obra || compromiso.titulo || "Compromiso"}`
  );

  const correos = Array.isArray(destinatarios)
    ? destinatarios
    : String(destinatarios || "").split(/[,;]/).map((s) => s.trim()).filter(Boolean);

  const listaCorreos = correos.length ? correos : [EMAIL_CAMILA_DEFAULT];

  const enlaceCalendar = generarUrlGoogleCalendar(compromiso, listaCorreos);
  const [enlaceCorto, enlaceApple] = await Promise.all([
    acortarUrl(enlaceCalendar),
    acortarUrl(generarUrlAppleCalendar(compromiso)),
  ]);
  // El archivo de calendario adjunto: Mail de Apple lo muestra como evento
  // con «Agregar al calendario», sin pasar por Google.
  const icsBase64 = aBase64(generarIcsCompromiso(compromiso, listaCorreos));

  const mensaje = [
    `Hola Camila,`,
    ``,
    `Se ha agendado un nuevo compromiso en el sistema de Ingeanclajes:`,
    ``,
    `• Actividad: ${compromiso.obra || compromiso.titulo || "Compromiso"}`,
    `• Tipo: ${tipoLabel}`,
    `• Fecha: ${formatFechaLegible(compromiso.fecha)}`,
    `• Hora: ${compromiso.hora || "Por definir"}`,
    `• Cliente / Empresa: ${compromiso.cliente || "N/A"}`,
    `• Ciudad / Obra: ${compromiso.ciudad ? `${compromiso.ciudad} · ` : ""}${compromiso.obra || ""}`,
    `• Contacto: ${compromiso.contacto || "N/A"}${compromiso.telefono ? ` (Tel: ${compromiso.telefono})` : ""}`,
    compromiso.requerimientoSst ? `• Requerimientos SST: ${compromiso.requerimientoSst}` : "",
    compromiso.notas ? `• Notas adicionales: ${compromiso.notas}` : "",
    compromiso.linkReunion ? `• Enlace de reunión virtual: ${compromiso.linkReunion}` : "",
    ``,
    `📅 iPhone o Mac: abre el archivo de calendario adjunto, o agrégalo a Apple Calendar aquí:`,
    enlaceApple,
    ``,
    `📅 Google Calendar:`,
    enlaceCorto,
    ``,
    `Equipo Ingeanclajes S.A.S.`,
  ].filter(Boolean).join("\n");

  // Los campos van sueltos, no solo dentro del texto: el correo los pinta
  // como ficha -que es, cuando y a que hora arriba y grande, y lo demas en
  // lineas separadas-, que es lo que se lee de un vistazo en el celular. El
  // `mensaje` sigue viajando: es lo que ve quien abre el correo sin formato.
  const { diaSemana, fecha } = partesFechaLegible(compromiso.fecha);
  const agenda = {
    saludo: "Hola Camila,",
    titulo: compromiso.obra || compromiso.titulo || "Compromiso",
    tipo: tipoLabel,
    diaSemana,
    fecha,
    hora: compromiso.hora || "",
    cliente: compromiso.cliente || "",
    ciudad: compromiso.ciudad || "",
    obra: compromiso.obra || "",
    contacto: compromiso.contacto || "",
    telefono: compromiso.telefono || "",
    sst: compromiso.requerimientoSst || "",
    notas: compromiso.notas || "",
    linkReunion: compromiso.linkReunion || "",
    enlaceCalendar: enlaceCorto,
  };

  const envios = await Promise.allSettled(
    listaCorreos.map((correo) =>
      enviarCotizacionPorCorreo({
        para: correo,
        asunto,
        mensaje,
        agenda,
        numero: "AGENDA",
        icsBase64,
      })
    )
  );

  const fallidos = envios
    .map((res, i) => ({ correo: listaCorreos[i], res }))
    .filter((item) => item.res.status === "rejected");

  if (fallidos.length > 0) {
    const motivos = fallidos
      .map((f) => `${f.correo}: ${f.res.reason?.message || f.res.reason || "Error"}`)
      .join("; ");
    console.error("Error al enviar notificación de agenda por correo:", motivos);
    throw new Error(motivos);
  }

  return { ok: true, envios };
}

// La invitacion a las personas externas: el cliente, el residente de obra.
// Es la misma ficha que recibe Camila, pero saludando a quien la recibe y con
// la invitacion de calendario adjunta.
export async function enviarInvitacionAgenda(compromiso, correos = []) {
  const lista = separarCorreos(Array.isArray(correos) ? correos.join(",") : correos)
    .filter((c) => CORREO_VALIDO.test(c));
  if (!lista.length) return { ok: true, envios: [] };

  const tipoLabel = { visita: "Visita a obra", llamada: "Llamada", reunion: "Reunión", coordinacion: "Coordinación" }[compromiso.tipo] || "Compromiso";
  const que = compromiso.obra || compromiso.titulo || "Compromiso";
  const { diaSemana, fecha } = partesFechaLegible(compromiso.fecha);
  const saludo = compromiso.contacto ? `Hola ${compromiso.contacto},` : "Hola,";
  const asunto = asuntoSeguro(`Invitación: ${tipoLabel} - ${que} · ${formatFechaLegible(compromiso.fecha)} ${compromiso.hora || ""}`.trim());
  const enlaceCorto = await acortarUrl(generarUrlGoogleCalendar(compromiso, lista));

  const mensaje = [
    saludo,
    ``,
    `Ingeanclajes S.A.S. te invita al siguiente compromiso:`,
    ``,
    `• ${tipoLabel}: ${que}`,
    `• Fecha: ${formatFechaLegible(compromiso.fecha)}`,
    `• Hora: ${compromiso.hora || "Por definir"}`,
    compromiso.ciudad ? `• Ciudad: ${compromiso.ciudad}` : "",
    compromiso.requerimientoSst ? `• Requerimientos SST: ${compromiso.requerimientoSst}` : "",
    compromiso.notas ? `• Notas: ${compromiso.notas}` : "",
    compromiso.linkReunion ? `• Enlace de la reunión: ${compromiso.linkReunion}` : "",
    ``,
    `Agregar a Google Calendar: ${enlaceCorto}`,
    ``,
    `Equipo Ingeanclajes S.A.S.`,
  ].filter(Boolean).join("\n");

  const agenda = {
    saludo,
    titulo: que,
    tipo: tipoLabel,
    diaSemana,
    fecha,
    hora: compromiso.hora || "",
    cliente: compromiso.cliente || "",
    ciudad: compromiso.ciudad || "",
    obra: compromiso.obra || "",
    contacto: compromiso.contacto || "",
    telefono: compromiso.telefono || "",
    sst: compromiso.requerimientoSst || "",
    notas: compromiso.notas || "",
    linkReunion: compromiso.linkReunion || "",
    enlaceCalendar: enlaceCorto,
  };

  const icsBase64 = aBase64(generarIcsCompromiso(compromiso, lista));

  const envios = await Promise.allSettled(
    lista.map((para) =>
      enviarCotizacionPorCorreo({ para, asunto, mensaje, agenda, numero: "AGENDA", icsBase64 })
    )
  );

  const fallidos = envios
    .map((res, i) => ({ correo: lista[i], res }))
    .filter((item) => item.res.status === "rejected");
  if (fallidos.length > 0) {
    throw new Error(fallidos.map((f) => `${f.correo}: ${f.res.reason?.message || "Error"}`).join("; "));
  }
  return { ok: true, envios, correos: lista };
}
