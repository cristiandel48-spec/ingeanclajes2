import { useState, useEffect, useMemo } from "react";
import FototecaObra from "../Obras/FototecaObra";
import Badge from "../../components/ui/Badge";
import { CD, SI } from "../../styles/tokens";

export default function FototecaScreen({ ctx }) {
  const { obras = [], intencion, limpiarIntencion, asegurarDetalle } = ctx;

  const obraIdIntencion = intencion?.pantalla === "fototeca" ? intencion.obraId : null;

  const [busqueda, setBusqueda] = useState("");
  const [obraIdSeleccionada, setObraIdSeleccionada] = useState(() => {
    if (obraIdIntencion && obras.some((o) => o.id === obraIdIntencion)) {
      return obraIdIntencion;
    }
    // Priorizar alguna con fotos o la primera obra
    const conFotos = obras.find((o) => (o.totalFotosAvance || 0) > 0 || (o.bitacora && o.bitacora.length > 0));
    return conFotos ? conFotos.id : obras[0]?.id || "";
  });

  // Limpiar intención al salir
  useEffect(() => {
    return () => {
      if (limpiarIntencion) limpiarIntencion();
    };
  }, [limpiarIntencion]);

  useEffect(() => {
    if (obraIdIntencion && obras.some((o) => o.id === obraIdIntencion)) {
      setObraIdSeleccionada(obraIdIntencion);
    }
  }, [obraIdIntencion, obras]);

  // Asegurar carga de fotos de la obra seleccionada
  useEffect(() => {
    if (obraIdSeleccionada && asegurarDetalle) {
      asegurarDetalle("obras", obraIdSeleccionada);
    }
  }, [obraIdSeleccionada, asegurarDetalle]);

  // Filtrado de obras para el buscador
  const obrasFiltradas = useMemo(() => {
    if (!busqueda.trim()) return obras;
    const q = busqueda.toLowerCase().trim();
    return obras.filter(
      (o) =>
        (o.id || "").toLowerCase().includes(q) ||
        (o.cliente || "").toLowerCase().includes(q) ||
        (o.proyecto || "").toLowerCase().includes(q) ||
        (o.ciudad || "").toLowerCase().includes(q)
    );
  }, [obras, busqueda]);

  const obraActual = obras.find((o) => o.id === obraIdSeleccionada) || obras[0];

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* 1. CABECERA LIMPIA: TÍTULO Y SELECTOR / BUSCADOR DE OBRA */}
      <div
        style={{
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--border, #eaecf0)",
          borderRadius: 14,
          padding: "16px 20px",
          marginBottom: 16,
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 12,
          }}
        >
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 800, color: "var(--text-main, #101828)", margin: 0 }}>
              📸 Fototeca de Obras
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted, #667085)", margin: "2px 0 0" }}>
              Busca una obra para ver sus fotos y descargarlas en alta resolución o en ZIP.
            </p>
          </div>

          {/* Buscador de obras */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              placeholder="🔍 Buscar obra por cliente o código..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ ...SI, width: 280, fontSize: 12.5, padding: "7px 12px" }}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#667085",
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Selector de Obra en dropdown o chips horizontales */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted, #475467)" }}>
            Obra seleccionada:
          </span>
          <select
            value={obraActual?.id || ""}
            onChange={(e) => setObraIdSeleccionada(e.target.value)}
            style={{
              ...SI,
              width: "auto",
              minWidth: 320,
              fontSize: 13,
              fontWeight: 600,
              color: "#101828",
              padding: "6px 12px",
              cursor: "pointer",
            }}
          >
            {obrasFiltradas.map((o) => {
              const fotosCount = o.totalFotosAvance || (o.bitacora || []).flatMap((b) => b.fotos || []).length;
              return (
                <option key={o.id} value={o.id}>
                  {o.id} · {o.cliente} {o.proyecto ? `(${o.proyecto})` : ""} {fotosCount > 0 ? `— 📷 ${fotosCount} fotos` : ""}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* 2. DATOS DE LA OBRA ACTIVA Y GALERÍA DE FOTOS */}
      {obraActual ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Identificación de obra activa */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              padding: "8px 14px",
              background: "var(--surface-subtle, #f8fafc)",
              borderRadius: 10,
              border: "1px solid var(--border, #eaecf0)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main, #101828)" }}>
                {obraActual.id} · {obraActual.cliente}
              </span>
              <Badge estado={obraActual.estado} />
              {obraActual.ciudad && (
                <span style={{ fontSize: 11.5, color: "var(--text-muted, #667085)" }}>
                  📍 {obraActual.ciudad}
                </span>
              )}
            </div>

            <div style={{ fontSize: 11.5, color: "var(--text-muted, #667085)" }}>
              Avance: <strong>{obraActual.avance || 0}%</strong>
            </div>
          </div>

          {/* Galería limpia */}
          <FototecaObra obra={obraActual} ctx={ctx} />
        </div>
      ) : (
        <div style={{ ...CD, textAlign: "center", padding: 40, color: "#667085" }}>
          No se encontraron obras registradas.
        </div>
      )}
    </div>
  );
}
