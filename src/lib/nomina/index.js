// Dominio de nomina: constantes CO 2026, calculos, prestaciones,
// incapacidades, plano banco, almacenamiento local y export a Excel.
import { today } from "../format";
import { parseIsoDate, diffDaysInclusive, toIsoDate, addDaysToDate, maxDate, minDate, round1, getDaysInMonth } from "../dates";
import { escapeXml } from "../html";
import { downloadGeneratedFile, sanitizeFileName } from "../download";

export const NOMINA_CO_2026 = {
  salarioMinimo: 1750905,
  auxilioTransporte: 249095,
  topeAuxilio: 1750905 * 2,
  saludPctEmpleado: 0.04,
  pensionPctEmpleado: 0.04,
  // Parafiscales
  vacDiasAnio: 15,          // días de vacaciones por año (Art. 186 CST)
  interesesCesantiasPct: 0.12, // 12% anual (Ley 52/1975)
};

export const TIPOS_CONTRATO_LABELS = {
  indefinido: "Término indefinido",
  fijo: "Término fijo",
  obra_labor: "Obra o labor",
  prestacion_servicios: "Prestación de servicios",
};

// Recargos Colombia 2026 — Código Sustantivo del Trabajo
export const RECARGOS_CO_2026 = [
  { id:"horaExtraGeneral",   label:"⏱️ Hora extra diurna",                 horario:"Pago automático con salario base", getPct:()=>125 },
  { id:"horaExtraNocturna",  label:"🌙 Hora extra nocturna",               horario:"7:00 p.m. – 6:00 a.m.", getPct:()=>175 },
  { id:"recNocturno",        label:"🌙 Hora ordinaria nocturna",           horario:"7:00 p.m. – 6:00 a.m.", getPct:()=>135 },
  { id:"recDominical",       label:"☀️ Hora diurna dominical/festiva",    horario:"Día de descanso obligatorio", getPct:(f)=>new Date(f+"T12:00:00").getMonth()<6?180:190 },
  { id:"recNoctDominical",   label:"🌙☀️ Hora nocturna dom./festiva",      horario:"Día de descanso obligatorio", getPct:(f)=>new Date(f+"T12:00:00").getMonth()<6?215:225 },
  { id:"horaExtraManual",    label:"✍️ Valor manual",                      horario:"Usar solo si se liquida por un acuerdo especial", getPct:()=>null },
];
export const getPctRecargo=(tipo,fecha)=>{const r=RECARGOS_CO_2026.find(x=>x.id===tipo);return r?.getPct?.(fecha)??null;};
export const buildNominaPeriodo = (mes, corte="primera")=>{
  const safeMes = mes || today().slice(0,7);
  const monthDays = getDaysInMonth(safeMes);
  const startDay = corte==="primera" ? 1 : 16;
  const endDay = corte==="primera" ? Math.min(15, monthDays) : monthDays;
  const startIso = (safeMes) + "-" + (String(startDay).padStart(2,"0"));
  const endIso = (safeMes) + "-" + (String(endDay).padStart(2,"0"));
  return {
    mes: safeMes,
    corte,
    startIso,
    endIso,
    startDate: parseIsoDate(startIso),
    endDate: parseIsoDate(endIso),
    diasReferencia: Math.max(0, endDay-startDay+1),
    label: corte==="primera" ? (safeMes) + " · 1 al 15" : (safeMes) + " · 16 al " + (endDay),
  };
};
export const buildPeriodoLiquidacionRetiro = (fechaSalida, periodoFallback=null)=>{
  if(!fechaSalida) return periodoFallback;
  const [safeMes, safeDayText] = String(fechaSalida).split("-");
  const mes = String(fechaSalida).slice(0,7);
  const day = Number(String(fechaSalida).slice(-2));
  if(!mes || !Number.isFinite(day)) return periodoFallback;
  const corte = day<=15 ? "primera" : "segunda";
  const base = buildNominaPeriodo(mes, corte);
  const salida = parseIsoDate(fechaSalida);
  const endDate = salida && salida<base.endDate ? salida : base.endDate;
  const diasReferencia = endDate && endDate>=base.startDate ? diffDaysInclusive(base.startDate, endDate) : 0;
  return {
    ...base,
    endIso: fechaSalida,
    endDate,
    diasReferencia,
    label: (base.label) + " · retiro al " + (String(fechaSalida).slice(-2)),
  };
};
export const isDateInPeriodo = (iso, periodo)=>{
  if(!periodo) return true;
  const date = parseIsoDate(iso);
  if(!date) return false;
  return date>=periodo.startDate && date<=periodo.endDate;
};
export const calcularDiasNominaPeriodo = (empleado, periodo=null)=>{
  if(!periodo) return 30;
  const ingreso = parseIsoDate(empleado?.fechaIngreso) || periodo.startDate;
  const salida = parseIsoDate(empleado?.fechaSalida) || periodo.endDate;
  const overlapStart = ingreso>periodo.startDate ? ingreso : periodo.startDate;
  const overlapEnd = salida<periodo.endDate ? salida : periodo.endDate;
  if(overlapEnd<overlapStart) return 0;
  return diffDaysInclusive(overlapStart, overlapEnd);
};
export const calcularVacacionesPendientes = (empleado, fechaCorte=null)=>{
  const pf = calcularParafiscales(empleado, fechaCorte);
  const pagadasDias = round1(Math.max(0, Number(empleado?.vacacionesPagadasDias||0)));
  const acumuladasDias = round1(pf.vacacionesDias);
  const diasPendientes = round1(Math.max(0, acumuladasDias - pagadasDias));
  return {
    dias: diasPendientes,
    valor: Math.round((Number(empleado?.salario)||0) * diasPendientes / 30),
    acumuladasDias,
    pagadasDias,
    parafiscales: pf,
  };
};

export const PRESTACION_TIPOS_LABELS = {
  prima: "Prima de servicios",
  cesantias: "Cesantías",
  intereses_cesantias: "Intereses a las cesantías",
  liquidacion_retiro: "Liquidación de retiro",
};

export const PRESTACION_ESTADOS_LABELS = {
  provisionada: "Provisionada",
  pagada: "Pagada",
  consignada: "Consignada",
  en_nomina: "En nómina",
};

