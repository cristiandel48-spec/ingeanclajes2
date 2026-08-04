import Av from "../../components/ui/Av";
import AvisoFlujo from "../../components/AvisoFlujo";
import NuevoEmpleadoRapido from "../../components/NuevoEmpleadoRapido";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useEffect, useState } from "react";
import { B, CD, PAL, SI, ST } from "../../styles/tokens";
import { fmtD, fmtL, today } from "../../lib/format";
import { abrirWhatsApp, normalizarCelular } from "../../lib/whatsapp";
import { puedeCrearPersonal } from "../../lib/permisos";
export default function Horarios({ctx}){
  const {obras,empleados,horarios,setHorarios,irAPantalla,membresia}=ctx;
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

  const [nuevoEmp,setNuevoEmp]=useState(false);
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
  // {texto, ok}. Un fallo al abrir WhatsApp salia en verde igual que un envio
  // correcto, asi que se leia como si hubiera salido bien.
  const [notif,setNotif]=useState(null);
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
    // Las lineas llevan saltos de verdad. Antes se escribian escapados y
    // WhatsApp los mostraba tal cual: el mensaje llegaba como un bloque con
    // las barras a la vista.
    const msg = [
      "Hola " + (e.nombre) + ", has sido asignado a la obra *" + (o.proyecto) + "* del cliente *" + (o.cliente) + "* para el día *" + (fechaMsg) + "* en *" + (o.direccion||o.ciudad) + "*.",
      "",
      "Turnos asignados:",
      detalleTurnos,
      "",
      "Por favor confirma tu asistencia.",
      "*INGEANCLAJES S.A.S*",
    ].join("\n");

    const problema = abrirWhatsApp(e.tel, msg);
    setNotif(problema
      ? {ok:false, texto: e.nombre + ": " + problema + " El turno quedó guardado; avísale por otro medio."}
      : {ok:true, texto: "WhatsApp abierto para " + (e.nombre) + " · +" + normalizarCelular(e.tel)});
    setTimeout(()=>setNotif(null),8000);
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

  // Los turnos tambien se comparten en un grupo de WhatsApp, y a un grupo no
  // se puede escribir desde el sistema: ni el enlace wa.me ni la API oficial
  // de WhatsApp admiten grupos. Asi que se arma el mensaje del dia y se deja
  // en el portapapeles, para pegarlo de un toque.
  const armarMensajeDelDia=()=>{
    const porObra=new Map();
    dia.forEach((h)=>{
      if(!porObra.has(h.obraId)) porObra.set(h.obraId,[]);
      porObra.get(h.obraId).push(h);
    });

    const bloques=[...porObra.entries()].map(([obraId,turnos])=>{
      const o=obras.find(x=>x.id===obraId);
      const donde=[o?.cliente,o?.direccion||o?.ciudad].filter(Boolean).join(" · ");
      const lineas=turnos.map((h)=>{
        const e=empleados.find(x=>x.id===h.empleadoId);
        return `• ${e?.nombre||"—"} · ${fmtTurno12Local(h.turno)} · ${h.tarea}`;
      });
      return [`*${o?.proyecto||"Obra"}*${donde?`\n${donde}`:""}`,...lineas].join("\n");
    });

    return [
      `*TURNOS · ${fmtL(fechaF)}*`,
      "",
      ...bloques.flatMap((b)=>[b,""]),
      "Por favor confirmar asistencia.",
      "*INGEANCLAJES S.A.S*",
    ].join("\n");
  };

  const copiarHorarioDelDia=async()=>{
    if(!dia.length){
      setNotif({ok:false,texto:"No hay turnos ese día para copiar."});
      setTimeout(()=>setNotif(null),6000);
      return;
    }
    const mensaje=armarMensajeDelDia();
    try{
      await navigator.clipboard.writeText(mensaje);
      setNotif({ok:true,texto:`Horario copiado (${dia.length} turno(s)). Pégalo en el grupo de WhatsApp.`});
    }catch{
      // Sin permiso de portapapeles -o en una conexion sin cifrar- se hace a
      // la vieja usanza, que funciona en cualquier navegador.
      const area=document.createElement("textarea");
      area.value=mensaje;
      area.style.cssText="position:fixed;left:-9999px;top:0;";
      document.body.appendChild(area);
      area.select();
      const listo=document.execCommand("copy");
      area.remove();
      setNotif(listo
        ? {ok:true,texto:`Horario copiado (${dia.length} turno(s)). Pégalo en el grupo de WhatsApp.`}
        : {ok:false,texto:"El navegador no dejó copiar. Selecciona los turnos a mano."});
    }
    setTimeout(()=>setNotif(null),8000);
  };

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

      {empleados.length===0 && (
        <AvisoFlujo
          tono="falta"
          titulo="Todavía no hay empleados para asignar"
          accion={puedeCrearPersonal(membresia) && !nuevoEmp ? (
            <button onClick={()=>setNuevoEmp(true)} style={{...B("#cc0000"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}>
              + Registrar trabajador
            </button>
          ) : (
            <button onClick={()=>irAPantalla("nomina")} style={{...B("#f47c20"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}>
              Ir a Nómina
            </button>
          )}
        >
          Regístralo aquí mismo con lo básico —nombre, cargo, cédula y celular— y podrás asignarle
          turnos de inmediato. El salario y el contrato los completa Nómina después.
        </AvisoFlujo>
      )}

      {nuevoEmp && (
        <NuevoEmpleadoRapido
          ctx={ctx}
          onCerrar={()=>setNuevoEmp(false)}
          onCreado={(id,info)=>{
            setNuevoEmp(false);
            setForm((prev)=>({...prev,empleadoId:id}));
            window.alert(
              (info?.reactivado ? `${info.nombre} se reactivó.` : `${info?.nombre} quedó registrado.`) +
              "\n\nYa está seleccionado para asignarle el turno. Nómina revisará su salario y contrato."
            );
          }}
        />
      )}

      {obras.length===0 && (
        <AvisoFlujo
          tono="falta"
          titulo="Todavía no hay obras a las cuales asignar turnos"
          accion={
            <button onClick={()=>irAPantalla("obras")} style={{...B("#f47c20"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}>
              Ir a Obras
            </button>
          }
        >
          Crea primero la obra en <strong>Ejecución de obra</strong>. El WhatsApp que le llega al
          trabajador usa el nombre del proyecto y la dirección de la obra.
        </AvisoFlujo>
      )}

      {empleados.length>0 && obras.length>0 && (
        <AvisoFlujo
          tono="info"
          titulo="Para qué sirve asignar el turno aquí"
          accion={puedeCrearPersonal(membresia) && !nuevoEmp ? (
            <button onClick={()=>setNuevoEmp(true)} style={{...B("#f1f5f9","#475569"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}>
              + Registrar trabajador
            </button>
          ) : null}
        >
          Hace tres cosas de una sola vez: le <strong>avisa al trabajador por WhatsApp</strong>,
          cuenta los <strong>días trabajados</strong> que se le cargan a esa obra en su pestaña de
          Nómina, y llena la <strong>columna de turnos</strong> del informe de actividades.
          <div style={{marginTop:5}}>
            ¿No aparece la persona en la lista? Regístrala con el botón de arriba.
            ¿No aparece la obra? Créala en <strong>Ejecución de obra</strong>.
            Y recuerda asignarla también en la pestaña «Personal» de esa obra, que es de donde el
            informe saca quién estuvo.
          </div>
        </AvisoFlujo>
      )}

      {notif&&(
        <div style={{
          background: notif.ok?"#e8f5ee":"#fffaf0",
          border: "1px solid " + (notif.ok?"#166534":"#fde3c4"),
          color: notif.ok?"#166534":"#b54708",
          borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,lineHeight:1.5,
        }}>{notif.texto}</div>
      )}
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
        <button
          onClick={copiarHorarioDelDia}
          disabled={!dia.length}
          title="Arma el mensaje con todos los turnos del día para pegarlo en el grupo"
          style={{...B("#e8f5ee","#166534"),fontSize:12.5,opacity:dia.length?1:0.5}}
        >
          📋 Copiar horario del día
        </button>
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

