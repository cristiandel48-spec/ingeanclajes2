import { useState, useMemo, useEffect } from "react";
import JSZip from "jszip";
import { B, CD, SI } from "../../styles/tokens";
import { fmtD, today } from "../../lib/format";
import { normalizarBitacora } from "../../lib/bitacoraObra";

function limpiarNombreArchivo(texto = "") {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 30);
}

export default function FototecaObra({ obra, ctx = {} }) {
  const { informes = [], irAPantalla, asegurarDetalle } = ctx;

  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [fotoActiva, setFotoActiva] = useState(null);
  const [rotacion, setRotacion] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [empaquetandoZip, setEmpaquetandoZip] = useState(false);
  const [progresoZip, setProgresoZip] = useState(0);

  // Asegurar la carga de bitácora pesada desde Supabase si la obra está en estado parcial
  useEffect(() => {
    if (!obra?.id || !asegurarDetalle) return;
    if (obra.__parcial !== false) {
      setCargandoDetalle(true);
      asegurarDetalle("obras", obra.id).finally(() => setCargandoDetalle(false));
    }
  }, [obra?.id, obra?.__parcial, asegurarDetalle]);

  // Asegurar la carga de informes asociados a esta obra para incluir sus fotos
  useEffect(() => {
    if (!obra?.id || !asegurarDetalle) return;
    const infsParciales = (informes || []).filter((inf) => inf.obraId === obra.id && inf.__parcial !== false);
    infsParciales.forEach((inf) => {
      asegurarDetalle("informes", inf.id);
    });
  }, [obra?.id, informes, asegurarDetalle]);

  // Recopilar todas las fotos de la obra (Bitácora de obra + Informes)
  const todasLasFotos = useMemo(() => {
    const lista = [];

    // 1. Bitácora de Ejecución de Obra
    const bitacora = normalizarBitacora(obra?.bitacora);
    bitacora.forEach((reg, regIdx) => {
      (reg.fotos || []).forEach((foto, fIdx) => {
        if (!foto?.img) return;
        lista.push({
          id: `bit-${reg.id || regIdx}-${fIdx}`,
          img: foto.img,
          comentario: foto.comentario || reg.actividad || reg.descripcion || "Foto de avance",
          fecha: reg.fecha || today(),
          origen: reg.actividad || "Bitácora de obra",
        });
      });
    });

    // 2. Informes de actividades asociados a esta obra
    const infsObra = (informes || []).filter((inf) => inf.obraId === obra?.id);
    infsObra.forEach((inf) => {
      (inf.actividades || []).forEach((act, actIdx) => {
        (act.fotos || []).forEach((foto, fIdx) => {
          if (!foto?.img) return;
          lista.push({
            id: `inf-${inf.id}-${actIdx}-${fIdx}`,
            img: foto.img,
            comentario: foto.caption || act.titulo || `Informe ${inf.numero || ""}`,
            fecha: act.fecha || inf.fechaEmision || inf.fecha || today(),
            origen: `Informe ${inf.numero || ""}`,
          });
        });
      });
    });

    // 3. Fototeca directa si existía
    if (Array.isArray(obra?.fototeca)) {
      obra.fototeca.forEach((f, idx) => {
        if (!f?.img) return;
        lista.push({
          id: f.id || `fot-${idx}`,
          img: f.img,
          comentario: f.comentario || "",
          fecha: f.fecha || today(),
          origen: "Registro fotográfico",
        });
      });
    }

    return lista.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }, [obra?.bitacora, obra?.fototeca, informes, obra?.id]);

  // Filtrado por buscador
  const fotosFiltradas = useMemo(() => {
    if (!busqueda.trim()) return todasLasFotos;
    const q = busqueda.toLowerCase().trim();
    return todasLasFotos.filter(
      (f) =>
        f.comentario.toLowerCase().includes(q) ||
        f.fecha.includes(q) ||
        f.origen.toLowerCase().includes(q)
    );
  }, [todasLasFotos, busqueda]);

  // Navegación por teclado en visor
  useEffect(() => {
    if (!fotoActiva) return;
    const onKey = (e) => {
      if (e.key === "Escape") setFotoActiva(null);
      if (e.key === "ArrowRight") navegarFoto(1);
      if (e.key === "ArrowLeft") navegarFoto(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fotoActiva, fotosFiltradas]);

  const navegarFoto = (direccion) => {
    if (!fotoActiva) return;
    const idx = fotosFiltradas.findIndex((f) => f.id === fotoActiva.id);
    if (idx === -1) return;
    const nextIdx = (idx + direccion + fotosFiltradas.length) % fotosFiltradas.length;
    setFotoActiva(fotosFiltradas[nextIdx]);
    setRotacion(0);
    setZoom(1);
  };

  // Descarga individual HD
  const descargarFoto = (foto, e) => {
    if (e) e.stopPropagation();
    const a = document.createElement("a");
    a.href = foto.img;
    const nom = limpiarNombreArchivo(foto.comentario);
    a.download = `${obra?.id || "OBRA"}_${foto.fecha || today()}_${nom || "foto"}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Descargar todas en ZIP
  const descargarTodoZip = async () => {
    if (!todasLasFotos.length) return;
    setEmpaquetandoZip(true);
    setProgresoZip(0);

    try {
      const zip = new JSZip();
      for (let i = 0; i < todasLasFotos.length; i++) {
        const f = todasLasFotos[i];
        const base64Data = f.img.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
        const nom = limpiarNombreArchivo(f.comentario);
        const fileName = `${obra?.id || "OBRA"}_${f.fecha}_${nom ? nom + "_" : ""}${i + 1}.jpg`;
        zip.file(fileName, base64Data, { base64: true });
        setProgresoZip(Math.round(((i + 1) / todasLasFotos.length) * 60));
      }

      const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" }, (meta) => {
        setProgresoZip(60 + Math.round(meta.percent * 0.4));
      });

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${obra?.id || "OBRA"}_Fotos_${today()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 15000);
    } catch (err) {
      console.error("Error al generar ZIP:", err);
      alert("Hubo un error al empaquetar las fotos en ZIP.");
    } finally {
      setEmpaquetandoZip(false);
      setProgresoZip(0);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* BARRA SUPERIOR LIMPIA: CONTEO + BUSCADOR + DESCARGA ZIP */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: "10px 14px",
          background: "var(--surface, #ffffff)",
          border: "1px solid var(--border, #eaecf0)",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main, #101828)" }}>
            {cargandoDetalle ? "Cargando fotos..." : `${todasLasFotos.length} ${todasLasFotos.length === 1 ? "foto disponible" : "fotos disponibles"}`}
          </span>
          {cargandoDetalle && (
            <span style={{ fontSize: 12, color: "#B54708" }}>⏳ Sincronizando fotos de la obra...</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: "100%" }}>
          {todasLasFotos.length > 3 && (
            <input
              type="text"
              placeholder="🔍 Filtrar fotos por fecha o nota..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ ...SI, flex: "1 1 180px", minWidth: 0, width: "100%", maxWidth: "100%", fontSize: 12, padding: "7px 10px" }}
            />
          )}

          {todasLasFotos.length > 0 && (
            <button
              onClick={descargarTodoZip}
              disabled={empaquetandoZip}
              style={{
                ...B("#B54708", "#ffffff"),
                fontSize: 12,
                padding: "8px 14px",
                borderRadius: 8,
                maxWidth: "100%",
              }}
            >
              {empaquetandoZip ? `📦 Empaquetando ZIP (${progresoZip}%)...` : `📦 Descargar todo en ZIP (${todasLasFotos.length})`}
            </button>
          )}
        </div>
      </div>

      {/* CUADRÍCULA DE FOTOS */}
      {fotosFiltradas.length === 0 ? (
        <div
          style={{
            ...CD,
            textAlign: "center",
            padding: "48px 20px",
            color: "var(--text-muted, #667085)",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>📷</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main, #101828)", marginBottom: 4 }}>
            {busqueda ? "No hay fotos que coincidan con la búsqueda" : "Esta obra aún no tiene fotos registradas"}
          </div>
          <div style={{ fontSize: 12, maxWidth: 380, margin: "0 auto 12px" }}>
            Las fotos se toman y suben desde la bitácora de <strong>Ejecución de obra</strong>. En cuanto el equipo registre el avance diario, aparecerán aquí para descargar.
          </div>
          {irAPantalla && obra?.id && (
            <button
              onClick={() => irAPantalla("obras", { obraId: obra.id })}
              style={{
                ...B("var(--surface-subtle, #f2f4f7)", "#1d4ed8"),
                border: "1px solid #bfdbfe",
                fontSize: 12,
                padding: "6px 12px",
                margin: "0 auto",
              }}
            >
              Ir a Ejecución de obra ↗
            </button>
          )}
        </div>
      ) : (
        <div
          className="fototeca-grid no-collapse-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 160px), 1fr))",
            gap: 12,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          {fotosFiltradas.map((foto) => (
            <div
              key={foto.id}
              onClick={() => {
                setFotoActiva(foto);
                setRotacion(0);
                setZoom(1);
              }}
              style={{
                background: "var(--surface, #ffffff)",
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                transition: "all 0.15s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              {/* Miniatura */}
              <div
                style={{
                  height: 160,
                  background: "#0f172a",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={foto.img}
                  alt={foto.comentario || "Foto"}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  loading="lazy"
                />
              </div>

              {/* Pie de foto limpio con botón directo de descarga */}
              <div style={{ padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6, flex: 1, justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted, #64748b)" }}>
                    📅 {fmtD(foto.fecha)}
                  </div>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      color: "var(--text-main, #1e293b)",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={foto.comentario}
                  >
                    {foto.comentario || "Sin descripción"}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                  <button
                    onClick={(e) => descargarFoto(foto, e)}
                    style={{
                      background: "#eff6ff",
                      color: "#1d4ed8",
                      border: "1px solid #bfdbfe",
                      borderRadius: 6,
                      padding: "3px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                    title="Descargar esta foto"
                  >
                    <span>⬇️</span>
                    <span>Descargar</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VISOR LIGHTBOX ULTRA LIMPIO */}
      {fotoActiva && (
        <div
          onClick={() => setFotoActiva(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(6px)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px",
          }}
        >
          {/* Barra superior de controles del visor */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 1000,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#ffffff",
              paddingBottom: 10,
            }}
          >
            <div style={{ fontSize: 13, color: "#cbd5e1" }}>
              📅 {fmtD(fotoActiva.fecha)} {fotoActiva.comentario ? `· ${fotoActiva.comentario}` : ""}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRotacion((r) => (r + 90) % 360);
                }}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                🔄 Girar
              </button>

              <button
                onClick={(e) => descargarFoto(fotoActiva, e)}
                style={{
                  background: "#027A48",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 6,
                  padding: "5px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ⬇️ Descargar esta foto
              </button>

              <button
                onClick={() => setFotoActiva(null)}
                style={{
                  background: "rgba(239, 68, 68, 0.3)",
                  color: "#fca5a5",
                  border: "1px solid rgba(239, 68, 68, 0.5)",
                  borderRadius: 6,
                  padding: "5px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                ✕ Cerrar
              </button>
            </div>
          </div>

          {/* Imagen central con flechas de navegación */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              width: "100%",
              maxWidth: 1100,
            }}
          >
            <button
              onClick={() => navegarFoto(-1)}
              style={{
                position: "absolute",
                left: 10,
                zIndex: 2,
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                borderRadius: "50%",
                width: 44,
                height: 44,
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              ◀
            </button>

            <img
              src={fotoActiva.img}
              alt=""
              style={{
                maxWidth: "90%",
                maxHeight: "80vh",
                objectFit: "contain",
                borderRadius: 8,
                boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
                transform: `rotate(${rotacion}deg) scale(${zoom})`,
                transition: "transform 0.15s ease",
              }}
            />

            <button
              onClick={() => navegarFoto(1)}
              style={{
                position: "absolute",
                right: 10,
                zIndex: 2,
                background: "rgba(0,0,0,0.6)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#fff",
                borderRadius: "50%",
                width: 44,
                height: 44,
                fontSize: 20,
                cursor: "pointer",
              }}
            >
              ▶
            </button>
          </div>

          {/* Pie de foto en visor */}
          <div style={{ color: "#94a3b8", fontSize: 11.5, textAlign: "center" }}>
            Usa las flechas del teclado (◀ ▶) para cambiar de foto o Esc para salir.
          </div>
        </div>
      )}
    </div>
  );
}
