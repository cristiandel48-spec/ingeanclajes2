import AvisoFlujo from "../../components/AvisoFlujo";
import Av from "../../components/ui/Av";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import BotonCorregir from "../../components/ui/BotonCorregir";
import PrintHeader from "../../components/print/PrintHeader";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { B, CD, SI, ST } from "../../styles/tokens";
import { fmtD, fmtL, scrollAppToTop, today } from "../../lib/format";
import { openPrintTab } from "../../lib/abrirImpresion";
import { buildInformePrintHtml, fmtPeriodo } from "../../lib/informePrint";
import { descargarInformePdf, generarInformePdf } from "../../lib/informePdf";
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
import TarjetaCotizacionRef from "./TarjetaCotizacionRef";
import { obrasMasNuevasPrimero } from "../../lib/identificadores";
import ModalCotizacionDetalle from "./ModalCotizacionDetalle";
import { ModalEnviarFirma, PanelFirmaRecibido } from "../../components/FirmaRecibidoDocumento";
import { useEnviosFirma, useEstadosFirmaInformes } from "../../hooks/useEnviosFirma";
import { descargarPdfEnviado, listarEnviosFirma } from "../../lib/firmaRecibido";
import { armarPdfConConstancia, descargarBlob, nombreConConstancia } from "../../lib/constanciaRecibido";
import ModalQuienRecibe from "../../components/ModalQuienRecibe";
import { celularDeInforme, clientesConQuienRecibe, correoValido, destinatarioDeInforme, quienRecibeDeCliente } from "../../lib/quienRecibe";
import { normalizarCorreo } from "../../lib/normalizarEntrada";
import { informeRepetido } from "../../lib/duplicados";
import { tieneActaEntrega } from "../../lib/actaEntrega";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";
import { useAccionesPantalla, useTituloPantalla } from "../../context/accionesPantalla";
import { resolverAutorGuardado, normalizarNombrePersona } from "../../lib/autorAuditoria";
import { Button, Callout, useToast } from "../../components/ui";
import { confirmar } from "../../lib/dialogos";
import { FUENTE } from "../../styles/designTokens";

