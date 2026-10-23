import { useState, useMemo, useEffect, useRef } from "react";
import { fmtD } from "../../lib/format";
import { useIsMobile } from "../../hooks/useMediaQuery";
import DocumentosEquipo from "./DocumentosEquipo";

const ESTADOS = [
  { id: "por_hacer", label: "Por Hacer", icono: "📝", bg: "#f5f5f7", color: "#1d1d1f" },
  { id: "en_proceso", label: "En Ejecución", icono: "⚡", bg: "#eff6ff", color: "#1d4ed8" },
  { id: "en_revision", label: "En Revisión", icono: "👀", bg: "#f5f3ff", color: "#6d28d9" },
  { id: "completada", label: "Completada", icono: "✅", bg: "#ecfdf5", color: "#047857" },
];

export function calcularVigenciaTarea(fechaLimite) {
  if (!fechaLimite) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(fechaLimite + "T00:00:00");
  if (isNaN(limite.getTime())) return null;

  const diffDias = Math.ceil((limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDias < 0) {
    return {
      estado: "vencida",
      dias: diffDias,
      texto: `Vencida (${fmtD(fechaLimite)})`,
      color: "#b91c1c",
      bg: "#fef2f2",
      borde: "#fecaca",
      icono: "⚠️",
    };
  }
  if (diffDias === 0) {
    return {
      estado: "hoy",
      dias: 0,
      texto: "Vence hoy",
      color: "#b45309",
      bg: "#fffbeb",
      borde: "#fde68a",
      icono: "⏳",
    };
  }
  if (diffDias === 1) {
    return {
      estado: "manana",
      dias: 1,
      texto: "Vence mañana",
      color: "#b45309",
      bg: "#fffbeb",
      borde: "#fde68a",
      icono: "⏳",
    };
  }
  return {
    estado: "al_dia",
    dias: diffDias,
    texto: fmtD(fechaLimite),
    color: "#047857",
    bg: "#ecfdf5",
    borde: "#a7f3d0",
    icono: "🛡️",
  };
}

export default function ListaTareasProduccion({
  tareas = [],
  obras = [],
  empleados = [],
  obraInicial = "todas",
  onVerTarea,
  onNuevaTarea,
  onCambiarEstado,
  usuarioActual = "Camila",
  documentosEquipo,
  onActualizarDocumentos,
}) {
  const isMobile = useIsMobile();
  const [vista, setVista] = useState("documentos"); // "documentos" | "personas" | "radar" | "kanban" | "tabla"
  const [busqueda, setBusqueda] = useState("");
  const [filtroResponsable, setFiltroResponsable] = useState("todos");
  const [filtroObra, setFiltroObra] = useState(obraInicial || "todas");
  const [filtroPrioridad] = useState("todas");
  const inputBusquedaRef = useRef(null);

  useEffect(() => {
    if (obraInicial && obraInicial !== "todas") {
      setFiltroObra(obraInicial);
    }
  }, [obraInicial]);

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

  // Lista única de colaboradores que tienen tareas o pertenecen al equipo
  const colaboradores = useMemo(() => {
    const set = new Set(["Paola", "Camila", "Carlos Restrepo"]);
    (empleados || []).forEach((e) => {
      const nom = (e.nombre || e.nombreCompleto || "").trim();
      if (nom) set.add(nom);
    });
    (tareas || []).forEach((t) => {
      if (t.responsable) set.add(t.responsable);
    });
    return Array.from(set);
  }, [tareas, empleados]);

  // Conteos por persona
  const conteoPorPersona = useMemo(() => {
    const counts = {};
    (tareas || []).forEach((t) => {
      const resp = t.responsable || "Sin asignar";
      counts[resp] = (counts[resp] || 0) + 1;
    });
    return counts;
  }, [tareas]);

  // Tareas filtradas
  const tareasFiltradas = useMemo(() => {
    let list = Array.isArray(tareas) ? [...tareas] : [];

    if (filtroResponsable !== "todos") {
      list = list.filter((t) => t.responsable === filtroResponsable);
    }

    if (filtroObra !== "todas") {
      list = list.filter((t) => t.obraId === filtroObra);
    }

    if (filtroPrioridad !== "todas") {
      list = list.filter((t) => t.prioridad === filtroPrioridad);
    }

    const q = busqueda.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const text = [
          t.titulo,
          t.descripcion,
          t.responsable,
          t.obraId,
          t.obraNombre,
          t.prioridad,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return text.includes(q);
      });
    }

    return list;
  }, [tareas, filtroResponsable, filtroObra, filtroPrioridad, busqueda]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 1360,
        margin: "0 auto",
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* ========================================================= */}
      {/* BARRA DE HERRAMIENTAS: Vistas, Filtros y Buscador         */}
      {/* ========================================================= */}
      <div
        style={{
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
          borderRadius: 16,
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 20,
          flexWrap: "wrap",
          boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.02)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Selector Segmentado de Modo de Vista */}
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
              activo={vista === "documentos"}
              onClick={() => setVista("documentos")}
              label="Documentos y Notas"
            />
            <BotonSegmentado
              activo={vista === "personas"}
              onClick={() => setVista("personas")}
              label="👥 Por Colaborador"
            />
            <BotonSegmentado
              activo={vista === "radar"}
              onClick={() => setVista("radar")}
              label="🎯 Lo que delegué"
            />
            <BotonSegmentado
              activo={vista === "kanban"}
              onClick={() => setVista("kanban")}
              label="Por Estado"
            />
            <BotonSegmentado
              activo={vista === "tabla"}
              onClick={() => setVista("tabla")}
              label="Tabla"
            />
          </div>

          {/* Filtro Rápido por Avatar / Colaborador */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", maxWidth: isMobile ? "100%" : 420 }}>
            <button
              type="button"
              onClick={() => setFiltroResponsable("todos")}
              style={{
                background: filtroResponsable === "todos" ? "#ffffff" : "var(--surface-subtle, #f5f5f7)",
                color: "var(--text-main, #1d1d1f)",
                border: `1px solid ${filtroResponsable === "todos" ? "#1d1d1f" : "var(--border, rgba(0,0,0,0.08))"}`,
                borderRadius: 20,
                padding: "4px 10px",
                fontSize: 11.5,
                fontWeight: filtroResponsable === "todos" ? 700 : 500,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Todos ({tareas.length})
            </button>
            {colaboradores.map((colab) => {
              const count = conteoPorPersona[colab] || 0;
              const selected = filtroResponsable === colab;
              return (
                <button
                  key={colab}
                  type="button"
                  onClick={() => setFiltroResponsable(selected ? "todos" : colab)}
                  style={{
                    background: selected ? "#ffffff" : "var(--surface-subtle, #f5f5f7)",
                    color: "var(--text-main, #1d1d1f)",
                    border: `1px solid ${selected ? "#1d1d1f" : "var(--border, rgba(0,0,0,0.08))"}`,
                    borderRadius: 20,
                    padding: "3px 9px 3px 5px",
                    fontSize: 11.5,
                    fontWeight: selected ? 700 : 500,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    whiteSpace: "nowrap",
                  }}
                >
                  <AvatarCircle nombre={colab} size={18} />
                  <span>{colab}</span>
                  <span style={{ fontSize: 10, color: "var(--text-subtle, #86868b)" }}>({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Buscador Spotlight y Filtro de Obra */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: isMobile ? "1 1 100%" : "0 0 auto" }}>
          {/* Spotlight Search */}
          <div style={{ position: "relative", width: isMobile ? "100%" : 240 }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 12,
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
              placeholder="Buscar tarea u obra..."
              style={{
                width: "100%",
                padding: "7px 24px 7px 30px",
                fontSize: 12,
                borderRadius: 9,
                border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
                background: "var(--surface-subtle, #f5f5f7)",
                color: "var(--text-main, #1d1d1f)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda("")}
                style={{
                  position: "absolute",
                  right: 6,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-subtle, #86868b)",
                  fontSize: 11,
                }}
              >
                ✕
              </button>
            )}
          </div>

          {/* Filtro Obra */}
          <select
            value={filtroObra}
            onChange={(e) => setFiltroObra(e.target.value)}
            style={{
              padding: "6px 10px",
              fontSize: 11.5,
              borderRadius: 8,
              border: "1px solid var(--border, rgba(0, 0, 0, 0.12))",
              background: "var(--surface, #ffffff)",
              color: "var(--text-main, #1d1d1f)",
              cursor: "pointer",
              outline: "none",
              maxWidth: 160,
            }}
          >
            <option value="todas">Todas las obras</option>
            <option value="general">Oficina / General</option>
            {(obras || []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================= */}
      {/* VISTA 0: DOCUMENTOS, NOTAS Y ENLACES (ESTILO NOTION)      */}
      {/* ========================================================= */}
      {vista === "documentos" && (
        <div style={{ marginBottom: 24 }}>
          <DocumentosEquipo
            obras={obras}
            empleados={empleados}
            usuarioActual={usuarioActual}
            documentosExternos={documentosEquipo}
            onActualizarDocumentos={onActualizarDocumentos}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 1: TABLERO POR COLABORADOR                          */}
      {/* ========================================================= */}
      {vista === "personas" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : `repeat(auto-fit, minmax(320px, 1fr))`,
            gap: 18,
            alignItems: "start",
          }}
        >
          {colaboradores
            .filter((c) => filtroResponsable === "todos" || filtroResponsable === c)
            .map((persona) => {
              const tareasPersona = tareasFiltradas.filter((t) => t.responsable === persona);
              const pendientesPersona = tareasPersona.filter((t) => t.estado !== "completada");
              const empInfo = (empleados || []).find((e) => (e.nombre || e.nombreCompleto) === persona);
              const rolPersona = persona === "Paola"
                ? "Coordinación & Compras"
                : persona === "Camila"
                ? "Dirección & Aprobaciones"
                : (empInfo?.cargo || empInfo?.rol || "Técnico en obra");

              return (
                <div
                  key={persona}
                  style={{
                    background: "var(--surface-subtle, #f5f5f7)",
                    borderRadius: 18,
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    border: "1px solid var(--border, rgba(0,0,0,0.06))",
                  }}
                >
                  {/* Encabezado de Columna */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "2px 4px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <AvatarCircle nombre={persona} size={28} />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>
                          {persona}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted, #6e6e73)" }}>
                          {rolPersona}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        background: pendientesPersona.length > 0 ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                        color: pendientesPersona.length > 0 ? "#b45309" : "#047857",
                        borderRadius: 10,
                      }}
                    >
                      {pendientesPersona.length} pend.
                    </span>
                  </div>

                  {/* Botón rápido superior para asignar tarea directamente */}
                  <button
                    type="button"
                    onClick={() => onNuevaTarea(persona)}
                    style={{
                      background: "#ffffff",
                      color: "var(--text-main, #1d1d1f)",
                      border: "1px solid var(--border, rgba(0,0,0,0.12))",
                      borderRadius: 10,
                      padding: "7px 10px",
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 5,
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>+</span>
                    <span>Asignar tarea a {persona.split(" ")[0]}</span>
                  </button>

                  {/* Tarjetas de Tareas */}
                  {tareasPersona.length === 0 ? (
                    <div
                      style={{
                        background: "var(--surface, #ffffff)",
                        borderRadius: 12,
                        padding: "24px 16px",
                        textAlign: "center",
                        fontSize: 12,
                        color: "var(--text-subtle, #86868b)",
                        border: "1px dashed var(--border, rgba(0,0,0,0.12))",
                      }}
                    >
                      Sin tareas asignadas
                    </div>
                  ) : (
                    tareasPersona.map((t) => (
                      <TarjetaTareaApple
                        key={t.id}
                        tarea={t}
                        onClick={() => onVerTarea(t)}
                        onCambiarEstado={onCambiarEstado}
                      />
                    ))
                  )}

                  {/* Botón rápido al pie de la columna */}
                  <button
                    type="button"
                    onClick={() => onNuevaTarea(persona)}
                    style={{
                      background: "var(--surface, #ffffff)",
                      color: "var(--text-main, #1d1d1f)",
                      border: "1px dashed var(--border, rgba(0,0,0,0.15))",
                      borderRadius: 12,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>+ Asignar tarea a {persona}</span>
                  </button>
                </div>
              );
            })}
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: TABLERO KANBAN POR ESTADOS                       */}
      {/* ========================================================= */}
      {vista === "kanban" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          {ESTADOS.map((col) => {
            const tareasEstado = tareasFiltradas.filter((t) => (t.estado || "por_hacer") === col.id);
            return (
              <div
                key={col.id}
                style={{
                  background: "var(--surface-subtle, #f5f5f7)",
                  borderRadius: 18,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  border: "1px solid var(--border, rgba(0,0,0,0.06))",
                }}
              >
                {/* Encabezado Columna Kanban */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "2px 4px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{col.icono}</span>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>
                      {col.label}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      background: "rgba(0,0,0,0.06)",
                      borderRadius: 10,
                      color: "var(--text-main, #1d1d1f)",
                    }}
                  >
                    {tareasEstado.length}
                  </span>
                </div>

                {/* Tarjetas */}
                {tareasEstado.length === 0 ? (
                  <div
                    style={{
                      background: "var(--surface, #ffffff)",
                      borderRadius: 12,
                      padding: "24px 16px",
                      textAlign: "center",
                      fontSize: 12,
                      color: "var(--text-subtle, #86868b)",
                      border: "1px dashed var(--border, rgba(0,0,0,0.12))",
                    }}
                  >
                    Vacío
                  </div>
                ) : (
                  tareasEstado.map((t) => (
                    <TarjetaTareaApple
                      key={t.id}
                      tarea={t}
                      onClick={() => onVerTarea(t)}
                      onCambiarEstado={onCambiarEstado}
                      mostrarResponsable
                    />
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 3: MI RADAR (CAMILA)                                */}
      {/* ========================================================= */}
      {vista === "radar" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 20,
          }}
        >
          {/* Bloque 1: Lo que Camila delegó */}
          <div
            style={{
              background: "var(--surface, #ffffff)",
              borderRadius: 18,
              border: "1px solid var(--border, rgba(0,0,0,0.08))",
              padding: 20,
              boxShadow: "0 2px 8px -2px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 12,
                borderBottom: "1px solid var(--border, rgba(0,0,0,0.08))",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📋</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>
                  Tareas que Camila le delegó al equipo
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", background: "#f5f5f7", borderRadius: 10 }}>
                  {tareas.filter((t) => t.responsable !== "Camila" && t.estado !== "completada").length} activas
                </span>
                <button
                  type="button"
                  onClick={() => onNuevaTarea("Paola")}
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
                  + Asignar
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tareas
                .filter((t) => t.responsable !== "Camila" && t.estado !== "completada")
                .map((t) => {
                  const vig = calcularVigenciaTarea(t.fechaLimite);
                  return (
                    <div
                      key={t.id}
                      onClick={() => onVerTarea(t)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "var(--surface-subtle, #fbfbfd)",
                        border: "1px solid var(--border, rgba(0,0,0,0.08))",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <AvatarCircle nombre={t.responsable} size={18} />
                          <strong style={{ fontSize: 12.5, color: "var(--text-main, #1d1d1f)" }}>
                            {t.responsable}
                          </strong>
                          <span style={{ fontSize: 11, color: "var(--text-subtle, #86868b)" }}>
                            · {t.obraId}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main, #1d1d1f)" }}>
                          {t.titulo}
                        </div>
                        {t.descripcion && (
                          <div style={{ fontSize: 11.5, color: "var(--text-muted, #6e6e73)", marginTop: 2 }}>
                            {t.descripcion}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {vig && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: vig.color,
                              background: vig.bg,
                              border: `1px solid ${vig.borde}`,
                              borderRadius: 6,
                              padding: "2px 6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <span>{vig.icono}</span>
                            <span>{vig.texto}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Bloque 2: Mis acciones directas (Camila) */}
          <div
            style={{
              background: "var(--surface, #ffffff)",
              borderRadius: 18,
              border: "1px solid var(--border, rgba(0,0,0,0.08))",
              padding: 20,
              boxShadow: "0 2px 8px -2px rgba(0,0,0,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: 12,
                borderBottom: "1px solid var(--border, rgba(0,0,0,0.08))",
                marginBottom: 16,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🔔</span>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>
                  Mis pendientes directos (Acciones de Camila)
                </span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 7px", background: "#f5f5f7", borderRadius: 10 }}>
                {tareas.filter((t) => t.responsable === "Camila" && t.estado !== "completada").length} por atender
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {tareas
                .filter((t) => t.responsable === "Camila" && t.estado !== "completada")
                .map((t) => {
                  const vig = calcularVigenciaTarea(t.fechaLimite);
                  return (
                    <div
                      key={t.id}
                      onClick={() => onVerTarea(t)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "var(--surface-subtle, #fbfbfd)",
                        border: "1px solid var(--border, rgba(0,0,0,0.08))",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: 10,
                        transition: "all 0.15s ease",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-subtle, #86868b)" }}>
                            Obra: {t.obraId}
                          </span>
                          {t.prioridad === "urgente" && (
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "1px 5px", borderRadius: 4 }}>
                              🔥 Urgente
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main, #1d1d1f)" }}>
                          {t.titulo}
                        </div>
                        {t.descripcion && (
                          <div style={{ fontSize: 11.5, color: "var(--text-muted, #6e6e73)", marginTop: 2 }}>
                            {t.descripcion}
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        {vig && (
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: vig.color,
                              background: vig.bg,
                              border: `1px solid ${vig.borde}`,
                              borderRadius: 6,
                              padding: "2px 6px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            <span>{vig.icono}</span>
                            <span>{vig.texto}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            <div
              style={{
                marginTop: 20,
                background: "var(--surface-subtle, #f5f5f7)",
                borderRadius: 12,
                padding: "12px 14px",
                border: "1px solid var(--border, rgba(0,0,0,0.06))",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main, #1d1d1f)", marginBottom: 3 }}>
                Enfoque Ejecutivo
              </div>
              <p style={{ fontSize: 11.5, color: "var(--text-muted, #6e6e73)", margin: 0, lineHeight: 1.45 }}>
                En 5 segundos sabes si Paola o los técnicos en obra tienen tareas bloqueadas o por vencer, sin tener que revisar reporte por reporte.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 4: MODO LISTA / TABLA                               */}
      {/* ========================================================= */}
      {vista === "tabla" && (
        <div
          style={{
            background: "var(--surface, #ffffff)",
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 2px 8px -2px rgba(0, 0, 0, 0.02)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "110px 2.4fr 1.2fr 130px 130px 100px",
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
            <div>Obra</div>
            <div>Tarea</div>
            <div>Responsable</div>
            <div>Vencimiento</div>
            <div>Estado</div>
            <div style={{ textAlign: "right" }}>Acción</div>
          </div>

          {tareasFiltradas.length === 0 ? (
            <div
              style={{
                padding: "48px 16px",
                textAlign: "center",
                color: "var(--text-muted, #86868b)",
                fontSize: 13,
                background: "var(--surface, #ffffff)",
              }}
            >
              No hay tareas registradas. Haz clic en <strong>+ Asignar Tarea al Equipo</strong> arriba para comenzar.
            </div>
          ) : (
            tareasFiltradas.map((t, idx) => {
            const vig = calcularVigenciaTarea(t.fechaLimite);
            const estObj = ESTADOS.find((e) => e.id === t.estado) || ESTADOS[0];
            return (
              <div
                key={t.id}
                onClick={() => onVerTarea(t)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "110px 2.4fr 1.2fr 130px 130px 100px",
                  alignItems: "center",
                  padding: "11px 16px",
                  background: idx % 2 === 1 ? "var(--surface-subtle, #fafafa)" : "var(--surface, #ffffff)",
                  borderBottom: "1px solid var(--border, rgba(0, 0, 0, 0.06))",
                  fontSize: 12.5,
                  cursor: "pointer",
                }}
              >
                <div>
                  <span
                    style={{
                      fontVariantNumeric: "tabular-nums",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 6px",
                      background: "var(--surface-subtle, #f5f5f7)",
                      borderRadius: 6,
                      border: "1px solid var(--border, rgba(0,0,0,0.08))",
                    }}
                  >
                    {t.obraId}
                  </span>
                </div>
                <div style={{ minWidth: 0, paddingRight: 10 }}>
                  <div style={{ fontWeight: 600, color: "var(--text-main, #1d1d1f)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.titulo}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <AvatarCircle nombre={t.responsable} size={18} />
                  <span>{t.responsable}</span>
                </div>
                <div>
                  {vig && (
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: vig.color }}>
                      {vig.icono} {vig.texto}
                    </span>
                  )}
                </div>
                <div>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: 6,
                      background: estObj.bg,
                      color: estObj.color,
                      border: "1px solid var(--border, rgba(0,0,0,0.08))",
                    }}
                  >
                    {estObj.label}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVerTarea(t);
                    }}
                    style={{
                      background: "#1d1d1f",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Ver →
                  </button>
                </div>
              </div>
            );
          })
        )}
        </div>
      )}
    </div>
  );
}

function TarjetaTareaApple({ tarea: t, onClick, onCambiarEstado, mostrarResponsable = false }) {
  const [hover, setHover] = useState(false);
  const vig = calcularVigenciaTarea(t.fechaLimite);
  const estObj = ESTADOS.find((e) => e.id === t.estado) || ESTADOS[0];

  const totalCheck = (t.checklist || []).length;
  const hechasCheck = (t.checklist || []).filter((c) => c.hecha).length;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface, #ffffff)",
        borderRadius: 14,
        border: `1px solid ${hover ? "#0071e3" : "var(--border, rgba(0, 0, 0, 0.08))"}`,
        padding: "13px 15px",
        display: "flex",
        flexDirection: "column",
        gap: 9,
        cursor: "pointer",
        boxShadow: hover
          ? "0 8px 20px -6px rgba(0, 0, 0, 0.08)"
          : "0 2px 6px -2px rgba(0, 0, 0, 0.03)",
        transform: hover ? "translateY(-1px)" : "none",
        transition: "all 0.16s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* Cabecera Tarjeta: Obra y Prioridad */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              fontVariantNumeric: "tabular-nums",
              fontSize: 10.5,
              fontWeight: 700,
              padding: "2px 6px",
              background: "var(--surface-subtle, #f5f5f7)",
              borderRadius: 6,
              border: "1px solid var(--border, rgba(0,0,0,0.08))",
              color: "var(--text-main, #1d1d1f)",
            }}
          >
            {t.obraId}
          </span>
          {mostrarResponsable && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <AvatarCircle nombre={t.responsable} size={18} />
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-main, #1d1d1f)" }}>
                {t.responsable}
              </span>
            </div>
          )}
        </div>

        {t.prioridad === "urgente" ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#b91c1c", background: "#fef2f2", border: "1px solid #fecaca", padding: "1px 6px", borderRadius: 5 }}>
            🔥 Urgente
          </span>
        ) : t.prioridad === "alta" ? (
          <span style={{ fontSize: 10, fontWeight: 700, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", padding: "1px 6px", borderRadius: 5 }}>
            ⚡ Alta
          </span>
        ) : null}
      </div>

      {/* Fila Principal con Checkbox Apple y Título */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
        <button
          type="button"
          title={t.estado === "completada" ? "Marcar como pendiente" : "Marcar como completada"}
          onClick={(e) => {
            e.stopPropagation();
            onCambiarEstado?.(t.id, t.estado === "completada" ? "por_hacer" : "completada");
          }}
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            border: `1.8px solid ${t.estado === "completada" ? "#10b981" : "#d1d5db"}`,
            background: t.estado === "completada" ? "#10b981" : "transparent",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            marginTop: 2,
            flexShrink: 0,
            transition: "all 0.15s ease",
          }}
        >
          {t.estado === "completada" && (
            <span style={{ color: "#ffffff", fontSize: 11, fontWeight: 800 }}>✓</span>
          )}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: t.estado === "completada" ? "var(--text-subtle, #86868b)" : "var(--text-main, #1d1d1f)",
              textDecoration: t.estado === "completada" ? "line-through" : "none",
              lineHeight: 1.35,
            }}
          >
            {t.titulo}
          </div>
          {t.asignadoPor && (
            <div style={{ fontSize: 10.5, color: "var(--text-subtle, #86868b)", marginTop: 2 }}>
              Delegada por: <strong>{t.asignadoPor}</strong>
            </div>
          )}
        </div>
      </div>

      {/* Descripción corta */}
      {t.descripcion && (
        <div
          style={{
            fontSize: 11.5,
            color: "var(--text-muted, #6e6e73)",
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {t.descripcion}
        </div>
      )}

      {/* Checklist progress */}
      {totalCheck > 0 && (
        <div style={{ fontSize: 11, color: "var(--text-subtle, #86868b)", display: "flex", alignItems: "center", gap: 4 }}>
          <span>☑️</span>
          <span>{hechasCheck} de {totalCheck} pasos listos</span>
        </div>
      )}

      {/* Pie de Tarjeta: Vencimiento y Estado */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 8,
          borderTop: "1px solid rgba(0, 0, 0, 0.05)",
          marginTop: 2,
        }}
      >
        <div>
          {vig && (
            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: vig.color,
                background: vig.bg,
                border: `1px solid ${vig.borde}`,
                borderRadius: 5,
                padding: "2px 6px",
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
              }}
            >
              <span>{vig.icono}</span>
              <span>{vig.texto}</span>
            </span>
          )}
        </div>

        <select
          value={t.estado}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onCambiarEstado(t.id, e.target.value)}
          style={{
            fontSize: 10.5,
            fontWeight: 600,
            padding: "3px 6px",
            borderRadius: 6,
            background: estObj.bg,
            color: estObj.color,
            border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
            cursor: "pointer",
            outline: "none",
          }}
        >
          {ESTADOS.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
      </div>
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
      }}
    >
      {label}
    </button>
  );
}

function AvatarCircle({ nombre = "", size = 22 }) {
  const n = String(nombre || "").trim();
  const inicial = (n[0] || "U").toUpperCase();

  let bg = "#1d1d1f";
  if (n.toLowerCase().includes("paola")) bg = "#7c3aed";
  else if (n.toLowerCase().includes("camila")) bg = "#0284c7";
  else if (n.toLowerCase().includes("carlos")) bg = "#059669";
  else if (n.toLowerCase().includes("pedro")) bg = "#d97706";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: "#ffffff",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.45,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {inicial}
    </div>
  );
}
