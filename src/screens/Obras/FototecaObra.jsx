import { useState, useMemo, useEffect } from "react";
import JSZip from "jszip";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmtD, today } from "../../lib/format";
import { normalizarBitacora } from "../../lib/bitacoraObra";

// Fases técnicas de trabajo en Ingeanclajes
export const FASES_OBRA = [
  { id: "diagnostico", label: "1. Diagnóstico e Inicio", icon: "🏗️", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  { id: "montaje", label: "2. Montaje y Fijación", icon: "⚙️", color: "#b45309", bg: "#fffbeb", border: "#fde68a" },
  { id: "traccion", label: "3. Pruebas de Tracción", icon: "⏱️", color: "#047857", bg: "#ecfdf5", border: "#a7f3d0" },
  { id: "entrega", label: "4. Entrega y Placas", icon: "🏷️", color: "#6d28d9", bg: "#f5f3ff", border: "#ddd6fe" },
  { id: "general", label: "General / Registro", icon: "📁", color: "#475467", bg: "#f8fafc", border: "#e2e8f0" },
];

function inferirFase(texto = "") {
  const t = String(texto).toLowerCase();
  if (/ensayo|tracci|manomet|torque|carga|kn|resistencia|prueba/.test(t)) return "traccion";
  if (/perfora|resina|epoxi|varilla|fijaci|montaje|cable|anclaje|quimic|mecanic/.test(t)) return "montaje";
  if (/visita|diagnostico|previo|inspecc|inicial|levantamiento|estado\s*inicial/.test(t)) return "diagnostico";
  if (/entrega|placa|final|recibid|firma|acabado|rotulo/.test(t)) return "entrega";
  return "general";
}

function limpiarNombreArchivo(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 30);
}

