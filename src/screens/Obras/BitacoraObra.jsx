import AvisoFlujo from "../../components/AvisoFlujo";
import BotonDictado from "../../components/ui/BotonDictado";
import LBL from "../../components/ui/LBL";
import { useRef, useState } from "react";
import { B, SI } from "../../styles/tokens";
import { fmtD, today } from "../../lib/format";
import { leerImagenComprimida } from "../../lib/imagenes";
import { normalizarFrase } from "../../lib/normalizarEntrada";
import { normalizarBitacora, registroVacio, resumenBitacora } from "../../lib/bitacoraObra";

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

  const guardarBitacora = (siguiente) => {
    if (bloqueada) return;
    return guardarBitacoraReal(siguiente);
  };

  const guardarBitacoraReal = (siguiente) =>
    setObras((prev) => prev.map((o) => (o.id === obra.id ? { ...o, bitacora: siguiente } : o)));

  const agregarRegistro = () => {
    // Nace con una foto vacia lista para tocar: es lo primero que hace la
    // gente cuando llega del sitio.
    const nuevo = { ...registroVacio(today()), fotos: [] };
    guardarBitacora([...registros, nuevo]);
  };

  const actualizarRegistro = (id, campo, valor) =>
    guardarBitacora(registros.map((r) => (r.id === id ? { ...r, [campo]: valor } : r)));

  // Al salir del campo se acomoda el texto: mayuscula inicial y sin espacios
  // de sobra. Estos textos salen tal cual impresos en el informe.
  const acomodarTexto = (id, campo, valor) => {
    const limpio = normalizarFrase(valor);
    if (limpio !== valor) actualizarRegistro(id, campo, limpio);
  };

  const eliminarRegistro = (registro) => {
    const cuantasFotos = (registro.fotos || []).filter((f) => f.img).length;
    const aviso = cuantasFotos
      ? `Se va a borrar este registro del ${fmtD(registro.fecha) || "día sin fecha"} junto con sus ${cuantasFotos} foto(s). Esta acción no se puede deshacer.\n\n¿Continuar?`
      : "¿Borrar este registro de avance?";
    if (!window.confirm(aviso)) return;
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
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", padding: 20,
      ...(bloqueada ? { pointerEvents: "none", opacity: 0.8 } : null) }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>📸 Avance y fotos de la obra</div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>
            {resumen.registros} registro(s) · {resumen.fotos} foto(s) cargadas
          </div>
        </div>
        {!bloqueada && (
          <button style={B("#cc0000")} onClick={agregarRegistro}>+ Registrar avance del día</button>
        )}
      </div>

      {/* Las fotos de aqui son las que salen impresas en el informe de
          actividades. Cambiarlas despues de entregarlo dejaria el documento
          diciendo una cosa y la obra otra. */}
      {cargandoFotos && (
        <div style={{ fontSize: 11.5, color: "#1e40af", background: "#eff6ff",
          border: "1px solid #bfdbfe", borderRadius: 9, padding: "9px 12px",
          marginBottom: 14, lineHeight: 1.5, pointerEvents: "auto" }}>
          Cargando las fotos de esta obra… Un momento, para no perder ningún cambio.
        </div>
      )}

      {bloqueada && !cargandoFotos && (
        <div style={{ fontSize: 11.5, color: "#166534", background: "#ecfdf5",
          border: "1px solid #a7f3d0", borderRadius: 9, padding: "9px 12px",
          marginBottom: 14, lineHeight: 1.5, pointerEvents: "auto" }}>
          🔒 <strong>Obra finalizada.</strong> El registro de avance queda como está: estas fotos son
          las que salen en el informe. Un administrador puede reabrir la obra si hay que corregir algo.
        </div>
      )}

      <AvisoFlujo tono="info" titulo="Esto es lo que después sale en el informe de actividades">
        Cada vez que se trabaje en la obra, agrega un registro con la fecha, lo que se hizo y las
        fotos. Cuando toque hacer el informe, no hay que escribir nada de nuevo: se elige el período
        y el sistema trae estos registros con sus fotos y comentarios. <strong>La fecha es lo que
        decide si el registro entra o no en el informe</strong>, así que ponla siempre.
      </AvisoFlujo>

      {subiendoFotos && (
        <div style={{ background: "#F0F6FF", border: "1px solid #BFD8FF", color: "#1E40AF", borderRadius: 10, padding: "9px 13px", fontSize: 12, marginBottom: 12 }}>
          Procesando {subiendoFotos.total > 1 ? `${subiendoFotos.hechas} de ${subiendoFotos.total} fotos…` : "la foto…"} espera un momento.
        </div>
      )}

      {registros.length === 0 && (
        <div style={{ textAlign: "center", padding: 30, color: "#94a3b8", fontSize: 13, background: "#f8fafc", borderRadius: 10, border: "1px dashed #e2e8f0" }}>
          Todavía no hay avances registrados en esta obra.
          <div style={{ fontSize: 11.5, marginTop: 6 }}>
            Dale a «Registrar avance del día» y sube las fotos de lo que se hizo.
          </div>
        </div>
      )}

      {registros.map((registro, idx) => {
        const fotosConImagen = (registro.fotos || []).filter((f) => f.img).length;
        return (
          <div key={registro.id} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#cc0000" }}>
                Avance {idx + 1}
                {registro.fecha && <span style={{ color: "#64748b", fontWeight: 500 }}> · {fmtD(registro.fecha)}</span>}
                <span style={{ color: "#94a3b8", fontWeight: 500 }}> · {fotosConImagen} foto(s)</span>
              </div>
              <button onClick={() => eliminarRegistro(registro)} style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontSize: 11 }}>
                × Eliminar
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 12, marginBottom: 10 }}>
              <div>
                <LBL>Fecha del trabajo</LBL>
                <input type="date" value={registro.fecha} onChange={(e) => actualizarRegistro(registro.id, "fecha", e.target.value)} style={SI} />
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
                  style={SI}
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
                rows={3}
                placeholder="Cuenta el proceso: cómo se hizo, con qué material, en qué parte de la obra. Este texto sale tal cual en el informe."
                spellCheck
                lang="es"
                style={{ ...SI, resize: "vertical" }}
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
              <input
                value={registro.observaciones}
                onChange={(e) => actualizarRegistro(registro.id, "observaciones", e.target.value)}
                onBlur={(e) => acomodarTexto(registro.id, "observaciones", e.target.value)}
                placeholder="Ej: 1 línea de vida horizontal de 119 metros · quedó pendiente la señalización"
                spellCheck
                lang="es"
                style={SI}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <LBL>Fotos del avance</LBL>
              <span style={{ fontSize: 10.5, color: "#94a3b8" }}>Se imprimen en el informe</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10, alignItems: "start" }}>
              {(registro.fotos || []).filter((f) => f.img).map((foto, fi) => (
                <div key={fi} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ background: "#f8fafc", padding: 6, minHeight: 130, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <img src={foto.img} alt="" style={{ width: "100%", height: "auto", maxHeight: 180, objectFit: "contain", display: "block", borderRadius: 4, background: "#fff" }} />
                  </div>
                  <div style={{ padding: "6px 8px", display: "flex", gap: 4, alignItems: "center" }}>
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
                      style={{ ...SI, fontSize: 11, padding: "3px 6px", flex: 1 }}
                    />
                    <button
                      onClick={() => quitarFoto(registro.id, fi)}
                      title="Eliminar foto"
                      style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: 6, width: 22, height: 22, cursor: "pointer", fontSize: 14, flexShrink: 0, lineHeight: 1 }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <div
                onClick={() => fotoRefs.current["lote-" + registro.id]?.click()}
                style={{
                  border: "2px dashed #f47c20",
                  borderRadius: 10,
                  minHeight: 140,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  background: "#fff8f3",
                  color: "#f47c20",
                  fontWeight: 600,
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 24, lineHeight: 1 }}>+</span>
                <span style={{ fontSize: 12 }}>Agregar foto</span>
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
        <div style={{ background: "#f1f5f9", borderRadius: 8, padding: "10px 14px", fontSize: 11.5, color: "#64748b" }}>
          Los cambios se guardan solos. {resumen.sinFotos > 0
            ? `Ojo: ${resumen.sinFotos} registro(s) no tienen ninguna foto, y el informe se ve muy pobre sin registro fotográfico.`
            : "Todos los registros tienen foto: el informe va a salir completo."}
        </div>
      )}
    </div>
  );
}
