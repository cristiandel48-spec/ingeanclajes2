import { useMemo, useState, useEffect, useRef } from "react";
import { fmtD } from "../../lib/format";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";
import { ESTADOS_OBRA, estadoObraDe, obraEstaCerrada } from "../../lib/flujoObra";
import { resumenBitacora } from "../../lib/bitacoraObra";
import IconoPalomita from "../../components/ui/IconoPalomita";
import { useMediaQuery } from "../../hooks/useMediaQuery";

const ORDENES = [
  {
    key: "recientes",
    label: "Más recientes",
    comparar: (a, b) =>
      enMilis(b.fechaInicio) - enMilis(a.fechaInicio) || String(b.id).localeCompare(String(a.id)),
  },
  {
    key: "antiguas",
    label: "Más antiguas",
    comparar: (a, b) => enMilis(a.fechaInicio) - enMilis(b.fechaInicio),
  },
  {
    key: "avance-desc",
    label: "Mayor avance",
    comparar: (a, b) => (Number(b.avance) || 0) - (Number(a.avance) || 0),
  },
  {
    key: "avance-asc",
    label: "Menor avance",
    comparar: (a, b) => (Number(a.avance) || 0) - (Number(b.avance) || 0),
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

export default function ListaObras({
  obras = [],
  cotizaciones = [],
  horarios = [],
  onAbrir,
  onCambiarAvance,
  onCambiarEstado,
  onToggleEnviado,
  puedeDesbloquear,
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("Todas");
  const [avanceFiltro, setAvanceFiltro] = useState("todos");
  const [envioFiltro, setEnvioFiltro] = useState("todos");
  const [fotosFiltro, setFotosFiltro] = useState("todos");
  const [ordenActivo, setOrdenActivo] = useState("recientes");
  const [mostrarFiltrosAvanzados, setMostrarFiltrosAvanzados] = useState(false);

  // Predeterminado en lista (tabla) en escritorio y tarjetas en móvil estilo Apple
  const [vista, setVista] = useState(() => {
    try {
      const guardada = localStorage.getItem("ingeanclajes_obras_vista");
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
      localStorage.setItem("ingeanclajes_obras_vista", nuevaVista);
    } catch {
      // Ignorar si no está disponible localStorage
    }
  };

  const campoBusquedaRef = useRef(null);

  // Atajo de teclado Spotlight (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        campoBusquedaRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Pre-computar fotos por obra para filtrado ágil
  const fotosPorObra = useMemo(() => {
    const mapa = new Map();
    (obras || []).forEach((o) => {
      const resumen = resumenBitacora(o.bitacora);
      const totalFotos = (o.__parcial && Number.isFinite(o.totalFotosAvance))
        ? o.totalFotosAvance
        : (resumen?.fotos || 0);
      mapa.set(o.id, totalFotos);
    });
    return mapa;
  }, [obras]);

  // Conteos para el Segmented Control Apple
  const conteos = useMemo(() => {
    const lista = obras || [];
    return {
      todas: lista.length,
      enObra: lista.filter((o) => estadoObraDe(o) === "En Obra").length,
      finalizadas: lista.filter((o) => estadoObraDe(o) === "Finalizado").length,
      porIniciar: lista.filter((o) => estadoObraDe(o) === "Por Iniciar").length,
    };
  }, [obras]);

  // Filtrado y ordenamiento en tiempo real
  const filtradas = useMemo(() => {
    let res = [...(obras || [])];

    // 1. Filtro por Estado (Pestañas principales)
    if (estadoFiltro !== "Todas") {
      res = res.filter((o) => estadoObraDe(o) === estadoFiltro);
    }

    // 2. Filtro por tramo de avance
    if (avanceFiltro === "0") {
      res = res.filter((o) => (Number(o.avance) || 0) === 0);
    } else if (avanceFiltro === "1-49") {
      res = res.filter((o) => (Number(o.avance) || 0) >= 1 && (Number(o.avance) || 0) <= 49);
    } else if (avanceFiltro === "50-99") {
      res = res.filter((o) => (Number(o.avance) || 0) >= 50 && (Number(o.avance) || 0) <= 99);
    } else if (avanceFiltro === "100") {
      res = res.filter((o) => (Number(o.avance) || 0) === 100);
    }

    // 3. Filtro por envío al cliente
    if (envioFiltro === "si") {
      res = res.filter((o) => Boolean(o.enviadoAlCliente));
    } else if (envioFiltro === "no") {
      res = res.filter((o) => !o.enviadoAlCliente);
    }

    // 4. Filtro por fotos de bitácora
    if (fotosFiltro === "con") {
      res = res.filter((o) => (fotosPorObra.get(o.id) || 0) > 0);
    } else if (fotosFiltro === "sin") {
      res = res.filter((o) => (fotosPorObra.get(o.id) || 0) === 0);
    }

    // 5. Búsqueda de texto tipo Spotlight
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      res = res.filter((o) => {
        const texto = [
          o.id,
          o.cliente,
          o.proyecto,
          o.ciudad,
          o.direccion,
          o.cotizacionId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return texto.includes(q);
      });
    }

    // 6. Ordenamiento
    const ordObj = ORDENES.find((o) => o.key === ordenActivo) || ORDENES[0];
    res.sort(ordObj.comparar);

    return res;
  }, [obras, estadoFiltro, avanceFiltro, envioFiltro, fotosFiltro, busqueda, ordenActivo, fotosPorObra]);

  const hayFiltrosAvanzadosActivos =
    avanceFiltro !== "todos" || envioFiltro !== "todos" || fotosFiltro !== "todos";

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
          gap: 12,
          marginBottom: 16,
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
            activo={estadoFiltro === "En Obra"}
            onClick={() => setEstadoFiltro("En Obra")}
            label={`En Obra (${conteos.enObra})`}
          />
          <BotonSegmentado
            activo={estadoFiltro === "Finalizado"}
            onClick={() => setEstadoFiltro("Finalizado")}
            label={`Finalizadas (${conteos.finalizadas})`}
          />
          <BotonSegmentado
            activo={estadoFiltro === "Por Iniciar"}
            onClick={() => setEstadoFiltro("Por Iniciar")}
            label={`Por Iniciar (${conteos.porIniciar})`}
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
          {/* Botón Filtros Avanzados */}
          <button
            type="button"
            onClick={() => setMostrarFiltrosAvanzados((v) => !v)}
            style={{
              padding: "7px 12px",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: hayFiltrosAvanzadosActivos
                ? "rgba(244, 124, 32, 0.1)"
                : "var(--surface, #ffffff)",
              color: hayFiltrosAvanzadosActivos
                ? "#c2410c"
                : "var(--text-main, #101828)",
              border: `1px solid ${
                hayFiltrosAvanzadosActivos ? "rgba(244, 124, 32, 0.3)" : "var(--border, rgba(0, 0, 0, 0.12))"
              }`,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <span>⚡ Filtros</span>
            {hayFiltrosAvanzadosActivos && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#f47c20",
                }}
              />
            )}
          </button>

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
              placeholder="Buscar por cliente, proyecto, ciudad o código..."
              style={{
                width: "100%",
                padding: "7px 34px 7px 32px",
                borderRadius: 10,
                border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
                background: "var(--surface, #ffffff)",
                color: "var(--text-main, #101828)",
                fontSize: 12,
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
                  fontSize: 13,
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
              onClick={() => cambiarVista("tabla")}
              title="Vista en Lista / Tabla (Predeterminada)"
              style={{
                background: vista === "tabla" ? "var(--surface, #ffffff)" : "transparent",
                color: vista === "tabla" ? "var(--text-main, #101828)" : "var(--text-muted, #6e6e73)",
                border: "none",
                borderRadius: 6,
                padding: "5px 8px",
                cursor: "pointer",
                boxShadow: vista === "tabla" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                display: "flex",
                alignItems: "center",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="6" x2="20" y2="6"/>
                <line x1="4" y1="12" x2="20" y2="12"/>
                <line x1="4" y1="18" x2="20" y2="18"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => cambiarVista("tarjetas")}
              title="Vista en Cuadrícula / Tarjetas"
              style={{
                background: vista === "tarjetas" ? "var(--surface, #ffffff)" : "transparent",
                color: vista === "tarjetas" ? "var(--text-main, #101828)" : "var(--text-muted, #6e6e73)",
                border: "none",
                borderRadius: 6,
                padding: "5px 8px",
                cursor: "pointer",
                boxShadow: vista === "tarjetas" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                display: "flex",
                alignItems: "center",
                transition: "all 0.15s ease",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================= */}
      {/* PANEL EXPANDIBLE DE FILTROS AVANZADOS                         */}
      {/* ============================================================= */}
      {mostrarFiltrosAvanzados && (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            borderRadius: 14,
            padding: "12px 16px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {/* Tramo de avance */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #667085)" }}>
                Avance:
              </span>
              <select
                value={avanceFiltro}
                onChange={(e) => setAvanceFiltro(e.target.value)}
                style={estiloSelect}
              >
                <option value="todos">Todos los tramos</option>
                <option value="0">0% Sin iniciar</option>
                <option value="1-49">1–49% En arranque</option>
                <option value="50-99">50–99% Avanzadas</option>
                <option value="100">100% Terminadas</option>
              </select>
            </div>

            {/* Documentación enviada al cliente */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #667085)" }}>
                Envío cliente:
              </span>
              <select
                value={envioFiltro}
                onChange={(e) => setEnvioFiltro(e.target.value)}
                style={estiloSelect}
              >
                <option value="todos">Todas</option>
                <option value="si">Documentación Enviada 🕊️</option>
                <option value="no">Sin enviar</option>
              </select>
            </div>

            {/* Fotos de bitácora */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #667085)" }}>
                Fotos:
              </span>
              <select
                value={fotosFiltro}
                onChange={(e) => setFotosFiltro(e.target.value)}
                style={estiloSelect}
              >
                <option value="todos">Todas</option>
                <option value="con">Con fotos de avance 📸</option>
                <option value="sin">Sin fotos</option>
              </select>
            </div>
          </div>

          {/* Ordenamiento */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #667085)" }}>
              Ordenar por:
            </span>
            <select
              value={ordenActivo}
              onChange={(e) => setOrdenActivo(e.target.value)}
              style={estiloSelect}
            >
              {ORDENES.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* RESULTADOS: LISTA / TABLA PREDETERMINADA O CUADRÍCULA         */}
      {/* ============================================================= */}
      {filtradas.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "48px 20px",
            background: "var(--surface, #ffffff)",
            borderRadius: 16,
            border: "1px dashed var(--border, rgba(0,0,0,0.12))",
            color: "var(--text-muted, #667085)",
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏗️</div>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "var(--text-main, #101828)" }}>
            No se encontraron obras
          </div>
          <p style={{ fontSize: 12.5, margin: "6px 0 0" }}>
            Prueba ajustando los términos de búsqueda o los filtros seleccionados.
          </p>
        </div>
      ) : vista === "tarjetas" ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(auto-fill, minmax(350px, 1fr))",
            gap: 14,
          }}
        >
          {filtradas.map((o) => (
            <TarjetaObraApple
              key={o.id}
              o={o}
              cotizacion={(cotizaciones || []).find((c) => c.id === o.cotizacionId)}
              fotosCount={fotosPorObra.get(o.id) || 0}
              horarios={horarios}
              onAbrir={() => onAbrir(o)}
              onCambiarAvance={onCambiarAvance}
              onCambiarEstado={onCambiarEstado}
              onToggleEnviado={onToggleEnviado}
              puedeDesbloquear={puedeDesbloquear}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            borderRadius: 14,
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
          }}
        >
          <div style={{ overflowX: "auto", width: "100%" }}>
            <div style={{ minWidth: 960 }}>
              {/* Encabezado de tabla */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 2.2fr 1.2fr 95px 105px 180px 115px 135px 80px",
                  padding: "10px 16px",
                  background: "var(--surface-subtle, #f8fafc)",
                  borderBottom: "1px solid var(--border, rgba(0,0,0,0.08))",
                  fontSize: 10.5,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: "var(--text-subtle, #667085)",
                  alignItems: "center",
                }}
              >
                <span>Código</span>
                <span>Cliente &amp; Proyecto</span>
                <span>Ciudad</span>
                <span>Inicio</span>
                <span style={{ textAlign: "center" }}>Equipo / Fotos</span>
                <span>Avance en Vivo</span>
                <span style={{ textAlign: "center" }}>Estado</span>
                <span style={{ textAlign: "center" }}>Documentación</span>
                <span style={{ textAlign: "right" }}>Acción</span>
              </div>

              {/* Filas */}
              <div style={{ display: "flex", flexDirection: "column" }}>
                {filtradas.map((o, idx) => (
                  <FilaTablaObraApple
                    key={o.id}
                    o={o}
                    cotizacion={(cotizaciones || []).find((c) => c.id === o.cotizacionId)}
                    fotosCount={fotosPorObra.get(o.id) || 0}
                    horarios={horarios}
                    zebra={idx % 2 === 1}
                    onAbrir={() => onAbrir(o)}
                    onCambiarAvance={onCambiarAvance}
                    onCambiarEstado={onCambiarEstado}
                    onToggleEnviado={onToggleEnviado}
                    puedeDesbloquear={puedeDesbloquear}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================================================================
// COMPONENTES SECUNDARIOS DE ALTA CALIDAD ESTILO APPLE
// ===================================================================

function BotonSegmentado({ activo, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: activo ? 600 : 500,
        color: activo ? "var(--text-main, #101828)" : "var(--text-muted, #667085)",
        background: activo ? "var(--surface, #ffffff)" : "transparent",
        boxShadow: activo ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
        border: "none",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function FilaTablaObraApple({
  o,
  cotizacion,
  fotosCount = 0,
  horarios = [],
  zebra,
  onAbrir,
  onCambiarAvance,
  onCambiarEstado,
  onToggleEnviado,
  puedeDesbloquear,
}) {
  const idsDirectos = Array.isArray(o.empleados) ? o.empleados : [];
  const idsHorarios = (horarios || []).filter((h) => h.obraId === o.id).map((h) => h.empleadoId).filter(Boolean);
  const totalEmpleados = [...new Set([...idsDirectos, ...idsHorarios])].length;
  const avance = Number(o.avance) || 0;
  const bloqueada = obraEstaCerrada(o) && !puedeDesbloquear;
  const enviado = Boolean(o.enviadoAlCliente);

  const cliente = normalizarRazonSocial(o.cliente);
  const proyecto = String(o.proyecto || "").trim();
  const repetido = proyecto && proyecto.replace(/[.\s]/g, "").toUpperCase() === cliente.replace(/[.\s]/g, "").toUpperCase();
  const subtitulo = repetido ? "" : proyecto;

  const colorBarra = avance === 100 ? "#15803d" : "#f47c20";

  return (
    <div
      onClick={onAbrir}
      style={{
        display: "grid",
        gridTemplateColumns: "90px 2.2fr 1.2fr 95px 105px 180px 115px 135px 80px",
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
      {/* Código */}
      <div>
        <span
          style={{
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--text-main, #101828)",
            padding: "2px 7px",
            background: "var(--surface-subtle, #f1f5f9)",
            borderRadius: 6,
            border: "1px solid var(--border, rgba(0,0,0,0.08))",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {o.id}
        </span>
      </div>

      {/* Cliente & Proyecto */}
      <div style={{ paddingRight: 10, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 600,
            color: "var(--text-main, #101828)",
            fontSize: 12.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {cliente || "Sin cliente"}
        </div>
        {subtitulo && (
          <div
            style={{
              color: "var(--text-muted, #667085)",
              fontSize: 11,
              marginTop: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {subtitulo}
          </div>
        )}
      </div>

      {/* Ciudad */}
      <div
        style={{
          color: "var(--text-muted, #475467)",
          fontSize: 11.5,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          paddingRight: 8,
        }}
      >
        {o.ciudad || "—"}
      </div>

      {/* Fecha Inicio */}
      <div style={{ color: "var(--text-muted, #667085)", fontSize: 11.5 }}>
        {fmtD(o.fechaInicio) || "—"}
      </div>

      {/* Equipo / Fotos */}
      <div style={{ textAlign: "center", display: "flex", justifyContent: "center", gap: 6 }}>
        <span
          title="Personal asignado a la obra"
          style={{
            fontSize: 11,
            color: "var(--text-muted, #475467)",
            background: "var(--surface-subtle, #f1f5f9)",
            padding: "1px 6px",
            borderRadius: 999,
            fontWeight: 500,
          }}
        >
          {totalEmpleados} 👷
        </span>
        <span
          title={fotosCount > 0 ? "Fotos cargadas en bitácora" : "Sin fotos de avance"}
          style={{
            fontSize: 11,
            color: fotosCount > 0 ? "#0071e3" : "#98a2b3",
            background: fotosCount > 0 ? "rgba(0, 113, 227, 0.08)" : "var(--surface-subtle, #f1f5f9)",
            padding: "1px 6px",
            borderRadius: 999,
            fontWeight: 500,
          }}
        >
          {fotosCount} 📸
        </span>
      </div>

      {/* Avance en Vivo (Slider interactivo en fila) */}
      <div style={{ paddingRight: 10 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 2 }}>
          <span style={{ fontSize: 10.5, color: "var(--text-muted, #667085)" }}>Avance</span>
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: colorBarra,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {avance}%
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 4,
            background: "var(--border, #e2e8f0)",
            borderRadius: 999,
            overflow: "hidden",
            marginBottom: 2,
          }}
        >
          <div
            style={{
              width: `${avance}%`,
              height: "100%",
              background: colorBarra,
              borderRadius: 999,
              transition: "width 0.2s ease",
            }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={avance}
          disabled={bloqueada}
          title={bloqueada ? "Obra finalizada: el avance está bloqueado." : "Deslizar para actualizar avance"}
          onChange={(e) => onCambiarAvance(o.id, Number(e.target.value))}
          style={{
            width: "100%",
            height: 4,
            accentColor: colorBarra,
            display: "block",
            cursor: bloqueada ? "not-allowed" : "pointer",
            opacity: bloqueada ? 0.5 : 1,
            margin: 0,
          }}
        />
      </div>

      {/* Estado (Badge o Selector) */}
      <div style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        {bloqueada ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#15803d",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              borderRadius: 999,
              padding: "2px 8px",
              display: "inline-block",
            }}
          >
            🔒 Finalizado
          </span>
        ) : (
          <select
            value={estadoObraDe(o)}
            onChange={(e) => onCambiarEstado(o.id, e.target.value)}
            style={{
              ...estiloSelect,
              fontSize: 11,
              padding: "3px 6px",
              fontWeight: 600,
              color:
                estadoObraDe(o) === "Finalizado"
                  ? "#15803d"
                  : estadoObraDe(o) === "En Obra"
                  ? "#c2410c"
                  : "var(--text-main, #101828)",
            }}
          >
            {ESTADOS_OBRA.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Documentación Enviada (Toggle) */}
      <div style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onToggleEnviado?.(o.id, !enviado)}
          title={
            enviado
              ? `Documentación enviada al cliente${o.fechaEnvioCliente ? ` (${fmtD(o.fechaEnvioCliente)})` : ""}. Clic para cambiar.`
              : "Marcar como documentación enviada al cliente"
          }
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "3px 9px",
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            border: enviado ? "1px solid #a7f3d0" : "1px dashed var(--border, #cbd5e1)",
            background: enviado ? "#ecfdf5" : "var(--surface-subtle, #f8fafc)",
            color: enviado ? "#15803d" : "var(--text-muted, #64748b)",
            transition: "all 0.15s ease",
          }}
        >
          <span>{enviado ? "Enviada" : "Sin enviar"}</span>
          {enviado ? <IconoPalomita size={14} color="#15803d" /> : <span style={{ fontSize: 9 }}>○</span>}
        </button>
      </div>

      {/* Acción: Ver */}
      <div style={{ textAlign: "right" }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#0071e3",
            display: "inline-flex",
            alignItems: "center",
            gap: 3,
          }}
        >
          Ver &rarr;
        </span>
      </div>
    </div>
  );
}

function TarjetaObraApple({
  o,
  cotizacion,
  fotosCount = 0,
  horarios = [],
  onAbrir,
  onCambiarAvance,
  onCambiarEstado,
  onToggleEnviado,
  puedeDesbloquear,
}) {
  const [hover, setHover] = useState(false);
  const idsDirectos = Array.isArray(o.empleados) ? o.empleados : [];
  const idsHorarios = (horarios || []).filter((h) => h.obraId === o.id).map((h) => h.empleadoId).filter(Boolean);
  const totalEmpleados = [...new Set([...idsDirectos, ...idsHorarios])].length;
  const avance = Number(o.avance) || 0;
  const bloqueada = obraEstaCerrada(o) && !puedeDesbloquear;
  const enviado = Boolean(o.enviadoAlCliente);

  const cliente = normalizarRazonSocial(o.cliente);
  const proyecto = String(o.proyecto || "").trim();
  const repetido = proyecto && proyecto.replace(/[.\s]/g, "").toUpperCase() === cliente.replace(/[.\s]/g, "").toUpperCase();
  const subtitulo = repetido ? "" : proyecto;
  const colorBarra = avance === 100 ? "#15803d" : "#f47c20";

  return (
    <article
      onClick={onAbrir}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface, #ffffff)",
        border: `1px solid ${hover ? "#0071e3" : "var(--border, rgba(0, 0, 0, 0.08))"}`,
        borderRadius: 16,
        padding: "15px 16px",
        boxShadow: hover
          ? "0 12px 28px -6px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)"
          : "0 2px 8px -2px rgba(0, 0, 0, 0.02), 0 1px 2px rgba(0, 0, 0, 0.02)",
        transform: hover ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 12,
        minWidth: 0,
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Barra de acento izquierdo */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3.5,
          background: colorBarra,
        }}
      />

      <div style={{ minWidth: 0, maxWidth: "100%", width: "100%", boxSizing: "border-box" }}>
        {/* Cabecera: Código, estado y envío */}
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
          <span
            style={{
              fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 7px",
              borderRadius: 6,
              background: "var(--surface-subtle, #f1f5f9)",
              color: "var(--text-main, #101828)",
              border: "1px solid var(--border, rgba(0,0,0,0.08))",
              flexShrink: 0,
            }}
          >
            {o.id}
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => onToggleEnviado?.(o.id, !enviado)}
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: enviado ? "#15803d" : "var(--text-muted, #64748b)",
                background: enviado ? "#ecfdf5" : "transparent",
                border: `1px solid ${enviado ? "#a7f3d0" : "var(--border, #cbd5e1)"}`,
                borderRadius: 999,
                padding: "1px 7px",
                cursor: "pointer",
              }}
            >
              {enviado ? "🕊️ Enviada" : "Sin enviar"}
            </button>

            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                borderRadius: 999,
                padding: "2px 8px",
                background:
                  estadoObraDe(o) === "Finalizado"
                    ? "#ecfdf5"
                    : estadoObraDe(o) === "En Obra"
                    ? "rgba(255, 149, 0, 0.1)"
                    : "var(--surface-subtle, #f1f5f9)",
                color:
                  estadoObraDe(o) === "Finalizado"
                    ? "#15803d"
                    : estadoObraDe(o) === "En Obra"
                    ? "#c2410c"
                    : "var(--text-muted, #667085)",
              }}
            >
              {estadoObraDe(o)}
            </span>
          </div>
        </div>

        {/* Cliente & Proyecto */}
        <h3
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: "var(--text-main, #101828)",
            margin: "0 0 2px",
            lineHeight: 1.3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {cliente || "Sin cliente"}
        </h3>
        {subtitulo && (
          <div
            style={{
              fontSize: 11.5,
              color: "var(--text-muted, #667085)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "100%",
            }}
          >
            {subtitulo}
          </div>
        )}

        <div style={{ display: "flex", gap: 10, fontSize: 11, color: "var(--text-muted, #475467)", marginTop: 6, minWidth: 0, maxWidth: "100%" }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>📍 {o.ciudad || "—"}</span>
          <span style={{ flexShrink: 0 }}>📅 {fmtD(o.fechaInicio) || "—"}</span>
        </div>
      </div>

      {/* Avance Slider & Acciones */}
      <div style={{ paddingTop: 8, borderTop: "1px solid var(--border, rgba(0,0,0,0.05))", width: "100%", minWidth: 0, boxSizing: "border-box" }} onClick={(e) => e.stopPropagation()}>
        <div className="no-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 2, width: "100%", minWidth: 0 }}>
          <span style={{ color: "var(--text-muted, #667085)" }}>Avance</span>
          <span style={{ fontWeight: 600, color: colorBarra, fontVariantNumeric: "tabular-nums" }}>
            {avance}%
          </span>
        </div>
        <div
          style={{
            width: "100%",
            height: 4,
            background: "var(--border, #e2e8f0)",
            borderRadius: 999,
            overflow: "hidden",
            marginBottom: 3,
          }}
        >
          <div
            style={{
              width: `${avance}%`,
              height: "100%",
              background: colorBarra,
              borderRadius: 999,
              transition: "width 0.2s ease",
            }}
          />
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={avance}
          disabled={bloqueada}
          onChange={(e) => onCambiarAvance(o.id, Number(e.target.value))}
          style={{
            width: "100%",
            accentColor: colorBarra,
            display: "block",
            cursor: bloqueada ? "not-allowed" : "pointer",
            margin: "0 0 6px",
          }}
        />

        <div className="no-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, width: "100%", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <span style={{ color: "var(--text-muted, #475467)" }}>👷 {totalEmpleados}</span>
            <span style={{ color: fotosCount > 0 ? "#0071e3" : "#98a2b3" }}>📸 {fotosCount}</span>
          </div>
          <span style={{ fontWeight: 600, color: "#0071e3", flexShrink: 0 }}>Ver Obra &rarr;</span>
        </div>
      </div>
    </article>
  );
}

const estiloSelect = {
  background: "var(--surface, #ffffff)",
  border: "1px solid var(--border, rgba(0, 0, 0, 0.1))",
  borderRadius: 8,
  padding: "4px 8px",
  fontSize: 11.5,
  color: "var(--text-main, #101828)",
  outline: "none",
  cursor: "pointer",
};
