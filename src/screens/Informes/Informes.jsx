import AvisoFlujo from "../../components/AvisoFlujo";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import PrintHeader from "../../components/print/PrintHeader";
import { useEffect, useRef, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmtD, fmtL, today } from "../../lib/format";
import { printCurrentPz } from "../../lib/print";
import { descargarDocumentoPdf } from "../../lib/documentoPdf";
import { bitacoraAActividades, normalizarBitacora, registrosDelPeriodo } from "../../lib/bitacoraObra";
import { leerImagenComprimida } from "../../lib/imagenes";
import { normalizarFrase, normalizarMayusculas, normalizarNombrePropio, normalizarParrafos } from "../../lib/normalizarEntrada";
import { DEFAULT_INFORME_ACTIVIDADES, DEFAULT_INFORME_DESCRIPCION, DEFAULT_INFORME_RECOMENDACIONES } from "../../data/seed";
import { conActividadSeparada } from "../../lib/informeTextos";
import { siguienteIdUnico } from "../../lib/identificadores";
export default function Informes({ctx}){
  const {informes,setInformes,obras,empleados,horarios,intencion,limpiarIntencion,empresaConfig,irAPantalla}=ctx;
  const firmaImg=getFirmaImg(empresaConfig);
  const [sel,setSel]=useState(null);
  const [generandoPdf,setGenerandoPdf]=useState(false);
  const [nuevo,setNuevo]=useState(()=>Boolean(ctx.intencion?.pantalla==="informes" && ctx.intencion?.obraId));
  const [editId,setEditId]=useState(null);
  const fotoRefs=useRef({});

  // La descripcion arranca con el texto de mantenimiento que se repite en casi
  // todos los informes. Es solo el punto de partida: se edita encima y lo
  // escrito manda. Las actividades que llegan de la bitacora de la obra traen
  // su propia descripcion y no pasan por aqui.
  const emptyActividad=()=>({titulo:"",actividadesRealizadas:DEFAULT_INFORME_ACTIVIDADES,descripcion:DEFAULT_INFORME_DESCRIPCION,observaciones:"",fecha:"",fotos:[{img:null,comentario:""},{img:null,comentario:""},{img:null,comentario:""},{img:null,comentario:""}]});
  // `agregada` marca las filas que puso la persona a mano en el informe, para
  // conservarlas cuando se resincroniza con la obra. Arranca en modo lista:
  // lo normal es elegir a alguien registrado, no escribirlo.
  const emptyPersona=()=>({empleadoId:"",cargo:"",nombre:"",turno1:"",turno2:"",manual:false,agregada:true});

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

    // Las filas agregadas a mano se conservan, sean de alguien registrado o
    // escritas a pulso. Se descartan las que dupliquen a un vinculado.
    const yaVinculado = new Set(vinculados.map((v)=>v.empleadoId));
    const agregadas = prevPersonal.filter((p)=>
      (p.agregada || (p.manual && !p.empleadoId)) && !yaVinculado.has(p.empleadoId)
    );
    return [...vinculados, ...agregadas];
  };

  // Escala tipografica del documento impreso, en pixeles a 96 ppp (1 pt = 1,33
  // px). Son los mismos valores del documento de cotizacion, que es el formato
  // mejor resuelto de la casa: cuerpo 11,5 y titulo 17.
  //
  // El titulo del informe llego a ser MAS PEQUEÑO que el texto del cuerpo y se
  // sostenia solo por las mayusculas; el primer arreglo se paso al otro lado y
  // dejo la hoja basta. Cada nivel pesa distinto, pero sin gritar.
  const T = {
    titulo: 15,      // ~11 pt · el elemento dominante de la hoja
    seccion: 10,     // ~7,5 pt · "REGISTRO FOTOGRÁFICO", cabecera de tabla
    cuerpo: 10,      // ~7,5 pt · valores y parrafos
    // El rotulo va al MISMO tamaño que el cuerpo, como el `card-label` de la
    // cotizacion. Hacerlo mas pequeño abria un salto que se veia raro: el
    // rotulo en letra diminuta al lado de un parrafo grande. Lo que lo
    // distingue es el gris, las mayusculas y el espaciado entre letras, no el
    // tamaño.
    etiqueta: 10,
    pie: 9,          // ~7 pt  · comentarios de foto y datos de la firma
  };
  // El mismo gris de los rotulos de la cotizacion. Separa "que campo es" de
  // "que dice el campo" sin depender solo de la negrita y el fondo gris.
  const GRIS_ROTULO = "#6B6B6B";
  // Borde suave, tambien de la cotizacion: el #ccc de antes pesaba mas que el
  // texto y la hoja parecia una cuadricula.
  const BORDE = "#ddd";

  const firstObraId = obras[0]?.id || "";

  // El informe no se escribe desde cero: la persona que estuvo en la obra ya
  // dejo el avance del dia con sus fotos en la pestana «Avance y fotos». Aqui
  // solo se traen los registros que caen dentro del periodo del informe.
  const actividadesDesdeObra = (obraId, desde, hasta)=>{
    const obraSel = obras.find(o=>o.id===obraId);
    if(!obraSel) return [];
    return bitacoraAActividades(registrosDelPeriodo(obraSel.bitacora, desde, hasta));
  };

  const normalizeInformeActividades = (data={})=>{
    if(Array.isArray(data.actividades) && data.actividades.length){
      // conActividadSeparada acomoda los informes guardados cuando los dos
      // bloques iban juntos en un solo campo. Los ya separados no se tocan.
      return data.actividades.map(conActividadSeparada).map((actividad)=>({
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

  const buildInformeForm = (data={})=>{
    // Se resuelve la obra aqui y se traen sus datos de una: el efecto que
    // rellenaba estos campos solo corre cuando cambian las obras, no al
    // abrir un informe nuevo, y el proyecto quedaba en blanco.
    const obraBase = obras.find((o)=>o.id===(data.obraId ?? firstObraId)) || obras[0] || null;

    // En un informe nuevo el periodo se deduce de la bitacora de la obra: va
    // desde el primer avance registrado hasta el ultimo. Antes arrancaba en
    // "hoy - hoy" y no traia nada, que es justo lo contrario de lo util.
    const registrosObra = normalizarBitacora(obraBase?.bitacora);
    const fechasAvance = registrosObra.map((r)=>r.fecha).filter(Boolean);
    const periodoInicio = data.periodoInicio ?? fechasAvance[0] ?? today();
    const periodoFin = data.periodoFin ?? fechasAvance[fechasAvance.length-1] ?? today();

    // Si el informe ya venia con actividades escritas (se esta editando), se
    // respetan. Si es nuevo, se llena con lo que se alimento en la obra.
    const traeActividadesPropias = (Array.isArray(data.actividades) && data.actividades.length)
      || data.actividad || data.descripcion || data.observaciones
      || (Array.isArray(data.fotos) && data.fotos.length);
    const desdeObra = traeActividadesPropias
      ? []
      : actividadesDesdeObra(obraBase?.id, periodoInicio, periodoFin);

    return {
    obraId:data.obraId ?? obraBase?.id ?? firstObraId,
    // Se acomodan al traerlos: las obras cargadas antes del cambio tienen
    // el proyecto y la ciudad en minuscula, y el informe los imprime tal cual.
    proyecto:normalizarMayusculas(data.proyecto ?? obraBase?.proyecto ?? ""),
    localizacion:normalizarMayusculas(data.localizacion ?? obraBase?.ciudad ?? ""),
    fechaInforme:data.fechaInforme ?? today(),
    periodoInicio,
    periodoFin,
    personal:Array.isArray(data.personal) && data.personal.length
      ? data.personal
      : (obraBase ? buildPersonalDesdeObra(obraBase.id, periodoInicio, periodoFin, []) : []),
    recomendaciones:data.recomendaciones ?? DEFAULT_INFORME_RECOMENDACIONES,
    actividades:desdeObra.length ? desdeObra : normalizeInformeActividades(data),
    };
  };

  // Obra que llega desde el detalle de obra ("Crear informe"). Se lee al
  // montar, asi el formulario abre ya con esa obra y sus datos.
  const obraSolicitada = intencion?.pantalla==="informes" ? intencion.obraId : null;
  const [form,setForm]=useState(()=>buildInformeForm(obraSolicitada?{obraId:obraSolicitada}:{}));

  // La intencion se descarta al salir de la pantalla, para que al volver por
  // el menu no se reabra el formulario.
  useEffect(()=>()=>limpiarIntencion(),[limpiarIntencion]);

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
      const nextProyecto = normalizarMayusculas(prev.proyecto || obraSel.proyecto || '');
      const nextLocal = normalizarMayusculas(prev.localizacion || obraSel.ciudad || '');
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
      const nextProyecto = normalizarMayusculas(obraSel?.proyecto || prev.proyecto || '');
      const nextLocal = normalizarMayusculas(obraSel?.ciudad || prev.localizacion || '');
      const samePersonal = JSON.stringify(nextPersonal)===JSON.stringify(prev.personal);
      if(samePersonal && nextProyecto===prev.proyecto && nextLocal===prev.localizacion) return prev;
      return {...prev,proyecto:nextProyecto,localizacion:nextLocal,personal:nextPersonal};
    });
  },[form.obraId,form.periodoInicio,form.periodoFin,obras,empleados,horarios]);

  const updPersonal=(i,f,v)=>setForm(p=>({...p,personal:p.personal.map((x,j)=>j===i?{...x,[f]:v}:x)}));
  const updActividad=(ai,field,val)=>setForm(p=>({...p,actividades:p.actividades.map((a,i)=>i===ai?{...a,[field]:val}:a)}));
  const updFotoAct=(ai,fi,field,val)=>setForm(p=>({...p,actividades:p.actividades.map((a,i)=>i===ai?{...a,fotos:a.fotos.map((ft,j)=>j===fi?{...ft,[field]:val}:ft)}:a)}));

  // Se reduce la imagen antes de guardarla: van como dataURL dentro del
  // informe y una foto de celular sin comprimir hace fallar el guardado.
  const cargarFoto=async(ai,fi,file)=>{
    if(!file)return;
    try{
      const img=await leerImagenComprimida(file);
      updFotoAct(ai,fi,"img",img);
    }catch{
      window.alert("No se pudo cargar esa foto. Intenta con otra imagen.");
    }
  };

  // Avances de la obra que caen en el periodo elegido. Se muestra el conteo en
  // pantalla para que la persona entienda por que el informe trae 3 y no 8:
  // casi siempre es que el periodo no cubre todas las fechas.
  const avancesDisponibles = actividadesDesdeObra(form.obraId, form.periodoInicio, form.periodoFin);
  const avancesTotalesObra = actividadesDesdeObra(form.obraId, null, null);

  const hayContenidoEscrito = form.actividades.some((a)=>
    a.titulo?.trim() || a.descripcion?.trim() || a.observaciones?.trim() || (a.fotos||[]).some((f)=>f.img)
  );

  const traerAvancesDeLaObra = ()=>{
    if(!avancesDisponibles.length){
      window.alert(
        "No hay avances registrados en esta obra dentro del período elegido.\n\n" +
        "Ve a Ejecución de obra → abre la obra → pestaña «Avance y fotos» y registra allí lo que se hizo, con las fotos.\n\n" +
        "Si ya los registraste, revisa que las fechas del período cubran esos días."
      );
      return;
    }
    if(hayContenidoEscrito){
      const seguir = window.confirm(
        `Se van a reemplazar las actividades de este informe por los ${avancesDisponibles.length} avance(s) registrados en la obra.\n\n` +
        "Lo que hayas escrito a mano aquí se pierde. ¿Continuar?"
      );
      if(!seguir) return;
    }
    fotoRefs.current={};
    setForm(p=>({...p,actividades:avancesDisponibles}));
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
      : {id:siguienteIdUnico(informes,"INF"),...form,actividades,actividad:legacyActividad.titulo,descripcion:legacyActividad.descripcion,observaciones:legacyActividad.observaciones,fotos:legacyActividad.fotos};
    setInformes(prev=>editId ? prev.map(item=>item.id===editId?{...item,...inf}:item) : [...prev,inf]);
    setNuevo(false);
    setEditId(null);
    setSel(inf);
  };

  return(
    <div style={{padding:28}}>
      <H1 title="Informes de Actividades" subtitle="Múltiples actividades por informe con registro fotográfico"
        action={<button style={B("#f47c20")} onClick={abrirNuevoInforme}>+ Nuevo Informe</button>}/>

      {obras.length===0 ? (
        <AvisoFlujo
          tono="falta"
          titulo="Primero hay que crear la obra"
          pasos={[
            "Ve a Ejecución de obra y dale «+ Nueva Obra» (o aprueba la cotización, que la crea sola).",
            "Abre la obra y asigna el personal que trabajó.",
            "En la pestaña «Avance y fotos» registra qué se hizo cada día, con fotos y comentarios.",
            "Vuelve aquí: el informe se arma solo con todo eso.",
          ]}
          accion={
            <button
              onClick={()=>irAPantalla("obras")}
              style={{...B("#f47c20"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}
            >
              Ir a Obras
            </button>
          }
        >
          Todavía no hay obras en el sistema, y el informe de actividades se hace sobre una obra.
        </AvisoFlujo>
      ) : (
        <AvisoFlujo
          tono="info"
          titulo="Este informe no se escribe a mano: se arma con lo que se alimentó en la obra"
          accion={
            <button
              onClick={()=>irAPantalla("obras",form.obraId?{obraId:form.obraId}:undefined)}
              style={{...B("#f1f5f9","#475569"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}
            >
              Abrir la obra
            </button>
          }
        >
          Las <strong>fotos y los comentarios</strong> salen de la pestaña «Avance y fotos» de la
          obra; el <strong>personal y los turnos</strong>, de la pestaña «Personal» y de Horarios.
          Si el informe sale vacío, es porque nadie ha registrado el avance en la obra todavía.
        </AvisoFlujo>
      )}

      {nuevo&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #cc0000"}}>
          <div style={ST}>{editId ? "Editar Informe de Actividades" : "Nuevo Informe de Actividades"}</div>

          {/* Datos generales */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div><LBL>Obra asociada</LBL><select value={form.obraId} onChange={e=>{
              const nuevaObraId=e.target.value;
              const o=obras.find(x=>x.id===nuevaObraId);
              // Al cambiar de obra se reencuadra el periodo con las fechas de
              // avance de esa obra y se traen sus registros, salvo que la
              // persona ya haya escrito algo a mano (eso no se pisa solo).
              const registros=normalizarBitacora(o?.bitacora);
              const fechas=registros.map(r=>r.fecha).filter(Boolean);
              setForm(p=>{
                const inicio=fechas[0]||p.periodoInicio;
                const fin=fechas[fechas.length-1]||p.periodoFin;
                const traidas=actividadesDesdeObra(nuevaObraId,inicio,fin);
                return {
                  ...p,
                  obraId:nuevaObraId,
                  proyecto:normalizarMayusculas(o?.proyecto||""),
                  localizacion:normalizarMayusculas(o?.ciudad||""),
                  periodoInicio:inicio,
                  periodoFin:fin,
                  personal:buildPersonalDesdeObra(nuevaObraId,inicio,fin,p.personal),
                  actividades:(!hayContenidoEscrito && traidas.length) ? traidas : p.actividades,
                };
              });
            }} style={SI}>{obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
            <div><LBL>Nombre del proyecto</LBL><input value={form.proyecto} onChange={e=>setForm(p=>({...p,proyecto:e.target.value}))} onBlur={e=>{const v=normalizarMayusculas(e.target.value);if(v!==form.proyecto)setForm(p=>({...p,proyecto:v}));}} autoCapitalize="characters" style={SI}/></div>
            <div><LBL>Localización</LBL><input value={form.localizacion} onChange={e=>setForm(p=>({...p,localizacion:e.target.value}))} onBlur={e=>{const v=normalizarMayusculas(e.target.value);if(v!==form.localizacion)setForm(p=>({...p,localizacion:v}));}} autoCapitalize="characters" style={SI}/></div>
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
              <div key={i} style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr 1fr 28px",gap:8,marginBottom:6}}>
                {/* Se elige de la lista y el cargo entra solo. Antes habia que
                    escribir el nombre a mano, y es donde se colaban los
                    errores: un apellido mal escrito en el informe que se le
                    entrega al cliente. */}
                <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:0}}>
                  <select
                    value={p.manual ? "__manual__" : (p.empleadoId || "")}
                    onChange={e=>{
                      const v=e.target.value;
                      if(v==="__manual__"){
                        setForm(pf=>({...pf,personal:pf.personal.map((x,j)=>j===i?{...x,empleadoId:"",nombre:"",manual:true}:x)}));
                        return;
                      }
                      const emp=empleados.find(x=>x.id===v);
                      setForm(pf=>({...pf,personal:pf.personal.map((x,j)=>j===i?{
                        ...x,
                        empleadoId:v,
                        nombre:emp?.nombre||"",
                        // El cargo llega de la ficha, pero se puede cambiar:
                        // en una obra concreta alguien puede haber hecho otro.
                        cargo:emp?.cargo||x.cargo||"",
                        manual:false,
                      }:x)}));
                    }}
                    style={{...SI,fontSize:12}}
                  >
                    <option value="">Seleccionar persona…</option>
                    {empleados.filter(e=>e.activo!==false).map(e=>(
                      <option key={e.id} value={e.id}>{e.nombre}{e.cargo?` · ${e.cargo}`:""}</option>
                    ))}
                    <option value="__manual__">Escribir a mano…</option>
                  </select>
                  {p.manual && (
                    <input
                      value={p.nombre}
                      onChange={e=>updPersonal(i,"nombre",e.target.value)}
                      onBlur={e=>{const v=normalizarNombrePropio(e.target.value);if(v!==p.nombre)updPersonal(i,"nombre",v);}}
                      placeholder="Nombre completo"
                      autoCapitalize="words"
                      style={{...SI,fontSize:12}}
                    />
                  )}
                </div>
                <input value={p.cargo} onChange={e=>updPersonal(i,"cargo",e.target.value)} onBlur={e=>{const v=normalizarFrase(e.target.value);if(v!==p.cargo)updPersonal(i,"cargo",v);}} placeholder="Cargo" style={{...SI,fontSize:12}}/>
                <input list="turnosInformeList" value={p.turno1||""} onChange={e=>updPersonal(i,"turno1",e.target.value)} placeholder="Turno 1 · 07:00 AM - 05:00 PM" style={{...SI,fontSize:12}}/>
                <input list="turnosInformeList" value={p.turno2||""} onChange={e=>updPersonal(i,"turno2",e.target.value)} placeholder="Turno 2 · opcional" style={{...SI,fontSize:12}}/>
                <button onClick={()=>setForm(pf=>({...pf,personal:pf.personal.filter((_,j)=>j!==i)}))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,cursor:"pointer",fontSize:14}}>×</button>
              </div>
            ))}
            <button onClick={()=>setForm(p=>({...p,personal:[...p.personal,emptyPersona()]}))} style={{...B("#f1f5f9","#475569"),fontSize:12,marginTop:4}}>+ Agregar persona</button>
          </div>

          {/* Actividades */}
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <LBL>Actividades ejecutadas</LBL>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={traerAvancesDeLaObra} style={{...B("#dbeafe","#1e40af"),fontSize:11,padding:"5px 12px"}}>
                  ↻ Traer avances de la obra ({avancesDisponibles.length})
                </button>
                <button onClick={()=>setForm(p=>({...p,actividades:[...p.actividades,emptyActividad()]}))} style={{...B("#cc0000"),fontSize:11,padding:"5px 12px"}}>+ Agregar actividad</button>
              </div>
            </div>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:8,padding:"10px 13px",fontSize:11.5,color:"#475569",lineHeight:1.55,marginBottom:12}}>
              Estas actividades salen de lo que se registró en la obra, en la pestaña
              «Avance y fotos». Aquí las puedes retocar antes de imprimir sin dañar el registro
              original de la obra.
              {avancesTotalesObra.length>avancesDisponibles.length && (
                <div style={{color:"#b54708",marginTop:5}}>
                  Ojo: la obra tiene <strong>{avancesTotalesObra.length}</strong> avance(s) en total,
                  pero solo <strong>{avancesDisponibles.length}</strong> caen entre el
                  {" "}{fmtD(form.periodoInicio)} y el {fmtD(form.periodoFin)}. Amplía el período de
                  arriba si quieres incluirlos todos.
                </div>
              )}
            </div>
            {form.actividades.map((act,ai)=>(
              <div key={ai} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:16,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#cc0000"}}>Actividad {ai+1}</div>
                  {form.actividades.length>1&&<button onClick={()=>setForm(p=>({...p,actividades:p.actividades.filter((_,i)=>i!==ai)}))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:5,padding:"2px 8px",cursor:"pointer",fontSize:11}}>× Eliminar</button>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 170px",gap:10,marginBottom:10}}>
                  <div><LBL>Título / nombre de la actividad</LBL><input value={act.titulo} onChange={e=>updActividad(ai,"titulo",e.target.value)} placeholder="Ej: Instalación de líneas de vida" style={SI}/></div>
                  <div><LBL>Fecha de ejecución</LBL><input type="date" value={act.fecha||""} onChange={e=>updActividad(ai,"fecha",e.target.value)} style={SI}/></div>
                </div>
                {/* Dos campos y no uno solo con los encabezados dentro: puestos
                    seguidos en el mismo recuadro se leian como un ladrillo, y
                    el rotulo de cada bloque ya lo pone la tabla del documento.

                    normalizarParrafos y no normalizarFrase: estos campos llevan
                    varios parrafos y el otro los aplasta en uno solo. */}
                <div style={{marginBottom:10}}><LBL>Actividades realizadas</LBL><textarea value={act.actividadesRealizadas||""} onChange={e=>updActividad(ai,"actividadesRealizadas",e.target.value)} onBlur={e=>{const v=normalizarParrafos(e.target.value);if(v!==act.actividadesRealizadas)updActividad(ai,"actividadesRealizadas",v);}} rows={7} placeholder="Qué se ejecutó en campo: inspección, ajustes, limpieza..." spellCheck lang="es" style={{...SI,resize:"vertical",lineHeight:1.5}}/></div>
                <div style={{marginBottom:10}}><LBL>Descripción</LBL><textarea value={act.descripcion} onChange={e=>updActividad(ai,"descripcion",e.target.value)} onBlur={e=>{const v=normalizarParrafos(e.target.value);if(v!==act.descripcion)updActividad(ai,"descripcion",v);}} rows={6} placeholder="Descripción del proceso ejecutado..." spellCheck lang="es" style={{...SI,resize:"vertical",lineHeight:1.5}}/></div>
                <div style={{marginBottom:12}}><LBL>Observaciones</LBL><input value={act.observaciones} onChange={e=>updActividad(ai,"observaciones",e.target.value)} onBlur={e=>{const v=normalizarFrase(e.target.value);if(v!==act.observaciones)updActividad(ai,"observaciones",v);}} placeholder="Ej: 1 Línea de vida horizontal de 119 metros" spellCheck lang="es" style={SI}/></div>
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
                      <input ref={el=>{fotoRefs.current[(ai) + "-" + (fi)]=el;}} type="file" accept="image/*" style={{display:"none"}} onChange={e=>{cargarFoto(ai,fi,e.target.files[0]);e.target.value="";}}/>
                      <div style={{padding:"6px 8px"}}><input value={ft.comentario} onChange={e=>updFotoAct(ai,fi,"comentario",e.target.value)} placeholder="Descripción de la foto..." style={{...SI,fontSize:11,padding:"4px 8px"}}/></div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>updActividad(ai,"fotos",[...act.fotos,{img:null,comentario:""}])} style={{...B("#f1f5f9","#475569"),fontSize:11,marginTop:8}}>+ Agregar foto</button>
              </div>
            ))}
          </div>

          <div style={{marginBottom:14}}><LBL>Recomendaciones generales</LBL><textarea value={form.recomendaciones} onChange={e=>setForm(p=>({...p,recomendaciones:e.target.value}))} rows={3} spellCheck lang="es" style={{...SI,resize:"vertical"}}/></div>
          <div style={{display:"flex",gap:10}}>
            <button style={B("#cc0000")} onClick={guardar}>{editId ? "Guardar cambios" : "Guardar informe"}</button>
            <button style={B("#f1f5f9","#475569")} onClick={()=>{setNuevo(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de informes. Se esconde mientras se esta escribiendo uno: la
          pantalla se dedica al formulario y no a los que ya estan hechos. */}
      {!sel&&!nuevo&&(
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
            {/* Descarga directa: el PDF sale sin el encabezado ni el pie que
                Chrome estampa al imprimir («about:blank», fecha, 1/7). */}
            <button
              style={{...B("#f47c20"),opacity:generandoPdf?0.65:1}}
              disabled={generandoPdf}
              onClick={async()=>{
                setGenerandoPdf(true);
                try{
                  await descargarDocumentoPdf(
                    document.getElementById("pz"),
                    "Informe de actividades " + (sel?.id || ""),
                  );
                }catch(fallo){
                  window.alert(fallo.message || "No se pudo generar el PDF.");
                }finally{
                  setGenerandoPdf(false);
                }
              }}
            >
              {generandoPdf ? "Generando…" : "Descargar PDF"}
            </button>
            <button style={B("#f1f5f9","#475569")} onClick={()=>printCurrentPz("Informe " + (sel?.id || ""))}>Imprimir</button>
          </div>
          <div id="pz" className="doc-shell" style={{background:"#fff",color:"#111",fontFamily:"'Aptos','Segoe UI',sans-serif",fontSize:T.cuerpo,lineHeight:1.55,border:"1px solid #ddd",padding:"28px 36px"}}>
            <PrintHeader dual={false}/>
            <div style={{textAlign:"center",fontSize:T.titulo,fontWeight:700,letterSpacing:1.5,padding:"2px 0 10px",borderBottom:"2px solid #333",color:"#111",textTransform:"uppercase",marginBottom:22,marginTop:14}}>Informe de Actividades</div>
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:20}}>
              <tbody>
                {/* Se acomodan también al imprimir: los informes guardados
                    antes de esto tienen el proyecto en minúscula. */}
                {[["PROYECTO",normalizarMayusculas(sel.proyecto)],["LOCALIZACIÓN",normalizarMayusculas(sel.localizacion)],["FECHA INFORME",fmtL(sel.fechaInforme)],["PERÍODO DE INFORME",(fmtL(sel.periodoInicio)) + " - " + (fmtL(sel.periodoFin))]].map(([k,v])=>(
                  <tr key={k}><td style={{border:`1px solid ${BORDE}`,padding:"6px 10px",background:"#f0f0f0",fontWeight:700,width:"30%",fontSize:T.etiqueta,color:GRIS_ROTULO,letterSpacing:".07em"}}>{k}</td><td style={{border:`1px solid ${BORDE}`,padding:"6px 10px"}}>{v}</td></tr>
                ))}
              </tbody>
            </table>
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
              <thead>
                {/* Los turnos se siguen llevando en la pantalla de edicion,
                    pero NO se imprimen: en el documento que se le entrega al
                    cliente ocupaban media tabla para mostrar casi siempre un
                    guion. */}
                <tr style={{background:"#ddd"}}><td colSpan={2} style={{border:`1px solid ${BORDE}`,padding:"7px 10px",fontWeight:700,textAlign:"center",fontSize:T.seccion,letterSpacing:".04em"}}>PERSONAL EN OBRA</td></tr>
                <tr style={{background:"#f5f5f5"}}>
                  <th style={{border:`1px solid ${BORDE}`,padding:"6px 10px",textAlign:"left",width:"35%",fontSize:T.etiqueta,color:GRIS_ROTULO,letterSpacing:".07em"}}>CARGO</th>
                  <th style={{border:`1px solid ${BORDE}`,padding:"6px 10px",textAlign:"left",fontSize:T.etiqueta,color:GRIS_ROTULO,letterSpacing:".07em"}}>NOMBRE</th>
                </tr>
              </thead>
              <tbody>{(sel.personal||[]).map((p,i)=><tr key={i}><td style={{border:`1px solid ${BORDE}`,padding:"6px 10px"}}>{p.cargo}</td><td style={{border:`1px solid ${BORDE}`,padding:"6px 10px"}}>{p.nombre}</td></tr>)}</tbody>
            </table>
            {/* Múltiples actividades */}
            {/* conActividadSeparada tambien AQUI, no solo al editar: esta vista
                lee el informe tal como esta guardado, y los que se hicieron
                cuando los dos bloques iban en un mismo campo seguian saliendo
                pegados en el papel aunque en la pantalla de edicion ya se vieran
                separados. */}
            {(sel.actividades||[{titulo:sel.actividad,descripcion:sel.descripcion,observaciones:sel.observaciones,fotos:sel.fotos||[]}]).map(conActividadSeparada).map((act,ai)=>(
              <div key={ai} style={{marginBottom:22}}>
                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:12}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:`1px solid ${BORDE}`,padding:"7px 10px",background:"#ddd",fontWeight:700,textAlign:"center",fontSize:T.seccion,letterSpacing:".04em"}}>{act.titulo||act}</td></tr>
                    {act.fecha&&<tr><td style={{border:`1px solid ${BORDE}`,padding:"6px 10px",fontWeight:700,width:"20%",fontSize:T.etiqueta,color:GRIS_ROTULO,letterSpacing:".07em"}}>FECHA</td><td style={{border:`1px solid ${BORDE}`,padding:"6px 10px"}}>{fmtL(act.fecha)}</td></tr>}
                    {/* whiteSpace pre-line: en HTML los saltos de linea se
                        aplastan a un espacio, y el texto escrito en dos bloques
                        se imprimia como un parrafo corrido. */}
                    {(act.actividadesRealizadas||"").trim()&&<tr><td style={{border:`1px solid ${BORDE}`,padding:"6px 10px",fontWeight:700,width:"20%",verticalAlign:"top",fontSize:T.etiqueta,color:GRIS_ROTULO,letterSpacing:".07em"}}>ACTIVIDADES REALIZADAS</td><td style={{border:`1px solid ${BORDE}`,padding:"8px 10px",textAlign:"justify",whiteSpace:"pre-line",lineHeight:1.5}}>{act.actividadesRealizadas}</td></tr>}
                    {(act.descripcion||"").trim()&&<tr><td style={{border:`1px solid ${BORDE}`,padding:"6px 10px",fontWeight:700,width:"20%",verticalAlign:"top",fontSize:T.etiqueta,color:GRIS_ROTULO,letterSpacing:".07em"}}>DESCRIPCIÓN</td><td style={{border:`1px solid ${BORDE}`,padding:"8px 10px",textAlign:"justify",whiteSpace:"pre-line",lineHeight:1.5}}>{act.descripcion}</td></tr>}
                    <tr><td style={{border:`1px solid ${BORDE}`,padding:"6px 10px",fontWeight:700,verticalAlign:"top",fontSize:T.etiqueta,color:GRIS_ROTULO,letterSpacing:".07em"}}>OBSERVACIONES</td><td style={{border:`1px solid ${BORDE}`,padding:"6px 10px"}}>{act.observaciones}</td></tr>
                  </tbody>
                </table>
                {(act.fotos||[]).some(ft=>ft.img||ft.url)&&(
                  <>
                    <div style={{fontWeight:700,textAlign:"center",background:"#ddd",border:`1px solid ${BORDE}`,padding:"7px 6px",marginBottom:10,fontSize:T.seccion,letterSpacing:".04em"}}>REGISTRO FOTOGRÁFICO · {act.titulo}</div>
                    {/* Alto FIJO y no maximo: asi las dos fotos de una fila
                        miden igual, la rejilla queda pareja y -sobre todo- el
                        corte de pagina cae siempre en el mismo sitio. Con alto
                        variable cada fila terminaba a una altura distinta y era
                        mas facil que una foto quedara partida entre hojas. */}
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12,alignItems:"start"}}>
                      {(act.fotos||[]).filter(ft=>ft.img||ft.url).map((ft,i)=>(
                        <div key={i} style={{border:`1px solid ${BORDE}`,borderRadius:4,overflow:"hidden",background:"#fff",padding:8}}>
                          <img src={ft.img||ft.url} alt={"foto" + (i+1)} style={{width:"100%",height:250,objectFit:"contain",display:"block",background:"#fff"}} onError={e=>{e.target.style.display="none";}}/>
                          {ft.comentario&&<div style={{padding:"6px 2px 0",fontSize:T.pie,color:GRIS_ROTULO,borderTop:"1px solid #eee",marginTop:6,lineHeight:1.45}}>{ft.comentario}</div>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:26}}>
              <tbody><tr><td style={{border:`1px solid ${BORDE}`,padding:"6px 10px",fontWeight:700,width:"20%",verticalAlign:"top",fontSize:T.etiqueta,color:GRIS_ROTULO,letterSpacing:".07em"}}>RECOMENDACIONES</td><td style={{border:`1px solid ${BORDE}`,padding:"8px 10px",textAlign:"justify",whiteSpace:"pre-line",lineHeight:1.5}}>{sel.recomendaciones}</td></tr></tbody>
            </table>
            <div style={{marginTop:30}}>
              <div style={{marginBottom:12,fontSize:T.cuerpo}}>Cordialmente,</div>
              <div style={{height:72,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
                {firmaImg && <img src={firmaImg} alt="" style={{maxHeight:70,maxWidth:230,objectFit:"contain"}}/>}
              </div>
              <div style={{textAlign:"center"}}>
                <div style={{display:"inline-block",borderTop:"1px solid #333",paddingTop:8,minWidth:240}}>
                  <div style={{fontWeight:700,fontSize:T.cuerpo,letterSpacing:".02em"}}>ING. JHON JAIME SEPULVEDA LONDOÑO</div>
                  <div style={{fontSize:T.pie,color:GRIS_ROTULO,marginTop:3}}>Cl 38 sur # 36-48, Envigado · PBX 448 26 86 · Cel. 314 863 40 72</div>
                  <div style={{fontSize:T.pie,color:GRIS_ROTULO}}>Nit. 900193965-4 · ingeanclajes.sas@gmail.com</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

