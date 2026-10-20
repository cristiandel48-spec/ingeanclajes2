// Novedades que se le muestran a cada persona la primera vez que entra
// despues de una actualizacion. Para anunciar otra tanda basta con cambiar
// VERSION_NOVEDADES y la lista: quien ya vio la anterior vuelve a ver esta.
//
// Se escribe para quien usa el sistema, no para quien lo programa: lo que va
// a notar en su trabajo, sin nombres tecnicos.

export const VERSION_NOVEDADES = "2026-10-20";

export const NOVEDADES = [
  {
    titulo: "Más rápido",
    puntos: [
      "La aplicación carga mucho más rápido, sobre todo en el celular.",
      "Ya no se queda pegada en la barra de carga al entrar.",
    ],
  },
  {
    titulo: "Nuevo diseño",
    puntos: [
      "Todos los módulos tienen un estilo más limpio y fácil de leer.",
      "El inicio de sesión se adapta al modo claro u oscuro de tu equipo.",
    ],
  },
  {
    titulo: "Obras",
    puntos: [
      "El avance de la obra sale de la bitácora diaria: cada jornada nueva pide el porcentaje de avance.",
      "Las obras se ordenan de la más nueva a la más vieja.",
      "El detalle de la obra está más ordenado, sin pestañas que no se usaban.",
    ],
  },
  {
    titulo: "Cotizaciones",
    puntos: [
      "Nueva presentación al imprimir y en PDF, más limpia y profesional.",
      "Al enviarla por correo queda marcada como «Enviada».",
      "Antes de aprobar una cotización, el sistema pide confirmación.",
      "Vuelve a salir la foto del punto de anclaje y se corrigió un error que a veces no dejaba guardar.",
    ],
  },
  {
    titulo: "Informes y certificados",
    puntos: [
      "Los PDF ya no dejan hojas en blanco ni cortan la portada.",
      "Certificados con letra más grande, la firma en su sitio y el nombre de la obra en el archivo.",
    ],
  },
  {
    titulo: "Personal y horarios",
    puntos: ["Asigna turnos para varios días a la vez y copia los del día anterior."],
  },
  {
    titulo: "Agenda",
    puntos: [
      "Si agregas un invitado a un compromiso, le llega una invitación por correo.",
      "Los avisos de compromisos se leen mejor en el celular.",
    ],
  },
  {
    titulo: "Mis tareas y notas",
    puntos: [
      "«Mis tareas» tiene su propio lugar en el menú.",
      "Notas personales con listas desplegables, viñetas y bloques de color.",
      "Desde el inicio ves lo que te falta por marcar.",
    ],
  },
  {
    titulo: "Guardado",
    puntos: ["Si intentas recargar con cambios sin guardar, el sistema te avisa antes de perderlos."],
  },
];

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
