import AvisoFlujo from "../../components/AvisoFlujo";
import Av from "../../components/ui/Av";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import BotonCorregir from "../../components/ui/BotonCorregir";
import PrintHeader from "../../components/print/PrintHeader";
import { useCallback, useEffect, useRef, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmtD, fmtL, today } from "../../lib/format";
import { openPrintTab } from "../../lib/cotizacionPrint";
import { descargarInformePdf } from "../../lib/informePdf";
import { buildInformePrintHtml } from "../../lib/informePrint";
import { getControlDocumental } from "../../lib/controlDocumental";
import { LOGO_INGEANCLAJES } from "../../assets/embeddedImages";
import { bitacoraAActividades, normalizarBitacora, registrosDelPeriodo } from "../../lib/bitacoraObra";
import { leerImagenComprimida } from "../../lib/imagenes";
import { normalizarFrase, normalizarMayusculas, normalizarNombrePropio, normalizarParrafos } from "../../lib/normalizarEntrada";
import { DEFAULT_INFORME_ACTIVIDADES, DEFAULT_INFORME_DESCRIPCION, DEFAULT_INFORME_RECOMENDACIONES } from "../../data/seed";
import { conActividadSeparada } from "../../lib/informeTextos";
import { siguienteIdUnico } from "../../lib/identificadores";
import { PLANTILLAS_ACTIVIDAD, buscarPlantillaActividad, esTextoDePlantilla } from "./plantillasActividad";
import ListaInformes from "./ListaInformes";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import { resolverAutorGuardado, normalizarNombrePersona } from "../../lib/autorAuditoria";
// Formateo de horas. Vive fuera del componente porque no depende de nada suyo:
// asi es la misma funcion en cada render y buildPersonalDesdeObra puede
// memorizarse sin arrastrarla como dependencia.
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

