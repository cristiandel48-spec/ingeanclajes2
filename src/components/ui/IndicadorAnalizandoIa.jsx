// Indicador animado de análisis con IA:
// 4 punticos en cuadrícula 2×2 con pulso rotativo + píldora oscura con brillo
// deslizante sobre el texto ("Analizando con IA…").

export default function IndicadorAnalizandoIa({
  texto = "Analizando con IA…",
  flotante = false,
}) {
  const contenido = (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: flotante ? "10px 14px" : "2px 4px",
        borderRadius: 999,
        background: flotante ? "rgba(255, 255, 255, 0.88)" : "transparent",
        backdropFilter: flotante ? "blur(12px) saturate(160%)" : undefined,
        WebkitBackdropFilter: flotante ? "blur(12px) saturate(160%)" : undefined,
        boxShadow: flotante ? "0 10px 30px -6px rgba(15, 23, 42, 0.22), 0 0 0 1px rgba(15, 23, 42, 0.08)" : undefined,
      }}
    >
      <style>{`
        @keyframes agyIaDotPulse {
          0%, 100% { opacity: 0.28; transform: scale(0.86); }
          35% { opacity: 1; transform: scale(1.06); }
        }
        @keyframes agyIaShimmer {
          0% { background-position: 180% 0; }
          100% { background-position: -80% 0; }
        }
        .agy-ia-dot {
          width: 6.5px;
          height: 6.5px;
          border-radius: 50%;
          background: #1f2328;
          animation: agyIaDotPulse 1.2s ease-in-out infinite;
        }
        .agy-ia-dot-1 { animation-delay: 0s; }
        .agy-ia-dot-2 { animation-delay: 0.2s; }
        .agy-ia-dot-4 { animation-delay: 0.4s; }
        .agy-ia-dot-3 { animation-delay: 0.6s; }
        .agy-ia-shimmer-text {
          font-size: 13px;
          font-weight: 600;
          letter-spacing: -0.01em;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.45) 0%,
            rgba(255, 255, 255, 0.45) 35%,
            #ffffff 50%,
            rgba(255, 255, 255, 0.45) 65%,
            rgba(255, 255, 255, 0.45) 100%
          );
          background-size: 260% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: agyIaShimmer 1.8s linear infinite;
          white-space: nowrap;
        }
      `}</style>

      {/* Cuadrícula 2×2 de 4 puntos animados */}
      <span
        aria-hidden="true"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 6.5px)",
          gridTemplateRows: "repeat(2, 6.5px)",
          gap: 3.5,
          padding: 3,
          borderRadius: 8,
          background: "rgba(255, 255, 255, 0.92)",
          boxShadow: "0 1px 4px rgba(15, 23, 42, 0.12)",
          flexShrink: 0,
        }}
      >
        <span className="agy-ia-dot agy-ia-dot-1" />
        <span className="agy-ia-dot agy-ia-dot-2" />
        <span className="agy-ia-dot agy-ia-dot-3" />
        <span className="agy-ia-dot agy-ia-dot-4" />
      </span>

      {/* Píldora oscura con brillo deslizante */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "7px 15px",
          borderRadius: 999,
          background: "#18181b",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.24)",
        }}
      >
        <span className="agy-ia-shimmer-text">{texto}</span>
      </span>
    </div>
  );

  if (!flotante) return contenido;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99990,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(15, 23, 42, 0.10)",
        backdropFilter: "blur(2px)",
        WebkitBackdropFilter: "blur(2px)",
        pointerEvents: "all",
      }}
    >
      {contenido}
    </div>
  );
}
