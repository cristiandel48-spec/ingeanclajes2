import Av from "../../components/ui/Av";
import H1 from "../../components/ui/H1";
import PasosNomina, { NavegacionPasos } from "./PasosNomina";
import LBL from "../../components/ui/LBL";
import { useEffect, useState } from "react";
import { B, CD, PAL, SI, ST } from "../../styles/tokens";
import { INCAPACIDAD_ORIGEN_LABELS, INCAPACIDAD_RESPONSABLE_LABELS, NOMINA_CO_2026, NOMINA_GENERATED_STORAGE_KEY, NOMINA_PLANO_BANCO_DEFAULTS, PRESTACION_ESTADOS_LABELS, PRESTACION_TIPOS_LABELS, RECARGOS_CO_2026, TIPOS_CONTRATO_LABELS, buildIncapacidadFormDefault, buildLiquidacionPrestacionRecord, buildNominaGeneratedRecord, buildNominaPeriodo, buildNominaPlanoBancoContent, buildNominaSnapshot, calcularLiquidacionRetiro, calcularParafiscales, calcularPrestacionSocialEmpleado, calcularResumenIncapacidadesRegistros, calcularResumenNominaEmpleado, calcularTotalHoraExtraItem, calcularVacacionesPendientes, calcularValorHoraBase, calcularValorHoraRecargo, downloadTextFile, formatNominaGeneratedAt, getPctRecargo, isDateInPeriodo, normalizarCargos, normalizarEmpleado, normalizarIncapacidades, normalizarPrestacionesSociales, normalizeNominaGeneratedRecord, upsertNominaGeneratedRecord, upsertPrestacionSocial } from "../../lib/nomina";
import { LOGO_INGEANCLAJES } from "../../assets/embeddedImages";
import { fmt, fmtD, today } from "../../lib/format";
import { parseIsoDate, round1 } from "../../lib/dates";
import { printColilla, printCurrentPz, printLiquidacion, printVacaciones } from "../../lib/print";
export default function Nomina({ctx}){
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
      <H1 title="Nómina y Empleados" subtitle="Proceso quincenal: preparar el corte, revisar novedades y generar el pago"
        action={<button style={B("#cc0000")} onClick={()=>setTab("nuevo")}>+ Nuevo Empleado</button>}/>
      <PasosNomina activo={tab} onIr={setTab}/>

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
            <div style={{display:"flex",flexDirection:"column",gap:10,minWidth:230}}>
              {/* Primero se genera; hasta entonces lo demas no tiene sentido y
                  se muestra apagado para que nadie lo intente antes. */}
              <button
                style={{...B("#f47c20"),justifyContent:"center",padding:"13px 20px",fontSize:13.5,fontWeight:700}}
                onClick={generarNominaCorte}
              >
                {nominaEstaGenerada ? "Regenerar nómina" : "1 · Generar nómina"}
              </button>

              <div style={{fontSize:10.5,color:"#94a3b8",lineHeight:1.45,textAlign:"center"}}>
                {nominaEstaGenerada
                  ? "Ya puedes descargar el archivo del banco."
                  : "Congela el corte con los datos actuales."}
              </div>

              <button
                style={{
                  ...B(nominaEstaGenerada?"#142840":"#f1f5f9", nominaEstaGenerada?"#dbeafe":"#94a3b8"),
                  justifyContent:"center",padding:"12px 20px",fontSize:12.5,
                }}
                onClick={descargarPlanoBanco}
                title={nominaEstaGenerada ? "" : "Genera la nómina primero"}
              >
                2 · Descargar plano banco
              </button>

              <button
                style={{...B("#f8fafc","#475569"),border:"1px solid #dbe4f0",justifyContent:"center",padding:"12px 20px",fontSize:12.5}}
                onClick={()=>printCurrentPz("Planilla Nómina " + (nominaVistaActual.periodo.label))}
              >
                Imprimir planilla
              </button>
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

      {tab!=="nuevo" && <NavegacionPasos activo={tab} onIr={setTab}/>}
    </div>
  );
}
// ======================================================
// HORARIOS
// ======================================================