export default function Informes({ctx}){
  const {informes,setInformes,obras,empleados,horarios,intencion,limpiarIntencion,empresaConfig,irAPantalla,asegurarDetalle}=ctx;
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
  const emptyActividad=()=>({titulo:"",actividadesRealizadas:DEFAULT_INFORME_ACTIVIDADES,descripcion:DEFAULT_INFORME_DESCRIPCION,observaciones:"",fecha:"",fotos:[]});
  // `agregada` marca las filas que puso la persona a mano en el informe, para
  // conservarlas cuando se resincroniza con la obra. Arranca en modo lista:
  // lo normal es elegir a alguien registrado, no escribirlo.
  const emptyPersona=()=>({empleadoId:"",cargo:"",nombre:"",turno1:"",turno2:"",manual:false,agregada:true});

  // Normaliza y asocia una obra con un registro de horario
  const coincideObra = (h, oId) => {
    if (!h || !oId) return false;
    const target = String(oId).trim().toUpperCase();
    const hId = String(h.obraId || h.obra || "").trim().toUpperCase();
    if (hId === target) return true;
    if (hId.startsWith(target + " ") || hId.startsWith(target + "·") || hId.startsWith(target + " -")) return true;
    return false;
  };

  // Resuelve un empleado por id, cédula o nombre
  const resolverEmpleado = useCallback((eid) => {
    if (!eid) return null;
    if (typeof eid === "object" && eid !== null) {
      if (eid.nombre) return eid;
      const subId = eid.id || eid.empleadoId;
      if (subId) return resolverEmpleado(subId);
    }
    const raw = String(eid).trim();
    const lower = raw.toLowerCase();
    return (
      empleados.find((e) => e && String(e.id).trim() === raw) ||
      empleados.find((e) => e && String(e.id).trim().toLowerCase() === lower) ||
      empleados.find((e) => e && String(e.cedula).trim() === raw) ||
      empleados.find((e) => e && e.nombre && e.nombre.trim().toLowerCase() === lower) ||
      null
    );
  }, [empleados]);

  // Se memoriza porque dos efectos la usan para rellenar el personal: sin esto
  // seria una funcion distinta en cada render y los efectos no podrian
  // declararla como dependencia sin volver a correr sin parar.
  const buildPersonalDesdeObra=useCallback((obraId,periodoInicio,periodoFin,prevPersonal=[])=>{
    if(!obraId) return prevPersonal || [];
    const obraSel = obras.find(o=>o.id===obraId);

    // Todos los horarios registrados para esta obra
    const horariosTodosObra = horarios.filter(h => coincideObra(h, obraId));

    // Horarios dentro del período del informe (para saber los turnos específicos de esos días)
    const horariosPeriodo = horariosTodosObra.filter(h =>
      (!periodoInicio || h.fecha>=periodoInicio) &&
      (!periodoFin || h.fecha<=periodoFin)
    );

    // Personal asignado directamente a la obra (pestaña Personal en Obra)
    const idsDirectos = Array.isArray(obraSel?.empleados) ? obraSel.empleados : [];

    // Personal asignado por horarios (del período y de toda la obra)
    const idsHorariosPeriodo = horariosPeriodo.map(h => h.empleadoId).filter(Boolean);
    const idsHorariosTodos = horariosTodosObra.map(h => h.empleadoId).filter(Boolean);

    // Unificamos todo el personal de la obra
    const idsObra = [...new Set([
      ...idsHorariosPeriodo,
      ...idsDirectos,
      ...idsHorariosTodos,
    ])];

    const vinculados = idsObra.map((eid)=>{
      const emp = resolverEmpleado(eid);
      const empIdReal = emp?.id || (typeof eid === "string" ? eid : "");
      const empNombreReal = emp?.nombre || (typeof eid === "string" && !eid.startsWith("EMP-") ? eid : "");

      const prev = (prevPersonal || []).find(p =>
        (empIdReal && p.empleadoId === empIdReal) ||
        (empNombreReal && p.nombre && p.nombre.trim().toLowerCase() === empNombreReal.trim().toLowerCase())
      ) || {};

      // Turnos en el período del informe
      const turnosPeriodo = [...new Set(
        horariosPeriodo
          .filter(h => (empIdReal && h.empleadoId === empIdReal) || (emp?.id && h.empleadoId === emp.id))
          .map(h => fmtTurno12(h.turno))
          .filter(Boolean)
      )];

      // Turnos históricos o habituales en la obra si no hay en ese rango exacto
      const turnosHistoricos = [...new Set(
        horariosTodosObra
          .filter(h => (empIdReal && h.empleadoId === empIdReal) || (emp?.id && h.empleadoId === emp.id))
          .map(h => fmtTurno12(h.turno))
          .filter(Boolean)
      )];

      const turnosElegidos = turnosPeriodo.length ? turnosPeriodo : turnosHistoricos;

      return {
        empleadoId: empIdReal,
        cargo: prev.cargo || emp?.cargo || 'Instalador',
        nombre: empNombreReal || prev.nombre || '',
        turno1: prev.turno1 || turnosElegidos[0] || '',
        turno2: prev.turno2 || turnosElegidos[1] || '',
        manual: false,
      };
    }).filter(v => v.nombre || v.empleadoId);

    // Las filas agregadas a mano se conservan, sean de alguien registrado o
    // escritas a pulso. Se descartan las que dupliquen a un vinculado.
    const yaVinculado = new Set(vinculados.map((v)=>v.empleadoId || v.nombre));
    const agregadas = (prevPersonal || []).filter((p)=>
      (p.agregada || (p.manual && !p.empleadoId)) && !yaVinculado.has(p.empleadoId) && !yaVinculado.has(p.nombre)
    );
    return [...vinculados, ...agregadas];
  },[obras,resolverEmpleado,horarios]);

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
        fotos:Array.isArray(actividad?.fotos)
          ? actividad.fotos
              .filter(foto=>Boolean(foto?.img||foto?.url))
              .map((foto)=>({img:foto.img||foto.url,comentario:foto.comentario||""}))
          : [],
      }));
    }
    if(data.actividad || data.descripcion || data.observaciones || (Array.isArray(data.fotos) && data.fotos.length)){
      return [{
        ...emptyActividad(),
        titulo:data.actividad||"",
        descripcion:data.descripcion||"",
        observaciones:data.observaciones||"",
        fotos:Array.isArray(data.fotos)
          ? data.fotos
              .filter(foto=>Boolean(foto?.img||foto?.url))
              .map((foto)=>({img:foto.img||foto.url,comentario:foto.comentario||""}))
          : [],
      }];
    }
    return [emptyActividad()];
  };

  const buildInformeForm = (data={})=>{
    // Se resuelve la obra aqui y se traen sus datos de una: el efecto que
    // rellenaba estos campos solo corre cuando cambian las obras, no al
    // abrir un informe nuevo, y el proyecto quedaba en blanco.
    const obraBase = obras.find((o)=>o.id===(data.obraId ?? firstObraId)) || obras[0] || null;

    // En un informe nuevo el periodo se deduce de la bitacora de la obra o sus horarios
    const registrosObra = normalizarBitacora(obraBase?.bitacora);
    const fechasAvance = registrosObra.map((r)=>r.fecha).filter(Boolean);
    const fechasHorarios = (horarios || [])
      .filter((h) => coincideObra(h, obraBase?.id))
      .map((h) => h.fecha)
      .filter(Boolean);
    const todasFechas = [...fechasAvance, ...fechasHorarios].sort();
    const periodoInicio = data.periodoInicio ?? todasFechas[0] ?? today();
    const periodoFin = data.periodoFin ?? todasFechas[todasFechas.length-1] ?? today();

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
      .filter(h=>coincideObra(h, form.obraId))
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
    // buildPersonalDesdeObra ya cambia cuando cambian empleados u horarios, asi
    // que nombrarla cubre lo mismo que listarlos aqui otra vez.
  },[obras,buildPersonalDesdeObra]);

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
  },[form.obraId,form.periodoInicio,form.periodoFin,obras,buildPersonalDesdeObra]);

  const updPersonal=(i,f,v)=>setForm(p=>({...p,personal:p.personal.map((x,j)=>j===i?{...x,[f]:v}:x)}));
  const updActividad=(ai,field,val)=>setForm(p=>({...p,actividades:p.actividades.map((a,i)=>i===ai?{...a,[field]:val}:a)}));

  // Actividades cuyo titulo se esta escribiendo a mano, por su posicion.
  const [escribiendoTitulo,setEscribiendoTitulo]=useState([]);
  const marcarLibre=(ai,libre)=>setEscribiendoTitulo((prev)=>
    libre ? [...new Set([...prev,ai])] : prev.filter((i)=>i!==ai));

  // El titulo de la actividad trae consigo sus textos.
  //
  // Los trabajos son siempre los mismos y el texto que se escribia era casi
  // igual cada vez. Al elegir uno se rellenan "Actividades realizadas" y
  // "Descripcion"; se pueden corregir despues, que para eso siguen siendo
  // campos de escribir.
  //
  // Solo se pisa lo que hay si venia de otra plantilla o estaba vacio. Si esta
  // escrito a mano se pregunta antes: puede ser el informe de media jornada.
  const elegirTitulo=(ai,valor)=>{
    if(valor==="__libre__"){ marcarLibre(ai,true); return; }
    marcarLibre(ai,false);

    // "— Elige el trabajo —": se limpia el titulo y se deja el resto como esta.
    if(!valor){ updActividad(ai,"titulo",""); return; }

    const plantilla=buscarPlantillaActividad(valor);
    if(!plantilla){ updActividad(ai,"titulo",valor); return; }

    const act=form.actividades[ai]||{};
    if(!esTextoDePlantilla(act.actividadesRealizadas,act.descripcion)
       && !window.confirm(`Ya hay texto escrito en esta actividad.\n\n¿Reemplazarlo por el de «${plantilla.titulo}»?`)){
      updActividad(ai,"titulo",valor);
      return;
    }

    setForm(p=>({...p,actividades:p.actividades.map((a,i)=>i===ai?{
      ...a,
      titulo:plantilla.titulo,
      actividadesRealizadas:plantilla.actividadesRealizadas,
      descripcion:plantilla.descripcion,
    }:a)}));
  };
  const updFotoAct=(ai,fi,field,val)=>setForm(p=>({...p,actividades:p.actividades.map((a,i)=>i===ai?{...a,fotos:a.fotos.map((ft,j)=>j===fi?{...ft,[field]:val}:ft)}:a)}));

  // Se reduce la imagen antes de guardarla: van como dataURL dentro del
  // informe y una foto de celular sin comprimir hace fallar el guardado.
  //
  // Se admiten VARIAS de una vez: en obra se toman diez o quince fotos y
  // subirlas de una en una -crear el recuadro, clic, buscar el archivo, y
  // otra vez- era el rato mas largo de hacer el informe. La primera ocupa el
  // recuadro donde se hizo clic y las demas van llenando los que esten
  // vacios; si se acaban, se crean.
  const [subiendoFotos,setSubiendoFotos]=useState(null);

  const quitarFotoAct=(ai,fi)=>{
    setForm(p=>({...p,actividades:p.actividades.map((a,i)=>{
      if(i!==ai) return a;
      return {...a,fotos:(a.fotos||[]).filter((_,idx)=>idx!==fi)};
    })}));
  };

  const cargarFotos=async(ai,archivos)=>{
    const lista=[...(archivos||[])].filter(Boolean);
    if(!lista.length)return;

    setSubiendoFotos({actividad:ai,hechas:0,total:lista.length});
    const imagenes=[];
    let fallidas=0;
    for(const archivo of lista){
      try{ imagenes.push(await leerImagenComprimida(archivo)); }
      catch{ fallidas+=1; }
      setSubiendoFotos({actividad:ai,hechas:imagenes.length+fallidas,total:lista.length});
    }
    setSubiendoFotos(null);

    if(imagenes.length){
      setForm(p=>({...p,actividades:p.actividades.map((a,i)=>{
        if(i!==ai)return a;
        const existentes=(a.fotos||[]).filter(f=>f.img);
        const nuevas=imagenes.map(img=>({img,comentario:""}));
        return {...a,fotos:[...existentes,...nuevas]};
      })}));
    }

    if(fallidas){
      window.alert(fallidas===lista.length
        ? "No se pudo cargar ninguna de esas fotos. Intenta con otras imágenes."
        : `Se subieron ${imagenes.length} fotos. ${fallidas} no se pudieron cargar.`);
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

  // Trae los avances de la obra SIN duplicar ni pisar lo escrito.
  //
  // Cada avance viaja con la marca del registro del que salio
  // (`origenBitacoraId`), asi que se sabe cual ya esta en el informe. Se puede
  // pulsar el boton las veces que haga falta -se registro un avance mas en
  // campo y se quiere completar el informe- y solo entran los que faltan.
  //
  // Lo escrito a mano, que no tiene esa marca, no se toca nunca.
  const traerAvancesDeLaObra = ()=>{
    if(!avancesDisponibles.length){
      window.alert(
        "No hay avances registrados en esta obra dentro del período elegido.\n\n" +
        "Ve a Ejecución de obra → abre la obra → pestaña «Avance y fotos» y registra allí lo que se hizo, con las fotos.\n\n" +
        "Si ya los registraste, revisa que las fechas del período cubran esos días."
      );
      return;
    }

    const yaEstan = new Set(
      form.actividades.map((a)=>a.origenBitacoraId).filter(Boolean)
    );
    const nuevos = avancesDisponibles.filter((a)=>!yaEstan.has(a.origenBitacoraId));

    if(!nuevos.length){
      window.alert(
        `Los ${avancesDisponibles.length} avance(s) de la obra ya están en este informe.\n\n` +
        "No se agregó nada para no repetirlos. Si registras un avance nuevo en la obra, " +
        "vuelve a pulsar este botón y se añadirá solo ese."
      );
      return;
    }

    // Las actividades vacías que hubiera -las que se crean al abrir el
    // informe- estorban: se quitan para que no queden huecos en el documento.
    const propias = form.actividades.filter((a)=>
      a.origenBitacoraId
      || a.titulo?.trim() || a.descripcion?.trim() || a.observaciones?.trim()
      || (a.fotos||[]).some((f)=>f.img)
    );

    fotoRefs.current={};
    setForm(p=>({...p,actividades:[...propias,...nuevos]}));
    window.alert(
      nuevos.length===avancesDisponibles.length
        ? `Se agregaron ${nuevos.length} avance(s) de la obra.`
        : `Se agregaron ${nuevos.length} avance(s) nuevo(s). Los otros ${avancesDisponibles.length-nuevos.length} ya estaban.`
    );
  };

  const abrirNuevoInformeRef = useRef(null);
  useEffect(()=>{ abrirNuevoInformeRef.current = abrirNuevoInforme; });

  const descargarPdf = async (inf = sel) => {
    if (!inf) return;
    setGenerandoPdf(true);
    try {
      await descargarInformePdf(inf, { empresaConfig, firmaImg });
    } catch (fallo) {
      window.alert(fallo.message || "No se pudo generar el PDF.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  const imprimirInforme = (inf = sel) => {
    if (!inf) return;
    const html = buildInformePrintHtml(inf, { empresaConfig, firmaImg });
    openPrintTab(html, `Informe ${inf?.id || ""}`);
  };

  // En la barra superior: botones de acción fija para detalle (Volver, Editar, Descargar, Imprimir)
  // o botón de creación (+ Nuevo Informe) en la lista.
  useAccionesPantalla(
    sel && !nuevo && !editId ? (
      <div style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "nowrap" }}>
        <button
          style={{
            ...B("var(--btn-cancelar-bg, #f1f5f9)", "var(--btn-cancelar-txt, #475569)"),
            border: "1px solid #cbd5e1",
            padding: "7px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
          }}
          onClick={() => setSel(null)}
        >
          ← Volver
        </button>
        <button
          style={{
            ...B("rgba(37, 99, 235, 0.08)", "#2563eb"),
            border: "1px solid rgba(37, 99, 235, 0.25)",
            padding: "7px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
          }}
          onClick={() => editarInforme(sel)}
        >
          ✏️ Editar
        </button>
        <button
          style={{
            ...B("#f47c20", "#ffffff"),
            boxShadow: "0 2px 8px rgba(244, 124, 32, 0.25)",
            padding: "7px 16px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            opacity: generandoPdf ? 0.65 : 1,
          }}
          disabled={generandoPdf}
          onClick={() => descargarPdf(sel)}
        >
          {generandoPdf ? "Generando PDF…" : "📥 Descargar PDF"}
        </button>
        <button
          style={{
            ...B("var(--btn-cancelar-bg, #f1f5f9)", "var(--btn-cancelar-txt, #475569)"),
            border: "1px solid #cbd5e1",
            padding: "7px 14px",
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
          }}
          onClick={() => imprimirInforme(sel)}
        >
          🖨️ Imprimir
        </button>
      </div>
    ) : (!sel && !nuevo && !editId) ? (
      <button
        style={{
          background: "#f47c20",
          color: "#fff",
          border: "1px solid #f47c20",
          borderRadius: 9,
          padding: "8px 16px",
          fontSize: 12.5,
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
        onClick={() => abrirNuevoInformeRef.current()}
      >
        + Nuevo Informe
      </button>
    ) : null,
    [sel, nuevo, editId, generandoPdf, empresaConfig, firmaImg]
  );

  const abrirNuevoInforme = ()=>{
    setEditId(null);
    setSel(null);
    fotoRefs.current={};
    setForm(buildInformeForm());
    setNuevo(true);
  };

  const editarInforme = async (inf)=>{
    // Las fotos no vienen en la carga inicial. Se piden ANTES de llenar el
    // formulario: con las actividades vacias, guardar borraria el registro
    // fotografico entero.
    const completo = (await asegurarDetalle("informes", inf.id)) || inf;
    setEditId(completo.id);
    fotoRefs.current={};
    setForm(buildInformeForm(completo));
    setSel(completo);
    setNuevo(true);
  };

  const guardar=()=>{
    const prev = editId ? informes.find((item) => item.id === editId) : null;
    const miUserId = ctx?.membresia?.userId || null;
    const miNombre = resolverAutorGuardado(ctx?.membresia, prev?.modificadoPorNombre);
    const actividades = normalizeInformeActividades(form);
    const legacyActividad = actividades[0] || emptyActividad();
    const obraIdNormalizado = form.obraId || null;
    const inf={
      ...(editId
        ? {id:editId,...form,obraId:obraIdNormalizado,actividades,actividad:legacyActividad.titulo,descripcion:legacyActividad.descripcion,observaciones:legacyActividad.observaciones,fotos:legacyActividad.fotos}
        : {id:siguienteIdUnico(informes,"INF"),...form,obraId:obraIdNormalizado,actividades,actividad:legacyActividad.titulo,descripcion:legacyActividad.descripcion,observaciones:legacyActividad.observaciones,fotos:legacyActividad.fotos}),
      creadoPor: prev?.creadoPor || miUserId,
      creadoPorNombre: prev?.creadoPorNombre ? normalizarNombrePersona(prev.creadoPorNombre, "Camila Sepúlveda") : (resolverAutorGuardado(ctx?.membresia) || "Camila Sepúlveda"),
      creadoEn: prev?.creadoEn || new Date().toISOString(),
      modificadoPor: miUserId,
      modificadoPorNombre: miNombre || resolverAutorGuardado(ctx?.membresia, prev?.modificadoPorNombre) || "Camila Sepúlveda",
      modificadoEn: new Date().toISOString(),
    };
    setInformes(prevList=>editId ? prevList.map(item=>item.id===editId?{...item,...inf}:item) : [...prevList,inf]);
    setNuevo(false);
    setEditId(null);
    setSel(inf);
  };

  return(
    <div style={{padding:"14px 28px 28px"}}>

      {obras.length===0 && (
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
              // avance o de turnos de esa obra y se traen sus registros.
              const registros=normalizarBitacora(o?.bitacora);
              const fechasBitacora=registros.map(r=>r.fecha).filter(Boolean);
              const fechasHorarios=(horarios||[]).filter(h=>coincideObra(h, nuevaObraId)).map(h=>h.fecha).filter(Boolean);
              const todasFechas=[...fechasBitacora, ...fechasHorarios].sort();
              setForm(p=>{
                const inicio=todasFechas[0]||p.periodoInicio;
                const fin=todasFechas[todasFechas.length-1]||p.periodoFin;
                const traidas=actividadesDesdeObra(nuevaObraId,inicio,fin);
                return {
                  ...p,
                  obraId:nuevaObraId,
                  proyecto:normalizarMayusculas(o?.proyecto||""),
                  localizacion:normalizarMayusculas(o?.ciudad||""),
                  periodoInicio:inicio,
                  periodoFin:fin,
                  personal:buildPersonalDesdeObra(nuevaObraId,inicio,fin,[]),
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
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <LBL>Personal en obra</LBL>
                <button
                  type="button"
                  onClick={() => {
                    setForm(p => ({
                      ...p,
                      personal: buildPersonalDesdeObra(p.obraId, p.periodoInicio, p.periodoFin, [])
                    }));
                  }}
                  style={{
                    background: "var(--btn-cancelar-bg, #f1f5f9)",
                    border: "1px solid var(--border, #cbd5e1)",
                    color: "var(--btn-cancelar-txt, #334155)",
                    borderRadius: 6,
                    padding: "3px 9px",
                    fontSize: 11,
                    cursor: "pointer",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                  title="Recargar el personal asignado a esta obra y sus horarios"
                >
                  🔄 Sincronizar de la obra ({form.personal.length})
                </button>
              </div>
              <div style={{fontSize:11,color:"var(--text-muted, #64748b)"}}>Se carga automáticamente según la obra y los horarios. Los turnos se muestran en formato 12h.</div>
            </div>
            <datalist id="turnosInformeList">
              {turnosDisponiblesObra.map((t,i)=><option key={i} value={t} />)}
            </datalist>
            {form.personal.length === 0 && (
              <div style={{ background: "var(--surface-subtle, #f8fafc)", border: "1px dashed var(--border, #e2e8f0)", borderRadius: 10, padding: "14px 16px", fontSize: 12.5, color: "var(--text-subtle, #98a2b3)", marginBottom: 8 }}>
                No hay personal asignado a esta obra todavía. Sincroniza desde la obra o agrega personas manualmente.
              </div>
            )}
            {form.personal.map((p, i) => {
              const empObj = empleados.find(x => x.id === p.empleadoId);
              const nombreDisplay = p.nombre || empObj?.nombre || "Técnico";
              const initials = (nombreDisplay.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("") || "TE").toUpperCase();

              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr 32px", gap: 10, alignItems: "center", marginBottom: 8, background: "var(--surface-subtle, #f8fafc)", border: "1px solid var(--border, #eaecf0)", borderRadius: 10, padding: "8px 10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <Av init={initials} size={28} color="#101828" />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 0 }}>
                      <select
                        value={p.manual ? "__manual__" : (p.empleadoId || "")}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === "__manual__") {
                            setForm(pf => ({ ...pf, personal: pf.personal.map((x, j) => j === i ? { ...x, empleadoId: "", nombre: "", manual: true } : x) }));
                            return;
                          }
                          const emp = empleados.find(x => x.id === v);
                          setForm(pf => ({ ...pf, personal: pf.personal.map((x, j) => j === i ? {
                            ...x,
                            empleadoId: v,
                            nombre: emp?.nombre || "",
                            cargo: emp?.cargo || x.cargo || "",
                            manual: false,
                          } : x) }));
                        }}
                        style={{ ...SI, fontSize: 12, padding: "5px 8px" }}
                      >
                        <option value="">Seleccionar técnico…</option>
                        {empleados.filter(e => e.activo !== false).map(e => (
                          <option key={e.id} value={e.id}>{e.nombre}{e.cargo ? ` · ${e.cargo}` : ""}</option>
                        ))}
                        <option value="__manual__">Escribir a mano…</option>
                      </select>
                      {p.manual && (
                        <input
                          value={p.nombre}
                          onChange={e => updPersonal(i, "nombre", e.target.value)}
                          onBlur={e => { const v = normalizarNombrePropio(e.target.value); if (v !== p.nombre) updPersonal(i, "nombre", v); }}
                          placeholder="Nombre completo"
                          autoCapitalize="words"
                          style={{ ...SI, fontSize: 12, padding: "5px 8px" }}
                        />
                      )}
                    </div>
                  </div>
                  <input value={p.cargo} onChange={e => updPersonal(i, "cargo", e.target.value)} onBlur={e => { const v = normalizarFrase(e.target.value); if (v !== p.cargo) updPersonal(i, "cargo", v); }} placeholder="Cargo técnico" style={{ ...SI, fontSize: 12, padding: "5px 8px" }} />
                  <input list="turnosInformeList" value={p.turno1 || ""} onChange={e => updPersonal(i, "turno1", e.target.value)} placeholder="Turno 1 · 07:00 AM - 05:00 PM" style={{ ...SI, fontSize: 12, padding: "5px 8px" }} />
                  <input list="turnosInformeList" value={p.turno2 || ""} onChange={e => updPersonal(i, "turno2", e.target.value)} placeholder="Turno 2 · opcional" style={{ ...SI, fontSize: 12, padding: "5px 8px" }} />
                  <button
                    type="button"
                    title="Quitar técnico"
                    onClick={() => setForm(pf => ({ ...pf, personal: pf.personal.filter((_, j) => j !== i) }))}
                    style={{ background: "transparent", border: "none", color: "#98a2b3", borderRadius: 6, cursor: "pointer", fontSize: 16, padding: 2, lineHeight: 1 }}
                    onMouseEnter={e => { e.currentTarget.style.color = "#d92d20"; }}
                    onMouseLeave={e => { e.currentTarget.style.color = "#98a2b3"; }}
                  >×</button>
                </div>
              );
            })}
            <button onClick={()=>setForm(p=>({...p,personal:[...p.personal,emptyPersona()]}))} style={{...B("var(--btn-cancelar-bg, #f1f5f9)","var(--btn-cancelar-txt, #475569)"),fontSize:12,marginTop:4}}>+ Agregar persona</button>
          </div>

          {/* Actividades */}
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,flexWrap:"gap",gap:8}}>
              <LBL>Actividades ejecutadas</LBL>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <button onClick={traerAvancesDeLaObra} style={{...B("rgba(30, 64, 175, 0.15)","#60a5fa"),fontSize:11,padding:"5px 12px"}}>
                  ↻ Traer avances de la obra ({avancesDisponibles.length})
                </button>
                <button onClick={()=>setForm(p=>({...p,actividades:[...p.actividades,emptyActividad()]}))} style={{...B("#cc0000"),fontSize:11,padding:"5px 12px"}}>+ Agregar actividad</button>
              </div>
            </div>
            <div style={{background:"var(--surface-subtle, #f8fafc)",border:"1px solid var(--border, #e2e8f0)",borderRadius:8,padding:"10px 13px",fontSize:11.5,color:"var(--text-muted, #475569)",lineHeight:1.55,marginBottom:12}}>
              Estas actividades salen de lo que se registró en la obra, en la pestaña
              «Avance y fotos». Aquí las puedes retocar antes de imprimir sin dañar el registro
              original de la obra.
              {avancesTotalesObra.length>avancesDisponibles.length && (
                <div style={{color:"#f59e0b",marginTop:5}}>
                  Ojo: la obra tiene <strong>{avancesTotalesObra.length}</strong> avance(s) en total,
                  pero solo <strong>{avancesDisponibles.length}</strong> caen entre el
                  {" "}{fmtD(form.periodoInicio)} y el {fmtD(form.periodoFin)}. Amplía el período de
                  arriba si quieres incluirlos todos.
                </div>
              )}
            </div>
            {form.actividades.map((act,ai)=>(
              <div key={ai} style={{background:"var(--surface-subtle, #f8fafc)",border:"1px solid var(--border, #e2e8f0)",borderRadius:10,padding:16,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#cc0000"}}>Actividad {ai+1}</div>
                  {form.actividades.length>1&&<button onClick={()=>{
                    setForm(p=>({...p,actividades:p.actividades.filter((_,i)=>i!==ai)}));
                    // Las actividades se guardan por su posicion, asi que al
                    // quitar una hay que correr las de despues; si no, la
                    // marca de "titulo escrito a mano" se queda en la de al
                    // lado.
                    setEscribiendoTitulo((prev)=>prev
                      .filter((i)=>i!==ai)
                      .map((i)=>(i>ai ? i-1 : i)));
                  }} style={{background:"rgba(220, 38, 38, 0.15)",border:"none",color:"#f87171",borderRadius:5,padding:"2px 8px",cursor:"pointer",fontSize:11}}>× Eliminar</button>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 170px",gap:10,marginBottom:10}}>
                  <div>
                    <LBL>Título / nombre de la actividad</LBL>
                    {/* Desplegable de verdad y no una lista de sugerencias.
                        Con la lista de sugerencias habia que BORRAR lo escrito
                        para volver a ver las opciones -solo enseña las que
                        empiezan por lo que hay puesto-, y ademas no se notaba
                        que aquello se pudiera desplegar. */}
                    <select
                      value={escribiendoTitulo.includes(ai) ? "__libre__" : (buscarPlantillaActividad(act.titulo) ? act.titulo : "")}
                      onChange={e=>elegirTitulo(ai,e.target.value)}
                      style={SI}>
                      <option value="">— Elige el trabajo —</option>
                      {PLANTILLAS_ACTIVIDAD.map((p)=>(
                        <option key={p.titulo} value={p.titulo}>{p.titulo}</option>
                      ))}
                      <option value="__libre__">Otro (lo escribo yo)</option>
                    </select>

                    {/* El campo de escribir solo aparece cuando hace falta:
                        si se eligio "Otro" o si lo que hay puesto no sale en
                        la lista -por ejemplo un informe de los de antes-. */}
                    {(escribiendoTitulo.includes(ai) || (act.titulo && !buscarPlantillaActividad(act.titulo))) && (
                      <input
                        value={act.titulo}
                        onChange={e=>updActividad(ai,"titulo",e.target.value)}
                        placeholder="Escribe el nombre de la actividad"
                        style={{...SI,marginTop:6}}/>
                    )}

                    <div style={{fontSize:10.5,color:"var(--text-muted, #64748b)",marginTop:4}}>
                      {escribiendoTitulo.includes(ai) || (act.titulo && !buscarPlantillaActividad(act.titulo))
                        ? "Escrito a mano: los textos de abajo no se tocan."
                        : "Al elegir uno se completan los textos de abajo."}
                    </div>
                  </div>
                  <div><LBL>Fecha de ejecución</LBL><input type="date" value={act.fecha||""} onChange={e=>updActividad(ai,"fecha",e.target.value)} style={SI}/></div>
                </div>
                {/* Dos campos y no uno solo con los encabezados dentro: puestos
                    seguidos en el mismo recuadro se leian como un ladrillo, y
                    el rotulo de cada bloque ya lo pone la tabla del documento.

                    normalizarParrafos y no normalizarFrase: estos campos llevan
                    varios parrafos y el otro los aplasta en uno solo. */}
                <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><LBL>Actividades realizadas</LBL><BotonCorregir valor={act.actividadesRealizadas||""} onChange={(v)=>updActividad(ai,"actividadesRealizadas",v)} compacto/></div><textarea value={act.actividadesRealizadas||""} onChange={e=>updActividad(ai,"actividadesRealizadas",e.target.value)} onBlur={e=>{const v=normalizarParrafos(e.target.value);if(v!==act.actividadesRealizadas)updActividad(ai,"actividadesRealizadas",v);}} rows={7} placeholder="Qué se ejecutó en campo: inspección, ajustes, limpieza..." spellCheck lang="es" style={{...SI,resize:"vertical",lineHeight:1.5}}/></div>
                <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><LBL>Descripción</LBL><BotonCorregir valor={act.descripcion} onChange={(v)=>updActividad(ai,"descripcion",v)} compacto/></div><textarea value={act.descripcion} onChange={e=>updActividad(ai,"descripcion",e.target.value)} onBlur={e=>{const v=normalizarParrafos(e.target.value);if(v!==act.descripcion)updActividad(ai,"descripcion",v);}} rows={6} placeholder="Descripción del proceso ejecutado..." spellCheck lang="es" style={{...SI,resize:"vertical",lineHeight:1.5}}/></div>
                <div style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><LBL>Observaciones</LBL><BotonCorregir valor={act.observaciones} onChange={(v)=>updActividad(ai,"observaciones",v)} compacto/></div><input value={act.observaciones} onChange={e=>updActividad(ai,"observaciones",e.target.value)} onBlur={e=>{const v=normalizarFrase(e.target.value);if(v!==act.observaciones)updActividad(ai,"observaciones",v);}} placeholder="Ej: 1 Línea de vida horizontal de 119 metros" spellCheck lang="es" style={SI}/></div>
                {/* Fotos de esta actividad */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,marginTop:12}}>
                  <LBL>Registro fotográfico</LBL>
                  <span style={{fontSize:10.5,color:"var(--text-subtle, #94a3b8)"}}>Se imprimen en el informe</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, alignItems: "start" }}>
                  {(act.fotos || []).map((ft, fi) => (
                    <div key={fi} style={{ background: "var(--surface, #ffffff)", border: "1px solid var(--border, #eaecf0)", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                      <div style={{ background: "var(--surface-subtle, #f8fafc)", padding: 6, minHeight: 130, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(16,24,40,0.75)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                          Evidencia #{fi + 1}
                        </span>
                        <img src={ft.img} alt="" style={{ width: "100%", height: "auto", maxHeight: 180, objectFit: "contain", display: "block", borderRadius: 4, background: "var(--surface, #ffffff)" }} />
                      </div>
                      <div style={{ padding: "8px", display: "flex", gap: 4, alignItems: "center", borderTop: "1px solid var(--border, #f2f4f7)" }}>
                        <input
                          value={ft.comentario || ""}
                          onChange={e => updFotoAct(ai, fi, "comentario", e.target.value)}
                          onBlur={e => {
                            const limpio = normalizarFrase(e.target.value);
                            if (limpio !== ft.comentario) updFotoAct(ai, fi, "comentario", limpio);
                          }}
                          placeholder={`Descripción evidencia ${fi + 1}`}
                          style={{ ...SI, fontSize: 11.5, padding: "4px 6px", flex: 1 }}
                        />
                        <button
                          type="button"
                          onClick={() => quitarFotoAct(ai, fi)}
                          title="Eliminar foto"
                          style={{ background: "transparent", border: "none", color: "#98a2b3", borderRadius: 6, width: 22, height: 22, cursor: "pointer", fontSize: 16, flexShrink: 0, lineHeight: 1 }}
                          onMouseEnter={e => { e.currentTarget.style.color = "#d92d20"; }}
                          onMouseLeave={e => { e.currentTarget.style.color = "#98a2b3"; }}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}

                  <div
                    onClick={() => { const k = "lote-" + ai; if (fotoRefs.current[k]) fotoRefs.current[k].click(); }}
                    style={{
                      border: "2px dashed var(--border, #cbd5e1)",
                      borderRadius: 10,
                      minHeight: 140,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      background: "var(--surface-subtle, #f8fafc)",
                      color: "var(--text-main, #101828)",
                      fontWeight: 600,
                      gap: 4,
                      padding: 12,
                      textAlign: "center",
                      transition: "border-color .15s ease, background .15s ease",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = "#E0342A";
                      e.currentTarget.style.background = "rgba(224, 52, 42, 0.04)";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "var(--border, #cbd5e1)";
                      e.currentTarget.style.background = "var(--surface-subtle, #f8fafc)";
                    }}
                  >
                    <span style={{ fontSize: 24, lineHeight: 1, color: "#E0342A" }}>+</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>Subir evidencias</span>
                    <span style={{ fontSize: 10, color: "var(--text-muted, #667085)" }}>Arrastra fotos o haz clic</span>
                  </div>
                </div>

                <input
                  ref={el=>{fotoRefs.current["lote-"+ai]=el;}}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{display:"none"}}
                  onChange={e=>{
                    cargarFotos(ai,e.target.files);
                    e.target.value="";
                  }}
                />

                {subiendoFotos?.actividad===ai && (
                  <div style={{fontSize:11.5,color:"#f47c20",marginTop:8,fontWeight:600}}>
                    ⏳ Cargando fotos… {subiendoFotos.hechas} de {subiendoFotos.total}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><LBL>Recomendaciones generales</LBL><BotonCorregir valor={form.recomendaciones} onChange={(v)=>setForm(p=>({...p,recomendaciones:v}))} compacto/></div><textarea value={form.recomendaciones} onChange={e=>setForm(p=>({...p,recomendaciones:e.target.value}))} onBlur={e=>{const v=normalizarParrafos(e.target.value);if(v!==form.recomendaciones)setForm(p=>({...p,recomendaciones:v}));}} rows={3} spellCheck lang="es" style={{...SI,resize:"vertical"}}/></div>
          <div style={{display:"flex",gap:10}}>
            <button style={B("#cc0000")} onClick={guardar}>{editId ? "Guardar cambios" : "Guardar informe"}</button>
            <button style={B("var(--btn-cancelar-bg, #f1f5f9)","var(--btn-cancelar-txt, #475569)")} onClick={()=>{setNuevo(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de informes. Se esconde mientras se esta escribiendo uno: la
          pantalla se dedica al formulario y no a los que ya estan hechos. */}
      {!sel&&!nuevo&&(
        <ListaInformes
          informes={informes}
          acciones={{
            ver: async (inf)=>{
              setSel(inf);
              const completo = await asegurarDetalle("informes", inf.id);
              if(completo) setSel(completo);
            },
            editar: (inf)=>editarInforme(inf),
            // El puente informe -> certificacion ya existia, pero habia que
            // salir a Certificaciones y buscar la obra a mano. Se pasa tambien
            // CUAL informe, que es lo que decide el proyecto y el detalle
            // cuando la obra tiene varios -una sede por informe-.
            certificar: (inf)=>irAPantalla("certificaciones",{obraId:inf.obraId,informeId:inf.id}),
          }}
        />
      )}

      {/* Vista detalle + impresión */}
      {sel && !nuevo && !editId && (() => {
        const control = getControlDocumental(empresaConfig)?.informe;
        const docCodigo = control?.codigo || "FO-ACT-04";
        const docVersion = control?.version || "03";
        const docFecha = control?.fecha ? fmtL(control.fecha) : fmtL(sel?.fechaInforme);
        const proyecto = normalizarMayusculas(sel?.proyecto || "");
        const localizacion = normalizarMayusculas(sel?.localizacion || "");
        const cliente = normalizarMayusculas(sel?.cliente || (obras?.find(o => o.id === sel?.obraId)?.cliente) || "");
        const fechaInforme = fmtL(sel?.fechaInforme);
        const periodo = `${fmtL(sel?.periodoInicio)} al ${fmtL(sel?.periodoFin)}`;
        const personal = Array.isArray(sel?.personal) ? sel.personal : [];
        const numDoc = sel?.id ? String(sel.id).trim() : (sel?.numero ? String(sel.numero).trim() : "");
        const rawActividades = (sel.actividades || [{ titulo: sel.actividad, descripcion: sel.descripcion, observaciones: sel.observaciones, fotos: sel.fotos || [] }]).map(conActividadSeparada);

        return (
          <div>
            <div className="doc-paper-wrapper" style={{ maxWidth: 920, margin: "0 auto", width: "100%" }}>
              <div
                id="pz"
                className="doc-shell"
                style={{
                  background: "#fff",
                  color: "#0f172a",
                  fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                  fontSize: 12,
                  lineHeight: 1.5,
                  border: "1px solid #cbd5e1",
                  boxShadow: "0 4px 20px rgba(15, 23, 42, 0.08)",
                  padding: "32px 40px",
                  borderRadius: 6,
                }}
              >
                {/* Línea de acento superior */}
                <div style={{ height: 4, background: "linear-gradient(90deg, #ea580c 0%, #f97316 40%, #0f172a 100%)", borderRadius: 2, marginBottom: 14 }}></div>

                {/* Encabezado Matriz SGC */}
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1.5px solid #1e293b", marginBottom: 14, background: "#ffffff" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "28%", textAlign: "left", borderRight: "1.5px solid #1e293b", padding: "8px 12px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {LOGO_INGEANCLAJES && <img src={LOGO_INGEANCLAJES} alt="Ingeanclajes" style={{ height: 30, objectFit: "contain" }} />}
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                            INGE<span style={{ color: "#ea580c" }}>ANCLAJES</span>
                          </div>
                        </div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>
                          Especialistas en Anclajes S.A.S
                        </div>
                        <div style={{ fontSize: 9, color: "#94a3b8", marginTop: 2 }}>
                          NIT. 900.193.965-4 · PBX (604) 448 26 86
                        </div>
                      </td>
                      <td style={{ width: "46%", textAlign: "center", padding: "8px 10px", verticalAlign: "middle", borderRight: "1px solid #334155" }}>
                        <div style={{ fontSize: 9.5, fontWeight: 800, color: "#ea580c", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                          Sistema de Gestión de la Calidad
                        </div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0f172a", letterSpacing: "0.04em", marginTop: 3, lineHeight: 1.25 }}>
                          INFORME TÉCNICO DE ACTIVIDADES EN OBRA
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 500, color: "#475569", marginTop: 2 }}>
                          Inspección, Montaje y Pruebas Estructurales
                        </div>
                      </td>
                      <td style={{ width: "26%", fontSize: 9.5, lineHeight: 1.55, background: "#fafafa", padding: "8px 12px", verticalAlign: "middle" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: 2, marginBottom: 2 }}>
                          <span style={{ color: "#64748b", fontWeight: 600 }}>CÓDIGO:</span>
                          <span style={{ fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>{docCodigo}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: 2, marginBottom: 2 }}>
                          <span style={{ color: "#64748b", fontWeight: 600 }}>VERSIÓN:</span>
                          <span style={{ fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>{docVersion}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #e2e8f0", paddingBottom: 2, marginBottom: 2 }}>
                          <span style={{ color: "#64748b", fontWeight: 600 }}>EMISIÓN:</span>
                          <span style={{ fontWeight: 700, color: "#0f172a", fontFamily: "monospace" }}>{docFecha}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "#64748b", fontWeight: 600 }}>CONSECUTIVO:</span>
                          <span style={{ color: "#ea580c", fontWeight: 800, fontSize: 11, fontFamily: "monospace" }}>{numDoc || "INF-OFICIAL"}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Ficha de Datos del Proyecto */}
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: 11, marginBottom: 14, background: "#ffffff" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "18%", background: "#f8fafc", fontWeight: 700, color: "#475569", letterSpacing: "0.04em", fontSize: 10, textTransform: "uppercase", border: "1px solid #e2e8f0", padding: "6px 10px" }}>PROYECTO:</td>
                      <td style={{ width: "36%", fontWeight: 800, color: "#0f172a", border: "1px solid #e2e8f0", padding: "6px 10px" }}>{proyecto || "OBRA GENERAL"}</td>
                      <td style={{ width: "18%", background: "#f8fafc", fontWeight: 700, color: "#475569", letterSpacing: "0.04em", fontSize: 10, textTransform: "uppercase", border: "1px solid #e2e8f0", padding: "6px 10px" }}>PERÍODO AUDITADO:</td>
                      <td style={{ width: "28%", color: "#0f172a", fontWeight: 600, border: "1px solid #e2e8f0", padding: "6px 10px" }}>{periodo}</td>
                    </tr>
                    <tr>
                      <td style={{ background: "#f8fafc", fontWeight: 700, color: "#475569", letterSpacing: "0.04em", fontSize: 10, textTransform: "uppercase", border: "1px solid #e2e8f0", padding: "6px 10px" }}>CONTRATANTE:</td>
                      <td style={{ color: "#0f172a", fontWeight: 600, border: "1px solid #e2e8f0", padding: "6px 10px" }}>{cliente || "A QUIEN INTERESE"}</td>
                      <td style={{ background: "#f8fafc", fontWeight: 700, color: "#475569", letterSpacing: "0.04em", fontSize: 10, textTransform: "uppercase", border: "1px solid #e2e8f0", padding: "6px 10px" }}>FECHA INFORME:</td>
                      <td style={{ color: "#0f172a", fontWeight: 600, border: "1px solid #e2e8f0", padding: "6px 10px" }}>{fechaInforme}</td>
                    </tr>
                    <tr>
                      <td style={{ background: "#f8fafc", fontWeight: 700, color: "#475569", letterSpacing: "0.04em", fontSize: 10, textTransform: "uppercase", border: "1px solid #e2e8f0", padding: "6px 10px" }}>LOCALIZACIÓN:</td>
                      <td style={{ color: "#0f172a", fontWeight: 600, border: "1px solid #e2e8f0", padding: "6px 10px" }}>{localizacion || "MEDELLÍN"}</td>
                      <td style={{ background: "#f8fafc", fontWeight: 700, color: "#475569", letterSpacing: "0.04em", fontSize: 10, textTransform: "uppercase", border: "1px solid #e2e8f0", padding: "6px 10px" }}>NORMATIVA:</td>
                      <td style={{ border: "1px solid #e2e8f0", padding: "6px 10px" }}>
                        <span style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 4, display: "inline-block" }}>
                          Res. 4272/2021 · OSHA 1926.502
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Sección 1: Personal Técnico en Obra */}
                <div style={{ background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)", color: "#ffffff", padding: "5px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: "4px solid #ea580c", marginBottom: 8, borderRadius: "0 4px 4px 0" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>1. Personal Técnico en Obra</span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" }}>Cuadrilla Asignada en Sitio</span>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: 11, marginBottom: 16, background: "#ffffff" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "38%", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 800, textAlign: "left", color: "#334155", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        CARGO / ESPECIALIDAD EN SITIO
                      </th>
                      <th style={{ width: "62%", background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 800, textAlign: "left", color: "#334155", fontSize: 10, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        NOMBRE COMPLETO DEL PERSONAL EN OBRA
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {personal.length > 0 ? (
                      personal.map((p, idx) => (
                        <tr key={idx} style={{ background: idx % 2 === 1 ? "#fafafa" : "#ffffff" }}>
                          <td style={{ border: "1px solid #e2e8f0", padding: "6px 10px", verticalAlign: "middle" }}>
                            <div style={{ fontWeight: 700, color: "#0f172a", display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ width: 6, height: 6, background: "#ea580c", borderRadius: "50%", display: "inline-block", flexShrink: 0 }}></span>
                              <span>{p.cargo || "Técnico Especialista"}</span>
                            </div>
                          </td>
                          <td style={{ border: "1px solid #e2e8f0", padding: "6px 10px", verticalAlign: "middle", fontWeight: 600, color: "#1e293b", fontSize: 11.5 }}>
                            {p.nombre || "Sin nombre registrado"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2} style={{ border: "1px solid #e2e8f0", padding: "8px 10px", color: "#94a3b8", fontStyle: "italic" }}>
                          Personal asignado conforme a programación de cuadrilla en obra.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Sección 2: Actividades Ejecutadas */}
                <div style={{ background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)", color: "#ffffff", padding: "5px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: "4px solid #ea580c", marginBottom: 8, borderRadius: "0 4px 4px 0" }}>
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>2. Registro y Metodología de Actividades Ejecutadas</span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" }}>Control Operativo</span>
                </div>
                {rawActividades.map((act, ai) => (
                  <div key={ai} style={{ marginBottom: 16 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: 11, marginBottom: 12, background: "#ffffff" }}>
                      <thead>
                        <tr>
                          <th colSpan={2} style={{ background: "#f1f5f9", border: "1px solid #cbd5e1", padding: "6px 10px", fontWeight: 800, textAlign: "left", color: "#0f172a", fontSize: 11.5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ background: "#0f172a", color: "#ffffff", fontFamily: "monospace", fontSize: 10, padding: "2px 6px", borderRadius: 3, fontWeight: 700 }}>
                                {String(ai + 1).padStart(2, "0")}
                              </span>
                              <span>{act.titulo || "Actividad Ejecutada"}</span>
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {act.fecha && (
                          <tr>
                            <td style={{ width: "24%", border: "1px solid #e2e8f0", padding: "5px 10px", background: "#f8fafc", fontWeight: 700, fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>FECHA DE EJECUCIÓN</td>
                            <td style={{ border: "1px solid #e2e8f0", padding: "5px 10px", fontSize: 11, color: "#0f172a", fontWeight: 600 }}>{fmtL(act.fecha)}</td>
                          </tr>
                        )}
                        {(act.actividadesRealizadas || "").trim() && (
                          <tr>
                            <td style={{ width: "24%", border: "1px solid #e2e8f0", padding: "6px 10px", background: "#f8fafc", fontWeight: 700, fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", verticalAlign: "top" }}>ACTIVIDADES REALIZADAS</td>
                            <td style={{ border: "1px solid #e2e8f0", padding: "6px 10px", fontSize: 11, color: "#334155", lineHeight: 1.5, textAlign: "justify", whiteSpace: "pre-line" }}>{act.actividadesRealizadas}</td>
                          </tr>
                        )}
                        {(act.descripcion || "").trim() && (
                          <tr>
                            <td style={{ width: "24%", border: "1px solid #e2e8f0", padding: "6px 10px", background: "#f8fafc", fontWeight: 700, fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", verticalAlign: "top" }}>DESCRIPCIÓN TÉCNICA</td>
                            <td style={{ border: "1px solid #e2e8f0", padding: "6px 10px", fontSize: 11, color: "#334155", lineHeight: 1.5, textAlign: "justify", whiteSpace: "pre-line" }}>{act.descripcion}</td>
                          </tr>
                        )}
                        <tr>
                          <td style={{ width: "24%", border: "1px solid #e2e8f0", padding: "6px 10px", background: "#f8fafc", fontWeight: 700, fontSize: 10, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", verticalAlign: "top" }}>CRITERIO / OBSERVACIONES</td>
                          <td style={{ border: "1px solid #e2e8f0", padding: "6px 10px", fontSize: 11, color: "#334155", lineHeight: 1.45 }}>
                            {(act.observaciones || "").trim() ? (
                              <span><strong style={{ color: "#059669" }}>✓ Conforme:</strong> {act.observaciones}</span>
                            ) : (
                              <span style={{ color: "#64748b", fontStyle: "italic" }}>Ejecutado a conformidad sin novedades reportadas.</span>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {/* Fotos */}
                    {(act.fotos || []).some(ft => ft.img || ft.url) && (
                      <div style={{ marginBottom: 18 }}>
                        <div style={{ background: "linear-gradient(90deg, #0f172a 0%, #1e293b 100%)", color: "#ffffff", padding: "5px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderLeft: "4px solid #ea580c", marginBottom: 10, borderRadius: "0 4px 4px 0" }}>
                          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>3. Panel Técnico de Evidencias Fotográficas · {act.titulo || "Actividad"}</span>
                          <span style={{ fontSize: 9.5, fontWeight: 600, color: "#94a3b8", letterSpacing: "0.04em", textTransform: "uppercase" }}>Registro Visual en Sitio</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                          {(act.fotos || []).filter(ft => ft.img || ft.url).map((ft, fi) => (
                            <div key={fi} style={{ border: "1px solid #cbd5e1", borderRadius: 4, overflow: "hidden", background: "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                              <div style={{ height: 210, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                                <img src={ft.img || ft.url} alt={`Evidencia ${fi + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#ffffff" }} onError={e => { e.target.style.display = "none"; }} />
                              </div>
                              <div style={{ padding: "6px 10px", fontSize: 10, color: "#334155", lineHeight: 1.35, background: "#ffffff" }}>
                                <strong style={{ color: "#ea580c" }}>REF {ai + 1}.{fi + 1}:</strong> {ft.comentario || "Registro fotográfico y trazabilidad de actividades ejecutadas en sitio."}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Recomendaciones */}
                {sel.recomendaciones && (
                  <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, overflow: "hidden", marginBottom: 16, background: "#ffffff" }}>
                    <div style={{ background: "#f1f5f9", padding: "5px 10px", fontSize: 10, fontWeight: 800, color: "#334155", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #cbd5e1" }}>
                      RECOMENDACIONES TÉCNICAS GENERALES
                    </div>
                    <div style={{ padding: "8px 12px", fontSize: 11, color: "#334155", lineHeight: 1.5, textAlign: "justify", whiteSpace: "pre-line" }}>
                      {sel.recomendaciones}
                    </div>
                  </div>
                )}

                {/* Firmas */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 24 }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "50%", padding: "0 14px 0 0", verticalAlign: "top" }}>
                        <div style={{ borderTop: "2px solid #0f172a", paddingTop: 8, fontSize: 10.5, lineHeight: 1.45 }}>
                          <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                            Por el Contratista (Ingeanclajes S.A.S):
                          </div>
                          <div style={{ height: 50, display: "flex", alignItems: "flex-end", marginBottom: 4 }}>
                            {firmaImg ? (
                              <img src={firmaImg} alt="Firma" style={{ maxHeight: 48, maxWidth: 200, objectFit: "contain" }} />
                            ) : (
                              <div style={{ fontFamily: "'Segoe Script', cursive, sans-serif", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>
                                Jhon Jaime Sepúlveda L.
                              </div>
                            )}
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 11, color: "#0f172a", letterSpacing: "0.02em" }}>
                            ING. JHON JAIME SEPÚLVEDA LONDOÑO
                          </div>
                          <div style={{ fontSize: 9.5, color: "#64748b" }}>Director Técnico de Obra · MP. 05248-12458</div>
                          <div style={{ fontSize: 9.5, color: "#64748b" }}>Ingeanclajes S.A.S · NIT. 900.193.965-4</div>
                        </div>
                      </td>
                      <td style={{ width: "50%", padding: "0 0 0 14px", verticalAlign: "top" }}>
                        <div style={{ borderTop: "2px solid #0f172a", paddingTop: 8, fontSize: 10.5, lineHeight: 1.45 }}>
                          <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748b", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
                            Recibido por la Interventoría / Constructora:
                          </div>
                          <div style={{ height: 50, display: "flex", alignItems: "flex-end", marginBottom: 4, fontSize: 9.5, color: "#94a3b8", fontStyle: "italic" }}>
                            (Firma y sello de recepción a satisfacción)
                          </div>
                          <div style={{ fontWeight: 700, fontSize: 10.5, color: "#0f172a" }}>NOMBRE: ____________________________________</div>
                          <div style={{ fontSize: 9.5, color: "#64748b", marginTop: 2 }}>CARGO / FIRMA: ______________________________</div>
                          <div style={{ fontSize: 9.5, color: "#64748b" }}>EMPRESA: {cliente || "Constructora / Contratante"}</div>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

