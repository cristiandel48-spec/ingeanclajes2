import { useRef, useState } from "react";
import BotonDictado from "../../components/ui/BotonDictado";
import MedidorMapa from "../../components/maps/MedidorMapa";
import { imagenDelMapa } from "../../lib/mapaEstatico";
import LBL from "../../components/ui/LBL";
import BotonCorregir from "../../components/ui/BotonCorregir";
import { leerImagenComprimida } from "../../lib/imagenes";
import { normalizarFrase } from "../../lib/normalizarEntrada";
import { B, SI } from "../../styles/tokens";
import { DEFAULT_COT_INCLUYE, ITEMS_DB } from "../../data/seed";
import { measurementsToQuoteItems } from "../../lib/maps";
import { fmt } from "../../lib/format";

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
  const fotosRef = useRef();

  const set = (campo, valor) => onChange({ [campo]: valor });

  const items = Array.isArray(p.items) ? p.items : [];
  const fotos = Array.isArray(p.fotos) ? p.fotos : [];

  const aplicar = (actual, siguiente) =>
    typeof siguiente === "function" ? siguiente(actual) : siguiente;
  const setItems = (siguiente) => set("items", aplicar(items, siguiente));
  const setFotos = (siguiente) => set("fotos", aplicar(fotos, siguiente));

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

  const sub = items.reduce((s, item) => s + (Number(item.cant) || 0) * (Number(item.vu) || 0), 0);
  const ut = (sub * (Number(p.util) || 0)) / 100;
  const iva = ut * 0.19;
  const tot = sub + ut + iva;

  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, paddingBottom: 12, borderBottom: "2px solid #f47c20" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#f47c20", textTransform: "uppercase", letterSpacing: 1 }}>
            Propuesta {indice + 1} de {totalPropuestas}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1a1a2e", marginTop: 2 }}>
            {p.nombre || `Propuesta ${indice + 1}`}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#cc0000" }}>{fmt(tot)}</div>
          {totalPropuestas > 1 && (
            <button
              type="button"
              title="Eliminar propuesta"
              onClick={onEliminar}
              style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: 6, width: 26, height: 26, cursor: "pointer", fontSize: 15, lineHeight: 1 }}
            >×</button>
          )}
        </div>
      </div>

        {/* 1. Nombre y tipo */}
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:12,marginBottom:18}}>
          <div><LBL>Nombre de la propuesta</LBL><input value={p.nombre} onChange={e=>set("nombre", e.target.value)} style={SI}/></div>
          <div>
            <LBL>Tipo</LBL>
            <div style={{display:"flex",gap:8}}>
              {[["linea_vida","Línea de vida"],["puntos_anclaje","Puntos de anclaje"],["obra_blanca","Obra blanca"]].map(([v,l])=>(
                <button key={v} onClick={()=>set("tipoCotizacion", v)} style={{...B(p.tipoCotizacion===v?"#f47c20":"#142840",p.tipoCotizacion===v?"#fff":"#7da5c8"),flex:1,justifyContent:"center",border:"2px solid "+(p.tipoCotizacion===v?"#f47c20":"#1a3050"),fontSize:11,fontWeight:700,padding:"7px 4px"}}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Se quitó de la pantalla la «descripción de la propuesta»: lo que ya
            esté escrito se sigue imprimiendo, lo que ya no se hace es
            escribirla a mano desde aquí. El «esta cotización incluye» sí volvió,
            más abajo, junto a las condiciones comerciales. */}

        {p.tipoCotizacion==="obra_blanca"&&(
          <div style={{marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
              <LBL>Necesidad del cliente</LBL>
              <div style={{display:"flex",gap:6}}><BotonCorregir valor={p.requerimientoCliente} onChange={v=>set("requerimientoCliente", v)} compacto/><BotonDictado valor={p.requerimientoCliente} onChange={v=>set("requerimientoCliente", v)} titulo="Dictar la necesidad del cliente" compacto/></div>
            </div>
            <textarea value={p.requerimientoCliente} onChange={e=>set("requerimientoCliente", e.target.value)} onBlur={e=>{const v=normalizarFrase(e.target.value);if(v!==p.requerimientoCliente)set("requerimientoCliente", v);}} spellCheck lang="es" style={{...SI,minHeight:100,resize:"vertical",lineHeight:1.5}}/>
          </div>
        )}

        {/* 3. Fotos */}
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>Fotos de la propuesta</span>
            <span style={{fontSize:10,color:"#94a3b8"}}>Se imprimen en el PDF</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {fotos.map((f,i)=>(
              <div key={f.id} style={{borderRadius:8,overflow:"hidden",border:"1px solid #e2e8f0",background:"#f8fafc"}}>
                <div style={{background:"#fff",padding:6}}>
                  <img src={f.src} alt={f.label||`Foto ${i+1}`} style={{width:"100%",height:"auto",display:"block",borderRadius:4}}/>
                </div>
                <div style={{padding:"6px 8px",display:"flex",gap:4,alignItems:"center"}}>
                  <input value={f.label||""} onChange={e=>setFotos(prev=>prev.map(item=>item.id===f.id?{...item,label:e.target.value}:item))} placeholder={`Foto ${i+1}`} style={{...SI,fontSize:11,padding:"3px 6px",flex:1}}/>
                  <button onClick={()=>setFotos(prev=>prev.filter(item=>item.id!==f.id))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,width:22,height:22,cursor:"pointer",fontSize:14,flexShrink:0,lineHeight:1}}>×</button>
                </div>
              </div>
            ))}
            <div onClick={()=>fotosRef.current.click()} style={{border:"2px dashed #f47c20",borderRadius:10,minHeight:140,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"#fff8f3",color:"#f47c20",fontWeight:600,gap:6}}>
              <span style={{fontSize:24,lineHeight:1}}>+</span>
              <span style={{fontSize:12}}>Agregar foto</span>
            </div>
          </div>
          {/* Las fotos se reducen ANTES de guardarlas. Sin esto entraban tal
              como salen del celular -4 a 8 MB cada una en base64- y como la
              cotizacion viaja entera a la base en cada guardado, unas pocas
              fotos bastaban para tumbar la conexion. */}
          <input ref={fotosRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={async(e)=>{
            const archivos=Array.from(e.target.files||[]);
            e.target.value="";
            for(const file of archivos){
              const src=await leerImagenComprimida(file);
              setFotos(prev=>[...prev,{id:Date.now()+Math.random(),src,label:""}]);
            }
          }}/>
        </div>

        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>Medición sobre foto satelital</span>
            <div style={{display:"flex",gap:8}}>
              <button
                type="button"
                onClick={()=>set("medicionAutomatica", !medicionActiva)}
                style={{...B(medicionActiva?"#166534":"#dbeafe",medicionActiva?"#ecfdf5":"#1e40af"),fontSize:11,padding:"5px 12px",border:"1px solid " + (medicionActiva?"#166534":"#93c5fd")}}
              >
                {medicionActiva ? "Desactivar medición" : "Activar medición"}
              </button>
              {autoMapImg && (
                <button
                  type="button"
                  onClick={()=>setFotos((prev)=>[...prev,{id:Date.now()+Math.random(),src:autoMapImg,label:"Mapa satelital"}])}
                  style={{...B("#fff7ed","#c2410c"),fontSize:11,padding:"5px 12px",border:"1px solid #fdba74"}}
                >
                  Agregar mapa como foto
                </button>
              )}
            </div>
          </div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>
            El mapa y los tramos medidos pertenecen solo a esta propuesta.
          </div>
          {medicionActiva && !mapaHabilitado ? (
            <div style={{background:"#f8fafc",border:"1px dashed #cbd5e1",borderRadius:12,padding:"18px 16px",fontSize:12,color:"#64748b",textAlign:"center"}}>
              Esta propuesta tiene medición activada.{" "}
              <button type="button" onClick={onPedirMapa} style={{...B("#dbeafe","#1e40af"),fontSize:11,padding:"4px 12px",marginLeft:6}}>Abrir su mapa</button>
              <div style={{marginTop:6,fontSize:10.5,color:"#94a3b8"}}>Se muestra un mapa a la vez para no cargar la pantalla.</div>
            </div>
          ) : medicionActiva ? (
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:14}}>
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
            <div style={{background:"#f8fafc",border:"1px dashed #cbd5e1",borderRadius:12,padding:"18px 16px",fontSize:12,color:"#64748b",textAlign:"center"}}>
              Activa la medición si esta propuesta necesita mapa satelital o tramos medidos sobre el terreno.
            </div>
          )}
        </div>

        {/* 4. Detalle económico */}
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>Detalle económico</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{const nuevos=measurementsToQuoteItems(p.geoMediciones);setItems(nuevos.map((item,index)=>({...item,id:index+1})));}} style={{...B("#dbeafe","#1e40af"),fontSize:11,padding:"5px 12px"}}>Jalar mediciones</button>
              <button onClick={()=>setShowDB(!showDB)} style={{...B(showDB?"#1a3050":"transparent","#f47c20"),border:"1px solid #cc0000",fontSize:11,padding:"5px 12px"}}>{showDB?"Cerrar catálogo":"Catálogo"}</button>
            </div>
          </div>

          {showDB&&(
            <div style={{background:"#f8fafc",borderRadius:10,padding:16,marginBottom:14,border:"1px solid #f47c2044"}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{ITEMS_DB.map((cat,i)=><button key={i} onClick={()=>setDbCat(i)} style={{...B(dbCat===i?"#f47c20":"#142840",dbCat===i?"#fff":"#7da5c8"),border:`1px solid ${dbCat===i?"#f47c20":"#1a3050"}`,fontSize:11,padding:"5px 12px"}}>{cat.categoria}</button>)}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{ITEMS_DB[dbCat].items.map((it,i)=><div key={i} style={{background:"#f1f5f9",borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#1a1a2e",marginBottom:2}}>{it.desc}</div><div style={{fontSize:11,color:"#475569"}}>{it.unit} · {fmt(it.vu)}</div></div><button onClick={()=>{setItems(prev=>[...prev,{id:siguienteId(prev),desc:it.desc,cant:1,unit:it.unit,vu:it.vu}]);}} style={{...B("#f47c20"),padding:"5px 12px",fontSize:12,flexShrink:0}}>+</button></div>)}</div>
            </div>
          )}

          {/* Tabla de ítems. La clase "tabla-items" evita que en el celular se
              colapse a una columna: conserva sus columnas y se desplaza. */}
          <div className="tabla-items" style={{border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden",marginBottom:10}}>
            <div style={{display:"grid",gridTemplateColumns:"3fr 0.65fr 0.75fr 1.1fr 1.1fr 28px",background:"#1a2840",color:"#94a3b8",fontSize:10,textTransform:"uppercase",padding:"9px 12px",letterSpacing:0.5}}>
              <span>Descripción</span><span>Cant.</span><span>Unidad</span><span>Valor unit.</span><span style={{textAlign:"right"}}>Subtotal</span><span/>
            </div>
            {p.items.map((it,idx)=>(
              <div key={it.id} style={{display:"grid",gridTemplateColumns:"3fr 0.65fr 0.75fr 1.1fr 1.1fr 28px",alignItems:"center",padding:"5px 10px",background:idx%2===0?"#f8fafc":"#fff",borderTop:"1px solid #f1f5f9"}}>
                {/* La descripcion se guarda SIEMPRE en mayuscula, se escriba
                    o se pegue como se escriba: en la tabla del documento van
                    todas asi y una en minuscula canta. Se pasa al escribir
                    -no solo al mostrarla- para que quede tambien en la base. */}
                <input value={it.desc} onChange={e=>setItems(prev=>prev.map(item=>item.id===it.id?{...item,desc:e.target.value.toUpperCase()}:item))} style={{...SI,fontSize:12,padding:"5px 7px",textTransform:"uppercase"}}/>
                <input type="number" value={it.cant} onChange={e=>setItems(prev=>prev.map(item=>item.id===it.id?{...item,cant:parseFloat(e.target.value)||0}:item))} style={{...SI,fontSize:12,padding:"5px 7px"}}/>
                <input value={it.unit} onChange={e=>setItems(prev=>prev.map(item=>item.id===it.id?{...item,unit:e.target.value}:item))} style={{...SI,fontSize:12,padding:"5px 7px"}}/>
                {/* Con separador de miles y no como numero pelado.
                    Escrito seguido, 6720000 y 672000 se distinguen contando
                    ceros de uno en uno, y equivocarse en uno son seis
                    millones de diferencia. Escrito 6.720.000 se ve de un
                    vistazo. Se guarda el numero limpio, no el texto. */}
                <input
                  type="text"
                  inputMode="numeric"
                  value={Number(it.vu) ? Number(it.vu).toLocaleString("es-CO") : ""}
                  onChange={e=>{
                    const digitos=e.target.value.replace(/\D/g,"");
                    const valor=digitos ? parseInt(digitos,10) : 0;
                    setItems(prev=>prev.map(item=>item.id===it.id?{...item,vu:valor}:item));
                  }}
                  placeholder="0"
                  style={{...SI,fontSize:12,padding:"5px 7px",textAlign:"right"}}/>
                <div style={{textAlign:"right",fontSize:12,fontWeight:600,color:"#cc0000",paddingRight:4}}>{fmt(it.cant*it.vu)}</div>
                <button onClick={()=>setItems(prev=>prev.filter(item=>item.id!==it.id))} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>×</button>
              </div>
            ))}
            {p.items.length===0&&<div style={{padding:"18px 12px",textAlign:"center",fontSize:12,color:"#94a3b8"}}>Sin ítems — agrega desde catálogo o manualmente</div>}
          </div>

          <button onClick={()=>{setItems(prev=>[...prev,{id:siguienteId(prev),desc:"",cant:1,unit:"ML",vu:0}]);}} style={{...B("#fff3e8","#f47c20"),border:"1px dashed #cc0000",width:"100%",justifyContent:"center",marginBottom:16,fontSize:12}}>+ Agregar ítem manual</button>

          {/* Tabla de totales */}
          <div style={{border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
            {[["SUBTOTAL",sub],["ADMINISTRACIÓN",0],["IMPREVISTOS",0],["UTILIDAD "+p.util+"%",ut],["IVA SOBRE LA UTILIDAD (19%)",iva]].map(([lbl,v])=>(
              <div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"9px 14px",borderBottom:"1px solid #f1f5f9",fontSize:12,color:"#475569"}}>
                <span>{lbl}</span><span style={{fontWeight:500,color:"#1a1a2e"}}>{v?fmt(v):"$  -"}</span>
              </div>
            ))}
            {/* La cifra va en BLANCO y mas grande, antes iba en naranja.
                El naranja sobre este azul marino cumple el minimo de
                accesibilidad por poco (5,5:1), pero es un naranja saturado
                sobre un fondo oscuro: en una pantalla con algo de reflejo, o
                mirada de lado, el total se perdia y la fila parecia una barra
                vacia. En blanco son 14,8:1 y no hay forma de no verlo. */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 14px",background:"#1a2840"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#cfd8e6",letterSpacing:".06em"}}>TOTAL</span>
              <span style={{fontSize:17,fontWeight:700,color:"#ffffff"}}>{fmt(tot)}</span>
            </div>
            <div style={{padding:"6px 14px",fontSize:10,color:"#94a3b8",textAlign:"center",background:"#f8fafc"}}>EL IVA ES EL 19% DE LA UTILIDAD</div>
          </div>

          <div style={{marginTop:12,display:"grid",gridTemplateColumns:"120px 1fr",gap:12,alignItems:"end"}}>
            <div><LBL>Utilidad %</LBL><input type="number" value={p.util} onChange={e=>set("util", Number(e.target.value))} style={SI}/></div>
            <div style={{fontSize:11,color:"#64748b",paddingBottom:10}}>Ajusta el porcentaje de utilidad para recalcular el total</div>
          </div>
        </div>

        {/* 5. Condiciones comerciales. Son datos de la propuesta, pero en el
            documento se imprimen en el cierre; se avisa para que no confunda. */}
        <div style={{paddingTop:12,borderTop:"1px solid #f1f5f9",marginTop:4}}>
          <div style={{fontSize:11,fontWeight:700,color:"#1a1a2e",marginBottom:2}}>Condiciones comerciales</div>
          <div style={{fontSize:10.5,color:"#94a3b8",marginBottom:10}}>Pertenecen a esta propuesta, pero en el documento salen al final, en el cierre.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><LBL>Forma de pago</LBL><input value={p.formaPago} onChange={e=>set("formaPago", e.target.value)} style={SI}/></div>
          <div><LBL>Tiempo de ejecución</LBL><input value={p.tiempoEjec} onChange={e=>set("tiempoEjec", e.target.value)} style={SI}/></div>
        </div>

        {/* 6. Lo que incluye. Se imprime en el cierre, debajo de las condiciones
            comerciales. Viene con un texto estandar ya escrito y se ajusta aqui
            cuando la obra lo pida. */}
        <div style={{marginTop:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:2}}>
            <div style={{fontSize:11,fontWeight:700,color:"#1a1a2e"}}>Esta cotización incluye</div>
            <BotonCorregir valor={p.incluyeTexto} onChange={v=>set("incluyeTexto", v)} compacto/>
            <button
              onClick={()=>set("incluyeTexto", DEFAULT_COT_INCLUYE)}
              disabled={p.incluyeTexto===DEFAULT_COT_INCLUYE}
              style={{
                background:"none",border:"none",padding:0,fontSize:10.5,fontFamily:"inherit",
                color:p.incluyeTexto===DEFAULT_COT_INCLUYE?"#cbd5e1":"#f47c20",
                cursor:p.incluyeTexto===DEFAULT_COT_INCLUYE?"default":"pointer",
                textDecoration:p.incluyeTexto===DEFAULT_COT_INCLUYE?"none":"underline",
              }}
            >Restaurar texto estándar</button>
          </div>
          <div style={{fontSize:10.5,color:"#94a3b8",marginBottom:10}}>
            Una línea por cada punto. Sale al final del documento, justo debajo de las condiciones comerciales.
          </div>
          <textarea
            value={p.incluyeTexto||""}
            onChange={e=>set("incluyeTexto", e.target.value)}
            spellCheck lang="es"
            style={{...SI,minHeight:150,resize:"vertical",lineHeight:1.6}}
          />
        </div>

    </div>
  );
}
