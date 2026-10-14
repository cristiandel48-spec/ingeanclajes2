// Utilidades de integración con Correo y Google Calendar para la Agenda de Camila
import { enviarCotizacionPorCorreo } from "./backend/usuarios";
import { asuntoSeguro } from "./asuntoCorreo";

export const EMAIL_CAMILA_DEFAULT = "camilascadavid@gmail.com";
export const EMAIL_CRISTIAN_DEFAULT = "cristiandel48@gmail.com";

export const DESTINATARIOS_AGENDA_DEFAULT = [
  EMAIL_CAMILA_DEFAULT,
  EMAIL_CRISTIAN_DEFAULT,
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
    return localStorage.getItem("agenda_email_notificacion") || DESTINATARIOS_AGENDA_DEFAULT.join(", ");
  } catch {
    return DESTINATARIOS_AGENDA_DEFAULT.join(", ");
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
export function parsearHora(horaStr) {
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
export function generarUrlGoogleCalendar(compromiso, emailInvitado = DESTINATARIOS_AGENDA_DEFAULT) {
  if (!compromiso) return "";
  const isoFecha = compromiso.fecha || new Date().toISOString().slice(0, 10);
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

  const detalles = [
    `Cliente / Empresa: ${compromiso.cliente || "N/A"}`,
    `Contacto: ${compromiso.contacto || "N/A"}${compromiso.telefono ? ` (${compromiso.telefono})` : ""}`,
    compromiso.requerimientoSst ? `SST / Seguridad: ${compromiso.requerimientoSst}` : "",
    compromiso.notas ? `Notas: ${compromiso.notas}` : "",
    compromiso.linkReunion ? `Enlace de reunion: ${compromiso.linkReunion}` : "",
    "",
    "Programado desde el Sistema de Gestion - Ingeanclajes S.A.S.",
  ].filter(Boolean).join("\n");

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

// Envía notificación por correo automática a Camila y Cristian en segundo plano desde sistemasingeanclajes@gmail.com
export async function enviarNotificacionAgendaPorCorreo(compromiso, destinatarios = DESTINATARIOS_AGENDA_DEFAULT) {
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

  const listaCorreos = correos.length ? correos : DESTINATARIOS_AGENDA_DEFAULT;

  const enlaceCalendar = generarUrlGoogleCalendar(compromiso, listaCorreos);

  const mensaje = [
    `Hola Camila y Cristian,`,
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
    `📅 Para agregarlo con alarma a tu Google Calendar y que tu celular te recuerde:`,
    enlaceCalendar,
    ``,
    `Equipo Ingeanclajes S.A.S.`,
  ].filter(Boolean).join("\n");

  try {
    const envios = await Promise.allSettled(
      listaCorreos.map((correo) =>
        enviarCotizacionPorCorreo({
          para: correo,
          asunto,
          mensaje,
          numero: "AGENDA",
        })
      )
    );
    return { ok: true, envios };
  } catch (err) {
    console.error("Error al enviar notificación de agenda por correo:", err);
    return { ok: false, error: err };
  }
}
