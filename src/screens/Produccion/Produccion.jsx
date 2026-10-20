import { useState, useEffect } from "react";
import { useIsMobile } from "../../hooks/useMediaQuery";
import ListaTareasProduccion from "./ListaTareasProduccion";
import ModalTareaProduccion from "./ModalTareaProduccion";
import { TAREAS_PRODUCCION_INIT, limpiarTareasEjemplo } from "./tareasSeed";

export default function Produccion({ ctx = {} }) {
  const isMobile = useIsMobile();
  const {
    obras = [],
    empleados = [],
    membresia = {},
    tareasProduccion,
    setTareasProduccion,
  } = ctx;

  // Si el contexto global provee tareasProduccion usamos esas; si no, estado local persistido
  const [tareas, setTareas] = useState(() => {
    if (Array.isArray(tareasProduccion)) {
      return limpiarTareasEjemplo(tareasProduccion);
    }
    try {
      const guardadas = localStorage.getItem("ingeanclajes_tareas_produccion");
      if (guardadas) {
        const parsed = JSON.parse(guardadas);
        const limpias = limpiarTareasEjemplo(parsed);
        if (limpias.length !== parsed.length) {
          localStorage.setItem("ingeanclajes_tareas_produccion", JSON.stringify(limpias));
        }
        return limpias;
      }
    } catch (e) {
      console.warn("No se pudo cargar ingeanclajes_tareas_produccion", e);
    }
    return [];
  });

  // Sincronizar si cambian las tareas externamente (ej: desde AppDataContext)
  useEffect(() => {
    if (Array.isArray(tareasProduccion)) {
      const limpias = limpiarTareasEjemplo(tareasProduccion);
      setTareas((prev) => {
        if (prev === limpias) return prev;
        if (JSON.stringify(prev) === JSON.stringify(limpias)) return prev;
        return limpias;
      });
    }
  }, [tareasProduccion]);

  // Sincronizar hacia localStorage y hacia AppDataContext
  useEffect(() => {
    const limpias = limpiarTareasEjemplo(tareas);
    try {
      localStorage.setItem("ingeanclajes_tareas_produccion", JSON.stringify(limpias));
    } catch (e) {
      console.warn("No se pudo guardar ingeanclajes_tareas_produccion", e);
    }
    if (typeof setTareasProduccion === "function") {
      setTareasProduccion(limpias);
    }
  }, [tareas, setTareasProduccion]);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [, setResponsablePreseleccionado] = useState("Paola");

  const abrirNuevaTarea = (responsable = "Paola") => {
    setResponsablePreseleccionado(responsable);
    setTareaSeleccionada(null);
    setModalAbierto(true);
  };

  const abrirEditarTarea = (t) => {
    setTareaSeleccionada(t);
    setModalAbierto(true);
  };

  const guardarTarea = (nuevaOEditada) => {
    setTareas((prev) => {
      const existe = prev.some((t) => t.id === nuevaOEditada.id);
      if (existe) {
        return prev.map((t) => (t.id === nuevaOEditada.id ? nuevaOEditada : t));
      }
      return [nuevaOEditada, ...prev];
    });
    setModalAbierto(false);
  };

  const eliminarTarea = (id) => {
    setTareas((prev) => prev.filter((t) => t.id !== id));
    setModalAbierto(false);
  };

  const cambiarEstadoTarea = (id, nuevoEstado) => {
    setTareas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, estado: nuevoEstado, fechaActualizacion: new Date().toISOString() } : t))
    );
  };

  const usuarioNombre = membresia?.nombre || "Camila";

  return (
    <div
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 28px" : "14px 16px 32px",
        width: "100%",
        boxSizing: "border-box",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Cabecera compacta estilo Apple */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "var(--text-main, #1d1d1f)",
              letterSpacing: "-0.02em",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>👥</span>
            <span>Tareas con el equipo</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted, #6e6e73)", marginTop: 2 }}>
            Asigna tareas a tus colaboradores, define fechas límite y revisa pendientes en tiempo real
          </div>
        </div>

        <button
          type="button"
          onClick={() => abrirNuevaTarea("Paola")}
          style={{
            background: "#1d1d1f",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
            transition: "all 0.15s ease",
          }}
        >
          <span>+</span>
          <span>Asignar Tarea al Equipo</span>
        </button>
      </div>

      {/* Tableros y Listas de Tareas */}
      <ListaTareasProduccion
        tareas={tareas}
        obras={obras}
        empleados={empleados}
        obraInicial={ctx.intencion?.obraId || "todas"}
        onVerTarea={abrirEditarTarea}
        onNuevaTarea={abrirNuevaTarea}
        onCambiarEstado={cambiarEstadoTarea}
        usuarioActual={usuarioNombre}
        documentosEquipo={ctx.documentosEquipo}
        onActualizarDocumentos={ctx.setDocumentosEquipo}
      />

      {/* Modal para Crear y Editar Tareas */}
      <ModalTareaProduccion
        tarea={tareaSeleccionada}
        abierto={modalAbierto}
        onCerrar={() => setModalAbierto(false)}
        onGuardar={guardarTarea}
        onEliminar={eliminarTarea}
        obras={obras}
        empleados={empleados}
        usuarioActual={usuarioNombre}
      />
    </div>
  );
}
