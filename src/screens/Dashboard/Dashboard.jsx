import { useState } from "react";
import { fmt, fmtD, today } from "../../lib/format";
import { getQuoteActiveProposal } from "../../lib/cotizaciones";
import { resumenVencimientos, colorVencimiento, etiquetaVencimiento } from "../../lib/vencimientos";
import { resumenSeguimiento, colorSeguimiento, etiquetaSeguimiento } from "../../lib/seguimientoCotizaciones";
import { puedeVerDinero } from "../../lib/permisos";
import { TarjetaInstalarAppDashboard } from "../../components/pwa/InstaladorApp";
import { formatFechaLegible, generarUrlGoogleCalendar } from "../../lib/agendaEmail";
import { useMediaQuery } from "../../hooks/useMediaQuery";

export default function Dashboard({ ctx, go }) {
  const { obras = [], cotizaciones = [], certs = [], membresia, agenda = [], clientes = [] } = ctx;
  const isMobile = useMediaQuery("(max-width: 768px)");
  const verDinero = puedeVerDinero(membresia);

  const saldoPendiente = obras.reduce((sum, obra) => sum + Number(obra.saldo || 0), 0);
  const recientes = [...cotizaciones]
    .sort((a, b) => String(b.fecha || "").localeCompare(String(a.fecha || "")))
    .slice(0, 4);

  const venc = resumenVencimientos(certs);
  const seg = resumenSeguimiento(cotizaciones);

  const hoyIso = today();
  const eventosHoy = (Array.isArray(agenda) ? agenda : []).filter(
    (item) => item.fecha === hoyIso && item.estado !== "completado"
  );

  const horaActual = new Date().getHours();
  const saludo =
    horaActual < 12 ? "Buenos días" : horaActual < 18 ? "Buenas tardes" : "Buenas noches";
  const primerNombre = (membresia?.nombre || "").split(" ")[0] || "";
  const nombreUsuario =
    primerNombre.toLowerCase().includes("cristian") || !primerNombre
      ? "Camila"
      : primerNombre;

  const obrasActivas = obras.filter(
    (o) => o.estado !== "Cancelada" && o.estado !== "Finalizado" && o.estado !== "Terminada"
  ).length;

  return (
    <div
      style={{
        padding: isMobile ? "16px 14px 40px" : "28px 36px 50px",
        maxWidth: 1360,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility",
      }}
    >
      {/* ============================================================= */}
      {/* CABECERA ESTILO APPLE: Saludo, Fecha y Acciones Rápidas        */}
      {/* ============================================================= */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "flex-start" : "flex-end",
          gap: 16,
          paddingBottom: 20,
          borderBottom: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--text-subtle, #86868b)",
              marginBottom: 4,
            }}
          >
            {formatFechaLegible(hoyIso) || "Centro de Operaciones"}
          </div>

          <h1
            style={{
              fontSize: isMobile ? 26 : 34,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              margin: 0,
              color: "var(--text-main, #1d1d1f)",
              lineHeight: 1.15,
            }}
          >
            {saludo}, {nombreUsuario}
          </h1>

          <p
            style={{
              fontSize: 13.5,
              color: "var(--text-muted, #6e6e73)",
              margin: "6px 0 0",
              lineHeight: 1.45,
            }}
          >
            {eventosHoy.length > 0 ? (
              <>
                Tienes{" "}
                <strong style={{ color: "var(--text-main, #1d1d1f)" }}>
                  {eventosHoy.length} compromiso{eventosHoy.length > 1 ? "s" : ""} hoy
                </strong>
              </>
            ) : (
              "Agenda de hoy al día"
            )}
            {seg.requierenAccion.length > 0 && (
              <>
                {" "}
                y{" "}
                <strong style={{ color: "var(--text-main, #1d1d1f)" }}>
                  {seg.requierenAccion.length} cotización
                  {seg.requierenAccion.length > 1 ? "es" : ""} por llamar
                </strong>
              </>
            )}
            .
          </p>
        </div>

        {/* Botones de acción rápida con estética Apple */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            width: isMobile ? "100%" : "auto",
          }}
        >
          <button
            type="button"
            onClick={() => go("cotizacion")}
            style={{
              background: "var(--text-main, #1d1d1f)",
              color: "#ffffff",
              border: "1px solid transparent",
              borderRadius: 12,
              padding: "9px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              transition: "all 0.16s ease",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            <span>Nueva Cotización</span>
          </button>

          <button
            type="button"
            onClick={() => go("agenda")}
            style={{
              background: "var(--surface, #ffffff)",
              color: "var(--text-main, #1d1d1f)",
              border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
              borderRadius: 12,
              padding: "9px 15px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "all 0.16s ease",
            }}
          >
            <span>📅</span>
            <span>Agendar Visita</span>
          </button>

          <button
            type="button"
            onClick={() => go("clientes")}
            style={{
              background: "var(--surface, #ffffff)",
              color: "var(--text-main, #1d1d1f)",
              border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
              borderRadius: 12,
              padding: "9px 15px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              transition: "all 0.16s ease",
            }}
          >
            <span>👥</span>
            <span>Clientes</span>
          </button>
        </div>
      </div>

      <TarjetaInstalarAppDashboard />

      {/* ============================================================= */}
      {/* GRID DE DOS COLUMNAS PRINCIPAL                                */}
      {/* ============================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1.25fr 1fr",
          gap: 22,
          alignItems: "start",
        }}
      >
        {/* =========================================================== */}
        {/* COLUMNA IZQUIERDA: Cotizaciones Recientes & Accesos         */}
        {/* =========================================================== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Card: Cotizaciones Recientes */}
          <div
            style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
              borderRadius: 18,
              padding: isMobile ? 16 : 22,
              boxShadow: "0 4px 20px -2px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 14,
                marginBottom: 14,
                borderBottom: "1px solid var(--border, rgba(0, 0, 0, 0.06))",
              }}
            >
              <div>
                <h2
                  style={{
                    fontSize: 14.5,
                    fontWeight: 600,
                    margin: 0,
                    color: "var(--text-main, #101828)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Cotizaciones Recientes
                </h2>
                <div style={{ fontSize: 11.5, color: "var(--text-muted, #86868b)", marginTop: 2 }}>
                  Últimas propuestas técnicas emitidas
                </div>
              </div>

              <button
                type="button"
                onClick={() => go("cotizacion")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0071e3",
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  borderRadius: 6,
                }}
              >
                Ver todas &rarr;
              </button>
            </div>

            {recientes.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "30px 16px",
                  color: "var(--text-muted, #86868b)",
                  fontSize: 13,
                }}
              >
                Todavía no hay cotizaciones registradas.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recientes.map((c) => {
                  const activa = getQuoteActiveProposal(c);
                  const aprobada = c.estado === "Aprobada" || Boolean(c.obraId);
                  const estado = c.estado || "Pendiente";
                  const estadoColor = aprobada
                    ? { bg: "rgba(52, 199, 89, 0.12)", text: "#28a745" }
                    : estado === "Borrador"
                    ? { bg: "rgba(142, 142, 147, 0.12)", text: "#8e8e93" }
                    : { bg: "rgba(255, 149, 0, 0.12)", text: "#d97706" };

                  return (
                    <div
                      key={c.id}
                      onClick={() => go("cotizacion")}
                      style={{
                        border: "1px solid var(--border, rgba(0, 0, 0, 0.07))",
                        borderRadius: 14,
                        padding: "13px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 14,
                        background: "var(--surface, #ffffff)",
                        cursor: "pointer",
                        transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#0071e3";
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 6px 16px -4px rgba(0,0,0,0.06)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border, rgba(0, 0, 0, 0.07))";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                              fontSize: 11.5,
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: 5,
                              background: "var(--surface-subtle, #f5f5f7)",
                              color: "var(--text-main, #101828)",
                              border: "1px solid var(--border, rgba(0,0,0,0.08))",
                              fontVariantNumeric: "tabular-nums",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {c.numero || c.id}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-muted, #667085)" }}>
                            {fmtD(c.fecha)}
                            {c.ciudad ? ` · ${c.ciudad}` : ""}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: 999,
                              background: estadoColor.bg,
                              color: estadoColor.text,
                            }}
                          >
                            {aprobada ? "✓ Aprobada" : estado}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: 13.5,
                            fontWeight: 600,
                            color: "var(--text-main, #101828)",
                            letterSpacing: "-0.01em",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.cliente || "Cliente sin nombre"}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 400,
                            color: "var(--text-muted, #475467)",
                            marginTop: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {c.obra || activa.nombre || "Propuesta técnica"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {verDinero && (
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 600,
                              color: "var(--text-main, #101828)",
                              fontVariantNumeric: "tabular-nums",
                              letterSpacing: "-0.01em",
                            }}
                          >
                            {fmt(Number(activa.total || c.total || 0))}
                          </div>
                        )}
                        <span
                          style={{
                            fontSize: 11,
                            color: "#0071e3",
                            fontWeight: 600,
                            marginTop: 2,
                            display: "block",
                          }}
                        >
                          Abrir &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Accesos Rápidos Modulares */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, 1fr)",
              gap: 12,
            }}
          >
            <TarjetaAcceso
              icono="🏗️"
              titulo="Obras en Curso"
              subtitulo={`${obrasActivas} proyecto${obrasActivas === 1 ? "" : "s"} activo${obrasActivas === 1 ? "" : "s"}`}
              onClick={() => go("obras")}
            />
            <TarjetaAcceso
              icono="🛡️"
              titulo="Certificaciones"
              subtitulo="Alturas Res. 4272"
              onClick={() => go("certificaciones")}
            />
            <TarjetaAcceso
              icono="📑"
              titulo="Informes"
              subtitulo="Técnicos & As-built"
              onClick={() => go("informes")}
            />
            <TarjetaAcceso
              icono="💼"
              titulo="Clientes"
              subtitulo={`${clientes.length} registrados`}
              onClick={() => go("clientes")}
            />
          </div>
        </div>

        {/* =========================================================== */}
        {/* COLUMNA DERECHA: Agenda de Hoy & Alertas Operativas          */}
        {/* =========================================================== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Bloque: Visitas & Agenda de Hoy */}
          <div
            style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
              borderRadius: 18,
              padding: isMobile ? 16 : 22,
              boxShadow: "0 4px 20px -2px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 14,
                marginBottom: 14,
                borderBottom: "1px solid var(--border, rgba(0, 0, 0, 0.06))",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#f47c20",
                    display: "inline-block",
                  }}
                />
                <h2
                  style={{
                    fontSize: 14.5,
                    fontWeight: 600,
                    margin: 0,
                    color: "var(--text-main, #101828)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Visitas &amp; Agenda de Hoy
                </h2>
              </div>
              <button
                type="button"
                onClick={() => go("agenda")}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#0071e3",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Abrir agenda &rarr;
              </button>
            </div>

            {eventosHoy.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "26px 14px",
                  background: "var(--surface-subtle, #fbfbfd)",
                  borderRadius: 14,
                  border: "1px dashed var(--border, rgba(0,0,0,0.08))",
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>☕</div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-main, #1d1d1f)",
                  }}
                >
                  Sin compromisos pendientes para hoy
                </div>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--text-muted, #86868b)",
                    marginTop: 4,
                    marginBottom: 12,
                  }}
                >
                  No hay visitas técnicas ni llamadas de seguimiento para esta fecha.
                </div>
                <button
                  type="button"
                  onClick={() => go("agenda")}
                  style={{
                    background: "var(--surface, #ffffff)",
                    border: "1px solid var(--border, rgba(0,0,0,0.12))",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 11.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--text-main, #1d1d1f)",
                  }}
                >
                  + Programar compromiso
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {eventosHoy.map((item) => {
                  const telLimpio = String(item.telefono || "").replace(/\D/g, "");
                  const urlWa = telLimpio
                    ? `https://wa.me/57${telLimpio}?text=${encodeURIComponent(
                        `Hola ${item.contacto || item.cliente || ""}, te saludo de Ingeanclajes respecto al compromiso programado para hoy...`
                      )}`
                    : null;
                  const ubicacion = `${item.direccion || ""} ${item.obra || ""} ${item.ciudad || ""}`.trim();
                  const urlWaze = ubicacion
                    ? `https://waze.com/ul?q=${encodeURIComponent(ubicacion)}&navigate=yes`
                    : null;
                  const urlCal = generarUrlGoogleCalendar(item);

                  return (
                    <div
                      key={item.id}
                      style={{
                        padding: 13,
                        borderRadius: 14,
                        background: "var(--surface-subtle, #fbfbfd)",
                        border: "1px solid var(--border, rgba(0,0,0,0.07))",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 4,
                          fontSize: 11.5,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 700,
                            color: item.tipo === "visita" ? "#f47c20" : "#0071e3",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: "50%",
                              background: item.tipo === "visita" ? "#f47c20" : "#0071e3",
                            }}
                          />
                          {item.hora || "Hora por definir"} · {item.tipo === "visita" ? "Visita a Obra" : "Llamada / Seguimiento"}
                        </span>
                        {item.ciudad && (
                          <span style={{ color: "var(--text-muted, #86868b)" }}>{item.ciudad}</span>
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 13.5,
                          fontWeight: 700,
                          color: "var(--text-main, #1d1d1f)",
                        }}
                      >
                        {item.obra || item.titulo || "Compromiso de obra"}
                      </div>

                      {item.cliente && (
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-muted, #6e6e73)",
                            marginTop: 2,
                          }}
                        >
                          {item.cliente}
                          {item.contacto ? ` · ${item.contacto}` : ""}
                        </div>
                      )}

                      {/* Botones de acción directa 1 toque */}
                      <div
                        style={{
                          display: "flex",
                          gap: 6,
                          alignItems: "center",
                          marginTop: 10,
                          paddingTop: 8,
                          borderTop: "1px solid var(--border, rgba(0,0,0,0.05))",
                          flexWrap: "wrap",
                        }}
                      >
                        {urlWa && (
                          <a
                            href={urlWa}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: "rgba(37, 211, 102, 0.12)",
                              color: "#128C7E",
                              padding: "4px 9px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 700,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <span>WhatsApp</span>
                          </a>
                        )}

                        {urlWaze && item.tipo === "visita" && (
                          <a
                            href={urlWaze}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: "var(--surface, #ffffff)",
                              color: "var(--text-main, #1d1d1f)",
                              border: "1px solid var(--border, rgba(0,0,0,0.1))",
                              padding: "4px 9px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <span>Waze</span>
                          </a>
                        )}

                        {urlCal && (
                          <a
                            href={urlCal}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              background: "var(--surface, #ffffff)",
                              color: "var(--text-main, #1d1d1f)",
                              border: "1px solid var(--border, rgba(0,0,0,0.1))",
                              padding: "4px 9px",
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <span>📅 Cal</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bloque: Alertas Operativas Clave */}
          <div
            style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
              borderRadius: 18,
              padding: isMobile ? 16 : 22,
              boxShadow: "0 4px 20px -2px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02)",
            }}
          >
            <h2
              style={{
                fontSize: 14.5,
                fontWeight: 600,
                letterSpacing: "-0.01em",
                margin: "0 0 14px",
                color: "var(--text-main, #101828)",
                paddingBottom: 14,
                borderBottom: "1px solid var(--border, rgba(0, 0, 0, 0.06))",
              }}
            >
              Alertas Operativas &middot; Atención
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Cobro pendiente */}
              {verDinero && (
                <div
                  style={{
                    background: "var(--surface-subtle, #f8fafc)",
                    border: "1px solid var(--border, rgba(0, 0, 0, 0.07))",
                    borderRadius: 14,
                    padding: "13px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted, #86868b)",
                        textTransform: "uppercase",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Cobro pendiente en obras
                    </div>
                    <div
                      style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: Number(saldoPendiente) > 0 ? "#cc0000" : "#166534",
                        marginTop: 2,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmt(Number(saldoPendiente || 0))}
                    </div>
                  </div>

                  {Number(saldoPendiente) > 0 && (
                    <button
                      type="button"
                      onClick={() => go("obras")}
                      style={{
                        background: "var(--surface, #ffffff)",
                        border: "1px solid var(--border, rgba(0,0,0,0.12))",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        color: "var(--text-main, #1d1d1f)",
                      }}
                    >
                      Ver obras &rarr;
                    </button>
                  )}
                </div>
              )}

              {/* Vencimientos de certificaciones */}
              <div
                style={{
                  background: venc.hayAlgoQueHacer
                    ? "rgba(255, 149, 0, 0.06)"
                    : "var(--surface-subtle, #f8fafc)",
                  border: `1px solid ${
                    venc.hayAlgoQueHacer ? "rgba(255, 149, 0, 0.28)" : "var(--border, rgba(0, 0, 0, 0.07))"
                  }`,
                  borderRadius: 14,
                  padding: "13px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted, #86868b)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Vencimiento de Certificaciones
                  </div>
                  {venc.hayAlgoQueHacer && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#c2410c",
                      }}
                    >
                      {venc.requierenAccion.length} por atender
                    </span>
                  )}
                </div>

                {venc.hayAlgoQueHacer ? (
                  <>
                    <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 11.5 }}>
                      {venc.vencidas.length > 0 && (
                        <span style={{ color: "#ef4444", fontWeight: 700 }}>
                          {venc.vencidas.length} vencida{venc.vencidas.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {venc.urgentes.length > 0 && (
                        <span style={{ color: "#c2410c", fontWeight: 700 }}>
                          {venc.urgentes.length} urgente{venc.urgentes.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {venc.proximas.length > 0 && (
                        <span style={{ color: "#a16207" }}>
                          {venc.proximas.length} próxima{venc.proximas.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                      {venc.destacadas.slice(0, 3).map((cert) => (
                        <div
                          key={cert.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "var(--surface, #ffffff)",
                            border: "1px solid var(--border, rgba(0,0,0,0.08))",
                            borderRadius: 8,
                            padding: "7px 10px",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-main, #1d1d1f)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {cert.cliente || cert.obra || cert.id}
                            </div>
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "var(--text-subtle, #86868b)",
                              }}
                            >
                              {cert.tipoSistema || cert.tipo || "Certificación"}
                              {cert.proxMant ? ` · ${fmtD(cert.proxMant)}` : ""}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: colorVencimiento(cert.diasRestantes),
                              flexShrink: 0,
                            }}
                          >
                            {etiquetaVencimiento(cert.diasRestantes)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => go("vencimientos")}
                      style={{
                        background: "#f47c20",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "8px 14px",
                        width: "100%",
                        cursor: "pointer",
                      }}
                    >
                      Generar recertificación &rarr;
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted, #6e6e73)" }}>
                    Todas las certificaciones de altura están al día.
                  </div>
                )}
              </div>

              {/* Cotizaciones sin respuesta */}
              <div
                style={{
                  background: seg.hayAlgoQueHacer
                    ? "rgba(255, 149, 0, 0.06)"
                    : "var(--surface-subtle, #f8fafc)",
                  border: `1px solid ${
                    seg.hayAlgoQueHacer ? "rgba(255, 149, 0, 0.28)" : "var(--border, rgba(0, 0, 0, 0.07))"
                  }`,
                  borderRadius: 14,
                  padding: "13px 16px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "var(--text-muted, #86868b)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Cotizaciones sin respuesta
                  </div>
                  {seg.hayAlgoQueHacer && (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#c2410c",
                      }}
                    >
                      {seg.requierenAccion.length} por llamar
                    </span>
                  )}
                </div>

                {seg.hayAlgoQueHacer ? (
                  <>
                    <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 11.5 }}>
                      {seg.vencidas.length > 0 && (
                        <span style={{ color: "#ef4444", fontWeight: 700 }}>
                          {seg.vencidas.length} vencida{seg.vencidas.length === 1 ? "" : "s"}
                        </span>
                      )}
                      {seg.porVencer.length > 0 && (
                        <span style={{ color: "#c2410c", fontWeight: 700 }}>
                          {seg.porVencer.length} por vencer
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                      {seg.destacadas.slice(0, 3).map((cot) => (
                        <div
                          key={cot.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            background: "var(--surface, #ffffff)",
                            border: "1px solid var(--border, rgba(0,0,0,0.08))",
                            borderRadius: 8,
                            padding: "7px 10px",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 12,
                                fontWeight: 600,
                                color: "var(--text-main, #1d1d1f)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {cot.cliente || cot.numero || cot.id}
                            </div>
                            <div
                              style={{
                                fontSize: 10.5,
                                color: "var(--text-subtle, #86868b)",
                              }}
                            >
                              {[cot.numero, cot.obra].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: colorSeguimiento(cot.diasParaVencer),
                              flexShrink: 0,
                            }}
                          >
                            {etiquetaSeguimiento(cot.diasParaVencer)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => go("cotizacion")}
                      style={{
                        background: "var(--surface, #ffffff)",
                        color: "var(--text-main, #1d1d1f)",
                        border: "1px solid var(--border, rgba(0,0,0,0.12))",
                        borderRadius: 10,
                        fontSize: 12,
                        fontWeight: 600,
                        padding: "8px 14px",
                        width: "100%",
                        cursor: "pointer",
                      }}
                    >
                      Ver cotizaciones &rarr;
                    </button>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: "var(--text-muted, #6e6e73)" }}>
                    No hay propuestas técnicas pendientes de respuesta comercial.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TarjetaAcceso({ icono, titulo, subtitulo, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface, #ffffff)",
        border: `1px solid ${hover ? "#0071e3" : "var(--border, rgba(0, 0, 0, 0.08))"}`,
        borderRadius: 14,
        padding: "14px 12px",
        cursor: "pointer",
        transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        boxShadow: hover ? "0 8px 20px -4px rgba(0,0,0,0.06)" : "0 1px 3px rgba(0,0,0,0.02)",
      }}
    >
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icono}</div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: "-0.01em",
          color: hover ? "#0071e3" : "var(--text-main, #101828)",
          transition: "color 0.15s ease",
        }}
      >
        {titulo}
      </div>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 400,
          color: "var(--text-muted, #667085)",
          marginTop: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {subtitulo}
      </div>
    </div>
  );
}
