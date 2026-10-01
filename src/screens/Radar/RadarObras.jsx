import { useState } from "react";
import RadarSecop from "./RadarSecop";
import ImportadorEmpresasCsv from "./ImportadorEmpresasCsv";
import { CD, ST } from "../../styles/tokens";
import { useAccionesPantalla } from "../../context/accionesPantalla";

export default function RadarObras({ ctx, go }) {
  const [tab, setTab] = useState("secop");
  const clientes = ctx?.clientes || [];
  const setClientes = ctx?.setClientes || (() => {});
  const irAPantalla = go || ctx?.setScr;

  // Acciones en la barra superior
  useAccionesPantalla(
    <div style={{ display: "flex", gap: 8 }}>
      <button
        style={{
          background: "var(--surface-subtle, #f2f4f7)",
          color: "var(--text-main, #334155)",
          border: "1px solid var(--border, #e2e8f0)",
          borderRadius: 9,
          padding: "8px 14px",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
        onClick={() => irAPantalla && irAPantalla("clientes")}
      >
        👥 Ir al Directorio de Clientes
      </button>
    </div>,
    [clientes.length]
  );

  return (
    <div style={{ padding: 28 }}>
      {/* Encabezado del Módulo */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 26 }}>🛰️</span>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-main, #0f172a)",
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            Radar de Licitaciones y Obras
          </h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted, #64748b)", maxWidth: 840, lineHeight: 1.5 }}>
          Módulo de prospección comercial y búsqueda de nuevas obras. Monitorea convocatorias públicas en tiempo real
          a través de la API oficial de <strong>SECOP II</strong> (Colombia Compra Eficiente) o integra bases de datos
          empresariales en CSV/Excel provenientes de <strong>Cámara de Comercio</strong> y <strong>Camacol</strong>.
        </p>
      </div>

      {/* Pestañas de navegación interna */}
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[
          ["secop", "🛰️ Radar SECOP II (Licitaciones del Estado en Vivo)"],
          ["importar", "📥 Importar Empresas CSV / Excel (Cámara de Comercio / Camacol)"],
        ].map(([id, label]) => {
          const activo = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                background: activo ? "#FFFAEB" : "var(--surface-subtle, #f2f4f7)",
                color: activo ? "#B54708" : "var(--text-muted, #475467)",
                border: activo ? "1px solid rgba(181, 71, 8, 0.4)" : "1px solid var(--border, #eaecf0)",
                boxShadow: activo ? "0 1px 3px rgba(181, 71, 8, 0.12)" : "none",
                borderRadius: 8,
                fontSize: 12.5,
                fontWeight: activo ? 700 : 600,
                padding: "8px 16px",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Contenido de la pestaña */}
      {tab === "secop" && (
        <RadarSecop
          clientes={clientes}
          setClientes={setClientes}
          irAPantalla={irAPantalla}
        />
      )}

      {tab === "importar" && (
        <ImportadorEmpresasCsv
          clientes={clientes}
          setClientes={setClientes}
          onFinalizado={() => {
            // Opcional: mostrar notificación o cambiar a SECOP
          }}
        />
      )}
    </div>
  );
}
