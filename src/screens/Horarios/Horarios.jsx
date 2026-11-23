import Av from "../../components/ui/Av";
import NuevoEmpleadoRapido from "../../components/NuevoEmpleadoRapido";
import SelectorEmpleados from "../../components/SelectorEmpleados";
import PlanillaDia from "./PlanillaDia";
import {
  Button, Card, Callout, EmptyState, Icono, Input, Lista, ListRow,
  PageHeader, Sheet, StatusPill,
} from "../../components/ui";
import { CIFRA, ESPACIO, TIPO } from "../../styles/designTokens";
import { useMemo, useState } from "react";
import { PAL } from "../../styles/tokens";
import { fmtD, fmtL, today } from "../../lib/format";
import { abrirWhatsApp, normalizarCelular } from "../../lib/whatsapp";
import { puedeCrearPersonal } from "../../lib/permisos";
import { normalizarMayusculas } from "../../lib/normalizarEntrada";
import { resolverAutorGuardado } from "../../lib/autorAuditoria";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { useSubirAlFormulario } from "../../hooks/useSubirAlFormulario";
import { confirmar } from "../../lib/dialogos";
import { obrasMasNuevasPrimero } from "../../lib/identificadores";

// Aire debajo de cada bloque. El kit no lo trae: lo pone quien coloca la pieza.
const SEPARA = { marginBottom: ESPACIO.lg };

// Fechas como texto AAAA-MM-DD, calculadas con la hora local. Con
// toISOString una fecha de madrugada podia saltar al dia anterior por la zona
// horaria.
const aIso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const desdeIso = (iso) => new Date(`${iso}T12:00:00`);
const sumarDias = (iso, n) => {
  const d = desdeIso(iso);
  d.setDate(d.getDate() + n);
  return aIso(d);
};

// Los dias de un rango, sin domingos salvo que se pidan. Con «hasta» vacio o
// anterior al inicio es un solo dia, que es el caso de siempre. El tope evita
// crear cientos de turnos por un año mal escrito.
const MAX_DIAS_RANGO = 31;
const diasDelRango = (desde, hasta, conDomingos) => {
  if (!desde) return [];
  if (!hasta || hasta <= desde) return [desde];
  const dias = [];
  for (let iso = desde; iso <= hasta && dias.length < MAX_DIAS_RANGO; iso = sumarDias(iso, 1)) {
    if (conDomingos || desdeIso(iso).getDay() !== 0) dias.push(iso);
  }
  return dias;
};

