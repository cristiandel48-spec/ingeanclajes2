import { useState, useMemo, useRef, useEffect } from "react";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { DOCUMENTOS_EQUIPO_INIT } from "./documentosSeed";

const NARANJA = "#f47c20";

export default function DocumentosEquipo({
  obras = [],
  empleados = [],
  usuarioActual = "Camila",
  documentosExternos,
  onActualizarDocumentos,
}) {
  const isMobile = useIsMobile();

  // Estado de documentos persistido localmente y sincronizado
  const [documentos, setDocumentos] = useState(() => {
    if (Array.isArray(documentosExternos) && documentosExternos.length > 0) {
      return documentosExternos;
    }
    try {
      const guardados = localStorage.getItem("ingeanclajes_documentos_equipo");
      if (guardados) {
        const parsed = JSON.parse(guardados);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.warn("No se pudo cargar ingeanclajes_documentos_equipo", e);
    }
    return DOCUMENTOS_EQUIPO_INIT;
  });

  // Guardar en localStorage y propagar si hay callback
  useEffect(() => {
    try {
      localStorage.setItem("ingeanclajes_documentos_equipo", JSON.stringify(documentos));
    } catch (e) {
      console.warn("No se pudo guardar ingeanclajes_documentos_equipo", e);
    }
    if (typeof onActualizarDocumentos === "function") {
      onActualizarDocumentos(documentos);
    }
  }, [documentos, onActualizarDocumentos]);

  // Documento actualmente seleccionado
  const [docActivoId, setDocActivoId] = useState(() => documentos[0]?.id || "doc-previsora");
  const [busqueda, setBusqueda] = useState("");
  const [filtroResponsable, setFiltroResponsable] = useState("todos");
  const [menuInsertarAbierto, setMenuInsertarAbierto] = useState(false);
  const [toastMensaje, setToastMensaje] = useState("");

  const docActivo = useMemo(() => {
    return documentos.find((d) => d.id === docActivoId) || documentos[0];
  }, [documentos, docActivoId]);

  // Lista de colaboradores únicos
  const colaboradores = useMemo(() => {
    const set = new Set(["Paola", "Camila", "Carlos Restrepo"]);
    (empleados || []).forEach((e) => {
      const nom = (e.nombre || e.nombreCompleto || "").trim();
      if (nom) set.add(nom);
    });
    return Array.from(set);
  }, [empleados]);

  // Filtrado de documentos en el sidebar
  const docsFiltrados = useMemo(() => {
    return documentos.filter((d) => {
      if (filtroResponsable !== "todos" && d.responsable !== filtroResponsable) {
        return false;
      }
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const coincideTitulo = d.titulo.toLowerCase().includes(q);
        const coincideObra = (d.obraNombre || "").toLowerCase().includes(q);
        return coincideTitulo || coincideObra;
      }
      return true;
    });
  }, [documentos, filtroResponsable, busqueda]);

  const mostrarToast = (msg) => {
    setToastMensaje(msg);
    setTimeout(() => setToastMensaje(""), 3500);
  };

  // Crear nuevo documento
  const crearNuevoDocumento = () => {
    const nombre = prompt("Nombre del nuevo documento o proyecto:", "Nueva Documentación de Obra");
    if (!nombre || !nombre.trim()) return;

    const nuevoDoc = {
      id: `doc-${Date.now()}`,
      titulo: nombre.trim(),
      icono: "📁",
      obraNombre: "Obra general",
      responsable: usuarioActual || "Paola",
      favorito: false,
      fechaCreacion: new Date().toISOString().slice(0, 10),
      fechaActualizacion: new Date().toISOString().slice(0, 10),
      enlaces: [],
      bloques: [
        {
          id: `b-${Date.now()}-1`,
          tipo: "desplegable",
          titulo: "▶ Alcance inicial y notas de trabajo",
          abierto: true,
          contenido: "Escribe aquí los detalles técnicos, instrucciones de obra o notas...",
        },
        {
          id: `b-${Date.now()}-2`,
          tipo: "checklist",
          titulo: "Primeros pendientes del equipo",
          items: [
            {
              id: `t-${Date.now()}-1`,
              texto: "Definir cronograma y asignación de cuadrilla",
              fecha: new Date().toISOString().slice(0, 10),
              responsable: usuarioActual || "Paola",
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
  const agregarTareaABloque = (bloqueId) => {
    const texto = prompt("Nueva tarea o compromiso para el equipo:", "");
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
            responsable: d.responsable || "Paola",
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

  // Insertar un nuevo bloque según tipo
  const insertarBloque = (tipo) => {
    setMenuInsertarAbierto(false);

    if (tipo === "enlace") {
      const tituloEnlace = prompt("Título del enlace o subpágina:", "Nueva subpágina");
      if (!tituloEnlace || !tituloEnlace.trim()) return;
      const descEnlace = prompt("Descripción breve:", "Documento vinculado") || "";

      // Crear también el documento hijo si no existe
      const idHijo = `doc-sub-${Date.now()}`;
      const nuevoHijo = {
        id: idHijo,
        titulo: tituloEnlace.trim(),
        icono: "📄",
        obraNombre: docActivo?.obraNombre || "Obra general",
        responsable: docActivo?.responsable || "Paola",
        favorito: false,
        fechaCreacion: new Date().toISOString().slice(0, 10),
        fechaActualizacion: new Date().toISOString().slice(0, 10),
        enlaces: [{ id: docActivo.id, icono: docActivo.icono || "🏢", titulo: `Volver a ${docActivo.titulo}`, desc: "Página principal" }],
        bloques: [
          {
            id: `b-${Date.now()}`,
            tipo: "checklist",
            titulo: "Pendientes",
            items: [{ id: `t-${Date.now()}`, texto: "Primer compromiso", completada: false, responsable: "Paola" }],
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

    if (tipo === "desplegable") {
      const titulo = prompt("Título del desplegable (toggle):", "▶ Sección técnica desplegable");
      if (!titulo) return;
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "desplegable",
        titulo: titulo.trim(),
        abierto: true,
        contenido: "Escribe aquí la información que se puede ocultar o expandir...",
      };
    } else if (tipo === "destacado") {
      const texto = prompt("Texto de la nota destacada (Callout):", "Nota de calidad / seguridad importante para el equipo");
      if (!texto) return;
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "destacado",
        icono: "💡",
        color: "amber",
        texto: texto.trim(),
      };
    } else if (tipo === "checklist") {
      const titulo = prompt("Título del grupo de tareas:", "Lista de pendientes de obra");
      if (!titulo) return;
      nuevoBloque = {
        id: `b-${Date.now()}`,
        tipo: "checklist",
        titulo: titulo.trim(),
        items: [
          {
            id: `t-${Date.now()}`,
            texto: "Primera tarea del checklist",
            fecha: new Date().toISOString().slice(0, 10),
            responsable: docActivo?.responsable || "Paola",
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
      alert("Debe haber al menos un documento en el espacio de trabajo.");
      return;
    }
    if (!window.confirm("¿Seguro que deseas eliminar este documento?")) return;
    const restantes = documentos.filter((d) => d.id !== id);
    setDocumentos(restantes);
    setDocActivoId(restantes[0].id);
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
        gridTemplateColumns: isMobile ? "1fr" : "300px 1fr",
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
              placeholder="Buscar documentos y tareas..."
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

          {/* Filtro por Colaborador */}
          <div style={{ marginBottom: 14, display: "flex", gap: 4, overflowX: "auto", paddingBottom: 2 }}>
            <button
              type="button"
              onClick={() => setFiltroResponsable("todos")}
              style={{
                fontSize: 10.5,
                fontWeight: filtroResponsable === "todos" ? 700 : 500,
                padding: "3px 8px",
                borderRadius: 14,
                border: `1px solid ${filtroResponsable === "todos" ? "#1d1d1f" : "var(--border, rgba(0,0,0,0.08))"}`,
                background: filtroResponsable === "todos" ? "#1d1d1f" : "#ffffff",
                color: filtroResponsable === "todos" ? "#ffffff" : "var(--text-muted, #6e6e73)",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Todos
            </button>
            {colaboradores.map((colab) => (
              <button
                key={colab}
                type="button"
                onClick={() => setFiltroResponsable(colab)}
                style={{
                  fontSize: 10.5,
                  fontWeight: filtroResponsable === colab ? 700 : 500,
                  padding: "3px 8px",
                  borderRadius: 14,
                  border: `1px solid ${filtroResponsable === colab ? "#1d1d1f" : "var(--border, rgba(0,0,0,0.08))"}`,
                  background: filtroResponsable === colab ? "#1d1d1f" : "#ffffff",
                  color: filtroResponsable === colab ? "#ffffff" : "var(--text-muted, #6e6e73)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {colab}
              </button>
            ))}
          </div>

          {/* Lista de Documentos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted, #86868b)", textTransform: "uppercase", padding: "0 6px 4px", letterSpacing: "0.05em" }}>
              Páginas de Obra & Equipo ({docsFiltrados.length})
            </div>

            {docsFiltrados.map((doc) => {
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

                  {doc.responsable && (
                    <span
                      style={{
                        fontSize: 9.5,
                        fontWeight: 600,
                        background: "rgba(0,0,0,0.04)",
                        padding: "1px 6px",
                        borderRadius: 6,
                        color: "var(--text-muted, #86868b)",
                        marginLeft: 6,
                        flexShrink: 0,
                      }}
                    >
                      {doc.responsable.split(" ")[0]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Sidebar: Progreso */}
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
      </aside>

      {/* =================================================================== */}
      {/* ÁREA DE CONTENIDO Y EDITOR DEL DOCUMENTO ESTILO NOTION              */}
      {/* =================================================================== */}
      <main style={{ padding: isMobile ? "16px 14px" : "28px 36px", overflowY: "auto", position: "relative" }}>
        
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
          {/* Breadcrumbs y Obra */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted, #86868b)" }}>
            <span>Tareas de Obra</span>
            <span>/</span>
            <span style={{ fontWeight: 700, color: "var(--text-main, #1d1d1f)" }}>{docActivo?.titulo}</span>
            {docActivo?.obraNombre && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  background: "rgba(37, 99, 235, 0.08)",
                  color: "#1d4ed8",
                  padding: "1px 7px",
                  borderRadius: 6,
                }}
              >
                📍 {docActivo.obraNombre}
              </span>
            )}
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
                    { tipo: "checklist", icono: "☑", titulo: "Lista de Tareas", desc: "Casilla para tachar y asignar" },
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

          {/* Selector de Responsable y Obra */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 12, color: "var(--text-muted, #86868b)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>👤 Responsable:</span>
              <select
                value={docActivo?.responsable || "Paola"}
                onChange={(e) => actualizarDocActivo("responsable", e.target.value)}
                style={{
                  border: "1px solid var(--border, rgba(0,0,0,0.1))",
                  borderRadius: 6,
                  padding: "2px 6px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: "#ffffff",
                  color: "var(--text-main, #1d1d1f)",
                }}
              >
                {colaboradores.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>🏗️ Obra:</span>
              <input
                type="text"
                value={docActivo?.obraNombre || ""}
                onChange={(e) => actualizarDocActivo("obraNombre", e.target.value)}
                placeholder="Nombre de la obra..."
                style={{
                  border: "1px solid var(--border, rgba(0,0,0,0.1))",
                  borderRadius: 6,
                  padding: "2px 6px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  background: "#ffffff",
                  color: "var(--text-main, #1d1d1f)",
                  minWidth: 160,
                }}
              />
            </div>

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
          {(docActivo?.bloques || []).map((bloque) => {
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

                          {/* Responsable y Fecha */}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                            {tarea.responsable && (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 600,
                                  background: "var(--surface-subtle, #f1f5f9)",
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                  color: "var(--text-muted, #64748b)",
                                }}
                              >
                                {tarea.responsable}
                              </span>
                            )}
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
          })}
        </div>

        {/* Prompt estilo Notion: Pulsa / para comandos */}
        <div
          style={{
            marginTop: 32,
            paddingTop: 16,
            borderTop: "1px dashed var(--border, rgba(0, 0, 0, 0.08))",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 11.5,
            color: "var(--text-muted, #86868b)",
          }}
        >
          <span style={{ width: 8, height: 16, background: NARANJA, display: "inline-block", borderRadius: 2 }} />
          <span>Haz clic en <strong>+ Insertar Bloque</strong> arriba para agregar subpáginas, listas de tareas, desplegables o notas técnicas vinculadas a tu equipo.</span>
        </div>

      </main>
    </div>
  );
}
