import { useEffect, useRef, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmtD, fmtL, today } from "../../lib/format";
import { printCurrentPz } from "../../lib/print";
export default function Informes({ctx}){
  const {informes,setInformes,obras,empleados,horarios}=ctx;
  const [sel,setSel]=useState(null);
  const [nuevo,setNuevo]=useState(false);
  const [editId,setEditId]=useState(null);
  const fotoRefs=useRef({});

  const emptyActividad=()=>({titulo:"",descripcion:"",observaciones:"",fotos:[{img:null,comentario:""},{img:null,comentario:""},{img:null,comentario:""},{img:null,comentario:""}]});
  const emptyPersona=()=>({empleadoId:"",cargo:"Instalador",nombre:"",turno1:"",turno2:"",manual:true});

  const fmtHora12=(hhmm)=>{
    if(!hhmm||!hhmm.includes(':')) return hhmm||"";
    const [hs,ms] = hhmm.trim().split(':');
    const h = Number(hs);
    if(Number.isNaN(h)) return hhmm;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return (String(h12).padStart(2,'0')) + ":" + (ms) + " " + (suffix);
  };

  const fmtTurno12=(turno)=>{
    if(!turno) return "";
    const parts = turno.split('-').map(p=>p.trim()).filter(Boolean);
    if(parts.length===2 && parts[0].includes(':') && parts[1].includes(':')){
      return (fmtHora12(parts[0])) + " - " + (fmtHora12(parts[1]));
    }
    return turno;
  };

  const buildPersonalDesdeObra=(obraId,periodoInicio,periodoFin,prevPersonal=[])=>{
    const obraSel = obras.find(o=>o.id===obraId);
    const idsObra = obraSel?.empleados || [];
    const horariosObra = horarios.filter(h=>
      h.obraId===obraId &&
      (!periodoInicio || h.fecha>=periodoInicio) &&
      (!periodoFin || h.fecha<=periodoFin)
    );

    const vinculados = idsObra.map((eid)=>{
      const emp = empleados.find(e=>e.id===eid);
      const prev = prevPersonal.find(p=>p.empleadoId===eid) || {};
      const turnosEmp = [...new Set(
        horariosObra
          .filter(h=>h.empleadoId===eid)
          .map(h=>fmtTurno12(h.turno))
          .filter(Boolean)
      )].slice(0,2);
      return {
        empleadoId:eid,
        cargo: prev.cargo || emp?.cargo || 'Instalador',
        nombre: emp?.nombre || prev.nombre || '',
        turno1: prev.turno1 || turnosEmp[0] || '',
        turno2: prev.turno2 || turnosEmp[1] || '',
        manual:false,
      };
    });

    const manuales = prevPersonal.filter(p=>p.manual && !p.empleadoId);
    return [...vinculados, ...manuales];
  };

  const firstObraId = obras[0]?.id || "";
  const normalizeInformeActividades = (data={})=>{
    if(Array.isArray(data.actividades) && data.actividades.length){
      return data.actividades.map((actividad)=>({
        ...emptyActividad(),
        ...actividad,
        fotos:Array.isArray(actividad?.fotos) && actividad.fotos.length
          ? actividad.fotos.map((foto)=>({img:foto?.img||foto?.url||null,comentario:foto?.comentario||""}))
          : emptyActividad().fotos,
      }));
    }
    if(data.actividad || data.descripcion || data.observaciones || (Array.isArray(data.fotos) && data.fotos.length)){
      return [{
        ...emptyActividad(),
        titulo:data.actividad||"",
        descripcion:data.descripcion||"",
        observaciones:data.observaciones||"",
        fotos:(Array.isArray(data.fotos) && data.fotos.length
          ? data.fotos.map((foto)=>({img:foto?.img||foto?.url||null,comentario:foto?.comentario||""}))
          : emptyActividad().fotos),
      }];
    }
    return [emptyActividad()];
  };

  const buildInformeForm = (data={})=>({
    obraId:data.obraId ?? firstObraId,
    proyecto:data.proyecto ?? "",
    localizacion:data.localizacion ?? "",
    fechaInforme:data.fechaInforme ?? today(),
    periodoInicio:data.periodoInicio ?? today(),
    periodoFin:data.periodoFin ?? today(),
    personal:Array.isArray(data.personal) ? data.personal : [],
    recomendaciones:data.recomendaciones ?? "Para garantizar la efectividad y seguridad de las líneas de vida instaladas es fundamental implementar un programa de inspección regular.",
    actividades:normalizeInformeActividades(data),
  });

  const [form,setForm]=useState(buildInformeForm());

  const turnosDisponiblesObra = [...new Set(
    horarios
      .filter(h=>h.obraId===form.obraId && (!form.periodoInicio || h.fecha>=form.periodoInicio) && (!form.periodoFin || h.fecha<=form.periodoFin))
      .map(h=>fmtTurno12(h.turno))
      .filter(Boolean)
  )];

  useEffect(()=>{
    if(!obras.length) return;
    setForm(prev=>{
      const obraSel = obras.find(o=>o.id===prev.obraId) || obras[0];
      if(!obraSel) return prev;
      const nextProyecto = prev.proyecto || obraSel.proyecto || '';
      const nextLocal = prev.localizacion || obraSel.ciudad || '';
      const nextPersonal = buildPersonalDesdeObra(obraSel.id, prev.periodoInicio, prev.periodoFin, prev.personal);
      const sameProyecto = nextProyecto===prev.proyecto;
      const sameLocal = nextLocal===prev.localizacion;
      const samePersonal = JSON.stringify(nextPersonal)===JSON.stringify(prev.personal);
      if(sameProyecto && sameLocal && samePersonal && obraSel.id===prev.obraId) return prev;
      return {...prev,obraId:obraSel.id,proyecto:nextProyecto,localizacion:nextLocal,personal:nextPersonal};
    });
  },[obras,empleados,horarios]);

  useEffect(()=>{
    if(!form.obraId) return;
    const obraSel = obras.find(o=>o.id===form.obraId);
    setForm(prev=>{
      const nextPersonal = buildPersonalDesdeObra(prev.obraId, prev.periodoInicio, prev.periodoFin, prev.personal);
      const nextProyecto = obraSel?.proyecto || prev.proyecto || '';
      const nextLocal = obraSel?.ciudad || prev.localizacion || '';
      const samePersonal = JSON.stringify(nextPersonal)===JSON.stringify(prev.personal);
      if(samePersonal && nextProyecto===prev.proyecto && nextLocal===prev.localizacion) return prev;
      return {...prev,proyecto:nextProyecto,localizacion:nextLocal,personal:nextPersonal};
    });
  },[form.obraId,form.periodoInicio,form.periodoFin,obras,empleados,horarios]);

  const updPersonal=(i,f,v)=>setForm(p=>({...p,personal:p.personal.map((x,j)=>j===i?{...x,[f]:v}:x)}));
  const updActividad=(ai,field,val)=>setForm(p=>({...p,actividades:p.actividades.map((a,i)=>i===ai?{...a,[field]:val}:a)}));
  const updFotoAct=(ai,fi,field,val)=>setForm(p=>({...p,actividades:p.actividades.map((a,i)=>i===ai?{...a,fotos:a.fotos.map((ft,j)=>j===fi?{...ft,[field]:val}:ft)}:a)}));

  const cargarFoto=(ai,fi,file)=>{
    if(!file)return;
    const r=new FileReader();
    r.onload=ev=>updFotoAct(ai,fi,"img",ev.target.result);
    r.readAsDataURL(file);
  };

  const abrirNuevoInforme = ()=>{
    setEditId(null);
    setSel(null);
    fotoRefs.current={};
    setForm(buildInformeForm());
    setNuevo(true);
  };

  const editarInforme = (inf)=>{
    setEditId(inf.id);
    fotoRefs.current={};
    setForm(buildInformeForm(inf));
    setSel(inf);
    setNuevo(true);
  };

  const guardar=()=>{
    const actividades = normalizeInformeActividades(form);
    const legacyActividad = actividades[0] || emptyActividad();
    const inf=editId
      ? {id:editId,...form,actividades,actividad:legacyActividad.titulo,descripcion:legacyActividad.descripcion,observaciones:legacyActividad.observaciones,fotos:legacyActividad.fotos}
      : {id:"INF-" + (String(informes.length+1).padStart(3,"0")),...form,actividades,actividad:legacyActividad.titulo,descripcion:legacyActividad.descripcion,observaciones:legacyActividad.observaciones,fotos:legacyActividad.fotos};
    setInformes(prev=>editId ? prev.map(item=>item.id===editId?{...item,...inf}:item) : [...prev,inf]);
    setNuevo(false);
    setEditId(null);
    setSel(inf);
  };

  return(
    <div style={{padding:28}}>
      <H1 title="Informes de Actividades" subtitle="Múltiples actividades por informe con registro fotográfico"
        action={<button style={B("#f47c20")} onClick={abrirNuevoInforme}>+ Nuevo Informe</button>}/>

      {nuevo&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #cc0000"}}>
          <div style={ST}>{editId ? "Editar Informe de Actividades" : "Nuevo Informe de Actividades"}</div>

          {/* Datos generales */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div><LBL>Obra asociada</LBL><select value={form.obraId} onChange={e=>{const o=obras.find(x=>x.id===e.target.value);setForm(p=>({...p,obraId:e.target.value,proyecto:o?.proyecto||"",localizacion:o?.ciudad||"",personal:buildPersonalDesdeObra(e.target.value,p.periodoInicio,p.periodoFin,p.personal)}));}} style={SI}>{obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
            <div><LBL>Nombre del proyecto</LBL><input value={form.proyecto} onChange={e=>setForm(p=>({...p,proyecto:e.target.value}))} style={SI}/></div>
            <div><LBL>Localización</LBL><input value={form.localizacion} onChange={e=>setForm(p=>({...p,localizacion:e.target.value}))} style={SI}/></div>
            <div><LBL>Fecha del informe</LBL><input type="date" value={form.fechaInforme} onChange={e=>setForm(p=>({...p,fechaInforme:e.target.value}))} style={SI}/></div>
            <div><LBL>Período desde</LBL><input type="date" value={form.periodoInicio} onChange={e=>setForm(p=>({...p,periodoInicio:e.target.value}))} style={SI}/></div>
            <div><LBL>Período hasta</LBL><input type="date" value={form.periodoFin} onChange={e=>setForm(p=>({...p,periodoFin:e.target.value}))} style={SI}/></div>
          </div>

          {/* Personal */}
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,flexWrap:"wrap",gap:8}}>
              <LBL>Personal en obra</LBL>
              <div style={{fontSize:11,color:"#64748b"}}>Se carga automáticamente según la obra y los horarios del período. Los turnos se muestran en formato 12h.</div>
            </div>
            <datalist id="turnosInformeList">
              {turnosDisponiblesObra.map((t,i)=><option key={i} value={t} />)}
            </datalist>
            {form.personal.length===0&&<div style={{background:"#f8fafc",border:"1px dashed #e2e8f0",borderRadius:8,padding:"12px 14px",fontSize:12,color:"#94a3b8",marginBottom:8}}>No hay personal asignado a esta obra todavía. Puedes agregarlo manualmente.</div>}
            {form.personal.map((p,i)=>(
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 1fr 1fr 28px",gap:8,marginBottom:6}}>
                <input value={p.cargo} onChange={e=>updPersonal(i,"cargo",e.target.value)} placeholder="Cargo" style={{...SI,fontSize:12}}/>
                <input value={p.nombre} onChange={e=>updPersonal(i,"nombre",e.target.value)} placeholder="Nombre completo" style={{...SI,fontSize:12}}/>
                <input list="turnosInformeList" value={p.turno1||""} onChange={e=>updPersonal(i,"turno1",e.target.value)} placeholder="Turno 1 · 07:00 AM - 05:00 PM" style={{...SI,fontSize:12}}/>
                <input list="turnosInformeList" value={p.turno2||""} onChange={e=>updPersonal(i,"turno2",e.target.value)} placeholder="Turno 2 · opcional" style={{...SI,fontSize:12}}/>
                <button onClick={()=>setForm(pf=>({...pf,personal:pf.personal.filter((_,j)=>j!==i)}))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,cursor:"pointer",fontSize:14}}>×</button>
              </div>
            ))}
            <button onClick={()=>setForm(p=>({...p,personal:[...p.personal,emptyPersona()]}))} style={{...B("#f1f5f9","#475569"),fontSize:12,marginTop:4}}>+ Agregar persona</button>
          </div>

          {/* Actividades */}
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <LBL>Actividades ejecutadas</LBL>
              <button onClick={()=>setForm(p=>({...p,actividades:[...p.actividades,emptyActividad()]}))} style={{...B("#cc0000"),fontSize:11,padding:"5px 12px"}}>+ Agregar actividad</button>
            </div>
            {form.actividades.map((act,ai)=>(
              <div key={ai} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:16,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#cc0000"}}>Actividad {ai+1}</div>
                  {form.actividades.length>1&&<button onClick={()=>setForm(p=>({...p,actividades:p.actividades.filter((_,i)=>i!==ai)}))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:5,padding:"2px 8px",cursor:"pointer",fontSize:11}}>× Eliminar</button>}
                </div>
                <div style={{marginBottom:10}}><LBL>Título / nombre de la actividad</LBL><input value={act.titulo} onChange={e=>updActividad(ai,"titulo",e.target.value)} placeholder="Ej: Instalación de líneas de vida" style={SI}/></div>
                <div style={{marginBottom:10}}><LBL>Descripción detallada</LBL><textarea value={act.descripcion} onChange={e=>updActividad(ai,"descripcion",e.target.value)} rows={3} placeholder="Descripción del proceso ejecutado..." style={{...SI,resize:"vertical"}}/></div>
                <div style={{marginBottom:12}}><LBL>Observaciones</LBL><input value={act.observaciones} onChange={e=>updActividad(ai,"observaciones",e.target.value)} placeholder="Ej: 1 Línea de vida horizontal de 119 metros" style={SI}/></div>
                {/* Fotos de esta actividad */}
                <LBL>Registro fotográfico</LBL>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,alignItems:"start"}}>
                  {act.fotos.map((ft,fi)=>(
                    <div key={fi} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,overflow:"hidden"}}>
                      <div
                        onClick={()=>{const k=(ai) + "-" + (fi);if(!fotoRefs.current[k])return;fotoRefs.current[k].click();}}
                        style={{minHeight:150,background:"#f8fafc",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative",padding:ft.img?8:0}}>
                        {ft.img
                          ?<img src={ft.img} alt="" style={{width:"100%",height:"auto",maxHeight:220,objectFit:"contain",display:"block",background:"#fff",borderRadius:6}}/>
                          :<div style={{textAlign:"center",color:"#94a3b8",fontSize:11}}><div style={{fontSize:22}}>Foto</div><div>Foto {fi+1} · Clic para cargar</div></div>}
                        {ft.img&&<div style={{position:"absolute",top:6,right:6,background:"rgba(0,0,0,0.55)",borderRadius:4,padding:"2px 6px",fontSize:9,color:"#fff",cursor:"pointer"}} onClick={e=>{e.stopPropagation();updFotoAct(ai,fi,"img",null);}}>× Quitar</div>}
                      </div>
                      <input ref={el=>{fotoRefs.current[(ai) + "-" + (fi)]=el;}} type="file" accept="image/*" style={{display:"none"}} onChange={e=>cargarFoto(ai,fi,e.target.files[0])}/>
                      <div style={{padding:"6px 8px"}}><input value={ft.comentario} onChange={e=>updFotoAct(ai,fi,"comentario",e.target.value)} placeholder="Descripción de la foto..." style={{...SI,fontSize:11,padding:"4px 8px"}}/></div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>updActividad(ai,"fotos",[...act.fotos,{img:null,comentario:""}])} style={{...B("#f1f5f9","#475569"),fontSize:11,marginTop:8}}>+ Agregar foto</button>
              </div>
            ))}
          </div>

          <div style={{marginBottom:14}}><LBL>Recomendaciones generales</LBL><textarea value={form.recomendaciones} onChange={e=>setForm(p=>({...p,recomendaciones:e.target.value}))} rows={3} style={{...SI,resize:"vertical"}}/></div>
          <div style={{display:"flex",gap:10}}>
            <button style={B("#cc0000")} onClick={guardar}>{editId ? "Guardar cambios" : "Guardar informe"}</button>
            <button style={B("#f1f5f9","#475569")} onClick={()=>{setNuevo(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de informes */}
      {!sel&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {informes.map(inf=>(
            <div key={inf.id} style={{...CD,border:"1px solid #e2e8f0",cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#cc0000"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#e2e8f0"}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>{inf.id}</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#1a1a2e"}}>{inf.proyecto}</div>
                  <div style={{fontSize:11,color:"#475569"}}>{inf.localizacion}</div>
                </div>
                <div style={{textAlign:"right",fontSize:11,color:"#64748b"}}>
                  <div>{fmtD(inf.fechaInforme)}</div>
                  <div style={{color:"#94a3b8"}}>{fmtD(inf.periodoInicio)} - {fmtD(inf.periodoFin)}</div>
                </div>
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
                {(inf.actividades||[{titulo:inf.actividad}]).map((a,i)=>(
                  <span key={i} style={{background:"#fff3e8",color:"#cc6600",borderRadius:4,padding:"2px 8px",fontSize:11,border:"1px solid #f47c2044"}}>{a.titulo||a}</span>
                ))}
              </div>
              <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>{inf.personal?.length||0} personas · {(inf.actividades||[]).length} actividad(es)</div>
              <div style={{display:"flex",gap:8}}>
                <button style={{...B("#f47c20"),flex:1,justifyContent:"center",fontSize:12}} onClick={()=>setSel(inf)}>Ver / Imprimir</button>
                <button style={{...B("#dbeafe","#1e40af"),flex:1,justifyContent:"center",fontSize:12}} onClick={()=>editarInforme(inf)}>Editar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Vista detalle + impresión */}
      {sel&&(
        <div>
          <div style={{display:"flex",gap:10,marginBottom:14}}>
            <button style={B("#f1f5f9","#475569")} onClick={()=>setSel(null)}>Volver</button>
            <button style={{...B("#dbeafe","#1e40af")}} onClick={()=>editarInforme(sel)}>Editar</button>
            <button style={B("#f47c20")} onClick={()=>printCurrentPz("Informe " + (sel?.id || ""))}>Imprimir PDF</button>
          </div>
          <div id="pz" className="doc-shell" style={{background:"#fff",color:"#111",fontFamily:"'Aptos','Segoe UI',sans-serif",fontSize:11,lineHeight:1.6,border:"1px solid #ddd",padding:"28px 36px"}}>
            <PrintHeader dual={false}/>
            <div style={{textAlign:"center",fontSize:10,fontWeight:700,letterSpacing:2,padding:"6px 0",borderBottom:"1px solid #ddd",color:"#333",textTransform:"uppercase",marginBottom:16,marginTop:8}}>Informe de Actividades</div>
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
              <tbody>
                {[["PROYECTO",sel.proyecto],["LOCALIZACIÓN",sel.localizacion],["FECHA INFORME",fmtL(sel.fechaInforme)],["PERÍODO DE INFORME",(fmtL(sel.periodoInicio)) + " - " + (fmtL(sel.periodoFin))]].map(([k,v])=>(
                  <tr key={k}><td style={{border:"1px solid #ccc",padding:"5px 10px",background:"#f0f0f0",fontWeight:700,width:"30%"}}>{k}</td><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{v}</td></tr>
                ))}
              </tbody>
            </table>
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
              <thead>
                <tr style={{background:"#ddd"}}><td colSpan={4} style={{border:"1px solid #ccc",padding:"6px 10px",fontWeight:700,textAlign:"center"}}>PERSONAL EN OBRA</td></tr>
                <tr style={{background:"#f5f5f5"}}>
                  <th style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"left"}}>CARGO</th>
                  <th style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"left"}}>NOMBRE</th>
                  <th style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"left"}}>TURNO 1</th>
                  <th style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"left"}}>TURNO 2</th>
                </tr>
              </thead>
              <tbody>{(sel.personal||[]).map((p,i)=><tr key={i}><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{p.cargo}</td><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{p.nombre}</td><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{p.turno1||"-"}</td><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{p.turno2||"-"}</td></tr>)}</tbody>
            </table>
            {/* Múltiples actividades */}
            {(sel.actividades||[{titulo:sel.actividad,descripcion:sel.descripcion,observaciones:sel.observaciones,fotos:sel.fotos||[]}]).map((act,ai)=>(
              <div key={ai}>
                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:"1px solid #ccc",padding:"6px 10px",background:"#ddd",fontWeight:700,textAlign:"center"}}>{act.titulo||act}</td></tr>
                    <tr><td style={{border:"1px solid #ccc",padding:"5px 10px",fontWeight:700,width:"20%",verticalAlign:"top"}}>DESCRIPCIÓN</td><td style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"justify"}}>{act.descripcion}</td></tr>
                    <tr><td style={{border:"1px solid #ccc",padding:"5px 10px",fontWeight:700}}>Observaciones</td><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{act.observaciones}</td></tr>
                  </tbody>
                </table>
                {(act.fotos||[]).some(ft=>ft.img||ft.url)&&(
                  <>
                    <div style={{fontWeight:700,textAlign:"center",background:"#ddd",border:"1px solid #ccc",padding:"6px",marginBottom:10}}>REGISTRO FOTOGRÁFICO - {act.titulo}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14,alignItems:"start"}}>
                      {(act.fotos||[]).filter(ft=>ft.img||ft.url).map((ft,i)=>(
                        <div key={i} style={{border:"1px solid #ccc",borderRadius:4,overflow:"hidden",background:"#fff",padding:8}}>
                          <img src={ft.img||ft.url} alt={"foto" + (i+1)} style={{width:"100%",height:"auto",maxHeight:260,objectFit:"contain",display:"block",background:"#fff"}} onError={e=>{e.target.style.display="none";}}/>
                          {ft.comentario&&<div style={{padding:"6px 8px",fontSize:10,color:"#555",borderTop:"1px solid #eee",marginTop:6}}>{ft.comentario}</div>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:20}}>
              <tbody><tr><td style={{border:"1px solid #ccc",padding:"5px 10px",fontWeight:700,width:"20%",verticalAlign:"top"}}>RECOMENDACIONES</td><td style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"justify"}}>{sel.recomendaciones}</td></tr></tbody>
            </table>
            <div style={{marginTop:24}}>
              <div style={{marginBottom:12,fontSize:12}}>Cordialmente,</div>
              <div style={{height:72}}></div>
              <div style={{textAlign:"center"}}>
                <div style={{display:"inline-block",borderTop:"1px solid #333",paddingTop:8,minWidth:200}}>
                  <div style={{fontWeight:700}}>ING. JHON JAIME SEPULVEDA LONDOÑO</div>
                  <div style={{fontSize:10}}>Cl 38 sur # 36-48, Envigado · PBX 448 26 86 · Cel. 314 863 40 72</div>
                  <div style={{fontSize:10}}>Nit. 900193965-4 · ingeanclajes.sas@gmail.com</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

