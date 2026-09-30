import { useState, useEffect, useMemo } from "react";
import FototecaObra from "../Obras/FototecaObra";
import Badge from "../../components/ui/Badge";
import { CD, SI, B } from "../../styles/tokens";
import { useIsMobile } from "../../hooks/useMediaQuery";

export default function FototecaScreen({ ctx }) {
  const { obras = [], informes = [], intencion, limpiarIntencion, asegurarDetalle } = ctx;
  const isMobile = useIsMobile();

  const obraIdIntencion = intencion?.pantalla === "fototeca" ? intencion.obraId : null;

  const [busqueda, setBusqueda] = useState("");
  // Inicia sin obra seleccionada por defecto, a menos que venga por intención directa
  const [obraIdSeleccionada, setObraIdSeleccionada] = useState(() => {
    if (obraIdIntencion && obras.some((o) => o.id === obraIdIntencion)) {
      return obraIdIntencion;
    }
    return null;
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

  // Contador de fotos por obra
  const getFotosCount = (o) => {
    if (!o) return 0;
    const bitacora = Array.isArray(o.bitacora) ? o.bitacora : [];
    const fotosBitacora = bitacora.reduce((acc, b) => acc + (b?.fotos?.length || 0), 0);
    const fotosInformes = (informes || [])
      .filter((inf) => inf.obraId === o.id)
      .reduce((acc, inf) => acc + (inf?.actividades || []).reduce((a2, act) => a2 + (act?.fotos?.length || 0), 0), 0);
    return o.totalFotosAvance || Math.max(fotosBitacora + fotosInformes, fotosBitacora);
  };

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

  // Obras sugeridas que tienen fotos para acceso rápido
  const obrasConFotos = useMemo(() => {
    return obras
      .map((o) => ({ ...o, fotosTotal: getFotosCount(o) }))
      .filter((o) => o.fotosTotal > 0)
      .slice(0, 6);
  }, [obras, informes]);

  const obraActual = obraIdSeleccionada ? obras.find((o) => o.id === obraIdSeleccionada) : null;

  return (
    <div
      style={{
        padding: isMobile ? "8px 0 32px" : "16px 0 40px",
        maxWidth: 1200,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* 1. SECCIÓN DE BÚSQUEDA PROMINENTE */}
      {!obraActual && (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, #eaecf0)",
            borderRadius: 16,
            padding: isMobile ? "20px 16px" : "32px 28px",
            marginBottom: 20,
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            width: "100%",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 52,
              height: 52,
              borderRadius: 16,
              background: "rgba(234, 88, 12, 0.1)",
              color: "#ea580c",
              fontSize: 26,
              marginBottom: 12,
            }}
          >
            📸
          </div>

          <h1
            style={{
              fontSize: isMobile ? 20 : 24,
              fontWeight: 800,
              color: "var(--text-main, #101828)",
              margin: 0,
            }}
          >
            Fototeca de Obras
          </h1>
          <p
            style={{
              fontSize: isMobile ? 12.5 : 14,
              color: "var(--text-muted, #667085)",
              maxWidth: 540,
              margin: "6px auto 20px",
              lineHeight: 1.45,
            }}
          >
            Busca y consulta todas las fotografías de avances, bitácoras e informes de cada obra para verlas o descargarlas en alta resolución.
          </p>

          {/* BARRA DE BÚSQUEDA GRANDE Y DESTACADA */}
          <div
            style={{
              position: "relative",
              maxWidth: 640,
              margin: "0 auto 16px",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            <input
              type="text"
              autoFocus={!isMobile}
              placeholder={isMobile ? "🔍 Buscar por cliente o código..." : "🔍 Buscar obra por cliente (ej: Conconcreto), código o ciudad..."}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: "100%",
                height: 50,
                padding: "0 46px 0 16px",
                fontSize: 15,
                fontWeight: 500,
                borderRadius: 12,
                border: "2px solid #ea580c",
                background: "var(--bg-app, #ffffff)",
                color: "var(--text-main, #101828)",
                outline: "none",
                boxShadow: "0 2px 10px rgba(234, 88, 12, 0.12)",
                boxSizing: "border-box",
              }}
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                title="Limpiar búsqueda"
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  fontSize: 16,
                  color: "#94a3b8",
                  cursor: "pointer",
                  padding: "6px 8px",
                  borderRadius: 6,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* SELECTOR DESPLEGABLE ALTERNATIVO SI PREFIERE ELEGIR DE LA LISTA */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              maxWidth: 460,
              margin: "0 auto",
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted, #667085)" }}>
              O selecciona de la lista:
            </span>
            <select
              className="no-full-width"
              value=""
              onChange={(e) => {
                if (e.target.value) setObraIdSeleccionada(e.target.value);
              }}
              style={{
                ...SI,
                width: "auto",
                maxWidth: 280,
                fontSize: 12.5,
                padding: "6px 12px",
                cursor: "pointer",
                borderRadius: 8,
                fontWeight: 600,
              }}
            >
              <option value="" disabled>
                — Seleccionar una obra ({obras.length}) —
              </option>
              {obras.map((o) => {
                const count = getFotosCount(o);
                return (
                  <option key={o.id} value={o.id}>
                    {o.id} · {o.cliente} {count > 0 ? `(${count} fotos)` : ""}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      )}

      {/* 2. SI NO HAY OBRA SELECCIONADA: MOSTRAR RESULTADOS DE BÚSQUEDA O SUGERENCIAS */}
      {!obraActual && (
        <div style={{ width: "100%" }}>
          {busqueda.trim() ? (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                  padding: "0 4px",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted, #475467)" }}>
                  Resultados para "{busqueda}" ({obrasFiltradas.length})
                </span>
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ea580c",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Limpiar filtro
                </button>
              </div>

              {obrasFiltradas.length > 0 ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: 12,
                  }}
                >
                  {obrasFiltradas.map((o) => {
                    const count = getFotosCount(o);
                    return (
                      <div
                        key={o.id}
                        onClick={() => setObraIdSeleccionada(o.id)}
                        style={{
                          background: "var(--surface, #ffffff)",
                          border: "1.5px solid var(--border, #eaecf0)",
                          borderRadius: 12,
                          padding: "14px 16px",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                          boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#ea580c";
                          e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--border, #eaecf0)";
                          e.currentTarget.style.transform = "none";
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#ea580c" }}>{o.id}</span>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main, #101828)" }}>
                              {o.cliente}
                            </div>
                          </div>
                          <Badge estado={o.estado} />
                        </div>

                        {o.proyecto && (
                          <div style={{ fontSize: 12, color: "var(--text-muted, #667085)" }}>
                            {o.proyecto}
                          </div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: 4,
                            paddingTop: 8,
                            borderTop: "1px solid var(--border, #f1f5f9)",
                          }}
                        >
                          <span style={{ fontSize: 11.5, color: "var(--text-muted, #667085)" }}>
                            📍 {o.ciudad || "Colombia"}
                          </span>
                          <span
                            style={{
                              fontSize: 11.5,
                              fontWeight: 700,
                              padding: "3px 8px",
                              borderRadius: 999,
                              background: count > 0 ? "#ecfdf5" : "#f1f5f9",
                              color: count > 0 ? "#047857" : "#64748b",
                            }}
                          >
                            📷 {count} {count === 1 ? "foto" : "fotos"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    background: "var(--surface, #ffffff)",
                    border: "1px dashed var(--border, #cbd5e1)",
                    borderRadius: 14,
                    padding: "32px 20px",
                    textAlign: "center",
                    color: "var(--text-muted, #64748b)",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>
                    No se encontró ninguna obra con el nombre o código "{busqueda}".
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: 12 }}>
                    Verifica la ortografía o intenta buscar por ciudad o cliente.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ACCESOS RÁPIDOS A OBRAS CON FOTOS */
            obrasConFotos.length > 0 && (
              <div
                style={{
                  background: "var(--surface, #ffffff)",
                  border: "1px solid var(--border, #eaecf0)",
                  borderRadius: 14,
                  padding: "16px 18px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "var(--text-muted, #64748b)",
                    }}
                  >
                    Obras recientes con fotografías registradas:
                  </span>
                  <span style={{ fontSize: 11.5, color: "#ea580c", fontWeight: 600 }}>
                    Toca para abrir galería
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 10,
                  }}
                >
                  {obrasConFotos.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => setObraIdSeleccionada(o.id)}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid var(--border, #e2e8f0)",
                        background: "var(--bg-app, #ffffff)",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#ea580c";
                        e.currentTarget.style.background = "rgba(234, 88, 12, 0.03)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--border, #e2e8f0)";
                        e.currentTarget.style.background = "var(--bg-app, #ffffff)";
                      }}
                    >
                      <div style={{ minWidth: 0, overflow: "hidden" }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "var(--text-main, #101828)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {o.id} · {o.cliente}
                        </div>
                        <div
                          style={{
                            fontSize: 11.5,
                            color: "var(--text-muted, #64748b)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {o.proyecto || o.ciudad || "Obra activa"}
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 999,
                          background: "#ecfdf5",
                          color: "#047857",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        📷 {o.fotosTotal} fotos
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* 3. GALERÍA DE LA OBRA ACTIVA SELECCIONADA */}
      {obraActual && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Barra superior de obra seleccionada con botón de cambiar obra */}
          <div
            style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--border, #eaecf0)",
              borderRadius: 14,
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setObraIdSeleccionada(null)}
                style={{
                  background: "#f1f5f9",
                  color: "#334155",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                ← Buscar otra obra
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--text-main, #101828)" }}>
                  {obraActual.id} · {obraActual.cliente}
                </span>
                <Badge estado={obraActual.estado} />
                {obraActual.ciudad && (
                  <span style={{ fontSize: 12, color: "var(--text-muted, #667085)" }}>
                    📍 {obraActual.ciudad}
                  </span>
                )}
              </div>
            </div>

            <div style={{ fontSize: 12, color: "var(--text-muted, #667085)" }}>
              Avance: <strong>{obraActual.avance || 0}%</strong>
            </div>
          </div>

          {/* Galería completa con visor y descargas */}
          <FototecaObra obra={obraActual} ctx={ctx} />
        </div>
      )}
    </div>
  );
}
