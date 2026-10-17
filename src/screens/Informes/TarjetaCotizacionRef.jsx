import React, { useState } from "react";
import { fmt } from "../../lib/format";
import { getQuoteActiveProposal, normalizeProposalItems } from "../../lib/cotizaciones";
import { Button, StatusPill } from "../../components/ui";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

// Bloque «Cotización de referencia» del editor de informes. Va como los demas
// bloques del editor, al estilo de apple.com: fondo blanco sin borde, titulo
// grande, acciones como texto y el alcance en filas limpias.

const BLOQUE = { background: "var(--surface)", borderRadius: 22, padding: "22px 22px", marginBottom: 14 };
const TITULO = { fontSize: 21, fontWeight: 600, letterSpacing: "-0.015em", lineHeight: 1.2, color: "var(--text-primary)", margin: 0 };
const SELECTOR = {
  background: "var(--fill)", border: "1px solid transparent", borderRadius: 12,
  padding: "10px 14px", fontSize: 14, color: "var(--text-primary)", fontFamily: "inherit",
  cursor: "pointer", flex: "1 1 260px", maxWidth: 460,
};

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
      <section style={BLOQUE}>
        <h2 style={TITULO}>Cotización de referencia</h2>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, marginBottom: 14 }}>
          Sirve para cotejar el alcance presupuestado e importar sus ítems como actividades.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onSeleccionarCotizacion(e.target.value);
              }
            }}
            style={SELECTOR}
          >
            <option value="">Vincular una cotización a este informe…</option>
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
          {todasCotizaciones.length === 0 && (
            <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>
              No hay cotizaciones registradas aún en el sistema.
            </span>
          )}
        </div>
      </section>
    );
  }

  // Cotización encontrada
  const propuestaActiva = getQuoteActiveProposal(cotizacion) || {};
  const items = normalizeProposalItems(propuestaActiva.items || cotizacion.items || []);
  const total = propuestaActiva.total ?? cotizacion.total ?? 0;

  return (
    <section style={BLOQUE}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={TITULO}>Cotización de referencia</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
              {cotizacion.numero}
            </span>
            <StatusPill estado={cotizacion.estado || "Aprobada"} />
            {total > 0 && (
              <span style={{ fontSize: 15, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                {fmt(total)}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          {items.length > 0 && onImportarItems && (
            <Button
              variante="texto"
              tam="sm"
              onClick={() => onImportarItems(items, cotizacion)}
              title="Crear actividades a partir de los ítems cotizados"
            >
              Importar ítems
            </Button>
          )}
          <Button
            variante="texto"
            tam="sm"
            aria-pressed={modoCambiar}
            onClick={() => setModoCambiar(!modoCambiar)}
          >
            {modoCambiar ? "Cerrar" : "Cambiar"}
          </Button>
          <Button
            variante="tertiary"
            tam="sm"
            iconoDerecha="flechaDer"
            onClick={onVerDetalle}
            title="Ver desglose completo de la cotización, precios y plano"
          >
            Ver cotización
          </Button>
        </div>
      </div>

      {modoCambiar && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <select
            value={cotizacion.id}
            onChange={(e) => {
              if (e.target.value) {
                onSeleccionarCotizacion(e.target.value);
                setModoCambiar(false);
              }
            }}
            style={SELECTOR}
          >
            {todasCotizaciones.map((c) => (
              <option key={c.id} value={c.id}>
                {c.numero} · {c.cliente} — {c.proyecto || "Sin título"} ({c.estado || "Aprobada"})
              </option>
            ))}
          </select>
          <Button
            variante="destructive"
            tam="sm"
            onClick={() => {
              onSeleccionarCotizacion("");
              setModoCambiar(false);
            }}
          >
            Desvincular
          </Button>
        </div>
      )}

      {/* Alcance contratado: una fila por item, como una ficha tecnica. */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
          Alcance contratado
        </div>
        {items.length === 0 ? (
          <div style={{ fontSize: 14, color: "var(--text-tertiary)", padding: "8px 0" }}>Sin ítems especificados</div>
        ) : (
          items.slice(0, 5).map((it, idx) => (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "90px minmax(0,1fr)",
                gap: 12,
                padding: "10px 0",
                borderTop: idx === 0 ? "none" : "1px solid var(--separator)",
                alignItems: "baseline",
                fontSize: 14,
              }}
            >
              <span style={{ color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                <strong style={{ fontWeight: 600 }}>{it.cant}</strong>{" "}
                <span style={{ color: "var(--text-tertiary)", fontSize: 12.5 }}>{it.unit || "Und"}</span>
              </span>
              <span style={{ color: "var(--text-primary)", lineHeight: 1.45 }}>{it.desc}</span>
            </div>
          ))
        )}
        {items.length > 5 && (
          <Button variante="tertiary" tam="sm" onClick={onVerDetalle} style={{ marginLeft: -12 }}>
            {items.length - 5} ítems más
          </Button>
        )}
      </div>
    </section>
  );
}
