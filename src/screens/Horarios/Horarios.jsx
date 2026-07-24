import Av from "../../components/ui/Av";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useEffect, useState } from "react";
import { B, CD, PAL, SI, ST } from "../../styles/tokens";
import { fmtD, today } from "../../lib/format";
export default function Horarios({ctx}){
  const {obras,empleados,horarios,setHorarios}=ctx;
  const firstEmpId = empleados[0]?.id || "";
  const firstObraId = obras[0]?.id || "";
  const fmtHora12Local=(hhmm)=>{
    if(!hhmm || !String(hhmm).includes(':')) return hhmm || "";
    const [hs,ms] = String(hhmm).trim().split(':');
    const h = Number(hs);
    if(Number.isNaN(h)) return hhmm;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return (String(h12).padStart(2,'0')) + ":" + (ms) + " " + (suffix);
  };

  const fmtTurno12Local=(turno)=>{
    if(!turno) return "";
    const raw = String(turno).trim();
    if(raw.toLowerCase()==='turno completo') return 'Turno completo';
    const parts = raw.split('-').map(p=>p.trim()).filter(Boolean);
    if(parts.length===2 && parts[0].includes(':') && parts[1].includes(':')){
      return (fmtHora12Local(parts[0])) + " - " + (fmtHora12Local(parts[1]));
    }
    return raw;
  };

  const [fechaF,setFechaF]=useState(today());
  const [showF,setShowF]=useState(false);
  const [form,setForm]=useState({
    empleadoId:firstEmpId,
    obraId:firstObraId,
    fecha:today(),
    turno1Inicio:"07:00",
    turno1Fin:"17:00",
    tarea1:"",
    turno2Inicio:"",
    turno2Fin:"",
    tarea2:"",
  });
  const [notif,setNotif]=useState("");
  const dia=horarios.filter(h=>h.fecha===fechaF);
  const empSel=empleados.find(e=>e.id===form.empleadoId);
  const obraSel=obras.find(o=>o.id===form.obraId);

  useEffect(()=>{
    setForm(prev=>({
      ...prev,
      empleadoId: empleados.some(e=>e.id===prev.empleadoId) ? prev.empleadoId : firstEmpId,
      obraId: obras.some(o=>o.id===prev.obraId) ? prev.obraId : firstObraId,
    }));
  },[firstEmpId,firstObraId,empleados,obras]);

  const armarTurno=(inicio,fin)=>{
    if(!inicio || !fin) return "";
    return (inicio) + " - " + (fin);
  };

  const buildTurnosPayload=(baseForm)=>{
    const configs = [
      {turno:armarTurno(baseForm.turno1Inicio, baseForm.turno1Fin), tarea:baseForm.tarea1 || baseForm.tarea2},
      {turno:armarTurno(baseForm.turno2Inicio, baseForm.turno2Fin), tarea:baseForm.tarea2 || baseForm.tarea1},
    ];
    return configs
      .filter(item=>item.turno && item.tarea)
      .map(item=>({
        empleadoId: baseForm.empleadoId,
        obraId: baseForm.obraId,
        fecha: baseForm.fecha,
        turno: item.turno,
        tarea: item.tarea,
      }));
  };

  const enviarWA=(eid,oid,f,turnosInfo=[])=>{
    const e=empleados.find(x=>x.id===eid);
    const o=obras.find(x=>x.id===oid);
    if(!e||!o||!turnosInfo.length) return;
    const fechaMsg = fmtD(f) || f;
    const detalleTurnos = turnosInfo.map((item,idx)=>(idx+1) + ". " + (fmtTurno12Local(item.turno)) + " - " + (item.tarea)).join('\n');
    const msg="Hola " + (e.nombre) + ", has sido asignado a la obra *" + (o.proyecto) + "* del cliente *" + (o.cliente) + "* para el día *" + (fechaMsg) + "* en *" + (o.direccion||o.ciudad) + "*.\\n\\nTurnos asignados:\\n" + (detalleTurnos) + "\\n\\nPor favor confirma tu asistencia.\\n*INGEANCLAJES S.A.S*";
    window.open("https://wa.me/57" + (e.tel) + "?text=" + (encodeURIComponent(msg)),"_blank");
    setNotif("WhatsApp abierto para " + (e.nombre) + " · +57 " + (e.tel));
    setTimeout(()=>setNotif(""),5000);
  };

  const guardar=()=>{
    const payload = buildTurnosPayload(form);
    if(!payload.length) return;
    setHorarios(p=>[
      ...p,
      ...payload.map((item,idx)=>({id:"H" + (Date.now()) + (idx),...item}))
    ]);
    enviarWA(form.empleadoId,form.obraId,form.fecha,payload);
    setShowF(false);
    setForm({
      empleadoId: empleados.some(e=>e.id===form.empleadoId) ? form.empleadoId : firstEmpId,
      obraId: obras.some(o=>o.id===form.obraId) ? form.obraId : firstObraId,
      fecha:today(),
      turno1Inicio:"07:00",
      turno1Fin:"17:00",
      tarea1:"",
      turno2Inicio:"",
      turno2Fin:"",
      tarea2:"",
    });
  };

  const previewTurnos = buildTurnosPayload(form);

  const reenviarDiaEmpleado=(h)=>{
    const relacionados = horarios.filter(x=>
      x.empleadoId===h.empleadoId &&
      x.obraId===h.obraId &&
      x.fecha===h.fecha
    );
    enviarWA(h.empleadoId,h.obraId,h.fecha,relacionados);
  };

  return(
    <div style={{padding:28}}>
      <H1 title="Horarios" subtitle="Asigna hasta 2 turnos por día y notifica automáticamente por WhatsApp" action={<button style={B("#f47c20")} onClick={()=>setShowF(!showF)}>+ Asignar turnos</button>}/>
      {notif&&<div style={{background:"#e8f5ee",border:"1px solid #166534",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#166534"}}>{notif}</div>}
      {showF&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #cc0000"}}>
          <div style={ST}>Nuevo horario · notificación automática por WhatsApp</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <div><LBL>Empleado</LBL><select value={form.empleadoId} onChange={e=>setForm({...form,empleadoId:e.target.value})} style={SI}>{empleados.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
            <div><LBL>Obra</LBL><select value={form.obraId} onChange={e=>setForm({...form,obraId:e.target.value})} style={SI}>{obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
            <div><LBL>Fecha</LBL><input type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})} style={SI}/></div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#1a1a2e",marginBottom:10}}>Turno 1</div>
              <div style={{marginBottom:10}}>
                <LBL>Horario personalizado</LBL>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div>
                    <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>Desde</div>
                    <input type="time" value={form.turno1Inicio} onChange={e=>setForm({...form,turno1Inicio:e.target.value})} style={SI}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>Hasta</div>
                    <input type="time" value={form.turno1Fin} onChange={e=>setForm({...form,turno1Fin:e.target.value})} style={SI}/>
                  </div>
                </div>
                <div style={{fontSize:11,color:"#64748b",marginTop:6}}>Ejemplo: {fmtTurno12Local(armarTurno(form.turno1Inicio, form.turno1Fin))}</div>
              </div>
              <div>
                <LBL>Tarea del turno 1</LBL>
                <input value={form.tarea1} onChange={e=>setForm({...form,tarea1:e.target.value})} placeholder="Ej: Instalación anclajes" style={SI}/>
              </div>
            </div>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:12}}>
              <div style={{fontSize:11,fontWeight:700,color:"#1a1a2e",marginBottom:10}}>Turno 2 (opcional)</div>
              <div style={{marginBottom:10}}>
                <LBL>Horario personalizado</LBL>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div>
                    <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>Desde</div>
                    <input type="time" value={form.turno2Inicio} onChange={e=>setForm({...form,turno2Inicio:e.target.value})} style={SI}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:"#64748b",marginBottom:4}}>Hasta</div>
                    <input type="time" value={form.turno2Fin} onChange={e=>setForm({...form,turno2Fin:e.target.value})} style={SI}/>
                  </div>
                </div>
                <div style={{fontSize:11,color:"#64748b",marginTop:6}}>{form.turno2Inicio && form.turno2Fin ? "Ejemplo: " + (fmtTurno12Local(armarTurno(form.turno2Inicio, form.turno2Fin))) : 'Déjalo vacío si no aplica segundo turno'}</div>
              </div>
              <div>
                <LBL>Tarea del turno 2</LBL>
                <input value={form.tarea2} onChange={e=>setForm({...form,tarea2:e.target.value})} placeholder="Ej: Entrega, cierre, inspección" style={SI}/>
              </div>
            </div>
          </div>

          {previewTurnos.length>0&&empSel&&obraSel&&(
            <div style={{background:"#f1f5f9",borderRadius:10,padding:14,marginBottom:14}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:6}}>Vista previa WhatsApp</div>
              <div style={{fontSize:13,color:"#1a1a2e",lineHeight:1.7,background:"#f8fafc",borderRadius:8,padding:"12px 14px"}}>
                <div>Hola <strong>{empSel.nombre}</strong>, has sido asignado a la obra <strong>{obraSel.proyecto}</strong> del cliente <strong>{obraSel.cliente}</strong>.</div>
                <div>Lugar: <strong>{obraSel.direccion||obraSel.ciudad}, {obraSel.ciudad}</strong></div>
                <div>Fecha: <strong>{fmtD(form.fecha) || form.fecha}</strong></div>
                <div style={{marginTop:8,fontWeight:600}}>Turnos asignados:</div>
                <ul style={{margin:"6px 0 0 18px",padding:0}}>
                  {previewTurnos.map((item,idx)=><li key={idx}><strong>{fmtTurno12Local(item.turno)}</strong> · {item.tarea}</li>)}
                </ul>
                <div style={{marginTop:8}}>Por favor confirma tu asistencia. <strong>INGEANCLAJES S.A.S</strong></div>
              </div>
              <div style={{fontSize:11,color:"#64748b",marginTop:8}}>+57 {empSel.tel}</div>
            </div>
          )}
          <div style={{display:"flex",gap:10}}>
            <button style={B("#4ade80","#0f2d1a")} onClick={guardar}>Guardar y enviar WhatsApp</button>
            <button style={B("#f1f5f9","#475569")} onClick={()=>setShowF(false)}>Cancelar</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:14,alignItems:"flex-end",marginBottom:20}}>
        <div><LBL>Filtrar por fecha</LBL><input type="date" value={fechaF} onChange={e=>setFechaF(e.target.value)} style={{...SI,width:"auto"}}/></div>
        <div style={{fontSize:13,color:"#64748b"}}>{dia.length} turno{dia.length!==1?"s":""} · {fmtD(fechaF)}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div style={CD}>
          <div style={ST}>Turnos del día</div>
          {dia.length===0?<div style={{textAlign:"center",color:"#94a3b8",fontSize:13,padding:"28px 0"}}>No hay turnos para esta fecha</div>
          :dia.map(h=>{const e=empleados.find(x=>x.id===h.empleadoId);const o=obras.find(x=>x.id===h.obraId);const idx=empleados.findIndex(x=>x.id===h.empleadoId);return(<div key={h.id} style={{background:"#f1f5f9",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><Av init={e?.avatar||"?"} color={PAL[idx%PAL.length]} size={34}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{e?.nombre}</div><div style={{fontSize:11,color:"#475569"}}>{e?.cargo}</div></div><button onClick={()=>setHorarios(p=>p.filter(x=>x.id!==h.id))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,width:24,height:24,cursor:"pointer",fontSize:14}}>×</button></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11,marginBottom:8}}>
              <div style={{background:"#ffffff",borderRadius:6,padding:"6px 10px"}}><div style={{color:"#64748b",marginBottom:2}}>Obra</div><div style={{color:"#1a1a2e",fontWeight:500}}>{o?.proyecto}</div><div style={{color:"#475569"}}>{o?.ciudad}</div></div>
              <div style={{background:"#ffffff",borderRadius:6,padding:"6px 10px"}}><div style={{color:"#64748b",marginBottom:2}}>Turno</div><div style={{color:"#cc0000",fontWeight:600}}>{fmtTurno12Local(h.turno)}</div><div style={{color:"#475569"}}>{h.tarea}</div></div>
            </div>
            <button onClick={()=>reenviarDiaEmpleado(h)} style={{...B("#e8f5ee","#166534"),width:"100%",justifyContent:"center",fontSize:12}}>Reenviar WhatsApp · +57 {e?.tel}</button>
          </div>);})}
        </div>
        <div style={CD}>
          <div style={ST}>Todos los turnos por obra</div>
          {obras.map(o=>{const hs=horarios.filter(h=>h.obraId===o.id);if(!hs.length)return null;return(<div key={o.id} style={{background:"#f1f5f9",borderRadius:10,padding:"12px 14px",marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{o.cliente}</div>
            <div style={{fontSize:11,color:"#475569",marginBottom:8}}>{o.proyecto}</div>
            {hs.map(h=>{const e=empleados.find(x=>x.id===h.empleadoId);return(<div key={h.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid #e2e8f0",fontSize:11}}><span style={{color:"#64748b",minWidth:88}}>{fmtD(h.fecha)}</span><span style={{color:"#1a1a2e",flex:1}}>{e?.nombre}</span><span style={{color:"#cc0000",minWidth:160}}>{fmtTurno12Local(h.turno)}</span><span style={{color:"#475569",flex:1.3}}>{h.tarea}</span></div>);})}
          </div>);})}
        </div>
      </div>
    </div>
  );
}

// ======================================================
// VENCIMIENTOS DE CERTIFICACIONES
// ======================================================

