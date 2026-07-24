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
import Cotizacion from "./screens/Cotizacion/Cotizacion";
import CotizacionPrint from "./screens/Cotizacion/CotizacionPrint";
import ClientesDB from "./screens/Clientes/ClientesDB";
import Pagos from "./screens/Pagos/Pagos";
import Informes from "./screens/Informes/Informes";
import Certificaciones from "./screens/Certificaciones/Certificaciones";
import CertificacionDetalle from "./screens/Certificaciones/CertificacionDetalle";
import CertificacionDocumento from "./screens/Certificaciones/CertificacionDocumento";
import Obras from "./screens/Obras/Obras";
import ObraDetalle from "./screens/Obras/ObraDetalle";
import Planos from "./screens/Planos/Planos";
import { CERT_ELEMENTOS_DEFAULT, RECERT_ELEMENTOS_DEFAULT, CERT_ELEMENTOS_BY_SISTEMA, getCertDefaultElements, buildCertForm } from "./screens/Certificaciones/certConfig";
import Financiero from "./screens/Financiero/Financiero";
import Dashboard from "./screens/Dashboard/Dashboard";
import Vencimientos from "./screens/Vencimientos/Vencimientos";
import Horarios from "./screens/Horarios/Horarios";
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
