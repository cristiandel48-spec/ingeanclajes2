import { useState, useEffect, useRef } from "react";
import { useAppData } from "../../context/AppDataContext";
import { getSupabaseClient, isSupabaseConfigured } from "../../lib/backend/supabaseClient";
import { getTenantIdActual } from "../../lib/backend/usuarios";
import {
  reproducirSonidoNotificacion,
  mostrarNotificacionEscritorio,
  solicitarPermisoNotificaciones,
} from "../../lib/sonidoNotificacion";
import BurbujaMensajeEntrante from "./BurbujaMensajeEntrante";
import ModalLecturaMensaje from "./ModalLecturaMensaje";

const BROADCAST_CHANNEL_NAME = "ingeanclajes_canal_mensajes";

function normalizarCadena(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function esMiMensaje(msg, membresia) {
  if (!msg) return false;

  const miUserId = membresia?.user_id || membresia?.id;
  if (miUserId && msg.remitente_id) {
    if (String(miUserId).trim().toLowerCase() === String(msg.remitente_id).trim().toLowerCase()) {
      return true;
    }
  }

  const miNombre = normalizarCadena(membresia?.nombre);
  const remitente = normalizarCadena(msg.remitente_nombre);

  if (miNombre && remitente) {
    if (miNombre === remitente) return true;
    if (miNombre.includes(remitente) || remitente.includes(miNombre)) return true;
  }

  return false;
}

export default function NotificadorMensajesGlobal({ onIrASoporte }) {
  const { membresia } = useAppData();
  const [mensajeEntrante, setMensajeEntrante] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const canalBroadcastRef = useRef(null);
  const mensajesProcesadosRef = useRef(new Set());
  const fechaInicioRef = useRef(Date.now());
  const inicializadoRef = useRef(false);

  // Solicitar permiso de notificaciones de escritorio tras interacción y pre-calentar AudioContext
  useEffect(() => {
    const handlePrimerClick = () => {
      solicitarPermisoNotificaciones().catch(() => {});
      try {
        reproducirSonidoNotificacion({ volumen: 0.001 });
      } catch {
        // ignore
      }
      window.removeEventListener("click", handlePrimerClick);
    };
    window.addEventListener("click", handlePrimerClick, { once: true });
    return () => window.removeEventListener("click", handlePrimerClick);
  }, []);

  // Función común cuando entra un mensaje
  const procesarMensajeNuevo = (msg) => {
    if (!msg || !msg.texto) return;

    // Evitar notificar dos veces el mismo mensaje
    const msgId = msg.id || `${msg.ticket_id}-${msg.creado_en}`;
    if (mensajesProcesadosRef.current.has(msgId)) return;
    mensajesProcesadosRef.current.add(msgId);

    // Si el mensaje lo envié yo mismo, no me notifico a mí mismo
    if (esMiMensaje(msg, membresia)) {
      return;
    }

    // 1. Reproducir sonido acústico en el computador
    reproducirSonidoNotificacion({ volumen: 0.38 });

    // 2. Si la app está minimizada o en otra pestaña, mostrar notificación nativa
    if (typeof document !== "undefined" && document.hidden) {
      mostrarNotificacionEscritorio({
        titulo: `Mensaje de ${msg.remitente_nombre || "Ingeanclajes"}`,
        cuerpo: msg.texto,
        alHacerClic: () => {
          setMensajeEntrante(msg);
          setModalAbierto(true);
        },
      });
    }

    // 3. Mostrar la burbuja flotante en pantalla
    setMensajeEntrante({
      id: msg.id,
      ticketId: msg.ticket_id,
      remitenteNombre: msg.remitente_nombre || "Compañero de equipo",
      remitenteId: msg.remitente_id,
      texto: msg.texto,
      asunto: msg.asunto || "Mensaje en tiempo real",
      obraNombre: msg.obra_nombre || "",
      creadoEn: msg.creado_en || new Date().toISOString(),
    });

    // 4. Emitir evento para que cualquier chat abierto (flotante o pantalla) se actualice al instante
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("notificacion-mensaje-recibido", { detail: msg })
      );
    }
  };

  // Motor 1: Polling periódico global (cada 3.5s)
  // Garantiza 100% de fiabilidad entre computadores y celulares distintos
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelado = false;

    const verificarMensajesRecientes = async () => {
      try {
        const supabase = getSupabaseClient();
        const tenantId = await getTenantIdActual().catch(() => null);

        let query = supabase
          .from("soporte_mensajes")
          .select("id, ticket_id, remitente_id, remitente_nombre, texto, creado_en, leido")
          .order("creado_en", { ascending: false })
          .limit(15);

        if (tenantId) {
          query = query.eq("tenant_id", tenantId);
        }

        const { data, error } = await query;
        if (cancelado || error || !data) return;

        // Primera tanda: registrar mensajes preexistentes para que no suenen mensajes viejos al abrir
        if (!inicializadoRef.current) {
          data.forEach((m) => {
            if (m.id) mensajesProcesadosRef.current.add(m.id);
          });
          inicializadoRef.current = true;
          return;
        }

        // Procesar en orden cronológico (los más antiguos primero)
        const reversa = [...data].reverse();
        for (const msg of reversa) {
          if (!msg.id) continue;
          if (!mensajesProcesadosRef.current.has(msg.id)) {
            const tiempoMs = new Date(msg.creado_en).getTime();
            const esReciente = !isNaN(tiempoMs) && tiempoMs > (fechaInicioRef.current - 180000);

            if (esReciente) {
              procesarMensajeNuevo(msg);
            } else {
              mensajesProcesadosRef.current.add(msg.id);
            }
          }
        }
      } catch {
        // silencioso
      }
    };

    verificarMensajesRecientes();
    const intervalo = setInterval(verificarMensajesRecientes, 3500);

    const handleVisibility = () => {
      if (!document.hidden) {
        verificarMensajesRecientes();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [membresia?.user_id, membresia?.nombre]);

  // Motor 2: Supabase Realtime WebSocket (cuando esté disponible)
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let canal = null;

    const setupRealtime = async () => {
      try {
        const supabase = getSupabaseClient();
        const tenantId = await getTenantIdActual().catch(() => null);

        canal = supabase
          .channel("notificaciones-mensajes-globales")
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "app",
              table: "soporte_mensajes",
            },
            (payload) => {
              if (payload.new) {
                if (!tenantId || !payload.new.tenant_id || payload.new.tenant_id === tenantId) {
                  procesarMensajeNuevo(payload.new);
                }
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.warn("No se pudo iniciar canal Realtime de notificaciones:", err);
      }
    };

    setupRealtime();

    return () => {
      if (canal) {
        try {
          const supabase = getSupabaseClient();
          supabase.removeChannel(canal);
        } catch {
          // ignore
        }
      }
    };
  }, [membresia?.user_id, membresia?.nombre]);

  // 2. Escuchar BroadcastChannel para soporte entre pestañas o local
  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;

    try {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      canalBroadcastRef.current = bc;

      bc.onmessage = (event) => {
        if (event.data?.tipo === "nuevo-mensaje" && event.data?.mensaje) {
          procesarMensajeNuevo(event.data.mensaje);
        }
      };

      return () => {
        bc.close();
      };
    } catch {
      // BroadcastChannel no soportado
    }
  }, [membresia?.user_id, membresia?.nombre]);

  // 3. Escuchar CustomEvents para simulación o pruebas locales en la misma ventana
  useEffect(() => {
    const handleEventoMensaje = (e) => {
      if (e.detail) {
        procesarMensajeNuevo(e.detail);
      }
    };

    const handleSimular = (e) => {
      procesarMensajeNuevo({
        id: "sim-" + Date.now(),
        ticket_id: "ticket-simulado",
        remitente_nombre: e.detail?.remitente || "Cristian Flórez",
        remitente_id: "sim-user",
        texto: e.detail?.texto || "Hola Camila, por favor revisa el anticipo para autorizar el despacho hoy.",
        asunto: "Cotización Edificio Poblado",
        creado_en: new Date().toISOString(),
      });
    };

    window.addEventListener("notificacion-mensaje-recibido", handleEventoMensaje);
    window.addEventListener("simular-mensaje-entrante", handleSimular);

    return () => {
      window.removeEventListener("notificacion-mensaje-recibido", handleEventoMensaje);
      window.removeEventListener("simular-mensaje-entrante", handleSimular);
    };
  }, [membresia?.user_id, membresia?.nombre]);

  const handleAbrirBurbuja = (msg) => {
    setModalAbierto(true);
  };

  const handleCerrarBurbuja = () => {
    setMensajeEntrante(null);
  };

  const handleCerrarModal = () => {
    setModalAbierto(false);
    setMensajeEntrante(null);
  };

  return (
    <>
      {/* Burbuja Flotante que aparece cuando entra un mensaje */}
      {!modalAbierto && mensajeEntrante && (
        <BurbujaMensajeEntrante
          notificacion={mensajeEntrante}
          onAbrir={handleAbrirBurbuja}
          onCerrar={handleCerrarBurbuja}
        />
      )}

      {/* Modal de Lectura y Respuesta Rápida */}
      {modalAbierto && mensajeEntrante && (
        <ModalLecturaMensaje
          notificacion={mensajeEntrante}
          onCerrar={handleCerrarModal}
          onIrASoporte={() => {
            handleCerrarModal();
            onIrASoporte?.();
          }}
        />
      )}
    </>
  );
}

/**
 * Función auxiliar para emitir a nivel local y entre pestañas cuando se envía un mensaje
 */
export function emitirMensajeEnviadoLocal(mensaje) {
  if (typeof window === "undefined") return;

  // 1. BroadcastChannel para otras pestañas
  try {
    if ("BroadcastChannel" in window) {
      const bc = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      bc.postMessage({ tipo: "nuevo-mensaje", mensaje });
      bc.close();
    }
  } catch {
    // ignore
  }

  // 2. CustomEvent en la misma ventana
  window.dispatchEvent(
    new CustomEvent("notificacion-mensaje-recibido", { detail: mensaje })
  );
}
