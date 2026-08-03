import Badge from "../../components/ui/Badge";
import CampoTexto from "../../components/ui/CampoTexto";
import { useAccionesPantalla } from "../../context/accionesPantalla";
import DictarCotizacion from "./DictarCotizacion";
import FirmaEmpresa from "../../components/FirmaEmpresa";
import DocumentoEnVivo from "./DocumentoEnVivo";
import EnviarCotizacion from "./EnviarCotizacion";
import PropuestaEditor from "./PropuestaEditor";
import { useMediaQuery } from "../../hooks/useMediaQuery";
import { TEXTOS_DOCUMENTO_DEFAULT, getTextosDocumento } from "../../lib/cotizacionTextos";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useEffect, useRef, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { DEFAULT_COT_FORMA_PAGO, DEFAULT_COT_INCLUYE_PUNTOS_ANCLAJE, DEFAULT_COT_TIEMPO_EJEC, ITEMS_DB } from "../../data/seed";
import { buildQuoteProposal, createQuoteProposalId, getQuoteActiveProposal, getQuoteApprovalAccountingSnapshot, getQuoteProposalLabel, getQuoteProposals, hasAnchorPointsService, normalizeProposalItems, normalizeQuoteItems } from "../../lib/cotizaciones";
import { scrollAppToTop, today } from "../../lib/format";
import { avisoCelular, avisoCorreo, normalizarCorreo, normalizarDocumento, normalizarFrase, normalizarNombrePropio, normalizarTelefono } from "../../lib/normalizarEntrada";
import { normalizeEntityKey, openCotizacionPrint } from "../../lib/cotizacionPrint";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import { asuntoAprobacion, mensajeAprobacion } from "../../lib/correoAprobacion";
import { enviarCotizacionPorCorreo } from "../../lib/backend/usuarios";
export default function Cotizacion({ctx}){
  const {cotizaciones,setCotizaciones,obras,setObras,empresaConfig}=ctx;
  const firmaImg=getFirmaImg(empresaConfig);
  const [tab,setTab]=useState("lista");
  const [previewCot,setPreviewCot]=useState(null);
  // Cotizacion que se esta por enviar al cliente.
  const [enviarCot,setEnviarCot]=useState(null);
  // Vista previa del documento junto al formulario, para revisar los textos
  // completos mientras se edita.
  const [verDocumento,setVerDocumento]=useState(false);
  const cabeEnDosColumnas=useMediaQuery("(min-width: 1250px)");
  const [busqueda,setBusqueda]=useState("");
  const [filtroObraCot,setFiltroObraCot]=useState("todas");
  // Aviso posterior a aprobar: explica que se creo y que sigue.
  const [obraCreada,setObraCreada]=useState(null);
  const [editCot,setEditCot]=useState(null);
  const [dictando,setDictando]=useState(false);
  const [cot,setCot]=useState("");
  const [fecha,setFecha]=useState(today());
  const [val,setVal]=useState(30);
  const [cl,setCl]=useState({nombre:"",nit:"",contacto:"",contactoEmail:"",obra:"",telefono:"",ciudad:"",coords:""});
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

  const actualizarPropuesta = (id,patch)=>{
    setPropuestas((prev)=>prev.map((propuesta)=>{
      if(propuesta.id!==id) return propuesta;
      const siguiente = {...propuesta,...patch};
      // Rellena el texto de "incluye" cuando la propuesta pasa a ser de
      // puntos de anclaje y aun no tiene texto propio.
      if(hasAnchorPointsService(siguiente) && !String(siguiente.incluyeTexto || "").trim()){
        siguiente.incluyeTexto = DEFAULT_COT_INCLUYE_PUNTOS_ANCLAJE;
      }
      return siguiente;
    }));
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
    setCl({nombre:source.cliente || "",nit:source.nit || "",contacto:source.contacto || "",contactoEmail:source.contactoEmail || "",obra:source.obra || "",telefono:source.telefono || "",ciudad:source.ciudad || "",coords:source.coords || ""});
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
    const data = {id:editCot || `COT-${String(cotizaciones.length+1).padStart(3,"0")}`,numero:cot,fecha,val,cliente:cl.nombre,nit:cl.nit,contacto:cl.contacto,contactoEmail:cl.contactoEmail,obra:cl.obra,telefono:cl.telefono,ciudad:cl.ciudad,coords:cl.coords,textoInicial:textoInicial.trim(),observaciones:observacionesCot.trim(),textosDocumento,items:activa.items,util:activa.util,total:activa.total,formaPago:activa.formaPago,tiempoEjec:activa.tiempoEjec,mapImg:activa.mapImg || null,geoMediciones:activa.geoMediciones || [],geoMapView:activa.geoMapView || null,tipoCotizacion:activa.tipoCotizacion,requerimientoCliente:activa.requerimientoCliente,incluyeTexto:activa.incluyeTexto || "",propuestaNombre:activa.nombre,propuestaAlcance:activa.alcance,propuestas:propuestasFinales,propuestaActivaId:activa.id,fotosCotizacion:activa.fotos||[],estado:prev?.estado || "Pendiente",obraId:prev?.obraId || null};
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

  useAccionesPantalla(
    tab==="form" ? (
      <button
        onClick={()=>guardarRef.current()}
        style={{
          background:"#f47c20", color:"#fff", border:"none", borderRadius:9,
          padding:"9px 18px", fontSize:13, fontWeight:700, cursor:"pointer",
          fontFamily:"inherit", whiteSpace:"nowrap",
        }}
      >
        {editCot ? "Actualizar" : "Guardar"}
      </button>
    ) : null,
    [tab, editCot]
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
    const obraId = `OB-${String(obras.length+1).padStart(3,"0")}`;
    setObras((prev)=>[...prev,{
      id:obraId,
      cliente:cotizacion.cliente,
      nit:cotizacion.nit || "",
      tel:cotizacion.telefono,
      proyecto:cotizacion.obra,
      ciudad:cotizacion.ciudad,
      direccion:"",
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

    enviarCotizacionPorCorreo({
      para: destino,
      asunto: asuntoAprobacion(cotizacion),
      mensaje: mensajeAprobacion(cotizacion,{obraId}),
      nombreArchivo: "",
      pdfBase64: "",
    })
      .then(()=>setObraCreada((prev)=>prev && {...prev,correo:"enviado",destino}))
      .catch((e)=>{
        console.error("No se pudo avisar al cliente de la aprobacion:",e);
        setObraCreada((prev)=>prev && {...prev,correo:"fallo",destino,motivo:e.message});
      });
  };

  const term = normalizeEntityKey(busqueda || "");
  const obrasFiltroCotizacion = Array.from(new Set(
    cotizaciones
      .map((cotizacion)=>String(cotizacion.obra || "").trim())
      .filter(Boolean)
  )).sort((a,b)=>a.localeCompare(b,"es"));
  const cotizacionesFiltradas = cotizaciones.filter((cotizacion)=>{
    if(filtroObraCot!=="todas" && String(cotizacion.obra || "").trim()!==filtroObraCot) return false;
    if(!term) return true;
    const activa = getQuoteActiveProposal(cotizacion);
    return [cotizacion.id,cotizacion.numero,cotizacion.cliente,cotizacion.obra,cotizacion.ciudad,activa.nombre].some((value)=>normalizeEntityKey(value || "").includes(term));
  });

  if(tab==="lista"){
    if(previewCot){
      return <div style={{padding:28}}><H1 title={`Cotización ${previewCot.numero || previewCot.id}`} subtitle="Vista completa del documento comercial" action={<div style={{display:"flex",gap:10}}><button style={B("#f1f5f9","#475569")} onClick={()=>setPreviewCot(null)}>Volver</button><button style={B("#dbeafe","#1e40af")} onClick={()=>{setEditCot(previewCot.id);hydrate(previewCot);setTab("form");setPreviewCot(null);}}>Editar</button><button style={B("#f1f5f9","#475569")} onClick={()=>openCotizacionPrint(previewCot,{firmaImg})}>Imprimir PDF</button><button style={B("#f47c20")} onClick={()=>setEnviarCot(previewCot)}>Enviar al cliente</button></div>}/><DocumentoEnVivo cotizacion={previewCot} firmaImg={firmaImg} alto="calc(100vh - 190px)" nota="Igual al PDF" sticky={false}/>{enviarCot && <EnviarCotizacion cotizacion={enviarCot} firmaImg={firmaImg} onCerrar={()=>setEnviarCot(null)}/>}</div>;
    }
    return (
      <div style={{padding:28}}>
        <H1 title="Cotizaciones" subtitle="Ubicación, medición y propuestas comerciales por cliente" action={<button style={B("#f47c20")} onClick={nuevaCotizacion}>+ Nueva Cotización</button>}/>

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
                    Avisando al cliente por correo…
                  </div>
                )}
                {obraCreada.correo==="enviado" && (
                  <div style={{fontSize:12,color:"#166534",marginTop:8}}>
                    Se le confirmó por correo a <strong>{obraCreada.destino}</strong>.
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
        <div style={{...CD,marginBottom:18,padding:"18px 22px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <div style={{minWidth:240}}>
              <div style={{fontSize:13,letterSpacing:2,textTransform:"uppercase",color:"#cc0000",fontWeight:800}}>Historial de cotizaciones</div>
              <div style={{width:210,height:1,background:"#dbe4f0",marginTop:14}}/>
              <div style={{fontSize:12,color:"#64748b",marginTop:12}}>{cotizacionesFiltradas.length} registro(s) visibles</div>
            </div>
            <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
              <input
                value={busqueda}
                onChange={(e)=>setBusqueda(e.target.value)}
                placeholder="Buscar cliente, obra o número"
                style={{...SI,width:300,minHeight:44,padding:"10px 14px"}}
              />
              <select
                value={filtroObraCot}
                onChange={(e)=>setFiltroObraCot(e.target.value)}
                style={{...SI,width:260,minHeight:44,padding:"10px 14px"}}
              >
                <option value="todas">Todas las obras</option>
                {obrasFiltroCotizacion.map((obra)=><option key={obra} value={obra}>{obra}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div style={{...CD,padding:0,overflow:"hidden"}}>
          <div style={{padding:"18px 18px 10px 18px",borderBottom:"1px solid #e2e8f0",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:12,letterSpacing:1.2,textTransform:"uppercase",color:"#b91c1c",fontWeight:800}}>Listado de cotizaciones</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:4}}>Vista ejecutiva compacta por cliente, obra y propuesta activa</div>
            </div>
            <div style={{fontSize:12,color:"#64748b"}}>{cotizacionesFiltradas.length} registro(s)</div>
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"separate",borderSpacing:0,minWidth:760}}>
              <thead>
                <tr style={{background:"#f8fafc"}}>
                  {[
                    "Número",
                    "Cliente",
                    "Estado",
                    "Acciones",
                  ].map((label)=>(
                    <th key={label} style={{textAlign:"left",padding:"10px 12px",fontSize:10,color:"#64748b",fontWeight:800,borderBottom:"1px solid #e2e8f0",whiteSpace:"nowrap",letterSpacing:0.3}}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cotizacionesFiltradas.map((cotizacion)=>{
                  return (
                    <tr key={cotizacion.id} style={{background:"#fff"}}>
                      <td style={{padding:"11px 12px",borderBottom:"1px solid #e2e8f0",verticalAlign:"top"}}>
                        <div style={{fontWeight:800,color:"#2563eb",fontSize:11}}>{cotizacion.numero || cotizacion.id}</div>
                        <div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>{cotizacion.id}</div>
                      </td>
                      <td style={{padding:"11px 12px",borderBottom:"1px solid #e2e8f0",verticalAlign:"top"}}>
                        <div style={{fontWeight:700,color:"#0f172a",fontSize:11}}>{cotizacion.cliente}</div>
                        {cotizacion.ciudad ? <div style={{fontSize:10,color:"#64748b",marginTop:3}}>{cotizacion.ciudad}</div> : null}
                      </td>
                      <td style={{padding:"11px 12px",borderBottom:"1px solid #e2e8f0",verticalAlign:"top"}}>
                        <Badge estado={cotizacion.estado}/>
                      </td>
                      <td style={{padding:"11px 12px",borderBottom:"1px solid #e2e8f0",verticalAlign:"top",minWidth:260}}>
                        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                          <button style={{...B("#dbeafe","#1e40af"),fontSize:10,padding:"5px 10px"}} onClick={()=>setPreviewCot(cotizacion)}>Ver</button>
                          <button style={{...B("#1a3050","#f5c842"),fontSize:10,padding:"5px 10px"}} onClick={()=>{setEditCot(cotizacion.id);hydrate(cotizacion);setTab("form");}}>Editar</button>
                          {cotizacion.estado!=="Aprobada" && <button style={{...B("#0f2d1a","#4ade80"),border:"1px solid #166534",fontSize:10,padding:"5px 10px"}} onClick={()=>aprobarCotizacion(cotizacion.id)}>Aprobar y crear obra</button>}
                          <button style={{...B("#2d1414","#ef4444"),fontSize:10,padding:"5px 10px"}} onClick={()=>openCotizacionPrint(cotizacion,{firmaImg})}>PDF</button><button style={{...B("#f47c20"),fontSize:10,padding:"5px 10px"}} onClick={()=>setEnviarCot(cotizacion)}>Enviar al cliente</button>
                          <button
                            style={{...B("#fff","#ef4444"),border:"1.5px solid #ef4444",fontSize:10,padding:"5px 10px"}}
                            onClick={()=>{
                              if(!window.confirm(`¿Eliminar la cotización "${cotizacion.numero || cotizacion.id}" de ${cotizacion.cliente || "este cliente"}? Esta acción no se puede deshacer.`)) return;
                              setCotizaciones((prev)=>prev.filter((c)=>c.id!==cotizacion.id));
                            }}
                          >🗑 Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!cotizacionesFiltradas.length && (
                  <tr>
                    <td colSpan={9} style={{padding:"28px 16px",textAlign:"center",color:"#64748b"}}>No hay cotizaciones para mostrar con este filtro.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* La lista tiene su propio return, aparte del formulario. Sin montar
            aqui el dialogo, el boton de enviar guardaba el estado y no pasaba
            nada visible. */}
        {enviarCot && <EnviarCotizacion cotizacion={enviarCot} firmaImg={firmaImg} onCerrar={()=>setEnviarCot(null)}/>}
      </div>
    );
  }

  return (
    <div style={{padding:28}}>
      <H1
        title={editCot?"Editar Cotización":"Nueva Cotización"}
        subtitle="Construye propuestas comerciales para una misma obra"
        action={
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button style={B("#f1f5f9","#475569")} onClick={()=>setTab("lista")}>Volver a lista</button>
            <button
              style={verDocumento ? B("#111827") : B("#f1f5f9","#475569")}
              onClick={()=>setVerDocumento(v=>!v)}
              title="Muestra el documento completo tal como se imprimirá, mientras editas"
            >
              {verDocumento ? "Ocultar documento" : "Ver documento"}
            </button>
            <button style={{...B("#dbeafe","#1e40af"),justifyContent:"center"}} onClick={()=>{const saved=guardarCotizacion();if(saved){setPreviewCot(saved);setTab("lista");}}}>Guardar y ver</button>
          </div>
        }
      />

      <div style={{
        display:"grid",
        // En pantallas anchas el documento va al lado; en angostas, el boton
        // alterna entre formulario y documento para no apilar dos cosas largas.
        gridTemplateColumns: verDocumento && cabeEnDosColumnas ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)",
        gap:18,
        alignItems:"start",
      }}>
      <div style={{minWidth:0, display: verDocumento && !cabeEnDosColumnas ? "none" : "block"}}>

      {/* Armar hablando: rellena el formulario a partir de un dictado. */}
      {dictando
        ? <DictarCotizacion onAplicar={aplicarDictado} onCerrar={()=>setDictando(false)}/>
        : (
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
            <button onClick={()=>setDictando(true)} style={{...B("#dbeafe","#1e40af"),fontSize:12.5}}>
              🎤 Armar esta cotización hablando
            </button>
          </div>
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
          <CampoTexto label="Empresa" valor={cl.nombre} onChange={v=>setCl({...cl,nombre:v})}
            normalizar={normalizarNombrePropio} autoCapitalize="words"
            ayuda="Va en la portada del documento que ve el cliente."/>
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
            normalizar={normalizarFrase}/>
          <CampoTexto label="Teléfono" valor={cl.telefono} onChange={v=>setCl({...cl,telefono:v})}
            normalizar={normalizarTelefono} revisar={avisoCelular} inputMode="tel" spellCheck={false}/>
          <CampoTexto label="Ciudad" valor={cl.ciudad} onChange={v=>setCl({...cl,ciudad:v})}
            normalizar={normalizarNombrePropio} autoCapitalize="words"/>
        </div>
      </div>

      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>01 · Carta de presentación</div>
        <div style={{marginBottom:14}}>
          <LBL>Frase de apertura</LBL>
          <textarea
            value={textosDocumento.saludo}
            onChange={e=>setTexto("saludo",e.target.value)}
            style={{...SI,minHeight:60,resize:"vertical",lineHeight:1.6}}
          />
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Se imprime después de &quot;Cordial saludo, [cliente]&quot;. Si la obra tiene nombre, se agrega al final. No hace falta el punto final.</div>
        </div>
        <div style={{marginBottom:14}}>
          <LBL>Presentación de la empresa</LBL>
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

        <div style={{marginBottom:14}}>
          <LBL>Observaciones / condiciones adicionales</LBL>
          <textarea
            value={observacionesCot}
            onChange={e=>setObservacionesCot(e.target.value)}
            placeholder="Ej: El pago se realiza contra entrega de acta parcial. Incluye transporte de materiales..."
            style={{...SI,minHeight:80,resize:"vertical",lineHeight:1.6}}
          />
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Aparece junto a las condiciones comerciales del documento.</div>
        </div>

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

