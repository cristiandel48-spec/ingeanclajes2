// Barra del proceso de nómina: Navegación de Dos Niveles (Opción C)
// Nivel 1: Pestañas de Fase Macro (100% de ancho, cero scroll)
// Nivel 2: Pasos amplios y de alto contraste correspondientes a la fase seleccionada
import { useState, useEffect } from "react";
import { FASES, PASOS, indiceDePaso, pasoAnterior, pasoSiguiente } from "./pasosNominaConfig";

const NARANJA = "#f47c20";

const ICONOS_FASES = ["📋", "📄", "💰"];

const ICONOS_PASOS = {
  lista: "👥",
  he: "⏱️",
  incapacidades: "🩺",
  vacaciones: "🏖️",
  deducciones: "⚖️",
  contratos: "📝",
  prestaciones: "🛡️",
  planilla: "💳",
  colillas: "🧾",
};

export default function PasosNomina({ activo, onIr, conteos = {} }) {
  // Determinar a qué fase pertenece el paso activo
  const faseDelPasoActivo = FASES.findIndex((f) => f.pasos.some((p) => p.id === activo));
  const [faseVista, setFaseVista] = useState(() => (faseDelPasoActivo !== -1 ? faseDelPasoActivo : 0));

  // Si cambia el paso activo externamente, sincronizar la fase visible
  useEffect(() => {
    const idx = FASES.findIndex((f) => f.pasos.some((p) => p.id === activo));
    if (idx !== -1) {
      setFaseVista(idx);
    }
  }, [activo]);

  const faseActual = FASES[faseVista] || FASES[0];

  const handleCambiarFase = (indexFase) => {
    setFaseVista(indexFase);
    // Navegar al primer paso de esa fase para retroalimentación inmediata
    const primerPaso = FASES[indexFase]?.pasos?.[0];
    if (primerPaso && onIr) {
      onIr(primerPaso.id);
    }
  };

  return (
    <div
      style={{
        background: "var(--surface, #ffffff)",
        border: "1.5px solid var(--border, #cbd5e1)",
        borderRadius: 14,
        overflow: "hidden",
        marginBottom: 18,
        boxShadow: "0 2px 6px rgba(15, 23, 42, 0.04)",
      }}
    >
      {/* NIVEL 1: PESTAÑAS MACRO DE FASE (100% ANCHO, CERO SCROLL) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          background: "var(--surface-subtle, #f8fafc)",
          borderBottom: "1.5px solid var(--border, #cbd5e1)",
        }}
      >
        {FASES.map((fase, iFase) => {
          const esFaseActiva = faseVista === iFase;
          const contienePasoActivo = fase.pasos.some((p) => p.id === activo);
          const icono = ICONOS_FASES[iFase] || "📌";

          // Suma de novedades o registros en esta fase
          const totalNovedadesFase = fase.pasos.reduce(
            (acc, p) => acc + (Number(conteos[p.id]) || 0),
            0
          );

          return (
            <button
              key={fase.titulo}
              type="button"
              onClick={() => handleCambiarFase(iFase)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "12px 14px",
                background: esFaseActiva ? "var(--surface, #ffffff)" : "transparent",
                border: "none",
                borderRight: iFase < 2 ? "1px solid var(--border, #e2e8f0)" : "none",
                borderBottom: esFaseActiva ? `3.5px solid ${NARANJA}` : "3.5px solid transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s ease",
                position: "relative",
              }}
              title={`Ver ${fase.titulo}: ${fase.detalle}`}
            >
              <span style={{ fontSize: 16 }}>{icono}</span>
              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: esFaseActiva ? NARANJA : "var(--text-muted, #64748b)",
                  }}
                >
                  Fase {iFase + 1}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: esFaseActiva ? 800 : 700,
                    color: esFaseActiva ? "var(--text-main, #0f172a)" : "var(--text-main, #334155)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fase.titulo}
                </div>
              </div>

              {/* Badges indicadores */}
              {contienePasoActivo && (
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 800,
                    padding: "2px 7px",
                    borderRadius: 10,
                    background: esFaseActiva ? NARANJA : "rgba(244, 124, 32, 0.15)",
                    color: esFaseActiva ? "#ffffff" : NARANJA,
                    marginLeft: 4,
                  }}
                >
                  Activa
                </span>
              )}
              {!contienePasoActivo && totalNovedadesFase > 0 && (
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    padding: "1px 6px",
                    borderRadius: 10,
                    background: "var(--border, #e2e8f0)",
                    color: "var(--text-main, #1e293b)",
                    marginLeft: 4,
                  }}
                >
                  {totalNovedadesFase}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* NIVEL 2: PASOS AMPLIOS DE LA FASE SELECCIONADA (TODO VISIBLE EN PANTALLA) */}
      <div style={{ padding: "14px 18px", background: "var(--surface, #ffffff)" }}>
        {/* Detalle explicativo de la fase */}
        <div
          style={{
            fontSize: 11.5,
            color: "var(--text-muted, #64748b)",
            marginBottom: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{faseActual.detalle}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted, #94a3b8)" }}>
            {faseActual.pasos.length} pasos en esta fase
          </span>
        </div>

        {/* Fila de pasos elásticos que ocupan el 100% del ancho */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${faseActual.pasos.length}, 1fr)`,
            gap: 8,
          }}
        >
          {faseActual.pasos.map((paso) => {
            const indice = indiceDePaso(paso.id);
            const esActivo = paso.id === activo;
            const iconoPaso = ICONOS_PASOS[paso.id] || "📌";
            const conteo = conteos[paso.id];

            return (
              <button
                key={paso.id}
                type="button"
                onClick={() => onIr(paso.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "inherit",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                  background: esActivo ? NARANJA : "var(--surface-subtle, #f8fafc)",
                  color: esActivo ? "#ffffff" : "var(--text-main, #1e293b)",
                  border: esActivo
                    ? "1.5px solid #ea580c"
                    : "1.5px solid var(--border, #cbd5e1)",
                  boxShadow: esActivo
                    ? "0 2px 8px rgba(244, 124, 32, 0.35)"
                    : "0 1px 2px rgba(0, 0, 0, 0.03)",
                }}
                title={`Paso ${indice + 1}: ${paso.label}`}
              >
                {/* Círculo con número */}
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    background: esActivo ? "#ffffff" : "var(--surface, #ffffff)",
                    color: esActivo ? NARANJA : "var(--text-main, #334155)",
                    border: esActivo ? "none" : "1px solid var(--border, #cbd5e1)",
                    flexShrink: 0,
                  }}
                >
                  {indice + 1}
                </span>

                {/* Icono temático */}
                <span style={{ fontSize: 13 }}>{iconoPaso}</span>

                {/* Etiqueta del paso */}
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                  {paso.label}
                </span>

                {/* Conteo si aplica */}
                {conteo !== undefined && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "1px 6px",
                      borderRadius: 10,
                      background: esActivo ? "#9a3412" : "var(--border, #e2e8f0)",
                      color: esActivo ? "#ffffff" : "var(--text-main, #0f172a)",
                      flexShrink: 0,
                    }}
                  >
                    {conteo}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Navegación al pie de cada paso. Sin esto hay que volver arriba para seguir,
// y no queda claro cuál es el siguiente.
export function NavegacionPasos({ activo, onIr }) {
  const previo = pasoAnterior(activo);
  const siguiente = pasoSiguiente(activo);
  if (!previo && !siguiente) return null;

  const boton = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: "10px 16px",
    minHeight: 42,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        marginTop: 22,
        paddingTop: 16,
        borderTop: "1px solid var(--border, #e8edf4)",
      }}
    >
      {previo ? (
        <button
          onClick={() => onIr(previo.id)}
          style={{
            ...boton,
            background: "var(--surface-subtle, #f8fafc)",
            border: "1px solid var(--border, #dbe4f0)",
            color: "var(--text-main, #475569)",
          }}
        >
          ← {previo.label}
        </button>
      ) : (
        <span />
      )}

      {siguiente && (
        <button
          onClick={() => onIr(siguiente.id)}
          style={{
            ...boton,
            background: NARANJA,
            border: `1px solid ${NARANJA}`,
            color: "#fff",
          }}
        >
          Siguiente: {siguiente.label} →
        </button>
      )}
    </div>
  );
}
