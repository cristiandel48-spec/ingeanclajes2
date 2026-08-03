import Badge from "../../components/ui/Badge";
import CampoTexto from "../../components/ui/CampoTexto";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { avisoCelular, avisoCorreo, normalizarCorreo, normalizarDocumento, normalizarFrase, normalizarNombrePropio, normalizarTelefono } from "../../lib/normalizarEntrada";
import { useEffect, useState } from "react";
import { B, CD, SI, ST } from "../../styles/tokens";
import { downloadExcelWorkbook } from "../../lib/nomina";
import { fmt, scrollAppToTop, today } from "../../lib/format";
import { parseIsoDate } from "../../lib/dates";
export default function CuentasPagar({ctx}){
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
    if(!provForm.nombre.trim()){
      window.alert("Falta el nombre o razón social del proveedor.");
      return;
    }
    // Se acomoda tambien aqui, no solo al salir del campo: quien pega el dato
    // y guarda de una nunca dispara el onBlur.
    const nombreLimpio=normalizarNombrePropio(provForm.nombre);
    const telefonoLimpio=normalizarTelefono(provForm.telefono);
    const repetido=proveedores.find(p=>p.id!==editProvId && normalizarNombrePropio(p.nombre)===nombreLimpio);
    if(repetido && !window.confirm(`Ya existe un proveedor llamado ${nombreLimpio} (${repetido.id}).\n\n¿Aun así quieres crearlo otra vez?`)) return;
    const payload={
      ...provForm,
      nombre:nombreLimpio,
      telefono:telefonoLimpio,
      tel:telefonoLimpio,
      numeroCuenta:normalizarDocumento(provForm.numeroCuenta),
      banco:normalizarNombrePropio(provForm.banco),
      direccion:normalizarFrase(provForm.direccion),
      nit:normalizarDocumento(provForm.nit),
      contacto:normalizarNombrePropio(provForm.contacto),
      email:normalizarCorreo(provForm.email),
      categoria:normalizarFrase(provForm.categoria)||"General",
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
                <CampoTexto label="Nombre del proveedor" valor={provForm.nombre} onChange={v=>setProvForm({...provForm,nombre:v})}
                  normalizar={normalizarNombrePropio} placeholder="Razón social o nombre comercial" autoCapitalize="words"/>
                <CampoTexto label="NIT" valor={provForm.nit} onChange={v=>setProvForm({...provForm,nit:v})}
                  normalizar={normalizarDocumento} placeholder="900.123.456-7" spellCheck={false}/>
                <CampoTexto label="Contacto" valor={provForm.contacto} onChange={v=>setProvForm({...provForm,contacto:v})}
                  normalizar={normalizarNombrePropio} placeholder="Nombre del contacto" autoCapitalize="words"/>
                <CampoTexto label="Teléfono" valor={provForm.telefono} onChange={v=>setProvForm({...provForm,telefono:v})}
                  normalizar={normalizarTelefono} revisar={avisoCelular} placeholder="3001234567" inputMode="tel" spellCheck={false}/>
                <CampoTexto label="Banco" valor={provForm.banco} onChange={v=>setProvForm({...provForm,banco:v})}
                  normalizar={normalizarNombrePropio} placeholder="Bancolombia" autoCapitalize="words"/>
                <CampoTexto label="Número de cuenta" valor={provForm.numeroCuenta} onChange={v=>setProvForm({...provForm,numeroCuenta:v})}
                  normalizar={normalizarDocumento} placeholder="123-456789-10" inputMode="numeric" spellCheck={false}/>
                <CampoTexto label="Dirección" valor={provForm.direccion} onChange={v=>setProvForm({...provForm,direccion:v})}
                  normalizar={normalizarFrase} placeholder="Dirección principal del proveedor" wrapStyle={{gridColumn:"span 2"}}/>
                <CampoTexto label="Categoría" valor={provForm.categoria} onChange={v=>setProvForm({...provForm,categoria:v})}
                  normalizar={normalizarFrase} placeholder="Materiales / Transporte / Servicios"/>
                <div>
                  <LBL>Régimen tributario</LBL>
                  <select value={provForm.regimenTributario} onChange={e=>setProvForm({...provForm,regimenTributario:e.target.value})} style={SI}>
                    <option value="Ordinario">Ordinario</option>
                    <option value="Simple">Simple</option>
                    <option value="No responsable de IVA">No responsable de IVA</option>
                  </select>
                </div>
                <CampoTexto label="Municipio ICA" valor={provForm.municipioIca} onChange={v=>setProvForm({...provForm,municipioIca:v})}
                  normalizar={normalizarNombrePropio} placeholder="Envigado / Medellín" autoCapitalize="words"/>
                <div>
                  <LBL>Código ICA</LBL>
                  <input value={provForm.codigoIca} onChange={e=>setProvForm({...provForm,codigoIca:e.target.value})} placeholder="Actividad ICA" style={SI}/>
                </div>
                <div style={{display:"flex",gap:12,alignItems:"center",paddingTop:26,gridColumn:"span 3",flexWrap:"wrap"}}>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#334155"}}><input type="checkbox" checked={provForm.responsableIva} onChange={e=>setProvForm({...provForm,responsableIva:e.target.checked})}/> Responsable de IVA</label>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#334155"}}><input type="checkbox" checked={provForm.agenteReteiva} onChange={e=>setProvForm({...provForm,agenteReteiva:e.target.checked})}/> Agente reteIVA</label>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#334155"}}><input type="checkbox" checked={provForm.autorretenedorRenta} onChange={e=>setProvForm({...provForm,autorretenedorRenta:e.target.checked})}/> Autorretenedor renta</label>
                </div>
                <CampoTexto label="Email" valor={provForm.email} onChange={v=>setProvForm({...provForm,email:v})}
                  normalizar={normalizarCorreo} revisar={avisoCorreo} placeholder="correo@proveedor.com"
                  inputMode="email" autoCapitalize="off" spellCheck={false} wrapStyle={{gridColumn:"span 3"}}/>
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

