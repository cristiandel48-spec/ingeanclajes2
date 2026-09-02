import Av from "../../components/ui/Av";
import AvisoFlujo from "../../components/AvisoFlujo";
import NuevoEmpleadoRapido from "../../components/NuevoEmpleadoRapido";
import SelectorEmpleados from "../../components/SelectorEmpleados";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useMemo, useState } from "react";
import { B, CD, PAL, SI, ST } from "../../styles/tokens";
import { fmtD, fmtL, today } from "../../lib/format";
import { abrirWhatsApp, normalizarCelular } from "../../lib/whatsapp";
import { puedeCrearPersonal } from "../../lib/permisos";
import { normalizarMayusculas } from "../../lib/normalizarEntrada";
import { resolverAutorGuardado } from "../../lib/autorAuditoria";
export default function Horarios({ctx}){
  const {obras,setObras,empleados,horarios,setHorarios,irAPantalla,membresia}=ctx;
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
  // Arranca sin nadie marcado. Antes venia preseleccionado el primero de la
  // lista y era facil asignarle el turno a quien no era.
  const FORM_VACIO={
    empleadoIds:[],
    obraId:firstObraId,
    fecha:today(),
    turno1Inicio:"07:00",
    turno1Fin:"17:00",
    tarea1:"",
    turno2Inicio:"",
    turno2Fin:"",
    tarea2:"",
  };
  const [formEscrito,setForm]=useState(FORM_VACIO);
  // Si a alguien lo dan de baja -o desaparece la obra- mientras el formulario
  // esta abierto, sale de la seleccion en vez de guardarse un turno de un id
  // que ya no existe.
  //
  // Se descarta al leer el formulario, no corrigiendo el estado despues: asi no
  // queda un render intermedio con el id fantasma todavia dentro, que es justo
  // el que podia alcanzar a guardar quien le diera al boton en ese momento.
  const form={
    ...formEscrito,
    empleadoIds:formEscrito.empleadoIds.filter(id=>empleados.some(e=>e.id===id)),
    obraId:obras.some(o=>o.id===formEscrito.obraId) ? formEscrito.obraId : firstObraId,
  };
  // {texto, ok}. Un fallo al abrir WhatsApp salia en verde igual que un envio
  // correcto, asi que se leia como si hubiera salido bien.
  const [notif,setNotif]=useState(null);
  // Cuando el turno se asigna a un grupo no se pueden abrir seis WhatsApp de
  // golpe -el navegador bloquea las ventanas y quedan avisos a medias-, asi que
  // los turnos quedan guardados y el envio se hace de a uno desde aqui.
  const [porAvisar,setPorAvisar]=useState([]);
  // Mensaje del dia listo para pegar en el grupo. Se muestra en pantalla.
  const [mensajeGrupo,setMensajeGrupo]=useState(null);
  const [copiado,setCopiado]=useState(false);
  const dia=horarios.filter(h=>h.fecha===fechaF);
  const obraSel=obras.find(o=>o.id===form.obraId);
  const idsDeLaObra = useMemo(() => {
    if (!obraSel) return [];
    const idsDirectos = Array.isArray(obraSel.empleados) ? obraSel.empleados : [];
    const idsHorarios = (horarios || []).filter(h => h.obraId === obraSel.id).map(h => h.empleadoId).filter(Boolean);
    return [...new Set([...idsDirectos, ...idsHorarios])];
  }, [obraSel, horarios]);
  const seleccionados=empleados.filter(e=>form.empleadoIds.includes(e.id));

  const armarTurno=(inicio,fin)=>{
    if(!inicio || !fin) return "";
    return (inicio) + " - " + (fin);
  };

  // Los turnos que se arman con el formulario, tal cual, sin repartirlos aun
  // entre las personas.
  const buildTurnos=(baseForm)=>{
    const configs = [
      {turno:armarTurno(baseForm.turno1Inicio, baseForm.turno1Fin), tarea:baseForm.tarea1 || baseForm.tarea2},
      {turno:armarTurno(baseForm.turno2Inicio, baseForm.turno2Fin), tarea:baseForm.tarea2 || baseForm.tarea1},
    ];
    return configs.filter(item=>item.turno && item.tarea);
  };

  // El mismo turno para cada persona marcada: es lo que evita repetir el
  // formulario una vez por trabajador.
  const buildTurnosPayload=(baseForm)=>{
    const turnos = buildTurnos(baseForm);
    return (baseForm.empleadoIds||[]).flatMap((empleadoId)=>
      turnos.map((item)=>({
        empleadoId,
        obraId: baseForm.obraId,
        fecha: baseForm.fecha,
        turno: item.turno,
        tarea: item.tarea,
      }))
    );
  };

  // El texto que le llega a una persona. Vive aparte porque lo usan dos cosas:
  // el boton que abre su WhatsApp y la exportacion para el envio automatico.
  const armarMensajePersonal=(e,o,f,turnos)=>{
    const fechaMsg = fmtD(f) || f;
    const detalle = turnos.map((item,idx)=>(idx+1) + ". " + (fmtTurno12Local(item.turno)) + (item.tarea ? " - " + (item.tarea) : "")).join("\n");
    // Las lineas llevan saltos de verdad. Antes se escribian escapados y
    // WhatsApp los mostraba tal cual: el mensaje llegaba como un bloque con
    // las barras a la vista.
    return [
      "Hola " + (e.nombre) + ", has sido asignado a la obra *" + (normalizarMayusculas(o.proyecto)) + "* del cliente *" + (normalizarMayusculas(o.cliente)) + "* para el día *" + (fechaMsg) + "* en *" + (o.direccion||o.ciudad) + "*.",
      "",
      "Turnos asignados:",
      detalle,
      "",
      "Por favor confirma tu asistencia.",
      "*INGEANCLAJES S.A.S*",
    ].join("\n");
  };

  const enviarWA=(eid,oid,f,turnosInfo=[])=>{
    const e=empleados.find(x=>x.id===eid);
    const o=obras.find(x=>x.id===oid);
    if(!e||!o||!turnosInfo.length) return;

    // Sin hora no se manda nada. Un mensaje que dice "has sido asignado" y deja
    // el renglon del turno en blanco no le sirve a nadie, y el trabajador
    // termina llamando a preguntar a que hora entra.
    const conHorario = turnosInfo.filter((item)=>String(item?.turno||"").trim());
    if(!conHorario.length){
      setNotif({ok:false, texto:
        `El turno de ${e.nombre} quedó sin horario, así que no se envió el mensaje. ` +
        "Bórralo y vuelve a asignarlo poniendo la hora de entrada y la de salida."});
      setTimeout(()=>setNotif(null),9000);
      return;
    }

    const msg = armarMensajePersonal(e,o,f,conHorario);
    const problema = abrirWhatsApp(e.tel, msg);
    setNotif(problema
      ? {ok:false, texto: e.nombre + ": " + problema + " El turno quedó guardado; avísale por otro medio."}
      : {ok:true, texto: "WhatsApp abierto para " + (e.nombre) + " · +" + normalizarCelular(e.tel)});
    setTimeout(()=>setNotif(null),8000);
  };

  const guardar=()=>{
    const payload = buildTurnosPayload(form);
    if(!payload.length) return;

    // Si a alguien del grupo ya se le habia asignado ese mismo turno en esa
    // obra y ese dia, no se duplica: al traer «el equipo de la obra» es normal
    // volver a marcar a quien ya estaba puesto.
    const nuevos = payload.filter(p=>!horarios.some(h=>
      h.empleadoId===p.empleadoId && h.obraId===p.obraId &&
      h.fecha===p.fecha && h.turno===p.turno
    ));
    const repetidos = payload.length - nuevos.length;

    if(!nuevos.length){
      setNotif({ok:false,texto:"Esas personas ya tenían ese turno asignado ese día. No se creó nada nuevo."});
      setTimeout(()=>setNotif(null),8000);
      return;
    }

    const autorActual = resolverAutorGuardado(ctx?.membresia);
    const ahoraIso = new Date().toISOString();

    setHorarios(p=>[
      ...p,
      ...nuevos.map((item,idx)=>({
        id:"H" + (Date.now()) + (idx),
        ...item,
        creadoPor: ctx?.membresia?.userId || null,
        creadoPorNombre: autorActual || "Administración",
        creadoEn: ahoraIso,
        modificadoPor: ctx?.membresia?.userId || null,
        modificadoPorNombre: autorActual,
        modificadoEn: ahoraIso,
      }))
    ]);

    // Los empleados asignados a turnos en esta obra viajan automáticamente al módulo de obras
    if(form.obraId && setObras){
      const idsNuevos = [...new Set(payload.map(n=>n.empleadoId).filter(Boolean))];
      if(idsNuevos.length > 0){
        setObras(prevObras => prevObras.map(o => {
          if(o.id !== form.obraId) return o;
          const actuales = Array.isArray(o.empleados) ? o.empleados : [];
          const combinados = [...new Set([...actuales, ...idsNuevos])];
          return { ...o, empleados: combinados };
        }));
      }
    }

    // Una sola persona: se abre su WhatsApp de una, como siempre. Un grupo:
    // quedan en la lista de avisos y se mandan de a uno.
    const ids=[...new Set(nuevos.map(n=>n.empleadoId))];
    if(ids.length===1){
      enviarWA(ids[0],form.obraId,form.fecha,nuevos.filter(n=>n.empleadoId===ids[0]));
    }else{
      setPorAvisar(ids.map((eid)=>({
        empleadoId:eid,
        obraId:form.obraId,
        fecha:form.fecha,
        turnos:nuevos.filter(n=>n.empleadoId===eid),
        enviado:false,
      })));
      setNotif({
        ok:true,
        texto:`${nuevos.length} turno(s) guardados para ${ids.length} personas.` +
          (repetidos?` Se omitieron ${repetidos} que ya estaban.`:"") +
          " Avísales abajo, uno por uno o copiando el horario del día para el grupo.",
      });
      setTimeout(()=>setNotif(null),12000);
    }

    setShowF(false);
    setForm({...FORM_VACIO, obraId:form.obraId, fecha:form.fecha});
  };

  const turnosBase = buildTurnos(form);
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

    // Cada dato con su rotulo y en su renglon. Antes iban el proyecto en
    // negrita y debajo "cliente · direccion" separados por un punto, y en el
    // grupo no habia forma de saber cual era la obra, cual el cliente y cual la
    // direccion: se leia como una sola linea de texto.
    const bloques=[...porObra.entries()].map(([obraId,turnos])=>{
      const o=obras.find(x=>x.id===obraId);
      const lugar=[o?.direccion,o?.ciudad].filter(Boolean).join(", ");
      const lineas=turnos.map((h)=>{
        const e=empleados.find(x=>x.id===h.empleadoId);
        return `• ${e?.nombre||"—"} · ${fmtTurno12Local(h.turno)} · ${h.tarea}`;
      });
      return [
        `📍 *OBRA:* ${normalizarMayusculas(o?.proyecto||"SIN OBRA")}`,
        o?.cliente ? `*CLIENTE:* ${normalizarMayusculas(o.cliente)}` : "",
        lugar ? `*DIRECCIÓN:* ${lugar}` : "",
        "",
        ...lineas,
      ].filter((linea,i)=>linea!=="" || i>0).join("\n");
    });

    return [
      `*TURNOS · ${fmtL(fechaF)}*`,
      "",
      ...bloques.flatMap((b)=>[b,""]),
      "Por favor confirmar asistencia.",
      "*INGEANCLAJES S.A.S*",
    ].join("\n");
  };

  // Saca un archivo con los avisos del dia para el envio automatico.
  //
  // No se le dan al script las llaves de la base: la app arma aqui los mensajes
  // ya escritos y el script solo los manda. Asi se puede abrir el archivo y ver
  // exactamente que le va a llegar a cada quien antes de que salga nada.
  const exportarAvisosDelDia=()=>{
    const porEmpleado=new Map();
    dia.forEach((h)=>{
      if(!String(h.turno||"").trim()) return;
      const clave=`${h.empleadoId}|${h.obraId}`;
      if(!porEmpleado.has(clave)) porEmpleado.set(clave,[]);
      porEmpleado.get(clave).push(h);
    });

    const avisos=[...porEmpleado.entries()].map(([clave,turnos])=>{
      const [eid,oid]=clave.split("|");
      const e=empleados.find(x=>x.id===eid);
      const o=obras.find(x=>x.id===oid);
      if(!e||!o) return null;
      const tel=normalizarCelular(e.tel);
      return tel ? {nombre:e.nombre, telefono:tel, mensaje:armarMensajePersonal(e,o,fechaF,turnos)} : null;
    }).filter(Boolean);

    const sinCelular=porEmpleado.size-avisos.length;
    if(!avisos.length){
      setNotif({ok:false,texto:"No hay avisos con celular válido para ese día."});
      setTimeout(()=>setNotif(null),7000);
      return;
    }

    const archivo=new Blob(
      [JSON.stringify({fecha:fechaF, generado:new Date().toISOString(), avisos}, null, 2)],
      {type:"application/json"},
    );
    const url=URL.createObjectURL(archivo);
    const enlace=document.createElement("a");
    enlace.href=url;
    enlace.download=`avisos-${fechaF}.json`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);

    setNotif({ok:true,texto:
      `Archivo descargado con ${avisos.length} aviso(s).` +
      (sinCelular?` Se dejaron fuera ${sinCelular} sin celular válido.`:"") +
      " Ejecuta el script de envío con ese archivo."});
    setTimeout(()=>setNotif(null),10000);
  };

  const copiarAlPortapapeles=async(texto)=>{
    try{
      await navigator.clipboard.writeText(texto);
      return true;
    }catch{
      // Sin permiso de portapapeles -o en una conexion sin cifrar- se hace a
      // la vieja usanza, que funciona en cualquier navegador.
      const area=document.createElement("textarea");
      area.value=texto;
      area.style.cssText="position:fixed;left:-9999px;top:0;";
      document.body.appendChild(area);
      area.select();
      const listo=document.execCommand("copy");
      area.remove();
      return listo;
    }
  };

  // El mensaje se ENSEÑA, no solo se copia.
  //
  // Antes el boton copiaba en silencio y soltaba un aviso pequeño que se iba
  // solo a los pocos segundos: quien lo usaba no se enteraba de que habia
  // pasado algo y volvia a pulsarlo. Ahora se abre el mensaje completo en
  // pantalla, ya copiado, y ademas se puede leer antes de pegarlo en el grupo
  // y copiarlo otra vez si hizo falta.
  const abrirHorarioDelDia=async()=>{
    if(!dia.length){
      setNotif({ok:false,texto:"No hay turnos ese día para compartir."});
      setTimeout(()=>setNotif(null),6000);
      return;
    }
    const mensaje=armarMensajeDelDia();
    setMensajeGrupo(mensaje);
    setCopiado(await copiarAlPortapapeles(mensaje));
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
      <H1 title="Horarios" subtitle="Asigna hasta 2 turnos por día a una persona o a un grupo entero, y avisa por WhatsApp" action={<button style={B("#f47c20")} onClick={()=>setShowF(!showF)}>+ Asignar turnos</button>}/>

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
            setForm((prev)=>({...prev,empleadoIds:[...new Set([...prev.empleadoIds,id])]}));
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
          {/* La obra va primero: de ella sale el atajo para marcar al equipo
              completo, que es lo que evita repetir el formulario por persona. */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            <div><LBL>Obra</LBL><select value={form.obraId} onChange={e=>setForm({...form,obraId:e.target.value})} style={SI}>{obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
            <div><LBL>Fecha</LBL><input type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})} style={SI}/></div>
          </div>

          <div style={{marginBottom:14}}>
            <LBL>¿A quiénes?</LBL>
            <SelectorEmpleados
              empleados={empleados}
              seleccionados={form.empleadoIds}
              onCambiar={(ids)=>setForm(prev=>({...prev,empleadoIds:ids}))}
              idsDeLaObra={idsDeLaObra}
              nombreObra={obraSel?.proyecto||""}
            />
            <div style={{fontSize:10.5,color:"#94a3b8",marginTop:5}}>
              Todos los marcados reciben el mismo turno, la misma obra y la misma tarea.
              Si alguno necesita algo distinto, asígnaselo aparte.
            </div>
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

          {turnosBase.length>0&&seleccionados.length>0&&obraSel&&(
            <div style={{background:"#f1f5f9",borderRadius:10,padding:14,marginBottom:14}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:6}}>
                Vista previa · le llega igual a {seleccionados.length===1?"la persona":`las ${seleccionados.length} personas`}, con su nombre
              </div>
              <div style={{fontSize:13,color:"#1a1a2e",lineHeight:1.7,background:"#f8fafc",borderRadius:8,padding:"12px 14px"}}>
                <div>Hola <strong>{seleccionados[0].nombre}</strong>, has sido asignado a la obra <strong>{obraSel.proyecto}</strong> del cliente <strong>{obraSel.cliente}</strong>.</div>
                <div>Lugar: <strong>{obraSel.direccion||obraSel.ciudad}, {obraSel.ciudad}</strong></div>
                <div>Fecha: <strong>{fmtD(form.fecha) || form.fecha}</strong></div>
                <div style={{marginTop:8,fontWeight:600}}>Turnos asignados:</div>
                <ul style={{margin:"6px 0 0 18px",padding:0}}>
                  {turnosBase.map((item,idx)=><li key={idx}><strong>{fmtTurno12Local(item.turno)}</strong> · {item.tarea}</li>)}
                </ul>
                <div style={{marginTop:8}}>Por favor confirma tu asistencia. <strong>INGEANCLAJES S.A.S</strong></div>
              </div>
              <div style={{fontSize:11,color:"#64748b",marginTop:8}}>
                Se van a crear <strong>{previewTurnos.length} turno{previewTurnos.length!==1?"s":""}</strong>
                {seleccionados.length>1 && <> · {seleccionados.map(e=>e.nombre.split(" ")[0]).join(", ")}</>}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <button
              style={{...B("#4ade80","#0f2d1a"),opacity:previewTurnos.length?1:0.5,cursor:previewTurnos.length?"pointer":"not-allowed"}}
              onClick={guardar}
              disabled={!previewTurnos.length}
            >
              {seleccionados.length>1?`Guardar turnos de ${seleccionados.length} personas`:"Guardar y enviar WhatsApp"}
            </button>
            <button style={B("#f1f5f9","#475569")} onClick={()=>setShowF(false)}>Cancelar</button>
            {!previewTurnos.length && (
              <span style={{fontSize:11,color:"#94a3b8"}}>
                {!seleccionados.length?"Marca al menos a una persona":"Falta la tarea del turno"}
              </span>
            )}
          </div>
        </div>
      )}
      {mensajeGrupo!==null&&(
        <div
          onClick={()=>setMensajeGrupo(null)}
          style={{position:"fixed",inset:0,zIndex:200,background:"rgba(9,11,16,.45)",
            display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
        >
          <div onClick={(e)=>e.stopPropagation()} style={{
            background:"#fff",borderRadius:14,padding:22,width:"100%",maxWidth:520,
            maxHeight:"88vh",display:"flex",flexDirection:"column",
            boxShadow:"0 18px 50px rgba(9,11,16,.28)",
          }}>
            <div style={{fontSize:15,fontWeight:700,color:"#1a1a2e"}}>Horario del día · para el grupo</div>
            <div style={{
              background:copiado?"#e8f5ee":"#fffaf0",
              border:"1px solid "+(copiado?"#166534":"#fde3c4"),
              color:copiado?"#166534":"#b54708",
              borderRadius:9,padding:"9px 12px",fontSize:12.5,lineHeight:1.5,margin:"11px 0 12px",
            }}>
              {copiado
                ? <><strong>Ya está copiado.</strong> Abre el grupo de WhatsApp y pega el mensaje (Ctrl+V, o mantén pulsado y «Pegar» en el celular).</>
                : <><strong>El navegador no dejó copiarlo solo.</strong> Selecciona el texto de abajo, cópialo con Ctrl+C y pégalo en el grupo.</>}
            </div>

            {/* Un textarea y no un div: se puede seleccionar y copiar a mano si
                el portapapeles falla, que es justo el caso de arriba. */}
            <textarea
              readOnly
              value={mensajeGrupo}
              onFocus={(e)=>e.target.select()}
              style={{...SI,flex:1,minHeight:210,resize:"vertical",lineHeight:1.6,
                fontSize:12.5,fontFamily:"inherit",background:"#f8fafc",whiteSpace:"pre-wrap"}}
            />

            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button
                onClick={async()=>{
                  const listo=await copiarAlPortapapeles(mensajeGrupo);
                  setCopiado(listo);
                }}
                style={{...B("#166534","#ffffff"),fontSize:12.5,fontWeight:700}}
              >{copiado?"Copiar otra vez":"Copiar mensaje"}</button>
              <button onClick={()=>setMensajeGrupo(null)} style={{...B("#f1f5f9","#475569"),fontSize:12.5}}>Cerrar</button>
              <div style={{marginLeft:"auto",alignSelf:"center",fontSize:11,color:"#94a3b8"}}>
                {dia.length} turno{dia.length!==1?"s":""} · {fmtD(fechaF)}
              </div>
            </div>
          </div>
        </div>
      )}

      {porAvisar.length>0&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #166534"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:4}}>
            <div style={ST}>Turnos guardados · {porAvisar.length} {porAvisar.length===1?"persona":"personas"}</div>
            <button onClick={()=>setPorAvisar([])} style={{...B("#f1f5f9","#475569"),fontSize:11.5,padding:"6px 12px"}}>Listo, cerrar</button>
          </div>

          {/* El mensaje al grupo va PRIMERO y en grande. Es un solo envio y
              resuelve el dia entero; la lista de abajo es para el caso suelto.
              Antes estaba al reves y parecia que tocaba ir uno por uno. */}
          <div style={{fontSize:11.5,color:"#64748b",marginBottom:10,lineHeight:1.5}}>
            Los turnos <strong>ya quedaron guardados</strong>. Lo más rápido es mandar
            <strong> un solo mensaje al grupo</strong> con todos los turnos del día:
          </div>
          <button
            onClick={abrirHorarioDelDia}
            style={{...B("#166534","#ffffff"),fontSize:13,fontWeight:700,width:"100%",justifyContent:"center",padding:"11px 16px"}}
          >
            📋 Enviar horario al grupo · un solo mensaje
          </button>

          {/* Envio automatico: la app saca el archivo, el script lo manda. */}
          <button
            onClick={exportarAvisosDelDia}
            title="Descarga los avisos del día para enviarlos con el script automático"
            style={{...B("#f1f5f9","#475569"),fontSize:12,width:"100%",justifyContent:"center",marginTop:8}}
          >
            ⬇ Descargar avisos para el envío automático
          </button>

          <div style={{display:"flex",alignItems:"center",gap:10,margin:"16px 0 10px"}}>
            <div style={{flex:1,height:1,background:"#e2e8f0"}}/>
            <span style={{fontSize:10.5,color:"#94a3b8"}}>o avisa a alguien en particular</span>
            <div style={{flex:1,height:1,background:"#e2e8f0"}}/>
          </div>
          <div style={{fontSize:10.5,color:"#94a3b8",marginBottom:10,lineHeight:1.5}}>
            WhatsApp solo deja abrir un chat a la vez, así que por aquí se manda de a uno.
          </div>
          {porAvisar.map((p)=>{
            const e=empleados.find(x=>x.id===p.empleadoId);
            const idx=empleados.findIndex(x=>x.id===p.empleadoId);
            return(
              <div key={p.empleadoId} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f1f5f9"}}>
                <Av init={e?.avatar||"?"} color={PAL[idx%PAL.length]} size={30}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12.5,fontWeight:600,color:"#1a1a2e"}}>{e?.nombre}</div>
                  <div style={{fontSize:10.5,color:"#64748b"}}>
                    {p.turnos.map((t)=>fmtTurno12Local(t.turno)).join(" · ")}
                  </div>
                </div>
                <button
                  onClick={()=>{
                    enviarWA(p.empleadoId,p.obraId,p.fecha,p.turnos);
                    setPorAvisar(prev=>prev.map(x=>x.empleadoId===p.empleadoId?{...x,enviado:true}:x));
                  }}
                  style={{...(p.enviado?B("#f1f5f9","#475569"):B("#e8f5ee","#166534")),fontSize:11.5,padding:"6px 12px",flexShrink:0}}
                >
                  {p.enviado?"✓ Enviado · reenviar":"Avisar por WhatsApp"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div style={{display:"flex",gap:14,alignItems:"flex-end",marginBottom:20}}>
        <div><LBL>Filtrar por fecha</LBL><input type="date" value={fechaF} onChange={e=>setFechaF(e.target.value)} style={{...SI,width:"auto"}}/></div>
        <div style={{fontSize:13,color:"#64748b"}}>{dia.length} turno{dia.length!==1?"s":""} · {fmtD(fechaF)}</div>
        <button
          onClick={abrirHorarioDelDia}
          disabled={!dia.length}
          title="Arma el mensaje con todos los turnos del día para pegarlo en el grupo"
          style={{...B("#166534","#ffffff"),fontSize:12.5,fontWeight:700,opacity:dia.length?1:0.45}}
        >
          📋 Enviar horario al grupo
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
              {/* Un turno sin hora se marca en la tarjeta. Antes salia un hueco
                  en blanco y parecia un problema de la pantalla. */}
              <div style={{background:"#ffffff",borderRadius:6,padding:"6px 10px"}}><div style={{color:"#64748b",marginBottom:2}}>Turno</div>{String(h.turno||"").trim() ? (<><div style={{color:"#cc0000",fontWeight:600}}>{fmtTurno12Local(h.turno)}</div><div style={{color:"#475569"}}>{h.tarea}</div></>) : (<div style={{color:"#b54708",fontWeight:600}}>Sin horario · bórralo y vuelve a asignarlo</div>)}</div>
            </div>
            <button
              onClick={()=>reenviarDiaEmpleado(h)}
              disabled={!String(h.turno||"").trim()}
              title={String(h.turno||"").trim() ? "" : "Este turno no tiene hora, no hay nada que avisar"}
              style={{...B("#e8f5ee","#166534"),width:"100%",justifyContent:"center",fontSize:12,
                opacity:String(h.turno||"").trim()?1:0.45,
                cursor:String(h.turno||"").trim()?"pointer":"not-allowed"}}
            >Reenviar WhatsApp · +57 {e?.tel}</button>
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

