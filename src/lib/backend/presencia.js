// Gestión de presencia en tiempo real y cierre remoto de sesiones.
// Utiliza Supabase Realtime (Presence & Broadcast) por WebSockets.
//
// Regla de privacidad:
// Únicamente cristiandel48@gmail.com puede consultar quién está conectado
// y emitir órdenes de cierre de sesión remoto.

import { getSupabaseClient, isSupabaseConfigured } from "./supabaseClient";

export const EMAIL_SUPERADMIN = "cristiandel48@gmail.com";

/**
 * Valida si el correo corresponde al superadministrador con acceso al panel de presencia.
 */
export function esSuperAdmin(email) {
  return (email || "").toLowerCase().trim() === EMAIL_SUPERADMIN;
}

/**
 * Detecta el tipo de dispositivo desde el User-Agent.
 */
export function detectarDispositivo() {
  if (typeof navigator === "undefined") return "Computador";
  const ua = navigator.userAgent || "";
  if (/android|iphone|ipad|ipod|mobile/i.test(ua)) return "Móvil";
  if (/tablet/i.test(ua)) return "Tablet";
  return "Computador";
}

export const CANAL_PRESENCIA = "presencia-erp-ingeanclajes";

/**
 * Conecta el cliente al canal de presencia y escucha señales de control remoto.
 */
export function suscribirPresencia({
  user,
  membresia,
  onPresenciaSync,
  onSesionCerradaForzada,
}) {
  if (!isSupabaseConfigured() || !user) return null;

  let supabase;
  try {
    supabase = getSupabaseClient();
  } catch (e) {
    console.warn("Supabase no disponible para presencia:", e);
    return null;
  }

  const miUserId = user.id;
  const miEmail = (membresia?.email || user.email || "").toLowerCase().trim();
  const miNombre = membresia?.nombre || user.user_metadata?.nombre || miEmail;
  const esAdmin = esSuperAdmin(miEmail);
  const dispositivo = detectarDispositivo();

  const canal = supabase.channel(CANAL_PRESENCIA, {
    config: {
      presence: {
        key: miUserId,
      },
      broadcast: {
        self: false,
      },
    },
  });

  // Escucha si un administrador ordena el cierre de la sesión actual
  canal.on("broadcast", { event: "forzar_cierre_sesion" }, async ({ payload }) => {
    if (!payload) return;
    const { targetUserId, targetEmail, adminEmail } = payload;
    const coincideId = targetUserId && targetUserId === miUserId;
    const coincideEmail = targetEmail && targetEmail.toLowerCase().trim() === miEmail;

    if (coincideId || coincideEmail) {
      console.warn("[Seguridad] Sesión cerrada remotamente por:", adminEmail);
      if (typeof onSesionCerradaForzada === "function") {
        onSesionCerradaForzada(payload);
      } else {
        alert(
          `⚠️ TU SESIÓN HA SIDO CERRADA\n\n` +
          `El administrador (${adminEmail || EMAIL_SUPERADMIN}) ha finalizado tu sesión.\n` +
          `Para continuar utilizando el sistema debes volver a iniciar sesión.`
        );
        try {
          await supabase.auth.signOut();
        } catch (e) {
          console.error("Error al salir:", e);
        }
        window.location.reload();
      }
    }
  });

  // Función para computar el mapa de usuarios en línea
  const emitirPresencia = () => {
    // Si no es el superadmin, no se procesa ni almacena el estado de conexiones ajenas
    if (!esAdmin) {
      if (typeof onPresenciaSync === "function") onPresenciaSync({});
      return;
    }

    const estado = canal.presenceState();
    const conectados = {};

    Object.entries(estado).forEach(([key, presencias]) => {
      if (Array.isArray(presencias) && presencias.length > 0) {
        const p = presencias[presencias.length - 1];
        const uId = p.userId || key;
        const uEmail = (p.email || "").toLowerCase().trim();

        conectados[uId] = {
          userId: uId,
          email: uEmail,
          nombre: p.nombre || uEmail || "Usuario",
          dispositivo: p.dispositivo || "Computador",
          onlineAt: p.onlineAt || new Date().toISOString(),
          conexiones: presencias.length,
        };

        if (uEmail) {
          conectados[uEmail] = conectados[uId];
        }
      }
    });

    if (typeof onPresenciaSync === "function") {
      onPresenciaSync(conectados);
    }
  };

  canal.on("presence", { event: "sync" }, emitirPresencia);
  canal.on("presence", { event: "join" }, emitirPresencia);
  canal.on("presence", { event: "leave" }, emitirPresencia);

  canal.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      try {
        await canal.track({
          userId: miUserId,
          email: miEmail,
          nombre: miNombre,
          dispositivo,
          onlineAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn("No se pudo reportar presencia:", err);
      }
    }
  });

  // Emisor de orden de desconexión remota (solo ejecutable si esSuperAdmin)
  const forzarCierreSesion = async (targetUserId, targetEmail, targetNombre) => {
    if (!esAdmin) {
      return { ok: false, error: "Solo cristiandel48@gmail.com puede cerrar sesiones remotas." };
    }

    try {
      await canal.send({
        type: "broadcast",
        event: "forzar_cierre_sesion",
        payload: {
          targetUserId,
          targetEmail: (targetEmail || "").toLowerCase().trim(),
          targetNombre,
          adminEmail: miEmail,
          fecha: new Date().toISOString(),
        },
      });
      return { ok: true };
    } catch (error) {
      console.error("Error al emitir forzar_cierre_sesion:", error);
      return { ok: false, error: error.message || "Error al emitir orden de cierre." };
    }
  };

  return {
    canal,
    forzarCierreSesion,
    destruir: () => {
      try {
        canal.untrack();
        supabase.removeChannel(canal);
      } catch (e) {
        // Limpieza pasiva
      }
    },
  };
}
