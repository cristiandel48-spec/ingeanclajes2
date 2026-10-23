// Novedades que se le muestran a cada persona la primera vez que entra
// despues de una actualizacion. Para anunciar otra tanda basta con cambiar
// VERSION_NOVEDADES y la lista: quien ya vio la anterior vuelve a ver esta.
//
// Se escribe para quien usa el sistema, no para quien lo programa: lo que va
// a notar en su trabajo, sin nombres tecnicos.

export const VERSION_NOVEDADES = "2026-10-23";

export const NOVEDADES = [
  {
    titulo: "El cliente firma el recibido del informe",
    puntos: [
      "En el informe de actividades, «Enviar para firma» le manda al cliente un enlace para revisarlo y firmar el recibido desde el celular.",
      "Para firmar, al cliente le llega un código a su correo: así queda probado que fue él quien recibió.",
      "En el informe ves si ya lo abrió y quién firmó. «PDF con constancia» descarga el informe con la hoja de recibido firmada y un código QR de verificación.",
    ],
  },
  {
    titulo: "Correo de quien recibe en cada obra",
    puntos: [
      "Cada obra tiene ahora «Quién recibe los informes»: nombre y correo del residente o interventor del cliente.",
      "Es obligatorio: si falta, el sistema lo pide antes de registrar el avance del día. Se pide una sola vez por obra.",
      "Al aprobar una cotización se toma el contacto de la cotización, y el correo queda también en el directorio de clientes.",
    ],
  },
  {
    titulo: "Impresos y PDF",
    puntos: [
      "Todos los documentos usan la misma letra del programa, también la cotización que se envía por correo y las colillas.",
      "El informe tiene un encabezado nuevo, letra más grande y cada actividad sale junto con sus fotos.",
    ],
  },
];
// El mismo contenido, como correo para el equipo. Viaja como texto: la funcion
// de correo lo pinta dentro del marco de la empresa (cabecera y pie), igual
// que una cotizacion sin cifras.
export const ASUNTO_NOVEDADES = "Novedades del Sistema de Gestión Ingeanclajes";

export function textoCorreoNovedades(nombre, appUrl) {
  const trato = String(nombre || "").trim().split(" ")[0] || "Hola";
  const secciones = NOVEDADES.map((s) => [s.titulo.toUpperCase(), ...s.puntos.map((p) => `• ${p}`)].join("\n"));
  return [
    `${trato},`,
    "",
    "El sistema de gestión tiene mejoras importantes. Te invitamos a entrar y explorarlas.",
    ...(appUrl ? ["", `Entra aquí: ${appUrl}`] : []),
    "",
    secciones.join("\n\n"),
    "",
    "Si tienes la app instalada en el celular, ciérrala y ábrela de nuevo para recibir los cambios.",
    "",
    "Cualquier duda o error, escríbenos.",
    "",
    "Ingeanclajes S.A.S.",
  ].join("\n");
}

// Se guarda en los datos de la cuenta (user_metadata) para que quien ya las
// vio en el computador no las vuelva a ver en el celular. La copia local es
// el respaldo por si la cuenta no se pudo actualizar.
const claveLocal = (userId) => `novedades_vistas_${userId}`;

export function novedadesPendientes(user) {
  if (!user) return false;
  if (user.user_metadata?.novedades_vistas === VERSION_NOVEDADES) return false;
  try {
    if (localStorage.getItem(claveLocal(user.id)) === VERSION_NOVEDADES) return false;
  } catch { /* sin almacenamiento local: se decide solo por la cuenta */ }
  return true;
}

export async function marcarNovedadesVistas(supabase, user) {
  try {
    localStorage.setItem(claveLocal(user.id), VERSION_NOVEDADES);
  } catch { /* sin almacenamiento local */ }
  const { error } = await supabase.auth.updateUser({ data: { novedades_vistas: VERSION_NOVEDADES } });
  if (error) console.warn("No se pudo guardar que se vieron las novedades:", error.message);
}
