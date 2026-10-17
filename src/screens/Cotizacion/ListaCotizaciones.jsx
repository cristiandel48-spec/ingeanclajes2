import { useMemo, useState, useEffect, useRef } from "react";
import { fmt, fmtD } from "../../lib/format";
import { normalizarMayusculas, normalizarRazonSocial } from "../../lib/normalizarEntrada";
import {
  seguimientoDe,
  colorSeguimiento,
  etiquetaSeguimiento,
  UMBRAL_POR_VENCER,
} from "../../lib/seguimientoCotizaciones";
import { getQuoteActiveProposal } from "../../lib/cotizaciones";
import { useMediaQuery, useIsMobile } from "../../hooks/useMediaQuery";

const ORDENES = [
  {
    key: "recientes",
    label: "Más recientes",
    comparar: (a, b) =>
      enMilis(b.fecha) - enMilis(a.fecha) || String(b.id).localeCompare(String(a.id)),
  },
  {
    key: "antiguas",
    label: "Más antiguas",
    comparar: (a, b) => enMilis(a.fecha) - enMilis(b.fecha),
  },
  {
    key: "cliente",
    label: "Cliente A–Z",
    comparar: (a, b) =>
      String(a.cliente || "").localeCompare(String(b.cliente || ""), "es"),
  },
  {
    key: "numero",
    label: "Número",
    comparar: (a, b) =>
      String(a.numero || a.id).localeCompare(String(b.numero || b.id), "es", { numeric: true }),
  },
];

