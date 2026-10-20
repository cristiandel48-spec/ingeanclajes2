import { useMemo, useState, useEffect, useRef } from "react";
import { fmtD } from "../../lib/format";
import { useIsMobile } from "../../hooks/useMediaQuery";

const ORDENES = [
  { key: "recientes", label: "Más recientes", comparar: (a, b) => enMilis(b.fechaInforme) - enMilis(a.fechaInforme) || String(b.id).localeCompare(String(a.id)) },
  { key: "antiguos",  label: "Más antiguos",  comparar: (a, b) => enMilis(a.fechaInforme) - enMilis(b.fechaInforme) },
  { key: "obra",      label: "Obra",          comparar: (a, b) => String(a.obraId || "").localeCompare(String(b.obraId || ""), "es") },
  { key: "proyecto",  label: "Proyecto A–Z",  comparar: (a, b) => String(a.proyecto || "").localeCompare(String(b.proyecto || ""), "es") },
];

function enMilis(fecha) {
  if (!fecha) return 0;
  const t = new Date(fecha).getTime();
  return Number.isNaN(t) ? 0 : t;
}

const contarFotos = (inf) => {
  if (inf?.__parcial && Number.isFinite(inf?.totalFotos)) return inf.totalFotos;
  return (inf?.actividades || []).reduce((s, a) => s + (a?.fotos || []).filter((f) => f?.img).length, 0);
};

const contarActividades = (inf) => {
  if (inf?.__parcial && Number.isFinite(inf?.totalActividades)) return inf.totalActividades;
  return (inf?.actividades || []).length;
};