export const buildPrestacionPeriod = (tipo, anio, semestre="1")=>{
  const year = Math.max(2020, Math.round(Number(anio) || Number(today().slice(0,4))));
  if(tipo==="prima"){
    if(String(semestre)==="2"){
      return {
        anio: year,
        semestre: "2",
        periodoInicio: `${year}-07-01`,
        periodoFin: `${year}-12-31`,
        fechaCausacion: `${year}-12-20`,
        fechaLimite: `${year}-12-20`,
        label: `Prima segundo semestre ${year}`,
      };
    }
    return {
      anio: year,
      semestre: "1",
      periodoInicio: `${year}-01-01`,
      periodoFin: `${year}-06-30`,
      fechaCausacion: `${year}-06-30`,
      fechaLimite: `${year}-06-30`,
      label: `Prima primer semestre ${year}`,
    };
  }
  if(tipo==="cesantias"){
    return {
      anio: year,
      semestre: "",
      periodoInicio: `${year}-01-01`,
      periodoFin: `${year}-12-31`,
      fechaCausacion: `${year+1}-02-14`,
      fechaLimite: `${year+1}-02-14`,
      label: `Cesantías ${year}`,
    };
  }
  return {
    anio: year,
    semestre: "",
    periodoInicio: `${year}-01-01`,
    periodoFin: `${year}-12-31`,
    fechaCausacion: `${year+1}-01-31`,
    fechaLimite: `${year+1}-01-31`,
    label: `Intereses cesantías ${year}`,
  };
};

export const calcularDiasPrestacionPeriodo = (empleado, periodoInicio, periodoFin)=>{
  const inicio = parseIsoDate(periodoInicio);
  const fin = parseIsoDate(periodoFin);
  if(!inicio || !fin || fin<inicio) return 0;
  const ingreso = parseIsoDate(empleado?.fechaIngreso) || inicio;
  const salida = parseIsoDate(empleado?.fechaSalida) || fin;
  const overlapStart = ingreso>inicio ? ingreso : inicio;
  const overlapEnd = salida<fin ? salida : fin;
  if(overlapEnd<overlapStart) return 0;
  return diffDaysInclusive(overlapStart, overlapEnd);
};

export const calcularPrestacionSocialEmpleado = (empleado, tipo, anio, semestre="1")=>{
  if(!empleado) return null;
  const period = buildPrestacionPeriod(tipo, anio, semestre);
  const diasLiquidados = calcularDiasPrestacionPeriodo(empleado, period.periodoInicio, period.periodoFin);
  const salario = Number(empleado?.salario || 0);
  const aplicaAux = salario>0 && salario<=NOMINA_CO_2026.topeAuxilio;
  const auxilio = aplicaAux ? NOMINA_CO_2026.auxilioTransporte : 0;
  const basePrestacional = salario + auxilio;
  const cesantiasBase = Math.round(basePrestacional * diasLiquidados / 360);
  const valor =
    tipo==="prima"
      ? Math.round(basePrestacional * diasLiquidados / 360)
      : tipo==="cesantias"
        ? cesantiasBase
        : Math.round(cesantiasBase * NOMINA_CO_2026.interesesCesantiasPct * Math.min(diasLiquidados,360) / 360);
  return {
    id:`PRS-${empleado.id}-${tipo}-${period.anio}${period.semestre ? "-" + period.semestre : ""}`,
    tipo,
    estado:"provisionada",
    origen:"prestaciones",
    periodoInicio:period.periodoInicio,
    periodoFin:period.periodoFin,
    periodoLabel:period.label,
    fechaCausacion:period.fechaCausacion,
    fechaLimite:period.fechaLimite,
    fechaPago:"",
    valor,
    diasLiquidados,
    basePrestacional,
    observacion:"",
    liquidacionEnNomina:false,
    componentes:null,
  };
};

export const normalizarPrestacionesSociales = (prestaciones)=>
  (Array.isArray(prestaciones)?prestaciones:[])
    .filter(Boolean)
    .map((prestacion,index)=>{
      const tipo = prestacion?.tipo==="cesantias"
        ? "cesantias"
        : prestacion?.tipo==="intereses_cesantias"
          ? "intereses_cesantias"
          : prestacion?.tipo==="liquidacion_retiro"
            ? "liquidacion_retiro"
            : "prima";
      const componentes = prestacion?.componentes && typeof prestacion.componentes==="object"
        ? prestacion.componentes
        : {};
      return {
        id:prestacion?.id || `PRS-${index+1}`,
        tipo,
        estado:prestacion?.estado || "provisionada",
        origen:prestacion?.origen || (tipo==="liquidacion_retiro" ? "liquidacion_retiro" : "prestaciones"),
        periodoInicio:prestacion?.periodoInicio || prestacion?.periodo_inicio || "",
        periodoFin:prestacion?.periodoFin || prestacion?.periodo_fin || "",
        periodoLabel:prestacion?.periodoLabel || prestacion?.periodo_label || PRESTACION_TIPOS_LABELS[tipo],
        fechaCausacion:prestacion?.fechaCausacion || prestacion?.fecha_causacion || "",
        fechaLimite:prestacion?.fechaLimite || prestacion?.fecha_limite || "",
        fechaPago:prestacion?.fechaPago || prestacion?.fecha_pago || "",
        valor:Math.round(Number(prestacion?.valor || 0)),
        diasLiquidados:Math.max(0, Number(prestacion?.diasLiquidados ?? prestacion?.dias_liquidados ?? 0)),
        basePrestacional:Math.round(Number(prestacion?.basePrestacional ?? prestacion?.base_prestacional ?? 0)),
        observacion:String(prestacion?.observacion || prestacion?.notas || "").trim(),
        liquidacionEnNomina:Boolean(prestacion?.liquidacionEnNomina ?? prestacion?.liquidacion_en_nomina),
        componentes:{
          prima:Math.round(Number(componentes?.prima || 0)),
          cesantias:Math.round(Number(componentes?.cesantias || 0)),
          interesesCesantias:Math.round(Number(componentes?.interesesCesantias ?? componentes?.intereses_cesantias ?? 0)),
          vacaciones:Math.round(Number(componentes?.vacaciones || 0)),
          indemnizacion:Math.round(Number(componentes?.indemnizacion || 0)),
        },
      };
    });