export default function FototecaObra({ obra, ctx = {} }) {
  const { informes = [], irAPantalla } = ctx;

  // Estados de vista
  const [vista, setVista] = useState("galeria"); // "galeria" | "fases" | "cronologico"
  const [filtroFase, setFiltroFase] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [seleccionadas, setSeleccionadas] = useState(new Set());

  // Estado del visor HD / Lightbox
  const [fotoActiva, setFotoActiva] = useState(null);
  const [rotacion, setRotacion] = useState(0);
  const [zoom, setZoom] = useState(1);

  // Estados de empaquetado ZIP
  const [empaquetandoZip, setEmpaquetandoZip] = useState(false);
  const [progresoZip, setProgresoZip] = useState(0);

  // 1. Agrupar y normalizar TODAS las fotos que se subieron en Ejecución de Obra (Bitácora + Informes)
  const todasLasFotos = useMemo(() => {
    const lista = [];

    // A. Fotos de la bitácora de avance diario en Ejecución de Obra
    const bitacora = normalizarBitacora(obra?.bitacora);
    bitacora.forEach((reg, regIdx) => {
      (reg.fotos || []).forEach((foto, fIdx) => {
        if (!foto?.img) return;
        const faseCalc = inferirFase((foto.comentario || "") + " " + (reg.actividad || "") + " " + (reg.descripcion || ""));
        lista.push({
          id: `bit-${reg.id || regIdx}-${fIdx}`,
          img: foto.img,
          comentario: foto.comentario || reg.actividad || reg.descripcion || "Avance de obra",
          actividad: reg.actividad || "Jornada de obra",
          fecha: reg.fecha || today(),
          fase: faseCalc,
          autor: "Ejecución de obra",
          origen: reg.actividad ? `Bitácora: ${reg.actividad}` : "Bitácora diaria",
          registroId: reg.id,
        });
      });
    });

    // B. Fotos de informes de actividades creados a partir de la ejecución de esta obra
    const informesObra = (informes || []).filter((inf) => inf.obraId === obra?.id);
    informesObra.forEach((inf) => {
      (inf.actividades || []).forEach((act, actIdx) => {
        (act.fotos || []).forEach((foto, fIdx) => {
          if (!foto?.img) return;
          const faseCalc = inferirFase((foto.caption || "") + " " + (act.titulo || "") + " " + (act.actividadesRealizadas || ""));
          lista.push({
            id: `inf-${inf.id}-${actIdx}-${fIdx}`,
            img: foto.img,
            comentario: foto.caption || act.titulo || `Informe ${inf.numero || ""}`,
            actividad: act.titulo || "Informe técnico",
            fecha: act.fecha || inf.fechaEmision || inf.fecha || today(),
            fase: faseCalc,
            autor: inf.elaboro || "Informe técnico",
            origen: `Informe ${inf.numero || ""}`,
          });
        });
      });
    });

    // C. Fotos históricas en fototeca si existían previamente
    if (Array.isArray(obra?.fototeca)) {
      obra.fototeca.forEach((f, idx) => {
        if (!f?.img) return;
        lista.push({
          id: f.id || `fot-${idx}`,
          img: f.img,
          comentario: f.comentario || "",
          actividad: "Repositorio",
          fecha: f.fecha || f.creadoEn?.slice(0, 10) || today(),
          fase: f.fase || "general",
          autor: f.autor || "Campo",
          origen: "Registro de obra",
        });
      });
    }

    // Ordenar de más reciente a más antigua
    return lista.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }, [obra?.bitacora, obra?.fototeca, informes, obra?.id]);

  // Fotos filtradas
  const fotosFiltradas = useMemo(() => {
    return todasLasFotos.filter((f) => {
      if (filtroFase !== "todas" && f.fase !== filtroFase) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincideComentario = f.comentario.toLowerCase().includes(q);
        const coincideActividad = f.actividad.toLowerCase().includes(q);
        const coincideFecha = f.fecha.includes(q);
        const coincideOrigen = f.origen.toLowerCase().includes(q);
        const coincideAutor = f.autor.toLowerCase().includes(q);
        if (!coincideComentario && !coincideActividad && !coincideFecha && !coincideOrigen && !coincideAutor) return false;
      }
      return true;
    });
  }, [todasLasFotos, filtroFase, busqueda]);

  // Conteo por fase
  const conteoPorFase = useMemo(() => {
    const mapa = { todas: todasLasFotos.length };
    FASES_OBRA.forEach((fase) => {
      mapa[fase.id] = todasLasFotos.filter((f) => f.fase === fase.id).length;
    });
    return mapa;
  }, [todasLasFotos]);

  // Selección
  const toggleSeleccion = (id) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const seleccionarTodas = () => {
    if (seleccionadas.size === fotosFiltradas.length) {
      setSeleccionadas(new Set());
    } else {
      setSeleccionadas(new Set(fotosFiltradas.map((f) => f.id)));
    }
  };

  // Manejador de teclado para el visor
  useEffect(() => {
    if (!fotoActiva) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setFotoActiva(null);
      if (e.key === "ArrowRight") navegarFoto(1);
      if (e.key === "ArrowLeft") navegarFoto(-1);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fotoActiva, fotosFiltradas]);

  const navegarFoto = (direccion) => {
    if (!fotoActiva) return;
    const idx = fotosFiltradas.findIndex((f) => f.id === fotoActiva.id);
    if (idx === -1) return;
    const nuevoIdx = (idx + direccion + fotosFiltradas.length) % fotosFiltradas.length;
    setFotoActiva(fotosFiltradas[nuevoIdx]);
    setRotacion(0);
    setZoom(1);
  };

  // Descarga individual en HD
  const descargarFotoHD = (foto) => {
    const a = document.createElement("a");
    a.href = foto.img;
    const nombreLimpio = limpiarNombreArchivo(foto.comentario || foto.fase);
    a.download = `${obra?.id || "OBRA"}_${foto.fecha || today()}_${nombreLimpio || "foto"}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Descarga masiva empaquetada en .ZIP con JSZip
  const descargarEnZip = async (fotosADescargar, nombreArchivoZip = null) => {
    if (!fotosADescargar || !fotosADescargar.length) return;

    setEmpaquetandoZip(true);
    setProgresoZip(0);

    try {
      const zip = new JSZip();

      for (let i = 0; i < fotosADescargar.length; i++) {
        const f = fotosADescargar[i];
        const faseInfo = FASES_OBRA.find((fa) => fa.id === f.fase) || { label: "General" };
        const carpetaFase = zip.folder(faseInfo.label.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚ_ -]/g, "").trim());

        const base64Data = f.img.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
        const comentarioLimpio = limpiarNombreArchivo(f.comentario);
        const fileName = `${obra?.id || "OBRA"}_${f.fecha}_${f.fase}_${comentarioLimpio ? comentarioLimpio + "_" : ""}${i + 1}.jpg`;

        carpetaFase.file(fileName, base64Data, { base64: true });
        setProgresoZip(Math.round(((i + 1) / fotosADescargar.length) * 50));
      }

      const zipBlob = await zip.generateAsync(
        {
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: 5 },
        },
        (meta) => {
          setProgresoZip(50 + Math.round(meta.percent * 0.5));
        }
      );

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      const defaultName = `${obra?.id || "OBRA"}_Fotos_${today()}`;
      a.download = `${nombreArchivoZip || defaultName}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 20000);
    } catch (err) {
      console.error("Error al generar el ZIP:", err);
      alert("Hubo un error al empaquetar las fotografías en ZIP. Inténtelo de nuevo con menos imágenes.");
    } finally {
      setEmpaquetandoZip(false);
      setProgresoZip(0);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* 1. BARRA SUPERIOR: RESUMEN Y BOTONES MASIVOS DE DESCARGA */}
      <div
        style={{
          ...CD,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          background: "linear-gradient(135deg, var(--surface, #ffffff) 0%, var(--surface-subtle, #f8fafc) 100%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "#FFFAEB",
              border: "1px solid rgba(181, 71, 8, 0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            📸
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-main, #101828)", display: "flex", alignItems: "center", gap: 8 }}>
              <span>Repositorio Fotográfico de Obra</span>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 12,
                  background: "#EFF4FF",
                  color: "#1d4ed8",
                  border: "1px solid #bfdbfe",
                }}
              >
                {todasLasFotos.length} {todasLasFotos.length === 1 ? "foto disponible" : "fotos disponibles"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted, #667085)", marginTop: 2 }}>
              Alimentado automáticamente desde la bitácora de <strong>Ejecución de obra</strong> · Listas para descarga en ZIP
            </div>
          </div>
        </div>

        {/* Acciones masivas de descarga */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {/* Botón Descargar Selección */}
          {seleccionadas.size > 0 && (
            <button
              onClick={() => {
                const seleccion = todasLasFotos.filter((f) => seleccionadas.has(f.id));
                descargarEnZip(seleccion, `${obra?.id || "OBRA"}_Seleccion_${seleccionadas.size}_fotos`);
              }}
              disabled={empaquetandoZip}
              style={{
                ...B("#027A48", "#ffffff"),
                boxShadow: "0 2px 6px rgba(2, 122, 72, 0.25)",
              }}
            >
              📦 Descargar selección en ZIP ({seleccionadas.size})
            </button>
          )}

          {/* Botón Descargar Todo */}
          <button
            onClick={() => descargarEnZip(todasLasFotos, `${obra?.id || "OBRA"}_Album_Completo_${todasLasFotos.length}_fotos`)}
            disabled={empaquetandoZip || todasLasFotos.length === 0}
            style={{
              ...B("#B54708", "#ffffff"),
              opacity: todasLasFotos.length === 0 ? 0.5 : 1,
              cursor: todasLasFotos.length === 0 ? "not-allowed" : "pointer",
              boxShadow: "0 2px 6px rgba(181, 71, 8, 0.2)",
            }}
            title="Descarga todas las fotos de la obra organizadas en carpetas por fase técnica"
          >
            📦 Descargar todo en .ZIP ({todasLasFotos.length})
          </button>
        </div>
      </div>

      {/* 2. AVISO EXPLICATIVO: ORIGEN DESDE EJECUCIÓN DE OBRA */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 12,
          padding: "10px 16px",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>ℹ️</span>
          <span style={{ fontSize: 12.5, color: "#1e40af" }}>
            Este módulo recopila y organiza todas las fotos subidas por el equipo en la pestaña <strong>Avance y fotos</strong> de <strong>Ejecución de obra</strong>.
          </span>
        </div>

        {irAPantalla && obra?.id && (
          <button
            onClick={() => irAPantalla("obras", { obraId: obra.id })}
            style={{
              background: "#1d4ed8",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 1px 3px rgba(29, 78, 216, 0.2)",
            }}
          >
            <span>Ir a Ejecución de obra para registrar fotos</span>
            <span>↗</span>
          </button>
        )}
      </div>

      {/* 3. BARRA DE HERRAMIENTAS: VISTAS + FILTROS DE FASE + BÚSQUEDA */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          {/* Selector de modo de vista */}
          <div style={{ display: "flex", background: "var(--surface-subtle, #f2f4f7)", padding: 3, borderRadius: 10, border: "1px solid var(--border, #eaecf0)" }}>
            {[
              ["galeria", "🖼️ Cuadrícula"],
              ["fases", "📁 Por Fases Técnicas"],
              ["cronologico", "📅 Cronológico"],
            ].map(([id, label]) => {
              const activo = vista === id;
              return (
                <button
                  key={id}
                  onClick={() => setVista(id)}
                  style={{
                    background: activo ? "#ffffff" : "transparent",
                    color: activo ? "#101828" : "var(--text-muted, #667085)",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: activo ? 700 : 500,
                    cursor: "pointer",
                    boxShadow: activo ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Búsqueda rápida */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="text"
              placeholder="🔍 Buscar por nota, actividad o fecha..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ ...SI, width: 280, fontSize: 12, padding: "7px 12px" }}
            />
            {busqueda && (
              <button
                onClick={() => setBusqueda("")}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted, #667085)",
                  fontSize: 12,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Pastillas de filtro por fase */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <button
            onClick={() => setFiltroFase("todas")}
            style={{
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: 11.5,
              fontWeight: filtroFase === "todas" ? 700 : 500,
              background: filtroFase === "todas" ? "#101828" : "var(--surface, #ffffff)",
              color: filtroFase === "todas" ? "#ffffff" : "var(--text-muted, #475467)",
              border: "1px solid var(--border, #eaecf0)",
              cursor: "pointer",
            }}
          >
            Todas ({conteoPorFase.todas})
          </button>
          {FASES_OBRA.map((fase) => {
            const activo = filtroFase === fase.id;
            const cantidad = conteoPorFase[fase.id] || 0;
            return (
              <button
                key={fase.id}
                onClick={() => setFiltroFase(fase.id)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: activo ? 700 : 500,
                  background: activo ? fase.bg : "var(--surface, #ffffff)",
                  color: activo ? fase.color : "var(--text-muted, #475467)",
                  border: activo ? `1px solid ${fase.border}` : "1px solid var(--border, #eaecf0)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span>{fase.icon}</span>
                <span>{fase.label}</span>
                <span style={{ opacity: 0.75, fontSize: 10.5 }}>({cantidad})</span>
              </button>
            );
          })}

          {/* Botón seleccionar todo */}
          {fotosFiltradas.length > 0 && vista !== "fases" && (
            <button
              onClick={seleccionarTodas}
              style={{
                marginLeft: "auto",
                background: "transparent",
                border: "none",
                fontSize: 11.5,
                color: "#B54708",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {seleccionadas.size === fotosFiltradas.length ? "✕ Deseleccionar todas" : `✓ Seleccionar todas (${fotosFiltradas.length})`}
            </button>
          )}
        </div>
      </div>

      {/* 4. MODAL DE EMPAQUETADO ZIP */}
      {empaquetandoZip && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: 16,
              padding: "24px 30px",
              width: 360,
              textAlign: "center",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📦</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#101828", marginBottom: 6 }}>
              Generando archivo .ZIP
            </div>
            <div style={{ fontSize: 12.5, color: "#667085", marginBottom: 16 }}>
              Empaquetando y organizando las fotografías en tu navegador...
            </div>
            {/* Barra de progreso */}
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginBottom: 8 }}>
              <div
                style={{
                  width: `${progresoZip}%`,
                  height: "100%",
                  background: "#027A48",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#027A48" }}>{progresoZip}% completado</div>
          </div>
        </div>
      )}

      {/* 5. VISTA A: CUADRÍCULA DE FOTOS */}
      {vista === "galeria" && (
        <div>
          {fotosFiltradas.length === 0 ? (
            <div style={{ ...CD, textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main, #101828)", marginBottom: 4 }}>
                No hay fotografías registradas para esta obra
              </div>
              <div style={{ fontSize: 12.5, color: "var(--text-muted, #667085)", maxWidth: 440, margin: "0 auto 16px" }}>
                Las fotos se toman y suben desde el módulo <strong>Ejecución de obra</strong> en la pestaña <strong>«Avance y fotos»</strong>. En cuanto el equipo registre el avance diario, aparecerán aquí automáticamente para su descarga en ZIP.
              </div>
              {irAPantalla && obra?.id && (
                <button
                  onClick={() => irAPantalla("obras", { obraId: obra.id })}
                  style={B("#cc0000")}
                >
                  Ir a registrar avance en Ejecución de obra ↗
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 16,
              }}
            >
              {fotosFiltradas.map((foto) => {
                const fase = FASES_OBRA.find((f) => f.id === foto.fase) || { label: "General", icon: "📁", color: "#475467", bg: "#f2f4f7" };
                const isSelected = seleccionadas.has(foto.id);

                return (
                  <div
                    key={foto.id}
                    style={{
                      ...CD,
                      padding: 0,
                      overflow: "hidden",
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      transition: "transform 0.15s ease, box-shadow 0.15s ease",
                      border: isSelected ? "2px solid #027A48" : "1px solid var(--border, #eef0f3)",
                    }}
                  >
                    {/* Checkbox selección */}
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        zIndex: 2,
                        background: "rgba(255,255,255,0.9)",
                        borderRadius: 6,
                        padding: "2px 4px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSeleccion(foto.id)}
                        style={{ cursor: "pointer", width: 15, height: 15, accentColor: "#027A48" }}
                      />
                    </div>

                    {/* Badge de Fase */}
                    <div
                      style={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        zIndex: 2,
                        fontSize: 10.5,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 6,
                        background: "rgba(255,255,255,0.92)",
                        color: fase.color,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <span>{fase.icon}</span>
                      <span>{fase.label.split(".")[1] || fase.label}</span>
                    </div>

                    {/* Imagen con click para abrir HD Lightbox */}
                    <div
                      onClick={() => {
                        setFotoActiva(foto);
                        setRotacion(0);
                        setZoom(1);
                      }}
                      style={{
                        height: 180,
                        background: "#0f172a",
                        cursor: "pointer",
                        overflow: "hidden",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={foto.img}
                        alt={foto.comentario || "Foto de obra"}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.2s ease",
                        }}
                        loading="lazy"
                      />
                    </div>

                    {/* Metadatos y Acciones */}
                    <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1, justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: 11, color: "var(--text-muted, #667085)", display: "flex", justifyContent: "space-between" }}>
                          <span>📅 {fmtD(foto.fecha)}</span>
                          <span style={{ fontSize: 10, background: "var(--surface-subtle, #f2f4f7)", padding: "1px 5px", borderRadius: 4 }}>
                            {foto.origen}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--text-main, #101828)",
                            marginTop: 3,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            lineHeight: 1.35,
                          }}
                          title={foto.comentario}
                        >
                          {foto.comentario || "Sin comentario"}
                        </div>
                      </div>

                      {/* Botonera de foto */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 6, borderTop: "1px solid var(--border, #f2f4f7)" }}>
                        <button
                          onClick={() => {
                            setFotoActiva(foto);
                            setRotacion(0);
                            setZoom(1);
                          }}
                          style={{
                            background: "transparent",
                            border: "none",
                            fontSize: 11.5,
                            color: "#1d4ed8",
                            fontWeight: 600,
                            cursor: "pointer",
                            padding: 0,
                          }}
                        >
                          🔍 Ampliar
                        </button>

                        <button
                          onClick={() => descargarFotoHD(foto)}
                          style={{
                            background: "#eff6ff",
                            border: "1px solid #bfdbfe",
                            borderRadius: 6,
                            padding: "3px 8px",
                            fontSize: 11,
                            color: "#1d4ed8",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          title="Descargar foto individual en alta resolución"
                        >
                          ⬇️ Descargar HD
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 6. VISTA B: POR FASES TÉCNICAS (ÁLBUMES CON DESCARGA ZIP POR FASE) */}
      {vista === "fases" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
          {FASES_OBRA.map((fase) => {
            const fotosFase = todasLasFotos.filter((f) => f.fase === fase.id);
            const ultimas = fotosFase.slice(0, 4);

            return (
              <div
                key={fase.id}
                style={{
                  ...CD,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderColor: fase.border,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{fase.icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: fase.color }}>
                          {fase.label}
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--text-muted, #667085)" }}>
                          {fotosFase.length} {fotosFase.length === 1 ? "foto guardada" : "fotos guardadas"}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 10,
                        background: fase.bg,
                        color: fase.color,
                        border: `1px solid ${fase.border}`,
                      }}
                    >
                      {fase.id}
                    </span>
                  </div>

                  {/* Collage de miniaturas */}
                  <div
                    style={{
                      height: 120,
                      background: "var(--surface-subtle, #f8fafc)",
                      borderRadius: 10,
                      padding: 6,
                      border: "1px solid var(--border, #eaecf0)",
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 6,
                      marginBottom: 14,
                    }}
                  >
                    {ultimas.length > 0 ? (
                      ultimas.map((foto, i) => (
                        <div
                          key={i}
                          onClick={() => {
                            setFotoActiva(foto);
                            setRotacion(0);
                            setZoom(1);
                          }}
                          style={{
                            height: "100%",
                            borderRadius: 6,
                            overflow: "hidden",
                            cursor: "pointer",
                            background: "#0f172a",
                          }}
                        >
                          <img
                            src={foto.img}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        </div>
                      ))
                    ) : (
                      <div
                        style={{
                          gridColumn: "1 / -1",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-muted, #94a3b8)",
                          fontSize: 12,
                        }}
                      >
                        Aún no hay fotos en esta fase
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones de Álbum */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      setFiltroFase(fase.id);
                      setVista("galeria");
                    }}
                    style={{
                      ...B("var(--surface-subtle, #f2f4f7)", "var(--text-main, #101828)"),
                      flex: 1,
                      justifyContent: "center",
                      fontSize: 12,
                      padding: "7px 10px",
                      border: "1px solid var(--border, #eaecf0)",
                    }}
                  >
                    Ver fotos ({fotosFase.length})
                  </button>

                  <button
                    onClick={() => descargarEnZip(fotosFase, `${obra?.id || "OBRA"}_${fase.label.split(".")[1]?.trim() || fase.id}_${fotosFase.length}_fotos`)}
                    disabled={empaquetandoZip || fotosFase.length === 0}
                    style={{
                      ...B(fase.color, "#ffffff"),
                      fontSize: 12,
                      padding: "7px 12px",
                      opacity: fotosFase.length === 0 ? 0.5 : 1,
                      cursor: fotosFase.length === 0 ? "not-allowed" : "pointer",
                    }}
                    title="Descargar sólo las fotos de esta fase en un archivo .ZIP"
                  >
                    📥 Descargar ZIP
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 7. VISTA C: CRONOLÓGICA (AGRUPADA POR FECHA) */}
      {vista === "cronologico" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {fotosFiltradas.length === 0 ? (
            <div style={{ ...CD, textAlign: "center", padding: 30 }}>No hay fotos registradas para esta obra</div>
          ) : (
            (() => {
              // Agrupar por fecha
              const grupos = {};
              fotosFiltradas.forEach((f) => {
                if (!grupos[f.fecha]) grupos[f.fecha] = [];
                grupos[f.fecha].push(f);
              });

              return Object.entries(grupos).map(([fecha, listaFotos]) => (
                <div key={fecha} style={CD}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                      paddingBottom: 8,
                      borderBottom: "1px solid var(--border, #eaecf0)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 16 }}>📅</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main, #101828)" }}>
                        {fmtD(fecha) || "Sin fecha asignada"}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--text-muted, #667085)" }}>
                        ({listaFotos.length} {listaFotos.length === 1 ? "foto" : "fotos"})
                      </span>
                    </div>

                    <button
                      onClick={() => descargarEnZip(listaFotos, `${obra?.id || "OBRA"}_Jornada_${fecha}_${listaFotos.length}_fotos`)}
                      disabled={empaquetandoZip}
                      style={{
                        ...B("#eff6ff", "#1d4ed8"),
                        border: "1px solid #bfdbfe",
                        fontSize: 11.5,
                        padding: "4px 10px",
                      }}
                    >
                      📦 Descargar jornada en ZIP
                    </button>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                    {listaFotos.map((f) => (
                      <div
                        key={f.id}
                        onClick={() => {
                          setFotoActiva(f);
                          setRotacion(0);
                          setZoom(1);
                        }}
                        style={{
                          borderRadius: 8,
                          overflow: "hidden",
                          border: "1px solid var(--border, #eaecf0)",
                          background: "#0f172a",
                          height: 140,
                          cursor: "pointer",
                          position: "relative",
                        }}
                      >
                        <img src={f.img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <div
                          style={{
                            position: "absolute",
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: "linear-gradient(transparent, rgba(0,0,0,0.8))",
                            color: "#fff",
                            fontSize: 10.5,
                            padding: "6px 8px",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {f.comentario}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()
          )}
        </div>
      )}

      {/* 8. VISOR LIGHTBOX HD / MODAL DE DETALLE COMPLETO */}
      {fotoActiva && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 15, 29, 0.94)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "stretch",
          }}
        >
          {/* Área principal de la imagen */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Barra superior de controles del visor */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 24px",
                background: "rgba(15, 23, 42, 0.6)",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                color: "#fff",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#f8fafc" }}>
                  {obra?.cliente} · {obra?.id}
                </span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>
                  Foto {fotosFiltradas.findIndex((f) => f.id === fotoActiva.id) + 1} de {fotosFiltradas.length}
                </span>
              </div>

              {/* Botonera de manipulación de imagen */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => setRotacion((r) => (r + 90) % 360)}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 8,
                    color: "#fff",
                    padding: "6px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                  title="Girar imagen 90 grados"
                >
                  🔄 Girar
                </button>
                <button
                  onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 8,
                    color: "#fff",
                    padding: "6px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                  title="Aumentar zoom"
                >
                  🔍 +
                </button>
                <button
                  onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 8,
                    color: "#fff",
                    padding: "6px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                  title="Disminuir zoom"
                >
                  🔍 -
                </button>
                {zoom !== 1 && (
                  <button
                    onClick={() => setZoom(1)}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 8,
                      color: "#fbbf24",
                      padding: "6px 12px",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Reset (100%)
                  </button>
                )}
                <button
                  onClick={() => setFotoActiva(null)}
                  style={{
                    background: "rgba(239, 68, 68, 0.2)",
                    border: "1px solid rgba(239, 68, 68, 0.4)",
                    borderRadius: 8,
                    color: "#fca5a5",
                    padding: "6px 14px",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Contenedor central con la foto en HD y flechas de navegación */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                padding: 20,
                overflow: "auto",
              }}
            >
              {/* Flecha anterior */}
              <button
                onClick={() => navegarFoto(-1)}
                style={{
                  position: "absolute",
                  left: 20,
                  zIndex: 10,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontSize: 20,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
              >
                ◀
              </button>

              {/* Imagen activa con transformación de zoom y rotación */}
              <img
                src={fotoActiva.img}
                alt={fotoActiva.comentario}
                style={{
                  maxWidth: "90%",
                  maxHeight: "85vh",
                  objectFit: "contain",
                  borderRadius: 8,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
                  transform: `scale(${zoom}) rotate(${rotacion}deg)`,
                  transition: "transform 0.2s ease-out",
                }}
              />

              {/* Flecha siguiente */}
              <button
                onClick={() => navegarFoto(1)}
                style={{
                  position: "absolute",
                  right: 20,
                  zIndex: 10,
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(15, 23, 42, 0.8)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontSize: 20,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                }}
              >
                ▶
              </button>
            </div>
          </div>

          {/* Ficha técnica lateral en HD */}
          <div
            style={{
              width: 340,
              background: "#1e293b",
              borderLeft: "1px solid rgba(255,255,255,0.1)",
              color: "#f8fafc",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#38bdf8", textTransform: "uppercase", letterSpacing: 1 }}>
                  Ficha Técnica de Imagen
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                  {FASES_OBRA.find((f) => f.id === fotoActiva.fase)?.label || "Fotografía de Obra"}
                </div>
              </div>

              {/* Metadatos en tabla */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span style={{ color: "#94a3b8" }}>Obra:</span>
                  <span style={{ fontWeight: 600 }}>{obra?.id}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span style={{ color: "#94a3b8" }}>Fecha de toma:</span>
                  <span style={{ fontWeight: 600 }}>{fmtD(fotoActiva.fecha)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span style={{ color: "#94a3b8" }}>Origen:</span>
                  <span style={{ fontWeight: 600, color: "#34d399" }}>{fotoActiva.origen}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 6 }}>
                  <span style={{ color: "#94a3b8" }}>Registrado en:</span>
                  <span style={{ fontWeight: 600 }}>{fotoActiva.autor}</span>
                </div>
              </div>

              {/* Nota técnica / Comentario */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>
                  Observaciones / Notas registradas:
                </div>
                <div
                  style={{
                    background: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10,
                    padding: 12,
                    fontSize: 12.5,
                    color: "#e2e8f0",
                    lineHeight: 1.5,
                  }}
                >
                  {fotoActiva.comentario || "Sin notas técnicas registradas."}
                </div>
              </div>
            </div>

            {/* Acciones del visor */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => descargarFotoHD(fotoActiva)}
                style={{
                  ...B("#027A48", "#ffffff"),
                  width: "100%",
                  justifyContent: "center",
                  padding: "10px 16px",
                  fontSize: 13,
                  boxShadow: "0 4px 12px rgba(2, 122, 72, 0.4)",
                }}
              >
                ⬇️ Descargar foto original HD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
