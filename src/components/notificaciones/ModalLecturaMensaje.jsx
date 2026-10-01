import { useState, useEffect, useRef } from "react";
import { useAppData } from "../../context/AppDataContext";
import {
  cargarMensajes,
  enviarMensaje,
  suscribirChatTicket,
  cargarTickets,
  marcarMensajesComoLeidos,
  esMiMensaje,
} from "../../lib/soporte";
import { B, SI } from "../../styles/tokens";

export default function ModalLecturaMensaje({ notificacion, onCerrar, onIrASoporte }) {
  const { membresia } = useAppData();
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [respuesta, setRespuesta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ticketInfo, setTicketInfo] = useState(null);
  const chatEndRef = useRef(null);

  const ticketId = notificacion?.ticketId || notificacion?.ticket_id;
  const remitenteNombre = notificacion?.remitenteNombre || notificacion?.remitente_nombre || "Compañero de equipo";

  // Cargar información del ticket y sus mensajes
  useEffect(() => {
    if (!ticketId) return;
    let montado = true;

    // Buscar asunto y detalles del ticket
    cargarTickets().then((ts) => {
      if (montado && ts) {
        const match = ts.find((t) => t.id === ticketId);
        if (match) setTicketInfo(match);
      }
    });

    cargarMensajes(ticketId).then((data) => {
      if (montado) {
        setMensajes(data || []);
        setCargando(false);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
      }
    });

    if (membresia) {
      marcarMensajesComoLeidos(ticketId, membresia).catch(() => {});
    }

    // Suscripción en tiempo real a nuevas respuestas de este chat
    const desuscribir = suscribirChatTicket(
      ticketId,
      (nuevo) => {
        if (montado) {
          setMensajes((prev) => {
            if (prev.some((m) => m.id === nuevo.id)) return prev;
            return [...prev, nuevo];
          });
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
        }
      },
      (actualizado) => {
        if (montado && actualizado) {
          setMensajes((prev) =>
            prev.map((m) => (m.id === actualizado.id ? { ...m, ...actualizado } : m))
          );
        }
      }
    );

    return () => {
      montado = false;
      desuscribir();
    };
  }, [ticketId, membresia]);

  const handleEnviar = async (e) => {
    e?.preventDefault();
    const texto = respuesta.trim();
    if (!texto || !ticketId || enviando) return;

    setEnviando(true);
    try {
      const nombreUsuario =
        membresia?.nombre ||
        (membresia?.email?.toLowerCase().includes("cristian")
          ? "Cristian Flórez"
          : "Camila Sepúlveda");
      const guardado = await enviarMensaje({
        ticketId,
        texto,
        remitenteNombre: nombreUsuario,
        remitenteId: membresia?.user_id || membresia?.userId || null,
        esAdmin: membresia?.role === "admin",
      });

      setMensajes((prev) => {
        if (prev.some((m) => m.id === guardado.id)) return prev;
        return [...prev, guardado];
      });
      setRespuesta("");
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch (err) {
      console.error("Error enviando respuesta:", err);
    } finally {
      setEnviando(false);
    }
  };

  if (!notificacion) return null;

  const iniciales = remitenteNombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "MS";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.18s ease-out",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          backgroundColor: "var(--surface, #ffffff)",
          color: "var(--text-main, #0f172a)",
          borderRadius: 20,
          boxShadow: "0 25px 60px -15px rgba(0,0,0,0.35), 0 0 0 1px var(--border, #e2e8f0)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "88vh",
          overflow: "hidden",
        }}
      >
        {/* Cabecera del chat emergente */}
        <div
          style={{
            padding: "14px 18px",
            background: "linear-gradient(135deg, #f47c20 0%, #e0342a 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: "rgba(255,255,255,0.22)",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1.5px solid rgba(255,255,255,0.4)",
              }}
            >
              {iniciales}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>
                {remitenteNombre}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.85)", marginTop: 2 }}>
                {ticketInfo?.asunto || notificacion?.asunto || "Mensaje directo"}
                {ticketInfo?.obra_nombre ? ` · ${ticketInfo.obra_nombre}` : ""}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {onIrASoporte && (
              <button
                type="button"
                onClick={onIrASoporte}
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "none",
                  color: "#ffffff",
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
                title="Abrir en pantalla completa de Soporte"
              >
                Ver todo
              </button>
            )}
            <button
              type="button"
              onClick={onCerrar}
              style={{
                background: "transparent",
                border: "none",
                color: "#ffffff",
                fontSize: 18,
                fontWeight: 700,
                padding: "2px 8px",
                cursor: "pointer",
                lineHeight: 1,
              }}
              title="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Lista de mensajes */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            backgroundColor: "var(--surface-subtle, #f8fafc)",
          }}
        >
          {cargando ? (
            <div style={{ textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: 12, padding: 20 }}>
              Cargando conversación…
            </div>
          ) : mensajes.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: 12, padding: 20 }}>
              {notificacion?.texto}
            </div>
          ) : (
            mensajes.map((msg, i) => {
              const esMio = esMiMensaje(msg, membresia);

              return (
                <div
                  key={msg.id || i}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: esMio ? "flex-end" : "flex-start",
                  }}
                >
                  {!esMio && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: "#f47c20", marginBottom: 2 }}>
                      {msg.remitente_nombre || remitenteNombre}
                    </span>
                  )}
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "9px 13px",
                      borderRadius: 14,
                      borderBottomRightRadius: esMio ? 2 : 14,
                      borderBottomLeftRadius: esMio ? 14 : 2,
                      backgroundColor: esMio ? "#f47c20" : "var(--surface, #ffffff)",
                      color: esMio ? "#ffffff" : "var(--text-main, #0f172a)",
                      border: esMio ? "none" : "1px solid var(--border, #e2e8f0)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                      fontSize: 12.5,
                      lineHeight: 1.45,
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.texto}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 9.5, color: "var(--text-subtle, #94a3b8)", marginTop: 2 }}>
                    <span>
                      {msg.creado_en ? new Date(msg.creado_en).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                    </span>
                    {esMio && (
                      <span
                        style={{
                          fontWeight: 700,
                          color: msg.leido ? "#0284c7" : "#94a3b8",
                        }}
                      >
                        · {msg.leido ? "✓✓ Visto" : "✓ Enviado"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input de Respuesta Rápida */}
        <form
          onSubmit={handleEnviar}
          style={{
            padding: "12px 14px",
            borderTop: "1px solid var(--border, #e2e8f0)",
            backgroundColor: "var(--surface, #ffffff)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <input
            type="text"
            placeholder="Escribe tu respuesta aquí…"
            value={respuesta}
            onChange={(e) => setRespuesta(e.target.value)}
            style={{
              ...SI,
              flex: 1,
              padding: "9px 12px",
              fontSize: 12.5,
            }}
            autoFocus
          />
          <button
            type="submit"
            disabled={enviando || !respuesta.trim()}
            style={{
              ...B("#f47c20"),
              padding: "8px 16px",
              fontSize: 12.5,
              opacity: enviando || !respuesta.trim() ? 0.6 : 1,
              cursor: enviando || !respuesta.trim() ? "not-allowed" : "pointer",
            }}
          >
            {enviando ? "…" : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}