export const upsertPrestacionSocial = (prestaciones=[], siguiente={})=>{
  const normalizadas = normalizarPrestacionesSociales(prestaciones);
  const registro = normalizarPrestacionesSociales([siguiente])[0];
  return [registro, ...normalizadas.filter((prestacion)=>prestacion.id!==registro.id)];
};

export const buildLiquidacionPrestacionRecord = (empleado, liquidacion)=>({
  id:`LQ-${empleado?.id || "EMP"}-${empleado?.fechaSalida || today()}`,
  tipo:"liquidacion_retiro",
  estado:liquidacion?.retiroEnPeriodo ? "en_nomina" : "provisionada",
  origen:"liquidacion_retiro",
  periodoInicio:liquidacion?.periodoLiquidacion?.startIso || empleado?.fechaIngreso || "",
  periodoFin:empleado?.fechaSalida || liquidacion?.periodoLiquidacion?.endIso || today(),
  periodoLabel:`Liquidación retiro ${empleado?.fechaSalida || today()}`,
  fechaCausacion:empleado?.fechaSalida || liquidacion?.periodoLiquidacion?.endIso || today(),
  fechaLimite:empleado?.fechaSalida || liquidacion?.periodoLiquidacion?.endIso || today(),
  fechaPago:"",
  valor:Math.round(Number(liquidacion?.prestaciones || 0)),
  diasLiquidados:Math.max(0, Number(liquidacion?.parafiscales?.diasTrabajados || 0)),
  basePrestacional:Math.round((Number(empleado?.salario || 0)) + ((Number(empleado?.salario || 0)<=NOMINA_CO_2026.topeAuxilio) ? NOMINA_CO_2026.auxilioTransporte : 0)),
  observacion:liquidacion?.retiroEnPeriodo ? "Se paga con la nómina del corte de retiro." : "Pendiente de pago manual o transferencia.",
  liquidacionEnNomina:Boolean(liquidacion?.retiroEnPeriodo),
  componentes:{
    prima:Math.round(Number(liquidacion?.parafiscales?.prima || 0)),
    cesantias:Math.round(Number(liquidacion?.parafiscales?.cesantias || 0)),
    interesesCesantias:Math.round(Number(liquidacion?.parafiscales?.interesesCesantias || 0)),
    vacaciones:Math.round(Number(liquidacion?.vacValorReal || 0)),
    indemnizacion:Math.round(Number(liquidacion?.indemn || 0)),
  },
});

export const normalizarDeduccionesPersonalizadas = (deducciones)=>
  (Array.isArray(deducciones)?deducciones:[])
    .filter(Boolean)
    .map((deduccion,index)=>({
      id:deduccion.id||"DED-" + (index+1),
      nombre:(deduccion.nombre||deduccion.concepto||"Otra deduccion").trim(),
      valor:Math.max(0,Number(deduccion.valor||deduccion.monto||0)),
    }));

export const INCAPACIDAD_ORIGEN_LABELS = {
  comun: "Origen comun",
  laboral: "Origen laboral",
};
export const INCAPACIDAD_RESPONSABLE_LABELS = {
  empleador: "Empleador",
  eps: "EPS",
  colpensiones: "Colpensiones",
  arl: "ARL",
  eps_541: "EPS (541+)",
};
export const buildIncapacidadFormDefault = (empleadoId="", baseDate=today())=>({
  empleadoId,
  origen:"comun",
  fechaInicio:baseDate,
  fechaFin:baseDate,
  diasPrevios:0,
  iblMensual:"",
  numeroSoporte:"",
  diagnostico:"",
  observacion:"",
});
export const normalizarIncapacidades = (incapacidades)=>
  (Array.isArray(incapacidades)?incapacidades:[])
    .filter(Boolean)
    .map((incapacidad,index)=>{
      const fechaInicio = incapacidad?.fechaInicio || incapacidad?.fecha || "";
      const fechaFinOriginal = incapacidad?.fechaFin || incapacidad?.fechaHasta || incapacidad?.fecha_hasta || fechaInicio;
      const inicioDate = parseIsoDate(fechaInicio);
      const finDate = parseIsoDate(fechaFinOriginal);
      return {
        id:incapacidad?.id || "INC-" + (index+1),
        origen:incapacidad?.origen==="laboral" ? "laboral" : "comun",
        fechaInicio,
        fechaFin:inicioDate && finDate && finDate<inicioDate ? fechaInicio : fechaFinOriginal,
        diasPrevios:Math.max(0, Math.round(Number(incapacidad?.diasPrevios ?? incapacidad?.dias_previos ?? incapacidad?.diasAcumuladosPrevios ?? 0))),
        iblMensual:Math.max(0, Math.round(Number(incapacidad?.iblMensual ?? incapacidad?.ibl_mensual ?? incapacidad?.ibcMensual ?? 0))),
        numeroSoporte:String(incapacidad?.numeroSoporte || incapacidad?.soporte || "").trim(),
        diagnostico:String(incapacidad?.diagnostico || incapacidad?.concepto || "").trim(),
        observacion:String(incapacidad?.observacion || incapacidad?.notas || "").trim(),
      };
    })
    .filter((incapacidad)=>incapacidad.fechaInicio && incapacidad.fechaFin);
