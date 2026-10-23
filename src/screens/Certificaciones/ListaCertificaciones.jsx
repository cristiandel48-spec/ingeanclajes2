import { useMemo, useState, useEffect, useRef } from "react";
import { fmtD } from "../../lib/format";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { BarraFija, CABECERA_FIJA } from "../../components/ui";

const ORDENES = [
  {
    key: "recientes",
    label: "Más recientes",
    comparar: (a, b) =>
      enMilis(b.fecha) - enMilis(a.fecha) || String(b.id || "").localeCompare(String(a.id || "")),
  },
  {
    key: "antiguas",
    label: "Más antiguas",
    comparar: (a, b) => enMilis(a.fecha) - enMilis(b.fecha),
  },
  {
    key: "vence",
    label: "Vence antes",
    comparar: (a, b) =>
      String(a.proxMant || "9999-99-99").localeCompare(String(b.proxMant || "9999-99-99")),
  },
  {
    key: "cliente",
    label: "Cliente A–Z",
    comparar: (a, b) =>
      String(a.cliente || "").localeCompare(String(b.cliente || ""), "es"),
  },
];

function enMilis(fecha) {
  if (!fecha) return 0;
  const t = new Date(fecha).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function calcularVigencia(fechaVence) {
  if (!fechaVence) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fechaVence);
  if (isNaN(venc.getTime())) return null;
  const diffDias = Math.ceil((venc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return {
      estado: "vencida",
      dias: diffDias,
      texto: `Vencida (${fmtD(fechaVence)})`,
      color: "#b91c1c",
      bg: "#fef2f2",
      borde: "#fecaca",
      icono: "⚠️",
    };
  }
  if (diffDias <= 60) {
    return {
      estado: "porVencer",
      dias: diffDias,
      texto: diffDias === 0 ? "Vence hoy" : `Vence en ${diffDias} d`,
      color: "#b45309",
      bg: "#fffbeb",
      borde: "#fde68a",
      icono: "⏳",
    };
  }
  return {
    estado: "vigente",
    dias: diffDias,
    texto: `Vigente · hasta ${fmtD(fechaVence)}`,
    color: "#047857",
    bg: "#ecfdf5",
    borde: "#a7f3d0",
    icono: "🛡️",
  };
}

export default function ListaCertificaciones({ certs = [], acciones = {} }) {
  const isMobile = useIsMobile();
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todas");
  const [orden, setOrden] = useState("recientes");
  const [modoVista, setModoVista] = useState(() => {
    try {
      const guardada = localStorage.getItem("ingeanclajes_certificaciones_vista");
      if (guardada) return guardada;
      return "tabla";
    } catch {
      return "tabla";
    }
  });

  const cambiarModoVista = (nuevoModo) => {
    setModoVista(nuevoModo);
    try {
      localStorage.setItem("ingeanclajes_certificaciones_vista", nuevoModo);
    } catch {
      // Ignorar si localStorage no está disponible
    }
  };
  const inputBusquedaRef = useRef(null);

  // Atajo de teclado Spotlight (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputBusquedaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const conteos = useMemo(() => {
    const lista = Array.isArray(certs) ? certs : [];
    let cert = 0;
    let recert = 0;
    let vigentes = 0;
    let porVencer = 0;
    let vencidas = 0;

    lista.forEach((c) => {
      if (c.tipo === "Recertificación") recert++;
      else cert++;

      const v = calcularVigencia(c.proxMant);
      if (v) {
        if (v.estado === "vigente") vigentes++;
        else if (v.estado === "porVencer") porVencer++;
        else if (v.estado === "vencida") vencidas++;
      }
    });

    return {
      todas: lista.length,
      cert,
      recert,
      vigentes,
      porVencer,
      vencidas,
    };
  }, [certs]);

  const certsFiltradas = useMemo(() => {
    let res = Array.isArray(certs) ? [...certs] : [];

    // Filtro por pestaña segmentada
    if (estadoFiltro === "Certificación") {
      res = res.filter((c) => c.tipo !== "Recertificación");
    } else if (estadoFiltro === "Recertificación") {
      res = res.filter((c) => c.tipo === "Recertificación");
    } else if (estadoFiltro === "Vigentes") {
      res = res.filter((c) => calcularVigencia(c.proxMant)?.estado === "vigente");
    } else if (estadoFiltro === "Por Vencer") {
      res = res.filter((c) => calcularVigencia(c.proxMant)?.estado === "porVencer");
    } else if (estadoFiltro === "Vencidas") {
      res = res.filter((c) => calcularVigencia(c.proxMant)?.estado === "vencida");
    }

    // Filtro de búsqueda Spotlight
    const q = busqueda.trim().toLowerCase();
    if (q) {
      res = res.filter((c) => {
        const texto = [
          c.numero,
          c.id,
          c.cliente,
          c.lugar,
          c.obraId,
          c.sistema,
          c.tipo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return texto.includes(q);
      });
    }

    // Ordenamiento
    const regla = ORDENES.find((o) => o.key === orden) || ORDENES[0];
    res.sort(regla.comparar);

    return res;
  }, [certs, estadoFiltro, busqueda, orden]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1360,
        margin: "0 auto",
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        WebkitFontSmoothing: "antialiased",
        position: "relative",
      }}
    >
      {/* Barra de herramientas estilo Apple macOS, fija arriba al bajar */}
      <BarraFija>
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: 14,
          marginBottom: 10,
          flexWrap: "wrap",
        }}
      >
        {/* Selector Segmentado de Filtros */}
        <div
          style={{
            background: "var(--surface-subtle, #f5f5f7)",
            padding: 3,
            borderRadius: 12,
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            overflowX: "auto",
            maxWidth: "100%",
          }}
        >
          <BotonSegmentado
            activo={estadoFiltro === "Todas"}
            onClick={() => setEstadoFiltro("Todas")}
            label={`Todas (${conteos.todas})`}
          />
          <BotonSegmentado
            activo={estadoFiltro === "Certificación"}
            onClick={() => setEstadoFiltro("Certificación")}
            label={`Certificación (${conteos.cert})`}
          />
          <BotonSegmentado
            activo={estadoFiltro === "Recertificación"}
            onClick={() => setEstadoFiltro("Recertificación")}
            label={`Recertificación (${conteos.recert})`}
          />
          <BotonSegmentado
            activo={estadoFiltro === "Vigentes"}
            onClick={() => setEstadoFiltro("Vigentes")}
            label={`Vigentes (${conteos.vigentes})`}
          />
          <BotonSegmentado
            activo={estadoFiltro === "Por Vencer"}
            onClick={() => setEstadoFiltro("Por Vencer")}
            label={`Por Vencer (${conteos.porVencer})`}
          />
          {conteos.vencidas > 0 && (
            <BotonSegmentado
              activo={estadoFiltro === "Vencidas"}
              onClick={() => setEstadoFiltro("Vencidas")}
              label={`Vencidas (${conteos.vencidas})`}
            />
          )}
        </div>

        {/* Buscador Spotlight, Orden y Conmutador de Vistas */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: isMobile ? "wrap" : "nowrap",
            width: isMobile ? "100%" : "auto",
          }}
        >
          {/* Input de Búsqueda Spotlight */}
          <div
            style={{
              position: "relative",
              flex: isMobile ? "1 1 100%" : "0 0 280px",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 13,
                color: "var(--text-subtle, #86868b)",
                pointerEvents: "none",
              }}
            >
              🔍
            </span>
            <input
              ref={inputBusquedaRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número, cliente, obra o sistema..."
              style={{
                width: "100%",
                padding: "8px 28px 8px 32px",
                fontSize: 12.5,
                borderRadius: 10,
                border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
                background: "var(--surface, #ffffff)",
                color: "var(--text-main, #1d1d1f)",
                outline: "none",
                boxSizing: "border-box",
                transition: "all 0.15s ease",
              }}
            />
            {busqueda ? (
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
                  color: "var(--text-subtle, #86868b)",
                  fontSize: 12,
                  padding: 2,
                }}
              >
                ✕
              </button>
            ) : !isMobile ? (
              <span
                className="kbd-ctrl-k"
                data-kbd-shortcut="true"
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 10,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  color: "var(--text-subtle, #86868b)",
                  background: "var(--surface-subtle, #f5f5f7)",
                  border: "1px solid var(--border, rgba(0,0,0,0.08))",
                  padding: "1px 4px",
                  borderRadius: 4,
                  pointerEvents: "none",
                }}
              >
                {typeof navigator !== "undefined" && navigator.platform?.toUpperCase().indexOf("MAC") >= 0 ? "⌘K" : "Ctrl K"}
              </span>
            ) : null}
          </div>

          {/* Selector de Orden */}
          <select
            value={orden}
            onChange={(e) => setOrden(e.target.value)}
            style={{
              padding: "7px 10px",
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
              background: "var(--surface, #ffffff)",
              color: "var(--text-main, #1d1d1f)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {ORDENES.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Conmutador Cuadrícula / Lista */}
          <div
            style={{
              background: "var(--surface-subtle, #f5f5f7)",
              padding: 2,
              borderRadius: 8,
              border: "1px solid var(--border, rgba(0,0,0,0.08))",
              display: "inline-flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <button
              type="button"
              onClick={() => cambiarModoVista("tabla")}
              title="Vista en tabla"
              style={{
                background: modoVista === "tabla" ? "#ffffff" : "transparent",
                color: modoVista === "tabla" ? "#1d1d1f" : "#86868b",
                border: "none",
                borderRadius: 6,
                padding: "5px 8px",
                cursor: "pointer",
                boxShadow: modoVista === "tabla" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => cambiarModoVista("cuadricula")}
              title="Vista en cuadrícula"
              style={{
                background: modoVista === "cuadricula" ? "#ffffff" : "transparent",
                color: modoVista === "cuadricula" ? "#1d1d1f" : "#86868b",
                border: "none",
                borderRadius: 6,
                padding: "5px 8px",
                cursor: "pointer",
                boxShadow: modoVista === "cuadricula" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      </BarraFija>

      {/* Listado de Certificaciones */}
      {certsFiltradas.length === 0 ? (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            borderRadius: 16,
            padding: "48px 24px",
            textAlign: "center",
            boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 10 }}>🛡️</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main, #1d1d1f)", marginBottom: 4 }}>
            No se encontraron certificaciones
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted, #6e6e73)", maxWidth: 420, margin: "0 auto" }}>
            {busqueda
              ? `No hay ninguna certificación que coincida con "${busqueda}". Prueba con otro término.`
              : "Las certificaciones de calidad se emiten una vez finalizadas las obras y aprobados los informes técnicos."}
          </p>
        </div>
      ) : modoVista === "cuadricula" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 16,
          }}
        >
          {certsFiltradas.map((c) => (
            <TarjetaCertificacionApple
              key={c.id}
              cert={c}
              acciones={acciones}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            borderRadius: 16,
            // En escritorio clip y no auto: auto no deja pegar los titulos al bajar.
            ...(isMobile ? { overflowX: "auto" } : { overflow: "clip" }),
            boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div style={{ minWidth: 880 }}>
            {/* Cabecera de la tabla */}
            <div
              style={{
                ...CABECERA_FIJA,
                display: "grid",
                gridTemplateColumns: "105px minmax(200px, 2.2fr) 130px 160px minmax(180px, 2fr) 120px",
                padding: "10px 16px",
                background: "var(--surface-subtle, #f5f5f7)",
                borderBottom: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
                fontSize: 11,
                fontWeight: 700,
                color: "var(--text-subtle, #86868b)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              <div>Documento</div>
              <div>Cliente & Obra</div>
              <div>Tipo</div>
              <div>Vigencia</div>
              <div>Sistema Certificado</div>
              <div style={{ textAlign: "right" }}>Acciones</div>
            </div>

            {certsFiltradas.map((c, idx) => (
              <FilaTablaCertificacion
                key={c.id}
                cert={c}
                acciones={acciones}
                zebra={idx % 2 === 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pie de lista: Contador y resumen */}
      {certsFiltradas.length > 0 && (
        <div
          style={{
            marginTop: 18,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12,
            color: "var(--text-subtle, #86868b)",
            padding: "0 4px",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <span>
            Mostrando <strong>{certsFiltradas.length}</strong> de <strong>{certs.length}</strong> certificaciones
          </span>
          <span style={{ fontSize: 11.5 }}>
            🛡️ Certificaciones vigentes según Resolución 4272 de 2021
          </span>
        </div>
      )}
    </div>
  );
}

function BotonSegmentado({ activo, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: activo ? "#ffffff" : "transparent",
        color: activo ? "#1d1d1f" : "#6e6e73",
        border: "none",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: activo ? 600 : 500,
        padding: "5px 12px",
        cursor: "pointer",
        boxShadow: activo ? "0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)" : "none",
        transition: "all 0.15s ease",
        whiteSpace: "nowrap",
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {label}
    </button>
  );
}

function TarjetaCertificacionApple({ cert: c, acciones }) {
  const isMobile = useIsMobile();
  const [hover, setHover] = useState(false);
  const recert = c.tipo === "Recertificación";
  const cliente = normalizarRazonSocial(c.cliente);
  const lugar = String(c.lugar || "").trim();
  const repetido =
    lugar &&
    lugar.replace(/[.\s]/g, "").toUpperCase() === cliente.replace(/[.\s]/g, "").toUpperCase();
  const subtitulo = [repetido ? "" : lugar, c.obraId].filter(Boolean).join(" · ");
  const semaforo = calcularVigencia(c.proxMant);

  const alPulsar = (fn) => (e) => {
    e.stopPropagation();
    fn?.(c);
  };

  return (
    <div
      onClick={() => acciones.ver?.(c)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface, #ffffff)",
        border: `1px solid ${hover ? "#0071e3" : "var(--border, rgba(0, 0, 0, 0.08))"}`,
        borderRadius: 16,
        padding: isMobile ? "14px 16px" : "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        cursor: "pointer",
        boxShadow: hover
          ? "0 10px 24px -6px rgba(0, 0, 0, 0.06), 0 2px 6px -2px rgba(0, 0, 0, 0.04)"
          : "0 2px 8px -2px rgba(0, 0, 0, 0.02)",
        transform: hover ? "translateY(-1px)" : "none",
        transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
        position: "relative",
      }}
    >
      {/* Fila Superior: Tipo, Código Monospace y Semáforo de Vigencia */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Tipo de Documento */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 6,
              background: recert ? "#f5f3ff" : "#eff6ff",
              color: recert ? "#6d28d9" : "#1d4ed8",
              border: `1px solid ${recert ? "#ddd6fe" : "#bfdbfe"}`,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>{recert ? "🔄" : "🛡️"}</span>
            <span>{c.tipo || "Certificación"}</span>
          </span>

          {/* Código Monospace */}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 7px",
              borderRadius: 6,
              background: "var(--surface-subtle, #f5f5f7)",
              color: "var(--text-subtle, #55555a)",
              border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {c.numero || c.id}
          </span>
        </div>

        {/* Semáforo de Vigencia Comercial */}
        {semaforo && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: semaforo.color,
              background: semaforo.bg,
              border: `1px solid ${semaforo.borde}`,
              borderRadius: 6,
              padding: "2px 8px",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              whiteSpace: "nowrap",
            }}
          >
            <span>{semaforo.icono}</span>
            <span>{semaforo.texto}</span>
          </span>
        )}
      </div>

      {/* Titular: Cliente & Obra */}
      <div>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-main, #1d1d1f)",
            lineHeight: 1.3,
            marginBottom: 2,
          }}
        >
          {cliente || "Cliente sin registrar"}
        </div>
        {subtitulo ? (
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted, #6e6e73)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            <span>📍</span>
            <span>{subtitulo}</span>
          </div>
        ) : (
          <div style={{ fontSize: 11.5, color: "var(--text-subtle, #86868b)" }}>
            Emitido el {fmtD(c.fecha) || "—"}
          </div>
        )}
      </div>

      {/* Vista previa del Sistema o Elementos Certificados */}
      {c.sistema && (
        <div
          style={{
            background: "var(--surface-subtle, #f8f9fa)",
            border: "1px solid var(--border, rgba(0,0,0,0.06))",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 11.5,
            lineHeight: 1.45,
            color: "var(--text-main, #333336)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {c.sistema}
        </div>
      )}

      {/* Métricas y Datos Clave */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontSize: 11.5,
          color: "var(--text-subtle, #86868b)",
          paddingTop: 4,
          flexWrap: "wrap",
        }}
      >
        <span>📅 Emisión: <strong style={{ color: "var(--text-main, #1d1d1f)" }}>{fmtD(c.fecha) || "—"}</strong></span>
        {c.proxMant && (
          <span>⏳ Próx. mant.: <strong style={{ color: semaforo ? semaforo.color : "var(--text-main, #1d1d1f)" }}>{fmtD(c.proxMant)}</strong></span>
        )}
        {Array.isArray(c.elementos) && c.elementos.length > 0 && (
          <span>{c.elementos.length} comp.</span>
        )}
      </div>

      {/* Botonera de Acciones Apple */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 10,
          borderTop: "1px solid var(--border, rgba(0, 0, 0, 0.06))",
          marginTop: "auto",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={alPulsar(acciones.ver)}
          style={{
            background: "#1d1d1f",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            padding: "7px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
          }}
        >
          <span>Ver Certificado</span>
          <span style={{ fontSize: 13 }}>→</span>
        </button>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {acciones.editar && (
            <button
              type="button"
              onClick={alPulsar(acciones.editar)}
              style={{
                background: "var(--surface, #ffffff)",
                color: "var(--text-main, #101828)",
                border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
                borderRadius: 10,
                padding: "7px 11px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Editar
            </button>
          )}

          {(acciones.descargarPdf || acciones.imprimir) && (
            <button
              type="button"
              onClick={alPulsar(acciones.descargarPdf || acciones.imprimir)}
              title="Descargar o imprimir PDF oficial"
              style={{
                background: "transparent",
                color: "var(--text-muted, #6e6e73)",
                border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
                borderRadius: 10,
                padding: "7px 10px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>PDF</span>
            </button>
          )}

          {acciones.eliminar && (
            <button
              type="button"
              onClick={alPulsar(acciones.eliminar)}
              title="Eliminar la certificación"
              style={{
                background: "transparent",
                color: "var(--danger, #b3261e)",
                border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
                borderRadius: 10,
                padding: "7px 10px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FilaTablaCertificacion({ cert: c, acciones, zebra }) {
  const [hover, setHover] = useState(false);
  const recert = c.tipo === "Recertificación";
  const cliente = normalizarRazonSocial(c.cliente);
  const lugar = String(c.lugar || "").trim();
  const repetido =
    lugar &&
    lugar.replace(/[.\s]/g, "").toUpperCase() === cliente.replace(/[.\s]/g, "").toUpperCase();
  const subtitulo = [repetido ? "" : lugar, c.obraId].filter(Boolean).join(" · ");
  const semaforo = calcularVigencia(c.proxMant);

  const alPulsar = (fn) => (e) => {
    e.stopPropagation();
    fn?.(c);
  };

  return (
    <div
      onClick={() => acciones.ver?.(c)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "105px minmax(200px, 2.2fr) 130px 160px minmax(180px, 2fr) 120px",
        alignItems: "center",
        padding: "11px 16px",
        background: hover
          ? "var(--surface-hover, #f8f9fa)"
          : zebra
          ? "var(--surface-subtle, #fafafa)"
          : "var(--surface, #ffffff)",
        borderBottom: "1px solid var(--border, rgba(0, 0, 0, 0.06))",
        cursor: "pointer",
        transition: "background 0.12s ease",
        fontSize: 12.5,
      }}
    >
      {/* Documento */}
      <div>
        <span
          style={{
            fontVariantNumeric: "tabular-nums",
            fontWeight: 700,
            fontSize: 11.5,
            color: "var(--text-main, #1d1d1f)",
            background: "var(--surface-subtle, #f5f5f7)",
            padding: "2px 6px",
            borderRadius: 6,
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
          }}
        >
          {c.numero || c.id}
        </span>
      </div>

      {/* Cliente & Obra */}
      <div style={{ minWidth: 0, paddingRight: 12 }}>
        <div
          style={{
            fontWeight: 600,
            color: "var(--text-main, #1d1d1f)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cliente || "Cliente sin registrar"}
        </div>
        {subtitulo && (
          <div
            style={{
              fontSize: 11,
              color: "var(--text-subtle, #86868b)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitulo}
          </div>
        )}
      </div>

      {/* Tipo */}
      <div>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            padding: "2px 7px",
            borderRadius: 6,
            background: recert ? "#f5f3ff" : "#eff6ff",
            color: recert ? "#6d28d9" : "#1d4ed8",
            border: `1px solid ${recert ? "#ddd6fe" : "#bfdbfe"}`,
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
            whiteSpace: "nowrap",
          }}
        >
          <span>{recert ? "🔄" : "🛡️"}</span>
          <span>{c.tipo || "Certificación"}</span>
        </span>
      </div>

      {/* Vigencia & Próx. Mantenimiento */}
      <div style={{ minWidth: 0, paddingRight: 8 }}>
        {semaforo ? (
          <div>
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: semaforo.color,
                background: semaforo.bg,
                border: `1px solid ${semaforo.borde}`,
                borderRadius: 6,
                padding: "2px 7px",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                whiteSpace: "nowrap",
              }}
            >
              <span>{semaforo.icono}</span>
              <span>
                {semaforo.estado === "vigente"
                  ? "Vigente"
                  : semaforo.estado === "porVencer"
                  ? (semaforo.dias === 0 ? "Vence hoy" : `Vence en ${semaforo.dias}d`)
                  : "Vencida"}
              </span>
            </span>
            {c.proxMant && (
              <div
                style={{
                  fontSize: 10.5,
                  color: "var(--text-subtle, #86868b)",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                }}
              >
                Hasta {fmtD(c.proxMant)}
              </div>
            )}
          </div>
        ) : (
          <span style={{ fontSize: 11, color: "var(--text-subtle, #86868b)" }}>
            {c.fecha ? fmtD(c.fecha) : "—"}
          </span>
        )}
      </div>

      {/* Sistema Certificado */}
      <div
        style={{
          minWidth: 0,
          fontSize: 11.5,
          color: "var(--text-muted, #475467)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          paddingRight: 10,
        }}
        title={c.sistema}
      >
        {c.sistema || "—"}
      </div>

      {/* Acciones */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, alignItems: "center" }}>
        <button
          type="button"
          onClick={alPulsar(acciones.ver)}
          style={{
            background: "#1d1d1f",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            padding: "4px 9px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Ver
        </button>
        {(acciones.descargarPdf || acciones.imprimir) && (
          <button
            type="button"
            onClick={alPulsar(acciones.descargarPdf || acciones.imprimir)}
            title="Descargar PDF oficial"
            style={{
              background: "transparent",
              color: "#16a34a",
              border: "1px solid rgba(22, 163, 74, 0.3)",
              borderRadius: 8,
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            PDF
          </button>
        )}
        {acciones.editar && (
          <button
            type="button"
            onClick={alPulsar(acciones.editar)}
            style={{
              background: "transparent",
              color: "var(--text-muted, #475467)",
              border: "1px solid var(--border, rgba(0,0,0,0.12))",
              borderRadius: 8,
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Editar
          </button>
        )}
        {acciones.eliminar && (
          <button
            type="button"
            onClick={alPulsar(acciones.eliminar)}
            title="Eliminar la certificación"
            style={{
              background: "transparent",
              color: "var(--danger, #b3261e)",
              border: "1px solid var(--border, rgba(0,0,0,0.12))",
              borderRadius: 8,
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}