function enMilis(fecha) {
  if (!fecha) return 0;
  const t = new Date(fecha).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export default function ListaCotizaciones({ cotizaciones = [], acciones = {} }) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todas");
  const [obraFiltro, setObraFiltro] = useState("todas");
  const [seguimientoFiltro, setSeguimientoFiltro] = useState("todas");
  const [ordenActivo, setOrdenActivo] = useState("recientes");
  // Predeterminado en lista (tabla) en escritorio y tarjetas en móvil, persistiendo preferencia
  const [vista, setVista] = useState(() => {
    try {
      const guardada = localStorage.getItem("ingeanclajes_cotizaciones_vista");
      if (guardada) return guardada;
      if (typeof window !== "undefined" && window.innerWidth <= 768) return "tarjetas";
      return "tabla";
    } catch {
      return "tabla";
    }
  });

  const cambiarVista = (nuevaVista) => {
    setVista(nuevaVista);
    try {
      localStorage.setItem("ingeanclajes_cotizaciones_vista", nuevaVista);
    } catch {
      // Ignorar si localStorage no está disponible
    }
  };

  // Inspector lateral interactivo (Slide-Over horizontal)
  const [cotizacionInspector, setCotizacionInspector] = useState(null);
  const [inspectorExpandido, setInspectorExpandido] = useState(false);

  const campoBusquedaRef = useRef(null);

  // Atajo de teclado Cmd+K / Ctrl+K estilo Spotlight
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        campoBusquedaRef.current?.focus();
      }
      if (e.key === "Escape" && cotizacionInspector) {
        setCotizacionInspector(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cotizacionInspector]);

  // Lista de obras únicas para el filtro
  const obras = useMemo(() => {
    return [
      ...new Set(
        (cotizaciones || []).map((c) => String(c.obra || "").trim()).filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b, "es"));
  }, [cotizaciones]);

  // Conteos para el Segmented Control
  const conteos = useMemo(() => {
    const lista = cotizaciones || [];
    return {
      todas: lista.length,
      pendientes: lista.filter((c) => c.estado !== "Aprobada" && c.estado !== "Borrador").length,
      aprobadas: lista.filter((c) => c.estado === "Aprobada" || Boolean(c.obraId)).length,
      borradores: lista.filter((c) => c.estado === "Borrador").length,
    };
  }, [cotizaciones]);

  // Filtrado y ordenamiento de las cotizaciones
  const filtradas = useMemo(() => {
    let res = [...(cotizaciones || [])];

    // 1. Filtro por estado
    if (estadoFiltro === "Pendientes") {
      res = res.filter((c) => c.estado !== "Aprobada" && c.estado !== "Borrador");
    } else if (estadoFiltro === "Aprobadas") {
      res = res.filter((c) => c.estado === "Aprobada" || Boolean(c.obraId));
    } else if (estadoFiltro === "Borrador") {
      res = res.filter((c) => c.estado === "Borrador");
    }

    // 2. Filtro por obra
    if (obraFiltro !== "todas") {
      res = res.filter((c) => String(c.obra || "").trim() === obraFiltro);
    }

    // 3. Filtro por seguimiento
    if (seguimientoFiltro !== "todas") {
      res = res.filter((c) => {
        const { diasParaVencer } = seguimientoDe(c);
        if (diasParaVencer === null) return false;
        if (seguimientoFiltro === "vencidas") return diasParaVencer < 0;
        if (seguimientoFiltro === "llamar") return diasParaVencer <= UMBRAL_POR_VENCER;
        if (seguimientoFiltro === "alDia") return diasParaVencer > UMBRAL_POR_VENCER;
        return true;
      });
    }

    // 4. Búsqueda de texto (Spotlight)
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      res = res.filter((c) => {
        const texto = [c.numero, c.id, c.cliente, c.obra, c.ciudad]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return texto.includes(q);
      });
    }

    // 5. Ordenamiento
    const ordObj = ORDENES.find((o) => o.key === ordenActivo) || ORDENES[0];
    res.sort(ordObj.comparar);

    return res;
  }, [cotizaciones, estadoFiltro, obraFiltro, seguimientoFiltro, busqueda, ordenActivo]);

  return (
    <div
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility",
        position: "relative",
      }}
    >
      {/* ============================================================= */}
      {/* BARRA DE HERRAMIENTAS: Búsqueda, Filtros y Segmented Control  */}
      {/* ============================================================= */}
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: 14,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {/* Selector Segmentado de Estados (Estilo Apple macOS) */}
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
            activo={estadoFiltro === "Pendientes"}
            onClick={() => setEstadoFiltro("Pendientes")}
            label={`Pendientes (${conteos.pendientes})`}
          />
          <BotonSegmentado
            activo={estadoFiltro === "Aprobadas"}
            onClick={() => setEstadoFiltro("Aprobadas")}
            label={`Aprobadas (${conteos.aprobadas})`}
          />
          <BotonSegmentado
            activo={estadoFiltro === "Borrador"}
            onClick={() => setEstadoFiltro("Borrador")}
            label={`Borrador (${conteos.borradores})`}
          />
        </div>

        {/* Buscador Spotlight y Conmutador de Vistas */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: isMobile ? "wrap" : "nowrap",
            width: isMobile ? "100%" : "auto",
          }}
        >
          {/* Input de Búsqueda estilo Spotlight */}
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
              ref={campoBusquedaRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por cliente, obra o N°..."
              style={{
                width: "100%",
                padding: "8px 36px 8px 32px",
                borderRadius: 10,
                border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
                background: "var(--surface, #ffffff)",
                color: "var(--text-main, #1d1d1f)",
                fontSize: 12.5,
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
                  fontSize: 14,
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
              flexShrink: 0,
            }}
          >
            <button
              type="button"
              onClick={() => cambiarVista("tarjetas")}
              title="Vista de cuadrícula Apple"
              style={{
                border: "none",
                borderRadius: 6,
                padding: "5px 8px",
                background: vista === "tarjetas" ? "var(--surface, #ffffff)" : "transparent",
                color: vista === "tarjetas" ? "var(--text-main, #1d1d1f)" : "var(--text-muted, #86868b)",
                boxShadow: vista === "tarjetas" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ⊞
            </button>
            <button
              type="button"
              onClick={() => cambiarVista("tabla")}
              title="Vista de lista"
              style={{
                border: "none",
                borderRadius: 6,
                padding: "5px 8px",
                background: vista === "tabla" ? "var(--surface, #ffffff)" : "transparent",
                color: vista === "tabla" ? "var(--text-main, #1d1d1f)" : "var(--text-muted, #86868b)",
                boxShadow: vista === "tabla" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* FILTROS ADICIONALES PLEGABLES (Obra, Seguimiento, Orden)       */}
      {/* ============================================================= */}
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
          marginBottom: 18,
          fontSize: 12,
          color: "var(--text-muted, #6e6e73)",
        }}
      >
        <span style={{ fontWeight: 600 }}>Filtrar:</span>

        {/* Filtro por Obra */}
        <select
          value={obraFiltro}
          onChange={(e) => setObraFiltro(e.target.value)}
          style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.1))",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 12,
            color: "var(--text-main, #1d1d1f)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="todas">Todas las obras ({obras.length})</option>
          {obras.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>

        {/* Filtro por Seguimiento */}
        <select
          value={seguimientoFiltro}
          onChange={(e) => setSeguimientoFiltro(e.target.value)}
          style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.1))",
            borderRadius: 8,
            padding: "5px 10px",
            fontSize: 12,
            color: "var(--text-main, #1d1d1f)",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="todas">Seguimiento: Todos</option>
          <option value="llamar">Por llamar (a punto o vencidas)</option>
          <option value="vencidas">Solo vencidas</option>
          <option value="alDia">Dentro del plazo</option>
        </select>

        {/* Ordenamiento */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>Ordenar por:</span>
          <select
            value={ordenActivo}
            onChange={(e) => setOrdenActivo(e.target.value)}
            style={{
              background: "var(--surface, #ffffff)",
              border: "1px solid var(--border, rgba(0, 0, 0, 0.1))",
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 12,
              color: "var(--text-main, #1d1d1f)",
              outline: "none",
              cursor: "pointer",
            }}
          >
            {ORDENES.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ============================================================= */}
      {/* RESULTADOS / LISTA O CUADRÍCULA                               */}
      {/* ============================================================= */}
      {filtradas.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 20px",
            background: "var(--surface, #ffffff)",
            borderRadius: 18,
            border: "1px dashed var(--border, rgba(0,0,0,0.1))",
            color: "var(--text-muted, #86868b)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>
            No se encontraron cotizaciones
          </div>
          <p style={{ fontSize: 13, margin: "6px 0 0" }}>
            Prueba ajustando los términos de búsqueda o los filtros seleccionados.
          </p>
        </div>
      ) : vista === "tarjetas" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 16,
          }}
        >
          {filtradas.map((c) => (
            <TarjetaCotizacionApple
              key={c.id}
              cotizacion={c}
              acciones={acciones}
              onInspeccionar={() => setCotizacionInspector(c)}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            borderRadius: 16,
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ overflowX: "auto", width: "100%" }}>
            <div style={{ minWidth: 840 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "100px 1.8fr 1.2fr 100px 120px 120px 160px",
                  padding: "10px 16px",
                  background: "var(--surface-subtle, #fbfbfd)",
                  borderBottom: "1px solid var(--border, rgba(0,0,0,0.08))",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-subtle, #667085)",
                }}
              >
                <span>Folio</span>
                <span>Cliente</span>
                <span>Obra / Proyecto</span>
                <span>Fecha</span>
                <span style={{ textAlign: "right" }}>Total COP</span>
                <span style={{ textAlign: "center" }}>Estado</span>
                <span style={{ textAlign: "right" }}>Acciones</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {filtradas.map((c, idx) => (
                  <FilaTablaCotizacion
                    key={c.id}
                    cotizacion={c}
                    acciones={acciones}
                    zebra={idx % 2 === 1}
                    onInspeccionar={() => setCotizacionInspector(c)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* DRAWER / INSPECTOR LATERAL CON ANIMACIÓN HORIZONTAL APPLE     */}
      {/* ============================================================= */}
      {/* Fondo oscuro traslúcido */}
      <div
        onClick={() => setCotizacionInspector(null)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.28)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          zIndex: 80,
          opacity: cotizacionInspector ? 1 : 0,
          pointerEvents: cotizacionInspector ? "auto" : "none",
          transition: "opacity 0.26s ease",
        }}
      />

      {/* Panel deslizante lateral (Split View / Slide-Over Inspector) */}
      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: isMobile
            ? "100%"
            : inspectorExpandido
            ? "min(780px, 92vw)"
            : "min(460px, 90vw)",
          background: "var(--surface, #ffffff)",
          borderLeft: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
          zIndex: 90,
          boxShadow: "-12px 0 36px rgba(0, 0, 0, 0.14)",
          transform: cotizacionInspector ? "translateX(0)" : "translateX(100%)",
          transition:
            "transform 0.32s cubic-bezier(0.16, 1, 0.3, 1), width 0.32s cubic-bezier(0.16, 1, 0.3, 1)",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        {cotizacionInspector && (
          <ContenidoInspectorHorizontal
            cotizacion={cotizacionInspector}
            acciones={acciones}
            expandido={inspectorExpandido}
            onToggleExpandir={() => setInspectorExpandido((prev) => !prev)}
            onCerrar={() => setCotizacionInspector(null)}
          />
        )}
      </aside>
    </div>
  );
}

