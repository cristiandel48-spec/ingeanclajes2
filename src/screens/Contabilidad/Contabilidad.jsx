import Badge from "../../components/ui/Badge";
import H1 from "../../components/ui/H1";
import LBL from "../../components/ui/LBL";
import { useEffect, useState } from "react";
import { ACCOUNTING_NORMATIVE_NOTE, buildCombinedEntries, buildDefaultPlanCuentas, buildEmptyManualAsiento, buildEmptyPlanCuenta, buildFinancialStatements, buildTrialBalance, createAsientoLine, filterEntriesByPeriod, getAccountGroupOptions, getStatementCategoryOptions, isBalancedEntry, normalizeAsientoContable, normalizeContabilidadConfig, normalizePlanCuenta, summarizeEntries } from "../../lib/accounting";
import { B, CD, SI, ST } from "../../styles/tokens";
import { CONTABILIDAD_CONFIG_INIT, PLAN_CUENTAS_INIT } from "../../data/seed";
import { buildMonthDateRange, fmt, fmtD, isDateWithinRange, today } from "../../lib/format";
import { downloadExcelWorkbook } from "../../lib/nomina";
import { printCurrentPz } from "../../lib/print";
export default function Contabilidad({ctx}){
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
    {codigo:configActual.cuentaRetefuente, etiqueta:"Retefuente", color:"#cc0000"},
    {codigo:configActual.cuentaReteiva, etiqueta:"ReteIVA", color:"#475467"},
    {codigo:configActual.cuentaReteica, etiqueta:"ReteICA", color:"#0f766e"},
    {codigo:configActual.cuentaIvaDescontable, etiqueta:"IVA descontable", color:"#475467"},
    {codigo:configActual.cuentaIvaGenerado, etiqueta:"IVA generado", color:"#027a48"},
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
            <button style={B("#101828")} onClick={()=>setTab("comprobantes")}>Comprobantes</button>
            <button style={B("#101828")} onClick={()=>setTab("reportes")}>Reportes</button>
          </div>
        }
      />

      <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
        {[
          ["resumen","Resumen","#cc0000","#f2f4f7","#475467"],
          ["catalogo","Catalogo","#101828","#fafafa","#475467"],
          ["comprobantes","Comprobantes","#027a48","#ecfdf5","#027a48"],
          ["reportes","Reportes","#475467","#faf5ff","#475467"],
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
              <div style={{fontSize:13,color:"#475467",lineHeight:1.7}}>
                <div><strong style={{color:"#101828"}}>Marco sugerido:</strong> {configActual.marcoNormativoLabel}</div>
                <div><strong style={{color:"#101828"}}>UVT 2026:</strong> {fmt(configActual.uvt)}</div>
                <div><strong style={{color:"#101828"}}>Moneda:</strong> {configActual.moneda}</div>
                <div><strong style={{color:"#101828"}}>Automatico CxC:</strong> {configActual.autoCxc ? "Activo" : "Inactivo"}</div>
                <div><strong style={{color:"#101828"}}>Automatico CxP:</strong> {configActual.autoCxp ? "Activo" : "Inactivo"}</div>
                <div><strong style={{color:"#101828"}}>Automatico nómina:</strong> {configActual.autoNomina ? "Activo" : "Inactivo"}</div>
                <div style={{marginTop:10,background:"#fafafa",border:"1px solid #eaecf0",borderRadius:12,padding:"12px 14px"}}>
                  {ACCOUNTING_NORMATIVE_NOTE}
                </div>
              </div>
            </div>
            <div style={CD}>
              <div style={ST}>Alertas operativas</div>
              <div style={{display:"grid",gap:12}}>
                <div style={{background:"#fafafa",border:"1px solid #eaecf0",borderRadius:12,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"#475467",textTransform:"uppercase",marginBottom:4}}>Comprobantes automáticos</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#475467"}}>{resumenPeriodo.totalAutomaticos}</div>
                  <div style={{fontSize:12,color:"#667085",marginTop:6}}>
                    CxC: {automaticosCxc} · CxP: {automaticosCxp} · Nómina: {automaticosNomina}
                  </div>
                </div>
                <div style={{background:"#faf5ff",border:"1px solid #e9d5ff",borderRadius:12,padding:"12px 14px"}}>
                  <div style={{fontSize:11,color:"#475467",textTransform:"uppercase",marginBottom:4}}>Nóminas generadas</div>
                  <div style={{fontSize:22,fontWeight:800,color:"#475467"}}>{nominasProcesadas}</div>
                  <div style={{fontSize:12,color:"#667085",marginTop:6}}>Cada nómina puede causar gasto y, al descargar el plano banco, generar egreso bancario.</div>
                </div>
                <div style={{fontSize:12,color:"#667085",lineHeight:1.7}}>
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
                <button style={B("#101828")} onClick={()=>{setShowCuentaForm(true);setCuentaForm(buildEmptyPlanCuenta());setEditCuentaId(null);}}>+ Nueva cuenta</button>
                <button style={B("#f2f4f7","#475467")} onClick={()=>setPlanCuentas(buildDefaultPlanCuentas())}>Restablecer base</button>
              </div>
            </div>
            <div style={{marginBottom:12}}><input value={busquedaCuenta} onChange={(e)=>setBusquedaCuenta(e.target.value)} placeholder="Busca por codigo, nombre o categoria" style={SI}/></div>
            {showCuentaForm && <div style={{background:"#fafafa",border:"1px solid #dbe4f0",borderRadius:12,padding:16,marginBottom:14}}>
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
                <button style={B("#101828")} onClick={guardarCuentaPlan}>{editCuentaId?"Guardar cambios":"Guardar cuenta"}</button>
                <button style={B("#f2f4f7","#475467")} onClick={resetCuentaPlan}>Cancelar</button>
              </div>
            </div>}
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#f2f4f7"}}>{["Codigo","Cuenta","Grupo","Categoria","Naturaleza","Estado","Acciones"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:"left",color:"#667085",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                <tbody>
                  {cuentasFiltradas.map((cuenta)=>(
                    <tr key={cuenta.codigo} style={{borderBottom:"1px solid #eaecf0"}}>
                      <td style={{padding:"10px",fontWeight:700,color:"#101828"}}>{cuenta.codigo}</td>
                      <td style={{padding:"10px"}}>{cuenta.nombre}</td>
                      <td style={{padding:"10px"}}>{cuenta.grupoReporteLabel}</td>
                      <td style={{padding:"10px"}}>{cuenta.categoriaEstadoLabel}</td>
                      <td style={{padding:"10px"}}>{cuenta.naturaleza}</td>
                      <td style={{padding:"10px"}}><Badge estado={cuenta.activo?"Activa":"Inactiva"}/></td>
                      <td style={{padding:"10px"}}>
                        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                          <button style={{...B("#f2f4f7","#475467"),padding:"6px 10px",fontSize:11}} onClick={()=>editarCuentaPlan(cuenta)}>Editar</button>
                          <button style={{...B(cuenta.activo?"#f2f4f7":"#ecfdf5",cuenta.activo?"#475467":"#027a48"),padding:"6px 10px",fontSize:11}} onClick={()=>alternarCuentaActiva(cuenta.codigo)}>{cuenta.activo?"Desactivar":"Activar"}</button>
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
              <div style={{fontSize:12,color:"#667085"}}>
                {mostrarComprobantesBuscados
                  ? `${asientosFiltrados.length} comprobante(s) visibles en ${periodo || "todos los periodos"}.`
                  : `Escribe en el buscador para consultar comprobantes de ${periodo || "todos los periodos"}.`}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button style={B("#027a48")} onClick={()=>{setShowAsientoForm(true);setAsientoForm(buildEmptyManualAsiento(manuales, today()));setEditAsientoId(null);}}>+ Nuevo comprobante</button>
            </div>
          </div>

          {showAsientoForm && (
            <div style={{...CD,border:"1px solid #027a48"}}>
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
                    style={{...SI,background:"#fafafa",color:"#475467"}}
                    placeholder="Se completa con el NIT"
                  />
                </div>
                <div><LBL>Soporte</LBL><input value={asientoForm.soporte} onChange={(e)=>setAsientoForm({...asientoForm,soporte:e.target.value})} style={SI}/></div>
                <div><LBL>Nombre tercero</LBL><input value={asientoForm.terceroNombre || ""} readOnly style={{...SI,background:"#fafafa",color:"#475467"}} placeholder="Se completa con el tercero"/></div>
                <div style={{gridColumn:"span 4"}}><LBL>Descripcion</LBL><input value={asientoForm.descripcion} onChange={(e)=>setAsientoForm({...asientoForm,descripcion:e.target.value})} style={SI}/></div>
              </div>

              <div style={{overflowX:"auto",marginBottom:12}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:980}}>
                  <thead><tr style={{background:"#f2f4f7"}}>{["Cuenta","Detalle","Tercero","Centro costo","Debito","Credito",""].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:label==="Debito"||label==="Credito"?"right":"left",color:"#667085",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                  <tbody>
                    {(asientoForm.lineas || []).map((linea)=>(
                      <tr key={linea.id} style={{borderBottom:"1px solid #eaecf0"}}>
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
                          <div style={{fontSize:10,color:"#667085",marginTop:4}}>
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
                  <button style={B("#101828")} onClick={agregarLinea}>+ Linea</button>
                  <button style={B("#101828")} onClick={guardarAsiento}>{editAsientoId?"Guardar cambios":"Guardar comprobante"}</button>
                  <button style={B("#f2f4f7","#475467")} onClick={resetAsiento}>Cancelar</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,auto)",gap:12,fontSize:12}}>
                  <div><strong>Debito:</strong> {fmt(totalDebitoForm)}</div>
                  <div><strong>Credito:</strong> {fmt(totalCreditoForm)}</div>
                  <div><strong>Diferencia:</strong> <span style={{color:diferenciaForm===0?"#027a48":"#cc0000"}}>{fmt(diferenciaForm)}</span></div>
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
                <div key={entry.id} style={{border:"1px solid #eaecf0",borderRadius:12,overflow:"hidden",background:"#fff"}}>
                  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",padding:"12px 14px",background:entry.automatico?"#fafafa":"#fafafa",borderBottom:"1px solid #eaecf0",flexWrap:"wrap"}}>
                    <div>
                      <div style={{fontWeight:800,color:"#101828"}}>{entry.consecutivo || entry.id} · {entry.tipoComprobante}</div>
                      <div style={{fontSize:12,color:"#667085",marginTop:4}}>{fmtD(entry.fecha)} · {entry.descripcion}</div>
                      <div style={{fontSize:12,color:"#475467",marginTop:6}}>
                        <strong>NIT:</strong> {entry.terceroNit || "—"} · <strong>Tercero:</strong> {entry.terceroNombre || "Sin tercero"}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                      <Badge estado={entry.automatico?"Automatico":entry.estado}/>
                      {!entry.automatico && <button style={{...B("#f2f4f7","#475467"),padding:"6px 10px",fontSize:11}} onClick={()=>editarAsiento(entry)}>Editar</button>}
                      {!entry.automatico && entry.estado!=="Anulado" && <button style={{...B("#fff1f2","#be123c"),padding:"6px 10px",fontSize:11}} onClick={()=>anularAsiento(entry.id)}>Anular</button>}
                    </div>
                  </div>
                  <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:760}}>
                      <thead><tr style={{background:"#fafafa"}}>{["Cuenta","Detalle","Tercero","Centro costo","Debito","Credito"].map((label)=><th key={label} style={{padding:"8px 10px",textAlign:label==="Debito"||label==="Credito"?"right":"left",fontSize:11,color:"#667085"}}>{label}</th>)}</tr></thead>
                      <tbody>
                        {(entry.lineas || []).map((linea)=>(
                          <tr key={linea.id} style={{borderTop:"1px solid #f2f4f7"}}>
                            <td style={{padding:"8px 10px"}}>{linea.cuentaCodigo} · {linea.cuentaNombre}</td>
                            <td style={{padding:"8px 10px"}}>{linea.detalle || "—"}</td>
                            <td style={{padding:"8px 10px"}}>{(linea.terceroNit || entry.terceroNit) ? `${linea.terceroNit || entry.terceroNit} · ` : ""}{linea.terceroNombre || entry.terceroNombre || "—"}</td>
                            <td style={{padding:"8px 10px"}}>{linea.centroCosto || "—"}</td>
                            <td style={{padding:"8px 10px",textAlign:"right",color:"#027a48"}}>{fmt(linea.debito)}</td>
                            <td style={{padding:"8px 10px",textAlign:"right",color:"#475467"}}>{fmt(linea.credito)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot><tr style={{background:"#fafafa"}}><td colSpan={4} style={{padding:"8px 10px",fontWeight:700}}>Totales</td><td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#027a48"}}>{fmt(entry.totalDebito)}</td><td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:"#475467"}}>{fmt(entry.totalCredito)}</td></tr></tfoot>
                    </table>
                  </div>
                </div>
              ))}
              {!asientosFiltrados.length && (
                <div style={{border:"1px dashed #d0d5dd",borderRadius:14,background:"#fafafa",padding:"22px",textAlign:"center",color:"#667085",fontSize:13}}>
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
              <div style={{fontSize:24,fontWeight:800,color:"#101828"}}>Reportes contables</div>
              <div style={{fontSize:12,color:"#667085",marginTop:4}}>Estados financieros, libro auxiliar por cuenta/tercero y conciliación bancaria para {periodo || "todos los periodos"}.</div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <input type="month" value={periodo} onChange={(e)=>setPeriodo(e.target.value)} style={{...SI,width:"auto"}}/>
              <button style={B("#027a48")} onClick={exportarExcelContabilidad}>Exportar Excel</button>
              <button style={B("#475467")} onClick={()=>printCurrentPz("Contabilidad " + (periodo || "general"))}>Imprimir</button>
            </div>
          </div>

          <div style={{display:"flex",gap:8,marginBottom:18,flexWrap:"wrap"}}>
            {[
              ["general","Vista general","#475467","#faf5ff","#475467"],
              ["movimientos","Auxiliar por cuenta","#101828","#fafafa","#475467"],
              ["conciliacion","Conciliación bancaria","#027a48","#ecfdf5","#027a48"],
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
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Ingresos</span><strong style={{color:"#027a48"}}>{fmt(estados.resultados.totalIngresos)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Costos</span><strong style={{color:"#475467"}}>{fmt(estados.resultados.totalCostos)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Utilidad bruta</span><strong style={{color:estados.resultados.utilidadBruta>=0?"#027a48":"#cc0000"}}>{fmt(estados.resultados.utilidadBruta)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Gastos</span><strong style={{color:"#475467"}}>{fmt(estados.resultados.totalGastos)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"1px solid #eaecf0"}}><span>Utilidad operacional</span><strong style={{color:estados.resultados.utilidadOperacional>=0?"#027a48":"#cc0000"}}>{fmt(estados.resultados.utilidadOperacional)}</strong></div>
                  </div>
                </div>
                <div style={CD}>
                  <div style={ST}>Estado de situacion financiera</div>
                  <div style={{display:"grid",gap:8,fontSize:13}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Activos</span><strong style={{color:"#027a48"}}>{fmt(estados.balance.totalActivos)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Pasivos</span><strong style={{color:"#475467"}}>{fmt(estados.balance.totalPasivos)}</strong></div>
                    <div style={{display:"flex",justifyContent:"space-between"}}><span>Patrimonio total</span><strong style={{color:"#101828"}}>{fmt(estados.balance.totalPatrimonio)}</strong></div>
                  </div>
                </div>
              </div>

              <div style={{...CD,marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                  <div>
                    <div style={ST}>Saldos tributarios relevantes</div>
                    <div style={{fontSize:12,color:"#667085"}}>Consulta rápida de retenciones e IVA del periodo.</div>
                  </div>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    {cuentasTributariasRapidas.map((item)=>(
                      <button key={item.codigo} style={{...B("#fafafa",item.color),border:`1px solid ${item.color}`}} onClick={()=>aplicarConsultaTributaria(item.codigo)}>
                        {item.etiqueta}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:820}}>
                    <thead><tr style={{background:"#f2f4f7"}}>{["Consulta","Codigo","Cuenta","Debitos","Creditos","Saldo natural"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:["Debitos","Creditos","Saldo natural"].includes(label)?"right":"left",color:"#667085",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                    <tbody>
                      {saldosTributarios.map((row)=>(
                        <tr key={row.codigo} style={{borderBottom:"1px solid #eaecf0"}}>
                          <td style={{padding:"8px 10px",fontWeight:700,color:row.color}}>{row.etiqueta}</td>
                          <td style={{padding:"8px 10px",fontWeight:700,color:"#101828"}}>{row.codigo}</td>
                          <td style={{padding:"8px 10px"}}>{row.nombre}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#027a48"}}>{fmt(row.debitos)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#475467"}}>{fmt(row.creditos)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:Number(row.saldoNatural || 0)>=0?"#101828":"#cc0000"}}>{fmt(row.saldoNatural)}</td>
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
                    <thead><tr style={{background:"#f2f4f7"}}>{["Codigo","Cuenta","Grupo","Debitos","Creditos","Saldo natural"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:["Debitos","Creditos","Saldo natural"].includes(label)?"right":"left",color:"#667085",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                    <tbody>
                      {balancePrueba.map((row)=>(
                        <tr key={row.codigo} style={{borderBottom:"1px solid #eaecf0"}}>
                          <td style={{padding:"8px 10px",fontWeight:700,color:"#101828"}}>{row.codigo}</td>
                          <td style={{padding:"8px 10px"}}>{row.nombre}</td>
                          <td style={{padding:"8px 10px"}}>{row.grupoReporteLabel}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#027a48"}}>{fmt(row.debitos)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#475467"}}>{fmt(row.creditos)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:row.saldoNatural>=0?"#101828":"#cc0000"}}>{fmt(row.saldoNatural)}</td>
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
                    <thead><tr style={{background:"#f2f4f7"}}>{["Fecha","Comprobante","NIT","Tercero","Descripcion","Origen","Debito","Credito"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:label==="Debito"||label==="Credito"?"right":"left",color:"#667085",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                    <tbody>
                      {asientosFiltrados.map((entry)=>(
                        <tr key={entry.id} style={{borderBottom:"1px solid #eaecf0"}}>
                          <td style={{padding:"8px 10px"}}>{fmtD(entry.fecha)}</td>
                          <td style={{padding:"8px 10px",fontWeight:700,color:"#101828"}}>{entry.consecutivo || entry.id}</td>
                          <td style={{padding:"8px 10px"}}>{entry.terceroNit || "—"}</td>
                          <td style={{padding:"8px 10px"}}>{entry.terceroNombre || "Sin tercero"}</td>
                          <td style={{padding:"8px 10px"}}>{entry.descripcion}</td>
                          <td style={{padding:"8px 10px"}}>{entry.automatico?"Automatico":"Manual"}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#027a48"}}>{fmt(entry.totalDebito)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#475467"}}>{fmt(entry.totalCredito)}</td>
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
                  <div style={{fontSize:12,color:"#667085"}}>
                    {movimientosCuenta.length} movimiento(s) · Débitos {fmt(resumenAuxiliar.debitos)} · Créditos {fmt(resumenAuxiliar.creditos)} · Saldo {fmt(resumenAuxiliar.saldo)}
                  </div>
                  <div style={{fontSize:12,color:"#667085"}}>
                    {filtroTerceroMovimientoRef ? `Filtro tercero: ${filtroTerceroMovimientoRef}` : "Sin filtro de tercero"}
                  </div>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1200}}>
                    <thead>
                      <tr style={{background:"#f2f4f7"}}>
                        {["Fecha","Comprobante","Cuenta","NIT","Tercero","Detalle","Centro costo","Debito","Credito","Saldo acumulado","Origen"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:["Debito","Credito","Saldo acumulado"].includes(label)?"right":"left",color:"#667085",fontWeight:600,fontSize:11}}>{label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {movimientosCuenta.length===0 ? (
                        <tr>
                          <td colSpan={11} style={{padding:18,textAlign:"center",color:"#98a2b3"}}>
                            No hay movimientos para ese NIT, cédula, tercero o cuenta en el rango seleccionado.
                          </td>
                        </tr>
                      ) : movimientosCuenta.map((row)=>(
                        <tr key={row.rowId} style={{borderBottom:"1px solid #eaecf0"}}>
                          <td style={{padding:"8px 10px"}}>{fmtD(row.fecha)}</td>
                          <td style={{padding:"8px 10px",fontWeight:700,color:"#101828"}}>{row.consecutivo}</td>
                          <td style={{padding:"8px 10px"}}>{row.cuentaCodigo} · {row.cuentaNombre || "Cuenta"}</td>
                          <td style={{padding:"8px 10px"}}>{row.terceroNit || "—"}</td>
                          <td style={{padding:"8px 10px"}}>{row.terceroNombre || "Sin tercero"}</td>
                          <td style={{padding:"8px 10px"}}>{row.detalle || row.descripcion || "—"}</td>
                          <td style={{padding:"8px 10px"}}>{row.centroCosto || "—"}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#027a48"}}>{fmt(row.debito)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#475467"}}>{fmt(row.credito)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:Number(row.saldoAcumulado || 0)>=0?"#101828":"#cc0000"}}>{fmt(row.saldoAcumulado)}</td>
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
                  <label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,color:"#475467",paddingBottom:12}}>
                    <input type="checkbox" checked={soloPendientesConciliacion} onChange={(e)=>setSoloPendientesConciliacion(e.target.checked)}/>
                    Mostrar solo pendientes
                  </label>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button style={B("#027a48")} onClick={()=>marcarMovimientosConciliacionVisible(true)}>Marcar visibles conciliados</button>
                    <button style={B("#f2f4f7","#475467")} onClick={()=>marcarMovimientosConciliacionVisible(false)}>Quitar conciliación visible</button>
                  </div>
                  <div style={{fontSize:12,color:"#667085"}}>
                    Cuenta de trabajo: <strong>{cuentaConciliacion || "Sin seleccionar"}</strong>
                  </div>
                </div>
              </div>
              <div style={CD}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                  <div>
                    <div style={ST}>Conciliación bancaria</div>
                    <div style={{fontSize:12,color:"#667085"}}>Selecciona los movimientos del banco conciliados a cierre de mes.</div>
                  </div>
                  <div style={{fontSize:12,color:"#667085"}}>
                    Débitos {fmt(resumenConciliacion.debitos)} · Créditos {fmt(resumenConciliacion.creditos)}
                  </div>
                </div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:1120}}>
                    <thead><tr style={{background:"#f2f4f7"}}>{["OK","Fecha","Comprobante","Detalle","NIT","Tercero","Debito","Credito","Saldo","Origen"].map((label)=><th key={label} style={{padding:"9px 10px",textAlign:["Debito","Credito","Saldo"].includes(label)?"right":"left",color:"#667085",fontWeight:600,fontSize:11}}>{label}</th>)}</tr></thead>
                    <tbody>
                      {movimientosConciliacionVisibles.length===0 ? (
                        <tr><td colSpan={10} style={{padding:18,textAlign:"center",color:"#98a2b3"}}>No hay movimientos bancarios para el filtro actual.</td></tr>
                      ) : movimientosConciliacionVisibles.map((row)=>(
                        <tr key={row.rowId} style={{borderBottom:"1px solid #eaecf0",background:row.conciliado?"#f0fdf4":"#fff"}}>
                          <td style={{padding:"8px 10px"}}>
                            <input type="checkbox" checked={row.conciliado} onChange={()=>alternarMovimientoConciliado(row.rowId)}/>
                          </td>
                          <td style={{padding:"8px 10px"}}>{fmtD(row.fecha)}</td>
                          <td style={{padding:"8px 10px",fontWeight:700,color:"#101828"}}>{row.consecutivo}</td>
                          <td style={{padding:"8px 10px"}}>{row.detalle || row.descripcion || "—"}</td>
                          <td style={{padding:"8px 10px"}}>{row.terceroNit || "—"}</td>
                          <td style={{padding:"8px 10px"}}>{row.terceroNombre || "Sin tercero"}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#027a48"}}>{fmt(row.debito)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",color:"#475467"}}>{fmt(row.credito)}</td>
                          <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:Number(row.saldoAcumulado || 0)>=0?"#101828":"#cc0000"}}>{fmt(row.saldoAcumulado)}</td>
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

