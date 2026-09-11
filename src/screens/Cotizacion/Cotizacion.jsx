import Badge from "../../components/ui/Badge";
import BuscadorCliente from "../../components/BuscadorCliente";
import CampoTexto from "../../components/ui/CampoTexto";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import DictarCotizacion from "./DictarCotizacion";
import ImportarCotizacion from "./ImportarCotizacion";
import FirmaEmpresa from "../../components/FirmaEmpresa";
import DocumentoEnVivo from "./DocumentoEnVivo";
import ListaCotizaciones from "./ListaCotizaciones";
import EnviarCotizacion from "./EnviarCotizacion";
import PropuestaEditor from "./PropuestaEditor";
import SelectorCiudadColombia from "../../components/SelectorCiudadColombia";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { TEXTOS_DOCUMENTO_DEFAULT, getTextosDocumento } from "../../lib/cotizacionTextos";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import BotonCorregir from "../../components/ui/BotonCorregir";
import { corregirOrtografiaLocal } from "../../lib/correctorTexto";
import { useEffect, useRef, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { DEFAULT_COT_FORMA_PAGO, DEFAULT_COT_TIEMPO_EJEC } from "../../data/seed";
import { buildQuoteProposal, createQuoteProposalId, getQuoteApprovalAccountingSnapshot, getQuoteProposalLabel, getQuoteProposals, normalizeProposalItems, normalizeQuoteItems } from "../../lib/cotizaciones";
import { fmt, scrollAppToTop, today } from "../../lib/format";
import { avisoCelular, avisoCorreo, normalizarCorreo, normalizarDocumento, normalizarMayusculas, normalizarNombrePropio, normalizarRazonSocial, normalizarTelefono } from "../../lib/normalizarEntrada";
import { downloadGeneratedFile } from "../../lib/download";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import { selloDe } from "../../lib/controlDocumental";
import { asuntoAprobacion, mensajeAprobacion } from "../../lib/correoAprobacion";
import { blobABase64, generarCotizacionPdf } from "../../lib/cotizacionPdf";
import { enviarCotizacionPorCorreo } from "../../lib/backend/usuarios";
import { siguienteIdUnico } from "../../lib/identificadores";
import { resolverAutorGuardado, normalizarNombrePersona } from "../../lib/autorAuditoria";
export default function Cotizacion({ctx}){
  const {cotizaciones,setCotizaciones,obras,setObras,clientes,setClientes,empresaConfig,asegurarDetalle,cotDraft,setCotDraft}=ctx;
  const [erroresCliente, setErroresCliente] = useState({});
  const firmaImg=getFirmaImg(empresaConfig);
  // Codigo y version del formato de cotizacion. Null si no esta configurado,
  // y entonces el documento sale como antes.
  const selloCotizacion=selloDe(empresaConfig,"cotizacion");
  const [tab,setTab]=useState("lista");
  const [previewCot,setPreviewCot]=useState(null);
  // Cotizacion que se esta por enviar al cliente.
  const [enviarCot,setEnviarCot]=useState(null);
  // Vista previa del documento junto al formulario, para revisar los textos
  // completos mientras se edita.
  const [verDocumento,setVerDocumento]=useState(false);
  const cabeEnDosColumnas=useMediaQuery("(min-width: 1250px)");
  // Aviso posterior a aprobar: explica que se creo y que sigue.
  const [obraCreada,setObraCreada]=useState(null);
  const [editCot,setEditCot]=useState(null);
  const [dictando,setDictando]=useState(false);
  const [importando,setImportando]=useState(false);
  const [cot,setCot]=useState("");
  const [fecha,setFecha]=useState(today());
  const [val,setVal]=useState(30);
  const [cl,setCl]=useState({nombre:"",nit:"",contacto:"",contactoEmail:"",obra:"",telefono:"",ciudad:"",direccion:"",coords:""});
  const [textoInicial,setTextoInicial]=useState("");
  const [observacionesCot,setObservacionesCot]=useState("");
  // Textos fijos del documento, editables por cotizacion.
  const [textosDocumento,setTextosDocumento]=useState(TEXTOS_DOCUMENTO_DEFAULT);
  const setTexto=(clave,valor)=>setTextosDocumento(prev=>({...prev,[clave]:valor}));
  const [propuestas,setPropuestas]=useState([buildQuoteProposal({id:createQuoteProposalId("new"),nombre:getQuoteProposalLabel(0),formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,util:10,items:[],incluyeTexto:""},0)]);
  const [propuestaActivaId,setPropuestaActivaId]=useState(null);

  // Numeracion real de la empresa: C-26115, C-26116, ... Si la base esta
  // vacia se arranca desde el ultimo numero emitido a mano, para no repetir
  // consecutivos ya entregados a clientes.
  const PRIMER_CONSECUTIVO = 26116;

  const getNextCotizacionNumero = (list = []) => {
    const ultimo = (Array.isArray(list) ? list : []).reduce((max, cotizacion) => {
      const numero = String(cotizacion?.numero || '').trim().toUpperCase();
      // Acepta "C-26115" y tambien el formato viejo "ANC001".
      const match = numero.match(/^C\s*-?\s*(\d+)$/) || numero.match(/^ANC\s*-?\s*(\d+)$/);
      if (!match) return max;
      return Math.max(max, Number(match[1] || 0));
    }, 0);

    const siguiente = Math.max(ultimo + 1, PRIMER_CONSECUTIVO);
    return `C-${siguiente}`;
  };

  // `propuestas` es la unica fuente de verdad: cada editor escribe ahi.
  // `propuestaActivaId` ya solo decide en cual se monta el mapa de Google.
  const propuestasSnapshot = (propuestas.length
    ? propuestas
    : [buildQuoteProposal({id:createQuoteProposalId(editCot || "draft"),nombre:getQuoteProposalLabel(0),formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,util:10,items:[],incluyeTexto:""},0)]
  ).map((propuesta,index)=>buildQuoteProposal(propuesta,index));

  const propuestaActiva = propuestasSnapshot.find((x)=>x.id===propuestaActivaId) || propuestasSnapshot[0];

  const totalCotizacionCalculado = propuestasSnapshot.reduce((acc, p) => {
    const pItems = Array.isArray(p.items) ? p.items : [];
    const sub = pItems.reduce((s, it) => s + (Number(it.cant) || 0) * (Number(it.vu) || 0), 0);
    const ut = p.sinAiu ? 0 : (sub * (Number(p.util) || 0)) / 100;
    const iva = p.sinAiu ? (sub * 0.19) : (ut * 0.19);
    return acc + sub + ut + iva;
  }, 0);

  // El texto de "esta cotizacion incluye" ya no se rellena aqui. Se rellena al
  // construir la propuesta (ensureProposalDefaultTexts), que es una sola vez al
  // abrir; hacerlo tambien en cada tecla impedia dejar el campo vacio a
  // proposito: se borraba y volvia a aparecer solo.
  const actualizarPropuesta = (id,patch)=>{
    setPropuestas((prev)=>prev.map((propuesta)=>(
      propuesta.id===id ? {...propuesta,...patch} : propuesta
    )));
  };

  // Vuelca en el formulario lo que la IA entendio del dictado.
  //
  // Solo rellena lo que este VACIO: si la persona ya escribio el cliente a
  // mano, ese dato manda sobre lo que oyo el microfono. Los items se agregan
  // a los que ya haya, no los reemplazan.
  const aplicarDictado = (propuesta)=>{
    setCl((prev)=>({
      ...prev,
      nombre: propuesta.cliente || prev.nombre || "",
      contacto: propuesta.contacto || prev.contacto || "",
      ciudad: propuesta.ciudad || prev.ciudad || "",
      obra: propuesta.obra || prev.obra || "",
      telefono: propuesta.telefono || prev.telefono || "",
      nit: propuesta.nit || prev.nit || "",
      contactoEmail: propuesta.contactoEmail || prev.contactoEmail || "",
      direccion: propuesta.direccion || prev.direccion || "",
    }));

    setErroresCliente((prev) => {
      const nuevo = { ...prev };
      if (propuesta.cliente) delete nuevo.nombre;
      if (propuesta.nit) delete nuevo.nit;
      if (propuesta.direccion) delete nuevo.direccion;
      return nuevo;
    });

    if(propuesta.alcance || propuesta.items.length){
      const destino = propuestas.find((x)=>x.id===propuestaActivaId) || propuestas[0];
      if(destino){
        const itemsActuales = Array.isArray(destino.items) ? destino.items : [];
        // Cada fila de la tabla se identifica por `id`: sin el, la unidad y el
        // valor no se podian editar, el subtotal no se pintaba y el total de
        // la propuesta no cuadraba. Se numera siguiendo el mayor que ya exista.
        let ultimoId = itemsActuales.reduce((max,item)=>Math.max(max,Number(item?.id)||0),0);
        actualizarPropuesta(destino.id,{
          alcance: String(destino.alcance || "").trim() || propuesta.alcance,
          items: [
            ...itemsActuales,
            ...propuesta.items.map((item)=>{
              ultimoId += 1;
              return {id:ultimoId,desc:item.desc,cant:item.cant,unit:item.unit,vu:item.vu};
            }),
          ],
        });
      }
    }

    setDictando(false);
    scrollAppToTop();
  };

  // Borrador que deja otra pantalla: el plano que pasa sus mediciones a una
  // cotizacion, o una conversacion de WhatsApp ya interpretada.
  //
  // Existia el buzon -cotDraft en el contexto- y Planos escribia en el, pero
  // aqui nadie lo recogia: se pulsaba «pasar a cotizacion» y no llegaba nada.
  // Se aplica por la misma puerta que el dictado, que ya sabe rellenar solo lo
  // vacio y agregar los items sin pisar los que haya.
  const draftAplicadoRef = useRef(null);
  useEffect(()=>{
    if(!cotDraft || draftAplicadoRef.current===cotDraft) return;
    draftAplicadoRef.current = cotDraft;
    aplicarDictado({
      cliente: cotDraft.cliente ?? "",
      contacto: cotDraft.contacto ?? "",
      ciudad: cotDraft.ciudad ?? "",
      obra: cotDraft.obra ?? "",
      telefono: cotDraft.telefono ?? "",
      nit: cotDraft.nit ?? "",
      contactoEmail: cotDraft.contactoEmail ?? "",
      direccion: cotDraft.direccion ?? "",
      alcance: cotDraft.alcance ?? "",
      items: Array.isArray(cotDraft.items) ? cotDraft.items : [],
    });
    setTab("form");
    setCotDraft(null);
  // Solo depende del buzon: aplicarDictado se rehace en cada render y meterlo
  // aqui haria correr el efecto sin parar.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[cotDraft]);

  // Clientes que ya estan en el sistema, vengan de su ficha, de una cotizacion
  // anterior o de una obra. Se juntan por razon social acomodada, para que
  // "Proco Inc" y "PROCO INC" no salgan dos veces, y gana la ficha de
  // Clientes, que es la que alguien mantiene al dia.
  const clientesConocidos = (()=>{
    const mapa = new Map();
    const registrar = (datos)=>{
      const nombre = normalizarRazonSocial(datos.nombre);
      if(!nombre) return;
      const previo = mapa.get(nombre) || {};
      // Hubo un tiempo en que el contacto se rellenaba con el nombre de la
      // empresa. Si coinciden, no es una persona: se descarta.
      const contacto = normalizarRazonSocial(datos.contacto)===nombre ? "" : (datos.contacto || "");
      mapa.set(nombre,{
        nombre,
        nit: previo.nit || datos.nit || "",
        contacto: previo.contacto || contacto,
        contactoEmail: previo.contactoEmail || datos.contactoEmail || "",
        telefono: previo.telefono || datos.telefono || "",
        ciudad: previo.ciudad || datos.ciudad || "",
        direccion: previo.direccion || datos.direccion || "",
      });
    };
    // El orden importa: lo primero que entra manda.
    (clientes||[]).forEach((c)=>registrar({nombre:c.nombre,nit:c.nit,contacto:c.contacto,contactoEmail:c.email,telefono:c.telefono,ciudad:c.ciudad,direccion:c.direccion}));
    (cotizaciones||[]).forEach((c)=>registrar({nombre:c.cliente,nit:c.nit,contacto:c.contacto,contactoEmail:c.contactoEmail,telefono:c.telefono,ciudad:c.ciudad,direccion:c.direccion}));
    (obras||[]).forEach((o)=>registrar({nombre:o.cliente,nit:o.nit,telefono:o.tel,ciudad:o.ciudad,direccion:o.direccion}));
    return [...mapa.values()].sort((a,b)=>a.nombre.localeCompare(b.nombre));
  })();

  const agregarPropuesta = ()=>{
    const nueva = buildQuoteProposal({id:createQuoteProposalId(String(propuestasSnapshot.length+1)),nombre:getQuoteProposalLabel(propuestasSnapshot.length),formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,util:10,items:[],incluyeTexto:""},propuestasSnapshot.length);
    setPropuestas([...propuestasSnapshot,nueva]);
  };

  const duplicarPropuesta = ()=>{
    const base = propuestaActiva || propuestasSnapshot[propuestasSnapshot.length-1];
    if(!base) return;
    const copia = buildQuoteProposal({...base,id:createQuoteProposalId(String(propuestasSnapshot.length+1)),nombre:`${base.nombre} (copia)`},propuestasSnapshot.length);
    setPropuestas([...propuestasSnapshot,copia]);
  };

  const eliminarPropuesta = (id)=>{
    const objetivo = propuestasSnapshot.find((x)=>x.id===id);
    if(!objetivo) return;
    if(!window.confirm(`¿Eliminar "${objetivo.nombre}"? Esta acción no se puede deshacer.`)) return;
    const siguientes = propuestasSnapshot.filter((x)=>x.id!==id);
    setPropuestas(siguientes);
    if(propuestaActivaId===id) setPropuestaActivaId(siguientes[0]?.id || null);
  };

  // Misma forma que el objeto que se guarda, pero armado en vivo desde el
  // formulario: alimenta la vista previa sin necesidad de guardar antes.
  const cotizacionEnVivo = {
    id: editCot || "PREVIEW",
    numero: cot,
    fecha,
    val,
    cliente: cl.nombre,
    nit: cl.nit,
    contacto: cl.contacto,
    contactoEmail: cl.contactoEmail,
    obra: cl.obra,
    telefono: cl.telefono,
    ciudad: cl.ciudad,
    direccion: cl.direccion || "",
    coords: cl.coords,
    textoInicial: textoInicial.trim(),
    observaciones: observacionesCot.trim(),
    textosDocumento,
    items: propuestaActiva?.items,
    sinAiu: Boolean(propuestaActiva?.sinAiu),
    util: propuestaActiva?.util,
    total: propuestaActiva?.total,
    formaPago: propuestaActiva?.formaPago,
    tiempoEjec: propuestaActiva?.tiempoEjec,
    mapImg: propuestaActiva?.mapImg || null,
    geoMediciones: propuestaActiva?.geoMediciones || [],
    geoMapView: propuestaActiva?.geoMapView || null,
    tipoCotizacion: propuestaActiva?.tipoCotizacion,
    requerimientoCliente: propuestaActiva?.requerimientoCliente,
    incluyeTexto: propuestaActiva?.incluyeTexto || "",
    propuestaNombre: propuestaActiva?.nombre,
    propuestaAlcance: propuestaActiva?.alcance,
    propuestas: propuestasSnapshot,
    propuestaActivaId: propuestaActiva?.id,
    fotosCotizacion: propuestaActiva?.fotos || [],
    estado: "Pendiente",
  };



  const hydrate = (source={})=>{
    const all = getQuoteProposals(source);
    const activeId = (all.find((propuesta)=>propuesta.id===source.propuestaActivaId) || all[0])?.id || null;
    setCot(source.numero || `P-${34155 + cotizaciones.length}`);
    setFecha(source.fecha || today());
    setVal(source.val || 30);
    setCl({nombre:source.cliente || "",nit:source.nit || "",contacto:source.contacto || "",contactoEmail:source.contactoEmail || "",obra:source.obra || "",telefono:source.telefono || "",ciudad:source.ciudad || "",direccion:source.direccion || "",coords:source.coords || ""});
    setTextoInicial(source.textoInicial || "");
    setObservacionesCot(source.observaciones || "");
    setTextosDocumento(getTextosDocumento(source));

    // Datos viejos guardaban fotos y mediciones a nivel de cotizacion, no de
    // propuesta: se migran a la que estaba activa para no perderlos.
    const migradas = all.map((propuesta)=>{
      const sinAiu = Boolean(propuesta.sinAiu ?? source.sinAiu ?? false);
      if(propuesta.id!==activeId) return buildQuoteProposal({...propuesta,sinAiu,items:normalizeProposalItems(propuesta.items)},0);
      return buildQuoteProposal({
        ...propuesta,
        sinAiu,
        items: normalizeProposalItems(propuesta.items),
        fotos: (propuesta.fotos && propuesta.fotos.length) ? propuesta.fotos : (source.fotosCotizacion || []),
        geoMediciones: (propuesta.geoMediciones && propuesta.geoMediciones.length) ? propuesta.geoMediciones : (source.geoMediciones || []),
        geoMapView: propuesta.geoMapView || source.geoMapView || null,
        mapImg: propuesta.mapImg || source.mapImg || null,
        medicionAutomatica: Boolean(propuesta.medicionAutomatica || (propuesta.geoMediciones && propuesta.geoMediciones.length) || (source.geoMediciones && source.geoMediciones.length)),
      },0);
    });

    setPropuestas(migradas);
    setPropuestaActivaId(activeId);
  };


  const nuevaCotizacion = ()=>{
    setEditCot(null);
    setPreviewCot(null);
    hydrate({numero:getNextCotizacionNumero(cotizaciones),fecha:today(),val:30,cliente:"",obra:"",telefono:"",ciudad:"",coords:"",geoMediciones:[],geoMapView:null,fotosCotizacion:[],propuestas:[buildQuoteProposal({id:createQuoteProposalId("new"),nombre:getQuoteProposalLabel(0),formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,sinAiu:false,util:10,items:[],geoMediciones:[],geoMapView:null,mapImg:null,medicionAutomatica:false,incluyeTexto:""},0)]});
    setTab("form");
  };

  const validarClienteCotizacion = () => {
    const errs = {};
    if (!cl.nombre?.trim()) errs.nombre = "La empresa o cliente es obligatorio";
    if (!cl.direccion?.trim()) errs.direccion = "La dirección de la obra es obligatoria";

    if (Object.keys(errs).length > 0) {
      setErroresCliente(errs);
      const faltantes = [];
      if (errs.nombre) faltantes.push("• Empresa / Razón Social");
      if (errs.direccion) faltantes.push("• Dirección de la obra");
      window.alert(
        `Para continuar con la cotización debes diligenciar los datos obligatorios del cliente:\n\n${faltantes.join("\n")}\n\nNo se pueden crear cotizaciones sin cliente ni dirección de la obra.`
      );
      return false;
    }
    setErroresCliente({});
    return true;
  };

  const persistCotizacion = ({volverALista=true}={})=>{
    if (!validarClienteCotizacion()) {
      return null;
    }

    // Cada propuesta se normaliza y recalcula con SUS propios items.
    const propuestasFinales = propuestasSnapshot.map((propuesta,index)=>{
      const finalItems = normalizeQuoteItems({items:propuesta.items,geoMediciones:propuesta.geoMediciones,propuestas:propuestasSnapshot});
      const subtotal = finalItems.reduce((sum,item)=>sum + (Number(item.cant)||0)*(Number(item.vu)||0),0);
      const sinAiu = Boolean(propuesta.sinAiu);
      const utilidad = sinAiu ? 0 : (subtotal * (Number(propuesta.util || 10) / 100));
      const iva = sinAiu ? (subtotal * 0.19) : (utilidad * 0.19);
      const total = Math.round(subtotal + utilidad + iva);
      return buildQuoteProposal({...propuesta,sinAiu,items:finalItems,total},index);
    });
    const activa = propuestasFinales.find((x)=>x.id===propuestaActivaId) || propuestasFinales[0];
    const prev = editCot ? cotizaciones.find((cotizacion)=>cotizacion.id===editCot) : null;
    const miUserId = ctx?.membresia?.userId || null;
    const data = {
      id: editCot || siguienteIdUnico(cotizaciones, "COT"),
      numero: cot,
      fecha,
      val,
      cliente: normalizarRazonSocial(cl.nombre),
      nit: cl.nit,
      contacto: cl.contacto,
      contactoEmail: cl.contactoEmail,
      obra: normalizarMayusculas(cl.obra),
      telefono: cl.telefono,
      ciudad: normalizarMayusculas(cl.ciudad),
      direccion: normalizarMayusculas(cl.direccion),
      coords: cl.coords,
      textoInicial: textoInicial.trim(),
      observaciones: observacionesCot.trim(),
      textosDocumento,
      items: activa.items,
      sinAiu: Boolean(activa.sinAiu),
      util: activa.util,
      total: activa.total,
      formaPago: activa.formaPago,
      tiempoEjec: activa.tiempoEjec,
      mapImg: activa.mapImg || null,
      geoMediciones: activa.geoMediciones || [],
      geoMapView: activa.geoMapView || null,
      tipoCotizacion: activa.tipoCotizacion,
      requerimientoCliente: activa.requerimientoCliente,
      incluyeTexto: activa.incluyeTexto || "",
      propuestaNombre: activa.nombre,
      propuestaAlcance: activa.alcance,
      propuestas: propuestasFinales,
      propuestaActivaId: activa.id,
      fotosCotizacion: activa.fotos || [],
      estado: prev?.estado || "Pendiente",
      obraId: prev?.obraId || null,
      creadoPor: prev?.creadoPor || miUserId,
      creadoPorNombre: prev?.creadoPorNombre ? normalizarNombrePersona(prev.creadoPorNombre, "Camila Sepúlveda") : (resolverAutorGuardado(ctx?.membresia) || "Camila Sepúlveda"),
      creadoEn: prev?.creadoEn || new Date().toISOString(),
      modificadoPor: miUserId,
      modificadoPorNombre: resolverAutorGuardado(ctx?.membresia, prev?.modificadoPorNombre) || "Camila Sepúlveda",
      modificadoEn: new Date().toISOString(),
    };
    setCotizaciones((prevList)=>editCot ? prevList.map((cotizacion)=>cotizacion.id===editCot?{...cotizacion,...data}:cotizacion) : [...prevList,data]);

    // Sincronizar automáticamente en la tabla de Clientes para que quede registrado con su NIT (si tiene) y Dirección
    if (setClientes && cl.nombre?.trim()) {
      const nomNorm = normalizarRazonSocial(cl.nombre);
      const nitNorm = cl.nit?.trim() ? normalizarDocumento(cl.nit) : "";
      setClientes((prevList) => {
        const index = prevList.findIndex((c) =>
          (nitNorm && c.nit && normalizarDocumento(c.nit) === nitNorm) ||
          normalizarRazonSocial(c.nombre) === nomNorm
        );
        const cliData = {
          nombre: nomNorm,
          nit: nitNorm,
          direccion: normalizarMayusculas(cl.direccion),
          ciudad: normalizarMayusculas(cl.ciudad),
          telefono: normalizarTelefono(cl.telefono),
          contacto: normalizarNombrePropio(cl.contacto),
          email: normalizarCorreo(cl.contactoEmail),
          estado: "Activo",
        };
        if (index >= 0) {
          const previo = prevList[index];
          const actualizado = {
            ...previo,
            ...cliData,
            nit: cliData.nit || previo.nit || "",
            direccion: cliData.direccion || previo.direccion,
            telefono: cliData.telefono || previo.telefono,
            ciudad: cliData.ciudad || previo.ciudad,
          };
          return prevList.map((c, i) => (i === index ? actualizado : c));
        }
        return [...prevList, { id: siguienteIdUnico(prevList, "CLI"), ...cliData }];
      });
    }

    setPropuestas(propuestasFinales);
    setEditCot(data.id);
    if(volverALista) setTab("lista");
    return data;
  };

  const guardarCotizacion = ()=>persistCotizacion({volverALista:true});

  // El botón de guardar vive en la barra superior, junto al indicador de
  // "Guardado". El formulario de cotización es muy largo y el botón quedaba
  // arriba del todo: para guardar tocaba volver a subir cada vez.
  //
  // La función se lee de una referencia porque se recrea en cada render; si
  // fuera dependencia del efecto, se estaría republicando sin parar.
  const guardarRef = useRef(guardarCotizacion);
  useEffect(()=>{ guardarRef.current = guardarCotizacion; });

  // Todas las acciones del formulario viven en la barra de arriba.
  //
  // Estaban repartidas: "Guardar" arriba y las otras cuatro en el titulo de
  // la pantalla, que ademas ocupaba dos renglones antes de empezar el
  // formulario. Juntas ahi arriba se ahorra ese alto y no hay que buscar el
  // boton en dos sitios.
  //
  // Se ven en tres niveles: lo secundario -volver, dictar, ver el
  // documento- en gris; "Guardar" en naranja, que es lo que se hace mas
  // veces; y "Guardar y ver" con el naranja solo en el borde, para que se
  // note que es hermano del anterior sin competir con el.
  const BOTON_BASE = {
    borderRadius:9, padding:"7px 13px", fontSize:12, fontWeight:600,
    cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", lineHeight:1.2,
    display:"inline-flex", alignItems:"center", gap:5,
  };
  const SECUNDARIO = { ...BOTON_BASE, background:"var(--btn-cancelar-bg, #f1f5f9)", color:"var(--btn-cancelar-text, #475569)", border:"1px solid var(--border, #e2e8f0)" };

  // Descarga la cotizacion en PDF, sin pasar por el dialogo de impresion.
  //
  // Antes abria una pestaña con el documento y el dialogo del navegador, y
  // habia que elegir "Guardar como PDF" y ponerle nombre a mano. Ahora baja
  // el archivo ya armado y con su nombre -numero, cliente y obra-, igual que
  // en los informes y las certificaciones.
  const [bajandoPdf,setBajandoPdf]=useState(null);
  const descargarPdf = async (cotizacion)=>{
    if(bajandoPdf) return;
    setBajandoPdf(cotizacion.id);
    try{
      const {blob,nombre} = await generarCotizacionPdf(cotizacion,{firmaImg,sello:selloCotizacion});
      downloadGeneratedFile(new File([blob],nombre,{type:"application/pdf"}));
    }catch(e){
      console.error("No se pudo generar el PDF de la cotizacion:",e);
      window.alert(e?.message || "No se pudo generar el PDF. Inténtalo de nuevo.");
    }finally{
      setBajandoPdf(null);
    }
  };

  const descargarPdfDesdeEditor = async ()=>{
    if(bajandoPdf) return;
    setBajandoPdf("editor");
    try{
      const guardada = persistCotizacion({volverALista:false});
      const cotizacionParaPdf = guardada || cotizacionEnVivo;
      const {blob,nombre} = await generarCotizacionPdf(cotizacionParaPdf,{firmaImg,sello:selloCotizacion});
      downloadGeneratedFile(new File([blob],nombre,{type:"application/pdf"}));
    }catch(e){
      console.error("No se pudo generar el PDF desde el editor:",e);
      window.alert(e?.message || "No se pudo generar el PDF. Inténtalo de nuevo.");
    }finally{
      setBajandoPdf(null);
    }
  };

  // En el listado, la barra lleva el boton de crear. Antes vivia en el
  // titulo de la pantalla, que ocupaba dos renglones para decir algo que ya
  // pone la barra de arriba.
  const nuevaRef = useRef(nuevaCotizacion);
  useEffect(()=>{ nuevaRef.current = nuevaCotizacion; });

  useAccionesPantalla(
    tab==="lista" ? (
      <button
        style={{
          background:"#f47c20", color:"#fff", border:"1px solid #f47c20", borderRadius:9,
          padding:"8px 16px", fontSize:12.5, fontWeight:700, cursor:"pointer",
          fontFamily:"inherit", whiteSpace:"nowrap",
        }}
        onClick={()=>nuevaRef.current()}
      >+ Nueva Cotización</button>
    ) : tab==="form" ? (
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button
          style={{ ...SECUNDARIO, padding: "6px 12px", fontSize: 12, fontWeight: 600 }}
          onClick={()=>setTab("lista")}
          title="Volver al listado de cotizaciones"
        >
          ← Volver a lista
        </button>
        <button
          style={{
            ...BOTON_BASE,
            background:"#f47c20",
            color:"#fff",
            border:"1px solid #ea580c",
            fontWeight:700,
            padding:"6.5px 16px",
            fontSize: 12.5,
            boxShadow: "0 1px 3px rgba(244,124,32,0.25)",
          }}
          onClick={()=>guardarRef.current()}
        >
          💾 Guardar
        </button>
      </div>
    ) : null,
    [tab]
  );

  const guardarCotizacionYSubir = ()=>{
    const saved = persistCotizacion({volverALista:false});
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        scrollAppToTop("smooth");
      });
    });
    return saved;
  };

  const aprobarCotizacion = (cotId)=>{
    const base = cotizaciones.find((cotizacion)=>cotizacion.id===cotId);
    const snapshot = base ? getQuoteApprovalAccountingSnapshot(base) : null;
    const cotizacion = snapshot?.cotizacion || null;
    if(!cotizacion || !snapshot) return;

    // Buscar si ya existe alguna obra vinculada a esta cotización
    const obrasAsociadas = obras.filter((o) =>
      (cotizacion.obraId && o.id === cotizacion.obraId) ||
      (o.cotizacionId && (
        String(o.cotizacionId).trim() === String(cotizacion.id).trim() ||
        (cotizacion.numero && String(o.cotizacionId).trim() === String(cotizacion.numero).trim())
      ))
    );

    let obraExistente = null;
    if (obrasAsociadas.length > 0) {
      const tieneTrabajo = (o) => Boolean(
        Number(o?.avance || 0) > 0 ||
        Number(o?.pagado || 0) > 0 ||
        Number(o?.costos || 0) > 0 ||
        (Array.isArray(o?.bitacora) && o.bitacora.length > 0) ||
        (Array.isArray(o?.empleados) && o.empleados.length > 0) ||
        (Array.isArray(o?.trazos) && o.trazos.length > 0) ||
        (Array.isArray(o?.anclajes) && o.anclajes.length > 0) ||
        Number(o?.totalFotosAvance || 0) > 0
      );

      const ordenadas = [...obrasAsociadas].sort((a, b) => {
        const aTrab = tieneTrabajo(a) ? (Number(a.avance || 0) || 1) : 0;
        const bTrab = tieneTrabajo(b) ? (Number(b.avance || 0) || 1) : 0;
        if (aTrab !== bTrab) return bTrab - aTrab;
        const numA = parseInt(String(a.id || "").replace(/\D/g, ""), 10) || 0;
        const numB = parseInt(String(b.id || "").replace(/\D/g, ""), 10) || 0;
        return numA - numB;
      });
      obraExistente = ordenadas[0];
    }

    let obraId;
    if (obraExistente) {
      // REUTILIZAR LA OBRA EXISTENTE: No crear una nueva ni gastar otro consecutivo
      obraId = obraExistente.id;
      const idsClonesSobrantes = obrasAsociadas
        .filter((o) => o.id !== obraId && Number(o.avance || 0) === 0)
        .map((o) => o.id);

      setObras((prev) => prev
        .filter((o) => !idsClonesSobrantes.includes(o.id))
        .map((o) => {
          if (o.id !== obraId) return o;
          return {
            ...o,
            cliente: cotizacion.cliente,
            nit: cotizacion.nit || o.nit || "",
            tel: cotizacion.telefono || o.tel,
            proyecto: cotizacion.obra || o.proyecto,
            ciudad: cotizacion.ciudad || o.ciudad,
            direccion: cotizacion.direccion || o.direccion || "",
            coords: cotizacion.coords || o.coords || "",
            estado: o.estado === "Cancelada" ? "En Obra" : (o.estado || "En Obra"),
            total: snapshot.totalObra,
            saldo: Math.max(0, snapshot.totalObra - Number(o.pagado || 0)),
            cotizacionId: cotizacion.id,
            subtotalCotizacion: snapshot.subtotalCotizacion,
            utilidadCotizacion: snapshot.utilidadCotizacion,
            baseIngresoContable: snapshot.baseIngresoContable,
            ivaGeneradoCotizacion: snapshot.ivaGeneradoCotizacion,
          };
        })
      );
    } else {
      // Si no existe, crear la obra con el siguiente consecutivo
      obraId = siguienteIdUnico(obras,"OB");
      setObras((prev)=>[...prev,{
        id:obraId,
        cliente:cotizacion.cliente,
        nit:cotizacion.nit || "",
        tel:cotizacion.telefono,
        proyecto:cotizacion.obra,
        ciudad:cotizacion.ciudad,
        direccion:cotizacion.direccion || "",
        coords:cotizacion.coords || "",
        estado:"En Obra",
        avance:0,
        total:snapshot.totalObra,
        pagado:0,
        saldo:snapshot.totalObra,
        costos:0,
        fechaInicio:today(),
        fechaFin:"",
        empleados:[],
        trazos:[],
        anclajes:[],
        imgSat:cotizacion.mapImg || null,
        geoMediciones:cotizacion.geoMediciones || [],
        geoMapView:cotizacion.geoMapView || null,
        cotizacionId:cotizacion.id,
        subtotalCotizacion:snapshot.subtotalCotizacion,
        utilidadCotizacion:snapshot.utilidadCotizacion,
        baseIngresoContable:snapshot.baseIngresoContable,
        ivaGeneradoCotizacion:snapshot.ivaGeneradoCotizacion,
      }]);
    }

    setCotizaciones((prev)=>prev.map((item)=>item.id===cotId?{...item,estado:"Aprobada",obraId}:item));
    setObraCreada({id:obraId,cliente:cotizacion.cliente,proyecto:cotizacion.obra,correo:"enviando"});

    // Confirmacion al cliente, sin preguntar nada: aprobar ya fue la decision.
    // El resultado si se muestra: si el correo no sale, quien aprobo tiene que
    // enterarse para avisar por otro medio.
    const destino = String(cotizacion.contactoEmail || "").trim();
    if(!destino){
      setObraCreada((prev)=>prev && {...prev,correo:"sin-direccion"});
      return;
    }

    // El correo de aprobacion lleva la cotizacion adjunta: es el documento que
    // el cliente va a querer tener a mano cuando empiece la obra, y pedirselo
    // despues por otro medio sobra.
    //
    // Si el PDF no se puede generar, el correo sale IGUAL pero sin adjunto: el
    // cliente tiene que enterarse de que se le aprobo aunque falle el archivo.
    // Se avisa en pantalla para poder mandarselo aparte.
    (async ()=>{
      let adjunto = {nombreArchivo:"", pdfBase64:""};
      try{
        const {blob, nombre} = await generarCotizacionPdf(cotizacion,{firmaImg,sello:selloCotizacion});
        adjunto = {nombreArchivo:nombre, pdfBase64:await blobABase64(blob)};
      }catch(e){
        console.error("No se pudo generar el PDF para adjuntarlo a la aprobacion:",e);
      }

      const base = {
        para: destino,
        asunto: asuntoAprobacion(cotizacion),
        mensaje: mensajeAprobacion(cotizacion,{obraId}),
      };

      try{
        await enviarCotizacionPorCorreo({...base, ...adjunto});
        setObraCreada((prev)=>prev && {
          ...prev,
          correo: adjunto.pdfBase64 ? "enviado" : "enviado-sin-pdf",
          destino,
        });
      }catch(e){
        // Si lo que tumbo el envio fue el adjunto -el servidor rechaza los PDF
        // de mas de 20 MB, y una cotizacion con muchas fotos los pasa-, se
        // manda el aviso solo. Que el cliente sepa que se le aprobo importa mas
        // que llevarle el archivo, y el archivo se le puede pasar aparte.
        if(adjunto.pdfBase64){
          console.error("Falló el correo con el PDF adjunto, se reintenta sin él:",e);
          try{
            await enviarCotizacionPorCorreo({...base, nombreArchivo:"", pdfBase64:""});
            setObraCreada((prev)=>prev && {...prev,correo:"enviado-sin-pdf",destino});
            return;
          }catch(e2){
            console.error("Tampoco salió el correo sin adjunto:",e2);
            setObraCreada((prev)=>prev && {...prev,correo:"fallo",destino,motivo:e2.message});
            return;
          }
        }
        console.error("No se pudo avisar al cliente de la aprobacion:",e);
        setObraCreada((prev)=>prev && {...prev,correo:"fallo",destino,motivo:e.message});
      }
    })();
  };

  // Deshacer una aprobación. Se desaprueba de forma segura:
  // - Si la obra tiene trabajo registrado (avance, bitácora, pagos, fotos, etc.),
  //   la obra SE CONSERVA y la cotización mantiene la vinculación para que al
  //   re-aprobar se reutilice la misma obra sin crear duplicados ni gastar consecutivos.
  // - Si la obra está sin empezar (0% avance, recién creada), se retira para no
  //   dejar registros vacíos y permitir que el consecutivo quede intacto.
  // - Si el usuario pulsa "Cancelar" en el cuadro de confirmación, la acción se aborta
  //   completamente (no se modifica nada).
  const desaprobarCotizacion = (cotId)=>{
    const cotizacion = cotizaciones.find((c)=>c.id===cotId);
    if(!cotizacion) return;

    // Buscar todas las obras asociadas a esta cotización (por obraId o por cotizacionId)
    const obrasAsociadas = obras.filter((o) =>
      (cotizacion.obraId && o.id === cotizacion.obraId) ||
      (o.cotizacionId && (
        String(o.cotizacionId).trim() === String(cotizacion.id).trim() ||
        (cotizacion.numero && String(o.cotizacionId).trim() === String(cotizacion.numero).trim())
      ))
    );

    const tieneTrabajo = (o) => Boolean(
      Number(o?.avance || 0) > 0 ||
      Number(o?.pagado || 0) > 0 ||
      Number(o?.costos || 0) > 0 ||
      (Array.isArray(o?.bitacora) && o.bitacora.length > 0) ||
      (Array.isArray(o?.empleados) && o.empleados.length > 0) ||
      (Array.isArray(o?.trazos) && o.trazos.length > 0) ||
      (Array.isArray(o?.anclajes) && o.anclajes.length > 0) ||
      Number(o?.totalFotosAvance || 0) > 0
    );

    const obraPrincipal = obrasAsociadas.length > 0
      ? [...obrasAsociadas].sort((a, b) => {
          const aTrab = tieneTrabajo(a) ? (Number(a.avance || 0) || 1) : 0;
          const bTrab = tieneTrabajo(b) ? (Number(b.avance || 0) || 1) : 0;
          if (aTrab !== bTrab) return bTrab - aTrab;
          const numA = parseInt(String(a.id || "").replace(/\D/g, ""), 10) || 0;
          const numB = parseInt(String(b.id || "").replace(/\D/g, ""), 10) || 0;
          return numA - numB;
        })[0]
      : null;

    const algunaConTrabajo = obrasAsociadas.some(tieneTrabajo);

    if (!obraPrincipal) {
      if (!window.confirm(
        `¿Devolver la cotización ${cotizacion.numero || cotizacion.id} a "Pendiente"?`
      )) return;

      setCotizaciones((prev) => prev.map((c) => (
        c.id === cotId ? { ...c, estado: "Pendiente", obraId: null } : c
      )));
    } else if (algunaConTrabajo) {
      if (!window.confirm(
        `La cotización ${cotizacion.numero || cotizacion.id} volverá a "Pendiente".\n\n` +
        `La obra ${obraPrincipal.id} (${obraPrincipal.proyecto || obraPrincipal.cliente}) SE CONSERVA intacta: ya tiene trabajo registrado (avance, fotos, pagos, etc.).\n\n` +
        `Si más adelante vuelves a aprobarla, se reutilizará la misma obra ${obraPrincipal.id} sin generar duplicados ni alterar el consecutivo.\n\n` +
        `¿Deseas continuar?`
      )) return;

      // Conservar obraId para saber qué obra reactivar al aprobar de nuevo
      setCotizaciones((prev) => prev.map((c) => (
        c.id === cotId ? { ...c, estado: "Pendiente", obraId: obraPrincipal.id } : c
      )));

      // Limpiar clones vacíos sobrantes si existieran
      const idsClonesVacios = obrasAsociadas
        .filter((o) => o.id !== obraPrincipal.id && !tieneTrabajo(o))
        .map((o) => o.id);

      if (idsClonesVacios.length > 0) {
        setObras((prev) => prev.filter((o) => !idsClonesVacios.includes(o.id)));
      }
    } else {
      if (!window.confirm(
        `¿Devolver la cotización ${cotizacion.numero || cotizacion.id} a "Pendiente" y retirar la obra creada (${obraPrincipal.id})?\n\n` +
        `La obra está sin empezar (0% de avance). Al retirarla, no afectará el consecutivo ni dejará registros vacíos.`
      )) return;

      setCotizaciones((prev) => prev.map((c) => (
        c.id === cotId ? { ...c, estado: "Pendiente", obraId: null } : c
      )));

      // Eliminar las obras vacías para liberar el consecutivo y evitar duplicados
      const idsObrasABorrar = obrasAsociadas.map((o) => o.id);
      setObras((prev) => prev.filter((o) => !idsObrasABorrar.includes(o.id)));
    }

    setObraCreada(null);
  };

  // Duplicar una cotización existente creando una copia idéntica con nuevo folio
  const duplicarCotizacion = async (cotId) => {
    const origen = (await asegurarDetalle("cotizaciones", cotId)) || cotizaciones.find((c) => c.id === cotId);
    if (!origen) return;

    const nuevoId = siguienteIdUnico(cotizaciones, "COT");
    const nuevoNumero = getNextCotizacionNumero(cotizaciones);
    const miUserId = ctx?.membresia?.userId || null;
    const miNombre = resolverAutorGuardado(ctx?.membresia) || "Camila Sepúlveda";

    const propuestasClonadas = (Array.isArray(origen.propuestas) && origen.propuestas.length > 0
      ? origen.propuestas
      : [buildQuoteProposal({ id: createQuoteProposalId(origen.id || "draft"), items: origen.items || [] }, 0)]
    ).map((p, idx) => ({
      ...p,
      id: createQuoteProposalId(nuevoId + "_" + idx),
    }));

    const copia = {
      ...origen,
      id: nuevoId,
      numero: nuevoNumero,
      fecha: today(),
      estado: "Pendiente",
      obraId: null,
      propuestas: propuestasClonadas,
      propuestaActivaId: propuestasClonadas[0]?.id || null,
      creadoPor: miUserId,
      creadoPorNombre: miNombre,
      creadoEn: new Date().toISOString(),
      modificadoPor: miUserId,
      modificadoPorNombre: miNombre,
      modificadoEn: new Date().toISOString(),
    };

    setCotizaciones((prev) => [copia, ...prev]);
  };


  if(tab==="lista"){
    if(previewCot){
      return (
        <div style={{padding:28}}>
          <H1
            title={`Cotización ${previewCot.numero || previewCot.id}`}
            subtitle="Vista completa del documento comercial"
            action={
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <button style={B("#f1f5f9","#475569")} onClick={()=>setPreviewCot(null)}>Volver</button>
                <button style={B("#dbeafe","#1e40af")} onClick={()=>{setEditCot(previewCot.id);hydrate(previewCot);setTab("form");setPreviewCot(null);}}>Editar</button>
                <button style={B("#f1f5f9","#475569")} disabled={Boolean(bajandoPdf)} onClick={()=>descargarPdf(previewCot)}>{bajandoPdf?"Generando…":"Descargar PDF"}</button>
                <button style={B("#f47c20")} onClick={()=>setEnviarCot(previewCot)}>Enviar al cliente</button>
              </div>
            }
          />
          <DocumentoEnVivo cotizacion={previewCot} firmaImg={firmaImg} sello={selloCotizacion} alto="calc(100dvh - 210px)" nota="Igual al PDF" sticky={false}/>
          {enviarCot && <EnviarCotizacion cotizacion={enviarCot} firmaImg={firmaImg} onCerrar={()=>setEnviarCot(null)}/>}
        </div>
      );
    }
    return (
      <div style={{padding:28}}>

        {/* Al aprobar, se explica que se creo y cual es el siguiente paso:
            quien cotiza no tiene por que saber que ahora existe una obra. */}
        {obraCreada && (
          <div style={{background:"#F0FDF4",border:"1px solid #BBF7D0",borderRadius:14,padding:"16px 20px",marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:14,fontWeight:700,color:"#15803D"}}>
                  Listo: se creó la obra {obraCreada.id}
                </div>
                <div style={{fontSize:12.5,color:"#166534",marginTop:6,lineHeight:1.55}}>
                  {obraCreada.cliente}{obraCreada.proyecto?` · ${obraCreada.proyecto}`:""}. Los datos del cliente,
                  el valor y las mediciones ya pasaron a la obra: <strong>no hay que volver a escribirlos</strong>.
                </div>
                <div style={{fontSize:12.5,color:"#166534",marginTop:8,lineHeight:1.55}}>
                  Desde la obra se generan el <strong>informe de actividades</strong> y la <strong>certificación</strong>,
                  también con los datos ya cargados. Entra a la obra y ahí te dice qué falta para cada uno.
                </div>

                {/* El correo sale solo, pero el resultado se ve: si no llego,
                    quien aprobo tiene que enterarse para avisar por otro medio. */}
                {obraCreada.correo==="enviando" && (
                  <div style={{fontSize:12,color:"#166534",marginTop:8,opacity:.75}}>
                    Preparando la cotización en PDF y avisando al cliente…
                  </div>
                )}
                {obraCreada.correo==="enviado" && (
                  <div style={{fontSize:12,color:"#166534",marginTop:8}}>
                    Se le confirmó por correo a <strong>{obraCreada.destino}</strong>, con la cotización adjunta.
                  </div>
                )}
                {obraCreada.correo==="enviado-sin-pdf" && (
                  <div style={{fontSize:12,color:"#B54708",marginTop:8,lineHeight:1.5}}>
                    Se le confirmó por correo a <strong>{obraCreada.destino}</strong>, pero
                    <strong> sin la cotización adjunta</strong>: el PDF no se pudo generar. Mándaselo
                    aparte desde «Ver / Imprimir».
                  </div>
                )}
                {obraCreada.correo==="sin-direccion" && (
                  <div style={{fontSize:12,color:"#B54708",marginTop:8,lineHeight:1.5}}>
                    No se avisó al cliente: esta cotización no tiene correo de contacto.
                  </div>
                )}
                {obraCreada.correo==="fallo" && (
                  <div style={{fontSize:12,color:"#B42318",marginTop:8,lineHeight:1.5}}>
                    <strong>El correo al cliente no salió</strong> ({obraCreada.motivo}). La obra sí quedó
                    creada; avísale tú.
                  </div>
                )}
              </div>
              <button
                onClick={()=>setObraCreada(null)}
                title="Cerrar aviso"
                style={{background:"transparent",border:"none",color:"#15803D",cursor:"pointer",fontSize:18,lineHeight:1,padding:4,flexShrink:0}}
              >×</button>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:14}}>
              <button
                onClick={()=>{setObraCreada(null);ctx.irAPantalla("obras");}}
                style={{...B("#16a34a"),fontSize:12,padding:"9px 16px"}}
              >
                Ir a la obra {obraCreada.id}
              </button>
              <button
                onClick={()=>setObraCreada(null)}
                style={{...B("#f1f5f9","#475569"),fontSize:12,padding:"9px 16px"}}
              >
                Seguir cotizando
              </button>
            </div>
          </div>
        )}
        <ListaCotizaciones
          cotizaciones={cotizaciones}
          acciones={{
            ver: async (c)=>{
              setPreviewCot(c);
              const completa = (await asegurarDetalle("cotizaciones", c.id)) || cotizaciones.find((x)=>x.id===c.id) || c;
              setPreviewCot(completa);
            },
            editar: async (c)=>{
              // Se esperan las fotos ANTES de llenar el formulario: si se
              // llenara sin ellas, el siguiente guardado las borraria.
              const completa = (await asegurarDetalle("cotizaciones", c.id)) || c;
              setEditCot(completa.id); hydrate(completa); setTab("form");
            },
            aprobar: (c)=>aprobarCotizacion(c.id),
            desaprobar: (c)=>desaprobarCotizacion(c.id),
            duplicar: (c)=>duplicarCotizacion(c.id),
            pdf: async (c)=>descargarPdf((await asegurarDetalle("cotizaciones", c.id)) || c),
            enviar: async (c)=>setEnviarCot((await asegurarDetalle("cotizaciones", c.id)) || c),
            eliminar: (c)=>{
              if(!window.confirm(`¿Eliminar la cotización "${c.numero || c.id}" de ${c.cliente || "este cliente"}? Esta acción no se puede deshacer.`)) return;
              setCotizaciones((prev)=>prev.filter((x)=>x.id!==c.id));
            },
          }}
        />

        {/* La lista tiene su propio return, aparte del formulario. Sin montar
            aqui el dialogo, el boton de enviar guardaba el estado y no pasaba
            nada visible. */}
        {enviarCot && <EnviarCotizacion cotizacion={enviarCot} firmaImg={firmaImg} onCerrar={()=>setEnviarCot(null)}/>}
      </div>
    );
  }

  return (
    // Menos aire arriba: el formulario es largo y arrancaba muy abajo.
    <div style={{padding:"16px 28px 28px"}}>
      {/* Sin el titulo grande: ocupaba dos renglones -"Editar Cotización" y
          su explicacion- antes de empezar el formulario, y las acciones que
          llevaba al lado ya estan arriba en la barra. Queda solo este
          renglon, que dice lo unico que no se sabe de memoria: si es nueva o
          cual se esta editando. */}
      {/* Barra ejecutiva flotante con KPIs y acciones del editor */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "var(--surface, #ffffff)",
          borderRadius: 14,
          border: "1px solid var(--border, #eaecf0)",
          padding: "10px 16px",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          boxShadow: "0 4px 12px -2px rgba(16,24,40,0.06), 0 2px 4px -2px rgba(16,24,40,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <button
            type="button"
            style={{
              ...SECUNDARIO,
              fontSize: 12,
              padding: "6px 12px",
              fontWeight: 600,
            }}
            onClick={() => setTab("lista")}
            title="Volver al listado de cotizaciones"
          >
            ← Volver
          </button>
          
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              background: "var(--surface-subtle, #f2f4f7)",
              color: "var(--text-main, #101828)",
              border: "1px solid var(--border, #eaecf0)",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 11.5,
              fontWeight: 700,
            }}>
              {cot || "Borrador"}
            </span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main, #101828)" }}>
              {cl.nombre ? cl.nombre : "Nuevo Cliente"}
            </span>
          </div>

          <div style={{
            display: "inline-flex",
            alignItems: "baseline",
            gap: 6,
            background: "rgba(224, 52, 42, 0.06)",
            border: "1px solid rgba(224, 52, 42, 0.15)",
            borderRadius: 8,
            padding: "4px 10px",
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted, #667085)" }}>Total COP:</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#E0342A", fontVariantNumeric: "tabular-nums" }}>
              {fmt(totalCotizacionCalculado)}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {!dictando && (
            <button
              type="button"
              style={SECUNDARIO}
              onClick={() => setDictando(true)}
              title="Armar la cotización hablando"
            >
              🎤 Dictar
            </button>
          )}

          {!importando && (
            <button
              type="button"
              style={SECUNDARIO}
              onClick={() => setImportando(true)}
              title="Leer la solicitud que mandó el cliente y armar la cotización con ella"
            >
              📄 Importar
            </button>
          )}

          <button
            type="button"
            style={verDocumento
              ? { ...BOTON_BASE, background: "var(--c-tinta, #0f172a)", color: "#ffffff", border: "1px solid var(--border, #0f172a)" }
              : SECUNDARIO}
            onClick={() => setVerDocumento((v) => !v)}
            title="Muestra el documento completo tal como se imprimirá, mientras editas"
          >
            {verDocumento ? "👁️ Ocultar documento" : "👁️ Ver documento"}
          </button>

          <button
            type="button"
            style={{
              ...BOTON_BASE,
              background: bajandoPdf === "editor" ? "var(--border, #e2e8f0)" : "var(--surface-subtle, #f2f4f7)",
              color: bajandoPdf === "editor" ? "var(--text-subtle, #94a3b8)" : "var(--text-main, #101828)",
              border: "1px solid var(--border, #eaecf0)",
            }}
            disabled={Boolean(bajandoPdf)}
            onClick={descargarPdfDesdeEditor}
            title="Descarga el documento de la cotización en formato PDF directamente"
          >
            {bajandoPdf === "editor" ? "Generando…" : "📥 Descargar PDF"}
          </button>

          <button
            type="button"
            style={{
              ...BOTON_BASE,
              background: "#E0342A",
              color: "#ffffff",
              border: "1px solid #B42318",
              fontSize: 12,
              padding: "7px 16px",
              fontWeight: 700,
              boxShadow: "0 1px 3px rgba(224,52,42,0.25)",
            }}
            onClick={() => guardarRef.current()}
          >
            💾 Guardar cotización
          </button>
        </div>
      </div>

      <div style={{
        display:"grid",
        // En pantallas anchas el documento va al lado; en angostas, el boton
        // alterna entre formulario y documento para no apilar dos cosas largas.
        gridTemplateColumns: verDocumento && cabeEnDosColumnas ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)",
        gap:18,
        alignItems:"start",
      }}>
      <div style={{minWidth:0, display: verDocumento && !cabeEnDosColumnas ? "none" : "block"}}>

      {/* Armar hablando: rellena el formulario a partir de un dictado. El
          botón que lo abre está arriba, con el resto de acciones. */}
      {dictando && <DictarCotizacion onAplicar={aplicarDictado} onCerrar={()=>setDictando(false)}/>}

      {/* Misma puerta que el dictado: cambia de donde sale el texto. */}
      {importando && (
        <ImportarCotizacion
          clientes={clientes}
          onAplicar={(propuesta)=>{ aplicarDictado(propuesta); setImportando(false); }}
          onCerrar={()=>setImportando(false)}
        />
      )}

      {/* Identificación */}
      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>Portada · Identificación</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <div><LBL>N° Cotización</LBL><input value={cot} onChange={e=>setCot(e.target.value)} style={SI}/></div>
          <div><LBL>Fecha</LBL><input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={SI}/></div>
          <div><LBL>Válida (días)</LBL><input type="number" value={val} onChange={e=>setVal(Number(e.target.value))} style={SI}/></div>
        </div>
      </div>

      {/* Cliente */}
      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>Portada · Cliente</div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {/* La razon social va en mayuscula, no como nombre propio: es como
              se escribe en la portada de los documentos de la empresa. */}
          <BuscadorCliente
            label="Empresa / Cliente *"
            valor={cl.nombre}
            clientes={clientesConocidos}
            onEscribir={(v)=>{
              setCl((prev)=>({...prev,nombre:v}));
              if(erroresCliente.nombre) setErroresCliente(p=>({...p,nombre:""}));
            }}
            onElegir={(c)=>{
              setCl((prev)=>({
                ...prev,
                nombre:c.nombre,
                nit:c.nit || prev.nit,
                contacto:c.contacto || prev.contacto,
                contactoEmail:c.contactoEmail || prev.contactoEmail,
                telefono:c.telefono || prev.telefono,
                ciudad:c.ciudad || prev.ciudad,
                direccion:c.direccion || prev.direccion,
              }));
              setErroresCliente({});
            }}
            ayuda={clientesConocidos.length
              ? `Toca el campo o la flecha ▼ para desplegar los ${clientesConocidos.length} clientes existentes y autocompletar sus datos.`
              : "Va en la portada del documento, en mayúscula."}
          />
          <CampoTexto
            label="NIT / Cédula"
            error={erroresCliente.nit}
            valor={cl.nit}
            onChange={(v)=>{
              setCl({...cl,nit:v});
              if(erroresCliente.nit) setErroresCliente(p=>({...p,nit:""}));
            }}
            normalizar={normalizarDocumento}
            placeholder="900123456-7 o cédula"
            spellCheck={false}
            ayuda="Opcional. Viaja a la ficha del cliente y al comprobante contable."
          />
          <CampoTexto label="Contacto" valor={cl.contacto} onChange={v=>setCl({...cl,contacto:v})}
            normalizar={normalizarNombrePropio} autoCapitalize="words"/>
          <CampoTexto label="Correo del contacto" valor={cl.contactoEmail} onChange={v=>setCl({...cl,contactoEmail:v})}
            normalizar={normalizarCorreo} revisar={avisoCorreo} type="email" placeholder="isabel@empresa.com"
            inputMode="email" autoCapitalize="off" spellCheck={false}
            ayuda="A esta dirección se envía la cotización."/>
          <CampoTexto label="Obra" valor={cl.obra} onChange={v=>setCl({...cl,obra:v})}
            normalizar={normalizarMayusculas} autoCapitalize="characters"/>
          <CampoTexto label="Teléfono" valor={cl.telefono} onChange={v=>setCl({...cl,telefono:v})}
            normalizar={normalizarTelefono} revisar={avisoCelular} inputMode="tel" spellCheck={false}/>
          <SelectorCiudadColombia
            label="Ciudad / Ubicación"
            valor={cl.ciudad}
            onChange={(v)=>setCl({...cl,ciudad:v})}
            ayuda="Inicia en Antioquia. Selecciona el municipio y se completa automáticamente."
          />
          <CampoTexto
            label="Dirección de la obra"
            obligatorio={true}
            error={erroresCliente.direccion}
            valor={cl.direccion}
            onChange={(v)=>{
              setCl({...cl,direccion:v});
              if(erroresCliente.direccion) setErroresCliente(p=>({...p,direccion:""}));
            }}
            normalizar={normalizarMayusculas}
            placeholder="Ej: CALLE 10 # 43E-20"
            autoCapitalize="characters"
            ayuda="Obligatorio. Viaja a la ficha del cliente y a la obra cuando se apruebe."
          />
        </div>
      </div>

      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>01 · Carta de presentación</div>
        {/* Va primero porque es lo primero que se ve del documento. */}
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <LBL>Título de la portada</LBL>
            <BotonCorregir valor={textosDocumento.tituloPortada} onChange={(v)=>setTexto("tituloPortada",v)} compacto/>
          </div>
          {/* De una sola linea, centrado y en mayuscula: igual que sale
              impreso. Era un campo de varios renglones y cada uno salia como
              una linea aparte del titulo; ahora va seguido y es la hoja la
              que lo parte donde toque, que es lo que lo deja bien centrado.
              Lo guardado con saltos -las cotizaciones de antes- se muestra
              unido con un espacio.

              OJO: aqui no se puede recortar el texto -ni trim() ni
              lineasDeTexto()-. Lo que se muestra se recalcula en cada tecla,
              asi que el espacio del final se borraba en el mismo instante en
              que se pulsaba la barra: no habia forma de separar dos palabras.
              Los espacios de sobra los quita el onChange y, al imprimir, la
              hoja. */}
          <input
            value={String(textosDocumento.tituloPortada||"").replace(/\n+/g," ")}
            onChange={e=>setTexto("tituloPortada",e.target.value.replace(/\s+/g," "))}
            onBlur={e=>{
              const v = e.target.value.replace(/\s+/g," ");
              const auto = corregirOrtografiaLocal(v);
              if (auto !== v) {
                setTexto("tituloPortada", auto);
              }
            }}
            style={{...SI,fontSize:14,fontWeight:600,
              textAlign:"center",textTransform:"uppercase"}}
          />
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>
            El título grande de la primera hoja. Cámbialo según el trabajo: certificación, mantenimiento
            de fachadas, obra blanca… Sale centrado y en mayúscula, como se ve aquí; si es largo, la hoja
            lo reparte solo en varias líneas.
          </div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><LBL>Frase de apertura</LBL><BotonCorregir valor={textosDocumento.saludo} onChange={(v)=>setTexto("saludo",v)} compacto/></div>
          <textarea
            value={textosDocumento.saludo}
            onChange={e=>setTexto("saludo",e.target.value)}
            onBlur={e=>{
              const auto = corregirOrtografiaLocal(e.target.value);
              if(auto !== e.target.value) setTexto("saludo", auto);
            }}
            style={{...SI,minHeight:60,resize:"vertical",lineHeight:1.6}}
          />
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Se imprime después de &quot;Cordial saludo, [cliente]&quot;. Si la obra tiene nombre, se agrega al final. No hace falta el punto final.</div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><LBL>Presentación de la empresa</LBL><BotonCorregir valor={textosDocumento.presentacion} onChange={(v)=>setTexto("presentacion",v)} compacto/></div>
          {/* Sin lineas en blanco entre parrafos: gastaban tres renglones de
              pantalla y en la hoja los parrafos salen seguidos igual. Se
              quitan tambien al mostrar, para las cotizaciones que ya estaban
              guardadas con ellas. Solo eso: recortar cada renglon impedia
              escribir un espacio al final de una palabra, igual que pasaba en
              el titulo de arriba. */}
          <textarea
            value={String(textosDocumento.presentacion||"").replace(/\n{2,}/g,"\n")}
            onChange={e=>setTexto("presentacion",e.target.value.replace(/\n{2,}/g,"\n"))}
            onBlur={e=>{
              const v = e.target.value.replace(/\n{2,}/g,"\n");
              const auto = corregirOrtografiaLocal(v);
              if(auto !== v) setTexto("presentacion", auto);
            }}
            style={{...SI,minHeight:120,resize:"vertical",lineHeight:1.6}}
          />
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Quiénes somos y qué garantiza la propuesta. Un párrafo por renglón.</div>
        </div>
        {/* Se quitaron de la pantalla el «párrafo adicional para este cliente»
            y el «marco técnico»: nadie los llenaba y alargaban el formulario.
            Los valores siguen existiendo y viajando al documento, así que las
            cotizaciones antiguas que sí los tengan se imprimen igual; lo que
            ya no se puede es escribirlos desde aquí. El marco técnico, al ir
            vacío, usa las definiciones automáticas según el tipo de propuesta,
            que es lo que se estaba usando en la práctica. */}
      </div>

      {/* 03 · Propuestas: todas abiertas, una debajo de otra, en el orden
          en que se imprimen. */}
      <div style={{...CD,marginBottom:14,border:"2px solid #142840"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
          <div style={{...ST,marginBottom:0,borderBottom:"none",paddingBottom:0}}>03 · Propuestas</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={agregarPropuesta} style={{...B("#f47c20"),fontSize:11,padding:"6px 14px"}}>+ Nueva</button>
            <button onClick={duplicarPropuesta} style={{...B("#dbeafe","#1e40af"),fontSize:11,padding:"6px 14px"}}>Duplicar</button>
          </div>
        </div>
        <div style={{fontSize:11,color:"#64748b",marginTop:8}}>
          Se imprimen en este mismo orden. Cada una lleva sus propios ítems, fotos, medición y condiciones.
        </div>
      </div>

      {propuestas.map((propuesta,idx)=>(
        <PropuestaEditor
          key={propuesta.id}
          propuesta={propuesta}
          indice={idx}
          total={propuestas.length}
          onChange={(patch)=>actualizarPropuesta(propuesta.id,patch)}
          onEliminar={()=>eliminarPropuesta(propuesta.id)}
          mapaHabilitado={propuestaActivaId===propuesta.id}
          onPedirMapa={()=>setPropuestaActivaId(propuesta.id)}
          cl={cl}
          setCl={setCl}
        />
      ))}

      {/* Cierre del documento, en el mismo orden en que sale impreso */}
      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>Cierre · Resumen, condiciones y próximos pasos</div>

        {/* Las «observaciones / condiciones adicionales» ya no se escriben
            desde aquí. El valor se conserva y se sigue imprimiendo en las
            cotizaciones que lo tengan. */}

        <div style={{marginBottom:14}}>
          <LBL>Sistema de gestión de seguridad y salud en el trabajo</LBL>
          <textarea
            value={textosDocumento.sst}
            onChange={e=>setTexto("sst",e.target.value)}
            onBlur={e=>{
              const auto = corregirOrtografiaLocal(e.target.value);
              if(auto !== e.target.value) setTexto("sst", auto);
            }}
            style={{...SI,minHeight:120,resize:"vertical",lineHeight:1.6}}
          />
        </div>

        <div style={{marginBottom:14}}>
          <LBL>Próximos pasos (uno por línea)</LBL>
          <textarea
            value={textosDocumento.proximosPasos}
            onChange={e=>setTexto("proximosPasos",e.target.value)}
            onBlur={e=>{
              const auto = corregirOrtografiaLocal(e.target.value);
              if(auto !== e.target.value) setTexto("proximosPasos", auto);
            }}
            style={{...SI,minHeight:90,resize:"vertical",lineHeight:1.6}}
          />
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Se imprimen numerados en el orden que los escribas.</div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
          <div><LBL>Contacto — teléfono</LBL><input value={textosDocumento.contactoTelefono} onChange={e=>setTexto("contactoTelefono",e.target.value)} style={SI}/></div>
          <div><LBL>Contacto — correo</LBL><input value={textosDocumento.contactoEmail} onChange={e=>setTexto("contactoEmail",e.target.value)} style={SI}/></div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><LBL>Firma — nombre</LBL><input value={textosDocumento.firmaNombre} onChange={e=>setTexto("firmaNombre",e.target.value)} style={SI}/></div>
          <div>
            <LBL>Firma — cargo</LBL>
            <input
              value={textosDocumento.firmaCargo}
              onChange={e=>setTexto("firmaCargo",e.target.value)}
              onBlur={e=>{
                const auto = corregirOrtografiaLocal(e.target.value);
                if(auto !== e.target.value) setTexto("firmaCargo", auto);
              }}
              style={SI}
            />
          </div>
        </div>
        <FirmaEmpresa/>

        {/* El codigo y la version de los formatos se configuran en
            Sistema > Formatos y versiones. Estaban aqui, pero valen para los
            tres documentos y no para la cotizacion sola. */}

        <div style={{marginTop:12}}>
          <LBL>Firma — datos adicionales (uno por línea)</LBL>
          <textarea
            value={textosDocumento.firmaDetalle}
            onChange={e=>setTexto("firmaDetalle",e.target.value)}
            onBlur={e=>{
              const auto = corregirOrtografiaLocal(e.target.value);
              if(auto !== e.target.value) setTexto("firmaDetalle", auto);
            }}
            style={{...SI,minHeight:60,resize:"vertical",lineHeight:1.6}}
          />
        </div>

        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:16,paddingTop:12,borderTop:"1px solid #f1f5f9"}}>
          <div style={{fontSize:10.5,color:"#94a3b8"}}>¿Cambiaste algún texto por error? Puedes volver al estándar de la empresa.</div>
          <button
            type="button"
            onClick={()=>setTextosDocumento(TEXTOS_DOCUMENTO_DEFAULT)}
            style={{...B("#f1f5f9","#475569"),fontSize:11,padding:"7px 14px"}}
          >
            Restaurar textos estándar
          </button>
        </div>
      </div>

      <div style={{...CD,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}>
          <button
            type="button"
            onClick={guardarCotizacionYSubir}
            style={{...B("#f47c20"),fontSize:11,padding:"7px 16px"}}
          >
            Guardar
          </button>
        </div>
      </div>

      </div>

      {verDocumento && (
        <DocumentoEnVivo
          cotizacion={cotizacionEnVivo}
          firmaImg={firmaImg}
          sello={selloCotizacion}
          alto={cabeEnDosColumnas ? "calc(100vh - 210px)" : "calc(100vh - 260px)"}
        />
      )}
      {enviarCot && <EnviarCotizacion cotizacion={enviarCot} firmaImg={firmaImg} onCerrar={()=>setEnviarCot(null)}/>}

      </div>
    </div>
  );
}

// ======================================================
// HELPERS
// ======================================================

