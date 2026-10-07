import { useEffect, useState, useRef } from "react";
import { marcarMensajesComoLeidos } from "../../lib/soporte";

export default function BurbujaMensajeEntrante({ notificacion, membresia, onAbrir, onCerrar }) {
  const [visible, setVisible] = useState(false);
  const [pausado, setPausado] = useState(false);
  const timerRef = useRef(null);
  const duracionMs = 28000; // 28 segundos antes de ocultarse si no se interactúa

  useEffect(() => {
    if (!notificacion) {
      setVisible(false);
      return;
    }
    // Entrada animada
    setVisible(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    if (!pausado) {
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onCerrar?.(), 300);
      }, duracionMs);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [notificacion, pausado]);

  // Si la burbuja está visible en pantalla por más de 2.5 segundos, el usuario
  // ya ha visto el mensaje de texto entrante -> Marcar como leído de inmediato en Supabase y local
  useEffect(() => {
    const tId = notificacion?.ticketId || notificacion?.ticket_id;
    if (!tId) return;

    const timerLectura = setTimeout(() => {
      marcarMensajesComoLeidos(tId, membresia).catch(() => {});
    }, 2500);

    return () => clearTimeout(timerLectura);
  }, [notificacion?.ticketId, notificacion?.ticket_id, membresia]);

  if (!notificacion) return null;

  const {
    remitenteNombre = "Compañero de equipo",
    texto = "",
    asunto = "",
    obraNombre = "",
    creadoEn = new Date().toISOString(),
  } = notificacion;

  const iniciales = remitenteNombre
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "MS";

  const handleCerrar = (e) => {
    e.stopPropagation();
    const tId = notificacion?.ticketId || notificacion?.ticket_id;
    if (tId) {
      marcarMensajesComoLeidos(tId, membresia).catch(() => {});
    }
    setVisible(false);
    setTimeout(() => onCerrar?.(), 250);
  };

  const handleAbrir = (e) => {
    e.stopPropagation();
    const tId = notificacion?.ticketId || notificacion?.ticket_id;
    if (tId) {
      marcarMensajesComoLeidos(tId, membresia).catch(() => {});
    }
    onAbrir?.(notificacion);
  };

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onClick={handleAbrir}
      style={{
        position: "fixed",
        bottom: "calc(76px + env(safe-area-inset-bottom))",
        right: "calc(16px + env(safe-area-inset-right))",
        zIndex: 9999,
        width: "calc(100vw - 32px)",
        maxWidth: 390,
        backgroundColor: "var(--surface, #ffffff)",
        color: "var(--text-main, #0f172a)",
        borderRadius: 16,
        padding: "14px 16px 12px",
        boxShadow: "0 20px 40px -10px rgba(0,0,0,0.28), 0 0 0 1px rgba(244,124,32,0.35)",
        border: "1.5px solid #f47c20",
        cursor: "pointer",
        transition: "all 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0) scale(1)" : "translateY(24px) scale(0.95)",
        overflow: "hidden",
      }}
    >
      {/* Barra de progreso de auto-cierre */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: "rgba(244,124,32,0.18)",
        }}
      >
        <div
          style={{
            height: "100%",
            backgroundColor: "#f47c20",
            width: "100%",
            animation: !pausado ? `shrinkTimer ${duracionMs}ms linear forwards` : "none",
          }}
        />
      </div>

      <style>{`
        @keyframes shrinkTimer {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes ringPulse {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.18); opacity: 0.25; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>

      {/* Cabecera con Avatar, Remitente e Indicador en Vivo */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        {/* Avatar con Iniciales */}
        <div style={{ position: "relative", flexShrink: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #f47c20 0%, #e0342a 100%)",
              color: "#ffffff",
              fontWeight: 800,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 10px rgba(244,124,32,0.35)",
            }}
          >
            {iniciales}
          </div>
          {/* Punto de estado en línea */}
          <span
            style={{
              position: "absolute",
              bottom: -1,
              right: -1,
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "#10b981",
              border: "2px solid #ffffff",
            }}
          />
        </div>

        {/* Datos del mensaje */}
        <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "var(--text-main, #0f172a)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {remitenteNombre}
            </span>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#c2410c",
                backgroundColor: "rgba(244,124,32,0.12)",
                padding: "2px 6px",
                borderRadius: 6,
                flexShrink: 0,
              }}
            >
              Nuevo mensaje
            </span>
          </div>

          {(asunto || obraNombre) && (
            <div
              style={{
                fontSize: 11,
                color: "var(--text-muted, #64748b)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 1,
              }}
            >
              {asunto ? asunto : ""} {obraNombre ? `· ${obraNombre}` : ""}
            </div>
          )}

          {/* Caja con vista previa del texto */}
          <div
            style={{
              marginTop: 6,
              padding: "7px 10px",
              borderRadius: 8,
              backgroundColor: "var(--surface-subtle, #f8fafc)",
              border: "1px solid var(--border, #e2e8f0)",
              fontSize: 12,
              lineHeight: 1.4,
              color: "var(--text-main, #1e293b)",
              maxHeight: 52,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {texto || "Nuevo mensaje recibido"}
          </div>
        </div>

        {/* Botón cerrar */}
        <button
          type="button"
          onClick={handleCerrar}
          aria-label="Cerrar notificación"
          title="Cerrar"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-subtle, #94a3b8)",
            cursor: "pointer",
            padding: 4,
            fontSize: 15,
            borderRadius: 6,
            lineHeight: 1,
            flexShrink: 0,
            marginTop: -2,
            marginRight: -4,
          }}
        >
          ✕
        </button>
      </div>

      {/* Pie de acción */}
      <div
        style={{
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid var(--border, #f1f5f9)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "var(--text-subtle, #94a3b8)",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: "#10b981",
              display: "inline-block",
            }}
          />
          Sonó en el computador
        </span>

        <button
          type="button"
          onClick={handleAbrir}
          style={{
            backgroundColor: "#f47c20",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            padding: "5px 12px",
            fontSize: 11.5,
            fontWeight: 700,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            boxShadow: "0 2px 8px rgba(244,124,32,0.3)",
          }}
        >
          <span>💬 Abrir y leer</span>
        </button>
      </div>
    </div>
  );
}
