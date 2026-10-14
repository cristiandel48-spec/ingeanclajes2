// Utilidades de integración con Correo y Google Calendar para la Agenda de Camila
import { enviarCotizacionPorCorreo } from "./backend/usuarios";

export const EMAIL_CAMILA_DEFAULT = "camilascadavid@gmail.com";

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

export function formatFechaLegible(isoStr) {
  if (!isoStr) return "";
  const [y, m, d] = isoStr.split("-").map(Number);
  const fecha = new Date(y, m - 1, d);
  const diaSemana = DIAS_COMPLETO[fecha.getDay() === 0 ? 6 : fecha.getDay() - 1];
  return `${diaSemana}, ${d} de ${MESES[m - 1]} de ${y}`;
}

// Convierte hora legible (ej. "08:30 AM", "14:00", "2:00 PM") a objeto con hora y minuto
function parsearHora(horaStr) {
  if (!horaStr) return { h: 9, m: 0 };
  const str = String(horaStr).trim().toUpperCase();
  const match = str.match(/(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!match) return { h: 9, m: 0 };

  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3];

  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;

  return { h, m };
}

// Genera el enlace oficial a Google Calendar con la cita lista para guardar
export function generarUrlGoogleCalendar(compromiso, emailInvitado = EMAIL_CAMILA_DEFAULT) {
  if (!compromiso) return "";
  const isoFecha = compromiso.fecha || new Date().toISOString().slice(0, 10);
  const { h, m } = parsearHora(compromiso.hora);

  const pad = (n) => String(n).padStart(2, "0");
  const dStr = isoFecha.replace(/-/g, "");

  // Hora inicio y duración estimada de 1 hora y 30 minutos
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
    ? "Reunión de Coordinación"
    : "Compromiso";

  const titulo = `${tipoLabel} · ${compromiso.obra || compromiso.titulo || "Ingeanclajes"}`;
  const ubicacion = `${compromiso.obra || ""} ${compromiso.ciudad || ""}`.trim();

  const detalles = [
    `Cliente / Empresa: ${compromiso.cliente || "N/A"}`,
    `Contacto: ${compromiso.contacto || "N/A"}${compromiso.telefono ? ` (${compromiso.telefono})` : ""}`,
    compromiso.requerimientoSst ? `SST / Seguridad: ${compromiso.requerimientoSst}` : "",
    compromiso.notas ? `Notas: ${compromiso.notas}` : "",
    compromiso.linkReunion ? `Enlace de reunión: ${compromiso.linkReunion}` : "",
    "",
    "📅 Programado desde el Sistema de Gestión · Ingeanclajes S.A.S.",
  ].filter(Boolean).join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: titulo,
    dates: fechas,
    details: detalles,
    location: ubicacion,
    add: emailInvitado,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Genera enlace de redacción web directa a Gmail (por si se quiere abrir Gmail con todo listo)
export function generarUrlGmailWeb(compromiso, emailDestino = EMAIL_CAMILA_DEFAULT) {
  const tipoLabel = compromiso.tipo === "visita"
    ? "Visita a Obra"
    : compromiso.tipo === "llamada"
    ? "Llamada"
    : compromiso.tipo === "reunion"
    ? "Reunión"
    : "Compromiso";

  const asunto = `📅 ${tipoLabel}: ${compromiso.obra || compromiso.titulo} · ${compromiso.hora || ""}`;

  const cuerpo = [
    `Hola Camila,`,
    ``,
    `Se ha agendado un nuevo compromiso en Ingeanclajes:`,
    ``,
    `• Compromiso: ${compromiso.obra || compromiso.titulo}`,
    `• Tipo: ${tipoLabel}`,
    `• Fecha: ${formatFechaLegible(compromiso.fecha)}`,
    `• Hora: ${compromiso.hora || "Por definir"}`,
    `• Cliente: ${compromiso.cliente || "N/A"}`,
    `• Ciudad / Obra: ${compromiso.ciudad ? `${compromiso.ciudad} · ` : ""}${compromiso.obra || ""}`,
    `• Contacto: ${compromiso.contacto || "N/A"}${compromiso.telefono ? ` (Tel: ${compromiso.telefono})` : ""}`,
    compromiso.requerimientoSst ? `• Requerimientos SST: ${compromiso.requerimientoSst}` : "",
    compromiso.notas ? `• Notas: ${compromiso.notas}` : "",
    compromiso.linkReunion ? `• Enlace de reunión: ${compromiso.linkReunion}` : "",
    ``,
    `📅 Agendar en tu Google Calendar para que tu celular te recuerde con alarma:`,
    generarUrlGoogleCalendar(compromiso, emailDestino),
    ``,
    `Equipo Ingeanclajes S.A.S.`,
  ].filter(Boolean).join("\n");

  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: emailDestino,
    su: asunto,
    body: cuerpo,
  });

  return `https://mail.google.com/mail/?${params.toString()}`;
}

// Envía notificación por correo a Camila
export async function enviarNotificacionAgendaPorCorreo(compromiso, emailDestino = EMAIL_CAMILA_DEFAULT) {
  const tipoLabel = compromiso.tipo === "visita"
    ? "Visita a Obra"
    : compromiso.tipo === "llamada"
    ? "Llamada de Seguimiento"
    : compromiso.tipo === "reunion"
    ? "Reunión"
    : "Compromiso";

  const asunto = `📅 Agenda Ingeanclajes: ${tipoLabel} - ${compromiso.obra || compromiso.titulo} (${compromiso.fecha} ${compromiso.hora || ""})`;

  const mensaje = [
    `Hola Camila,`,
    ``,
    `Tienes un compromiso agendado en el sistema de Ingeanclajes:`,
    ``,
    `• Actividad: ${compromiso.obra || compromiso.titulo}`,
    `• Tipo: ${tipoLabel}`,
    `• Fecha: ${formatFechaLegible(compromiso.fecha)}`,
    `• Hora: ${compromiso.hora || "Por definir"}`,
    `• Cliente / Empresa: ${compromiso.cliente || "N/A"}`,
    `• Ciudad / Obra: ${compromiso.ciudad ? `${compromiso.ciudad} · ` : ""}${compromiso.obra || ""}`,
    `• Contacto: ${compromiso.contacto || "N/A"}${compromiso.telefono ? ` (Tel: ${compromiso.telefono})` : ""}`,
    compromiso.requerimientoSst ? `• Requerimientos SST: ${compromiso.requerimientoSst}` : "",
    compromiso.notas ? `• Notas adicionales: ${compromiso.notas}` : "",
    compromiso.linkReunion ? `• Enlace reunión virtual: ${compromiso.linkReunion}` : "",
    ``,
    `📌 Puedes pulsar el siguiente enlace para agregarlo con alarma a tu Google Calendar en el celular:`,
    generarUrlGoogleCalendar(compromiso, emailDestino),
    ``,
    `Equipo Ingeanclajes S.A.S.`,
  ].filter(Boolean).join("\n");

  try {
    // Intentar envío formal desde el servidor de correo corporativo
    const res = await enviarCotizacionPorCorreo({
      para: emailDestino,
      asunto,
      mensaje,
      numero: "AGENDA",
    });
    return { ok: true, metodo: "servidor", detalle: res };
  } catch (err) {
    console.warn("Envío por servidor no disponible, abriendo redacción directa en Gmail:", err);
    // Si la función de Supabase no tiene SMTP configurado, abre Gmail Web directamente para envío en 1 clic
    const urlGmail = generarUrlGmailWeb(compromiso, emailDestino);
    window.open(urlGmail, "_blank");
    return { ok: true, metodo: "gmail_web", fallback: true };
  }
}
