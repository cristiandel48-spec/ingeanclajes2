import { useEffect, useRef, useState } from "react";
import { B, CD, SI, ST, TC } from "../../styles/tokens";
import { buildGoogleStaticMapUrl, measurementsToQuoteItems } from "../../lib/maps";
import { fmt } from "../../lib/format";
export default function Planos({ctx}){
  const {obras,setObras,empleados,cotizaciones,setCotDraft,setScr}=ctx;
  const [sel,setSel]=useState(null);
  const [imgPlano,setImgPlano]=useState(null);
  const [trazosForm,setTrazosForm]=useState({tipo:"LVH",ml:0,label:""});
  const [lineas,setLineas]=useState([]);
  const [geoMediciones,setGeoMediciones]=useState([]);
  const [geoMapView,setGeoMapView]=useState(null);
  const [coordsInput,setCoordsInput]=useState("");
  const [tabPlano,setTabPlano]=useState("imagen");
  const [drag,setDrag]=useState(null);
  const imgRef=useRef();
  const manualSvgRef=useRef();

  const cotVinc = sel ? cotizaciones.find(c=>c.id===sel.cotizacionId) : null;

  useEffect(()=>{
    if(!drag) return;
    const stop=()=>setDrag(null);
    window.addEventListener("mouseup", stop);
    return ()=>window.removeEventListener("mouseup", stop);
  },[drag]);

  const abrirObra=(o)=>{
    const linked = cotizaciones.find(c=>c.id===o.cotizacionId);
    setSel(o);
    setImgPlano(o.imgPlano||null);
    setLineas((o.trazos||[]).map((t,i)=>({id:t.id||"ln-" + (i) + "-" + (Date.now()), ...t})));
    setGeoMediciones(o.geoMediciones||linked?.geoMediciones||[]);
    setGeoMapView(o.geoMapView||linked?.geoMapView||null);
    setCoordsInput(o.coords||linked?.coords||"");
    setDrag(null);
    setTabPlano("imagen");
  };

  const guardarEnObra=(patch={})=>{
    if(!sel) return;
    setObras(prev=>prev.map(o=>o.id===sel.id?{...o,...patch}:o));
    setSel(prev=>prev?{...prev,...patch}:prev);
  };

  const persistLineas=(nuevas)=>{ setLineas(nuevas); guardarEnObra({trazos:nuevas}); };
  const persistGeo=(nuevas)=>{ setGeoMediciones(nuevas); guardarEnObra({geoMediciones:nuevas, imgSat: buildGoogleStaticMapUrl(nuevas, coordsInput || sel?.coords || cotVinc?.coords || "", geoMapView), geoMapView}); };

  const agregarLinea=()=>{
    if(!trazosForm.ml||!trazosForm.label)return;
    const nueva={id:Date.now(),tipo:trazosForm.tipo,ml:trazosForm.ml,label:trazosForm.label,x1:50,y1:50+lineas.length*40,x2:50+Math.max(80,trazosForm.ml*3),y2:50+lineas.length*40};
    persistLineas([...lineas,nueva]);
    setTrazosForm({tipo:"LVH",ml:0,label:""});
  };

  const eliminarLinea=(id)=>persistLineas(lineas.filter(l=>l.id!==id));

  const toSvgPoint=(e, svgEl)=>{
    if(!svgEl) return {x:0,y:0};
    const rect=svgEl.getBoundingClientRect();
    const vb=svgEl.viewBox.baseVal;
    const scaleX=(vb.width||600)/rect.width;
    const scaleY=(vb.height||400)/rect.height;
    return {x:Math.round((e.clientX-rect.left)*scaleX), y:Math.round((e.clientY-rect.top)*scaleY)};
  };
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const moveItem=(item, part, dx, dy, maxX, maxY)=>{
    let {x1,y1,x2,y2}=item;
    if(part==="start"){ x1=clamp(x1+dx,0,maxX); y1=clamp(y1+dy,0,maxY); }
    else if(part==="end"){ x2=clamp(x2+dx,0,maxX); y2=clamp(y2+dy,0,maxY); }
    else { x1=clamp(x1+dx,0,maxX); y1=clamp(y1+dy,0,maxY); x2=clamp(x2+dx,0,maxX); y2=clamp(y2+dy,0,maxY); }
    return {...item,x1,y1,x2,y2};
  };
  const iniciarDrag=(id,part,e)=>{ e.preventDefault(); e.stopPropagation(); const pt=toSvgPoint(e, manualSvgRef.current); const vb=manualSvgRef.current?.viewBox?.baseVal; setDrag({id,part,lastX:pt.x,lastY:pt.y,maxX:(vb?.width||600),maxY:(vb?.height||400)}); };
  const moverDrag=(e)=>{ if(!drag) return; const pt=toSvgPoint(e, manualSvgRef.current); const dx=pt.x-drag.lastX; const dy=pt.y-drag.lastY; if(!dx&&!dy) return; persistLineas(lineas.map(l=>l.id===drag.id?moveItem(l,drag.part,dx,dy,drag.maxX,drag.maxY):l)); setDrag(prev=>prev?{...prev,lastX:pt.x,lastY:pt.y}:prev); };
  const finalizarDrag=()=>setDrag(null);

  const onImgChange=(e)=>{const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{ setImgPlano(ev.target.result); guardarEnObra({imgPlano:ev.target.result}); }; r.readAsDataURL(f);};
  const allLineas=[...lineas, ...geoMediciones.map((g,idx)=>({id:g.id||"geo-" + (idx), tipo:g.tipo, ml:g.ml, label:g.label}))];
  const totalML=allLineas.reduce((s,l)=>s+(parseFloat(l.ml)||0),0);

  const pasarACotizacion=()=>{
    const geoItems = measurementsToQuoteItems(geoMediciones);
    const manualItems = lineas.map((s,idx)=>({
      id: Date.now()+1000+idx,
      desc:s.label||"LINEA DE VIDA HORIZONTAL",
      cant:parseFloat(s.ml)||0,
      unit:s.tipo==="ESC"?"Metro":"ML",
      vu:s.tipo==="LVV"?320000:s.tipo==="ESC"?1200000:280000,
    }));
    setCotDraft&&setCotDraft({
      cliente: sel?.cliente||"",
      obra: sel?.proyecto||"",
      telefono: sel?.tel||"",
      ciudad: sel?.ciudad||"",
      coords: coordsInput || sel?.coords || cotVinc?.coords || "",
      mapImg: buildGoogleStaticMapUrl(geoMediciones, coordsInput || sel?.coords || cotVinc?.coords || "", geoMapView) || cotVinc?.mapImg || null,
      items: [...geoItems, ...manualItems],
      geoMediciones,
      geoMapView,
    });
    setScr&&setScr("cotizacion");
  };

  const renderShape = (shape)=>{
    const color=TC[shape.tipo]||"#60b4ff";
    const centerX=(shape.x1+shape.x2)/2;
    const centerY=(shape.y1+shape.y2)/2;
    return (
      <g key={shape.id}>
        <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={color} strokeWidth="4" strokeDasharray={shape.tipo==="CON"?"8,4":"none"} opacity="0.95" style={{cursor:"grab"}} onMouseDown={e=>iniciarDrag(shape.id,"line",e)} />
        <circle cx={shape.x1} cy={shape.y1} r={7} fill="#fff" stroke={color} strokeWidth="2.5" style={{cursor:"grab"}} onMouseDown={e=>iniciarDrag(shape.id,"start",e)} />
        <circle cx={shape.x2} cy={shape.y2} r={7} fill="#fff" stroke={color} strokeWidth="2.5" style={{cursor:"grab"}} onMouseDown={e=>iniciarDrag(shape.id,"end",e)} />
        <text x={centerX} y={centerY-10} fill={color} fontSize="11" textAnchor="middle" fontWeight="700" style={{paintOrder:"stroke",stroke:"#fff",strokeWidth:4,strokeLinejoin:"round"}}>{shape.label} ({shape.ml}ml)</text>
      </g>
    );
  };

  if(!sel){
    return(
      <div style={{padding:28}}>
        <H1 title="Planos & Medición" subtitle="La cotización es el origen de la ubicación y medición; aquí la continúas o la ajustas" />
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {obras.map(o=>{
            const linked = cotizaciones.find(c=>c.id===o.cotizacionId);
            const geos = o.geoMediciones || linked?.geoMediciones || [];
            return(
              <div key={o.id} onClick={()=>abrirObra(o)} style={{...CD,cursor:"pointer",border:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div><div style={{fontSize:11,color:"#94a3b8"}}>{o.id}</div><div style={{fontSize:14,fontWeight:700,color:"#1a1a2e",marginTop:2}}>{o.cliente}</div><div style={{fontSize:12,color:"#475569"}}>{o.proyecto}</div><div style={{fontSize:11,color:"#94a3b8",marginTop:2}}> {o.ciudad}</div></div>
                  <Badge estado={o.estado}/>
                </div>
                <div style={{marginTop:10,background:"#f1f5f9",borderRadius:6,padding:"6px 10px",fontSize:11,color:"#475569",display:"flex",justifyContent:"space-between"}}>
                  <span>{geos.length + (o.trazos||[]).length} trazos · {geos.length} automaticos</span>
                  <span style={{color:"#cc0000",fontWeight:600}}>Abrir plano</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:28}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,background:"#fff",borderRadius:14,padding:"16px 20px",border:"1px solid #e2e8f0",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
        <button onClick={()=>setSel(null)} style={{...B("#f1f5f9","#475569"),padding:"8px 16px",fontSize:13,flexShrink:0}}>Volver a obras</button>
        <div style={{flex:1}}><div style={{fontSize:11,color:"#94a3b8"}}>{sel.id} · Ciudad: {sel.ciudad || "No registrada"}</div><div style={{fontSize:20,fontWeight:700,color:"#1a1a2e"}}>{sel.cliente}</div><div style={{fontSize:13,color:"#475569"}}>{sel.proyecto}</div></div>
        <Badge estado={sel.estado}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[["Total ML",(totalML) + " ML","#cc0000"],["Tramos automaticos",(geoMediciones.length),"#2563eb"],["Trazos manuales",(lineas.length),"#60b4ff"],["Valor total",fmt(sel.total),"#f47c20"]].map(([k,v,c])=>(<div key={k} style={{background:"#fff",borderRadius:10,padding:"12px 16px",border:"1px solid #e2e8f0",textAlign:"center"}}><div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>{k}</div><div style={{fontSize:15,fontWeight:700,color:c}}>{v}</div></div>))}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[["imagen","Medicion automatica"],["svg","Plano de trazos"],["lista","Lista y cotizacion"]].map(([id,lb])=>(<button key={id} onClick={()=>setTabPlano(id)} style={{...B(tabPlano===id?"#cc0000":"#f1f5f9",tabPlano===id?"#fff":"#475569"),fontSize:12,padding:"8px 16px",border:"1px solid " + (tabPlano===id?"#cc0000":"#e2e8f0")}}>{lb}</button>))}
      </div>

      {tabPlano==="imagen" && (
        <div>
          <GoogleMeasureWorkspace queryValue={coordsInput} onQueryChange={(val)=>{ setCoordsInput(val); guardarEnObra({coords:val}); }} measurements={geoMediciones} onChange={persistGeo} mapView={geoMapView} onMapViewChange={(view)=>{ setGeoMapView(view); guardarEnObra({geoMapView:view}); }} />
          <div style={{...CD,marginTop:16}}>
            <div style={ST}>Imagen heredada para la obra / PDF</div>
                  {buildGoogleStaticMapUrl(geoMediciones, coordsInput, geoMapView) ? <StaticMapPreview src={buildGoogleStaticMapUrl(geoMediciones, coordsInput, geoMapView)} segments={geoMediciones} query={coordsInput} mapView={geoMapView} alt="Imagen heredada" border="none" borderRadius={8} /> : <div style={{background:"#f8fafc",border:"1px dashed #cbd5e1",borderRadius:8,padding:24,textAlign:"center",fontSize:12,color:"#64748b"}}>Mide el primer tramo y aquí aparecerá la imagen que viene de la cotización.</div>}
          </div>
        </div>
      )}

      {tabPlano==="svg" && (
        <div>
          <div style={{...CD,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={ST}>Plano de trazos manual</div>
              <button onClick={()=>imgRef.current.click()} style={{...B("#f1f5f9","#475569"),fontSize:11,padding:"5px 10px"}}>Cargar imagen de fondo</button>
              <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={onImgChange}/>
            </div>
            <div style={{background:"#f0f4f8",borderRadius:8,overflow:"hidden",position:"relative",border:"1px solid #e2e8f0"}}>
              <svg ref={manualSvgRef} viewBox="0 0 500 300" style={{width:"100%",display:"block"}} onMouseMove={moverDrag} onMouseUp={finalizarDrag} onMouseLeave={finalizarDrag}>
                {Array.from({length:16},(_,i)=><line key={"v" + (i)} x1={i*32} y1={0} x2={i*32} y2={300} stroke="#cbd5e1" strokeWidth="0.5"/>) }
                {Array.from({length:10},(_,i)=><line key={"h" + (i)} x1={0} y1={i*32} x2={500} y2={i*32} stroke="#cbd5e1" strokeWidth="0.5"/>) }
                {imgPlano&&<image href={imgPlano} x={0} y={0} width={500} height={300} opacity={0.45} preserveAspectRatio="xMidYMid slice"/>}
                {lineas.map(l=>renderShape(l))}
              </svg>
            </div>
          </div>
          <div style={{...CD,marginBottom:16}}>
            <div style={ST}>Agregar tramo manual</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:12,alignItems:"end"}}>
              <div><LBL>Tipo</LBL><select value={trazosForm.tipo} onChange={e=>setTrazosForm({...trazosForm,tipo:e.target.value})} style={SI}>{[["LVH","L.V. Horizontal"],["LVV","L.V. Vertical"],["CON","Conexión"],["ESC","Escalera"],["PAN","Punto anclaje"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
              <div><LBL>Metros lineales</LBL><input type="number" value={trazosForm.ml} onChange={e=>setTrazosForm({...trazosForm,ml:parseFloat(e.target.value)||0})} style={SI}/></div>
              <div style={{gridColumn:"span 2"}}><LBL>Etiqueta</LBL><input value={trazosForm.label} onChange={e=>setTrazosForm({...trazosForm,label:e.target.value})} style={SI}/></div>
              <button onClick={agregarLinea} style={B("#cc0000")}>+ Agregar</button>
            </div>
          </div>
        </div>
      )}

      {tabPlano==="lista" && (
        <div style={CD}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={ST}>Trazos registrados · Total: <span style={{color:"#cc0000"}}>{totalML} ML</span></div>
            <button onClick={pasarACotizacion} style={{...B("#4ade80","#0f2d1a"),fontSize:12}}>Llevar a cotizacion</button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f8fafc"}}>{["Fuente","Tipo","Descripción","Metros",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#64748b",fontWeight:500,fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {geoMediciones.map(seg=><tr key={seg.id} style={{borderBottom:"1px solid #f1f5f9",background:"#eff6ff"}}><td style={{padding:"8px 10px"}}><span style={{background:"#dbeafe",color:"#1d4ed8",borderRadius:4,padding:"2px 6px",fontSize:10}}>Google</span></td><td style={{padding:"8px 10px"}}>{seg.tipo}</td><td style={{padding:"8px 10px",fontWeight:500}}>{seg.label}</td><td style={{padding:"8px 10px",fontWeight:700,color:"#cc0000"}}>{Number(seg.ml||0).toFixed(2)} m</td><td style={{padding:"8px 10px"}}><button onClick={()=>persistGeo(geoMediciones.filter(x=>x.id!==seg.id))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:11}}>× Eliminar</button></td></tr>)}
              {lineas.map(t=><tr key={t.id} style={{borderBottom:"1px solid #f1f5f9"}}><td style={{padding:"8px 10px"}}><span style={{background:"#fef3c7",color:"#b45309",borderRadius:4,padding:"2px 6px",fontSize:10}}>Manual</span></td><td style={{padding:"8px 10px"}}>{t.tipo}</td><td style={{padding:"8px 10px",fontWeight:500}}>{t.label}</td><td style={{padding:"8px 10px",fontWeight:700,color:"#cc0000"}}>{t.ml} ML</td><td style={{padding:"8px 10px"}}><button onClick={()=>eliminarLinea(t.id)} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:11}}>× Eliminar</button></td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

