import Av from "../../components/ui/Av";
import NuevoEmpleadoRapido from "../../components/NuevoEmpleadoRapido";
import SelectorEmpleados from "../../components/SelectorEmpleados";
import {
  Button, Card, Callout, EmptyState, Input, Lista, ListRow,
  PageHeader, Sheet, StatusPill, Toolbar, EspacioToolbar,
} from "../../components/ui";
import { ESPACIO, TIPO } from "../../styles/designTokens";
import { useMemo, useState } from "react";
import { PAL } from "../../styles/tokens";
import { fmtD, fmtL, today } from "../../lib/format";
import { abrirWhatsApp, normalizarCelular } from "../../lib/whatsapp";
import { puedeCrearPersonal } from "../../lib/permisos";
import { normalizarMayusculas } from "../../lib/normalizarEntrada";
import { resolverAutorGuardado } from "../../lib/autorAuditoria";
import { useIsMobile } from "../../hooks/useMediaQuery";

// Aire debajo de cada bloque. El kit no lo trae: lo pone quien coloca la pieza.
const SEPARA = { marginBottom: ESPACIO.lg };

// Recuadro tenue para agrupar campos dentro de una tarjeta, del mismo tono que
// usa el Dashboard para sus bloques de alertas.
const PANEL = {
  background: "var(--surface-subtle)",
  border: "1px solid var(--separator)",
  borderRadius: 12,
  padding: "12px 14px",
};

// Cabecera de una tarjeta: titulo a la izquierda y, si hay, una accion a la
// derecha. La misma que usa el Dashboard, para que las dos pantallas se lean
// igual.
function CabeceraCard({ titulo, descripcion, accion }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap",
      gap: ESPACIO.md, paddingBottom: ESPACIO.md, marginBottom: ESPACIO.md,
      borderBottom: "1px solid var(--separator)",
    }}>
      <div style={{ minWidth: 0, flex: "1 1 170px" }}>
        <h2 style={{ ...TIPO.headline, color: "var(--text-primary)", margin: 0 }}>{titulo}</h2>
        {descripcion && (
          <div style={{ ...TIPO.caption, fontWeight: 400, color: "var(--text-tertiary)", marginTop: 2 }}>
            {descripcion}
          </div>
        )}
      </div>
      {accion}
    </div>
  );
}

