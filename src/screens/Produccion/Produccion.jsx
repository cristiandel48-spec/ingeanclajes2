import { useState, useEffect } from "react";
import H1 from "../../components/ui/H1";
import { B } from "../../styles/tokens";
import { useIsMobile } from "../../hooks/useMediaQuery";
import ListaTareasProduccion from "./ListaTareasProduccion";
import ModalTareaProduccion from "./ModalTareaProduccion";
import { TAREAS_PRODUCCION_INIT } from "./tareasSeed";

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
    if (Array.isArray(tareasProduccion) && tareasProduccion.length > 0) {
      return tareasProduccion;
    }
    try {
      const guardadas = localStorage.getItem("ingeanclajes_tareas_produccion");
      if (guardadas) {
        const parsed = JSON.parse(guardadas);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("No se pudo cargar ingeanclajes_tareas_produccion", e);
    }
    return TAREAS_PRODUCCION_INIT;
  });

  // Sincronizar hacia localStorage y hacia AppDataContext
  useEffect(() => {
    try {
      localStorage.setItem("ingeanclajes_tareas_produccion", JSON.stringify(tareas));
    } catch (e) {
      console.warn("No se pudo guardar ingeanclajes_tareas_produccion", e);
    }
    if (typeof setTareasProduccion === "function") {
      setTareasProduccion(tareas);
    }
  }, [tareas, setTareasProduccion]);

  const [modalAbierto, setModalAbierto] = useState(false);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [responsablePreseleccionado, setResponsablePreseleccionado] = useState("Paola");

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
      {/* Encabezado Principal Apple */}
      <H1
        eyebrow="CONTROL OPERATIVO Y EQUIPO"
        title="Gestión de Producción"
        subtitle={`${tareas.length} tarea(s) en seguimiento · Asignación, avances de obra y control de pendientes del equipo`}
        action={
          <button
            type="button"
            style={{
              ...B("#1d1d1f"),
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.12)",
              borderRadius: 10,
              padding: "8px 16px",
              fontSize: 12.5,
              fontWeight: 600,
            }}
            onClick={() => abrirNuevaTarea("Paola")}
          >
            + Nueva Tarea
          </button>
        }
      />

      {/* Tableros y Listas de Tareas */}
      <ListaTareasProduccion
        tareas={tareas}
        obras={obras}
        obraInicial={ctx.intencion?.obraId || "todas"}
        onVerTarea={abrirEditarTarea}
        onNuevaTarea={abrirNuevaTarea}
        onCambiarEstado={cambiarEstadoTarea}
        usuarioActual={usuarioNombre}
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
