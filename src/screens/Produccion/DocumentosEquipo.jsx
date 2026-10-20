import { useState, useMemo, useRef, useCallback } from "react";
import { useSubirAlFormulario } from "../../hooks/useSubirAlFormulario";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { limpiarDocumentosEjemplo } from "./documentosSeed";
import { Icono } from "../../components/ui";
import { confirmar } from "../../lib/dialogos";
import { today } from "../../lib/format";

const NARANJA = "#f47c20";

const COLOR_BANNERS = {
  verde: { nombre: "Verde Logros", bg: "#2e7d32", dot: "#34c759", text: "#ffffff" },
  morado: { nombre: "Morado Iniciativas", bg: "#5856d6", dot: "#af52de", text: "#ffffff" },
  azul: { nombre: "Azul Desarrollo", bg: "#0071e3", dot: "#007aff", text: "#ffffff" },
  naranja: { nombre: "Naranja Prioridades", bg: "#f47c20", dot: "#ff9500", text: "#ffffff" },
};

// Deja el campo con el alto justo de su texto. Sirve de ref y de manejador:
// la ref lo cuadra al montarse y al llegar texto de la nube, y el onChange
// mientras se escribe.
function ajustarAlto(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

const TIPOS_BLOQUE = [
  { tipo: "desplegable", icono: "▶", titulo: "Lista desplegable (Toggle)", desc: "Ocultar o expandir contenido" },
  { tipo: "vineta", icono: "•", titulo: "Lista con Viñetas", desc: "Puntos clave y sub-viñetas" },
  { tipo: "checklist", icono: "☑", titulo: "Lista de Tareas", desc: "Casillas para tachar y organizar" },
  { tipo: "banner", icono: "🏷️", titulo: "Banner con Viñetas", desc: "Sección con encabezado de color" },
  { tipo: "destacado", icono: "💡", titulo: "Destacado (Callout)", desc: "Nota o aviso resaltado" },
  { tipo: "codigo", icono: "</>", titulo: "Notas técnicas / Código", desc: "Comandos, enlaces o snippets" },
  { tipo: "enlace", icono: "📄", titulo: "Subpágina / Enlace", desc: "Crear documento vinculado" },
];

export default function DocumentosEquipo({
  obras = [],
  empleados = [],
  usuarioActual = "Camila",
  documentosExternos,
  onActualizarDocumentos,
}) {
  const isMobile = useIsMobile();

  // Los documentos viven en AppDataContext, que es quien los guarda: los sube
  // a la nube y deja una copia local POR USUARIO. Aqui no se guarda una
  // segunda copia.
  //
  // Antes si la habia, y se sincronizaba con dos efectos: uno copiaba lo de
  // fuera hacia dentro y el otro lo de dentro hacia fuera. Escribiendo rapido
  // se perdian letras y hasta viñetas enteras: cada tecla disparaba el efecto
  // de salida, y el de entrada volvia a meter la version anterior encima de
  // la que ya tenia la tecla siguiente. En un cuaderno de notas, perder lo
  // escrito es el peor fallo posible.
  //
  // Sin estado propio no hay nada que sincronizar: se lee de la propiedad y
  // se escribe en el padre, que es la unica copia.
  const [documentosSueltos, setDocumentosSueltos] = useState([]);
  const controlado = Array.isArray(documentosExternos);
  const documentos = controlado ? documentosExternos : documentosSueltos;

  const setDocumentos = useCallback(
    (actualizar) => {
      const aplicar = (previos) => {
        const base = Array.isArray(previos) ? previos : [];
        const siguiente = typeof actualizar === "function" ? actualizar(base) : actualizar;
        return limpiarDocumentosEjemplo(siguiente);
      };
      if (controlado && typeof onActualizarDocumentos === "function") {
        onActualizarDocumentos(aplicar);
      } else {
        setDocumentosSueltos(aplicar);
      }
    },
    [controlado, onActualizarDocumentos]
  );

  // Documento actualmente seleccionado
  const [docActivoId, setDocActivoId] = useState(() => documentos[0]?.id || "");
  const [busqueda, setBusqueda] = useState("");
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [menuInsertarAbierto, setMenuInsertarAbierto] = useState(false);
  const [toastMensaje, setToastMensaje] = useState("");
  // Id de la viñeta que acaba de crearse y a la que hay que llevar el cursor.
  const [vinetaEnfocar, setVinetaEnfocar] = useState(null);

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

  // En el telefono el editor va debajo de la lista de documentos: al crear uno
  // nuevo se baja hasta el, que si no parecia que no habia pasado nada.
  const [editorRef, subirAlEditor] = useSubirAlFormulario();

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
      icono: "",
      obraNombre: "",
      responsable: "",
      favorito: false,
      fechaCreacion: today(),
      fechaActualizacion: today(),
      enlaces: [],
      bloques: [],
    };

    setDocumentos((prev) => [nuevoDoc, ...prev]);
    setDocActivoId(nuevoDoc.id);
    subirAlEditor();
    mostrarToast("Documento creado exitosamente");
  };

  // Actualizar campo del documento activo
  const actualizarDocActivo = (campo, valor) => {
    setDocumentos((prev) =>
      prev.map((d) =>
        d.id === docActivoId
          ? { ...d, [campo]: valor, fechaActualizacion: today() }
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
        return { ...d, bloques: nuevosBloques, fechaActualizacion: today() };
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
            fecha: today(),
            responsable: "",
            completada: false,
          };
          return { ...b, items: [...(b.items || []), nuevaTarea] };
        });
        return { ...d, bloques: nuevosBloques, fechaActualizacion: today() };
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
        return { ...d, bloques: nuevosBloques, fechaActualizacion: today() };
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
          fechaActualizacion: today(),
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
    // El cursor se va a la viñeta recien creada. Sin esto, pulsar Enter la
    // creaba pero dejaba el cursor donde estaba, asi que lo que se seguia
    // escribiendo se pegaba al final de la viñeta anterior.
    setVinetaEnfocar(nuevoItem.id);
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
        return { ...d, bloques: nuevosBloques, fechaActualizacion: today() };
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
        return { ...d, bloques: nuevosBloques, fechaActualizacion: today() };
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
        return { ...d, bloques: nuevosBloques, fechaActualizacion: today() };
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
        return { ...d, bloques: nuevosBloques, fechaActualizacion: today() };
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
        return { ...d, bloques: nuevosBloques, fechaActualizacion: today() };
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
        return { ...d, bloques: nuevosBloques, fechaActualizacion: today() };
      })
    );
    mostrarToast(`${nuevosItems.length} viñetas añadidas`);
  };

  // Insertar un nuevo bloque según tipo
  const insertarBloque = async (tipo) => {
    setMenuInsertarAbierto(false);

    if (tipo === "enlace") {
      const tituloEnlace = await pedirInput({ titulo: "Título del enlace o subpágina", placeholder: "Nueva subpágina", valorInicial: "Nueva subpágina" });
      if (!tituloEnlace || !tituloEnlace.trim()) return;
      const descEnlace = await pedirInput({ titulo: "Descripción breve", placeholder: "Documento vinculado", valorInicial: "Documento vinculado" }) || "";

      // Crear también el documento hijo si no existe
      const idHijo = `doc-sub-${Date.now()}`;
      const nuevoHijo = {
        id: idHijo,
        titulo: tituloEnlace.trim(),
        icono: "",
        obraNombre: "",
        responsable: "",
        favorito: false,
        fechaCreacion: today(),
        fechaActualizacion: today(),
        enlaces: [{ id: docActivo.id, titulo: `Volver a ${docActivo.titulo}`, desc: "Página principal" }],
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
        placeholder: "Ej: Resumen del proyecto",
        valorInicial: "",
      });
      if (!titulo) return;
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "banner",
        titulo: titulo.trim(),
        color: "verde",
        items: [
          { id: `v-${Date.now()}-1`, texto: "", icono: "punto", nivel: 0 },
        ],
      };
    } else if (tipo === "vineta") {
      const titulo = await pedirInput({
        titulo: "Título del grupo de viñetas",
        placeholder: "Ej: Puntos clave",
        valorInicial: "",
      });
      if (!titulo) return;
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "vineta",
        titulo: titulo.trim(),
        items: [
          { id: `v-${Date.now()}-1`, texto: "", icono: "punto", nivel: 0 },
        ],
      };
    } else if (tipo === "desplegable") {
      const titulo = await pedirInput({ titulo: "Título de la lista desplegable", placeholder: "Ej: Documentación requerida", valorInicial: "" });
      if (!titulo) return;
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "desplegable",
        titulo: titulo.trim(),
        abierto: true,
        contenido: "",
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
            fecha: today(),
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
            fechaActualizacion: today(),
          };
        })
      );
      mostrarToast("Bloque añadido");
    }
  };

  // Renderizar botón (+) y menú desplegable inline estilo Apple / Notion
  const renderBotonInsertarBloque = (textoPlaceholder = "Añadir lista desplegable, viñetas o tareas...") => (
    <div style={{ position: "relative", zIndex: 90, margin: "14px 0 20px" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
        {/* Botón circular (+) estilo Apple */}
        <button
          type="button"
          onClick={() => setMenuInsertarAbierto(!menuInsertarAbierto)}
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: menuInsertarAbierto ? `2px solid ${NARANJA}` : "1.5px solid var(--border, rgba(0,0,0,0.15))",
            background: menuInsertarAbierto ? "rgba(244, 124, 32, 0.08)" : "#ffffff",
            color: menuInsertarAbierto ? NARANJA : "var(--text-main, #1d1d1f)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
            transition: "all 0.15s ease",
            padding: 0,
          }}
          title="Añadir bloque (Lista desplegable, viñetas, tareas...)"
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1,
              display: "inline-block",
              transform: menuInsertarAbierto ? "rotate(45deg)" : "none",
              transition: "transform 0.18s ease",
            }}
          >
            +
          </span>
        </button>

        {/* Texto clicable al lado del botón */}
        <button
          type="button"
          onClick={() => setMenuInsertarAbierto(!menuInsertarAbierto)}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: 8,
            fontSize: 13,
            color: menuInsertarAbierto ? NARANJA : "var(--text-muted, #86868b)",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            transition: "color 0.15s ease",
          }}
        >
          <span>{textoPlaceholder}</span>
          <span style={{ fontSize: 9, opacity: 0.7 }}>{menuInsertarAbierto ? "▲" : "▼"}</span>
        </button>
      </div>

      {/* Menú Flotante / Lista Desplegable que se abre desde el (+) */}
      {menuInsertarAbierto && (
        <>
          {/* Overlay invisible para cerrar al hacer clic afuera */}
          <div
            onClick={() => setMenuInsertarAbierto(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9998,
            }}
          />

          <div
            style={{
              position: "absolute",
              left: 0,
              top: "calc(100% + 8px)",
              background: "#ffffff",
              border: "1px solid var(--border, rgba(0,0,0,0.1))",
              borderRadius: 14,
              boxShadow: "0 12px 32px -4px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.06)",
              padding: "6px",
              zIndex: 9999,
              width: 280,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 700, color: "#86868b", textTransform: "uppercase", padding: "4px 8px 6px", letterSpacing: "0.04em" }}>
              Insertar contenido
            </div>
            {TIPOS_BLOQUE.map((item) => (
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
                  borderRadius: 8,
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.12s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-subtle, #f5f5f7)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <span
                  style={{
                    fontSize: 13,
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.04)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icono}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>
                    {item.titulo}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted, #86868b)" }}>
                    {item.desc}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // Eliminar documento
  const eliminarDocumento = async (id) => {
    if (documentos.length <= 1) {
      if (!(await confirmar({ titulo: "¿Seguro que deseas eliminar este documento?", mensaje: "El espacio quedará vacío.", textoConfirmar: "Eliminar", destructivo: true }))) return;
      setDocumentos([]);
      setDocActivoId("");
      mostrarToast("Documento eliminado");
      return;
    }
    if (!(await confirmar({ titulo: "¿Seguro que deseas eliminar este documento?", textoConfirmar: "Eliminar", destructivo: true }))) return;
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
        // El panel lateral se estrecha: 280px para una lista de titulos era
        // casi un tercio de la pantalla en un portatil, y lo que se escribe
        // esta a la derecha.
        gridTemplateColumns: isMobile ? "1fr" : sidebarVisible ? "232px minmax(0, 1fr)" : "minmax(0, 1fr)",
        background: "var(--surface, #ffffff)",
        border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 4px 20px -4px rgba(0, 0, 0, 0.05)",
        // Ocupa lo que queda de pantalla en vez de cortarse a 700px y dejar
        // un hueco blanco debajo. 100dvh descuenta la barra del navegador en
        // el telefono, donde 100vh se pasa de largo.
        minHeight: isMobile ? "auto" : "calc(100dvh - 190px)",
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
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>
                Mis documentos
              </div>
              <button
                type="button"
                onClick={crearNuevoDocumento}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  border: "1px solid var(--border, rgba(0, 0, 0, 0.08))",
                  // Con el blanco escrito a mano, en modo oscuro quedaba una
                  // caja clara con el signo + invisible dentro.
                  background: "var(--surface)",
                  color: "var(--text-main, #1d1d1f)",
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
                  background: "var(--surface)",
                  border: "1px solid var(--border, rgba(0,0,0,0.08))",
                  borderRadius: 10,
                  padding: "7px 10px",
                  fontSize: 12.5,
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
                        <Icono nombre="documento" size={15} style={{ opacity: activo ? 0.9 : 0.55 }} />
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
      <main ref={editorRef} style={{ scrollMarginTop: 16, padding: isMobile ? "16px 14px" : "22px 28px 40px", overflowY: "auto", position: "relative", minWidth: 0 }}>
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
              <Icono nombre="documento" size={30} style={{ opacity: 0.5 }} />
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
              Todavía no tienes documentos
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
              Aquí anotas lo tuyo: notas de obra, pendientes, listas de chequeo y enlaces.
              Solo los ves tú.
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
              Copiar enlace
            </button>

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
        {/* Sin el emoji gigante que habia encima del titulo: ocupaba 40px de
            alto en la parte mas valiosa de la pagina, la de escribir, y no
            hacia nada -no se podia cambiar aunque dijera «Cambiar icono»-. */}
        <div style={{ marginBottom: 18 }}>
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

        {/* Botón (+) y menú desplegable debajo del título cuando está vacío */}
        {(docActivo?.bloques || []).length === 0 &&
          renderBotonInsertarBloque("Añadir lista desplegable, viñetas o tareas...")}

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
                  <Icono nombre="documento" size={17} style={{ opacity: 0.55 }} />
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

                        {/* Campo de texto in-situ.
                            Era un <input> de una linea: una nota larga se
                            salia por la derecha y habia que arrastrar dentro
                            del campo para leerla, que en el telefono es
                            inservible. Un textarea que crece solo la envuelve
                            y se ve entera. */}
                        <textarea
                          rows={1}
                          ref={(el) => {
                            ajustarAlto(el);
                            if (el && vinetaEnfocar === item.id) {
                              el.focus();
                              setVinetaEnfocar(null);
                            }
                          }}
                          value={item.texto || ""}
                          onChange={(e) => {
                            ajustarAlto(e.target);
                            actualizarItemVineta(bloque.id, item.id, { texto: e.target.value });
                          }}
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
                            minWidth: 0,
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            // Texto de lectura, no de etiqueta: esto es lo que
                            // la persona escribe y relee todos los dias.
                            fontSize: 14,
                            color: "var(--text-main, #1d1d1f)",
                            lineHeight: "22px",
                            fontFamily: "inherit",
                            padding: "4px 0",
                            resize: "none",
                            overflow: "hidden",
                            display: "block",
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
                const colapsado = !!bloque.colapsado;
                return (
                  <div
                    key={bloque.id}
                    style={{
                      borderRadius: 16,
                      padding: 0,
                      marginBottom: 8,
                    }}
                  >
                    {/* Encabezado con Banner de Color estilo Slite / Apple + Flecha Desplegable */}
                    <div
                      style={{
                        background: col.bg,
                        color: "#ffffff",
                        borderRadius: 14,
                        padding: "12px 18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        {/* Botón Flecha Desplegable (Toggle) estilo Apple / Notion */}
                        <button
                          type="button"
                          onClick={() => actualizarBloque(bloque.id, { colapsado: !colapsado })}
                          style={{
                            background: "rgba(255,255,255,0.18)",
                            border: "none",
                            borderRadius: 6,
                            color: "#ffffff",
                            cursor: "pointer",
                            width: 24,
                            height: 24,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            fontWeight: 800,
                            flexShrink: 0,
                            transition: "all 0.15s ease",
                          }}
                          title={colapsado ? "Desplegar lista" : "Colapsar / Ocultar lista"}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              transform: colapsado ? "none" : "rotate(90deg)",
                              transition: "transform 0.18s cubic-bezier(0.2, 0, 0, 1)",
                            }}
                          >
                            ▶
                          </span>
                        </button>

                        <input
                          type="text"
                          value={bloque.titulo || ""}
                          onChange={(e) => actualizarBloque(bloque.id, { titulo: e.target.value })}
                          placeholder="Título de la sección (ej. Resumen del proyecto)..."
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
                      </div>

                      {/* Botón Ocultar / Desplegar, Selector de color y Eliminar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => actualizarBloque(bloque.id, { colapsado: !colapsado })}
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            background: "rgba(255,255,255,0.22)",
                            border: "none",
                            color: "#ffffff",
                            padding: "3px 10px",
                            borderRadius: 8,
                            cursor: "pointer",
                            userSelect: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                            transition: "background 0.15s ease",
                          }}
                          title={colapsado ? "Clic para desplegar y ver viñetas" : "Clic para ocultar viñetas"}
                        >
                          <span>{colapsado ? "▶ Desplegar" : "▲ Ocultar"}</span>
                          {bloque.items?.length > 0 && (
                            <span style={{ opacity: 0.85, fontSize: 10 }}>
                              ({bloque.items.length})
                            </span>
                          )}
                        </button>

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
                            marginLeft: 4,
                            padding: "2px 4px",
                          }}
                          title="Eliminar sección"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Lista de viñetas dentro del banner (se oculta cuando está colapsado) */}
                    {!colapsado && (
                      <div style={{ padding: "8px 6px 4px" }}>
                        {renderItemsVineta(bloque)}
                      </div>
                    )}
                  </div>
                );
              }

              // 0.1 BLOQUE LISTA CON VIÑETAS ESTÁNDAR
              if (bloque.tipo === "vineta") {
                const colapsado = !!bloque.colapsado;
                return (
                  <div
                    key={bloque.id}
                    style={{
                      border: "1px solid var(--border, rgba(0,0,0,0.06))",
                      borderRadius: 16,
                      padding: "14px 18px",
                      background: "var(--surface, #ffffff)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
                      marginBottom: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: colapsado ? 0 : 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                        <button
                          type="button"
                          onClick={() => actualizarBloque(bloque.id, { colapsado: !colapsado })}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-muted, #86868b)",
                            cursor: "pointer",
                            width: 20,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 11,
                            padding: 0,
                          }}
                          title={colapsado ? "Desplegar lista" : "Colapsar lista"}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              transform: colapsado ? "none" : "rotate(90deg)",
                              transition: "transform 0.15s ease",
                            }}
                          >
                            ▶
                          </span>
                        </button>
                        <input
                          type="text"
                          value={bloque.titulo || ""}
                          onChange={(e) => actualizarBloque(bloque.id, { titulo: e.target.value })}
                          placeholder="Título del grupo de viñetas (ej. Puntos clave)..."
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
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {bloque.items?.length > 0 && (
                          <span style={{ fontSize: 11, color: "var(--text-muted, #86868b)", fontWeight: 600 }}>
                            {bloque.items.length} {bloque.items.length === 1 ? "punto" : "puntos"}
                          </span>
                        )}
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
                    </div>

                    {!colapsado && renderItemsVineta(bloque)}
                  </div>
                );
              }

              // 1. BLOQUE DESPLEGABLE / TOGGLE
              if (bloque.tipo === "desplegable") {
                const abierto = bloque.abierto !== false;
                return (
                  <div
                    key={bloque.id}
                    style={{
                      border: "1px solid var(--border, rgba(0,0,0,0.08))",
                      borderRadius: 14,
                      padding: "12px 16px",
                      background: "var(--surface-subtle, #fbfbfd)",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                        <button
                          type="button"
                          onClick={() => toggleAcordeon(bloque.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: NARANJA,
                            cursor: "pointer",
                            fontSize: 12,
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 20,
                            height: 20,
                            flexShrink: 0,
                          }}
                          title={abierto ? "Colapsar / Ocultar" : "Desplegar"}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              transform: abierto ? "rotate(90deg)" : "none",
                              transition: "transform 0.15s ease",
                            }}
                          >
                            ▶
                          </span>
                        </button>
                        <input
                          type="text"
                          value={bloque.titulo || ""}
                          onChange={(e) => actualizarBloque(bloque.id, { titulo: e.target.value })}
                          placeholder="Título de la lista desplegable..."
                          style={{
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            fontSize: 13.5,
                            fontWeight: 700,
                            color: "var(--text-main, #1d1d1f)",
                            flex: 1,
                            fontFamily: "inherit",
                          }}
                        />
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => toggleAcordeon(bloque.id)}
                          style={{
                            background: "rgba(0,0,0,0.04)",
                            border: "none",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-muted, #86868b)",
                            cursor: "pointer",
                          }}
                        >
                          {abierto ? "▲ Ocultar" : "▶ Desplegar"}
                        </button>
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
                          title="Eliminar este desplegable"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {abierto && (
                      <div
                        style={{
                          marginTop: 10,
                          paddingLeft: 28,
                          borderLeft: `2px solid ${NARANJA}`,
                        }}
                      >
                        <textarea
                          value={bloque.contenido || ""}
                          onChange={(e) => actualizarBloque(bloque.id, { contenido: e.target.value })}
                          placeholder="Escribe aquí la información que se puede ocultar o expandir..."
                          rows={3}
                          style={{
                            width: "100%",
                            border: "none",
                            outline: "none",
                            background: "transparent",
                            fontSize: 12.5,
                            color: "var(--text-main, #334155)",
                            lineHeight: 1.6,
                            fontFamily: "inherit",
                            resize: "vertical",
                            boxSizing: "border-box",
                          }}
                        />
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
              const colapsado = !!bloque.colapsado;

              return (
                <div
                  key={bloque.id}
                  style={{
                    border: "1px solid var(--border, rgba(0,0,0,0.08))",
                    borderRadius: 16,
                    padding: "14px 18px",
                    background: "#ffffff",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: colapsado ? 0 : 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                      <button
                        type="button"
                        onClick={() => actualizarBloque(bloque.id, { colapsado: !colapsado })}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted, #86868b)",
                          cursor: "pointer",
                          width: 20,
                          height: 20,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 11,
                          padding: 0,
                        }}
                        title={colapsado ? "Desplegar lista de tareas" : "Ocultar lista de tareas"}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            transform: colapsado ? "none" : "rotate(90deg)",
                            transition: "transform 0.15s ease",
                          }}
                        >
                          ▶
                        </span>
                      </button>
                      <input
                        type="text"
                        value={bloque.titulo || ""}
                        onChange={(e) => actualizarBloque(bloque.id, { titulo: e.target.value })}
                        placeholder="Checklist de Tareas..."
                        style={{
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          fontSize: 13.5,
                          fontWeight: 800,
                          color: "var(--text-main, #1d1d1f)",
                          width: "100%",
                          fontFamily: "inherit",
                        }}
                      />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => actualizarBloque(bloque.id, { colapsado: !colapsado })}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "var(--text-muted, #86868b)",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        {colapsado ? "▶ Desplegar" : "▲ Ocultar"} ({hechas}/{items.length})
                      </button>
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
                        title="Eliminar este checklist"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  {!colapsado && (
                    <>
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
                    </>
                  )}
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

        {/* Botón (+) al final de los bloques existentes */}
        {(docActivo?.bloques || []).length > 0 &&
          renderBotonInsertarBloque("Añadir otro bloque...")}
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