// Jornadas de siempre, para no teclear las horas cada vez.
const JORNADAS = [
  { etiqueta: "Jornada 7–5", inicio: "07:00", fin: "17:00" },
  { etiqueta: "Mañana 7–12", inicio: "07:00", fin: "12:00" },
  { etiqueta: "Tarde 1–5", inicio: "13:00", fin: "17:00" },
];

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
  // Arranca con la obra mas nueva, que es la que casi siempre se busca.
  const firstObraId = obrasMasNuevasPrimero(obras)[0]?.id || "";
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
  // La pantalla abre en el proximo dia de trabajo, no en hoy: aqui se arma la
  // programacion de mañana (el sabado, la del lunes). Hoy queda a un toque.
  const [fechaF,setFechaF]=useState(()=>{
    const manana = sumarDias(today(),1);
    return desdeIso(manana).getDay()===0 ? sumarDias(manana,1) : manana;
  });
  const [showF,setShowF]=useState(false);
  // Arranca sin nadie marcado. Antes venia preseleccionado el primero de la
  // lista y era facil asignarle el turno a quien no era.
  const FORM_VACIO={
    empleadoIds:[],
    obraId:firstObraId,
    fecha:today(),
    // Para poner a la cuadrilla toda la semana sin repetir el formulario por
    // dia. Vacio = solo el dia de arriba.
    fechaHasta:"",
    incluirDomingos:false,
    turno1Inicio:"07:00",
    turno1Fin:"17:00",
    tarea1:"",
    turno2Inicio:"",
    turno2Fin:"",
    tarea2:"",
    // Cuantas lineas, anclajes o puntos se instalan. Sale en la columna
    // CANTIDADES de la planilla del dia.
    cantidad:"",
    // Donde se encuentra la cuadrilla. Vacio = «Salida desde la oficina»,
    // que es lo de siempre; se cambia cuando llegan directo a la obra.
    encuentro:"",
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

  // El mismo turno para cada persona marcada y cada dia del rango: es lo que
  // evita repetir el formulario una vez por trabajador y una vez por dia.
  const buildTurnosPayload=(baseForm)=>{
    const turnos = buildTurnos(baseForm);
    const fechas = diasDelRango(baseForm.fecha, baseForm.fechaHasta, baseForm.incluirDomingos);
    return fechas.flatMap((fecha)=>
      (baseForm.empleadoIds||[]).flatMap((empleadoId)=>
        turnos.map((item)=>({
          empleadoId,
          obraId: baseForm.obraId,
          fecha,
          turno: item.turno,
          tarea: item.tarea,
          cantidad: String(baseForm.cantidad||"").trim(),
          encuentro: String(baseForm.encuentro||"").trim(),
        }))
      )
    );
  };

  // El texto que le llega a una persona. Vive aparte porque lo usan dos cosas:
  // el boton que abre su WhatsApp y la exportacion para el envio automatico.
  const armarMensajePersonal=(e,o,f,turnos)=>{
    const lineaTurno=(item,idx)=>(idx+1) + ". " + (fmtTurno12Local(item.turno)) + (item.tarea ? " - " + (item.tarea) : "");
    // Varios dias en un solo mensaje: los turnos van agrupados por fecha. Si
    // no, la persona recibia una lista de horas sin saber de que dia era cada una.
    const fechas=[...new Set(turnos.map((t)=>t.fecha||f))].sort();
    if(fechas.length>1){
      // Lo normal es el mismo turno todos los dias: entonces va una sola vez,
      // con la lista de dias, en vez de repetirlo dia por dia.
      const firmaDe=(fecha)=>turnos.filter((t)=>(t.fecha||f)===fecha).map((t)=>`${t.turno}|${t.tarea}`).sort().join("§");
      if(fechas.every((fecha)=>firmaDe(fecha)===firmaDe(fechas[0]))){
        const diasTexto=fechas.map((fecha)=>fmtD(fecha)||fecha).join(", ");
        return [
          "Hola " + (e.nombre) + ", has sido asignado a la obra *" + (normalizarMayusculas(o.proyecto)) + "* del cliente *" + (normalizarMayusculas(o.cliente)) + "* en *" + (o.direccion||o.ciudad) + "* estos " + fechas.length + " días:",
          "*" + diasTexto + "*",
          "",
          "Turnos asignados (cada día):",
          turnos.filter((t)=>(t.fecha||f)===fechas[0]).map(lineaTurno).join("\n"),
          "",
          "Por favor confirma tu asistencia.",
          "*INGEANCLAJES S.A.S*",
        ].join("\n");
      }
      const porDia=fechas.map((fecha)=>[
        "*" + (fmtL(fecha) || fecha) + "*",
        ...turnos.filter((t)=>(t.fecha||f)===fecha).map(lineaTurno),
      ].join("\n"));
      return [
        "Hola " + (e.nombre) + ", has sido asignado a la obra *" + (normalizarMayusculas(o.proyecto)) + "* del cliente *" + (normalizarMayusculas(o.cliente)) + "* en *" + (o.direccion||o.ciudad) + "* estos " + fechas.length + " días:",
        "",
        porDia.join("\n\n"),
        "",
        "Por favor confirma tu asistencia.",
        "*INGEANCLAJES S.A.S*",
      ].join("\n");
    }
    const fechaMsg = fmtD(f) || f;
    const detalle = turnos.map(lineaTurno).join("\n");
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
      const primeraFecha = [...new Set(payload.map(n=>n.fecha).filter(Boolean))].sort()[0] || null;
      if(idsNuevos.length > 0){
        setObras(prevObras => prevObras.map(o => {
          if(o.id !== form.obraId) return o;
          const actuales = Array.isArray(o.empleados) ? o.empleados : [];
          const combinados = [...new Set([...actuales, ...idsNuevos])];
          const fechaInicio = o.fechaInicio || primeraFecha;
          return { ...o, empleados: combinados, ...(fechaInicio ? { fechaInicio } : {}) };
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
    // La lista de abajo pasa al dia de lo que se acaba de guardar. Antes se
    // quedaba en el que estaba y, al asignar para mañana, parecia que no se
    // habia guardado nada.
    setFechaF(form.fecha);
    setForm({...FORM_VACIO, obraId:form.obraId, fecha:form.fecha});
  };

  // Abre el formulario en el dia que se esta mirando -lo normal es armar el
  // dia que se tiene en pantalla- y lleva la vista hasta el.
  const [formRef, subirAlFormulario] = useSubirAlFormulario();
  const abrirFormulario=()=>{
    if(showF){ setShowF(false); return; }
    setForm((prev)=>({...prev, fecha:fechaF, fechaHasta:""}));
    setShowF(true);
    subirAlFormulario();
  };

  // Copiar el dia anterior: la cuadrilla casi siempre repite. Se busca el
  // ultimo dia con turnos en las dos semanas anteriores al que se esta viendo.
  const diaAnteriorConTurnos = useMemo(()=>{
    for(let i=1;i<=14;i++){
      const f=sumarDias(fechaF,-i);
      if(horarios.some((h)=>h.fecha===f)) return f;
    }
    return null;
  }, [fechaF, horarios]);

  const copiarDiaAnterior=async()=>{
    if(!diaAnteriorConTurnos) return;
    const origen=horarios.filter((h)=>h.fecha===diaAnteriorConTurnos);
    const nuevos=origen
      .filter((h)=>obras.some((o)=>o.id===h.obraId) && empleados.some((e)=>e.id===h.empleadoId))
      .map((h)=>({empleadoId:h.empleadoId, obraId:h.obraId, fecha:fechaF, turno:h.turno, tarea:h.tarea, cantidad:h.cantidad||"", encuentro:h.encuentro||""}))
      .filter((p)=>!horarios.some((h)=>
        h.empleadoId===p.empleadoId && h.obraId===p.obraId && h.fecha===p.fecha && h.turno===p.turno
      ));
    if(!nuevos.length){
      setNotif({ok:false,texto:`Los turnos del ${fmtD(diaAnteriorConTurnos)} ya están en este día.`});
      setTimeout(()=>setNotif(null),7000);
      return;
    }
    const personas=new Set(nuevos.map((n)=>n.empleadoId)).size;
    if(!(await confirmar(
      `¿Copiar ${nuevos.length} turno(s) de ${personas} persona(s) del ${fmtD(diaAnteriorConTurnos)} al ${fmtD(fechaF)}?\n\n` +
      "Quedan iguales: obra, horario y tarea. Después puedes quitar o cambiar los que no aplican."
    ))) return;

    const autorActual = resolverAutorGuardado(ctx?.membresia);
    const ahoraIso = new Date().toISOString();
    setHorarios((p)=>[
      ...p,
      ...nuevos.map((item,idx)=>({
        id:"H" + (Date.now()) + "c" + (idx),
        ...item,
        creadoPor: ctx?.membresia?.userId || null,
        creadoPorNombre: autorActual || "Camila Sepúlveda",
        creadoEn: ahoraIso,
        modificadoPor: ctx?.membresia?.userId || null,
        modificadoPorNombre: autorActual || "Camila Sepúlveda",
        modificadoEn: ahoraIso,
      })),
    ]);

    // Igual que al guardar un grupo: los avisos quedan listos para mandarse.
    const claves=[...new Set(nuevos.map((n)=>`${n.empleadoId}|${n.obraId}`))];
    setPorAvisar(claves.map((clave)=>{
      const [empleadoId,obraId]=clave.split("|");
      return {empleadoId, obraId, fecha:fechaF,
        turnos:nuevos.filter((n)=>n.empleadoId===empleadoId && n.obraId===obraId), enviado:false};
    }));
    setNotif({ok:true,texto:`Se copiaron ${nuevos.length} turno(s) del ${fmtD(diaAnteriorConTurnos)}. Avísales abajo.`});
    setTimeout(()=>setNotif(null),10000);
  };

  const turnosBase = buildTurnos(form);
  const previewTurnos = buildTurnosPayload(form);
  const fechasForm = diasDelRango(form.fecha, form.fechaHasta, form.incluirDomingos);

  // Quien ya tiene turno ese dia en OTRA obra. No se bloquea -a veces se
  // reparte el dia entre dos obras-, pero se avisa antes de guardar.
  const choques = seleccionados.flatMap((e)=>
    horarios
      .filter((h)=>h.empleadoId===e.id && fechasForm.includes(h.fecha) && h.obraId!==form.obraId)
      .map((h)=>({nombre:e.nombre, fecha:h.fecha, turno:h.turno, obra:obras.find((o)=>o.id===h.obraId)}))
  );

  // Tareas que ya se usaron en esta obra, las mas recientes primero: casi
  // siempre se repite la de ayer.
  const tareasSugeridas = [...new Set(
    horarios
      .filter((h)=>h.obraId===form.obraId && String(h.tarea||"").trim())
      .sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)))
      .map((h)=>h.tarea)
  )].slice(0,12);
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

  // ── Edicion directa en la planilla ──────────────────────────────────────
  //
  // La hoja «Actividades y clientes» se llena ahi mismo, como en Excel. Por
  // debajo son los turnos de siempre: una fila es el grupo de turnos de una
  // obra en el dia que se mira. No abre WhatsApp ni llena la lista de avisos:
  // lo que sale de la hoja es la imagen para el grupo; el aviso persona por
  // persona sigue en «Reenviar» y en el formulario.
  const firmaDeAutor=()=>{
    const autor = resolverAutorGuardado(ctx?.membresia) || "Camila Sepúlveda";
    return {por: ctx?.membresia?.userId || null, nombre: autor, en: new Date().toISOString()};
  };

  const sumarTurnosDeLaPlanilla=(obraId, empleadoIds, plantilla)=>{
    const candidatos = empleadoIds.flatMap((empleadoId)=>
      plantilla.map((pl)=>({empleadoId, obraId, fecha:fechaF, ...pl}))
    );
    const nuevos = candidatos.filter((p)=>!horarios.some((h)=>
      h.empleadoId===p.empleadoId && h.obraId===p.obraId && h.fecha===p.fecha && h.turno===p.turno
    ));
    if(!nuevos.length) return;
    const f = firmaDeAutor();
    setHorarios((p)=>[
      ...p,
      ...nuevos.map((item,idx)=>({
        id:"H" + (Date.now()) + "p" + (idx),
        ...item,
        creadoPor:f.por, creadoPorNombre:f.nombre, creadoEn:f.en,
        modificadoPor:f.por, modificadoPorNombre:f.nombre, modificadoEn:f.en,
      })),
    ]);
    // Igual que con el formulario: quien entra a un turno queda en el equipo
    // de la obra y, si la obra aun no tiene fecha de inicio, toma esta fecha.
    if(setObras){
      setObras((prev)=>prev.map((o)=>{
        if(o.id!==obraId) return o;
        const actuales = Array.isArray(o.empleados) ? o.empleados : [];
        const combinados = [...new Set([...actuales, ...empleadoIds])];
        const fechaInicio = o.fechaInicio || fechaF;
        if(combinados.length===actuales.length && o.fechaInicio===fechaInicio) return o;
        return {...o, empleados:combinados, ...(fechaInicio ? {fechaInicio} : {})};
      }));
    }
  };

  // Fila nueva: ya tiene cliente y al menos una persona.
  const crearFilaPlanilla=(fila)=>{
    sumarTurnosDeLaPlanilla(fila.obraId, fila.empleadoIds, [{
      turno: armarTurno(fila.inicio || "07:00", "17:00"),
      tarea: fila.tarea || "",
      cantidad: fila.cantidad || "",
      encuentro: fila.encuentro || "",
    }]);
  };

  // Otra persona en una fila que ya existe: recibe los mismos turnos que el
  // primero de la fila (hora, actividad, cantidad y punto de encuentro).
  const agregarTrabajadoresPlanilla=(obraId, empleadoIds)=>{
    const grupo = dia.filter((h)=>h.obraId===obraId);
    if(!grupo.length) return;
    const plantilla = grupo
      .filter((h)=>h.empleadoId===grupo[0].empleadoId)
      .map((h)=>({turno:h.turno, tarea:h.tarea||"", cantidad:h.cantidad||"", encuentro:h.encuentro||""}));
    sumarTurnosDeLaPlanilla(obraId, empleadoIds, plantilla);
  };

  // Un dato de la fila (actividad, cantidad, punto de encuentro u hora de
  // entrada) vale para todos sus turnos.
  const editarFilaPlanilla=(obraId, cambios)=>{
    const {inicio, ...resto} = cambios;
    const f = firmaDeAutor();
    setHorarios((p)=>p.map((h)=>{
      if(h.obraId!==obraId || h.fecha!==fechaF) return h;
      const siguiente = {...h, ...resto};
      if(inicio){
        const fin = String(h.turno||"").split("-")[1]?.trim() || "17:00";
        siguiente.turno = armarTurno(inicio, fin);
      }
      return {...siguiente, modificadoPor:f.por, modificadoPorNombre:f.nombre, modificadoEn:f.en};
    }));
  };

  // Si se quita un trabajador de un turno y ya no tiene otros turnos en esa obra,
  // tambien se limpia de obra.empleados para que un error no quede pegado en la obra.
  const limpiarPersonalSinTurnos=(obraId, empleadoIdsCandidatos, horariosRestantes)=>{
    if(!setObras || !obraId || !empleadoIdsCandidatos.length) return;
    const sinOtrosTurnos = empleadoIdsCandidatos.filter(
      (eid) => !horariosRestantes.some((h) => h.obraId === obraId && h.empleadoId === eid)
    );
    if(!sinOtrosTurnos.length) return;
    setObras((prev)=>prev.map((o)=>{
      if(o.id!==obraId) return o;
      const actuales = Array.isArray(o.empleados) ? o.empleados : [];
      const filtrados = actuales.filter((eid) => !sinOtrosTurnos.includes(eid));
      return filtrados.length===actuales.length ? o : {...o, empleados:filtrados};
    }));
  };

  const quitarTrabajadorPlanilla=(obraId, empleadoId)=>{
    const restantes = horarios.filter((h)=>!(h.obraId===obraId && h.fecha===fechaF && h.empleadoId===empleadoId));
    setHorarios(restantes);
    limpiarPersonalSinTurnos(obraId, [empleadoId], restantes);
  };

  const quitarFilaPlanilla=async(obraId)=>{
    const grupo = dia.filter((h)=>h.obraId===obraId);
    if(!grupo.length) return;
    const o = obras.find((x)=>x.id===obraId);
    const idsAfectados = [...new Set(grupo.map((h)=>h.empleadoId).filter(Boolean))];
    const personas = idsAfectados.length;
    if(!(await confirmar(
      `¿Quitar a ${normalizarMayusculas(o?.cliente || "esta obra")} de la planilla del ${fmtD(fechaF)}?\n\n` +
      `Se borran los turnos de ${personas} persona${personas!==1?"s":""} en esa obra ese día.`
    ))) return;
    const restantes = horarios.filter((h)=>!(h.obraId===obraId && h.fecha===fechaF));
    setHorarios(restantes);
    limpiarPersonalSinTurnos(obraId, idsAfectados, restantes);
  };

  // Pasar una fila a otro dia: se armo en la hoja de hoy y era para mañana.
  // Los turnos cambian de fecha y la hoja salta a ese dia para verla alla. Si
  // en el destino alguien ya tenia ese mismo turno en esa obra, no se duplica.
  const moverFilaPlanilla=(obraId, nuevaFecha)=>{
    if(!nuevaFecha || nuevaFecha===fechaF) return;
    const grupo = dia.filter((h)=>h.obraId===obraId);
    if(!grupo.length) return;
    const origen = fechaF;
    const f = firmaDeAutor();
    setHorarios((p)=>{
      const yaAlla = p.filter((h)=>h.obraId===obraId && h.fecha===nuevaFecha);
      return p.flatMap((h)=>{
        if(h.obraId!==obraId || h.fecha!==origen) return [h];
        if(yaAlla.some((x)=>x.empleadoId===h.empleadoId && x.turno===h.turno)) return [];
        return [{...h, fecha:nuevaFecha, modificadoPor:f.por, modificadoPorNombre:f.nombre, modificadoEn:f.en}];
      });
    });
    setFechaF(nuevaFecha);
    const o = obras.find((x)=>x.id===obraId);
    setNotif({ok:true, texto:`${normalizarMayusculas(o?.cliente || "La fila")} pasó del ${fmtD(origen)} al ${fmtL(nuevaFecha)}.`});
    setTimeout(()=>setNotif(null),8000);
  };

  // Actividades usadas hace poco, para que salgan al escribir en la hoja.
  const tareasRecientes = useMemo(()=>[...new Set(
    [...horarios]
      .filter((h)=>String(h.tarea||"").trim())
      .sort((a,b)=>String(b.fecha).localeCompare(String(a.fecha)))
      .map((h)=>String(h.tarea).trim())
  )].slice(0,20), [horarios]);

  // Edicion y eliminacion de cualquier turno (desde «Turnos del dia» o «Todos los turnos por obra»).
  const [editandoTurno, setEditandoTurno] = useState(null);
  const [busquedaHistorial, setBusquedaHistorial] = useState("");

  const separarHorario = (turno) => {
    const partes = String(turno || "").split("-").map((p) => p.trim());
    const esHora = (v) => /^\d{1,2}:\d{2}$/.test(v);
    return {
      inicio: esHora(partes[0]) ? partes[0].padStart(5, "0") : "07:00",
      fin: esHora(partes[1]) ? partes[1].padStart(5, "0") : "17:00",
    };
  };

  const abrirEdicionTurno = (h) => {
    const { inicio, fin } = separarHorario(h.turno);
    setEditandoTurno({
      id: h.id,
      obraId: h.obraId || firstObraId,
      empleadoId: h.empleadoId || "",
      fecha: h.fecha || fechaF,
      inicio,
      fin,
      tarea: h.tarea || "",
      cantidad: h.cantidad || "",
      encuentro: h.encuentro || "",
    });
  };

  const guardarEdicionTurno = () => {
    if (!editandoTurno) return;
    if (!editandoTurno.obraId || !editandoTurno.empleadoId || !editandoTurno.fecha) {
      setNotif({ ok: false, texto: "Elige obra, trabajador y fecha para guardar el turno." });
      setTimeout(() => setNotif(null), 6000);
      return;
    }
    const nuevoTurno = armarTurno(editandoTurno.inicio, editandoTurno.fin);
    if (!nuevoTurno) {
      setNotif({ ok: false, texto: "Indica la hora de inicio y la hora de fin del turno." });
      setTimeout(() => setNotif(null), 6000);
      return;
    }
    const anterior = horarios.find((x) => x.id === editandoTurno.id);
    const f = firmaDeAutor();
    const actualizados = horarios.map((h) => (
      h.id !== editandoTurno.id ? h : {
        ...h,
        obraId: editandoTurno.obraId,
        empleadoId: editandoTurno.empleadoId,
        fecha: editandoTurno.fecha,
        turno: nuevoTurno,
        tarea: String(editandoTurno.tarea || "").trim(),
        cantidad: String(editandoTurno.cantidad || "").trim(),
        encuentro: String(editandoTurno.encuentro || "").trim(),
        modificadoPor: f.por,
        modificadoPorNombre: f.nombre,
        modificadoEn: f.en,
      }
    ));
    setHorarios(actualizados);
    if (setObras && editandoTurno.obraId && editandoTurno.empleadoId) {
      setObras((prev) => prev.map((o) => {
        if (o.id !== editandoTurno.obraId) return o;
        const actuales = Array.isArray(o.empleados) ? o.empleados : [];
        const combinados = actuales.includes(editandoTurno.empleadoId)
          ? actuales
          : [...actuales, editandoTurno.empleadoId];
        const fechaInicio = o.fechaInicio || editandoTurno.fecha;
        if (combinados.length === actuales.length && o.fechaInicio === fechaInicio) return o;
        return { ...o, empleados: combinados, ...(fechaInicio ? { fechaInicio } : {}) };
      }));
    }
    if (anterior && (anterior.obraId !== editandoTurno.obraId || anterior.empleadoId !== editandoTurno.empleadoId)) {
      limpiarPersonalSinTurnos(anterior.obraId, [anterior.empleadoId].filter(Boolean), actualizados);
    }
    setEditandoTurno(null);
    setNotif({ ok: true, texto: "Turno actualizado correctamente." });
    setTimeout(() => setNotif(null), 6000);
  };

  const eliminarTurno = async (h, cerrarModal = false) => {
    if (!h) return;
    const e = empleados.find((x) => x.id === h.empleadoId);
    const o = obras.find((x) => x.id === h.obraId);
    const ok = await confirmar(
      `¿Eliminar el turno de ${e?.nombre || "este trabajador"} del ${fmtD(h.fecha)} en ${normalizarMayusculas(o?.cliente || "esta obra")}?\n\n` +
      "Se quitará tanto de la planilla del día como del historial."
    );
    if (!ok) return;
    const restantes = horarios.filter((x) => x.id !== h.id);
    setHorarios(restantes);
    limpiarPersonalSinTurnos(h.obraId, [h.empleadoId].filter(Boolean), restantes);
    if (cerrarModal) setEditandoTurno(null);
    setNotif({ ok: true, texto: `Turno de ${e?.nombre || "trabajador"} eliminado.` });
    setTimeout(() => setNotif(null), 6000);
  };

  const obrasConHistorial = useMemo(() => {
    const q = busquedaHistorial.trim().toLowerCase();
    return obrasMasNuevasPrimero(obras)
      .map((o) => {
        const hs = horarios
          .filter((h) => h.obraId === o.id)
          .sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
        if (!hs.length) return null;
        if (!q) return { obra: o, turnos: hs };
        const obraCoincide = [o.cliente, o.proyecto, o.ciudad, o.direccion]
          .some((v) => String(v || "").toLowerCase().includes(q));
        if (obraCoincide) return { obra: o, turnos: hs };
        const turnosFiltrados = hs.filter((h) => {
          const e = empleados.find((x) => x.id === h.empleadoId);
          return [e?.nombre, h.tarea, h.fecha, fmtD(h.fecha), h.cantidad, h.encuentro]
            .some((v) => String(v || "").toLowerCase().includes(q));
        });
        return turnosFiltrados.length ? { obra: o, turnos: turnosFiltrados } : null;
      })
      .filter(Boolean);
  }, [obras, horarios, empleados, busquedaHistorial]);

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
          <>
            {empleados.length>0 && puedeCrearPersonal(membresia) && !nuevoEmp && (
              <Button variante="texto" icono="mas" onClick={()=>setNuevoEmp(true)}>
                Registrar trabajador
              </Button>
            )}
            {diaAnteriorConTurnos && (
              <Button
                variante="secondary"
                icono="mas"
                onClick={copiarDiaAnterior}
                title={`Copia a este día los turnos del ${fmtD(diaAnteriorConTurnos)}`}
              >
                Copiar del {fmtD(diaAnteriorConTurnos)}
              </Button>
            )}
            <Button
              // Solo una accion principal a la vez: con el formulario abierto el
              // boton pasa a cerrarlo, y con turnos recien guardados lo urgente
              // es avisarle a la gente, no asignar otro.
              variante={showF || avisarEsLoSiguiente ? "secondary" : "primary"}
              icono={showF ? "cerrar" : "mas"}
              onClick={abrirFormulario}
            >
              {showF ? "Cerrar" : "Asignar turnos"}
            </Button>
          </>
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

      {notif&&(
        <Callout tono={notif.ok ? "exito" : "peligro"} style={SEPARA}>{notif.texto}</Callout>
      )}
      {/* La hoja «Actividades y clientes» es lo primero que se ve al entrar,
          con la navegacion de fecha unificada y envio listo para WhatsApp. */}
      <div style={SEPARA}>
        <PlanillaDia
          fecha={fechaF}
          onCambiarFecha={setFechaF}
          onMoverFila={moverFilaPlanilla}
          onAbrirTextoGrupo={abrirHorarioDelDia}
          dia={dia}
          obras={obras}
          empleados={empleados}
          tareasSugeridas={tareasRecientes}
          onCrearFila={crearFilaPlanilla}
          onEditarFila={editarFilaPlanilla}
          onAgregarTrabajadores={agregarTrabajadoresPlanilla}
          onQuitarTrabajador={quitarTrabajadorPlanilla}
          onQuitarFila={quitarFilaPlanilla}
        />
      </div>
      {showF&&(
        <Card ajustado style={{...SEPARA,scrollMarginTop:16}} ref={formRef}>
          <CabeceraCard
            titulo="Nuevo horario"
            descripcion="Al guardar se le avisa por WhatsApp a cada persona marcada."
          />
          {/* La obra va primero: de ella sale el atajo para marcar al equipo
              completo, que es lo que evita repetir el formulario por persona. */}
          <div style={{display:"grid",gridTemplateColumns:isMobile ? "1fr" : "2fr 1fr 1fr 1fr",gap:ESPACIO.md,marginBottom:ESPACIO.sm}}>
            <Input
              label="Obra"
              como="select"
              value={form.obraId}
              onChange={e=>setForm({...form,obraId:e.target.value})}
            >
              {obrasMasNuevasPrimero(obras).map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}
            </Input>
            <Input
              label="Fecha"
              type="date"
              value={form.fecha}
              onChange={e=>setForm({...form,fecha:e.target.value})}
            />
            <Input
              label="Hasta (opcional)"
              type="date"
              value={form.fechaHasta}
              min={form.fecha}
              onChange={e=>setForm({...form,fechaHasta:e.target.value})}
              ayuda={fechasForm.length>1
                ? `${fechasForm.length} días${form.incluirDomingos?"":", sin domingos"}`
                : "Para varios días seguidos"}
            />
            <Input
              label="Cantidad (opcional)"
              value={form.cantidad}
              onChange={e=>setForm({...form,cantidad:e.target.value})}
              placeholder="Ej: 10"
              maxLength={40}
              ayuda="Sale en la planilla del día"
            />
            <Input
              label="Punto de encuentro (opcional)"
              value={form.encuentro}
              onChange={e=>setForm({...form,encuentro:e.target.value})}
              list="horarios-puntos-encuentro"
              placeholder="Salida desde la oficina"
              maxLength={60}
              ayuda="Vacío = Salida desde la oficina. Cámbialo si llegan directo a la obra."
            />
            <datalist id="horarios-puntos-encuentro">
              <option value="Salida desde la oficina"/>
              <option value="Llegada a la obra"/>
            </datalist>
          </div>
          {fechasForm.length>1 && (
            <label style={{display:"inline-flex",alignItems:"center",gap:8,...TIPO.footnote,fontWeight:400,color:"var(--text-secondary)",marginBottom:ESPACIO.md,cursor:"pointer"}}>
              <input type="checkbox" checked={form.incluirDomingos} onChange={e=>setForm({...form,incluirDomingos:e.target.checked})}/>
              Incluir domingos
            </label>
          )}
          <div style={{marginBottom:ESPACIO.lg}}/>

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
              <div style={{...TIPO.eyebrow,color:"var(--text-tertiary)",marginBottom:ESPACIO.sm}}>Turno 1</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:ESPACIO.sm,marginLeft:-6}}>
                {JORNADAS.map((j)=>(
                  <Button key={j.etiqueta} variante="texto" tam="sm"
                    aria-pressed={form.turno1Inicio===j.inicio && form.turno1Fin===j.fin}
                    onClick={()=>setForm({...form,turno1Inicio:j.inicio,turno1Fin:j.fin})}>
                    {j.etiqueta}
                  </Button>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:ESPACIO.md,marginBottom:ESPACIO.sm}}>
                <Input label="Desde" type="time" value={form.turno1Inicio} onChange={e=>setForm({...form,turno1Inicio:e.target.value})}/>
                <Input label="Hasta" type="time" value={form.turno1Fin} onChange={e=>setForm({...form,turno1Fin:e.target.value})}/>
              </div>
              <Input
                label="Tarea del turno 1"
                value={form.tarea1}
                onChange={e=>setForm({...form,tarea1:e.target.value})}
                list="horarios-tareas-sugeridas"
                placeholder={tareasSugeridas[0] ? `Ej: ${tareasSugeridas[0]}` : "Ej: Instalación anclajes"}
                ayuda={`Le llega como «${fmtTurno12Local(armarTurno(form.turno1Inicio, form.turno1Fin))}»`}
              />
            </div>
            <div style={PANEL}>
              <div style={{...TIPO.eyebrow,color:"var(--text-tertiary)",marginBottom:ESPACIO.sm}}>Turno 2 · opcional</div>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:ESPACIO.sm,marginLeft:-6}}>
                {JORNADAS.slice(1).map((j)=>(
                  <Button key={j.etiqueta} variante="texto" tam="sm"
                    aria-pressed={form.turno2Inicio===j.inicio && form.turno2Fin===j.fin}
                    onClick={()=>setForm({...form,turno2Inicio:j.inicio,turno2Fin:j.fin})}>
                    {j.etiqueta}
                  </Button>
                ))}
                {(form.turno2Inicio || form.turno2Fin) && (
                  <Button variante="texto" tam="sm" onClick={()=>setForm({...form,turno2Inicio:"",turno2Fin:"",tarea2:""})}>
                    Quitar
                  </Button>
                )}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:ESPACIO.md,marginBottom:ESPACIO.sm}}>
                <Input label="Desde" type="time" value={form.turno2Inicio} onChange={e=>setForm({...form,turno2Inicio:e.target.value})}/>
                <Input label="Hasta" type="time" value={form.turno2Fin} onChange={e=>setForm({...form,turno2Fin:e.target.value})}/>
              </div>
              <Input
                label="Tarea del turno 2"
                value={form.tarea2}
                onChange={e=>setForm({...form,tarea2:e.target.value})}
                list="horarios-tareas-sugeridas"
                placeholder="Ej: Entrega, cierre, inspección"
                ayuda={form.turno2Inicio && form.turno2Fin
                  ? `Le llega como «${fmtTurno12Local(armarTurno(form.turno2Inicio, form.turno2Fin))}»`
                  : "Déjalo vacío si no hay segundo turno"}
              />
            </div>
          </div>

          {/* Las tareas que ya se usaron en esta obra salen al escribir. */}
          <datalist id="horarios-tareas-sugeridas">
            {tareasSugeridas.map((t)=><option key={t} value={t}/>)}
          </datalist>

          {choques.length>0&&(
            <Callout tono="aviso" titulo="Ya tienen turno en otra obra ese día" style={{marginBottom:ESPACIO.lg}}>
              {choques.slice(0,6).map((c,i)=>(
                <div key={i}>
                  <strong>{c.nombre}</strong> · {fmtD(c.fecha)} · {fmtTurno12Local(c.turno) || "sin hora"} en {c.obra?.proyecto || c.obra?.cliente || "otra obra"}
                </div>
              ))}
              {choques.length>6 && <div>y {choques.length-6} más.</div>}
              <div style={{marginTop:ESPACIO.xs}}>Puedes guardar igual si el día se reparte entre las dos obras.</div>
            </Callout>
          )}

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
                <div>
                  {fechasForm.length>1
                    ? <>Días: <strong>{fmtD(fechasForm[0])} al {fmtD(fechasForm[fechasForm.length-1])}</strong> ({fechasForm.length} días{form.incluirDomingos?"":", sin domingos"})</>
                    : <>Fecha: <strong>{fmtD(form.fecha) || form.fecha}</strong></>}
                </div>
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
              const diasP=[...new Set(p.turnos.map((t)=>t.fecha))];
              const obraP=obras.find((o)=>o.id===p.obraId);
              return(
                <ListRow
                  key={`${p.empleadoId}|${p.obraId}`}
                  izquierda={<Av init={e?.avatar||"?"} color={PAL[idx%PAL.length]} size={30}/>}
                  titulo={e?.nombre || "—"}
                  meta={
                    (diasP.length>1 ? `${diasP.length} días · ` : "") +
                    [...new Set(p.turnos.map((t)=>fmtTurno12Local(t.turno)))].join(" · ") +
                    (obraP ? ` · ${obraP.proyecto || obraP.cliente}` : "")
                  }
                  derecha={
                    <Button
                      variante={p.enviado?"tertiary":"secondary"}
                      tam="sm"
                      icono={p.enviado?"check":undefined}
                      onClick={()=>{
                        enviarWA(p.empleadoId,p.obraId,p.fecha,p.turnos);
                        setPorAvisar(prev=>prev.map(x=>x.empleadoId===p.empleadoId && x.obraId===p.obraId?{...x,enviado:true}:x));
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

      {editandoTurno && (
        <Sheet
          onCerrar={() => setEditandoTurno(null)}
          titulo="Editar turno"
          subtitulo="Corrige cualquier dato si hubo un error y guarda los cambios."
          pie={
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ESPACIO.sm, width: "100%", flexWrap: "wrap" }}>
              <Button
                variante="destructive"
                icono="papelera"
                onClick={() => {
                  const actual = horarios.find((x) => x.id === editandoTurno.id);
                  eliminarTurno(actual || editandoTurno, true);
                }}
              >
                Eliminar turno
              </Button>
              <div style={{ display: "flex", gap: ESPACIO.sm }}>
                <Button variante="secondary" onClick={() => setEditandoTurno(null)}>
                  Cancelar
                </Button>
                <Button variante="primary" onClick={guardarEdicionTurno}>
                  Guardar cambios
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: "grid", gap: ESPACIO.md }}>
            <Input
              label="Obra / cliente"
              como="select"
              value={editandoTurno.obraId}
              onChange={(e) => setEditandoTurno((prev) => ({ ...prev, obraId: e.target.value }))}
            >
              {obrasMasNuevasPrimero(obras).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.cliente}{o.proyecto && o.proyecto !== o.cliente ? ` · ${o.proyecto}` : ""}
                </option>
              ))}
            </Input>

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.2fr 1fr", gap: ESPACIO.md }}>
              <Input
                label="Trabajador"
                como="select"
                value={editandoTurno.empleadoId}
                onChange={(e) => setEditandoTurno((prev) => ({ ...prev, empleadoId: e.target.value }))}
              >
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}{e.cargo ? ` · ${e.cargo}` : ""}</option>
                ))}
              </Input>
              <Input
                label="Fecha"
                type="date"
                value={editandoTurno.fecha}
                onChange={(e) => setEditandoTurno((prev) => ({ ...prev, fecha: e.target.value }))}
              />
            </div>

            <div style={PANEL}>
              <div style={{ ...TIPO.eyebrow, color: "var(--text-tertiary)", marginBottom: ESPACIO.xs }}>Horario</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: ESPACIO.sm, marginLeft: -6 }}>
                {JORNADAS.map((j) => (
                  <Button
                    key={j.etiqueta}
                    variante="texto"
                    tam="sm"
                    aria-pressed={editandoTurno.inicio === j.inicio && editandoTurno.fin === j.fin}
                    onClick={() => setEditandoTurno((prev) => ({ ...prev, inicio: j.inicio, fin: j.fin }))}
                  >
                    {j.etiqueta}
                  </Button>
                ))}
              </div>
              <div className="grid-2-col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ESPACIO.md }}>
                <Input
                  label="Desde"
                  type="time"
                  value={editandoTurno.inicio}
                  onChange={(e) => setEditandoTurno((prev) => ({ ...prev, inicio: e.target.value }))}
                />
                <Input
                  label="Hasta"
                  type="time"
                  value={editandoTurno.fin}
                  onChange={(e) => setEditandoTurno((prev) => ({ ...prev, fin: e.target.value }))}
                />
              </div>
            </div>

            <Input
              label="Actividad / tarea"
              value={editandoTurno.tarea}
              list="hor-planilla-tareas"
              placeholder="Ej: Instalación de puntos de anclaje"
              onChange={(e) => setEditandoTurno((prev) => ({ ...prev, tarea: e.target.value }))}
            />

            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1.6fr", gap: ESPACIO.md }}>
              <Input
                label="Cantidad (opcional)"
                value={editandoTurno.cantidad}
                maxLength={40}
                placeholder="Ej: 10"
                onChange={(e) => setEditandoTurno((prev) => ({ ...prev, cantidad: e.target.value }))}
              />
              <Input
                label="Punto de encuentro (opcional)"
                value={editandoTurno.encuentro}
                list="hor-planilla-encuentros"
                maxLength={60}
                placeholder="Salida desde la oficina"
                onChange={(e) => setEditandoTurno((prev) => ({ ...prev, encuentro: e.target.value }))}
              />
            </div>
          </div>
        </Sheet>
      )}

      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:ESPACIO.lg,alignItems:"start"}}>
        <Card ajustado>
          <CabeceraCard titulo="Turnos del día" descripcion={fmtD(fechaF)}/>
          {dia.length===0 ? (
            <EmptyState
              icono="calendario"
              titulo="No hay turnos para esta fecha"
              texto={diaAnteriorConTurnos
                ? `Agrégalos arriba en la planilla, copia los del ${fmtD(diaAnteriorConTurnos)} o usa «Asignar turnos».`
                : "Agrégalos arriba en la planilla o usa «Asignar turnos»."}
            />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: ESPACIO.sm }}>
              {dia.map((h) => {
                const e = empleados.find((x) => x.id === h.empleadoId);
                const o = obras.find((x) => x.id === h.obraId);
                const idx = empleados.findIndex((x) => x.id === h.empleadoId);
                const conHora = Boolean(String(h.turno || "").trim());
                return (
                  <div
                    key={h.id}
                    style={{
                      ...PANEL,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: ESPACIO.sm }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        <Av init={e?.avatar || "?"} color={PAL[(idx >= 0 ? idx : 0) % PAL.length]} size={34} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ ...TIPO.callout, fontWeight: 600, color: "var(--text-primary)", overflowWrap: "break-word" }}>
                            {e?.nombre || "—"}
                          </div>
                          <div style={{ ...TIPO.caption, fontWeight: 400, color: "var(--text-tertiary)", marginTop: 1 }}>
                            {o?.cliente || o?.proyecto || "Sin obra"}{o?.ciudad ? ` · ${o.ciudad}` : ""}
                          </div>
                        </div>
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {conHora
                          ? <StatusPill tono="acento">{fmtTurno12Local(h.turno)}</StatusPill>
                          : <StatusPill tono="peligro">Sin horario</StatusPill>}
                      </div>
                    </div>

                    {(h.tarea || h.cantidad || h.encuentro) && (
                      <div style={{ ...TIPO.caption, fontWeight: 400, color: "var(--text-secondary)", lineHeight: 1.45, paddingLeft: 44 }}>
                        {h.tarea || "Sin actividad"}
                        {h.cantidad ? ` · Cant: ${h.cantidad}` : ""}
                        {h.encuentro ? ` · ${h.encuentro}` : ""}
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, paddingTop: 4, borderTop: "1px solid var(--separator)" }}>
                      <Button
                        variante="secondary"
                        tam="sm"
                        icono="enviar"
                        onClick={() => reenviarDiaEmpleado(h)}
                        disabled={!conHora}
                        title={conHora ? `Reenviar WhatsApp · +57 ${e?.tel || ""}` : "Este turno no tiene hora, no hay nada que avisar"}
                      >
                        Reenviar WA
                      </Button>
                      <Button
                        variante="secondary"
                        tam="sm"
                        soloIcono
                        icono="lapiz"
                        onClick={() => abrirEdicionTurno(h)}
                        aria-label={`Editar el turno de ${e?.nombre || "esta persona"}`}
                        title="Editar turno"
                      />
                      <Button
                        variante="destructive"
                        tam="sm"
                        soloIcono
                        icono="papelera"
                        onClick={() => eliminarTurno(h)}
                        aria-label={`Eliminar el turno de ${e?.nombre || "esta persona"}`}
                        title="Eliminar turno"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card ajustado>
          <CabeceraCard
            titulo="Todos los turnos por obra"
            descripcion="Edita o elimina cualquier turno si hubo un error."
            accion={horarios.length > 0 && (
              <span style={{
                ...TIPO.caption, ...CIFRA,
                padding: "3px 10px", borderRadius: 980,
                background: "var(--fill)", color: "var(--text-secondary)", fontWeight: 600,
              }}>
                {horarios.length} turno{horarios.length !== 1 ? "s" : ""}
              </span>
            )}
          />
          {horarios.length > 0 && (
            <div style={{ position: "relative", width: "100%", marginBottom: ESPACIO.md }}>
              <span
                style={{
                  position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
                  color: "var(--text-quaternary)", pointerEvents: "none", display: "flex",
                }}
              >
                <Icono nombre="buscar" size={15} />
              </span>
              <input
                type="search"
                className="ui-input"
                style={{ paddingLeft: 34, width: "100%" }}
                value={busquedaHistorial}
                onChange={(e) => setBusquedaHistorial(e.target.value)}
                placeholder="Buscar por cliente, trabajador o actividad…"
                aria-label="Buscar por cliente, trabajador o actividad"
              />
            </div>
          )}
          {obras.every(o=>!horarios.some(h=>h.obraId===o.id)) ? (
            <EmptyState
              icono="obra"
              titulo="Ninguna obra tiene turnos todavía"
              texto="Los turnos que asignes van quedando aquí, agrupados por obra."
            />
          ) : obrasConHistorial.length === 0 ? (
            <EmptyState
              icono="buscar"
              titulo="Sin coincidencias"
              texto={`No encontramos turnos con «${busquedaHistorial}».`}
              accion={
                <Button variante="secondary" tam="sm" onClick={() => setBusquedaHistorial("")}>
                  Ver todos
                </Button>
              }
            />
          ) : obrasConHistorial.map(({ obra: o, turnos: hs }) => (
            <div key={o.id} style={{ ...PANEL, marginBottom: ESPACIO.md }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: ESPACIO.sm, marginBottom: ESPACIO.sm }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ ...TIPO.headline, fontSize: 14, color: "var(--text-primary)" }}>{o.cliente}</div>
                  {o.proyecto && o.proyecto !== o.cliente && (
                    <div style={{ ...TIPO.caption, fontWeight: 400, color: "var(--text-tertiary)" }}>{o.proyecto}</div>
                  )}
                </div>
                <span style={{
                  ...TIPO.caption, ...CIFRA,
                  padding: "2px 9px", borderRadius: 980, flexShrink: 0,
                  background: "var(--surface)", border: "1px solid var(--separator)",
                  color: "var(--text-tertiary)",
                }}>
                  {hs.length} turno{hs.length !== 1 ? "s" : ""}
                </span>
              </div>
              {hs.map((h) => {
                const e = empleados.find((x) => x.id === h.empleadoId);
                return (
                  <div
                    key={h.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: ESPACIO.sm,
                      padding: "10px 0",
                      borderTop: "1px solid var(--separator)",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ ...TIPO.callout, fontWeight: 600, color: "var(--text-primary)" }}>
                          {e?.nombre || "Sin trabajador"}
                        </span>
                        <span style={{
                          ...TIPO.caption, ...CIFRA,
                          padding: "2px 8px", borderRadius: 980,
                          background: "var(--surface)", border: "1px solid var(--separator)",
                          color: "var(--text-secondary)",
                        }}>
                          {fmtD(h.fecha)}
                        </span>
                        {h.turno && (
                          <span style={{
                            ...TIPO.caption, ...CIFRA,
                            padding: "2px 8px", borderRadius: 980,
                            background: "var(--accent-tint)", color: "var(--accent)", fontWeight: 600,
                          }}>
                            {fmtTurno12Local(h.turno)}
                          </span>
                        )}
                      </div>
                      {(h.tarea || h.cantidad || h.encuentro) && (
                        <div style={{ ...TIPO.caption, fontWeight: 400, color: "var(--text-tertiary)", marginTop: 4, lineHeight: 1.45 }}>
                          {h.tarea || "Sin actividad"}
                          {h.cantidad ? ` · Cant: ${h.cantidad}` : ""}
                          {h.encuentro ? ` · ${h.encuentro}` : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <Button
                        variante="secondary"
                        tam="sm"
                        soloIcono
                        icono="lapiz"
                        onClick={() => abrirEdicionTurno(h)}
                        aria-label={`Editar turno de ${e?.nombre || "trabajador"} del ${fmtD(h.fecha)}`}
                        title="Editar turno"
                      />
                      <Button
                        variante="destructive"
                        tam="sm"
                        soloIcono
                        icono="papelera"
                        onClick={() => eliminarTurno(h)}
                        aria-label={`Eliminar turno de ${e?.nombre || "trabajador"} del ${fmtD(h.fecha)}`}
                        title="Eliminar turno"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// ======================================================
// VENCIMIENTOS DE CERTIFICACIONES
// ======================================================

