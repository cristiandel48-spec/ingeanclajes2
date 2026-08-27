import { useEffect, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { resumenSeguimiento, colorSeguimiento, etiquetaSeguimiento } from "../lib/seguimientoCotizaciones";
import { getQuoteActiveProposal } from "../lib/cotizaciones";
import { puedeVerDinero, esDestinatarioAlerta } from "../lib/permisos";
import { fmt } from "../lib/format";
import { B } from "../styles/tokens";

export default function ModalAlertaCotizaciones({ onNavigate }) {
  const { cotizaciones, membresia } = useAppData();
  const [abierto, setAbierto] = useState(false);
  const verDinero = puedeVerDinero(membresia);

  const seg = resumenSeguimiento(cotizaciones || [], new Date(), 100);

  useEffect(() => {
    if (!membresia) return;

    // Verificar si el usuario debe recibir la alerta
    if (!esDestinatarioAlerta(membresia)) return;

    // Verificar si hay cotizaciones pendientes que requieran acción
    if (!seg.hayAlgoQueHacer) return;

    // Comprobar si ya se cerró en la sesión actual
    const yaVisto = sessionStorage.getItem("alerta_cotizaciones_vista");
    if (!yaVisto) {
      // Pequeño retardo para que la app termine de cargar la interfaz
      const timer = setTimeout(() => {
        setAbierto(true);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [membresia, seg.hayAlgoQueHacer]);

  useEffect(() => {
    const handleAbrir = () => setAbierto(true);
    window.addEventListener("abrir-alerta-cotizaciones", handleAbrir);
    return () => window.removeEventListener("abrir-alerta-cotizaciones", handleAbrir);
  }, []);

  const cerrar = () => {
    sessionStorage.setItem("alerta_cotizaciones_vista", "1");
    setAbierto(false);
  };

  const irACotizaciones = () => {
    cerrar();
    if (onNavigate) {
      onNavigate("cotizacion");
    }
  };

  if (!abierto || !seg.hayAlgoQueHacer) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) cerrar();
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.15)",
          width: "100%",
          maxWidth: 560,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #fed7aa",
        }}
      >
        {/* Cabecera de la alerta */}
        <div
          style={{
            background: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
            borderBottom: "1px solid #fdba74",
            padding: "20px 24px 16px",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>🔔</span>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "1px", color: "#c2410c", textTransform: "uppercase" }}>
                  Recordatorio de Seguimiento
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "#1c1917" }}>
                Cotizaciones sin respuesta
              </h2>
              <div style={{ fontSize: 13, color: "#78350f", marginTop: 4 }}>
                Hola <strong>{membresia?.nombre || "Administrador"}</strong>, tienes propuestas comerciales pendientes por llamar o por vencer.
              </div>
            </div>
            <button
              onClick={cerrar}
              style={{
                background: "rgba(0,0,0,0.06)",
                border: "none",
                borderRadius: "50%",
                width: 30,
                height: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#78350f",
                fontSize: 16,
                fontWeight: 700,
              }}
              title="Cerrar recordatorio"
            >
              ×
            </button>
          </div>

          {/* Resumen de cantidades */}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <span style={{ background: "#c2410c", color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              {seg.requierenAccion.length} por llamar
            </span>
            {seg.vencidas.length > 0 && (
              <span style={{ background: "#fee2e2", color: "#b91c1c", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                {seg.vencidas.length} vencida{seg.vencidas.length === 1 ? "" : "s"}
              </span>
            )}
            {seg.porVencer.length > 0 && (
              <span style={{ background: "#ffedd5", color: "#c2410c", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                {seg.porVencer.length} por vencer
              </span>
            )}
            {seg.alDia.length > 0 && (
              <span style={{ background: "#f1f5f9", color: "#475569", padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600 }}>
                {seg.alDia.length} al día
              </span>
            )}
          </div>
        </div>

        {/* Lista de cotizaciones que requieren acción */}
        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1, display: "grid", gap: 10 }}>
          {seg.requierenAccion.map((cotizacion) => {
            const activa = getQuoteActiveProposal(cotizacion);
            const totalPropuesta = activa?.total || 0;
            const esVencida = cotizacion.diasParaVencer < 0;

            return (
              <div
                key={cotizacion.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  background: esVencida ? "#fef2f2" : "#fff",
                  border: `1px solid ${esVencida ? "#fca5a5" : "#fed7aa"}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {cotizacion.cliente || "Cliente sin nombre"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[cotizacion.numero || cotizacion.id, cotizacion.obra].filter(Boolean).join(" · ")}
                  </div>
                  {verDinero && Number(totalPropuesta) > 0 && (
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "#059669", marginTop: 3 }}>
                      {fmt(Number(totalPropuesta))}
                    </div>
                  )}
                </div>

                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: colorSeguimiento(cotizacion.diasParaVencer),
                      background: esVencida ? "#fee2e2" : "#fff7ed",
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: `1px solid ${esVencida ? "#fecaca" : "#ffedd5"}`,
                      display: "inline-block",
                    }}
                  >
                    {etiquetaSeguimiento(cotizacion.diasParaVencer)}
                  </div>
                  {cotizacion.diasSinRespuesta !== null && (
                    <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 3 }}>
                      {cotizacion.diasSinRespuesta} días emitida
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {seg.masVieja && (
            <div
              style={{
                fontSize: 12,
                color: "#b45309",
                background: "#fefce8",
                border: "1px solid #fef08a",
                borderRadius: 8,
                padding: "8px 12px",
                marginTop: 4,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>⚠️</span>
              <span>
                La cotización más antigua lleva <strong>{seg.masVieja.diasSinRespuesta} días</strong> sin respuesta.
              </span>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div
          style={{
            padding: "14px 20px",
            borderTop: "1px solid #e2e8f0",
            background: "#f8fafc",
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={cerrar}
            style={{
              ...B("#f1f5f9", "#475569"),
              fontSize: 12.5,
              padding: "9px 16px",
            }}
          >
            Recordar más tarde
          </button>
          <button
            onClick={irACotizaciones}
            style={{
              ...B("#f47c20"),
              fontSize: 12.5,
              fontWeight: 700,
              padding: "9px 20px",
              boxShadow: "0 2px 4px rgba(244, 124, 32, 0.25)",
            }}
          >
            Ver cotizaciones
          </button>
        </div>
      </div>
    </div>
  );
}
