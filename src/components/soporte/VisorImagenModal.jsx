import { useEffect } from "react";
import { descargarArchivoAdjunto } from "../../lib/soporteAdjuntos";

export default function VisorImagenModal({ adjunto, onClose }) {
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!adjunto || !adjunto.url) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200000,
        backgroundColor: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
        animation: "fadeIn 0.15s ease",
      }}
      onClick={onClose}
    >
      {/* Barra superior de acciones */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          right: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: "#ffffff",
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "60%" }}>
          {adjunto.nombre || "Captura de pantalla"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => descargarArchivoAdjunto(adjunto)}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              color: "#ffffff",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
            title="Descargar imagen completa"
          >
            <span>📥</span>
            <span>Descargar</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              color: "#ffffff",
              borderRadius: "50%",
              width: 32,
              height: 32,
              fontSize: 16,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Cerrar visor"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Imagen centrada y responsiva */}
      <div
        style={{
          maxWidth: "96vw",
          maxHeight: "86vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={adjunto.url}
          alt={adjunto.nombre || "Captura"}
          style={{
            maxWidth: "100%",
            maxHeight: "86vh",
            objectFit: "contain",
            borderRadius: 10,
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5)",
          }}
        />
      </div>
    </div>
  );
}
