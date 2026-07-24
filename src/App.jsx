import { useState, useRef, useEffect } from "react";
import logoIngeanclajes from "./assets/logo-ingeanclajes.jpeg";
import * as backend from "./lib/backend";
import { LOGO_CCS } from "./assets/embeddedImages";
import { EC, PAL, TC, SI, B, CD, ST } from "./styles/tokens";
import { fmt, fmtK, today, fmtD, fmtL, scrollAppToTop, buildMonthDateRange, isDateWithinRange } from "./lib/format";
import { parseIsoDate, round1 } from "./lib/dates";
import { escapeXml } from "./lib/html";
import { EMPLEADOS_INIT, CARGOS_INIT, COTIZACIONES_INIT, OBRAS_INIT, PAGOS_INIT, HORARIOS_INIT, CERTIFICACIONES_INIT, INFORMES_INIT, CLIENTES_INIT, PROVEEDORES_INIT, CUENTAS_PAGAR_INIT, CONTABILIDAD_CONFIG_INIT, PLAN_CUENTAS_INIT, ASIENTOS_CONTABLES_INIT, ITEMS_DB, DEFAULT_COT_FORMA_PAGO, DEFAULT_COT_TIEMPO_EJEC, DEFAULT_COT_INCLUYE_PUNTOS_ANCLAJE } from "./data/seed";
import { hasAnchorPointsService, getQuoteProposalLabel, createQuoteProposalId, buildQuoteProposal, getQuoteProposals, getQuoteActiveProposal, getQuoteApprovalAccountingSnapshot, normalizeQuoteItems, normalizeProposalItems, getQuotePrintableProposals } from "./lib/cotizaciones";
import { openCotizacionPrint, COTIZACION_AUTO_SEND_ENDPOINTS, normalizeEntityKey } from "./lib/cotizacionPrint";
import { printCurrentPz, printColilla, printVacaciones, printLiquidacion } from "./lib/print";
import { AppDataProvider, useAppData } from "./context/AppDataContext";
import GoogleMeasureWorkspace from "./components/maps/GoogleMeasureWorkspace";
import StaticMapPreview from "./components/maps/StaticMapPreview";
import PrintHeader from "./components/print/PrintHeader";
import { NOMINA_CO_2026, TIPOS_CONTRATO_LABELS, RECARGOS_CO_2026, getPctRecargo, buildNominaPeriodo, isDateInPeriodo, calcularVacacionesPendientes, PRESTACION_TIPOS_LABELS, PRESTACION_ESTADOS_LABELS, calcularPrestacionSocialEmpleado, normalizarPrestacionesSociales, upsertPrestacionSocial, buildLiquidacionPrestacionRecord, INCAPACIDAD_ORIGEN_LABELS, INCAPACIDAD_RESPONSABLE_LABELS, buildIncapacidadFormDefault, normalizarIncapacidades, calcularResumenIncapacidadesRegistros, normalizarEmpleado, normalizarCargos, calcularValorHoraBase, calcularValorHoraRecargo, calcularTotalHoraExtraItem, calcularResumenNominaEmpleado, calcularParafiscales, calcularLiquidacionRetiro, NOMINA_GENERATED_STORAGE_KEY, NOMINA_PLANO_BANCO_DEFAULTS, formatNominaGeneratedAt, downloadTextFile, normalizeNominaGeneratedRecord, buildNominaGeneratedRecord, upsertNominaGeneratedRecord, downloadExcelWorkbook, buildNominaSnapshot, NOMINAS_GENERADAS_INIT, buildNominaPlanoBancoContent } from "./lib/nomina";
import { LEAFLET_CSS_ID, LEAFLET_JS_ID, parseLatLngValue, GOOGLE_MAPS_EMBED_KEY, getStaticMapDimensions, getStaticMapLabelData, buildGoogleStaticMapUrl, loadGoogleMapsJsApi, measurementsToQuoteItems, createMapLabelOverlay } from "./lib/maps";
import Badge from "./components/ui/Badge";
import Av from "./components/ui/Av";
import H1 from "./components/ui/H1";
import SC from "./components/ui/SC";
import LBL from "./components/ui/LBL";
import {
  ACCOUNTING_NORMATIVE_NOTE,
  buildCombinedEntries,
  buildDefaultContabilidadConfig,
  buildDefaultPlanCuentas,
  buildEmptyManualAsiento,
  buildEmptyPlanCuenta,
  buildFinancialStatements,
  buildTrialBalance,
  createAsientoLine,
  filterEntriesByPeriod,
  getAccountGroupOptions,
  getStatementCategoryOptions,
  isBalancedEntry,
  normalizeAsientoContable,
  normalizeContabilidadConfig,
  normalizePlanCuenta,
  summarizeEntries,
} from "./lib/accounting";

const isSupabaseConfigured = backend.isSupabaseConfigured;
const loadCloudAppData = backend.loadCloudAppData;
const saveCloudAppData = backend.saveCloudAppData;

// ======================================================
// LOGOS CORPORATIVOS
// ======================================================
const LOGO_INGEANCLAJES = logoIngeanclajes;



function Dashboard({ctx,go}){
  const {obras,cotizaciones}=ctx;
  const saldoPendiente = obras.reduce((sum, obra)=>sum + Number(obra.saldo || 0), 0);
  const recientes = [...cotizaciones].sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||""))).slice(0,4);

  return(
    <div style={{padding:28}}>
      <H1
        title="Dashboard"
        subtitle="Resumen comercial, operativo y financiero de Ingeanclajes"
        action={<div style={{display:"flex",gap:10}}><button style={B("#f47c20")} onClick={()=>go("cotizacion")}>+ Nueva Cotización</button><button style={B("#dbeafe","#1e40af")} onClick={()=>go("clientes")}>Clientes</button></div>}
      />
      <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:18}}>
        <div style={CD}>
          <div style={ST}>Cotizaciones recientes</div>
          <div style={{display:"grid",gap:10}}>
            {recientes.map((cotizacion)=>{
              const activa = getQuoteActiveProposal(cotizacion);
              return(
                <div key={cotizacion.id} style={{border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px",display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:11,color:"#64748b"}}>{cotizacion.numero} · {fmtD(cotizacion.fecha)}</div>
                    <div style={{fontSize:16,fontWeight:700,color:"#1a1a2e"}}>{cotizacion.cliente}</div>
                    <div style={{fontSize:12,color:"#475569"}}>{cotizacion.obra}</div>
                    <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{activa.nombre} · {fmt(Number(activa.total || 0))}</div>
                  </div>
                  <button style={{...B("#f1f5f9","#475569"),fontSize:12,padding:"7px 12px"}} onClick={()=>go("cotizacion")}>Abrir módulo</button>
                </div>
              );
            })}
          </div>
        </div>
        <div style={CD}>
          <div style={ST}>Alertas rápidas</div>
          <div style={{display:"grid",gap:12,fontSize:13,color:"#475569"}}>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",marginBottom:4}}>Cobro pendiente</div>
              <div style={{fontSize:24,fontWeight:800,color:Number(saldoPendiente)>0?"#cc0000":"#166534"}}>{fmt(Number(saldoPendiente || 0))}</div>
            </div>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:11,color:"#64748b",textTransform:"uppercase",marginBottom:4}}>Siguiente enfoque</div>
              <div>Usa el módulo de cotizaciones para armar alternativas A/B/C y deja una propuesta activa como base para obra y PDF.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Cotizacion({ctx}){
  const {cotizaciones,setCotizaciones,obras,setObras}=ctx;
  const [tab,setTab]=useState("lista");
  const [previewCot,setPreviewCot]=useState(null);
  const [busqueda,setBusqueda]=useState("");
  const [filtroObraCot,setFiltroObraCot]=useState("todas");
  const [editCot,setEditCot]=useState(null);
  const [cot,setCot]=useState("");
  const [fecha,setFecha]=useState(today());
  const [val,setVal]=useState(30);
  const [cl,setCl]=useState({nombre:"",contacto:"",obra:"",telefono:"",ciudad:"",coords:""});
  const [textoInicial,setTextoInicial]=useState("");
  const [observacionesCot,setObservacionesCot]=useState("");
  const [propuestas,setPropuestas]=useState([buildQuoteProposal({id:createQuoteProposalId("new"),nombre:getQuoteProposalLabel(0),formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,util:10,items:[],incluyeTexto:""},0)]);
  const [propuestaActivaId,setPropuestaActivaId]=useState(null);
  const [nombrePropuesta,setNombrePropuesta]=useState(getQuoteProposalLabel(0));
  const [alcancePropuesta,setAlcancePropuesta]=useState("");
  const [tipoCotizacion,setTipoCotizacion]=useState("linea_vida");
  const [requerimientoCliente,setRequerimientoCliente]=useState("");
  const [incluyeTexto,setIncluyeTexto]=useState("");
  const [formaPago,setFormaPago]=useState(DEFAULT_COT_FORMA_PAGO);
  const [tiempoEjec,setTiempoEjec]=useState(DEFAULT_COT_TIEMPO_EJEC);
  const [util,setUtil]=useState(10);
  const [items,setItems]=useState([]);
  const [nid,setNid]=useState(1);
  const [geoMediciones,setGeoMediciones]=useState([]);
  const [geoMapView,setGeoMapView]=useState(null);
  const [medicionAutomaticaActiva,setMedicionAutomaticaActiva]=useState(false);
  const [showDB,setShowDB]=useState(false);
  const [dbCat,setDbCat]=useState(0);
  const [fotosActivaPropuesta,setFotosActivaPropuesta]=useState([]);
  const fotosRef=useRef();

  const getNextCotizacionNumero = (list = []) => {
    const maxAnc = (Array.isArray(list) ? list : []).reduce((max, cotizacion) => {
      const numero = String(cotizacion?.numero || '').trim().toUpperCase();
      const match = numero.match(/^ANC\s*-?\s*(\d+)$/);
      if (!match) return max;
      return Math.max(max, Number(match[1] || 0));
    }, 0);

    return `ANC${String(maxAnc + 1).padStart(3, "0")}`;
  };

  const autoMapImg = buildGoogleStaticMapUrl(geoMediciones, cl.coords || `${cl.obra||""} ${cl.ciudad||""}`.trim(), geoMapView);
  const sub = items.reduce((sum,item)=>sum + (Number(item.cant)||0)*(Number(item.vu)||0),0);
  const ut = sub * (Number(util)||0) / 100;
  const iva = ut * 0.19;
  const tot = sub + ut + iva;

  const proposalFromState = ()=>buildQuoteProposal({id:propuestaActivaId || createQuoteProposalId(editCot || "draft"),nombre:nombrePropuesta,alcance:alcancePropuesta,tipoCotizacion,requerimientoCliente,incluyeTexto,formaPago,tiempoEjec,util,items,fotos:fotosActivaPropuesta,geoMediciones,geoMapView,mapImg:autoMapImg || null,medicionAutomatica:medicionAutomaticaActiva,total:Math.round(tot)},0);
  const proposalSnapshot = proposalFromState();
  const propuestasSnapshot = (propuestas.length ? propuestas : [proposalSnapshot]).map((propuesta,index)=>buildQuoteProposal(propuesta.id===proposalSnapshot.id?proposalSnapshot:propuesta,index));

  useEffect(()=>{
    const propuestaActual = {
      nombre: nombrePropuesta,
      alcance: alcancePropuesta,
      requerimientoCliente,
      items,
    };
    if (hasAnchorPointsService(propuestaActual) && !String(incluyeTexto || "").trim()) {
      setIncluyeTexto(DEFAULT_COT_INCLUYE_PUNTOS_ANCLAJE);
    }
  }, [nombrePropuesta, alcancePropuesta, requerimientoCliente, items, incluyeTexto]);

  const applyProposal = (propuesta)=>{
    const p = buildQuoteProposal(propuesta,0);
    const nextItems = normalizeProposalItems(p.items);
    setPropuestaActivaId(p.id);
    setNombrePropuesta(p.nombre);
    setAlcancePropuesta(p.alcance || "");
    setTipoCotizacion(p.tipoCotizacion || "linea_vida");
    setRequerimientoCliente(p.requerimientoCliente || "");
    setIncluyeTexto(String(p.incluyeTexto || ""));
    setFormaPago(p.formaPago || DEFAULT_COT_FORMA_PAGO);
    setTiempoEjec(p.tiempoEjec || DEFAULT_COT_TIEMPO_EJEC);
    setUtil(Number(p.util || 10));
    setItems(nextItems);
    setNid(nextItems.length + 1);
    setFotosActivaPropuesta(p.fotos || []);
    setGeoMediciones(Array.isArray(p.geoMediciones) ? p.geoMediciones : []);
    setGeoMapView(p.geoMapView || null);
    setMedicionAutomaticaActiva(Boolean(p.medicionAutomatica || (Array.isArray(p.geoMediciones) && p.geoMediciones.length)));
  };

  const hydrate = (source={})=>{
    const all = getQuoteProposals(source);
    const active = all.find((propuesta)=>propuesta.id===source.propuestaActivaId) || all[0];
    setCot(source.numero || `P-${34155 + cotizaciones.length}`);
    setFecha(source.fecha || today());
    setVal(source.val || 30);
    setCl({nombre:source.cliente || "",contacto:source.contacto || "",obra:source.obra || "",telefono:source.telefono || "",ciudad:source.ciudad || "",coords:source.coords || ""});
    setTextoInicial(source.textoInicial || "");
    setObservacionesCot(source.observaciones || "");
    setGeoMediciones(source.geoMediciones || []);
    setGeoMapView(source.geoMapView || null);
    setPropuestas(all);
    // Para datos viejos sin fotos por propuesta, migrar fotosCotizacion a la propuesta activa
    const activeConFotos = {
      ...active,
      fotos: (active.fotos && active.fotos.length) ? active.fotos : (source.fotosCotizacion || []),
      geoMediciones: (active.geoMediciones && active.geoMediciones.length) ? active.geoMediciones : (source.geoMediciones || []),
      geoMapView: active.geoMapView || source.geoMapView || null,
      mapImg: active.mapImg || source.mapImg || null,
      incluyeTexto: active.incluyeTexto || "",
      medicionAutomatica: Boolean(active.medicionAutomatica || (active.geoMediciones && active.geoMediciones.length) || (source.geoMediciones && source.geoMediciones.length)),
    };
    applyProposal(activeConFotos);
  };

  const syncPropuestas = ()=>{
    const current = proposalFromState();
    const base = propuestas.length ? propuestas : [current];
    const next = (base.some((propuesta)=>propuesta.id===current.id) ? base.map((propuesta)=>propuesta.id===current.id?current:propuesta) : [...base,current]).map((propuesta,index)=>buildQuoteProposal(propuesta,index));
    setPropuestas(next);
    setPropuestaActivaId(current.id);
    return { current, next };
  };

  const nuevaCotizacion = ()=>{
    setEditCot(null);
    setPreviewCot(null);
    hydrate({numero:getNextCotizacionNumero(cotizaciones),fecha:today(),val:30,cliente:"",obra:"",telefono:"",ciudad:"",coords:"",geoMediciones:[],geoMapView:null,fotosCotizacion:[],propuestas:[buildQuoteProposal({id:createQuoteProposalId("new"),nombre:getQuoteProposalLabel(0),formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,util:10,items:[],geoMediciones:[],geoMapView:null,mapImg:null,medicionAutomatica:false,incluyeTexto:""},0)]});
    setTab("form");
  };

  const persistCotizacion = ({volverALista=true}={})=>{
    const { current, next } = syncPropuestas();
    const finalItems = normalizeQuoteItems({items:current.items,geoMediciones,propuestas:next});
    const totalActiva = Math.round((finalItems.reduce((sum,item)=>sum + (Number(item.cant)||0)*(Number(item.vu)||0),0)) * (1 + (Number(current.util || 10) / 100) * 1.19));
    const activa = buildQuoteProposal({...current,items:finalItems,total:totalActiva}, next.findIndex((propuesta)=>propuesta.id===current.id));
    const propuestasFinales = next.map((propuesta)=>propuesta.id===activa.id?activa:buildQuoteProposal(propuesta));
    const prev = editCot ? cotizaciones.find((cotizacion)=>cotizacion.id===editCot) : null;
    const data = {id:editCot || `COT-${String(cotizaciones.length+1).padStart(3,"0")}`,numero:cot,fecha,val,cliente:cl.nombre,contacto:cl.contacto,obra:cl.obra,telefono:cl.telefono,ciudad:cl.ciudad,coords:cl.coords,textoInicial:textoInicial.trim(),observaciones:observacionesCot.trim(),items:activa.items,util:activa.util,total:activa.total,formaPago:activa.formaPago,tiempoEjec:activa.tiempoEjec,mapImg:activa.mapImg || autoMapImg || null,geoMediciones:activa.geoMediciones || geoMediciones,geoMapView:activa.geoMapView || geoMapView,tipoCotizacion:activa.tipoCotizacion,requerimientoCliente:activa.requerimientoCliente,incluyeTexto:activa.incluyeTexto || "",propuestaNombre:activa.nombre,propuestaAlcance:activa.alcance,propuestas:propuestasFinales,propuestaActivaId:activa.id,fotosCotizacion:activa.fotos||[],estado:prev?.estado || "Pendiente",obraId:prev?.obraId || null};
    setCotizaciones((prevList)=>editCot ? prevList.map((cotizacion)=>cotizacion.id===editCot?{...cotizacion,...data}:cotizacion) : [...prevList,data]);
    setPropuestas(propuestasFinales);
    setEditCot(data.id);
    if(volverALista) setTab("lista");
    return data;
  };

  const guardarCotizacion = ()=>persistCotizacion({volverALista:true});

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
      nit:"",
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
      return <div style={{padding:28}}><H1 title={`Cotización ${previewCot.numero || previewCot.id}`} subtitle="Vista completa del documento comercial" action={<div style={{display:"flex",gap:10}}><button style={B("#f1f5f9","#475569")} onClick={()=>setPreviewCot(null)}>Volver</button><button style={B("#dbeafe","#1e40af")} onClick={()=>{setEditCot(previewCot.id);hydrate(previewCot);setTab("form");setPreviewCot(null);}}>Editar</button><button style={B("#f47c20")} onClick={()=>openCotizacionPrint(previewCot)}>Imprimir PDF</button></div>}/><CotizacionPrint c={previewCot}/></div>;
    }
    return (
      <div style={{padding:28}}>
        <H1 title="Cotizaciones" subtitle="Ubicación, medición y propuestas comerciales por cliente" action={<button style={B("#f47c20")} onClick={nuevaCotizacion}>+ Nueva Cotización</button>}/>
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
                          <button style={{...B("#2d1414","#ef4444"),fontSize:10,padding:"5px 10px"}} onClick={()=>openCotizacionPrint(cotizacion)}>PDF</button>
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
            <button style={{...B("#dbeafe","#1e40af"),justifyContent:"center"}} onClick={()=>{const saved=guardarCotizacion();if(saved){setPreviewCot(saved);setTab("lista");}}}>Guardar y ver</button>
            <button style={{...B("#f47c20"),justifyContent:"center"}} onClick={guardarCotizacion}>{editCot?"Actualizar":"Guardar"}</button>
          </div>
        }
      />

      {/* Identificación */}
      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>Identificación</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
          <div><LBL>N° Cotización</LBL><input value={cot} onChange={e=>setCot(e.target.value)} style={SI}/></div>
          <div><LBL>Fecha</LBL><input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={SI}/></div>
          <div><LBL>Válida (días)</LBL><input type="number" value={val} onChange={e=>setVal(Number(e.target.value))} style={SI}/></div>
        </div>
      </div>

      {/* Cliente */}
      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>Cliente</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <div><LBL>Empresa</LBL><input value={cl.nombre} onChange={e=>setCl({...cl,nombre:e.target.value})} style={SI}/></div>
          <div><LBL>Contacto</LBL><input value={cl.contacto} onChange={e=>setCl({...cl,contacto:e.target.value})} style={SI}/></div>
          <div><LBL>Obra</LBL><input value={cl.obra} onChange={e=>setCl({...cl,obra:e.target.value})} style={SI}/></div>
          <div><LBL>Teléfono</LBL><input value={cl.telefono} onChange={e=>setCl({...cl,telefono:e.target.value})} style={SI}/></div>
          <div><LBL>Ciudad</LBL><input value={cl.ciudad} onChange={e=>setCl({...cl,ciudad:e.target.value})} style={SI}/></div>
        </div>
      </div>

      <div style={{...CD,marginBottom:14}}>
        <div style={ST}>Texto inicial del documento</div>
        <textarea
          value={textoInicial}
          onChange={e=>setTextoInicial(e.target.value)}
          placeholder={"Ej: Presentamos la cotización para la instalación de puntos de anclaje o línea de vida sobre la cubierta del Éxito de Niquia en Bello."}
          style={{...SI,minHeight:110,resize:"vertical",lineHeight:1.6}}
        />
        <div style={{fontSize:11,color:"#64748b",marginTop:8}}>
          Este texto saldrá al inicio del PDF y de la vista previa. Lo puedes redactar manualmente para cada cliente.
        </div>
      </div>

      {/* Selector de propuestas */}
      <div style={{...CD,marginBottom:14,border:"2px solid #142840"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={ST}>Propuestas</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{const next=[...propuestasSnapshot,buildQuoteProposal({id:createQuoteProposalId(String(propuestasSnapshot.length+1)),nombre:getQuoteProposalLabel(propuestasSnapshot.length),formaPago:DEFAULT_COT_FORMA_PAGO,tiempoEjec:DEFAULT_COT_TIEMPO_EJEC,util:10,items:[],incluyeTexto:""},propuestasSnapshot.length)];setPropuestas(next);applyProposal(next[next.length-1]);}} style={{...B("#f47c20"),fontSize:11,padding:"5px 14px"}}>+ Nueva</button>
            <button onClick={()=>{const next=[...propuestasSnapshot,buildQuoteProposal({...proposalSnapshot,id:createQuoteProposalId(String(propuestasSnapshot.length+1)),nombre:`${proposalSnapshot.nombre} copia`},propuestasSnapshot.length)];setPropuestas(next);applyProposal(next[next.length-1]);}} style={{...B("#dbeafe","#1e40af"),fontSize:11,padding:"5px 14px"}}>Duplicar</button>
          </div>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
          {propuestasSnapshot.map((propuesta)=>{
            const esActiva = propuesta.id===propuestaActivaId;
            return (
              <div key={propuesta.id} style={{flex:"1 1 180px",position:"relative",borderRadius:12,border:`2px solid ${esActiva?"#f47c20":"#dbe5f0"}`,background:esActiva?"#fff7ed":"#f8fafc",overflow:"hidden"}}>
                <div onClick={()=>{setPropuestas(propuestasSnapshot);applyProposal(propuesta);}} style={{textAlign:"left",padding:"12px 14px 10px",cursor:"pointer"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#1a1a2e",marginBottom:3,paddingRight:22}}>{propuesta.nombre}</div>
                  <div style={{fontSize:10,color:"#64748b",marginBottom:5}}>{propuesta.tipoCotizacion==="obra_blanca"?"Obra blanca":propuesta.tipoCotizacion==="puntos_anclaje"?"Puntos de anclaje":"Línea de vida"}</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#cc0000"}}>{fmt(Number(esActiva?tot:propuesta.total)||0)}</div>
                </div>
                {propuestasSnapshot.length > 1 && (
                  <button
                    title="Eliminar propuesta"
                    onClick={(e)=>{
                      e.stopPropagation();
                      if(!window.confirm(`¿Eliminar "${propuesta.nombre}"? Esta acción no se puede deshacer.`)) return;
                      const next = propuestasSnapshot.filter(p=>p.id!==propuesta.id);
                      setPropuestas(next);
                      if(esActiva) applyProposal(next[0]);
                    }}
                    style={{position:"absolute",top:6,right:6,background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,width:20,height:20,cursor:"pointer",fontSize:13,lineHeight:1,padding:0,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}
                  >×</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Propuesta activa */}
      <div style={{...CD,marginBottom:14,border:"2px solid #f47c20"}}>
        <div style={{fontSize:11,fontWeight:700,color:"#f47c20",textTransform:"uppercase",letterSpacing:1,marginBottom:18}}>Propuesta activa</div>

        {/* 1. Nombre y tipo */}
        <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:12,marginBottom:18}}>
          <div><LBL>Nombre de la propuesta</LBL><input value={nombrePropuesta} onChange={e=>setNombrePropuesta(e.target.value)} style={SI}/></div>
          <div>
            <LBL>Tipo</LBL>
            <div style={{display:"flex",gap:8}}>
              {[["linea_vida","Línea de vida"],["puntos_anclaje","Puntos de anclaje"],["obra_blanca","Obra blanca"]].map(([v,l])=>(
                <button key={v} onClick={()=>setTipoCotizacion(v)} style={{...B(tipoCotizacion===v?"#f47c20":"#142840",tipoCotizacion===v?"#fff":"#7da5c8"),flex:1,justifyContent:"center",border:"2px solid "+(tipoCotizacion===v?"#f47c20":"#1a3050"),fontSize:11,fontWeight:700,padding:"7px 4px"}}>{l}</button>
              ))}
            </div>
          </div>
        </div>

        {/* 2. Descripción / texto comercial */}
        <div style={{marginBottom:18}}>
          <LBL>Descripción / texto de la propuesta</LBL>
          <textarea value={alcancePropuesta} onChange={e=>setAlcancePropuesta(e.target.value)} placeholder="Describe el servicio, materiales y alcance de esta propuesta..." style={{...SI,minHeight:130,resize:"vertical",lineHeight:1.7}}/>
        </div>

        {tipoCotizacion==="obra_blanca"&&(
          <div style={{marginBottom:18}}>
            <LBL>Necesidad del cliente</LBL>
            <textarea value={requerimientoCliente} onChange={e=>setRequerimientoCliente(e.target.value)} style={{...SI,minHeight:100,resize:"vertical",lineHeight:1.5}}/>
          </div>
        )}

        <div style={{marginBottom:18}}>
          <LBL>Esta cotización incluye</LBL>
          <textarea value={incluyeTexto} onChange={e=>setIncluyeTexto(e.target.value)} placeholder="Texto predeterminado editable" style={{...SI,minHeight:120,resize:"vertical",lineHeight:1.6}}/>
        </div>

        {/* 3. Fotos */}
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>Fotos de la propuesta</span>
            <span style={{fontSize:10,color:"#94a3b8"}}>Se imprimen en el PDF</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {fotosActivaPropuesta.map((f,i)=>(
              <div key={f.id} style={{borderRadius:8,overflow:"hidden",border:"1px solid #e2e8f0",background:"#f8fafc"}}>
                <div style={{background:"#fff",padding:6}}>
                  <img src={f.src} alt={f.label||`Foto ${i+1}`} style={{width:"100%",height:"auto",display:"block",borderRadius:4}}/>
                </div>
                <div style={{padding:"6px 8px",display:"flex",gap:4,alignItems:"center"}}>
                  <input value={f.label||""} onChange={e=>setFotosActivaPropuesta(prev=>prev.map(item=>item.id===f.id?{...item,label:e.target.value}:item))} placeholder={`Foto ${i+1}`} style={{...SI,fontSize:11,padding:"3px 6px",flex:1}}/>
                  <button onClick={()=>setFotosActivaPropuesta(prev=>prev.filter(item=>item.id!==f.id))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,width:22,height:22,cursor:"pointer",fontSize:14,flexShrink:0,lineHeight:1}}>×</button>
                </div>
              </div>
            ))}
            <div onClick={()=>fotosRef.current.click()} style={{border:"2px dashed #f47c20",borderRadius:10,minHeight:140,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"#fff8f3",color:"#f47c20",fontWeight:600,gap:6}}>
              <span style={{fontSize:24,lineHeight:1}}>+</span>
              <span style={{fontSize:12}}>Agregar foto</span>
            </div>
          </div>
          <input ref={fotosRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={e=>{Array.from(e.target.files||[]).forEach(file=>{const r=new FileReader();r.onload=(ev)=>setFotosActivaPropuesta(prev=>[...prev,{id:Date.now()+Math.random(),src:ev.target.result,label:""}]);r.readAsDataURL(file);});e.target.value="";}}/>
        </div>

        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>Medición automática con Google Maps</span>
            <div style={{display:"flex",gap:8}}>
              <button
                type="button"
                onClick={()=>setMedicionAutomaticaActiva((prev)=>!prev)}
                style={{...B(medicionAutomaticaActiva?"#166534":"#dbeafe",medicionAutomaticaActiva?"#ecfdf5":"#1e40af"),fontSize:11,padding:"5px 12px",border:"1px solid " + (medicionAutomaticaActiva?"#166534":"#93c5fd")}}
              >
                {medicionAutomaticaActiva ? "Desactivar medición" : "Activar medición"}
              </button>
              {autoMapImg && (
                <button
                  type="button"
                  onClick={()=>setFotosActivaPropuesta((prev)=>[...prev,{id:Date.now()+Math.random(),src:autoMapImg,label:"Mapa Google Maps"}])}
                  style={{...B("#fff7ed","#c2410c"),fontSize:11,padding:"5px 12px",border:"1px solid #fdba74"}}
                >
                  Agregar mapa como foto
                </button>
              )}
            </div>
          </div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>
            Esta medición queda amarrada solo a la propuesta activa. Si cambias a otra propuesta, tendrá su propio mapa y sus propios tramos.
          </div>
          {medicionAutomaticaActiva ? (
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:14}}>
              <GoogleMeasureWorkspace queryValue={cl.coords||`${cl.obra||""} ${cl.ciudad||""}`.trim()} onQueryChange={(value)=>setCl({...cl,coords:value})} measurements={geoMediciones} onChange={setGeoMediciones} mapView={geoMapView} onMapViewChange={setGeoMapView}/>
            </div>
          ) : (
            <div style={{background:"#f8fafc",border:"1px dashed #cbd5e1",borderRadius:12,padding:"18px 16px",fontSize:12,color:"#64748b",textAlign:"center"}}>
              Activa la medición automática si esta propuesta necesita mapa satelital o tramos medidos con Google Maps.
            </div>
          )}
        </div>

        {/* 4. Detalle económico */}
        <div style={{marginBottom:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <span style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>Detalle económico</span>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{const nuevos=measurementsToQuoteItems(geoMediciones);setItems(nuevos.map((item,index)=>({...item,id:index+1})));setNid(nuevos.length+1);}} style={{...B("#dbeafe","#1e40af"),fontSize:11,padding:"5px 12px"}}>Jalar mediciones</button>
              <button onClick={()=>setShowDB(!showDB)} style={{...B(showDB?"#1a3050":"transparent","#f47c20"),border:"1px solid #cc0000",fontSize:11,padding:"5px 12px"}}>{showDB?"Cerrar catálogo":"Catálogo"}</button>
            </div>
          </div>

          {showDB&&(
            <div style={{background:"#f8fafc",borderRadius:10,padding:16,marginBottom:14,border:"1px solid #f47c2044"}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:12}}>{ITEMS_DB.map((cat,i)=><button key={i} onClick={()=>setDbCat(i)} style={{...B(dbCat===i?"#f47c20":"#142840",dbCat===i?"#fff":"#7da5c8"),border:`1px solid ${dbCat===i?"#f47c20":"#1a3050"}`,fontSize:11,padding:"5px 12px"}}>{cat.categoria}</button>)}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{ITEMS_DB[dbCat].items.map((it,i)=><div key={i} style={{background:"#f1f5f9",borderRadius:8,padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:"#1a1a2e",marginBottom:2}}>{it.desc}</div><div style={{fontSize:11,color:"#475569"}}>{it.unit} · {fmt(it.vu)}</div></div><button onClick={()=>{setItems(prev=>[...prev,{id:nid,desc:it.desc,cant:1,unit:it.unit,vu:it.vu}]);setNid(prev=>prev+1);}} style={{...B("#f47c20"),padding:"5px 12px",fontSize:12,flexShrink:0}}>+</button></div>)}</div>
            </div>
          )}

          {/* Tabla de ítems */}
          <div style={{border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden",marginBottom:10}}>
            <div style={{display:"grid",gridTemplateColumns:"3fr 0.65fr 0.75fr 1.1fr 1.1fr 28px",background:"#1a2840",color:"#94a3b8",fontSize:10,textTransform:"uppercase",padding:"9px 12px",letterSpacing:0.5}}>
              <span>Descripción</span><span>Cant.</span><span>Unidad</span><span>Valor unit.</span><span style={{textAlign:"right"}}>Subtotal</span><span/>
            </div>
            {items.map((it,idx)=>(
              <div key={it.id} style={{display:"grid",gridTemplateColumns:"3fr 0.65fr 0.75fr 1.1fr 1.1fr 28px",alignItems:"center",padding:"5px 10px",background:idx%2===0?"#f8fafc":"#fff",borderTop:"1px solid #f1f5f9"}}>
                <input value={it.desc} onChange={e=>setItems(prev=>prev.map(item=>item.id===it.id?{...item,desc:e.target.value}:item))} style={{...SI,fontSize:12,padding:"5px 7px"}}/>
                <input type="number" value={it.cant} onChange={e=>setItems(prev=>prev.map(item=>item.id===it.id?{...item,cant:parseFloat(e.target.value)||0}:item))} style={{...SI,fontSize:12,padding:"5px 7px"}}/>
                <input value={it.unit} onChange={e=>setItems(prev=>prev.map(item=>item.id===it.id?{...item,unit:e.target.value}:item))} style={{...SI,fontSize:12,padding:"5px 7px"}}/>
                <input type="number" value={it.vu} onChange={e=>setItems(prev=>prev.map(item=>item.id===it.id?{...item,vu:parseFloat(e.target.value)||0}:item))} style={{...SI,fontSize:12,padding:"5px 7px"}}/>
                <div style={{textAlign:"right",fontSize:12,fontWeight:600,color:"#cc0000",paddingRight:4}}>{fmt(it.cant*it.vu)}</div>
                <button onClick={()=>setItems(prev=>prev.filter(item=>item.id!==it.id))} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:16,padding:0,lineHeight:1}}>×</button>
              </div>
            ))}
            {items.length===0&&<div style={{padding:"18px 12px",textAlign:"center",fontSize:12,color:"#94a3b8"}}>Sin ítems — agrega desde catálogo o manualmente</div>}
          </div>

          <button onClick={()=>{setItems(prev=>[...prev,{id:nid,desc:"",cant:1,unit:"ML",vu:0}]);setNid(prev=>prev+1);}} style={{...B("#fff3e8","#f47c20"),border:"1px dashed #cc0000",width:"100%",justifyContent:"center",marginBottom:16,fontSize:12}}>+ Agregar ítem manual</button>

          {/* Tabla de totales */}
          <div style={{border:"1px solid #e2e8f0",borderRadius:10,overflow:"hidden"}}>
            {[["SUBTOTAL",sub],["ADMINISTRACIÓN",0],["IMPREVISTOS",0],["UTILIDAD "+util+"%",ut],["IVA SOBRE LA UTILIDAD (19%)",iva]].map(([lbl,v])=>(
              <div key={lbl} style={{display:"flex",justifyContent:"space-between",padding:"9px 14px",borderBottom:"1px solid #f1f5f9",fontSize:12,color:"#475569"}}>
                <span>{lbl}</span><span style={{fontWeight:500,color:"#1a1a2e"}}>{v?fmt(v):"$  -"}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"12px 14px",background:"#1a2840"}}>
              <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>TOTAL</span>
              <span style={{fontSize:15,fontWeight:700,color:"#f47c20"}}>{fmt(tot)}</span>
            </div>
            <div style={{padding:"6px 14px",fontSize:10,color:"#94a3b8",textAlign:"center",background:"#f8fafc"}}>EL IVA ES EL 19% DE LA UTILIDAD</div>
          </div>

          <div style={{marginTop:12,display:"grid",gridTemplateColumns:"120px 1fr",gap:12,alignItems:"end"}}>
            <div><LBL>Utilidad %</LBL><input type="number" value={util} onChange={e=>setUtil(Number(e.target.value))} style={SI}/></div>
            <div style={{fontSize:11,color:"#64748b",paddingBottom:10}}>Ajusta el porcentaje de utilidad para recalcular el total</div>
          </div>
        </div>

        {/* 5. Condiciones comerciales */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,paddingTop:4,borderTop:"1px solid #f1f5f9"}}>
          <div><LBL>Forma de pago</LBL><input value={formaPago} onChange={e=>setFormaPago(e.target.value)} style={SI}/></div>
          <div><LBL>Tiempo de ejecución</LBL><input value={tiempoEjec} onChange={e=>setTiempoEjec(e.target.value)} style={SI}/></div>
        </div>
        <div style={{marginTop:12}}>
          <LBL>Observaciones / condiciones adicionales</LBL>
          <textarea
            value={observacionesCot}
            onChange={e=>setObservacionesCot(e.target.value)}
            placeholder="Ej: El pago se realiza contra entrega de acta parcial. Incluye transporte de materiales..."
            style={{...SI,minHeight:80,resize:"vertical",lineHeight:1.6}}
          />
          <div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Este texto aparece en las condiciones comerciales del PDF</div>
        </div>
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
  );
}

// ======================================================
// HELPERS
// ======================================================



export default function App(){
  return (
    <AppDataProvider>
      <AppShell/>
    </AppDataProvider>
  );
}

function AppShell(){
  const ctx = useAppData();
  const { scr, setScr } = ctx;
  const [open,setOpen]=useState(true);

  const navSections=[
    {
      title:"General",
      items:[
        {id:"dashboard",l:"Dashboard",i:"■"},
      ],
    },
    {
      title:"Comercial y Proyectos",
      items:[
        {id:"cotizacion",l:"Cotizaciones",i:"CT"},
        {id:"clientes",l:"Clientes",i:"CL"},
        {id:"obras",l:"Ejecucion de Obra",i:"OB"},
        {id:"pagos",l:"Cuentas por cobrar",i:"PG"},
      ],
    },
    {
      title:"Calidad y Entregables",
      items:[
        {id:"certificaciones",l:"Certificaciones",i:"CF"},
        {id:"vencimientos",l:"Vencimientos de Certificaciones",i:"AL"},
        {id:"informes",l:"Informes de Actividades",i:"IN"},
      ],
    },
    {
      title:"Administracion",
      items:[
        {id:"proveedores",l:"Causación / Facturas y Gastos",i:"CP"},
        {id:"contabilidad",l:"Contabilidad",i:"CO"},
        {id:"nomina",l:"Nomina y Empleados",i:"NO"},
        {id:"horarios",l:"Horarios",i:"HR"},
        {id:"financiero",l:"Informe Financiero",i:"IF"},
      ],
    },
  ];

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'Aptos','Segoe UI',sans-serif",background:"#f0f2f5",color:"#1a1a2e",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=Aptos:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
      <style>{'select option{background:#ffffff;color:#1e293b}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#f0f2f5}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}@media print{@page{size:Letter;margin:12mm}html,body{margin:0!important;padding:0!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}body *{visibility:hidden!important}#pz,#pz *{visibility:visible!important}#pz{position:relative!important;left:auto!important;top:auto!important;width:auto!important;max-width:none!important;margin:0!important;padding:0!important;border:none!important;border-radius:0!important;box-shadow:none!important;background:#fff!important;overflow:visible!important}.no-print{display:none!important}.print-avoid-break,table,tr,td,th{break-inside:avoid;page-break-inside:avoid}}'}</style>
      <aside style={{width:open?230:64,background:"#ffffff",borderRight:"1px solid #e2e8f0",display:"flex",flexDirection:"column",transition:"width 0.25s",flexShrink:0,overflowX:"hidden",boxShadow:"2px 0 8px rgba(0,0,0,0.06)"}}>
        <div onClick={()=>setOpen(!open)} style={{padding:"16px 14px",borderBottom:"1px solid #f1f5f9",display:"flex",alignItems:"center",gap:10,cursor:"pointer",overflow:"hidden",background:"#fff"}}>
          <div style={{width:40,height:40,background:"#fff",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:3,border:"1px solid #f1f5f9"}}><img src={LOGO_INGEANCLAJES} alt="Logo" style={{width:"100%",height:"100%",objectFit:"contain"}}/></div>
          {open&&<div><div style={{fontWeight:700,fontSize:13,color:"#cc0000",whiteSpace:"nowrap"}}>INGEANCLAJES</div><div style={{fontSize:10,color:"#94a3b8"}}>Sistema v3.0</div></div>}
        </div>
        <nav style={{flex:1,padding:"8px 6px",overflowY:"auto"}}>
          {navSections.map(section=>(
            <div key={section.title} style={{marginBottom:10}}>
              {open&&(
                <div style={{padding:"10px 10px 6px",fontSize:10,fontWeight:700,letterSpacing:0.8,color:"#94a3b8",textTransform:"uppercase"}}>
                  {section.title}
                </div>
              )}
              {section.items.map(item=>{const a=scr===item.id;return(
                <button key={item.id} onClick={()=>setScr(item.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:8,padding:"9px 10px",borderRadius:8,border:"none",cursor:"pointer",background:a?"#cc0000":"transparent",color:a?"#fff":"#475569",marginBottom:2,textAlign:"left",overflow:"hidden",whiteSpace:"nowrap"}}>
                  <span style={{fontSize:15,flexShrink:0}}>{item.i}</span>
                  {open&&<span style={{fontSize:12,fontWeight:a?600:400}}>{item.l}</span>}
                </button>
              );})}
            </div>
          ))}
        </nav>
        <div style={{padding:"10px 8px",borderTop:"1px solid #f1f5f9"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",overflow:"hidden"}}>
            <Av init="MC" size={28}/>
            {open&&<div><div style={{fontSize:12,color:"#1a1a2e",whiteSpace:"nowrap"}}>Maria Camila Sepulveda</div><div style={{fontSize:10,color:"#94a3b8"}}>Directora Comercial</div></div>}
          </div>
        </div>
      </aside>
      <main style={{flex:1,overflow:"auto",background:"#f0f2f5"}}>
        {scr==="dashboard"&&<Dashboard ctx={ctx} go={setScr}/>}
        {scr==="cotizacion"&&<Cotizacion ctx={ctx}/>}
        {scr==="clientes"&&<ClientesDB ctx={ctx}/>}
        {scr==="pagos"&&<Pagos ctx={ctx}/>}
        {scr==="obras"&&<Obras ctx={ctx}/>}
        {scr==="certificaciones"&&<Certificaciones ctx={ctx}/>}
        {scr==="informes"&&<Informes ctx={ctx}/>}
        {scr==="proveedores"&&<CuentasPagar ctx={ctx}/>}
        {scr==="contabilidad"&&<Contabilidad ctx={ctx}/>}
        {scr==="financiero"&&<Financiero ctx={ctx}/>}
        {scr==="nomina"&&<Nomina ctx={ctx}/>}
        {scr==="horarios"&&<Horarios ctx={ctx}/>}
        {scr==="vencimientos"&&<Vencimientos ctx={ctx}/>}
      </main>
    </div>
  );
}

// ======================================================
// DASHBOARD
function CotizacionPrint({c}){
  if(!c) return null;
  const propuestas = getQuotePrintableProposals(c);
  const textoInicial = String(c.textoInicial || "").trim();
  const mapQuery = c.coords || `${c.obra||""} ${c.ciudad||""}`.trim();

  return(
    <div
      id="pz"
      className="doc-shell"
      style={{
        width:"216mm",
        minHeight:"279mm",
        maxWidth:"216mm",
        margin:"0 auto",
        background:"#fff",
        color:"#111",
        fontFamily:"'Aptos','Segoe UI',sans-serif",
        fontSize:12,
        lineHeight:1.45,
        border:"1px solid #d6dde6",
        boxShadow:"0 10px 30px rgba(15,23,42,0.08)",
        padding:"14mm 16mm 16mm 16mm",
      }}
    >
      <div style={{marginBottom:14}}><PrintHeader dual={false}/></div>
      <div style={{textAlign:"center",fontSize:10,fontWeight:700,letterSpacing:3,marginBottom:16}}>ESPECIALISTAS EN ANCLAJES</div>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:14,fontSize:12}}><div>Envigado, {fmtL(c.fecha)}</div><div><strong>COTIZACION No. {c.numero}</strong></div></div>
      <div style={{marginBottom:12}}>
        <div><strong>SEÑOR:</strong> {(c.cliente||"").toUpperCase()}</div>
        {c.obra&&<div><strong>OBRA:</strong> {(c.obra||"").toUpperCase()}</div>}
        {c.telefono&&<div><strong>TELÉFONO:</strong> {c.telefono}</div>}
        {c.ciudad&&<div><strong>{(c.ciudad||"").toUpperCase()}</strong></div>}
      </div>
      {textoInicial && (
        <div style={{background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:6,padding:"12px 14px",marginBottom:16}}>
          <div style={{whiteSpace:"pre-wrap"}}>{textoInicial}</div>
        </div>
      )}
      {propuestas.map((propuesta, idx)=>{
        const propMapSrc = propuesta.mapImg || null;
        return (
        <div key={propuesta.id} style={{marginTop:idx===0?0:24,paddingTop:idx===0?0:20,borderTop:idx===0?"none":"2px solid #e2e8f0",pageBreakBefore:idx===0?"auto":"always"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:12,marginBottom:4}}>
            <div style={{fontWeight:800,textTransform:"uppercase",fontSize:16,color:"#1a1a2e"}}>{propuesta.nombre}</div>
            <div style={{fontWeight:800,color:"#cc0000",fontSize:15}}>{fmt(propuesta.tot)}</div>
          </div>
          <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>{propuesta.tipoLabel}</div>

          {propuesta.requerimientoCliente && (
            <div style={{background:"#f8fafc",border:"1px solid #cbd5e1",borderRadius:6,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontWeight:800,textTransform:"uppercase",marginBottom:8}}>Necesidad del cliente</div>
              <div style={{whiteSpace:"pre-wrap"}}>{propuesta.requerimientoCliente}</div>
            </div>
          )}

          {propuesta.alcancePropuesta && (
            <div style={{background:"#fff8f3",border:"1px solid #fdba74",borderRadius:6,padding:"12px 14px",marginBottom:12}}>
              <div style={{fontWeight:800,textTransform:"uppercase",marginBottom:8}}>Alcance de la propuesta</div>
              <div style={{whiteSpace:"pre-wrap"}}>{propuesta.alcancePropuesta}</div>
            </div>
          )}

          {propuesta.fotos.length>0&&(
            <div style={{marginBottom:16}}>
              <div style={{fontWeight:800,textTransform:"uppercase",marginBottom:8}}>Registro fotográfico</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                {propuesta.fotos.map((foto,fotoIdx)=>(
                  <div key={foto.id||fotoIdx} style={{border:"1px solid #cbd5e1",borderRadius:6,overflow:"hidden",background:"#fff"}}>
                    <img src={foto.src} alt={foto.label||"Foto " + (fotoIdx+1)} style={{width:"100%",height:"auto",display:"block"}}/>
                    <div style={{padding:"8px 10px",fontSize:11,color:"#475569",textAlign:"center"}}>{foto.label||"Foto " + (fotoIdx+1)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {propMapSrc && (
            <div style={{marginBottom:16,textAlign:"center"}}>
              <div style={{fontWeight:800,textTransform:"uppercase",marginBottom:8,textAlign:"left"}}>Medición satelital</div>
              <StaticMapPreview src={propMapSrc} segments={propuesta.measurements} query={mapQuery} mapView={propuesta.quote.geoMapView||c.geoMapView} alt="Mapa" maxHeight={360} border="1px solid #ddd" borderRadius={4} />
            </div>
          )}

          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11.3,marginBottom:14}}>
            <thead><tr>{["Descripción","Cantidad","Unidad","Valor","Subtotal"].map((h,i)=><th key={h} style={{border:"1px solid #222",padding:"7px 8px",background:"#f7f7f7",textAlign:i>0?"right":"left"}}>{h}</th>)}</tr></thead>
            <tbody>
              {propuesta.items.map((it,i)=><tr key={i}><td style={{border:"1px solid #222",padding:"7px 8px"}}>{it.desc}</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{it.cant}</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{it.unit}</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{fmt(it.vu)}</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{fmt((Number(it.cant)||0)*(Number(it.vu)||0))}</td></tr>)}
              <tr><td colSpan={4} style={{border:"1px solid #222",padding:"7px 8px",fontWeight:700}}>SUBTOTAL</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right",fontWeight:700}}>{fmt(propuesta.sub)}</td></tr>
              <tr><td colSpan={4} style={{border:"1px solid #222",padding:"7px 8px"}}>UTILIDADES ({propuesta.quote.util||10}% VALOR DE LA OBRA)</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{fmt(propuesta.ut)}</td></tr>
              <tr><td colSpan={4} style={{border:"1px solid #222",padding:"7px 8px"}}>IVA (19% VALOR DE LAS UTILIDADES)</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right"}}>{fmt(propuesta.iva)}</td></tr>
              <tr><td colSpan={4} style={{border:"1px solid #222",padding:"7px 8px",background:"#fff369",fontWeight:800}}>TOTAL</td><td style={{border:"1px solid #222",padding:"7px 8px",textAlign:"right",background:"#fff369",fontWeight:800}}>{fmt(propuesta.tot)}</td></tr>
            </tbody>
          </table>
        </div>
        );
      })}
    </div>
  );
}

// =+
// PLANOS — con medición sobre imagen satelital
// ======================================================
function Planos({ctx}){
  const {obras,setObras,empleados,cotizaciones,setCotDraft,setScr}=ctx;
  const [sel,setSel]=useState(null);
  const [imgPlano,setImgPlano]=useState(null);
  const [trazosForm,setTrazosForm]=useState({tipo:"LVH",ml:0,label:""});
  const [lineas,setLineas]=useState([]);
  const [geoMediciones,setGeoMediciones]=useState([]);
  const [geoMapView,setGeoMapView]=useState(null);
  const [coordsInput,setCoordsInput]=useState("");
  const [tabPlano,setTabPlano]=useState("imagen");
  const [drag,setDrag]=useState(null);
  const imgRef=useRef();
  const manualSvgRef=useRef();

  const cotVinc = sel ? cotizaciones.find(c=>c.id===sel.cotizacionId) : null;

  useEffect(()=>{
    if(!drag) return;
    const stop=()=>setDrag(null);
    window.addEventListener("mouseup", stop);
    return ()=>window.removeEventListener("mouseup", stop);
  },[drag]);

  const abrirObra=(o)=>{
    const linked = cotizaciones.find(c=>c.id===o.cotizacionId);
    setSel(o);
    setImgPlano(o.imgPlano||null);
    setLineas((o.trazos||[]).map((t,i)=>({id:t.id||"ln-" + (i) + "-" + (Date.now()), ...t})));
    setGeoMediciones(o.geoMediciones||linked?.geoMediciones||[]);
    setGeoMapView(o.geoMapView||linked?.geoMapView||null);
    setCoordsInput(o.coords||linked?.coords||"");
    setDrag(null);
    setTabPlano("imagen");
  };

  const guardarEnObra=(patch={})=>{
    if(!sel) return;
    setObras(prev=>prev.map(o=>o.id===sel.id?{...o,...patch}:o));
    setSel(prev=>prev?{...prev,...patch}:prev);
  };

  const persistLineas=(nuevas)=>{ setLineas(nuevas); guardarEnObra({trazos:nuevas}); };
  const persistGeo=(nuevas)=>{ setGeoMediciones(nuevas); guardarEnObra({geoMediciones:nuevas, imgSat: buildGoogleStaticMapUrl(nuevas, coordsInput || sel?.coords || cotVinc?.coords || "", geoMapView), geoMapView}); };

  const agregarLinea=()=>{
    if(!trazosForm.ml||!trazosForm.label)return;
    const nueva={id:Date.now(),tipo:trazosForm.tipo,ml:trazosForm.ml,label:trazosForm.label,x1:50,y1:50+lineas.length*40,x2:50+Math.max(80,trazosForm.ml*3),y2:50+lineas.length*40};
    persistLineas([...lineas,nueva]);
    setTrazosForm({tipo:"LVH",ml:0,label:""});
  };

  const eliminarLinea=(id)=>persistLineas(lineas.filter(l=>l.id!==id));

  const toSvgPoint=(e, svgEl)=>{
    if(!svgEl) return {x:0,y:0};
    const rect=svgEl.getBoundingClientRect();
    const vb=svgEl.viewBox.baseVal;
    const scaleX=(vb.width||600)/rect.width;
    const scaleY=(vb.height||400)/rect.height;
    return {x:Math.round((e.clientX-rect.left)*scaleX), y:Math.round((e.clientY-rect.top)*scaleY)};
  };
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  const moveItem=(item, part, dx, dy, maxX, maxY)=>{
    let {x1,y1,x2,y2}=item;
    if(part==="start"){ x1=clamp(x1+dx,0,maxX); y1=clamp(y1+dy,0,maxY); }
    else if(part==="end"){ x2=clamp(x2+dx,0,maxX); y2=clamp(y2+dy,0,maxY); }
    else { x1=clamp(x1+dx,0,maxX); y1=clamp(y1+dy,0,maxY); x2=clamp(x2+dx,0,maxX); y2=clamp(y2+dy,0,maxY); }
    return {...item,x1,y1,x2,y2};
  };
  const iniciarDrag=(id,part,e)=>{ e.preventDefault(); e.stopPropagation(); const pt=toSvgPoint(e, manualSvgRef.current); const vb=manualSvgRef.current?.viewBox?.baseVal; setDrag({id,part,lastX:pt.x,lastY:pt.y,maxX:(vb?.width||600),maxY:(vb?.height||400)}); };
  const moverDrag=(e)=>{ if(!drag) return; const pt=toSvgPoint(e, manualSvgRef.current); const dx=pt.x-drag.lastX; const dy=pt.y-drag.lastY; if(!dx&&!dy) return; persistLineas(lineas.map(l=>l.id===drag.id?moveItem(l,drag.part,dx,dy,drag.maxX,drag.maxY):l)); setDrag(prev=>prev?{...prev,lastX:pt.x,lastY:pt.y}:prev); };
  const finalizarDrag=()=>setDrag(null);

  const onImgChange=(e)=>{const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=ev=>{ setImgPlano(ev.target.result); guardarEnObra({imgPlano:ev.target.result}); }; r.readAsDataURL(f);};
  const allLineas=[...lineas, ...geoMediciones.map((g,idx)=>({id:g.id||"geo-" + (idx), tipo:g.tipo, ml:g.ml, label:g.label}))];
  const totalML=allLineas.reduce((s,l)=>s+(parseFloat(l.ml)||0),0);

  const pasarACotizacion=()=>{
    const geoItems = measurementsToQuoteItems(geoMediciones);
    const manualItems = lineas.map((s,idx)=>({
      id: Date.now()+1000+idx,
      desc:s.label||"LINEA DE VIDA HORIZONTAL",
      cant:parseFloat(s.ml)||0,
      unit:s.tipo==="ESC"?"Metro":"ML",
      vu:s.tipo==="LVV"?320000:s.tipo==="ESC"?1200000:280000,
    }));
    setCotDraft&&setCotDraft({
      cliente: sel?.cliente||"",
      obra: sel?.proyecto||"",
      telefono: sel?.tel||"",
      ciudad: sel?.ciudad||"",
      coords: coordsInput || sel?.coords || cotVinc?.coords || "",
      mapImg: buildGoogleStaticMapUrl(geoMediciones, coordsInput || sel?.coords || cotVinc?.coords || "", geoMapView) || cotVinc?.mapImg || null,
      items: [...geoItems, ...manualItems],
      geoMediciones,
      geoMapView,
    });
    setScr&&setScr("cotizacion");
  };

  const renderShape = (shape)=>{
    const color=TC[shape.tipo]||"#60b4ff";
    const centerX=(shape.x1+shape.x2)/2;
    const centerY=(shape.y1+shape.y2)/2;
    return (
      <g key={shape.id}>
        <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={color} strokeWidth="4" strokeDasharray={shape.tipo==="CON"?"8,4":"none"} opacity="0.95" style={{cursor:"grab"}} onMouseDown={e=>iniciarDrag(shape.id,"line",e)} />
        <circle cx={shape.x1} cy={shape.y1} r={7} fill="#fff" stroke={color} strokeWidth="2.5" style={{cursor:"grab"}} onMouseDown={e=>iniciarDrag(shape.id,"start",e)} />
        <circle cx={shape.x2} cy={shape.y2} r={7} fill="#fff" stroke={color} strokeWidth="2.5" style={{cursor:"grab"}} onMouseDown={e=>iniciarDrag(shape.id,"end",e)} />
        <text x={centerX} y={centerY-10} fill={color} fontSize="11" textAnchor="middle" fontWeight="700" style={{paintOrder:"stroke",stroke:"#fff",strokeWidth:4,strokeLinejoin:"round"}}>{shape.label} ({shape.ml}ml)</text>
      </g>
    );
  };

  if(!sel){
    return(
      <div style={{padding:28}}>
        <H1 title="Planos & Medición" subtitle="La cotización es el origen de la ubicación y medición; aquí la continúas o la ajustas" />
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
          {obras.map(o=>{
            const linked = cotizaciones.find(c=>c.id===o.cotizacionId);
            const geos = o.geoMediciones || linked?.geoMediciones || [];
            return(
              <div key={o.id} onClick={()=>abrirObra(o)} style={{...CD,cursor:"pointer",border:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div><div style={{fontSize:11,color:"#94a3b8"}}>{o.id}</div><div style={{fontSize:14,fontWeight:700,color:"#1a1a2e",marginTop:2}}>{o.cliente}</div><div style={{fontSize:12,color:"#475569"}}>{o.proyecto}</div><div style={{fontSize:11,color:"#94a3b8",marginTop:2}}> {o.ciudad}</div></div>
                  <Badge estado={o.estado}/>
                </div>
                <div style={{marginTop:10,background:"#f1f5f9",borderRadius:6,padding:"6px 10px",fontSize:11,color:"#475569",display:"flex",justifyContent:"space-between"}}>
                  <span>{geos.length + (o.trazos||[]).length} trazos · {geos.length} automaticos</span>
                  <span style={{color:"#cc0000",fontWeight:600}}>Abrir plano</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return(
    <div style={{padding:28}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20,background:"#fff",borderRadius:14,padding:"16px 20px",border:"1px solid #e2e8f0",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
        <button onClick={()=>setSel(null)} style={{...B("#f1f5f9","#475569"),padding:"8px 16px",fontSize:13,flexShrink:0}}>Volver a obras</button>
        <div style={{flex:1}}><div style={{fontSize:11,color:"#94a3b8"}}>{sel.id} · Ciudad: {sel.ciudad || "No registrada"}</div><div style={{fontSize:20,fontWeight:700,color:"#1a1a2e"}}>{sel.cliente}</div><div style={{fontSize:13,color:"#475569"}}>{sel.proyecto}</div></div>
        <Badge estado={sel.estado}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
        {[["Total ML",(totalML) + " ML","#cc0000"],["Tramos automaticos",(geoMediciones.length),"#2563eb"],["Trazos manuales",(lineas.length),"#60b4ff"],["Valor total",fmt(sel.total),"#f47c20"]].map(([k,v,c])=>(<div key={k} style={{background:"#fff",borderRadius:10,padding:"12px 16px",border:"1px solid #e2e8f0",textAlign:"center"}}><div style={{fontSize:10,color:"#94a3b8",marginBottom:4}}>{k}</div><div style={{fontSize:15,fontWeight:700,color:c}}>{v}</div></div>))}
      </div>

      <div style={{display:"flex",gap:6,marginBottom:16}}>
        {[["imagen","Medicion automatica"],["svg","Plano de trazos"],["lista","Lista y cotizacion"]].map(([id,lb])=>(<button key={id} onClick={()=>setTabPlano(id)} style={{...B(tabPlano===id?"#cc0000":"#f1f5f9",tabPlano===id?"#fff":"#475569"),fontSize:12,padding:"8px 16px",border:"1px solid " + (tabPlano===id?"#cc0000":"#e2e8f0")}}>{lb}</button>))}
      </div>

      {tabPlano==="imagen" && (
        <div>
          <GoogleMeasureWorkspace queryValue={coordsInput} onQueryChange={(val)=>{ setCoordsInput(val); guardarEnObra({coords:val}); }} measurements={geoMediciones} onChange={persistGeo} mapView={geoMapView} onMapViewChange={(view)=>{ setGeoMapView(view); guardarEnObra({geoMapView:view}); }} />
          <div style={{...CD,marginTop:16}}>
            <div style={ST}>Imagen heredada para la obra / PDF</div>
                  {buildGoogleStaticMapUrl(geoMediciones, coordsInput, geoMapView) ? <StaticMapPreview src={buildGoogleStaticMapUrl(geoMediciones, coordsInput, geoMapView)} segments={geoMediciones} query={coordsInput} mapView={geoMapView} alt="Imagen heredada" border="none" borderRadius={8} /> : <div style={{background:"#f8fafc",border:"1px dashed #cbd5e1",borderRadius:8,padding:24,textAlign:"center",fontSize:12,color:"#64748b"}}>Mide el primer tramo y aquí aparecerá la imagen que viene de la cotización.</div>}
          </div>
        </div>
      )}

      {tabPlano==="svg" && (
        <div>
          <div style={{...CD,marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={ST}>Plano de trazos manual</div>
              <button onClick={()=>imgRef.current.click()} style={{...B("#f1f5f9","#475569"),fontSize:11,padding:"5px 10px"}}>Cargar imagen de fondo</button>
              <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}} onChange={onImgChange}/>
            </div>
            <div style={{background:"#f0f4f8",borderRadius:8,overflow:"hidden",position:"relative",border:"1px solid #e2e8f0"}}>
              <svg ref={manualSvgRef} viewBox="0 0 500 300" style={{width:"100%",display:"block"}} onMouseMove={moverDrag} onMouseUp={finalizarDrag} onMouseLeave={finalizarDrag}>
                {Array.from({length:16},(_,i)=><line key={"v" + (i)} x1={i*32} y1={0} x2={i*32} y2={300} stroke="#cbd5e1" strokeWidth="0.5"/>) }
                {Array.from({length:10},(_,i)=><line key={"h" + (i)} x1={0} y1={i*32} x2={500} y2={i*32} stroke="#cbd5e1" strokeWidth="0.5"/>) }
                {imgPlano&&<image href={imgPlano} x={0} y={0} width={500} height={300} opacity={0.45} preserveAspectRatio="xMidYMid slice"/>}
                {lineas.map(l=>renderShape(l))}
              </svg>
            </div>
          </div>
          <div style={{...CD,marginBottom:16}}>
            <div style={ST}>Agregar tramo manual</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:12,alignItems:"end"}}>
              <div><LBL>Tipo</LBL><select value={trazosForm.tipo} onChange={e=>setTrazosForm({...trazosForm,tipo:e.target.value})} style={SI}>{[["LVH","L.V. Horizontal"],["LVV","L.V. Vertical"],["CON","Conexión"],["ESC","Escalera"],["PAN","Punto anclaje"]].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
              <div><LBL>Metros lineales</LBL><input type="number" value={trazosForm.ml} onChange={e=>setTrazosForm({...trazosForm,ml:parseFloat(e.target.value)||0})} style={SI}/></div>
              <div style={{gridColumn:"span 2"}}><LBL>Etiqueta</LBL><input value={trazosForm.label} onChange={e=>setTrazosForm({...trazosForm,label:e.target.value})} style={SI}/></div>
              <button onClick={agregarLinea} style={B("#cc0000")}>+ Agregar</button>
            </div>
          </div>
        </div>
      )}

      {tabPlano==="lista" && (
        <div style={CD}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={ST}>Trazos registrados · Total: <span style={{color:"#cc0000"}}>{totalML} ML</span></div>
            <button onClick={pasarACotizacion} style={{...B("#4ade80","#0f2d1a"),fontSize:12}}>Llevar a cotizacion</button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f8fafc"}}>{["Fuente","Tipo","Descripción","Metros",""].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",color:"#64748b",fontWeight:500,fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {geoMediciones.map(seg=><tr key={seg.id} style={{borderBottom:"1px solid #f1f5f9",background:"#eff6ff"}}><td style={{padding:"8px 10px"}}><span style={{background:"#dbeafe",color:"#1d4ed8",borderRadius:4,padding:"2px 6px",fontSize:10}}>Google</span></td><td style={{padding:"8px 10px"}}>{seg.tipo}</td><td style={{padding:"8px 10px",fontWeight:500}}>{seg.label}</td><td style={{padding:"8px 10px",fontWeight:700,color:"#cc0000"}}>{Number(seg.ml||0).toFixed(2)} m</td><td style={{padding:"8px 10px"}}><button onClick={()=>persistGeo(geoMediciones.filter(x=>x.id!==seg.id))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:11}}>× Eliminar</button></td></tr>)}
              {lineas.map(t=><tr key={t.id} style={{borderBottom:"1px solid #f1f5f9"}}><td style={{padding:"8px 10px"}}><span style={{background:"#fef3c7",color:"#b45309",borderRadius:4,padding:"2px 6px",fontSize:10}}>Manual</span></td><td style={{padding:"8px 10px"}}>{t.tipo}</td><td style={{padding:"8px 10px",fontWeight:500}}>{t.label}</td><td style={{padding:"8px 10px",fontWeight:700,color:"#cc0000"}}>{t.ml} ML</td><td style={{padding:"8px 10px"}}><button onClick={()=>eliminarLinea(t.id)} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:5,padding:"3px 8px",cursor:"pointer",fontSize:11}}>× Eliminar</button></td></tr>)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Pagos({ctx}){
  const {obras,setObras,pagos,setPagos}=ctx;
  const [filtro,setFiltro]=useState("todas");
  const [pstep,setPstep]=useState(null);
  const [busquedaPago,setBusquedaPago]=useState("");
  const [obraPagoId,setObraPagoId]=useState("");
  const [guardandoAbono,setGuardandoAbono]=useState(false);
  const [vistaPago,setVistaPago]=useState("registro");
  const [abono,setAbono]=useState({
    tipo:"Abono manual",
    monto:"",
    fecha:today(),
    metodo:"Transferencia",
    notas:"",
  });

  const normalizarTexto = (valor="") =>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const pagosNormalizados = (Array.isArray(pagos) ? pagos : []).map((pago)=>({
    ...pago,
    monto:Number(pago?.monto ?? pago?.valor ?? 0),
    valor:Number(pago?.monto ?? pago?.valor ?? 0),
    metodo:pago?.metodo ?? pago?.medio ?? "",
    medio:pago?.metodo ?? pago?.medio ?? "",
    tipo:pago?.tipo ?? pago?.referencia ?? "Abono",
    estado:pago?.estado ?? "Pagado",
    fecha:pago?.fecha || today(),
  }));

  const obrasFiltradasBusqueda = obras.filter((obra)=>{
    const term = normalizarTexto(busquedaPago);
    if(!term) return true;
    return [obra.id, obra.cliente, obra.proyecto, obra.obra, obra.ciudad, obra.direccion]
      .some((campo)=>normalizarTexto(campo).includes(term));
  });

  const obraSeleccionada = obras.find((obra)=>obra.id===obraPagoId) || null;
  const pF = filtro==="todas" ? pagosNormalizados : pagosNormalizados.filter((p)=>p.obraId===filtro);
  const tCob = pagosNormalizados.filter((p)=>p.estado==="Pagado").reduce((s,p)=>s+Number(p.monto||0),0);
  const tPend = pagosNormalizados.filter((p)=>p.estado==="Pendiente").reduce((s,p)=>s+Number(p.monto||0),0);

  const actualizarSaldoObra = (obraId, montoAbono) => {
    if(!obraId || !Number.isFinite(montoAbono) || montoAbono<=0) return;
    setObras((prev)=>prev.map((obra)=>{
      if(obra.id!==obraId) return obra;
      const pagadoActual = Number(obra.pagado || 0);
      const totalActual = Number(obra.total || 0);
      const nuevoPagado = pagadoActual + montoAbono;
      const nuevoSaldo = Math.max(0, totalActual - nuevoPagado);
      return {
        ...obra,
        pagado:nuevoPagado,
        saldo:nuevoSaldo,
        estado:nuevoSaldo>0 ? obra.estado : "Pagado",
      };
    }));
  };

  const cobrar = (id) => {
    const pagoActual = pagosNormalizados.find((p)=>p.id===id);
    if(!pagoActual || pagoActual.estado==="Pagado") return;
    setPstep(id);
    setTimeout(()=>{
      actualizarSaldoObra(pagoActual.obraId, Number(pagoActual.monto || 0));
      setPagos((prev)=>prev.map((p)=>p.id===id ? {
        ...p,
        estado:"Pagado",
        fecha:today(),
        metodo:p.metodo ?? p.medio ?? "PSE",
      } : p));
      setPstep(null);
    }, 700);
  };

  const guardarAbonoManual = () => {
    const monto = Math.round(Number(abono.monto || 0));
    if(!obraPagoId || !Number.isFinite(monto) || monto<=0) return;
    const nuevoPago = {
      id:"PG-" + (Date.now()),
      obraId:obraPagoId,
      tipo:abono.tipo?.trim() || "Abono manual",
      monto,
      valor:monto,
      fecha:abono.fecha || today(),
      estado:"Pagado",
      metodo:abono.metodo || "Transferencia",
      medio:abono.metodo || "Transferencia",
      notas:(abono.notas || "").trim(),
    };
    setGuardandoAbono(true);
    setPagos((prev)=>[nuevoPago, ...prev]);
    actualizarSaldoObra(obraPagoId, monto);
    setFiltro(obraPagoId);
    setAbono({
      tipo:"Abono manual",
      monto:"",
      fecha:today(),
      metodo:"Transferencia",
      notas:"",
    });
    setTimeout(()=>setGuardandoAbono(false), 500);
  };

  return(
    <div style={{padding:28}}>
      <H1 title="Cuentas por cobrar" subtitle="Registro de abonos y seguimiento por obra"/>

      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        <button
          type="button"
          onClick={()=>setVistaPago("registro")}
          style={{
            ...B(vistaPago==="registro" ? "#cc0000" : "#fff7ed", vistaPago==="registro" ? "#fff" : "#9a3412"),
            border:vistaPago==="registro" ? "1px solid #cc0000" : "1px solid #fed7aa",
          }}
        >
          Registrar abono
        </button>
        <button
          type="button"
          onClick={()=>setVistaPago("historial")}
          style={{
            ...B(vistaPago==="historial" ? "#003B71" : "#eff6ff", vistaPago==="historial" ? "#fff" : "#1d4ed8"),
            border:vistaPago==="historial" ? "1px solid #003B71" : "1px solid #bfdbfe",
          }}
        >
          Historial de pagos
        </button>
      </div>

      {vistaPago==="registro" && <div style={{...CD,marginBottom:20,border:"1px solid #fed7aa",boxShadow:"0 18px 40px rgba(244,124,32,0.08)"}}>
        <div style={ST}>Registrar abono manual</div>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:18,alignItems:"start"}}>
          <div style={{display:"grid",gap:12}}>
            <div>
              <LBL>Buscar cliente u obra</LBL>
              <input
                value={busquedaPago}
                onChange={(e)=>{
                  const v=e.target.value;
                  setBusquedaPago(v);
                  const t=normalizarTexto(v);
                  if(!t){setObraPagoId("");return;}
                  const matches=obras.filter((obra)=>[obra.id,obra.cliente,obra.proyecto,obra.obra,obra.ciudad,obra.direccion].some((campo)=>normalizarTexto(campo).includes(t)));
                  setObraPagoId(matches[0]?.id || "");
                }}
                placeholder="Escribe cliente, obra, ciudad o ID"
                style={SI}
              />
            </div>
            <div>
              <LBL>Seleccionar obra</LBL>
              <select value={obraPagoId} onChange={(e)=>setObraPagoId(e.target.value)} style={SI}>
                <option value="">Seleccionar obra...</option>
                {obrasFiltradasBusqueda.map((obra)=>(
                  <option key={obra.id} value={obra.id}>
                    {obra.id} · {obra.cliente} · {obra.proyecto}
                  </option>
                ))}
              </select>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <LBL>Valor del abono</LBL>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={abono.monto}
                  onChange={(e)=>setAbono({...abono,monto:e.target.value})}
                  placeholder="Ej. 2000000"
                  style={SI}
                />
                <div style={{fontSize:11,color:"#64748b",marginTop:6}}>
                  {Number(abono.monto || 0)>0 ? fmt(Number(abono.monto || 0)) : "Ingresa el valor manual del abono"}
                </div>
              </div>
              <div>
                <LBL>Fecha del abono</LBL>
                <input
                  type="date"
                  value={abono.fecha}
                  onChange={(e)=>setAbono({...abono,fecha:e.target.value})}
                  style={SI}
                />
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <LBL>Tipo</LBL>
                <input
                  value={abono.tipo}
                  onChange={(e)=>setAbono({...abono,tipo:e.target.value})}
                  placeholder="Abono manual / anticipo / pago parcial"
                  style={SI}
                />
              </div>
              <div>
                <LBL>Método</LBL>
                <select value={abono.metodo} onChange={(e)=>setAbono({...abono,metodo:e.target.value})} style={SI}>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Consignación">Consignación</option>
                  <option value="Efectivo">Efectivo</option>
                  <option value="PSE">PSE</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>
            <div>
              <LBL>Notas</LBL>
              <textarea
                value={abono.notas}
                onChange={(e)=>setAbono({...abono,notas:e.target.value})}
                rows={3}
                placeholder="Referencia, observación del pago o soporte recibido"
                style={{...SI,minHeight:86,resize:"vertical"}}
              />
            </div>
            <div style={{display:"flex",gap:10}}>
              <button
                type="button"
                onClick={guardarAbonoManual}
                disabled={!obraPagoId || Number(abono.monto || 0)<=0 || guardandoAbono}
                style={{
                  ...B("#cc0000"),
                  opacity:(!obraPagoId || Number(abono.monto || 0)<=0 || guardandoAbono)?0.6:1,
                  cursor:(!obraPagoId || Number(abono.monto || 0)<=0 || guardandoAbono)?"not-allowed":"pointer",
                }}
              >
                {guardandoAbono ? "Guardando..." : "Guardar abono"}
              </button>
              <button
                type="button"
                onClick={()=>{
                  setBusquedaPago("");
                  setObraPagoId("");
                  setAbono({ tipo:"Abono manual", monto:"", fecha:today(), metodo:"Transferencia", notas:"" });
                }}
                style={B("#f1f5f9","#475569")}
              >
                Limpiar
              </button>
            </div>
          </div>

          <div style={{background:"linear-gradient(180deg,#fff7ed,#ffffff)",border:"1px solid #fed7aa",borderRadius:14,padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:"#9a3412",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Obra seleccionada</div>
            {obraSeleccionada ? (
              <div style={{display:"grid",gap:10}}>
                <div>
                  <div style={{fontSize:11,color:"#64748b"}}>{obraSeleccionada.id}</div>
                  <div style={{fontSize:20,fontWeight:700,color:"#1a1a2e"}}>{obraSeleccionada.cliente}</div>
                  <div style={{fontSize:13,color:"#475569"}}>{obraSeleccionada.proyecto}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase"}}>Total obra</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#1a1a2e"}}>{fmt(Number(obraSeleccionada.total || 0))}</div>
                  </div>
                  <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
                    <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase"}}>Cobrado</div>
                    <div style={{fontSize:18,fontWeight:700,color:"#166534"}}>{fmt(Number(obraSeleccionada.pagado || 0))}</div>
                  </div>
                  <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px",gridColumn:"span 2"}}>
                    <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase"}}>Saldo pendiente</div>
                    <div style={{fontSize:24,fontWeight:800,color:Number(obraSeleccionada.saldo||0)>0?"#c2410c":"#166534"}}>
                      {fmt(Number(obraSeleccionada.saldo || 0))}
                    </div>
                  </div>
                </div>
                <div style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>
                  Ciudad: <strong style={{color:"#334155"}}>{obraSeleccionada.ciudad || "No registrada"}</strong><br/>
                  Dirección: <strong style={{color:"#334155"}}>{obraSeleccionada.direccion || "No registrada"}</strong>
                </div>
              </div>
            ) : (
              <div style={{fontSize:13,color:"#64748b",lineHeight:1.6}}>
                Busca el cliente o la obra, selecciónala y luego registra el valor exacto del abono manual.
              </div>
            )}
          </div>
        </div>
      </div>}

      <div style={CD}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={ST}>Historial de pagos</div>
          <select value={filtro} onChange={e=>setFiltro(e.target.value)} style={{...SI,width:"auto",fontSize:12}}>
            <option value="todas">Todas las obras</option>
            {obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}
          </select>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead>
            <tr style={{background:"#f1f5f9"}}>
              {["ID","Obra","Cliente","Tipo","Monto","Fecha","Método","Estado","Acción"].map(h=>(
                <th key={h} style={{padding:"9px 10px",textAlign:h==="Monto"?"right":"left",color:"#64748b",fontWeight:500,fontSize:11}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pF.map((p,i)=>{
              const ob=obras.find(o=>o.id===p.obraId);
              return(
                <tr key={p.id} style={{borderBottom:"1px solid #e2e8f0",background:i%2===0?"#ffffff":"#f8fafc"}}>
                  <td style={{padding:"10px 10px",color:"#60b4ff",fontSize:11}}>{p.id}</td>
                  <td style={{padding:"10px 10px",fontSize:11}}>{p.obraId}</td>
                  <td style={{padding:"10px 10px",fontSize:11,color:"#475569"}}>{ob?.cliente}</td>
                  <td style={{padding:"10px 10px",fontSize:11}}>{p.tipo}</td>
                  <td style={{padding:"10px 10px",textAlign:"right",fontWeight:700,color:"#cc0000"}}>{fmt(Number(p.monto || 0))}</td>
                  <td style={{padding:"10px 10px",color:"#475569",fontSize:11}}>{p.fecha}</td>
                  <td style={{padding:"10px 10px",color:"#475569",fontSize:11}}>{p.metodo}</td>
                  <td style={{padding:"10px 10px"}}><Badge estado={p.estado}/></td>
                  <td style={{padding:"10px 10px"}}>
                    {p.estado==="Pendiente" && (
                      pstep===p.id
                        ? <span style={{fontSize:11,color:"#cc0000"}}>Procesando...</span>
                        : <button onClick={()=>cobrar(p.id)} style={{background:"#003B71",border:"1px solid #FFCD00",color:"#FFCD00",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>Marcar pagado</button>
                    )}
                    {p.estado==="Pagado" && <span style={{fontSize:11,color:"#166534",fontWeight:700}}>Conciliado</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}



function ClientesDB({ctx}){
  const {clientes,setClientes,obras,cotizaciones,certs,setObras,setCotizaciones,setCerts}=ctx;
  const clienteBase={nombre:"",nit:"",telefono:"",ciudad:"",direccion:"",contacto:"",email:"",estado:"Activo",notas:""};
  const [showForm,setShowForm]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(clienteBase);

  const fuentesBrutas=[
    ...obras.map(o=>({
      nombre:o.cliente||"",
      nit:o.nit||"",
      telefono:o.tel||"",
      ciudad:o.ciudad||"",
      direccion:o.direccion||"",
      contacto:o.cliente||"",
      email:"",
      estado:"Activo",
      notas:o.proyecto?"Obra registrada: " + (o.proyecto):"",
    })),
    ...cotizaciones.map(c=>({
      nombre:c.cliente||"",
      nit:"",
      telefono:c.telefono||"",
      ciudad:c.ciudad||"",
      direccion:"",
      contacto:c.cliente||"",
      email:"",
      estado:"Activo",
      notas:c.obra?"Cotización " + (c.numero||"") + " · " + (c.obra):"Cotización " + (c.numero||""),
    })),
    ...certs.map(c=>({
      nombre:c.cliente||"",
      nit:c.nit||"",
      telefono:"",
      ciudad:"",
      direccion:c.direccion||"",
      contacto:c.cliente||"",
      email:"",
      estado:"Activo",
      notas:c.tipo?(c.tipo) + " " + (c.numero||""):"",
    })),
  ].filter(c=>String(c.nombre||"").trim());

  const fuentesMap=new Map();
  fuentesBrutas.forEach(item=>{
    const key=String(item.nombre||"").trim().toLowerCase();
    if(!key) return;
    const prev=fuentesMap.get(key) || {nombre:item.nombre,nit:"",telefono:"",ciudad:"",direccion:"",contacto:"",email:"",estado:"Activo",notas:""};
    fuentesMap.set(key,{
      ...prev,
      nombre:prev.nombre || item.nombre,
      nit:prev.nit || item.nit || "",
      telefono:prev.telefono || item.telefono || "",
      ciudad:prev.ciudad || item.ciudad || "",
      direccion:prev.direccion || item.direccion || "",
      contacto:prev.contacto || item.contacto || "",
      email:prev.email || item.email || "",
      estado:prev.estado || item.estado || "Activo",
      notas:prev.notas || item.notas || "",
    });
  });
  const sugeridos=[...fuentesMap.values()];

  const clientesData=clientes.map(c=>{
    const obrasCli=obras.filter(o=>o.cliente===c.nombre);
    const cotCli=cotizaciones.filter(q=>q.cliente===c.nombre);
    const certCli=certs.filter(x=>x.cliente===c.nombre);
    return {
      ...c,
      obrasActivas:obrasCli.filter(o=>o.estado==="En Obra").length,
      obrasTotal:obrasCli.length,
      cotizacionesTotal:cotCli.length,
      certificacionesTotal:certCli.length,
      totalFacturado:obrasCli.reduce((s,o)=>s+Number(o.total||0),0),
      saldoPendiente:obrasCli.reduce((s,o)=>s+Number(o.saldo||0),0),
    };
  }).sort((a,b)=>String(a.nombre||"").localeCompare(String(b.nombre||"")));

  const sinRegistrar=sugeridos.filter(s=>!clientes.some(c=>String(c.nombre||"").trim().toLowerCase()===String(s.nombre||"").trim().toLowerCase()));

  const totalFacturado=clientesData.reduce((s,c)=>s+c.totalFacturado,0);
  const saldoPendiente=clientesData.reduce((s,c)=>s+c.saldoPendiente,0);

  const resetCliente=()=>{
    setForm(clienteBase);
    setEditId(null);
    setShowForm(false);
  };

  const guardarCliente=()=>{
    if(!form.nombre.trim()) return;
    const payload={
      nombre:form.nombre.trim(),
      nit:form.nit.trim(),
      telefono:form.telefono.trim(),
      ciudad:form.ciudad.trim(),
      direccion:form.direccion.trim(),
      contacto:form.contacto.trim(),
      email:form.email.trim(),
      estado:form.estado.trim() || "Activo",
      notas:form.notas.trim(),
    };

    if(editId){
      const anterior=clientes.find(c=>c.id===editId);
      setClientes(prev=>prev.map(c=>c.id===editId?{...c,...payload}:c));

      if(anterior && anterior.nombre!==payload.nombre){
        setObras(prev=>prev.map(o=>o.cliente===anterior.nombre?{...o,cliente:payload.nombre,nit:payload.nit||o.nit,tel:payload.telefono||o.tel,ciudad:payload.ciudad||o.ciudad,direccion:payload.direccion||o.direccion}:o));
        setCotizaciones(prev=>prev.map(c=>c.cliente===anterior.nombre?{...c,cliente:payload.nombre,telefono:payload.telefono||c.telefono,ciudad:payload.ciudad||c.ciudad}:c));
        setCerts(prev=>prev.map(c=>c.cliente===anterior.nombre?{...c,cliente:payload.nombre,nit:payload.nit||c.nit,direccion:payload.direccion||c.direccion}:c));
      }
    }else{
      const id="CLI-" + (String(clientes.length+1).padStart(3,"0"));
      setClientes(prev=>[...prev,{id,...payload}]);
    }

    resetCliente();
  };

  const editarCliente=(cli)=>{
    setEditId(cli.id);
    setForm({
      nombre:cli.nombre||"",
      nit:cli.nit||"",
      telefono:cli.telefono||"",
      ciudad:cli.ciudad||"",
      direccion:cli.direccion||"",
      contacto:cli.contacto||"",
      email:cli.email||"",
      estado:cli.estado||"Activo",
      notas:cli.notas||"",
    });
    setShowForm(true);
  };

  const importarClientes=()=>{
    if(!sinRegistrar.length) return;
    setClientes(prev=>[
      ...prev,
      ...sinRegistrar.map((c,idx)=>({
        id:"CLI-" + (String(prev.length+idx+1).padStart(3,"0")),
        ...c,
      }))
    ]);
  };

  return(
    <div style={{padding:28}}>
      <H1
        title="Clientes"
        subtitle="Base de datos comercial con historial de obras, saldo y contactos"
        action={
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {sinRegistrar.length>0&&(
              <button style={B("#dbeafe","#1d4ed8")} onClick={importarClientes}>
                ⬇ Importar {sinRegistrar.length} sugerido(s)
              </button>
            )}
            <button style={B("#cc0000")} onClick={()=>{setShowForm(v=>!v); if(showForm) resetCliente();}}>
              + Cliente
            </button>
          </div>
        }
      />


      {showForm&&(
        <div style={{...CD,marginBottom:18,border:"1px solid #cc0000"}}>
          <div style={ST}>{editId?"Editar cliente":"Nuevo cliente"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <div>
              <LBL>Nombre / razón social</LBL>
              <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} placeholder="Nombre del cliente" style={SI}/>
            </div>
            <div>
              <LBL>NIT</LBL>
              <input value={form.nit} onChange={e=>setForm({...form,nit:e.target.value})} placeholder="900.123.456-7" style={SI}/>
            </div>
            <div>
              <LBL>Contacto</LBL>
              <input value={form.contacto} onChange={e=>setForm({...form,contacto:e.target.value})} placeholder="Persona de contacto" style={SI}/>
            </div>
            <div>
              <LBL>Teléfono</LBL>
              <input value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} placeholder="3001234567" style={SI}/>
            </div>
            <div>
              <LBL>Ciudad</LBL>
              <input value={form.ciudad} onChange={e=>setForm({...form,ciudad:e.target.value})} placeholder="Medellín, Antioquia" style={SI}/>
            </div>
            <div>
              <LBL>Estado</LBL>
              <select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})} style={SI}>
                <option value="Activo">Activo</option>
                <option value="En seguimiento">En seguimiento</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
            <div style={{gridColumn:"span 2"}}>
              <LBL>Dirección</LBL>
              <input value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})} placeholder="Dirección principal" style={SI}/>
            </div>
            <div>
              <LBL>Email</LBL>
              <input value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="correo@cliente.com" style={SI}/>
            </div>
            <div style={{gridColumn:"span 3"}}>
              <LBL>Notas</LBL>
              <textarea value={form.notas} onChange={e=>setForm({...form,notas:e.target.value})} rows={3} placeholder="Observaciones comerciales, sedes, condiciones, etc." style={{...SI,minHeight:86,resize:"vertical"}}/>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={B("#cc0000")} onClick={guardarCliente}>{editId?"Guardar cambios":"Crear cliente"}</button>
            <button style={B("#f1f5f9","#475569")} onClick={resetCliente}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={CD}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={ST}>Directorio de clientes</div>
          <div style={{fontSize:11,color:"#64748b"}}>Datos comerciales + relación con obras, cotizaciones y certificaciones</div>
        </div>

        {clientesData.length===0 ? (
          <div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>No hay clientes registrados todavía</div>
        ) : (
          <div style={{display:"grid",gap:12}}>
            {clientesData.map(c=>(
              <div key={c.id} style={{background:"#f8fafc",borderRadius:10,padding:"16px 18px",border:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:800,color:"#1a1a2e"}}>{c.nombre}</div>
                    <div style={{fontSize:11,color:"#64748b",marginTop:3}}>
                      {c.nit || "Sin NIT"} · {c.contacto || "Sin contacto"} · {c.telefono || "Sin teléfono"}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    <Badge estado={c.estado || "Activo"}/>
                    <button style={{...B("#f1f5f9","#475569"),padding:"7px 12px",fontSize:11}} onClick={()=>editarCliente(c)}>Editar</button>
                  </div>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr 1fr",gap:10,fontSize:11,color:"#475569"}}>
                  <div><strong style={{color:"#1a1a2e"}}>Ciudad / dirección</strong><br/>{c.ciudad || "Sin ciudad"}{c.direccion?" · " + (c.direccion):""}</div>
                  <div><strong style={{color:"#1a1a2e"}}>Email</strong><br/>{c.email || "Sin email"}</div>
                  <div><strong style={{color:"#1a1a2e"}}>Obras / cotizaciones</strong><br/>{c.obrasTotal} obra(s) · {c.cotizacionesTotal} cotización(es)</div>
                  <div><strong style={{color:"#1a1a2e"}}>Certificaciones</strong><br/>{c.certificacionesTotal} registro(s)</div>
                </div>

                <div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,flexWrap:"wrap",gap:10}}>
                  <div style={{color:"#64748b",maxWidth:"70%"}}>
                    {c.notas || "Sin notas registradas"}
                  </div>
                  <div style={{display:"flex",gap:18,alignItems:"center"}}>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:"#94a3b8"}}>Facturado</div>
                      <div style={{fontWeight:800,color:"#166534"}}>{fmt(c.totalFacturado)}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:10,color:"#94a3b8"}}>Saldo</div>
                      <div style={{fontWeight:800,color:c.saldoPendiente?"#c2410c":"#166534"}}>{c.saldoPendiente?fmt(c.saldoPendiente):"Al día"}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



function CuentasPagar({ctx}){
  const {cuentas,setCuentas,proveedores,setProveedores,obras}=ctx;

  const proveedorBase={
    nombre:"",
    numeroCuenta:"",
    banco:"Bancolombia",
    direccion:"",
    nit:"",
    telefono:"",
    contacto:"",
    email:"",
    categoria:"General",
    responsableIva:true,
    regimenTributario:"Ordinario",
    agenteReteiva:false,
    autorretenedorRenta:false,
    municipioIca:"Envigado",
    codigoIca:"",
  };

  const createCuentaBase=(proveedorId="")=>({
    proveedorId:proveedorId||proveedores[0]?.id||"",
    obraId:"",
    factura:"",
    concepto:"",
    tipoOperacion:"servicio",
    subtotal:0,
    tarifaIva:19,
    valorIva:0,
    conceptoRetFuente:"servicios",
    baseRetFuente:0,
    tarifaRetFuente:4,
    valorRetFuente:0,
    aplicaReteiva:false,
    baseReteiva:0,
    tarifaReteiva:15,
    valorReteiva:0,
    municipioReteica:"Envigado",
    actividadIca:"",
    codigoIca:"",
    baseReteica:0,
    tarifaReteica:0,
    valorReteica:0,
    valorBrutoFactura:0,
    valorTotalRetenciones:0,
    valorTotalPagar:0,
    monto:0,
    fecha:today(),
    fechaVence:"",
    observacionTributaria:"",
  });

  const [tab,setTab]=useState("causacion");
  const [showProv,setShowProv]=useState(false);
  const [showCxP,setShowCxP]=useState(false);
  const [editProvId,setEditProvId]=useState(null);
  const [editCxPId,setEditCxPId]=useState(null);
  const [provForm,setProvForm]=useState(proveedorBase);
  const [cxpForm,setCxpForm]=useState(createCuentaBase());
  const [vistaPagoCxP,setVistaPagoCxP]=useState("registro");
  const [busquedaProveedorPago,setBusquedaProveedorPago]=useState("");
  const [busquedaProveedorFactura,setBusquedaProveedorFactura]=useState("");
  const [fechaCorteReporteFactura,setFechaCorteReporteFactura]=useState(today());
  const [proveedorPagoId,setProveedorPagoId]=useState("");
  const [guardandoPagoProv,setGuardandoPagoProv]=useState(false);
  const [filtroPagoProv,setFiltroPagoProv]=useState("todos");
  const [pagoProv,setPagoProv]=useState({
    tipo:"Pago a proveedor",
    monto:"",
    fecha:today(),
    metodo:"Transferencia",
    notas:"",
  });

  const clampNum=(v)=>{
    const n=Number(v||0);
    return Number.isFinite(n)?n:0;
  };

  const normalizarTexto=(valor="")=>
    String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const proveedoresData=proveedores.map(p=>({
    ...p,
    telefono:p.telefono||p.tel||"",
    tel:p.telefono||p.tel||"",
    numeroCuenta:p.numeroCuenta||"",
    banco:p.banco||"",
    direccion:p.direccion||"",
    nit:p.nit||"",
    contacto:p.contacto||"",
    email:p.email||"",
    categoria:p.categoria||"General",
    responsableIva:p.responsableIva ?? p.responsable_iva ?? true,
    regimenTributario:p.regimenTributario||p.regimen_tributario||"Ordinario",
    agenteReteiva:p.agenteReteiva ?? p.agente_reteiva ?? false,
    autorretenedorRenta:p.autorretenedorRenta ?? p.autorretenedor_renta ?? false,
    municipioIca:p.municipioIca||p.municipio_ica||"Envigado",
    codigoIca:p.codigoIca||p.codigo_ica||"",
  }));

  const normalizarCuenta=(cuenta)=>{
    const total=Number(cuenta.valorTotalPagar ?? cuenta.valor_total_pagar ?? cuenta.monto ?? 0);
    const saldoPendienteActual=Math.max(0, Number(cuenta.saldoPendienteActual ?? cuenta.saldo_pendiente_actual ?? total));
    const pagosHistorial=Array.isArray(cuenta.pagosHistorial)
      ? cuenta.pagosHistorial
      : Array.isArray(cuenta.pagos_historial)
      ? cuenta.pagos_historial
      : [];
    const montoPagado=Number(cuenta.montoPagado ?? cuenta.monto_pagado ?? Math.max(0, total - saldoPendienteActual));
    return {
      ...cuenta,
      valorTotalPagar:total,
      saldoPendienteActual,
      pagosHistorial,
      montoPagado,
    };
  };

  const cuentasNorm=cuentas.map(normalizarCuenta);
  const proveedorSel=proveedoresData.find(p=>p.id===cxpForm.proveedorId) || null;
  const proveedorPagoSel=proveedoresData.find(p=>p.id===proveedorPagoId) || null;

  const calcCuentaTributaria=(form, proveedorActivo)=>{
    const subtotal=clampNum(form.subtotal);
    const proveedorNoIva = proveedorActivo && (proveedorActivo.responsableIva===false || proveedorActivo.regimenTributario==="No responsable de IVA");
    const tarifaIva=proveedorNoIva ? 0 : clampNum(form.tarifaIva);
    const valorIva=Number((subtotal * (tarifaIva/100)).toFixed(2));

    const esAutorretenedor = !!proveedorActivo?.autorretenedorRenta;
    const baseRetFuente=esAutorretenedor ? 0 : subtotal;
    const tarifaRetFuente=esAutorretenedor ? 0 : clampNum(form.tarifaRetFuente);
    const valorRetFuente=esAutorretenedor ? 0 : Number((baseRetFuente * (tarifaRetFuente/100)).toFixed(2));

    const aplicaReteiva=!!form.aplicaReteiva;
    const baseReteiva=valorIva;
    const tarifaReteiva=clampNum(form.tarifaReteiva);
    const valorReteiva=aplicaReteiva ? Number((baseReteiva * (tarifaReteiva/100)).toFixed(2)) : 0;

    const baseReteica=subtotal;
    const tarifaReteica=clampNum(form.tarifaReteica);
    const valorReteica=tarifaReteica>0 ? Number((baseReteica * (tarifaReteica/1000)).toFixed(2)) : 0;

    const valorBrutoFactura=Number((subtotal + valorIva).toFixed(2));
    const valorTotalRetenciones=Number((valorRetFuente + valorReteiva + valorReteica).toFixed(2));
    const valorTotalPagar=Number((valorBrutoFactura - valorTotalRetenciones).toFixed(2));

    return {
      ...form,
      subtotal,
      tarifaIva,
      valorIva,
      baseRetFuente,
      tarifaRetFuente,
      valorRetFuente,
      aplicaReteiva,
      baseReteiva,
      tarifaReteiva,
      valorReteiva,
      baseReteica,
      tarifaReteica,
      valorReteica,
      valorBrutoFactura,
      valorTotalRetenciones,
      valorTotalPagar,
      monto:valorTotalPagar,
      municipioReteica:form.municipioReteica || proveedorActivo?.municipioIca || "Envigado",
      codigoIca:form.codigoIca || proveedorActivo?.codigoIca || "",
    };
  };

  useEffect(()=>{
    if(!cxpForm.proveedorId && proveedoresData[0]?.id){
      setCxpForm(prev=>({...prev,proveedorId:proveedoresData[0].id}));
    }
  },[proveedoresData, cxpForm.proveedorId]);

  useEffect(()=>{
    if(!proveedorPagoId && proveedoresData[0]?.id){
      setProveedorPagoId(proveedoresData[0].id);
    }
  },[proveedoresData, proveedorPagoId]);

  useEffect(()=>{
    if(!proveedorSel) return;
    setCxpForm(prev=>{
      const next={...prev};
      if(!next.municipioReteica) next.municipioReteica=proveedorSel.municipioIca||"Envigado";
      if(!next.codigoIca) next.codigoIca=proveedorSel.codigoIca||"";
      if(!next.aplicaReteiva && proveedorSel.agenteReteiva) next.aplicaReteiva=true;
      return next;
    });
  },[proveedorSel?.id]);

  const cuentasOrdenadas=[...cuentasNorm].sort((a,b)=>{
    if(a.estado!==b.estado) return a.estado==="Pendiente"?-1:1;
    return String(a.fechaVence||"").localeCompare(String(b.fechaVence||""));
  });
  const filtroProveedorFactura=normalizarTexto(busquedaProveedorFactura);
  const busquedaFacturaActiva=Boolean(filtroProveedorFactura);
  const cuentasCausadasFiltradas=cuentasOrdenadas.filter((cuenta)=>{
    const proveedorCuenta=proveedoresData.find((proveedor)=>proveedor.id===cuenta.proveedorId);
    const obraCuenta=obras.find((obra)=>obra.id===cuenta.obraId);
    const searchable=[
      proveedorCuenta?.nombre,
      proveedorCuenta?.nit,
      cuenta.factura,
      cuenta.concepto,
      cuenta.obraId,
      obraCuenta?.cliente,
      obraCuenta?.proyecto,
      cuenta.fecha,
      cuenta.fechaVence,
      cuenta.estado,
    ].map(normalizarTexto);
    if(!busquedaFacturaActiva) return false;
    return searchable.some((value)=>value.includes(filtroProveedorFactura));
  });
  const cuentasVencimientoReporte = cuentasOrdenadas
    .filter((cuenta)=>!fechaCorteReporteFactura || String(cuenta.fechaVence || cuenta.fecha || "") <= String(fechaCorteReporteFactura))
    .filter((cuenta)=>Number(cuenta.saldoPendienteActual || 0) > 0);
  const totalVencimientoReporte = cuentasVencimientoReporte.reduce((sum, cuenta)=>sum + Number(cuenta.saldoPendienteActual || 0), 0);
  const exportarExcelVencimientos = ()=>{
    const fechaCorte = fechaCorteReporteFactura || today();
    const filas = cuentasVencimientoReporte.map((cuenta)=>{
      const proveedorCuenta=proveedoresData.find((proveedor)=>proveedor.id===cuenta.proveedorId);
      const obraCuenta=obras.find((obra)=>obra.id===cuenta.obraId);
      const diasVencimiento = cuenta.fechaVence
        ? Math.floor((parseIsoDate(fechaCorte) - parseIsoDate(cuenta.fechaVence)) / (1000*60*60*24))
        : "";
      return [
        proveedorCuenta?.nombre || "",
        proveedorCuenta?.nit || "",
        cuenta.factura || "",
        cuenta.concepto || "",
        obraCuenta?.id || cuenta.obraId || "",
        obraCuenta?.cliente || "",
        cuenta.fecha || "",
        cuenta.fechaVence || "",
        cuenta.estado || "",
        Number(cuenta.subtotal || 0),
        Number(cuenta.valorIva ?? cuenta.valor_iva ?? 0),
        Number(cuenta.valorTotalRetenciones ?? cuenta.valor_total_retenciones ?? 0),
        Number(cuenta.valorTotalPagar ?? cuenta.valor_total_pagar ?? cuenta.monto ?? 0),
        Number(cuenta.montoPagado || 0),
        Number(cuenta.saldoPendienteActual || 0),
        Number.isFinite(diasVencimiento) ? diasVencimiento : "",
      ];
    });

    downloadExcelWorkbook(`reporte_vencimientos_${fechaCorte}`, [
      {
        name:"Resumen",
        rows:[
          ["Reporte", "Vencimientos cuentas por pagar"],
          ["Fecha corte", fechaCorte],
          ["Facturas incluidas", cuentasVencimientoReporte.length],
          ["Saldo pendiente", totalVencimientoReporte],
        ],
      },
      {
        name:"Vencimientos",
        rows:[
          ["Proveedor", "NIT", "Factura", "Concepto", "Obra", "Cliente / Obra", "Fecha factura", "Fecha vencimiento", "Estado", "Subtotal", "IVA", "Retenciones", "Valor total", "Pagado acumulado", "Saldo pendiente", "Dias vencido al corte"],
          ...filas,
        ],
      },
    ]);
  };

  const totalPendiente=cuentasNorm.filter(c=>c.estado==="Pendiente").reduce((s,c)=>s+Number(c.saldoPendienteActual||0),0);
  const totalPagado=cuentasNorm.reduce((s,c)=>s+Number(c.montoPagado||0),0);
  const vencidas=cuentasNorm.filter(c=>c.estado==="Pendiente"&&c.fechaVence&&c.fechaVence<today());
  const porVencer=cuentasNorm.filter(c=>c.estado==="Pendiente"&&c.fechaVence&&c.fechaVence>=today()&&((new Date(c.fechaVence+"T12:00:00")-new Date(today()+"T12:00:00"))/(1000*60*60*24))<=7);

  const resetProveedor=()=>{
    setProvForm(proveedorBase);
    setEditProvId(null);
    setShowProv(false);
  };

  const resetCuenta=(proveedorId="")=>{
    setCxpForm(createCuentaBase(proveedorId));
    setEditCxPId(null);
    setShowCxP(false);
  };

  const resetPagoProveedor=()=>{
    setBusquedaProveedorPago("");
    setPagoProv({tipo:"Pago a proveedor",monto:"",fecha:today(),metodo:"Transferencia",notas:""});
  };

  const guardarProveedor=()=>{
    if(!provForm.nombre.trim()) return;
    const payload={
      ...provForm,
      telefono:provForm.telefono.trim(),
      tel:provForm.telefono.trim(),
      numeroCuenta:provForm.numeroCuenta.trim(),
      banco:provForm.banco.trim(),
      direccion:provForm.direccion.trim(),
      nit:provForm.nit.trim(),
      contacto:provForm.contacto.trim(),
      email:provForm.email.trim(),
      categoria:provForm.categoria.trim()||"General",
      responsableIva:!!provForm.responsableIva,
      responsable_iva:!!provForm.responsableIva,
      regimenTributario:provForm.regimenTributario||"Ordinario",
      regimen_tributario:provForm.regimenTributario||"Ordinario",
      agenteReteiva:!!provForm.agenteReteiva,
      agente_reteiva:!!provForm.agenteReteiva,
      autorretenedorRenta:!!provForm.autorretenedorRenta,
      autorretenedor_renta:!!provForm.autorretenedorRenta,
      municipioIca:provForm.municipioIca||"Envigado",
      municipio_ica:provForm.municipioIca||"Envigado",
      codigoIca:provForm.codigoIca||"",
      codigo_ica:provForm.codigoIca||"",
    };
    let newId=editProvId;
    if(editProvId){
      setProveedores(prev=>prev.map(p=>p.id===editProvId?{...p,...payload}:p));
    }else{
      newId="PROV-" + (String(proveedores.length+1).padStart(3,"0"));
      setProveedores(prev=>[...prev,{id:newId,...payload}]);
    }
    if(newId){
      setCxpForm(prev=>({...prev,proveedorId:newId,municipioReteica:payload.municipioIca,codigoIca:payload.codigoIca,aplicaReteiva:payload.agenteReteiva||prev.aplicaReteiva}));
      setProveedorPagoId(newId);
    }
    resetProveedor();
  };

  const editarProveedor=(prov)=>{
    setEditProvId(prov.id);
    setProvForm({
      nombre:prov.nombre||"",
      numeroCuenta:prov.numeroCuenta||"",
      banco:prov.banco||"",
      direccion:prov.direccion||"",
      nit:prov.nit||"",
      telefono:prov.telefono||prov.tel||"",
      contacto:prov.contacto||"",
      email:prov.email||"",
      categoria:prov.categoria||"General",
      responsableIva:prov.responsableIva ?? true,
      regimenTributario:prov.regimenTributario||"Ordinario",
      agenteReteiva:prov.agenteReteiva ?? false,
      autorretenedorRenta:prov.autorretenedorRenta ?? false,
      municipioIca:prov.municipioIca||"Envigado",
      codigoIca:prov.codigoIca||"",
    });
    setTab("proveedores");
    setShowProv(true);
  };

  const guardarCuenta=()=>{
    if(!cxpForm.proveedorId || !cxpForm.concepto.trim() || Number(cxpForm.subtotal||0)<=0) return;
    const payload=calcCuentaTributaria({
      ...cxpForm,
      factura:cxpForm.factura.trim(),
      concepto:cxpForm.concepto.trim(),
      observacionTributaria:(cxpForm.observacionTributaria||"").trim(),
      observacion_tributaria:(cxpForm.observacionTributaria||"").trim(),
      tipoOperacion:cxpForm.tipoOperacion,
      tipo_operacion:cxpForm.tipoOperacion,
      conceptoRetFuente:cxpForm.conceptoRetFuente,
      concepto_ret_fuente:cxpForm.conceptoRetFuente,
      municipioReteica:cxpForm.municipioReteica,
      municipio_reteica:cxpForm.municipioReteica,
      actividadIca:cxpForm.actividadIca,
      actividad_ica:cxpForm.actividadIca,
      codigoIca:cxpForm.codigoIca,
      codigo_ica:cxpForm.codigoIca,
    }, proveedorSel);

    const current = editCxPId ? cuentasNorm.find(c=>c.id===editCxPId) : null;
    const withMirror={
      ...payload,
      subtotal:payload.subtotal,
      tarifaIva:payload.tarifaIva,
      tarifa_iva:payload.tarifaIva,
      valorIva:payload.valorIva,
      valor_iva:payload.valorIva,
      baseRetFuente:payload.baseRetFuente,
      base_ret_fuente:payload.baseRetFuente,
      tarifaRetFuente:payload.tarifaRetFuente,
      tarifa_ret_fuente:payload.tarifaRetFuente,
      valorRetFuente:payload.valorRetFuente,
      valor_ret_fuente:payload.valorRetFuente,
      aplicaReteiva:payload.aplicaReteiva,
      aplica_reteiva:payload.aplicaReteiva,
      baseReteiva:payload.baseReteiva,
      base_reteiva:payload.baseReteiva,
      tarifaReteiva:payload.tarifaReteiva,
      tarifa_reteiva:payload.tarifaReteiva,
      valorReteiva:payload.valorReteiva,
      valor_reteiva:payload.valorReteiva,
      baseReteica:payload.baseReteica,
      base_reteica:payload.baseReteica,
      tarifaReteica:payload.tarifaReteica,
      tarifa_reteica:payload.tarifaReteica,
      valorReteica:payload.valorReteica,
      valor_reteica:payload.valorReteica,
      valorBrutoFactura:payload.valorBrutoFactura,
      valor_bruto_factura:payload.valorBrutoFactura,
      valorTotalRetenciones:payload.valorTotalRetenciones,
      valor_total_retenciones:payload.valorTotalRetenciones,
      valorTotalPagar:payload.valorTotalPagar,
      valor_total_pagar:payload.valorTotalPagar,
      monto:payload.valorTotalPagar,
      saldoPendienteActual:current ? Math.min(Number(current.saldoPendienteActual || payload.valorTotalPagar), payload.valorTotalPagar) : payload.valorTotalPagar,
      saldo_pendiente_actual:current ? Math.min(Number(current.saldoPendienteActual || payload.valorTotalPagar), payload.valorTotalPagar) : payload.valorTotalPagar,
      montoPagado:current ? Number(current.montoPagado || 0) : 0,
      monto_pagado:current ? Number(current.montoPagado || 0) : 0,
      pagosHistorial:current ? (current.pagosHistorial || []) : [],
      pagos_historial:current ? (current.pagosHistorial || []) : [],
      estado:editCxPId ? ((current?.saldoPendienteActual || 0) <= 0 ? "Pagado" : (current?.estado || "Pendiente")) : "Pendiente",
      fechaPago:editCxPId ? (current?.fechaPago || "") : "",
    };

    if(editCxPId){
      setCuentas(prev=>prev.map(c=>c.id===editCxPId?{...c,...withMirror,id:editCxPId}:c));
    }else{
      const id="CP-" + (String(cuentas.length+1).padStart(3,"0"));
      setCuentas(prev=>[...prev,{id,...withMirror}]);
    }
    resetCuenta(proveedorSel?.id || proveedoresData[0]?.id || "");
  };

  const editarCuenta=(cuenta)=>{
    const prov=proveedoresData.find(p=>p.id===cuenta.proveedorId);
    setEditCxPId(cuenta.id);
    setCxpForm({
      proveedorId:cuenta.proveedorId||proveedoresData[0]?.id||"",
      obraId:cuenta.obraId||"",
      factura:cuenta.factura||"",
      concepto:cuenta.concepto||"",
      tipoOperacion:cuenta.tipoOperacion||cuenta.tipo_operacion||"servicio",
      subtotal:Number(cuenta.subtotal||0),
      tarifaIva:Number(cuenta.tarifaIva ?? cuenta.tarifa_iva ?? 19),
      valorIva:Number(cuenta.valorIva ?? cuenta.valor_iva ?? 0),
      conceptoRetFuente:cuenta.conceptoRetFuente||cuenta.concepto_ret_fuente||"servicios",
      baseRetFuente:Number(cuenta.baseRetFuente ?? cuenta.base_ret_fuente ?? 0),
      tarifaRetFuente:Number(cuenta.tarifaRetFuente ?? cuenta.tarifa_ret_fuente ?? 4),
      valorRetFuente:Number(cuenta.valorRetFuente ?? cuenta.valor_ret_fuente ?? 0),
      aplicaReteiva:!!(cuenta.aplicaReteiva ?? cuenta.aplica_reteiva ?? prov?.agenteReteiva ?? false),
      baseReteiva:Number(cuenta.baseReteiva ?? cuenta.base_reteiva ?? 0),
      tarifaReteiva:Number(cuenta.tarifaReteiva ?? cuenta.tarifa_reteiva ?? 15),
      valorReteiva:Number(cuenta.valorReteiva ?? cuenta.valor_reteiva ?? 0),
      municipioReteica:cuenta.municipioReteica||cuenta.municipio_reteica||prov?.municipioIca||"Envigado",
      actividadIca:cuenta.actividadIca||cuenta.actividad_ica||"",
      codigoIca:cuenta.codigoIca||cuenta.codigo_ica||prov?.codigoIca||"",
      baseReteica:Number(cuenta.baseReteica ?? cuenta.base_reteica ?? 0),
      tarifaReteica:Number(cuenta.tarifaReteica ?? cuenta.tarifa_reteica ?? 0),
      valorReteica:Number(cuenta.valorReteica ?? cuenta.valor_reteica ?? 0),
      valorBrutoFactura:Number(cuenta.valorBrutoFactura ?? cuenta.valor_bruto_factura ?? cuenta.monto ?? 0),
      valorTotalRetenciones:Number(cuenta.valorTotalRetenciones ?? cuenta.valor_total_retenciones ?? 0),
      valorTotalPagar:Number(cuenta.valorTotalPagar ?? cuenta.valor_total_pagar ?? cuenta.monto ?? 0),
      monto:Number(cuenta.monto||0),
      fecha:cuenta.fecha||today(),
      fechaVence:cuenta.fechaVence||"",
      observacionTributaria:cuenta.observacionTributaria||cuenta.observacion_tributaria||"",
    });
    setTab("causacion");
    setShowCxP(true);
  };

  const marcarPagada=(id)=>{
    setCuentas(prev=>prev.map(item=>{
      if(item.id!==id) return item;
      const total = Number(item.valorTotalPagar ?? item.valor_total_pagar ?? item.monto ?? 0);
      return {
        ...item,
        estado:"Pagado",
        fechaPago:today(),
        saldoPendienteActual:0,
        saldo_pendiente_actual:0,
        montoPagado:total,
        monto_pagado:total,
      };
    }));
  };

  const registrarPagoProveedor=(proveedorIdPreset="")=>{
    const pid = proveedorIdPreset || proveedorPagoId;
    const monto = Math.round(Number(pagoProv.monto || 0));
    if(!pid || !Number.isFinite(monto) || monto<=0) return;

    const pendientes = cuentasNorm
      .filter(c=>c.proveedorId===pid && Number(c.saldoPendienteActual || 0)>0)
      .sort((a,b)=>String(a.fechaVence||a.fecha||"").localeCompare(String(b.fechaVence||b.fecha||"")));

    if(pendientes.length===0) return;

    let restante=monto;
    const afectaciones=[];
    for(const cuenta of pendientes){
      if(restante<=0) break;
      const saldo=Number(cuenta.saldoPendienteActual || 0);
      if(saldo<=0) continue;
      const abonado=Math.min(restante, saldo);
      restante-=abonado;
      afectaciones.push({
        cuentaId:cuenta.id,
        factura:cuenta.factura || "—",
        concepto:cuenta.concepto || "Cuenta por pagar",
        abono:abonado,
        saldoAntes:saldo,
        saldoDespues:Math.max(0, saldo - abonado),
      });
    }

    const montoAplicado = afectaciones.reduce((s,a)=>s+Number(a.abono||0),0);
    if(montoAplicado<=0) return;

    const pagoId = "PP-" + Date.now();
    const pagoRecord={
      id:pagoId,
      proveedorId:pid,
      monto:montoAplicado,
      valor:montoAplicado,
      fecha:pagoProv.fecha || today(),
      estado:"Pagado",
      tipo:pagoProv.tipo?.trim() || "Pago a proveedor",
      metodo:pagoProv.metodo || "Transferencia",
      medio:pagoProv.metodo || "Transferencia",
      notas:(pagoProv.notas || "").trim(),
      facturasAfectadas:afectaciones.map(a=>({cuentaId:a.cuentaId,factura:a.factura,concepto:a.concepto,monto:a.abono})),
    };

    setGuardandoPagoProv(true);
    setCuentas(prev=>prev.map(raw=>{
      const cuenta=normalizarCuenta(raw);
      const afect=afectaciones.find(a=>a.cuentaId===cuenta.id);
      if(!afect) return raw;
      const historialPrev=Array.isArray(cuenta.pagosHistorial) ? cuenta.pagosHistorial : [];
      const historialItem={
        ...pagoRecord,
        cuentaId:cuenta.id,
        factura:afect.factura,
        conceptoFactura:afect.concepto,
        monto:afect.abono,
        valor:afect.abono,
        saldoAntes:afect.saldoAntes,
        saldoDespues:afect.saldoDespues,
      };
      const nuevoSaldo=Math.max(0, afect.saldoDespues);
      const nuevoPagado=Number(cuenta.montoPagado || 0) + Number(afect.abono || 0);
      return {
        ...raw,
        estado:nuevoSaldo<=0 ? "Pagado" : "Pendiente",
        fechaPago:nuevoSaldo<=0 ? (pagoRecord.fecha || today()) : (raw.fechaPago || ""),
        saldoPendienteActual:nuevoSaldo,
        saldo_pendiente_actual:nuevoSaldo,
        montoPagado:nuevoPagado,
        monto_pagado:nuevoPagado,
        pagosHistorial:[historialItem, ...historialPrev],
        pagos_historial:[historialItem, ...historialPrev],
      };
    }));

    setFiltroPagoProv(pid);
    setVistaPagoCxP("registro");
    setPagoProv({tipo:"Pago a proveedor",monto:"",fecha:today(),metodo:"Transferencia",notas:""});
    setTimeout(()=>setGuardandoPagoProv(false), 500);
  };

  const cuentasProveedorPago = cuentasNorm.filter(c=>c.proveedorId===proveedorPagoId);
  const cuentasPendientesProveedor = cuentasProveedorPago.filter(c=>Number(c.saldoPendienteActual || 0)>0);
  const totalPendienteProveedor = cuentasPendientesProveedor.reduce((s,c)=>s+Number(c.saldoPendienteActual || 0),0);
  const totalPagadoProveedor = cuentasProveedorPago.reduce((s,c)=>s+Number(c.montoPagado || 0),0);
  const proveedorBusquedaFiltrado = proveedoresData.filter((p)=>{
    const term = normalizarTexto(busquedaProveedorPago);
    if(!term) return true;
    return [p.id,p.nombre,p.nit,p.contacto,p.telefono,p.email,p.categoria]
      .some(v=>normalizarTexto(v).includes(term));
  });

  const pagosProveedorHistorial = cuentasNorm.flatMap((cuenta)=>{
    const prov=proveedoresData.find(p=>p.id===cuenta.proveedorId);
    return (cuenta.pagosHistorial || []).map((p)=>({
      ...p,
      proveedorNombre:prov?.nombre || "Proveedor sin registro",
      cuentaId:cuenta.id,
      factura:p.factura || cuenta.factura || "—",
      conceptoFactura:p.conceptoFactura || cuenta.concepto || "Cuenta por pagar",
    }));
  }).sort((a,b)=>String(b.fecha||"").localeCompare(String(a.fecha||"")) || String(b.id||"").localeCompare(String(a.id||"")));

  const pagosProveedorFiltrados = filtroPagoProv==="todos" ? pagosProveedorHistorial : pagosProveedorHistorial.filter(p=>p.proveedorId===filtroPagoProv);
  const cxpPreview=calcCuentaTributaria(cxpForm, proveedorSel);

  const Stat=({title,value,color,sub})=>(
    <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:"12px 14px",minWidth:170,flex:"1 1 170px"}}>
      <div style={{fontSize:11,color:"#64748b",marginBottom:6}}>{title}</div>
      <div style={{fontSize:20,fontWeight:800,color:color||"#0f172a",lineHeight:1.1}}>{value}</div>
      <div style={{fontSize:11,color:"#94a3b8",marginTop:4}}>{sub}</div>
    </div>
  );

  return(
    <div style={{padding:28}}>
      <H1
        title="Causación o ingreso de facturas y gastos"
        subtitle="Causación de facturas, egresos a proveedores y base tributaria del ERP"
        action={
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button style={B("#f5c842","#3b2f00")} onClick={()=>{setTab("proveedores");setShowProv(v=>!v);if(showProv&&tab==="proveedores") resetProveedor();}}>
              + Proveedor
            </button>
            <button style={B("#cc0000")} onClick={()=>{setTab("causacion");setShowCxP(v=>{const next=!v;if(next&&!editCxPId)setCxpForm(createCuentaBase(cxpForm.proveedorId));if(!next)resetCuenta(cxpForm.proveedorId);return next;});}}>
              + Causación / factura
            </button>
            <button style={B("#003B71")} onClick={()=>{setTab("pagos");setVistaPagoCxP("registro");scrollAppToTop("smooth");}}>
              Registrar pago
            </button>
          </div>
        }
      />


      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {[["causacion","🧾 Causación / facturas"],["pagos","🏦 Pagos y egresos"],["proveedores","🏢 Proveedores"]].map(([id,lb])=>(
          <button
            key={id}
            onClick={()=>setTab(id)}
            style={{...B(tab===id?"#cc0000":"#f1f5f9",tab===id?"#fff":"#475569"),fontSize:12,padding:"8px 16px",border:"1px solid " + (tab===id?"#cc0000":"#e2e8f0")}}
          >
            {lb}
          </button>
        ))}
      </div>

      {(tab==="causacion" || tab==="pagos")&&(
        <>
          {tab==="pagos" && (
            <>
          <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
            <button
              type="button"
              onClick={()=>setVistaPagoCxP("registro")}
              style={{
                ...B(vistaPagoCxP==="registro" ? "#cc0000" : "#fff7ed", vistaPagoCxP==="registro" ? "#fff" : "#9a3412"),
                border:vistaPagoCxP==="registro" ? "1px solid #cc0000" : "1px solid #fed7aa",
              }}
            >
              Registrar pago
            </button>
            <button
              type="button"
              onClick={()=>setVistaPagoCxP("historial")}
              style={{
                ...B(vistaPagoCxP==="historial" ? "#003B71" : "#eff6ff", vistaPagoCxP==="historial" ? "#fff" : "#1d4ed8"),
                border:vistaPagoCxP==="historial" ? "1px solid #003B71" : "1px solid #bfdbfe",
              }}
            >
              Historial de pagos
            </button>
          </div>

          {vistaPagoCxP==="registro" && (
            <div style={{...CD,marginBottom:20,border:"1px solid #fed7aa",boxShadow:"0 18px 40px rgba(244,124,32,0.08)"}}>
              <div style={ST}>Registrar pago manual a proveedor</div>
              <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:18,alignItems:"start"}}>
                <div style={{display:"grid",gap:12}}>
                  <div>
                    <LBL>Buscar proveedor</LBL>
                    <input
                      value={busquedaProveedorPago}
                      onChange={(e)=>{
                        const v=e.target.value;
                        setBusquedaProveedorPago(v);
                        const t=normalizarTexto(v);
                        if(!t) return;
                        const matches=proveedoresData.filter((p)=>[p.id,p.nombre,p.nit,p.contacto,p.telefono,p.email,p.categoria].some((campo)=>normalizarTexto(campo).includes(t)));
                        if(matches[0]?.id) setProveedorPagoId(matches[0].id);
                      }}
                      placeholder="Escribe proveedor, NIT, contacto o categoría"
                      style={SI}
                    />
                  </div>
                  <div>
                    <LBL>Seleccionar proveedor</LBL>
                    <select value={proveedorPagoId} onChange={(e)=>setProveedorPagoId(e.target.value)} style={SI}>
                      <option value="">Seleccionar proveedor...</option>
                      {proveedorBusquedaFiltrado.map((prov)=>(
                        <option key={prov.id} value={prov.id}>{prov.nombre} · {prov.nit || prov.id}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div>
                      <LBL>Valor del pago</LBL>
                      <input
                        type="number"
                        min="0"
                        step="1000"
                        value={pagoProv.monto}
                        onChange={(e)=>setPagoProv({...pagoProv,monto:e.target.value})}
                        placeholder="Ej. 2000000"
                        style={SI}
                      />
                      <div style={{fontSize:11,color:"#64748b",marginTop:6}}>
                        {Number(pagoProv.monto || 0)>0 ? fmt(Number(pagoProv.monto || 0)) : "Ingresa el valor manual del pago"}
                      </div>
                    </div>
                    <div>
                      <LBL>Fecha del pago</LBL>
                      <input type="date" value={pagoProv.fecha} onChange={(e)=>setPagoProv({...pagoProv,fecha:e.target.value})} style={SI}/>
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                    <div>
                      <LBL>Tipo</LBL>
                      <input
                        value={pagoProv.tipo}
                        onChange={(e)=>setPagoProv({...pagoProv,tipo:e.target.value})}
                        placeholder="Pago manual / anticipo / pago parcial"
                        style={SI}
                      />
                    </div>
                    <div>
                      <LBL>Método</LBL>
                      <select value={pagoProv.metodo} onChange={(e)=>setPagoProv({...pagoProv,metodo:e.target.value})} style={SI}>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Consignación">Consignación</option>
                        <option value="Efectivo">Efectivo</option>
                        <option value="PSE">PSE</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <LBL>Notas</LBL>
                    <textarea
                      value={pagoProv.notas}
                      onChange={(e)=>setPagoProv({...pagoProv,notas:e.target.value})}
                      rows={3}
                      placeholder="Referencia, observación del pago o soporte recibido"
                      style={{...SI,minHeight:86,resize:"vertical"}}
                    />
                  </div>
                  <div style={{display:"flex",gap:10}}>
                    <button
                      type="button"
                      onClick={()=>registrarPagoProveedor()}
                      disabled={!proveedorPagoId || Number(pagoProv.monto || 0)<=0 || guardandoPagoProv || totalPendienteProveedor<=0}
                      style={{
                        ...B("#cc0000"),
                        opacity:(!proveedorPagoId || Number(pagoProv.monto || 0)<=0 || guardandoPagoProv || totalPendienteProveedor<=0)?0.6:1,
                        cursor:(!proveedorPagoId || Number(pagoProv.monto || 0)<=0 || guardandoPagoProv || totalPendienteProveedor<=0)?"not-allowed":"pointer",
                      }}
                    >
                      {guardandoPagoProv ? "Guardando..." : "Guardar pago"}
                    </button>
                    <button type="button" onClick={resetPagoProveedor} style={B("#f1f5f9","#475569")}>Limpiar</button>
                  </div>
                </div>

                <div style={{background:"linear-gradient(180deg,#fff7ed,#ffffff)",border:"1px solid #fed7aa",borderRadius:14,padding:16}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#9a3412",textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>Proveedor seleccionado</div>
                  {proveedorPagoSel ? (
                    <div style={{display:"grid",gap:10}}>
                      <div>
                        <div style={{fontSize:11,color:"#64748b"}}>{proveedorPagoSel.id}</div>
                        <div style={{fontSize:20,fontWeight:700,color:"#1a1a2e"}}>{proveedorPagoSel.nombre}</div>
                        <div style={{fontSize:13,color:"#475569"}}>{proveedorPagoSel.categoria || "Proveedor"}</div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase"}}>Saldo pendiente</div>
                          <div style={{fontSize:20,fontWeight:800,color:Number(totalPendienteProveedor||0)>0?"#c2410c":"#166534"}}>{fmt(totalPendienteProveedor)}</div>
                        </div>
                        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase"}}>Pagado</div>
                          <div style={{fontSize:18,fontWeight:700,color:"#166534"}}>{fmt(totalPagadoProveedor)}</div>
                        </div>
                        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase"}}>Facturas pendientes</div>
                          <div style={{fontSize:18,fontWeight:700,color:"#1a1a2e"}}>{String(cuentasPendientesProveedor.length)}</div>
                        </div>
                        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase"}}>Banco</div>
                          <div style={{fontSize:14,fontWeight:700,color:"#1a1a2e"}}>{proveedorPagoSel.banco || "Sin banco"}</div>
                        </div>
                      </div>
                      <div style={{fontSize:12,color:"#64748b",lineHeight:1.6}}>
                        NIT: <strong style={{color:"#334155"}}>{proveedorPagoSel.nit || "No registrado"}</strong><br/>
                        Contacto: <strong style={{color:"#334155"}}>{proveedorPagoSel.contacto || "No registrado"}</strong><br/>
                        Cuenta: <strong style={{color:"#334155"}}>{proveedorPagoSel.numeroCuenta || "No registrada"}</strong>
                      </div>
                      {cuentasPendientesProveedor.length>0 && (
                        <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
                          <div style={{fontSize:10,color:"#64748b",textTransform:"uppercase",marginBottom:8}}>Aplicación automática del pago</div>
                          <div style={{display:"grid",gap:6,maxHeight:180,overflow:"auto"}}>
                            {cuentasPendientesProveedor.slice(0,5).map((c)=>(
                              <div key={c.id} style={{display:"flex",justifyContent:"space-between",gap:10,fontSize:12}}>
                                <div style={{color:"#334155"}}>{c.factura || c.id} · {c.concepto}</div>
                                <strong style={{color:"#c2410c"}}>{fmt(c.saldoPendienteActual)}</strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{fontSize:13,color:"#64748b",lineHeight:1.6}}>
                      Busca el proveedor, selecciónalo y luego registra el valor exacto del pago manual.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div style={CD}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
              <div style={ST}>Historial de pagos a proveedores</div>
              <select value={filtroPagoProv} onChange={e=>setFiltroPagoProv(e.target.value)} style={{...SI,width:"auto",fontSize:12}}>
                <option value="todos">Todos los proveedores</option>
                {proveedoresData.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:"#f1f5f9"}}>
                  {["ID","Proveedor","Factura","Concepto","Monto","Fecha","Método","Estado"].map(h=>(
                    <th key={h} style={{padding:"9px 10px",textAlign:h==="Monto"?"right":"left",color:"#64748b",fontWeight:500,fontSize:11}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pagosProveedorFiltrados.length===0 ? (
                  <tr><td colSpan={8} style={{padding:18,textAlign:"center",color:"#94a3b8"}}>No hay pagos registrados para este filtro</td></tr>
                ) : pagosProveedorFiltrados.map((p)=> (
                  <tr key={p.id + "-" + p.cuentaId} style={{borderBottom:"1px solid #e2e8f0"}}>
                    <td style={{padding:"10px 10px",color:"#2563eb",fontWeight:500}}>{p.id}</td>
                    <td style={{padding:"10px 10px"}}>{p.proveedorNombre}</td>
                    <td style={{padding:"10px 10px"}}>{p.factura || "—"}</td>
                    <td style={{padding:"10px 10px"}}>{p.conceptoFactura || "Cuenta por pagar"}</td>
                    <td style={{padding:"10px 10px",textAlign:"right",fontWeight:700,color:"#cc0000"}}>{fmt(p.monto)}</td>
                    <td style={{padding:"10px 10px"}}>{p.fecha || "—"}</td>
                    <td style={{padding:"10px 10px"}}>{p.metodo || p.medio || "—"}</td>
                    <td style={{padding:"10px 10px"}}><Badge estado={p.estado || "Pagado"}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </>
          )}

          {tab==="causacion" && (
            <>
          {showCxP&&(
            <div style={{...CD,marginBottom:18,border:"1px solid #cc0000"}}>
              <div style={ST}>{editCxPId?"Editar causación de factura o gasto":"Registrar causación de factura o gasto"}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
                <div>
                  <LBL>Proveedor</LBL>
                  <select value={cxpForm.proveedorId} onChange={e=>setCxpForm({...cxpForm,proveedorId:e.target.value})} style={SI}>
                    <option value="">Selecciona un proveedor...</option>
                    {proveedoresData.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <LBL>Obra asociada</LBL>
                  <select value={cxpForm.obraId} onChange={e=>setCxpForm({...cxpForm,obraId:e.target.value})} style={SI}>
                    <option value="">Sin obra / gasto general</option>
                    {obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}
                  </select>
                </div>
                <div>
                  <LBL>N° Factura</LBL>
                  <input value={cxpForm.factura} onChange={e=>setCxpForm({...cxpForm,factura:e.target.value})} placeholder="FV-2026-0001" style={SI}/>
                </div>

                <div style={{gridColumn:"span 2"}}>
                  <LBL>Concepto</LBL>
                  <input value={cxpForm.concepto} onChange={e=>setCxpForm({...cxpForm,concepto:e.target.value})} placeholder="Descripción del gasto o servicio" style={SI}/>
                </div>
                <div>
                  <LBL>Tipo de operación</LBL>
                  <select value={cxpForm.tipoOperacion} onChange={e=>setCxpForm({...cxpForm,tipoOperacion:e.target.value,conceptoRetFuente:e.target.value==="honorario"?"honorarios":e.target.value==="arrendamiento"?"arrendamientos":e.target.value==="bien"?"compras":"servicios"})} style={SI}>
                    <option value="bien">Bien</option>
                    <option value="servicio">Servicio</option>
                    <option value="honorario">Honorario</option>
                    <option value="arrendamiento">Arrendamiento</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <LBL>Subtotal / base</LBL>
                  <input type="number" value={cxpForm.subtotal} onChange={e=>setCxpForm({...cxpForm,subtotal:parseFloat(e.target.value)||0})} style={SI}/>
                </div>
                <div>
                  <LBL>Tarifa IVA %</LBL>
                  <input type="number" value={cxpForm.tarifaIva} onChange={e=>setCxpForm({...cxpForm,tarifaIva:parseFloat(e.target.value)||0})} style={SI} disabled={!!proveedorSel && (proveedorSel.responsableIva===false || proveedorSel.regimenTributario==="No responsable de IVA")}/>
                </div>
                <div>
                  <LBL>Valor IVA</LBL>
                  <input value={fmt(cxpPreview.valorIva)} readOnly style={{...SI,background:"#f8fafc"}}/>
                </div>

                <div>
                  <LBL>Concepto retención</LBL>
                  <select value={cxpForm.conceptoRetFuente} onChange={e=>setCxpForm({...cxpForm,conceptoRetFuente:e.target.value})} style={SI}>
                    <option value="compras">Compras</option>
                    <option value="servicios">Servicios</option>
                    <option value="honorarios">Honorarios</option>
                    <option value="comisiones">Comisiones</option>
                    <option value="arrendamientos">Arrendamientos</option>
                    <option value="otros">Otros</option>
                  </select>
                </div>
                <div>
                  <LBL>Tarifa retefuente %</LBL>
                  <input type="number" value={cxpForm.tarifaRetFuente} onChange={e=>setCxpForm({...cxpForm,tarifaRetFuente:parseFloat(e.target.value)||0})} style={SI} disabled={!!proveedorSel?.autorretenedorRenta}/>
                </div>
                <div>
                  <LBL>Valor retefuente</LBL>
                  <input value={fmt(cxpPreview.valorRetFuente)} readOnly style={{...SI,background:"#f8fafc"}}/>
                </div>

                <div style={{gridColumn:"span 3",display:"flex",gap:10,flexWrap:"wrap",marginTop:-2}}>
                  {proveedorSel?.autorretenedorRenta && <div style={{fontSize:11,color:"#166534",background:"#ecfdf5",border:"1px solid #bbf7d0",padding:"8px 10px",borderRadius:999}}>Proveedor autorretenedor: no se calcula retención en la fuente</div>}
                  {proveedorSel && (proveedorSel.responsableIva===false || proveedorSel.regimenTributario==="No responsable de IVA") && <div style={{fontSize:11,color:"#1d4ed8",background:"#eff6ff",border:"1px solid #bfdbfe",padding:"8px 10px",borderRadius:999}}>Proveedor no responsable de IVA: la tarifa IVA se ajusta a 0%</div>}
                </div>

                <div style={{gridColumn:"span 3",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                  <div>
                    <LBL>Aplica reteIVA</LBL>
                    <select value={cxpForm.aplicaReteiva?"si":"no"} onChange={e=>setCxpForm({...cxpForm,aplicaReteiva:e.target.value==="si"})} style={SI}>
                      <option value="no">No</option>
                      <option value="si">Sí</option>
                    </select>
                  </div>
                  <div>
                    <LBL>Tarifa reteIVA %</LBL>
                    <input type="number" value={cxpForm.tarifaReteiva} onChange={e=>setCxpForm({...cxpForm,tarifaReteiva:parseFloat(e.target.value)||0})} style={SI}/>
                  </div>
                  <div>
                    <LBL>Valor reteIVA</LBL>
                    <input value={fmt(cxpPreview.valorReteiva)} readOnly style={{...SI,background:"#f8fafc"}}/>
                  </div>
                </div>

                <div>
                  <LBL>Municipio reteICA</LBL>
                  <input value={cxpForm.municipioReteica} onChange={e=>setCxpForm({...cxpForm,municipioReteica:e.target.value})} style={SI}/>
                </div>
                <div>
                  <LBL>Código ICA</LBL>
                  <input value={cxpForm.codigoIca} onChange={e=>setCxpForm({...cxpForm,codigoIca:e.target.value})} style={SI}/>
                </div>
                <div>
                  <LBL>Tarifa reteICA x 1000</LBL>
                  <input type="number" value={cxpForm.tarifaReteica} onChange={e=>setCxpForm({...cxpForm,tarifaReteica:parseFloat(e.target.value)||0})} style={SI}/>
                </div>

                <div style={{gridColumn:"span 3"}}>
                  <LBL>Observación tributaria</LBL>
                  <input value={cxpForm.observacionTributaria} onChange={e=>setCxpForm({...cxpForm,observacionTributaria:e.target.value})} placeholder="Notas de causación, soporte o validaciones tributarias" style={SI}/>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:14}}>
                <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"#9a3412",marginBottom:4}}>Valor bruto factura</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#c2410c"}}>{fmt(cxpPreview.valorBrutoFactura)}</div>
                </div>
                <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"#9a3412",marginBottom:4}}>Total retenciones</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#b91c1c"}}>{fmt(cxpPreview.valorTotalRetenciones)}</div>
                </div>
                <div style={{background:"#ecfdf5",border:"1px solid #bbf7d0",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"#166534",marginBottom:4}}>Total a pagar</div>
                  <div style={{fontSize:18,fontWeight:800,color:"#166534"}}>{fmt(cxpPreview.valorTotalPagar)}</div>
                </div>
                <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"#1d4ed8",marginBottom:4}}>Fecha vencimiento</div>
                  <input type="date" value={cxpForm.fechaVence} onChange={e=>setCxpForm({...cxpForm,fechaVence:e.target.value})} style={{...SI,margin:0,padding:"8px 10px"}}/>
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
                <div>
                  <LBL>Fecha factura</LBL>
                  <input type="date" value={cxpForm.fecha} onChange={e=>setCxpForm({...cxpForm,fecha:e.target.value})} style={SI}/>
                </div>
                <div style={{alignSelf:"end",fontSize:12,color:"#64748b"}}>
                  Se conserva el historial de pagos si editas una cuenta ya registrada.
                </div>
              </div>

              <div style={{display:"flex",gap:8}}>
                <button style={B("#cc0000")} onClick={guardarCuenta}>{editCxPId?"Guardar cambios":"Guardar cuenta"}</button>
                <button style={B("#f1f5f9","#475569")} onClick={()=>resetCuenta(cxpForm.proveedorId)}>Cancelar</button>
              </div>
            </div>
          )}

          <div style={CD}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:14,flexWrap:"wrap",gap:12}}>
              <div style={ST}>Facturas causadas y vencimientos</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"flex-end",width:"100%"}}>
                <div style={{width:"100%",maxWidth:380}}>
                  <input
                    value={busquedaProveedorFactura}
                    onChange={(e)=>setBusquedaProveedorFactura(e.target.value)}
                    placeholder="Buscar factura, proveedor, concepto u obra"
                    style={{...SI,margin:0,background:"#fff"}}
                  />
                </div>
                <div style={{width:"100%",maxWidth:180}}>
                  <input
                    type="date"
                    value={fechaCorteReporteFactura}
                    onChange={(e)=>setFechaCorteReporteFactura(e.target.value)}
                    style={{...SI,margin:0,background:"#fff"}}
                  />
                </div>
                <button
                  type="button"
                  onClick={exportarExcelVencimientos}
                  style={{...B("#166534","#d1fae5"),padding:"10px 16px"}}
                >
                  Exportar Excel
                </button>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginBottom:12,fontSize:11,color:"#64748b"}}>
              <div>
                {busquedaFacturaActiva
                  ? `Mostrando solo los resultados de "${busquedaProveedorFactura.trim()}".`
                  : "Escribe la factura, proveedor, concepto u obra que quieres consultar para ver resultados."}
              </div>
              <div style={{fontWeight:700,color:"#166534"}}>
                Corte reporte: {fechaCorteReporteFactura || "Sin fecha"} · {cuentasVencimientoReporte.length} factura(s) · {fmt(totalVencimientoReporte)}
              </div>
            </div>

            {cuentasCausadasFiltradas.length===0 ? (
              <div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>
                {busquedaFacturaActiva
                  ? "No hay facturas causadas con ese criterio de búsqueda"
                  : "La vista está limpia. Escribe una factura para consultarla."}
              </div>
            ) : (
              <div style={{display:"grid",gap:10}}>
                {cuentasCausadasFiltradas.map(c=>{
                  const prov=proveedoresData.find(p=>p.id===c.proveedorId);
                  const obra=obras.find(o=>o.id===c.obraId);
                  const vencida=c.estado==="Pendiente"&&c.fechaVence&&c.fechaVence<today();
                  return(
                    <div key={c.id} style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",border:"1px solid " + (vencida?"#fca5a5":c.estado==="Pagado"?"#bbf7d0":"#e2e8f0")}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",marginBottom:8}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:14,fontWeight:700,color:"#1a1a2e"}}>{c.concepto}</div>
                          <div style={{fontSize:11,color:"#64748b",marginTop:2}}>
                            {prov?.nombre || "Proveedor sin registro"} · Factura {c.factura || "—"} {obra?"· " + obra.id + " · " + obra.cliente:"· gasto general"}
                          </div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:15,fontWeight:800,color:"#cc0000"}}>{fmt(c.valorTotalPagar)}</div>
                          <Badge estado={vencida?"Vencida":c.estado}/>
                        </div>
                      </div>

                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,fontSize:11,color:"#475569"}}>
                        <div><strong style={{color:"#1a1a2e"}}>Factura</strong><br/>{c.factura || "Sin consecutivo"}</div>
                        <div><strong style={{color:"#1a1a2e"}}>Fecha factura</strong><br/>{c.fecha || "—"}</div>
                        <div><strong style={{color:"#1a1a2e"}}>Vencimiento</strong><br/>{c.fechaVence || "Sin fecha"}</div>
                        <div><strong style={{color:"#1a1a2e"}}>Saldo pendiente</strong><br/>{Number(c.saldoPendienteActual||0)>0?fmt(c.saldoPendienteActual):"0"}</div>
                        <div><strong style={{color:"#1a1a2e"}}>Subtotal</strong><br/>{fmt(c.subtotal || 0)}</div>
                        <div><strong style={{color:"#1a1a2e"}}>IVA</strong><br/>{fmt(c.valorIva ?? c.valor_iva ?? 0)}</div>
                        <div><strong style={{color:"#1a1a2e"}}>Retenciones</strong><br/>{fmt(c.valorTotalRetenciones ?? c.valor_total_retenciones ?? 0)}</div>
                        <div><strong style={{color:"#1a1a2e"}}>Pagado acumulado</strong><br/>{fmt(c.montoPagado || 0)}</div>
                      </div>

                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,flexWrap:"wrap",gap:10}}>
                        <div style={{fontSize:11,color:"#64748b"}}>
                          {c.estado==="Pagado" ? "Pagada" + (c.fechaPago?" el " + c.fechaPago:"") : (vencida?"Cuenta vencida":"Pendiente de pago")}
                        </div>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <button style={{...B("#f1f5f9","#475569"),padding:"7px 12px",fontSize:11}} onClick={()=>editarCuenta(c)}>Editar</button>
                          {Number(c.saldoPendienteActual||0)>0 && (
                            <button style={{...B("#003B71"),padding:"7px 12px",fontSize:11}} onClick={()=>{setTab("pagos"); setProveedorPagoId(c.proveedorId); setBusquedaProveedorPago(prov?.nombre || ""); setPagoProv(prev=>({...prev,tipo:"Pago a proveedor",monto:String(Math.round(Number(c.saldoPendienteActual||0))),fecha:today()})); setVistaPagoCxP("registro"); scrollAppToTop("smooth");}}>Registrar pago</button>
                          )}
                          {c.estado!=="Pagado" && <button style={{...B("#16a34a"),padding:"7px 12px",fontSize:11}} onClick={()=>marcarPagada(c.id)}>Marcar pagada</button>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
            </>
          )}
        </>
      )}

      {tab==="proveedores"&&(
        <>
          {showProv&&(
            <div style={{...CD,marginBottom:18,border:"1px solid #f5c842"}}>
              <div style={ST}>{editProvId?"Editar proveedor":"Nuevo proveedor"}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
                <div>
                  <LBL>Nombre del proveedor</LBL>
                  <input value={provForm.nombre} onChange={e=>setProvForm({...provForm,nombre:e.target.value})} placeholder="Razón social o nombre comercial" style={SI}/>
                </div>
                <div>
                  <LBL>NIT</LBL>
                  <input value={provForm.nit} onChange={e=>setProvForm({...provForm,nit:e.target.value})} placeholder="900.123.456-7" style={SI}/>
                </div>
                <div>
                  <LBL>Contacto</LBL>
                  <input value={provForm.contacto} onChange={e=>setProvForm({...provForm,contacto:e.target.value})} placeholder="Nombre del contacto" style={SI}/>
                </div>
                <div>
                  <LBL>Teléfono</LBL>
                  <input value={provForm.telefono} onChange={e=>setProvForm({...provForm,telefono:e.target.value})} placeholder="3001234567" style={SI}/>
                </div>
                <div>
                  <LBL>Banco</LBL>
                  <input value={provForm.banco} onChange={e=>setProvForm({...provForm,banco:e.target.value})} placeholder="Bancolombia" style={SI}/>
                </div>
                <div>
                  <LBL>Número de cuenta</LBL>
                  <input value={provForm.numeroCuenta} onChange={e=>setProvForm({...provForm,numeroCuenta:e.target.value})} placeholder="123-456789-10" style={SI}/>
                </div>
                <div style={{gridColumn:"span 2"}}>
                  <LBL>Dirección</LBL>
                  <input value={provForm.direccion} onChange={e=>setProvForm({...provForm,direccion:e.target.value})} placeholder="Dirección principal del proveedor" style={SI}/>
                </div>
                <div>
                  <LBL>Categoría</LBL>
                  <input value={provForm.categoria} onChange={e=>setProvForm({...provForm,categoria:e.target.value})} placeholder="Materiales / Transporte / Servicios" style={SI}/>
                </div>
                <div>
                  <LBL>Régimen tributario</LBL>
                  <select value={provForm.regimenTributario} onChange={e=>setProvForm({...provForm,regimenTributario:e.target.value})} style={SI}>
                    <option value="Ordinario">Ordinario</option>
                    <option value="Simple">Simple</option>
                    <option value="No responsable de IVA">No responsable de IVA</option>
                  </select>
                </div>
                <div>
                  <LBL>Municipio ICA</LBL>
                  <input value={provForm.municipioIca} onChange={e=>setProvForm({...provForm,municipioIca:e.target.value})} placeholder="Envigado / Medellín" style={SI}/>
                </div>
                <div>
                  <LBL>Código ICA</LBL>
                  <input value={provForm.codigoIca} onChange={e=>setProvForm({...provForm,codigoIca:e.target.value})} placeholder="Actividad ICA" style={SI}/>
                </div>
                <div style={{display:"flex",gap:12,alignItems:"center",paddingTop:26,gridColumn:"span 3",flexWrap:"wrap"}}>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#334155"}}><input type="checkbox" checked={provForm.responsableIva} onChange={e=>setProvForm({...provForm,responsableIva:e.target.checked})}/> Responsable de IVA</label>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#334155"}}><input type="checkbox" checked={provForm.agenteReteiva} onChange={e=>setProvForm({...provForm,agenteReteiva:e.target.checked})}/> Agente reteIVA</label>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#334155"}}><input type="checkbox" checked={provForm.autorretenedorRenta} onChange={e=>setProvForm({...provForm,autorretenedorRenta:e.target.checked})}/> Autorretenedor renta</label>
                </div>
                <div style={{gridColumn:"span 3"}}>
                  <LBL>Email</LBL>
                  <input value={provForm.email} onChange={e=>setProvForm({...provForm,email:e.target.value})} placeholder="correo@proveedor.com" style={SI}/>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={B("#f5c842","#3b2f00")} onClick={guardarProveedor}>{editProvId?"Guardar cambios":"Crear proveedor"}</button>
                <button style={B("#f1f5f9","#475569")} onClick={resetProveedor}>Cancelar</button>
              </div>
            </div>
          )}

          <div style={CD}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={ST}>Base de datos de proveedores</div>
              <div style={{fontSize:11,color:"#64748b"}}>Incluye perfil bancario y perfil tributario del proveedor</div>
            </div>

            {proveedoresData.length===0 ? (
              <div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>No hay proveedores registrados</div>
            ) : (
              <div style={{display:"grid",gap:12}}>
                {proveedoresData.map(p=>{
                  const pendientesProv=cuentasNorm.filter(c=>c.proveedorId===p.id&&Number(c.saldoPendienteActual||0)>0);
                  const totalProv=pendientesProv.reduce((s,c)=>s+Number(c.saldoPendienteActual||0),0);
                  return(
                    <div key={p.id} style={{background:"#f8fafc",borderRadius:10,padding:"16px 18px",border:"1px solid #e2e8f0"}}>
                      <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start",marginBottom:10}}>
                        <div>
                          <div style={{fontSize:15,fontWeight:800,color:"#1a1a2e"}}>{p.nombre}</div>
                          <div style={{fontSize:11,color:"#64748b",marginTop:3}}>
                            {p.nit || "Sin NIT"} · {p.contacto || "Sin contacto"} · {p.telefono || p.tel || "Sin teléfono"}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",justifyContent:"flex-end"}}>
                          <Badge estado={pendientesProv.length?"Pendiente":"Pagado"}/>
                          {p.autorretenedorRenta && <span style={{fontSize:10,fontWeight:700,color:"#166534",background:"#ecfdf5",border:"1px solid #bbf7d0",padding:"5px 8px",borderRadius:999}}>Autorretenedor</span>}
                          <button style={{...B("#f1f5f9","#475569"),padding:"7px 12px",fontSize:11}} onClick={()=>editarProveedor(p)}>Editar</button>
                        </div>
                      </div>

                      <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr 1fr",gap:10,fontSize:11,color:"#475569"}}>
                        <div><strong style={{color:"#1a1a2e"}}>Dirección</strong><br/>{p.direccion || "Sin dirección registrada"}</div>
                        <div><strong style={{color:"#1a1a2e"}}>Banco</strong><br/>{p.banco || "Sin banco"}</div>
                        <div><strong style={{color:"#1a1a2e"}}>Cuenta</strong><br/>{p.numeroCuenta || "Sin número de cuenta"}</div>
                        <div><strong style={{color:"#1a1a2e"}}>Correo</strong><br/>{p.email || "Sin email"}</div>
                      </div>

                      <div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,flexWrap:"wrap",gap:10}}>
                        <div style={{color:"#64748b"}}>
                          {pendientesProv.length ? "Tiene " + pendientesProv.length + " cuenta(s) pendiente(s)" : "Sin cuentas pendientes"}
                        </div>
                        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                          <div style={{fontWeight:800,color:pendientesProv.length?"#c2410c":"#166534"}}>
                            {pendientesProv.length ? fmt(totalProv) : "Al día"}
                          </div>
                          <button style={{...B("#003B71"),padding:"7px 12px",fontSize:11}} onClick={()=>{setTab("pagos"); setVistaPagoCxP("registro"); setProveedorPagoId(p.id); setBusquedaProveedorPago(p.nombre || ""); scrollAppToTop("smooth");}}>Registrar pago</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}


function Obras({ctx}){
  const {obras,setObras,empleados,cotizaciones,cuentas,setCuentas,proveedores,horarios}=ctx;
  const [sel,setSel]=useState(null);
  const [detTab,setDetTab]=useState("personal");
  const [showNO,setShowNO]=useState(false);
  const [nob,setNob]=useState({cliente:"",tel:"",proyecto:"",ciudad:"",direccion:"",fechaInicio:today(),fechaFin:"",total:0,cotizacionId:""});
  const [gastoForm,setGastoForm]=useState({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
  const [showGasto,setShowGasto]=useState(false);

  const updAv=(id,v)=>setObras(p=>p.map(o=>o.id===id?{...o,avance:Math.min(100,Math.max(0,v))}:o));
  const updEst=(id,e)=>setObras(p=>p.map(o=>o.id===id?{...o,estado:e}:o));

  const guardarObra=()=>{
    if(!nob.cliente.trim())return;
    const id="OB-" + (String(obras.length+1).padStart(3,"0"));
    const cotizacionVinculada = nob.cotizacionId ? cotizaciones.find((cotizacion)=>cotizacion.id===nob.cotizacionId) : null;
    const snapshot = cotizacionVinculada ? getQuoteApprovalAccountingSnapshot(cotizacionVinculada) : null;
    const totalObra = snapshot?.totalObra ?? Number(nob.total || 0);
    setObras(p=>[...p,{
      ...nob,
      id,
      nit:"",
      coords:"",
      estado:"En Obra",
      avance:0,
      total:totalObra,
      pagado:0,
      saldo:totalObra,
      costos:0,
      empleados:[],
      trazos:[],
      anclajes:[],
      subtotalCotizacion:snapshot?.subtotalCotizacion ?? 0,
      utilidadCotizacion:snapshot?.utilidadCotizacion ?? 0,
      baseIngresoContable:snapshot?.baseIngresoContable ?? totalObra,
      ivaGeneradoCotizacion:snapshot?.ivaGeneradoCotizacion ?? 0,
    }]);
    if(nob.cotizacionId){
      ctx.setCotizaciones(p=>p.map(c=>c.id===nob.cotizacionId?{...c,estado:"Aprobada",obraId:id}:c));
    }
    setNob({cliente:"",tel:"",proyecto:"",ciudad:"",direccion:"",fechaInicio:today(),fechaFin:"",total:0,cotizacionId:""});
    setShowNO(false);
  };

  const guardarGasto=()=>{
    if(!sel||!gastoForm.concepto)return;
    const id="CP-" + (String(cuentas.length+1).padStart(3,"0"));
    setCuentas(p=>[...p,{id,...gastoForm,obraId:sel.id,estado:"Pendiente"}]);
    setGastoForm({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
    setShowGasto(false);
  };

  // Si hay obra seleccionada, mostramos pantalla completa de esa obra
  if(sel){
    return <ObraDetalle obraId={sel.id} ctx={ctx} onVolver={()=>setSel(null)}/>;
  }

  return(
    <div style={{padding:28}}>
      <H1 title="Ejecución de Obra" subtitle="Gestión completa: personal, gastos, nómina y tiempo por obra"
        action={<button style={B("#cc0000")} onClick={()=>setShowNO(!showNO)}>+ Nueva Obra</button>}/>

      {showNO&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #cc0000"}}>
          <div style={ST}>Nueva Obra</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <div><LBL>Cliente</LBL><input value={nob.cliente} onChange={e=>setNob({...nob,cliente:e.target.value})} placeholder="Nombre del cliente" style={SI}/></div>
            <div><LBL>Teléfono</LBL><input value={nob.tel} onChange={e=>setNob({...nob,tel:e.target.value})} placeholder="3001234567" style={SI}/></div>
            <div><LBL>Proyecto / Descripción</LBL><input value={nob.proyecto} onChange={e=>setNob({...nob,proyecto:e.target.value})} placeholder="Ej: Líneas de vida cubierta" style={SI}/></div>
            <div><LBL>Ciudad</LBL><input value={nob.ciudad} onChange={e=>setNob({...nob,ciudad:e.target.value})} placeholder="Ej: Medellín, Antioquia" style={SI}/></div>
            <div><LBL>Dirección</LBL><input value={nob.direccion} onChange={e=>setNob({...nob,direccion:e.target.value})} placeholder="Dirección de la obra" style={SI}/></div>
            <div><LBL>Valor total ($)</LBL><input type="number" value={nob.total} onChange={e=>setNob({...nob,total:parseFloat(e.target.value)||0})} style={SI}/></div>
            <div><LBL>Fecha inicio</LBL><input type="date" value={nob.fechaInicio} onChange={e=>setNob({...nob,fechaInicio:e.target.value})} style={SI}/></div>
            <div><LBL>Fecha fin estimada</LBL><input type="date" value={nob.fechaFin} onChange={e=>setNob({...nob,fechaFin:e.target.value})} style={SI}/></div>
            <div><LBL>Vincular cotización (opcional)</LBL>
              <select value={nob.cotizacionId} onChange={e=>setNob({...nob,cotizacionId:e.target.value})} style={SI}>
                <option value="">Sin cotización</option>
                {cotizaciones.filter(c=>!c.obraId).map(c=><option key={c.id} value={c.id}>{c.numero} · {c.cliente}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button onClick={guardarObra} style={B("#cc0000")}>✅ Crear Obra</button>
            <button onClick={()=>setShowNO(false)} style={B("#f1f5f9","#475569")}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {obras.map(o=>{
          const cotVinc=cotizaciones.find(c=>c.id===o.cotizacionId);
          const gastosObra=cuentas.filter(c=>c.obraId===o.id).reduce((s,c)=>s+c.monto,0);
          return(
            <div key={o.id} style={{...CD,border:"1px solid #e2e8f0",cursor:"pointer",transition:"all 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.borderColor="#cc0000"}
              onMouseLeave={e=>e.currentTarget.style.borderColor="#e2e8f0"}
              onClick={()=>{setSel(o);setDetTab("personal");}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>{o.id} · {fmtD(o.fechaInicio)}</div>
                  <div style={{fontSize:15,fontWeight:700,marginTop:2,color:"#1a1a2e"}}>{o.cliente}</div>
                  <div style={{fontSize:12,color:"#475569"}}>{o.proyecto}</div>
                  {cotVinc&&<div style={{fontSize:10,color:"#b45309",marginTop:2}}>📄 {o.cotizacionId}</div>}
                </div>
                <Badge estado={o.estado}/>
              </div>
              <div style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:4}}>
                  <span>Avance</span><span style={{color:o.avance===100?"#166534":"#f47c20",fontWeight:600}}>{o.avance}%</span>
                </div>
                <div style={{height:5,background:"#e2e8f0",borderRadius:3}}>
                  <div style={{width:(o.avance) + "%",height:"100%",background:o.avance===100?"#4ade80":"#f47c20",borderRadius:3}}/>
                </div>
                <input type="range" min={0} max={100} value={o.avance}
                  onChange={e=>updAv(o.id,Number(e.target.value))}
                  style={{width:"100%",marginTop:4,accentColor:"#f47c20"}}
                  onClick={e=>e.stopPropagation()}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,marginBottom:10}}>
                {[["Total",fmt(o.total),"#1a1a2e"],["Cobrado",fmt(o.pagado),"#166534"],["Saldo",fmt(o.saldo),o.saldo>0?"#c2410c":"#166534"],["Gastos",fmt(gastosObra),"#7c3aed"]].map(([k,v,c])=>(
                  <div key={k} style={{background:"#f8fafc",borderRadius:6,padding:"6px 8px",border:"1px solid #f1f5f9"}}>
                    <div style={{fontSize:8,color:"#94a3b8",textTransform:"uppercase",marginBottom:2}}>{k}</div>
                    <div style={{fontSize:11,fontWeight:700,color:c}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <select value={o.estado} onChange={e=>{e.stopPropagation();updEst(o.id,e.target.value);}}
                  style={{...SI,fontSize:11,padding:"5px 8px",flex:1}} onClick={e=>e.stopPropagation()}>
                  {["Cotización","En Obra","Finalizado","Pagado"].map(s=><option key={s}>{s}</option>)}
                </select>
                <span style={{fontSize:11,color:"#94a3b8",flexShrink:0}}>{(o.empleados||[]).length} 👷</span>
                <span style={{fontSize:11,color:"#cc0000",fontWeight:600,flexShrink:0}}>Ver →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── DETALLE COMPLETO DE UNA OBRA ──
function ObraDetalle({obraId,ctx,onVolver}){
  const {obras,setObras,empleados,cotizaciones,cuentas,setCuentas,proveedores,horarios}=ctx;
  const [detTab,setDetTab]=useState("personal");
  const [gastoForm,setGastoForm]=useState({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
  const [showGasto,setShowGasto]=useState(false);

  const oAct=obras.find(o=>o.id===obraId);
  if(!oAct)return null;

  const gastosObra=cuentas.filter(c=>c.obraId===obraId);
  const totalGastos=gastosObra.reduce((s,c)=>s+c.monto,0);
  const horariosObra=horarios.filter(h=>h.obraId===obraId);
  const empObra=oAct.empleados||[];
  const cotVinc=cotizaciones.find(c=>c.id===oAct.cotizacionId);

  const diasMap={};
  horariosObra.forEach(h=>{if(!diasMap[h.empleadoId])diasMap[h.empleadoId]=new Set();diasMap[h.empleadoId].add(h.fecha);});
  const totalDias=Object.values(diasMap).reduce((s,set)=>s+set.size,0);
  const nomObraTotal=empObra.reduce((s,eid)=>{
    const e=empleados.find(x=>x.id===eid);
    if(!e)return s;
    const dias=diasMap[eid]?diasMap[eid].size:0;
    return s+Math.round(e.salario/26)*dias;
  },0);

  const guardarGasto=()=>{
    if(!gastoForm.concepto)return;
    const id="CP-" + (String(cuentas.length+1).padStart(3,"0"));
    setCuentas(p=>[...p,{id,...gastoForm,obraId,estado:"Pendiente"}]);
    setGastoForm({proveedorId:"PROV-001",concepto:"",monto:0,fecha:today(),fechaVence:"",factura:""});
    setShowGasto(false);
  };

  return(
    <div style={{padding:28}}>
      {/* Barra superior */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24,background:"#fff",borderRadius:14,padding:"16px 20px",border:"1px solid #e2e8f0",boxShadow:"0 2px 8px rgba(0,0,0,0.05)"}}>
        <button onClick={onVolver} style={{...B("#f1f5f9","#475569"),padding:"8px 16px",fontSize:13,flexShrink:0}}>← Volver</button>
        <div style={{flex:1}}>
          <div style={{fontSize:11,color:"#94a3b8"}}>{oAct.id} · {fmtD(oAct.fechaInicio)} → {fmtD(oAct.fechaFin)||"En curso"}</div>
          <div style={{fontSize:20,fontWeight:700,color:"#1a1a2e",lineHeight:1.2}}>{oAct.cliente}</div>
          <div style={{fontSize:13,color:"#475569"}}>{oAct.proyecto} · 📍 {oAct.ciudad}</div>
          {oAct.direccion&&<div style={{fontSize:11,color:"#94a3b8"}}>{oAct.direccion}</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
          <Badge estado={oAct.estado}/>
          {cotVinc&&<div style={{fontSize:11,color:"#b45309"}}>📄 {cotVinc.numero}</div>}
        </div>
      </div>

      {/* KPIs */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:12,marginBottom:24}}>
        {[
          ["💰 Ingreso total",fmt(oAct.total),"#166534"],
          ["✅ Cobrado",fmt(oAct.pagado),"#1d4ed8"],
          ["? Saldo",fmt(oAct.saldo),oAct.saldo>0?"#c2410c":"#166534"],
          ["🧾 Gastos",fmt(totalGastos),"#7c3aed"],
          ["👷 Personal",(empObra.length) + " pers.","#0891b2"],
          ["📅 Días obra",(totalDias) + " días","#b45309"],
        ].map(([k,v,c])=>(
          <div key={k} style={{background:"#fff",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0",textAlign:"center"}}>
            <div style={{fontSize:10,color:"#94a3b8",marginBottom:6}}>{k}</div>
            <div style={{fontSize:16,fontWeight:700,color:c}}>{v}</div>
          </div>
        ))}
      </div>

      {/* Avance */}
      <div style={{...CD,marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
          <span style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>Avance de la obra</span>
          <span style={{fontSize:18,fontWeight:700,color:oAct.avance===100?"#166534":"#f47c20"}}>{oAct.avance}%</span>
        </div>
        <div style={{height:10,background:"#f1f5f9",borderRadius:5,marginBottom:8}}>
          <div style={{width:(oAct.avance) + "%",height:"100%",background:oAct.avance===100?"#4ade80":"#f47c20",borderRadius:5,transition:"width 0.3s"}}/>
        </div>
        <input type="range" min={0} max={100} value={oAct.avance}
          onChange={e=>setObras(p=>p.map(o=>o.id===obraId?{...o,avance:Number(e.target.value)}:o))}
          style={{width:"100%",accentColor:"#f47c20"}}/>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap"}}>
        {[["personal","👷 Personal"],["gastos","🧾 Gastos"],["nomina","💰 Nómina"],["horario","📅 Horario"]].map(([id,lb])=>(
          <button key={id} onClick={()=>setDetTab(id)}
            style={{...B(detTab===id?"#cc0000":"#f1f5f9",detTab===id?"#fff":"#475569"),fontSize:12,padding:"8px 16px",border:"1px solid " + (detTab===id?"#cc0000":"#e2e8f0")}}>
            {lb}
          </button>
        ))}
      </div>

      {/* TAB PERSONAL */}
      {detTab==="personal"&&(
        <div style={CD}>
          <div style={ST}>👷 Personal en obra</div>
          {empObra.length===0&&(
            <div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13,background:"#f8fafc",borderRadius:10,border:"1px dashed #e2e8f0",marginBottom:12}}>
              Sin empleados asignados aún
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            {empObra.map((eid,idx)=>{
              const emp=empleados.find(x=>x.id===eid);
              if(!emp)return null;
              const diasEmp=diasMap[eid]?diasMap[eid].size:0;
              const jornal=Math.round(emp.salario/26);
              return(
                <div key={eid} style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <Av init={emp.avatar} color={PAL[idx%PAL.length]} size={36}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13,fontWeight:700}}>{emp.nombre}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>{emp.cargo}</div>
                      <div style={{fontSize:10,color:"#94a3b8"}}>📱 {emp.tel}</div>
                    </div>
                    <button onClick={()=>setObras(p=>p.map(o=>o.id===obraId?{...o,empleados:(o.empleados||[]).filter(id=>id!==eid)}:o))}
                      style={{background:"#fee2e2",border:"1px solid #fca5a5",color:"#cc0000",borderRadius:6,padding:"4px 8px",cursor:"pointer",fontSize:11}}>✕</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:10}}>
                    {[["Días en obra",diasEmp+"d","#1d4ed8"],["Jornal/día",fmt(jornal),"#166534"],["Costo obra",fmt(jornal*diasEmp),"#7c3aed"]].map(([k,v,c])=>(
                      <div key={k} style={{background:"#fff",borderRadius:5,padding:"6px 8px",textAlign:"center",border:"1px solid #f1f5f9"}}>
                        <div style={{color:"#94a3b8",marginBottom:2,fontSize:9}}>{k}</div>
                        <div style={{fontWeight:700,color:c,fontSize:12}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:8,fontSize:10,color:"#94a3b8"}}>🏦 {emp.banco} · {emp.tipoCuenta} · <span style={{fontFamily:"monospace"}}>{emp.numeroCuenta||"—"}</span></div>
                </div>
              );
            })}
          </div>
          <div>
            <LBL>➕ Asignar empleado a esta obra</LBL>
            <select value="" onChange={ev=>{
              const v=ev.target.value;
              if(!v)return;
              if(!empObra.includes(v))
                setObras(p=>p.map(o=>o.id===obraId?{...o,empleados:[...(o.empleados||[]),v]}:o));
            }} style={{...SI,border:"2px solid #cc0000",fontSize:12}}>
              <option value="">Selecciona un empleado...</option>
              {empleados.filter(emp=>!empObra.includes(emp.id)).map(emp=>(
                <option key={emp.id} value={emp.id}>{emp.nombre} · {emp.cargo}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* TAB GASTOS */}
      {detTab==="gastos"&&(
        <div style={CD}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={ST}>🧾 Gastos y cuentas por pagar</div>
            <button style={B("#cc0000")} onClick={()=>setShowGasto(!showGasto)}>+ Agregar gasto</button>
          </div>
          {showGasto&&(
            <div style={{background:"#f8fafc",border:"1px solid #cc000033",borderRadius:10,padding:16,marginBottom:16}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                <div><LBL>Proveedor</LBL>
                  <select value={gastoForm.proveedorId} onChange={e=>setGastoForm({...gastoForm,proveedorId:e.target.value})} style={SI}>
                    {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div><LBL>N° Factura</LBL><input value={gastoForm.factura} onChange={e=>setGastoForm({...gastoForm,factura:e.target.value})} placeholder="FV-2026-0001" style={SI}/></div>
                <div style={{gridColumn:"span 2"}}><LBL>Concepto</LBL><input value={gastoForm.concepto} onChange={e=>setGastoForm({...gastoForm,concepto:e.target.value})} placeholder="Descripción del gasto" style={SI}/></div>
                <div><LBL>Monto ($)</LBL><input type="number" value={gastoForm.monto} onChange={e=>setGastoForm({...gastoForm,monto:parseFloat(e.target.value)||0})} style={SI}/></div>
                <div><LBL>Fecha factura</LBL><input type="date" value={gastoForm.fecha} onChange={e=>setGastoForm({...gastoForm,fecha:e.target.value})} style={SI}/></div>
                <div><LBL>Fecha vencimiento</LBL><input type="date" value={gastoForm.fechaVence} onChange={e=>setGastoForm({...gastoForm,fechaVence:e.target.value})} style={SI}/></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={B("#cc0000")} onClick={guardarGasto}>✅ Guardar gasto</button>
                <button style={B("#f1f5f9","#475569")} onClick={()=>setShowGasto(false)}>Cancelar</button>
              </div>
            </div>
          )}
          {gastosObra.length===0&&!showGasto&&<div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>Sin gastos registrados aún</div>}
          {gastosObra.map(c=>{
            const prov=proveedores.find(p=>p.id===c.proveedorId);
            const vencida=c.estado==="Pendiente"&&c.fechaVence&&c.fechaVence<today();
            return(
              <div key={c.id} style={{background:"#f8fafc",borderRadius:10,padding:"12px 14px",marginBottom:8,border:"1px solid " + (vencida?"#fca5a5":c.estado==="Pagado"?"#bbf7d0":"#e2e8f0")}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                  <div><div style={{fontSize:13,fontWeight:600}}>{c.concepto}</div><div style={{fontSize:11,color:"#64748b"}}>{prov?.nombre} · {c.factura}</div></div>
                  <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:"#cc0000"}}>{fmt(c.monto)}</div><Badge estado={vencida?"Vencida":c.estado}/></div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11,color:"#94a3b8"}}>
                  <span>Vence: {fmtD(c.fechaVence)||"—"}</span>
                  {c.estado==="Pendiente"&&<button onClick={()=>setCuentas(p=>p.map(x=>x.id===c.id?{...x,estado:"Pagado"}:x))} style={{background:"#dcfce7",border:"1px solid #4ade80",color:"#166534",borderRadius:6,padding:"3px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>✓ Pagar</button>}
                </div>
              </div>
            );
          })}
          <div style={{background:"#f1f5f9",borderRadius:8,padding:"12px 16px",marginTop:8,display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:600}}>
            <span style={{color:"#64748b"}}>Total gastos</span>
            <span style={{color:"#cc0000"}}>{fmt(totalGastos)}</span>
          </div>
          {oAct.total>0&&<div style={{background:totalGastos/oAct.total<0.4?"#dcfce7":"#fff7ed",borderRadius:8,padding:"10px 14px",marginTop:6,fontSize:11,color:"#475569"}}>Gastos = <strong style={{color:totalGastos/oAct.total<0.4?"#166534":"#c2410c"}}>{Math.round(totalGastos/oAct.total*100)}%</strong> del ingreso total</div>}
        </div>
      )}

      {/* TAB NÓMINA */}
      {detTab==="nomina"&&(
        <div style={CD}>
          <div style={ST}>💰 Nómina proporcional por obra</div>
          <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 14px",marginBottom:14,fontSize:11,color:"#475569",border:"1px solid #e2e8f0"}}>Cálculo: días trabajados × jornal diario (salario ÷ 26 días)</div>
          {empObra.length===0&&<div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>Sin personal asignado</div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            {empObra.map((eid,idx)=>{
              const emp=empleados.find(x=>x.id===eid);
              if(!emp)return null;
              const diasEmp=diasMap[eid]?diasMap[eid].size:0;
              const jornal=Math.round(emp.salario/26);
              const subtotal=jornal*diasEmp;
              const ded=Math.round(subtotal*0.04);
              return(
                <div key={eid} style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                    <Av init={emp.avatar} color={PAL[idx%PAL.length]} size={34}/>
                    <div><div style={{fontSize:13,fontWeight:700}}>{emp.nombre}</div><div style={{fontSize:11,color:"#64748b"}}>{emp.cargo}</div></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                    {[["Días",diasEmp+"d","#1d4ed8"],["Jornal",fmt(jornal),"#166534"],["Bruto",fmt(subtotal),"#b45309"],["Neto",fmt(subtotal-ded),"#cc0000"]].map(([k,v,c])=>(
                      <div key={k} style={{background:"#fff",borderRadius:6,padding:"8px",textAlign:"center",border:"1px solid #f1f5f9"}}>
                        <div style={{color:"#94a3b8",fontSize:9,marginBottom:3}}>{k}</div>
                        <div style={{fontWeight:700,color:c,fontSize:11}}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:8,fontSize:10,color:"#94a3b8"}}>🏦 {emp.banco} · {emp.tipoCuenta} · <span style={{fontFamily:"monospace"}}>{emp.numeroCuenta||"—"}</span></div>
                </div>
              );
            })}
          </div>
          {empObra.length>0&&(
            <div style={{background:"#f1f5f9",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,textAlign:"center",fontSize:12}}>
                <div><div style={{color:"#64748b",marginBottom:4}}>Total días trabajados</div><div style={{fontWeight:700,color:"#1d4ed8",fontSize:18}}>{totalDias}</div></div>
                <div><div style={{color:"#64748b",marginBottom:4}}>Nómina total obra</div><div style={{fontWeight:700,color:"#cc0000",fontSize:18}}>{fmt(nomObraTotal)}</div></div>
                <div><div style={{color:"#64748b",marginBottom:4}}>% del ingreso</div><div style={{fontWeight:700,color:oAct.total>0&&nomObraTotal/oAct.total<0.3?"#166534":"#c2410c",fontSize:18}}>{oAct.total>0?Math.round(nomObraTotal/oAct.total*100):0}%</div></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB HORARIO */}
      {detTab==="horario"&&(
        <div style={CD}>
          <div style={ST}>📅 Horario y turnos en esta obra</div>
          {horariosObra.length===0&&<div style={{textAlign:"center",padding:24,color:"#94a3b8",fontSize:13}}>Sin turnos registrados. Ve a <strong>Horarios</strong> para agregar.</div>}
          {horariosObra.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(h=>{
            const emp=empleados.find(x=>x.id===h.empleadoId);
            const idx=empleados.findIndex(x=>x.id===h.empleadoId);
            return(
              <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,background:"#f8fafc",borderRadius:10,padding:"10px 14px",marginBottom:8,border:"1px solid #e2e8f0"}}>
                <Av init={emp?.avatar||"?"} color={PAL[idx%PAL.length]} size={32}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:600}}>{emp?.nombre||"—"}</div>
                  <div style={{fontSize:11,color:"#475569"}}>{h.tarea}</div>
                </div>
                <div style={{textAlign:"right",fontSize:11}}>
                  <div style={{color:"#64748b",fontWeight:500}}>{fmtD(h.fecha)}</div>
                  <div style={{color:"#cc0000",fontWeight:700}}>{h.turno}</div>
                </div>
              </div>
            );
          })}
          {horariosObra.length>0&&(
            <div style={{background:"#f1f5f9",borderRadius:8,padding:"10px 14px",marginTop:8,fontSize:12,color:"#64748b"}}>
              {horariosObra.length} turno(s) · {new Set(horariosObra.map(h=>h.empleadoId)).size} persona(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ======================================================
// CERTIFICACIONES
// ======================================================
const CERT_ELEMENTOS_DEFAULT = [
  "Perno Grado 8 B7 Ø 5/8",
  "Arandela Ø 5/8",
  "Tuerca Ø 5/8",
  "Cable diámetro 5/16\" (8mm) galvanizado",
  "Tensor cable",
  "Soportes laterales e intermedios",
];

const RECERT_ELEMENTOS_DEFAULT = [
  "Limpieza sistema completo",
  "Verificación ajuste tuercas y pernos",
  "Laca protectora anticorrosiva en todos los puntos",
  "Tensado de cables",
];

const CERT_ELEMENTOS_BY_SISTEMA = {
  "Líneas de vida horizontales": [
    "Perno Grado 8 B7 Ø 5/8",
    "Arandela Ø 5/8",
    "Tuerca Ø 5/8",
    "Cable diámetro 5/16\" (8mm) galvanizado",
    "Guardacables",
    "Tensor cable",
    "Soportes laterales e intermedios",
  ],
  "Puntos de anclaje": [
    "Perno Grado 8 B7 Ø 5/8",
    "Arandela Ø 5/8",
    "Tuerca Ø 5/8",
    "Punto de anclaje ARTICO acero galvanizado",
    "Epóxico ProAnchor Elite ESP",
  ],
  "Escalera fija": [
    "Peldaños acero galvanizado",
    "Largueros perfil L",
    "Pernos de fijación",
    "Guardacuerpo lateral",
    "Línea de vida vertical integrada",
  ],
  "Línea de vida vertical": [
    "Cable de acero Ø 8mm galvanizado",
    "Absorbedor de caída",
    "Dispositivo deslizante",
    "Anclaje superior e inferior",
    "Tensor y guardacables",
  ],
};

const getCertDefaultElements = (tipo="Certificación", tipoSistema="", fallback=[])=>{
  if (Array.isArray(fallback) && fallback.length) return [...fallback];
  if (tipo === "Recertificación") return [...RECERT_ELEMENTOS_DEFAULT];
  if (tipoSistema && CERT_ELEMENTOS_BY_SISTEMA[tipoSistema]) return [...CERT_ELEMENTOS_BY_SISTEMA[tipoSistema]];
  return [...CERT_ELEMENTOS_DEFAULT];
};

const buildCertForm = (overrides={})=>{
  const tipo = overrides.tipo || "Certificación";
  const tipoSistema = overrides.tipoSistema || "";
  return {
    obraId: "OB-001",
    tipo,
    tipoSistema,
    numero: "",
    fecha: today(),
    cliente: "",
    nit: "",
    direccion: "",
    sistema: "",
    normativa: "Resolución 4272 de 2021",
    ingeniero: "ING. JHON JAIME SEPULVEDA LONDOÑO",
    matricula: "MP. 05256-409949",
    proxMant: "",
    elementos: getCertDefaultElements(tipo, tipoSistema, overrides.elementos),
    ...overrides,
  };
};

function CertificacionDocumento({cert}){
  if(!cert) return null;
  const esRecertificacion = cert.tipo==="Recertificación";
  const elementos = Array.isArray(cert.elementos) ? cert.elementos : [];
  return(
    <div id="pz" className="doc-shell" style={{background:"#fff",color:"#111",fontFamily:"'Aptos','Segoe UI',sans-serif",fontSize:12,lineHeight:1.7,border:"1px solid #ddd",borderRadius:4,padding:"36px 44px"}}>
      <div style={{padding:"0 0 14px"}}>
        <PrintHeader dual={true}/>
      </div>
      <div style={{textAlign:"center",fontSize:10,fontWeight:700,letterSpacing:2,padding:"6px 0",borderBottom:"1px solid #ddd",color:"#333",textTransform:"uppercase",marginBottom:20}}>
        {esRecertificacion ? "Recertificación de Sistemas Anticaídas · Res. 4272/2021" : "Certificación de Sistemas Anticaídas · Res. 4272/2021"}
      </div>
      <div style={{marginBottom:20}}>
        <div>Envigado, {fmtL(cert.fecha)}</div>
        <div style={{marginTop:10,fontWeight:700}}>SEÑORES:</div>
        <div style={{fontWeight:700}}>{(cert.cliente||"").toUpperCase()}</div>
        {cert.nit&&<div>NIT: {cert.nit}</div>}
        {cert.direccion&&<div>DIRECCIÓN: {cert.direccion.toUpperCase()}</div>}
      </div>
      <div style={{textAlign:"center",fontWeight:700,fontSize:15,marginBottom:20}}>INGEANCLAJES S.A.S</div>

      {esRecertificacion?(
        <div style={{textAlign:"justify",lineHeight:1.8,marginBottom:20}}>
          <p style={{marginBottom:12}}>Ha realizado el mantenimiento preventivo en las instalaciones de {cert.sistema}, que consta de:</p>
          <p style={{marginBottom:12}}>Limpieza de todo el sistema. Se verifica ajuste de las tuercas y pernos de los puntos de anclaje, finalmente se procedió a dar una laca protectora anticorrosiva como recubrimiento especial en todos los puntos de anclaje para evitar futuras oxidaciones.</p>
          <p style={{marginBottom:12}}>Nuestra empresa se compromete a garantizar la calidad y seguridad de los materiales proporcionados para la instalación de los puntos de anclaje. Nos enfocamos en cumplir con todas las normativas y estándares de la industria, así como en utilizar materiales de alta calidad que cumplan con las especificaciones técnicas requeridas.</p>
          <p style={{marginBottom:12}}>Por otro lado, los pernos utilizados en los puntos de anclaje son seleccionados cuidadosamente para garantizar su resistencia y capacidad de fijación. Trabajamos con proveedores confiables que suministran pernos de alta calidad que cumplen con las normativas de seguridad establecidas.</p>
          <p style={{marginBottom:12}}>En cuanto al epóxico utilizado, nos aseguramos de utilizar productos de reconocidas marcas y de calidad certificada. Nuestro personal altamente capacitado realiza la instalación siguiendo las instrucciones y recomendaciones del fabricante, asegurando así una correcta adherencia y resistencia en los puntos de anclaje.</p>
          <p style={{marginBottom:12}}>Nos comprometemos a cumplir con todas las regulaciones legales vigentes y a realizar un seguimiento riguroso de las inspecciones y pruebas necesarias para garantizar la calidad de los materiales y la adecuada instalación de los puntos de anclaje.</p>
          <p style={{marginBottom:12}}>En caso de que se presenten problemas o fallas relacionadas con los materiales suministrados o la instalación de los puntos de anclaje, nos responsabilizamos totalmente de solventar cualquier inconveniente y cubrir los costos asociados a su corrección. De acuerdo a las labores anteriormente descritas <strong>INGEANCLAJES S.A.S. CERTIFICA</strong> que los sistemas de detención de caídas instalados en las instalaciones de la empresa <strong>{(cert.cliente||"").toUpperCase()}</strong>{cert.direccion?" ubicada en " + (cert.direccion.toUpperCase()):""} y cuyo objetivo es la fijación segura de los trabajadores al momento de realizar tareas que impliquen riesgo de caída, cumplen a cabalidad con la {cert.normativa} del ministerio de trabajo, por la cual se establece el reglamento de seguridad para protección contra caídas en trabajo en altura. Todos los elementos que componen los diferentes sistemas anticaídas se encuentran en excelente estado.</p>
        </div>
      ):(
        <div style={{textAlign:"justify",marginBottom:20,lineHeight:1.8}}>
          <strong>CERTIFICA</strong> que {cert.sistema} cumple a cabalidad con la {cert.normativa} del ministerio de trabajo, por la cual se establece el reglamento de seguridad para protección contra caídas en trabajo en altura.
        </div>
      )}

      <div style={{marginBottom:16}}>Los elementos utilizados en dicha labor son:</div>
      <ul style={{marginLeft:24,marginBottom:20}}>
        {elementos.map((el,i)=><li key={i} style={{marginBottom:6}}>{el}</li>)}
      </ul>
      <div style={{background:"#f9f9f9",border:"1px solid #ddd",borderRadius:6,padding:"14px 18px",marginBottom:20}}>
        <div style={{fontWeight:700,marginBottom:10,fontSize:12}}>RECOMENDACIONES PARA TENER EN CUENTA</div>
        <div style={{fontSize:12,marginBottom:10,textAlign:"justify"}}>A continuación, se realizan algunas recomendaciones para preservar en buen estado los sistemas anti caídas certificados en dicha sede:</div>
        <ul style={{marginLeft:20,fontSize:12,lineHeight:1.9,marginBottom:10}}>
          <li>Dar aviso de inmediato, en caso de tener algún evento de caída por muy mínima que sea para hacer su respectiva valoración y diagnóstico.</li>
          <li>Conectar máximo dos personas por cada línea de vida o en cada tramo entre soportes laterales e intermedios.</li>
          <li>No modificar ningún elemento del sistema, ya que este puede perder sus funciones y generaría un riesgo más para las personas que las utilizan.</li>
          <li>Limpiar de inmediato las estructuras u otro elemento que entren en contacto con los químicos de esta área.</li>
        </ul>
        <div style={{fontSize:12,textAlign:"justify",lineHeight:1.7}}>
          Estas recomendaciones son de carácter técnico, por lo tanto, su cumplimiento debe ser obligatorio para minimizar el riesgo generado por la falta y/o ausencia de algunos de sus elementos, ya que estos tienen como principal característica soportar las cargas generadas por la caída de una persona en la realización de trabajos en alturas. Se debe realizar el próximo mantenimiento preventivo de todo el sistema máximo dentro de un año contado a partir de la expedición del presente documento{cert.proxMant?" (antes del " + (fmtL(cert.proxMant)) + ")":"."}.
        </div>
      </div>
      <div style={{marginBottom:12,fontSize:12}}>Cordialmente,</div>
      <div style={{height:72}}></div>
      <div>
        <div style={{borderTop:"1px solid #333",paddingTop:10,display:"inline-block",minWidth:240}}>
          <div style={{fontWeight:700}}>{cert.ingeniero}</div>
          <div>{cert.matricula}</div>
        </div>
      </div>
      <div style={{borderTop:"1px solid #ccc",paddingTop:10,marginTop:30,textAlign:"center",fontSize:10,color:"#555"}}>
        Cl 38 sur # 36-48, Envigado, tel. 448 26 86 · Cel. 314 863 40 72 · Nit. 900193965-4 · ingeanclajes.sas@gmail.com
      </div>
    </div>
  );
}

function CertificacionDetalle({cert,onVolver,onEditar,onImprimir,subtitle="Vista previa del documento"}) {
  if(!cert) return null;
  return(
    <div>
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <button style={B("#f1f5f9","#475569")} onClick={onVolver}>Volver</button>
        {typeof onEditar==="function" && <button style={{...B("#dbeafe","#1e40af")}} onClick={()=>onEditar(cert)}>Editar</button>}
        {typeof onImprimir==="function" && <button style={B("#f47c20")} onClick={()=>onImprimir(cert)}>Imprimir PDF</button>}
      </div>
      <div style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:12,padding:"12px 14px",marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:"#9a3412",textTransform:"uppercase",letterSpacing:0.7}}>Certificación</div>
        <div style={{fontSize:13,color:"#7c2d12",marginTop:4}}>{subtitle}</div>
      </div>
      <div style={{maxWidth:980}}>
        <CertificacionDocumento cert={cert}/>
      </div>
    </div>
  );
}

function Certificaciones({ctx}){
  const {certs,setCerts,obras}=ctx;
  const [sel,setSel]=useState(null);
  const [nueva,setNueva]=useState(false);
  const [editId,setEditId]=useState(null);
  const [form,setForm]=useState(buildCertForm());
  const [nuevoElem,setNuevoElem]=useState("");

  const abrirNuevaCertificacion = (tipo="Certificación")=>{
    setEditId(null);
    setNuevoElem("");
    setForm(buildCertForm({tipo, elementos:getCertDefaultElements(tipo)}));
    setNueva(true);
  };

  const editarCertificacion = (cert)=>{
    setEditId(cert.id);
    setNuevoElem("");
    setForm(buildCertForm(cert));
    setNueva(true);
    setSel(cert);
  };

  const guardar=()=>{
    const c=editId
      ? {...form,id:editId,estado:form.estado||"Vigente"}
      : {id:"CERT-" + (String(certs.length+1).padStart(3,"0")),estado:"Vigente",...form};
    setCerts(prev=>editId ? prev.map(item=>item.id===editId?{...item,...c}:item) : [...prev,c]);
    setNueva(false);
    setSel(c);
    setEditId(null);
  };

  const imprimir=(c)=>{setSel(c);setTimeout(()=>printCurrentPz("Certificación " + (c?.numero || c?.id || "")),250);};

  return(
    <div style={{padding:28}}>
      <H1 title="Certificaciones" subtitle="Certificados y recertificaciones de sistemas anticaídas · Res. 4272/2021"
        action={
          <div style={{display:"flex",gap:8}}>
            <button style={B("#f47c20")} onClick={()=>abrirNuevaCertificacion("Certificación")}>+ Nueva Certificación</button>
            <button style={{...B("#4ade80","#0f2d1a"),border:"1px solid #166534"}} onClick={()=>abrirNuevaCertificacion("Recertificación")}>+ Nueva Recertificación</button>
          </div>
        }/>

      {nueva&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #cc0000"}}>
          <div style={ST}>{editId ? "Editar Certificación / Recertificación" : "Nueva Certificación / Recertificación"}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:12}}>
            <div><LBL>Tipo</LBL><select value={form.tipo} onChange={e=>{
              const t=e.target.value;
              setForm({...form,tipo:t,elementos:getCertDefaultElements(t, form.tipoSistema)});
            }} style={SI}>{["Certificación","Recertificación"].map(t=><option key={t}>{t}</option>)}</select></div>
            <div><LBL>Sistema certificado</LBL><select value={form.tipoSistema||""} onChange={e=>{
              const s=e.target.value;
              setForm({...form,tipoSistema:s,elementos:getCertDefaultElements(form.tipo, s)});
            }} style={SI}>
              <option value="">Seleccionar tipo de sistema...</option>
              {["Líneas de vida horizontales","Puntos de anclaje","Escalera fija","Línea de vida vertical"].map(s=><option key={s}>{s}</option>)}
            </select></div>
            <div><LBL>Número</LBL><input value={form.numero} onChange={e=>setForm({...form,numero:e.target.value})} placeholder="C-2026-001" style={SI}/></div>
            <div><LBL>Fecha</LBL><input type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})} style={SI}/></div>
            <div><LBL>Obra asociada</LBL><select value={form.obraId} onChange={e=>{const o=obras.find(x=>x.id===e.target.value);setForm({...form,obraId:e.target.value,cliente:o?.cliente||"",direccion:o?.direccion||""});}} style={SI}>{obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
            <div><LBL>Cliente</LBL><input value={form.cliente} onChange={e=>setForm({...form,cliente:e.target.value})} style={SI}/></div>
            <div><LBL>NIT</LBL><input value={form.nit} onChange={e=>setForm({...form,nit:e.target.value})} style={SI}/></div>
            <div style={{gridColumn:"span 2"}}><LBL>Dirección de la obra</LBL><input value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})} style={SI}/></div>
            <div><LBL>Próximo mantenimiento</LBL><input type="date" value={form.proxMant} onChange={e=>setForm({...form,proxMant:e.target.value})} style={SI}/></div>
          </div>
          <div style={{marginBottom:12}}><LBL>Sistema certificado</LBL><textarea value={form.sistema} onChange={e=>setForm({...form,sistema:e.target.value})} rows={2} placeholder="Ej: 23 Líneas de vida horizontales con sus conectoras instaladas sobre las cubiertas..." style={{...SI,resize:"vertical"}}/></div>
          <div style={{marginBottom:12}}>
            <LBL>Elementos utilizados</LBL>
            {form.elementos.map((el,i)=>(
              <div key={i} style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                <input value={el} onChange={e=>setForm({...form,elementos:form.elementos.map((x,j)=>j===i?e.target.value:x)})} style={{...SI,fontSize:12}} />
                <button onClick={()=>setForm({...form,elementos:form.elementos.filter((_,j)=>j!==i)})} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,width:28,height:28,cursor:"pointer",fontSize:14,flexShrink:0}}>×</button>
              </div>
            ))}
            <div style={{display:"flex",gap:8,marginTop:6}}>
              <input value={nuevoElem} onChange={e=>setNuevoElem(e.target.value)} placeholder="Agregar elemento..." style={{...SI,fontSize:12}}/>
              <button onClick={()=>{if(nuevoElem){setForm({...form,elementos:[...form.elementos,nuevoElem]});setNuevoElem("");}}} style={{...B("#fff3e8","#f47c20"),border:"1px dashed #cc0000",flexShrink:0}}>+</button>
            </div>
          </div>
          <div style={{display:"flex",gap:10}}>
            <button style={B("#4ade80","#0f2d1a")} onClick={guardar}>{editId ? "Guardar cambios" : "Guardar certificación"}</button>
            <button style={B("#f1f5f9","#475569")} onClick={()=>{setNueva(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}

      {!sel&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,alignContent:"start"}}>
          {certs.map(c=>(
            <div key={c.id} style={{...CD,border:"1px solid " + (sel?.id===c.id?"#f47c20":"#1a3050"),cursor:"pointer"}} onClick={()=>setSel(c)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div>
                  <div style={{fontSize:11,color:"#64748b"}}>{c.id} · {c.numero}</div>
                  <div style={{fontSize:14,fontWeight:700,marginTop:2}}>{c.cliente}</div>
                  <div style={{fontSize:11,color:"#475569"}}>{c.tipo}</div>
                </div>
                <Badge estado={c.estado}/>
              </div>
              <div style={{fontSize:11,color:"#64748b",marginBottom:6}}>{c.direccion}</div>
              <div style={{fontSize:11,color:"#475569",marginBottom:10,lineHeight:1.5}}>{c.sistema}</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div style={{background:"#f1f5f9",borderRadius:6,padding:"6px 10px"}}><div style={{fontSize:9,color:"#64748b"}}>Fecha certif.</div><div style={{fontSize:12,fontWeight:600,color:"#1a1a2e"}}>{fmtD(c.fecha)}</div></div>
                <div style={{background:"#f1f5f9",borderRadius:6,padding:"6px 10px"}}><div style={{fontSize:9,color:"#64748b"}}>Próx. mantto.</div><div style={{fontSize:12,fontWeight:600,color:"#fb923c"}}>{fmtD(c.proxMant)||"-"}</div></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={{...B("#f47c20"),flex:1,justifyContent:"center",fontSize:12}} onClick={e=>{e.stopPropagation();setSel(c);}}>Ver</button>
                <button style={{...B("#dbeafe","#1e40af"),flex:1,justifyContent:"center",fontSize:12}} onClick={e=>{e.stopPropagation();editarCertificacion(c);}}>Editar</button>
                <button style={{...B("#e8f5ee","#166534"),flex:1,justifyContent:"center",fontSize:12}} onClick={e=>{e.stopPropagation();imprimir(c);}}>Imprimir</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sel&&(
        <CertificacionDetalle
          cert={sel}
          onVolver={()=>setSel(null)}
          onEditar={editarCertificacion}
          onImprimir={imprimir}
          subtitle="Vista previa completa para revisar, editar e imprimir."
        />
      )}
    </div>
  );
}

// ======================================================
// INFORMES DE ACTIVIDADES
// ======================================================
function Informes({ctx}){
  const {informes,setInformes,obras,empleados,horarios}=ctx;
  const [sel,setSel]=useState(null);
  const [nuevo,setNuevo]=useState(false);
  const [editId,setEditId]=useState(null);
  const fotoRefs=useRef({});

  const emptyActividad=()=>({titulo:"",descripcion:"",observaciones:"",fotos:[{img:null,comentario:""},{img:null,comentario:""},{img:null,comentario:""},{img:null,comentario:""}]});
  const emptyPersona=()=>({empleadoId:"",cargo:"Instalador",nombre:"",turno1:"",turno2:"",manual:true});

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

    const manuales = prevPersonal.filter(p=>p.manual && !p.empleadoId);
    return [...vinculados, ...manuales];
  };

  const firstObraId = obras[0]?.id || "";
  const normalizeInformeActividades = (data={})=>{
    if(Array.isArray(data.actividades) && data.actividades.length){
      return data.actividades.map((actividad)=>({
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

  const buildInformeForm = (data={})=>({
    obraId:data.obraId ?? firstObraId,
    proyecto:data.proyecto ?? "",
    localizacion:data.localizacion ?? "",
    fechaInforme:data.fechaInforme ?? today(),
    periodoInicio:data.periodoInicio ?? today(),
    periodoFin:data.periodoFin ?? today(),
    personal:Array.isArray(data.personal) ? data.personal : [],
    recomendaciones:data.recomendaciones ?? "Para garantizar la efectividad y seguridad de las líneas de vida instaladas es fundamental implementar un programa de inspección regular.",
    actividades:normalizeInformeActividades(data),
  });

  const [form,setForm]=useState(buildInformeForm());

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
      const nextProyecto = prev.proyecto || obraSel.proyecto || '';
      const nextLocal = prev.localizacion || obraSel.ciudad || '';
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
      const nextProyecto = obraSel?.proyecto || prev.proyecto || '';
      const nextLocal = obraSel?.ciudad || prev.localizacion || '';
      const samePersonal = JSON.stringify(nextPersonal)===JSON.stringify(prev.personal);
      if(samePersonal && nextProyecto===prev.proyecto && nextLocal===prev.localizacion) return prev;
      return {...prev,proyecto:nextProyecto,localizacion:nextLocal,personal:nextPersonal};
    });
  },[form.obraId,form.periodoInicio,form.periodoFin,obras,empleados,horarios]);

  const updPersonal=(i,f,v)=>setForm(p=>({...p,personal:p.personal.map((x,j)=>j===i?{...x,[f]:v}:x)}));
  const updActividad=(ai,field,val)=>setForm(p=>({...p,actividades:p.actividades.map((a,i)=>i===ai?{...a,[field]:val}:a)}));
  const updFotoAct=(ai,fi,field,val)=>setForm(p=>({...p,actividades:p.actividades.map((a,i)=>i===ai?{...a,fotos:a.fotos.map((ft,j)=>j===fi?{...ft,[field]:val}:ft)}:a)}));

  const cargarFoto=(ai,fi,file)=>{
    if(!file)return;
    const r=new FileReader();
    r.onload=ev=>updFotoAct(ai,fi,"img",ev.target.result);
    r.readAsDataURL(file);
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
      : {id:"INF-" + (String(informes.length+1).padStart(3,"0")),...form,actividades,actividad:legacyActividad.titulo,descripcion:legacyActividad.descripcion,observaciones:legacyActividad.observaciones,fotos:legacyActividad.fotos};
    setInformes(prev=>editId ? prev.map(item=>item.id===editId?{...item,...inf}:item) : [...prev,inf]);
    setNuevo(false);
    setEditId(null);
    setSel(inf);
  };

  return(
    <div style={{padding:28}}>
      <H1 title="Informes de Actividades" subtitle="Múltiples actividades por informe con registro fotográfico"
        action={<button style={B("#f47c20")} onClick={abrirNuevoInforme}>+ Nuevo Informe</button>}/>

      {nuevo&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #cc0000"}}>
          <div style={ST}>{editId ? "Editar Informe de Actividades" : "Nuevo Informe de Actividades"}</div>

          {/* Datos generales */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
            <div><LBL>Obra asociada</LBL><select value={form.obraId} onChange={e=>{const o=obras.find(x=>x.id===e.target.value);setForm(p=>({...p,obraId:e.target.value,proyecto:o?.proyecto||"",localizacion:o?.ciudad||"",personal:buildPersonalDesdeObra(e.target.value,p.periodoInicio,p.periodoFin,p.personal)}));}} style={SI}>{obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
            <div><LBL>Nombre del proyecto</LBL><input value={form.proyecto} onChange={e=>setForm(p=>({...p,proyecto:e.target.value}))} style={SI}/></div>
            <div><LBL>Localización</LBL><input value={form.localizacion} onChange={e=>setForm(p=>({...p,localizacion:e.target.value}))} style={SI}/></div>
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
              <div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1.4fr 1fr 1fr 28px",gap:8,marginBottom:6}}>
                <input value={p.cargo} onChange={e=>updPersonal(i,"cargo",e.target.value)} placeholder="Cargo" style={{...SI,fontSize:12}}/>
                <input value={p.nombre} onChange={e=>updPersonal(i,"nombre",e.target.value)} placeholder="Nombre completo" style={{...SI,fontSize:12}}/>
                <input list="turnosInformeList" value={p.turno1||""} onChange={e=>updPersonal(i,"turno1",e.target.value)} placeholder="Turno 1 · 07:00 AM - 05:00 PM" style={{...SI,fontSize:12}}/>
                <input list="turnosInformeList" value={p.turno2||""} onChange={e=>updPersonal(i,"turno2",e.target.value)} placeholder="Turno 2 · opcional" style={{...SI,fontSize:12}}/>
                <button onClick={()=>setForm(pf=>({...pf,personal:pf.personal.filter((_,j)=>j!==i)}))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,cursor:"pointer",fontSize:14}}>×</button>
              </div>
            ))}
            <button onClick={()=>setForm(p=>({...p,personal:[...p.personal,emptyPersona()]}))} style={{...B("#f1f5f9","#475569"),fontSize:12,marginTop:4}}>+ Agregar persona</button>
          </div>

          {/* Actividades */}
          <div style={{marginBottom:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <LBL>Actividades ejecutadas</LBL>
              <button onClick={()=>setForm(p=>({...p,actividades:[...p.actividades,emptyActividad()]}))} style={{...B("#cc0000"),fontSize:11,padding:"5px 12px"}}>+ Agregar actividad</button>
            </div>
            {form.actividades.map((act,ai)=>(
              <div key={ai} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:16,marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#cc0000"}}>Actividad {ai+1}</div>
                  {form.actividades.length>1&&<button onClick={()=>setForm(p=>({...p,actividades:p.actividades.filter((_,i)=>i!==ai)}))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:5,padding:"2px 8px",cursor:"pointer",fontSize:11}}>× Eliminar</button>}
                </div>
                <div style={{marginBottom:10}}><LBL>Título / nombre de la actividad</LBL><input value={act.titulo} onChange={e=>updActividad(ai,"titulo",e.target.value)} placeholder="Ej: Instalación de líneas de vida" style={SI}/></div>
                <div style={{marginBottom:10}}><LBL>Descripción detallada</LBL><textarea value={act.descripcion} onChange={e=>updActividad(ai,"descripcion",e.target.value)} rows={3} placeholder="Descripción del proceso ejecutado..." style={{...SI,resize:"vertical"}}/></div>
                <div style={{marginBottom:12}}><LBL>Observaciones</LBL><input value={act.observaciones} onChange={e=>updActividad(ai,"observaciones",e.target.value)} placeholder="Ej: 1 Línea de vida horizontal de 119 metros" style={SI}/></div>
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
                      <input ref={el=>{fotoRefs.current[(ai) + "-" + (fi)]=el;}} type="file" accept="image/*" style={{display:"none"}} onChange={e=>cargarFoto(ai,fi,e.target.files[0])}/>
                      <div style={{padding:"6px 8px"}}><input value={ft.comentario} onChange={e=>updFotoAct(ai,fi,"comentario",e.target.value)} placeholder="Descripción de la foto..." style={{...SI,fontSize:11,padding:"4px 8px"}}/></div>
                    </div>
                  ))}
                </div>
                <button onClick={()=>updActividad(ai,"fotos",[...act.fotos,{img:null,comentario:""}])} style={{...B("#f1f5f9","#475569"),fontSize:11,marginTop:8}}>+ Agregar foto</button>
              </div>
            ))}
          </div>

          <div style={{marginBottom:14}}><LBL>Recomendaciones generales</LBL><textarea value={form.recomendaciones} onChange={e=>setForm(p=>({...p,recomendaciones:e.target.value}))} rows={3} style={{...SI,resize:"vertical"}}/></div>
          <div style={{display:"flex",gap:10}}>
            <button style={B("#cc0000")} onClick={guardar}>{editId ? "Guardar cambios" : "Guardar informe"}</button>
            <button style={B("#f1f5f9","#475569")} onClick={()=>{setNuevo(false);setEditId(null);}}>Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de informes */}
      {!sel&&(
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
            <button style={B("#f47c20")} onClick={()=>printCurrentPz("Informe " + (sel?.id || ""))}>Imprimir PDF</button>
          </div>
          <div id="pz" className="doc-shell" style={{background:"#fff",color:"#111",fontFamily:"'Aptos','Segoe UI',sans-serif",fontSize:11,lineHeight:1.6,border:"1px solid #ddd",padding:"28px 36px"}}>
            <PrintHeader dual={false}/>
            <div style={{textAlign:"center",fontSize:10,fontWeight:700,letterSpacing:2,padding:"6px 0",borderBottom:"1px solid #ddd",color:"#333",textTransform:"uppercase",marginBottom:16,marginTop:8}}>Informe de Actividades</div>
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
              <tbody>
                {[["PROYECTO",sel.proyecto],["LOCALIZACIÓN",sel.localizacion],["FECHA INFORME",fmtL(sel.fechaInforme)],["PERÍODO DE INFORME",(fmtL(sel.periodoInicio)) + " - " + (fmtL(sel.periodoFin))]].map(([k,v])=>(
                  <tr key={k}><td style={{border:"1px solid #ccc",padding:"5px 10px",background:"#f0f0f0",fontWeight:700,width:"30%"}}>{k}</td><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{v}</td></tr>
                ))}
              </tbody>
            </table>
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
              <thead>
                <tr style={{background:"#ddd"}}><td colSpan={4} style={{border:"1px solid #ccc",padding:"6px 10px",fontWeight:700,textAlign:"center"}}>PERSONAL EN OBRA</td></tr>
                <tr style={{background:"#f5f5f5"}}>
                  <th style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"left"}}>CARGO</th>
                  <th style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"left"}}>NOMBRE</th>
                  <th style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"left"}}>TURNO 1</th>
                  <th style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"left"}}>TURNO 2</th>
                </tr>
              </thead>
              <tbody>{(sel.personal||[]).map((p,i)=><tr key={i}><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{p.cargo}</td><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{p.nombre}</td><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{p.turno1||"-"}</td><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{p.turno2||"-"}</td></tr>)}</tbody>
            </table>
            {/* Múltiples actividades */}
            {(sel.actividades||[{titulo:sel.actividad,descripcion:sel.descripcion,observaciones:sel.observaciones,fotos:sel.fotos||[]}]).map((act,ai)=>(
              <div key={ai}>
                <table style={{width:"100%",borderCollapse:"collapse",marginBottom:14}}>
                  <tbody>
                    <tr><td colSpan={2} style={{border:"1px solid #ccc",padding:"6px 10px",background:"#ddd",fontWeight:700,textAlign:"center"}}>{act.titulo||act}</td></tr>
                    <tr><td style={{border:"1px solid #ccc",padding:"5px 10px",fontWeight:700,width:"20%",verticalAlign:"top"}}>DESCRIPCIÓN</td><td style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"justify"}}>{act.descripcion}</td></tr>
                    <tr><td style={{border:"1px solid #ccc",padding:"5px 10px",fontWeight:700}}>Observaciones</td><td style={{border:"1px solid #ccc",padding:"5px 10px"}}>{act.observaciones}</td></tr>
                  </tbody>
                </table>
                {(act.fotos||[]).some(ft=>ft.img||ft.url)&&(
                  <>
                    <div style={{fontWeight:700,textAlign:"center",background:"#ddd",border:"1px solid #ccc",padding:"6px",marginBottom:10}}>REGISTRO FOTOGRÁFICO - {act.titulo}</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14,alignItems:"start"}}>
                      {(act.fotos||[]).filter(ft=>ft.img||ft.url).map((ft,i)=>(
                        <div key={i} style={{border:"1px solid #ccc",borderRadius:4,overflow:"hidden",background:"#fff",padding:8}}>
                          <img src={ft.img||ft.url} alt={"foto" + (i+1)} style={{width:"100%",height:"auto",maxHeight:260,objectFit:"contain",display:"block",background:"#fff"}} onError={e=>{e.target.style.display="none";}}/>
                          {ft.comentario&&<div style={{padding:"6px 8px",fontSize:10,color:"#555",borderTop:"1px solid #eee",marginTop:6}}>{ft.comentario}</div>}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
            <table style={{width:"100%",borderCollapse:"collapse",marginBottom:20}}>
              <tbody><tr><td style={{border:"1px solid #ccc",padding:"5px 10px",fontWeight:700,width:"20%",verticalAlign:"top"}}>RECOMENDACIONES</td><td style={{border:"1px solid #ccc",padding:"5px 10px",textAlign:"justify"}}>{sel.recomendaciones}</td></tr></tbody>
            </table>
            <div style={{marginTop:24}}>
              <div style={{marginBottom:12,fontSize:12}}>Cordialmente,</div>
              <div style={{height:72}}></div>
              <div style={{textAlign:"center"}}>
                <div style={{display:"inline-block",borderTop:"1px solid #333",paddingTop:8,minWidth:200}}>
                  <div style={{fontWeight:700}}>ING. JHON JAIME SEPULVEDA LONDOÑO</div>
                  <div style={{fontSize:10}}>Cl 38 sur # 36-48, Envigado · PBX 448 26 86 · Cel. 314 863 40 72</div>
                  <div style={{fontSize:10}}>Nit. 900193965-4 · ingeanclajes.sas@gmail.com</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Contabilidad({ctx}){
  const {
    clientes,
    empleados,
    pagos,
    cuentas,
    proveedores,
    obras,
    nominasGeneradas,
    contabilidadConfig,
    setContabilidadConfig,
    planCuentas,
    setPlanCuentas,
    asientosContables,
    setAsientosContables,
  } = ctx;
  const money = (value)=>Number((Number(value || 0)).toFixed(2));
  const accountGroupOptions = getAccountGroupOptions();
  const statementCategoryOptions = getStatementCategoryOptions();
  const configActual = normalizeContabilidadConfig(contabilidadConfig?.[0] || CONTABILIDAD_CONFIG_INIT[0]);
  const cuentasPlan = Array.from(
    new Map(
      [...PLAN_CUENTAS_INIT, ...((planCuentas?.length ? planCuentas : []))]
        .map(normalizePlanCuenta)
        .map((cuenta)=>[cuenta.codigo, cuenta])
    ).values()
  ).sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo),"es"));
  const manuales = (asientosContables || []).map((entry)=>normalizeAsientoContable(entry, cuentasPlan));
  const tercerosERP = [
    ...(Array.isArray(clientes) ? clientes : []).map((cliente)=>({
      ref:`cliente:${cliente.id}`,
      tipo:"Cliente",
      terceroId:String(cliente.id || "").trim(),
      terceroNit:String(cliente.nit || "").trim(),
      terceroNombre:String(cliente.nombre || "").trim(),
    })),
    ...(Array.isArray(proveedores) ? proveedores : []).map((proveedor)=>({
      ref:`proveedor:${proveedor.id}`,
      tipo:"Proveedor",
      terceroId:String(proveedor.id || "").trim(),
      terceroNit:String(proveedor.nit || "").trim(),
      terceroNombre:String(proveedor.nombre || "").trim(),
    })),
    ...(Array.isArray(empleados) ? empleados : []).map((empleado)=>({
      ref:`empleado:${empleado.id}`,
      tipo:"Empleado",
      terceroId:String(empleado.id || "").trim(),
      terceroNit:String(empleado.cedula || "").trim(),
      terceroNombre:String(empleado.nombre || "").trim(),
    })),
  ]
    .filter((item)=>item.terceroNombre)
    .sort((a,b)=>a.terceroNombre.localeCompare(b.terceroNombre,"es"));
  const normalizeTerceroLookup = (value="")=>String(value || "").toLowerCase().replace(/[^a-z0-9]/g,"");
  const buscarTerceroERP = (ref="")=>tercerosERP.find((item)=>item.ref===ref) || null;
  const buscarTerceroERPPorNit = (nit="")=>{
    const lookup = normalizeTerceroLookup(nit);
    if(!lookup) return null;
    const exacto = tercerosERP.find((item)=>normalizeTerceroLookup(item.terceroNit)===lookup);
    if(exacto) return exacto;
    const coincidencias = tercerosERP.filter((item)=>normalizeTerceroLookup(item.terceroNit).includes(lookup));
    return coincidencias.length===1 ? coincidencias[0] : null;
  };
  const resolverTerceroRef = (terceroId="", terceroNit="", terceroNombre="")=>{
    const id = String(terceroId || "").trim();
    const nit = String(terceroNit || "").trim();
    const nombre = String(terceroNombre || "").trim().toLowerCase();
    const found = tercerosERP.find((item)=>
      (id && item.terceroId===id) ||
      (nit && item.terceroNit===nit) ||
      (nombre && item.terceroNombre.toLowerCase()===nombre)
    );
    return found?.ref || "";
  };
  const [tab,setTab]=useState("resumen");
  const [periodo,setPeriodo]=useState(today().slice(0,7));
  const [busquedaCuenta,setBusquedaCuenta]=useState("");
  const [busquedaAsiento,setBusquedaAsiento]=useState("");
  const [showCuentaForm,setShowCuentaForm]=useState(false);
  const [editCuentaId,setEditCuentaId]=useState(null);
  const [cuentaForm,setCuentaForm]=useState(buildEmptyPlanCuenta());
  const [showAsientoForm,setShowAsientoForm]=useState(false);
  const [editAsientoId,setEditAsientoId]=useState(null);
  const [asientoForm,setAsientoForm]=useState(buildEmptyManualAsiento(manuales, today()));
  const [reporteTab,setReporteTab]=useState("general");
  const [rangoReportes,setRangoReportes]=useState(()=>buildMonthDateRange(today().slice(0,7)));
  const [filtroCuentaMovimiento,setFiltroCuentaMovimiento]=useState("");
  const [filtroTerceroMovimientoRef,setFiltroTerceroMovimientoRef]=useState("");
  const [cuentaConciliacion,setCuentaConciliacion]=useState(configActual.cuentaBanco || configActual.cuentaCaja || "");
  const [soloPendientesConciliacion,setSoloPendientesConciliacion]=useState(false);
  const [movimientosConciliados,setMovimientosConciliados]=useState({});

  const asientosCombinados = buildCombinedEntries({
    asientosManuales:manuales,
    pagos,
    cuentas,
    clientes,
    proveedores,
    empleados,
    obras,
    nominasGeneradas,
    config:configActual,
    planCuentas:cuentasPlan,
  });
  const planCuentaMap = new Map(cuentasPlan.map((cuenta)=>[cuenta.codigo, cuenta]));
  const asientosPeriodo = filterEntriesByPeriod(asientosCombinados, periodo);
  const balancePrueba = buildTrialBalance({ entries:asientosPeriodo, planCuentas:cuentasPlan });
  const estados = buildFinancialStatements(balancePrueba);
  const resumenPeriodo = summarizeEntries(asientosPeriodo);
  const impuestosPorPagar = balancePrueba
    .filter((row)=>["236540","236701","236801","240805"].includes(row.codigo))
    .reduce((sum,row)=>sum + Number(row.saldoNatural || 0),0);
  const cXcPendiente = obras.reduce((sum,obra)=>sum + Number(obra.saldo || 0),0);
  const cXpPendiente = cuentas.reduce((sum,cuenta)=>{
    const total = Number(cuenta.saldoPendienteActual ?? cuenta.saldo_pendiente_actual ?? cuenta.valorTotalPagar ?? cuenta.valor_total_pagar ?? cuenta.monto ?? 0);
    return sum + (Number.isFinite(total) ? total : 0);
  },0);
  const nominasProcesadas = (Array.isArray(nominasGeneradas) ? nominasGeneradas : []).length;
  const automaticosCxc = asientosPeriodo.filter((entry)=>String(entry.origen || "").startsWith("cxc")).length;
  const automaticosCxp = asientosPeriodo.filter((entry)=>String(entry.origen || "").startsWith("cxp")).length;
  const automaticosNomina = asientosPeriodo.filter((entry)=>String(entry.origen || "").startsWith("nomina")).length;
  const cuentasMovimiento = cuentasPlan.filter((cuenta)=>cuenta.activo && cuenta.permiteMovimientos);
  const cuentasBancariasReporte = cuentasMovimiento.filter((cuenta)=>{
    const codigo = String(cuenta.codigo || "");
    return codigo.startsWith("11") || [configActual.cuentaBanco, configActual.cuentaCaja].includes(codigo);
  }).filter((cuenta, index, array)=>array.findIndex((item)=>item.codigo===cuenta.codigo)===index);
  const primeraCuentaBancaria = cuentasBancariasReporte[0]?.codigo || "";
  const formatCuentaMovimientoLabel = (codigo="", nombre="")=>{
    const cuentaCodigo = String(codigo || "").trim();
    const cuentaNombre = String(nombre || "").trim();
    if(cuentaCodigo && cuentaNombre) return `${cuentaCodigo} · ${cuentaNombre}`;
    return cuentaCodigo || cuentaNombre;
  };
  const buscarCuentaMovimiento = (term="")=>{
    const lookup = normalizeTerceroLookup(term);
    if(!lookup) return null;
    const exacta = cuentasMovimiento.find((cuenta)=>
      [cuenta.codigo, cuenta.nombre, formatCuentaMovimientoLabel(cuenta.codigo, cuenta.nombre)]
        .some((value)=>normalizeTerceroLookup(value)===lookup)
    );
    if(exacta) return exacta;
    const inicia = cuentasMovimiento.filter((cuenta)=>
      [cuenta.codigo, cuenta.nombre, formatCuentaMovimientoLabel(cuenta.codigo, cuenta.nombre)]
        .some((value)=>normalizeTerceroLookup(value).startsWith(lookup))
    );
    if(inicia.length===1) return inicia[0];
    const contiene = cuentasMovimiento.filter((cuenta)=>
      [cuenta.codigo, cuenta.nombre, formatCuentaMovimientoLabel(cuenta.codigo, cuenta.nombre)]
        .some((value)=>normalizeTerceroLookup(value).includes(lookup))
    );
    return contiene.length===1 ? contiene[0] : null;
  };
  const getCuentaMovimientoInputValue = (linea={})=>
    String(linea?.cuentaBusqueda || formatCuentaMovimientoLabel(linea?.cuentaCodigo, linea?.cuentaNombre) || "");
  const cuentasFiltradas = cuentasPlan.filter((cuenta)=>{
    const term = String(busquedaCuenta || "").trim().toLowerCase();
    if(!term) return true;
    return [cuenta.codigo,cuenta.nombre,cuenta.grupoReporteLabel,cuenta.categoriaEstadoLabel]
      .some((value)=>String(value || "").toLowerCase().includes(term));
  });
  const busquedaAsientoNormalizada = String(busquedaAsiento || "").trim().toLowerCase();
  const mostrarComprobantesBuscados = busquedaAsientoNormalizada.length > 0;
  const asientosFiltrados = asientosPeriodo.filter((entry)=>{
    const term = busquedaAsientoNormalizada;
    if(!term) return false;
    return [entry.consecutivo,entry.descripcion,entry.tipoComprobante,entry.terceroNit,entry.terceroNombre,entry.soporte,entry.origen]
      .some((value)=>String(value || "").toLowerCase().includes(term));
  });
  const totalDebitoForm = money((asientoForm.lineas || []).reduce((sum,linea)=>sum + Number(linea.debito || 0),0));
  const totalCreditoForm = money((asientoForm.lineas || []).reduce((sum,linea)=>sum + Number(linea.credito || 0),0));
  const diferenciaForm = money(totalDebitoForm - totalCreditoForm);
  const filtroCuentaMovimientoNormalizado = String(filtroCuentaMovimiento || "").trim();
  const filtroTerceroMovimientoLookup = normalizeTerceroLookup(filtroTerceroMovimientoRef);
  const movimientosReporteBase = asientosCombinados
    .filter((entry)=>entry.estado!=="Anulado" && isDateWithinRange(entry.fecha, rangoReportes.inicio, rangoReportes.fin))
    .flatMap((entry)=>(entry.lineas || []).map((linea, index)=>{
      const cuentaMeta = planCuentaMap.get(String(linea.cuentaCodigo || "").trim()) || null;
      const debito = Number(linea.debito || 0);
      const credito = Number(linea.credito || 0);
      const naturaleza = cuentaMeta?.naturaleza || "debito";
      return {
        rowId:`${entry.id || entry.consecutivo || "entry"}:${linea.id || index}`,
        fecha:entry.fecha || "",
        consecutivo:entry.consecutivo || entry.id || "",
        tipoComprobante:entry.tipoComprobante || "",
        descripcion:entry.descripcion || "",
        origen:entry.origen || "",
        automatico:!!entry.automatico,
        cuentaCodigo:String(linea.cuentaCodigo || "").trim(),
        cuentaNombre:String(linea.cuentaNombre || cuentaMeta?.nombre || "").trim(),
        terceroId:String(linea.terceroId || entry.terceroId || "").trim(),
        terceroNit:String(linea.terceroNit || entry.terceroNit || "").trim(),
        terceroNombre:String(linea.terceroNombre || entry.terceroNombre || "").trim(),
        detalle:String(linea.detalle || "").trim(),
        centroCosto:String(linea.centroCosto || "").trim(),
        debito,
        credito,
        saldoMovimiento:money(naturaleza==="credito" ? credito - debito : debito - credito),
      };
    }))
    .sort((a,b)=>
      String(a.fecha || "").localeCompare(String(b.fecha || "")) ||
      String(a.consecutivo || "").localeCompare(String(b.consecutivo || ""),"es") ||
      String(a.rowId || "").localeCompare(String(b.rowId || ""),"es")
    );
  let saldoAuxiliarAcumulado = 0;
  const movimientosCuenta = movimientosReporteBase
    .filter((row)=>!filtroCuentaMovimientoNormalizado || row.cuentaCodigo.startsWith(filtroCuentaMovimientoNormalizado))
    .filter((row)=>{
      if(!filtroTerceroMovimientoLookup) return true;
      return [row.terceroNit, row.terceroId, row.terceroNombre]
        .some((value)=>normalizeTerceroLookup(value).includes(filtroTerceroMovimientoLookup));
    })
    .map((row)=>{
      saldoAuxiliarAcumulado = money(saldoAuxiliarAcumulado + Number(row.saldoMovimiento || 0));
      return {
        ...row,
        saldoAcumulado:saldoAuxiliarAcumulado,
      };
    });
  const resumenAuxiliar = movimientosCuenta.reduce((acc,row)=>({
    debitos:money(acc.debitos + Number(row.debito || 0)),
    creditos:money(acc.creditos + Number(row.credito || 0)),
    saldo:money(acc.saldo + Number(row.saldoMovimiento || 0)),
  }),{debitos:0,creditos:0,saldo:0});
  const resumenMovimientoTerceros = Array.from(movimientosCuenta.reduce((map,row)=>{
    const key = `${row.terceroNit || row.terceroId || "SIN-TERCERO"}|${row.terceroNombre || "Sin tercero"}`;
    const current = map.get(key) || {
      nit:row.terceroNit || row.terceroId || "—",
      tercero:row.terceroNombre || "Sin tercero",
      debitos:0,
      creditos:0,
      saldo:0,
    };
    current.debitos = money(current.debitos + Number(row.debito || 0));
    current.creditos = money(current.creditos + Number(row.credito || 0));
    current.saldo = money(current.saldo + Number(row.saldoMovimiento || 0));
    map.set(key, current);
    return map;
  }, new Map()).values()).sort((a,b)=>String(a.tercero || "").localeCompare(String(b.tercero || ""),"es"));
  const cuentasTributariasRapidas = [
    {codigo:configActual.cuentaRetefuente, etiqueta:"Retefuente", color:"#b91c1c"},
    {codigo:configActual.cuentaReteiva, etiqueta:"ReteIVA", color:"#7c3aed"},
    {codigo:configActual.cuentaReteica, etiqueta:"ReteICA", color:"#0f766e"},
    {codigo:configActual.cuentaIvaDescontable, etiqueta:"IVA descontable", color:"#1d4ed8"},
    {codigo:configActual.cuentaIvaGenerado, etiqueta:"IVA generado", color:"#166534"},
  ].filter((item, index, array)=>item.codigo && array.findIndex((candidate)=>candidate.codigo===item.codigo)===index);
  const saldosTributarios = cuentasTributariasRapidas.map((item)=>{
    const row = balancePrueba.find((candidate)=>candidate.codigo===item.codigo);
    return {
      ...item,
      nombre:row?.nombre || planCuentaMap.get(item.codigo)?.nombre || item.etiqueta,
      saldoNatural:Number(row?.saldoNatural || 0),
      debitos:Number(row?.debitos || 0),
      creditos:Number(row?.creditos || 0),
    };
  });
  let saldoBancoAcumulado = 0;
  const movimientosConciliacion = movimientosReporteBase
    .filter((row)=>!cuentaConciliacion || row.cuentaCodigo===cuentaConciliacion)
    .map((row)=>{
      saldoBancoAcumulado = money(saldoBancoAcumulado + Number(row.saldoMovimiento || 0));
      return {
        ...row,
        saldoAcumulado:saldoBancoAcumulado,
        conciliado:!!movimientosConciliados[row.rowId],
      };
    });
  const movimientosConciliacionVisibles = soloPendientesConciliacion
    ? movimientosConciliacion.filter((row)=>!row.conciliado)
    : movimientosConciliacion;
  const resumenConciliacion = movimientosConciliacion.reduce((acc,row)=>({
    debitos:money(acc.debitos + Number(row.debito || 0)),
    creditos:money(acc.creditos + Number(row.credito || 0)),
    conciliados:acc.conciliados + (row.conciliado ? 1 : 0),
    saldo:money(acc.saldo + Number(row.saldoMovimiento || 0)),
    saldoConciliado:money(acc.saldoConciliado + (row.conciliado ? Number(row.saldoMovimiento || 0) : 0)),
  }),{debitos:0,creditos:0,conciliados:0,saldo:0,saldoConciliado:0});

  useEffect(()=>{
    setRangoReportes(buildMonthDateRange(periodo));
  },[periodo]);

  useEffect(()=>{
    if(cuentaConciliacion) return;
    const sugerida = configActual.cuentaBanco || configActual.cuentaCaja || primeraCuentaBancaria;
    if(sugerida) setCuentaConciliacion(sugerida);
  },[configActual.cuentaBanco, configActual.cuentaCaja, cuentaConciliacion, primeraCuentaBancaria]);

  const exportarExcelContabilidad = ()=>{
    const periodoLabel = periodo || "general";
    const rangoLabel = `${rangoReportes.inicio || "inicio"}_${rangoReportes.fin || "fin"}`;
    const filtroCuentaLabel = String(filtroCuentaMovimiento || "").trim() || "Todas";
    const filtroTerceroLabel = String(filtroTerceroMovimientoRef || "").trim() || "Todos";
    const libroRows = [
      ["Fecha","Comprobante","Tipo","Origen","NIT tercero","Tercero","Descripcion","Cuenta","Detalle","Centro costo","Debito","Credito","Estado"],
      ...asientosFiltrados.flatMap((entry)=>
        (entry.lineas || []).map((linea)=>[
          entry.fecha || "",
          entry.consecutivo || entry.id,
          entry.tipoComprobante || "",
          entry.origen || "",
          linea.terceroNit || entry.terceroNit || "",
          linea.terceroNombre || entry.terceroNombre || "",
          entry.descripcion || "",
          `${linea.cuentaCodigo || ""} ${linea.cuentaNombre ? "· " + linea.cuentaNombre : ""}`.trim(),
          linea.detalle || "",
          linea.centroCosto || "",
          Number(linea.debito || 0),
          Number(linea.credito || 0),
          entry.estado || "",
        ])
      ),
    ];
    const balanceRows = [
      ["Codigo","Cuenta","Grupo","Debitos","Creditos","Saldo natural"],
      ...balancePrueba.map((row)=>[
        row.codigo,
        row.nombre,
        row.grupoReporteLabel,
        Number(row.debitos || 0),
        Number(row.creditos || 0),
        Number(row.saldoNatural || 0),
      ]),
    ];
    const resultadosRows = [
      ["Concepto","Valor"],
      ["Ingresos", Number(estados.resultados.totalIngresos || 0)],
      ["Costos", Number(estados.resultados.totalCostos || 0)],
      ["Utilidad bruta", Number(estados.resultados.utilidadBruta || 0)],
      ["Gastos", Number(estados.resultados.totalGastos || 0)],
      ["Utilidad operacional", Number(estados.resultados.utilidadOperacional || 0)],
      [""],
      ["Detalle","Saldo"],
      ...estados.resultados.ingresos.map((row)=>[`${row.codigo} · ${row.nombre}`, Number(row.saldoNatural || 0)]),
      ...estados.resultados.costos.map((row)=>[`${row.codigo} · ${row.nombre}`, Number(row.saldoNatural || 0)]),
      ...estados.resultados.gastos.map((row)=>[`${row.codigo} · ${row.nombre}`, Number(row.saldoNatural || 0)]),
    ];
    const situacionRows = [
      ["Concepto","Valor"],
      ["Activos", Number(estados.balance.totalActivos || 0)],
      ["Pasivos", Number(estados.balance.totalPasivos || 0)],
      ["Patrimonio", Number(estados.balance.totalPatrimonio || 0)],
      [""],
      ["Detalle","Saldo"],
      ...estados.balance.activos.map((row)=>[`${row.codigo} · ${row.nombre}`, Number(row.saldoNatural || 0)]),
      ...estados.balance.pasivos.map((row)=>[`${row.codigo} · ${row.nombre}`, Number(row.saldoNatural || 0)]),
      ...estados.balance.patrimonio.map((row)=>[`${row.codigo} · ${row.nombre}`, Number(row.saldoNatural || 0)]),
    ];
    const resumenRows = [
      ["Indicador","Valor"],
      ["Periodo", periodoLabel],
      ["Asientos visibles", asientosFiltrados.length],
      ["Debitos", Number(resumenPeriodo.totalDebitos || 0)],
      ["Creditos", Number(resumenPeriodo.totalCreditos || 0)],
      ["CxC pendiente", Number(cXcPendiente || 0)],
      ["CxP pendiente", Number(cXpPendiente || 0)],
      ["Impuestos por pagar", Number(impuestosPorPagar || 0)],
      ["Nominas generadas", nominasProcesadas],
      ["Automaticos CxC", automaticosCxc],
      ["Automaticos CxP", automaticosCxp],
      ["Automaticos Nomina", automaticosNomina],
    ];
    const tributarioRows = [
      ["Consulta","Codigo","Cuenta","Debitos","Creditos","Saldo natural"],
      ...saldosTributarios.map((row)=>[
        row.etiqueta,
        row.codigo,
        row.nombre,
        Number(row.debitos || 0),
        Number(row.creditos || 0),
        Number(row.saldoNatural || 0),
      ]),
    ];
    const auxiliarRows = [
      ["Reporte","Auxiliar por cuenta"],
      ["Periodo", periodoLabel],
      ["Cuenta / auxiliar", filtroCuentaLabel],
      ["Tercero / NIT / cédula", filtroTerceroLabel],
      ["Fecha inicial", rangoReportes.inicio || ""],
      ["Fecha final", rangoReportes.fin || ""],
      ["Movimientos", movimientosCuenta.length],
      ["Debitos", Number(resumenAuxiliar.debitos || 0)],
      ["Creditos", Number(resumenAuxiliar.creditos || 0)],
      ["Saldo", Number(resumenAuxiliar.saldo || 0)],
      [""],
      ["Fecha","Comprobante","Cuenta","Detalle","NIT","Tercero","Centro costo","Debito","Credito","Saldo acumulado","Origen"],
      ...movimientosCuenta.map((row)=>[
        row.fecha || "",
        row.consecutivo || "",
        `${row.cuentaCodigo || ""} ${row.cuentaNombre ? "· " + row.cuentaNombre : ""}`.trim(),
        row.detalle || row.descripcion || "",
        row.terceroNit || "",
        row.terceroNombre || "",
        row.centroCosto || "",
        Number(row.debito || 0),
        Number(row.credito || 0),
        Number(row.saldoAcumulado || 0),
        row.origen || "",
      ]),
    ];
    const conciliacionRows = [
      ["Reporte","Conciliacion bancaria"],
      ["Periodo", periodoLabel],
      ["Cuenta bancaria", cuentaConciliacion || "Todas"],
      ["Fecha inicial", rangoReportes.inicio || ""],
      ["Fecha final", rangoReportes.fin || ""],
      ["Solo pendientes", soloPendientesConciliacion ? "Si" : "No"],
      ["Movimientos", movimientosConciliacion.length],
      ["Debitos", Number(resumenConciliacion.debitos || 0)],
      ["Creditos", Number(resumenConciliacion.creditos || 0)],
      ["Saldo cuenta", Number(resumenConciliacion.saldo || 0)],
      ["Saldo conciliado", Number(resumenConciliacion.saldoConciliado || 0)],
      [""],
      ["Conciliado","Fecha","Comprobante","Cuenta","Detalle","NIT","Tercero","Debito","Credito","Saldo acumulado","Origen"],
      ...movimientosConciliacion.map((row)=>[
        row.conciliado ? "Si" : "No",
        row.fecha || "",
        row.consecutivo || "",
        `${row.cuentaCodigo || ""} ${row.cuentaNombre ? "· " + row.cuentaNombre : ""}`.trim(),
        row.detalle || row.descripcion || "",
        row.terceroNit || "",
        row.terceroNombre || "",
        Number(row.debito || 0),
        Number(row.credito || 0),
        Number(row.saldoAcumulado || 0),
        row.origen || "",
      ]),
    ];

    if(reporteTab==="movimientos"){
      downloadExcelWorkbook(
        `auxiliar-filtrado-${periodoLabel}-${rangoLabel}`,
        [{ name:"Auxiliar", rows:auxiliarRows }]
      );
      return;
    }

    if(reporteTab==="conciliacion"){
      downloadExcelWorkbook(
        `conciliacion-filtrada-${periodoLabel}-${rangoLabel}`,
        [{ name:"Conciliacion", rows:conciliacionRows }]
      );
      return;
    }

    downloadExcelWorkbook(
      `reportes-contables-${periodoLabel}-${rangoLabel}`,
      [
        { name:"Resumen", rows:resumenRows },
        { name:"Libro Diario", rows:libroRows },
        { name:"Balance Prueba", rows:balanceRows },
        { name:"Resultados", rows:resultadosRows },
        { name:"Situacion", rows:situacionRows },
        { name:"Tributario", rows:tributarioRows },
        { name:"Auxiliar", rows:auxiliarRows },
        { name:"Conciliacion", rows:conciliacionRows },
      ]
    );
  };

  const actualizarConfig = (field,value)=>{
    setContabilidadConfig([normalizeContabilidadConfig({ ...configActual, [field]:value })]);
  };

  const aplicarConsultaTributaria = (codigo = "")=>{
    setReporteTab("movimientos");
    setFiltroCuentaMovimiento(codigo);
    setFiltroTerceroMovimientoRef("");
  };

  const alternarMovimientoConciliado = (rowId)=>{
    setMovimientosConciliados((prev)=>{
      const next = {...prev};
      if(next[rowId]) delete next[rowId];
      else next[rowId] = true;
      return next;
    });
  };

  const marcarMovimientosConciliacionVisible = (conciliado)=>{
    setMovimientosConciliados((prev)=>{
      const next = {...prev};
      movimientosConciliacionVisibles.forEach((row)=>{
        if(conciliado) next[row.rowId] = true;
        else delete next[row.rowId];
      });
      return next;
    });
  };

  const aplicarTerceroAsiento = (ref)=>{
    const tercero = buscarTerceroERP(ref);
    setAsientoForm((prev)=>({
      ...prev,
      terceroId:tercero?.terceroId || "",
      terceroNit:tercero?.terceroNit || "",
      terceroNombre:tercero?.terceroNombre || "",
      lineas:(prev.lineas || []).map((linea)=>({
        ...linea,
        terceroId:tercero?.terceroId || "",
        terceroNit:tercero?.terceroNit || "",
        terceroNombre:tercero?.terceroNombre || "",
      })),
    }));
  };
  const aplicarTerceroAsientoPorNit = (nit)=>{
    const nitValue = String(nit || "").trim();
    const tercero = buscarTerceroERPPorNit(nitValue);
    setAsientoForm((prev)=>({
      ...prev,
      terceroId:tercero?.terceroId || "",
      terceroNit:tercero?.terceroNit || nitValue,
      terceroNombre:tercero?.terceroNombre || "",
      lineas:(prev.lineas || []).map((linea)=>({
        ...linea,
        terceroId:tercero?.terceroId || "",
        terceroNit:tercero?.terceroNit || nitValue,
        terceroNombre:tercero?.terceroNombre || "",
      })),
    }));
  };

  const resetCuentaPlan = ()=>{
    setCuentaForm(buildEmptyPlanCuenta());
    setEditCuentaId(null);
    setShowCuentaForm(false);
  };

  const guardarCuentaPlan = ()=>{
    if(!String(cuentaForm.codigo || "").trim() || !String(cuentaForm.nombre || "").trim()){
      alert("Debes indicar codigo y nombre de la cuenta.");
      return;
    }
    const payload = normalizePlanCuenta({
      ...cuentaForm,
      id:String(cuentaForm.codigo || "").trim(),
      codigo:String(cuentaForm.codigo || "").trim(),
      nombre:String(cuentaForm.nombre || "").trim(),
    });
    setPlanCuentas((prev)=>{
      const base = Array.from(
        new Map(
          [...PLAN_CUENTAS_INIT, ...((prev?.length ? prev : []))]
            .map(normalizePlanCuenta)
            .map((cuenta)=>[cuenta.codigo, cuenta])
        ).values()
      );
      const next = base.some((item)=>item.id===editCuentaId || item.codigo===payload.codigo)
        ? base.map((item)=>(item.id===editCuentaId || item.codigo===payload.codigo) ? payload : item)
        : [...base,payload];
      return next.sort((a,b)=>String(a.codigo).localeCompare(String(b.codigo),"es"));
    });
    resetCuentaPlan();
  };

  const editarCuentaPlan = (cuenta)=>{
    setEditCuentaId(cuenta.id);
    setCuentaForm(normalizePlanCuenta(cuenta));
    setShowCuentaForm(true);
    setTab("catalogo");
  };

  const alternarCuentaActiva = (codigo)=>{
    setPlanCuentas((prev)=>Array.from(
      new Map(
        [...PLAN_CUENTAS_INIT, ...((prev?.length ? prev : []))]
          .map(normalizePlanCuenta)
          .map((cuenta)=>[cuenta.codigo, cuenta])
      ).values()
    ).map((item)=>{
      const cuenta = normalizePlanCuenta(item);
      if(cuenta.codigo!==codigo) return cuenta;
      return { ...cuenta, activo:!cuenta.activo };
    }));
  };

  const resetAsiento = ()=>{
    setAsientoForm(buildEmptyManualAsiento(manuales, today()));
    setEditAsientoId(null);
    setShowAsientoForm(false);
  };

  const actualizarLinea = (lineId,field,value)=>{
    setAsientoForm((prev)=>({
      ...prev,
      lineas:(prev.lineas || []).map((linea)=>{
        if(linea.id!==lineId) return linea;
        if(field==="cuentaCodigo"){
          const cuenta = cuentasPlan.find((item)=>item.codigo===value);
          return {
            ...linea,
            cuentaCodigo:value,
            cuentaNombre:cuenta?.nombre || "",
            cuentaBusqueda:formatCuentaMovimientoLabel(value, cuenta?.nombre || ""),
          };
        }
        if(field==="cuentaBusqueda"){
          const cuenta = buscarCuentaMovimiento(value);
          return {
            ...linea,
            cuentaCodigo:cuenta?.codigo || "",
            cuentaNombre:cuenta?.nombre || "",
            cuentaBusqueda:cuenta ? formatCuentaMovimientoLabel(cuenta.codigo, cuenta.nombre) : String(value || ""),
          };
        }
        if(field==="terceroRef"){
          const tercero = buscarTerceroERP(value);
          return {
            ...linea,
            terceroId:tercero?.terceroId || "",
            terceroNit:tercero?.terceroNit || "",
            terceroNombre:tercero?.terceroNombre || "",
          };
        }
        if(field==="debito" || field==="credito"){
          return { ...linea, [field]: parseFloat(value) || 0 };
        }
        return { ...linea, [field]:value };
      }),
    }));
  };

  const agregarLinea = ()=>{
    setAsientoForm((prev)=>({
      ...prev,
      lineas:[...(prev.lineas || []), createAsientoLine({
        terceroId:prev.terceroId,
        terceroNit:prev.terceroNit,
        terceroNombre:prev.terceroNombre,
      })],
    }));
  };

  const quitarLinea = (lineId)=>{
    setAsientoForm((prev)=>({
      ...prev,
      lineas:(prev.lineas || []).filter((linea)=>linea.id!==lineId),
    }));
  };

  const guardarAsiento = ()=>{
    const payload = normalizeAsientoContable({
      ...asientoForm,
      id:editAsientoId || asientoForm.id,
      automatico:false,
      origen:"manual",
      descripcion:String(asientoForm.descripcion || "").trim(),
      terceroId:String(asientoForm.terceroId || "").trim(),
      terceroNit:String(asientoForm.terceroNit || "").trim(),
      terceroNombre:String(asientoForm.terceroNombre || "").trim(),
      soporte:String(asientoForm.soporte || "").trim(),
      lineas:(asientoForm.lineas || []).map((linea)=>({
        ...linea,
        cuentaCodigo:String(linea.cuentaCodigo || "").trim(),
        cuentaNombre:String(linea.cuentaNombre || "").trim(),
        detalle:String(linea.detalle || "").trim(),
        terceroId:String(linea.terceroId || asientoForm.terceroId || "").trim(),
        terceroNit:String(linea.terceroNit || asientoForm.terceroNit || "").trim(),
        terceroNombre:String(linea.terceroNombre || asientoForm.terceroNombre || "").trim(),
      })),
    }, cuentasPlan);

    if(!payload.descripcion){
      alert("Agrega una descripcion para el comprobante.");
      return;
    }
    if(!payload.terceroNit || !payload.terceroNombre){
      alert("Selecciona un tercero del ERP para el comprobante manual.");
      return;
    }
    if((payload.lineas || []).length < 2){
      alert("Agrega al menos dos lineas contables.");
      return;
    }
    if(!isBalancedEntry(payload)){
      alert("El comprobante no esta cuadrado. Debito y credito deben ser iguales.");
      return;
    }

    setAsientosContables((prev)=>{
      const base = (prev || []).map((item)=>normalizeAsientoContable(item, cuentasPlan));
      return editAsientoId
        ? base.map((item)=>item.id===editAsientoId ? payload : item)
        : [payload, ...base];
    });
    resetAsiento();
  };

  const editarAsiento = (entry)=>{
    setEditAsientoId(entry.id);
    setAsientoForm(normalizeAsientoContable(entry, cuentasPlan));
    setShowAsientoForm(true);
    setTab("comprobantes");
  };

  const anularAsiento = (entryId)=>{
    if(!window.confirm("¿Anular este comprobante manual?")) return;
    setAsientosContables((prev)=>(prev || []).map((item)=>{
      const entry = normalizeAsientoContable(item, cuentasPlan);
      if(entry.id!==entryId) return entry;
      return { ...entry, estado:"Anulado" };
    }));
  };

  return(
    <div style={{padding:28}}>
      <H1
        title="Contabilidad"
        subtitle="Plan de cuentas, comprobantes y reportes contables integrados con CxC, CxP y nómina"
        action={
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button style={B("#cc0000")} onClick={()=>setTab("comprobantes")}>Comprobantes</button>
            <button style={B("#003B71")} onClick={()=>setTab("reportes")}>Reportes</button>
          </div>
        }
      />

      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        {[
          ["resumen","Resumen","#cc0000","#fff7ed","#9a3412"],
          ["catalogo","Catalogo","#003B71","#eff6ff","#1d4ed8"],
          ["comprobantes","Comprobantes","#166534","#ecfdf5","#166534"],
          ["reportes","Reportes","#7c3aed","#faf5ff","#7c3aed"],
        ].map(([id,label,bg,inactiveBg,inactiveColor])=>(
          <button
            key={id}
            type="button"
            onClick={()=>setTab(id)}
            style={{
              ...B(tab===id ? bg : inactiveBg, tab===id ? "#fff" : inactiveColor),
              border:tab===id ? `1px solid ${bg}` : "1px solid #dbe4f0",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab==="resumen" && (
        <>
          <div style={{display:"grid",gridTemplateColumns:"1.1fr 1fr",gap:18}}>
            <div style={CD}>
              <div style={ST}>Base contable 2026</div>
              <div style={{fontSize:13,color:"#475569",lineHeight:1.7}}>
                <div><strong style={{color:"#1a1a2e"}}>Marco sugerido:</strong> {configActual.marcoNormativoLabel}</div>
                <div><strong style={{color:"#1a1a2e"}}>UVT 2026:</strong> {fmt(configActual.uvt)}</div>
                <div><strong style={{color:"#1a1a2e"}}>Moneda:</strong> {configActual.moneda}</div>
                <div><strong style={{color:"#1a1a2e"}}>Automatico CxC:</strong> {configActual.autoCxc ? "Activo" : "Inactivo"}</div>
                <div><strong style={{color:"#1a1a2e"}}>Automatico CxP:</strong> {configActual.autoCxp ? "Activo" : "Inactivo"}</div>
                <div><strong style={{color:"#1a1a2e"}}>Automatico nómina:</strong> {configActual.autoNomina ? "Activo" : "Inactivo"}</div>
                <div style={{marginTop:10,background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"12px 14px"}}>
                  {ACCOUNTING_NORMATIVE_NOTE}
                </div>
              </div>
            </div>
            <div style={CD}>
              <div style={ST}>Alertas operativas</div>
              <div style={{display:"grid",gap:12}}>
                <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"#1d4ed8",textTransform:"uppercase",marginBottom:4}}>Comprobantes automáticos</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#1d4ed8"}}>{resumenPeriodo.totalAutomaticos}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:6}}>
                    CxC: {automaticosCxc} · CxP: {automaticosCxp} · Nómina: {automaticosNomina}
                  </div>
                </div>
                <div style={{background:"#faf5ff",border:"1px solid #e9d5ff",borderRadius:12,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"#7c3aed",textTransform:"uppercase",marginBottom:4}}>Nóminas generadas</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#7c3aed"}}>{nominasProcesadas}</div>
                  <div style={{fontSize:12,color:"#64748b",marginTop:6}}>Cada nómina puede causar gasto y, al descargar el plano banco, generar egreso bancario.</div>
                </div>
                <div style={{fontSize:12,color:"#64748b",lineHeight:1.7}}>
                  El libro diario del periodo se nutre de causaciones y recaudos de cuentas por cobrar, causaciones y egresos de cuentas por pagar, y comprobantes automáticos de nómina. Los ajustes especiales siguen disponibles desde comprobantes manuales.
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {tab==="catalogo" && (
        <div style={{display:"grid",gap:18}}>
          <div style={CD}>
            <div style={ST}>Configuracion contable</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              <div><LBL>Razon social</LBL><input value={configActual.razonSocial} onChange={(e)=>actualizarConfig("razonSocial",e.target.value)} style={SI}/></div>
              <div><LBL>NIT</LBL><input value={configActual.nit} onChange={(e)=>actualizarConfig("nit",e.target.value)} style={SI}/></div>
              <div><LBL>Marco normativo</LBL><select value={configActual.marcoNormativo} onChange={(e)=>{const value=e.target.value;actualizarConfig("marcoNormativo",value);actualizarConfig("marcoNormativoLabel",value==="grupo3"?"Grupo 3 - Microempresas":"Grupo 2 - NIIF para las PYMES");}} style={SI}><option value="grupo2">Grupo 2 - NIIF para las PYMES</option><option value="grupo3">Grupo 3 - Microempresas</option></select></div>
              <div><LBL>UVT 2026</LBL><input type="number" value={configActual.uvt} onChange={(e)=>actualizarConfig("uvt",parseFloat(e.target.value)||0)} style={SI}/></div>
              <div><LBL>Auto CxC</LBL><select value={configActual.autoCxc?"si":"no"} onChange={(e)=>actualizarConfig("autoCxc",e.target.value==="si")} style={SI}><option value="si">Activo</option><option value="no">Inactivo</option></select></div>
              <div><LBL>Cuenta banco</LBL><select value={configActual.cuentaBanco} onChange={(e)=>actualizarConfig("cuentaBanco",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Cuenta caja</LBL><select value={configActual.cuentaCaja} onChange={(e)=>actualizarConfig("cuentaCaja",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Cuenta clientes</LBL><select value={configActual.cuentaClientes} onChange={(e)=>actualizarConfig("cuentaClientes",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Ingreso servicios</LBL><select value={configActual.cuentaIngresoServicios} onChange={(e)=>actualizarConfig("cuentaIngresoServicios",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Cuenta proveedores</LBL><select value={configActual.cuentaProveedores} onChange={(e)=>actualizarConfig("cuentaProveedores",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>IVA descontable</LBL><select value={configActual.cuentaIvaDescontable} onChange={(e)=>actualizarConfig("cuentaIvaDescontable",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>IVA generado</LBL><select value={configActual.cuentaIvaGenerado} onChange={(e)=>actualizarConfig("cuentaIvaGenerado",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Utilidad / AIU</LBL><select value={configActual.cuentaUtilidadObra} onChange={(e)=>actualizarConfig("cuentaUtilidadObra",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Auto CxP</LBL><select value={configActual.autoCxp?"si":"no"} onChange={(e)=>actualizarConfig("autoCxp",e.target.value==="si")} style={SI}><option value="si">Activo</option><option value="no">Inactivo</option></select></div>
              <div><LBL>Auto nómina</LBL><select value={configActual.autoNomina?"si":"no"} onChange={(e)=>actualizarConfig("autoNomina",e.target.value==="si")} style={SI}><option value="si">Activo</option><option value="no">Inactivo</option></select></div>
              <div><LBL>Gasto sueldos</LBL><select value={configActual.cuentaNominaSueldos} onChange={(e)=>actualizarConfig("cuentaNominaSueldos",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Gasto extras</LBL><select value={configActual.cuentaNominaExtras} onChange={(e)=>actualizarConfig("cuentaNominaExtras",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Auxilio transporte</LBL><select value={configActual.cuentaNominaAuxilio} onChange={(e)=>actualizarConfig("cuentaNominaAuxilio",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Liquidaciones</LBL><select value={configActual.cuentaNominaLiquidaciones} onChange={(e)=>actualizarConfig("cuentaNominaLiquidaciones",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Nómina por pagar</LBL><select value={configActual.cuentaNominaPorPagar} onChange={(e)=>actualizarConfig("cuentaNominaPorPagar",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Gasto prima</LBL><select value={configActual.cuentaPrimaServicios} onChange={(e)=>actualizarConfig("cuentaPrimaServicios",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Gasto cesantías</LBL><select value={configActual.cuentaCesantias} onChange={(e)=>actualizarConfig("cuentaCesantias",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Gasto int. cesantías</LBL><select value={configActual.cuentaInteresesCesantias} onChange={(e)=>actualizarConfig("cuentaInteresesCesantias",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Prima por pagar</LBL><select value={configActual.cuentaPrimaPorPagar} onChange={(e)=>actualizarConfig("cuentaPrimaPorPagar",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Cesantías por pagar</LBL><select value={configActual.cuentaCesantiasPorPagar} onChange={(e)=>actualizarConfig("cuentaCesantiasPorPagar",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Int. cesantías x pagar</LBL><select value={configActual.cuentaInteresesCesantiasPorPagar} onChange={(e)=>actualizarConfig("cuentaInteresesCesantiasPorPagar",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Salud por pagar</LBL><select value={configActual.cuentaSaludPorPagar} onChange={(e)=>actualizarConfig("cuentaSaludPorPagar",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Pensión por pagar</LBL><select value={configActual.cuentaPensionPorPagar} onChange={(e)=>actualizarConfig("cuentaPensionPorPagar",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
              <div><LBL>Otras deduc. nómina</LBL><select value={configActual.cuentaOtrasDeduccionesNomina} onChange={(e)=>actualizarConfig("cuentaOtrasDeduccionesNomina",e.target.value)} style={SI}>{cuentasMovimiento.map((item)=><option key={item.codigo} value={item.codigo}>{item.codigo} · {item.nombre}</option>)}</select></div>
            </div>
          </div>
          <div style={CD}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
              <div style={ST}>Plan de cuentas</div>
              <div style={{display:"flex",gap:8}}>
                <button style={B("#003B71")} onClick={()=>{setShowCuentaForm(true);setCuentaForm(buildEmptyPlanCuenta());setEditCuentaId(null);}}>+ Nueva cuenta</button>
                <button style={B("#f1f5f9","#475569")} onClick={()=>setPlanCuentas(buildDefaultPlanCuentas())}>Restablecer base</button>
              </div>
            </div>
            <div style={{marginBottom:12}}><input value={busquedaCuenta} onChange={(e)=>setBusquedaCuenta(e.target.value)} placeholder="Busca por codigo, nombre o categoria" style={SI}/></div>
            {showCuentaForm && <div style={{background:"#f8fafc",border:"1px solid #dbe4f0",borderRadius:12,padding:16,marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
                <div><LBL>Codigo</LBL><input value={cuentaForm.codigo} onChange={(e)=>setCuentaForm({...cuentaForm,codigo:e.target.value})} style={SI}/></div>
                <div><LBL>Nombre</LBL><input value={cuentaForm.nombre} onChange={(e)=>setCuentaForm({...cuentaForm,nombre:e.target.value})} style={SI}/></div>
                <div><LBL>Naturaleza</LBL><select value={cuentaForm.naturaleza} onChange={(e)=>setCuentaForm({...cuentaForm,naturaleza:e.target.value})} style={SI}><option value="debito">Debito</option><option value="credito">Credito</option></select></div>
                <div><LBL>Grupo</LBL><select value={cuentaForm.grupoReporte} onChange={(e)=>setCuentaForm({...cuentaForm,grupoReporte:e.target.value})} style={SI}>{accountGroupOptions.map((opt)=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                <div><LBL>Categoria estado</LBL><select value={cuentaForm.categoriaEstado} onChange={(e)=>setCuentaForm({...cuentaForm,categoriaEstado:e.target.value})} style={SI}>{statementCategoryOptions.map((opt)=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
                <div><LBL>Cuenta padre</LBL><input value={cuentaForm.cuentaPadre} onChange={(e)=>setCuentaForm({...cuentaForm,cuentaPadre:e.target.value})} style={SI}/></div>
                <div><LBL>Permite movimientos</LBL><select value={cuentaForm.permiteMovimientos?"si":"no"} onChange={(e)=>setCuentaForm({...cuentaForm,permiteMovimientos:e.target.value==="si"})} style={SI}><option value="si">Si</option><option value="no">No</option></select></div>
                <div><LBL>Activa</LBL><select value={cuentaForm.activo?"si":"no"} onChange={(e)=>setCuentaForm({...cuentaForm,activo:e.target.value==="si"})} style={SI}><option value="si">Si</option><option value="no">No</option></select></div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button style={B("#cc0000")} onClick={guardarCuentaPlan}>{editCuentaId?"Guardar cambios":"Guardar cuenta"}</button>
                <button style={B("#f1f5f9","#475569")} onClick={resetCuentaPlan}>Cancelar</button>
              </div>
            </div>}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#f1f5f9"}}>{["Codigo","Cuenta","Grupo","Categoria","Naturaleza","Estado","Acciones"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:"left",color:"#64748b",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                <tbody>
                  {cuentasFiltradas.map((cuenta)=>(
                    <tr key={cuenta.codigo} style={{borderBottom:"1px solid #e2e8f0"}}>
                      <td style={{padding:"10px",fontWeight:700,color:"#003B71"}}>{cuenta.codigo}</td>
                      <td style={{padding:"10px"}}>{cuenta.nombre}</td>
                      <td style={{padding:"10px"}}>{cuenta.grupoReporteLabel}</td>
                      <td style={{padding:"10px"}}>{cuenta.categoriaEstadoLabel}</td>
                      <td style={{padding:"10px"}}>{cuenta.naturaleza}</td>
                      <td style={{padding:"10px"}}><Badge estado={cuenta.activo?"Activa":"Inactiva"}/></td>
                      <td style={{padding:"10px"}}>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <button style={{...B("#f1f5f9","#475569"),padding:"6px 10px",fontSize:11}} onClick={()=>editarCuentaPlan(cuenta)}>Editar</button>
                          <button style={{...B(cuenta.activo?"#fff7ed":"#ecfdf5",cuenta.activo?"#9a3412":"#166534"),padding:"6px 10px",fontSize:11}} onClick={()=>alternarCuentaActiva(cuenta.codigo)}>{cuenta.activo?"Desactivar":"Activar"}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab==="comprobantes" && (
        <div style={{display:"grid",gap:18}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <div style={{...CD,flex:1,padding:16}}>
              <div style={ST}>Libro diario del periodo</div>
              <div style={{fontSize:12,color:"#64748b"}}>
                {mostrarComprobantesBuscados
                  ? `${asientosFiltrados.length} comprobante(s) visibles en ${periodo || "todos los periodos"}.`
                  : `Escribe en el buscador para consultar comprobantes de ${periodo || "todos los periodos"}.`}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button style={B("#166534")} onClick={()=>{setShowAsientoForm(true);setAsientoForm(buildEmptyManualAsiento(manuales, today()));setEditAsientoId(null);}}>+ Nuevo comprobante</button>
            </div>
          </div>

          {showAsientoForm && (
            <div style={{...CD,border:"1px solid #166534"}}>
              <div style={ST}>{editAsientoId?"Editar comprobante manual":"Nuevo comprobante manual"}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
                <div><LBL>Fecha</LBL><input type="date" value={asientoForm.fecha} onChange={(e)=>setAsientoForm({...asientoForm,fecha:e.target.value,periodo:e.target.value?.slice(0,7)||""})} style={SI}/></div>
                <div><LBL>Consecutivo</LBL><input value={asientoForm.consecutivo} onChange={(e)=>setAsientoForm({...asientoForm,consecutivo:e.target.value})} style={SI}/></div>
                <div><LBL>Tipo</LBL><select value={asientoForm.tipoComprobante} onChange={(e)=>setAsientoForm({...asientoForm,tipoComprobante:e.target.value})} style={SI}><option value="Diario">Diario</option><option value="Ingreso">Ingreso</option><option value="Egreso">Egreso</option><option value="Ajuste">Ajuste</option></select></div>
                <div><LBL>Estado</LBL><select value={asientoForm.estado} onChange={(e)=>setAsientoForm({...asientoForm,estado:e.target.value})} style={SI}><option value="Contabilizado">Contabilizado</option><option value="Borrador">Borrador</option></select></div>
                <div>
                  <LBL>NIT / Documento</LBL>
                  <input
                    list="terceros-erp-por-nit"
                    value={asientoForm.terceroNit || ""}
                    onChange={(e)=>aplicarTerceroAsientoPorNit(e.target.value)}
                    style={SI}
                    placeholder="Escribe NIT o cédula"
                  />
                  <datalist id="terceros-erp-por-nit">
                    {tercerosERP.map((tercero)=><option key={tercero.ref} value={tercero.terceroNit || ""} label={`${tercero.terceroNombre} · ${tercero.tipo}`}>{`${tercero.terceroNombre} · ${tercero.tipo}`}</option>)}
                  </datalist>
                </div>
                <div>
                  <LBL>Tercero ERP</LBL>
                  <input
                    value={asientoForm.terceroNombre ? `${asientoForm.terceroNombre}${resolverTerceroRef(asientoForm.terceroId, asientoForm.terceroNit, asientoForm.terceroNombre) ? ` · ${buscarTerceroERP(resolverTerceroRef(asientoForm.terceroId, asientoForm.terceroNit, asientoForm.terceroNombre))?.tipo || ""}` : ""}` : ""}
                    readOnly
                    style={{...SI,background:"#f8fafc",color:"#334155"}}
                    placeholder="Se completa con el NIT"
                  />
                </div>
                <div><LBL>Soporte</LBL><input value={asientoForm.soporte} onChange={(e)=>setAsientoForm({...asientoForm,soporte:e.target.value})} style={SI}/></div>
                <div><LBL>Nombre tercero</LBL><input value={asientoForm.terceroNombre || ""} readOnly style={{...SI,background:"#f8fafc",color:"#334155"}} placeholder="Se completa con el tercero"/></div>
                <div style={{gridColumn:"span 4"}}><LBL>Descripcion</LBL><input value={asientoForm.descripcion} onChange={(e)=>setAsientoForm({...asientoForm,descripcion:e.target.value})} style={SI}/></div>
              </div>

              <div style={{overflowX:"auto",marginBottom:12}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:980}}>
                  <thead><tr style={{background:"#f1f5f9"}}>{["Cuenta","Detalle","Tercero","Centro costo","Debito","Credito",""].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:label==="Debito"||label==="Credito"?"right":"left",color:"#64748b",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                  <tbody>
                    {(asientoForm.lineas || []).map((linea)=>(
                      <tr key={linea.id} style={{borderBottom:"1px solid #e2e8f0"}}>
                        <td style={{padding:"8px 10px",minWidth:220}}>
                          <input
                            list="cuentas-movimiento-list"
                            value={getCuentaMovimientoInputValue(linea)}
                            onChange={(e)=>actualizarLinea(linea.id,"cuentaBusqueda",e.target.value)}
                            style={SI}
                            placeholder="Busca código o nombre"
                          />
                          <datalist id="cuentas-movimiento-list">
                            {cuentasMovimiento.map((item)=><option key={item.codigo} value={formatCuentaMovimientoLabel(item.codigo, item.nombre)} />)}
                          </datalist>
                        </td>
                        <td style={{padding:"8px 10px"}}><input value={linea.detalle} onChange={(e)=>actualizarLinea(linea.id,"detalle",e.target.value)} style={SI}/></td>
                        <td style={{padding:"8px 10px",minWidth:240}}>
                          <select value={resolverTerceroRef(linea.terceroId, linea.terceroNit, linea.terceroNombre)} onChange={(e)=>actualizarLinea(linea.id,"terceroRef",e.target.value)} style={SI}>
                            <option value="">Usar tercero del encabezado...</option>
                            {tercerosERP.map((tercero)=><option key={tercero.ref} value={tercero.ref}>{tercero.tipo} · {tercero.terceroNombre}</option>)}
                          </select>
                          <div style={{fontSize:10,color:"#64748b",marginTop:4}}>
                            NIT: {linea.terceroNit || asientoForm.terceroNit || "—"} · {linea.terceroNombre || asientoForm.terceroNombre || "Sin tercero"}
                          </div>
                        </td>
                        <td style={{padding:"8px 10px"}}><input value={linea.centroCosto} onChange={(e)=>actualizarLinea(linea.id,"centroCosto",e.target.value)} style={SI} placeholder="OB-001"/></td>
                        <td style={{padding:"8px 10px",minWidth:120}}><input type="number" value={linea.debito} onChange={(e)=>actualizarLinea(linea.id,"debito",e.target.value)} style={{...SI,textAlign:"right"}}/></td>
                        <td style={{padding:"8px 10px",minWidth:120}}><input type="number" value={linea.credito} onChange={(e)=>actualizarLinea(linea.id,"credito",e.target.value)} style={{...SI,textAlign:"right"}}/></td>
                        <td style={{padding:"8px 10px"}}><button style={{...B("#fff1f2","#be123c"),padding:"6px 10px",fontSize:11}} onClick={()=>quitarLinea(linea.id)}>Quitar</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:8}}>
                  <button style={B("#003B71")} onClick={agregarLinea}>+ Linea</button>
                  <button style={B("#cc0000")} onClick={guardarAsiento}>{editAsientoId?"Guardar cambios":"Guardar comprobante"}</button>
                  <button style={B("#f1f5f9","#475569")} onClick={resetAsiento}>Cancelar</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,auto)",gap:12,fontSize:12}}>
                  <div><strong>Debito:</strong> {fmt(totalDebitoForm)}</div>
                  <div><strong>Credito:</strong> {fmt(totalCreditoForm)}</div>
                  <div><strong>Diferencia:</strong> <span style={{color:diferenciaForm===0?"#166534":"#b91c1c"}}>{fmt(diferenciaForm)}</span></div>
                </div>
              </div>
            </div>
          )}

          <div style={CD}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
              <div style={ST}>Comprobantes del periodo</div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                <input type="month" value={periodo} onChange={(e)=>setPeriodo(e.target.value)} style={{...SI,width:"auto"}}/>
                <input value={busquedaAsiento} onChange={(e)=>setBusquedaAsiento(e.target.value)} placeholder="Buscar comprobante, tercero o NIT" style={{...SI,width:280}}/>
              </div>
            </div>
            {!mostrarComprobantesBuscados ? null : (
            <div style={{display:"grid",gap:12}}>
              {asientosFiltrados.map((entry)=>(
                <div key={entry.id} style={{border:"1px solid #e2e8f0",borderRadius:12,overflow:"hidden",background:"#fff"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",padding:"12px 14px",background:entry.automatico?"#eff6ff":"#f8fafc",borderBottom:"1px solid #e2e8f0",flexWrap:"wrap"}}>
                    <div>
                      <div style={{fontWeight:800,color:"#1a1a2e"}}>{entry.consecutivo || entry.id} · {entry.tipoComprobante}</div>
                      <div style={{fontSize:12,color:"#64748b",marginTop:4}}>{fmtD(entry.fecha)} · {entry.descripcion}</div>
                      <div style={{fontSize:12,color:"#334155",marginTop:6}}>
                        <strong>NIT:</strong> {entry.terceroNit || "—"} · <strong>Tercero:</strong> {entry.terceroNombre || "Sin tercero"}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <Badge estado={entry.automatico?"Automatico":entry.estado}/>
                      {!entry.automatico && <button style={{...B("#f1f5f9","#475569"),padding:"6px 10px",fontSize:11}} onClick={()=>editarAsiento(entry)}>Editar</button>}
                      {!entry.automatico && entry.estado!=="Anulado" && <button style={{...B("#fff1f2","#be123c"),padding:"6px 10px",fontSize:11}} onClick={()=>anularAsiento(entry.id)}>Anular</button>}
                    </div>
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:760}}>
                      <thead><tr style={{background:"#fafafa"}}>{["Cuenta","Detalle","Tercero","Centro costo","Debito","Credito"].map((label)=><th key={label} style={{padding:"8px 10px",textAlign:label==="Debito"||label==="Credito"?"right":"left",fontSize:11,color:"#64748b"}}>{label}</th>)}</tr></thead>
                      <tbody>
                        {(entry.lineas || []).map((linea)=>(
                          <tr key={linea.id} style={{borderTop:"1px solid #f1f5f9"}}>
                            <td style={{padding:"8px 10px"}}>{linea.cuentaCodigo} · {linea.cuentaNombre}</td>
                            <td style={{padding:"8px 10px"}}>{linea.detalle || "—"}</td>
                            <td style={{padding:"8px 10px"}}>{(linea.terceroNit || entry.terceroNit) ? `${linea.terceroNit || entry.terceroNit} · ` : ""}{linea.terceroNombre || entry.terceroNombre || "—"}</td>
                            <td style={{padding:"8px 10px"}}>{linea.centroCosto || "—"}</td>
                            <td style={{padding:"8px 10px",textAlign:"right",color:"#166534"}}>{fmt(linea.debito)}</td>
                            <td style={{padding:"8px 10px",textAlign:"right",color:"#7c3aed"}}>{fmt(linea.credito)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr style={{background:"#f8fafc"}}><td colSpan={4} style={{padding:"8px 10px",fontWeight:700}}>Totales</td><td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#166534"}}>{fmt(entry.totalDebito)}</td><td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#7c3aed"}}>{fmt(entry.totalCredito)}</td></tr></tfoot>
                    </table>
                  </div>
                </div>
              ))}
              {!asientosFiltrados.length && (
                <div style={{border:"1px dashed #cbd5e1",borderRadius:14,background:"#f8fafc",padding:"22px",textAlign:"center",color:"#64748b",fontSize:13}}>
                  No hay comprobantes que coincidan con esa búsqueda.
                </div>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {tab==="reportes" && (
        <div id="pz" className="doc-shell">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:18,flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:24,fontWeight:800,color:"#1a1a2e"}}>Reportes contables</div>
              <div style={{fontSize:12,color:"#64748b",marginTop:4}}>Estados financieros, libro auxiliar por cuenta/tercero y conciliación bancaria para {periodo || "todos los periodos"}.</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <input type="month" value={periodo} onChange={(e)=>setPeriodo(e.target.value)} style={{...SI,width:"auto"}}/>
              <button style={B("#166534")} onClick={exportarExcelContabilidad}>Exportar Excel</button>
              <button style={B("#7c3aed")} onClick={()=>printCurrentPz("Contabilidad " + (periodo || "general"))}>Imprimir</button>
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
            {[
              ["general","Vista general","#7c3aed","#faf5ff","#7c3aed"],
              ["movimientos","Auxiliar por cuenta","#003B71","#eff6ff","#1d4ed8"],
              ["conciliacion","Conciliación bancaria","#166534","#ecfdf5","#166534"],
            ].map(([id,label,bg,inactiveBg,inactiveColor])=>(
              <button
                key={id}
                type="button"
                onClick={()=>setReporteTab(id)}
                style={{
                  ...B(reporteTab===id ? bg : inactiveBg, reporteTab===id ? "#fff" : inactiveColor),
                  border:reporteTab===id ? `1px solid ${bg}` : "1px solid #dbe4f0",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {reporteTab==="general" && (
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18,marginBottom:18}}>
                <div style={CD}>
                  <div style={ST}>Estado de resultados</div>
                  <div style={{display:"grid",gap:8,fontSize:13}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Ingresos</span><strong style={{color:"#166534"}}>{fmt(estados.resultados.totalIngresos)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Costos</span><strong style={{color:"#c2410c"}}>{fmt(estados.resultados.totalCostos)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Utilidad bruta</span><strong style={{color:estados.resultados.utilidadBruta>=0?"#166534":"#b91c1c"}}>{fmt(estados.resultados.utilidadBruta)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Gastos</span><strong style={{color:"#7c3aed"}}>{fmt(estados.resultados.totalGastos)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid #e2e8f0"}}><span>Utilidad operacional</span><strong style={{color:estados.resultados.utilidadOperacional>=0?"#166534":"#b91c1c"}}>{fmt(estados.resultados.utilidadOperacional)}</strong></div>
                  </div>
                </div>
                <div style={CD}>
                  <div style={ST}>Estado de situacion financiera</div>
                  <div style={{display:"grid",gap:8,fontSize:13}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Activos</span><strong style={{color:"#166534"}}>{fmt(estados.balance.totalActivos)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Pasivos</span><strong style={{color:"#c2410c"}}>{fmt(estados.balance.totalPasivos)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Patrimonio total</span><strong style={{color:"#003B71"}}>{fmt(estados.balance.totalPatrimonio)}</strong></div>
                  </div>
                </div>
              </div>

              <div style={{...CD,marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                  <div>
                    <div style={ST}>Saldos tributarios relevantes</div>
                    <div style={{fontSize:12,color:"#64748b"}}>Consulta rápida de retenciones e IVA del periodo.</div>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {cuentasTributariasRapidas.map((item)=>(
                      <button key={item.codigo} style={{...B("#f8fafc",item.color),border:`1px solid ${item.color}`}} onClick={()=>aplicarConsultaTributaria(item.codigo)}>
                        {item.etiqueta}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:820}}>
                    <thead><tr style={{background:"#f1f5f9"}}>{["Consulta","Codigo","Cuenta","Debitos","Creditos","Saldo natural"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:["Debitos","Creditos","Saldo natural"].includes(label)?"right":"left",color:"#64748b",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                    <tbody>
                      {saldosTributarios.map((row)=>(
                        <tr key={row.codigo} style={{borderBottom:"1px solid #e2e8f0"}}>
                          <td style={{padding:"8px 10px",fontWeight:700,color:row.color}}>{row.etiqueta}</td>
                          <td style={{padding:"8px 10px",fontWeight:700,color:"#003B71"}}>{row.codigo}</td>
                          <td style={{padding:"8px 10px"}}>{row.nombre}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#166534"}}>{fmt(row.debitos)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#7c3aed"}}>{fmt(row.creditos)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:Number(row.saldoNatural || 0)>=0?"#1a1a2e":"#b91c1c"}}>{fmt(row.saldoNatural)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{...CD,marginBottom:18}}>
                <div style={ST}>Balance de prueba</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:980}}>
                    <thead><tr style={{background:"#f1f5f9"}}>{["Codigo","Cuenta","Grupo","Debitos","Creditos","Saldo natural"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:["Debitos","Creditos","Saldo natural"].includes(label)?"right":"left",color:"#64748b",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                    <tbody>
                      {balancePrueba.map((row)=>(
                        <tr key={row.codigo} style={{borderBottom:"1px solid #e2e8f0"}}>
                          <td style={{padding:"8px 10px",fontWeight:700,color:"#003B71"}}>{row.codigo}</td>
                          <td style={{padding:"8px 10px"}}>{row.nombre}</td>
                          <td style={{padding:"8px 10px"}}>{row.grupoReporteLabel}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#166534"}}>{fmt(row.debitos)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#7c3aed"}}>{fmt(row.creditos)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:row.saldoNatural>=0?"#1a1a2e":"#b91c1c"}}>{fmt(row.saldoNatural)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={CD}>
                <div style={ST}>Libro diario resumido</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:980}}>
                    <thead><tr style={{background:"#f1f5f9"}}>{["Fecha","Comprobante","NIT","Tercero","Descripcion","Origen","Debito","Credito"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:label==="Debito"||label==="Credito"?"right":"left",color:"#64748b",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                    <tbody>
                      {asientosFiltrados.map((entry)=>(
                        <tr key={entry.id} style={{borderBottom:"1px solid #e2e8f0"}}>
                          <td style={{padding:"8px 10px"}}>{fmtD(entry.fecha)}</td>
                          <td style={{padding:"8px 10px",fontWeight:700,color:"#003B71"}}>{entry.consecutivo || entry.id}</td>
                          <td style={{padding:"8px 10px"}}>{entry.terceroNit || "—"}</td>
                          <td style={{padding:"8px 10px"}}>{entry.terceroNombre || "Sin tercero"}</td>
                          <td style={{padding:"8px 10px"}}>{entry.descripcion}</td>
                          <td style={{padding:"8px 10px"}}>{entry.automatico?"Automatico":"Manual"}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#166534"}}>{fmt(entry.totalDebito)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#7c3aed"}}>{fmt(entry.totalCredito)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {reporteTab==="movimientos" && (
            <>
              <div style={{...CD,marginBottom:18}}>
                <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <LBL>Código de cuenta o auxiliar</LBL>
                    <input value={filtroCuentaMovimiento} onChange={(e)=>setFiltroCuentaMovimiento(e.target.value)} placeholder="Ej. 2365, 236540, 240810" style={SI}/>
                  </div>
                  <div>
                    <LBL>Tercero / NIT / cédula</LBL>
                    <input
                      value={filtroTerceroMovimientoRef}
                      onChange={(e)=>setFiltroTerceroMovimientoRef(e.target.value)}
                      placeholder="Escribe tercero, NIT o cédula"
                      style={SI}
                    />
                  </div>
                  <div>
                    <LBL>Fecha inicial</LBL>
                    <input type="date" value={rangoReportes.inicio} onChange={(e)=>setRangoReportes((prev)=>({...prev,inicio:e.target.value}))} style={SI}/>
                  </div>
                  <div>
                    <LBL>Fecha final</LBL>
                    <input type="date" value={rangoReportes.fin} onChange={(e)=>setRangoReportes((prev)=>({...prev,fin:e.target.value}))} style={SI}/>
                  </div>
                </div>
              </div>
              <div style={CD}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                  <div style={{fontSize:12,color:"#64748b"}}>
                    {movimientosCuenta.length} movimiento(s) · Débitos {fmt(resumenAuxiliar.debitos)} · Créditos {fmt(resumenAuxiliar.creditos)} · Saldo {fmt(resumenAuxiliar.saldo)}
                  </div>
                  <div style={{fontSize:12,color:"#64748b"}}>
                    {filtroTerceroMovimientoRef ? `Filtro tercero: ${filtroTerceroMovimientoRef}` : "Sin filtro de tercero"}
                  </div>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1200}}>
                    <thead>
                      <tr style={{background:"#f1f5f9"}}>
                        {["Fecha","Comprobante","Cuenta","NIT","Tercero","Detalle","Centro costo","Debito","Credito","Saldo acumulado","Origen"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:["Debito","Credito","Saldo acumulado"].includes(label)?"right":"left",color:"#64748b",fontWeight:600,fontSize:11}}>{label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosCuenta.length===0 ? (
                        <tr>
                          <td colSpan={11} style={{padding:18,textAlign:"center",color:"#94a3b8"}}>
                            No hay movimientos para ese NIT, cédula, tercero o cuenta en el rango seleccionado.
                          </td>
                        </tr>
                      ) : movimientosCuenta.map((row)=>(
                        <tr key={row.rowId} style={{borderBottom:"1px solid #e2e8f0"}}>
                          <td style={{padding:"8px 10px"}}>{fmtD(row.fecha)}</td>
                          <td style={{padding:"8px 10px",fontWeight:700,color:"#003B71"}}>{row.consecutivo}</td>
                          <td style={{padding:"8px 10px"}}>{row.cuentaCodigo} · {row.cuentaNombre || "Cuenta"}</td>
                          <td style={{padding:"8px 10px"}}>{row.terceroNit || "—"}</td>
                          <td style={{padding:"8px 10px"}}>{row.terceroNombre || "Sin tercero"}</td>
                          <td style={{padding:"8px 10px"}}>{row.detalle || row.descripcion || "—"}</td>
                          <td style={{padding:"8px 10px"}}>{row.centroCosto || "—"}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#166534"}}>{fmt(row.debito)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#7c3aed"}}>{fmt(row.credito)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:Number(row.saldoAcumulado || 0)>=0?"#1a1a2e":"#b91c1c"}}>{fmt(row.saldoAcumulado)}</td>
                          <td style={{padding:"8px 10px"}}>{row.origen || "manual"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {reporteTab==="conciliacion" && (
            <>
              <div style={{...CD,marginBottom:18}}>
                <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr 1fr auto",gap:12,alignItems:"end",marginBottom:12}}>
                  <div>
                    <LBL>Cuenta bancaria</LBL>
                    <select value={cuentaConciliacion} onChange={(e)=>setCuentaConciliacion(e.target.value)} style={SI}>
                      <option value="">Selecciona una cuenta...</option>
                      {cuentasBancariasReporte.map((cuenta)=><option key={cuenta.codigo} value={cuenta.codigo}>{cuenta.codigo} · {cuenta.nombre}</option>)}
                    </select>
                  </div>
                  <div>
                    <LBL>Fecha inicial</LBL>
                    <input type="date" value={rangoReportes.inicio} onChange={(e)=>setRangoReportes((prev)=>({...prev,inicio:e.target.value}))} style={SI}/>
                  </div>
                  <div>
                    <LBL>Fecha final</LBL>
                    <input type="date" value={rangoReportes.fin} onChange={(e)=>setRangoReportes((prev)=>({...prev,fin:e.target.value}))} style={SI}/>
                  </div>
                  <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#334155",paddingBottom:12}}>
                    <input type="checkbox" checked={soloPendientesConciliacion} onChange={(e)=>setSoloPendientesConciliacion(e.target.checked)}/>
                    Mostrar solo pendientes
                  </label>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button style={B("#166534")} onClick={()=>marcarMovimientosConciliacionVisible(true)}>Marcar visibles conciliados</button>
                    <button style={B("#f1f5f9","#475569")} onClick={()=>marcarMovimientosConciliacionVisible(false)}>Quitar conciliación visible</button>
                  </div>
                  <div style={{fontSize:12,color:"#64748b"}}>
                    Cuenta de trabajo: <strong>{cuentaConciliacion || "Sin seleccionar"}</strong>
                  </div>
                </div>
              </div>
              <div style={CD}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                  <div>
                    <div style={ST}>Conciliación bancaria</div>
                    <div style={{fontSize:12,color:"#64748b"}}>Selecciona los movimientos del banco conciliados a cierre de mes.</div>
                  </div>
                  <div style={{fontSize:12,color:"#64748b"}}>
                    Débitos {fmt(resumenConciliacion.debitos)} · Créditos {fmt(resumenConciliacion.creditos)}
                  </div>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1120}}>
                    <thead><tr style={{background:"#f1f5f9"}}>{["OK","Fecha","Comprobante","Detalle","NIT","Tercero","Debito","Credito","Saldo","Origen"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:["Debito","Credito","Saldo"].includes(label)?"right":"left",color:"#64748b",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                    <tbody>
                      {movimientosConciliacionVisibles.length===0 ? (
                        <tr><td colSpan={10} style={{padding:18,textAlign:"center",color:"#94a3b8"}}>No hay movimientos bancarios para el filtro actual.</td></tr>
                      ) : movimientosConciliacionVisibles.map((row)=>(
                        <tr key={row.rowId} style={{borderBottom:"1px solid #e2e8f0",background:row.conciliado?"#f0fdf4":"#fff"}}>
                          <td style={{padding:"8px 10px"}}>
                            <input type="checkbox" checked={row.conciliado} onChange={()=>alternarMovimientoConciliado(row.rowId)}/>
                          </td>
                          <td style={{padding:"8px 10px"}}>{fmtD(row.fecha)}</td>
                          <td style={{padding:"8px 10px",fontWeight:700,color:"#003B71"}}>{row.consecutivo}</td>
                          <td style={{padding:"8px 10px"}}>{row.detalle || row.descripcion || "—"}</td>
                          <td style={{padding:"8px 10px"}}>{row.terceroNit || "—"}</td>
                          <td style={{padding:"8px 10px"}}>{row.terceroNombre || "Sin tercero"}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#166534"}}>{fmt(row.debito)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#7c3aed"}}>{fmt(row.credito)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:Number(row.saldoAcumulado || 0)>=0?"#1a1a2e":"#b91c1c"}}>{fmt(row.saldoAcumulado)}</td>
                          <td style={{padding:"8px 10px"}}>{row.origen || "manual"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Financiero({ctx}){
  const {obras,pagos,cuentas,empleados}=ctx;
  const [obraFiltro,setObraFiltro]=useState("todas");
  const nomMes=empleados.filter(e=>e.activo).reduce((s,e)=>s+e.salario+200000,0);

  const obrasData=obras.map(o=>{
    const ingresos=o.total;
    const cobrado=o.pagado;
    const costosDir=cuentas.filter(c=>c.obraId===o.id).reduce((s,c)=>s+c.monto,0);
    const utilBruta=ingresos-costosDir;
    const margenBruto=ingresos>0?Math.round(utilBruta/ingresos*100):0;
    return{...o,ingresos,cobrado,costosDir,utilBruta,margenBruto};
  });

  const sel=obraFiltro==="todas"?obrasData:obrasData.filter(o=>o.id===obraFiltro);
  const totIng=sel.reduce((s,o)=>s+o.ingresos,0);
  const totCob=sel.reduce((s,o)=>s+o.cobrado,0);
  const totCost=sel.reduce((s,o)=>s+o.costosDir,0);
  const totUtil=totIng-totCost;
  const margenGlobal=totIng>0?Math.round(totUtil/totIng*100):0;

  return(
    <div style={{padding:28}}>
      <H1 title="Informe Financiero" subtitle="Rentabilidad, costos e ingresos por obra"/>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:24}}>
        <div><LBL>Filtrar por obra</LBL>
          <select value={obraFiltro} onChange={e=>setObraFiltro(e.target.value)} style={{...SI,width:"auto"}}>
            <option value="todas">Todas las obras</option>
            {obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}
          </select>
        </div>
        <button style={{...B("#f47c20"),marginTop:16}} onClick={()=>printCurrentPz("Informe financiero " + (obraFiltro))}>🖨️ Imprimir informe</button>
      </div>

      <div id="pz" className="doc-shell">
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
          <SC label="Ingresos totales" value={fmtK(totIng)} color="#4ade80" icon="💰" sub="facturado"/>
          <SC label="Cobrado" value={fmtK(totCob)} color="#60b4ff" icon="✅" sub={(totIng>0?Math.round(totCob/totIng*100):0) + "% del total"}/>
          <SC label="Costos directos" value={fmtK(totCost)} color="#fb923c" icon="🧾" sub="proveedores"/>
          <SC label="Margen bruto" value={(margenGlobal) + "%"} color={margenGlobal>25?"#4ade80":margenGlobal>10?"#f5c842":"#ef4444"} icon="📊" sub={fmt(totUtil)}/>
        </div>

        <div style={{...CD,marginBottom:20}}>
          <div style={ST}>Detalle financiero por obra</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#f1f5f9"}}>{["Obra","Cliente","Ingresos","Cobrado","Saldo","Costos Dir.","Util. Bruta","Margen %","Estado"].map(h=><th key={h} style={{padding:"9px 12px",textAlign:["Ingresos","Cobrado","Saldo","Costos Dir.","Util. Bruta","Margen %"].includes(h)?"right":"left",color:"#64748b",fontWeight:500,fontSize:11}}>{h}</th>)}</tr></thead>
            <tbody>
              {sel.map((o,i)=>(
                <tr key={o.id} style={{borderBottom:"1px solid #e2e8f0",background:i%2===0?"#ffffff":"#f8fafc"}}>
                  <td style={{padding:"10px 12px",color:"#60b4ff",fontSize:11}}>{o.id}</td>
                  <td style={{padding:"10px 12px",fontSize:12,fontWeight:500}}>{o.cliente}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:"#4ade80",fontWeight:600}}>{fmt(o.ingresos)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:"#60b4ff"}}>{fmt(o.cobrado)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:o.saldo>0?"#fb923c":"#4ade80"}}>{fmt(o.saldo)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",color:"#fb923c"}}>{fmt(o.costosDir)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right",fontWeight:700,color:o.utilBruta>0?"#4ade80":"#ef4444"}}>{fmt(o.utilBruta)}</td>
                  <td style={{padding:"10px 12px",textAlign:"right"}}>
                    <span style={{fontWeight:700,color:o.margenBruto>25?"#4ade80":o.margenBruto>10?"#f5c842":"#ef4444"}}>{o.margenBruto}%</span>
                  </td>
                  <td style={{padding:"10px 12px"}}><Badge estado={o.estado}/></td>
                </tr>
              ))}
              <tr style={{background:"#f1f5f9",fontWeight:700}}>
                <td colSpan={2} style={{padding:"10px 12px",color:"#cc0000"}}>TOTALES</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:"#4ade80"}}>{fmt(totIng)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:"#60b4ff"}}>{fmt(totCob)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:totIng-totCob>0?"#fb923c":"#4ade80"}}>{fmt(totIng-totCob)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:"#fb923c"}}>{fmt(totCost)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:totUtil>0?"#4ade80":"#ef4444"}}>{fmt(totUtil)}</td>
                <td style={{padding:"10px 12px",textAlign:"right",color:margenGlobal>25?"#4ade80":margenGlobal>10?"#f5c842":"#ef4444"}}>{margenGlobal}%</td>
                <td/>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
          <div style={CD}>
            <div style={ST}>Rentabilidad por obra</div>
            {sel.map(o=>(
              <div key={o.id} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                  <span style={{color:"#1a1a2e",fontWeight:500}}>{o.cliente}</span>
                  <span style={{color:o.margenBruto>25?"#4ade80":o.margenBruto>10?"#f5c842":"#ef4444",fontWeight:700}}>{o.margenBruto}%</span>
                </div>
                <div style={{height:8,background:"#e2e8f0",borderRadius:4}}>
                  <div style={{width:(Math.max(0,Math.min(100,o.margenBruto))) + "%",height:"100%",background:o.margenBruto>25?"#4ade80":o.margenBruto>10?"#f5c842":"#ef4444",borderRadius:4}}/>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:"#64748b",marginTop:3}}>
                  <span>Ingreso: {fmt(o.ingresos)}</span><span>Costo: {fmt(o.costosDir)}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={CD}>
            <div style={ST}>Estructura de costos</div>
            <div style={{marginBottom:14}}>
              {[["Costos proveedores",totCost,"#fb923c"],["Nómina mensual estimada",nomMes,"#c084fc"],["Saldo pendiente cobrar",totIng-totCob,"#f5c842"],["Utilidad bruta estimada",totUtil,"#4ade80"]].map(([k,v,c])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #e2e8f0",fontSize:13}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:10,height:10,borderRadius:2,background:c,flexShrink:0}}/><span style={{color:"#475569"}}>{k}</span></div>
                  <span style={{fontWeight:700,color:c}}>{fmt(v)}</span>
                </div>
              ))}
            </div>
            <div style={{background:"#f1f5f9",borderRadius:8,padding:"12px 14px",fontSize:12,color:"#64748b",lineHeight:1.7}}>
              <div style={{fontWeight:600,color:"#1a1a2e",marginBottom:6}}>Indicadores clave</div>
              <div>💰 Margen bruto global: <strong style={{color:margenGlobal>25?"#4ade80":"#f5c842"}}>{margenGlobal}%</strong></div>
              <div>📦 Obras activas: <strong style={{color:"#60b4ff"}}>{obras.filter(o=>o.estado==="En Obra").length}</strong></div>
              <div>💸 Por cobrar: <strong style={{color:"#fb923c"}}>{fmt(obras.reduce((s,o)=>s+o.saldo,0))}</strong></div>
              <div>🧾 Cuentas x pagar: <strong style={{color:"#c084fc"}}>{fmt(ctx.cuentas.filter(c=>c.estado==="Pendiente").reduce((s,c)=>s+c.monto,0))}</strong></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ======================================================
// NÓMINA
// ======================================================
function Nomina({ctx}){
  const {empleados,setEmpleados,obras,cargos,setCargos,nominasGeneradas,setNominasGeneradas,saveAllToCloud}=ctx;
  const [tab,setTab]=useState("lista");
  const [mes,setMes]=useState("2026-04");
  const [corteNomina,setCorteNomina]=useState("primera");
  const [selId,setSelId]=useState(null);
  const [showHE,setShowHE]=useState(null);
  const [showIncapacidad,setShowIncapacidad]=useState(null);
  const [incapacidadForm,setIncapacidadForm]=useState(buildIncapacidadFormDefault());
  const [incapacidadPreview,setIncapacidadPreview]=useState(null);
  const nuevoEmpleadoBase = {nombre:"",cedula:"",cargo:"",tel:"",email:"",salario:NOMINA_CO_2026.salarioMinimo,banco:"Bancolombia",tipoCuenta:"Ahorros",numeroCuenta:"",deduccionesPersonalizadas:[],incapacidades:[],prestacionesSociales:[],fechaIngreso:today(),tipoContrato:"indefinido",fechaSalida:"",causaRetiro:"",vacacionesPagadasDias:0,vacacionesLiquidacionDias:null};
  const [nf,setNf]=useState(nuevoEmpleadoBase);
  const [heForm,setHeForm]=useState({obraId:"",tipo:"horaExtra",tipoRecargo:"horaExtraGeneral",horas:0,valorHora:12500,comision:0,concepto:"",fecha:today()});
  const [cargoForm,setCargoForm]=useState({nombre:"",descripcion:""});
  const [dedForm,setDedForm]=useState({nombre:"",valor:0});
  const [prestacionEmpleadoId,setPrestacionEmpleadoId]=useState(null);
  const [prestacionTipo,setPrestacionTipo]=useState("prima");
  const [prestacionSemestre,setPrestacionSemestre]=useState("1");
  const [prestacionAnio,setPrestacionAnio]=useState(Number(today().slice(0,4)));
  const [editEmpId,setEditEmpId]=useState(null);
  const [editEmpData,setEditEmpData]=useState(null);
  const [liquidarId,setLiquidarId]=useState(null);
  const [diasVacPagar,setDiasVacPagar]=useState({});
  const [vacacionesId,setVacacionesId]=useState(null);
  const [diasVacLiquidar,setDiasVacLiquidar]=useState({});
  const [guardandoNomina,setGuardandoNomina]=useState(false);
  const [mensajeGuardadoNomina,setMensajeGuardadoNomina]=useState("");
  const nominasGeneradasMap = (Array.isArray(nominasGeneradas) ? nominasGeneradas : [])
    .map(normalizeNominaGeneratedRecord)
    .reduce((acc,item)=>{
      acc[item.id]=item;
      return acc;
    }, {});

  const empleadosBase = empleados.map(normalizarEmpleado);
  const periodoNomina = buildNominaPeriodo(mes, corteNomina);
  const activos=empleadosBase.filter((empleado)=>empleado.activo);
  const resumenesActivos = activos.map((empleado)=>({ empleado, resumen:calcularResumenNominaEmpleado(empleado, periodoNomina) }));
  const resumenesPlanilla = empleadosBase
    .map((empleado)=>{
      const resumen = calcularResumenNominaEmpleado(empleado, periodoNomina);
      const liquidacion = calcularLiquidacionRetiro(empleado, periodoNomina, diasVacPagar[empleado.id]);
      const tieneMovimiento = resumen.diasNomina>0 || resumen.incapacidadTotal>0 || resumen.horasExtras>0 || resumen.comisiones>0 || liquidacion.retiroEnPeriodo;
      if(!tieneMovimiento) return null;
      const liquidacionPrestaciones = liquidacion.retiroEnPeriodo ? liquidacion.prestaciones : 0;
      const totalPagar = resumen.neto + liquidacionPrestaciones;
      if(totalPagar<=0) return null;
      return {
        empleado,
        resumen,
        liquidacionPrestaciones,
        totalPagar,
        retiroEnPeriodo: liquidacion.retiroEnPeriodo,
        fechaSalida: empleado.fechaSalida || null,
      };
    })
    .filter(Boolean);
  const totSal=resumenesActivos.reduce((total,item)=>total+item.resumen.salario,0);
  const totalAuxilio=resumenesActivos.reduce((total,item)=>total+item.resumen.auxilioTransporte,0);
  const totalSalud=resumenesActivos.reduce((total,item)=>total+item.resumen.salud,0);
  const totalPension=resumenesActivos.reduce((total,item)=>total+item.resumen.pension,0);
  const totalOtrasDeducciones=resumenesActivos.reduce((total,item)=>total+item.resumen.otrasDeducciones,0);
  const totalDeducciones=resumenesActivos.reduce((total,item)=>total+item.resumen.totalDeducciones,0);
  const totalNeto=resumenesActivos.reduce((total,item)=>total+item.resumen.neto,0);
  const totalDevengado=resumenesActivos.reduce((total,item)=>total+item.resumen.totalDevengado,0);
  const totalNominaPlanilla=resumenesPlanilla.reduce((total,item)=>total+item.resumen.neto,0);
  const totalLiquidacionesPlanilla=resumenesPlanilla.reduce((total,item)=>total+item.liquidacionPrestaciones,0);
  const totalPagarPlanilla=resumenesPlanilla.reduce((total,item)=>total+item.totalPagar,0);
  const nominaPreview = buildNominaSnapshot(empleadosBase, periodoNomina, diasVacPagar);
  const nominaGeneradaActual = nominasGeneradasMap[nominaPreview.id] || null;
  const nominaVistaActual = nominaGeneradaActual?.snapshot || nominaPreview;
  const nominaEstaGenerada = Boolean(nominaGeneradaActual);
  const empleadoDeduccionActivo =
    empleadosBase.find((empleado)=>empleado.id===selId) ||
    activos[0] ||
    null;
  const empleadoIncapacidadActivo =
    empleadosBase.find((empleado)=>empleado.id===showIncapacidad) ||
    activos[0] ||
    null;
  const empleadoPrestacionActivo =
    empleadosBase.find((empleado)=>empleado.id===prestacionEmpleadoId) ||
    activos[0] ||
    null;
  const prestacionPreview = empleadoPrestacionActivo
    ? calcularPrestacionSocialEmpleado(
        empleadoPrestacionActivo,
        prestacionTipo,
        prestacionAnio,
        prestacionSemestre
      )
    : null;
  const historialPrestacionesEmpleado = normalizarPrestacionesSociales(empleadoPrestacionActivo?.prestacionesSociales)
    .sort((a,b)=>String(b.fechaCausacion || b.periodoFin || "").localeCompare(String(a.fechaCausacion || a.periodoFin || "")));
  const resumenIncapacidadActivo =
    empleadoIncapacidadActivo
      ? calcularResumenIncapacidadesRegistros(empleadoIncapacidadActivo, empleadoIncapacidadActivo.incapacidades || [], periodoNomina)
      : null;
  const cargosDisponibles=[...new Set([
    ...normalizarCargos(cargos).filter((cargo)=>cargo.activo).map((cargo)=>cargo.nombre),
    ...empleadosBase.map((empleado)=>empleado.cargo).filter(Boolean),
  ])].sort((a,b)=>a.localeCompare(b,"es"));

  useEffect(()=>{
    if(typeof window==="undefined") return;
    try{
      window.localStorage.setItem(NOMINA_GENERATED_STORAGE_KEY, JSON.stringify(nominasGeneradas));
    }catch{}
  }, [nominasGeneradas]);

  useEffect(()=>{
    if(!empleadoIncapacidadActivo) return;
    setIncapacidadForm((prev)=>{
      if(prev.empleadoId===empleadoIncapacidadActivo.id) return prev;
      return {
        ...buildIncapacidadFormDefault(empleadoIncapacidadActivo.id, periodoNomina.startIso || today()),
        iblMensual:empleadoIncapacidadActivo.salario || "",
      };
    });
    setIncapacidadPreview(null);
  }, [empleadoIncapacidadActivo?.id, periodoNomina.startIso]);

  const actualizarEmpleado=(id,updater)=>{
    setEmpleados((prev)=>
      prev.map((empleado)=>{
        const actual=normalizarEmpleado(empleado);
        if(actual.id!==id) return actual;
        const siguiente=typeof updater==="function" ? updater(actual) : { ...actual, ...updater };
        return normalizarEmpleado(siguiente);
      })
    );
  };

  const updEmp=(id,field,val)=>actualizarEmpleado(id,{ [field]:val });
  const construirEmpleadosActualizados = (id, updater)=>
    empleadosBase.map((empleado)=>{
      if(empleado.id!==id) return empleado;
      const siguiente = typeof updater==="function" ? updater(empleado) : { ...empleado, ...updater };
      return normalizarEmpleado(siguiente);
    });

  const guardarNuevoEmp=()=>{
    const nombre=nf.nombre.trim();
    const cargo=nf.cargo.trim();
    if(!nombre||!cargo)return;
    const nextNumber=empleadosBase.reduce((maximo,empleado)=>{
      const match=String(empleado.id||"").match(/^E(\d+)$/);
      return match ? Math.max(maximo,Number(match[1])) : maximo;
    },0)+1;
    const id="E" + (String(nextNumber).padStart(2,"0"));
    const av=nombre.split(" ").map((word)=>word[0]).slice(0,2).join("").toUpperCase()||"EM";
    setEmpleados((prev)=>[
      ...prev,
      normalizarEmpleado({
        ...nf,
        nombre,
        cargo,
        cedula:nf.cedula.trim(),
        id,
        activo:true,
        avatar:av,
        horasExtrasPorObra:[],
        comisionesPorObra:[],
      }),
    ]);
    setNf(nuevoEmpleadoBase);
    setTab("lista");
  };

  const guardarCargo=()=>{
    const nombre=cargoForm.nombre.trim();
    if(!nombre)return;
    const yaExiste=cargosDisponibles.find((cargo)=>cargo.toLowerCase()===nombre.toLowerCase());
    if(yaExiste){
      setNf((prev)=>({ ...prev, cargo:yaExiste }));
      setCargoForm({nombre:"",descripcion:""});
      return;
    }
    const nuevoCargo={
      id:"CAR-" + (Date.now()),
      nombre,
      descripcion:cargoForm.descripcion.trim(),
      activo:true,
    };
    setCargos((prev)=>[...normalizarCargos(prev),nuevoCargo]);
    setNf((prev)=>({ ...prev, cargo:nombre }));
    setCargoForm({nombre:"",descripcion:""});
  };

  const agregarHE=()=>{
    const empleadoObjetivo = showHE || activos[0]?.id;
    if(!empleadoObjetivo||!heForm.obraId)return;
    actualizarEmpleado(empleadoObjetivo,(empleado)=>{
      if(heForm.tipo==="horaExtra"){
        const vHora=calcularValorHoraRecargo(empleado, heForm.tipoRecargo, heForm.fecha, heForm.valorHora);
        const total= Math.round((Number(heForm.horas)||0)*vHora);
        const nuevo={id:Date.now(),obraId:heForm.obraId,tipoRecargo:heForm.tipoRecargo,horas:heForm.horas,valorHora:vHora,total,fecha:heForm.fecha,concepto:heForm.concepto};
        return { ...empleado, horasExtrasPorObra:[...(empleado.horasExtrasPorObra||[]),nuevo] };
      }
      const nuevo={id:Date.now(),obraId:heForm.obraId,comision:heForm.comision,fecha:heForm.fecha,concepto:heForm.concepto};
      return { ...empleado, comisionesPorObra:[...(empleado.comisionesPorObra||[]),nuevo] };
    });
    setHeForm({obraId:"",tipo:"horaExtra",tipoRecargo:"horaExtraGeneral",horas:0,valorHora:12500,comision:0,concepto:"",fecha:today()});
  };

  const agregarDeduccion=(empleadoId=selId)=>{
    const nombre=dedForm.nombre.trim();
    const valor=Math.round(Number(dedForm.valor)||0);
    if(!empleadoId||!nombre||valor<=0)return;
    actualizarEmpleado(empleadoId,(empleado)=>({
      ...empleado,
      deduccionesPersonalizadas:[
        ...(empleado.deduccionesPersonalizadas||[]),
        { id:"DED-" + (Date.now()), nombre, valor },
      ],
    }));
    setDedForm({nombre:"",valor:0});
  };

  const quitarDeduccion=(empleadoId,deduccionId)=>{
    actualizarEmpleado(empleadoId,(empleado)=>({
      ...empleado,
      deduccionesPersonalizadas:(empleado.deduccionesPersonalizadas||[]).filter((deduccion)=>deduccion.id!==deduccionId),
    }));
  };

  const buildIncapacidadRecordFromForm = (empleado)=>
    normalizarIncapacidades([{
      id:"INC-" + Date.now(),
      ...incapacidadForm,
      empleadoId:empleado?.id || incapacidadForm.empleadoId,
      iblMensual:Math.max(0, Number(incapacidadForm.iblMensual || empleado?.salario || 0)),
    }])[0];

  const calcularPreviewIncapacidad = ()=>{
    if(!empleadoIncapacidadActivo){
      setMensajeGuardadoNomina("Selecciona un empleado para calcular la incapacidad.");
      setTimeout(()=>setMensajeGuardadoNomina(""), 2500);
      return;
    }
    const registro = buildIncapacidadRecordFromForm(empleadoIncapacidadActivo);
    if(!registro?.fechaInicio || !registro?.fechaFin){
      setMensajeGuardadoNomina("Completa fecha inicial y fecha final de la incapacidad.");
      setTimeout(()=>setMensajeGuardadoNomina(""), 2500);
      return;
    }
    const fechaInicio = parseIsoDate(registro.fechaInicio);
    const fechaFin = parseIsoDate(registro.fechaFin);
    if(!fechaInicio || !fechaFin || fechaFin<fechaInicio){
      setMensajeGuardadoNomina("La fecha final no puede ser menor que la fecha inicial.");
      setTimeout(()=>setMensajeGuardadoNomina(""), 2500);
      return;
    }
    const resumen = calcularResumenIncapacidadesRegistros(empleadoIncapacidadActivo, [registro], periodoNomina);
    const nominaConPreview = calcularResumenNominaEmpleado({
      ...empleadoIncapacidadActivo,
      incapacidades:[...(empleadoIncapacidadActivo.incapacidades||[]), registro],
    }, periodoNomina);
    setIncapacidadPreview({ registro, resumen, nominaConPreview });
  };

  const guardarIncapacidad = async ()=>{
    if(!empleadoIncapacidadActivo){
      setMensajeGuardadoNomina("Selecciona un empleado para guardar la incapacidad.");
      setTimeout(()=>setMensajeGuardadoNomina(""), 2500);
      return;
    }
    const registro = incapacidadPreview?.registro || buildIncapacidadRecordFromForm(empleadoIncapacidadActivo);
    if(!registro?.fechaInicio || !registro?.fechaFin){
      setMensajeGuardadoNomina("Primero calcula la incapacidad con fechas válidas.");
      setTimeout(()=>setMensajeGuardadoNomina(""), 2500);
      return;
    }
    const nextEmployees = construirEmpleadosActualizados(empleadoIncapacidadActivo.id, (empleado)=>({
      ...empleado,
      incapacidades:[...(empleado.incapacidades||[]), registro],
    }));
    setEmpleados(nextEmployees);
    setIncapacidadForm({
      ...buildIncapacidadFormDefault(empleadoIncapacidadActivo.id, periodoNomina.startIso || today()),
      iblMensual:empleadoIncapacidadActivo.salario || "",
    });
    setIncapacidadPreview(null);
    await guardarCambiosNomina("Incapacidad guardada y aplicada al corte de nómina.", { empleados: nextEmployees });
  };

  const quitarIncapacidad = async (empleadoId, incapacidadId)=>{
    const nextEmployees = construirEmpleadosActualizados(empleadoId, (empleado)=>({
      ...empleado,
      incapacidades:(empleado.incapacidades||[]).filter((incapacidad)=>incapacidad.id!==incapacidadId),
    }));
    setEmpleados(nextEmployees);
    if(incapacidadPreview?.registro?.id===incapacidadId){
      setIncapacidadPreview(null);
    }
    await guardarCambiosNomina("Incapacidad retirada del empleado y del corte.", { empleados: nextEmployees });
  };

  const guardarCambiosNomina=async(mensajeExito="Cambios guardados en la nube", override=null)=>{
    if(typeof saveAllToCloud!=="function"){
      setMensajeGuardadoNomina("No hay sincronización cloud disponible en esta sesión.");
      return;
    }
    setGuardandoNomina(true);
    const result = await saveAllToCloud(override);
    if(result?.ok===false){
      setMensajeGuardadoNomina("No se pudo guardar: " + (result.error?.message||"revisa la conexión con Supabase"));
    }else{
      setMensajeGuardadoNomina(mensajeExito);
    }
    setGuardandoNomina(false);
    setTimeout(()=>setMensajeGuardadoNomina(""), 3500);
  };

  const sincronizarLiquidacionPrestacionalEmpleado = (empleado)=>{
    const liquidacion = calcularLiquidacionRetiro(empleado, periodoNomina, diasVacPagar[empleado.id]);
    const recordId = `LQ-${empleado?.id || "EMP"}-${empleado?.fechaSalida || today()}`;
    const vigente = normalizarPrestacionesSociales(empleado?.prestacionesSociales).find((prestacion)=>prestacion.id===recordId);
    const baseRecord = buildLiquidacionPrestacionRecord(empleado, liquidacion);
    const record = {
      ...baseRecord,
      estado: liquidacion.retiroEnPeriodo ? "en_nomina" : (vigente?.estado || baseRecord.estado),
      fechaPago: liquidacion.retiroEnPeriodo ? "" : (vigente?.fechaPago || ""),
      observacion: vigente?.observacion || baseRecord.observacion,
      liquidacionEnNomina: Boolean(liquidacion.retiroEnPeriodo),
    };
    return normalizarEmpleado({
      ...empleado,
      vacacionesLiquidacionDias: liquidacion.diasVacPagar,
      prestacionesSociales: liquidacion.prestaciones>0
        ? upsertPrestacionSocial(empleado?.prestacionesSociales, record)
        : normalizarPrestacionesSociales(empleado?.prestacionesSociales),
    });
  };

  const guardarPrestacionSocial = async ()=>{
    if(!empleadoPrestacionActivo || !prestacionPreview){
      setMensajeGuardadoNomina("Selecciona un empleado para provisionar la prestación.");
      setTimeout(()=>setMensajeGuardadoNomina(""), 2500);
      return;
    }
    if((prestacionPreview?.valor || 0)<=0){
      setMensajeGuardadoNomina("La prestación calculada es cero para ese periodo.");
      setTimeout(()=>setMensajeGuardadoNomina(""), 2500);
      return;
    }
    const vigente = historialPrestacionesEmpleado.find((prestacion)=>prestacion.id===prestacionPreview.id);
    const registro = {
      ...prestacionPreview,
      estado: vigente?.estado || "provisionada",
      fechaPago: vigente?.fechaPago || "",
      observacion: vigente?.observacion || prestacionPreview.observacion || "",
    };
    const nextEmployees = construirEmpleadosActualizados(empleadoPrestacionActivo.id, (empleado)=>({
      ...empleado,
      prestacionesSociales: upsertPrestacionSocial(empleado?.prestacionesSociales, registro),
    }));
    setEmpleados(nextEmployees);
    await guardarCambiosNomina(
      `${PRESTACION_TIPOS_LABELS[prestacionTipo]} provisionada para ${empleadoPrestacionActivo.nombre}.`,
      { empleados: nextEmployees }
    );
  };

  const actualizarEstadoPrestacionSocial = async (empleado, prestacion, estadoSiguiente)=>{
    if(!empleado || !prestacion) return;
    const nextEmployees = construirEmpleadosActualizados(empleado.id, (actual)=>({
      ...actual,
      prestacionesSociales: normalizarPrestacionesSociales(actual?.prestacionesSociales).map((item)=>item.id===prestacion.id ? {
        ...item,
        estado:estadoSiguiente,
        fechaPago:today(),
        liquidacionEnNomina:false,
      } : item),
    }));
    setEmpleados(nextEmployees);
    await guardarCambiosNomina(
      `${PRESTACION_TIPOS_LABELS[prestacion.tipo]} ${estadoSiguiente==="consignada" ? "consignada" : "pagada"} y enviada a contabilidad.`,
      { empleados: nextEmployees }
    );
  };

  const quitarPrestacionSocial = async (empleado, prestacionId)=>{
    if(!empleado || !prestacionId) return;
    const nextEmployees = construirEmpleadosActualizados(empleado.id, (actual)=>({
      ...actual,
      prestacionesSociales: normalizarPrestacionesSociales(actual?.prestacionesSociales).filter((item)=>item.id!==prestacionId),
    }));
    setEmpleados(nextEmployees);
    await guardarCambiosNomina("Prestación eliminada del empleado.", { empleados: nextEmployees });
  };

  const registrarVacacionesPagadas = async (empleado)=>{
    const vacaciones = calcularVacacionesPendientes(empleado, periodoNomina.endIso);
    const diasSolicitados = round1(Number(diasVacLiquidar[empleado.id] ?? Math.max(0, Math.min(vacaciones.dias, 15))) || 0);
    const diasAplicados = round1(Math.min(vacaciones.dias, Math.max(0, diasSolicitados)));
    if(diasAplicados<=0){
      setMensajeGuardadoNomina("Ingresa días de vacaciones válidos para registrar.");
      setTimeout(()=>setMensajeGuardadoNomina(""), 2500);
      return;
    }
    const nextEmployees = construirEmpleadosActualizados(empleado.id, (actual)=>({
      ...actual,
      vacacionesPagadasDias: round1((actual.vacacionesPagadasDias||0) + diasAplicados),
    }));
    const saldoRestante = round1(Math.max(0, vacaciones.dias - diasAplicados));
    setEmpleados(nextEmployees);
    setDiasVacLiquidar((prev)=>({
      ...prev,
      [empleado.id]: saldoRestante>0 ? Math.min(15, saldoRestante) : 0,
    }));
    await guardarCambiosNomina(
      "Vacaciones guardadas. Saldo pendiente: " + (saldoRestante) + " días.",
      { empleados: nextEmployees }
    );
  };

  const guardarLiquidacionRetiro = async (empleado)=>{
    const liquidacion = calcularLiquidacionRetiro(empleado, periodoNomina, diasVacPagar[empleado.id]);
    const nextEmployees = construirEmpleadosActualizados(empleado.id, (actual)=>sincronizarLiquidacionPrestacionalEmpleado(actual));
    setEmpleados(nextEmployees);
    setDiasVacPagar((prev)=>({ ...prev, [empleado.id]: liquidacion.diasVacPagar }));
    await guardarCambiosNomina("Liquidación de retiro sincronizada y enviada a contabilidad.", { empleados: nextEmployees });
  };

  const generarNominaCorte = ()=>{
    const empleadosSincronizados = empleadosBase.map((empleado)=>
      empleado?.fechaSalida ? sincronizarLiquidacionPrestacionalEmpleado(empleado) : empleado
    );
    const snapshot = buildNominaSnapshot(empleadosSincronizados, periodoNomina, diasVacPagar);
    const record = buildNominaGeneratedRecord(snapshot);
    setEmpleados(empleadosSincronizados);
    setNominasGeneradas((prev)=>upsertNominaGeneratedRecord(prev, record));
    setMensajeGuardadoNomina(
      "Nómina generada para " + snapshot.periodo.label + " con " + snapshot.totals.totalRegistros + " registros."
    );
    setTimeout(()=>setMensajeGuardadoNomina(""), 3500);
  };

  const descargarPlanoBanco = ()=>{
    const snapshot = nominaEstaGenerada ? nominaVistaActual : buildNominaSnapshot(empleadosBase, periodoNomina, diasVacPagar);
    if(!snapshot.registrosBanco.length){
      setMensajeGuardadoNomina("No hay registros listos para el banco. Revisa cédula y cuenta bancaria de los empleados del corte.");
      setTimeout(()=>setMensajeGuardadoNomina(""), 3500);
      return;
    }
    const contenido = buildNominaPlanoBancoContent(snapshot, NOMINA_PLANO_BANCO_DEFAULTS);
    const record = buildNominaGeneratedRecord(snapshot, contenido);
    setNominasGeneradas((prev)=>upsertNominaGeneratedRecord(prev, record));
    const nombreArchivo = `NOMINA_${snapshot.periodo.mes}_${snapshot.periodo.corte.toUpperCase()}.txt`;
    downloadTextFile(nombreArchivo, contenido);
    setMensajeGuardadoNomina("Plano banco descargado: " + nombreArchivo);
    setTimeout(()=>setMensajeGuardadoNomina(""), 3500);
  };

  const renderNominaMetricCard=({label,value,color="#142840",hint="",span=1})=>(
    <div style={{background:"#fff",borderRadius:8,padding:"10px 12px",gridColumn:span>1?("span " + span):undefined}}>
      <div style={{fontSize:10,color:"#64748b"}}>{label}</div>
      <div style={{fontWeight:700,color,fontSize:span>1?16:15,marginTop:3}}>{value}</div>
      {hint ? <div style={{fontSize:10,color:"#94a3b8",marginTop:4,lineHeight:1.4}}>{hint}</div> : null}
    </div>
  );

  const renderNominaEmpleadoCard=({
    empleado,
    index=0,
    badgeLabel="Empleado",
    badgeBg="#eff6ff",
    badgeColor="#1d4ed8",
    subtitle="",
    principal=null,
    metrics=[],
  })=>{
    if(!empleado) return null;
    return(
      <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <Av init={empleado.avatar} color={PAL[index%PAL.length]} size={34}/>
          <div style={{flex:1}}>
            <div style={{fontWeight:700,color:"#0f172a"}}>{empleado.nombre}</div>
            <div style={{fontSize:11,color:"#64748b"}}>{subtitle}</div>
          </div>
          <span style={{background:badgeBg,color:badgeColor,borderRadius:20,padding:"3px 12px",fontSize:10,fontWeight:700}}>{badgeLabel}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {principal ? renderNominaMetricCard({ ...principal, span:3 }) : null}
          {metrics.map((metric)=>renderNominaMetricCard(metric))}
        </div>
      </div>
    );
  };

  return(
    <div style={{padding:28}}>
      <H1 title="Nómina y Empleados" subtitle="Gestión de empleados, prestaciones, incapacidades, horas extras, comisiones y planilla"
        action={<button style={B("#cc0000")} onClick={()=>setTab("nuevo")}>+ Nuevo Empleado</button>}/>
      <div style={{display:"flex",gap:4,marginBottom:16,flexWrap:"nowrap",overflowX:"auto",paddingBottom:2}}>
        {[["lista","Empleados"],["prestaciones","Prestaciones sociales"],["vacaciones","Vacaciones"],["contratos","Contratos y liquidación"],["he","Horas extras y comisiones"],["incapacidades","Incapacidades"],["deducciones","Revisión deducciones"],["colillas","Colillas de pago"],["planilla","Planilla Bancolombia"]].map(([id,lb])=>(
          <button
            key={id}
            onClick={()=>setTab(id)}
            style={{
              ...B(tab===id?"#f47c20":"#f8fafc",tab===id?"#fff":"#475569"),
              border:"1px solid " + (tab===id?"#f47c20":"#dbe4f0"),
              padding:"7px 12px",
              fontSize:11,
              fontWeight:600,
              borderRadius:10,
              whiteSpace:"nowrap",
              flex:"0 0 auto",
              minHeight:36,
            }}
          >
            {lb}
          </button>
        ))}
      </div>

      <div style={{...CD,maxWidth:900,margin:"0 auto 20px",padding:"14px 16px"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))",gap:12,alignItems:"end"}}>
          <div>
            <LBL>Mes de nómina</LBL>
            <input type="month" value={mes} onChange={e=>setMes(e.target.value)} style={SI}/>
          </div>
          <div>
            <LBL>Corte</LBL>
            <select value={corteNomina} onChange={e=>setCorteNomina(e.target.value)} style={SI}>
              <option value="primera">Primera quincena · 1 al 15</option>
              <option value="segunda">{"Segunda quincena · 16 al " + (periodoNomina.endIso.slice(-2))}</option>
            </select>
          </div>
          <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:10,color:"#94a3b8",textTransform:"uppercase",letterSpacing:0.7}}>Periodo activo</div>
            <div style={{fontSize:13,fontWeight:700,color:"#142840",marginTop:4}}>{periodoNomina.label}</div>
            <div style={{fontSize:10,color:"#64748b",marginTop:4}}>Días del corte: {periodoNomina.diasReferencia}</div>
          </div>
        </div>
      </div>
      {tab==="nuevo"&&(
        <div style={{display:"grid",gap:16,maxWidth:980}}>
          <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#142840",textTransform:"uppercase",letterSpacing:1,marginBottom:16,borderBottom:"1px solid #e2e8f0",paddingBottom:10}}>
              Catálogo de cargos
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1.1fr 1.4fr auto",gap:12,alignItems:"end"}}>
              <div><LBL>Nuevo cargo</LBL><input value={cargoForm.nombre} onChange={(e)=>setCargoForm({...cargoForm,nombre:e.target.value})} placeholder="Ej: Supervisor de cuadrilla" style={SI}/></div>
              <div><LBL>Descripción</LBL><input value={cargoForm.descripcion} onChange={(e)=>setCargoForm({...cargoForm,descripcion:e.target.value})} placeholder="Uso interno o funciones principales" style={SI}/></div>
              <button onClick={guardarCargo} style={{...B("#142840"),justifyContent:"center"}}>Guardar cargo</button>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:14}}>
              {cargosDisponibles.map((cargo)=>(
                <span key={cargo} style={{background:nf.cargo===cargo?"#fef3c7":"#f1f5f9",color:nf.cargo===cargo?"#92400e":"#334155",border:"1px solid " + (nf.cargo===cargo?"#f59e0b":"#cbd5e1"),borderRadius:999,padding:"6px 10px",fontSize:11,fontWeight:600,cursor:"pointer"}} onClick={()=>setNf({...nf,cargo:cargo})}>
                  {cargo}
                </span>
              ))}
            </div>
          </div>

          <div style={{background:"#ffffff",border:"1px solid #e2e8f0",borderRadius:12,padding:24,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#cc0000",textTransform:"uppercase",letterSpacing:1,marginBottom:18,borderBottom:"2px solid #cc000022",paddingBottom:10}}>
              👤 Datos del Nuevo Empleado
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:16}}>
              <div><LBL>Nombre completo *</LBL><input value={nf.nombre} onChange={e=>setNf({...nf,nombre:e.target.value})} placeholder="Ej: Carlos Andres Rios" style={SI}/></div>
              <div><LBL>Cédula o identificación</LBL><input value={nf.cedula} onChange={e=>setNf({...nf,cedula:e.target.value})} placeholder="Ej: 1032456781" style={SI}/></div>
              <div><LBL>Cargo *</LBL>
                <select value={nf.cargo} onChange={e=>setNf({...nf,cargo:e.target.value})} style={SI}>
                  <option value="">Seleccionar cargo...</option>
                  {cargosDisponibles.map((cargo)=><option key={cargo} value={cargo}>{cargo}</option>)}
                </select>
              </div>
              <div><LBL>Teléfono</LBL><input value={nf.tel} onChange={e=>setNf({...nf,tel:e.target.value})} placeholder="3001234567" style={SI}/></div>
              <div><LBL>Email</LBL><input value={nf.email} onChange={e=>setNf({...nf,email:e.target.value})} placeholder="correo@ingeanclajes.com" style={SI}/></div>
              <div><LBL>Salario base ($)</LBL><input type="number" value={nf.salario} onChange={e=>setNf({...nf,salario:parseFloat(e.target.value)||0})} style={SI}/></div>
              <div><LBL>Tipo de contrato</LBL>
                <select value={nf.tipoContrato||"indefinido"} onChange={e=>setNf({...nf,tipoContrato:e.target.value})} style={SI}>
                  {["indefinido","fijo","obra_labor","prestacion_servicios"].map((t)=><option key={t} value={t}>{TIPOS_CONTRATO_LABELS[t]}</option>)}
                </select>
              </div>
              <div><LBL>Fecha de ingreso</LBL><input type="date" value={nf.fechaIngreso||""} onChange={e=>setNf({...nf,fechaIngreso:e.target.value})} style={SI}/></div>
              <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px",fontSize:12,color:"#475569",display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>💵</span>
                <div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>Salario ingresado</div>
                  <div style={{fontWeight:700,color:"#4ade80",fontSize:14}}>{fmt(nf.salario)}</div>
                  <div style={{fontSize:10,color:"#64748b",marginTop:2}}>
                    {nf.salario<=NOMINA_CO_2026.topeAuxilio ? "Aplica auxilio 2026: " + (fmt(NOMINA_CO_2026.auxilioTransporte)) : "No aplica auxilio de transporte"}
                  </div>
                </div>
              </div>
            </div>
            <div style={{background:"#f8fafc",borderRadius:10,padding:16,marginBottom:16,border:"1px solid #e2e8f0"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#475569",textTransform:"uppercase",marginBottom:12,letterSpacing:0.5}}>🏦 Datos Bancarios</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
                <div><LBL>Banco</LBL>
                  <select value={nf.banco} onChange={e=>setNf({...nf,banco:e.target.value})} style={SI}>
                    {["Bancolombia","Davivienda","Banco Bogotá","BBVA","Nequi","Daviplata","Banco Caja Social","Banco Popular","Scotiabank","AV Villas"].map((banco)=><option key={banco}>{banco}</option>)}
                  </select>
                </div>
                <div><LBL>Tipo de cuenta</LBL>
                  <select value={nf.tipoCuenta} onChange={e=>setNf({...nf,tipoCuenta:e.target.value})} style={SI}>
                    {["Ahorros","Corriente"].map((tipo)=><option key={tipo}>{tipo}</option>)}
                  </select>
                </div>
                <div><LBL>Número de cuenta</LBL><input value={nf.numeroCuenta} onChange={e=>setNf({...nf,numeroCuenta:e.target.value})} placeholder="204-123456-78" style={SI}/></div>
              </div>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={guardarNuevoEmp} style={B("#cc0000")}>✅ Guardar Empleado</button>
              <button onClick={()=>setTab("lista")} style={B("#f1f5f9","#475569")}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
      {tab==="lista"&&(
        <div>
          <div style={CD}>
            <div style={ST}>Empleados ({activos.length})</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              {empleadosBase.map((e,idx)=>{
                const resumen=calcularResumenNominaEmpleado(e, periodoNomina);
                return(
                <div key={e.id} style={{background:"#f1f5f9",borderRadius:10,padding:"14px 16px",border:selId===e.id?"1px solid #cc0000":"1px solid #e2e8f0",cursor:"pointer"}} onClick={()=>setSelId(selId===e.id?null:e.id)}>
                  <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
                    <Av init={e.avatar} color={PAL[idx%PAL.length]} size={38}/>
                    <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{e.nombre}</div><div style={{fontSize:11,color:"#475569"}}>{e.cargo}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:700,color:"#4ade80"}}>{fmt(e.salario)}</div></div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:11,color:"#64748b",marginBottom:6}}>
                    <div>🪪 {e.cedula||"Sin documento"}</div>
                    <div>📱 {e.tel||"Sin teléfono"}</div>
                    <div style={{gridColumn:"span 2",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>✉️ {e.email||"Sin email"}</div>
                  </div>
                  {(()=>{
                    const pf=calcularParafiscales(e, e.fechaSalida||periodoNomina.endIso);
                    const vacacionesPendientes = calcularVacacionesPendientes(e, e.fechaSalida||periodoNomina.endIso);
                    return pf.diasTrabajados>0 ? (
                      <div style={{background:"#f0fdf4",borderRadius:6,padding:"7px 10px",fontSize:11,marginBottom:6,display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
                        <div><span style={{color:"#64748b"}}>📅 Ingreso: </span><strong>{e.fechaIngreso||"N/A"}</strong></div>
                        <div><span style={{color:"#64748b"}}>Contrato: </span><strong>{TIPOS_CONTRATO_LABELS[e.tipoContrato]||e.tipoContrato||"Sin definir"}</strong></div>
                        <div><span style={{color:"#64748b"}}>✈️ Vacac.: </span><strong style={{color:"#166534"}}>{vacacionesPendientes.dias}d</strong></div>
                        <div><span style={{color:"#64748b"}}>Días corte: </span><strong style={{color:"#2563eb"}}>{resumen.diasNomina}</strong></div>
                      </div>
                    ) : null;
                  })()}
                  <div style={{background:"#f8fafc",borderRadius:6,padding:"7px 10px",fontSize:11,marginBottom:6}}>
                    <div style={{color:"#64748b",marginBottom:2}}>🏦 Datos bancarios</div>
                    <div style={{color:"#1a1a2e"}}>{e.banco||"-"} · {e.tipoCuenta||"-"}</div>
                    <div style={{color:"#475569",fontFamily:"monospace"}}>{e.numeroCuenta||"-"}</div>
                  </div>
                  {selId===e.id&&(
                    <div style={{marginTop:10,borderTop:"1px solid rgba(255,255,255,0.2)",paddingTop:10}} onClick={(event)=>event.stopPropagation()}>
                      <div style={{fontSize:10,color:"#cc0000",fontWeight:600,textTransform:"uppercase",marginBottom:8}}>Datos del empleado</div>
                      {editEmpId!==e.id&&<button onClick={()=>{setEditEmpId(e.id);setEditEmpData({...e});}} style={{...B("#1a3050","#60b4ff"),fontSize:11,width:"100%",justifyContent:"center",marginBottom:10}}>✏️ Editar datos del empleado</button>}
                      {editEmpId===e.id&&editEmpData&&(
                        <div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                            <div><LBL>Cédula</LBL><input value={editEmpData.cedula||""} onChange={ev=>setEditEmpData(p=>({...p,cedula:ev.target.value}))} style={{...SI,fontSize:11}}/></div>
                            <div><LBL>Cargo</LBL><select value={editEmpData.cargo||""} onChange={ev=>setEditEmpData(p=>({...p,cargo:ev.target.value}))} style={{...SI,fontSize:11,padding:"5px 8px"}}><option value="">Seleccionar...</option>{cargosDisponibles.map(cargo=><option key={cargo} value={cargo}>{cargo}</option>)}</select></div>
                            <div><LBL>Salario base</LBL><input type="number" value={editEmpData.salario} onChange={ev=>setEditEmpData(p=>({...p,salario:parseFloat(ev.target.value)||0}))} style={{...SI,fontSize:11}}/></div>
                            <div><LBL>Tipo contrato</LBL><select value={editEmpData.tipoContrato||"indefinido"} onChange={ev=>setEditEmpData(p=>({...p,tipoContrato:ev.target.value}))} style={{...SI,fontSize:11,padding:"5px 8px"}}>{Object.entries(TIPOS_CONTRATO_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
                            <div><LBL>Fecha de ingreso</LBL><input type="date" value={editEmpData.fechaIngreso||""} onChange={ev=>setEditEmpData(p=>({...p,fechaIngreso:ev.target.value}))} style={{...SI,fontSize:11}}/></div>
                            <div><LBL>Teléfono</LBL><input value={editEmpData.tel||""} onChange={ev=>setEditEmpData(p=>({...p,tel:ev.target.value}))} style={{...SI,fontSize:11}}/></div>
                            <div><LBL>Banco</LBL><select value={editEmpData.banco||""} onChange={ev=>setEditEmpData(p=>({...p,banco:ev.target.value}))} style={{...SI,fontSize:11,padding:"5px 8px"}}>{["Bancolombia","Davivienda","Banco Bogotá","BBVA","Nequi","Daviplata","Banco Caja Social","Banco Popular","Scotiabank","AV Villas"].map(b=><option key={b}>{b}</option>)}</select></div>
                            <div><LBL>Tipo cuenta</LBL><select value={editEmpData.tipoCuenta||"Ahorros"} onChange={ev=>setEditEmpData(p=>({...p,tipoCuenta:ev.target.value}))} style={{...SI,fontSize:11,padding:"5px 8px"}}>{["Ahorros","Corriente"].map(t=><option key={t}>{t}</option>)}</select></div>
                            <div><LBL>Número de cuenta</LBL><input value={editEmpData.numeroCuenta||""} onChange={ev=>setEditEmpData(p=>({...p,numeroCuenta:ev.target.value}))} style={{...SI,fontSize:11}}/></div>
                          </div>
                          <div style={{display:"flex",gap:8,marginBottom:10}}>
                            <button onClick={()=>{actualizarEmpleado(e.id,editEmpData);setEditEmpId(null);setEditEmpData(null);}} style={{...B("#166534","#4ade80"),fontSize:11,flex:1,justifyContent:"center"}}>💾 Guardar cambios</button>
                            <button onClick={()=>{setEditEmpId(null);setEditEmpData(null);}} style={{...B("#fee2e2","#ef4444"),fontSize:11,justifyContent:"center"}}>✕ Cancelar</button>
                          </div>
                        </div>
                      )}
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                        {[["Días laborados",resumen.diasNomina,"#2563eb"],["Días incapacidad",resumen.diasIncapacidad,"#dc2626"],["Salario corte",fmt(resumen.salario),"#4ade80"],["Incapacidad",fmt(resumen.incapacidadTotal),"#166534"],["Aux. transp.",fmt(resumen.auxilioTransporte),"#60b4ff"],["H. extras",fmt(resumen.horasExtras),"#f5c842"],["Comisiones",fmt(resumen.comisiones),"#c084fc"],["Salud 4%",fmt(resumen.salud),"#ef4444"],["Pensión 4%",fmt(resumen.pension),"#fb7185"],["Neto",fmt(resumen.neto),"#f47c20"]].map(([k,v,c])=>(
                          <div key={k} style={{background:"#ffffff",borderRadius:6,padding:"8px 10px"}}><div style={{fontSize:9,color:"#64748b",marginBottom:2}}>{k}</div><div style={{fontSize:11,fontWeight:700,color:c}}>{v}</div></div>
                        ))}
                      </div>
                      <div style={{background:"#ffffff",borderRadius:8,padding:"10px 12px",marginBottom:10,border:"1px solid #e2e8f0"}}>
                        <div style={{fontSize:10,color:"#142840",fontWeight:700,textTransform:"uppercase",marginBottom:8}}>Deducciones personalizadas</div>
                        {(e.deduccionesPersonalizadas||[]).length>0 ? (
                          <div style={{display:"grid",gap:6,marginBottom:10}}>
                            {(e.deduccionesPersonalizadas||[]).map((deduccion)=>(
                              <div key={deduccion.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:6,padding:"8px 10px",fontSize:11}}>
                                <div><div style={{fontWeight:600,color:"#0f172a"}}>{deduccion.nombre}</div><div style={{color:"#64748b"}}>{fmt(deduccion.valor)} mensual</div></div>
                                <button type="button" onClick={()=>quitarDeduccion(e.id,deduccion.id)} style={{...B("#fee2e2","#b91c1c"),border:"1px solid #fecaca",padding:"6px 10px",fontSize:11}}>Quitar</button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>Sin deducciones adicionales.</div>
                        )}
                        <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr auto",gap:8}}>
                          <div><LBL>Concepto</LBL><input value={dedForm.nombre} onChange={(event)=>setDedForm({...dedForm,nombre:event.target.value})} placeholder="Ej: Natillera" style={{...SI,fontSize:11}}/></div>
                          <div><LBL>Valor mensual</LBL><input type="number" value={dedForm.valor} onChange={(event)=>setDedForm({...dedForm,valor:parseFloat(event.target.value)||0})} placeholder="0" style={{...SI,fontSize:11}}/></div>
                          <button type="button" onClick={agregarDeduccion} style={{...B("#142840"),justifyContent:"center",alignSelf:"end"}}>Agregar</button>
                        </div>
                      </div>
                      <button onClick={()=>{setShowHE(e.id);setTab("he");}} style={{...B("#142840","#f5c842"),border:"1px solid #7a6610",fontSize:11,width:"100%",justifyContent:"center"}}>➕ Agregar horas extras / comisiones</button>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>
        </div>
      )}

      {tab==="prestaciones"&&(
        <div>
          <div style={{...CD,maxWidth:980,margin:"0 auto"}}>
            <div style={ST}>Prestaciones sociales y provisiones</div>
            <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"12px 14px",fontSize:12,color:"#475569",lineHeight:1.7,marginBottom:16}}>
              Prima de servicios: pago máximo el <strong>30 de junio</strong> y dentro de los <strong>primeros veinte días de diciembre</strong>.
              Cesantías: consignación antes del <strong>14 de febrero</strong> del año siguiente.
              Intereses a las cesantías: pago al trabajador a más tardar el <strong>31 de enero</strong> del año siguiente.
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr 1fr",gap:12,marginBottom:16}}>
              <div>
                <LBL>Empleado</LBL>
                <select value={empleadoPrestacionActivo?.id || ""} onChange={(e)=>setPrestacionEmpleadoId(e.target.value || null)} style={SI}>
                  {activos.map((empleado)=><option key={empleado.id} value={empleado.id}>{empleado.nombre} · {empleado.cedula || "Sin cédula"}</option>)}
                </select>
              </div>
              <div>
                <LBL>Prestación</LBL>
                <select value={prestacionTipo} onChange={(e)=>setPrestacionTipo(e.target.value)} style={SI}>
                  <option value="prima">Prima de servicios</option>
                  <option value="cesantias">Cesantías</option>
                  <option value="intereses_cesantias">Intereses a las cesantías</option>
                </select>
              </div>
              <div>
                <LBL>Año de liquidación</LBL>
                <input type="number" min={2020} max={2099} value={prestacionAnio} onChange={(e)=>setPrestacionAnio(Math.max(2020, Math.min(2099, parseInt(e.target.value || "0", 10) || Number(today().slice(0,4)))))} style={SI}/>
              </div>
              <div>
                <LBL>Segmento</LBL>
                <select value={prestacionSemestre} onChange={(e)=>setPrestacionSemestre(e.target.value)} style={SI} disabled={prestacionTipo!=="prima"}>
                  <option value="1">Primer semestre</option>
                  <option value="2">Segundo semestre</option>
                </select>
              </div>
            </div>

            {!empleadoPrestacionActivo ? (
              <div style={{fontSize:12,color:"#94a3b8",textAlign:"center",padding:"18px 0"}}>No hay empleados activos para liquidar prestaciones.</div>
            ) : (
              <>
                {renderNominaEmpleadoCard({
                  empleado:empleadoPrestacionActivo,
                  badgeLabel:"Prestaciones",
                  badgeBg:"#eff6ff",
                  badgeColor:"#1d4ed8",
                  subtitle:(empleadoPrestacionActivo.cargo||"Sin cargo") + " · " + (empleadoPrestacionActivo.cedula||"Sin cédula") + " · Ingreso " + (empleadoPrestacionActivo.fechaIngreso||"sin fecha"),
                  principal:{
                    label:prestacionPreview?.periodoLabel || "Prestación",
                    value:fmt(prestacionPreview?.valor || 0),
                    color:"#166534",
                    hint:prestacionPreview ? ("Base: " + fmt(prestacionPreview.basePrestacional || 0) + " · Días liquidados: " + (prestacionPreview.diasLiquidados || 0)) : "",
                  },
                  metrics:[
                    {label:"Fecha causación", value:prestacionPreview?.fechaCausacion ? fmtD(prestacionPreview.fechaCausacion) : "—", color:"#142840"},
                    {label:"Fecha límite", value:prestacionPreview?.fechaLimite ? fmtD(prestacionPreview.fechaLimite) : "—", color:"#b45309"},
                    {label:"Estado sugerido", value:PRESTACION_ESTADOS_LABELS[prestacionPreview?.estado || "provisionada"], color:"#2563eb"},
                  ],
                })}

                <div style={{height:14}}/>

                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:"14px 16px",marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginBottom:10}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:"#166534",textTransform:"uppercase",letterSpacing:0.7}}>Provisión prestacional</div>
                      <div style={{fontSize:12,color:"#475569",marginTop:4}}>
                        La provisión contable viaja con la cédula del empleado como tercero y luego podrás pagarla o consignarla desde este mismo módulo.
                      </div>
                    </div>
                    <button onClick={guardarPrestacionSocial} style={{...B("#166534","#d1fae5"),fontSize:11,justifyContent:"center"}}>Provisionar prestación</button>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                    <div style={{background:"#fff",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Tipo</div><div style={{fontWeight:700,color:"#0f172a",marginTop:4}}>{PRESTACION_TIPOS_LABELS[prestacionTipo]}</div></div>
                    <div style={{background:"#fff",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Periodo</div><div style={{fontWeight:700,color:"#0f172a",marginTop:4}}>{prestacionPreview?.periodoLabel || "—"}</div></div>
                    <div style={{background:"#fff",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Días trabajados</div><div style={{fontWeight:700,color:"#0f172a",marginTop:4}}>{prestacionPreview?.diasLiquidados || 0}</div></div>
                    <div style={{background:"#fff",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Valor provisionado</div><div style={{fontWeight:700,color:(prestacionPreview?.valor || 0)>0?"#166534":"#94a3b8",marginTop:4}}>{fmt(prestacionPreview?.valor || 0)}</div></div>
                  </div>
                </div>

                <div style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:"#142840",textTransform:"uppercase",letterSpacing:0.7}}>Historial prestacional</div>
                      <div style={{fontSize:12,color:"#64748b",marginTop:4}}>Consulta, paga o consigna prestaciones del empleado seleccionado.</div>
                    </div>
                    <div style={{fontSize:12,color:"#64748b"}}>{historialPrestacionesEmpleado.length} registro(s)</div>
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:920}}>
                      <thead>
                        <tr style={{background:"#f8fafc"}}>
                          {["Concepto","Periodo","Valor","Causación","Pago","Estado","Acciones"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:label==="Valor"?"right":"left",color:"#64748b",fontWeight:600,fontSize:11}}>{label}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {historialPrestacionesEmpleado.length===0 ? (
                          <tr><td colSpan={7} style={{padding:18,textAlign:"center",color:"#94a3b8"}}>Aún no hay prestaciones registradas para este empleado.</td></tr>
                        ) : historialPrestacionesEmpleado.map((prestacion)=>(
                          <tr key={prestacion.id} style={{borderBottom:"1px solid #e2e8f0"}}>
                            <td style={{padding:"9px 10px"}}>
                              <div style={{fontWeight:700,color:"#0f172a"}}>{PRESTACION_TIPOS_LABELS[prestacion.tipo]}</div>
                              <div style={{fontSize:10,color:"#64748b",marginTop:3}}>{prestacion.observacion || "Registro contable por tercero"}</div>
                            </td>
                            <td style={{padding:"9px 10px"}}>{prestacion.periodoLabel || "—"}</td>
                            <td style={{padding:"9px 10px",textAlign:"right",fontWeight:700,color:"#166534"}}>{fmt(prestacion.valor || 0)}</td>
                            <td style={{padding:"9px 10px"}}>{prestacion.fechaCausacion ? fmtD(prestacion.fechaCausacion) : "—"}</td>
                            <td style={{padding:"9px 10px"}}>{prestacion.fechaPago ? fmtD(prestacion.fechaPago) : "Pendiente"}</td>
                            <td style={{padding:"9px 10px"}}>
                              <span style={{background:prestacion.estado==="pagada"||prestacion.estado==="consignada"?"#dcfce7":prestacion.estado==="en_nomina"?"#dbeafe":"#fef3c7",color:prestacion.estado==="pagada"||prestacion.estado==="consignada"?"#166534":prestacion.estado==="en_nomina"?"#1d4ed8":"#92400e",borderRadius:999,padding:"4px 10px",fontSize:10,fontWeight:700}}>
                                {PRESTACION_ESTADOS_LABELS[prestacion.estado] || prestacion.estado}
                              </span>
                            </td>
                            <td style={{padding:"9px 10px"}}>
                              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                {prestacion.estado!=="pagada" && prestacion.estado!=="consignada" && !prestacion.liquidacionEnNomina && (
                                  <button onClick={()=>actualizarEstadoPrestacionSocial(empleadoPrestacionActivo, prestacion, prestacion.tipo==="cesantias" ? "consignada" : "pagada")} style={{...B("#166534","#d1fae5"),fontSize:10,padding:"6px 10px"}}>
                                    {prestacion.tipo==="cesantias" ? "Consignar" : "Marcar pagada"}
                                  </button>
                                )}
                                {prestacion.liquidacionEnNomina && (
                                  <span style={{fontSize:10,color:"#1d4ed8",fontWeight:700,alignSelf:"center"}}>Se paga en nómina</span>
                                )}
                                <button onClick={()=>quitarPrestacionSocial(empleadoPrestacionActivo, prestacion.id)} style={{...B("#fee2e2","#b91c1c"),fontSize:10,padding:"6px 10px"}}>Eliminar</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tab==="vacaciones"&&(()=>{
        const eVac = activos.find(e=>e.id===vacacionesId) || activos[0] || null;
        const vacaciones = eVac ? calcularVacacionesPendientes(eVac, periodoNomina.endIso) : null;
        const diasLiquidar = eVac ? (diasVacLiquidar[eVac.id] ?? Math.max(0, Math.min(vacaciones.dias, 15))) : 0;
        const valorLiquidar = eVac ? Math.round((Number(eVac.salario)||0) * diasLiquidar / 30) : 0;
        const saldoVacaciones = eVac ? round1(Math.max(0, vacaciones.dias - diasLiquidar)) : 0;
        const idxVac = activos.findIndex(e=>e.id===eVac?.id);
        return(
        <div>
          <div style={{...CD,maxWidth:900,margin:"0 auto"}}>
            <div style={ST}>Vacaciones por empleado</div>
            <div style={{marginBottom:14}}>
              <LBL>Empleado</LBL>
              <select value={eVac?.id||""} onChange={ev=>setVacacionesId(ev.target.value||null)} style={SI}>
                {activos.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            {eVac&&(
              <>
                {renderNominaEmpleadoCard({
                  empleado:eVac,
                  index:idxVac,
                  badgeLabel:"Vacaciones",
                  badgeBg:"#ecfdf5",
                  badgeColor:"#166534",
                  subtitle:(eVac.cargo||"Sin cargo") + " · " + (eVac.cedula||"Sin documento") + " · Ingreso " + (eVac.fechaIngreso||"sin fecha"),
                  principal:{
                    label:"Saldo disponible de vacaciones",
                    value:vacaciones.dias + " días",
                    color:"#166534",
                    hint:"Pagadas sin retiro: " + round1(eVac.vacacionesPagadasDias||0) + " días · Valor acumulado: " + fmt(vacaciones.valor),
                  },
                  metrics:[
                    {label:"Salario base", value:fmt(eVac.salario), color:"#142840"},
                    {label:"Valor día", value:fmt(Math.round((Number(eVac.salario)||0)/30)), color:"#0f766e"},
                    {label:"Corte activo", value:periodoNomina.label, color:"#f47c20"},
                    {label:"Días a pagar", value:diasLiquidar + " días", color:"#2563eb"},
                    {label:"Valor vacaciones", value:fmt(valorLiquidar), color:"#166534"},
                    {label:"Saldo restante", value:saldoVacaciones + " días", color:"#7c3aed"},
                  ],
                })}
                <div style={{height:14}}/>
                <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#166534",textTransform:"uppercase",letterSpacing:0.7,marginBottom:12}}>Liquidar vacaciones — {eVac.nombre}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                    <div>
                      <LBL>Días a pagar</LBL>
                      <input type="number" min={0} max={vacaciones.dias} step={0.1} value={diasLiquidar} onChange={ev=>setDiasVacLiquidar(prev=>({...prev,[eVac.id]:round1(ev.target.value)}))} style={SI}/>
                    </div>
                    <div style={{background:"#fff",borderRadius:8,padding:"10px 12px",border:"1px solid #bbf7d0",alignSelf:"end"}}>
                      <div style={{fontSize:10,color:"#64748b"}}>Valor a pagar</div>
                      <div style={{fontSize:18,fontWeight:700,color:"#166534"}}>{fmt(valorLiquidar)}</div>
                      <div style={{fontSize:10,color:"#64748b",marginTop:4}}>Saldo restante: {saldoVacaciones} días</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>registrarVacacionesPagadas(eVac)} style={{...B("#142840","#4ade80"),fontSize:11,flex:1,justifyContent:"center"}}>Guardar cambios</button>
                    <button onClick={()=>printVacaciones(eVac,diasLiquidar,valorLiquidar)} style={{...B("#166534","#d1fae5"),fontSize:11,flex:1,justifyContent:"center"}}>Imprimir vacaciones</button>
                  </div>
                  {mensajeGuardadoNomina&&<div style={{fontSize:11,color:"#166534",fontWeight:700,marginTop:8,textAlign:"center"}}>{mensajeGuardadoNomina}</div>}
                </div>
              </>
            )}
          </div>
        </div>
        );
      })()}

      {tab==="contratos"&&(()=>{
        const eCont = empleadosBase.find(e=>e.id===liquidarId) || empleadosBase[0] || null;
        const idxCont = empleadosBase.findIndex(e=>e.id===eCont?.id);
        const pf = eCont ? calcularParafiscales(eCont, eCont.fechaSalida||periodoNomina.endIso) : null;
        const resumenCorte = eCont ? calcularResumenNominaEmpleado(eCont, periodoNomina) : null;
        const liquidacion = eCont ? calcularLiquidacionRetiro(eCont, periodoNomina, diasVacPagar[eCont.id]) : null;
        const periodoLiquidacion = liquidacion?.periodoLiquidacion || periodoNomina;
        const resumenLiquidacion = liquidacion?.resumenRetiro;
        const vacacionesPendientesRetiro = liquidacion?.vacacionesPendientes;
        const dvp = eCont ? (diasVacPagar[eCont.id] ?? (vacacionesPendientesRetiro?.dias || 0)) : 0;
        const vacValorReal = liquidacion?.vacValorReal;
        const indemn = liquidacion?.indemn;
        const total = liquidacion?.total;
        return(
        <div>
          <div style={{...CD,maxWidth:900,margin:"0 auto"}}>
            <div style={ST}>Contratos, corte activo y liquidación de retiro</div>
            <div style={{marginBottom:14}}>
              <LBL>Empleado</LBL>
              <select value={eCont?.id||""} onChange={ev=>setLiquidarId(ev.target.value||null)} style={SI}>
                {empleadosBase.map(e=><option key={e.id} value={e.id}>{e.nombre} {e.activo?"":"· Retirado"}</option>)}
              </select>
            </div>
            {eCont&&pf&&resumenCorte&&(
              <>
                {renderNominaEmpleadoCard({
                  empleado:eCont,
                  index:idxCont,
                  badgeLabel:eCont.activo?"Activo":"Retirado",
                  badgeBg:eCont.activo?"#dcfce7":"#fee2e2",
                  badgeColor:eCont.activo?"#166534":"#b91c1c",
                  subtitle:(eCont.cargo||"Sin cargo") + " · " + (eCont.cedula||"Sin documento") + " · " + periodoNomina.label,
                  principal:{
                    label:"Liquidación estimada del retiro",
                    value:fmt(total||0),
                    color:"#92400e",
                    hint:(liquidacion?.retiroEnPeriodo
                      ? ("Se incluirá en planilla del corte " + periodoLiquidacion.label)
                      : "Define fecha de salida dentro del corte para que aparezca en planilla"),
                  },
                  metrics:[
                    {label:"Antigüedad", value:pf.diasTrabajados + " días", color:"#142840", hint:pf.mesesTrabajados + " meses · Ingreso " + (eCont.fechaIngreso||"No registrada")},
                    {label:"Días corte", value:resumenCorte.diasNomina + " días", color:"#2563eb"},
                    {label:"Neto corte", value:fmt(resumenCorte.neto), color:"#0f766e"},
                    {label:"Descuentos", value:fmt(resumenCorte.totalDeducciones), color:"#c2410c"},
                    {label:"Vacaciones pendientes", value:(vacacionesPendientesRetiro?.dias||0) + " días", color:"#166534"},
                    {label:"Estado planilla", value:liquidacion?.retiroEnPeriodo?"Incluida":"Pendiente", color:liquidacion?.retiroEnPeriodo?"#166534":"#64748b"},
                  ],
                })}
                <div style={{height:14}}/>
                <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:12,padding:"14px 16px"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#92400e",textTransform:"uppercase",letterSpacing:0.7,marginBottom:12}}>Liquidación de retiro — {eCont.nombre}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    <div><LBL>Fecha de salida</LBL><input type="date" value={eCont.fechaSalida||""} onChange={ev=>updEmp(eCont.id,"fechaSalida",ev.target.value)} style={{...SI,fontSize:11}}/></div>
                    <div><LBL>Causa del retiro</LBL><select value={eCont.causaRetiro||""} onChange={ev=>updEmp(eCont.id,"causaRetiro",ev.target.value)} style={{...SI,fontSize:11,padding:"5px 8px"}}>
                      <option value="">Seleccionar...</option>
                      {["Renuncia voluntaria","Despido sin justa causa","Despido con justa causa","Mutuo acuerdo","Vencimiento contrato","Fallecimiento","Incapacidad permanente"].map(c=><option key={c}>{c}</option>)}
                    </select></div>
                  </div>
                  <div style={{background:"#f0fdf4",borderRadius:6,padding:"8px 10px",marginBottom:10,display:"flex",alignItems:"center",gap:12,fontSize:11}}>
                    <span style={{color:"#166534",fontWeight:600}}>Días de vacaciones a pagar con retiro:</span>
                    <input type="number" min={0} max={vacacionesPendientesRetiro?.dias||0} step={0.1} value={dvp} onChange={ev=>setDiasVacPagar(prev=>({...prev,[eCont.id]:round1(ev.target.value)}))} style={{width:70,padding:"4px 8px",borderRadius:5,border:"1px solid #bbf7d0",fontSize:12,fontWeight:700,textAlign:"center"}}/>
                    <span style={{color:"#64748b",fontSize:10}}>Disponibles: {vacacionesPendientesRetiro?.dias||0} días · Valor: {fmt(vacValorReal||0)}</span>
                  </div>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:10}}>
                    <thead><tr style={{background:"#142840",color:"#fff"}}><th style={{padding:"5px 8px",textAlign:"left"}}>Concepto</th><th style={{padding:"5px 8px",textAlign:"left"}}>Base cálculo</th><th style={{padding:"5px 8px",textAlign:"right"}}>Valor</th></tr></thead>
                    <tbody>
                      {[
                        ["Salario días trabajados",(resumenLiquidacion?.diasNomina||0)+" días × "+fmt(resumenLiquidacion?.valorDia||0),resumenLiquidacion?.salario||0],
                        ["Auxilio de transporte",(resumenLiquidacion?.diasNomina||0)+" días del corte final",resumenLiquidacion?.auxilioTransporte||0],
                        ...((resumenLiquidacion?.horasExtras||0)>0?[["Horas extras pendientes","Registradas en el corte final",resumenLiquidacion.horasExtras]]:[]),
                        ...((resumenLiquidacion?.comisiones||0)>0?[["Comisiones pendientes","Registradas en el corte final",resumenLiquidacion.comisiones]]:[]),
                        ["Descuento salud","4% sobre base",-(resumenLiquidacion?.salud||0)],
                        ["Descuento pensión","4% sobre base",-(resumenLiquidacion?.pension||0)],
                        ["Neto nómina final",periodoLiquidacion.label,resumenLiquidacion?.neto||0],
                        ["Cesantías",fmt(pf.cesantias)+" (días: "+pf.diasTrabajados+"÷360)",pf.cesantias],
                        ["Intereses cesantías","12% anual",pf.interesesCesantias],
                        ["Prima de servicios","Base × días÷360",pf.prima],
                        ["Vacaciones",dvp+" días × salario÷30",vacValorReal||0],
                        ...((indemn||0)>0?[["Indemnización (sin justa causa)","CST art. 64",indemn]]:[])
                      ].map(([k,b,v])=>(
                        <tr key={k} style={{borderBottom:"1px solid #f1f5f9"}}><td style={{padding:"5px 8px"}}>{k}</td><td style={{padding:"5px 8px",color:"#64748b",fontSize:10}}>{b}</td><td style={{padding:"5px 8px",textAlign:"right",fontWeight:600,color:"#0f172a"}}>{fmt(v)}</td></tr>
                      ))}
                    </tbody>
                    <tfoot><tr style={{background:"#f5c842"}}><td colSpan={2} style={{padding:"7px 8px",fontWeight:700}}>TOTAL LIQUIDACIÓN</td><td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontSize:13}}>{fmt(total||0)}</td></tr></tfoot>
                  </table>
                  <div style={{display:"flex",gap:6,marginBottom:6}}>
                    <button onClick={()=>guardarLiquidacionRetiro(eCont)} style={{...B("#166534","#d1fae5"),fontSize:11,flex:1,justifyContent:"center"}}>Guardar cambios</button>
                    <button onClick={()=>printLiquidacion(eCont,pf,indemn||0,dvp,eCont.fechaSalida||null,resumenLiquidacion,periodoLiquidacion)} style={{...B("#142840","#f5c842"),fontSize:11,flex:1,justifyContent:"center"}}>Imprimir liquidación</button>
                    <button onClick={()=>updEmp(eCont.id,"activo",false)} style={{...B("#2d1414","#ef4444"),fontSize:11,flex:1,justifyContent:"center"}}>Marcar como retirado</button>
                  </div>
                  {mensajeGuardadoNomina&&<div style={{fontSize:11,color:"#166534",fontWeight:700,marginTop:6,textAlign:"center"}}>{mensajeGuardadoNomina}</div>}
                </div>
              </>
            )}
          </div>
        </div>
        );
      })()}
      {tab==="colillas"&&(
        <div>
          <div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",marginBottom:16,background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:12,padding:"12px 14px"}}>
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"#9a3412",textTransform:"uppercase",letterSpacing:0.7}}>Colillas de pago</div>
              <div style={{fontSize:12,color:"#7c2d12",marginTop:4}}>Formato media carta con logo, con detalle del corte activo, incapacidades reconocidas y sin provisiones informativas.</div>
            </div>
            <button style={B("#142840","#4ade80")} onClick={()=>resumenesActivos.forEach(({empleado:e,resumen})=>printColilla(e,resumen,periodoNomina))}>🧾 Imprimir colillas masivas</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {resumenesActivos.map(({empleado:e,resumen},i)=>{
              return(
              <div key={e.id} style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                  <Av init={e.avatar} color={PAL[i%PAL.length]} size={32}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:700}}>{e.nombre}</div>
                    <div style={{fontSize:10,color:"#64748b"}}>{e.cargo} · {periodoNomina.label}</div>
                  </div>
                  <div style={{textAlign:"right",fontSize:12,fontWeight:700,color:"#4ade80"}}>{fmt(resumen.neto)}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,fontSize:10,marginBottom:12}}>
                  {[["Días laborados",resumen.diasNomina,"#2563eb"],["Días incapacidad",resumen.diasIncapacidad,"#dc2626"],["Salario",fmt(resumen.salario),"#4ade80"],["Incapacidades",fmt(resumen.incapacidadTotal),"#166534"],["Aux. transp.",fmt(resumen.auxilioTransporte),"#60b4ff"],["Extras + com.",fmt(resumen.horasExtras+resumen.comisiones),"#f59e0b"],["Base salud/pens.",fmt(resumen.baseSaludPension),"#7c3aed"],["Deducciones",fmt(resumen.totalDeducciones),"#dc2626"]].map(([k,v,col])=>(
                    <div key={k} style={{background:"#fff",borderRadius:8,padding:"8px 9px",border:"1px solid #e2e8f0"}}>
                      <div style={{color:"#94a3b8",fontSize:9,textTransform:"uppercase",letterSpacing:0.5}}>{k}</div>
                      <div style={{fontWeight:700,color:col,fontSize:11,marginTop:3}}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={()=>printColilla(e,resumen,periodoNomina)} style={{...B("#142840","#f5c842"),fontSize:11,flex:1,justifyContent:"center"}}>🖨 Ver / imprimir colilla</button>
                  {e.tel&&<button onClick={()=>window.open("https://wa.me/57" + (Array.from(e.tel).filter(ch=>ch>="0"&&ch<="9").join("")) + "?text=" + (encodeURIComponent("Hola "+e.nombre+", adjuntamos tu colilla de pago del corte "+periodoNomina.label+". Neto a pagar: "+fmt(resumen.neto)+". Att. Ingeanclajes S.A.S")),'_blank')} style={{...B("#166534","#4ade80"),fontSize:11,justifyContent:"center"}}>WhatsApp</button>}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      )}


      {tab==="he"&&(
        <div>
          {(()=>{
            const empleadoHEActivo = empleadosBase.find((empleado)=>empleado.id===showHE) || activos[0] || null;
            const idxHE = empleadosBase.findIndex((empleado)=>empleado.id===empleadoHEActivo?.id);
            const resumenHE = empleadoHEActivo ? calcularResumenNominaEmpleado(empleadoHEActivo, periodoNomina) : null;
            const horasPeriodo = empleadoHEActivo ? (empleadoHEActivo.horasExtrasPorObra||[]).filter((horaExtra)=>isDateInPeriodo(horaExtra.fecha, periodoNomina)) : [];
            const comisionesPeriodo = empleadoHEActivo ? (empleadoHEActivo.comisionesPorObra||[]).filter((comision)=>isDateInPeriodo(comision.fecha, periodoNomina)) : [];
            const valorHoraBase = calcularValorHoraBase(empleadoHEActivo);
            const pctRecargo = getPctRecargo(heForm.tipoRecargo, heForm.fecha||today());
            const valorHoraRecargo = calcularValorHoraRecargo(empleadoHEActivo, heForm.tipoRecargo, heForm.fecha||today(), heForm.valorHora);
            const totalHE = (Number(heForm.horas)||0) * valorHoraRecargo;
            const infoRec = RECARGOS_CO_2026.find((recargo)=>recargo.id===heForm.tipoRecargo);
            return(
              <div>
                <div style={{...CD,maxWidth:900,margin:"0 auto"}}>
                  <div style={ST}>Horas extras y comisiones por empleado</div>
                  <div style={{display:"grid",gap:14}}>
                    <div>
                      <LBL>Empleado</LBL>
                      <select value={empleadoHEActivo?.id||""} onChange={e=>setShowHE(e.target.value||null)} style={SI}>
                        <option value="">Seleccionar empleado...</option>
                        {empleadosBase.map((empleado)=><option key={empleado.id} value={empleado.id}>{empleado.nombre}</option>)}
                      </select>
                    </div>

                    {empleadoHEActivo && resumenHE ? (
                      <>
                        {renderNominaEmpleadoCard({
                          empleado:empleadoHEActivo,
                          index:idxHE,
                          badgeLabel:"Horas extras",
                          badgeBg:"#fff7ed",
                          badgeColor:"#c2410c",
                          subtitle:(empleadoHEActivo.cargo||"Sin cargo") + " · " + (empleadoHEActivo.cedula||"Sin documento") + " · " + periodoNomina.label,
                          principal:{
                            label:"Extras y comisiones del corte",
                            value:fmt(resumenHE.horasExtras + resumenHE.comisiones),
                            color:"#f59e0b",
                            hint:"Esta base también entra al cálculo de salud y pensión del corte.",
                          },
                          metrics:[
                            {label:"Salario base", value:fmt(empleadoHEActivo.salario), color:"#142840"},
                            {label:"Valor hora base", value:fmt(valorHoraBase), color:"#0f766e"},
                            {label:"Horas extras", value:fmt(resumenHE.horasExtras), color:"#f59e0b"},
                            {label:"Comisiones", value:fmt(resumenHE.comisiones), color:"#7c3aed"},
                            {label:"Base salud / pensión", value:fmt(resumenHE.baseSaludPension), color:"#1d4ed8"},
                            {label:"Neto del corte", value:fmt(resumenHE.neto), color:"#0f766e"},
                          ],
                        })}

                        <div style={{background:"#ffffff",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#142840",textTransform:"uppercase",marginBottom:10}}>Registrar movimiento</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                            <div><LBL>Obra</LBL>
                              <select value={heForm.obraId} onChange={e=>setHeForm({...heForm,obraId:e.target.value})} style={SI}>
                                <option value="">Seleccionar obra...</option>
                                {obras.map((obra)=><option key={obra.id} value={obra.id}>{obra.id} · {obra.cliente}</option>)}
                              </select>
                            </div>
                            <div>
                              <LBL>Tipo</LBL>
                              <div style={{display:"flex",gap:8}}>
                                {[["horaExtra","Hora extra"],["comision","Comisión"]].map(([value,label])=>(
                                  <button key={value} onClick={()=>setHeForm({...heForm,tipo:value})} style={{...B(heForm.tipo===value?"#f47c20":"#142840",heForm.tipo===value?"#fff":"#7da5c8"),flex:1,justifyContent:"center",border:"1px solid " + (heForm.tipo===value?"#f47c20":"#1a3050")}}>{label}</button>
                                ))}
                              </div>
                            </div>
                            {heForm.tipo==="horaExtra"&&(
                              <>
                                <div style={{gridColumn:"span 2"}}>
                                  <LBL>Tipo de recargo</LBL>
                                  <select value={heForm.tipoRecargo} onChange={e=>setHeForm({...heForm,tipoRecargo:e.target.value})} style={SI}>
                                    {RECARGOS_CO_2026.map((recargo)=><option key={recargo.id} value={recargo.id}>{recargo.label}{recargo.horario?" · " + recargo.horario:""}</option>)}
                                  </select>
                                  {pctRecargo!==null&&<div style={{marginTop:4,fontSize:11,color:"#f47c20",fontWeight:600}}>Tarifa aplicada: {pctRecargo}% sobre hora ordinaria · Valor/hora calculado: {fmt(valorHoraRecargo)} (hora base: {fmt(valorHoraBase)})</div>}
                                </div>
                                <div><LBL>Horas</LBL><input type="number" value={heForm.horas} onChange={e=>setHeForm({...heForm,horas:parseFloat(e.target.value)||0})} style={SI}/></div>
                                {pctRecargo===null
                                  ? <div><LBL>Valor/hora</LBL><input type="number" value={heForm.valorHora} onChange={e=>setHeForm({...heForm,valorHora:parseFloat(e.target.value)||0})} style={SI}/></div>
                                  : <div><LBL>Valor/hora (automático)</LBL><input type="number" value={valorHoraRecargo} readOnly style={{...SI,background:"#f1f5f9",color:"#64748b",cursor:"not-allowed"}}/></div>
                                }
                                <div style={{gridColumn:"span 2",background:"#f8fafc",borderRadius:8,padding:"10px 12px",fontSize:12}}>Total {infoRec?.label||"horas extras"}: <strong style={{color:"#f59e0b"}}>{fmt(totalHE)}</strong></div>
                              </>
                            )}
                            {heForm.tipo==="comision"&&(
                              <div style={{gridColumn:"span 2"}}><LBL>Valor comisión</LBL><input type="number" value={heForm.comision} onChange={e=>setHeForm({...heForm,comision:parseFloat(e.target.value)||0})} style={SI}/></div>
                            )}
                            <div><LBL>Fecha</LBL><input type="date" value={heForm.fecha} onChange={e=>setHeForm({...heForm,fecha:e.target.value})} style={SI}/></div>
                            <div><LBL>Concepto</LBL><input value={heForm.concepto} onChange={e=>setHeForm({...heForm,concepto:e.target.value})} placeholder="Ej: Trabajo nocturno" style={SI}/></div>
                          </div>
                          <div style={{display:"flex",justifyContent:"flex-end"}}>
                            <button style={B("#f47c20")} onClick={agregarHE}>Registrar</button>
                          </div>
                        </div>

                        <div style={{background:"#ffffff",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#142840",textTransform:"uppercase",marginBottom:10}}>Movimientos del corte</div>
                          {horasPeriodo.length===0 && comisionesPeriodo.length===0 ? (
                            <div style={{fontSize:12,color:"#94a3b8"}}>Este empleado no tiene horas extras ni comisiones registradas en el corte activo.</div>
                          ) : (
                            <div style={{display:"grid",gap:8}}>
                              {horasPeriodo.map((horaExtra)=>{
                                const obra = obras.find((item)=>item.id===horaExtra.obraId);
                                const recargo = RECARGOS_CO_2026.find((item)=>item.id===horaExtra.tipoRecargo);
                                const totalHoraExtra = calcularTotalHoraExtraItem(empleadoHEActivo, horaExtra);
                                return(
                                  <div key={horaExtra.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}>
                                    <div>
                                      <div style={{fontWeight:700,color:"#0f172a"}}>{recargo?.label||"Hora extra"}</div>
                                      <div style={{fontSize:11,color:"#64748b"}}>{horaExtra.horas} h · {obra?.cliente||horaExtra.obraId} · {horaExtra.fecha}</div>
                                    </div>
                                    <div style={{fontWeight:700,color:"#f59e0b"}}>{fmt(totalHoraExtra)}</div>
                                  </div>
                                );
                              })}
                              {comisionesPeriodo.map((comision)=>{
                                const obra = obras.find((item)=>item.id===comision.obraId);
                                return(
                                  <div key={comision.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}>
                                    <div>
                                      <div style={{fontWeight:700,color:"#0f172a"}}>{comision.concepto||"Comisión"}</div>
                                      <div style={{fontSize:11,color:"#64748b"}}>{obra?.cliente||comision.obraId} · {comision.fecha}</div>
                                    </div>
                                    <div style={{fontWeight:700,color:"#7c3aed"}}>{fmt(comision.comision)}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{textAlign:"center",color:"#94a3b8",padding:"28px 0"}}>
                        Selecciona un empleado para revisar y registrar sus horas extras o comisiones.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tab==="incapacidades"&&(
        <div>
          {(()=>{
            const empleadoActivo = empleadoIncapacidadActivo;
            const idxActivo = empleadosBase.findIndex((empleado)=>empleado.id===empleadoActivo?.id);
            const resumenNominaIncapacidad = empleadoActivo ? calcularResumenNominaEmpleado(empleadoActivo, periodoNomina) : null;
            const previewRegistro = incapacidadPreview?.resumen?.registros?.[0] || null;
            return(
              <div>
                <div style={{...CD,maxWidth:980,margin:"0 auto"}}>
                  <div style={ST}>Incapacidades del corte</div>
                  <div style={{display:"grid",gap:14}}>
                    <div>
                      <LBL>Empleado</LBL>
                      <select
                        value={empleadoActivo?.id || ""}
                        onChange={(e)=>setShowIncapacidad(e.target.value || null)}
                        style={SI}
                      >
                        <option value="">Seleccionar empleado...</option>
                        {empleadosBase.map((empleado)=>(
                          <option key={empleado.id} value={empleado.id}>{empleado.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {empleadoActivo && resumenNominaIncapacidad ? (
                      <>
                        {renderNominaEmpleadoCard({
                          empleado:empleadoActivo,
                          index:idxActivo,
                          badgeLabel:"Incapacidades",
                          badgeBg:"#eefbf3",
                          badgeColor:"#166534",
                          subtitle:(empleadoActivo.cargo||"Sin cargo") + " · " + (empleadoActivo.cedula||"Sin documento") + " · " + periodoNomina.label,
                          principal:{
                            label:"Valor de incapacidades aplicado al corte",
                            value:fmt(resumenNominaIncapacidad.incapacidadTotal),
                            color:"#166534",
                            hint:"Se descuenta del salario los días no laborados y la incapacidad entra a la base del corte según el origen registrado.",
                          },
                          metrics:[
                            {label:"Días laborados", value:resumenNominaIncapacidad.diasNomina, color:"#2563eb"},
                            {label:"Días incapacidad", value:resumenNominaIncapacidad.diasIncapacidad, color:"#dc2626"},
                            {label:"Empleador", value:fmt(resumenNominaIncapacidad.incapacidadEmpleador), color:"#c2410c"},
                            {label:"EPS", value:fmt(resumenNominaIncapacidad.incapacidadEPS + resumenNominaIncapacidad.incapacidadEPS540), color:"#0f766e"},
                            {label:"Colpensiones", value:fmt(resumenNominaIncapacidad.incapacidadColpensiones), color:"#7c3aed"},
                            {label:"ARL", value:fmt(resumenNominaIncapacidad.incapacidadARL), color:"#f59e0b"},
                            {label:"Base salud / pensión", value:fmt(resumenNominaIncapacidad.baseSaludPension), color:"#1d4ed8"},
                            {label:"Neto del corte", value:fmt(resumenNominaIncapacidad.neto), color:"#0f766e"},
                          ],
                        })}

                        <div style={{background:"#ffffff",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#142840",textTransform:"uppercase",marginBottom:10}}>Registrar y calcular incapacidad</div>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                            <div>
                              <LBL>Origen</LBL>
                              <div style={{display:"flex",gap:8}}>
                                {[["comun","Origen común"],["laboral","Origen laboral"]].map(([value,label])=>(
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={()=>setIncapacidadForm((prev)=>({ ...prev, origen:value }))}
                                    style={{...B(incapacidadForm.origen===value?"#f47c20":"#142840",incapacidadForm.origen===value?"#fff":"#7da5c8"),flex:1,justifyContent:"center",border:"1px solid " + (incapacidadForm.origen===value?"#f47c20":"#1a3050")}}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div>
                              <LBL>IBC / IBL mensual base</LBL>
                              <input
                                type="number"
                                value={incapacidadForm.iblMensual}
                                onChange={(e)=>setIncapacidadForm((prev)=>({ ...prev, iblMensual:parseFloat(e.target.value)||0 }))}
                                placeholder={String(empleadoActivo.salario || 0)}
                                style={SI}
                              />
                            </div>
                            <div>
                              <LBL>Fecha inicio</LBL>
                              <input
                                type="date"
                                value={incapacidadForm.fechaInicio}
                                onChange={(e)=>setIncapacidadForm((prev)=>({ ...prev, fechaInicio:e.target.value }))}
                                style={SI}
                              />
                            </div>
                            <div>
                              <LBL>Fecha fin</LBL>
                              <input
                                type="date"
                                value={incapacidadForm.fechaFin}
                                onChange={(e)=>setIncapacidadForm((prev)=>({ ...prev, fechaFin:e.target.value }))}
                                style={SI}
                              />
                            </div>
                            <div>
                              <LBL>Días acumulados previos</LBL>
                              <input
                                type="number"
                                value={incapacidadForm.diasPrevios}
                                onChange={(e)=>setIncapacidadForm((prev)=>({ ...prev, diasPrevios:Math.max(0, parseInt(e.target.value || "0", 10) || 0) }))}
                                style={SI}
                              />
                              <div style={{fontSize:10,color:"#64748b",marginTop:4}}>Úsalo cuando la incapacidad sea prórroga y ya vengan días reconocidos de certificados anteriores.</div>
                            </div>
                            <div>
                              <LBL>Número de soporte</LBL>
                              <input
                                value={incapacidadForm.numeroSoporte}
                                onChange={(e)=>setIncapacidadForm((prev)=>({ ...prev, numeroSoporte:e.target.value }))}
                                placeholder="Ej: INC-2026-0414"
                                style={SI}
                              />
                            </div>
                            <div style={{gridColumn:"span 2"}}>
                              <LBL>Concepto / diagnóstico</LBL>
                              <input
                                value={incapacidadForm.diagnostico}
                                onChange={(e)=>setIncapacidadForm((prev)=>({ ...prev, diagnostico:e.target.value }))}
                                placeholder="Ej: Incapacidad médica por enfermedad general"
                                style={SI}
                              />
                            </div>
                            <div style={{gridColumn:"span 2"}}>
                              <LBL>Observación interna</LBL>
                              <textarea
                                value={incapacidadForm.observacion}
                                onChange={(e)=>setIncapacidadForm((prev)=>({ ...prev, observacion:e.target.value }))}
                                rows={3}
                                placeholder="Notas para nómina o seguimiento"
                                style={{...SI,resize:"vertical"}}
                              />
                            </div>
                          </div>

                          <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10,padding:"12px 14px",fontSize:12,color:"#475569",lineHeight:1.7,marginBottom:12}}>
                            <div style={{fontWeight:700,color:"#142840",marginBottom:6}}>Base legal aplicada para empresa privada</div>
                            <div>Origen común: 66.67% del IBC en días 1 a 90 y 50% del IBC en días 91 a 540, con empleador días 1-2, EPS desde día 3 y Colpensiones desde día 181. Origen laboral: 100% del IBC a cargo de la ARL.</div>
                          </div>

                          <div style={{display:"flex",justifyContent:"flex-end",gap:8,flexWrap:"wrap"}}>
                            <button type="button" onClick={calcularPreviewIncapacidad} style={B("#f47c20")}>Calcular incapacidad</button>
                            <button type="button" onClick={guardarIncapacidad} style={B("#166534","#d1fae5")}>Guardar incapacidad</button>
                          </div>
                          {mensajeGuardadoNomina && <div style={{fontSize:11,color:"#166534",fontWeight:700,marginTop:8,textAlign:"right"}}>{mensajeGuardadoNomina}</div>}
                        </div>

                        {incapacidadPreview && previewRegistro ? (
                          <div style={{background:"#ffffff",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                            <div style={{fontSize:11,fontWeight:700,color:"#142840",textTransform:"uppercase",marginBottom:10}}>Vista previa del cálculo</div>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:12}}>
                              <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Origen</div><div style={{fontWeight:700,color:"#142840"}}>{INCAPACIDAD_ORIGEN_LABELS[previewRegistro.origen]}</div></div>
                              <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Días en el corte</div><div style={{fontWeight:700,color:"#dc2626"}}>{previewRegistro.diasPeriodo}</div></div>
                              <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Valor reconocido</div><div style={{fontWeight:700,color:"#166534"}}>{fmt(previewRegistro.totalPeriodo)}</div></div>
                              <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Neto estimado</div><div style={{fontWeight:700,color:"#0f766e"}}>{fmt(incapacidadPreview.nominaConPreview.neto)}</div></div>
                            </div>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                              {Object.entries(previewRegistro.totalesResponsable)
                                .filter(([,valor])=>Number(valor||0)>0)
                                .map(([responsable, valor])=>(
                                  <div key={responsable} style={{background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:8,padding:"10px 12px"}}>
                                    <div style={{fontSize:10,color:"#9a3412"}}>{INCAPACIDAD_RESPONSABLE_LABELS[responsable]}</div>
                                    <div style={{fontWeight:700,color:"#c2410c",marginTop:3}}>{fmt(valor)}</div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        ) : null}

                        <div style={{background:"#ffffff",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                          <div style={{fontSize:11,fontWeight:700,color:"#142840",textTransform:"uppercase",marginBottom:10}}>Incapacidades registradas en el corte</div>
                          {resumenIncapacidadActivo?.registros?.length ? (
                            <div style={{display:"grid",gap:8}}>
                              {resumenIncapacidadActivo.registros.map((registro)=>(
                                <div key={registro.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:8,padding:"10px 12px",gap:12}}>
                                  <div style={{flex:1}}>
                                    <div style={{fontWeight:700,color:"#0f172a"}}>{INCAPACIDAD_ORIGEN_LABELS[registro.origen]} · {registro.fechaInicio}{registro.fechaFin!==registro.fechaInicio ? " al " + registro.fechaFin : ""}</div>
                                    <div style={{fontSize:11,color:"#64748b"}}>{registro.diasPeriodo} día(s) en el corte · {registro.numeroSoporte || "Sin soporte"}{registro.diagnostico ? " · " + registro.diagnostico : ""}</div>
                                    <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:6,fontSize:10,color:"#475569"}}>
                                      {Object.entries(registro.totalesResponsable)
                                        .filter(([,valor])=>Number(valor||0)>0)
                                        .map(([responsable, valor])=>(
                                          <span key={responsable} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:999,padding:"4px 8px"}}>
                                            {INCAPACIDAD_RESPONSABLE_LABELS[responsable]}: <strong>{fmt(valor)}</strong>
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                  <div style={{textAlign:"right"}}>
                                    <div style={{fontWeight:700,color:"#166534"}}>{fmt(registro.totalPeriodo)}</div>
                                    <button type="button" onClick={()=>quitarIncapacidad(empleadoActivo.id, registro.id)} style={{...B("#fee2e2","#b91c1c"),border:"1px solid #fecaca",padding:"6px 10px",fontSize:11,marginTop:8}}>Quitar</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{fontSize:12,color:"#94a3b8"}}>Este empleado no tiene incapacidades aplicadas en el corte activo.</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div style={{textAlign:"center",color:"#94a3b8",padding:"28px 0"}}>
                        Selecciona un empleado para calcular y guardar incapacidades en nómina.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tab==="deducciones"&&(
        <div>
          <div style={{...CD,maxWidth:900,margin:"0 auto"}}>
            <div style={ST}>Revisión de deducciones por empleado</div>
            <div style={{display:"grid",gap:14}}>
              <div>
                <LBL>Empleado</LBL>
                <select value={empleadoDeduccionActivo?.id || ""} onChange={(e)=>setSelId(e.target.value || null)} style={SI}>
                  <option value="">Seleccionar empleado...</option>
                  {empleadosBase.map((empleado)=>(
                    <option key={empleado.id} value={empleado.id}>{empleado.nombre}</option>
                  ))}
                </select>
              </div>

              {empleadoDeduccionActivo ? (
                <>
                  <div style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:12,padding:"14px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                      <Av init={empleadoDeduccionActivo.avatar} color={PAL[0]} size={34}/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,color:"#0f172a"}}>{empleadoDeduccionActivo.nombre}</div>
                        <div style={{fontSize:11,color:"#64748b"}}>{empleadoDeduccionActivo.cargo || "Sin cargo"} · {empleadoDeduccionActivo.cedula || "Sin documento"} · {periodoNomina.label}</div>
                      </div>
                    </div>
                    {(()=>{
                      const resumenDeduccion = calcularResumenNominaEmpleado(empleadoDeduccionActivo, periodoNomina);
                      return(
                        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                          <div style={{background:"#fff",borderRadius:8,padding:"10px 12px",gridColumn:"span 3"}}>
                            <div style={{fontSize:10,color:"#64748b"}}>Base salud / pensión del corte</div>
                            <div style={{fontWeight:700,color:"#142840",fontSize:16}}>{fmt(resumenDeduccion.baseSaludPension)}</div>
                            <div style={{fontSize:10,color:"#94a3b8",marginTop:3}}>Incluye salario del corte + incapacidades + horas extras + comisiones.</div>
                          </div>
                          <div style={{background:"#fff",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Salud</div><div style={{fontWeight:700,color:"#dc2626"}}>{fmt(resumenDeduccion.salud)}</div></div>
                          <div style={{background:"#fff",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Pensión</div><div style={{fontWeight:700,color:"#e11d48"}}>{fmt(resumenDeduccion.pension)}</div></div>
                          <div style={{background:"#fff",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Incapacidades</div><div style={{fontWeight:700,color:"#166534"}}>{fmt(resumenDeduccion.incapacidadTotal)}</div></div>
                          <div style={{background:"#fff",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Otras deducciones</div><div style={{fontWeight:700,color:"#7c3aed"}}>{fmt(resumenDeduccion.otrasDeducciones)}</div></div>
                          <div style={{background:"#fff",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Total descuentos</div><div style={{fontWeight:700,color:"#c2410c"}}>{fmt(resumenDeduccion.totalDeducciones)}</div></div>
                          <div style={{background:"#fff",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Neto del corte</div><div style={{fontWeight:700,color:"#0f766e"}}>{fmt(resumenDeduccion.neto)}</div></div>
                          <div style={{background:"#fff",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:10,color:"#64748b"}}>Extras + comisiones</div><div style={{fontWeight:700,color:"#f59e0b"}}>{fmt(resumenDeduccion.horasExtras + resumenDeduccion.comisiones)}</div></div>
                        </div>
                      );
                    })()}
                  </div>

                  <div style={{background:"#ffffff",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#142840",textTransform:"uppercase",marginBottom:10}}>Deducciones personalizadas</div>
                    {(empleadoDeduccionActivo.deduccionesPersonalizadas||[]).length>0 ? (
                      <div style={{display:"grid",gap:8,marginBottom:12}}>
                        {(empleadoDeduccionActivo.deduccionesPersonalizadas||[]).map((deduccion)=>(
                          <div key={deduccion.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}>
                            <div>
                              <div style={{fontWeight:700,color:"#0f172a"}}>{deduccion.nombre}</div>
                              <div style={{fontSize:11,color:"#64748b"}}>{fmt(deduccion.valor)} mensual</div>
                            </div>
                            <button type="button" onClick={()=>quitarDeduccion(empleadoDeduccionActivo.id,deduccion.id)} style={{...B("#fee2e2","#b91c1c"),border:"1px solid #fecaca",padding:"6px 10px",fontSize:11}}>Quitar</button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{fontSize:11,color:"#64748b",marginBottom:12}}>
                        Este empleado no tiene deducciones adicionales. Aquí puedes revisar y agregar conceptos como natillera, libranza o descuentos internos autorizados.
                      </div>
                    )}

                    <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr auto",gap:8,marginBottom:12}}>
                      <div>
                        <LBL>Concepto</LBL>
                        <input value={dedForm.nombre} onChange={(event)=>setDedForm({...dedForm,nombre:event.target.value})} placeholder="Ej: Natillera" style={{...SI,fontSize:11}}/>
                      </div>
                      <div>
                        <LBL>Valor mensual</LBL>
                        <input type="number" value={dedForm.valor} onChange={(event)=>setDedForm({...dedForm,valor:parseFloat(event.target.value)||0})} placeholder="0" style={{...SI,fontSize:11}}/>
                      </div>
                      <button
                        type="button"
                        onClick={()=>{
                          if(empleadoDeduccionActivo?.id){
                            setSelId(empleadoDeduccionActivo.id);
                            agregarDeduccion(empleadoDeduccionActivo.id);
                          }
                        }}
                        style={{...B("#142840"),justifyContent:"center",alignSelf:"end"}}
                      >
                        Agregar
                      </button>
                    </div>
                    <div style={{display:"flex",justifyContent:"flex-end"}}>
                      <button type="button" onClick={()=>guardarCambiosNomina("Cambios de deducciones sincronizados")} style={{...B("#142840","#4ade80")}}>Guardar cambios</button>
                    </div>
                    {mensajeGuardadoNomina && <div style={{fontSize:11,color:"#166534",fontWeight:700,marginTop:8,textAlign:"right"}}>{mensajeGuardadoNomina}</div>}
                  </div>
                </>
              ) : (
                <div style={{textAlign:"center",color:"#94a3b8",padding:"28px 0"}}>
                  Selecciona un empleado para revisar sus deducciones.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab==="planilla"&&(
        <div>
          <div style={{display:"flex",gap:12,alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
            <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:12,padding:"12px 14px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#1d4ed8",textTransform:"uppercase",letterSpacing:0.7}}>Generación de nómina y plano banco</div>
              <div style={{fontSize:13,color:"#0f172a",marginTop:4}}>Corte activo: {periodoNomina.label}</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:4}}>
                {nominaEstaGenerada
                  ? ("Nómina generada el " + formatNominaGeneratedAt(nominaVistaActual.generadoEn) + ". Si cambias incapacidades, horas extras, comisiones o deducciones, usa Regenerar nómina.")
                  : "Esta es la vista previa del corte. Cuando ya revises incapacidades, horas extras, comisiones, deducciones y liquidaciones, pulsa Generar nómina para congelar el periodo."}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3, minmax(120px, 1fr))",gap:8,marginTop:12}}>
                <div style={{background:"#fff",borderRadius:10,padding:"9px 10px",border:"1px solid #dbeafe"}}>
                  <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase"}}>Registros nómina</div>
                  <div style={{fontWeight:700,color:"#142840",marginTop:4}}>{nominaVistaActual.totals.totalRegistros}</div>
                </div>
                <div style={{background:"#fff",borderRadius:10,padding:"9px 10px",border:"1px solid #dbeafe"}}>
                  <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase"}}>Listos para banco</div>
                  <div style={{fontWeight:700,color:"#166534",marginTop:4}}>{nominaVistaActual.totals.totalRegistrosBanco}</div>
                </div>
                <div style={{background:"#fff",borderRadius:10,padding:"9px 10px",border:"1px solid #dbeafe"}}>
                  <div style={{fontSize:9,color:"#64748b",textTransform:"uppercase"}}>Total banco</div>
                  <div style={{fontWeight:700,color:"#003B71",marginTop:4}}>{fmt(nominaVistaActual.totals.totalBanco)}</div>
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
              <button style={B("#f47c20")} onClick={generarNominaCorte}>{nominaEstaGenerada ? "Regenerar nómina" : "Generar nómina"}</button>
              <button style={B("#142840","#dbeafe")} onClick={descargarPlanoBanco}>Descargar plano banco</button>
              <button style={B("#166534","#d1fae5")} onClick={()=>printCurrentPz("Planilla Nómina " + (nominaVistaActual.periodo.label))}>Imprimir / Bancolombia</button>
            </div>
          </div>
          {mensajeGuardadoNomina ? <div style={{marginBottom:12,fontSize:12,fontWeight:700,color:"#166534"}}>{mensajeGuardadoNomina}</div> : null}
          <div id="pz" className="doc-shell" style={{background:"#fff",color:"#111",fontFamily:"'Aptos','Segoe UI',sans-serif",fontSize:11,padding:"30px 40px",border:"1px solid #ddd"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:"2px solid #003B71",paddingBottom:14,marginBottom:20}}>
              <img src={LOGO_INGEANCLAJES} alt="Ingeanclajes" style={{height:60,objectFit:"contain"}}/>
              <div style={{textAlign:"right"}}><div style={{background:"#FFCD00",color:"#003B71",padding:"6px 16px",borderRadius:4,fontWeight:700}}>BANCOLOMBIA</div><div style={{fontSize:10,color:"#555",marginTop:4}}>Planilla Nómina · {nominaVistaActual.periodo.label}</div><div style={{fontSize:9,color:"#64748b",marginTop:4}}>{nominaEstaGenerada ? ("Generada el " + formatNominaGeneratedAt(nominaVistaActual.generadoEn)) : "Vista previa del corte"}</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:12,marginBottom:16}}>
              <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:9,color:"#64748b"}}>Corte activo</div><div style={{fontWeight:700}}>{nominaVistaActual.periodo.label}</div></div>
              <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:9,color:"#64748b"}}>Días referencia</div><div style={{fontWeight:700}}>{nominaVistaActual.periodo.diasReferencia}</div></div>
              <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:9,color:"#64748b"}}>Nómina corte</div><div style={{fontWeight:700}}>{fmt(nominaVistaActual.totals.totalNomina)}</div></div>
              <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:9,color:"#64748b"}}>Liquidaciones corte</div><div style={{fontWeight:700,color:"#b45309"}}>{fmt(nominaVistaActual.totals.totalLiquidaciones)}</div></div>
              <div style={{background:"#f8fafc",borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:9,color:"#64748b"}}>Total a transferir</div><div style={{fontWeight:700,color:"#003B71"}}>{fmt(nominaVistaActual.totals.totalPagar)}</div></div>
            </div>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:"#003B71",color:"#fff"}}>{["#","Empleado","Documento","Banco / Cuenta","Días","Básico","Incap.","Aux. T.","H.Extra","Comisión","Deducciones","Liq. retiro","TOTAL"].map((h)=><th key={h} style={{padding:"6px 8px",textAlign:["Días","Básico","Incap.","Aux. T.","H.Extra","Comisión","Deducciones","Liq. retiro","TOTAL"].includes(h)?"right":"left",fontSize:10}}>{h}</th>)}</tr></thead>
              <tbody>
                {nominaVistaActual.registros.map(({empleado:e,resumen,liquidacionPrestaciones,totalPagar,retiroEnPeriodo,observacionesBanco},i)=>(
                  <tr key={e.id} style={{background:i%2===0?"#fff":"#f5f5f5",borderBottom:"1px solid #e0e0e0"}}>
                    <td style={{padding:"6px 8px",color:"#555",fontSize:10}}>{i+1}</td>
                    <td style={{padding:"6px 8px",fontWeight:600,fontSize:10}}>
                      {e.nombre}
                      {retiroEnPeriodo && <div style={{fontSize:9,color:"#b91c1c",fontWeight:700,marginTop:2}}>Liquidación incluida · retiro {e.fechaSalida}</div>}
                    </td>
                    <td style={{padding:"6px 8px",color:"#555",fontSize:9}}>{e.cedula||"-"}</td>
                    <td style={{padding:"6px 8px",color:"#555",fontSize:9}}>
                      {e.banco}<br/>{e.tipoCuenta}<br/><span style={{fontFamily:"monospace"}}>{e.numeroCuenta}</span>
                      {observacionesBanco?.length ? <div style={{fontSize:9,color:"#b91c1c",marginTop:4}}>{observacionesBanco.join(" · ")}</div> : <div style={{fontSize:9,color:"#166534",marginTop:4}}>Listo para banco</div>}
                    </td>
                    <td style={{padding:"6px 8px",textAlign:"right",fontSize:10}}>
                      <div>{resumen.diasNomina}</div>
                      {resumen.diasIncapacidad>0 ? <div style={{fontSize:9,color:"#b91c1c"}}>{resumen.diasIncapacidad} inc.</div> : null}
                    </td>
                    <td style={{padding:"6px 8px",textAlign:"right",fontSize:10}}>$ {Number(resumen.salario || 0).toLocaleString("es-CO")}</td>
                    <td style={{padding:"6px 8px",textAlign:"right",fontSize:10,color:"#166534"}}>$ {Number(resumen.incapacidadTotal || 0).toLocaleString("es-CO")}</td>
                    <td style={{padding:"6px 8px",textAlign:"right",fontSize:10}}>$ {Number(resumen.auxilioTransporte || 0).toLocaleString("es-CO")}</td>
                    <td style={{padding:"6px 8px",textAlign:"right",fontSize:10,color:"#7a6610"}}>$ {Number(resumen.horasExtras || 0).toLocaleString("es-CO")}</td>
                    <td style={{padding:"6px 8px",textAlign:"right",fontSize:10,color:"#5b21b6"}}>$ {Number(resumen.comisiones || 0).toLocaleString("es-CO")}</td>
                    <td style={{padding:"6px 8px",textAlign:"right",color:"#cc0000",fontSize:9}}>
                      <div>Salud: -$ {Number(resumen.salud || 0).toLocaleString("es-CO")}</div>
                      <div>Pensión: -$ {Number(resumen.pension || 0).toLocaleString("es-CO")}</div>
                      <div>Otras: -$ {Number(resumen.otrasDeducciones || 0).toLocaleString("es-CO")}</div>
                    </td>
                    <td style={{padding:"6px 8px",textAlign:"right",fontWeight:700,color:liquidacionPrestaciones>0?"#b45309":"#94a3b8",fontSize:10}}>$ {Number(liquidacionPrestaciones || 0).toLocaleString("es-CO")}</td>
                    <td style={{padding:"6px 8px",textAlign:"right",fontWeight:700,color:"#003B71",fontSize:10}}>$ {Number(totalPagar || 0).toLocaleString("es-CO")}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr style={{background:"#003B71",color:"#FFCD00"}}><td colSpan={12} style={{padding:"8px 10px",fontWeight:700,fontSize:11}}>TOTAL A PAGAR</td><td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,fontSize:11}}>$ {Number(nominaVistaActual.totals.totalPagar || 0).toLocaleString("es-CO")}</td></tr></tfoot>
            </table>
            <div style={{marginTop:16,fontSize:10,color:"#555",lineHeight:1.5}}>
              Salud y pensión del empleado se calculan aquí sobre la base del corte: salario proporcional + incapacidades + horas extras + comisiones. El auxilio de transporte se prorratea por los días laborados del corte cuando aplica. Si el retiro cae dentro del corte, la planilla suma la liquidación definitiva en este mismo pago. El plano banco usa como referencia el archivo adjunto y solo exporta empleados con cédula y cuenta bancaria completas.
            </div>
            <div style={{marginTop:30,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20}}>
              {["REPRESENTANTE LEGAL","CONTADOR","APROBADO POR"].map((l)=><div key={l} style={{textAlign:"center",borderTop:"1px solid #333",paddingTop:8}}><div style={{fontSize:10,color:"#555"}}>{l}</div></div>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// ======================================================
// HORARIOS
// ======================================================
function Horarios({ctx}){
  const {obras,empleados,horarios,setHorarios}=ctx;
  const firstEmpId = empleados[0]?.id || "";
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

  const [fechaF,setFechaF]=useState(today());
  const [showF,setShowF]=useState(false);
  const [form,setForm]=useState({
    empleadoId:firstEmpId,
    obraId:firstObraId,
    fecha:today(),
    turno1Inicio:"07:00",
    turno1Fin:"17:00",
    tarea1:"",
    turno2Inicio:"",
    turno2Fin:"",
    tarea2:"",
  });
  const [notif,setNotif]=useState("");
  const dia=horarios.filter(h=>h.fecha===fechaF);
  const empSel=empleados.find(e=>e.id===form.empleadoId);
  const obraSel=obras.find(o=>o.id===form.obraId);

  useEffect(()=>{
    setForm(prev=>({
      ...prev,
      empleadoId: empleados.some(e=>e.id===prev.empleadoId) ? prev.empleadoId : firstEmpId,
      obraId: obras.some(o=>o.id===prev.obraId) ? prev.obraId : firstObraId,
    }));
  },[firstEmpId,firstObraId,empleados,obras]);

  const armarTurno=(inicio,fin)=>{
    if(!inicio || !fin) return "";
    return (inicio) + " - " + (fin);
  };

  const buildTurnosPayload=(baseForm)=>{
    const configs = [
      {turno:armarTurno(baseForm.turno1Inicio, baseForm.turno1Fin), tarea:baseForm.tarea1 || baseForm.tarea2},
      {turno:armarTurno(baseForm.turno2Inicio, baseForm.turno2Fin), tarea:baseForm.tarea2 || baseForm.tarea1},
    ];
    return configs
      .filter(item=>item.turno && item.tarea)
      .map(item=>({
        empleadoId: baseForm.empleadoId,
        obraId: baseForm.obraId,
        fecha: baseForm.fecha,
        turno: item.turno,
        tarea: item.tarea,
      }));
  };

  const enviarWA=(eid,oid,f,turnosInfo=[])=>{
    const e=empleados.find(x=>x.id===eid);
    const o=obras.find(x=>x.id===oid);
    if(!e||!o||!turnosInfo.length) return;
    const fechaMsg = fmtD(f) || f;
    const detalleTurnos = turnosInfo.map((item,idx)=>(idx+1) + ". " + (fmtTurno12Local(item.turno)) + " - " + (item.tarea)).join('\n');
    const msg="Hola " + (e.nombre) + ", has sido asignado a la obra *" + (o.proyecto) + "* del cliente *" + (o.cliente) + "* para el día *" + (fechaMsg) + "* en *" + (o.direccion||o.ciudad) + "*.\\n\\nTurnos asignados:\\n" + (detalleTurnos) + "\\n\\nPor favor confirma tu asistencia.\\n*INGEANCLAJES S.A.S*";
    window.open("https://wa.me/57" + (e.tel) + "?text=" + (encodeURIComponent(msg)),"_blank");
    setNotif("WhatsApp abierto para " + (e.nombre) + " · +57 " + (e.tel));
    setTimeout(()=>setNotif(""),5000);
  };

  const guardar=()=>{
    const payload = buildTurnosPayload(form);
    if(!payload.length) return;
    setHorarios(p=>[
      ...p,
      ...payload.map((item,idx)=>({id:"H" + (Date.now()) + (idx),...item}))
    ]);
    enviarWA(form.empleadoId,form.obraId,form.fecha,payload);
    setShowF(false);
    setForm({
      empleadoId: empleados.some(e=>e.id===form.empleadoId) ? form.empleadoId : firstEmpId,
      obraId: obras.some(o=>o.id===form.obraId) ? form.obraId : firstObraId,
      fecha:today(),
      turno1Inicio:"07:00",
      turno1Fin:"17:00",
      tarea1:"",
      turno2Inicio:"",
      turno2Fin:"",
      tarea2:"",
    });
  };

  const previewTurnos = buildTurnosPayload(form);

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
      <H1 title="Horarios" subtitle="Asigna hasta 2 turnos por día y notifica automáticamente por WhatsApp" action={<button style={B("#f47c20")} onClick={()=>setShowF(!showF)}>+ Asignar turnos</button>}/>
      {notif&&<div style={{background:"#e8f5ee",border:"1px solid #166534",borderRadius:10,padding:"12px 16px",marginBottom:16,fontSize:13,color:"#166534"}}>{notif}</div>}
      {showF&&(
        <div style={{...CD,marginBottom:20,border:"1px solid #cc0000"}}>
          <div style={ST}>Nuevo horario · notificación automática por WhatsApp</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:14}}>
            <div><LBL>Empleado</LBL><select value={form.empleadoId} onChange={e=>setForm({...form,empleadoId:e.target.value})} style={SI}>{empleados.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}</select></div>
            <div><LBL>Obra</LBL><select value={form.obraId} onChange={e=>setForm({...form,obraId:e.target.value})} style={SI}>{obras.map(o=><option key={o.id} value={o.id}>{o.id} · {o.cliente}</option>)}</select></div>
            <div><LBL>Fecha</LBL><input type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})} style={SI}/></div>
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

          {previewTurnos.length>0&&empSel&&obraSel&&(
            <div style={{background:"#f1f5f9",borderRadius:10,padding:14,marginBottom:14}}>
              <div style={{fontSize:11,color:"#64748b",marginBottom:6}}>Vista previa WhatsApp</div>
              <div style={{fontSize:13,color:"#1a1a2e",lineHeight:1.7,background:"#f8fafc",borderRadius:8,padding:"12px 14px"}}>
                <div>Hola <strong>{empSel.nombre}</strong>, has sido asignado a la obra <strong>{obraSel.proyecto}</strong> del cliente <strong>{obraSel.cliente}</strong>.</div>
                <div>Lugar: <strong>{obraSel.direccion||obraSel.ciudad}, {obraSel.ciudad}</strong></div>
                <div>Fecha: <strong>{fmtD(form.fecha) || form.fecha}</strong></div>
                <div style={{marginTop:8,fontWeight:600}}>Turnos asignados:</div>
                <ul style={{margin:"6px 0 0 18px",padding:0}}>
                  {previewTurnos.map((item,idx)=><li key={idx}><strong>{fmtTurno12Local(item.turno)}</strong> · {item.tarea}</li>)}
                </ul>
                <div style={{marginTop:8}}>Por favor confirma tu asistencia. <strong>INGEANCLAJES S.A.S</strong></div>
              </div>
              <div style={{fontSize:11,color:"#64748b",marginTop:8}}>+57 {empSel.tel}</div>
            </div>
          )}
          <div style={{display:"flex",gap:10}}>
            <button style={B("#4ade80","#0f2d1a")} onClick={guardar}>Guardar y enviar WhatsApp</button>
            <button style={B("#f1f5f9","#475569")} onClick={()=>setShowF(false)}>Cancelar</button>
          </div>
        </div>
      )}
      <div style={{display:"flex",gap:14,alignItems:"flex-end",marginBottom:20}}>
        <div><LBL>Filtrar por fecha</LBL><input type="date" value={fechaF} onChange={e=>setFechaF(e.target.value)} style={{...SI,width:"auto"}}/></div>
        <div style={{fontSize:13,color:"#64748b"}}>{dia.length} turno{dia.length!==1?"s":""} · {fmtD(fechaF)}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div style={CD}>
          <div style={ST}>Turnos del día</div>
          {dia.length===0?<div style={{textAlign:"center",color:"#94a3b8",fontSize:13,padding:"28px 0"}}>No hay turnos para esta fecha</div>
          :dia.map(h=>{const e=empleados.find(x=>x.id===h.empleadoId);const o=obras.find(x=>x.id===h.obraId);const idx=empleados.findIndex(x=>x.id===h.empleadoId);return(<div key={h.id} style={{background:"#f1f5f9",borderRadius:10,padding:"12px 14px",marginBottom:10}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}><Av init={e?.avatar||"?"} color={PAL[idx%PAL.length]} size={34}/><div style={{flex:1}}><div style={{fontSize:13,fontWeight:600}}>{e?.nombre}</div><div style={{fontSize:11,color:"#475569"}}>{e?.cargo}</div></div><button onClick={()=>setHorarios(p=>p.filter(x=>x.id!==h.id))} style={{background:"#fee2e2",border:"none",color:"#ef4444",borderRadius:6,width:24,height:24,cursor:"pointer",fontSize:14}}>×</button></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11,marginBottom:8}}>
              <div style={{background:"#ffffff",borderRadius:6,padding:"6px 10px"}}><div style={{color:"#64748b",marginBottom:2}}>Obra</div><div style={{color:"#1a1a2e",fontWeight:500}}>{o?.proyecto}</div><div style={{color:"#475569"}}>{o?.ciudad}</div></div>
              <div style={{background:"#ffffff",borderRadius:6,padding:"6px 10px"}}><div style={{color:"#64748b",marginBottom:2}}>Turno</div><div style={{color:"#cc0000",fontWeight:600}}>{fmtTurno12Local(h.turno)}</div><div style={{color:"#475569"}}>{h.tarea}</div></div>
            </div>
            <button onClick={()=>reenviarDiaEmpleado(h)} style={{...B("#e8f5ee","#166534"),width:"100%",justifyContent:"center",fontSize:12}}>Reenviar WhatsApp · +57 {e?.tel}</button>
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
function Vencimientos({ctx}){
  const {certs,setCerts,obras}=ctx;
  const hoy=new Date();

  const [recertForm,setRecertForm]=useState(null);   // cert base para generar recertificación
  const [recertData,setRecertData]=useState({});      // datos editables del nuevo cert
  const [imprimiendo,setImprimiendo]=useState(null);  // cert para imprimir
  const [guardado,setGuardado]=useState(null);        // confirmación

  const abrirRecert=(c)=>{
    // Pre-llena el formulario con los datos del certificado original
    setRecertData({
      obraId: c.obraId,
      tipo: "Recertificación",
      numero: "R-" + (new Date().getFullYear()) + "-" + (String(certs.length+1).padStart(3,"0")),
      fecha: today(),
      cliente: c.cliente,
      nit: c.nit||"",
      direccion: c.direccion||"",
      sistema: c.sistema,
      normativa: c.normativa||"Resolución 4272 de 2021",
      ingeniero: c.ingeniero||"ING. JHON JAIME SEPULVEDA LONDOÑO",
      matricula: c.matricula||"MP. 05256-409949",
      proxMant: "",
      elementos: [...RECERT_ELEMENTOS_DEFAULT],
      certOrigenId: c.id,
    });
    setRecertForm(c);
  };

  const guardarRecert=()=>{
    if(!recertData.fecha||!recertData.proxMant)return;
    const newId="CERT-" + (String(certs.length+1).padStart(3,"0"));
    const nuevaCert={id:newId,...recertData,estado:"Vigente"};
    // Marca la cert anterior como "Recertificado" y guarda nueva fecha
    setCerts(p=>[
      ...p.map(x=>x.id===recertForm.id?{...x,estado:"Recertificado",proxMant:recertData.proxMant}:x),
      nuevaCert
    ]);
    setGuardado(newId);
    setImprimiendo(nuevaCert);
    setRecertForm(null);
    setRecertData({});
    setTimeout(()=>setGuardado(null),4000);
  };

  const lista=certs.filter(c=>c.estado!=="Recertificado").map(c=>{
    if(!c.proxMant)return{...c,diasRestantes:null};
    const d=new Date(c.proxMant+"T12:00:00");
    const diff=Math.round((d-hoy)/(1000*60*60*24));
    return{...c,diasRestantes:diff};
  }).sort((a,b)=>{
    if(a.diasRestantes===null)return 1;
    if(b.diasRestantes===null)return -1;
    return a.diasRestantes-b.diasRestantes;
  });

  const colorV=(d)=>{
    if(d===null)return"#64748b";
    if(d<0)return"#ef4444";
    if(d<30)return"#fb923c";
    if(d<90)return"#f5c842";
    return"#4ade80";
  };
  const labelV=(d)=>{
    if(d===null)return"Sin fecha";
    if(d<0)return"VENCIDA hace " + (Math.abs(d)) + "d";
    if(d===0)return"VENCE HOY";
    if(d===1)return"Vence mañana";
    return(d) + " días";
  };

  const grupos=[
    {titulo:"Vencidas o críticas",filtro:(d)=>d!==null&&d<0,color:"#ef4444"},
    {titulo:"Urgente (menos de 30 días)",filtro:(d)=>d!==null&&d>=0&&d<30,color:"#fb923c"},
    {titulo:"Próximas (30-90 días)",filtro:(d)=>d!==null&&d>=30&&d<90,color:"#f5c842"},
    {titulo:"Al día (más de 90 días)",filtro:(d)=>d!==null&&d>=90,color:"#4ade80"},
  ];

  const certParaImpresion=imprimiendo?certs.find(x=>x.id===imprimiendo.id)||imprimiendo:null;

  return(
    <div style={{padding:28}}>
      <H1 title="Vencimientos de Certificaciones" subtitle="Control de mantenimientos y renovaciones · Res. 4272/2021"/>

      {/* Confirmación */}
      {guardado&&(
        <div style={{background:"#e8f5ee",border:"1px solid #4ade80",borderRadius:10,padding:"12px 18px",marginBottom:20,fontSize:13,color:"#166534",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>OK</span>
          <span>Recertificación <strong>{guardado}</strong> creada exitosamente. La certificación original fue marcada como <strong>Recertificado</strong>.</span>
        </div>
      )}

      {/* Modal de recertificación */}
      {recertForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20,overflowY:"auto"}}>
          <div style={{background:"#fff",borderRadius:16,padding:32,width:"100%",maxWidth:580,boxShadow:"0 20px 60px rgba(0,0,0,0.35)",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <div style={{fontSize:18,fontWeight:700,color:"#1a1a2e"}}>Generar Recertificación</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:4}}>Basada en: {recertForm.numero} · {recertForm.cliente}</div>
              </div>
              <button onClick={()=>setRecertForm(null)} style={{background:"#f1f5f9",border:"none",borderRadius:8,padding:"6px 12px",cursor:"pointer",color:"#475569",fontSize:13}}>Cerrar</button>
            </div>

            {/* Info del cert original */}
            <div style={{background:"#f8fafc",borderRadius:10,padding:12,marginBottom:20,border:"1px solid #e2e8f0",fontSize:12}}>
              <div style={{color:"#64748b",marginBottom:4}}>Certificado original</div>
              <div style={{fontWeight:700,color:"#1a1a2e"}}>{recertForm.cliente} · {recertForm.numero}</div>
              <div style={{color:"#475569"}}>{recertForm.sistema}</div>
              <div style={{color:"#ef4444",marginTop:4}}>Vencía: {fmtD(recertForm.proxMant)||"sin fecha"}</div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
              <div><LBL>N° Recertificación</LBL><input value={recertData.numero||""} onChange={e=>setRecertData(p=>({...p,numero:e.target.value}))} style={SI}/></div>
              <div><LBL>Fecha de recertificación</LBL><input type="date" value={recertData.fecha||""} onChange={e=>setRecertData(p=>({...p,fecha:e.target.value}))} style={SI}/></div>
              <div><LBL>Cliente</LBL><input value={recertData.cliente||""} onChange={e=>setRecertData(p=>({...p,cliente:e.target.value}))} style={SI}/></div>
              <div><LBL>NIT</LBL><input value={recertData.nit||""} onChange={e=>setRecertData(p=>({...p,nit:e.target.value}))} style={SI}/></div>
              <div style={{gridColumn:"span 2"}}><LBL>Dirección de la obra</LBL><input value={recertData.direccion||""} onChange={e=>setRecertData(p=>({...p,direccion:e.target.value}))} style={SI}/></div>
              <div style={{gridColumn:"span 2"}}><LBL>Sistema recertificado</LBL><textarea value={recertData.sistema||""} onChange={e=>setRecertData(p=>({...p,sistema:e.target.value}))} rows={2} style={{...SI,resize:"vertical"}}/></div>
              <div style={{gridColumn:"span 2",background:"#fff3e8",borderRadius:8,padding:12,border:"1px solid #f47c2044"}}>
                <LBL>Próximo mantenimiento (obligatorio)</LBL>
                <input type="date" value={recertData.proxMant||""} onChange={e=>setRecertData(p=>({...p,proxMant:e.target.value}))} style={{...SI,border:"2px solid #cc0000"}}/>
                {recertData.proxMant&&<div style={{fontSize:11,color:"#4ade80",marginTop:6}}>Próximo mantenimiento: <strong>{fmtD(recertData.proxMant)}</strong></div>}
              </div>
            </div>

            {!recertData.proxMant&&<div style={{background:"#fee2e2",borderRadius:6,padding:"8px 12px",fontSize:11,color:"#cc0000",marginBottom:12}}>Debes asignar la fecha del próximo mantenimiento para guardar.</div>}

            <div style={{display:"flex",gap:10}}>
              <button style={{...B("#cc0000"),flex:1,justifyContent:"center"}} onClick={guardarRecert}>
                Crear Recertificación
              </button>
              <button style={{...B("#f1f5f9","#475569"),flex:1,justifyContent:"center"}} onClick={()=>setRecertForm(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {certParaImpresion&&(
        <CertificacionDetalle
          cert={certParaImpresion}
          onVolver={()=>setImprimiendo(null)}
          onImprimir={(cert)=>printCurrentPz("Certificación " + (cert?.numero || cert?.id || ""))}
          subtitle="Vista previa completa del certificado o recertificación."
        />
      )}

      {!certParaImpresion&&(
        <>
          {/* ── GRUPOS POR ESTADO ── */}
          {grupos.map(g=>{
            const items=lista.filter(c=>g.filtro(c.diasRestantes));
            if(!items.length)return null;
            return(
              <div key={g.titulo} style={{...CD,marginBottom:20,borderLeft:"4px solid " + (g.color)}}>
                <div style={{...ST,color:g.color,borderBottomColor:g.color+"33"}}>{g.titulo}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                  {items.map(c=>{
                    const cActual=certs.find(x=>x.id===c.id)||c;
                    const dActual=(()=>{
                      if(!cActual.proxMant)return null;
                      const d=new Date(cActual.proxMant+"T12:00:00");
                      return Math.round((d-hoy)/(1000*60*60*24));
                    })();
                    const ob=obras.find(o=>o.id===cActual.obraId);
                    return(
                      <div key={cActual.id}
                        style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",border:"1px solid " + (colorV(dActual)) + "44",cursor:dActual!==null&&dActual<0?"pointer":"default",transition:"box-shadow 0.15s"}}
                        onClick={dActual!==null&&dActual<0?(()=>abrirRecert(cActual)):undefined}
                        onMouseEnter={dActual!==null&&dActual<0?(e=>e.currentTarget.style.boxShadow="0 0 0 3px #ef444433"):undefined}
                        onMouseLeave={dActual!==null&&dActual<0?(e=>e.currentTarget.style.boxShadow="none"):undefined}
                        title={dActual!==null&&dActual<0?"Clic para recertificar":undefined}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                          <div>
                            <div style={{fontSize:10,color:"#64748b"}}>{cActual.id} · {cActual.numero}</div>
                            <div style={{fontSize:14,fontWeight:700,color:"#1a1a2e",marginTop:2}}>{cActual.cliente}</div>
                            <div style={{fontSize:11,color:"#475569"}}>{cActual.tipo}</div>
                            {dActual!==null&&dActual<0&&(
                              <div style={{background:"#ef444422",border:"1px solid #ef4444",borderRadius:6,padding:"3px 8px",marginTop:6,fontSize:10,color:"#ef4444",fontWeight:700,display:"inline-block"}}>
                                Clic para recertificar
                              </div>
                            )}
                          </div>
                          <div style={{background:colorV(dActual)+"22",border:"2px solid " + (colorV(dActual)),borderRadius:10,padding:"8px 12px",textAlign:"center",minWidth:72}}>
                            <div style={{fontSize:20,fontWeight:900,color:colorV(dActual),lineHeight:1}}>
                              {dActual===null?"—":dActual<0?Math.abs(dActual):dActual}
                            </div>
                            <div style={{fontSize:9,color:colorV(dActual),fontWeight:600,marginTop:2}}>
                              {dActual===null?"sin fecha":dActual<0?"días vencida":"días restantes"}
                            </div>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                          <div style={{background:"#fff",borderRadius:6,padding:"7px 10px"}}>
                            <div style={{fontSize:9,color:"#64748b"}}>Certificado</div>
                            <div style={{fontSize:11,fontWeight:600}}>{fmtD(cActual.fecha)}</div>
                          </div>
                          <div style={{background:"#fff",borderRadius:6,padding:"7px 10px"}}>
                            <div style={{fontSize:9,color:"#64748b"}}>Próx. mantenimiento</div>
                            <div style={{fontSize:11,fontWeight:600,color:colorV(dActual)}}>{fmtD(cActual.proxMant)||"—"}</div>
                          </div>
                        </div>
                        <div style={{fontSize:11,color:"#475569",marginBottom:8,lineHeight:1.4}}>{cActual.sistema}</div>
                        {ob&&<div style={{fontSize:10,color:"#64748b",marginBottom:10}}>{ob.direccion||ob.ciudad}</div>}
                        <div style={{background:colorV(dActual)+"18",border:"1px solid " + (colorV(dActual)) + "44",borderRadius:8,padding:"6px 10px",textAlign:"center",marginBottom:10}}>
                          <div style={{fontSize:12,fontWeight:700,color:colorV(dActual)}}>{labelV(dActual)}</div>
                        </div>
                        <div style={{display:"flex",gap:6}}>
                          <button
                            style={{...B(dActual!==null&&dActual<0?"#7c1010":"#cc0000"),fontSize:11,padding:"7px 10px",flex:1,justifyContent:"center",border:dActual!==null&&dActual<0?"2px solid #ef4444":"none"}}
                            onClick={(event)=>{event.stopPropagation();abrirRecert(cActual);}}>
                            {dActual!==null&&dActual<0 ? "Recertificar ahora" : "Generar recertificación"}
                          </button>
                          <button
                            style={{...B("#e8f5ee","#166534"),border:"1px solid #4ade80",fontSize:11,padding:"7px 10px",flex:"0 0 auto",justifyContent:"center"}}
                            onClick={(event)=>{event.stopPropagation();setImprimiendo(cActual);}}>
                            Ver PDF
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* ── SIN FECHA ── */}
          {lista.filter(c=>c.diasRestantes===null).length>0&&(
            <div style={{...CD,borderLeft:"4px solid #64748b"}}>
              <div style={{...ST,color:"#64748b"}}>Sin fecha de mantenimiento asignada</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
                {lista.filter(c=>c.diasRestantes===null).map(c=>(
                  <div key={c.id} style={{background:"#f8fafc",borderRadius:10,padding:"14px 16px",border:"1px solid #e2e8f0"}}>
                    <div style={{fontSize:10,color:"#64748b"}}>{c.id} · {c.numero}</div>
                    <div style={{fontSize:14,fontWeight:700}}>{c.cliente}</div>
                    <div style={{fontSize:11,color:"#475569",marginBottom:12}}>{c.tipo} · {fmtD(c.fecha)}</div>
                    <div style={{display:"flex",gap:6}}>
                      <button style={{...B("#cc0000"),fontSize:11,flex:1,justifyContent:"center"}} onClick={()=>abrirRecert(c)}>
                        Generar recertificación
                      </button>
                      <button style={{...B("#e8f5ee","#166534"),border:"1px solid #4ade80",fontSize:11,flex:"0 0 auto",justifyContent:"center"}} onClick={()=>setImprimiendo(c)}>
                        Ver PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
