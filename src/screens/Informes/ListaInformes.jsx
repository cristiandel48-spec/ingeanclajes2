import { useMemo, useState, useEffect, useRef } from "react";
import { fmtD } from "../../lib/format";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { BarraFija, CABECERA_FIJA, ConmutadorVista, EmptyState, StatusPill } from "../../components/ui";
import { ESTADO_FIRMA } from "../../lib/firmaRecibido";
import Icono from "../../components/ui/Icono";

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

// Firma de recibido del cliente. «Firmado» es lo que interesa ver de un
// vistazo; lo pendiente sale mas discreto y lo anulado no sale.
function MarcaFirma({ estado }) {
  if (!estado || estado === "anulado") return null;
  const e = ESTADO_FIRMA[estado];
  return (
    <StatusPill tono={e.tono} title="Firma de recibido del cliente" style={{ flexShrink: 0 }}>
      {estado === "firmado" ? "Firmado" : estado === "abierto" ? "Sin firmar" : "Enviado a firma"}
    </StatusPill>
  );
}

export default function ListaInformes({ informes = [], acciones = {}, estadosFirma = {} }) {  const isMobile = useIsMobile();
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
        {/* Selector Segmentado de Estados */}
        <div
          style={{
            background: "var(--surface-subtle, #f5f5f7)",
            padding: 3,
            borderRadius: 12,
            display: "inline-flex",
            alignItems: "center",
            border: "none",
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
              <Icono nombre="buscar" size={14} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 4 }} />
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
                fontSize: 13,
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
                  fontSize: 11,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  color: "var(--text-subtle, #86868b)",
                  background: "var(--surface-subtle, #f5f5f7)",
                  border: "none",
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
          <ConmutadorVista valor={modoVista} onChange={cambiarModoVista} opciones={[{ id: "cuadricula", icono: "cuadricula", titulo: "Ver como tarjetas" }, { id: "tabla", icono: "lista", titulo: "Ver como lista" }]} />

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
      </BarraFija>

      {/* Listado de Informes */}
      {informesFiltrados.length === 0 ? (
        <div style={{ background: "var(--surface)", borderRadius: 18 }}>
          <EmptyState
            icono="documento"
            titulo="No se encontraron informes"
            texto={busqueda ? `No hay ningún informe que coincida con «${busqueda}». Prueba con otro término.` : "Los informes de actividades se generan a partir de los avances de cada obra."}
          />
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
              estadoFirma={estadosFirma[inf.id]}
            />
          ))}
        </div>
      ) : (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "none",
            borderRadius: 16,
            // clip y no hidden: hidden no deja pegar los titulos al bajar.
            overflow: "clip",
            boxShadow: "none",
          }}
        >
          {/* Cabecera de la tabla */}
          <div
            style={{
              ...CABECERA_FIJA,
              display: "grid",
              gridTemplateColumns: "96px minmax(160px, 2.2fr) minmax(130px, 1.4fr) 95px 80px 80px 160px",
              columnGap: 10,
              alignItems: "center",
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
              estadoFirma={estadosFirma[inf.id]}
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
        color: activo ? "var(--text-primary)" : "var(--text-secondary)",
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

function TarjetaInformeApple({ informe: inf, acciones, estadoFirma }) {
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
                border: "none",
                flexShrink: 0,
              }}
            >
              {inf.id}
            </span>
            <MarcaFirma estado={estadoFirma} />
            <span style={{ fontSize: 11, color: "var(--text-muted, #667085)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {fmtD(inf.fechaInforme)}
            </span>
          </div>

          <div style={{ flexShrink: 0 }}>
            {fotos > 0 ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 999,
                  padding: "2px 8px",
                  background: "var(--success-bg)",
                  color: "var(--success-text)",
                  border: "1px solid #a7f3d0",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icono nombre="camara" size={14} />
                <span>{fotos} fotos</span>
              </span>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: 999,
                  padding: "2px 8px",
                  background: "var(--warning-bg)",
                  color: "var(--warning-text)",
                  border: "1px solid var(--warning-bg)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icono nombre="alerta" size={14} />
                <span>Sin fotos</span>
              </span>
            )}
          </div>
        </div>

        {/* Título: Proyecto / Cliente */}
        <h3
          style={{
            fontSize: 15,
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
            fontSize: 12,
            color: "var(--text-muted, #667085)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
            marginBottom: 8,
          }}
        >
          <Icono nombre="ubicacion" size={14} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 4 }} />{localizacion || "Obra"} · <strong style={{ fontVariantNumeric: "tabular-nums", color: "var(--text-main, #101828)" }}>{inf.obraId || "—"}</strong>
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
              border: "none",
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
              border: "none",
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
                color: "var(--info)",
                border: "none",
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
                color: "var(--danger-text)",
                border: "1px solid rgba(185, 28, 28, 0.25)",
                borderRadius: 8,
                padding: "6px 9px",
                fontSize: 12,
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
                color: "var(--success-text)",
                border: "1px solid #a7f3d0",
                borderRadius: 8,
                padding: "6px 9px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              <Icono nombre="documento" size={14} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 4 }} />Certificar
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function FilaTablaInforme({ informe: inf, acciones, estadoFirma, zebra }) {
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
        gridTemplateColumns: "96px minmax(160px, 2.2fr) minmax(130px, 1.4fr) 95px 80px 80px 160px",
        columnGap: 10,
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
      <div style={{ minWidth: 0 }}>
        <span
          style={{
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-main, #101828)",
            padding: "2px 7px",
            background: "var(--surface-subtle, #f1f5f9)",
            borderRadius: 6,
            border: "none",
          }}
        >
          {inf.id}
        </span>
        {estadoFirma && estadoFirma !== "anulado" && (
          <div style={{ marginTop: 4 }}><MarcaFirma estado={estadoFirma} /></div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: "var(--text-main, #101828)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {proyecto}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-muted, #667085)", marginTop: 1 }}>
          <Icono nombre="calendario" size={14} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 4 }} />{fmtD(inf.fechaInforme)}
        </div>
      </div>

      <div style={{ minWidth: 0, color: "var(--text-muted, #475467)", fontSize: 12 }}>
        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><Icono nombre="ubicacion" size={14} style={{ display: "inline-block", verticalAlign: "-2px", marginRight: 4 }} />{localizacion || "—"}</div>
        <div style={{ fontVariantNumeric: "tabular-nums", fontSize: 11, color: "var(--text-subtle, #86868b)" }}>{inf.obraId || "—"}</div>
      </div>

      <div>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main, #1d1d1f)" }}>
          {actividades} act.
        </span>
      </div>

      <div>
        <span style={{ fontSize: 12, color: "var(--text-muted, #475467)" }}>
          {operarios}
        </span>
      </div>

      <div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: fotos > 0 ? "var(--success-text)" : "var(--warning-text)",
            background: fotos > 0 ? "var(--success-bg)" : "var(--warning-bg)",
            border: `1px solid ${fotos > 0 ? "#a7f3d0" : "#fde68a"}`,
            borderRadius: 6,
            padding: "1px 6px",
          }}
        >
          {fotos > 0 ? `${fotos}` : "0"}
        </span>
      </div>

      <div style={{ minWidth: 0, display: "flex", gap: 5, justifyContent: "flex-end", flexWrap: "nowrap" }} onClick={(e) => e.stopPropagation()}>
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
              color: "var(--danger-text)",
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