export default function ListaInformes({ informes = [], acciones = {} }) {
  const isMobile = useIsMobile();
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todos");
  const [orden, setOrden] = useState("recientes");
  const [modoVista, setModoVista] = useState(() => {
    try {
      const guardada = localStorage.getItem("ingeanclajes_informes_vista");
      if (guardada) return guardada;
      return "tabla";
    } catch {
      return "tabla";
    }
  });

  const cambiarModoVista = (nuevoModo) => {
    setModoVista(nuevoModo);
    try {
      localStorage.setItem("ingeanclajes_informes_vista", nuevoModo);
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
    const lista = Array.isArray(informes) ? informes : [];
    return {
      todos: lista.length,
      conFotos: lista.filter((i) => contarFotos(i) > 0).length,
      sinFotos: lista.filter((i) => contarFotos(i) === 0).length,
    };
  }, [informes]);

  const informesFiltrados = useMemo(() => {
    let res = Array.isArray(informes) ? [...informes] : [];

    // Filtro por pestaña
    if (estadoFiltro === "Con fotos") {
      res = res.filter((i) => contarFotos(i) > 0);
    } else if (estadoFiltro === "Sin fotos") {
      res = res.filter((i) => contarFotos(i) === 0);
    }

    // Filtro de búsqueda
    const q = busqueda.trim().toLowerCase();
    if (q) {
      res = res.filter((i) => {
        const texto = [
          i.id,
          i.obraId,
          i.cotizacionNumero,
          i.cotizacionRef,
          i.proyecto,
          i.localizacion,
          i.cliente,
          i.contratante,
        ].filter(Boolean).join(" ").toLowerCase();
        return texto.includes(q);
      });
    }

    // Ordenamiento
    const regla = ORDENES.find((o) => o.key === orden) || ORDENES[0];
    res.sort(regla.comparar);

    return res;
  }, [informes, estadoFiltro, busqueda, orden]);

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
      {/* Barra de herramientas estilo Apple macOS */}
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
        {/* Selector Segmentado de Estados */}
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
            activo={estadoFiltro === "Todos"}
            onClick={() => setEstadoFiltro("Todos")}
            label={`Todos (${conteos.todos})`}
          />
          <BotonSegmentado
            activo={estadoFiltro === "Con fotos"}
            onClick={() => setEstadoFiltro("Con fotos")}
            label={`Con fotos (${conteos.conFotos})`}
          />
          <BotonSegmentado
            activo={estadoFiltro === "Sin fotos"}
            onClick={() => setEstadoFiltro("Sin fotos")}
            label={`Sin fotos (${conteos.sinFotos})`}
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
              ref={inputBusquedaRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por número, obra, cotización..."
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
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => cambiarModoVista("cuadricula")}
              title="Vista en tarjetas"
              style={{
                background: modoVista === "cuadricula" ? "#ffffff" : "transparent",
                color: modoVista === "cuadricula" ? "#1d1d1f" : "#86868b",
                border: "none",
                borderRadius: 6,
                padding: "5px 8px",
                cursor: "pointer",
                boxShadow: modoVista === "cuadricula" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </button>
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
        </div>
      </div>

      {/* Listado de Informes */}
      {informesFiltrados.length === 0 ? (
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
          <div style={{ fontSize: 32, marginBottom: 10 }}>📄</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main, #1d1d1f)", marginBottom: 4 }}>
            No se encontraron informes
          </div>
          <p style={{ fontSize: 13, color: "var(--text-muted, #6e6e73)", maxWidth: 420, margin: "0 auto" }}>
            {busqueda
              ? `No hay ningún informe que coincida con "${busqueda}". Prueba con otro término.`
              : "Los informes de actividades se generan a partir de los avances de cada obra."}
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
          {informesFiltrados.map((inf) => (
            <TarjetaInformeApple
              key={inf.id}
              informe={inf}
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
            overflow: "hidden",
            boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.02)",
          }}
        >
          {/* Cabecera de la tabla */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "100px 2.2fr 1.4fr 110px 100px 90px 130px",
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
            <div>Informe</div>
            <div>Proyecto / Cliente</div>
            <div>Obra & Periodo</div>
            <div>Actividades</div>
            <div>Personal</div>
            <div>Fotos</div>
            <div style={{ textAlign: "right" }}>Acciones</div>
          </div>

          {informesFiltrados.map((inf, idx) => (
            <FilaTablaInforme
              key={inf.id}
              informe={inf}
              acciones={acciones}
              zebra={idx % 2 === 1}
            />
          ))}
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

function TarjetaInformeApple({ informe: inf, acciones }) {
  const [hover, setHover] = useState(false);
  const fotos = contarFotos(inf);
  const actividades = contarActividades(inf);
  const operarios = (inf.personal || []).length;

  const proyecto = String(inf.proyecto || inf.cliente || inf.contratante || inf.id).trim();
  const localizacion = String(inf.localizacion || "").trim();
  const periodo = inf.periodoInicio || inf.periodoFin
    ? `del ${fmtD(inf.periodoInicio)} al ${fmtD(inf.periodoFin)}`
    : "";

  return (
    <article
      onClick={() => acciones.ver?.(inf)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface, #ffffff)",
        border: `1px solid ${hover ? "#0071e3" : "var(--border, rgba(0, 0, 0, 0.08))"}`,
        borderRadius: 16,
        padding: "16px 18px",
        boxShadow: hover
          ? "0 14px 30px -6px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)"
          : "0 2px 8px -2px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.02)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 12,
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ minWidth: 0, maxWidth: "100%", width: "100%", boxSizing: "border-box" }}>
        {/* Cabecera: Código, fecha y fotos */}
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
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 6,
                background: "var(--surface-subtle, #f5f5f7)",
                color: "var(--text-main, #101828)",
                border: "1px solid var(--border, rgba(0,0,0,0.08))",
                flexShrink: 0,
              }}
            >
              {inf.id}
            </span>
            <span style={{ fontSize: 11, color: "var(--text-muted, #667085)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fmtD(inf.fechaInforme)}
            </span>
          </div>

          <div style={{ flexShrink: 0 }}>
            {fotos > 0 ? (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  borderRadius: 999,
                  padding: "2px 8px",
                  background: "#ecfdf5",
                  color: "#047857",
                  border: "1px solid #a7f3d0",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>📸</span>
                <span>{fotos} fotos</span>
              </span>
            ) : (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  borderRadius: 999,
                  padding: "2px 8px",
                  background: "#fffbeb",
                  color: "#b45309",
                  border: "1px solid #fde68a",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>⚠️</span>
                <span>Sin fotos</span>
              </span>
            )}
          </div>
        </div>

        {/* Título: Proyecto / Cliente */}
        <h3
          style={{
            fontSize: 14.5,
            fontWeight: 600,
            color: "var(--text-main, #101828)",
            margin: "0 0 3px",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {proyecto}
        </h3>

        {/* Subtítulo: Obra y periodo */}
        <div
          style={{
            fontSize: 11.5,
            color: "var(--text-muted, #667085)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
            marginBottom: 8,
          }}
        >
          📍 {localizacion || "Obra"} · <strong style={{ fontFamily: "monospace", color: "var(--text-main, #101828)" }}>{inf.obraId || "—"}</strong>
          {periodo ? ` · ${periodo}` : ""}
        </div>

        {/* Contadores y resumen de actividades */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 6,
              background: "var(--surface-subtle, #f5f5f7)",
              color: "var(--text-muted, #475467)",
              border: "1px solid var(--border, rgba(0,0,0,0.06))",
            }}
          >
            {actividades} act.
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 6,
              background: "var(--surface-subtle, #f5f5f7)",
              color: "var(--text-muted, #475467)",
              border: "1px solid var(--border, rgba(0,0,0,0.06))",
            }}
          >
            {operarios} operarios
          </span>
          {inf.cotizacionNumero && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "2px 7px",
                borderRadius: 6,
                background: "var(--surface-subtle, #f5f5f7)",
                color: "#0071e3",
                border: "1px solid var(--border, rgba(0,0,0,0.06))",
              }}
            >
              {inf.cotizacionNumero}
            </span>
          )}
        </div>
      </div>

      {/* Pie de tarjeta con botones estilo Apple */}
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
        <span style={{ fontSize: 11, color: "var(--text-subtle, #86868b)" }}>
          {inf.cliente ? inf.cliente : "Informe de actividades"}
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Ver informe completo"
            onClick={() => acciones.ver?.(inf)}
            style={{
              background: "#1d1d1f",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "6px 13px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>Ver</span>
            <span>→</span>
          </button>

          <button
            type="button"
            title="Editar informe"
            onClick={() => acciones.editar?.(inf)}
            style={{
              background: "transparent",
              color: "var(--text-muted, #6e6e73)",
              border: "1px solid var(--border, rgba(0,0,0,0.14))",
              borderRadius: 8,
              padding: "6px 10px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Editar
          </button>

          {(acciones.descargarPdf || acciones.imprimir) && (
            <button
              type="button"
              title="Descargar PDF oficial de este informe"
              onClick={() => (acciones.descargarPdf || acciones.imprimir)?.(inf)}
              style={{
                background: "transparent",
                color: "#b91c1c",
                border: "1px solid rgba(185, 28, 28, 0.25)",
                borderRadius: 8,
                padding: "6px 9px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              PDF
            </button>
          )}

          {acciones.certificar && (
            <button
              type="button"
              title="Abre la certificación de esta obra con los datos de este informe"
              onClick={() => acciones.certificar?.(inf)}
              style={{
                background: "transparent",
                color: "#047857",
                border: "1px solid #a7f3d0",
                borderRadius: 8,
                padding: "6px 9px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📜 Certificar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function FilaTablaInforme({ informe: inf, acciones, zebra }) {
  const fotos = contarFotos(inf);
  const actividades = contarActividades(inf);
  const operarios = (inf.personal || []).length;
  const proyecto = String(inf.proyecto || inf.cliente || inf.contratante || inf.id).trim();
  const localizacion = String(inf.localizacion || "").trim();

  return (
    <div
      onClick={() => acciones.ver?.(inf)}
      style={{
        display: "grid",
        gridTemplateColumns: "100px 2.2fr 1.4fr 110px 100px 90px 130px",
        padding: "10px 16px",
        alignItems: "center",
        background: zebra ? "var(--surface-subtle, #fafbfd)" : "var(--surface, #ffffff)",
        borderBottom: "1px solid var(--border, rgba(0,0,0,0.05))",
        fontSize: 12,
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
      <div>
        <span
          style={{
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-main, #101828)",
            padding: "2px 7px",
            background: "var(--surface-subtle, #f1f5f9)",
            borderRadius: 6,
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
          }}
        >
          {inf.id}
        </span>
      </div>

      <div style={{ minWidth: 0, paddingRight: 8 }}>
        <div style={{ fontWeight: 600, color: "var(--text-main, #101828)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {proyecto}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted, #667085)", marginTop: 1 }}>
          📅 {fmtD(inf.fechaInforme)}
        </div>
      </div>

      <div style={{ minWidth: 0, color: "var(--text-muted, #475467)", fontSize: 11.5 }}>
        <div>📍 {localizacion || "—"}</div>
        <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-subtle, #86868b)" }}>{inf.obraId || "—"}</div>
      </div>

      <div>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-main, #1d1d1f)" }}>
          {actividades} act.
        </span>
      </div>

      <div>
        <span style={{ fontSize: 11.5, color: "var(--text-muted, #475467)" }}>
          {operarios}
        </span>
      </div>

      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: fotos > 0 ? "#047857" : "#b45309",
            background: fotos > 0 ? "#ecfdf5" : "#fffbeb",
            border: `1px solid ${fotos > 0 ? "#a7f3d0" : "#fde68a"}`,
            borderRadius: 6,
            padding: "1px 6px",
          }}
        >
          {fotos > 0 ? `📸 ${fotos}` : "0"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 5, justifyContent: "flex-end" }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => acciones.ver?.(inf)}
          style={{
            background: "#1d1d1f",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
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
            title="Descargar PDF"
            onClick={() => (acciones.descargarPdf || acciones.imprimir)?.(inf)}
            style={{
              background: "transparent",
              color: "#b91c1c",
              border: "1px solid rgba(185, 28, 28, 0.25)",
              borderRadius: 6,
              padding: "4px 8px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            PDF
          </button>
        )}
        <button
          type="button"
          onClick={() => acciones.editar?.(inf)}
          style={{
            background: "transparent",
            color: "var(--text-muted, #6e6e73)",
            border: "1px solid var(--border, rgba(0,0,0,0.12))",
            borderRadius: 6,
            padding: "4px 8px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Editar
        </button>
      </div>
    </div>
  );
}
