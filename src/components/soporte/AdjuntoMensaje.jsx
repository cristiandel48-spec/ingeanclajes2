import { useState } from "react";
import { deserializarAdjunto, obtenerIconoPorTipo, formatearTamano, descargarArchivoAdjunto } from "../../lib/soporteAdjuntos";
import VisorImagenModal from "./VisorImagenModal";

export default function AdjuntoMensaje({ adjuntoRaw, esMio }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const adjunto = deserializarAdjunto(adjuntoRaw);

  if (!adjunto || !adjunto.url) return null;

  return (
    <>
      <div style={{ marginTop: 6 }}>
        {adjunto.esImagen ? (
          <div
            onClick={() => setModalAbierto(true)}
            style={{
              position: "relative",
              borderRadius: 10,
              overflow: "hidden",
              border: esMio ? "1px solid rgba(255,255,255,0.3)" : "1px solid var(--border, #eaecf0)",
              cursor: "pointer",
              maxWidth: 280,
              backgroundColor: "rgba(0,0,0,0.04)",
              transition: "transform 0.12s ease, opacity 0.12s ease",
            }}
            title="Haz clic para ver la captura en pantalla completa"
          >
            <img
              src={adjunto.url}
              alt={adjunto.nombre || "Captura adjunta"}
              style={{
                width: "100%",
                maxHeight: 220,
                objectFit: "cover",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 4,
                right: 6,
                backgroundColor: "rgba(0,0,0,0.65)",
                color: "#ffffff",
                padding: "2px 7px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span>🔍 Ver</span>
            </div>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              borderRadius: 10,
              backgroundColor: esMio ? "rgba(255, 255, 255, 0.18)" : "var(--surface-subtle, #f2f4f7)",
              border: esMio ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid var(--border, #eaecf0)",
              color: esMio ? "#ffffff" : "var(--text-main, #101828)",
              maxWidth: 300,
            }}
          >
            <span style={{ fontSize: 24, flexShrink: 0 }}>
              {obtenerIconoPorTipo(adjunto.tipo, adjunto.nombre)}
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={adjunto.nombre}
              >
                {adjunto.nombre || "Archivo adjunto"}
              </div>
              {adjunto.tamano > 0 && (
                <div style={{ fontSize: 10.5, opacity: 0.85, marginTop: 1 }}>
                  {formatearTamano(adjunto.tamano)}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => descargarArchivoAdjunto(adjunto)}
              style={{
                background: esMio ? "rgba(255, 255, 255, 0.25)" : "var(--surface, #ffffff)",
                border: "none",
                color: esMio ? "#ffffff" : "var(--text-main, #101828)",
                borderRadius: 6,
                padding: "5px 8px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
                boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
              }}
              title="Descargar archivo"
            >
              📥
            </button>
          </div>
        )}
      </div>

      {modalAbierto && (
        <VisorImagenModal
          adjunto={adjunto}
          onClose={() => setModalAbierto(false)}
        />
      )}
    </>
  );
}
