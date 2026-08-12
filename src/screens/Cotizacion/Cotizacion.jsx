import Badge from "../../components/ui/Badge";
import BuscadorCliente from "../../components/BuscadorCliente";
import CampoTexto from "../../components/ui/CampoTexto";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import DictarCotizacion from "./DictarCotizacion";
import FirmaEmpresa from "../../components/FirmaEmpresa";
import DocumentoEnVivo from "./DocumentoEnVivo";
import ListaCotizaciones from "./ListaCotizaciones";
import EnviarCotizacion from "./EnviarCotizacion";
import PropuestaEditor from "./PropuestaEditor";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { TEXTOS_DOCUMENTO_DEFAULT, getTextosDocumento, lineasDeTexto } from "../../lib/cotizacionTextos";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import BotonCorregir from "../../components/ui/BotonCorregir";
import { useEffect, useRef, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { DEFAULT_COT_FORMA_PAGO, DEFAULT_COT_TIEMPO_EJEC, ITEMS_DB } from "../../data/seed";
import { buildQuoteProposal, createQuoteProposalId, getQuoteApprovalAccountingSnapshot, getQuoteProposalLabel, getQuoteProposals, normalizeProposalItems, normalizeQuoteItems } from "../../lib/cotizaciones";
import { scrollAppToTop, today } from "../../lib/format";
import { avisoCelular, avisoCorreo, normalizarCorreo, normalizarDocumento, normalizarMayusculas, normalizarNombrePropio, normalizarRazonSocial, normalizarTelefono } from "../../lib/normalizarEntrada";
import { downloadGeneratedFile } from "../../lib/download";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import { asuntoAprobacion, mensajeAprobacion } from "../../lib/correoAprobacion";
import { blobABase64, generarCotizacionPdf } from "../../lib/cotizacionPdf";
import { enviarCotizacionPorCorreo } from "../../lib/backend/usuarios";
import { siguienteIdUnico } from "../../lib/identificadores";
export default function Cotizacion({ctx}){
  const {cotizaciones,setCotizaciones,obras,setObras,clientes,empresaConfig}=ctx;
  const firmaImg=getFirmaImg(empresaConfig);
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
      nombre: prev.nombre || propuesta.cliente || "",
      contacto: prev.contacto || propuesta.contacto || "",
      ciudad: prev.ciudad || propuesta.ciudad || "",
      obra: prev.obra || propuesta.obra || "",
      telefono: prev.telefono || propuesta.telefono || "",
    }));

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
    coords: cl.coords,
    textoInicial: textoInicial.trim(),
    observaciones: observacionesCot.trim(),
    textosDocumento,
    items: propuestaActiva?.items,
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
      if(propuesta.id!==activeId) return buildQuoteProposal({...propuesta,items:normalizeProposalItems(propuesta.items)},0);
      return buildQuoteProposal({
        ...propuesta,
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
    hydrate({numero:getNextCotizacionNumero(cotizaciones),fecha:today(),val:30,cliente:"",obra:"",telefono:"",ciudad:"",coords:"",geoMediciones:[],geoMapView:null,fotosCotizacion:[],propuestas:[buildQuoteProposal({id:createQuoteProposalId("new"),nombre:getQuoteProposalLabel(0),formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,util:10,items:[],geoMediciones:[],geoMapView:null,mapImg:null,medicionAutomatica:false,incluyeTexto:""},0)]});
    setTab("form");
  };

  const persistCotizacion = ({volverALista=true}={})=>{
    // Cada propuesta se normaliza y recalcula con SUS propios items.
    const propuestasFinales = propuestasSnapshot.map((propuesta,index)=>{
      const finalItems = normalizeQuoteItems({items:propuesta.items,geoMediciones:propuesta.geoMediciones,propuestas:propuestasSnapshot});
      const subtotal = finalItems.reduce((sum,item)=>sum + (Number(item.cant)||0)*(Number(item.vu)||0),0);
      const utilidad = subtotal * (Number(propuesta.util || 10) / 100);
      const total = Math.round(subtotal + utilidad + utilidad * 0.19);
      return buildQuoteProposal({...propuesta,items:finalItems,total},index);
    });
    const activa = propuestasFinales.find((x)=>x.id===propuestaActivaId) || propuestasFinales[0];
    const prev = editCot ? cotizaciones.find((cotizacion)=>cotizacion.id===editCot) : null;
    const data = {id:editCot || siguienteIdUnico(cotizaciones,"COT"),numero:cot,fecha,val,cliente:normalizarRazonSocial(cl.nombre),nit:cl.nit,contacto:cl.contacto,contactoEmail:cl.contactoEmail,obra:normalizarMayusculas(cl.obra),telefono:cl.telefono,ciudad:normalizarMayusculas(cl.ciudad),direccion:normalizarMayusculas(cl.direccion),coords:cl.coords,textoInicial:textoInicial.trim(),observaciones:observacionesCot.trim(),textosDocumento,items:activa.items,util:activa.util,total:activa.total,formaPago:activa.formaPago,tiempoEjec:activa.tiempoEjec,mapImg:activa.mapImg || null,geoMediciones:activa.geoMediciones || [],geoMapView:activa.geoMapView || null,tipoCotizacion:activa.tipoCotizacion,requerimientoCliente:activa.requerimientoCliente,incluyeTexto:activa.incluyeTexto || "",propuestaNombre:activa.nombre,propuestaAlcance:activa.alcance,propuestas:propuestasFinales,propuestaActivaId:activa.id,fotosCotizacion:activa.fotos||[],estado:prev?.estado || "Pendiente",obraId:prev?.obraId || null};
    setCotizaciones((prevList)=>editCot ? prevList.map((cotizacion)=>cotizacion.id===editCot?{...cotizacion,...data}:cotizacion) : [...prevList,data]);
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
    borderRadius:9, padding:"8px 14px", fontSize:12.5, fontWeight:600,
    cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap", lineHeight:1.2,
    display:"inline-flex", alignItems:"center", gap:6,
  };
  const SECUNDARIO = { ...BOTON_BASE, background:"#f1f5f9", color:"#475569", border:"1px solid #e2e8f0" };

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
      const {blob,nombre} = await generarCotizacionPdf(cotizacion,{firmaImg});
      downloadGeneratedFile(new File([blob],nombre,{type:"application/pdf"}));
    }catch(e){
      console.error("No se pudo generar el PDF de la cotizacion:",e);
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
      <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
        <button style={SECUNDARIO} onClick={()=>setTab("lista")}
          title="Volver al listado de cotizaciones">← Lista</button>

        {!dictando && (
          <button style={SECUNDARIO} onClick={()=>setDictando(true)}
            title="Armar la cotización hablando">🎤 Dictar</button>
        )}

        <button
          style={verDocumento
            ? { ...BOTON_BASE, background:"#111827", color:"#fff", border:"1px solid #111827" }
            : SECUNDARIO}
          onClick={()=>setVerDocumento(v=>!v)}
          title="Muestra el documento completo tal como se imprimirá, mientras editas">
          {verDocumento ? "Ocultar documento" : "Ver documento"}
        </button>

        {/* Se quito "Guardar y ver": hacia casi lo mismo que Guardar y dos
            botones naranjas seguidos se confundian. Para ver el documento
            estan "Ver documento" aqui al lado y el boton Ver del listado. */}
        <button
          style={{...BOTON_BASE, background:"#f47c20", color:"#fff", border:"1px solid #f47c20", fontWeight:700, padding:"8px 18px"}}
          onClick={()=>guardarRef.current()}>Guardar</button>
      </div>
    ) : null,
    [tab, dictando, verDocumento]
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
    const obraId = siguienteIdUnico(obras,"OB");
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
        const {blob, nombre} = await generarCotizacionPdf(cotizacion,{firmaImg});
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

  // Deshacer una aprobacion. Se aprueba de un clic y hasta ahora no habia
  // vuelta atras: si se aprobaba la cotizacion equivocada, quedaba una obra de
  // mas y una cotizacion marcada como aprobada para siempre.
  //
  // La obra NO se borra sin preguntar. Puede llevar dias de avance, fotos,
  // personal y pagos encima, y eso no se puede rehacer. Solo se ofrece borrarla
  // cuando esta como recien creada.
  const desaprobarCotizacion = (cotId)=>{
    const cotizacion = cotizaciones.find((c)=>c.id===cotId);
    if(!cotizacion) return;

    const obra = obras.find((o)=>o.id===cotizacion.obraId);
    const conTrabajo = obra && (
      Number(obra.avance||0) > 0 ||
      Number(obra.pagado||0) > 0 ||
      Number(obra.costos||0) > 0 ||
      (Array.isArray(obra.bitacora) && obra.bitacora.length > 0) ||
      (Array.isArray(obra.empleados) && obra.empleados.length > 0) ||
      (Array.isArray(obra.trazos) && obra.trazos.length > 0) ||
      (Array.isArray(obra.anclajes) && obra.anclajes.length > 0)
    );

    let borrarObra = false;
    if(!obra){
      if(!window.confirm(
        `¿Devolver la cotización ${cotizacion.numero || cotizacion.id} a "Pendiente"?`
      )) return;
    }else if(conTrabajo){
      if(!window.confirm(
        `La cotización ${cotizacion.numero || cotizacion.id} vuelve a "Pendiente".\n\n` +
        `La obra ${obra.id} (${obra.proyecto || obra.cliente}) SE CONSERVA: ya tiene ` +
        `trabajo registrado —avance, fotos, personal o pagos— y borrarla haría perder todo eso.\n\n` +
        "Queda suelta, sin cotización asociada. Si de verdad sobra, bórrala desde Ejecución de obra.\n\n¿Continuar?"
      )) return;
    }else{
      borrarObra = window.confirm(
        `La cotización ${cotizacion.numero || cotizacion.id} vuelve a "Pendiente".\n\n` +
        `La obra ${obra.id} (${obra.proyecto || obra.cliente}) está sin empezar: 0% de avance, ` +
        "sin fotos, sin personal y sin pagos.\n\n" +
        "Aceptar → se borra también la obra.\nCancelar → la obra se conserva sin cotización asociada."
      );
    }

    setCotizaciones((prev)=>prev.map((c)=>(
      c.id===cotId ? {...c, estado:"Pendiente", obraId:null} : c
    )));
    if(borrarObra && obra){
      setObras((prev)=>prev.filter((o)=>o.id!==obra.id));
    }
    setObraCreada(null);
  };


  if(tab==="lista"){
    if(previewCot){
      return <div style={{padding:28}}><H1 title={`Cotización ${previewCot.numero || previewCot.id}`} subtitle="Vista completa del documento comercial" action={<div style={{display:"flex",gap:10}}><button style={B("#f1f5f9","#475569")} onClick={()=>setPreviewCot(null)}>Volver</button><button style={B("#dbeafe","#1e40af")} onClick={()=>{setEditCot(previewCot.id);hydrate(previewCot);setTab("form");setPreviewCot(null);}}>Editar</button><button style={B("#f1f5f9","#475569")} disabled={Boolean(bajandoPdf)} onClick={()=>descargarPdf(previewCot)}>{bajandoPdf?"Generando…":"Descargar PDF"}</button><button style={B("#f47c20")} onClick={()=>setEnviarCot(previewCot)}>Enviar al cliente</button></div>}/><DocumentoEnVivo cotizacion={previewCot} firmaImg={firmaImg} alto="calc(100vh - 190px)" nota="Igual al PDF" sticky={false}/>{enviarCot && <EnviarCotizacion cotizacion={enviarCot} firmaImg={firmaImg} onCerrar={()=>setEnviarCot(null)}/>}</div>;
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
            ver: (c)=>setPreviewCot(c),
            editar: (c)=>{setEditCot(c.id);hydrate(c);setTab("form");},
            aprobar: (c)=>aprobarCotizacion(c.id),
            desaprobar: (c)=>desaprobarCotizacion(c.id),
            pdf: (c)=>descargarPdf(c),
            enviar: (c)=>setEnviarCot(c),
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
      <div style={{fontSize:12,color:"#64748b",marginBottom:12}}>
        {editCot
          ? <>Editando <strong style={{color:"#101828"}}>{cot || editCot}</strong>{cl.nombre ? ` · ${cl.nombre}` : ""}</>
          : <>Cotización nueva{cot ? <> · <strong style={{color:"#101828"}}>{cot}</strong></> : null}</>}
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
            label="Empresa"
            valor={cl.nombre}
            clientes={clientesConocidos}
            onEscribir={(v)=>setCl((prev)=>({...prev,nombre:v}))}
            onElegir={(c)=>setCl((prev)=>({
              ...prev,
              nombre:c.nombre,
              nit:c.nit || prev.nit,
              contacto:c.contacto || prev.contacto,
              contactoEmail:c.contactoEmail || prev.contactoEmail,
              telefono:c.telefono || prev.telefono,
              ciudad:c.ciudad || prev.ciudad,
              direccion:c.direccion || prev.direccion,
            }))}
            ayuda={clientesConocidos.length
              ? `Escribe dos letras y elige: se traen NIT, contacto, correo, teléfono, ciudad y dirección. Hay ${clientesConocidos.length} clientes.`
              : "Va en la portada del documento, en mayúscula."}
          />
          <CampoTexto label="NIT / Cédula" valor={cl.nit} onChange={v=>setCl({...cl,nit:v})}
            normalizar={normalizarDocumento} placeholder="900123456-7" spellCheck={false}
            ayuda="Viaja hasta el comprobante contable al aprobar la cotización."/>
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
          <CampoTexto label="Ciudad" valor={cl.ciudad} onChange={v=>setCl({...cl,ciudad:v})}
            normalizar={normalizarMayusculas} autoCapitalize="characters"/>
          <CampoTexto label="Dirección de la obra" valor={cl.direccion} onChange={v=>setCl({...cl,direccion:v})}
            normalizar={normalizarMayusculas} autoCapitalize="characters"
            ayuda="Viaja a la ficha del cliente y a la obra cuando se apruebe."/>
        </div>
      </div>

      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>01 · Carta de presentación</div>
        {/* Va primero porque es lo primero que se ve del documento. */}
        <div style={{marginBottom:14}}>
          <LBL>Título de la portada</LBL>
          {/* De una sola linea, centrado y en mayuscula: igual que sale
              impreso. Era un campo de varios renglones y cada uno salia como
              una linea aparte del titulo; ahora va seguido y es la hoja la
              que lo parte donde toque, que es lo que lo deja bien centrado.
              Lo guardado con saltos -las cotizaciones de antes- se muestra
              unido con un espacio. */}
          <input
            value={lineasDeTexto(textosDocumento.tituloPortada).join(" ")}
            onChange={e=>setTexto("tituloPortada",e.target.value.replace(/\s+/g," "))}
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
            style={{...SI,minHeight:60,resize:"vertical",lineHeight:1.6}}
          />
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Se imprime después de &quot;Cordial saludo, [cliente]&quot;. Si la obra tiene nombre, se agrega al final. No hace falta el punto final.</div>
        </div>
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><LBL>Presentación de la empresa</LBL><BotonCorregir valor={textosDocumento.presentacion} onChange={(v)=>setTexto("presentacion",v)} compacto/></div>
          <textarea
            value={textosDocumento.presentacion}
            onChange={e=>setTexto("presentacion",e.target.value)}
            style={{...SI,minHeight:150,resize:"vertical",lineHeight:1.6}}
          />
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Quiénes somos y qué garantiza la propuesta. Separa los párrafos con una línea en blanco.</div>
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
            style={{...SI,minHeight:120,resize:"vertical",lineHeight:1.6}}
          />
        </div>

        <div style={{marginBottom:14}}>
          <LBL>Próximos pasos (uno por línea)</LBL>
          <textarea
            value={textosDocumento.proximosPasos}
            onChange={e=>setTexto("proximosPasos",e.target.value)}
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
          <div><LBL>Firma — cargo</LBL><input value={textosDocumento.firmaCargo} onChange={e=>setTexto("firmaCargo",e.target.value)} style={SI}/></div>
        </div>
        <FirmaEmpresa/>
        <div style={{marginTop:12}}>
          <LBL>Firma — datos adicionales (uno por línea)</LBL>
          <textarea
            value={textosDocumento.firmaDetalle}
            onChange={e=>setTexto("firmaDetalle",e.target.value)}
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

