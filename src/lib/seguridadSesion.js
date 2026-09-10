// Gestión de inactividad de sesión y formateo de última conexión.
// Regla solicitada: si el usuario lleva 5 minutos desconectado o inactivo,
// se cierra la sesión automáticamente por seguridad.

import { signOut } from "./backend/supabaseClient";
import { registrarActividadUsuario } from "./backend/usuarios";

export const LIMITE_INACTIVIDAD_MS = 5 * 60 * 1000; // 5 minutos (300.000 ms)
const CLAVE_ULTIMA_ACTIVIDAD = "erp_ultima_actividad_ts";
const CLAVE_MOTIVO_CIERRE = "erp_mensaje_cierre_inactividad";

/**
 * Guarda en sessionStorage un aviso explicativo para mostrar en el login
 */
export function guardarMensajeCierreInactividad(mensaje) {
  try {
    sessionStorage.setItem(CLAVE_MOTIVO_CIERRE, mensaje);
  } catch {}
}

/**
 * Recupera y limpia el mensaje de cierre por inactividad
 */
export function obtenerMensajeCierreInactividad() {
  try {
    const msg = sessionStorage.getItem(CLAVE_MOTIVO_CIERRE);
    if (msg) {
      sessionStorage.removeItem(CLAVE_MOTIVO_CIERRE);
      return msg;
    }
  } catch {}
  return null;
}

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
 * Inicia el vigilante de inactividad de 5 minutos en el cliente.
 * Detecta teclado, ratón, toques, scroll y cambios de pestaña.
 * Coordina múltiples pestañas mediante localStorage.
 */
export function iniciarVigilanteInactividad({ onCierrePorInactividad } = {}) {
  let timerId = null;
  let ultimaActividad = Date.now();
  let destruido = false;

  const actualizarActividad = () => {
    ultimaActividad = Date.now();
    try {
      localStorage.setItem(CLAVE_ULTIMA_ACTIVIDAD, String(ultimaActividad));
    } catch {}
  };

  actualizarActividad();

  const ejecutarCierre = async () => {
    if (destruido) return;
    destruido = true;
    limpiar();

    guardarMensajeCierreInactividad(
      "Tu sesión se cerró automáticamente por inactividad (más de 5 minutos desconectado o sin uso). Vuelve a ingresar tus datos para continuar."
    );

    if (typeof onCierrePorInactividad === "function") {
      onCierrePorInactividad();
    } else {
      try {
        await signOut();
      } catch (e) {
        console.warn("Error pasivo en signOut por inactividad:", e);
      }
      window.location.reload();
    }
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

  // Verificación periódica cada 5 segundos
  const verificar = () => {
    if (destruido) return;
    const ahora = Date.now();

    let ultimaLocal = ultimaActividad;
    try {
      const guardado = Number(localStorage.getItem(CLAVE_ULTIMA_ACTIVIDAD) || 0);
      if (guardado > ultimaLocal) {
        ultimaLocal = guardado;
        ultimaActividad = guardado;
      }
    } catch {}

    const inactivoMs = ahora - ultimaLocal;
    if (inactivoMs >= LIMITE_INACTIVIDAD_MS) {
      ejecutarCierre();
    }
  };

  timerId = setInterval(verificar, 5000);

  // Al volver a la pestaña tras estar minimizado o desconectado
  const onVisibilidad = () => {
    if (document.visibilityState === "visible") {
      verificar();
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
    if (timerId) clearInterval(timerId);
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
