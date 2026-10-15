import { useState, useMemo, useRef, useEffect } from "react";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { DOCUMENTOS_EQUIPO_INIT, limpiarDocumentosEjemplo } from "./documentosSeed";

const NARANJA = "#f47c20";

const COLOR_BANNERS = {
  verde: { nombre: "Verde Logros", bg: "#2e7d32", dot: "#34c759", text: "#ffffff" },
  morado: { nombre: "Morado Iniciativas", bg: "#5856d6", dot: "#af52de", text: "#ffffff" },
  azul: { nombre: "Azul Desarrollo", bg: "#0071e3", dot: "#007aff", text: "#ffffff" },
  naranja: { nombre: "Naranja Prioridades", bg: "#f47c20", dot: "#ff9500", text: "#ffffff" },
  grafito: { nombre: "Grafito Oscuro", bg: "#1c1c1e", dot: "#8e8e93", text: "#ffffff" },
};

export default function DocumentosEquipo({
  obras = [],
  empleados = [],
  usuarioActual = "Camila",
  documentosExternos,
  onActualizarDocumentos,
}) {
  const isMobile = useIsMobile();

  // Estado de documentos persistido localmente y sincronizado (sin ejemplos)
  const [documentos, setDocumentos] = useState(() => {
    if (Array.isArray(documentosExternos)) {
      return limpiarDocumentosEjemplo(documentosExternos);
    }
    try {
      const guardados = localStorage.getItem("ingeanclajes_documentos_equipo");
      if (guardados) {
        const parsed = JSON.parse(guardados);
        const limpias = limpiarDocumentosEjemplo(parsed);
        if (limpias.length !== parsed.length) {
          localStorage.setItem("ingeanclajes_documentos_equipo", JSON.stringify(limpias));
        }
        return limpias;
      }
    } catch (e) {
      console.warn("No se pudo cargar ingeanclajes_documentos_equipo", e);
    }
    return [];
  });

  // Sincronizar si cambian los documentos externamente (ej: carga desde la nube o sincronización)
  useEffect(() => {
    if (Array.isArray(documentosExternos)) {
      const limpias = limpiarDocumentosEjemplo(documentosExternos);
      setDocumentos((prev) => {
        if (prev === limpias) return prev;
        if (JSON.stringify(prev) === JSON.stringify(limpias)) return prev;
        return limpias;
      });
    }
  }, [documentosExternos]);

  // Guardar en localStorage y propagar si hay callback
  useEffect(() => {
    const limpias = limpiarDocumentosEjemplo(documentos);
    try {
      localStorage.setItem("ingeanclajes_documentos_equipo", JSON.stringify(limpias));
    } catch (e) {
      console.warn("No se pudo guardar ingeanclajes_documentos_equipo", e);
    }
    if (typeof onActualizarDocumentos === "function") {
      onActualizarDocumentos(limpias);
    }
  }, [documentos, onActualizarDocumentos]);

  // Documento actualmente seleccionado
  const [docActivoId, setDocActivoId] = useState(() => documentos[0]?.id || "");
  const [busqueda, setBusqueda] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [menuInsertarAbierto, setMenuInsertarAbierto] = useState(false);
  const [menuInferiorAbierto, setMenuInferiorAbierto] = useState(false);
  const [toastMensaje, setToastMensaje] = useState("");

  // Modal inline que reemplaza todos los prompt() nativos del navegador
  const [modalInput, setModalInput] = useState(null);
  // modalInput = { titulo, placeholder, valorInicial, onConfirmar } | null
  const inputModalRef = useRef(null);

  const docActivo = useMemo(() => {
    if (documentos.length === 0) return null;
    return documentos.find((d) => d.id === docActivoId) || documentos[0];
  }, [documentos, docActivoId]);



  // Filtrado de documentos en el sidebar
  const docsFiltrados = useMemo(() => {
    return documentos.filter((d) => {
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        return (d.titulo || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [documentos, busqueda]);

  const mostrarToast = (msg) => {
    setToastMensaje(msg);
    setTimeout(() => setToastMensaje(""), 3500);
  };

  // Reemplaza window.prompt() con un modal inline apple-style
  const pedirInput = ({ titulo, placeholder = "", valorInicial = "", multilinea = false }) =>
    new Promise((resolve) => {
      setModalInput({ titulo, placeholder, valorInicial, multilinea, onConfirmar: resolve });
      setTimeout(() => inputModalRef.current?.focus(), 80);
    });

  // Crear nuevo documento
  const crearNuevoDocumento = async () => {
    const nombre = await pedirInput({
      titulo: "Nombre del documento",
      placeholder: "Nueva Documentación de Obra",
      valorInicial: "Nueva Documentación de Obra",
    });
    if (!nombre || !nombre.trim()) return;

    const nuevoDoc = {
      id: `doc-${Date.now()}`,
      titulo: nombre.trim(),
      icono: "📁",
      obraNombre: "",
      responsable: "",
      favorito: false,
      fechaCreacion: new Date().toISOString().slice(0, 10),
      fechaActualizacion: new Date().toISOString().slice(0, 10),
      enlaces: [],
      bloques: [
        {
          id: `b-${Date.now()}-1`,
          tipo: "banner",
          titulo: "Logros y retos del ciclo",
          color: "verde",
          items: [
            { id: `v-${Date.now()}-1`, texto: "Primer logro o entrega importante", icono: "verde", nivel: 0 },
            { id: `v-${Date.now()}-2`, texto: "Seguimiento técnico y validaciones", icono: "punto", nivel: 0 },
            { id: `v-${Date.now()}-3`, texto: "Detalle de acuerdos y fechas clave", icono: "punto", nivel: 1 },
          ],
        },
        {
          id: `b-${Date.now()}-2`,
          tipo: "checklist",
          titulo: "Primeros pendientes",
          items: [
            {
              id: `t-${Date.now()}-1`,
              texto: "Definir cronograma y actividades",
              fecha: new Date().toISOString().slice(0, 10),
              responsable: "",
              completada: false,
            },
          ],
        },
      ],
    };

    setDocumentos((prev) => [nuevoDoc, ...prev]);
    setDocActivoId(nuevoDoc.id);
    mostrarToast("Documento creado exitosamente");
  };

  // Actualizar campo del documento activo
  const actualizarDocActivo = (campo, valor) => {
    setDocumentos((prev) =>
      prev.map((d) =>
        d.id === docActivoId
          ? { ...d, [campo]: valor, fechaActualizacion: new Date().toISOString().slice(0, 10) }
          : d
      )
    );
  };

  // Marcar/Desmarcar tarea interactiva
  const toggleTarea = (bloqueId, tareaId) => {
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docActivoId) return d;
        const nuevosBloques = (d.bloques || []).map((b) => {
          if (b.id !== bloqueId || b.tipo !== "checklist") return b;
          const nuevosItems = (b.items || []).map((item) => {
            if (item.id !== tareaId) return item;
            return { ...item, completada: !item.completada };
          });
          return { ...b, items: nuevosItems };
        });
        return { ...d, bloques: nuevosBloques, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      })
    );
  };

  // Añadir tarea rápida a un bloque checklist
  const agregarTareaABloque = async (bloqueId) => {
    const texto = await pedirInput({ titulo: "Nueva tarea", placeholder: "Describe la tarea o pendiente..." });
    if (!texto || !texto.trim()) return;

    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docActivoId) return d;
        const nuevosBloques = (d.bloques || []).map((b) => {
          if (b.id !== bloqueId || b.tipo !== "checklist") return b;
          const nuevaTarea = {
            id: `t-${Date.now()}`,
            texto: texto.trim(),
            fecha: new Date().toISOString().slice(0, 10),
            responsable: "",
            completada: false,
          };
          return { ...b, items: [...(b.items || []), nuevaTarea] };
        });
        return { ...d, bloques: nuevosBloques, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      })
    );
  };

  // Alternar apertura de acordeón / toggle
  const toggleAcordeon = (bloqueId) => {
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docActivoId) return d;
        const nuevosBloques = (d.bloques || []).map((b) => {
          if (b.id !== bloqueId) return b;
          return { ...b, abierto: !b.abierto };
        });
        return { ...d, bloques: nuevosBloques };
      })
    );
  };

  // Actualizar cualquier campo de un bloque
  const actualizarBloque = (bloqueId, campos) => {
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docActivoId) return d;
        const nuevosBloques = (d.bloques || []).map((b) =>
          b.id === bloqueId ? { ...b, ...campos } : b
        );
        return { ...d, bloques: nuevosBloques, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      })
    );
  };

  // Eliminar un bloque
  const eliminarBloque = (bloqueId) => {
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docActivoId) return d;
        return {
          ...d,
          bloques: (d.bloques || []).filter((b) => b.id !== bloqueId),
          fechaActualizacion: new Date().toISOString().slice(0, 10),
        };
      })
    );
    mostrarToast("Bloque eliminado");
  };

  // Añadir ítem a una lista de viñetas o banner
  const agregarItemVineta = (bloqueId, texto = "", nivel = 0, despuesDeId = null) => {
    const nuevoItem = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      texto,
      icono: "punto",
      nivel,
    };
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docActivoId) return d;
        const nuevosBloques = (d.bloques || []).map((b) => {
          if (b.id !== bloqueId) return b;
          const itemsActuales = Array.isArray(b.items) ? b.items : [];
          if (!despuesDeId) {
            return { ...b, items: [...itemsActuales, nuevoItem] };
          }
          const idx = itemsActuales.findIndex((i) => i.id === despuesDeId);
          if (idx === -1) {
            return { ...b, items: [...itemsActuales, nuevoItem] };
          }
          const copia = [...itemsActuales];
          copia.splice(idx + 1, 0, nuevoItem);
          return { ...b, items: copia };
        });
        return { ...d, bloques: nuevosBloques, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      })
    );
  };

  // Actualizar texto o propiedades de una viñeta
  const actualizarItemVineta = (bloqueId, itemId, campos) => {
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docActivoId) return d;
        const nuevosBloques = (d.bloques || []).map((b) => {
          if (b.id !== bloqueId) return b;
          const nuevosItems = (b.items || []).map((item) =>
            item.id === itemId ? { ...item, ...campos } : item
          );
          return { ...b, items: nuevosItems };
        });
        return { ...d, bloques: nuevosBloques, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      })
    );
  };

  // Eliminar una viñeta
  const eliminarItemVineta = (bloqueId, itemId) => {
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docActivoId) return d;
        const nuevosBloques = (d.bloques || []).map((b) => {
          if (b.id !== bloqueId) return b;
          const filtrados = (b.items || []).filter((item) => item.id !== itemId);
          return { ...b, items: filtrados };
        });
        return { ...d, bloques: nuevosBloques, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      })
    );
  };

  // Ciclar icono de viñeta: punto (•) -> verde (🟢) -> amarillo (🟡) -> rojo (🔴) -> check (✓)
  const ciclarIconoVineta = (bloqueId, itemId) => {
    const orden = ["punto", "verde", "amarillo", "rojo", "check"];
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docActivoId) return d;
        const nuevosBloques = (d.bloques || []).map((b) => {
          if (b.id !== bloqueId) return b;
          const nuevosItems = (b.items || []).map((item) => {
            if (item.id !== itemId) return item;
            const actual = item.icono || "punto";
            const proximo = orden[(orden.indexOf(actual) + 1) % orden.length];
            return { ...item, icono: proximo };
          });
          return { ...b, items: nuevosItems };
        });
        return { ...d, bloques: nuevosBloques, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      })
    );
  };

  // Cambiar nivel de sangría (sub-viñeta)
  const cambiarNivelVineta = (bloqueId, itemId, delta) => {
    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docActivoId) return d;
        const nuevosBloques = (d.bloques || []).map((b) => {
          if (b.id !== bloqueId) return b;
          const nuevosItems = (b.items || []).map((item) => {
            if (item.id !== itemId) return item;
            const nivelActual = item.nivel || 0;
            const nuevoNivel = Math.max(0, Math.min(1, nivelActual + delta));
            return { ...item, nivel: nuevoNivel };
          });
          return { ...b, items: nuevosItems };
        });
        return { ...d, bloques: nuevosBloques, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      })
    );
  };

  // Pegar múltiples líneas y convertirlas automáticamente en viñetas
  const pegarMultiplesVinetas = async (bloqueId) => {
    const texto = await pedirInput({
      titulo: "Pegar viñetas o texto",
      placeholder: "Pega tus notas aquí. Cada línea será una viñeta. Puedes incluir •, -, o 🟢",
      multilinea: true,
    });
    if (!texto || !texto.trim()) return;

    const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lineas.length === 0) return;

    const nuevosItems = lineas.map((linea) => {
      const tieneIndent = linea.startsWith("  ") || linea.startsWith("\t");
      let limpio = linea.replace(/^[-*•\d.)\s]+/, "").trim();
      let icono = "punto";
      if (linea.includes("🟢") || limpio.toLowerCase().startsWith("logro") || limpio.toLowerCase().startsWith("exito")) {
        icono = "verde";
      } else if (linea.includes("🟡")) {
        icono = "amarillo";
      } else if (linea.includes("🔴")) {
        icono = "rojo";
      } else if (linea.includes("✓") || linea.includes("[x]")) {
        icono = "check";
      }
      limpio = limpio.replace(/^[🟢🟡🔴✓]\s*/, "");

      return {
        id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        texto: limpio || linea,
        icono,
        nivel: tieneIndent ? 1 : 0,
      };
    });

    setDocumentos((prev) =>
      prev.map((d) => {
        if (d.id !== docActivoId) return d;
        const nuevosBloques = (d.bloques || []).map((b) => {
          if (b.id !== bloqueId) return b;
          return { ...b, items: [...(b.items || []), ...nuevosItems] };
        });
        return { ...d, bloques: nuevosBloques, fechaActualizacion: new Date().toISOString().slice(0, 10) };
      })
    );
    mostrarToast(`${nuevosItems.length} viñetas añadidas`);
  };

  // Insertar un nuevo bloque según tipo
  const insertarBloque = async (tipo) => {
    setMenuInsertarAbierto(false);
    setMenuInferiorAbierto(false);

    if (tipo === "enlace") {
      const tituloEnlace = await pedirInput({ titulo: "Título del enlace o subpágina", placeholder: "Nueva subpágina", valorInicial: "Nueva subpágina" });
      if (!tituloEnlace || !tituloEnlace.trim()) return;
      const descEnlace = await pedirInput({ titulo: "Descripción breve", placeholder: "Documento vinculado", valorInicial: "Documento vinculado" }) || "";

      // Crear también el documento hijo si no existe
      const idHijo = `doc-sub-${Date.now()}`;
      const nuevoHijo = {
        id: idHijo,
        titulo: tituloEnlace.trim(),
        icono: "📄",
        obraNombre: "",
        responsable: "",
        favorito: false,
        fechaCreacion: new Date().toISOString().slice(0, 10),
        fechaActualizacion: new Date().toISOString().slice(0, 10),
        enlaces: [{ id: docActivo.id, icono: docActivo.icono || "🏢", titulo: `Volver a ${docActivo.titulo}`, desc: "Página principal" }],
        bloques: [
          {
            id: `b-${Date.now()}`,
            tipo: "checklist",
            titulo: "Pendientes",
            items: [{ id: `t-${Date.now()}`, texto: "Primer pendiente", completada: false, responsable: "" }],
          },
        ],
      };

      setDocumentos((prev) => {
        const actualizados = prev.map((d) => {
          if (d.id !== docActivoId) return d;
          const nuevoEnlace = {
            id: idHijo,
            icono: "📄",
            titulo: tituloEnlace.trim(),
            desc: descEnlace,
          };
          return { ...d, enlaces: [...(d.enlaces || []), nuevoEnlace] };
        });
        return [nuevoHijo, ...actualizados];
      });

      mostrarToast("Subpágina vinculada creada exitosamente");
      return;
    }

    let nuevoBloque = null;

    if (tipo === "banner") {
      const titulo = await pedirInput({
        titulo: "Título de la sección con banner",
        placeholder: "Logros y retos del ciclo",
        valorInicial: "Logros y retos del ciclo",
      });
      if (!titulo) return;
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "banner",
        titulo: titulo.trim(),
        color: "verde",
        items: [
          { id: `v-${Date.now()}-1`, texto: "Primer punto o logro destacado", icono: "punto", nivel: 0 },
        ],
      };
    } else if (tipo === "vineta") {
      const titulo = await pedirInput({
        titulo: "Título del grupo de viñetas",
        placeholder: "E. Logros y retos del ciclo",
        valorInicial: "E. Logros y retos del ciclo",
      });
      if (!titulo) return;
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "vineta",
        titulo: titulo.trim(),
        items: [
          { id: `v-${Date.now()}-1`, texto: "Primer punto de seguimiento", icono: "punto", nivel: 0 },
        ],
      };
    } else if (tipo === "desplegable") {
      const titulo = await pedirInput({ titulo: "Título del desplegable", placeholder: "▶ Sección desplegable", valorInicial: "▶ Sección desplegable" });
      if (!titulo) return;
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "desplegable",
        titulo: titulo.trim(),
        abierto: true,
        contenido: "Escribe aquí la información que se puede ocultar o expandir...",
      };
    } else if (tipo === "destacado") {
      const texto = await pedirInput({ titulo: "Texto de la nota destacada", placeholder: "Nota importante o recordatorio", valorInicial: "Nota importante o recordatorio" });
      if (!texto) return;
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "destacado",
        icono: "💡",
        color: "amber",
        texto: texto.trim(),
      };
    } else if (tipo === "checklist") {
      const titulo = await pedirInput({ titulo: "Título del grupo de tareas", placeholder: "Lista de pendientes", valorInicial: "Lista de pendientes" });
      if (!titulo) return;
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "checklist",
        titulo: titulo.trim(),
        items: [
          {
            id: `t-${Date.now()}`,
            texto: "Primera tarea",
            fecha: new Date().toISOString().slice(0, 10),
            responsable: "",
            completada: false,
          },
        ],
      };
    } else if (tipo === "codigo") {
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "codigo",
        lenguaje: "bash",
        titulo: "Comandos / Instrucciones técnicas",
        codigo: "# Escribe aquí comandos, enlaces de servidores o código\n",
      };
    }

    if (nuevoBloque) {
      setDocumentos((prev) =>
        prev.map((d) => {
          if (d.id !== docActivoId) return d;
          return {
            ...d,
            bloques: [...(d.bloques || []), nuevoBloque],
            fechaActualizacion: new Date().toISOString().slice(0, 10),
          };
        })
      );
      mostrarToast("Bloque añadido");
    }
  };

  // Eliminar documento
  const eliminarDocumento = (id) => {
    if (documentos.length <= 1) {
      if (!window.confirm("¿Seguro que deseas eliminar este documento? El espacio quedará vacío.")) return;
      setDocumentos([]);
      setDocActivoId("");
      mostrarToast("Documento eliminado");
      return;
    }
    if (!window.confirm("¿Seguro que deseas eliminar este documento?")) return;
    const restantes = documentos.filter((d) => d.id !== id);
    setDocumentos(restantes);
    setDocActivoId(restantes[0]?.id || "");
    mostrarToast("Documento eliminado");
  };

  // Contar tareas en el documento activo
  const metricasDoc = useMemo(() => {
    if (!docActivo?.bloques) return { total: 0, hechas: 0, pct: 0 };
    let total = 0;
    let hechas = 0;
    docActivo.bloques.forEach((b) => {
      if (b.tipo === "checklist" && Array.isArray(b.items)) {
        total += b.items.length;
        hechas += b.items.filter((i) => i.completada).length;
      }
    });
    const pct = total > 0 ? Math.round((hechas / total) * 100) : 0;
    return { total, hechas, pct };
  }, [docActivo]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : sidebarVisible ? "280px 1fr" : "1fr",
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 4px 20px -4px rgba(0, 0, 0, 0.05)",
        minHeight: 700,
      }}
    >
      {/* Toast Notificación */}
      {toastMensaje && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#1d1d1f",
            color: "#ffffff",
            padding: "8px 16px",
            borderRadius: 10,
            fontSize: 12.5,
            fontWeight: 600,
            zIndex: 99999,
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          ✓ {toastMensaje}
        </div>
      )}

      {/* =================================================================== */}
      {/* SIDEBAR LATERAL ESTILO APPLE NOTES / NOTION                        */}
      {/* =================================================================== */}
      {sidebarVisible && (
        <aside
          style={{
            background: "var(--surface-subtle, #fbfbfd)",
            borderRight: "1px solid var(--border, rgba(0, 0, 0, 0.06))",
            padding: "16px 14px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            {/* Cabecera Sidebar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "0 4px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #1d1d1f)", display: "flex", alignItems: "center", gap: 6 }}>
                <span>📑</span>
                <span>Documentos y Tareas</span>
              </div>
              <button
                type="button"
                onClick={crearNuevoDocumento}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
                  background: "#ffffff",
                  color: "#1d1d1f",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  fontWeight: 600,
                  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                }}
                title="Crear nuevo documento"
              >
                +
              </button>
            </div>

            {/* Buscador Rápido */}
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar documentos..."
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "#ffffff",
                  border: "1px solid var(--border, rgba(0,0,0,0.08))",
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontSize: 11.5,
                  color: "var(--text-main, #1d1d1f)",
                  outline: "none",
                }}
              />
            </div>

            {/* Lista de Documentos */}
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted, #86868b)", textTransform: "uppercase", padding: "0 6px 4px", letterSpacing: "0.05em" }}>
                Documentos ({docsFiltrados.length})
              </div>

              {docsFiltrados.length === 0 ? (
                <div
                  style={{
                    padding: "28px 8px",
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--text-muted, #86868b)",
                    lineHeight: 1.5,
                  }}
                >
                  <div>Sin documentos</div>
                  <button
                    type="button"
                    onClick={crearNuevoDocumento}
                    style={{
                      marginTop: 8,
                      background: "#ffffff",
                      border: "1px solid var(--border, rgba(0,0,0,0.12))",
                      borderRadius: 8,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-main, #1d1d1f)",
                      cursor: "pointer",
                    }}
                  >
                    + Crear documento
                  </button>
                </div>
              ) : (
                docsFiltrados.map((doc) => {
                  const activo = doc.id === docActivoId;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setDocActivoId(doc.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        borderRadius: 10,
                        cursor: "pointer",
                        background: activo ? "rgba(0, 0, 0, 0.06)" : "transparent",
                        color: activo ? "var(--text-main, #1d1d1f)" : "var(--text-muted, #6e6e73)",
                        fontWeight: activo ? 700 : 500,
                        fontSize: 12,
                        transition: "all 0.12s ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                        <span style={{ fontSize: 14 }}>{doc.icono || "📄"}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.titulo}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Sidebar: Progreso */}
          {docActivo && (
            <div style={{ borderTop: "1px solid var(--border, rgba(0,0,0,0.06))", paddingTop: 12, paddingLeft: 4, paddingRight: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted, #86868b)" }}>Progreso en página</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-main, #1d1d1f)" }}>
                    {metricasDoc.hechas} de {metricasDoc.total} tareas ({metricasDoc.pct}%)
                  </div>
                </div>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: "rgba(244, 124, 32, 0.1)",
                    color: NARANJA,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {metricasDoc.pct}%
                </div>
              </div>
            </div>
          )}
        </aside>
      )}

      {/* =================================================================== */}
      {/* ÁREA DE CONTENIDO Y EDITOR DEL DOCUMENTO ESTILO NOTION              */}
      {/* =================================================================== */}
      <main style={{ padding: isMobile ? "16px 14px" : "28px 36px", overflowY: "auto", position: "relative" }}>
        {!docActivo ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: 520,
              textAlign: "center",
              padding: "48px 24px",
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                background: "var(--surface-subtle, #f5f5f7)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                marginBottom: 18,
                border: "1px solid var(--border, rgba(0,0,0,0.06))",
              }}
            >
              📄
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "var(--text-main, #1d1d1f)",
                margin: "0 0 8px",
                letterSpacing: "-0.01em",
              }}
            >
              No hay documentos de equipo
            </h3>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-muted, #86868b)",
                maxWidth: 440,
                margin: "0 0 24px",
                lineHeight: 1.55,
              }}
            >
              Crea tu primer documento interactivo para registrar notas de obra, subpáginas estilo Notion, checklists de tareas o enlaces de interés para el equipo.
            </p>
            <button
              type="button"
              onClick={crearNuevoDocumento}
              style={{
                background: "#1d1d1f",
                color: "#ffffff",
                border: "none",
                borderRadius: 12,
                padding: "11px 22px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: 16 }}>+</span>
              <span>Crear Primer Documento</span>
            </button>
          </div>
        ) : (
          <>
            {/* Barra superior de herramientas del documento */}
            <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 16,
            borderBottom: "1px solid var(--border, rgba(0, 0, 0, 0.06))",
            marginBottom: 24,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {/* Breadcrumbs y Toggle Sidebar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted, #86868b)" }}>
            <button
              type="button"
              onClick={() => setSidebarVisible((v) => !v)}
              title={sidebarVisible ? "Ocultar panel lateral" : "Mostrar panel lateral"}
              style={{
                background: "transparent",
                border: "1px solid var(--border, rgba(0,0,0,0.12))",
                borderRadius: 6,
                padding: "2px 7px",
                fontSize: 12,
                cursor: "pointer",
                color: "var(--text-main, #1d1d1f)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{sidebarVisible ? "◧" : "◨"}</span>
            </button>
            <span>Documentos</span>
            <span>/</span>
            <span style={{ fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>{docActivo?.titulo}</span>
          </div>

          {/* Botones de acción */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                mostrarToast("Enlace interno copiado al portapapeles");
              }}
              style={{
                background: "transparent",
                border: "1px solid var(--border, rgba(0,0,0,0.1))",
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--text-main, #1d1d1f)",
                cursor: "pointer",
              }}
            >
              🔗 Copiar enlace
            </button>

            {/* Menú Insertar Bloque (+) */}
            <div style={{ position: "relative" }}>
              <button
                type="button"
                onClick={() => setMenuInsertarAbierto(!menuInsertarAbierto)}
                style={{
                  background: "#1d1d1f",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                <span>+ Insertar Bloque</span>
                <span style={{ fontSize: 9 }}>▼</span>
              </button>

              {menuInsertarAbierto && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "100%",
                    marginTop: 6,
                    background: "#ffffff",
                    border: "1px solid var(--border, rgba(0,0,0,0.1))",
                    borderRadius: 12,
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)",
                    padding: 6,
                    zIndex: 9999,
                    width: 230,
                  }}
                >
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", padding: "4px 8px" }}>
                    Tipos de bloques
                  </div>
                  {[
                    { tipo: "banner", icono: "🏷️", titulo: "Banner con Viñetas", desc: "Sección con encabezado de color y viñetas" },
                    { tipo: "vineta", icono: "•", titulo: "Lista con Viñetas", desc: "Puntos con viñetas, sangría y estados" },
                    { tipo: "checklist", icono: "☑", titulo: "Lista de Tareas", desc: "Casilla para tachar y organizar" },
                    { tipo: "enlace", icono: "📄", titulo: "Subpágina / Enlace", desc: "Crear documento vinculado" },
                    { tipo: "desplegable", icono: "▶", titulo: "Lista desplegable (Toggle)", desc: "Ocultar o expandir contenido" },
                    { tipo: "destacado", icono: "💡", titulo: "Destacado (Callout)", desc: "Nota o advertencia resaltada" },
                    { tipo: "codigo", icono: "</>", titulo: "Notas técnicas / Código", desc: "Comandos, enlaces o snippets" },
                  ].map((item) => (
                    <button
                      key={item.tipo}
                      type="button"
                      onClick={() => insertarBloque(item.tipo)}
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "6px 8px",
                        borderRadius: 8,
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.1s ease",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle, #f5f5f7)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{item.icono}</span>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>{item.titulo}</div>
                        <div style={{ fontSize: 10, color: "var(--text-muted, #86868b)" }}>{item.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => eliminarDocumento(docActivo.id)}
              style={{
                background: "transparent",
                border: "none",
                color: "#e11d48",
                cursor: "pointer",
                padding: "6px 8px",
                fontSize: 12,
                borderRadius: 8,
              }}
              title="Eliminar documento"
            >
              🗑️
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* CABECERA Y METADATOS DEL DOCUMENTO (Título + Icono + Responsable)   */}
        {/* =================================================================== */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 32, marginBottom: 8, cursor: "pointer" }} title="Cambiar icono">
            {docActivo?.icono || "🏢"}
          </div>

          <input
            type="text"
            value={docActivo?.titulo || ""}
            onChange={(e) => actualizarDocActivo("titulo", e.target.value)}
            style={{
              fontSize: isMobile ? 24 : 32,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--text-main, #1d1d1f)",
              border: "none",
              outline: "none",
              width: "100%",
              background: "transparent",
              marginBottom: 10,
            }}
          />

          {/* Metadatos del documento */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted, #86868b)" }}>
            <span style={{ fontSize: 11, color: "var(--text-muted, #86868b)" }}>
              Actualizado: {docActivo?.fechaActualizacion || "Hoy"}
            </span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* SUB-PÁGINAS Y ENLACES VINCULADOS ESTILO NOTION                     */}
        {/* =================================================================== */}
        {Array.isArray(docActivo?.enlaces) && docActivo.enlaces.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted, #86868b)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Sub-páginas & Enlaces vinculados
            </div>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(240px, 1fr))", gap: 10 }}>
              {docActivo.enlaces.map((enlace, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const existe = documentos.some((d) => d.id === enlace.id);
                    if (existe) {
                      setDocActivoId(enlace.id);
                    } else {
                      mostrarToast(`Abriendo enlace: ${enlace.titulo}`);
                    }
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
                    background: "var(--surface, #ffffff)",
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                    transition: "all 0.12s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = NARANJA;
                    e.currentTarget.style.background = "rgba(244, 124, 32, 0.02)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--border, rgba(0,0,0,0.08))";
                    e.currentTarget.style.background = "var(--surface, #ffffff)";
                  }}
                >
                  <span style={{ fontSize: 18 }}>{enlace.icono || "🌐"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main, #1d1d1f)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {enlace.titulo}
                    </div>
                    {enlace.desc && (
                      <div style={{ fontSize: 10.5, color: "var(--text-muted, #86868b)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {enlace.desc}
                      </div>
                    )}
                  </div>
                  <span style={{ color: "var(--text-muted, #86868b)", fontSize: 12 }}>→</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* BLOQUES DINÁMICOS DEL DOCUMENTO (Toggles, Callouts, Checklists)      */}
        {/* =================================================================== */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {(() => {
            const renderItemsVineta = (bloque) => {
              const items = Array.isArray(bloque.items) ? bloque.items : [];
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 8 }}>
                  {items.map((item, idx) => {
                    const esSubnivel = (item.nivel || 0) > 0;
                    return (
                      <div
                        key={item.id || idx}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 8,
                          paddingLeft: esSubnivel ? 26 : 4,
                          transition: "all 0.12s ease",
                        }}
                      >
                        {/* Viñeta o indicador clicable */}
                        <button
                          type="button"
                          onClick={() => ciclarIconoVineta(bloque.id, item.id)}
                          title="Clic para cambiar viñeta: • | 🟢 | 🟡 | 🔴 | ✓"
                          style={{
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            padding: "3px 0 0",
                            fontSize: item.icono === "punto" || !item.icono ? 16 : 13,
                            lineHeight: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 18,
                            flexShrink: 0,
                            color: "var(--text-main, #1d1d1f)",
                            userSelect: "none",
                          }}
                        >
                          {item.icono === "verde" ? "🟢" :
                           item.icono === "amarillo" ? "🟡" :
                           item.icono === "rojo" ? "🔴" :
                           item.icono === "check" ? "✓" : "•"}
                        </button>

                        {/* Input de texto in-situ */}
                        <input
                          type="text"
                          value={item.texto || ""}
                          onChange={(e) => actualizarItemVineta(bloque.id, item.id, { texto: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              agregarItemVineta(bloque.id, "", item.nivel || 0, item.id);
                            } else if (e.key === "Tab") {
                              e.preventDefault();
                              cambiarNivelVineta(bloque.id, item.id, e.shiftKey ? -1 : 1);
                            } else if (e.key === "Backspace" && !item.texto && items.length > 1) {
                              e.preventDefault();
                              eliminarItemVineta(bloque.id, item.id);
                            }
                          }}
                          placeholder="Escribe un punto, logro o iniciativa..."
                          style={{
                            flex: 1,
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            fontSize: esSubnivel ? 13 : 13.5,
                            color: "var(--text-main, #1d1d1f)",
                            lineHeight: 1.5,
                            fontFamily: "inherit",
                            padding: "2px 0",
                          }}
                        />

                        {/* Acciones rápidas: Indentar, Desindentar, Borrar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 2, opacity: 0.5, flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => cambiarNivelVineta(bloque.id, item.id, esSubnivel ? -1 : 1)}
                            title={esSubnivel ? "Quitar sangría" : "Sangría / Sub-viñeta"}
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 11,
                              color: "var(--text-muted, #86868b)",
                              padding: "1px 4px",
                            }}
                          >
                            {esSubnivel ? "⇤" : "⇥"}
                          </button>
                          <button
                            type="button"
                            onClick={() => eliminarItemVineta(bloque.id, item.id)}
                            title="Eliminar viñeta"
                            style={{
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              fontSize: 12,
                              color: "#e11d48",
                              padding: "1px 4px",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Botones de acción al final de la lista de viñetas */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, paddingLeft: 4 }}>
                    <button
                      type="button"
                      onClick={() => agregarItemVineta(bloque.id, "", 0)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: NARANJA,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 4px",
                      }}
                    >
                      <span>+ Añadir viñeta</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => pegarMultiplesVinetas(bloque.id)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--text-muted, #86868b)",
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 4px",
                      }}
                    >
                      <span>⚡ Pegar varias viñetas</span>
                    </button>
                  </div>
                </div>
              );
            };

            return (docActivo?.bloques || []).map((bloque) => {
              // 0. BLOQUE BANNER DE SECCIÓN CON VIÑETAS (Estilo Slite / Apple)
              if (bloque.tipo === "banner") {
                const col = COLOR_BANNERS[bloque.color || "verde"] || COLOR_BANNERS.verde;
                return (
                  <div
                    key={bloque.id}
                    style={{
                      borderRadius: 16,
                      padding: 0,
                      marginBottom: 6,
                    }}
                  >
                    {/* Encabezado con Banner de Color estilo Slite / Apple */}
                    <div
                      style={{
                        background: col.bg,
                        color: "#ffffff",
                        borderRadius: 14,
                        padding: "13px 20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                      }}
                    >
                      <input
                        type="text"
                        value={bloque.titulo || ""}
                        onChange={(e) => actualizarBloque(bloque.id, { titulo: e.target.value })}
                        placeholder="Título de la sección (ej. Logros y retos del ciclo)..."
                        style={{
                          background: "transparent",
                          border: "none",
                          outline: "none",
                          color: "#ffffff",
                          fontSize: 17,
                          fontWeight: 800,
                          letterSpacing: "-0.01em",
                          width: "100%",
                          fontFamily: "inherit",
                        }}
                      />

                      {/* Selector de color y Eliminar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                        {Object.entries(COLOR_BANNERS).map(([cKey, cVal]) => (
                          <button
                            key={cKey}
                            type="button"
                            onClick={() => actualizarBloque(bloque.id, { color: cKey })}
                            style={{
                              width: 17,
                              height: 17,
                              borderRadius: "50%",
                              background: cVal.dot,
                              border: (bloque.color || "verde") === cKey ? "2px solid #ffffff" : "1px solid rgba(255,255,255,0.4)",
                              cursor: "pointer",
                              padding: 0,
                              boxShadow: (bloque.color || "verde") === cKey ? "0 0 6px rgba(0,0,0,0.3)" : "none",
                            }}
                            title={`Color ${cVal.nombre}`}
                          />
                        ))}
                        <button
                          type="button"
                          onClick={() => eliminarBloque(bloque.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "rgba(255,255,255,0.7)",
                            cursor: "pointer",
                            fontSize: 14,
                            marginLeft: 6,
                            padding: "2px 4px",
                          }}
                          title="Eliminar sección"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Lista de viñetas dentro del banner */}
                    <div style={{ padding: "8px 6px 4px" }}>
                      {renderItemsVineta(bloque)}
                    </div>
                  </div>
                );
              }

              // 0.1 BLOQUE LISTA CON VIÑETAS ESTÁNDAR
              if (bloque.tipo === "vineta") {
                return (
                  <div
                    key={bloque.id}
                    style={{
                      border: "1px solid var(--border, rgba(0,0,0,0.06))",
                      borderRadius: 16,
                      padding: "16px 20px",
                      background: "var(--surface, #ffffff)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        <span style={{ fontSize: 16, color: "var(--text-muted, #86868b)" }}>•</span>
                        <input
                          type="text"
                          value={bloque.titulo || ""}
                          onChange={(e) => actualizarBloque(bloque.id, { titulo: e.target.value })}
                          placeholder="Título del grupo de viñetas (ej. E. Logros y retos del ciclo)..."
                          style={{
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            fontSize: 16,
                            fontWeight: 800,
                            color: "var(--text-main, #1d1d1f)",
                            width: "100%",
                            fontFamily: "inherit",
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => eliminarBloque(bloque.id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted, #86868b)",
                          cursor: "pointer",
                          fontSize: 13,
                        }}
                        title="Eliminar grupo de viñetas"
                      >
                        🗑️
                      </button>
                    </div>

                    {renderItemsVineta(bloque)}
                  </div>
                );
              }

              // 1. BLOQUE DESPLEGABLE / TOGGLE
              if (bloque.tipo === "desplegable") {
              return (
                <div
                  key={bloque.id}
                  style={{
                    border: "1px solid var(--border, rgba(0,0,0,0.08))",
                    borderRadius: 14,
                    padding: "12px 16px",
                    background: "var(--surface-subtle, #fbfbfd)",
                  }}
                >
                  <div
                    onClick={() => toggleAcordeon(bloque.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>
                      <span style={{ fontSize: 11, color: NARANJA }}>{bloque.abierto ? "▼" : "▶"}</span>
                      <span>{bloque.titulo}</span>
                    </div>
                    <span style={{ fontSize: 10.5, color: "var(--text-muted, #86868b)" }}>
                      {bloque.abierto ? "Ocultar" : "Desplegar"}
                    </span>
                  </div>

                  {bloque.abierto && (
                    <div
                      style={{
                        marginTop: 10,
                        paddingLeft: 18,
                        borderLeft: `2px solid ${NARANJA}`,
                        fontSize: 12,
                        color: "var(--text-main, #334155)",
                        lineHeight: 1.6,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {bloque.contenido}
                    </div>
                  )}
                </div>
              );
            }

            // 2. BLOQUE DESTACADO / CALLOUT
            if (bloque.tipo === "destacado") {
              return (
                <div
                  key={bloque.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 14,
                    background: "#fffbeb",
                    border: "1px solid #fef3c7",
                    color: "#92400e",
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}
                >
                  <span style={{ fontSize: 18 }}>{bloque.icono || "💡"}</span>
                  <div style={{ flex: 1, fontWeight: 500 }}>{bloque.texto}</div>
                </div>
              );
            }

            // 3. BLOQUE CHECKLIST DE TAREAS INTERACTIVAS ESTILO APPLE
            if (bloque.tipo === "checklist") {
              const items = Array.isArray(bloque.items) ? bloque.items : [];
              const hechas = items.filter((i) => i.completada).length;

              return (
                <div
                  key={bloque.id}
                  style={{
                    border: "1px solid var(--border, rgba(0,0,0,0.08))",
                    borderRadius: 16,
                    padding: "16px 18px",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-main, #1d1d1f)", display: "flex", alignItems: "center", gap: 6 }}>
                      <span>☑</span>
                      <span>{bloque.titulo || "Checklist de Tareas"}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #86868b)" }}>
                      {hechas} de {items.length} completadas
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {items.map((tarea) => {
                      const hecha = tarea.completada;
                      return (
                        <div
                          key={tarea.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "6px 8px",
                            borderRadius: 8,
                            background: hecha ? "rgba(0,0,0,0.02)" : "transparent",
                            transition: "background 0.12s ease",
                          }}
                        >
                          {/* Casilla circular estilo Apple Reminders */}
                          <button
                            type="button"
                            onClick={() => toggleTarea(bloque.id, tarea.id)}
                            style={{
                              width: 19,
                              height: 19,
                              borderRadius: "50%",
                              border: `1.5px solid ${hecha ? NARANJA : "var(--text-muted, #98a2b3)"}`,
                              background: hecha ? NARANJA : "transparent",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              padding: 0,
                              flexShrink: 0,
                              transition: "all 0.15s ease",
                            }}
                          >
                            {hecha && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12l4 4L19 7" />
                              </svg>
                            )}
                          </button>

                          {/* Texto de la tarea */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span
                              style={{
                                fontSize: 12.5,
                                color: hecha ? "var(--text-muted, #94a3b8)" : "var(--text-main, #1d1d1f)",
                                textDecoration: hecha ? "line-through" : "none",
                                transition: "all 0.15s ease",
                              }}
                            >
                              {tarea.texto}
                            </span>
                          </div>

                          {/* Fecha */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            {tarea.fecha && (
                              <span style={{ fontSize: 10, color: "var(--text-muted, #94a3b8)" }}>
                                {tarea.fecha.slice(5)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => agregarTareaABloque(bloque.id)}
                    style={{
                      marginTop: 8,
                      background: "transparent",
                      border: "none",
                      color: NARANJA,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "4px 8px",
                      borderRadius: 6,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>+ Añadir tarea</span>
                  </button>
                </div>
              );
            }

            // 4. BLOQUE DE CÓDIGO / NOTAS TÉCNICAS
            if (bloque.tipo === "codigo") {
              return (
                <div
                  key={bloque.id}
                  style={{
                    background: "#0f172a",
                    borderRadius: 14,
                    padding: "14px 18px",
                    color: "#f8fafc",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                    fontSize: 11.5,
                    overflowX: "auto",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 6 }}>
                    <span style={{ color: "#94a3b8", fontSize: 10.5, fontWeight: 700 }}>
                      {bloque.titulo || "Notas técnicas"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(bloque.codigo || "");
                        mostrarToast("Código copiado al portapapeles");
                      }}
                      style={{
                        background: "rgba(255,255,255,0.1)",
                        border: "none",
                        borderRadius: 6,
                        color: "#f8fafc",
                        fontSize: 10,
                        padding: "2px 8px",
                        cursor: "pointer",
                      }}
                    >
                      Copiar
                    </button>
                  </div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                    {bloque.codigo}
                  </pre>
                </div>
              );
            }

            return null;
          });
        })()}
        </div>

        {/* Selector de bloques estilo Apple / Notion: Botón (+) con lista desplegable */}
        <div style={{ position: "relative", marginTop: 36, paddingTop: 16, borderTop: "1px solid var(--border, rgba(0, 0, 0, 0.06))" }}>
          <div
            onClick={() => setMenuInferiorAbierto(!menuInferiorAbierto)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "10px 14px",
              borderRadius: 12,
              background: "var(--surface-subtle, #f6f7f9)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.borderColor = "rgba(0,0,0,0.1)";
              e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--surface-subtle, #f6f7f9)";
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: NARANJA,
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 1px 3px rgba(244,124,32,0.3)",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </span>
            <span style={{ fontSize: 13.5, color: "var(--text-muted, #86868b)", fontWeight: 500, flex: 1 }}>
              Insertar bloque en el documento…
            </span>
            <span
              style={{
                fontSize: 10,
                color: "var(--text-muted, #86868b)",
                background: "rgba(0,0,0,0.05)",
                padding: "3px 8px",
                borderRadius: 6,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>Lista desplegable</span>
              <span>{menuInferiorAbierto ? "▲" : "▼"}</span>
            </span>
          </div>

          {/* Menú Desplegable con opciones de bloques */}
          {menuInferiorAbierto && (
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: "100%",
                marginBottom: 8,
                background: "#ffffff",
                border: "1px solid var(--border, rgba(0,0,0,0.1))",
                borderRadius: 14,
                boxShadow: "0 14px 35px -5px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
                padding: 6,
                zIndex: 9999,
                width: 320,
                animation: "fadeIn 0.15s ease",
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted, #86868b)", textTransform: "uppercase", padding: "6px 10px 4px", letterSpacing: "0.06em" }}>
                Tipos de Bloque para Insertar
              </div>
              {[
                { tipo: "banner", icono: "🏷️", titulo: "Banner con Viñetas", desc: "Sección de color con viñetas (Logros / Retos)" },
                { tipo: "vineta", icono: "•", titulo: "Lista con Viñetas", desc: "Puntos con viñetas, sangría y estados" },
                { tipo: "checklist", icono: "☑️", titulo: "Lista de Tareas", desc: "Casillas para tachar y organizar" },
                { tipo: "desplegable", icono: "▶", titulo: "Lista Desplegable (Toggle)", desc: "Sección que se puede ocultar o expandir" },
                { tipo: "destacado", icono: "💡", titulo: "Destacado (Callout)", desc: "Nota o advertencia visualmente resaltada" },
                { tipo: "enlace", icono: "🔗", titulo: "Subpágina / Enlace", desc: "Crear documento vinculado" },
                { tipo: "codigo", icono: "⌨️", titulo: "Notas técnicas / Código", desc: "Comandos, enlaces o snippets formateados" },
              ].map((item) => (
                <button
                  key={item.tipo}
                  type="button"
                  onClick={() => insertarBloque(item.tipo)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    background: "transparent",
                    border: "none",
                    borderRadius: 10,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f7")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <span style={{ fontSize: 17, width: 22, textAlign: "center", flexShrink: 0 }}>{item.icono}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>{item.titulo}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-muted, #86868b)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        </>
        )}

      </main>

      {/* ================================================================= */}
      {/* MODAL INLINE APPLE-STYLE — Reemplaza todos los prompt() nativos   */}
      {/* ================================================================= */}
      {modalInput && (
        <div
          onClick={() => { setModalInput(null); modalInput.onConfirmar(null); }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#ffffff",
              borderRadius: 20,
              padding: "28px 28px 22px",
              maxWidth: 420,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.02em" }}>
              {modalInput.titulo}
            </div>
            {modalInput.multilinea ? (
              <textarea
                ref={inputModalRef}
                defaultValue={modalInput.valorInicial || ""}
                placeholder={modalInput.placeholder || ""}
                autoFocus
                rows={6}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    const val = inputModalRef.current?.value ?? "";
                    setModalInput(null);
                    modalInput.onConfirmar(val);
                  } else if (e.key === "Escape") {
                    setModalInput(null);
                    modalInput.onConfirmar(null);
                  }
                }}
                style={{
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 13.5,
                  color: "#1d1d1f",
                  outline: "none",
                  background: "#f5f5f7",
                  width: "100%",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  resize: "vertical",
                  lineHeight: 1.5,
                }}
              />
            ) : (
              <input
                ref={inputModalRef}
                defaultValue={modalInput.valorInicial || ""}
                placeholder={modalInput.placeholder || ""}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = inputModalRef.current?.value ?? "";
                    setModalInput(null);
                    modalInput.onConfirmar(val);
                  } else if (e.key === "Escape") {
                    setModalInput(null);
                    modalInput.onConfirmar(null);
                  }
                }}
                style={{
                  border: "1px solid rgba(0,0,0,0.12)",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 14,
                  color: "#1d1d1f",
                  outline: "none",
                  background: "#f5f5f7",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              />
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => { setModalInput(null); modalInput.onConfirmar(null); }}
                style={{
                  padding: "8px 18px",
                  borderRadius: 10,
                  border: "1px solid rgba(0,0,0,0.1)",
                  background: "#f5f5f7",
                  color: "#1d1d1f",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = inputModalRef.current?.value ?? "";
                  setModalInput(null);
                  modalInput.onConfirmar(val);
                }}
                style={{
                  padding: "8px 22px",
                  borderRadius: 10,
                  border: "none",
                  background: "#1d1d1f",
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
                }}
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