export const getIncapacidadResponsable = (origen, diaAcumulado)=>{
  if(origen==="laboral") return "arl";
  if(diaAcumulado<=2) return "empleador";
  if(diaAcumulado<=180) return "eps";
  if(diaAcumulado<=540) return "colpensiones";
  return "eps_541";
};
export const getIncapacidadPorcentaje = (origen, diaAcumulado)=>{
  if(origen==="laboral") return 1;
  return diaAcumulado<=90 ? (2/3) : 0.5;
};
export const calcularResumenIncapacidadesRegistros = (empleado, incapacidades=[], periodo=null)=>{
  const registrosBase = normalizarIncapacidades(incapacidades)
    .sort((a,b)=>String(a.fechaInicio).localeCompare(String(b.fechaInicio)) || String(a.fechaFin).localeCompare(String(b.fechaFin)));
  const diasMap = new Map();
  const registros = [];
  const fechaIngreso = parseIsoDate(empleado?.fechaIngreso) || null;
  const fechaSalida = parseIsoDate(empleado?.fechaSalida) || null;
  const pisoComunDiario = NOMINA_CO_2026.salarioMinimo / 30;

  registrosBase.forEach((registro)=>{
    const fechaInicio = parseIsoDate(registro.fechaInicio);
    const fechaFin = parseIsoDate(registro.fechaFin);
    if(!fechaInicio || !fechaFin || fechaFin<fechaInicio) return;

    const inicioPeriodo = maxDate(
      fechaInicio,
      periodo?.startDate || null,
      fechaIngreso
    ) || fechaInicio;
    const finPeriodo = minDate(
      fechaFin,
      periodo?.endDate || null,
      fechaSalida
    ) || fechaFin;
    if(finPeriodo<inicioPeriodo) return;

    const iblMensual = Math.max(0, Number(registro.iblMensual || empleado?.salario || 0));
    const baseDiaria = iblMensual / 30;
    const totalesResponsable = { empleador:0, eps:0, colpensiones:0, arl:0, eps_541:0 };
    let diasPeriodo = 0;
    let totalPeriodo = 0;

    for(let current = inicioPeriodo; current<=finPeriodo; current = addDaysToDate(current, 1)){
      const iso = toIsoDate(current);
      if(diasMap.has(iso)) continue;
      const diaAcumulado = Math.max(1, Number(registro.diasPrevios || 0) + diffDaysInclusive(fechaInicio, current));
      const porcentaje = getIncapacidadPorcentaje(registro.origen, diaAcumulado);
      const responsable = getIncapacidadResponsable(registro.origen, diaAcumulado);
      const valorCalculado = baseDiaria>0 ? baseDiaria * porcentaje : 0;
      const valorDia = Math.round(
        baseDiaria<=0
          ? 0
          : (
              registro.origen==="comun"
                ? Math.max(valorCalculado, pisoComunDiario)
                : valorCalculado
            )
      );
      const detalleDia = {
        fecha:iso,
        registroId:registro.id,
        origen:registro.origen,
        diaAcumulado,
        porcentaje,
        responsable,
        valorDia,
      };
      diasMap.set(iso, detalleDia);
      totalesResponsable[responsable] += valorDia;
      diasPeriodo += 1;
      totalPeriodo += valorDia;
    }

    if(diasPeriodo>0){
      registros.push({
        ...registro,
        diasPeriodo,
        totalPeriodo,
        totalesResponsable,
      });
    }
  });

  const dias = Array.from(diasMap.values()).sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));
  const totalPorResponsable = dias.reduce((acc,dia)=>{
    acc[dia.responsable] = (acc[dia.responsable] || 0) + (dia.valorDia || 0);
    return acc;
  }, { empleador:0, eps:0, colpensiones:0, arl:0, eps_541:0 });
  const total = dias.reduce((acc,dia)=>acc + (dia.valorDia || 0), 0);

  return {
    dias,
    registros,
    diasIncapacidad:dias.length,
    total,
    totalPorResponsable,
  };
};

export const normalizarEmpleado = (empleado)=>({
  ...empleado,
  cedula:empleado?.cedula||"",
  // Alta desde obra u horarios: el registro llega sin revisar la parte
  // contractual. Lo que ya existia se da por confirmado, que para eso paso
  // por nomina en su momento.
  altaEstado:empleado?.altaEstado||"confirmado",
  altaCreadoPor:empleado?.altaCreadoPor||"",
  altaCreadoEn:empleado?.altaCreadoEn||null,
  salarioOrigen:empleado?.salarioOrigen||"definido",
  tipoContrato:empleado?.tipoContrato||"indefinido",
  fechaIngreso:empleado?.fechaIngreso||null,
  fechaSalida:empleado?.fechaSalida||null,
  causaRetiro:empleado?.causaRetiro||"",
  vacacionesPagadasDias:round1(Math.max(0, Number(empleado?.vacacionesPagadasDias||0))),
  vacacionesLiquidacionDias:empleado?.vacacionesLiquidacionDias===null || empleado?.vacacionesLiquidacionDias===undefined || empleado?.vacacionesLiquidacionDias===""
    ? null
    : round1(Math.max(0, Number(empleado?.vacacionesLiquidacionDias||0))),
  horasExtrasPorObra:Array.isArray(empleado?.horasExtrasPorObra)?empleado.horasExtrasPorObra:[],
  comisionesPorObra:Array.isArray(empleado?.comisionesPorObra)?empleado.comisionesPorObra:[],
  deduccionesPersonalizadas:normalizarDeduccionesPersonalizadas(empleado?.deduccionesPersonalizadas),
  incapacidades:normalizarIncapacidades(empleado?.incapacidades),
  prestacionesSociales:normalizarPrestacionesSociales(empleado?.prestacionesSociales),
});

export const normalizarCargos = (cargos)=>
  (Array.isArray(cargos)?cargos:[])
    .filter(Boolean)
    .map((cargo,index)=>{
      if(typeof cargo==="string"){
        return { id:"CAR-" + (String(index+1).padStart(3,"0")), nombre:cargo, descripcion:"", activo:true };
      }
      return {
        id:cargo.id||"CAR-" + (String(index+1).padStart(3,"0")),
        nombre:(cargo.nombre||"").trim(),
        descripcion:cargo.descripcion||"",
        activo:cargo.activo!==false,
      };
    })
    .filter((cargo)=>cargo.nombre);

export const calcularValorHoraBase = (empleado)=>Math.round((Number(empleado?.salario)||NOMINA_CO_2026.salarioMinimo)/240);
export const calcularValorHoraRecargo = (empleado, tipoRecargo, fecha, valorManual=0)=>{
  const salHora = calcularValorHoraBase(empleado);
  const pct = getPctRecargo(tipoRecargo, fecha||today());
  if(pct!==null) return Math.round(salHora*pct/100);
  return Math.round(Number(valorManual)||0);
};
export const calcularTotalHoraExtraItem = (empleado, item={})=>{
  const horas = Number(item?.horas)||0;
  const valorHora = calcularValorHoraRecargo(empleado, item?.tipoRecargo, item?.fecha, item?.valorHora);
  return Math.round(horas*valorHora);
};

