// Seguimiento de actividad de sesión y formateo de última conexión.
// La sesión ya no se cierra sola por estar inactivo: solo se mantiene al día
// la última conexión de cada usuario para el panel de usuarios y la auditoría.

import { registrarActividadUsuario } from "./backend/usuarios";

/**
 * Formatea una fecha de conexión en un texto claro y amigable
 * Ej: "Hace un momento", "Hace 3 min", "Hoy a las 03:15 p. m.", "Ayer a las 05:20 p. m.", "09/09/2026, 11:30 a. m."
 */
export function formatearUltimaConexion(fecha) {
  if (!fecha) return "Sin registro previo";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "Sin registro previo";

  const ahora = new Date();
  const diffMs = ahora.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / (60 * 1000));

  if (diffMin < 2) return "Hace un momento";
  if (diffMin < 60) return `Hace ${diffMin} min`;

  const horaStr = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });

  const esHoy = ahora.toDateString() === d.toDateString();
  if (esHoy) {
    return `Hoy a las ${horaStr}`;
  }

  const ayer = new Date(ahora);
  ayer.setDate(ayer.getDate() - 1);
  if (ayer.toDateString() === d.toDateString()) {
    return `Ayer a las ${horaStr}`;
  }

  const diaMes = d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${diaMes}, ${horaStr}`;
}

/**
 * Inicia el seguimiento de actividad del usuario en el cliente.
 * Detecta teclado, ratón, toques, scroll y cambios de pestaña solo para saber
 * si la persona sigue usando el sistema y refrescar su última conexión en la
 * base cada 2 minutos. No cierra la sesión en ningún caso.
 */
export function iniciarSeguimientoActividad() {
  let destruido = false;
  let ultimaActividad = Date.now();

  const actualizarActividad = () => {
    ultimaActividad = Date.now();
  };

  // Throttle: registrar actividad máxima una vez cada 8 segundos
  let ultimoEventoMs = 0;
  const onUserActivity = () => {
    const ahora = Date.now();
    if (ahora - ultimoEventoMs < 8000) return;
    ultimoEventoMs = ahora;
    actualizarActividad();
  };

  const EVENTOS = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];
  EVENTOS.forEach((evt) => window.addEventListener(evt, onUserActivity, { passive: true }));

  // Volver a la pestaña también cuenta como actividad
  const onVisibilidad = () => {
    if (document.visibilityState === "visible") {
      actualizarActividad();
    }
  };
  document.addEventListener("visibilitychange", onVisibilidad);
  window.addEventListener("focus", onVisibilidad);

  // Heartbeat en la base de datos cada 2 minutos si el usuario está activo
  const heartbeatTimer = setInterval(() => {
    if (destruido) return;
    const ahora = Date.now();
    if (ahora - ultimaActividad < 3 * 60 * 1000) {
      registrarActividadUsuario().catch(() => {});
    }
  }, 2 * 60 * 1000);

  // Registrar actividad inmediatamente al montar la sesión
  registrarActividadUsuario().catch(() => {});

  const limpiar = () => {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    EVENTOS.forEach((evt) => window.removeEventListener(evt, onUserActivity));
    document.removeEventListener("visibilitychange", onVisibilidad);
    window.removeEventListener("focus", onVisibilidad);
  };

  return {
    destruir: () => {
      destruido = true;
      limpiar();
    },
    actualizarActividad,
  };
}
