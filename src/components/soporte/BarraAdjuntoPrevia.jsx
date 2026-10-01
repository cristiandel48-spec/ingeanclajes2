import { obtenerIconoPorTipo, formatearTamano } from "../../lib/soporteAdjuntos";

export default function BarraAdjuntoPrevia({ adjunto, onQuitar, subiendo = false }) {
  if (!adjunto) return null;

  return (
    <div
      style={{
        padding: "8px 12px",
        backgroundColor: "var(--surface-subtle, #f2f4f7)",
        borderTop: "1px solid var(--border, #eaecf0)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
        animation: "fadeIn 0.12s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
        {adjunto.esImagen ? (
          <img
            src={adjunto.url}
            alt="Vista previa"
            style={{
              width: 44,
              height: 44,
              objectFit: "cover",
              borderRadius: 6,
              border: "1px solid var(--border, #d0d5dd)",
              flexShrink: 0,
            }}
          />
        ) : (
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 6,
              backgroundColor: "var(--surface, #ffffff)",
              border: "1px solid var(--border, #d0d5dd)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              flexShrink: 0,
            }}
          >
            {obtenerIconoPorTipo(adjunto.tipo, adjunto.nombre)}
          </div>
        )}

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#B54708", display: "flex", alignItems: "center", gap: 4 }}>
            <span>{adjunto.esImagen ? "🖼️ Captura / Imagen lista" : "📎 Archivo listo"}</span>
            {subiendo && <span style={{ fontSize: 10, color: "#175CD3" }}>· Procesando…</span>}
          </div>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-main, #101828)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {adjunto.nombre}
          </div>
          {adjunto.tamano > 0 && (
            <div style={{ fontSize: 10.5, color: "var(--text-muted, #667085)" }}>
              {formatearTamano(adjunto.tamano)}
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onQuitar}
        disabled={subiendo}
        style={{
          background: "transparent",
          border: "1px solid var(--border, #d0d5dd)",
          color: "var(--text-muted, #667085)",
          borderRadius: 6,
          padding: "5px 10px",
          fontSize: 11.5,
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          flexShrink: 0,
        }}
        title="Quitar archivo adjunto"
      >
        <span>✕</span>
        <span>Quitar</span>
      </button>
    </div>
  );
}
