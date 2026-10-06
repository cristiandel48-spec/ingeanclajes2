import { useRef, useState } from "react";
import BotonCorregir from "../../components/ui/BotonCorregir";
import BotonDictado from "../../components/ui/BotonDictado";
import MedidorMapa from "../../components/maps/MedidorMapa";
import { imagenDelMapa } from "../../lib/mapaEstatico";
import LBL from "../../components/ui/LBL";
import { corregirOrtografiaLocal } from "../../lib/correctorTexto";
import { leerImagenComprimida, rotarImagen90 } from "../../lib/imagenes";
import { normalizarFrase } from "../../lib/normalizarEntrada";
import { B, SI } from "../../styles/tokens";
import { agruparCatalogo } from "../../lib/catalogo";
import { useAppData } from "../../context/AppDataContext";
import { measurementsToQuoteItems } from "../../lib/maps";
import { fmt } from "../../lib/format";
import { DEFAULT_COT_INCLUYE } from "../../data/seed";

// Editor de UNA propuesta. Todas las propuestas se muestran abiertas, una
// debajo de otra, igual que salen en el documento.
//
// El mapa se monta solo en la propuesta marcada como activa: cada
// instancia carga la API y consume cuota, asi que tener tres a la vez pondria
// lenta la pantalla sin aportar nada.
export default function PropuestaEditor({
  propuesta,
  indice,
  total: totalPropuestas,
  onChange,
  onEliminar,
  mapaHabilitado,
  onPedirMapa,
  cl,
  setCl,
}) {
  const p = propuesta;
  const [showDB, setShowDB] = useState(false);
  const [dbCat, setDbCat] = useState(0);
  // El catalogo sale de la base; si todavia no hay nada guardado, del codigo.
  const { catalogoItems } = useAppData();
  const catalogo = agruparCatalogo(catalogoItems);
  // Si se borro una categoria entera, el indice guardado puede quedar fuera.
  const categoria = catalogo[dbCat] || catalogo[0] || { items: [] };
  const fotosRef = useRef();

  const set = (campo, valor) => onChange({ [campo]: valor });

  const items = Array.isArray(p.items) ? p.items : [];
  const fotos = Array.isArray(p.fotos) ? p.fotos : [];

  const aplicar = (actual, siguiente) =>
    typeof siguiente === "function" ? siguiente(actual) : siguiente;
  const setItems = (siguiente) => set("items", aplicar(items, siguiente));
  const setFotos = (siguiente) => set("fotos", aplicar(fotos, siguiente));

  const [rotandoId, setRotandoId] = useState(null);
  const [fotoModal, setFotoModal] = useState(null);
  const [zoomModal, setZoomModal] = useState(false);

  const rotarFoto = async (fId) => {
    const foto = fotos.find((item) => item.id === fId);
    if (!foto || !foto.src) return;
    setRotandoId(fId);
    try {
      const nuevoSrc = await rotarImagen90(foto.src, 90);
      setFotos((prev) =>
        prev.map((item) => (item.id === fId ? { ...item, src: nuevoSrc } : item))
      );
      setFotoModal((prev) => (prev && prev.id === fId ? { ...prev, src: nuevoSrc } : prev));
    } catch (err) {
      console.error("Error al rotar imagen:", err);
    } finally {
      setRotandoId(null);
    }
  };

  const moverFoto = (index, direccion) => {
    const nuevoIndex = index + direccion;
    if (nuevoIndex < 0 || nuevoIndex >= fotos.length) return;
    const nuevasFotos = [...fotos];
    const temp = nuevasFotos[index];
    nuevasFotos[index] = nuevasFotos[nuevoIndex];
    nuevasFotos[nuevoIndex] = temp;
    setFotos(nuevasFotos);
  };

  // Se calcula sobre la lista que llega al actualizador, no sobre la del
  // render: dos clics seguidos en el catalogo se resolvian con la misma lista
  // y salia el mismo id dos veces, asi que una de las dos lineas se perdia.
  const siguienteId = (lista) =>
    (Array.isArray(lista) ? lista : []).reduce((max, item) => Math.max(max, Number(item?.id) || 0), 0) + 1;

  const medicionActiva = Boolean(p.medicionAutomatica);
  // La imagen del mapa ya no se pide a Google: se compone al medir y se guarda
  // con la propuesta. Aqui solo se lee lo guardado.
  const autoMapImg = p.mapImg || "";

  // Rehace la imagen del mapa cada vez que cambian los tramos o el encuadre.
  // Va junto con el dato en un mismo cambio para que no se pisen entre ellos.
  const guardarConMapa = async (patch, mediciones, vista)=>{
    onChange(patch);
    if (!mediciones || mediciones.length === 0) {
      onChange({ ...patch, mapImg: null });
      return;
    }
    try{
      const img = await imagenDelMapa(
        mediciones,
        vista,
        cl.coords || `${cl.obra || ""} ${cl.ciudad || ""}`.trim(),
      );
      if(img) onChange({mapImg:img});
    }catch(e){
      // Sin imagen se sigue trabajando: los metros medidos, que es lo que se
      // cobra, ya quedaron guardados.
      console.error("No se pudo componer la imagen del mapa:",e);
    }
  };

  const sinAiu = Boolean(p.sinAiu);
  const sub = items.reduce((s, item) => s + (Number(item.cant) || 0) * (Number(item.vu) || 0), 0);
  const ut = sinAiu ? 0 : (sub * (Number(p.util) || 0)) / 100;
  const iva = sinAiu ? (sub * 0.19) : (ut * 0.19);
  const tot = sub + ut + iva;

  return (
    <div style={{ background: "var(--surface, #fff)", border: "1px solid var(--border, #e2e8f0)", borderRadius: 12, padding: 20, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 12, borderBottom: "1px solid var(--border, #eaecf0)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: "#B54708",
            background: "#FFFAEB",
            border: "1px solid rgba(181, 71, 8, 0.25)",
            borderRadius: 6,
            padding: "2px 8px",
            letterSpacing: ".04em",
          }}>
            Propuesta {indice + 1} de {totalPropuestas}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #101828)" }}>
            {p.tipoCotizacion === "linea_vida" ? "Línea de vida" : p.tipoCotizacion === "puntos_anclaje" ? "Puntos de anclaje" : p.tipoCotizacion === "obra_blanca" ? "Obra blanca" : p.tipoCotizacion === "estructuras_metalicas" ? "Estructuras metálicas" : `Propuesta ${indice + 1}`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-main, #101828)", fontVariantNumeric: "tabular-nums" }}>{fmt(tot)}</div>
          {totalPropuestas > 1 && (
            <button
              type="button"
              title="Eliminar propuesta"
              onClick={onEliminar}
              style={{
                background: "transparent",
                border: "1px solid var(--border, #eaecf0)",
                color: "#98a2b3",
                borderRadius: 6,
                width: 26,
                height: 26,
                cursor: "pointer",
                fontSize: 16,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1,
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#d92d20"; e.currentTarget.style.background = "#fee2e2"; }}
              onMouseLeave={e => { e.currentTarget.style.color = "#98a2b3"; e.currentTarget.style.background = "transparent"; }}
            >×</button>
          )}
        </div>
      </div>

        {/* 1. Tipo de trabajo / propuesta */}
        <div style={{ marginBottom: 18 }}>
          <LBL>Tipo de trabajo / sistema</LBL>
          <div style={{ display: "flex", gap: 8, maxWidth: 720, flexWrap: "wrap" }}>
            {[
              ["linea_vida", "Línea de vida"],
              ["puntos_anclaje", "Puntos de anclaje"],
              ["obra_blanca", "Obra blanca"],
              ["estructuras_metalicas", "Estructuras metálicas"],
            ].map(([v, l]) => {
              const activo = p.tipoCotizacion === v;
              return (
                <button
                  key={v}
                  type="button"
                  onClick={() => set("tipoCotizacion", v)}
                  style={{
                    flex: "1 1 140px",
                    justifyContent: "center",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "7px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: activo ? 700 : 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s ease-in-out",
                    background: activo ? "#FFFAEB" : "var(--surface-subtle, #f2f4f7)",
                    color: activo ? "#B54708" : "var(--text-muted, #475467)",
                    border: activo ? "1px solid rgba(181, 71, 8, 0.35)" : "1px solid var(--border, #eaecf0)",
                    boxShadow: activo ? "0 1px 3px rgba(181, 71, 8, 0.08)" : "none",
                  }}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Se quitó de la pantalla la «descripción de la propuesta»: lo que ya
            esté escrito se sigue imprimiendo, lo que ya no se hace es
            escribirla a mano desde aquí. El «esta cotización incluye» sí volvió,
            más abajo, junto a las condiciones comerciales. */}

        {(p.tipoCotizacion === "obra_blanca" || p.tipoCotizacion === "estructuras_metalicas") && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <LBL>{p.tipoCotizacion === "estructuras_metalicas" ? "Especificaciones / Necesidad del cliente" : "Necesidad del cliente"}</LBL>
              <div style={{ display: "flex", gap: 6 }}>
                <BotonCorregir valor={p.requerimientoCliente} onChange={v => set("requerimientoCliente", v)} compacto />
                <BotonDictado valor={p.requerimientoCliente} onChange={v => set("requerimientoCliente", v)} titulo="Dictar la necesidad del cliente" compacto />
              </div>
            </div>
            <textarea
              value={p.requerimientoCliente}
              onChange={e => set("requerimientoCliente", e.target.value)}
              onBlur={e => {
                const v = normalizarFrase(e.target.value);
                if (v !== p.requerimientoCliente) set("requerimientoCliente", v);
              }}
              spellCheck
              lang="es"
              placeholder={p.tipoCotizacion === "estructuras_metalicas" ? "Detalla especificaciones técnicas de la estructura, perfilería, accesos o plataformas requeridas..." : "Detalla la necesidad o solicitud específica del cliente..."}
              style={{ ...SI, minHeight: 100, resize: "vertical", lineHeight: 1.5 }}
            />
          </div>
        )}

        {/* 3. Fotos */}
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:600,color:"var(--text-main, #1a1a2e)"}}>Fotos de la propuesta</span>
            <span style={{fontSize:10,color:"var(--text-subtle, #94a3b8)"}}>Se imprimen en el PDF</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:12}}>
            {fotos.map((f, i) => (
              <div
                key={f.id}
                style={{
                  borderRadius: 10,
                  overflow: "hidden",
                  border: "1px solid var(--border, #e2e8f0)",
                  background: "var(--surface, #ffffff)",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {/* Visualizador de la foto adaptable, sin barras negras oscuras y con clic para pantalla completa */}
                <div
                  onClick={() => {
                    setFotoModal({ id: f.id, src: f.src, label: f.label, index: i });
                    setZoomModal(false);
                  }}
                  title="Clic para ver en pantalla completa a máxima resolución"
                  style={{
                    position: "relative",
                    background: "var(--surface-subtle, #f8fafc)",
                    height: 240,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    cursor: "zoom-in",
                    borderBottom: "1px solid var(--border, #eaecf0)",
                  }}
                >
                  <img
                    src={f.src}
                    alt={f.label || `Foto ${i + 1}`}
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      display: "block",
                      opacity: rotandoId === f.id ? 0.4 : 1,
                      transition: "opacity 0.2s ease",
                    }}
                  />

                  {/* Número de foto */}
                  <span
                    style={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      background: "rgba(15, 23, 42, 0.75)",
                      color: "#fff",
                      fontSize: 10.5,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 5,
                      backdropFilter: "blur(4px)",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                  >
                    Foto {i + 1}
                  </span>

                  {/* Botón de rotación 90° rápido */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      rotarFoto(f.id);
                    }}
                    disabled={rotandoId === f.id}
                    title="Rotar 90° en sentido horario (alinea la orientación real de la foto para el PDF)"
                    style={{
                      position: "absolute",
                      top: 8,
                      right: 8,
                      background: "rgba(15, 23, 42, 0.8)",
                      color: "#fff",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: 6,
                      padding: "4px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: rotandoId === f.id ? "wait" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                      zIndex: 2,
                    }}
                  >
                    <span>{rotandoId === f.id ? "⏳" : "🔄"}</span>
                    <span style={{ fontSize: 10 }}>Rotar 90°</span>
                  </button>

                  {/* Indicador de clic para ampliar */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      background: "rgba(15, 23, 42, 0.75)",
                      color: "#fff",
                      fontSize: 10.5,
                      fontWeight: 600,
                      padding: "3px 8px",
                      borderRadius: 5,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                      pointerEvents: "none",
                    }}
                  >
                    <span>🔍 Ver completa</span>
                  </div>
                </div>

                {/* Barra inferior con reordenamiento, pie de foto y eliminar */}
                <div style={{ padding: "8px 10px", display: "flex", gap: 6, alignItems: "center", background: "var(--surface, #fff)" }}>
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moverFoto(i, -1)}
                    title="Mover foto a la izquierda"
                    style={{
                      background: "var(--surface-subtle, #f1f5f9)",
                      border: "1px solid var(--border, #cbd5e1)",
                      color: i === 0 ? "#cbd5e1" : "#475569",
                      borderRadius: 5,
                      width: 24,
                      height: 24,
                      cursor: i === 0 ? "default" : "pointer",
                      fontSize: 11,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ◀
                  </button>
                  <button
                    type="button"
                    disabled={i === fotos.length - 1}
                    onClick={() => moverFoto(i, 1)}
                    title="Mover foto a la derecha"
                    style={{
                      background: "var(--surface-subtle, #f1f5f9)",
                      border: "1px solid var(--border, #cbd5e1)",
                      color: i === fotos.length - 1 ? "#cbd5e1" : "#475569",
                      borderRadius: 5,
                      width: 24,
                      height: 24,
                      cursor: i === fotos.length - 1 ? "default" : "pointer",
                      fontSize: 11,
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    ▶
                  </button>

                  <input
                    value={f.label || ""}
                    onChange={(e) =>
                      setFotos((prev) =>
                        prev.map((item) => (item.id === f.id ? { ...item, label: e.target.value } : item))
                      )
                    }
                    placeholder={`Pie de foto ${i + 1} (ej. Cubierta Norte)`}
                    style={{ ...SI, fontSize: 11.5, padding: "4px 7px", flex: 1 }}
                  />

                  <button
                    type="button"
                    onClick={() => setFotos((prev) => prev.filter((item) => item.id !== f.id))}
                    title="Eliminar foto"
                    style={{
                      background: "#fee2e2",
                      border: "none",
                      color: "#ef4444",
                      borderRadius: 6,
                      width: 24,
                      height: 24,
                      cursor: "pointer",
                      fontSize: 14,
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            <div
              onClick={() => fotosRef.current.click()}
              style={{
                border: "2px dashed #f47c20",
                borderRadius: 10,
                height: 240,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                background: "var(--c-acento-suave, #fff8f3)",
                color: "#f47c20",
                fontWeight: 600,
                gap: 8,
                transition: "all 0.15s ease",
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1 }}>+</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>Agregar foto</span>
              <span style={{ fontSize: 11, color: "var(--text-muted, #94a3b8)", fontWeight: 500 }}>
                Formatos JPG, PNG, WEBP
              </span>
            </div>
          </div>
          {/* Carga de fotos con alta resolución optimizada para documentos y fotos de obra */}
          <input ref={fotosRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={async(e)=>{
            const archivos=Array.from(e.target.files||[]);
            e.target.value="";
            for(const file of archivos){
              const src=await leerImagenComprimida(file, { ladoMax: 2400, calidad: 0.90 });
              setFotos(prev=>[...prev,{id:Date.now()+Math.random(),src,label:""}]);
            }
          }}/>
        </div>

        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:12,fontWeight:600,color:"var(--text-main, #1a1a2e)"}}>Medición sobre foto satelital</span>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button
                type="button"
                onClick={() => {
                  if (medicionActiva) {
                    if (autoMapImg && window.confirm("¿Deseas también quitar la foto satelital de la cotización para que no aparezca en el PDF?")) {
                      onChange({ medicionAutomatica: false, mapImg: null });
                      return;
                    }
                    set("medicionAutomatica", false);
                  } else {
                    set("medicionAutomatica", true);
                  }
                }}
                style={{
                  background: medicionActiva ? "#ECFDF3" : "var(--surface-subtle, #f2f4f7)",
                  color: medicionActiva ? "#027A48" : "var(--text-main, #101828)",
                  border: medicionActiva ? "1px solid rgba(2, 122, 72, 0.25)" : "1px solid var(--border, #eaecf0)",
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "5px 12px",
                  cursor: "pointer",
                }}
              >
                {medicionActiva ? "Desactivar medición" : "Activar medición"}
              </button>
              {autoMapImg && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("¿Quitar la imagen satelital de esta propuesta? Ya no se imprimirá en el PDF ni en la cotización.")) {
                        onChange({ mapImg: null });
                      }
                    }}
                    title="Quitar la imagen satelital para que no aparezca en la cotización"
                    style={{
                      background: "#fee2e2",
                      color: "#b42318",
                      border: "1px solid #fecdca",
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: "5px 12px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    🗑️ Quitar imagen satelital
                  </button>
                  <button
                    type="button"
                    onClick={()=>setFotos((prev)=>[...prev,{id:Date.now()+Math.random(),src:autoMapImg,label:"Mapa satelital"}])}
                    style={{
                      background: "#FFFAEB",
                      color: "#B54708",
                      border: "1px solid rgba(181, 71, 8, 0.25)",
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 600,
                      padding: "5px 12px",
                      cursor: "pointer",
                    }}
                  >
                    Agregar mapa como foto
                  </button>
                </>
              )}
            </div>
          </div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>
            El mapa y los tramos medidos pertenecen solo a esta propuesta.
          </div>

          {/* Tarjeta de imagen satelital guardada con opción directa para quitarla */}
          {autoMapImg && (
            <div style={{
              background: "var(--surface-subtle, #f8fafc)",
              border: "1px solid var(--border, #e2e8f0)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img
                  src={autoMapImg}
                  alt="Medición satelital"
                  style={{
                    width: 76,
                    height: 54,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                  }}
                />
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main, #0f172a)", display: "flex", alignItems: "center", gap: 6 }}>
                    <span>Foto satelital adjunta</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, background: "#ecfdf5", color: "#047857", padding: "1px 6px", borderRadius: 4, border: "1px solid #a7f3d0" }}>
                      En el PDF
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted, #64748b)", marginTop: 2 }}>
                    Esta imagen se imprime en la cotización bajo «Medición satelital».
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("¿Quitar la imagen satelital de esta propuesta? Ya no se imprimirá en el PDF ni en la cotización.")) {
                    onChange({ mapImg: null });
                  }
                }}
                style={{
                  background: "#fee2e2",
                  color: "#b42318",
                  border: "1px solid #fecdca",
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 700,
                  padding: "6px 14px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>🗑️</span>
                <span>Quitar imagen satelital</span>
              </button>
            </div>
          )}
          {medicionActiva && !mapaHabilitado ? (
            <div style={{background:"var(--surface-subtle, #f8fafc)",border:"1px dashed var(--border, #cbd5e1)",borderRadius:12,padding:"18px 16px",fontSize:12,color:"var(--text-muted, #64748b)",textAlign:"center"}}>
              Esta propuesta tiene medición activada.{" "}
              <button
                type="button"
                onClick={onPedirMapa}
                style={{
                  background: "var(--surface-subtle, #f2f4f7)",
                  color: "var(--text-main, #101828)",
                  border: "1px solid var(--border, #eaecf0)",
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "4px 12px",
                  marginLeft: 6,
                  cursor: "pointer",
                }}
              >
                Abrir su mapa
              </button>
              <div style={{marginTop:6,fontSize:10.5,color:"var(--text-subtle, #94a3b8)"}}>Se muestra un mapa a la vez para no cargar la pantalla.</div>
            </div>
          ) : medicionActiva ? (
            <div style={{background:"var(--surface-subtle, #f8fafc)",border:"1px solid var(--border, #e2e8f0)",borderRadius:12,padding:14}}>
              <MedidorMapa
                queryValue={cl.coords||`${cl.obra||""} ${cl.ciudad||""}`.trim()}
                onQueryChange={(value)=>setCl({...cl,coords:value})}
                measurements={p.geoMediciones}
                onChange={(v)=>guardarConMapa({geoMediciones:v}, v, p.geoMapView)}
                mapView={p.geoMapView}
                onMapViewChange={(v)=>guardarConMapa({geoMapView:v}, p.geoMediciones, v)}
              />
            </div>
          ) : (
            <div style={{background:"var(--surface-subtle, #f8fafc)",border:"1px dashed var(--border, #cbd5e1)",borderRadius:12,padding:"18px 16px",fontSize:12,color:"var(--text-muted, #64748b)",textAlign:"center"}}>
              Activa la medición si esta propuesta necesita mapa satelital o tramos medidos sobre el terreno.
            </div>
          )}
        </div>

        {/* 4. Detalle económico */}
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:600,color:"var(--text-main, #1a1a2e)"}}>Detalle económico</span>
            <div style={{display:"flex",gap:8}}>
              {p.items.length > 0 && (
                <button
                  type="button"
                  title="Corrige automáticamente la ortografía y tildes de todas las descripciones de los ítems de esta propuesta"
                  onClick={() => {
                    setItems(prev => prev.map(item => ({
                      ...item,
                      desc: corregirOrtografiaLocal(item.desc || "").toUpperCase(),
                    })));
                  }}
                  style={{
                    background: "var(--surface-subtle, #f2f4f7)",
                    color: "var(--text-main, #101828)",
                    border: "1px solid var(--border, #eaecf0)",
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 600,
                    padding: "5px 12px",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span>✨</span>
                  <span>Corregir ortografía</span>
                </button>
              )}
              <button
                onClick={()=>{const nuevos=measurementsToQuoteItems(p.geoMediciones);setItems(nuevos.map((item,index)=>({...item,id:index+1})));}}
                style={{
                  background: "var(--surface-subtle, #f2f4f7)",
                  color: "var(--text-main, #101828)",
                  border: "1px solid var(--border, #eaecf0)",
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "5px 12px",
                  cursor: "pointer",
                }}
              >
                Jalar mediciones
              </button>
              <button
                onClick={()=>setShowDB(!showDB)}
                style={{
                  background: showDB ? "#FFFAEB" : "var(--surface-subtle, #f2f4f7)",
                  color: showDB ? "#B54708" : "var(--text-muted, #475467)",
                  border: showDB ? "1px solid rgba(181, 71, 8, 0.35)" : "1px solid var(--border, #eaecf0)",
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "5px 12px",
                  cursor: "pointer",
                }}
              >
                {showDB ? "Cerrar catálogo" : "Catálogo"}
              </button>
            </div>
          </div>

          {showDB&&(
            <div style={{background:"var(--surface-subtle, #f8fafc)",borderRadius:10,padding:16,marginBottom:14,border:"1px solid var(--border, #eaecf0)"}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>
                {catalogo.map((cat,i)=>(
                  <button
                    key={i}
                    onClick={()=>setDbCat(i)}
                    style={{
                      background: dbCat === i ? "#FFFAEB" : "var(--surface, #ffffff)",
                      color: dbCat === i ? "#B54708" : "var(--text-muted, #475467)",
                      border: dbCat === i ? "1px solid rgba(181, 71, 8, 0.35)" : "1px solid var(--border, #eaecf0)",
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: dbCat === i ? 700 : 600,
                      padding: "5px 12px",
                      cursor: "pointer",
                    }}
                  >
                    {cat.categoria}
                  </button>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {(categoria.items||[]).map((it,i)=>(
                  <div key={i} style={{background:"var(--surface, #ffffff)",border:"1px solid var(--border, #eaecf0)",borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:"var(--text-main, #1a1a2e)",marginBottom:2}}>{it.desc}</div>
                      <div style={{fontSize:11,color:"var(--text-muted, #475569)"}}>{it.unit} · {fmt(it.vu)}</div>
                    </div>
                    <button
                      onClick={()=>{setItems(prev=>[...prev,{id:siguienteId(prev),desc:it.desc,cant:1,unit:it.unit,vu:it.vu}]);}}
                      style={{
                        background: "#FFFAEB",
                        color: "#B54708",
                        border: "1px solid rgba(181, 71, 8, 0.3)",
                        borderRadius: 6,
                        padding: "4px 10px",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tabla de ítems con Data-Grid corporativo */}
          <div className="tabla-items" style={{ border: "1px solid var(--border, #eaecf0)", borderRadius: 12, overflow: "hidden", marginBottom: 12, background: "var(--surface, #ffffff)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "3fr 0.65fr 0.75fr 1.1fr 1.1fr 32px", background: "var(--surface-subtle, #f8fafc)", color: "var(--text-muted, #475467)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", padding: "10px 12px", letterSpacing: ".05em", borderBottom: "1px solid var(--border, #eaecf0)" }}>
              <span>Descripción</span><span>Cant.</span><span>Unidad</span><span>Valor unit.</span><span style={{ textAlign: "right" }}>Subtotal</span><span />
            </div>
            {p.items.map((it, idx) => (
              <div key={it.id} style={{ display: "grid", gridTemplateColumns: "3fr 0.65fr 0.75fr 1.1fr 1.1fr 32px", alignItems: "center", padding: "6px 10px", background: idx % 2 === 0 ? "var(--surface, #ffffff)" : "var(--surface-subtle, #fafbfd)", borderTop: "1px solid var(--border, #f2f4f7)" }}>
                <input
                  value={it.desc}
                  onChange={e => setItems(prev => prev.map(item => item.id === it.id ? { ...item, desc: e.target.value.toUpperCase() } : item))}
                  onPaste={e => {
                    const textoPegado = e.clipboardData?.getData("text");
                    if (textoPegado) {
                      e.preventDefault();
                      const corregido = corregirOrtografiaLocal(textoPegado).toUpperCase();
                      const input = e.target;
                      const start = input.selectionStart ?? 0;
                      const end = input.selectionEnd ?? 0;
                      const actual = input.value || "";
                      const nuevo = actual.slice(0, start) + corregido + actual.slice(end);
                      const finalCorregido = corregirOrtografiaLocal(nuevo).toUpperCase();
                      setItems(prev => prev.map(item => item.id === it.id ? { ...item, desc: finalCorregido } : item));
                    }
                  }}
                  onBlur={e => {
                    const auto = corregirOrtografiaLocal(e.target.value).toUpperCase();
                    if (auto !== it.desc) {
                      setItems(prev => prev.map(item => item.id === it.id ? { ...item, desc: auto } : item));
                    }
                  }}
                  placeholder="DESCRIPCIÓN DEL ÍTEM"
                  title="Descripción del ítem (se corrige ortografía y tildes automáticamente)"
                  style={{ ...SI, fontSize: 12, padding: "5px 8px", textTransform: "uppercase" }}
                />
                <input
                  type="number"
                  value={it.cant}
                  onChange={e => setItems(prev => prev.map(item => item.id === it.id ? { ...item, cant: parseFloat(e.target.value) || 0 } : item))}
                  style={{ ...SI, fontSize: 12, padding: "5px 8px", textAlign: "center" }}
                />
                <input
                  value={it.unit}
                  onChange={e => setItems(prev => prev.map(item => item.id === it.id ? { ...item, unit: e.target.value.toUpperCase() } : item))}
                  onBlur={e => {
                    const u = e.target.value.trim().toUpperCase();
                    const unNorm = u === "UN" || u === "UNIDAD" || u === "UNIDADES" ? "UND" : u === "METRO" || u === "METROS" ? "ML" : u;
                    if (unNorm !== it.unit) {
                      setItems(prev => prev.map(item => item.id === it.id ? { ...item, unit: unNorm } : item));
                    }
                  }}
                  placeholder="UN"
                  style={{ ...SI, fontSize: 12, padding: "5px 8px", textAlign: "center", textTransform: "uppercase" }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  value={Number(it.vu) ? Number(it.vu).toLocaleString("es-CO") : ""}
                  onChange={e => {
                    const digitos = e.target.value.replace(/\D/g, "");
                    const valor = digitos ? parseInt(digitos, 10) : 0;
                    setItems(prev => prev.map(item => item.id === it.id ? { ...item, vu: valor } : item));
                  }}
                  placeholder="0"
                  style={{ ...SI, fontSize: 12, padding: "5px 8px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}
                />
                <div style={{ textAlign: "right", fontSize: 12.5, fontWeight: 700, color: "var(--text-main, #101828)", paddingRight: 6, fontVariantNumeric: "tabular-nums" }}>
                  {fmt(it.cant * it.vu)}
                </div>
                <button
                  type="button"
                  title="Quitar ítem"
                  onClick={() => setItems(prev => prev.filter(item => item.id !== it.id))}
                  style={{ background: "transparent", border: "none", color: "#98a2b3", cursor: "pointer", fontSize: 16, padding: 2, lineHeight: 1, borderRadius: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.color = "#d92d20"; }}
                  onMouseLeave={e => { e.currentTarget.style.color = "#98a2b3"; }}
                >×</button>
              </div>
            ))}
            {p.items.length === 0 && (
              <div style={{ padding: "22px 14px", textAlign: "center", fontSize: 12.5, color: "var(--text-subtle, #98a2b3)" }}>
                Sin ítems en esta propuesta — agrega ítems desde el catálogo o agrega una línea manual abajo.
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => { setItems(prev => [...prev, { id: siguienteId(prev), desc: "", cant: 1, unit: "ML", vu: 0 }]); }}
            style={{ ...B("var(--surface-subtle, #f8fafc)", "var(--text-main, #101828)"), border: "1px dashed var(--border, #cbd5e1)", width: "100%", justifyContent: "center", marginBottom: 16, fontSize: 12.5 }}
          >
            + Agregar ítem manual
          </button>

          {/* Selector de Régimen AIU / IVA Pleno */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 14,
            padding: "12px 16px",
            background: "var(--surface-subtle, #f8fafc)",
            border: "1px solid var(--border, #eaecf0)",
            borderRadius: 12,
          }}>
            <div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-main, #101828)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>Régimen Tributario:</span>
                <span style={{
                  fontSize: 11,
                  padding: "2px 8px",
                  borderRadius: 6,
                  fontWeight: 600,
                  background: sinAiu ? "rgba(18, 183, 106, 0.12)" : "rgba(224, 52, 42, 0.08)",
                  color: sinAiu ? "#027a48" : "#E0342A",
                }}>
                  {sinAiu ? "IVA Pleno (19%)" : "Con AIU (IVA s/ Utilidad)"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted, #667085)", marginTop: 2 }}>
                {sinAiu
                  ? "El IVA 19% se calcula sobre el subtotal directo. No incluye discriminación de AIU."
                  : "Esquema estándar de obra civil: Administración, Imprevistos y Utilidad (IVA 19% sobre Utilidad)."}
              </div>
            </div>

            <div style={{ display: "inline-flex", background: "var(--surface, #ffffff)", border: "1px solid var(--border, #eaecf0)", borderRadius: 8, padding: 2 }}>
              <button
                type="button"
                onClick={() => set("sinAiu", false)}
                style={{
                  ...B(!sinAiu ? "#101828" : "transparent", !sinAiu ? "#ffffff" : "var(--text-muted, #667085)"),
                  border: "none",
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Con AIU
              </button>
              <button
                type="button"
                onClick={() => set("sinAiu", true)}
                style={{
                  ...B(sinAiu ? "#027a48" : "transparent", sinAiu ? "#ffffff" : "var(--text-muted, #667085)"),
                  border: "none",
                  fontSize: 11.5,
                  fontWeight: 600,
                  padding: "6px 14px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Sin AIU (IVA 19%)
              </button>
            </div>
          </div>

          {/* Tabla de totales */}
          <div style={{ border: "1px solid var(--border, #eaecf0)", borderRadius: 12, overflow: "hidden", background: "var(--surface, #ffffff)" }}>
            {(sinAiu
              ? [["Subtotal", sub], ["IVA (19%)", iva]]
              : [["Subtotal", sub], ["Administración", 0], ["Imprevistos", 0], ["Utilidad (" + p.util + "%)", ut], ["IVA sobre Utilidad (19%)", iva]]
            ).map(([lbl, v]) => (
              <div key={lbl} style={{ display: "flex", justifyContent: "space-between", padding: "8px 16px", borderBottom: "1px solid var(--border, #f2f4f7)", fontSize: 12.5, color: "var(--text-muted, #475467)" }}>
                <span>{lbl}</span><span style={{ fontWeight: 600, color: "var(--text-main, #101828)", fontVariantNumeric: "tabular-nums" }}>{v ? fmt(v) : "$ 0"}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "var(--surface-subtle, #f8fafc)", borderTop: "2px solid var(--border, #eaecf0)" }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-main, #101828)", letterSpacing: ".04em" }}>TOTAL PROPUESTA</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: "#E0342A", fontVariantNumeric: "tabular-nums" }}>{fmt(tot)}</span>
            </div>
            <div style={{
              padding: "6px 14px",
              fontSize: 10.5,
              color: sinAiu ? "#027a48" : "var(--text-muted, #667085)",
              textAlign: "center",
              background: sinAiu ? "rgba(18, 183, 106, 0.06)" : "var(--surface-subtle, #f8fafc)",
              fontWeight: 500,
              borderTop: "1px solid var(--border, #f2f4f7)",
            }}>
              {sinAiu ? "IVA Pleno (19%) calculado sobre el subtotal" : "IVA (19%) calculado exclusivamente sobre la utilidad"}
            </div>
          </div>

          {!sinAiu ? (
            <div style={{marginTop:12,display:"grid",gridTemplateColumns:"120px 1fr",gap:12,alignItems:"end"}}>
              <div><LBL>Utilidad %</LBL><input type="number" value={p.util} onChange={e=>set("util", Number(e.target.value))} style={SI}/></div>
              <div style={{fontSize:11,color:"var(--text-muted, #64748b)",paddingBottom:10}}>Ajusta el porcentaje de utilidad para recalcular el total</div>
            </div>
          ) : (
            <div style={{marginTop:10,padding:"8px 12px",background:"var(--surface-subtle, #f8fafc)",border:"1px dashed var(--border, #cbd5e1)",borderRadius:8,fontSize:11,color:"var(--text-muted, #64748b)"}}>
              ✓ Esta propuesta está configurada con <strong>IVA Pleno (19%)</strong>. No aplica porcentaje de utilidad ni saldrá ningún campo de AIU en la impresión del documento.
            </div>
          )}
        </div>

        {/* 5. Condiciones comerciales. Son datos de la propuesta, pero en el
            documento se imprimen en el cierre; se avisa para que no confunda. */}
        <div style={{paddingTop:12,borderTop:"1px solid var(--border, #f1f5f9)",marginTop:4}}>
          <div style={{fontSize:11,fontWeight:700,color:"var(--text-main, #1a1a2e)",marginBottom:2}}>Condiciones comerciales</div>
          <div style={{fontSize:10.5,color:"var(--text-subtle, #94a3b8)",marginBottom:10}}>Pertenecen a esta propuesta, pero en el documento salen al final, en el cierre.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div>
            <LBL>Forma de pago</LBL>
            <input
              value={p.formaPago}
              onChange={e=>set("formaPago", e.target.value)}
              onBlur={e=>{
                const auto = corregirOrtografiaLocal(e.target.value);
                if(auto !== e.target.value) set("formaPago", auto);
              }}
              style={SI}
            />
          </div>
          <div>
            <LBL>Tiempo de ejecución</LBL>
            <input
              value={p.tiempoEjec}
              onChange={e=>set("tiempoEjec", e.target.value)}
              onBlur={e=>{
                const auto = corregirOrtografiaLocal(e.target.value);
                if(auto !== e.target.value) set("tiempoEjec", auto);
              }}
              style={SI}
            />
          </div>
        </div>

        {/* 6. Esta cotización incluye */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <LBL>Esta cotización incluye</LBL>
              <span style={{ fontSize: 10.5, color: "var(--text-subtle, #94a3b8)" }}>
                Un renglón por cada viñeta en el documento oficial
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => set("incluyeTexto", DEFAULT_COT_INCLUYE)}
                style={{
                  ...B("var(--surface-subtle, #f2f4f7)", "var(--text-muted, #475467)"),
                  border: "1px solid var(--border, #eaecf0)",
                  fontSize: 10.5,
                  padding: "4px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
                title="Rellena con el texto estándar oficial de la empresa"
              >
                ↺ Texto estándar
              </button>
              <BotonCorregir valor={p.incluyeTexto !== undefined && p.incluyeTexto !== null ? p.incluyeTexto : DEFAULT_COT_INCLUYE} onChange={v => set("incluyeTexto", v)} compacto />
              <BotonDictado valor={p.incluyeTexto !== undefined && p.incluyeTexto !== null ? p.incluyeTexto : DEFAULT_COT_INCLUYE} onChange={v => set("incluyeTexto", v)} titulo="Dictar lo que incluye la cotización" compacto />
            </div>
          </div>
          <textarea
            value={p.incluyeTexto !== undefined && p.incluyeTexto !== null ? p.incluyeTexto : DEFAULT_COT_INCLUYE}
            onChange={(e) => set("incluyeTexto", e.target.value)}
            placeholder="Escribe cada elemento que incluye la cotización (un renglón por viñeta)..."
            spellCheck
            lang="es"
            rows={7}
            style={{
              ...SI,
              minHeight: 130,
              resize: "vertical",
              lineHeight: 1.6,
              fontSize: 12,
              fontFamily: "inherit",
              whiteSpace: "pre-wrap",
            }}
          />
          <div style={{ fontSize: 10.5, color: "var(--text-subtle, #94a3b8)", marginTop: 4 }}>
            Cada línea escrita aquí sale como una viñeta con guion en la sección «ESTA COTIZACIÓN INCLUYE» al final de la cotización y en el PDF oficial.
          </div>
        </div>

      {/* Modal / Lightbox de visualización de fotos en alta resolución nativa */}
      {fotoModal && (() => {
        const idxActual = fotos.findIndex((f) => f.id === fotoModal.id);
        const fotoActual = (idxActual >= 0 ? fotos[idxActual] : null) || fotoModal;
        const total = fotos.length;

        const irAnterior = (e) => {
          e.stopPropagation();
          if (idxActual > 0) {
            setFotoModal({ ...fotos[idxActual - 1], index: idxActual - 1 });
            setZoomModal(false);
          }
        };

        const irSiguiente = (e) => {
          e.stopPropagation();
          if (idxActual >= 0 && idxActual < total - 1) {
            setFotoModal({ ...fotos[idxActual + 1], index: idxActual + 1 });
            setZoomModal(false);
          }
        };

        return (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setFotoModal(null)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999999,
              background: "rgba(15, 23, 42, 0.94)",
              backdropFilter: "blur(6px)",
              display: "flex",
              flexDirection: "column",
              userSelect: "none",
            }}
          >
            {/* Barra superior de control */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 20px",
                background: "rgba(15, 23, 42, 0.85)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
                gap: 12,
                flexWrap: "wrap",
                zIndex: 10,
              }}
            >
              {/* Información y pie de foto */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 200, flex: 1 }}>
                <span
                  style={{
                    background: "rgba(255, 255, 255, 0.15)",
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "4px 10px",
                    borderRadius: 6,
                    letterSpacing: "0.02em",
                  }}
                >
                  Foto {(idxActual >= 0 ? idxActual : 0) + 1} de {total}
                </span>
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.9)",
                    fontSize: 13,
                    fontWeight: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 420,
                  }}
                  title={fotoActual.label || "Sin pie de foto"}
                >
                  {fotoActual.label ? `«${fotoActual.label}»` : "(Sin pie de foto asignado)"}
                </span>
              </div>

              {/* Botones de navegación (si hay más de 1 foto) */}
              {total > 1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    disabled={idxActual <= 0}
                    onClick={irAnterior}
                    style={{
                      background: idxActual <= 0 ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.18)",
                      color: idxActual <= 0 ? "rgba(255, 255, 255, 0.3)" : "#fff",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: idxActual <= 0 ? "default" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    ◀ Anterior
                  </button>
                  <button
                    type="button"
                    disabled={idxActual >= total - 1}
                    onClick={irSiguiente}
                    style={{
                      background: idxActual >= total - 1 ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.18)",
                      color: idxActual >= total - 1 ? "rgba(255, 255, 255, 0.3)" : "#fff",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: 8,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: idxActual >= total - 1 ? "default" : "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    Siguiente ▶
                  </button>
                </div>
              )}

              {/* Acciones: Zoom 100%, Rotar, Cerrar */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setZoomModal((z) => !z)}
                  style={{
                    background: zoomModal ? "#f47c20" : "rgba(255, 255, 255, 0.18)",
                    color: "#fff",
                    border: "1px solid " + (zoomModal ? "#f47c20" : "rgba(255, 255, 255, 0.25)"),
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  title={zoomModal ? "Ajustar imagen a la pantalla" : "Ver en tamaño real 100% sin reducción de resolución"}
                >
                  <span>{zoomModal ? "🔍" : "🔎"}</span>
                  <span>{zoomModal ? "Ajustar a pantalla" : "Tamaño real (100%)"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => rotarFoto(fotoActual.id)}
                  disabled={rotandoId === fotoActual.id}
                  style={{
                    background: "rgba(255, 255, 255, 0.18)",
                    color: "#fff",
                    border: "1px solid rgba(255, 255, 255, 0.25)",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: rotandoId === fotoActual.id ? "wait" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                  title="Rotar foto 90° en sentido horario (actualiza también el documento)"
                >
                  <span>{rotandoId === fotoActual.id ? "⏳" : "🔄"}</span>
                  <span>Rotar 90°</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFotoModal(null)}
                  style={{
                    background: "#E0342A",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "6px 16px",
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  title="Cerrar visor"
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>

            {/* Área de visualización central de la foto */}
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: zoomModal ? "flex-start" : "center",
                justifyContent: zoomModal ? "flex-start" : "center",
                overflow: zoomModal ? "auto" : "hidden",
                padding: zoomModal ? 24 : 16,
                position: "relative",
              }}
            >
              <img
                src={fotoActual.src}
                alt={fotoActual.label || "Foto completa"}
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomModal((z) => !z);
                }}
                style={{
                  maxWidth: zoomModal ? "none" : "96vw",
                  maxHeight: zoomModal ? "none" : "80vh",
                  width: zoomModal ? "auto" : undefined,
                  height: zoomModal ? "auto" : undefined,
                  objectFit: "contain",
                  borderRadius: 6,
                  boxShadow: "0 12px 48px rgba(0, 0, 0, 0.6)",
                  cursor: zoomModal ? "zoom-out" : "zoom-in",
                  transition: zoomModal ? "none" : "transform 0.15s ease",
                  display: "block",
                  margin: zoomModal ? "auto" : undefined,
                }}
                title={zoomModal ? "Clic para ajustar a pantalla" : "Clic para ver en tamaño real 100%"}
              />
            </div>

            {/* Barra inferior de ayuda */}
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                padding: "8px 16px",
                background: "rgba(15, 23, 42, 0.85)",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: 11.5,
                color: "rgba(255, 255, 255, 0.7)",
                textAlign: "center",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <span>💡 <strong>Tip:</strong> Haz clic sobre la foto para alternar entre verla completa o verla en su <strong>resolución original (100%)</strong> para inspeccionar letras, planos o detalles.</span>
              <span style={{ opacity: 0.6 }}>|</span>
              <span>Usa <strong>Rotar 90°</strong> si la foto se subió de lado o invertida.</span>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
