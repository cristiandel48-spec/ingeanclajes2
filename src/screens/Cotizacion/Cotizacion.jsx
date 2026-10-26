import Badge from "../../components/ui/Badge";
import BuscadorCliente from "../../components/BuscadorCliente";
import CampoTexto from "../../components/ui/CampoTexto";
import { useAccionesPantalla, useTituloPantalla } from "../../context/accionesPantalla";
import DictarCotizacion from "./DictarCotizacion";
import ImportarCotizacion from "./ImportarCotizacion";
import DocumentoEnVivo from "./DocumentoEnVivo";
import ListaCotizaciones from "./ListaCotizaciones";
import EnviarCotizacion from "./EnviarCotizacion";
import PropuestaEditor from "./PropuestaEditor";
import SelectorCiudadColombia from "../../components/SelectorCiudadColombia";
import { useMediaQuery, useIsMobile } from "../../hooks/useMediaQuery";
import { useSubirAlFormulario } from "../../hooks/useSubirAlFormulario";
import { TEXTOS_DOCUMENTO_DEFAULT, getTextosDocumento } from "../../lib/cotizacionTextos";
import LBL from "../../components/ui/LBL";
import { Button } from "../../components/ui";
import BotonCorregir from "../../components/ui/BotonCorregir";
import { corregirOrtografiaLocal } from "../../lib/correctorTexto";
import { useEffect, useRef, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { DEFAULT_COT_FORMA_PAGO, DEFAULT_COT_TIEMPO_EJEC } from "../../data/seed";
import { buildQuoteProposal, coincideTextoPlantilla, createQuoteProposalId, esPresentacionEstandarDeSistema, esSaludoEstandarDeSistema, esTituloEstandarDeSistema, fotosParaTipo, getQuoteApprovalAccountingSnapshot, getQuoteProposalLabel, getQuoteProposals, getTipoCotizacionLabel, inferirTipoDesdeTitulo, normalizeProposalItems, normalizeQuoteItems, porcentajeUtilidad, presentacionSugeridaParaTipo, saludoSugeridoParaTipo, tipoCotizacionCanonico, tituloSugeridoParaTipo } from "../../lib/cotizaciones";
import { fmt, scrollAppToTop, today } from "../../lib/format";
import { avisoCelular, avisoCorreo, normalizarCorreo, normalizarDocumento, normalizarMayusculas, normalizarNombrePropio, normalizarRazonSocial, normalizarTelefono, normalizarTituloFormal } from "../../lib/normalizarEntrada";
import { quienRecibeDeCliente } from "../../lib/quienRecibe";
import { downloadGeneratedFile } from "../../lib/download";
import { getFirmaImg } from "../../lib/firmaEmpresa";
import { selloDe } from "../../lib/controlDocumental";
import { asuntoAprobacion, mensajeAprobacion } from "../../lib/correoAprobacion";
import { blobABase64, generarCotizacionPdf } from "../../lib/cotizacionPdf";
import { enviarCotizacionPorCorreo } from "../../lib/backend/usuarios";
import { siguienteIdUnico } from "../../lib/identificadores";
import { resolverAutorGuardado, normalizarNombrePersona } from "../../lib/autorAuditoria";
import { confirmar } from "../../lib/dialogos";
export default function Cotizacion({ctx}){
  const {cotizaciones,setCotizaciones,obras,setObras,clientes,setClientes,empresaConfig,asegurarDetalle,cotDraft,setCotDraft,intencion,limpiarIntencion}=ctx;
  const [erroresCliente, setErroresCliente] = useState({});
  const firmaImg=getFirmaImg(empresaConfig);
  // Codigo y version del formato de cotizacion. Null si no esta configurado,
  // y entonces el documento sale como antes.
  const selloCotizacion=selloDe(empresaConfig,"cotizacion");
  const [tab,setTab]=useState("lista");
  const [previewCot,setPreviewCot]=useState(null);
  const [previewExpandido,setPreviewExpandido]=useState(false);
  const [modoPreview, setModoPreview]=useState("auto");
  const [escalaPreview, setEscalaPreview]=useState(1);
  // Cotizacion que se esta por enviar al cliente.
  const [enviarCot,setEnviarCot]=useState(null);
  // Vista previa del documento junto al formulario, para revisar los textos
  // completos mientras se edita.
  const [verDocumento,setVerDocumento]=useState(false);
  const cabeEnDosColumnas=useMediaQuery("(min-width: 1250px)");
  const isMobile = useIsMobile();
  // Aviso posterior a aprobar: explica que se creo y que sigue.
  const [obraCreada,setObraCreada]=useState(null);
  const [editCot,setEditCot]=useState(null);
  const [dictando,setDictando]=useState(false);
  const [importando,setImportando]=useState(false);
  const [cot,setCot]=useState("");

  // Si al guardar esta cotizacion choco con un numero que otra persona ya
  // habia usado, se guardo con el siguiente libre. El formulario abierto se
  // pasa al numero nuevo: si siguiera con el viejo, el proximo guardado
  // crearia otra copia.
  const editCotRef=useRef(editCot);
  useEffect(()=>{ editCotRef.current=editCot; },[editCot]);
  useEffect(()=>{
    const alReasignar=(ev)=>{
      for(const c of ev.detail||[]){
        if(c.entity!=="cotizaciones" || editCotRef.current!==c.viejo) continue;
        editCotRef.current=c.nuevo;
        setEditCot(c.nuevo);
        if(c.campos?.numero) setCot(c.campos.numero);
      }
    };
    window.addEventListener("ids-reasignados",alReasignar);
    return ()=>window.removeEventListener("ids-reasignados",alReasignar);
  },[]);
  const [fecha,setFecha]=useState(today());
  const [val,setVal]=useState(30);
  const [cl,setCl]=useState({nombre:"",nit:"",contacto:"",contactoEmail:"",obra:"",telefono:"",ciudad:"",direccion:"",coords:""});
  const [textoInicial,setTextoInicial]=useState("");
  const [observacionesCot,setObservacionesCot]=useState("");
  // Textos fijos del documento, editables por cotizacion.
  const [textosDocumento,setTextosDocumento]=useState(()=>({...TEXTOS_DOCUMENTO_DEFAULT,saludo:saludoSugeridoParaTipo("puntos_anclaje")||TEXTOS_DOCUMENTO_DEFAULT.saludo}));
  const setTexto=(clave,valor)=>setTextosDocumento(prev=>({...prev,[clave]:valor}));
  const [propuestas,setPropuestas]=useState(()=>[buildQuoteProposal({id:createQuoteProposalId("new"),nombre:getQuoteProposalLabel(0),tipoCotizacion:inferirTipoDesdeTitulo(TEXTOS_DOCUMENTO_DEFAULT.tituloPortada)||"puntos_anclaje",formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,util:10,items:[],incluyeTexto:""},0)]);
  const [avisoCambioSistema, setAvisoCambioSistema] = useState(null);
  const [escribiendoTitulo, setEscribiendoTitulo] = useState(false);
  const debounceTituloRef = useRef(null);
  const propuestasRef = useRef(propuestas);
  useEffect(() => { propuestasRef.current = propuestas; }, [propuestas]);
  const tituloInicialRef = useRef(TEXTOS_DOCUMENTO_DEFAULT.tituloPortada);
  const tituloCambiadoTipoRef = useRef(false);
  const tipoRechazadoRef = useRef("");
  useEffect(() => () => { if (debounceTituloRef.current) clearTimeout(debounceTituloRef.current); }, []);
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
  // Actualiza título de portada, frase de apertura y presentación según el sistema,
  // respetando siempre cualquier texto que la persona ya haya redactado a mano.
  const aplicarTextosDelSistema = (canon, { actualizarTitulo = true, forzarTitulo = false } = {}) => {
    const tituloSug = tituloSugeridoParaTipo(canon);
    const saludoSug = saludoSugeridoParaTipo(canon);
    const presentacionSug = presentacionSugeridaParaTipo(canon);
    setTextosDocumento((prev) => {
      const siguiente = { ...prev };
      if (actualizarTitulo && tituloSug && (forzarTitulo || esTituloEstandarDeSistema(prev.tituloPortada))) {
        siguiente.tituloPortada = tituloSug;
      }
      if (saludoSug && esSaludoEstandarDeSistema(prev.saludo)) {
        siguiente.saludo = saludoSug;
      }
      if (presentacionSug && esPresentacionEstandarDeSistema(prev.presentacion)) {
        siguiente.presentacion = presentacionSug;
      }
      return siguiente;
    });
  };

  const actualizarPropuesta = (id,patch)=>{
    if (patch && Object.prototype.hasOwnProperty.call(patch, "tipoCotizacion")) {
      if (debounceTituloRef.current) clearTimeout(debounceTituloRef.current);
      setAvisoCambioSistema(null);
      if (propuestas[0]?.id === id || propuestas.length === 1) {
        aplicarTextosDelSistema(tipoCotizacionCanonico(patch.tipoCotizacion));
      }
    }
    setPropuestas((prev)=>prev.map((propuesta)=>(
      propuesta.id===id ? {...propuesta,...patch} : propuesta
    )));
  };

  // Vuelca en el formulario lo que la IA entendio del dictado.
  //
  // Solo rellena lo que este VACIO: si la persona ya escribio el cliente a
  // mano, ese dato manda sobre lo que oyo el microfono. Los items se agregan
  // a los que ya haya, no los reemplazan.
  const OPCIONES_SISTEMA_RAPIDO = [
    { id: "puntos_anclaje", label: "Puntos de anclaje" },
    { id: "linea_vida", label: "Línea de vida" },
    { id: "linea_vida_camionera", label: "Línea camionera" },
    { id: "escaleras", label: "Escaleras" },
    { id: "caminaderos", label: "Caminaderos" },
    { id: "estructuras_metalicas", label: "Estructuras metálicas" },
    { id: "obra_blanca", label: "Obra blanca" },
    { id: "sistemas_completos", label: "Sistemas completos" },
    { id: "servicios", label: "Servicios / Recertificación" },
    { id: "manual", label: "Ninguno (manual)" },
  ];

  // Elegir sistema desde los botones junto al título (o aplicar sugerencia):
  // cambia la propuesta y, si el título sigue siendo uno estándar de sistema,
  // pone también el título de portada correspondiente.
  const elegirSistemaRapido = (nuevoTipo, { actualizarTitulo = true, rechazarTipoAuto = "" } = {}) => {
    if (debounceTituloRef.current) clearTimeout(debounceTituloRef.current);
    setEscribiendoTitulo(false);
    setAvisoCambioSistema(null);
    tipoRechazadoRef.current = rechazarTipoAuto || "";
    const canon = tipoCotizacionCanonico(nuevoTipo) || "linea_vida";

    setPropuestas((prev) => {
      if (!prev.length) return prev;
      return prev.map((propuesta, idx) => {
        if (prev.length > 1 && idx !== 0) return propuesta;
        return {
          ...propuesta,
          tipoCotizacion: canon,
          fotos: fotosParaTipo(propuesta.fotos, canon),
        };
      });
    });

    aplicarTextosDelSistema(canon, { actualizarTitulo });
  };

  // Deduce el tipo de sistema al terminar de escribir el título de portada.
  const sincronizarTipoConTitulo = (nuevoTitulo, { forzar = false } = {}) => {
    if (debounceTituloRef.current) clearTimeout(debounceTituloRef.current);
    setEscribiendoTitulo(false);
    const tipoNuevo = inferirTipoDesdeTitulo(nuevoTitulo);
    if (!tipoNuevo) {
      setAvisoCambioSistema(null);
      return;
    }

    if (tipoRechazadoRef.current && tipoNuevo !== tipoRechazadoRef.current) {
      tipoRechazadoRef.current = "";
    }
    if (!forzar && tipoRechazadoRef.current === tipoNuevo) {
      return;
    }
    if (forzar) {
      tipoRechazadoRef.current = "";
    }

    const tipoInicial = inferirTipoDesdeTitulo(tituloInicialRef.current);
    if (tipoNuevo !== tipoInicial) {
      tituloCambiadoTipoRef.current = true;
    }

    if (!forzar && editCot && !tituloCambiadoTipoRef.current && tipoNuevo === tipoInicial) {
      return;
    }

    const actuales = propuestasRef.current;
    if (!actuales.length) return;
    if (actuales.length > 1 && !forzar) return;

    const tipoAnterior = tipoCotizacionCanonico(actuales[0]?.tipoCotizacion || "linea_vida");
    if (!forzar && tipoAnterior === tipoNuevo) return;

    if (!forzar && actuales.length === 1) {
      setAvisoCambioSistema({ de: tipoAnterior, a: tipoNuevo });
    } else {
      setAvisoCambioSistema(null);
    }

    setPropuestas((prev) =>
      prev.map((propuesta, idx) => {
        if (prev.length > 1 && !forzar && idx !== 0) return propuesta;
        return {
          ...propuesta,
          tipoCotizacion: tipoNuevo,
          fotos: fotosParaTipo(propuesta.fotos, tipoNuevo),
        };
      })
    );

    // El título no se toca (lo acaba de escribir la persona), pero la frase de
    // apertura y la presentación sí acompañan al nuevo sistema si siguen estándar.
    aplicarTextosDelSistema(tipoNuevo, { actualizarTitulo: false });
  };

  const cambiarTituloPortada = (nuevoTitulo, { inmediato = false } = {}) => {
    setTexto("tituloPortada", nuevoTitulo);
    setAvisoCambioSistema(null);
    if (debounceTituloRef.current) clearTimeout(debounceTituloRef.current);
    if (inmediato) {
      sincronizarTipoConTitulo(nuevoTitulo);
    } else {
      setEscribiendoTitulo(true);
      debounceTituloRef.current = setTimeout(() => {
        sincronizarTipoConTitulo(nuevoTitulo);
      }, 500);
    }
  };

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

  useEffect(() => {
    if (intencion?.pantalla === "cotizacion" && intencion?.cotizacionId) {
      const encontrada = cotizaciones.find(
        (c) => c.id === intencion.cotizacionId || c.numero === intencion.cotizacionId
      );
      if (encontrada) {
        setPreviewCot(encontrada);
        setTab("lista");
      }
      limpiarIntencion?.();
    }
  }, [intencion, cotizaciones, limpiarIntencion]);

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
    setPropuestaPorMostrar(nueva.id);
  };

  const duplicarPropuesta = ()=>{
    const base = propuestaActiva || propuestasSnapshot[propuestasSnapshot.length-1];
    if(!base) return;
    const copia = buildQuoteProposal({...base,id:createQuoteProposalId(String(propuestasSnapshot.length+1)),nombre:`${base.nombre} (copia)`},propuestasSnapshot.length);
    setPropuestas([...propuestasSnapshot,copia]);
    setPropuestaPorMostrar(copia.id);
  };

  const eliminarPropuesta = async (id)=>{
    const objetivo = propuestasSnapshot.find((x)=>x.id===id);
    if(!objetivo) return;
    if(!(await confirmar(`¿Eliminar "${objetivo.nombre}"?\n\nEsta acción no se puede deshacer.`))) return;
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
    const textosIniciales = getTextosDocumento(source);
    setTextosDocumento(textosIniciales);
    if (debounceTituloRef.current) clearTimeout(debounceTituloRef.current);
    setEscribiendoTitulo(false);
    setAvisoCambioSistema(null);
    tipoRechazadoRef.current = "";
    tituloInicialRef.current = textosIniciales.tituloPortada || "";
    tituloCambiadoTipoRef.current = false;

    // Datos viejos guardaban fotos y mediciones a nivel de cotizacion, no de
    // propuesta: se migran a la que estaba activa para no perderlos.
    const esMigracionLegacy = !Array.isArray(source.propuestas) || !source.propuestas.length;
    const migradas = all.map((propuesta)=>{
      const sinAiu = Boolean(propuesta.sinAiu ?? source.sinAiu ?? false);
      if(propuesta.id!==activeId) return buildQuoteProposal({...propuesta,sinAiu,items:normalizeProposalItems(propuesta.items)},0);
      return buildQuoteProposal({
        ...propuesta,
        sinAiu,
        items: normalizeProposalItems(propuesta.items),
        fotos: (propuesta.fotos && propuesta.fotos.length) ? propuesta.fotos : (esMigracionLegacy ? (source.fotosCotizacion || []) : []),
        geoMediciones: (propuesta.geoMediciones && propuesta.geoMediciones.length) ? propuesta.geoMediciones : (esMigracionLegacy ? (source.geoMediciones || []) : []),
        geoMapView: propuesta.geoMapView || (esMigracionLegacy ? (source.geoMapView || null) : null),
        mapImg: (propuesta.mapImg !== undefined && propuesta.mapImg !== null) ? propuesta.mapImg : (esMigracionLegacy ? (source.mapImg || null) : null),
        medicionAutomatica: Boolean(propuesta.medicionAutomatica || (esMigracionLegacy && ((propuesta.geoMediciones && propuesta.geoMediciones.length) || (source.geoMediciones && source.geoMediciones.length)))),
      },0);
    });

    setPropuestas(migradas);
    setPropuestaActivaId(activeId);
  };


  const nuevaCotizacion = ()=>{
    setEditCot(null);
    setPreviewCot(null);
    hydrate({numero:getNextCotizacionNumero(cotizaciones),fecha:today(),val:30,cliente:"",obra:"",telefono:"",ciudad:"",coords:"",geoMediciones:[],geoMapView:null,fotosCotizacion:[],textosDocumento:{...TEXTOS_DOCUMENTO_DEFAULT,saludo:saludoSugeridoParaTipo("puntos_anclaje")||TEXTOS_DOCUMENTO_DEFAULT.saludo},propuestas:[buildQuoteProposal({id:createQuoteProposalId("new"),nombre:getQuoteProposalLabel(0),tipoCotizacion:inferirTipoDesdeTitulo(TEXTOS_DOCUMENTO_DEFAULT.tituloPortada)||"puntos_anclaje",formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,sinAiu:false,util:10,items:[],geoMediciones:[],geoMapView:null,mapImg:null,medicionAutomatica:false,incluyeTexto:""},0)]});
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
      const utilidad = sinAiu ? 0 : (subtotal * porcentajeUtilidad(propuesta.util) / 100);
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

  // El editor reemplaza al listado dentro del mismo <main>, que conservaba el
  // scroll: con «Editar» en una cotizacion de abajo, o «Nueva cotización»
  // desde la barra, se caia a media propuesta. El editor empieza arriba.
  useEffect(()=>{
    if(tab==="form") scrollAppToTop("auto");
  }, [tab]);

  // Dictar e Importar abren su panel arriba del formulario, pero los botones
  // van en la barra fija y se pulsan desde cualquier altura: sin esto el panel
  // salia fuera de la vista y solo se notaba que el boton desaparecia.
  const [dictadoRef, subirAlDictado] = useSubirAlFormulario();
  const [importarRef, subirAlImportar] = useSubirAlFormulario();
  useEffect(()=>{ if(dictando) subirAlDictado(); }, [dictando, subirAlDictado]);
  useEffect(()=>{ if(importando) subirAlImportar(); }, [importando, subirAlImportar]);

  // Una propuesta nueva o duplicada se agrega al final, lejos del boton que
  // la crea: se baja hasta ella.
  const [propuestaPorMostrar,setPropuestaPorMostrar]=useState(null);
  useEffect(()=>{
    if(!propuestaPorMostrar) return undefined;
    const id=requestAnimationFrame(()=>{
      document.querySelector(`[data-propuesta-id="${CSS.escape(propuestaPorMostrar)}"]`)
        ?.scrollIntoView({behavior:"smooth",block:"start"});
      setPropuestaPorMostrar(null);
    });
    return ()=>cancelAnimationFrame(id);
  }, [propuestaPorMostrar]);

  // En el editor la barra de arriba queda vacia: Volver y Guardar ya estan en
  // la barra fija del formulario, y tenerlos dos veces era ruido.
  // Con una cotizacion abierta van aqui Volver, Editar, Enviar al cliente y
  // Descargar PDF: en la cabecera del documento se perdian al bajar.
  // Las acciones leen la version vigente de cada funcion por medio de la ref.
  const accionesCotRef = useRef({});
  useEffect(() => {
    accionesCotRef.current = {
      editar: () => { setEditCot(previewCot.id); hydrate(previewCot); setTab("form"); setPreviewCot(null); },
      enviar: () => setEnviarCot(previewCot),
      descargar: () => descargarPdf(previewCot),
    };
  });
  useAccionesPantalla(
    tab === "lista" ? (
      previewCot ? (
        <div style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "nowrap" }}>
          <Button variante="texto" tam="sm" icono="flechaIzq" onClick={() => setPreviewCot(null)} title="Volver al listado de cotizaciones">
            Cotizaciones
          </Button>
          <Button variante="texto" tam="sm" onClick={() => accionesCotRef.current.editar()}>Editar</Button>
          <Button variante="texto" tam="sm" onClick={() => accionesCotRef.current.enviar()}>Enviar al cliente</Button>
          <Button
            variante="oscuro"
            tam="sm"
            icono="descargar"
            style={{ marginLeft: 6 }}
            disabled={Boolean(bajandoPdf)}
            onClick={() => accionesCotRef.current.descargar()}
          >
            {bajandoPdf ? "Generando…" : "Descargar PDF"}
          </Button>
        </div>
      ) : (
        <Button variante="oscuro" tam="sm" icono="mas" onClick={() => nuevaRef.current()}>
          Nueva cotización
        </Button>
      )
    ) : null,
    [tab, previewCot, bajandoPdf]
  );
  useTituloPantalla(tab === "lista" && previewCot ? `Cotización ${previewCot.numero || previewCot.id}` : null);


  // Al enviarla por correo pasa a «Enviada»: el cliente ya la tiene y falta
  // su respuesta. Una aprobada se queda aprobada; reenviarla no la devuelve.
  // Se guarda a quien y cuando, que es lo que se pregunta al hacer seguimiento.
  const marcarEnviada = (cotId, {para, fecha})=>{
    setCotizaciones((prev)=>prev.map((item)=>{
      if(item.id!==cotId) return item;
      const aprobada = item.estado==="Aprobada" || Boolean(item.obraId);
      return {...item, estado: aprobada ? item.estado : "Enviada", enviadaEn: fecha, enviadaA: para};
    }));
  };

  const aprobarCotizacion = async (cotId)=>{
    const base = cotizaciones.find((cotizacion)=>cotizacion.id===cotId);
    const snapshot = base ? getQuoteApprovalAccountingSnapshot(base) : null;
    const cotizacion = snapshot?.cotizacion || null;
    if(!cotizacion || !snapshot) return;

    // Aprobar crea la obra y le escribe al cliente, y se hace con un solo clic
    // en la etiqueta de estado: en el celular basta un toque sin querer. Se
    // pregunta antes, diciendo a donde va el correo, igual que al desaprobar.
    const correoCliente = String(cotizacion.contactoEmail || "").trim();
    if(!(await confirmar(
      `¿Aprobar la cotización ${cotizacion.numero || cotizacion.id} de ${cotizacion.cliente || "este cliente"}?\n\n` +
      `• Se crea la obra en Ejecución de obra (o se reactiva la que ya tenía).\n` +
      (correoCliente
        ? `• Se le envía al cliente un correo con la cotización adjunta a ${correoCliente}.`
        : `• No se envía correo: la cotización no tiene correo del cliente.`)
    ))) return;

    // Quien recibe los informes de la obra: el contacto de la cotizacion o,
    // si no trae correo, el de la ficha del cliente en el directorio.
    const delCliente = quienRecibeDeCliente(clientes, { cliente: cotizacion.cliente, nit: cotizacion.nit });
    const recibeNombreCot = normalizarNombrePropio(cotizacion.contacto || delCliente?.nombre || "");
    const recibeEmailCot = normalizarCorreo(cotizacion.contactoEmail || delCliente?.email || "");

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
        Number(o?.totalFotosAvance || 0) > 0 ||
        // La bitacora no se descarga al arrancar: el contador de la base dice
        // si tiene registros aunque la lista llegue vacia.
        Number(o?.totalRegistrosAvance || 0) > 0
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
      // REUTILIZAR LA OBRA EXISTENTE: No crear una nueva ni gastar otro consecutivo.
      // Si hubiera otras obras de la misma cotizacion no se borran: aprobar no
      // debe eliminar nada. Quien las vea repetidas las borra a mano.
      obraId = obraExistente.id;

      setObras((prev) => prev
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
            // Quien recibe los informes: el que ya tenia la obra manda, porque
            // se puso a proposito para esa obra.
            recibeNombre: o.recibeNombre || recibeNombreCot,
            recibeEmail: o.recibeEmail || recibeEmailCot,
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
        // El contacto de la cotizacion es, de entrada, quien recibe los
        // informes de la obra. Se puede cambiar en el detalle de la obra.
        recibeNombre:recibeNombreCot,
        recibeEmail:recibeEmailCot,
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
        // Liviana: va adjunta al correo de aprobacion.
        const {blob, nombre} = await generarCotizacionPdf(cotizacion,{firmaImg,sello:selloCotizacion,liviano:true});
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
  const desaprobarCotizacion = async (cotId)=>{
    const cotizacion = cotizaciones.find((c)=>c.id===cotId);
    if(!cotizacion) return;
    // Si ya se le habia enviado al cliente, vuelve a «Enviada»: lo tiene en
    // su correo y sigue esperando respuesta.
    const estadoPrevio = cotizacion.enviadaEn ? "Enviada" : "Pendiente";

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
      if (!(await confirmar(
        `¿Devolver la cotización ${cotizacion.numero || cotizacion.id} a "${estadoPrevio}"?`
      ))) return;

      setCotizaciones((prev) => prev.map((c) => (
        c.id === cotId ? { ...c, estado: estadoPrevio, obraId: null } : c
      )));
    } else if (algunaConTrabajo) {
      if (!(await confirmar(
        `¿Devolver la cotización ${cotizacion.numero || cotizacion.id} a "${estadoPrevio}"?\n\n` +
        `La obra ${obraPrincipal.id} (${obraPrincipal.proyecto || obraPrincipal.cliente}) SE CONSERVA intacta: ya tiene trabajo registrado (avance, fotos, pagos, etc.).\n\n` +
        `Si más adelante vuelves a aprobarla, se reutilizará la misma obra ${obraPrincipal.id} sin generar duplicados ni alterar el consecutivo.`
      ))) return;

      // Conservar obraId para saber qué obra reactivar al aprobar de nuevo
      setCotizaciones((prev) => prev.map((c) => (
        c.id === cotId ? { ...c, estado: estadoPrevio, obraId: obraPrincipal.id } : c
      )));

      // Limpiar clones vacíos sobrantes si existieran
      const idsClonesVacios = obrasAsociadas
        .filter((o) => o.id !== obraPrincipal.id && !tieneTrabajo(o))
        .map((o) => o.id);

      if (idsClonesVacios.length > 0) {
        setObras((prev) => prev.filter((o) => !idsClonesVacios.includes(o.id)));
      }
    } else {
      if (!(await confirmar(
        `¿Devolver la cotización ${cotizacion.numero || cotizacion.id} a "${estadoPrevio}" y retirar la obra creada (${obraPrincipal.id})?\n\n` +
        `La obra está sin empezar (0% de avance). Al retirarla, no afectará el consecutivo ni dejará registros vacíos.`
      ))) return;

      setCotizaciones((prev) => prev.map((c) => (
        c.id === cotId ? { ...c, estado: estadoPrevio, obraId: null } : c
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
        <div style={{padding: isMobile ? "8px 10px 16px" : "8px 18px 12px"}}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 8,
              padding: "2px 0",
            }}
          >
            <div style={{display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap"}}>
              <h1 style={{fontSize: 17, fontWeight: 800, margin: 0, color: "var(--text-h1, #101828)", lineHeight: 1.2}}>
                Cotización {previewCot.numero || previewCot.id}
              </h1>
              <span style={{fontSize: 12, color: "var(--text-muted, #667085)"}}>
                Vista completa del documento comercial
              </span>
            </div>

            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              {/* Botón para Minimizar / Maximizar Horizontalmente */}
              <button
                type="button"
                onClick={() => setPreviewExpandido((prev) => !prev)}
                title={
                  previewExpandido
                    ? "Minimizar horizontalmente (ancho compacto centrado)"
                    : "Maximizar horizontalmente (pantalla completa)"
                }
                style={{
                  background: previewExpandido ? "#1d1d1f" : "var(--surface-subtle, #f2f4f7)",
                  color: previewExpandido ? "#ffffff" : "var(--text-main, #101828)",
                  border: `1px solid ${previewExpandido ? "#1d1d1f" : "var(--border, #eaecf0)"}`,
                  borderRadius: 6,
                  padding: isMobile ? "5px 9px" : "5px 11px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.16s ease",
                }}
              >
                <span>↔</span>
                <span>{previewExpandido ? "Minimizar" : "Maximizar"}</span>
              </button>

              {/* Controles de vista: Ajustar a pantalla o 100% Lectura */}
              <button
                type="button"
                onClick={() => setModoPreview("auto")}
                title="Ajusta el documento al ancho completo de tu pantalla para ver la página entera"
                style={{
                  background: modoPreview === "auto" ? "var(--btn-guardar-bg, #cc0000)" : "var(--btn-cancelar-bg, #f1f5f9)",
                  color: modoPreview === "auto" ? "#fff" : "var(--btn-cancelar-txt, #475569)",
                  border: `1px solid ${modoPreview === "auto" ? "var(--btn-guardar-bg, #cc0000)" : "var(--border, #cbd5e1)"}`,
                  borderRadius: 6,
                  padding: isMobile ? "5px 9px" : "5px 11px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>Ajustar ({Math.round(escalaPreview * 100)}%)</span>
              </button>
              <button
                type="button"
                onClick={() => setModoPreview("real")}
                title="Muestra el documento al 100% de tamaño para lectura cómoda deslizando con el dedo"
                style={{
                  background: modoPreview === "real" ? "var(--btn-guardar-bg, #cc0000)" : "var(--btn-cancelar-bg, #f1f5f9)",
                  color: modoPreview === "real" ? "#fff" : "var(--btn-cancelar-txt, #475569)",
                  border: `1px solid ${modoPreview === "real" ? "var(--btn-guardar-bg, #cc0000)" : "var(--border, #cbd5e1)"}`,
                  borderRadius: 6,
                  padding: isMobile ? "5px 9px" : "5px 11px",
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span>100% Lectura</span>
              </button>

              {/* Editar, Enviar al cliente y Descargar PDF van en la barra de
                  arriba, que no se mueve al bajar. WhatsApp queda aqui, solo
                  si la cotizacion tiene telefono. */}
              {String(previewCot.telefono || "").replace(/\D/g, "") && (
                <a
                  href={`https://wa.me/57${String(previewCot.telefono).replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Hola ${previewCot.contacto || previewCot.cliente || ""}, te saludo de Ingeanclajes respecto a la cotización ${previewCot.numero || previewCot.id}...`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...B("var(--fill)"), textDecoration: "none", padding: "5px 12px", fontSize: 12 }}
                >
                  WhatsApp
                </a>
              )}
            </div>
          </div>

          <div
            style={{
              maxWidth: previewExpandido ? "100%" : "1060px",
              margin: "0 auto",
              width: "100%",
              transition: "max-width 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <DocumentoEnVivo
              cotizacion={previewCot}
              firmaImg={firmaImg}
              sello={selloCotizacion}
              alto="calc(100dvh - 120px)"
              nota="Igual al PDF"
              sticky={false}
              modo={modoPreview}
              onModoChange={setModoPreview}
              onEscalaChange={setEscalaPreview}
              ocultarControles={true}
            />
          </div>
          {enviarCot && <EnviarCotizacion cotizacion={enviarCot} firmaImg={firmaImg} onCerrar={()=>setEnviarCot(null)} onEnviado={(info)=>marcarEnviada(enviarCot.id, info)}/>}
        </div>
      );
    }
    return (
      <div style={{padding: isMobile ? "8px 0 24px" : "12px 20px", width: "100%", boxSizing: "border-box"}}>
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
            eliminar: async (c)=>{
              if(!(await confirmar(`¿Eliminar la cotización "${c.numero || c.id}" de ${c.cliente || "este cliente"}?\n\nEsta acción no se puede deshacer.`))) return;
              setCotizaciones((prev)=>prev.filter((x)=>x.id!==c.id));
            },
          }}
        />


        {/* La lista tiene su propio return, aparte del formulario. Sin montar
            aqui el dialogo, el boton de enviar guardaba el estado y no pasaba
            nada visible. */}
        {enviarCot && <EnviarCotizacion cotizacion={enviarCot} firmaImg={firmaImg} onCerrar={()=>setEnviarCot(null)} onEnviado={(info)=>marcarEnviada(enviarCot.id, info)}/>}
      </div>
    );
  }

  return (
    // Menos aire arriba: el formulario es largo y arrancaba muy abajo.
    <div style={{padding: isMobile ? "10px 0 40px" : "16px 28px 28px", width: "100%", boxSizing: "border-box"}}>
      {/* Sin el titulo grande: ocupaba dos renglones -"Editar Cotización" y
          su explicacion- antes de empezar el formulario, y las acciones que
          llevaba al lado ya estan arriba en la barra. Queda solo este
          renglon, que dice lo unico que no se sabe de memoria: si es nueva o
          cual se esta editando. */}
      {/* Barra del editor al estilo de la de apple.com: a la izquierda que
          cotizacion es y cuanto suma, a la derecha las acciones como texto
          suelto, sin cajas ni emoji, y solo Guardar como pildora oscura. */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "color-mix(in srgb, var(--surface) 82%, transparent)",
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
          borderRadius: 14,
          border: "1px solid var(--separator)",
          padding: isMobile ? "6px 8px" : "6px 8px 6px 4px",
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: isMobile ? "wrap" : "nowrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0, minWidth: 0 }}>
          <Button
            variante="texto"
            tam="sm"
            icono="flechaIzq"
            onClick={() => setTab("lista")}
            title="Volver al listado de cotizaciones"
          >
            Cotizaciones
          </Button>

          <span style={{ width: 1, height: 18, background: "var(--separator)", flexShrink: 0 }} />

          <span style={{ fontSize: 12.5, color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {cot || "Borrador"}
          </span>

          <span
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              maxWidth: isMobile ? "110px" : "220px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={cl.nombre ? cl.nombre : "Nuevo cliente"}
          >
            {cl.nombre ? cl.nombre : "Nuevo cliente"}
          </span>

          <span style={{ fontSize: 13.5, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
            {fmt(totalCotizacionCalculado)}
          </span>
        </div>

        <div style={{
          display: "flex", alignItems: "center", gap: 2, flexShrink: 0,
          // En el telefono no caben en un renglon: bajan en vez de salirse.
          flexWrap: isMobile ? "wrap" : "nowrap",
          width: isMobile ? "100%" : "auto",
        }}>
          {!dictando && (
            <Button variante="texto" tam="sm" onClick={() => setDictando(true)} title="Armar la cotización hablando">
              Dictar
            </Button>
          )}

          {!importando && (
            <Button
              variante="texto"
              tam="sm"
              onClick={() => setImportando(true)}
              title="Leer la solicitud que mandó el cliente y armar la cotización con ella"
            >
              Importar
            </Button>
          )}

          <Button
            variante="texto"
            tam="sm"
            aria-pressed={verDocumento}
            onClick={() => setVerDocumento((v) => !v)}
            title="Muestra el documento completo tal como se imprimirá, mientras editas"
          >
            {isMobile ? "Documento" : verDocumento ? "Ocultar documento" : "Ver documento"}
          </Button>

          <Button
            variante="texto"
            tam="sm"
            disabled={Boolean(bajandoPdf)}
            onClick={descargarPdfDesdeEditor}
            title="Descarga el documento de la cotización en formato PDF directamente"
          >
            {bajandoPdf === "editor" ? "Generando…" : "PDF"}
          </Button>

          <Button
            variante="oscuro"
            tam="sm"
            style={{ marginLeft: "auto" }}
            onClick={() => guardarRef.current()}
            title="Guarda los cambios de la cotización"
          >
            Guardar
          </Button>
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
      {dictando && (
        <div ref={dictadoRef} style={{scrollMarginTop:70}}>
          <DictarCotizacion onAplicar={aplicarDictado} onCerrar={()=>setDictando(false)}/>
        </div>
      )}

      {/* Misma puerta que el dictado: cambia de donde sale el texto. */}
      {importando && (
        <div ref={importarRef} style={{scrollMarginTop:70}}>
          <ImportarCotizacion
            clientes={clientes}
            onAplicar={(propuesta)=>{ aplicarDictado(propuesta); setImportando(false); }}
            onCerrar={()=>setImportando(false)}
          />
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
        {(() => {
          const primeraPropuesta = propuestasSnapshot[0];
          const tipoActual = tipoCotizacionCanonico(primeraPropuesta?.tipoCotizacion || "linea_vida");
          const tipoSegunTitulo = inferirTipoDesdeTitulo(textosDocumento.tituloPortada);
          const tituloSugerido = tituloSugeridoParaTipo(tipoActual);
          const tituloDifiereDelSistema =
            Boolean(tipoSegunTitulo) &&
            tipoActual !== "manual" &&
            tipoSegunTitulo !== tipoActual &&
            !escribiendoTitulo &&
            !avisoCambioSistema;

          return (
            <div
              style={{
                marginBottom: 16,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--surface-subtle, #f8fafc)",
                border: "1px solid var(--border, #e2e8f0)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-main, #1e293b)" }}>
                  Tipo de sistema {propuestasSnapshot.length > 1 ? "(Propuesta A)" : "de la cotización"}
                </span>
                <span style={{ fontSize: 10.5, color: "#64748b" }}>
                  Elígelo primero: actualiza automáticamente el título, la frase de apertura, las definiciones y las fichas del PDF
                </span>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {OPCIONES_SISTEMA_RAPIDO.map((op) => {
                  const activo = tipoActual === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => elegirSistemaRapido(op.id)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: 999,
                        fontSize: 11.5,
                        fontWeight: activo ? 700 : 500,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s ease",
                        background: activo ? "var(--text-main, #1d1d1f)" : "#ffffff",
                        color: activo ? "#ffffff" : "var(--text-muted, #475569)",
                        border: activo ? "1px solid var(--text-main, #1d1d1f)" : "1px solid #cbd5e1",
                        boxShadow: activo ? "0 1px 4px rgba(0,0,0,0.12)" : "none",
                      }}
                    >
                      {op.label}
                    </button>
                  );
                })}
              </div>

              {avisoCambioSistema && avisoCambioSistema.a === tipoActual && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "#ecfdf3",
                    border: "1px solid #abefc6",
                    color: "#067647",
                    fontSize: 11.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    ✨ Sistema cambiado automáticamente a <strong>{getTipoCotizacionLabel(avisoCambioSistema.a)}</strong> según el título que escribiste.
                  </span>
                  <button
                    type="button"
                    onClick={() => elegirSistemaRapido(avisoCambioSistema.de, { actualizarTitulo: false, rechazarTipoAuto: avisoCambioSistema.a })}
                    style={{
                      background: "#ffffff",
                      color: "#067647",
                      border: "1px solid #6ce9a6",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 9px",
                      cursor: "pointer",
                    }}
                  >
                    Deshacer (volver a {getTipoCotizacionLabel(avisoCambioSistema.de)})
                  </button>
                </div>
              )}

              {tituloDifiereDelSistema && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "6px 10px",
                    borderRadius: 8,
                    background: "#fffaeb",
                    border: "1px solid #fedf89",
                    color: "#b54708",
                    fontSize: 11.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <span>
                    El título menciona <strong>{getTipoCotizacionLabel(tipoSegunTitulo)}</strong>, pero el sistema seleccionado es <strong>{getTipoCotizacionLabel(tipoActual)}</strong>.
                  </span>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => sincronizarTipoConTitulo(textosDocumento.tituloPortada, { forzar: true })}
                      style={{
                        background: "#ffffff",
                        color: "#b54708",
                        border: "1px solid rgba(181,71,8,0.35)",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 9px",
                        cursor: "pointer",
                      }}
                    >
                      Cambiar sistema a «{getTipoCotizacionLabel(tipoSegunTitulo)}»
                    </button>
                    {tituloSugerido && (
                      <button
                        type="button"
                        onClick={() => {
                          aplicarTextosDelSistema(tipoActual, { forzarTitulo: true });
                          setAvisoCambioSistema(null);
                        }}
                        style={{
                          background: "transparent",
                          color: "#7c2d12",
                          border: "1px solid rgba(181,71,8,0.28)",
                          borderRadius: 999,
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 9px",
                          cursor: "pointer",
                        }}
                      >
                        Cambiar título a «{getTipoCotizacionLabel(tipoActual)}»
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
        {/* 2° Título de la portada (se actualiza según el sistema elegido arriba mientras no se edite a mano). */}
        <div style={{marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}>
            <LBL>Título de la portada</LBL>
            <BotonCorregir valor={textosDocumento.tituloPortada} onChange={(v)=>cambiarTituloPortada(normalizarTituloFormal(v), { inmediato: true })} compacto/>
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
            onChange={e=>cambiarTituloPortada(e.target.value.replace(/\s+/g," "))}
            onBlur={e=>{
              const v = e.target.value.replace(/\s+/g," ");
              const auto = normalizarTituloFormal(v);
              if (auto !== textosDocumento.tituloPortada) {
                cambiarTituloPortada(auto, { inmediato: true });
              } else {
                sincronizarTipoConTitulo(v);
              }
            }}
            style={{...SI,fontSize:14,fontWeight:600,
              textAlign:"center"}}
          />
          {(() => {
            const tipoActual = tipoCotizacionCanonico(propuestasSnapshot[0]?.tipoCotizacion || "linea_vida");
            const sug = tituloSugeridoParaTipo(tipoActual);
            const tipoEnTitulo = inferirTipoDesdeTitulo(textosDocumento.tituloPortada);
            const yaTieneBannerDiferencia = Boolean(tipoEnTitulo) && tipoActual !== "manual" && tipoEnTitulo !== tipoActual;
            if (!sug || coincideTextoPlantilla(textosDocumento.tituloPortada, sug) || yaTieneBannerDiferencia) return null;
            return (
              <div style={{ marginTop: 5 }}>
                <button
                  type="button"
                  onClick={() => {
                    setTexto("tituloPortada", sug);
                    setAvisoCambioSistema(null);
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#0369a1",
                    fontFamily: "inherit",
                  }}
                >
                  Restaurar título sugerido para «{getTipoCotizacionLabel(tipoActual)}»
                </button>
              </div>
            );
          })()}
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>
            El título grande de la primera hoja. Cámbialo según el trabajo (se formatea automáticamente con mayúsculas iniciales por palabra). Sale centrado en la portada; si es largo, la hoja lo reparte solo en varias líneas.
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
          {(() => {
            const tipoActual = tipoCotizacionCanonico(propuestasSnapshot[0]?.tipoCotizacion || "linea_vida");
            const sug = saludoSugeridoParaTipo(tipoActual);
            if (!sug || coincideTextoPlantilla(textosDocumento.saludo, sug)) return null;
            return (
              <div style={{ marginTop: 5 }}>
                <button
                  type="button"
                  onClick={() => setTexto("saludo", sug)}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#0369a1",
                    fontFamily: "inherit",
                  }}
                >
                  Restaurar frase sugerida para «{getTipoCotizacionLabel(tipoActual)}»
                </button>
              </div>
            );
          })()}
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Cambia automáticamente según el tipo de sistema mientras no la edites a mano. Se imprime después de &quot;Cordial saludo, [cliente]&quot;; si la obra tiene nombre, se agrega al final. No hace falta el punto final.</div>
        </div>
        {/* Se oculta de la visual «Presentación de la empresa»: el valor se
            conserva en textosDocumento.presentacion y se sigue imprimiendo en
            el documento y PDF oficial. */}
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
      <div style={{...CD,marginBottom:14,border:"1px solid var(--border, #eaecf0)"}}>
        <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
          <div style={{...ST,marginBottom:0,borderBottom:"none",paddingBottom:0}}>03 · Propuestas</div>
          <div style={{width:1,height:20,background:"#e2e8f0"}} />
          <div style={{display:"flex",gap:8}}>
            <button
              onClick={agregarPropuesta}
              style={{
                background: "#FFFAEB",
                color: "#B54708",
                border: "1px solid rgba(181, 71, 8, 0.35)",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 700,
                padding: "6px 14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                boxShadow: "0 1px 2px rgba(181, 71, 8, 0.08)",
              }}
            >
              + Nueva propuesta
            </button>
            <button
              onClick={duplicarPropuesta}
              style={{
                background: "var(--surface-subtle, #f2f4f7)",
                color: "var(--text-main, #101828)",
                border: "1px solid var(--border, #eaecf0)",
                borderRadius: 8,
                fontSize: 11.5,
                fontWeight: 600,
                padding: "6px 14px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              Duplicar activa
            </button>
          </div>
        </div>
        <div style={{fontSize:11,color:"#64748b",marginTop:8}}>
          Se imprimen en este mismo orden. Cada una lleva sus propios ítems, fotos, medición y condiciones.
        </div>
      </div>

      {propuestas.map((propuesta,idx)=>(
        <div key={propuesta.id} data-propuesta-id={propuesta.id} style={{scrollMarginTop:70}}>
        <PropuestaEditor
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
        </div>
      ))}

      {/* Se oculta de la pantalla de creación/edición el bloque de Cierre (contacto, firma y datos adicionales)
          porque nunca se edita manualmente aquí, pero todos sus valores se preservan en textosDocumento
          y se siguen incluyendo automáticamente al imprimir y generar el PDF oficial. */}

      {/* Aqui habia un segundo «Guardar Cotizacion», en ambar. Se quito: el
          «Guardar» de la barra fija de arriba se ve siempre y hace lo mismo,
          y dos botones distintos para guardar confundian. */}

      </div>

      {verDocumento && (
        <DocumentoEnVivo
          cotizacion={cotizacionEnVivo}
          firmaImg={firmaImg}
          sello={selloCotizacion}
          alto={cabeEnDosColumnas ? "calc(100vh - 210px)" : "calc(100vh - 260px)"}
        />
      )}
      {enviarCot && <EnviarCotizacion cotizacion={enviarCot} firmaImg={firmaImg} onCerrar={()=>setEnviarCot(null)} onEnviado={(info)=>marcarEnviada(enviarCot.id, info)}/>}

      </div>
    </div>
  );
}

// ======================================================
// HELPERS
// ======================================================