export const calcularResumenNominaEmpleado = (empleado, periodo=null)=>{
  const salarioMensual = Number(empleado?.salario)||0;
  const diasCalendario = calcularDiasNominaPeriodo(empleado, periodo);
  const incapacidadResumen = calcularResumenIncapacidadesRegistros(empleado, empleado?.incapacidades||[], periodo);
  const diasIncapacidad = Math.min(diasCalendario, incapacidadResumen.diasIncapacidad);
  const diasNomina = Math.max(0, diasCalendario - diasIncapacidad);
  const valorDia = Math.round(salarioMensual/30);
  const salario = periodo ? Math.round((salarioMensual/30)*diasNomina) : salarioMensual;
  const horasExtras = (empleado?.horasExtrasPorObra||[])
    .filter((item)=>isDateInPeriodo(item?.fecha, periodo))
    .reduce((total,item)=>total+calcularTotalHoraExtraItem(empleado, item),0);
  const comisiones = (empleado?.comisionesPorObra||[])
    .filter((item)=>isDateInPeriodo(item?.fecha, periodo))
    .reduce((total,item)=>total+(Number(item?.comision)||0),0);
  const incapacidadTotal = incapacidadResumen.total;
  const incapacidadEmpleador = incapacidadResumen.totalPorResponsable.empleador || 0;
  const incapacidadEPS = incapacidadResumen.totalPorResponsable.eps || 0;
  const incapacidadColpensiones = incapacidadResumen.totalPorResponsable.colpensiones || 0;
  const incapacidadARL = incapacidadResumen.totalPorResponsable.arl || 0;
  const incapacidadEPS540 = incapacidadResumen.totalPorResponsable.eps_541 || 0;
  const aplicaAuxilio = salarioMensual>0 && salarioMensual<=NOMINA_CO_2026.topeAuxilio;
  const auxilioTransporte = aplicaAuxilio
    ? (periodo ? Math.round((NOMINA_CO_2026.auxilioTransporte/30)*diasNomina) : NOMINA_CO_2026.auxilioTransporte)
    : 0;
  const baseSaludPension = salario + incapacidadTotal + horasExtras + comisiones;
  const salud = Math.round(baseSaludPension*NOMINA_CO_2026.saludPctEmpleado);
  const pension = Math.round(baseSaludPension*NOMINA_CO_2026.pensionPctEmpleado);
  const otrasMensuales = normalizarDeduccionesPersonalizadas(empleado?.deduccionesPersonalizadas)
    .reduce((total,item)=>total+(Number(item?.valor)||0),0);
  const otrasDeducciones = periodo ? Math.round((otrasMensuales/30)*diasCalendario) : otrasMensuales;
  const totalDevengado = salario+incapacidadTotal+auxilioTransporte+horasExtras+comisiones;
  const totalDeducciones = salud+pension+otrasDeducciones;
  const neto = totalDevengado-totalDeducciones;

  return {
    salarioMensual,
    salario,
    valorDia,
    diasCalendario,
    diasNomina,
    diasIncapacidad,
    horasExtras,
    comisiones,
    incapacidadTotal,
    incapacidadEmpleador,
    incapacidadEPS,
    incapacidadColpensiones,
    incapacidadARL,
    incapacidadEPS540,
    incapacidadDetalle:incapacidadResumen,
    aplicaAuxilio,
    auxilioTransporte,
    baseSaludPension,
    salud,
    pension,
    otrasDeducciones,
    totalDevengado,
    totalDeducciones,
    neto,
  };
};

export const calcularParafiscales = (empleado, fechaCorte=null) => {
  const salario = Number(empleado?.salario)||0;
  const fi = empleado?.fechaIngreso||null;
  const fs = empleado?.fechaSalida||null;
  if(!fi) return { diasTrabajados:0, vacacionesDias:0, vacacionesValor:0, cesantias:0, interesesCesantias:0, prima:0, totalLiquidacion:0 };
  const inicio = parseIsoDate(fi);
  const fin = fs ? parseIsoDate(fs) : fechaCorte ? parseIsoDate(fechaCorte) : parseIsoDate(today());
  const diasTrabajados = !inicio || !fin || fin<inicio ? 0 : diffDaysInclusive(inicio, fin);
  const aplicaAux = salario>0 && salario<=NOMINA_CO_2026.topeAuxilio;
  const aux = aplicaAux ? NOMINA_CO_2026.auxilioTransporte : 0;
  const base = salario + aux;
  const cesantias = Math.round(base * diasTrabajados / 360);
  const interesesCesantias = Math.round(cesantias * NOMINA_CO_2026.interesesCesantiasPct * Math.min(diasTrabajados,360) / 360);
  const prima = Math.round(base * diasTrabajados / 360);
  const vacacionesDias = Math.round((diasTrabajados / 360) * NOMINA_CO_2026.vacDiasAnio * 10) / 10;
  const vacacionesValor = Math.round(salario * diasTrabajados / 720);
  const totalLiquidacion = cesantias + interesesCesantias + prima + vacacionesValor;
  const aniostrabajados = Math.floor(diasTrabajados / 365);
  const mesesTrabajados = Math.floor(diasTrabajados / 30);
  return { diasTrabajados, mesesTrabajados, aniostrabajados, vacacionesDias, vacacionesValor, cesantias, interesesCesantias, prima, totalLiquidacion };
};

export const calcularIndemnizacionRetiro = (empleado, parafiscales) => (
  empleado?.causaRetiro==="Despido sin justa causa"
    ? (
        parafiscales?.aniostrabajados<=1
          ? Math.round(Number(empleado?.salario)||0)
          : Math.round((Number(empleado?.salario)||0) + (Number(empleado?.salario)||0)*0.2*((parafiscales?.aniostrabajados||0)-1))
      )
    : 0
);

