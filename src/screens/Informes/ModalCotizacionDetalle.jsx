import { useState } from "react";
import { fmt, fmtD } from "../../lib/format";
import { getQuoteProposals, getQuoteActiveProposal, getQuoteProposalTotals, normalizeProposalItems } from "../../lib/cotizaciones";
import Badge from "../../components/ui/Badge";
import { Button, Sheet } from "../../components/ui";

export default function ModalCotizacionDetalle({
  cotizacion,
  onClose,
  onImportarItems,
}) {
  // Los hooks van antes de cualquier return: si la cotizacion pasaba de tener
  // valor a no tenerlo con la ventana abierta, React se caia con «Rendered
  // fewer hooks than expected».
  const [propuestaId, setPropuestaId] = useState(() => {
    if (!cotizacion) return "";
    return cotizacion.propuestaActivaId || getQuoteProposals(cotizacion)[0]?.id || "";
  });

  if (!cotizacion) return null;

  const propuestas = getQuoteProposals(cotizacion);

  const propuestaActiva =
    propuestas.find((p) => p.id === propuestaId) ||
    getQuoteActiveProposal(cotizacion) ||
    {};

  const items = normalizeProposalItems(
    propuestaActiva.items || cotizacion.items || []
  );

  // Las mismas cuentas que el editor y el PDF. Antes se sacaba el IVA como
  // total / 1.19, que solo vale cuando el IVA va sobre todo; con AIU va solo
  // sobre la utilidad y el «subtotal antes de IVA» salia mal.
  const totales = getQuoteProposalTotals(cotizacion, propuestaActiva);
  const totalCalculado = Math.round(totales.tot);
  const ivaCalculado = Math.round(totales.iva);
  const subtotalCalculado = totalCalculado - ivaCalculado;

  const mapImg = propuestaActiva.mapImg || cotizacion.mapImg;

  const recuadro = { background: "var(--fill)", borderRadius: 12, padding: "12px 14px" };
  const rotulo = { fontSize: 11, lineHeight: "14px", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-tertiary)" };
  const celda = { padding: "10px 12px" };

  return (
    <Sheet
      onCerrar={onClose}
      ancha
      titulo={
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{cotizacion.numero || "Cotización"}</span>
          <Badge estado={cotizacion.estado || "Aprobada"} />
          {cotizacion.codigoInterno && (
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)" }}>{cotizacion.codigoInterno}</span>
          )}
        </span>
      }
      subtitulo={`${cotizacion.cliente || "Cliente general"} · ${cotizacion.proyecto || "Proyecto sin título"}${cotizacion.ciudad ? ` · ${cotizacion.ciudad}` : ""}`}
      pie={
        <>
          <span style={{ flex: 1, alignSelf: "center", fontSize: 12, color: "var(--text-tertiary)" }}>
            Trazabilidad contractual para el informe técnico de actividades
          </span>
          <Button variante="secondary" onClick={onClose}>Cerrar</Button>
          {onImportarItems && items.length > 0 && (
            <Button
              variante="primary"
              onClick={() => { onImportarItems(items, cotizacion); onClose(); }}
              title="Cargar estos ítems a las actividades realizadas del informe"
            >
              Importar ítems al informe
            </Button>
          )}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18, fontSize: 13 }}>
        {propuestas.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <span style={rotulo}>Propuesta técnica</span>
            <div className="ui-seg" role="tablist">
              {propuestas.map((p, idx) => (
                <button
                  key={p.id || idx}
                  type="button"
                  role="tab"
                  className="ui-seg__op"
                  aria-selected={p.id === propuestaActiva.id}
                  onClick={() => setPropuestaId(p.id)}
                >
                  {p.nombre || `Propuesta ${idx + 1}`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cifras clave */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div style={recuadro}>
            <div style={rotulo}>Total contratado</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmt(totalCalculado)}</div>
          </div>
          <div style={recuadro}>
            <div style={rotulo}>Subtotal antes de IVA</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{fmt(subtotalCalculado)}</div>
          </div>
          <div style={recuadro}>
            <div style={rotulo}>Fecha de cotización</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginTop: 4 }}>{fmtD(cotizacion.fecha) || "Sin fecha"}</div>
          </div>
          <div style={recuadro}>
            <div style={rotulo}>Tiempo de ejecución</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginTop: 4 }}>{propuestaActiva.tiempoEjec || cotizacion.tiempoEjec || "A convenir"}</div>
          </div>
        </div>

        {(propuestaActiva.requerimientoCliente || propuestaActiva.alcance || cotizacion.requerimientoCliente) && (
          <div style={recuadro}>
            <div style={{ ...rotulo, marginBottom: 6 }}>Alcance y requerimiento técnico</div>
            <div style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6, whiteSpace: "pre-line" }}>
              {propuestaActiva.alcance || propuestaActiva.requerimientoCliente || cotizacion.requerimientoCliente}
            </div>
          </div>
        )}

        {/* Ítems presupuestados */}
        <div>
          <div style={{ ...rotulo, marginBottom: 8 }}>Ítems cotizados y servicios ({items.length})</div>
          <div style={{ background: "var(--fill)", borderRadius: 12, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--separator)" }}>
                  <th style={{ ...celda, ...rotulo, textAlign: "left", width: 40 }}>#</th>
                  <th style={{ ...celda, ...rotulo, textAlign: "left" }}>Descripción</th>
                  <th style={{ ...celda, ...rotulo, textAlign: "center", width: 70 }}>Cant.</th>
                  <th style={{ ...celda, ...rotulo, textAlign: "center", width: 70 }}>Unidad</th>
                  <th style={{ ...celda, ...rotulo, textAlign: "right", width: 110 }}>V. unitario</th>
                  <th style={{ ...celda, ...rotulo, textAlign: "right", width: 110 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: 18, textAlign: "center", color: "var(--text-tertiary)" }}>
                      No hay ítems registrados en esta propuesta de cotización.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const cant = Number(it.cant) || 0;
                    const vu = Number(it.vu) || 0;
                    return (
                      <tr key={it.id || idx} style={{ borderTop: idx ? "1px solid var(--separator)" : "none", fontVariantNumeric: "tabular-nums" }}>
                        <td style={{ ...celda, color: "var(--text-tertiary)" }}>{idx + 1}</td>
                        <td style={{ ...celda, color: "var(--text-primary)", fontWeight: 500 }}>{it.desc || "—"}</td>
                        <td style={{ ...celda, textAlign: "center", color: "var(--text-primary)" }}>{cant}</td>
                        <td style={{ ...celda, textAlign: "center", color: "var(--text-tertiary)" }}>{it.unit || "Und"}</td>
                        <td style={{ ...celda, textAlign: "right", color: "var(--text-secondary)" }}>{fmt(vu)}</td>
                        <td style={{ ...celda, textAlign: "right", fontWeight: 600, color: "var(--text-primary)" }}>{fmt(cant * vu)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {mapImg && (
          <div>
            <div style={{ ...rotulo, marginBottom: 8 }}>Plano de medición / distribución</div>
            <div style={{ borderRadius: 12, overflow: "hidden", background: "var(--fill)", display: "flex", justifyContent: "center" }}>
              <img src={mapImg} alt="Plano de cotización" style={{ maxHeight: 280, width: "auto", objectFit: "contain" }} />
            </div>
          </div>
        )}

        {(propuestaActiva.incluyeTexto || cotizacion.incluyeTexto || propuestaActiva.formaPago) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, fontSize: 13 }}>
            {(propuestaActiva.incluyeTexto || cotizacion.incluyeTexto) && (
              <div style={recuadro}>
                <div style={{ ...rotulo, marginBottom: 6 }}>El servicio incluye</div>
                <div style={{ color: "var(--text-secondary)", lineHeight: 1.5, whiteSpace: "pre-line" }}>
                  {propuestaActiva.incluyeTexto || cotizacion.incluyeTexto}
                </div>
              </div>
            )}
            {propuestaActiva.formaPago && (
              <div style={recuadro}>
                <div style={{ ...rotulo, marginBottom: 6 }}>Condiciones comerciales / forma de pago</div>
                <div style={{ color: "var(--text-secondary)", lineHeight: 1.5, whiteSpace: "pre-line" }}>{propuestaActiva.formaPago}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}
