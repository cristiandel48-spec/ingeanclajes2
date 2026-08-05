import AvisoFlujo from "../../components/AvisoFlujo";
import BotonDictado from "../../components/ui/BotonDictado";
import LBL from "../../components/ui/LBL";
import { useRef, useState } from "react";
import { B, SI } from "../../styles/tokens";
import { fmtD, today } from "../../lib/format";
import { leerImagenComprimida } from "../../lib/imagenes";
import { normalizarFrase } from "../../lib/normalizarEntrada";
import { fotoVacia, normalizarBitacora, registroVacio, resumenBitacora } from "../../lib/bitacoraObra";

// Pestana «Avance y fotos» del detalle de obra.
//
// Aqui es donde la persona que esta en la obra deja el registro del dia: que
// se hizo, las fotos y el comentario de cada foto. Despues, al hacer el
// informe de actividades, todo esto se trae solo filtrando por el periodo.
// Por eso cada registro lleva fecha: es la que decide si entra o no al
// informe de esa quincena o de ese mes.

export default function BitacoraObra({ obra, setObras }) {
  const registros = normalizarBitacora(obra.bitacora);
  const resumen = resumenBitacora(obra.bitacora);
  const fotoRefs = useRef({});
  const [subiendo, setSubiendo] = useState(false);

  const guardarBitacora = (siguiente) =>
    setObras((prev) => prev.map((o) => (o.id === obra.id ? { ...o, bitacora: siguiente } : o)));

  const agregarRegistro = () => {
    // Nace con una foto vacia lista para tocar: es lo primero que hace la
    // gente cuando llega del sitio.
    const nuevo = { ...registroVacio(today()), fotos: [fotoVacia()] };
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

  const agregarFoto = (registroId) =>
    guardarBitacora(
      registros.map((r) => (r.id === registroId ? { ...r, fotos: [...r.fotos, fotoVacia()] } : r))
    );

  const quitarFoto = (registroId, indice) =>
    guardarBitacora(
      registros.map((r) =>
        r.id === registroId ? { ...r, fotos: r.fotos.filter((_, i) => i !== indice) } : r
      )
    );

  const cargarFoto = async (registroId, indice, file) => {
    if (!file) return;
    setSubiendo(true);
    try {
      // Se reduce antes de guardar: las fotos van dentro de la obra y una foto
      // de celular sin comprimir hace fallar el guardado.
      const img = await leerImagenComprimida(file);
      actualizarFoto(registroId, indice, "img", img);
    } catch {
      window.alert("No se pudo cargar esa foto. Intenta con otra imagen.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e8dfd2", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#2b2622" }}>📸 Avance y fotos de la obra</div>
          <div style={{ fontSize: 11.5, color: "#756a5e", marginTop: 2 }}>
            {resumen.registros} registro(s) · {resumen.fotos} foto(s) cargadas
          </div>
        </div>
        <button style={B("#2b2622")} onClick={agregarRegistro}>+ Registrar avance del día</button>
      </div>

      <AvisoFlujo tono="info" titulo="Esto es lo que después sale en el informe de actividades">
        Cada vez que se trabaje en la obra, agrega un registro con la fecha, lo que se hizo y las
        fotos. Cuando toque hacer el informe, no hay que escribir nada de nuevo: se elige el período
        y el sistema trae estos registros con sus fotos y comentarios. <strong>La fecha es lo que
        decide si el registro entra o no en el informe</strong>, así que ponla siempre.
      </AvisoFlujo>

      {subiendo && (
        <div style={{ background: "#F0F6FF", border: "1px solid #BFD8FF", color: "#574e44", borderRadius: 10, padding: "9px 13px", fontSize: 12, marginBottom: 12 }}>
          Procesando la foto… espera un momento.
        </div>
      )}

      {registros.length === 0 && (
        <div style={{ textAlign: "center", padding: 30, color: "#a2988a", fontSize: 13, background: "#fbf8f3", borderRadius: 10, border: "1px dashed #e8dfd2" }}>
          Todavía no hay avances registrados en esta obra.
          <div style={{ fontSize: 11.5, marginTop: 6 }}>
            Dale a «Registrar avance del día» y sube las fotos de lo que se hizo.
          </div>
        </div>
      )}

      {registros.map((registro, idx) => {
        const fotosConImagen = (registro.fotos || []).filter((f) => f.img).length;
        return (
          <div key={registro.id} style={{ background: "#fbf8f3", border: "1px solid #e8dfd2", borderRadius: 12, padding: 16, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#cc0000" }}>
                Avance {idx + 1}
                {registro.fecha && <span style={{ color: "#756a5e", fontWeight: 500 }}> · {fmtD(registro.fecha)}</span>}
                <span style={{ color: "#a2988a", fontWeight: 500 }}> · {fotosConImagen} foto(s)</span>
              </div>
              <button onClick={() => eliminarRegistro(registro)} style={{ background: "#f9e9e4", border: "none", color: "#cc0000", borderRadius: 5, padding: "3px 10px", cursor: "pointer", fontSize: 11 }}>
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

            <LBL>Fotos del avance</LBL>
            <div style={{ fontSize: 11, color: "#756a5e", marginBottom: 8 }}>
              Toca el recuadro para subir la foto y escribe debajo qué se ve en ella. Ese comentario
              es el que aparece bajo la foto en el informe impreso.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
              {(registro.fotos || []).map((foto, fi) => {
                const clave = registro.id + "-" + fi;
                return (
                  <div key={fi} style={{ background: "#fff", border: "1px solid #e8dfd2", borderRadius: 8, overflow: "hidden" }}>
                    <div
                      onClick={() => fotoRefs.current[clave]?.click()}
                      style={{ minHeight: 150, background: "#fbf8f3", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", padding: foto.img ? 8 : 0 }}
                    >
                      {foto.img ? (
                        <img src={foto.img} alt="" style={{ width: "100%", height: "auto", maxHeight: 220, objectFit: "contain", display: "block", background: "#fff", borderRadius: 6 }} />
                      ) : (
                        <div style={{ textAlign: "center", color: "#a2988a", fontSize: 11 }}>
                          <div style={{ fontSize: 22 }}>📷</div>
                          <div>Clic para subir la foto</div>
                        </div>
                      )}
                      {foto.img && (
                        <div
                          style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.55)", borderRadius: 4, padding: "2px 6px", fontSize: 9, color: "#fff", cursor: "pointer" }}
                          onClick={(e) => { e.stopPropagation(); actualizarFoto(registro.id, fi, "img", null); }}
                        >
                          × Quitar imagen
                        </div>
                      )}
                    </div>
                    <input
                      ref={(el) => { fotoRefs.current[clave] = el; }}
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={(e) => { cargarFoto(registro.id, fi, e.target.files[0]); e.target.value = ""; }}
                    />
                    <div style={{ padding: "6px 8px", display: "flex", gap: 6 }}>
                      <input
                        value={foto.comentario}
                        onChange={(e) => actualizarFoto(registro.id, fi, "comentario", e.target.value)}
                        onBlur={(e) => {
                          const limpio = normalizarFrase(e.target.value);
                          if (limpio !== foto.comentario) actualizarFoto(registro.id, fi, "comentario", limpio);
                        }}
                        placeholder="¿Qué se ve en esta foto?"
                        spellCheck
                        lang="es"
                        style={{ ...SI, fontSize: 11, padding: "4px 8px" }}
                      />
                      <button
                        onClick={() => quitarFoto(registro.id, fi)}
                        title="Quitar este espacio de foto"
                        style={{ background: "#f9e9e4", border: "none", color: "#cc0000", borderRadius: 6, width: 26, cursor: "pointer", fontSize: 13, flexShrink: 0 }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => agregarFoto(registro.id)} style={{ ...B("#f4eee4", "#574e44"), fontSize: 11, marginTop: 8 }}>
              + Agregar otra foto
            </button>
          </div>
        );
      })}

      {registros.length > 0 && (
        <div style={{ background: "#f4eee4", borderRadius: 8, padding: "10px 14px", fontSize: 11.5, color: "#756a5e" }}>
          Los cambios se guardan solos. {resumen.sinFotos > 0
            ? `Ojo: ${resumen.sinFotos} registro(s) no tienen ninguna foto, y el informe se ve muy pobre sin registro fotográfico.`
            : "Todos los registros tienen foto: el informe va a salir completo."}
        </div>
      )}
    </div>
  );
}