export const calcularLiquidacionRetiro = (empleado, periodoNomina=null, diasVacacionesOverride=null) => {
  const periodoLiquidacion = buildPeriodoLiquidacionRetiro(empleado?.fechaSalida, periodoNomina) || periodoNomina;
  const resumenRetiro = calcularResumenNominaEmpleado(empleado, periodoLiquidacion);
  const parafiscales = calcularParafiscales(empleado, empleado?.fechaSalida||null);
  const vacacionesPendientes = calcularVacacionesPendientes(empleado, empleado?.fechaSalida||null);
  const valorPreferido =
    diasVacacionesOverride ??
    empleado?.vacacionesLiquidacionDias ??
    vacacionesPendientes.dias;
  const diasVacPagar = round1(Math.max(0, Math.min(vacacionesPendientes.dias, Number(valorPreferido)||0)));
  const vacValorReal = Math.round((Number(empleado?.salario)||0) * diasVacPagar / 30);
  const indemn = calcularIndemnizacionRetiro(empleado, parafiscales);
  const total = parafiscales.cesantias + parafiscales.interesesCesantias + parafiscales.prima + vacValorReal + indemn + resumenRetiro.neto;
  const prestaciones = total - resumenRetiro.neto;
  const retiroEnPeriodo = Boolean(empleado?.fechaSalida && isDateInPeriodo(empleado.fechaSalida, periodoNomina));
  return {
    periodoLiquidacion,
    resumenRetiro,
    parafiscales,
    vacacionesPendientes,
    diasVacPagar,
    vacValorReal,
    indemn,
    total,
    prestaciones,
    retiroEnPeriodo,
  };
};

export const NOMINA_GENERATED_STORAGE_KEY = "ingeanclajes_nominas_generadas_v1";
export const NOMINA_PLANO_BANCO_DEFAULTS = {
  nitEmpresa: "900411781",
  tipoIdEmpresa: "I",
  codigoServicio: "225",
  descripcionArchivo: "PAGONOMINA",
  cuentaOrigen: "63443072448",
  tipoCuentaOrigen: "S",
  codigoDestino: "0056",
  codigoTransaccion: "37",
  descripcionDetalle: "PAGO DE NOMINA",
};