export default function Horarios({ctx}){
  const isMobile = useIsMobile();
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
        creadoPorNombre: autorActual || "Camila Sepúlveda",
        creadoEn: ahoraIso,
        modificadoPor: ctx?.membresia?.userId || null,
        modificadoPorNombre: autorActual || "Camila Sepúlveda",
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
  // Con turnos recien guardados sin avisar, lo que toca hacer es avisarles.
  const avisarEsLoSiguiente = porAvisar.length > 0;

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
    <div
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "14px 16px 28px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <PageHeader
        eyebrow="Asignación de turnos"
        titulo="Horarios de obra"
        subtitulo="Asigna turnos por día a trabajadores o grupos y avísales por WhatsApp"
        acciones={
          <Button
            // Solo una accion principal a la vez: con el formulario abierto el
            // boton pasa a cerrarlo, y con turnos recien guardados lo urgente
            // es avisarle a la gente, no asignar otro.
            variante={showF || avisarEsLoSiguiente ? "secondary" : "primary"}
            icono={showF ? "cerrar" : "mas"}
            onClick={() => setShowF(!showF)}
          >
            {showF ? "Cerrar" : "Asignar turnos"}
          </Button>
        }
      />

      {empleados.length===0 && (
        <Callout tono="aviso" titulo="Todavía no hay empleados para asignar" style={SEPARA}>
          Regístralo aquí mismo con lo básico —nombre, cargo, cédula y celular— y podrás asignarle
          turnos de inmediato. El salario y el contrato se completan después en Personal.
          <div style={{marginTop:ESPACIO.sm}}>
            {puedeCrearPersonal(membresia) && !nuevoEmp ? (
              <Button variante="secondary" tam="sm" icono="mas" onClick={()=>setNuevoEmp(true)}>
                Registrar trabajador
              </Button>
            ) : (
              <Button variante="secondary" tam="sm" iconoDerecha="flechaDer" onClick={()=>irAPantalla("nomina")}>
                Ir a Personal
              </Button>
            )}
          </div>
        </Callout>
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
              "\n\nYa está seleccionado para asignarle el turno. En Personal se le completan salario y contrato."
            );
          }}
        />
      )}

      {obras.length===0 && (
        <Callout tono="aviso" titulo="Todavía no hay obras a las cuales asignar turnos" style={SEPARA}>
          Crea primero la obra en <strong>Ejecución de obra</strong>. El WhatsApp que le llega al
          trabajador usa el nombre del proyecto y la dirección de la obra.
          <div style={{marginTop:ESPACIO.sm}}>
            <Button variante="secondary" tam="sm" iconoDerecha="flechaDer" onClick={()=>irAPantalla("obras")}>
              Ir a Obras
            </Button>
          </div>
        </Callout>
      )}

      {empleados.length>0 && obras.length>0 && (
        <Callout tono="info" titulo="Para qué sirve asignar el turno aquí" style={SEPARA}>
          Hace tres cosas de una sola vez: le <strong>avisa al trabajador por WhatsApp</strong>,
          cuenta los <strong>días trabajados</strong> que se le cargan a esa obra, y llena la
          <strong> columna de turnos</strong> del informe de actividades.
          <div style={{marginTop:ESPACIO.xs}}>
            ¿No aparece la obra? Créala en <strong>Ejecución de obra</strong>. Y recuerda asignarla
            también en la pestaña «Personal» de esa obra, que es de donde el informe saca quién
            estuvo.
          </div>
          {puedeCrearPersonal(membresia) && !nuevoEmp && (
            <div style={{marginTop:ESPACIO.sm}}>
              <Button variante="secondary" tam="sm" icono="mas" onClick={()=>setNuevoEmp(true)}>
                Registrar trabajador
              </Button>
            </div>
          )}
        </Callout>
      )}

      {notif&&(
        <Callout tono={notif.ok ? "exito" : "peligro"} style={SEPARA}>{notif.texto}</Callout>
      )}
      {showF&&(
        <Card ajustado style={SEPARA}>
          <CabeceraCard
            titulo="Nuevo horario"
            descripcion="Al guardar se le avisa por WhatsApp a cada persona marcada."
          />
          {/* La obra va primero: de ella sale el atajo para marcar al equipo
              completo, que es lo que evita repetir el formulario por persona. */}
          <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "1fr 1fr",gap:ESPACIO.md,marginBottom:ESPACIO.lg}}>
            <Input
              label="Obra"
              como="select"
              value={form.obraId}
              onChange={e=>setForm({...form,obraId:e.target.value})}
            >
              {obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}
            </Input>
            <Input
              label="Fecha"
              type="date"
              value={form.fecha}
              onChange={e=>setForm({...form,fecha:e.target.value})}
            />
          </div>

          <div style={{marginBottom:ESPACIO.lg}}>
            <div className="ui-label">¿A quiénes?</div>
            <SelectorEmpleados
              empleados={empleados}
              seleccionados={form.empleadoIds}
              onCambiar={(ids)=>setForm(prev=>({...prev,empleadoIds:ids}))}
              idsDeLaObra={idsDeLaObra}
              nombreObra={obraSel?.proyecto||""}
            />
            <div className="ui-help">
              Todos los marcados reciben el mismo turno, la misma obra y la misma tarea.
              Si alguno necesita algo distinto, asígnaselo aparte.
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "1fr 1fr",gap:ESPACIO.md,marginBottom:ESPACIO.lg}}>
            <div style={PANEL}>
              <div style={{...TIPO.eyebrow,color:"var(--text-tertiary)",marginBottom:ESPACIO.md}}>Turno 1</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:ESPACIO.md,marginBottom:ESPACIO.sm}}>
                <Input label="Desde" type="time" value={form.turno1Inicio} onChange={e=>setForm({...form,turno1Inicio:e.target.value})}/>
                <Input label="Hasta" type="time" value={form.turno1Fin} onChange={e=>setForm({...form,turno1Fin:e.target.value})}/>
              </div>
              <Input
                label="Tarea del turno 1"
                value={form.tarea1}
                onChange={e=>setForm({...form,tarea1:e.target.value})}
                placeholder="Ej: Instalación anclajes"
                ayuda={`Le llega como «${fmtTurno12Local(armarTurno(form.turno1Inicio, form.turno1Fin))}»`}
              />
            </div>
            <div style={PANEL}>
              <div style={{...TIPO.eyebrow,color:"var(--text-tertiary)",marginBottom:ESPACIO.md}}>Turno 2 · opcional</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:ESPACIO.md,marginBottom:ESPACIO.sm}}>
                <Input label="Desde" type="time" value={form.turno2Inicio} onChange={e=>setForm({...form,turno2Inicio:e.target.value})}/>
                <Input label="Hasta" type="time" value={form.turno2Fin} onChange={e=>setForm({...form,turno2Fin:e.target.value})}/>
              </div>
              <Input
                label="Tarea del turno 2"
                value={form.tarea2}
                onChange={e=>setForm({...form,tarea2:e.target.value})}
                placeholder="Ej: Entrega, cierre, inspección"
                ayuda={form.turno2Inicio && form.turno2Fin
                  ? `Le llega como «${fmtTurno12Local(armarTurno(form.turno2Inicio, form.turno2Fin))}»`
                  : "Déjalo vacío si no hay segundo turno"}
              />
            </div>
          </div>

          {turnosBase.length>0&&seleccionados.length>0&&obraSel&&(
            <div style={{...PANEL,marginBottom:ESPACIO.lg}}>
              <div style={{...TIPO.caption,fontWeight:400,color:"var(--text-tertiary)",marginBottom:ESPACIO.sm}}>
                Vista previa · le llega igual a {seleccionados.length===1?"la persona":`las ${seleccionados.length} personas`}, con su nombre
              </div>
              <div style={{
                ...TIPO.callout,color:"var(--text-primary)",lineHeight:1.7,
                background:"var(--surface)",border:"1px solid var(--separator)",
                borderRadius:10,padding:"12px 14px",
              }}>
                <div>Hola <strong>{seleccionados[0].nombre}</strong>, has sido asignado a la obra <strong>{obraSel.proyecto}</strong> del cliente <strong>{obraSel.cliente}</strong>.</div>
                <div>Lugar: <strong>{obraSel.direccion||obraSel.ciudad}, {obraSel.ciudad}</strong></div>
                <div>Fecha: <strong>{fmtD(form.fecha) || form.fecha}</strong></div>
                <div style={{marginTop:ESPACIO.sm,fontWeight:600}}>Turnos asignados:</div>
                <ul style={{margin:"6px 0 0 18px",padding:0}}>
                  {turnosBase.map((item,idx)=><li key={idx}><strong>{fmtTurno12Local(item.turno)}</strong> · {item.tarea}</li>)}
                </ul>
                <div style={{marginTop:ESPACIO.sm}}>Por favor confirma tu asistencia. <strong>INGEANCLAJES S.A.S</strong></div>
              </div>
              <div style={{...TIPO.caption,fontWeight:400,color:"var(--text-tertiary)",marginTop:ESPACIO.sm}}>
                Se van a crear <strong>{previewTurnos.length} turno{previewTurnos.length!==1?"s":""}</strong>
                {seleccionados.length>1 && <> · {seleccionados.map(e=>e.nombre.split(" ")[0]).join(", ")}</>}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:ESPACIO.sm,alignItems:"center",flexWrap:"wrap"}}>
            <Button variante="primary" onClick={guardar} disabled={!previewTurnos.length}>
              {seleccionados.length>1?`Guardar turnos de ${seleccionados.length} personas`:"Guardar y enviar WhatsApp"}
            </Button>
            <Button variante="secondary" onClick={()=>setShowF(false)}>Cancelar</Button>
            {!previewTurnos.length && (
              <span style={{...TIPO.caption,fontWeight:400,color:"var(--text-tertiary)"}}>
                {!seleccionados.length?"Marca al menos a una persona":"Falta la tarea del turno"}
              </span>
            )}
          </div>
        </Card>
      )}
      {mensajeGrupo!==null&&(
        <Sheet
          onCerrar={()=>setMensajeGrupo(null)}
          titulo="Horario del día · para el grupo"
          subtitulo={`${dia.length} turno${dia.length!==1?"s":""} · ${fmtD(fechaF)}`}
          pie={
            <>
              <Button variante="secondary" onClick={()=>setMensajeGrupo(null)}>Cerrar</Button>
              <Button
                variante="primary"
                onClick={async()=>{
                  const listo=await copiarAlPortapapeles(mensajeGrupo);
                  setCopiado(listo);
                }}
              >
                {copiado?"Copiar otra vez":"Copiar mensaje"}
              </Button>
            </>
          }
        >
          <Callout tono={copiado?"exito":"aviso"} style={{marginBottom:ESPACIO.md}}>
            {copiado
              ? <><strong>Ya está copiado.</strong> Abre el grupo de WhatsApp y pega el mensaje (Ctrl+V, o mantén pulsado y «Pegar» en el celular).</>
              : <><strong>El navegador no dejó copiarlo solo.</strong> Selecciona el texto de abajo, cópialo con Ctrl+C y pégalo en el grupo.</>}
          </Callout>

          {/* Un textarea y no un div: se puede seleccionar y copiar a mano si
              el portapapeles falla, que es justo el caso de arriba. */}
          <textarea
            readOnly
            value={mensajeGrupo}
            onFocus={(e)=>e.target.select()}
            className="ui-input"
            style={{height:"auto",minHeight:210,padding:"10px 12px",resize:"vertical",
              lineHeight:1.6,whiteSpace:"pre-wrap",background:"var(--surface-subtle)"}}
          />
        </Sheet>
      )}

      {porAvisar.length>0&&(
        <Card ajustado style={SEPARA}>
          <CabeceraCard
            titulo={`Turnos guardados · ${porAvisar.length} ${porAvisar.length===1?"persona":"personas"}`}
            descripcion="Ya quedaron guardados. Falta avisarle a la gente."
            accion={<Button variante="tertiary" tam="sm" onClick={()=>setPorAvisar([])}>Listo, cerrar</Button>}
          />

          {/* El mensaje al grupo va PRIMERO y en grande. Es un solo envio y
              resuelve el dia entero; la lista de abajo es para el caso suelto.
              Antes estaba al reves y parecia que tocaba ir uno por uno. */}
          <div style={{display:"grid",gap:ESPACIO.sm,marginBottom:ESPACIO.lg}}>
            <Button variante="primary" bloque icono="documento" onClick={abrirHorarioDelDia}>
              Enviar horario al grupo · un solo mensaje
            </Button>
            {/* Envio automatico: la app saca el archivo, el script lo manda. */}
            <Button
              variante="secondary"
              bloque
              icono="descargar"
              onClick={exportarAvisosDelDia}
              title="Descarga los avisos del día para enviarlos con el script automático"
            >
              Descargar avisos para el envío automático
            </Button>
          </div>

          <div style={{display:"flex",alignItems:"center",gap:ESPACIO.sm,marginBottom:ESPACIO.xs}}>
            <div style={{flex:1,height:1,background:"var(--separator)"}}/>
            <span style={{...TIPO.caption,fontWeight:400,color:"var(--text-tertiary)"}}>o avisa a alguien en particular</span>
            <div style={{flex:1,height:1,background:"var(--separator)"}}/>
          </div>
          <div style={{...TIPO.caption,fontWeight:400,color:"var(--text-tertiary)",textAlign:"center"}}>
            WhatsApp solo deja abrir un chat a la vez, así que por aquí se manda de a uno.
          </div>

          <Lista>
            {porAvisar.map((p)=>{
              const e=empleados.find(x=>x.id===p.empleadoId);
              const idx=empleados.findIndex(x=>x.id===p.empleadoId);
              return(
                <ListRow
                  key={p.empleadoId}
                  izquierda={<Av init={e?.avatar||"?"} color={PAL[idx%PAL.length]} size={30}/>}
                  titulo={e?.nombre || "—"}
                  meta={p.turnos.map((t)=>fmtTurno12Local(t.turno)).join(" · ")}
                  derecha={
                    <Button
                      variante={p.enviado?"tertiary":"secondary"}
                      tam="sm"
                      icono={p.enviado?"check":undefined}
                      onClick={()=>{
                        enviarWA(p.empleadoId,p.obraId,p.fecha,p.turnos);
                        setPorAvisar(prev=>prev.map(x=>x.empleadoId===p.empleadoId?{...x,enviado:true}:x));
                      }}
                    >
                      {p.enviado?"Enviado · reenviar":"Avisar"}
                    </Button>
                  }
                />
              );
            })}
          </Lista>
        </Card>
      )}

      <Toolbar>
        <Input
          type="date"
          value={fechaF}
          onChange={e=>setFechaF(e.target.value)}
          aria-label="Filtrar por fecha"
          wrapStyle={{flex:"0 0 auto"}}
          style={{width:"auto"}}
        />
        <span style={{...TIPO.footnote,fontWeight:400,color:"var(--text-tertiary)"}}>
          {dia.length} turno{dia.length!==1?"s":""} · {fmtD(fechaF)}
        </span>
        <EspacioToolbar/>
        <Button
          variante="secondary"
          icono="documento"
          onClick={abrirHorarioDelDia}
          disabled={!dia.length}
          title="Arma el mensaje con todos los turnos del día para pegarlo en el grupo"
        >
          Enviar horario al grupo
        </Button>
      </Toolbar>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:ESPACIO.lg,alignItems:"start"}}>
        <Card ajustado>
          <CabeceraCard titulo="Turnos del día" descripcion={fmtD(fechaF)}/>
          {dia.length===0 ? (
            <EmptyState
              icono="calendario"
              titulo="No hay turnos para esta fecha"
              texto="Elige otro día arriba, o asigna el primer turno de hoy."
            />
          ) : (
            <Lista>
              {dia.map(h=>{
                const e=empleados.find(x=>x.id===h.empleadoId);
                const o=obras.find(x=>x.id===h.obraId);
                const idx=empleados.findIndex(x=>x.id===h.empleadoId);
                const conHora=Boolean(String(h.turno||"").trim());
                return(
                  <ListRow
                    key={h.id}
                    izquierda={<Av init={e?.avatar||"?"} color={PAL[idx%PAL.length]} size={34}/>}
                    titulo={e?.nombre || "—"}
                    meta={<>{o?.proyecto || "Sin obra"}{o?.ciudad ? ` · ${o.ciudad}` : ""}<br/>{h.tarea || "Sin tarea"}</>}
                    derecha={
                      // Un turno sin hora se marca en la fila. Antes salia un
                      // hueco en blanco y parecia un problema de la pantalla.
                      conHora
                        ? <StatusPill tono="acento">{fmtTurno12Local(h.turno)}</StatusPill>
                        : <StatusPill tono="peligro">Sin horario</StatusPill>
                    }
                    acciones={
                      <>
                        <Button
                          variante="tertiary"
                          tam="sm"
                          onClick={()=>reenviarDiaEmpleado(h)}
                          disabled={!conHora}
                          title={conHora ? `Reenviar WhatsApp · +57 ${e?.tel||""}` : "Este turno no tiene hora, no hay nada que avisar"}
                        >
                          Reenviar
                        </Button>
                        <Button
                          variante="tertiary"
                          tam="sm"
                          soloIcono
                          icono="papelera"
                          onClick={()=>setHorarios(p=>p.filter(x=>x.id!==h.id))}
                          aria-label={`Quitar el turno de ${e?.nombre || "esta persona"}`}
                          title="Quitar este turno"
                        />
                      </>
                    }
                  />
                );
              })}
            </Lista>
          )}
        </Card>

        <Card ajustado>
          <CabeceraCard titulo="Todos los turnos por obra" descripcion="El historial completo, agrupado por proyecto."/>
          {obras.every(o=>!horarios.some(h=>h.obraId===o.id)) ? (
            <EmptyState
              icono="obra"
              titulo="Ninguna obra tiene turnos todavía"
              texto="Los turnos que asignes van quedando aquí, agrupados por obra."
            />
          ) : obras.map(o=>{
            const hs=horarios.filter(h=>h.obraId===o.id);
            if(!hs.length) return null;
            return(
              <div key={o.id} style={{...PANEL,marginBottom:ESPACIO.md}}>
                <div style={{...TIPO.footnote,fontWeight:600,color:"var(--text-primary)"}}>{o.cliente}</div>
                <div style={{...TIPO.caption,fontWeight:400,color:"var(--text-tertiary)",marginBottom:ESPACIO.sm}}>{o.proyecto}</div>
                {hs.map(h=>{
                  const e=empleados.find(x=>x.id===h.empleadoId);
                  return(
                    <div key={h.id} style={{
                      display:"flex",alignItems:"center",gap:ESPACIO.sm,flexWrap:"wrap",
                      padding:"6px 0",borderTop:"1px solid var(--separator)",
                      ...TIPO.caption,fontWeight:400,
                    }}>
                      <span style={{color:"var(--text-tertiary)",minWidth:76}}>{fmtD(h.fecha)}</span>
                      <span style={{color:"var(--text-primary)",flex:"1 1 110px",fontWeight:600}}>{e?.nombre}</span>
                      <span style={{color:"var(--text-secondary)",flex:"1 1 120px"}}>{fmtTurno12Local(h.turno)}</span>
                      <span style={{color:"var(--text-tertiary)",flex:"1 1 100%"}}>{h.tarea}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// ======================================================
// VENCIMIENTOS DE CERTIFICACIONES
// ======================================================

