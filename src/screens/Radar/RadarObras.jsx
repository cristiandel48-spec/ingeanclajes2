import RadarSecop from "./RadarSecop";
import { useAccionesPantalla } from "../../context/accionesPantalla";

export default function RadarObras({ ctx, go }) {
  const clientes = ctx?.clientes || [];
  const setClientes = ctx?.setClientes || (() => {});
  const setCotDraft = ctx?.setCotDraft;
  const irAPantalla = go || ctx?.setScr;

  // Acciones en la barra superior
  useAccionesPantalla(
    <div style={{ display: "flex", gap: 8 }}>
      <button
        style={{
          background: "#FFFAEB",
          color: "#B54708",
          border: "1px solid #FCD34D",
          borderRadius: 9,
          padding: "8px 14px",
          fontSize: 12.5,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
        onClick={() => irAPantalla && irAPantalla("cotizacion")}
      >
        📄 Ir a Cotizaciones
      </button>
    </div>,
    []
  );

  return (
    <div style={{ padding: 28 }}>
      {/* Encabezado del Módulo */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 24 }}>🛰️</span>
          <h1
            style={{
              fontSize: 21,
              fontWeight: 800,
              color: "var(--text-main, #0f172a)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Radar de Licitaciones y Obras
          </h1>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#166534",
              background: "#dcfce7",
              border: "1px solid #bbf7d0",
              padding: "2px 8px",
              borderRadius: 5,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            🟢 SECOP II en vivo
          </span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)", lineHeight: 1.5, width: "100%" }}>
          Módulo de prospección comercial y búsqueda de nuevas obras. Monitorea convocatorias públicas en tiempo real a través de la API oficial de <strong>SECOP II</strong> (Colombia Compra Eficiente).
        </p>
      </div>

      {/* Radar SECOP II */}
      <RadarSecop
        clientes={clientes}
        setClientes={setClientes}
        setCotDraft={setCotDraft}
        irAPantalla={irAPantalla}
      />
    </div>
  );
}
