import React, { useState } from "react";
import { fmt } from "../../lib/format";
import { getQuoteActiveProposal, normalizeProposalItems } from "../../lib/cotizaciones";
import Badge from "../../components/ui/Badge";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

export default function TarjetaCotizacionRef({
  cotizacion,
  todasCotizaciones = [],
  onSeleccionarCotizacion,
  onVerDetalle,
  onImportarItems,
  obra,
}) {
  const [modoCambiar, setModoCambiar] = useState(false);

  // Filtrar o priorizar cotizaciones del mismo cliente
  const clienteObra = normalizarRazonSocial(obra?.cliente || "");
  const cotizacionesCliente = todasCotizaciones.filter(
    (c) => normalizarRazonSocial(c.cliente || "") === clienteObra
  );
  const otrasCotizaciones = todasCotizaciones.filter(
    (c) => normalizarRazonSocial(c.cliente || "") !== clienteObra
  );

  if (!cotizacion) {
    return (
      <div
        style={{
          background: "#fafafa",
          border: "1.5px dashed #cbd5e1",
          borderRadius: 12,
          padding: "12px 16px",
          marginBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>📄</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
              Cotización de Referencia
            </span>
            <span style={{ fontSize: 11, color: "#64748b" }}>
              (Permite cotejar el alcance presupuestado e importar ítems a las actividades)
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onSeleccionarCotizacion(e.target.value);
              }
            }}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              color: "#1e293b",
              cursor: "pointer",
              flex: "1 1 260px",
              maxWidth: 420,
            }}
          >
            <option value="">— Vincular cotización a este informe —</option>
            {cotizacionesCliente.length > 0 && (
              <optgroup label={`Cotizaciones de este cliente (${obra?.cliente || ""})`}>
                {cotizacionesCliente.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.numero} · {c.proyecto || c.cliente} ({c.estado || "Aprobada"})
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Todas las demás cotizaciones">
              {otrasCotizaciones.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} · {c.cliente} — {c.proyecto || "Sin título"}
                </option>
              ))}
            </optgroup>
          </select>
          <span style={{ fontSize: 11.5, color: "#64748b" }}>
            {todasCotizaciones.length === 0
              ? "No hay cotizaciones registradas aún en el sistema."
              : "Selecciona una cotización aprobada para tenerla a la vista."}
          </span>
        </div>
      </div>
    );
  }

  // Cotización encontrada
  const propuestaActiva = getQuoteActiveProposal(cotizacion) || {};
  const items = normalizeProposalItems(propuestaActiva.items || cotizacion.items || []);
  const total = propuestaActiva.total ?? cotizacion.total ?? 0;

  return (
    <div
      style={{
        background: "linear-gradient(180deg, #fffcfb 0%, #ffffff 100%)",
        border: "1.5px solid #fed7aa",
        borderRadius: 14,
        padding: "14px 18px",
        marginBottom: 16,
        boxShadow: "0 2px 6px rgba(234, 88, 12, 0.05)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {/* Fila superior: Rótulo, Datos clave y Botones */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span
            style={{
              background: "#ffedd5",
              color: "#c2410c",
              border: "1px solid #fdba74",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 10.5,
              fontWeight: 800,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>📄</span> Cotización de Referencia
          </span>
          <span
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "#0f172a",
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {cotizacion.numero}
          </span>
          <Badge estado={cotizacion.estado || "Aprobada"} />
          {total > 0 && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "#027a48",
                background: "#ecfdf3",
                border: "1px solid #a6f4c5",
                borderRadius: 6,
                padding: "2px 8px",
              }}
            >
              {fmt(total)}
            </span>
          )}
        </div>

        {/* Acciones de la cotización */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {items.length > 0 && onImportarItems && (
            <button
              type="button"
              onClick={() => onImportarItems(items, cotizacion)}
              style={{
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                color: "#166534",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.15s ease",
              }}
              title="Crear actividades a partir de los ítems cotizados"
            >
              📋 Importar ítems a actividades
            </button>
          )}

          <button
            type="button"
            onClick={onVerDetalle}
            style={{
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8",
              borderRadius: 8,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              transition: "all 0.15s ease",
            }}
            title="Ver desglose completo de la cotización, precios y plano"
          >
            👁️ Ver cotización completa
          </button>

          <button
            type="button"
            onClick={() => setModoCambiar(!modoCambiar)}
            style={{
              background: "transparent",
              border: "none",
              color: "#64748b",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
              padding: "4px 6px",
            }}
          >
            {modoCambiar ? "Ocultar selector" : "Cambiar…"}
          </button>
        </div>
      </div>

      {/* Selector si se quiere cambiar */}
      {modoCambiar && (
        <div
          style={{
            padding: "8px 12px",
            background: "#fff7ed",
            borderRadius: 8,
            border: "1px solid #fed7aa",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#9a3412" }}>
            Asociar otra cotización:
          </span>
          <select
            value={cotizacion.id}
            onChange={(e) => {
              if (e.target.value) {
                onSeleccionarCotizacion(e.target.value);
                setModoCambiar(false);
              }
            }}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 11.5,
              color: "#1e293b",
            }}
          >
            {todasCotizaciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numero} · {c.cliente} — {c.proyecto || "Sin título"} ({c.estado || "Aprobada"})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => {
              onSeleccionarCotizacion("");
              setModoCambiar(false);
            }}
            style={{
              background: "#ffffff",
              border: "1px solid #fca5a5",
              color: "#b91c1c",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Desvincular
          </button>
        </div>
      )}

      {/* Alcance e Ítems cotizados en pills/chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 12 }}>
        <span style={{ color: "#64748b", fontWeight: 600 }}>Alcance contratado:</span>
        {items.length === 0 ? (
          <span style={{ color: "#94a3b8", fontStyle: "italic" }}>Sin ítems especificados</span>
        ) : (
          items.slice(0, 5).map((it, idx) => (
            <span
              key={idx}
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 11.5,
                color: "#1e293b",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <strong style={{ color: "#ea580c" }}>{it.cant} {it.unit || "Und"}</strong>
              <span>{it.desc}</span>
            </span>
          ))
        )}
        {items.length > 5 && (
          <span
            onClick={onVerDetalle}
            style={{
              color: "#ea580c",
              fontSize: 11.5,
              fontWeight: 700,
              cursor: "pointer",
              padding: "2px 6px",
            }}
          >
            +{items.length - 5} ítems más…
          </span>
        )}
      </div>
    </div>
  );
}