export const cleanNominaDigits = (value="") => String(value || "").replace(/\D/g,"");
export const normalizeNominaBankText = (value="", maxLength=0) => {
  const text = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^A-Za-z0-9 .,/()-]/g," ")
    .replace(/\s+/g," ")
    .trim()
    .toUpperCase();
  return maxLength ? text.slice(0,maxLength) : text;
};
export const padNominaLeft = (value, length, char="0") => String(value ?? "").slice(-length).padStart(length, char);
export const padNominaRight = (value, length, char=" ") => String(value ?? "").slice(0, length).padEnd(length, char);
export const formatNominaCompactDate = (value) => {
  if(value instanceof Date){
    const y = value.getFullYear();
    const m = String(value.getMonth()+1).padStart(2,"0");
    const d = String(value.getDate()).padStart(2,"0");
    return `${y}${m}${d}`;
  }
  return padNominaRight(cleanNominaDigits(value).slice(0,8), 8, "0");
};
export const formatNominaCompactTimestamp = (value=new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if(Number.isNaN(date.getTime())) return formatNominaCompactDate(today()) + "000000";
  const y = date.getFullYear();
  const m = String(date.getMonth()+1).padStart(2,"0");
  const d = String(date.getDate()).padStart(2,"0");
  const hh = String(date.getHours()).padStart(2,"0");
  const mm = String(date.getMinutes()).padStart(2,"0");
  const ss = String(date.getSeconds()).padStart(2,"0");
  return `${y}${m}${d}${hh}${mm}${ss}`;
};
export const formatNominaGeneratedAt = (value) => {
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "Sin fecha";
  return date.toLocaleString("es-CO", { dateStyle:"medium", timeStyle:"short" });
};
export const downloadTextFile = (filename, content) => {
  if(typeof window==="undefined" || typeof document==="undefined") return;
  const blob = new Blob([content], { type:"text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const normalizeNominaResumenSnapshot = (resumen={}) => ({
  salarioMensual: Number(resumen?.salarioMensual || 0),
  salario: Number(resumen?.salario || 0),
  valorDia: Number(resumen?.valorDia || 0),
  diasCalendario: Number(resumen?.diasCalendario || resumen?.diasNomina || 0),
  diasNomina: Number(resumen?.diasNomina || 0),
  diasIncapacidad: Number(resumen?.diasIncapacidad || 0),
  horasExtras: Number(resumen?.horasExtras || 0),
  comisiones: Number(resumen?.comisiones || 0),
  incapacidadTotal: Number(resumen?.incapacidadTotal || 0),
  incapacidadEmpleador: Number(resumen?.incapacidadEmpleador || 0),
  incapacidadEPS: Number(resumen?.incapacidadEPS || 0),
  incapacidadColpensiones: Number(resumen?.incapacidadColpensiones || 0),
  incapacidadARL: Number(resumen?.incapacidadARL || 0),
  incapacidadEPS540: Number(resumen?.incapacidadEPS540 || 0),
  incapacidadDetalle: resumen?.incapacidadDetalle || { dias:[], registros:[], diasIncapacidad:0, total:0, totalPorResponsable:{ empleador:0, eps:0, colpensiones:0, arl:0, eps_541:0 } },
  aplicaAuxilio: Boolean(resumen?.aplicaAuxilio),
  auxilioTransporte: Number(resumen?.auxilioTransporte || 0),
  baseSaludPension: Number(resumen?.baseSaludPension || 0),
  salud: Number(resumen?.salud || 0),
  pension: Number(resumen?.pension || 0),
  otrasDeducciones: Number(resumen?.otrasDeducciones || 0),
  totalDevengado: Number(resumen?.totalDevengado || 0),
  totalDeducciones: Number(resumen?.totalDeducciones || 0),
  neto: Number(resumen?.neto || 0),
});

export const normalizeNominaRegistroSnapshot = (registro={}) => ({
  empleado: {
    id: String(registro?.empleado?.id || ""),
    nombre: String(registro?.empleado?.nombre || ""),
    cedula: String(registro?.empleado?.cedula || ""),
    cargo: String(registro?.empleado?.cargo || ""),
    fechaSalida: registro?.empleado?.fechaSalida || null,
    banco: String(registro?.empleado?.banco || ""),
    tipoCuenta: String(registro?.empleado?.tipoCuenta || ""),
    numeroCuenta: String(registro?.empleado?.numeroCuenta || ""),
  },
  resumen: normalizeNominaResumenSnapshot(registro?.resumen || {}),
  liquidacionPrestaciones: Number(registro?.liquidacionPrestaciones || 0),
  totalPagar: Number(registro?.totalPagar || 0),
  retiroEnPeriodo: Boolean(registro?.retiroEnPeriodo),
  fechaSalida: registro?.fechaSalida || null,
  bancoValido: Boolean(registro?.bancoValido),
  observacionesBanco: Array.isArray(registro?.observacionesBanco) ? registro.observacionesBanco : [],
});

export const normalizeNominaGeneratedRecord = (item={}) => {
  const snapshot = item.snapshot ?? item;
  const periodo = snapshot?.periodo ?? {};
  const totals = snapshot?.totals ?? {};
  const generatedAt = String(item.generadoEn ?? item.generado_en ?? snapshot?.generadoEn ?? new Date().toISOString());
  return {
    id: String(item.id || snapshot?.id || ""),
    periodoMes: String(item.periodoMes ?? item.periodo_mes ?? periodo?.mes ?? ""),
    periodoCorte: String(item.periodoCorte ?? item.periodo_corte ?? periodo?.corte ?? ""),
    periodoLabel: String(item.periodoLabel ?? item.periodo_label ?? periodo?.label ?? ""),
    generadoEn: generatedAt,
    planoBanco: String(item.planoBanco ?? item.plano_banco ?? ""),
    snapshot: {
      ...snapshot,
      id: String(snapshot?.id || item.id || ""),
      generadoEn: String(snapshot?.generadoEn ?? generatedAt),
      periodo: {
        mes: String(periodo?.mes || item.periodoMes || item.periodo_mes || ""),
        corte: String(periodo?.corte || item.periodoCorte || item.periodo_corte || ""),
        label: String(periodo?.label || item.periodoLabel || item.periodo_label || ""),
        startIso: String(periodo?.startIso || ""),
        endIso: String(periodo?.endIso || ""),
        diasReferencia: Number(periodo?.diasReferencia || 0),
      },
      registros: Array.isArray(snapshot?.registros) ? snapshot.registros.map(normalizeNominaRegistroSnapshot) : [],
      registrosBanco: Array.isArray(snapshot?.registrosBanco) ? snapshot.registrosBanco.map(normalizeNominaRegistroSnapshot) : [],
      totals: {
        totalNomina: Number(totals?.totalNomina || 0),
        totalLiquidaciones: Number(totals?.totalLiquidaciones || 0),
        totalPagar: Number(totals?.totalPagar || 0),
        totalBanco: Number(totals?.totalBanco || 0),
        totalRegistros: Number(totals?.totalRegistros || 0),
        totalRegistrosBanco: Number(totals?.totalRegistrosBanco || 0),
      },
    },
  };
};

export const buildNominaGeneratedRecord = (snapshot, planoBanco="") =>
  normalizeNominaGeneratedRecord({
    id: snapshot?.id,
    periodoMes: snapshot?.periodo?.mes,
    periodoCorte: snapshot?.periodo?.corte,
    periodoLabel: snapshot?.periodo?.label,
    generadoEn: snapshot?.generadoEn || new Date().toISOString(),
    planoBanco,
    snapshot,
  });

export const loadStoredNominasGeneradas = () => {
  if(typeof window==="undefined") return [];
  try{
    const raw = window.localStorage.getItem(NOMINA_GENERATED_STORAGE_KEY);
    if(!raw) return [];
    const parsed = JSON.parse(raw);
    if(Array.isArray(parsed)){
      return parsed.map(normalizeNominaGeneratedRecord).filter((item)=>item.id);
    }
    if(parsed && typeof parsed==="object"){
      return Object.values(parsed)
        .map((snapshot)=>buildNominaGeneratedRecord(snapshot))
        .filter((item)=>item.id);
    }
  }catch{}
  return [];
};

export const upsertNominaGeneratedRecord = (list=[], record={}) => {
  const normalized = normalizeNominaGeneratedRecord(record);
  const base = (Array.isArray(list) ? list : []).map(normalizeNominaGeneratedRecord);
  return [normalized, ...base.filter((item)=>item.id!==normalized.id)];
};

export const sanitizeExcelSheetName = (value="Hoja") =>
  String(value || "Hoja")
    .replace(/[\\/:*?\[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 31) || "Hoja";

export const buildExcelCellXml = (value, isHeader=false) => {
  const style = isHeader ? ' ss:StyleID="header"' : "";
  if(typeof value==="number" && Number.isFinite(value)){
    return `<Cell${style}><Data ss:Type="Number">${value}</Data></Cell>`;
  }
  return `<Cell${style}><Data ss:Type="String">${escapeXml(String(value ?? ""))}</Data></Cell>`;
};

export const downloadExcelWorkbook = (filename, sheets=[]) => {
  if(typeof window==="undefined" || typeof document==="undefined") return;
  const normalizedSheets = (Array.isArray(sheets) ? sheets : [])
    .map((sheet, index)=>({
      name: sanitizeExcelSheetName(sheet?.name || `Hoja ${index+1}`),
      rows: Array.isArray(sheet?.rows) && sheet.rows.length ? sheet.rows : [["Sin datos"]],
    }))
    .filter((sheet)=>sheet.rows.length);
  if(!normalizedSheets.length) return;

  const workbook = [
    '<?xml version="1.0"?>',
    '<?mso-application progid="Excel.Sheet"?>',
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:o="urn:schemas-microsoft-com:office:office"',
    ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
    ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"',
    ' xmlns:html="http://www.w3.org/TR/REC-html40">',
    '<Styles>',
    '<Style ss:ID="header"><Font ss:Bold="1"/><Interior ss:Color="#DCE6F1" ss:Pattern="Solid"/></Style>',
    '</Styles>',
    normalizedSheets.map((sheet)=>([
      `<Worksheet ss:Name="${escapeXml(sheet.name)}">`,
      "<Table>",
      sheet.rows.map((row, rowIndex)=>(
        `<Row>${(Array.isArray(row) ? row : [row]).map((cell)=>buildExcelCellXml(cell, rowIndex===0)).join("")}</Row>`
      )).join(""),
      "</Table>",
      "</Worksheet>",
    ].join(""))).join(""),
    "</Workbook>",
  ].join("");

  const finalName = sanitizeFileName(filename).replace(/\.xls$/i,"") + ".xls";
  const file = new File([workbook], finalName, { type:"application/vnd.ms-excel;charset=utf-8" });
  downloadGeneratedFile(file);
};

export const buildNominaSnapshot = (empleados=[], periodoNomina=null, diasVacPagarOverrides={}) => {
  const registros = (Array.isArray(empleados) ? empleados : [])
    .map((empleado)=> {
      const resumen = calcularResumenNominaEmpleado(empleado, periodoNomina);
      const liquidacion = calcularLiquidacionRetiro(
        empleado,
        periodoNomina,
        diasVacPagarOverrides?.[empleado.id] ?? empleado?.vacacionesLiquidacionDias
      );
      const tieneMovimiento = resumen.diasNomina>0 || resumen.incapacidadTotal>0 || resumen.horasExtras>0 || resumen.comisiones>0 || liquidacion.retiroEnPeriodo;
      const liquidacionPrestaciones = liquidacion.retiroEnPeriodo ? liquidacion.prestaciones : 0;
      const totalPagar = resumen.neto + liquidacionPrestaciones;
      if(!tieneMovimiento || totalPagar<=0) return null;

      const cedula = cleanNominaDigits(empleado?.cedula);
      const cuenta = cleanNominaDigits(empleado?.numeroCuenta);
      const bancoValido = cedula.length>0 && cuenta.length>0;
      const observacionesBanco = [
        !cedula.length ? "Falta cédula" : null,
        !cuenta.length ? "Falta cuenta bancaria" : null,
      ].filter(Boolean);

      return {
        empleado: {
          id: empleado.id,
          nombre: empleado.nombre,
          cedula: empleado.cedula || "",
          cargo: empleado.cargo || "",
          fechaSalida: empleado.fechaSalida || null,
          banco: empleado.banco || "",
          tipoCuenta: empleado.tipoCuenta || "",
          numeroCuenta: empleado.numeroCuenta || "",
        },
        resumen,
        liquidacionPrestaciones,
        totalPagar,
        retiroEnPeriodo: liquidacion.retiroEnPeriodo,
        fechaSalida: empleado?.fechaSalida || null,
        bancoValido,
        observacionesBanco,
      };
    })
    .filter(Boolean);

  const registrosBanco = registros.filter((registro)=>registro.bancoValido);
  const totals = {
    totalNomina: registros.reduce((total, registro)=>total + (registro.resumen?.neto || 0), 0),
    totalLiquidaciones: registros.reduce((total, registro)=>total + (registro.liquidacionPrestaciones || 0), 0),
    totalPagar: registros.reduce((total, registro)=>total + (registro.totalPagar || 0), 0),
    totalBanco: registrosBanco.reduce((total, registro)=>total + (registro.totalPagar || 0), 0),
    totalRegistros: registros.length,
    totalRegistrosBanco: registrosBanco.length,
  };

  return {
    id: `${periodoNomina?.mes || "sin-mes"}-${periodoNomina?.corte || "sin-corte"}`,
    generadoEn: new Date().toISOString(),
    periodo: {
      mes: periodoNomina?.mes || "",
      corte: periodoNomina?.corte || "",
      label: periodoNomina?.label || "Sin periodo",
      startIso: periodoNomina?.startIso || "",
      endIso: periodoNomina?.endIso || "",
      diasReferencia: periodoNomina?.diasReferencia || 0,
    },
    registros,
    registrosBanco,
    totals,
  };
};

export const NOMINAS_GENERADAS_INIT = loadStoredNominasGeneradas();

export const buildNominaPlanoBancoHeader = (snapshot, config=NOMINA_PLANO_BANCO_DEFAULTS) => {
  const fechaPago = formatNominaCompactDate(snapshot?.periodo?.endIso || today());
  const line = [
    "1",
    padNominaLeft(cleanNominaDigits(config.nitEmpresa).slice(-15), 15, "0"),
    String(config.tipoIdEmpresa || "I").slice(0,1).toUpperCase(),
    "".padEnd(15, " "),
    padNominaRight(String(config.codigoServicio || "225"), 3, " "),
    padNominaRight(normalizeNominaBankText(config.descripcionArchivo, 10), 10, " "),
    fechaPago,
    "A ",
    formatNominaCompactTimestamp(snapshot?.generadoEn || new Date()),
    "".padStart(24, "0"),
    padNominaLeft(Math.round(snapshot?.totals?.totalBanco || 0), 10, "0"),
    padNominaLeft(cleanNominaDigits(config.cuentaOrigen).slice(-11), 11, "0"),
    String(config.tipoCuentaOrigen || "S").slice(0,1).toUpperCase(),
  ].join("");
  return padNominaRight(line, 264, " ");
};

export const buildNominaPlanoBancoDetail = (registro, snapshot, config=NOMINA_PLANO_BANCO_DEFAULTS) => {
  const fechaPago = formatNominaCompactDate(snapshot?.periodo?.endIso || today());
  const cuentaDestino = cleanNominaDigits(registro?.empleado?.numeroCuenta || "").slice(-16);
  const line = [
    "6",
    padNominaLeft(cleanNominaDigits(registro?.empleado?.cedula).slice(-10), 10, "0"),
    "".padEnd(5, " "),
    padNominaRight(normalizeNominaBankText(registro?.empleado?.nombre, 30), 30, " "),
    padNominaRight((String(config.codigoDestino || "0056") + padNominaLeft(cuentaDestino, 16, "0")).slice(0,20), 20, " "),
    "".padEnd(7, " "),
    padNominaRight(String(config.codigoTransaccion || "37"), 2, " "),
    padNominaLeft(Math.round(registro?.totalPagar || 0), 16, "0"),
    "0",
    fechaPago,
    padNominaRight(normalizeNominaBankText(config.descripcionDetalle, 14), 14, " "),
  ].join("");
  return padNominaRight(line, 264, " ");
};

export const buildNominaPlanoBancoContent = (snapshot, config=NOMINA_PLANO_BANCO_DEFAULTS) => {
  const registros = Array.isArray(snapshot?.registrosBanco) ? snapshot.registrosBanco : [];
  const header = buildNominaPlanoBancoHeader(snapshot, config);
  const details = registros.map((registro)=>buildNominaPlanoBancoDetail(registro, snapshot, config));
  return [header, ...details].join("\r\n");
};
