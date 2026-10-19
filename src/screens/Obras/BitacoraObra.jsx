import AvisoFlujo from "../../components/AvisoFlujo";
import BotonDictado from "../../components/ui/BotonDictado";
import LBL from "../../components/ui/LBL";
import { Button } from "../../components/ui";
import { TIPO } from "../../styles/designTokens";
import { useEffect, useRef, useState } from "react";
import { B, SI } from "../../styles/tokens";
import { fmtD, today } from "../../lib/format";
import { leerImagenComprimida } from "../../lib/imagenes";
import { normalizarFrase } from "../../lib/normalizarEntrada";
import { normalizarBitacora, registroVacio, resumenBitacora, avanceDesdeBitacora, limpiarAvance } from "../../lib/bitacoraObra";
import { estadoSegunAvance } from "../../lib/flujoObra";
import { confirmar } from "../../lib/dialogos";

// Pestana «Avance y fotos» del detalle de obra.
//
// Aqui es donde la persona que esta en la obra deja el registro del dia: que
// se hizo, las fotos y el comentario de cada foto. Despues, al hacer el
// informe de actividades, todo esto se trae solo filtrando por el periodo.
// Por eso cada registro lleva fecha: es la que decide si entra o no al
// informe de esa quincena o de ese mes.

export default function BitacoraObra({ obra, setObras, bloqueada = false, cargandoFotos = false }) {
  const registros = normalizarBitacora(obra.bitacora);
  const resumen = resumenBitacora(obra.bitacora);
  const fotoRefs = useRef({});
  const [subiendoFotos, setSubiendoFotos] = useState(null);
  // El registro nuevo se agrega al final de la lista, lejos del boton de
  // arriba que lo crea: se baja hasta el y se deja el cursor en su primer campo.
  const [registroPorMostrar, setRegistroPorMostrar] = useState(null);
  useEffect(() => {
    if (!registroPorMostrar) return undefined;
    const id = requestAnimationFrame(() => {
      const el = document.querySelector(`[data-registro-id="${CSS.escape(registroPorMostrar)}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        el.querySelector("input:not([disabled]), textarea:not([disabled])")?.focus({ preventScroll: true });
      }
      setRegistroPorMostrar(null);
    });
    return () => cancelAnimationFrame(id);
  }, [registroPorMostrar]);

  const guardarBitacora = (siguiente) => {
    if (bloqueada) return;
    return guardarBitacoraReal(siguiente);
  };

  // Al guardar la bitacora tambien se mueve el avance de la obra: es el de la
  // jornada mas reciente que lo tenga anotado. Si ninguna lo trae, el avance
  // se queda como estaba (por ejemplo, el que se puso a mano antes).
  const guardarBitacoraReal = (siguiente) =>
    setObras((prev) => prev.map((o) => {
      if (o.id !== obra.id) return o;
      const desdeBitacora = avanceDesdeBitacora(siguiente);
      if (!desdeBitacora) return { ...o, bitacora: siguiente };
      return {
        ...o,
        bitacora: siguiente,
        avance: desdeBitacora.avance,
        estado: estadoSegunAvance(desdeBitacora.avance, o.estado),
      };
    }));

  const agregarRegistro = () => {
    // Nace con una foto vacia lista para tocar: es lo primero que hace la
    // gente cuando llega del sitio.
    const nuevo = { ...registroVacio(today()), fotos: [] };
    guardarBitacora([...registros, nuevo]);
    setRegistroPorMostrar(nuevo.id);
  };

  const actualizarRegistro = (id, campo, valor) =>
    guardarBitacora(registros.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));

  // Al salir del campo se acomoda el texto: mayuscula inicial y sin espacios
  // de sobra. Estos textos salen tal cual impresos en el informe.
  const acomodarTexto = (id, campo, valor) => {
    const limpio = normalizarFrase(valor);
    if (limpio !== valor) actualizarRegistro(id, campo, limpio);
  };

  const eliminarRegistro = async (registro) => {
    const cuantasFotos = (registro.fotos || []).filter((f) => f.img).length;
    const aviso = cuantasFotos
      ? `¿Borrar este registro del ${fmtD(registro.fecha) || "día sin fecha"} junto con sus ${cuantasFotos} foto(s)?\n\nEsta acción no se puede deshacer.`
      : "¿Borrar este registro de avance?";
    if (!(await confirmar(aviso))) return;
    guardarBitacora(registros.filter((r) => r.id !== registro.id));
  };

  const actualizarFoto = (registroId, indice, campo, valor) =>
    guardarBitacora(
      registros.map((r) =>
        r.id === registroId
          ? { ...r, fotos: r.fotos.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f)) }
          : r
      )
    );

  const quitarFoto = (registroId, indice) =>
    guardarBitacora(
      registros.map((r) =>
        r.id === registroId
          ? { ...r, fotos: (r.fotos || []).filter((_, i) => i !== indice) }
          : r
      )
    );

  // Sube una o varias fotos a la vez y las añade al avance, exactamente como en Cotizaciones
  const cargarFotos = async (registroId, archivos) => {
    const lista = Array.from(archivos || []).filter(Boolean);
    if (!lista.length) return;

    setSubiendoFotos({ registroId, hechas: 0, total: lista.length });
    const imagenes = [];
    let fallidas = 0;

    for (const archivo of lista) {
      try {
        imagenes.push(await leerImagenComprimida(archivo));
      } catch {
        fallidas += 1;
      }
      setSubiendoFotos({ registroId, hechas: imagenes.length + fallidas, total: lista.length });
    }
    setSubiendoFotos(null);

    if (imagenes.length) {
      guardarBitacora(
        registros.map((r) => {
          if (r.id !== registroId) return r;
          const existentes = (r.fotos || []).filter((f) => f.img);
          const nuevas = imagenes.map((img) => ({ img, comentario: "" }));
          return { ...r, fotos: [...existentes, ...nuevas] };
        })
      );
    }

    if (fallidas) {
      window.alert(
        fallidas === lista.length
          ? "No se pudo cargar ninguna de esas fotos. Intenta con otras imágenes."
          : `Se subieron ${imagenes.length} fotos. ${fallidas} no se pudieron cargar.`
      );
    }
  };

  return (
    // En una obra cerrada la pestaña se mira pero no se toca. El aviso de
    // abajo queda fuera del apagado para que se pueda leer y seleccionar.
    <div className="ui-card ui-card--ajustado" style={bloqueada ? { pointerEvents: "none", opacity: 0.8 } : undefined}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <h2 style={{ ...TIPO.headline, margin: 0, color: "var(--text-primary)" }}>Avance y fotos de la obra</h2>
          <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginTop: 2 }}>
            {resumen.registros} registro(s) · {resumen.fotos} foto(s) cargadas
          </div>
        </div>
        {!bloqueada && (
          <Button variante="oscuro" tam="sm" icono="mas" onClick={agregarRegistro}>
            Registrar avance del día
          </Button>
        )}
      </div>

      {/* Las fotos de aqui son las que salen impresas en el informe de
          actividades. Cambiarlas despues de entregarlo dejaria el documento
          diciendo una cosa y la obra otra. */}
      {cargandoFotos && (
        <div style={{ fontSize: 11.5, color: "#1d4ed8", background: "#eff6ff",
          border: "1px solid #bfdbfe", borderRadius: 9, padding: "9px 12px",
          marginBottom: 14, lineHeight: 1.5, pointerEvents: "auto" }}>
          Cargando las fotos de esta obra… Un momento, para no perder ningún cambio.
        </div>
      )}

      {bloqueada && !cargandoFotos && (
        <div style={{ fontSize: 11.5, color: "#047857", background: "#ecfdf5",
          border: "1px solid #a7f3d0", borderRadius: 9, padding: "9px 12px",
          marginBottom: 14, lineHeight: 1.5, pointerEvents: "auto" }}>
          🔒 <strong>Obra finalizada.</strong> El registro de avance queda como está: estas fotos son
          las que salen en el informe. Un administrador puede reabrir la obra si hay que corregir algo.
        </div>
      )}

      {subiendoFotos && (
        <div style={{ background: "#fbfbfd", border: "1px solid #d2d2d7", color: "#1d1d1f", borderRadius: 10, padding: "9px 13px", fontSize: 12, marginBottom: 12, fontWeight: 600 }}>
          Procesando {subiendoFotos.total > 1 ? `${subiendoFotos.hechas} de ${subiendoFotos.total} fotos…` : "la foto…"} espera un momento.
        </div>
      )}

      {registros.length === 0 && (
        <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-primary)", fontSize: 13, fontWeight: 600, background: "var(--surface-subtle)", borderRadius: 14 }}>
          Todavía no hay avances registrados en esta obra.
          <div style={{ fontSize: 11.5, fontWeight: 400, marginTop: 6, color: "var(--text-secondary)" }}>
            Dale a «Registrar avance del día» y sube las fotos de lo que se hizo.
          </div>
        </div>
      )}

      {registros.map((registro, idx) => {
        const fotosConImagen = (registro.fotos || []).filter((f) => f.img).length;
        return (
          <div key={registro.id} data-registro-id={registro.id} style={{ scrollMarginTop: 16, background: "var(--surface-subtle, #fbfbfd)", border: "1px solid var(--border, #e5e5ea)", borderRadius: 14, padding: "16px 18px", marginBottom: 14, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--border, #f2f2f7)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", color: "var(--text-main, #1d1d1f)", background: "var(--surface, #ffffff)", border: "1px solid var(--border, #e5e5ea)", padding: "2px 7px", borderRadius: 5 }}>
                  Avance #{idx + 1}
                </span>
                {registro.fecha && <span style={{ color: "var(--text-main, #1d1d1f)", fontWeight: 600, fontSize: 12 }}>· {fmtD(registro.fecha)}</span>}
                <span style={{ color: "var(--text-muted, #86868b)", fontSize: 11 }}>· {fotosConImagen} foto(s)</span>
              </div>
              <button
                onClick={() => eliminarRegistro(registro)}
                style={{ background: "transparent", border: "none", color: "var(--text-muted, #86868b)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 11.5, fontWeight: 500 }}
              >
                × Eliminar jornada
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "180px 150px 1fr", gap: 12, marginBottom: 10 }}>
              <div>
                <LBL>Fecha del trabajo</LBL>
                <input type="date" value={registro.fecha} onChange={(e) => actualizarRegistro(registro.id, "fecha", e.target.value)} style={{ ...SI, background: "#ffffff", border: "1px solid var(--border, #d2d2d7)" }} />
              </div>
              {/* El avance de la obra a esta fecha. La jornada mas reciente
                  que lo tenga es la que manda en el avance de la obra. */}
              <div>
                <LBL>Avance de la obra (%)</LBL>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={1}
                    value={registro.avance ?? ""}
                    onChange={(e) => actualizarRegistro(registro.id, "avance", limpiarAvance(e.target.value))}
                    placeholder={String(obra.avance ?? 0)}
                    aria-label="Avance de la obra a la fecha de esta jornada, en porcentaje"
                    style={{ ...SI, background: "#ffffff", border: "1px solid var(--border, #d2d2d7)", paddingRight: 28, fontVariantNumeric: "tabular-nums" }}
                  />
                  <span style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, color: "var(--text-tertiary)", pointerEvents: "none" }}>%</span>
                </div>
              </div>
              <div>
                <LBL>¿Qué se hizo?</LBL>
                <input
                  value={registro.actividad}
                  onChange={(e) => actualizarRegistro(registro.id, "actividad", e.target.value)}
                  onBlur={(e) => acomodarTexto(registro.id, "actividad", e.target.value)}
                  placeholder="Ej: Instalación de líneas de vida en cubierta norte"
                  spellCheck
                  lang="es"
                  style={{ ...SI, background: "#ffffff", border: "1px solid var(--border, #d2d2d7)" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <LBL>Descripción del trabajo</LBL>
                <BotonDictado
                  valor={registro.descripcion}
                  onChange={(v) => actualizarRegistro(registro.id, "descripcion", v)}
                  titulo="Dictar la descripción"
                  compacto
                />
              </div>
              <textarea
                value={registro.descripcion}
                onChange={(e) => actualizarRegistro(registro.id, "descripcion", e.target.value)}
                onBlur={(e) => acomodarTexto(registro.id, "descripcion", e.target.value)}
                rows={5}
                placeholder="Cuenta el proceso: cómo se hizo, con qué material, en qué parte de la obra. Este texto sale tal cual en el informe."
                spellCheck
                lang="es"
                style={{ ...SI, background: "#ffffff", border: "1px solid var(--border, #d2d2d7)", resize: "vertical", minHeight: 110, lineHeight: 1.5, fontSize: 13 }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <LBL>Observaciones (cantidades, novedades, pendientes)</LBL>
                <BotonDictado
                  valor={registro.observaciones}
                  onChange={(v) => actualizarRegistro(registro.id, "observaciones", v)}
                  titulo="Dictar las observaciones"
                  compacto
                />
              </div>
              <textarea
                value={registro.observaciones}
                onChange={(e) => actualizarRegistro(registro.id, "observaciones", e.target.value)}
                onBlur={(e) => acomodarTexto(registro.id, "observaciones", e.target.value)}
                rows={2}
                placeholder="Ej: 1 línea de vida horizontal de 119 metros · quedó pendiente la señalización"
                spellCheck
                lang="es"
                style={{ ...SI, background: "#ffffff", border: "1px solid var(--border, #d2d2d7)", resize: "vertical", minHeight: 60, lineHeight: 1.45, fontSize: 13 }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <LBL>Fotos del avance</LBL>
              <span style={{ fontSize: 10.5, color: "var(--text-muted, #86868b)" }}>Se imprimen en el informe</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 140px), 1fr))", gap: 10, alignItems: "start", width: "100%", boxSizing: "border-box" }}>
              {(registro.fotos || []).map((foto, fi) => (
                <div key={fi} style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e5e5ea)", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                  <div style={{ background: "var(--surface-subtle, #f8fafc)", padding: 6, minHeight: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={foto.img} alt="" style={{ width: "100%", height: "auto", maxHeight: 180, objectFit: "contain", display: "block", borderRadius: 4, background: "var(--surface, #fff)" }} />
                  </div>
                  <div style={{ padding: "6px 8px", display: "flex", gap: 4, alignItems: "center", background: "#fbfbfd" }}>
                    <input
                      value={foto.comentario || ""}
                      onChange={(e) => actualizarFoto(registro.id, fi, "comentario", e.target.value)}
                      onBlur={(e) => {
                        const limpio = normalizarFrase(e.target.value);
                        if (limpio !== foto.comentario) actualizarFoto(registro.id, fi, "comentario", limpio);
                      }}
                      placeholder={`Foto ${fi + 1}`}
                      spellCheck
                      lang="es"
                      style={{ ...SI, fontSize: 11, padding: "3px 6px", flex: 1, border: "1px solid var(--border, #d2d2d7)", borderRadius: 6, background: "#ffffff" }}
                    />
                    <button
                      onClick={() => quitarFoto(registro.id, fi)}
                      title="Eliminar foto"
                      style={{ background: "transparent", border: "none", color: "var(--text-muted, #86868b)", borderRadius: 4, width: 20, height: 20, cursor: "pointer", fontSize: 14, flexShrink: 0, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <div
                onClick={() => fotoRefs.current["lote-" + registro.id]?.click()}
                style={{
                  border: "2px dashed rgba(0, 0, 0, 0.16)",
                  borderRadius: 10,
                  minHeight: 140,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: "var(--surface-subtle, #fafafc)",
                  color: "var(--text-main, #1d1d1f)",
                  fontWeight: 600,
                  gap: 4,
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1, color: "#1d1d1f" }}>+</span>
                <span style={{ fontSize: 11.5, color: "#1d1d1f" }}>Agregar fotos</span>
                <span style={{ fontSize: 9.5, color: "#86868b" }}>Cámara o galería</span>
              </div>
            </div>

            <input
              ref={(el) => { fotoRefs.current["lote-" + registro.id] = el; }}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={(e) => {
                cargarFotos(registro.id, e.target.files);
                e.target.value = "";
              }}
            />

            {subiendoFotos?.registroId === registro.id && (
              <div style={{ fontSize: 11.5, color: "#f47c20", marginTop: 8, fontWeight: 600 }}>
                ⏳ Cargando fotos… {subiendoFotos.hechas} de {subiendoFotos.total}
              </div>
            )}
          </div>
        );
      })}

      {registros.length > 0 && (
        <div style={{ background: "var(--surface-subtle, #fbfbfd)", border: "1px solid var(--border, #e5e5ea)", borderRadius: 10, padding: "10px 14px", fontSize: 11.5, color: "var(--text-muted, #6e6e73)" }}>
          Los cambios se guardan solos automáticamente. {resumen.sinFotos > 0
            ? `Atención: ${resumen.sinFotos} registro(s) no tienen ninguna foto adjunta.`
            : "Todos los registros cuentan con soporte fotográfico completo."}
        </div>
      )}
    </div>
  );
}
