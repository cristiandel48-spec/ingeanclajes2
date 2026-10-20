// Archivo de calendario (.ics) de un compromiso de la Agenda.
//
// Es el formato que entienden todos los calendarios: Apple Calendar (iPhone y
// Mac), Google Calendar y Outlook. Lo usan el correo (adjunto) y la funcion
// del servidor api/ics.js, que lo entrega por un enlace: en el iPhone, tocar
// ese enlace abre «Agregar al calendario» sin pasar por Google.
//
// Sin dependencias del navegador: lo importa tambien la funcion de Vercel.

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

const TIPOS = { visita: "Visita a obra", llamada: "Llamada", reunion: "Reunión", coordinacion: "Coordinación" };

export function tituloCompromiso(compromiso) {
  const tipo = TIPOS[compromiso?.tipo] || "Compromiso";
  return `${tipo} - ${compromiso?.obra || compromiso?.titulo || "Ingeanclajes"}`;
}

// El texto de un .ics no admite saltos de linea crudos, y la coma y el punto
// y coma separan valores: se escapan.
const esc = (t) => String(t || "")
  .replace(/\r/g, "")
  .replace(/\\/g, "\\\\")
  .replace(/\n/g, "\\n")
  .replace(/([,;])/g, "\\$1");

// Las lineas de mas de 75 bytes se parten con un espacio al comienzo de la
// siguiente, como pide el estandar (RFC 5545). Apple Calendar es estricto con
// esto en algunos casos.
function plegar(linea) {
  const bytes = new TextEncoder().encode(linea);
  if (bytes.length <= 75) return linea;
  const partes = [];
  let actual = "";
  let largo = 0;
  for (const ch of linea) {
    const n = new TextEncoder().encode(ch).length;
    if (largo + n > (partes.length ? 74 : 75)) {
      partes.push(actual);
      actual = "";
      largo = 0;
    }
    actual += ch;
    largo += n;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}

/**
 * Arma el .ics de un compromiso.
 * - metodo "REQUEST": invitacion con organizador e invitados (Si / No / Quizas).
 * - metodo "PUBLISH": evento para agregar al calendario propio, sin invitados.
 * El UID es el id del compromiso: si se vuelve a agregar o a enviar, el evento
 * se actualiza en vez de duplicarse.
 */
export function generarIcsCompromiso(compromiso, invitados = [], metodo = "REQUEST") {
  const { h, m } = parsearHora(compromiso.hora);
  const [y, mes, d] = String(compromiso.fecha || "").split("-").map(Number);
  // Colombia esta en UTC-5 todo el año (sin horario de verano).
  const inicio = new Date(Date.UTC(y, (mes || 1) - 1, d || 1, h + 5, m));
  const fin = new Date(inicio.getTime() + 90 * 60 * 1000);
  const utc = (f) => f.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

  const detalles = [
    compromiso.cliente && `Cliente: ${compromiso.cliente}`,
    compromiso.contacto && `Contacto: ${compromiso.contacto}${compromiso.telefono ? ` (${compromiso.telefono})` : ""}`,
    compromiso.requerimientoSst && `SST: ${compromiso.requerimientoSst}`,
    compromiso.notas && `Notas: ${compromiso.notas}`,
    compromiso.linkReunion && `Reunión: ${compromiso.linkReunion}`,
  ].filter(Boolean).join("\n");

  const esInvitacion = metodo === "REQUEST";
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ingeanclajes//Agenda//ES",
    "CALSCALE:GREGORIAN",
    `METHOD:${esInvitacion ? "REQUEST" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${String(compromiso.id || "compromiso").replace(/[^\w.-]/g, "")}@ingeanclajes`,
    `DTSTAMP:${utc(new Date())}`,
    `SEQUENCE:${Math.floor(Date.now() / 1000)}`,
    `DTSTART:${utc(inicio)}`,
    `DTEND:${utc(fin)}`,
    `SUMMARY:${esc(tituloCompromiso(compromiso))}`,
    `LOCATION:${esc(`${compromiso.obra || ""} ${compromiso.ciudad || ""}`.trim())}`,
    `DESCRIPTION:${esc(detalles || "Ingeanclajes S.A.S.")}`,
    ...(esInvitacion
      ? [
          "ORGANIZER;CN=Ingeanclajes S.A.S.:mailto:sistemasingeanclajes@gmail.com",
          ...invitados.map((c) => `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${c}`),
        ]
      : []),
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lineas.map(plegar).join("\r\n") + "\r\n";
}

// Campos que viajan en el enlace a api/ics. Nombres cortos: el enlace va en
// correos y tiene que ser razonable.
const CAMPOS_ENLACE = {
  id: "id", fecha: "f", hora: "h", tipo: "t", obra: "o", titulo: "ti", ciudad: "c",
  cliente: "cl", contacto: "co", telefono: "te", requerimientoSst: "s", notas: "n", linkReunion: "l",
};

export function compromisoAParams(compromiso) {
  const params = new URLSearchParams();
  for (const [campo, corto] of Object.entries(CAMPOS_ENLACE)) {
    const valor = String(compromiso?.[campo] ?? "").trim();
    if (valor) params.set(corto, valor.slice(0, 500));
  }
  return params;
}

export function paramsACompromiso(query) {
  const leer = (k) => {
    const v = typeof query.get === "function" ? query.get(k) : query[k];
    return String(Array.isArray(v) ? v[0] : v ?? "").slice(0, 500);
  };
  const compromiso = {};
  for (const [campo, corto] of Object.entries(CAMPOS_ENLACE)) compromiso[campo] = leer(corto);
  return compromiso;
}
