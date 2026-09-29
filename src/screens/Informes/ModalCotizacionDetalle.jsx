import React, { useState } from "react";
import { fmt, fmtD } from "../../lib/format";
import { getQuoteProposals, getQuoteActiveProposal, normalizeProposalItems } from "../../lib/cotizaciones";
import Badge from "../../components/ui/Badge";
import { B, BRAND } from "../../styles/tokens";

export default function ModalCotizacionDetalle({
  cotizacion,
  onClose,
  onImportarItems,
}) {
  if (!cotizacion) return null;

  const propuestas = getQuoteProposals(cotizacion);
  const [propuestaId, setPropuestaId] = useState(
    () => cotizacion.propuestaActivaId || propuestas[0]?.id || ""
  );

  const propuestaActiva =
    propuestas.find((p) => p.id === propuestaId) ||
    getQuoteActiveProposal(cotizacion) ||
    {};

  const items = normalizeProposalItems(
    propuestaActiva.items || cotizacion.items || []
  );

  const totalCalculado =
    propuestaActiva.total ??
    items.reduce((acc, it) => acc + (Number(it.cant) || 0) * (Number(it.vu) || 0), 0);

  const subtotalCalculado =
    propuestaActiva.subtotal ?? Math.round(totalCalculado / 1.19);

  const ivaCalculado =
    propuestaActiva.iva ?? (totalCalculado - subtotalCalculado);

  const mapImg = propuestaActiva.mapImg || cotizacion.mapImg;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 18,
          width: "100%",
          maxWidth: 820,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow:
            "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {/* Cabecera */}
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "#feecec",
                color: "#e0342a",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              📄
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "#0f172a",
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  {cotizacion.numero || "Cotización"}
                </span>
                <Badge estado={cotizacion.estado || "Aprobada"} />
                {cotizacion.codigoInterno && (
                  <span
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      background: "#e2e8f0",
                      padding: "2px 6px",
                      borderRadius: 4,
                      fontWeight: 600,
                    }}
                  >
                    {cotizacion.codigoInterno}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 2 }}>
                {cotizacion.cliente || "Cliente general"} · {cotizacion.proyecto || "Proyecto sin título"}
                {cotizacion.ciudad ? ` · 📍 ${cotizacion.ciudad}` : ""}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              color: "#475569",
              width: 34,
              height: 34,
              borderRadius: 8,
              fontSize: 16,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
            }}
            title="Cerrar ventana"
          >
            ✕
          </button>
        </div>

        {/* Selector de propuesta (si hay más de 1) */}
        {propuestas.length > 1 && (
          <div
            style={{
              padding: "10px 24px",
              background: "#fff7ed",
              borderBottom: "1px solid #fed7aa",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700, color: "#9a3412" }}>
              Propuesta técnica:
            </span>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {propuestas.map((p, idx) => {
                const esActiva = p.id === propuestaActiva.id;
                return (
                  <button
                    key={p.id || idx}
                    type="button"
                    onClick={() => setPropuestaId(p.id)}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      border: esActiva ? "1px solid #ea580c" : "1px solid #e2e8f0",
                      background: esActiva ? "#ea580c" : "#ffffff",
                      color: esActiva ? "#ffffff" : "#475569",
                    }}
                  >
                    {p.nombre || `Propuesta ${idx + 1}`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Cuerpo desplazable */}
        <div
          style={{
            padding: "20px 24px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            fontSize: 13,
          }}
        >
          {/* Cifras clave */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Total Contratado
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginTop: 3 }}>
                {fmt(totalCalculado)}
              </div>
            </div>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Subtotal antes de IVA
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#334155", marginTop: 3 }}>
                {fmt(subtotalCalculado)}
              </div>
            </div>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Fecha Cotización
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#334155", marginTop: 4 }}>
                {fmtD(cotizacion.fecha) || "Sin fecha"}
              </div>
            </div>
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                padding: "10px 14px",
              }}
            >
              <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>
                Tiempo de Ejecución
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#334155", marginTop: 4 }}>
                {propuestaActiva.tiempoEjec || cotizacion.tiempoEjec || "A convenir"}
              </div>
            </div>
          </div>

          {/* Requerimiento o Alcance */}
          {(propuestaActiva.requerimientoCliente || propuestaActiva.alcance || cotizacion.requerimientoCliente) && (
            <div
              style={{
                background: "#fafafa",
                border: "1px solid #eaecf0",
                borderRadius: 10,
                padding: "12px 16px",
              }}
            >
              <div style={{ fontSize: 11.5, fontWeight: 700, color: "#475467", textTransform: "uppercase", marginBottom: 6 }}>
                Alcance y Requerimiento Técnico
              </div>
              <div style={{ fontSize: 13, color: "#1f2937", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {propuestaActiva.alcance || propuestaActiva.requerimientoCliente || cotizacion.requerimientoCliente}
              </div>
            </div>
          )}

          {/* Tabla de ítems presupuestados */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", textTransform: "uppercase" }}>
                Ítems Cotizados y Servicios ({items.length})
              </div>
              {onImportarItems && items.length > 0 && (
                <button
                  type="button"
                  onClick={() => onImportarItems(items, cotizacion)}
                  style={{
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    border: "1px solid #bfdbfe",
                    borderRadius: 6,
                    padding: "4px 10px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                  title="Cargar estos ítems a las actividades realizadas del informe"
                >
                  📋 Importar ítems al informe
                </button>
              )}
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#475569", fontWeight: 700, width: 40 }}>#</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", color: "#475569", fontWeight: 700 }}>Descripción del Ítem / Servicio</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", color: "#475569", fontWeight: 700, width: 70 }}>Cant.</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", color: "#475569", fontWeight: 700, width: 70 }}>Unidad</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "#475569", fontWeight: 700, width: 110 }}>V. Unitario</th>
                    <th style={{ padding: "8px 12px", textAlign: "right", color: "#475569", fontWeight: 700, width: 110 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: 18, textAlign: "center", color: "#94a3b8" }}>
                        No hay ítems registrados en esta propuesta de cotización.
                      </td>
                    </tr>
                  ) : (
                    items.map((it, idx) => {
                      const cant = Number(it.cant) || 0;
                      const vu = Number(it.vu) || 0;
                      const sub = cant * vu;
                      return (
                        <tr
                          key={it.id || idx}
                          style={{
                            borderBottom: idx < items.length - 1 ? "1px solid #f1f5f9" : "none",
                            background: idx % 2 === 1 ? "#fafafa" : "#ffffff",
                          }}
                        >
                          <td style={{ padding: "8px 12px", color: "#94a3b8", fontWeight: 600 }}>{idx + 1}</td>
                          <td style={{ padding: "8px 12px", color: "#0f172a", fontWeight: 600 }}>{it.desc || "—"}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#0f172a" }}>{cant}</td>
                          <td style={{ padding: "8px 12px", textAlign: "center", color: "#64748b" }}>{it.unit || "Und"}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", color: "#475569" }}>{fmt(vu)}</td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>{fmt(sub)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plano o croquis si existe */}
          {mapImg && (
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", marginBottom: 6 }}>
                🗺️ Plano de Medición / Distribución
              </div>
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#000",
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <img
                  src={mapImg}
                  alt="Plano de cotización"
                  style={{ maxHeight: 280, width: "auto", objectFit: "contain" }}
                />
              </div>
            </div>
          )}

          {/* Inclusiones o forma de pago */}
          {(propuestaActiva.incluyeTexto || cotizacion.incluyeTexto || propuestaActiva.formaPago) && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                fontSize: 12,
              }}
            >
              {(propuestaActiva.incluyeTexto || cotizacion.incluyeTexto) && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                    El servicio incluye:
                  </div>
                  <div style={{ color: "#334155", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                    {propuestaActiva.incluyeTexto || cotizacion.incluyeTexto}
                  </div>
                </div>
              )}
              {propuestaActiva.formaPago && (
                <div
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: 8,
                    padding: "10px 12px",
                  }}
                >
                  <div style={{ fontWeight: 700, color: "#475569", marginBottom: 4 }}>
                    Condiciones comerciales / Forma de pago:
                  </div>
                  <div style={{ color: "#334155", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                    {propuestaActiva.formaPago}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pie de modal */}
        <div
          style={{
            padding: "14px 24px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Trazabilidad contractual para el informe técnico de actividades
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            {onImportarItems && items.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onImportarItems(items, cotizacion);
                  onClose();
                }}
                style={{
                  ...B("#027a48"),
                  fontSize: 12.5,
                  padding: "7px 15px",
                }}
              >
                📋 Importar ítems al informe
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#334155",
                borderRadius: 10,
                padding: "7px 16px",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
