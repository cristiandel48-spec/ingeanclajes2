import { useState, useMemo, useRef } from "react";
import { B, CD, SI } from "../../styles/tokens";
import { EJEMPLOS } from "../../data/ejemplos";
import { abrirWhatsApp } from "../../lib/whatsapp";
import { useIsMobile } from "../../hooks/useMediaQuery";
import {
  enviarNotificacionAgendaPorCorreo,
  enviarInvitacionAgenda,
  separarCorreos,
  correosInvalidos,
  generarUrlGoogleCalendar,
  horaA24h,
  horaA12h,
} from "../../lib/agendaEmail";
import {
  getFestivoColombia,
  esDiaFestivoColombia,
  getFestivosDelMes,
} from "../../lib/festivosColombia";
import {
  esUsuarioCristian,
  esUsuarioCamila,
  esCompromisoEspecial,
  filtrarAgendaPorPermiso,
  obtenerFechasEspecialesDelMes,
} from "../../lib/agendaEspecial";
import ModalEstrellitaEspecial from "../../components/agenda/ModalEstrellitaEspecial";
import { confirmar } from "../../lib/dialogos";

// Meses y días en español
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const DIAS_CORTO = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const DIAS_COMPLETO = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function toIso(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dia}`;
}

function parseIso(isoStr) {
  if (!isoStr) return new Date();
  const [y, m, d] = isoStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatFechaLarga(isoStr) {
  if (!isoStr) return "";
  const d = parseIso(isoStr);
  const diaSemana = DIAS_COMPLETO[d.getDay() === 0 ? 6 : d.getDay() - 1];
  return `${diaSemana}, ${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

// Configuración visual refinada estilo Apple (sin emojis, usando colores armónicos)
const TIPOS_COMPROMISO = {
  visita: {
    label: "Visita a Obra",
    color: "#d97706",
    bg: "#fef3c7",
    border: "#fde68a",
    dot: "#f59e0b",
  },
  llamada: {
    label: "Llamada",
    color: "#2563eb",
    bg: "#eff6ff",
    border: "#dbeafe",
    dot: "#3b82f6",
  },
  reunion: {
    label: "Reunión",
    color: "#7c3aed",
    bg: "#f5f3ff",
    border: "#ede9fe",
    dot: "#8b5cf6",
  },
  coordinacion: {
    label: "Coordinación",
    color: "#059669",
    bg: "#ecfdf5",
    border: "#d1fae5",
    dot: "#10b981",
  },
  especial: {
    label: "Fecha Especial",
    color: "#b45309",
    bg: "#fef3c7",
    border: "#fde68a",
    dot: "#f59e0b",
  },
};

// Iconos vectoriales minimalistas (estilo Apple SF Symbols)
function IconoTipo({ tipo, size = 15 }) {
  if (tipo === "especial") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    );
  }
  if (tipo === "visita") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
  }
  if (tipo === "llamada") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }
  if (tipo === "reunion") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function CompromisosDelDiaSection({
  fechaSeleccionada,
  formatFechaLarga,
  eventosDelDia,
  abrirNuevoModal,
  toggleCompletado,
  abrirEditarModal,
  eliminarCompromiso,
  enviarWhatsApp,
  abrirWaze,
  esCristian,
  esCamila,
  abrirModalEstrellita,
  eliminarFechaEspecial,
}) {
  const festivoDelDia = getFestivoColombia(fechaSeleccionada);
  const fechaEspecialDelDia = (esCristian || esCamila)
    ? eventosDelDia.find(esCompromisoEspecial)
    : null;
  const compromisosTrabajo = eventosDelDia.filter((c) => !esCompromisoEspecial(c));

  return (
    <div style={{ ...CD, padding: 24, width: "100%", boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 14,
          borderBottom: "1px solid var(--border, #e2e8f0)",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted, #94a3b8)" }}>
            Compromisos del día
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 800, margin: "2px 0 0", color: "var(--text-main, #0f172a)" }}>
            {formatFechaLarga(fechaSeleccionada)}
          </h3>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {esCristian && (
            <button
              type="button"
              style={{
                background: fechaEspecialDelDia ? "#fef3c7" : "linear-gradient(135deg, #fef3c7, #fef9c3)",
                color: "#92400e",
                border: "1px solid #fde68a",
                fontSize: 12,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 8,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 1px 3px rgba(245, 158, 11, 0.15)",
                cursor: "pointer",
              }}
              onClick={() => abrirModalEstrellita(fechaSeleccionada, fechaEspecialDelDia)}
              title="Poner o editar una fecha especial con estrellita privada para Camila"
            >
              <span>{fechaEspecialDelDia?.icono || "⭐"}</span>
              <span>{fechaEspecialDelDia ? "Editar Estrellita" : "Poner Estrellita"}</span>
            </button>
          )}

          <button
            type="button"
            style={{
              ...B("var(--surface-subtle, #f1f5f9)", "var(--text-main, #0f172a)"),
              border: "1px solid var(--border, #e2e8f0)",
              fontSize: 12,
              padding: "6px 12px",
            }}
            onClick={() => abrirNuevoModal("visita")}
          >
            + Agregar compromiso
          </button>
        </div>
      </div>

      {/* Tarjeta de Fecha Especial para Camila */}
      {fechaEspecialDelDia && esCamila && (
        <div
          style={{
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 45%, #fff1f2 100%)",
            border: "1.5px solid #fcd34d",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 16,
            boxShadow: "0 4px 14px rgba(245, 158, 11, 0.12), 0 1px 3px rgba(0,0,0,0.05)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #fde68a, #f59e0b)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(245, 158, 11, 0.25)",
              }}
            >
              {fechaEspecialDelDia.icono || "⭐"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 10.5,
                    fontWeight: 800,
                    color: "#b45309",
                    background: "#fef3c7",
                    border: "1px solid #fde68a",
                    padding: "2px 9px",
                    borderRadius: 20,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Fecha Especial
                </span>
                {fechaEspecialDelDia.hora && (
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                    🕒 {fechaEspecialDelDia.hora}
                  </span>
                )}
              </div>
              <h4 style={{ fontSize: 18, fontWeight: 800, color: "#78350f", margin: "4px 0 2px" }}>
                {fechaEspecialDelDia.titulo}
              </h4>
              {fechaEspecialDelDia.notas && (
                <p style={{ fontSize: 13, color: "#92400e", margin: "4px 0 0", lineHeight: 1.45, fontStyle: "italic" }}>
                  "{fechaEspecialDelDia.notas}"
                </p>
              )}
              <div style={{ marginTop: 8, fontSize: 11.5, fontWeight: 700, color: "#d97706", display: "flex", alignItems: "center", gap: 5 }}>
                <span>💖</span>
                <span>Con mucho cariño, Cristian Flores</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tarjeta de Fecha Especial para Cristian */}
      {fechaEspecialDelDia && esCristian && (
        <div
          style={{
            background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 45%, #fff1f2 100%)",
            border: "1.5px solid #fcd34d",
            borderRadius: 14,
            padding: "16px 20px",
            marginBottom: 16,
            boxShadow: "0 4px 14px rgba(245, 158, 11, 0.12)",
            position: "relative",
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, flex: 1, minWidth: 260 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #fde68a, #f59e0b)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                  flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(245, 158, 11, 0.25)",
                }}
              >
                {fechaEspecialDelDia.icono || "⭐"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 800,
                      color: "#b45309",
                      background: "#fef3c7",
                      border: "1px solid #fde68a",
                      padding: "2px 9px",
                      borderRadius: 20,
                      textTransform: "uppercase",
                    }}
                  >
                    ⭐ Fecha Especial Guardada
                  </span>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#059669",
                      background: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      padding: "2px 8px",
                      borderRadius: 20,
                    }}
                  >
                    🔒 Visible solo para Camila y tú
                  </span>
                  {fechaEspecialDelDia.hora && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#92400e" }}>
                      🕒 {fechaEspecialDelDia.hora}
                    </span>
                  )}
                </div>
                <h4 style={{ fontSize: 18, fontWeight: 800, color: "#78350f", margin: "4px 0 2px" }}>
                  {fechaEspecialDelDia.titulo}
                </h4>
                {fechaEspecialDelDia.notas && (
                  <p style={{ fontSize: 13, color: "#92400e", margin: "4px 0 0", fontStyle: "italic" }}>
                    "{fechaEspecialDelDia.notas}"
                  </p>
                )}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => abrirModalEstrellita(fechaSeleccionada, fechaEspecialDelDia)}
                style={{
                  padding: "6px 12px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "1px solid #fde68a",
                  background: "#ffffff",
                  color: "#92400e",
                  cursor: "pointer",
                }}
              >
                ✎ Editar
              </button>
              <button
                type="button"
                onClick={() => eliminarFechaEspecial(fechaEspecialDelDia.id)}
                style={{
                  padding: "6px 12px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: "1px solid #fecaca",
                  background: "#ffffff",
                  color: "#dc2626",
                  cursor: "pointer",
                }}
              >
                ✕ Quitar
              </button>
            </div>
          </div>
        </div>
      )}

      {festivoDelDia && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "linear-gradient(135deg, rgba(254, 242, 242, 0.95), rgba(255, 241, 242, 0.75))",
            border: "1px solid rgba(252, 165, 165, 0.65)",
            borderRadius: 12,
            padding: "12px 16px",
            marginBottom: 16,
            boxShadow: "0 1px 4px rgba(220, 38, 38, 0.05)",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "#fee2e2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            🇨🇴
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13.5, fontWeight: 800, color: "#991b1b" }}>
                {festivoDelDia.nombre}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#b91c1c",
                  background: "#fecaca",
                  padding: "2px 8px",
                  borderRadius: 20,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                Festivo Nacional (Colombia)
              </span>
            </div>
            <p style={{ fontSize: 11.5, color: "#7f1d1d", margin: "3px 0 0" }}>
              Día oficial no laboral en Colombia {festivoDelDia.leyEmiliani ? "(Ley Emiliani)" : ""}. Tenlo presente para coordinación de obra y visitas técnicas.
            </p>
          </div>
        </div>
      )}

      {compromisosTrabajo.length === 0 ? (
        <div
          style={{
            padding: "32px 20px",
            textAlign: "center",
            background: "var(--surface-subtle, #f8fafc)",
            borderRadius: 12,
            border: "1px dashed var(--border, #cbd5e1)",
          }}
        >
          <div style={{ color: "var(--text-muted, #94a3b8)", marginBottom: 8 }}>
            <IconoTipo tipo="coordinacion" size={26} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #0f172a)" }}>
            {fechaEspecialDelDia
              ? "Sin visitas de obra programadas para esta fecha especial"
              : "Sin compromisos para esta fecha"}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted, #64748b)", margin: "4px 0 14px" }}>
            No hay visitas técnicas ni llamadas de obra agendadas para el día seleccionado.
          </p>
          <button
            type="button"
            style={{ ...B("#f47c20"), fontSize: 12, padding: "7px 14px" }}
            onClick={() => abrirNuevoModal("visita")}
          >
            + Programar compromiso
          </button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 14 }}>
          {compromisosTrabajo.map((item) => {
            const conf = TIPOS_COMPROMISO[item.tipo] || TIPOS_COMPROMISO.visita;
            const completado = item.estado === "completado";

            return (
              <div
                key={item.id}
                style={{
                  border: "1px solid var(--border, #e2e8f0)",
                  borderRadius: 12,
                  padding: 14,
                  background: completado ? "var(--surface-subtle, #f8fafc)" : "var(--surface, #ffffff)",
                  opacity: completado ? 0.65 : 1,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 700,
                        background: conf.bg,
                        color: conf.color,
                      }}
                    >
                      <IconoTipo tipo={item.tipo} size={12} />
                      {conf.label}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main, #0f172a)" }}>
                      {item.hora}
                    </span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => toggleCompletado(item.id)}
                      style={{
                        padding: "4px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: "1px solid var(--border, #e2e8f0)",
                        cursor: "pointer",
                        background: completado ? "#ecfdf5" : "var(--surface, #ffffff)",
                        color: completado ? "#047857" : "var(--text-muted, #64748b)",
                      }}
                    >
                      {completado ? "✓ Realizada" : "Completar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirEditarModal(item)}
                      style={{
                        padding: "4px 6px",
                        fontSize: 11,
                        borderRadius: 6,
                        border: "1px solid var(--border, #e2e8f0)",
                        background: "var(--surface, #ffffff)",
                        cursor: "pointer",
                        color: "var(--text-muted, #64748b)",
                      }}
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarCompromiso(item.id)}
                      style={{
                        padding: "4px 6px",
                        fontSize: 11,
                        borderRadius: 6,
                        border: "1px solid var(--border, #e2e8f0)",
                        background: "var(--surface, #ffffff)",
                        cursor: "pointer",
                        color: "#ef4444",
                      }}
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main, #0f172a)" }}>
                  {item.obra || item.titulo}
                </div>
                {item.cliente && (
                  <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginTop: 2 }}>
                    {item.cliente} {item.ciudad ? `· ${item.ciudad}` : ""}
                  </div>
                )}

                {(item.contacto || item.telefono) && (
                  <div
                    style={{
                      fontSize: 11.5,
                      marginTop: 8,
                      padding: "6px 10px",
                      background: "var(--surface-subtle, #f8fafc)",
                      borderRadius: 6,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <span style={{ color: "var(--text-muted, #64748b)" }}>Contacto: </span>
                      <span style={{ fontWeight: 600, color: "var(--text-main, #0f172a)" }}>{item.contacto || "N/A"}</span>
                      {item.telefono && (
                        <span style={{ marginLeft: 8, color: "#2563eb", fontWeight: 600 }}>{item.telefono}</span>
                      )}
                    </div>
                  </div>
                )}

                {item.notas && (
                  <div style={{ fontSize: 11.5, color: "var(--text-muted, #475569)", marginTop: 6, lineHeight: 1.4 }}>
                    {item.notas}
                  </div>
                )}

                {item.requerimientoSst && (
                  <div style={{ fontSize: 11, color: "#059669", fontWeight: 600, marginTop: 4 }}>
                    SST: {item.requerimientoSst}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--border, #f1f5f9)" }}>
                  {item.telefono && (
                    <button
                      type="button"
                      onClick={() => enviarWhatsApp(item)}
                      style={{
                        ...B("#25D366"),
                        fontSize: 11.5,
                        padding: "5px 10px",
                        borderRadius: 6,
                      }}
                    >
                      WhatsApp
                    </button>
                  )}
                  {(item.obra || item.ciudad) && item.tipo === "visita" && (
                    <button
                      type="button"
                      onClick={() => abrirWaze(item)}
                      style={{
                        ...B("var(--surface-subtle, #f1f5f9)", "var(--text-main, #0f172a)"),
                        border: "1px solid var(--border, #e2e8f0)",
                        fontSize: 11.5,
                        padding: "5px 10px",
                        borderRadius: 6,
                      }}
                    >
                      Abrir Waze
                    </button>
                  )}

                  {item.linkReunion && (
                    <a
                      href={item.linkReunion}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...B("#7c3aed"),
                        fontSize: 11.5,
                        padding: "5px 10px",
                        borderRadius: 6,
                        textDecoration: "none",
                      }}
                    >
                      Unirse a Reunión
                    </a>
                  )}

                  <a
                    href={generarUrlGoogleCalendar(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...B("var(--surface-subtle, #f1f5f9)", "var(--text-main, #0f172a)"),
                      border: "1px solid var(--border, #e2e8f0)",
                      fontSize: 11.5,
                      padding: "5px 10px",
                      borderRadius: 6,
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    title="Añadir a Google Calendar con recordatorio para Camila"
                  >
                    📅 Google Calendar
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CalendarioMensualSection({
  calMes,
  mesAnterior,
  irAHoy,
  mesSiguiente,
  celdasMes,
  eventosPorFecha,
  fechaSeleccionada,
  setFechaSeleccionada,
  esCristian,
  esCamila,
  compromisos,
  abrirModalEstrellita,
  toggleEstrellitaRapida,
}) {
  const isMobile = useIsMobile();
  const lastTapRef = useRef({ time: 0, iso: null });

  const manejarClickDia = (iso, fechaEspecial) => {
    if (!iso) return;
    setFechaSeleccionada(iso);

    if (!esCristian) return;

    const ahora = Date.now();
    const tiempoDiff = ahora - lastTapRef.current.time;
    const mismoDia = lastTapRef.current.iso === iso;

    if (mismoDia && tiempoDiff > 35 && tiempoDiff < 420) {
      // ¡Doble clic o doble tap detectado en celular y PC!
      lastTapRef.current = { time: 0, iso: null };
      toggleEstrellitaRapida?.(iso, fechaEspecial);
    } else {
      lastTapRef.current = { time: ahora, iso };
    }
  };

  const festivosDelMes = useMemo(
    () => getFestivosDelMes(calMes.anio, calMes.mes),
    [calMes.anio, calMes.mes]
  );

  return (
    <div style={{ ...CD, padding: isMobile ? "16px 10px" : 24, width: "100%", boxSizing: "border-box" }}>
      {/* Navegación del mes */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 800, margin: 0, color: "var(--text-main, #0f172a)" }}>
              {MESES[calMes.mes]}
            </h2>
            <span style={{ fontSize: isMobile ? 14 : 16, fontWeight: 500, color: "var(--text-muted, #94a3b8)" }}>
              {calMes.anio}
            </span>
          </div>

          {festivosDelMes.length > 0 && (
            <span
              style={{
                fontSize: isMobile ? 10 : 11.5,
                fontWeight: 700,
                color: "#b91c1c",
                background: "rgba(254, 226, 226, 0.75)",
                border: "1px solid rgba(252, 165, 165, 0.55)",
                padding: isMobile ? "2px 7px" : "3px 10px",
                borderRadius: 20,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
              title={festivosDelMes.map((f) => `${f.fecha.slice(8, 10)} ${MESES[calMes.mes].slice(0, 3)}: ${f.nombre}`).join("\n")}
            >
              <span>🇨🇴</span>
              <span>
                {festivosDelMes.length === 1
                  ? `1 festivo: ${festivosDelMes[0].fecha.slice(8, 10)} ${MESES[calMes.mes].slice(0, 3)} (${festivosDelMes[0].nombreCorto})`
                  : `${festivosDelMes.length} festivos en ${MESES[calMes.mes].toLowerCase()}`}
              </span>
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={mesAnterior}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--border, #e2e8f0)",
              background: "var(--surface, #ffffff)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-main, #0f172a)",
            }}
            title="Mes anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={irAHoy}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid var(--border, #e2e8f0)",
              background: "var(--surface, #ffffff)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--text-main, #0f172a)",
            }}
          >
            Hoy
          </button>
          <button
            type="button"
            onClick={mesSiguiente}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--border, #e2e8f0)",
              background: "var(--surface, #ffffff)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-main, #0f172a)",
            }}
            title="Mes siguiente"
          >
            ›
          </button>
        </div>
      </div>

      {/* Cabecera de días de la semana (7 columnas fijas) */}
      <div
        className="calendario-semana no-collapse-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          textAlign: "center",
          fontSize: isMobile ? 10 : 11,
          fontWeight: 700,
          color: "var(--text-muted, #94a3b8)",
          textTransform: "uppercase",
          letterSpacing: isMobile ? "0" : "0.05em",
          paddingBottom: isMobile ? 6 : 10,
          borderBottom: "1px solid var(--border, #e2e8f0)",
          marginBottom: 8,
        }}
      >
        {DIAS_CORTO.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Cuadrícula de días (7 columnas fijas protegidas contra el colapso a 1fr) */}
      <div
        className="calendario-dias no-collapse-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: isMobile ? 3 : 6,
        }}
      >
        {celdasMes.map((c, idx) => {
          if (c.otroMes) {
            return (
              <div
                key={idx}
                style={{
                  minHeight: isMobile ? 46 : 88,
                  padding: isMobile ? "4px 2px" : "6px 8px",
                  borderRadius: isMobile ? 6 : 10,
                  background: "var(--surface-subtle, #f8fafc)",
                  opacity: 0.35,
                  border: "1px solid transparent",
                  textAlign: "center",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span style={{ fontSize: isMobile ? 10.5 : 11.5, color: "var(--text-muted, #94a3b8)" }}>{c.numero}</span>
              </div>
            );
          }

          const evts = eventosPorFecha[c.iso] || [];
          const fechaEspecial = (esCristian || esCamila) ? evts.find(esCompromisoEspecial) : null;
          const tieneEstrellita = Boolean(fechaEspecial);
          const evtsTrabajo = evts.filter((e) => !esCompromisoEspecial(e));

          const esHoy = c.esHoy;
          const esSeleccionado = c.esSeleccionado;
          const esFestivo = c.esFestivo;
          const festivo = c.festivo;

          return (
            <div
              key={idx}
              onClick={() => manejarClickDia(c.iso, fechaEspecial)}
              onDoubleClick={(e) => {
                e.preventDefault();
                if (esCristian && c.iso) {
                  toggleEstrellitaRapida?.(c.iso, fechaEspecial);
                }
              }}
              style={{
                minHeight: isMobile ? 48 : 88,
                padding: isMobile ? "4px 2px" : "6px 8px",
                borderRadius: isMobile ? 6 : 10,
                cursor: "pointer",
                touchAction: "manipulation",
                WebkitTapHighlightColor: "transparent",
                userSelect: "none",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                transition: "all 0.12s ease",
                background: esSeleccionado
                  ? (isMobile ? "#f1f5f9" : "var(--surface, #ffffff)")
                  : tieneEstrellita
                  ? "rgba(254, 243, 199, 0.38)"
                  : esFestivo
                  ? "rgba(254, 242, 242, 0.42)"
                  : "var(--surface, #ffffff)",
                border: esSeleccionado
                  ? "2px solid #0f172a"
                  : tieneEstrellita
                  ? "1.5px solid #fcd34d"
                  : esFestivo
                  ? "1px solid rgba(239, 68, 68, 0.32)"
                  : "1px solid var(--border, #e2e8f0)",
                boxShadow: esSeleccionado
                  ? "0 4px 12px rgba(15,23,42,0.08)"
                  : tieneEstrellita
                  ? "0 2px 6px rgba(245, 158, 11, 0.15)"
                  : "none",
                minWidth: 0,
                overflow: "hidden",
                boxSizing: "border-box",
                position: "relative",
              }}
              title={
                tieneEstrellita
                  ? `⭐ Fecha Especial: ${fechaEspecial?.titulo}${esCristian ? " (Doble clic o doble tap para quitarla · Clic en la estrella para editar)" : ""}${esFestivo ? `\n🇨🇴 Festivo: ${festivo?.nombre}` : ""}`
                  : esCristian
                  ? `Día ${c.numero}${esFestivo ? ` (Festivo: ${festivo?.nombre})` : ""}\nTip: Doble clic o doble tap en celular para poner estrellita a Camila ⭐`
                  : esFestivo
                  ? `🇨🇴 Festivo Colombia: ${festivo?.nombre}`
                  : undefined
              }
            >
              {/* Número del día */}
              <div style={{ display: "flex", justifyContent: isMobile ? "center" : "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span
                    style={{
                      fontSize: isMobile ? 11 : 12.5,
                      fontWeight: esHoy || esSeleccionado || esFestivo || tieneEstrellita ? 800 : 600,
                      width: isMobile ? 20 : 22,
                      height: isMobile ? 20 : 22,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: esHoy
                        ? "#f47c20"
                        : esFestivo && !esSeleccionado
                        ? "rgba(239, 68, 68, 0.12)"
                        : "transparent",
                      color: esHoy ? "#ffffff" : esFestivo ? "#dc2626" : "var(--text-main, #0f172a)",
                    }}
                  >
                    {c.numero}
                  </span>

                  {tieneEstrellita && (
                    <span
                      onClick={(e) => {
                        if (esCristian) {
                          e.stopPropagation();
                          abrirModalEstrellita?.(c.iso, fechaEspecial);
                        }
                      }}
                      style={{
                        fontSize: isMobile ? 12 : 14,
                        lineHeight: 1,
                        filter: "drop-shadow(0 1px 2px rgba(245, 158, 11, 0.35))",
                        cursor: esCristian ? "pointer" : "default",
                      }}
                      title={
                        esCristian
                          ? `⭐ Fecha Especial: ${fechaEspecial.titulo} (Clic para editar)`
                          : `⭐ Fecha Especial: ${fechaEspecial.titulo}`
                      }
                    >
                      {fechaEspecial.icono || "⭐"}
                    </span>
                  )}

                </div>

                {!isMobile && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {esFestivo && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#dc2626",
                          background: "rgba(239, 68, 68, 0.08)",
                          padding: "1px 5px",
                          borderRadius: 4,
                          border: "1px solid rgba(239, 68, 68, 0.22)",
                          letterSpacing: "-0.01em",
                          textTransform: "uppercase",
                        }}
                      >
                        Festivo
                      </span>
                    )}

                    {evtsTrabajo.length > 0 && (
                      <div style={{ display: "flex", gap: 3 }}>
                        {evtsTrabajo.slice(0, 3).map((e) => (
                          <span
                            key={e.id}
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: TIPOS_COMPROMISO[e.tipo]?.dot || "#0f172a",
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Eventos y Festivo (solo festivos y trabajo, la estrellita queda limpia arriba) */}
              {isMobile ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, marginTop: 2 }}>
                  {esFestivo && (
                    <span
                      style={{
                        fontSize: 8.5,
                        lineHeight: 1,
                        color: "#b91c1c",
                        background: "#fee2e2",
                        padding: "1px 3px",
                        borderRadius: 3,
                        fontWeight: 700,
                      }}
                      title={festivo?.nombre}
                    >
                      🇨🇴
                    </span>
                  )}
                  {evtsTrabajo.length > 0 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 2.5 }}>
                      {evtsTrabajo.slice(0, 3).map((e) => (
                        <span
                          key={e.id}
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: TIPOS_COMPROMISO[e.tipo]?.dot || "#0f172a",
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
                  {esFestivo && (
                    <div
                      style={{
                        fontSize: 9.5,
                        fontWeight: 700,
                        color: "#991b1b",
                        background: "rgba(254, 226, 226, 0.82)",
                        border: "1px solid rgba(252, 165, 165, 0.65)",
                        borderRadius: 4,
                        padding: "2px 5px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title={`Festivo Nacional: ${festivo?.nombre}`}
                    >
                      <span style={{ fontSize: 10 }}>🇨🇴</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                        {festivo?.nombreCorto || festivo?.nombre}
                      </span>
                    </div>
                  )}
                  {evtsTrabajo.slice(0, esFestivo ? 1 : 2).map((e) => {
                    const conf = TIPOS_COMPROMISO[e.tipo] || TIPOS_COMPROMISO.visita;
                    return (
                      <div
                        key={e.id}
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "2px 5px",
                          borderRadius: 4,
                          background: conf.bg,
                          color: conf.color,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={`${e.hora || ""} ${e.obra || e.titulo}`}
                      >
                        {e.hora ? `${e.hora} ` : ""}{e.obra || e.titulo}
                      </div>
                    );
                  })}
                  {evtsTrabajo.length > (esFestivo ? 1 : 2) && (
                    <span style={{ fontSize: 9.5, color: "var(--text-muted, #94a3b8)", fontWeight: 700 }}>
                      +{evtsTrabajo.length - (esFestivo ? 1 : 2)} más
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Agenda({ ctx }) {
  const hoyIso = useMemo(() => toIso(new Date()), []);

  // Identificación de permisos de usuario para privacidad de las fechas especiales
  const esCristianReal = Boolean(
    esUsuarioCristian(ctx?.membresia, ctx?.authUserEmail) || ctx?.esSuperAdminCristian
  );
  const esCamilaReal = Boolean(
    esUsuarioCamila(ctx?.membresia, ctx?.authUserEmail)
  );

  // Selector de simulación para Cristian (le permite ver el calendario exactamente como Camila o como un tercero)
  const [vistaRolSimulada, setVistaRolSimulada] = useState("auto");
  const esCristian = vistaRolSimulada === "auto" ? esCristianReal : (vistaRolSimulada === "cristian");
  const esCamila = vistaRolSimulada === "auto" ? esCamilaReal : (vistaRolSimulada === "camila");

  // Fuente de datos
  const compromisos = useMemo(() => {
    const lista = ctx?.agenda;
    if (Array.isArray(lista)) {
      return lista.filter((item) => !item?.__ejemplo && !String(item?.id || "").startsWith("AG-90"));
    }
    return [];
  }, [ctx?.agenda]);

  const setCompromisos = (updater) => {
    if (typeof ctx?.setAgenda === "function") {
      ctx.setAgenda(updater);
    }
  };

  // Compromisos filtrados según permisos (las fechas especiales solo las ven Cristian y Camila)
  const compromisosVisibles = useMemo(() => {
    return filtrarAgendaPorPermiso(compromisos, { esCristian, esCamila });
  }, [compromisos, esCristian, esCamila]);

  // Estados principales
  const [vista, setVista] = useState("mes"); // "mes" | "agenda"
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyIso);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  // Control del mes visible
  const [calMes, setCalMes] = useState(() => {
    const ahora = new Date();
    return { anio: ahora.getFullYear(), mes: ahora.getMonth() };
  });

  // Modal de fechas especiales con estrellitas (Cristian para Camila)
  const [modalEstrellitaAbierto, setModalEstrellitaAbierto] = useState(false);
  const [itemEstrellitaEdicion, setItemEstrellitaEdicion] = useState(null);
  const [fechaEstrellitaInicial, setFechaEstrellitaInicial] = useState(hoyIso);

  const abrirModalEstrellita = (fecha = fechaSeleccionada, item = null) => {
    setFechaEstrellitaInicial(fecha || fechaSeleccionada || hoyIso);
    setItemEstrellitaEdicion(item || null);
    setModalEstrellitaAbierto(true);
  };

  const guardarEstrellita = ({ id, fecha, titulo, notas, hora, icono }) => {
    const payload = {
      id: id || `ESP-${Date.now()}`,
      tipo: "especial",
      titulo: titulo.trim() || "⭐ Fecha Especial",
      obra: "Fecha Especial",
      cliente: "Camila Sepúlveda",
      ciudad: "",
      fecha: fecha,
      hora: hora || "",
      contacto: "Cristian Flores",
      telefono: "",
      notas: notas.trim(),
      requerimientoSst: "",
      linkReunion: "",
      estado: "pendiente",
      prioridad: "estrella",
      icono: icono || "⭐",
      creadoPor: "Cristian Flores",
    };

    setCompromisos((prev) => {
      const sinPrevio = (prev || []).filter((c) => c.id !== payload.id);
      return [payload, ...sinPrevio];
    });

    setModalEstrellitaAbierto(false);

    if (typeof ctx?.saveAllToCloud === "function") {
      ctx.saveAllToCloud().catch((err) => {
        console.warn("No se pudo guardar la estrellita en la nube:", err);
      });
    }

    setNotificacionEnvio({
      tipo: "success",
      mensaje: `⭐ Estrellita guardada para el ${formatFechaLarga(fecha)}. Solo le saldrá a Camila en su calendario.`,
    });
    setTimeout(() => {
      setNotificacionEnvio((prev) => (prev?.tipo === "success" ? null : prev));
    }, 6000);
  };

  const toggleEstrellitaRapida = (fecha, fechaEspecialExistente = null) => {
    if (!esCristian || !fecha) return;

    if (fechaEspecialExistente) {
      setCompromisos((prev) => (prev || []).filter((c) => c.id !== fechaEspecialExistente.id));
      if (typeof ctx?.saveAllToCloud === "function") {
        ctx.saveAllToCloud().catch((err) => console.warn(err));
      }
      try {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          navigator.vibrate([30, 40, 30]);
        }
      } catch (_) {}

      setNotificacionEnvio({
        tipo: "success",
        mensaje: `✓ Estrellita quitada del ${formatFechaLarga(fecha)}. (Doble clic o tap de nuevo para volver a ponerla).`,
      });
      setTimeout(() => {
        setNotificacionEnvio((prev) => (prev?.tipo === "success" ? null : prev));
      }, 4000);
      return;
    }

    const payload = {
      id: `ESP-${Date.now()}`,
      tipo: "especial",
      titulo: "⭐ Fecha Especial",
      obra: "Fecha Especial",
      cliente: "Camila Sepúlveda",
      ciudad: "",
      fecha: fecha,
      hora: "",
      contacto: "Cristian Flores",
      telefono: "",
      notas: "",
      requerimientoSst: "",
      linkReunion: "",
      estado: "pendiente",
      prioridad: "estrella",
      icono: "⭐",
      creadoPor: "Cristian Flores",
      esEspecial: true,
    };

    setCompromisos((prev) => {
      const sinPrevio = (prev || []).filter((c) => !(c.fecha === fecha && esCompromisoEspecial(c)));
      return [payload, ...sinPrevio];
    });

    if (typeof ctx?.saveAllToCloud === "function") {
      ctx.saveAllToCloud().catch((err) => {
        console.warn("No se pudo guardar la estrellita en la nube:", err);
      });
    }

    try {
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(60);
      }
    } catch (_) {}

    setNotificacionEnvio({
      tipo: "success",
      mensaje: `⭐ ¡Estrellita puesta automáticamente para el ${formatFechaLarga(fecha)}! Solo le saldrá a Camila.`,
      accion: {
        label: "Editar dedicatoria ✍️",
        onClick: () => abrirModalEstrellita(fecha, payload),
      },
    });
    setTimeout(() => {
      setNotificacionEnvio((prev) => (prev?.tipo === "success" ? null : prev));
    }, 6000);
  };

  const eliminarFechaEspecial = async (id) => {
    if (await confirmar({ titulo: "¿Deseas quitar esta estrellita y fecha especial?", textoConfirmar: "Quitar", destructivo: true })) {
      setCompromisos((prev) => (prev || []).filter((c) => c.id !== id));
      if (typeof ctx?.saveAllToCloud === "function") {
        ctx.saveAllToCloud().catch((err) => console.warn(err));
      }
      setNotificacionEnvio({
        tipo: "success",
        mensaje: "✓ Estrellita eliminada del calendario.",
      });
      setTimeout(() => {
        setNotificacionEnvio((prev) => (prev?.tipo === "success" ? null : prev));
      }, 4000);
    }
  };

  // Modal de creación / edición de compromiso normal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [itemEdicion, setItemEdicion] = useState(null);
  // La hoja del compromiso sube desde abajo en el telefono.
  const isMobile = useIsMobile();

  const [formTipo, setFormTipo] = useState("visita");
  const [formTitulo, setFormTitulo] = useState("");
  const [formObra, setFormObra] = useState("");
  const [formCliente, setFormCliente] = useState("");
  const [formCiudad, setFormCiudad] = useState("");
  const [formFecha, setFormFecha] = useState(hoyIso);
  const [formHora, setFormHora] = useState("08:00");
  const [formContacto, setFormContacto] = useState("");
  const [formTelefono, setFormTelefono] = useState("");
  const [formCorreo, setFormCorreo] = useState("");
  const [formNotas, setFormNotas] = useState("");
  const [formSst, setFormSst] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formEsEspecial, setFormEsEspecial] = useState(false);
  const [notificacionEnvio, setNotificacionEnvio] = useState(null);

  // Mapeo de eventos por fecha
  const eventosPorFecha = useMemo(() => {
    const map = {};
    compromisosVisibles.forEach((item) => {
      if (!item.fecha) return;
      if (!map[item.fecha]) map[item.fecha] = [];
      map[item.fecha].push(item);
    });
    return map;
  }, [compromisosVisibles]);

  // Cuadrícula del mes
  const celdasMes = useMemo(() => {
    const primerDia = new Date(calMes.anio, calMes.mes, 1);
    const ultimoDia = new Date(calMes.anio, calMes.mes + 1, 0);

    let inicioSemana = primerDia.getDay() - 1;
    if (inicioSemana === -1) inicioSemana = 6;

    const totalDias = ultimoDia.getDate();
    const celdas = [];

    // Días previos
    const diasMesAnterior = new Date(calMes.anio, calMes.mes, 0).getDate();
    for (let i = inicioSemana - 1; i >= 0; i--) {
      celdas.push({
        numero: diasMesAnterior - i,
        otroMes: true,
        iso: null,
      });
    }

    // Días del mes
    for (let d = 1; d <= totalDias; d++) {
      const fecha = new Date(calMes.anio, calMes.mes, d);
      const iso = toIso(fecha);
      const festivo = getFestivoColombia(iso);
      celdas.push({
        numero: d,
        otroMes: false,
        iso,
        esHoy: iso === hoyIso,
        esSeleccionado: iso === fechaSeleccionada,
        festivo,
        esFestivo: Boolean(festivo),
      });
    }

    // Días siguientes hasta completar filas de 7
    let siguiente = 1;
    while (celdas.length % 7 !== 0) {
      celdas.push({
        numero: siguiente++,
        otroMes: true,
        iso: null,
      });
    }

    return celdas;
  }, [calMes, hoyIso, fechaSeleccionada]);

  // Filtrado de compromisos
  const compromisosFiltrados = useMemo(() => {
    return compromisosVisibles.filter((item) => {
      if (filtroTipo === "especial") {
        if (!esCompromisoEspecial(item)) return false;
      } else if (filtroTipo !== "todos" && item.tipo !== filtroTipo) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const texto = `${item.titulo || ""} ${item.obra || ""} ${item.cliente || ""} ${item.contacto || ""} ${item.notas || ""}`.toLowerCase();
        if (!texto.includes(q)) return false;
      }
      return true;
    });
  }, [compromisosVisibles, filtroTipo, busqueda]);

  // Compromisos del día seleccionado
  const eventosDelDia = useMemo(() => {
    return compromisosFiltrados.filter((c) => c.fecha === fechaSeleccionada);
  }, [compromisosFiltrados, fechaSeleccionada]);

  // Conteo de tareas pendientes de hoy
  const estadisticas = useMemo(() => {
    const pendientes = compromisosVisibles.filter(
      (c) => c.fecha === hoyIso && c.estado !== "completado" && !esCompromisoEspecial(c)
    );
    return {
      visitas: pendientes.filter((c) => c.tipo === "visita").length,
      llamadas: pendientes.filter((c) => c.tipo === "llamada").length,
      reuniones: pendientes.filter((c) => c.tipo === "reunion").length,
      coordinaciones: pendientes.filter((c) => c.tipo === "coordinacion").length,
      totalHoy: pendientes.length,
    };
  }, [compromisosVisibles, hoyIso]);

  // Acciones
  const toggleCompletado = (id) => {
    setCompromisos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, estado: c.estado === "completado" ? "pendiente" : "completado" } : c))
    );
  };

  const eliminarCompromiso = async (id) => {
    if (await confirmar({ titulo: "¿Deseas eliminar este compromiso?", textoConfirmar: "Eliminar", destructivo: true })) {
      setCompromisos((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const abrirNuevoModal = (tipoInicial = "visita") => {
    setItemEdicion(null);
    setFormTipo(tipoInicial);
    setFormTitulo("");
    setFormObra("");
    setFormCliente("");
    setFormCiudad("");
    setFormFecha(fechaSeleccionada);
    setFormHora("08:00");
    setFormContacto("");
    setFormTelefono("");
    setFormCorreo("");
    setFormNotas("");
    setFormSst("");
    setFormLink("");
    setFormEsEspecial(false);
    setModalAbierto(true);
  };

  const abrirEditarModal = (item) => {
    setItemEdicion(item);
    setFormTipo(item.tipo || "visita");
    setFormTitulo(item.titulo || "");
    setFormObra(item.obra || "");
    setFormCliente(item.cliente || "");
    setFormCiudad(item.ciudad || "");
    setFormFecha(item.fecha || hoyIso);
    setFormHora(horaA24h(item.hora || "08:00"));
    setFormContacto(item.contacto || "");
    setFormTelefono(item.telefono || "");
    setFormCorreo(item.correoInvitado || "");
    setFormNotas(item.notas || "");
    setFormSst(item.requerimientoSst || "");
    setFormLink(item.linkReunion || "");
    setFormEsEspecial(esCompromisoEspecial(item));
    setModalAbierto(true);
  };

  const guardarCompromiso = (e) => {
    e.preventDefault();
    if (!formTitulo.trim() && !formObra.trim()) {
      alert("Por favor ingresa un título o el nombre de la obra.");
      return;
    }
    const malos = correosInvalidos(formCorreo);
    if (malos.length) {
      alert(`Revisa el correo del invitado: ${malos.join(", ")}`);
      return;
    }
    const invitados = separarCorreos(formCorreo);

    const payload = {
      id: itemEdicion?.id || `AG-${Date.now()}`,
      tipo: formEsEspecial ? "especial" : formTipo,
      titulo: formTitulo.trim() || `${TIPOS_COMPROMISO[formTipo]?.label || "Compromiso"} - ${formObra.trim()}`,
      obra: formObra.trim(),
      cliente: formCliente.trim(),
      ciudad: formCiudad.trim(),
      fecha: formFecha,
      hora: horaA12h(formHora),
      contacto: formContacto.trim(),
      telefono: formTelefono.trim(),
      correoInvitado: invitados.join(", "),
      notas: formNotas.trim(),
      requerimientoSst: formSst.trim(),
      linkReunion: formLink.trim(),
      estado: itemEdicion?.estado || "pendiente",
      prioridad: formEsEspecial ? "estrella" : (itemEdicion?.prioridad || "normal"),
      esEspecial: formEsEspecial,
    };

    setCompromisos((prev) => {
      if (itemEdicion) {
        return prev.map((c) => (c.id === itemEdicion.id ? payload : c));
      }
      return [payload, ...prev];
    });

    if (typeof ctx?.saveAllToCloud === "function") {
      ctx.saveAllToCloud().catch((e) => console.warn(e));
    }

    setModalAbierto(false);

    // Estado visible de envío por correo
    setNotificacionEnvio({
      tipo: "loading",
      mensaje: invitados.length
        ? `Enviando el aviso a Camila y la invitación a ${invitados.join(", ")}...`
        : "Enviando notificación por correo a Camila...",
    });

    // El aviso a Camila y la invitacion a los externos salen a la vez. Si
    // falla uno, el otro igual se envia y el mensaje dice cual fallo.
    Promise.allSettled([
      enviarNotificacionAgendaPorCorreo(payload),
      enviarInvitacionAgenda(payload, invitados),
    ])
      .then(([camila, externos]) => {
        const fallas = [
          camila.status === "rejected" && `a Camila (${camila.reason?.message || "error"})`,
          externos.status === "rejected" && `la invitación (${externos.reason?.message || "error"})`,
        ].filter(Boolean);
        if (fallas.length) throw new Error(`no salió ${fallas.join(" ni ")}`);
        setNotificacionEnvio({
          tipo: "success",
          mensaje: invitados.length
            ? `✓ Aviso enviado a Camila e invitación enviada a ${invitados.join(", ")}`
            : "✓ Notificación enviada por correo a Camila (camilascadavid@gmail.com)",
        });
        setTimeout(() => {
          setNotificacionEnvio((prev) => (prev?.tipo === "success" ? null : prev));
        }, 7000);
      })
      .catch((err) => {
        console.error("Error al enviar notificación de agenda por correo:", err);
        setNotificacionEnvio({
          tipo: "error",
          mensaje: `Compromiso guardado, pero no se pudo enviar el correo: ${err.message || "Error al conectar"}. Puedes usar el botón "Google Calendar" para agendarlo directamente.`,
        });
      });
  };

  const enviarWhatsApp = (c) => {
    let msg = "";
    if (c.tipo === "visita") {
      msg = `Hola ${c.contacto || "Ingeniero(a)"}, te saluda Camila Sepúlveda de Ingeanclajes S.A.S. Te confirmo nuestra visita técnica programada para la obra ${c.obra || ""} a las ${c.hora || ""}.`;
    } else if (c.tipo === "llamada") {
      msg = `Hola ${c.contacto || ""}, te escribe Camila Sepúlveda de Ingeanclajes sobre la obra ${c.obra || ""}. ¿A qué hora nos podemos comunicar hoy?`;
    } else {
      msg = `Hola ${c.contacto || ""}, te escribe Camila Sepúlveda de Ingeanclajes sobre ${c.titulo || c.obra || "nuestro compromiso"}.`;
    }
    const err = abrirWhatsApp(c.telefono, msg);
    if (err) alert(err);
  };

  const abrirWaze = (c) => {
    const q = encodeURIComponent(`${c.obra || ""} ${c.ciudad || ""}`);
    window.open(`https://waze.com/ul?q=${q}`, "_blank", "noopener");
  };

  const mesSiguiente = () => {
    setCalMes((prev) => (prev.mes === 11 ? { anio: prev.anio + 1, mes: 0 } : { ...prev, mes: prev.mes + 1 }));
  };

  const mesAnterior = () => {
    setCalMes((prev) => (prev.mes === 0 ? { anio: prev.anio - 1, mes: 11 } : { ...prev, mes: prev.mes - 1 }));
  };

  const irAHoy = () => {
    const ahora = new Date();
    setCalMes({ anio: ahora.getFullYear(), mes: ahora.getMonth() });
    setFechaSeleccionada(hoyIso);
  };

  return (
    <div style={{ padding: "0 0 24px 0", maxWidth: 1400, margin: "0 auto", position: "relative" }}>
      {/* Toast Notificación de Envío por Correo estilo Apple */}
      {notificacionEnvio && (
        <div
          role="status"
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
            maxWidth: "92vw",
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.18), 0 8px 10px -6px rgba(0,0,0,0.1)",
            background:
              notificacionEnvio.tipo === "success"
                ? "#ecfdf5"
                : notificacionEnvio.tipo === "error"
                ? "#fef2f2"
                : "#ffffff",
            color:
              notificacionEnvio.tipo === "success"
                ? "#065f46"
                : notificacionEnvio.tipo === "error"
                ? "#991b1b"
                : "#1e293b",
            border:
              notificacionEnvio.tipo === "success"
                ? "1px solid #a7f3d0"
                : notificacionEnvio.tipo === "error"
                ? "1px solid #fecaca"
                : "1px solid #e2e8f0",
          }}
        >
          {notificacionEnvio.tipo === "loading" && (
            <span
              style={{
                display: "inline-block",
                width: 14,
                height: 14,
                border: "2px solid #cbd5e1",
                borderTopColor: "#f47c20",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
          )}
          {notificacionEnvio.tipo === "success" && <span style={{ fontSize: 15 }}>✓</span>}
          {notificacionEnvio.tipo === "error" && <span style={{ fontSize: 15 }}>⚠</span>}
          <span>{notificacionEnvio.mensaje}</span>
          {notificacionEnvio.accion && (
            <button
              type="button"
              onClick={() => {
                const act = notificacionEnvio.accion.onClick;
                setNotificacionEnvio(null);
                act?.();
              }}
              style={{
                background: "#fef3c7",
                color: "#92400e",
                border: "1px solid #fde68a",
                borderRadius: 999,
                padding: "3px 10px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
                marginLeft: 4,
              }}
            >
              {notificacionEnvio.accion.label}
            </button>
          )}
          {notificacionEnvio.tipo !== "loading" && (
            <button
              type="button"
              onClick={() => setNotificacionEnvio(null)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                fontWeight: 700,
                color: "inherit",
                marginLeft: 8,
                padding: "2px 4px",
              }}
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Barra de Controles y Filtros estilo Apple Minimalista */}
      <div
        style={{
          ...CD,
          padding: "12px 18px",
          marginBottom: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Fila 1: Estadísticas de hoy + Acciones principales integradas */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Estadísticas rápidas de hoy */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-main, #101828)" }}>
              Hoy para atender:
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: TIPOS_COMPROMISO.visita.bg,
                  color: TIPOS_COMPROMISO.visita.color,
                  border: `1px solid ${TIPOS_COMPROMISO.visita.border}`,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: TIPOS_COMPROMISO.visita.dot }} />
                {estadisticas.visitas} Visitas
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: TIPOS_COMPROMISO.llamada.bg,
                  color: TIPOS_COMPROMISO.llamada.color,
                  border: `1px solid ${TIPOS_COMPROMISO.llamada.border}`,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: TIPOS_COMPROMISO.llamada.dot }} />
                {estadisticas.llamadas} Llamadas
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: TIPOS_COMPROMISO.reunion.bg,
                  color: TIPOS_COMPROMISO.reunion.color,
                  border: `1px solid ${TIPOS_COMPROMISO.reunion.border}`,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: TIPOS_COMPROMISO.reunion.dot }} />
                {estadisticas.reuniones} Reuniones
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 9px",
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: TIPOS_COMPROMISO.coordinacion.bg,
                  color: TIPOS_COMPROMISO.coordinacion.color,
                  border: `1px solid ${TIPOS_COMPROMISO.coordinacion.border}`,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: TIPOS_COMPROMISO.coordinacion.dot }} />
                {estadisticas.coordinaciones} Coordinaciones
              </span>
            </div>
          </div>

          {/* Acciones principales integradas: Selector Calendario / Tareas y Nuevo compromiso */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div
              style={{
                display: "inline-flex",
                background: "var(--surface-subtle, #f1f5f9)",
                padding: 2,
                borderRadius: 8,
                border: "1px solid var(--border, rgba(0,0,0,0.08))",
              }}
            >
              <button
                type="button"
                onClick={() => setVista("mes")}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: vista === "mes" ? "var(--surface, #ffffff)" : "transparent",
                  color: vista === "mes" ? "var(--text-main, #101828)" : "var(--text-muted, #64748b)",
                  boxShadow: vista === "mes" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Calendario
              </button>
              <button
                type="button"
                onClick={() => setVista("agenda")}
                style={{
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: vista === "agenda" ? "var(--surface, #ffffff)" : "transparent",
                  color: vista === "agenda" ? "var(--text-main, #101828)" : "var(--text-muted, #64748b)",
                  boxShadow: vista === "agenda" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  transition: "all 0.15s ease",
                }}
              >
                Lista de Tareas
              </button>
            </div>

            {/* Control exclusivo de Cristian: Simulación de Vista */}
            {esCristianReal && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  background: "linear-gradient(135deg, rgba(254, 243, 199, 0.5), rgba(255, 251, 235, 0.8))",
                  border: "1px solid #fde68a",
                  padding: "2px 6px",
                  borderRadius: 8,
                }}
                title="Herramienta de Cristian Flores: cambia la vista para comprobar cómo se ve el calendario para Camila y para otros usuarios"
              >
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "#92400e", padding: "0 3px" }}>
                  Ver como:
                </span>
                {[
                  { id: "auto", label: "Cristian ⭐" },
                  { id: "camila", label: "Camila 🌸" },
                  { id: "operativo", label: "Otros 👥" },
                ].map((rol) => (
                  <button
                    key={rol.id}
                    type="button"
                    onClick={() => setVistaRolSimulada(rol.id)}
                    style={{
                      padding: "3px 7px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: "none",
                      cursor: "pointer",
                      background: vistaRolSimulada === rol.id ? "#f59e0b" : "transparent",
                      color: vistaRolSimulada === rol.id ? "#ffffff" : "#92400e",
                    }}
                  >
                    {rol.label}
                  </button>
                ))}
              </div>
            )}

            {esCristian && (
              <button
                type="button"
                style={{
                  background: "linear-gradient(135deg, #fef3c7, #fef9c3)",
                  color: "#92400e",
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                  padding: "6px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 1px 3px rgba(245, 158, 11, 0.15)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
                onClick={() => {
                  const fechaEspecialDelDia = eventosDelDia.find(esCompromisoEspecial);
                  abrirModalEstrellita(fechaSeleccionada, fechaEspecialDelDia);
                }}
                title="Poner o editar una estrellita con fecha especial para Camila"
              >
                <span>⭐</span>
                <span>Poner Estrellita</span>
              </button>
            )}

            <button
              type="button"
              style={{
                background: "#f47c20",
                color: "#ffffff",
                border: "none",
                borderRadius: 8,
                padding: "6px 14px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(244, 124, 32, 0.25)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                whiteSpace: "nowrap",
                transition: "opacity 0.15s ease",
              }}
              onClick={() => abrirNuevoModal("visita")}
            >
              + Nuevo compromiso
            </button>
          </div>
        </div>

        {/* Fila 2: Buscador minimalista y filtros de tipo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            paddingTop: 8,
            borderTop: "1px solid var(--border, rgba(0,0,0,0.05))",
          }}
        >
          <div style={{ position: "relative", minWidth: 200, maxWidth: 280, flex: 1 }}>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar obra, cliente..."
              style={{
                ...SI,
                fontSize: 12,
                padding: "6px 28px 6px 10px",
                borderRadius: 8,
              }}
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted, #94a3b8)",
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {[
              { id: "todos", label: "Todos" },
              { id: "visita", label: "Visitas" },
              { id: "llamada", label: "Llamadas" },
              { id: "reunion", label: "Reuniones" },
              { id: "coordinacion", label: "Coordinación" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFiltroTipo(f.id)}
                style={{
                  padding: "5px 10px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  borderRadius: 6,
                  border: "1px solid var(--border, #e2e8f0)",
                  cursor: "pointer",
                  background: filtroTipo === f.id ? "var(--text-main, #101828)" : "var(--surface, #ffffff)",
                  color: filtroTipo === f.id ? "#ffffff" : "var(--text-muted, #64748b)",
                  transition: "all 0.15s ease",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VISTA 1: CALENDARIO MENSUAL ESTILO APPLE CON PANEL LATERAL DE DETALLE */}
      {/* ==================================================================== */}
      {vista === "mes" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: "100%" }}>
          {/* Compromisos del día ARRIBA para visualización inmediata */}
          <CompromisosDelDiaSection
            fechaSeleccionada={fechaSeleccionada}
            formatFechaLarga={formatFechaLarga}
            eventosDelDia={eventosDelDia}
            abrirNuevoModal={abrirNuevoModal}
            toggleCompletado={toggleCompletado}
            abrirEditarModal={abrirEditarModal}
            eliminarCompromiso={eliminarCompromiso}
            enviarWhatsApp={enviarWhatsApp}
            abrirWaze={abrirWaze}
            esCristian={esCristian}
            esCamila={esCamila}
            abrirModalEstrellita={abrirModalEstrellita}
            eliminarFechaEspecial={eliminarFechaEspecial}
          />
          {/* Calendario Mensual Completo ABAJO */}
          <CalendarioMensualSection
            calMes={calMes}
            mesAnterior={mesAnterior}
            irAHoy={irAHoy}
            mesSiguiente={mesSiguiente}
            celdasMes={celdasMes}
            eventosPorFecha={eventosPorFecha}
            fechaSeleccionada={fechaSeleccionada}
            setFechaSeleccionada={setFechaSeleccionada}
            esCristian={esCristian}
            esCamila={esCamila}
            compromisos={compromisosVisibles}
            abrirModalEstrellita={abrirModalEstrellita}
            toggleEstrellitaRapida={toggleEstrellitaRapida}
          />
        </div>
      )}

      {/* ==================================================================== */}
      {/* VISTA 2: LISTA DE TAREAS Y SEGUIMIENTO (CRONOGRAMA LINEAL) */}
      {/* ==================================================================== */}
      {vista === "agenda" && (
        <div style={{ ...CD, padding: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: "var(--text-main, #0f172a)" }}>
              Cronograma de Compromisos ({compromisosFiltrados.length})
            </h3>
            <button
              type="button"
              style={{ ...B("#f47c20"), fontSize: 12, padding: "6px 12px" }}
              onClick={() => abrirNuevoModal("visita")}
            >
              + Nuevo compromiso
            </button>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {compromisosFiltrados.map((item) => {
              const conf = TIPOS_COMPROMISO[item.tipo] || TIPOS_COMPROMISO.visita;
              const completado = item.estado === "completado";

              return (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid var(--border, #e2e8f0)",
                    borderRadius: 12,
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 16,
                    background: completado ? "var(--surface-subtle, #f8fafc)" : "var(--surface, #ffffff)",
                    opacity: completado ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 16, minWidth: 0, flex: 1 }}>
                    {/* Badge de Fecha */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 54,
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: esDiaFestivoColombia(item.fecha) ? "rgba(254, 242, 242, 0.75)" : "var(--surface-subtle, #f1f5f9)",
                        border: esDiaFestivoColombia(item.fecha) ? "1px solid rgba(252, 165, 165, 0.65)" : "1px solid var(--border, #e2e8f0)",
                      }}
                    >
                      <span style={{ fontSize: 10, fontWeight: 700, color: esDiaFestivoColombia(item.fecha) ? "#dc2626" : "var(--text-muted, #64748b)", textTransform: "uppercase" }}>
                        {item.fecha ? MESES[parseIso(item.fecha).getMonth()].slice(0, 3) : "N/A"}
                      </span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: esDiaFestivoColombia(item.fecha) ? "#b91c1c" : "var(--text-main, #0f172a)" }}>
                        {item.fecha ? parseIso(item.fecha).getDate() : "-"}
                      </span>
                    </div>

                    {/* Detalle */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "2px 7px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            background: conf.bg,
                            color: conf.color,
                          }}
                        >
                          <IconoTipo tipo={item.tipo} size={11} />
                          {conf.label}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted, #64748b)" }}>
                          {item.hora}
                        </span>
                        {getFestivoColombia(item.fecha) && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: "#b91c1c",
                              background: "#fee2e2",
                              border: "1px solid #fecaca",
                              padding: "1px 7px",
                              borderRadius: 4,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title={`Festivo: ${getFestivoColombia(item.fecha).nombre}`}
                          >
                            <span>🇨🇴</span>
                            <span>{getFestivoColombia(item.fecha).nombreCorto}</span>
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main, #0f172a)", marginTop: 2 }}>
                        {item.obra || item.titulo}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>
                        {item.cliente} {item.ciudad ? `· ${item.ciudad}` : ""} {item.contacto ? `· Contacto: ${item.contacto}` : ""}
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <a
                      href={generarUrlGoogleCalendar(item)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        ...B("var(--surface-subtle, #f1f5f9)", "var(--text-main, #0f172a)"),
                        fontSize: 11.5,
                        padding: "6px 10px",
                        borderRadius: 6,
                        textDecoration: "none",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        border: "1px solid var(--border, #e2e8f0)",
                      }}
                      title="Añadir a Google Calendar con recordatorio para Camila"
                    >
                      📅 Google Calendar
                    </a>

                    {item.telefono && (
                      <button
                        type="button"
                        onClick={() => enviarWhatsApp(item)}
                        style={{
                          ...B("#25D366"),
                          fontSize: 11.5,
                          padding: "6px 10px",
                          borderRadius: 6,
                        }}
                      >
                        WhatsApp
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => toggleCompletado(item.id)}
                      style={{
                        padding: "6px 12px",
                        fontSize: 12,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: "1px solid var(--border, #e2e8f0)",
                        cursor: "pointer",
                        background: completado ? "#ecfdf5" : "var(--surface, #ffffff)",
                        color: completado ? "#047857" : "var(--text-muted, #64748b)",
                      }}
                    >
                      {completado ? "✓ Realizada" : "Marcar realizada"}
                    </button>
                    <button
                      type="button"
                      onClick={() => abrirEditarModal(item)}
                      style={{
                        padding: "6px 8px",
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border, #e2e8f0)",
                        background: "var(--surface, #ffffff)",
                        cursor: "pointer",
                      }}
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      onClick={() => eliminarCompromiso(item.id)}
                      style={{
                        padding: "6px 8px",
                        fontSize: 12,
                        borderRadius: 6,
                        border: "1px solid var(--border, #e2e8f0)",
                        background: "var(--surface, #ffffff)",
                        cursor: "pointer",
                        color: "#ef4444",
                      }}
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL CREAR / EDITAR COMPROMISO                                       */}
      {/* ==================================================================== */}
      {/* Hoja al estilo de iOS: cabecera y botones fijos, y solo el contenido
          se desplaza. Antes era una caja centrada sin alto maximo: con el
          formulario mas alto que la pantalla se salia por arriba y por abajo,
          y los botones de guardar quedaban fuera de la vista. En el telefono
          sube desde abajo, como las hojas del sistema. */}
      {modalAbierto && (() => {
        const etiqueta = { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 6 };
        const campo = { ...SI, borderRadius: 12 };
        const dosColumnas = { display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 };
        const tipos = Object.entries(TIPOS_COMPROMISO);
        return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.32)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: isMobile ? "flex-end" : "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: isMobile ? 0 : 20,
          }}
          onClick={() => setModalAbierto(false)}
        >
          <div
            data-no-wrap="true"
            role="dialog"
            aria-modal="true"
            aria-label={itemEdicion ? "Editar compromiso" : "Nuevo compromiso"}
            style={{
              background: "var(--surface, #ffffff)",
              borderRadius: isMobile ? "22px 22px 0 0" : 22,
              width: "100%",
              maxWidth: 580,
              maxHeight: isMobile ? "92dvh" : "min(88dvh, 860px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 30px 60px -12px rgba(0, 0, 0, 0.35)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera fija */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: isMobile ? "16px 18px 12px" : "20px 24px 14px", flexShrink: 0 }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em", margin: 0, color: "var(--text-primary)" }}>
                {itemEdicion ? "Editar compromiso" : "Nuevo compromiso"}
              </h3>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                aria-label="Cerrar"
                style={{
                  width: 30, height: 30, borderRadius: "50%", border: "none", cursor: "pointer",
                  background: "var(--fill)", color: "var(--text-secondary)", fontSize: 13,
                  display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            <form data-no-wrap="true" onSubmit={guardarCompromiso} style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
              {/* Contenido: lo unico que se desplaza */}
              <div data-no-wrap="true" style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", padding: isMobile ? "4px 18px 18px" : "4px 24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Tipo de compromiso: control segmentado. Con cinco tipos en una
                    rejilla de cuatro, el quinto caia solo en otra fila. */}
                <div>
                  <span style={etiqueta}>Tipo de compromiso</span>
                  <div
                    className="no-collapse-grid"
                    role="radiogroup"
                    aria-label="Tipo de compromiso"
                    style={{
                      display: "grid",
                      gridTemplateColumns: `repeat(${tipos.length}, minmax(0, 1fr))`,
                      gap: 2, padding: 3, borderRadius: 12, background: "var(--fill)",
                      overflowX: "auto",
                    }}
                  >
                    {tipos.map(([tipoKey, conf]) => {
                      const activo = formTipo === tipoKey;
                      return (
                        <button
                          key={tipoKey}
                          type="button"
                          role="radio"
                          aria-checked={activo}
                          onClick={() => setFormTipo(tipoKey)}
                          style={{
                            padding: isMobile ? "8px 2px" : "8px 4px",
                            fontSize: 11.5,
                            fontWeight: activo ? 600 : 500,
                            borderRadius: 9,
                            border: "none",
                            background: activo ? "var(--surface)" : "transparent",
                            boxShadow: activo ? "0 1px 3px rgba(0,0,0,0.12)" : "none",
                            color: activo ? "var(--text-primary)" : "var(--text-secondary)",
                            cursor: "pointer",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 3,
                            minWidth: 0,
                            transition: "background .15s ease, box-shadow .15s ease",
                          }}
                        >
                          <span style={{ color: activo ? conf.color : "inherit", display: "inline-flex" }}>
                            <IconoTipo tipo={tipoKey} size={15} />
                          </span>
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>
                            {conf.label.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Obra y cliente */}
                <div style={dosColumnas}>
                  <div>
                    <label style={etiqueta}>Obra o proyecto</label>
                    <input type="text" value={formObra} onChange={(e) => setFormObra(e.target.value)}
                      placeholder="Ej. Edificio Samanes" style={campo} required />
                  </div>
                  <div>
                    <label style={etiqueta}>Cliente o empresa</label>
                    <input type="text" value={formCliente} onChange={(e) => setFormCliente(e.target.value)}
                      placeholder="Ej. Constructora Capital" style={campo} />
                  </div>
                </div>

                {/* Fecha y hora */}
                <div style={dosColumnas}>
                  <div>
                    <label style={etiqueta}>Fecha</label>
                    <input type="date" value={formFecha} onChange={(e) => setFormFecha(e.target.value)} style={campo} required />
                    {getFestivoColombia(formFecha) && (
                      <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--danger-text)" }}>
                        Festivo: {getFestivoColombia(formFecha).nombre}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <label style={etiqueta}>Hora</label>
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                        {horaA12h(formHora)}
                      </span>
                    </div>
                    <input type="time" value={formHora} onChange={(e) => setFormHora(e.target.value)}
                      style={{ ...campo, cursor: "pointer" }} required />
                    {/* Horas habituales en obra y comites */}
                    <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginTop: 6, marginLeft: -4 }}>
                      {[
                        { l: "6:00 AM", v: "06:00" },
                        { l: "7:00 AM", v: "07:00" },
                        { l: "8:00 AM", v: "08:00" },
                        { l: "9:00 AM", v: "09:00" },
                        { l: "10:00 AM", v: "10:00" },
                        { l: "2:00 PM", v: "14:00" },
                        { l: "3:30 PM", v: "15:30" },
                      ].map((h) => {
                        const sel = formHora === h.v;
                        return (
                          <button
                            key={h.v}
                            type="button"
                            onClick={() => setFormHora(h.v)}
                            aria-pressed={sel}
                            style={{
                              fontSize: 11.5,
                              fontWeight: sel ? 600 : 400,
                              padding: "4px 9px",
                              borderRadius: 980,
                              border: "none",
                              background: sel ? "var(--text-primary)" : "transparent",
                              color: sel ? "var(--surface)" : "var(--text-secondary)",
                              cursor: "pointer",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {h.l}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Contacto y celular */}
                <div style={dosColumnas}>
                  <div>
                    <label style={etiqueta}>Contacto o residente</label>
                    <input type="text" value={formContacto} onChange={(e) => setFormContacto(e.target.value)}
                      placeholder="Ej. Ing. Juan Buitrago" style={campo} />
                  </div>
                  <div>
                    <label style={etiqueta}>Celular (WhatsApp)</label>
                    <input type="tel" inputMode="tel" value={formTelefono} onChange={(e) => setFormTelefono(e.target.value)}
                      placeholder="Ej. 3160240823" style={campo} />
                  </div>
                </div>

                {/* Correo del invitado: le llega la invitacion de calendario */}
                <div>
                  <label style={etiqueta}>Correo del invitado</label>
                  <input type="text" inputMode="email" autoComplete="email" value={formCorreo}
                    onChange={(e) => setFormCorreo(e.target.value)}
                    placeholder="Ej. residente@constructora.com" style={campo} />
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 6 }}>
                    Le llega la invitación para agregarla a su calendario. Para varios, sepáralos con coma.
                  </div>
                </div>

                {/* Notas */}
                <div>
                  <label style={etiqueta}>Objetivo o notas técnicas</label>
                  <textarea value={formNotas} onChange={(e) => setFormNotas(e.target.value)}
                    placeholder="Detalles sobre anclajes, líneas de vida o temas a coordinar…"
                    rows={3} style={{ ...campo, resize: "vertical", lineHeight: 1.5 }} />
                </div>

                {formTipo === "visita" && (
                  <div>
                    <label style={etiqueta}>Requerimientos SST y permisos de ingreso</label>
                    <input type="text" value={formSst} onChange={(e) => setFormSst(e.target.value)}
                      placeholder="Ej. ARL vigente, cartas de acceso, curso de alturas" style={campo} />
                  </div>
                )}

                {formTipo === "reunion" && (
                  <div>
                    <label style={etiqueta}>Enlace de la reunión (Meet o Teams)</label>
                    <input type="url" value={formLink} onChange={(e) => setFormLink(e.target.value)}
                      placeholder="https://meet.google.com/…" style={campo} />
                  </div>
                )}

                {/* Estrellita: solo para Cristian */}
                {esCristian && (
                  <label
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                      borderRadius: 14, background: "var(--fill)", cursor: "pointer",
                    }}
                  >
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        Fecha especial
                      </span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 1 }}>
                        Se marca con estrellita. Solo la ven Camila y tú.
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={formEsEspecial}
                      onChange={(e) => setFormEsEspecial(e.target.checked)}
                      style={{ accentColor: "var(--text-primary)", width: 18, height: 18, cursor: "pointer", flexShrink: 0 }}
                    />
                  </label>
                )}
              </div>

              {/* Botones fijos: siempre a la vista */}
              <div
                style={{
                  display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8,
                  padding: isMobile ? "12px 18px calc(12px + env(safe-area-inset-bottom))" : "14px 24px",
                  borderTop: "1px solid var(--separator)", flexShrink: 0, background: "var(--surface)",
                }}
              >
                <button type="button" className="ui-btn ui-btn--texto" onClick={() => setModalAbierto(false)}>
                  Cancelar
                </button>
                <button type="submit" className="ui-btn ui-btn--oscuro" style={isMobile ? { flex: 1 } : undefined}>
                  {itemEdicion ? "Guardar cambios" : "Guardar compromiso"}
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* Modal para poner / editar Estrellita en Fecha Especial (Cristian para Camila) */}
      <ModalEstrellitaEspecial
        abierto={modalEstrellitaAbierto}
        onCerrar={() => setModalEstrellitaAbierto(false)}
        fechaInicial={fechaEstrellitaInicial}
        itemEdicion={itemEstrellitaEdicion}
        onGuardar={guardarEstrellita}
        onEliminar={eliminarFechaEspecial}
      />
    </div>
  );
}
