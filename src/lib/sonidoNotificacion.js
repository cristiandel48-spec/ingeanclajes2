// Sintetizador de audio nativo mediante Web Audio API para notificaciones del sistema.
// Emite un timbre armónico claro, agradable y con cero latencia sin requerir
// descarga de archivos MP3 externos.

let audioContextCache = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioContextCache || audioContextCache.state === "closed") {
      audioContextCache = new AudioCtx();
    }
    if (audioContextCache.state === "suspended") {
      audioContextCache.resume().catch(() => {});
    }
    return audioContextCache;
  } catch (e) {
    console.warn("No se pudo inicializar AudioContext:", e);
    return null;
  }
}

/**
 * Reproduce el timbre acústico de notificación en los altavoces del computador
 */
export function reproducirSonidoNotificacion({ volumen = 0.3 } = {}) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return false;

    const ahora = ctx.currentTime;

    // Tono 1: Mi5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(659.25, ahora);
    gain1.gain.setValueAtTime(0.001, ahora);
    gain1.gain.exponentialRampToValueAtTime(volumen * 0.9, ahora + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, ahora + 0.16);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ahora);
    osc1.stop(ahora + 0.18);

    // Tono 2: La5 (880.00 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880.0, ahora + 0.08);
    gain2.gain.setValueAtTime(0.001, ahora + 0.08);
    gain2.gain.exponentialRampToValueAtTime(volumen, ahora + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.45);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ahora + 0.08);
    osc2.stop(ahora + 0.5);

    // Armónico suave de brillo (1318.5 Hz)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "triangle";
    osc3.frequency.setValueAtTime(1318.5, ahora + 0.1);
    gain3.gain.setValueAtTime(0.001, ahora + 0.1);
    gain3.gain.exponentialRampToValueAtTime(volumen * 0.25, ahora + 0.12);
    gain3.gain.exponentialRampToValueAtTime(0.0001, ahora + 0.35);

    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(ahora + 0.1);
    osc3.stop(ahora + 0.4);

    return true;
  } catch (err) {
    console.warn("Error reproduciendo timbre de notificación:", err);
    return false;
  }
}

/**
 * Solicita permiso para notificaciones nativas de escritorio del sistema operativo
 */
export async function solicitarPermisoNotificaciones() {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    if (Notification.permission === "default") {
      return await Notification.requestPermission();
    }
    return Notification.permission;
  } catch {
    return "denied";
  }
}

/**
 * Muestra notificación nativa en la barra de tareas de Windows/Mac si la app está en segundo plano
 */
export function mostrarNotificacionEscritorio({ titulo, cuerpo, icono, alHacerClic }) {
  if (typeof window === "undefined" || !("Notification" in window)) return null;

  try {
    if (Notification.permission === "granted") {
      const notif = new Notification(titulo || "Nuevo mensaje · Ingeanclajes", {
        body: cuerpo || "Has recibido un nuevo mensaje.",
        icon: icono || "/favicon.ico",
        badge: icono || "/favicon.ico",
        tag: "ingeanclajes-mensaje",
        renotify: true,
      });

      notif.onclick = () => {
        window.focus();
        if (typeof alHacerClic === "function") {
          alHacerClic();
        }
        notif.close();
      };

      return notif;
    }
  } catch (e) {
    console.warn("No se pudo mostrar notificación del sistema:", e);
  }
  return null;
}