// ===================================================================
// SUBCOMPONENTES
// ===================================================================

function BotonSegmentado({ activo, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 13px",
        borderRadius: 9,
        fontSize: 12,
        fontWeight: activo ? 700 : 500,
        color: activo ? "var(--text-main, #1d1d1f)" : "var(--text-muted, #6e6e73)",
        background: activo ? "var(--surface, #ffffff)" : "transparent",
        boxShadow: activo ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
        border: "none",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.16s ease",
      }}
    >
      {label}
    </button>
  );
}

function TarjetaCotizacionApple({ cotizacion: c, acciones, onInspeccionar }) {
  const isMobile = useIsMobile();
  const [hover, setHover] = useState(false);
  const activa = getQuoteActiveProposal(c);

  const { diasParaVencer } = seguimientoDe(c);
  const avisa = diasParaVencer !== null && diasParaVencer <= UMBRAL_POR_VENCER;

  const totalEstimado = Number(
    c.total ||
      c.totalPresupuesto ||
      (Array.isArray(c.propuestas)
        ? c.propuestas.reduce((s, p) => s + Number(p?.total || 0), 0)
        : 0) ||
      Number(activa?.total || 0) ||
      0
  );

  const clienteNorm = normalizarRazonSocial(c.cliente);
  const obraNorm = normalizarMayusculas(c.obra || "");
  const ciudadNorm = normalizarMayusculas(c.ciudad || "");

  const alPulsar = (fn) => (e) => {
    e.stopPropagation();
    if (typeof fn === "function") fn(c);
  };

  return (
    <article
      onClick={onInspeccionar}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface, #ffffff)",
        border: `1px solid ${hover ? "#0071e3" : "var(--border, rgba(0, 0, 0, 0.08))"}`,
        borderRadius: 18,
        padding: "16px 18px",
        boxShadow: hover
          ? "0 14px 30px -6px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)"
          : "0 2px 10px -2px rgba(0, 0, 0, 0.02), 0 1px 3px rgba(0, 0, 0, 0.02)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 14,
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ minWidth: 0, maxWidth: "100%", width: "100%", boxSizing: "border-box" }}>
        {/* Cabecera de la tarjeta: Folio, fecha y estado */}
        <div
          className="no-wrap"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
            width: "100%",
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
            <span
              style={{
                fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
                fontSize: 11.5,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 6,
                background: "var(--surface-subtle, #f5f5f7)",
                color: "var(--text-main, #101828)",
                border: "1px solid var(--border, rgba(0,0,0,0.08))",
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.01em",
                flexShrink: 0,
              }}
            >
              {c.numero || c.id}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted, #667085)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fmtD(c.fecha)}
              {ciudadNorm ? ` · ${ciudadNorm}` : ""}
            </span>
          </div>

          <div style={{ flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <BotonEstadoAprobacion cotizacion={c} acciones={acciones} />
          </div>
        </div>

        {/* Alerta de seguimiento comercial */}
        {avisa && (
          <div style={{ marginBottom: 6 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: colorSeguimiento(diasParaVencer),
                background: "rgba(255, 149, 0, 0.08)",
                border: `1px solid ${colorSeguimiento(diasParaVencer)}`,
                borderRadius: 5,
                padding: "1px 6px",
              }}
            >
              {etiquetaSeguimiento(diasParaVencer)}
            </span>
          </div>
        )}

        {/* Cliente y Obra */}
        <h3
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: "var(--text-main, #101828)",
            margin: "0 0 3px",
            lineHeight: 1.3,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {clienteNorm || "Sin razón social"}
        </h3>

        <div
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: "var(--text-muted, #475467)",
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {obraNorm || activa?.nombre || "Cotización técnica"}
        </div>
      </div>

      {/* Pie de la tarjeta: Total y Botones de acción */}
      <div
        className="no-wrap"
        style={{
          borderTop: "1px solid var(--border, rgba(0, 0, 0, 0.06))",
          paddingTop: 12,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          width: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div style={{ minWidth: 0, flexShrink: 0 }}>
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--text-subtle, #86868b)",
              textTransform: "uppercase",
            }}
          >
            Total con AIU
          </div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text-main, #1d1d1f)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {fmt(totalEstimado)}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          <button
            type="button"
            title="Inspeccionar cotización"
            onClick={(e) => {
              e.stopPropagation();
              onInspeccionar();
            }}
            style={{
              background: "#1d1d1f",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "5px 11px",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            }}
          >
            Ver
          </button>

          <button
            type="button"
            title="Editar propuesta"
            onClick={alPulsar(acciones.editar)}
            style={{
              background: "transparent",
              color: "var(--text-muted, #6e6e73)",
              border: "1px solid var(--border, rgba(0,0,0,0.12))",
              borderRadius: 8,
              padding: "5px 9px",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Editar
          </button>

          <button
            type="button"
            title="Duplicar cotización"
            onClick={alPulsar(acciones.duplicar)}
            style={{
              background: "transparent",
              color: "var(--text-muted, #6e6e73)",
              border: "1px solid var(--border, rgba(0,0,0,0.12))",
              borderRadius: 8,
              padding: "5px 7px",
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            📋
          </button>

          {!isMobile && (
            <button
              type="button"
              title="Eliminar permanentemente"
              onClick={alPulsar(acciones.eliminar)}
              style={{
                background: "rgba(239, 68, 68, 0.08)",
                color: "#dc2626",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                borderRadius: 8,
                padding: "5px 8px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              🗑️
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function FilaTablaCotizacion({ cotizacion: c, acciones, zebra, onInspeccionar }) {
  const activa = getQuoteActiveProposal(c);
  const totalEstimado = Number(
    c.total ||
      c.totalPresupuesto ||
      (Array.isArray(c.propuestas)
        ? c.propuestas.reduce((s, p) => s + Number(p?.total || 0), 0)
        : 0) ||
      Number(activa?.total || 0) ||
      0
  );

  const alPulsar = (fn) => (e) => {
    e.stopPropagation();
    if (typeof fn === "function") fn(c);
  };

  return (
    <div
      onClick={onInspeccionar}
      style={{
        display: "grid",
        gridTemplateColumns: "100px 1.8fr 1.2fr 100px 120px 120px 160px",
        padding: "11px 16px",
        alignItems: "center",
        background: zebra ? "var(--surface-subtle, #fafbfd)" : "var(--surface, #ffffff)",
        borderBottom: "1px solid var(--border, rgba(0,0,0,0.06))",
        fontSize: 12.5,
        cursor: "pointer",
        transition: "background 0.12s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--surface-subtle, #f5f5f7)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = zebra
          ? "var(--surface-subtle, #fafbfd)"
          : "var(--surface, #ffffff)";
      }}
    >
      <span
        style={{
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--text-main, #101828)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.01em",
        }}
      >
        {c.numero || c.id}
      </span>

      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-main, #101828)",
          letterSpacing: "-0.01em",
          lineHeight: 1.35,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          paddingRight: 10,
        }}
      >
        {c.cliente || "Sin cliente"}
      </span>

      <span
        style={{
          fontSize: 12.5,
          fontWeight: 400,
          color: "var(--text-muted, #475467)",
          letterSpacing: "-0.01em",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          paddingRight: 10,
        }}
      >
        {c.obra || activa?.nombre || "—"}
      </span>

      <span style={{ color: "var(--text-muted, #667085)", fontSize: 12, fontWeight: 400 }}>
        {fmtD(c.fecha)}
      </span>

      <span
        style={{
          textAlign: "right",
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-main, #101828)",
          fontVariantNumeric: "tabular-nums",
          letterSpacing: "-0.01em",
        }}
      >
        {fmt(totalEstimado)}
      </span>

      <div style={{ textAlign: "center" }}>
        <BotonEstadoAprobacion cotizacion={c} acciones={acciones} />
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 5 }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInspeccionar();
          }}
          style={{
            background: "var(--surface-subtle, #f5f5f7)",
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Ver
        </button>
        <button
          type="button"
          onClick={alPulsar(acciones.editar)}
          style={{
            background: "transparent",
            border: "1px solid var(--border, rgba(0,0,0,0.1))",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Editar
        </button>
        <button
          type="button"
          onClick={alPulsar(acciones.duplicar)}
          title="Duplicar"
          style={{
            background: "transparent",
            border: "1px solid var(--border, rgba(0,0,0,0.1))",
            borderRadius: 6,
            padding: "4px 6px",
            fontSize: 11,
            cursor: "pointer",
          }}
        >
          📋
        </button>
      </div>
    </div>
  );
}

function BotonEstadoAprobacion({ cotizacion, acciones }) {
  const [hover, setHover] = useState(false);
  const aprobada = cotizacion.estado === "Aprobada" || Boolean(cotizacion.obraId);
  const estado = cotizacion.estado || "Pendiente";

  const handleClick = (e) => {
    e.stopPropagation();
    if (aprobada) {
      if (typeof acciones?.desaprobar === "function") {
        acciones.desaprobar(cotizacion);
      }
    } else {
      if (typeof acciones?.aprobar === "function") {
        acciones.aprobar(cotizacion);
      }
    }
  };

  const bgNormal = aprobada ? "rgba(52, 199, 89, 0.12)" : "rgba(255, 149, 0, 0.12)";
  const textNormal = aprobada ? "#28a745" : "#d97706";
  const borderNormal = aprobada ? "rgba(52, 199, 89, 0.28)" : "rgba(255, 149, 0, 0.28)";

  const bgHover = aprobada ? "#fee2e2" : "#dcfce7";
  const textHover = aprobada ? "#dc2626" : "#15803d";
  const borderHover = aprobada ? "#fca5a5" : "#86efac";

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={
        aprobada
          ? "Cotización aprobada. Haz clic aquí para desaprobarla (devolver a Pendiente)"
          : "Cotización pendiente. Haz clic aquí para aprobarla y crear la obra automáticamente"
      }
      style={{
        background: hover ? bgHover : bgNormal,
        color: hover ? textHover : textNormal,
        border: `1px solid ${hover ? borderHover : borderNormal}`,
        borderRadius: 999,
        padding: "3px 10px",
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: "nowrap",
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        transition: "all 0.16s ease",
        transform: hover ? "scale(1.03)" : "scale(1)",
        userSelect: "none",
      }}
    >
      <span>
        {hover ? (aprobada ? "↩ Desaprobar" : "✓ Aprobar") : aprobada ? "✓ Aprobada" : estado}
      </span>
    </button>
  );
}

// ===================================================================
// CONTENIDO DEL INSPECTOR LATERAL CON ANIMACIÓN HORIZONTAL APPLE
// ===================================================================
function ContenidoInspectorHorizontal({
  cotizacion: c,
  acciones,
  expandido,
  onToggleExpandir,
  onCerrar,
}) {
  const activa = getQuoteActiveProposal(c);
  const items = Array.isArray(activa?.items) ? activa.items : [];

  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.cant) || 0) * (Number(it.vu) || 0),
    0
  );
  const util = activa?.sinAiu ? 0 : (subtotal * (Number(activa?.util) || 10)) / 100;
  const iva = activa?.sinAiu ? subtotal * 0.19 : util * 0.19;
  const total = Number(c.total || activa?.total || subtotal + util + iva);

  const telLimpio = String(c.telefono || "").replace(/\D/g, "");
  const urlWa = telLimpio
    ? `https://wa.me/57${telLimpio}?text=${encodeURIComponent(
        `Hola ${c.contacto || c.cliente || ""}, te saludo de Ingeanclajes respecto a la cotización ${
          c.numero || c.id
        }...`
      )}`
    : null;

  return (
    <>
      {/* Cabecera del Inspector */}
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
              fontSize: 12,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 6,
              background: "var(--surface-subtle, #f5f5f7)",
              color: "var(--text-main, #101828)",
              border: "1px solid var(--border, rgba(0,0,0,0.1))",
              fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.01em",
            }}
          >
            {c.numero || c.id}
          </span>
          <BotonEstadoAprobacion cotizacion={c} acciones={acciones} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Botón de Minimizar / Maximizar Horizontal (Efecto pedido por el usuario) */}
          <button
            type="button"
            onClick={onToggleExpandir}
            title={
              expandido
                ? "Minimizar horizontalmente (volver a ancho compacto)"
                : "Maximizar horizontalmente (expandir vista lateral)"
            }
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "1px solid var(--border, rgba(0,0,0,0.12))",
              background: "var(--surface, #ffffff)",
              color: "var(--text-main, #1d1d1f)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              transition: "all 0.15s ease",
            }}
          >
            ↔
          </button>

          {/* Botón de cerrar (colapsa horizontalmente) */}
          <button
            type="button"
            onClick={onCerrar}
            title="Cerrar inspector lateral"
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              border: "none",
              background: "var(--surface-subtle, #f5f5f7)",
              color: "var(--text-muted, #6e6e73)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              lineHeight: 1,
              transition: "all 0.15s ease",
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Cuerpo del Inspector con scroll suave */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {/* Título de Obra y Cliente */}
        <div>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "var(--text-main, #1d1d1f)",
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            {c.obra || activa?.nombre || "Cotización Técnica"}
          </h2>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-muted, #6e6e73)",
              marginTop: 4,
            }}
          >
            {c.cliente || "Cliente"}
            {c.ciudad ? ` · ${c.ciudad}` : ""}
          </div>
          {c.contacto && (
            <div style={{ fontSize: 11.5, color: "var(--text-subtle, #86868b)", marginTop: 2 }}>
              Contacto: {c.contacto} {c.telefono ? `(${c.telefono})` : ""}
            </div>
          )}
        </div>

        {/* Hero Card de Valor Total con AIU */}
        <div
          style={{
            background: "var(--surface-subtle, #fbfbfd)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            borderRadius: 16,
            padding: 16,
          }}
        >
          <div
            style={{
              fontSize: 10.5,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-subtle, #86868b)",
            }}
          >
            Valor Total Propuesta (COP)
          </div>

          <div
            style={{
              fontSize: 26,
              fontWeight: 800,
              color: "var(--text-main, #1d1d1f)",
              fontVariantNumeric: "tabular-nums",
              margin: "4px 0 8px",
            }}
          >
            {fmt(total)}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 11.5,
              color: "var(--text-muted, #6e6e73)",
              borderTop: "1px solid var(--border, rgba(0,0,0,0.06))",
              paddingTop: 8,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span>
              Subtotal: <strong>{fmt(subtotal)}</strong>
            </span>
            <span>
              IVA: <strong>{fmt(iva)}</strong>
            </span>
          </div>
        </div>

        {/* Metadatos en filas compactas Apple */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            fontSize: 12,
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.07))",
            borderRadius: 12,
            padding: "12px 14px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-subtle, #86868b)" }}>Fecha emisión:</span>
            <span style={{ fontWeight: 600, color: "var(--text-main, #1d1d1f)" }}>
              {fmtD(c.fecha)}
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-subtle, #86868b)" }}>Validez:</span>
            <span style={{ fontWeight: 600, color: "var(--text-main, #1d1d1f)" }}>
              {c.validez || 30} días calendario
            </span>
          </div>

          {activa?.tiempoEjec && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-subtle, #86868b)" }}>Tiempo ejecución:</span>
              <span style={{ fontWeight: 600, color: "var(--text-main, #1d1d1f)" }}>
                {activa.tiempoEjec}
              </span>
            </div>
          )}

          {activa?.formaPago && (
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-subtle, #86868b)" }}>Forma de pago:</span>
              <span style={{ fontWeight: 600, color: "var(--text-main, #1d1d1f)" }}>
                {activa.formaPago}
              </span>
            </div>
          )}
        </div>

        {/* Tabla resumida de ítems */}
        <div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--text-subtle, #86868b)",
              marginBottom: 8,
            }}
          >
            Ítems de la propuesta ({items.length})
          </div>

          {items.length === 0 ? (
            <div
              style={{
                fontSize: 11.5,
                color: "var(--text-subtle, #86868b)",
                padding: "12px 0",
              }}
            >
              Esta propuesta aún no tiene ítems registrados.
            </div>
          ) : (
            <div
              style={{
                border: "1px solid var(--border, rgba(0,0,0,0.08))",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  style={{
                    padding: "8px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    fontSize: 11.5,
                    background: idx % 2 === 1 ? "var(--surface-subtle, #fafbfd)" : "transparent",
                    borderBottom:
                      idx < items.length - 1
                        ? "1px solid var(--border, rgba(0,0,0,0.06))"
                        : "none",
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        color: "var(--text-main, #1d1d1f)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {it.desc || "Ítem sin descripción"}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--text-subtle, #86868b)" }}>
                      {it.cant} {it.unit} · {fmt(it.vu)} c/u
                    </div>
                  </div>

                  <span
                    style={{
                      fontWeight: 700,
                      color: "var(--text-main, #1d1d1f)",
                      fontVariantNumeric: "tabular-nums",
                      flexShrink: 0,
                    }}
                  >
                    {fmt((Number(it.cant) || 0) * (Number(it.vu) || 0))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Acciones del pie del Inspector */}
      <div
        style={{
          padding: 16,
          borderTop: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "var(--surface, #ffffff)",
        }}
      >
        <button
          type="button"
          onClick={() => acciones.editar?.(c)}
          style={{
            background: "#0071e3",
            color: "#ffffff",
            border: "none",
            borderRadius: 12,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <span>✏️</span>
          <span>Abrir y Editar Cotización</span>
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => acciones.ver?.(c)}
            style={{
              background: "var(--surface-subtle, #f5f5f7)",
              color: "var(--text-main, #1d1d1f)",
              border: "1px solid var(--border, rgba(0,0,0,0.1))",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Ver Documento
          </button>

          <button
            type="button"
            onClick={() => acciones.pdf?.(c)}
            style={{
              background: "var(--surface-subtle, #f5f5f7)",
              color: "var(--text-main, #1d1d1f)",
              border: "1px solid var(--border, rgba(0,0,0,0.1))",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Descargar PDF
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: urlWa ? "1fr 1fr" : "1fr", gap: 8 }}>
          <button
            type="button"
            onClick={() => acciones.enviar?.(c)}
            style={{
              background: "rgba(255, 149, 0, 0.1)",
              color: "#d97706",
              border: "1px solid rgba(255, 149, 0, 0.3)",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Enviar al cliente
          </button>

          {urlWa && (
            <a
              href={urlWa}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "rgba(37, 211, 102, 0.12)",
                color: "#128C7E",
                border: "1px solid rgba(37, 211, 102, 0.3)",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 700,
                textAlign: "center",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
              }}
            >
              <span>WhatsApp</span>
            </a>
          )}
        </div>
      </div>
    </>
  );
}