// Editor del informe al estilo de apple.com: sin bordes ni sombras. Cada
// seccion es un bloque blanco sobre el gris de la pagina, con su titulo
// grande, y los campos van rellenos de gris en vez de enmarcados.
// Los tamaños de letra son los de siempre (titulo 14.5, notas 11.5, campos
// 13.5): lo que cambia es el aire y la falta de marcos, no la escala.
const BLOQUE = { background: "var(--surface)", borderRadius: 22, padding: "20px 22px", marginBottom: 14 };
const CAMPO = { ...SI, borderRadius: 12 };
const TITULO_BLOQUE = { fontSize: 14.5, fontWeight: 600, letterSpacing: "-0.01em", lineHeight: 1.3, color: "var(--text-primary)", margin: 0 };
const NOTA = { fontSize: 11.5, color: "var(--text-tertiary)", lineHeight: 1.5 };

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
  const isMobile = useIsMobile();
  const {informes,setInformes,obras,setObras,clientes=[],setClientes,empleados,horarios,intencion,limpiarIntencion,empresaConfig,irAPantalla,asegurarDetalle,cotizaciones=[]}=ctx;
  const firmaImg=getFirmaImg(empresaConfig);
  const [sel,setSel]=useState(null);
  const [generandoPdf,setGenerandoPdf]=useState(false);
  const [modalFirma,setModalFirma]=useState(false);
  const [pidiendoQuienRecibe,setPidiendoQuienRecibe]=useState(false);
  const [intentoGuardar,setIntentoGuardar]=useState(false);
  const [nuevo,setNuevo]=useState(()=>Boolean(ctx.intencion?.pantalla==="informes" && ctx.intencion?.obraId));
  const [editId,setEditId]=useState(null);
  const toast = useToast();
  const { envios: enviosFirma, recargar: recargarEnviosFirma } = useEnviosFirma(sel && !nuevo && !editId ? sel.id : null, {
    onFirmado: (e) => toast.exito(`${e.firmanteNombre || "El cliente"} firmó el recibido del informe ${e.numero || ""}.`),
  });
  // Para la marca de «Firmado» en la lista de informes.
  const estadosFirma = useEstadosFirmaInformes(!sel && !nuevo && !editId);
  const [modalCotizacion,setModalCotizacion]=useState(false);
  const [cotizacionModalData,setCotizacionModalData]=useState(null);
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
        cargo: String(prev.cargo || emp?.cargo || 'INSTALADOR').trim().toUpperCase(),
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

  // Arranca con la obra mas nueva, que es la que casi siempre se busca.
  const firstObraId = obrasMasNuevasPrimero(obras)[0]?.id || "";

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

    const cotBase = cotizaciones.find((c) => c.id === (data.cotizacionId || obraBase?.cotizacionId))
      || (obraBase?.cliente ? cotizaciones.find((c) => c.cliente && normalizarRazonSocial(c.cliente) === normalizarRazonSocial(obraBase.cliente)) : null);

    return {
    obraId:data.obraId ?? obraBase?.id ?? firstObraId,
    cotizacionId:data.cotizacionId ?? cotBase?.id ?? obraBase?.cotizacionId ?? "",
    cotizacionNumero:data.cotizacionNumero ?? cotBase?.numero ?? "",
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

  const obraSeleccionada = obras.find((x) => x.id === form.obraId) || null;
  const faltaActaEnObra = !editId && Boolean(obraSeleccionada && !tieneActaEntrega(obraSeleccionada));

  // La intencion se descarta al salir de la pantalla, para que al volver por
  // el menu no se reabra el formulario.
  useEffect(()=>()=>limpiarIntencion(),[limpiarIntencion]);



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
  const elegirTitulo=async(ai,valor)=>{
    if(valor==="__libre__"){ marcarLibre(ai,true); return; }
    marcarLibre(ai,false);

    // "— Elige el trabajo —": se limpia el titulo y se deja el resto como esta.
    if(!valor){ updActividad(ai,"titulo",""); return; }

    const plantilla=buscarPlantillaActividad(valor);
    if(!plantilla){ updActividad(ai,"titulo",valor); return; }

    const act=form.actividades[ai]||{};
    if(!esTextoDePlantilla(act.actividadesRealizadas,act.descripcion)
       && !(await confirmar(`¿Reemplazar el texto por el de «${plantilla.titulo}»?\n\nYa hay texto escrito en esta actividad.`))){
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

  // El editor y la vista de un informe reemplazan al listado dentro del mismo
  // <main>, que conservaba el scroll: «Editar» o «Ver» en un informe de abajo
  // abria a media pagina. Al cambiar de vista se empieza arriba.
  useEffect(()=>{
    if(nuevo || sel) scrollAppToTop("auto");
  }, [nuevo, editId, sel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const enriquecerInforme = (inf) => {
    if (!inf) return inf;
    const obra = obras?.find((o) => o.id === inf.obraId);
    const cotVinc = cotizaciones?.find((c) => c.id === inf.cotizacionId)
      || (inf.cotizacionNumero ? cotizaciones?.find((c) => c.numero === inf.cotizacionNumero) : null)
      || (obra?.cotizacionId ? cotizaciones?.find((c) => c.id === obra.cotizacionId) : null)
      || (obra?.cliente ? cotizaciones?.find((c) => c.cliente && normalizarRazonSocial(c.cliente) === normalizarRazonSocial(obra.cliente)) : null);

    const clienteFinal = inf.cliente || inf.contratante || obra?.cliente || "";
    const cotNumFinal = inf.cotizacionNumero || cotVinc?.numero || cotVinc?.id || obra?.cotizacionId || "";

    return {
      ...inf,
      cliente: clienteFinal,
      contratante: clienteFinal,
      cotizacionNumero: cotNumFinal,
      cotizacionRef: inf.cotizacionRef || cotNumFinal,
      // A quien proponer el envio a firma de recibido: quien recibe en la
      // obra, si no el contacto de la cotizacion, si no el del directorio.
      ...(() => {
        const contactoCelular = celularDeInforme({ obra: obra || { cliente: clienteFinal }, cotizacion: cotVinc, clientes });
        if (correoValido(inf.recibeEmail)) return { contactoEmail: normalizarCorreo(inf.recibeEmail), contacto: inf.recibeNombre || "", contactoCelular };
        const d = destinatarioDeInforme({ obra: obra || { cliente: clienteFinal }, cotizacion: cotVinc, clientes });
        return { contactoEmail: d.email, contacto: d.nombre, contactoCelular };
      })(),
    };
  };

  // El PDF sale por la impresion del navegador, no fotografiando la pantalla.
  //
  // Antes descargarInformePdf dibujaba el informe con html2canvas a escala 2
  // -192 puntos por pulgada- y lo guardaba como JPEG, asi que el PDF era una
  // foto del documento: el texto dejaba de ser texto y se veia pixelado al
  // ampliarlo o al imprimirlo. Desde la pestaña de impresion, «Guardar como
  // El envio firmado del informe, si lo hay. Del informe abierto ya se tiene;
  // desde la lista se consulta en el momento.
  const envioFirmadoDe = async (inf) => {
    const lista = inf?.id === sel?.id && enviosFirma.length
      ? enviosFirma
      : await listarEnviosFirma("informe", inf?.id).catch(() => []);
    return lista.find((e) => e.estado === "firmado") || null;
  };

  const descargarPdf = async (inf = sel) => {
    if (!inf || generandoPdf) return;
    // Firmado por el cliente: se entrega el PDF que recibio con la constancia
    // al final, no uno nuevo sin firma.
    const firmado = await envioFirmadoDe(inf);
    if (firmado) {
      setGenerandoPdf(true);
      try {
        const original = await descargarPdfEnviado(firmado.pdfRuta);
        descargarBlob(await armarPdfConConstancia(original, firmado), nombreConConstancia(firmado));
      } catch (fallo) {
        console.error("Error al armar el PDF firmado:", fallo);
        window.alert(fallo?.message || "No se pudo armar el PDF firmado.");
      } finally {
        setGenerandoPdf(false);
      }
      return;
    }
    const listo = enriquecerInforme(inf);
    // Sin correo de quien recibe no se genera: se pide y despues se sigue.
    if (!correoValido(listo.contactoEmail)) {
      setSel(inf);
      setPidiendoQuienRecibe("pdf");
      return;
    }
    setGenerandoPdf(true);
    try {
      await descargarInformePdf(listo, { empresaConfig, firmaImg });
    } catch (fallo) {
      console.error("Error al generar PDF del informe:", fallo);
      window.alert(fallo?.message || "No se pudo generar el PDF.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  const imprimirInforme = (inf = sel) => {
    if (!inf) return;
    const listo = enriquecerInforme(inf);
    if (!correoValido(listo.contactoEmail)) {
      setSel(inf);
      setPidiendoQuienRecibe("imprimir");
      return;
    }
    const html = buildInformePrintHtml(listo, { empresaConfig, firmaImg });
    openPrintTab(
      html,
      `Informe ${listo?.id || listo?.numero || ""} ${listo?.proyecto || listo?.cliente || ""}`.trim()
    );
  };

  // En la barra superior, que no se mueve al bajar:
  //   - en el listado, la pildora oscura de crear;
  //   - con un informe abierto, Volver, Editar, Imprimir y Descargar PDF.
  //     Antes iban en la cabecera del informe y se perdian al bajar por el
  //     documento.
  // Las acciones leen la version vigente de cada funcion por medio de la ref.
  const viendoInforme = Boolean(sel && !nuevo && !editId);
  const accionesInformeRef = useRef({});
  useEffect(() => {
    accionesInformeRef.current = {
      editar: () => editarInforme(sel),
      imprimir: () => imprimirInforme(sel),
      descargar: () => descargarPdf(sel),
    };
  });
  useAccionesPantalla(
    (!sel && !nuevo && !editId) ? (
      <Button variante="oscuro" tam="sm" icono="mas" onClick={() => abrirNuevoInformeRef.current()}>
        Nuevo informe
      </Button>
    ) : viendoInforme ? (
      <div style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "nowrap" }}>
        <Button variante="texto" tam="sm" icono="flechaIzq" onClick={() => setSel(null)}>Informes</Button>
        <Button variante="texto" tam="sm" onClick={() => accionesInformeRef.current.editar()}>Editar</Button>
        <Button variante="texto" tam="sm" onClick={() => accionesInformeRef.current.imprimir()} title="Abre la pestaña de impresión del navegador">
          Imprimir
        </Button>
        <Button variante="texto" tam="sm" onClick={() => setModalFirma(true)} title="Envía el informe al cliente para que firme el recibido">
          Enviar para firma
        </Button>
        <Button
          variante="oscuro"
          tam="sm"
          icono="descargar"
          style={{ marginLeft: 6 }}
          disabled={generandoPdf}
          onClick={() => accionesInformeRef.current.descargar()}
          title="Descarga el informe oficial en PDF directamente"
        >
          {generandoPdf ? "Generando…" : enviosFirma.some((e) => e.estado === "firmado") ? "Descargar PDF firmado" : "Descargar PDF"}
        </Button>
      </div>
    ) : null,
    [sel, nuevo, editId, generandoPdf, enviosFirma]
  );
  useTituloPantalla(viendoInforme ? `Informe ${String(sel?.id || sel?.numero || "").trim()}`.trim() : null);

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

  // Quien recibe segun el formulario: lo escrito, o lo que propone el sistema
  // (la obra, la cotizacion o el directorio) mientras no se haya tocado.
  const recibeDelFormulario = () => {
    const obraAct = obras?.find((o) => o.id === form.obraId);
    const cotVinc = cotizaciones?.find((c) => c.id === form.cotizacionId)
      || (form.cotizacionNumero ? cotizaciones?.find((c) => c.numero === form.cotizacionNumero) : null)
      || (obraAct?.cotizacionId ? cotizaciones?.find((c) => c.id === obraAct.cotizacionId) : null);
    const sugerido = destinatarioDeInforme({
      obra: obraAct || { cliente: form.cliente || form.contratante || "" },
      cotizacion: cotVinc,
      clientes,
    });
    return { email: form.recibeEmail ?? sugerido.email, nombre: form.recibeNombre ?? sugerido.nombre };
  };

  // Un segundo clic en «Guardar» antes de cerrar el editor creaba otro
  // informe igual.
  const guardandoRef = useRef(false);

  const guardar=async()=>{
    if (guardandoRef.current) return;
    // Guardar a mitad de la carga dejaba fuera las fotos que faltaban: se
    // agregan al formulario cuando terminan, despues de haber guardado.
    if (subiendoFotos) {
      toast.mostrar(`Espera a que terminen de cargar las fotos (${subiendoFotos.hechas} de ${subiendoFotos.total}).`);
      return;
    }
    guardandoRef.current = true;
    try {
      await guardarInforme();
    } finally {
      setTimeout(() => { guardandoRef.current = false; }, 800);
    }
  };

  const guardarInforme=async()=>{
    // Requisito obligatorio: La obra debe tener acta de entrega (FORM-SST-89)
    if (faltaActaEnObra && obraSeleccionada) {
      toast.error(`La obra ${obraSeleccionada.id} no tiene acta de entrega. Primero debes crear el acta de entrega (FORM-SST-89) en la obra antes de generar su informe de actividades.`);
      return;
    }

    // Sin correo de quien recibe no se guarda: el informe no se le podria
    // enviar al cliente para la firma de recibido.
    const recibe = recibeDelFormulario();
    if (!correoValido(recibe.email)) {
      setIntentoGuardar(true);
      document.getElementById("informe-quien-recibe")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setIntentoGuardar(false);

    // La misma obra, sede y periodo no se informa dos veces.
    // Solo al crear: al editar se deja corregir aunque ya hubiera repetidos.
    const repetido = editId ? null : informeRepetido(informes, { ...form, obraId: form.obraId || null });
    if (repetido) {
      const ver = await confirmar({
        titulo: "Ya hay un informe de esta obra en ese período",
        mensaje: `El informe ${repetido.id} de ${repetido.proyecto || repetido.cliente || "esta obra"} cubre `
          + `${fmtPeriodo(repetido.periodoInicio, repetido.periodoFin) || "esas fechas"}. No se puede crear otro para la misma obra, `
          + "sede y período. Si falta algo, edita ese informe; si es otro período o sede, cambia las fechas o el nombre del proyecto.",
        textoConfirmar: `Ver ${repetido.id}`,
        textoCancelar: "Volver al informe",
        destructivo: false,
        conGuardando: false,
      });
      if (ver) {
        setNuevo(false);
        setEditId(null);
        setSel(repetido);
      }
      return;
    }
    const prev = editId ? informes.find((item) => item.id === editId) : null;
    const miUserId = ctx?.membresia?.userId || null;
    const miNombre = resolverAutorGuardado(ctx?.membresia, prev?.modificadoPorNombre);
    const actividades = normalizeInformeActividades(form);
    const legacyActividad = actividades[0] || emptyActividad();
    // Se habia perdido en un cambio posterior a 645fbec y guardar lanzaba
    // ReferenceError: el informe no se guardaba.
    const obraIdNormalizado = form.obraId || null;
    const obraAct = obras?.find((o) => o.id === obraIdNormalizado);
    const cotVinc = cotizaciones?.find((c) => c.id === form.cotizacionId)
      || (form.cotizacionNumero ? cotizaciones?.find((c) => c.numero === form.cotizacionNumero) : null)
      || (obraAct?.cotizacionId ? cotizaciones?.find((c) => c.id === obraAct.cotizacionId) : null)
      || (obraAct?.cliente ? cotizaciones?.find((c) => c.cliente && normalizarRazonSocial(c.cliente) === normalizarRazonSocial(obraAct.cliente)) : null);

    const clienteFinal = form.cliente || form.contratante || obraAct?.cliente || "";
    const cotNumFinal = form.cotizacionNumero || cotVinc?.numero || cotVinc?.id || obraAct?.cotizacionId || "";

    const inf={
      ...(editId
        ? {id:editId,...form,obraId:obraIdNormalizado,cliente:clienteFinal,contratante:clienteFinal,cotizacionNumero:cotNumFinal,cotizacionRef:cotNumFinal,actividades,actividad:legacyActividad.titulo,descripcion:legacyActividad.descripcion,observaciones:legacyActividad.observaciones,fotos:legacyActividad.fotos}
        : {id:siguienteIdUnico(informes,"INF"),...form,obraId:obraIdNormalizado,cliente:clienteFinal,contratante:clienteFinal,cotizacionNumero:cotNumFinal,cotizacionRef:cotNumFinal,actividades,actividad:legacyActividad.titulo,descripcion:legacyActividad.descripcion,observaciones:legacyActividad.observaciones,fotos:legacyActividad.fotos}),
      creadoPor: prev?.creadoPor || miUserId,
      creadoPorNombre: prev?.creadoPorNombre ? normalizarNombrePersona(prev.creadoPorNombre, "Camila Sepúlveda") : (resolverAutorGuardado(ctx?.membresia) || "Camila Sepúlveda"),
      creadoEn: prev?.creadoEn || new Date().toISOString(),
      modificadoPor: miUserId,
      modificadoPorNombre: miNombre || resolverAutorGuardado(ctx?.membresia, prev?.modificadoPorNombre) || "Camila Sepúlveda",
      modificadoEn: new Date().toISOString(),
    };
    setInformes(prevList=>editId ? prevList.map(item=>item.id===editId?{...item,...inf}:item) : [...prevList,inf]);
    // Quien recibe queda en la obra (es la que lo guarda en la base) y sube
    // al directorio de clientes.
    const recibeNombre = normalizarNombrePropio(recibe.nombre || "");
    const recibeEmail = normalizarCorreo(recibe.email);
    if (obraAct && (obraAct.recibeEmail !== recibeEmail || obraAct.recibeNombre !== recibeNombre)) {
      setObras((p) => p.map((o) => (o.id === obraAct.id ? { ...o, recibeNombre, recibeEmail } : o)));
    }
    setClientes?.((prevCli) => clientesConQuienRecibe(prevCli, obraAct || { cliente: clienteFinal }, { nombre: recibeNombre, email: recibeEmail }));
    setNuevo(false);
    setEditId(null);
    setSel(inf);
  };

  const importarItemsDeCotizacion = async (itemsCot, cot) => {
    if (!itemsCot || !itemsCot.length) {
      window.alert("Esta cotización no tiene ítems registrados para importar.");
      return;
    }

    const tieneContenido = form.actividades.some((a) => a.titulo?.trim() || a.fotos?.length);
    if (tieneContenido && !(await confirmar(`¿Agregar ${itemsCot.length} actividades basadas en los ítems de la cotización ${cot?.numero || ""}?`))) {
      return;
    }

    const nuevas = itemsCot.map((it) => {
      const cantStr = `${it.cant || 1} ${it.unit || "Und"}`;
      return {
        titulo: it.desc || "Actividad cotizada",
        actividadesRealizadas: `Suministro e instalación de ${cantStr} de ${it.desc || "ítem contractual"}. Fijación, alineación e inspección técnica conforme a requerimiento.`,
        descripcion: `Trabajos ejecutados según las especificaciones técnicas de la cotización ${cot?.numero || ""}. Verificación de condiciones de anclaje y seguridad en alturas.`,
        observaciones: "Instalación completada y verificada.",
        fecha: form.fechaInforme || today(),
        fotos: [],
      };
    });

    setForm((prev) => {
      const soloVacia = prev.actividades.length === 1 && !prev.actividades[0].titulo?.trim() && !prev.actividades[0].fotos?.length;
      return {
        ...prev,
        actividades: soloVacia ? nuevas : [...prev.actividades, ...nuevas],
      };
    });

    window.alert(`Se agregaron ${itemsCot.length} actividades al informe basadas en la cotización ${cot?.numero || ""}.`);
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
              style={{...B("#1d1d1f"),fontSize:11.5,padding:"8px 14px",flexShrink:0,alignSelf:"center"}}
            >
              Ir a Obras
            </button>
          }
        >
          Todavía no hay obras en el sistema, y el informe de actividades se hace sobre una obra.
        </AvisoFlujo>
      )}

      {nuevo&&(
        <div style={{marginBottom:28}}>
          <div style={{padding:"4px 4px 14px"}}>
            <h1 style={{margin:0,fontSize:18,fontWeight:700,letterSpacing:"-0.015em",lineHeight:1.25,color:"var(--text-primary)"}}>
              {editId ? "Editar informe" : "Nuevo informe"}
            </h1>
            <div style={{fontSize:12,color:"var(--text-tertiary)",marginTop:3}}>
              Informe de actividades en obra, con lo registrado en la bitácora.
            </div>
          </div>

          {/* Datos generales */}
          <section style={BLOQUE}>
          <h2 style={{...TITULO_BLOQUE,marginBottom:16}}>Datos generales</h2>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
            <div><LBL>Obra asociada</LBL><select value={form.obraId} onChange={e=>{
              const nuevaObraId=e.target.value;
              const o=obras.find(x=>x.id===nuevaObraId);
              const nuevaCot = cotizaciones.find((c) => c.id === o?.cotizacionId)
                || (o?.cliente ? cotizaciones.find((c) => c.cliente && normalizarRazonSocial(c.cliente) === normalizarRazonSocial(o.cliente)) : null);
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
                  cotizacionId:nuevaCot?.id || o?.cotizacionId || "",
                  cotizacionNumero:nuevaCot?.numero || "",
                  proyecto:normalizarMayusculas(o?.proyecto||""),
                  localizacion:normalizarMayusculas(o?.ciudad||""),
                  periodoInicio:inicio,
                  periodoFin:fin,
                  personal:buildPersonalDesdeObra(nuevaObraId,inicio,fin,[]),
                  actividades:(!hayContenidoEscrito && traidas.length) ? traidas : p.actividades,
                };
              });
            }} style={CAMPO}>{obrasMasNuevasPrimero(obras).map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select>
              {faltaActaEnObra && (
                <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "#fff1f0", border: "1px solid #ffa39e", color: "#cf1322", fontSize: 12, lineHeight: 1.45 }}>
                  ⚠️ <strong>Esta obra no tiene acta de entrega (FORM-SST-89).</strong> Debes crear el acta de entrega en la obra antes de poder generar su informe de actividades.
                </div>
              )}
            </div>
            <div><LBL>Nombre del proyecto</LBL><input value={form.proyecto} onChange={e=>setForm(p=>({...p,proyecto:e.target.value}))} onBlur={e=>{const v=normalizarMayusculas(e.target.value);if(v!==form.proyecto)setForm(p=>({...p,proyecto:v}));}} autoCapitalize="characters" style={CAMPO}/></div>
            <div><LBL>Localización</LBL><input value={form.localizacion} onChange={e=>setForm(p=>({...p,localizacion:e.target.value}))} onBlur={e=>{const v=normalizarMayusculas(e.target.value);if(v!==form.localizacion)setForm(p=>({...p,localizacion:v}));}} autoCapitalize="characters" style={CAMPO}/></div>
            <div><LBL>Fecha del informe</LBL><input type="date" value={form.fechaInforme} onChange={e=>setForm(p=>({...p,fechaInforme:e.target.value}))} style={CAMPO}/></div>
            <div><LBL>Período desde</LBL><input type="date" value={form.periodoInicio} onChange={e=>setForm(p=>({...p,periodoInicio:e.target.value}))} style={CAMPO}/></div>
            <div><LBL>Período hasta</LBL><input type="date" value={form.periodoFin} onChange={e=>setForm(p=>({...p,periodoFin:e.target.value}))} style={CAMPO}/></div>
          </div>
          </section>

          {/* Quien recibe: obligatorio. Sin el correo el informe no se puede
              enviar a firma de recibido, asi que no se deja guardar. Se
              propone el de la obra, la cotizacion o el directorio. */}
          {(() => {
            const r = recibeDelFormulario();
            const falta = !correoValido(r.email);
            return (
              <section id="informe-quien-recibe" style={BLOQUE}>
                <h2 style={{...TITULO_BLOQUE,marginBottom:6}}>Quién recibe el informe</h2>
                <div style={{...NOTA,marginBottom:12}}>
                  A este correo se le envía el informe para que el cliente firme el recibido. Es obligatorio; queda guardado en la obra.
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
                  <div><LBL>Nombre de quien recibe</LBL>
                    <input value={r.nombre} onChange={e=>setForm(p=>({...p,recibeNombre:e.target.value,recibeEmail:p.recibeEmail ?? r.email}))}
                      onBlur={e=>setForm(p=>({...p,recibeNombre:normalizarNombrePropio(e.target.value)}))} placeholder="Residente o interventor de la obra" style={CAMPO}/>
                  </div>
                  <div><LBL>Correo de quien recibe *</LBL>
                    <input type="email" inputMode="email" value={r.email} onChange={e=>setForm(p=>({...p,recibeEmail:e.target.value,recibeNombre:p.recibeNombre ?? r.nombre}))}
                      onBlur={e=>setForm(p=>({...p,recibeEmail:normalizarCorreo(e.target.value)}))} placeholder="residente@constructora.com"
                      style={{...CAMPO,...(falta && intentoGuardar ? {borderColor:"var(--danger, #b3261e)"} : {})}}/>
                    {falta && intentoGuardar && (
                      <div style={{fontSize:12,color:"var(--danger, #b3261e)",marginTop:4}}>Escribe el correo de quien recibe para poder guardar el informe.</div>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Cotización de Referencia */}
          {(() => {
            const obraAct = obras.find((o) => o.id === form.obraId);
            const cotVinc = cotizaciones.find((c) => c.id === form.cotizacionId)
              || (form.cotizacionNumero ? cotizaciones.find((c) => c.numero === form.cotizacionNumero) : null)
              || cotizaciones.find((c) => c.id === obraAct?.cotizacionId)
              || (obraAct?.cliente ? cotizaciones.find((c) => c.cliente && normalizarRazonSocial(c.cliente) === normalizarRazonSocial(obraAct.cliente)) : null);

            return (
              <TarjetaCotizacionRef
                cotizacion={cotVinc}
                todasCotizaciones={cotizaciones}
                obra={obraAct}
                onSeleccionarCotizacion={(cotId) => {
                  const selCot = cotizaciones.find((c) => c.id === cotId);
                  setForm((p) => ({
                    ...p,
                    cotizacionId: selCot?.id || cotId || "",
                    cotizacionNumero: selCot?.numero || "",
                  }));
                }}
                onVerDetalle={() => {
                  setCotizacionModalData(cotVinc);
                  setModalCotizacion(true);
                }}
                onImportarItems={importarItemsDeCotizacion}
              />
            );
          })()}

          {/* Personal */}
          <section style={BLOQUE}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <div>
                <h2 style={TITULO_BLOQUE}>Personal en obra</h2>
                <div style={{...NOTA,marginTop:4}}>Se carga solo con el personal asignado a la obra.</div>
              </div>
              <Button
                variante="texto"
                tam="sm"
                onClick={() => {
                  setForm(p => ({
                    ...p,
                    personal: buildPersonalDesdeObra(p.obraId, p.periodoInicio, p.periodoFin, [])
                  }));
                }}
                title="Recargar el personal asignado a esta obra"
              >
                Sincronizar de la obra ({form.personal.length})
              </Button>
            </div>
            {form.personal.length === 0 && (
              <div style={{ ...NOTA, padding: "18px 0", color: "var(--text-tertiary)" }}>
                No hay personal asignado a esta obra todavía. Sincroniza desde la obra o agrega personas a mano.
              </div>
            )}
            {form.personal.map((p, i) => {
              const empObj = empleados.find(x => x.id === p.empleadoId);
              const nombreDisplay = p.nombre || empObj?.nombre || "Técnico";
              const initials = (nombreDisplay.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("") || "TE").toUpperCase();

              return (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 32px", gap: 10, alignItems: "center", padding: "10px 0", borderTop: i === 0 ? "none" : "1px solid var(--separator)" }}>
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
                            cargo: String(emp?.cargo || x.cargo || "").trim().toUpperCase(),
                            manual: false,
                          } : x) }));
                        }}
                        style={{ ...CAMPO, fontSize: 12, padding: "5px 8px" }}
                      >
                        <option value="">Seleccionar técnico…</option>
                        {empleados.filter(e => e.activo !== false).map(e => (
                          <option key={e.id} value={e.id}>{e.nombre}{e.cargo ? ` · ${String(e.cargo).toUpperCase()}` : ""}</option>
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
                          style={{ ...CAMPO, fontSize: 12, padding: "5px 8px" }}
                        />
                      )}
                    </div>
                  </div>
                  <input value={p.cargo || ""} onChange={e => updPersonal(i, "cargo", e.target.value.toUpperCase())} onBlur={e => { const v = normalizarMayusculas(e.target.value); if (v !== p.cargo) updPersonal(i, "cargo", v); }} placeholder="CARGO TÉCNICO" style={{ ...CAMPO, fontSize: 12, padding: "5px 8px", textTransform: "uppercase" }} />
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
            <Button variante="texto" tam="sm" icono="mas" style={{marginTop:6,marginLeft:-10}} onClick={()=>setForm(p=>({...p,personal:[...p.personal,emptyPersona()]}))}>
              Agregar persona
            </Button>
          </section>

          {/* Actividades */}
          <section style={BLOQUE}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <h2 style={TITULO_BLOQUE}>Actividades ejecutadas</h2>
              <div style={{display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}>
                <Button variante="texto" tam="sm" onClick={traerAvancesDeLaObra}>
                  Traer avances de la obra ({avancesDisponibles.length})
                </Button>
                <Button variante="oscuro" tam="sm" icono="mas" onClick={()=>setForm(p=>({...p,actividades:[...p.actividades,emptyActividad()]}))}>
                  Agregar actividad
                </Button>
              </div>
            </div>
            <div style={{...NOTA,marginBottom:4}}>
              Salen de lo que se registró en la obra, en la pestaña «Avance diario». Aquí las
              puedes retocar antes de imprimir sin dañar el registro original de la obra.
              {avancesTotalesObra.length>avancesDisponibles.length && (
                <div style={{color:"var(--warning-text, #b54708)",marginTop:5}}>
                  Ojo: la obra tiene <strong>{avancesTotalesObra.length}</strong> avance(s) en total,
                  pero solo <strong>{avancesDisponibles.length}</strong> caen entre el
                  {" "}{fmtD(form.periodoInicio)} y el {fmtD(form.periodoFin)}. Amplía el período de
                  arriba si quieres incluirlos todos.
                </div>
              )}
            </div>
            {form.actividades.map((act,ai)=>(
              <div key={ai} style={{borderTop:"1px solid var(--separator)",paddingTop:22,marginTop:22}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)"}}>Actividad {ai+1}</div>
                  {form.actividades.length>1&&<button onClick={()=>{
                    setForm(p=>({...p,actividades:p.actividades.filter((_,i)=>i!==ai)}));
                    // Las actividades se guardan por su posicion, asi que al
                    // quitar una hay que correr las de despues; si no, la
                    // marca de "titulo escrito a mano" se queda en la de al
                    // lado.
                    setEscribiendoTitulo((prev)=>prev
                      .filter((i)=>i!==ai)
                      .map((i)=>(i>ai ? i-1 : i)));
                  }} className="ui-btn ui-btn--texto ui-btn--sm">Eliminar</button>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 190px",gap:14,marginBottom:12}}>
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
                      style={CAMPO}>
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
                        style={{...CAMPO,marginTop:6}}/>
                    )}

                    <div style={{fontSize:10.5,color:"var(--text-muted, #64748b)",marginTop:4}}>
                      {escribiendoTitulo.includes(ai) || (act.titulo && !buscarPlantillaActividad(act.titulo))
                        ? "Escrito a mano: los textos de abajo no se tocan."
                        : "Al elegir uno se completan los textos de abajo."}
                    </div>
                  </div>
                  <div><LBL>Fecha de ejecución</LBL><input type="date" value={act.fecha||""} onChange={e=>updActividad(ai,"fecha",e.target.value)} style={CAMPO}/></div>
                </div>
                {/* Dos campos y no uno solo con los encabezados dentro: puestos
                    seguidos en el mismo recuadro se leian como un ladrillo, y
                    el rotulo de cada bloque ya lo pone la tabla del documento.

                    normalizarParrafos y no normalizarFrase: estos campos llevan
                    varios parrafos y el otro los aplasta en uno solo. */}
                <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><LBL>Actividades realizadas</LBL><BotonCorregir valor={act.actividadesRealizadas||""} onChange={(v)=>updActividad(ai,"actividadesRealizadas",v)} compacto/></div><textarea value={act.actividadesRealizadas||""} onChange={e=>updActividad(ai,"actividadesRealizadas",e.target.value)} onBlur={e=>{const v=normalizarParrafos(e.target.value);if(v!==act.actividadesRealizadas)updActividad(ai,"actividadesRealizadas",v);}} rows={7} placeholder="Qué se ejecutó en campo: inspección, ajustes, limpieza..." spellCheck lang="es" style={{...CAMPO,resize:"vertical",lineHeight:1.5}}/></div>
                <div style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><LBL>Descripción</LBL><BotonCorregir valor={act.descripcion} onChange={(v)=>updActividad(ai,"descripcion",v)} compacto/></div><textarea value={act.descripcion} onChange={e=>updActividad(ai,"descripcion",e.target.value)} onBlur={e=>{const v=normalizarParrafos(e.target.value);if(v!==act.descripcion)updActividad(ai,"descripcion",v);}} rows={10} placeholder="Descripción del proceso ejecutado..." spellCheck lang="es" style={{...CAMPO,resize:"vertical",minHeight:200,lineHeight:1.5,fontSize:13}}/></div>
                <div style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><LBL>Observaciones</LBL><BotonCorregir valor={act.observaciones} onChange={(v)=>updActividad(ai,"observaciones",v)} compacto/></div><input value={act.observaciones} onChange={e=>updActividad(ai,"observaciones",e.target.value)} onBlur={e=>{const v=normalizarFrase(e.target.value);if(v!==act.observaciones)updActividad(ai,"observaciones",v);}} placeholder="Ej: 1 Línea de vida horizontal de 119 metros" spellCheck lang="es" style={CAMPO}/></div>
                {/* Fotos de esta actividad */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,marginTop:12}}>
                  <LBL>Registro fotográfico</LBL>
                  <span style={{fontSize:10.5,color:"var(--text-subtle, #94a3b8)"}}>Se imprimen en el informe</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, alignItems: "start" }}>
                  {(act.fotos || []).map((ft, fi) => (
                    <div key={fi} style={{ background: "var(--fill)", borderRadius: 16, overflow: "hidden" }}>
                      <div style={{ padding: 8, minHeight: 130, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                        <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(16,24,40,0.75)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4 }}>
                          Evidencia #{fi + 1}
                        </span>
                        <img src={ft.img} alt="" style={{ width: "100%", height: "auto", maxHeight: 180, objectFit: "contain", display: "block", borderRadius: 10 }} />
                      </div>
                      <div style={{ padding: "0 8px 8px", display: "flex", gap: 4, alignItems: "center" }}>
                        <input
                          value={ft.comentario || ""}
                          onChange={e => updFotoAct(ai, fi, "comentario", e.target.value)}
                          onBlur={e => {
                            const limpio = normalizarFrase(e.target.value);
                            if (limpio !== ft.comentario) updFotoAct(ai, fi, "comentario", limpio);
                          }}
                          placeholder={`Descripción evidencia ${fi + 1}`}
                          style={{ ...CAMPO, fontSize: 11.5, padding: "4px 6px", flex: 1 }}
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
                      borderRadius: 16,
                      minHeight: 150,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      background: "var(--fill)",
                      color: "var(--text-primary)",
                      gap: 6,
                      padding: 12,
                      textAlign: "center",
                      transition: "opacity .2s ease",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = "0.8"; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
                  >
                    <span style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--text-primary)", color: "var(--surface)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 20, lineHeight: 1 }}>+</span>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>Subir fotos</span>
                    <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Toca para elegirlas</span>
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
                  <div style={{fontSize:11.5,color:"#d97706",marginTop:8,fontWeight:600}}>
                    ⏳ Cargando fotos… {subiendoFotos.hechas} de {subiendoFotos.total}
                  </div>
                )}
              </div>
            ))}
          </section>

          <section style={BLOQUE}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:12}}><h2 style={TITULO_BLOQUE}>Recomendaciones generales</h2><BotonCorregir valor={form.recomendaciones} onChange={(v)=>setForm(p=>({...p,recomendaciones:v}))} compacto/></div><textarea value={form.recomendaciones} onChange={e=>setForm(p=>({...p,recomendaciones:e.target.value}))} onBlur={e=>{const v=normalizarParrafos(e.target.value);if(v!==form.recomendaciones)setForm(p=>({...p,recomendaciones:v}));}} rows={6} placeholder="Recomendaciones para el cliente..." spellCheck lang="es" style={{...CAMPO,resize:"vertical",minHeight:130,lineHeight:1.5,fontSize:13}}/></section>
          <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"flex-end",flexWrap:"wrap",paddingTop:8}}>
            <Button variante="texto" onClick={()=>{setNuevo(false);setEditId(null);}}>Cancelar</Button>
            <Button
              variante="oscuro"
              tam="lg"
              onClick={guardar}
              disabled={!!subiendoFotos || faltaActaEnObra}
              title={faltaActaEnObra ? "No se puede guardar: la obra debe tener acta de entrega (FORM-SST-89)" : ""}
            >
              {subiendoFotos ? "Cargando fotos…" : editId ? "Guardar cambios" : "Guardar informe"}
            </Button>
          </div>
        </div>
      )}

      {/* Lista de informes. Se esconde mientras se esta escribiendo uno: la
          pantalla se dedica al formulario y no a los que ya estan hechos. */}
      {!sel&&!nuevo&&(
        <ListaInformes
          informes={informes}
          estadosFirma={estadosFirma}
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
            descargarPdf: (inf)=>descargarPdf(inf),
            imprimir: (inf)=>imprimirInforme(inf),
          }}
        />
      )}

      {/* Vista detalle + impresión */}
      {sel && !nuevo && !editId && (() => {
        const control = getControlDocumental(empresaConfig)?.informe;
        const docCodigo = control?.codigo || "FO-ACT-04";
        const docVersion = control?.version || "03";
        const proyecto = normalizarMayusculas(sel?.proyecto || "");
        const localizacion = normalizarMayusculas(sel?.localizacion || "");
        const cliente = normalizarMayusculas(sel?.cliente || (obras?.find(o => o.id === sel?.obraId)?.cliente) || "");
        const fechaInforme = fmtL(sel?.fechaInforme);
        const periodo = fmtPeriodo(sel?.periodoInicio, sel?.periodoFin);
        const personal = Array.isArray(sel?.personal) ? sel.personal : [];
        const numDoc = sel?.id ? String(sel.id).trim() : (sel?.numero ? String(sel.numero).trim() : "");
        const rawActividades = (sel.actividades || [{ titulo: sel.actividad, descripcion: sel.descripcion, observaciones: sel.observaciones, fotos: sel.fotos || [] }]).map(conActividadSeparada);
        const obraDeSel = obras?.find(o => o.id === sel?.obraId);
        const cotVincSel = cotizaciones.find(c => c.id === sel?.cotizacionId)
          || (sel?.cotizacionNumero ? cotizaciones.find(c => c.numero === sel?.cotizacionNumero) : null)
          || (obraDeSel?.cotizacionId ? cotizaciones.find(c => c.id === obraDeSel.cotizacionId) : null)
          || (obraDeSel?.cliente ? cotizaciones.find(c => c.cliente && normalizarRazonSocial(c.cliente) === normalizarRazonSocial(obraDeSel.cliente)) : null);

        return (
          <div style={{ padding: isMobile ? "8px 10px 16px" : "8px 18px 16px" }}>
            {/* El numero del informe y sus acciones (Volver, Editar, Imprimir,
                Descargar PDF) van en la barra de arriba, que no se mueve al
                bajar. Aqui queda de quien es. */}
            <div style={{ margin: "4px 0 16px", minWidth: 0 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.25, margin: 0, color: "var(--text-primary)" }}>
                Informe {numDoc || sel?.id || sel?.numero || "técnico"}
              </h1>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 3 }}>
                {[cliente, proyecto].filter(Boolean).join(" · ") || "Informe de actividades en obra"}
              </div>
            </div>

            {cotVincSel && (
              <div style={{ maxWidth: 920, margin: "0 auto 16px", width: "100%" }}>
                <TarjetaCotizacionRef
                  cotizacion={cotVincSel}
                  todasCotizaciones={cotizaciones}
                  obra={obraDeSel}
                  onVerDetalle={() => {
                    setCotizacionModalData(cotVincSel);
                    setModalCotizacion(true);
                  }}
                />
              </div>
            )}
            {!enviosFirma.length && !destinatarioDeInforme({ obra: obraDeSel, cotizacion: cotVincSel, clientes }).email && (
              <div style={{ maxWidth: 920, margin: "0 auto 16px", width: "100%" }}>
                <Callout tono="aviso" titulo="Falta el correo de quien recibe">
                  Para enviar este informe al cliente y que firme el recibido, la obra necesita el correo de quien recibe
                  (el residente o el interventor).
                  <div style={{ marginTop: 10 }}>
                    <Button tam="sm" onClick={() => setPidiendoQuienRecibe("firma")}>
                      Agregar correo
                    </Button>
                  </div>
                </Callout>
              </div>
            )}
            <PanelFirmaRecibido
              celular={celularDeInforme({ obra: obraDeSel || { cliente }, cotizacion: cotVincSel, clientes })}
              proyecto={proyecto}
              envios={enviosFirma}
              onRecargar={recargarEnviosFirma}
              onEnviar={() => setModalFirma(true)}
            />
            <div className="doc-paper-wrapper" style={{ maxWidth: 920, margin: "0 auto", width: "100%" }}>
              <div
                id="pz"
                className="doc-shell"
                style={{
                  background: "#ffffff",
                  color: "#18181b",
                  fontFamily: FUENTE,
                  fontSize: 12,
                  lineHeight: 1.5,
                  border: "1px solid rgba(0,0,0,0.08)",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.06)",
                  padding: isMobile ? "18px 14px 18px" : "36px 44px 28px",
                  borderRadius: 12,
                  maxWidth: 920,
                  width: "100%",
                  boxSizing: "border-box",
                  margin: "0 auto",
                }}
              >
                {/* El mismo encabezado del PDF (informePrint.js): tres casillas
                    de igual alto -logo, titulo y datos de control-. El de antes
                    repetia el nombre de la empresa junto al logo y partia el
                    titulo en dos lineas, y los dos lados no cuadraban. */}
                <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, border: "1px solid #d2d2d7", borderRadius: 8, marginBottom: 14, tableLayout: isMobile ? "auto" : "fixed" }}>
                  <tbody>
                    <tr>
                      {!isMobile && (
                        <td style={{ width: "27%", padding: "10px 14px", borderRight: "1px solid #d2d2d7", verticalAlign: "middle", textAlign: "center" }}>
                          {LOGO_INGEANCLAJES ? (
                            <img src={LOGO_INGEANCLAJES} alt="Ingeanclajes" style={{ height: 48, maxWidth: "100%", objectFit: "contain", display: "inline-block" }} />
                          ) : (
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#1d1d1f" }}>INGEANCLAJES</div>
                          )}
                        </td>
                      )}
                      <td style={{ padding: "10px 14px", verticalAlign: "middle", textAlign: "center" }}>
                        {isMobile && LOGO_INGEANCLAJES && (
                          <img src={LOGO_INGEANCLAJES} alt="Ingeanclajes" style={{ height: 36, objectFit: "contain", display: "block", margin: "0 auto 6px" }} />
                        )}
                        <div style={{ fontSize: 9.5, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          Sistema de gestión de calidad
                        </div>
                        <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 800, color: "#1d1d1f", letterSpacing: "0.01em", textTransform: "uppercase", marginTop: 3, lineHeight: 1.25 }}>
                          Informe técnico de actividades en obra
                        </div>
                        <div style={{ fontSize: 9.5, color: "#6e6e73", marginTop: 4 }}>
                          Ingeanclajes S.A.S. · NIT 900.193.965-4 · PBX (604) 448 26 86
                        </div>
                      </td>
                      <td style={{ width: isMobile ? "38%" : "24%", padding: 0, borderLeft: "1px solid #d2d2d7", verticalAlign: "middle" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <tbody>
                            {[["Código", docCodigo], ["Versión", docVersion], ["Consecutivo", numDoc || "INF-OFICIAL"]].map(([rotulo, valor], i) => (
                              <tr key={rotulo}>
                                <td style={{ padding: "5px 10px", fontSize: 9.5, fontWeight: 600, color: "#6e6e73", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: i < 2 ? "1px solid #e8e8ed" : "none" }}>{rotulo}</td>
                                <td style={{ padding: "5px 10px", fontSize: 10.5, fontWeight: 700, color: "#1d1d1f", textAlign: "right", whiteSpace: "nowrap", borderBottom: i < 2 ? "1px solid #e8e8ed" : "none" }}>{valor}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Ficha de Datos del Proyecto */}
                <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, background: "#fafafa" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "16%", fontWeight: 700, color: "#52525b", letterSpacing: "0.04em", textTransform: "uppercase", padding: "4px 6px" }}>PROYECTO:</td>
                        <td style={{ width: "40%", fontWeight: 700, color: "#18181b", fontSize: 11, padding: "4px 6px" }}>{proyecto || "OBRA GENERAL"}</td>
                        <td style={{ width: "16%", fontWeight: 700, color: "#52525b", letterSpacing: "0.04em", textTransform: "uppercase", padding: "4px 6px", borderLeft: "1px solid rgba(0,0,0,0.06)" }}>PERÍODO:</td>
                        <td style={{ width: "28%", color: "#18181b", fontWeight: 600, fontSize: 10.5, padding: "4px 6px" }}>{periodo}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, color: "#52525b", letterSpacing: "0.04em", textTransform: "uppercase", padding: "4px 6px", borderTop: "1px solid rgba(0,0,0,0.04)" }}>CONTRATANTE:</td>
                        <td style={{ color: "#18181b", fontWeight: 600, fontSize: 10.5, padding: "4px 6px", borderTop: "1px solid rgba(0,0,0,0.04)" }}>{cliente || "A QUIEN INTERESE"}</td>
                        <td style={{ fontWeight: 700, color: "#52525b", letterSpacing: "0.04em", textTransform: "uppercase", padding: "4px 6px", borderLeft: "1px solid rgba(0,0,0,0.06)", borderTop: "1px solid rgba(0,0,0,0.04)" }}>FECHA EMISIÓN:</td>
                        <td style={{ color: "#18181b", fontWeight: 600, fontSize: 10.5, padding: "4px 6px", borderTop: "1px solid rgba(0,0,0,0.04)" }}>{fechaInforme}</td>
                      </tr>
                      <tr>
                        <td style={{ fontWeight: 700, color: "#52525b", letterSpacing: "0.04em", textTransform: "uppercase", padding: "4px 6px", borderTop: "1px solid rgba(0,0,0,0.04)" }}>LOCALIZACIÓN:</td>
                        <td style={{ color: "#18181b", fontWeight: 600, fontSize: 10.5, padding: "4px 6px", borderTop: "1px solid rgba(0,0,0,0.04)" }}>{localizacion || "MEDELLÍN"}</td>
                        <td style={{ fontWeight: 700, color: "#52525b", letterSpacing: "0.04em", textTransform: "uppercase", padding: "4px 6px", borderLeft: "1px solid rgba(0,0,0,0.06)", borderTop: "1px solid rgba(0,0,0,0.04)" }}>NORMATIVA:</td>
                        <td style={{ padding: "4px 6px", borderTop: "1px solid rgba(0,0,0,0.04)" }}>
                          <span style={{ background: "#ffffff", color: "#18181b", border: "1px solid #d4d4d8", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, display: "inline-block" }}>
                            Res. 4272/2021 · OSHA 1926.502
                          </span>
                        </td>
                      </tr>
                      {(sel.cotizacionNumero || cotVincSel?.numero) && (
                        <tr>
                          <td style={{ fontWeight: 700, color: "#52525b", letterSpacing: "0.04em", textTransform: "uppercase", padding: "4px 6px", borderTop: "1px solid rgba(0,0,0,0.04)" }}>REF. COTIZACIÓN:</td>
                          <td colSpan={3} style={{ color: "#18181b", fontWeight: 700, padding: "4px 6px", borderTop: "1px solid rgba(0,0,0,0.04)", fontVariantNumeric: "tabular-nums" }}>
                            <span style={{ background: "#ffffff", color: "#18181b", padding: "2px 7px", borderRadius: 4, border: "1px solid #d4d4d8", fontSize: 9.5 }}>
                              {sel.cotizacionNumero || cotVincSel?.numero}
                            </span>
                            {cotVincSel && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCotizacionModalData(cotVincSel);
                                  setModalCotizacion(true);
                                }}
                                style={{
                                  marginLeft: 12,
                                  background: "#ffffff",
                                  color: "#18181b",
                                  border: "1px solid #d4d4d8",
                                  borderRadius: 6,
                                  padding: "3px 10px",
                                  fontSize: 10,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                Ver detalle de cotización
                              </button>
                            )}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Sección 1: Personal Técnico Asignado en Sitio */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "#18181b" }}>1. Personal Técnico Asignado en Sitio</span>
                  <span style={{ fontSize: 9, fontWeight: 500, color: "#71717a" }}>Personal certificado con trabajo seguro en alturas</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : `repeat(${Math.min(3, Math.max(1, personal.length))}, 1fr)`, gap: 8, marginBottom: 14 }}>
                  {personal.length > 0 ? (
                    personal.map((p, idx) => (
                      <div key={idx} style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 6, padding: "6px 9px", background: "#ffffff", display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 22, height: 22, background: "#f4f4f5", borderRadius: 4, color: "#18181b", fontVariantNumeric: "tabular-nums", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {String(idx + 1).padStart(2, "0")}
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ fontSize: 8, fontWeight: 700, color: "#71717a", textTransform: "uppercase", letterSpacing: "0.04em" }}>{String(p.cargo || "TÉCNICO ESPECIALISTA").toUpperCase()}</div>
                          <div style={{ fontSize: 10.5, fontWeight: 600, color: "#18181b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre || "Sin nombre registrado"}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ border: "1px dashed #d4d4d8", borderRadius: 6, padding: "8px 12px", color: "#71717a", fontSize: 9, fontStyle: "italic" }}>
                      Personal asignado conforme a programación de cuadrilla en obra.
                    </div>
                  )}
                </div>

                {/* Sección 2: Metodología y Registro de Actividades Ejecutadas */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, paddingTop: 2 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "#18181b" }}>2. Metodología y Registro de Actividades Ejecutadas</span>
                  <span style={{ fontSize: 9, fontWeight: 500, color: "#71717a" }}>Control y Trazabilidad Operativa</span>
                </div>

                {rawActividades.map((act, ai) => (
                  <div key={ai} style={{ marginBottom: 14 }}>
                    <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, background: "#ffffff", padding: "10px 14px", marginBottom: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f4f4f5", paddingBottom: 5, marginBottom: 7 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ background: "#18181b", color: "#ffffff", fontVariantNumeric: "tabular-nums", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4 }}>
                            ACT-{String(ai + 1).padStart(2, "0")}
                          </span>
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#18181b" }}>
                            {act.titulo || "Actividad Ejecutada"}
                          </span>
                        </div>
                        {act.fecha && (
                          <span style={{ fontSize: 9, color: "#71717a", fontVariantNumeric: "tabular-nums" }}>
                            Fecha: {fmtL(act.fecha)}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: 10, color: "#27272a", lineHeight: 1.5, textAlign: "justify" }}>
                        {(act.actividadesRealizadas || "").trim() && (
                          <div style={{ marginBottom: 6 }}>
                            <strong style={{ color: "#52525b", textTransform: "uppercase", fontSize: 8.5, letterSpacing: "0.05em", display: "block", marginBottom: 2 }}>Actividades Realizadas:</strong>
                            <span style={{ whiteSpace: "pre-line" }}>{act.actividadesRealizadas}</span>
                          </div>
                        )}
                        {(act.descripcion || "").trim() && (
                          <div style={{ marginBottom: 4 }}>
                            <strong style={{ color: "#52525b", textTransform: "uppercase", fontSize: 8.5, letterSpacing: "0.05em", display: "block", marginBottom: 2 }}>Descripción Técnica:</strong>
                            <span style={{ whiteSpace: "pre-line" }}>{act.descripcion}</span>
                          </div>
                        )}
                      </div>

                      <div style={{ marginTop: 7, paddingTop: 5, borderTop: "1px solid #f4f4f5", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 9.5 }}>
                        <span style={{ color: "#18181b" }}>
                          <strong style={{ color: "#059669" }}>✓ Conforme:</strong> {(act.observaciones || "").trim() ? act.observaciones : "Ejecutado a conformidad sin novedades reportadas."}
                        </span>
                        <span style={{ color: "#52525b", fontWeight: 600 }}>Estado: Concluido 100%</span>
                      </div>
                    </div>

                    {/* Fotos de la actividad */}
                    {(act.fotos || []).some(ft => ft.img || ft.url) && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase", color: "#18181b" }}>
                            3. Panel Técnico de Evidencias Fotográficas · {act.titulo || "Actividad"}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 500, color: "#71717a" }}>Registro Fotográfico en Sitio</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                          {(act.fotos || []).filter(ft => ft.img || ft.url).map((ft, fi) => (
                            <div key={fi} style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, overflow: "hidden", background: "#ffffff", boxShadow: "0 1px 2px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column" }}>
                              <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "#fafafa", borderBottom: "1px solid #f4f4f5", overflow: "hidden", position: "relative" }}>
                                <img src={ft.img || ft.url} alt={`Evidencia ${fi + 1}`} style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#ffffff" }} onError={e => { e.target.style.display = "none"; }} />
                                <span style={{ position: "absolute", top: 6, left: 6, background: "rgba(0,0,0,0.68)", color: "#ffffff", fontSize: 8.5, fontVariantNumeric: "tabular-nums", fontWeight: 700, padding: "2.5px 7px", borderRadius: 4 }}>
                                  EVIDENCIA {ai + 1}.{fi + 1}
                                </span>
                              </div>
                              {/* Sin comentario, la foto sale sola (igual que en el impreso). */}
                              {String(ft.comentario || "").trim() && (
                                <div style={{ padding: "7px 10px", fontSize: 9.5, color: "#27272a", lineHeight: 1.4, background: "#ffffff" }}>
                                  {ft.comentario}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Dictamen Técnico y Recomendaciones */}
                {sel.recomendaciones && (
                  <div style={{ border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, overflow: "hidden", marginBottom: 14, background: "#fafafa", padding: "10px 14px" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 800, color: "#52525b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>
                      DICTAMEN TÉCNICO Y RECOMENDACIONES
                    </div>
                    <div style={{ fontSize: 10, color: "#27272a", lineHeight: 1.5, textAlign: "justify", whiteSpace: "pre-line" }}>
                      {sel.recomendaciones}
                    </div>
                  </div>
                )}

                {/* Bloque de Firmas sin código QR */}
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 14, borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 10 }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "50%", padding: "10px 14px 0 0", verticalAlign: "top", borderRight: "1px solid rgba(0,0,0,0.08)" }}>
                        <div style={{ fontSize: 8.5, fontWeight: 700, color: "#71717a", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
                          Por el Contratista Especialista:
                        </div>
                        <div style={{ height: 48, display: "flex", alignItems: "flex-end", marginBottom: 4 }}>
                          {firmaImg ? (
                            <img src={firmaImg} alt="Firma" style={{ maxHeight: 44, maxWidth: 190, objectFit: "contain" }} />
                          ) : (
                            <div style={{ fontFamily: "'Segoe Script', cursive, sans-serif", fontSize: 15, fontWeight: 700, color: "#18181b" }}>
                              Jhon Jaime Sepúlveda L.
                            </div>
                          )}
                        </div>
                        <div style={{ fontWeight: 800, fontSize: 11, color: "#18181b", letterSpacing: "0.01em" }}>
                          ING. JHON JAIME SEPÚLVEDA LONDOÑO
                        </div>
                        <div style={{ fontSize: 9, color: "#52525b", marginTop: 1 }}>Gerente General · MP. 05256-409949</div>
                        <div style={{ fontSize: 8.5, color: "#71717a", marginTop: 1 }}>Ingeanclajes S.A.S · NIT. 900.193.965-4</div>
                      </td>
                      <td style={{ width: "50%", padding: "10px 0 0 14px", verticalAlign: "top" }}>
                        <div style={{ fontSize: 8.5, fontWeight: 700, color: "#71717a", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>
                          Recibido por la Interventoría / Constructora:
                        </div>
                        <div style={{ height: 48, display: "flex", alignItems: "flex-end", marginBottom: 4, fontSize: 9, color: "#a1a1aa", fontStyle: "italic" }}>
                          (Firma y sello de recepción a satisfacción)
                        </div>
                        <div style={{ fontWeight: 700, fontSize: 10, color: "#18181b" }}>NOMBRE: ____________________________________</div>
                        <div style={{ fontSize: 9, color: "#52525b", marginTop: 3 }}>CARGO / FIRMA: ______________________________</div>
                        <div style={{ fontSize: 9, color: "#52525b", marginTop: 2 }}>EMPRESA: {cliente || "Constructora / Contratante"}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer Oficial */}
                <div style={{ borderTop: "1px solid #e4e4e7", paddingTop: 8, marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8.5, color: "#71717a" }}>
                  <span>Ingeanclajes S.A.S · Documento Técnico Oficial SGC · {docCodigo} (V-{docVersion})</span>
                  <span>Informe Técnico de Actividades</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {pidiendoQuienRecibe && sel && (() => {
        // Un informe sin obra igual lo pide: queda en el informe abierto y
        // en el directorio de clientes.
        const obraDelInforme = obras?.find((o) => o.id === sel.obraId);
        const destino = obraDelInforme || { cliente: sel.cliente || sel.contratante || "", proyecto: sel.proyecto };
        return (
          <ModalQuienRecibe
            obra={destino}
            motivo={pidiendoQuienRecibe === "firma" ? "" : "Falta el correo de quien recibe: sin él no se genera el informe, porque no se le podría enviar al cliente para la firma de recibido."}
            onCerrar={() => setPidiendoQuienRecibe(false)}
            sugerido={quienRecibeDeCliente(clientes, destino)}
            onGuardar={({ nombre, email, telefono, cargo }) => {
              if (obraDelInforme) {
                setObras((p) => p.map((o) => (o.id === obraDelInforme.id ? { ...o, recibeNombre: nombre, recibeEmail: email, recibeCargo: cargo || o.recibeCargo, tel: telefono || o.tel } : o)));
              }
              setClientes?.((prev) => clientesConQuienRecibe(prev, destino, { nombre, email, telefono, cargo }));
              const conRecibe = { ...sel, recibeNombre: nombre, recibeEmail: email, recibeCargo: cargo || sel.recibeCargo };
              setInformes((p) => p.map((i) => (i.id === sel.id ? { ...i, recibeNombre: nombre, recibeEmail: email, recibeCargo: cargo || i.recibeCargo } : i)));
              setSel(conRecibe);
              const seguir = pidiendoQuienRecibe;
              setPidiendoQuienRecibe(false);
              if (seguir === "pdf") descargarPdf(conRecibe);
              else if (seguir === "imprimir") imprimirInforme(conRecibe);
              else setModalFirma(true);
            }}
          />
        );
      })()}

      {modalFirma && sel && (() => {
        const listo = enriquecerInforme(sel);
        return (
          <ModalEnviarFirma
            documento={listo}
            tipo="informe"
            etiqueta="Informe"
            tituloFormato="Informe técnico de actividades"
            generarPdf={generarInformePdf}
            mensajePorDefecto={
              `Le enviamos el informe de actividades ${listo.id || listo.numero || ""}` +
              `${listo.proyecto ? ` de ${listo.proyecto}` : ""}, con el registro de los trabajos ejecutados ` +
              "y las evidencias fotográficas."
            }
            contactoEmail={listo.contactoEmail}
            contactoNombre={listo.contacto}
            celular={listo.contactoCelular}
            empresaConfig={empresaConfig}
            firmaImg={firmaImg}
            onCerrar={() => setModalFirma(false)}
            onEnviado={recargarEnviosFirma}
          />
        );
      })()}

      {modalCotizacion && cotizacionModalData && (
        <ModalCotizacionDetalle
          cotizacion={cotizacionModalData}
          onClose={() => {
            setModalCotizacion(false);
            setCotizacionModalData(null);
          }}
          onImportarItems={nuevo ? importarItemsDeCotizacion : undefined}
        />
      )}
    </div>
  );
}

