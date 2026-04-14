const safeArray = (value) => (Array.isArray(value) ? value : []);

const roundMoney = (value) => Number((Number(value || 0)).toFixed(2));

const normalizeLookupKey = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const buildId = (prefix = "ID") =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const accountGroupLabels = {
  activo: "Activo",
  pasivo: "Pasivo",
  patrimonio: "Patrimonio",
  ingreso: "Ingreso",
  costo: "Costo",
  gasto: "Gasto",
};

const statementCategoryLabels = {
  activo_corriente: "Activo corriente",
  activo_no_corriente: "Activo no corriente",
  pasivo_corriente: "Pasivo corriente",
  pasivo_no_corriente: "Pasivo no corriente",
  patrimonio: "Patrimonio",
  ingreso_operacional: "Ingresos operacionales",
  otro_ingreso: "Otros ingresos",
  costo_obra: "Costos de prestacion",
  gasto_administrativo: "Gastos administrativos",
  gasto_operativo: "Gastos operativos",
  gasto_financiero: "Gastos financieros",
};

const defaultCategoryByGroup = {
  activo: "activo_corriente",
  pasivo: "pasivo_corriente",
  patrimonio: "patrimonio",
  ingreso: "ingreso_operacional",
  costo: "costo_obra",
  gasto: "gasto_administrativo",
};

const inferNaturalezaFromCodigo = (codigo = "") => {
  const clase = String(codigo || "").trim().charAt(0);
  if (["2", "3", "4"].includes(clase)) return "credito";
  return "debito";
};

const inferGroupFromCodigo = (codigo = "") => {
  const clase = String(codigo || "").trim().charAt(0);
  if (clase === "1") return "activo";
  if (clase === "2") return "pasivo";
  if (clase === "3") return "patrimonio";
  if (clase === "4") return "ingreso";
  if (clase === "6" || clase === "7") return "costo";
  return "gasto";
};

const DEFAULT_PLAN_TEMPLATE = [
  {
    codigo: "110505",
    nombre: "Caja general",
    naturaleza: "debito",
    grupoReporte: "activo",
    categoriaEstado: "activo_corriente",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: false,
    descripcion: "Caja menor y movimientos de efectivo.",
  },
  {
    codigo: "111005",
    nombre: "Bancos nacionales",
    naturaleza: "debito",
    grupoReporte: "activo",
    categoriaEstado: "activo_corriente",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: false,
    descripcion: "Cuenta bancaria principal y recaudos.",
  },
  {
    codigo: "130505",
    nombre: "Clientes nacionales",
    naturaleza: "debito",
    grupoReporte: "activo",
    categoriaEstado: "activo_corriente",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: true,
    descripcion: "Cuentas por cobrar comerciales.",
  },
  {
    codigo: "135515",
    nombre: "Retencion en la fuente a favor",
    naturaleza: "debito",
    grupoReporte: "activo",
    categoriaEstado: "activo_corriente",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: false,
    descripcion: "Saldos a favor por retenciones practicadas.",
  },
  {
    codigo: "240810",
    nombre: "IVA descontable",
    naturaleza: "debito",
    grupoReporte: "activo",
    categoriaEstado: "activo_corriente",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: false,
    descripcion: "IVA recuperable asociado a compras y gastos.",
  },
  {
    codigo: "220505",
    nombre: "Proveedores nacionales",
    naturaleza: "credito",
    grupoReporte: "pasivo",
    categoriaEstado: "pasivo_corriente",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: true,
    descripcion: "Obligaciones con proveedores.",
  },
  {
    codigo: "236540",
    nombre: "Retencion en la fuente por pagar",
    naturaleza: "credito",
    grupoReporte: "pasivo",
    categoriaEstado: "pasivo_corriente",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: false,
    descripcion: "Retenciones a titulo de renta causadas.",
  },
  {
    codigo: "236701",
    nombre: "ReteIVA por pagar",
    naturaleza: "credito",
    grupoReporte: "pasivo",
    categoriaEstado: "pasivo_corriente",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: false,
    descripcion: "Retencion de IVA practicada a terceros.",
  },
  {
    codigo: "236801",
    nombre: "ReteICA por pagar",
    naturaleza: "credito",
    grupoReporte: "pasivo",
    categoriaEstado: "pasivo_corriente",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: false,
    descripcion: "Retencion de ICA practicada a terceros.",
  },
  {
    codigo: "236595",
    nombre: "Otras deducciones de nomina por pagar",
    naturaleza: "credito",
    grupoReporte: "pasivo",
    categoriaEstado: "pasivo_corriente",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: false,
    descripcion: "Deducciones diferentes a salud y pension pendientes de pago.",
  },
  {
    codigo: "237005",
    nombre: "Aportes a salud por pagar",
    naturaleza: "credito",
    grupoReporte: "pasivo",
    categoriaEstado: "pasivo_corriente",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: false,
    descripcion: "Aportes de seguridad social pendientes.",
  },
  {
    codigo: "237010",
    nombre: "Aportes a pension por pagar",
    naturaleza: "credito",
    grupoReporte: "pasivo",
    categoriaEstado: "pasivo_corriente",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: false,
    descripcion: "Aportes de pension pendientes.",
  },
  {
    codigo: "240805",
    nombre: "IVA generado",
    naturaleza: "credito",
    grupoReporte: "pasivo",
    categoriaEstado: "pasivo_corriente",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: false,
    descripcion: "IVA por pagar en ventas y servicios.",
  },
  {
    codigo: "250505",
    nombre: "Salarios por pagar",
    naturaleza: "credito",
    grupoReporte: "pasivo",
    categoriaEstado: "pasivo_corriente",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: false,
    descripcion: "Obligaciones laborales inmediatas.",
  },
  {
    codigo: "310505",
    nombre: "Capital social",
    naturaleza: "credito",
    grupoReporte: "patrimonio",
    categoriaEstado: "patrimonio",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: false,
    descripcion: "Capital suscrito y pagado.",
  },
  {
    codigo: "360505",
    nombre: "Utilidad del ejercicio",
    naturaleza: "credito",
    grupoReporte: "patrimonio",
    categoriaEstado: "patrimonio",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: false,
    descripcion: "Resultado del periodo.",
  },
  {
    codigo: "370505",
    nombre: "Utilidades acumuladas",
    naturaleza: "credito",
    grupoReporte: "patrimonio",
    categoriaEstado: "patrimonio",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: false,
    descripcion: "Resultados de periodos anteriores.",
  },
  {
    codigo: "413595",
    nombre: "Ingresos por servicios de ingenieria",
    naturaleza: "credito",
    grupoReporte: "ingreso",
    categoriaEstado: "ingreso_operacional",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: true,
    descripcion: "Servicios de anclajes, lineas de vida y certificacion.",
  },
  {
    codigo: "417595",
    nombre: "Devoluciones y descuentos en servicios",
    naturaleza: "debito",
    grupoReporte: "ingreso",
    categoriaEstado: "ingreso_operacional",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: true,
    descripcion: "Notas credito o ajustes sobre ingresos.",
  },
  {
    codigo: "510506",
    nombre: "Sueldos",
    naturaleza: "debito",
    grupoReporte: "gasto",
    categoriaEstado: "gasto_administrativo",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: true,
    descripcion: "Gasto de salarios administrativos y operativos.",
  },
  {
    codigo: "510515",
    nombre: "Horas extras y recargos",
    naturaleza: "debito",
    grupoReporte: "gasto",
    categoriaEstado: "gasto_operativo",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: true,
    descripcion: "Recargos, extras y novedades de nomina.",
  },
  {
    codigo: "510530",
    nombre: "Auxilio de transporte",
    naturaleza: "debito",
    grupoReporte: "gasto",
    categoriaEstado: "gasto_operativo",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: true,
    descripcion: "Auxilio de transporte reconocido al personal.",
  },
  {
    codigo: "510535",
    nombre: "Liquidaciones y prestaciones",
    naturaleza: "debito",
    grupoReporte: "gasto",
    categoriaEstado: "gasto_operativo",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: true,
    descripcion: "Liquidaciones, prestaciones sociales e indemnizaciones.",
  },
  {
    codigo: "513525",
    nombre: "Honorarios",
    naturaleza: "debito",
    grupoReporte: "gasto",
    categoriaEstado: "gasto_administrativo",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: false,
    descripcion: "Honorarios y servicios profesionales.",
  },
  {
    codigo: "513595",
    nombre: "Servicios generales",
    naturaleza: "debito",
    grupoReporte: "gasto",
    categoriaEstado: "gasto_administrativo",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: false,
    descripcion: "Servicios y gastos generales administrativos.",
  },
  {
    codigo: "514595",
    nombre: "Arrendamientos",
    naturaleza: "debito",
    grupoReporte: "gasto",
    categoriaEstado: "gasto_administrativo",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: false,
    descripcion: "Canon de arrendamiento y gastos similares.",
  },
  {
    codigo: "519595",
    nombre: "Gastos diversos",
    naturaleza: "debito",
    grupoReporte: "gasto",
    categoriaEstado: "gasto_operativo",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: false,
    descripcion: "Otros gastos operativos no clasificados.",
  },
  {
    codigo: "613595",
    nombre: "Costos directos de obra",
    naturaleza: "debito",
    grupoReporte: "costo",
    categoriaEstado: "costo_obra",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: true,
    descripcion: "Costos de prestacion asociados a una obra.",
  },
  {
    codigo: "614595",
    nombre: "Materiales y suministros de obra",
    naturaleza: "debito",
    grupoReporte: "costo",
    categoriaEstado: "costo_obra",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: true,
    descripcion: "Materiales directos e insumos de campo.",
  },
  {
    codigo: "615595",
    nombre: "Servicios de terceros en obra",
    naturaleza: "debito",
    grupoReporte: "costo",
    categoriaEstado: "costo_obra",
    permiteMovimientos: true,
    requiereTercero: true,
    requiereCentroCosto: true,
    descripcion: "Subcontratos, transportes y servicios de terceros en obra.",
  },
];

export const ACCOUNTING_NORMATIVE_NOTE =
  "Base sugerida para 2026: Grupo 2 (NIIF para las PYMES), moneda COP, UVT 2026 parametrizada y soporte por comprobante.";

export const COLOMBIA_UVT_2026 = 52374;

export function buildDefaultContabilidadConfig(overrides = {}) {
  return {
    id: "CFG-CONT-001",
    razonSocial: "Ingeanclajes S.A.S.",
    nit: "900193965-4",
    marcoNormativo: "grupo2",
    marcoNormativoLabel: "Grupo 2 - NIIF para las PYMES",
    moneda: "COP",
    uvt: COLOMBIA_UVT_2026,
    autoCxc: true,
    autoCxp: true,
    autoNomina: true,
    cuentaBanco: "111005",
    cuentaCaja: "110505",
    cuentaClientes: "130505",
    cuentaProveedores: "220505",
    cuentaIvaDescontable: "240810",
    cuentaIvaGenerado: "240805",
    cuentaRetefuente: "236540",
    cuentaReteiva: "236701",
    cuentaReteica: "236801",
    cuentaIngresoServicios: "413595",
    cuentaCostoMateriales: "614595",
    cuentaCostoServiciosObra: "615595",
    cuentaGastoServicios: "513595",
    cuentaGastoHonorarios: "513525",
    cuentaGastoArrendamiento: "514595",
    cuentaGastoDiverso: "519595",
    cuentaNominaSueldos: "510506",
    cuentaNominaExtras: "510515",
    cuentaNominaAuxilio: "510530",
    cuentaNominaLiquidaciones: "510535",
    cuentaNominaPorPagar: "250505",
    cuentaSaludPorPagar: "237005",
    cuentaPensionPorPagar: "237010",
    cuentaOtrasDeduccionesNomina: "236595",
    observaciones: ACCOUNTING_NORMATIVE_NOTE,
    ...overrides,
  };
}

export function buildDefaultPlanCuentas() {
  return DEFAULT_PLAN_TEMPLATE.map((item) => normalizePlanCuenta(item));
}

export function buildEmptyPlanCuenta() {
  return normalizePlanCuenta({
    codigo: "",
    nombre: "",
    naturaleza: "debito",
    grupoReporte: "activo",
    categoriaEstado: "activo_corriente",
    permiteMovimientos: true,
    requiereTercero: false,
    requiereCentroCosto: false,
    activo: true,
    descripcion: "",
  });
}

export function createAsientoLine(overrides = {}) {
  return {
    id: overrides.id || buildId("LN"),
    cuentaCodigo: String(overrides.cuentaCodigo || "").trim(),
    cuentaNombre: String(overrides.cuentaNombre || "").trim(),
    detalle: String(overrides.detalle || "").trim(),
    debito: roundMoney(overrides.debito),
    credito: roundMoney(overrides.credito),
    terceroId: String(overrides.terceroId || "").trim(),
    terceroNit: String(overrides.terceroNit || overrides.tercero_nit || "").trim(),
    terceroNombre: String(overrides.terceroNombre || "").trim(),
    centroCosto: String(overrides.centroCosto || "").trim(),
  };
}

export function buildEmptyManualAsiento(existingEntries = [], fecha = "") {
  const targetDate =
    String(fecha || "").trim() || new Date().toISOString().slice(0, 10);
  return normalizeAsientoContable({
    id: buildId("AST"),
    consecutivo: buildManualConsecutivo(existingEntries, targetDate),
    fecha: targetDate,
    periodo: targetDate.slice(0, 7),
    tipoComprobante: "Diario",
    estado: "Contabilizado",
    automatico: false,
    origen: "manual",
    origenRef: "",
    descripcion: "",
    terceroId: "",
    terceroNit: "",
    terceroNombre: "",
    soporte: "",
    lineas: [createAsientoLine(), createAsientoLine()],
  });
}

export function buildManualConsecutivo(existingEntries = [], fecha = "") {
  const year = String(fecha || new Date().toISOString().slice(0, 10)).slice(0, 4);
  const max = safeArray(existingEntries).reduce((currentMax, entry) => {
    const match = String(entry?.consecutivo || "").match(/^MC-(\d{4})-(\d+)$/);
    if (!match || match[1] !== year) return currentMax;
    return Math.max(currentMax, Number(match[2] || 0));
  }, 0);
  return `MC-${year}-${String(max + 1).padStart(4, "0")}`;
}

export function normalizeContabilidadConfig(raw = {}) {
  const base = buildDefaultContabilidadConfig();
  return {
    ...base,
    ...raw,
    id: String(raw.id || base.id),
    razonSocial: String(raw.razonSocial ?? raw.razon_social ?? base.razonSocial),
    nit: String(raw.nit ?? base.nit),
    marcoNormativo: String(raw.marcoNormativo ?? raw.marco_normativo ?? base.marcoNormativo),
    marcoNormativoLabel: String(
      raw.marcoNormativoLabel ?? raw.marco_normativo_label ?? base.marcoNormativoLabel
    ),
    moneda: String(raw.moneda ?? base.moneda),
    uvt: roundMoney(raw.uvt ?? base.uvt),
    autoCxc: Boolean(raw.autoCxc ?? raw.auto_cxc ?? base.autoCxc),
    autoCxp: Boolean(raw.autoCxp ?? raw.auto_cxp ?? base.autoCxp),
    autoNomina: Boolean(raw.autoNomina ?? raw.auto_nomina ?? base.autoNomina),
    cuentaBanco: String(raw.cuentaBanco ?? raw.cuenta_banco ?? base.cuentaBanco),
    cuentaCaja: String(raw.cuentaCaja ?? raw.cuenta_caja ?? base.cuentaCaja),
    cuentaClientes: String(raw.cuentaClientes ?? raw.cuenta_clientes ?? base.cuentaClientes),
    cuentaProveedores: String(
      raw.cuentaProveedores ?? raw.cuenta_proveedores ?? base.cuentaProveedores
    ),
    cuentaIvaDescontable: String(
      raw.cuentaIvaDescontable ??
        raw.cuenta_iva_descontable ??
        base.cuentaIvaDescontable
    ),
    cuentaIvaGenerado: String(
      raw.cuentaIvaGenerado ?? raw.cuenta_iva_generado ?? base.cuentaIvaGenerado
    ),
    cuentaRetefuente: String(
      raw.cuentaRetefuente ?? raw.cuenta_retefuente ?? base.cuentaRetefuente
    ),
    cuentaReteiva: String(raw.cuentaReteiva ?? raw.cuenta_reteiva ?? base.cuentaReteiva),
    cuentaReteica: String(raw.cuentaReteica ?? raw.cuenta_reteica ?? base.cuentaReteica),
    cuentaIngresoServicios: String(
      raw.cuentaIngresoServicios ??
        raw.cuenta_ingreso_servicios ??
        base.cuentaIngresoServicios
    ),
    cuentaCostoMateriales: String(
      raw.cuentaCostoMateriales ??
        raw.cuenta_costo_materiales ??
        base.cuentaCostoMateriales
    ),
    cuentaCostoServiciosObra: String(
      raw.cuentaCostoServiciosObra ??
        raw.cuenta_costo_servicios_obra ??
        base.cuentaCostoServiciosObra
    ),
    cuentaGastoServicios: String(
      raw.cuentaGastoServicios ??
        raw.cuenta_gasto_servicios ??
        base.cuentaGastoServicios
    ),
    cuentaGastoHonorarios: String(
      raw.cuentaGastoHonorarios ??
        raw.cuenta_gasto_honorarios ??
        base.cuentaGastoHonorarios
    ),
    cuentaGastoArrendamiento: String(
      raw.cuentaGastoArrendamiento ??
        raw.cuenta_gasto_arrendamiento ??
        base.cuentaGastoArrendamiento
    ),
    cuentaGastoDiverso: String(
      raw.cuentaGastoDiverso ??
        raw.cuenta_gasto_diverso ??
        base.cuentaGastoDiverso
    ),
    cuentaNominaSueldos: String(
      raw.cuentaNominaSueldos ??
        raw.cuenta_nomina_sueldos ??
        base.cuentaNominaSueldos
    ),
    cuentaNominaExtras: String(
      raw.cuentaNominaExtras ??
        raw.cuenta_nomina_extras ??
        base.cuentaNominaExtras
    ),
    cuentaNominaAuxilio: String(
      raw.cuentaNominaAuxilio ??
        raw.cuenta_nomina_auxilio ??
        base.cuentaNominaAuxilio
    ),
    cuentaNominaLiquidaciones: String(
      raw.cuentaNominaLiquidaciones ??
        raw.cuenta_nomina_liquidaciones ??
        base.cuentaNominaLiquidaciones
    ),
    cuentaNominaPorPagar: String(
      raw.cuentaNominaPorPagar ??
        raw.cuenta_nomina_por_pagar ??
        base.cuentaNominaPorPagar
    ),
    cuentaSaludPorPagar: String(
      raw.cuentaSaludPorPagar ??
        raw.cuenta_salud_por_pagar ??
        base.cuentaSaludPorPagar
    ),
    cuentaPensionPorPagar: String(
      raw.cuentaPensionPorPagar ??
        raw.cuenta_pension_por_pagar ??
        base.cuentaPensionPorPagar
    ),
    cuentaOtrasDeduccionesNomina: String(
      raw.cuentaOtrasDeduccionesNomina ??
        raw.cuenta_otras_deducciones_nomina ??
        base.cuentaOtrasDeduccionesNomina
    ),
    observaciones: String(raw.observaciones ?? base.observaciones),
  };
}

export function normalizePlanCuenta(raw = {}) {
  const codigo = String(raw.codigo ?? raw.id ?? "").trim();
  const grupoReporte = String(
    raw.grupoReporte ?? raw.grupo_reporte ?? inferGroupFromCodigo(codigo)
  ).trim();
  const categoriaEstado = String(
    raw.categoriaEstado ??
      raw.categoria_estado ??
      defaultCategoryByGroup[grupoReporte] ??
      "activo_corriente"
  ).trim();

  return {
    id: String(raw.id || codigo),
    codigo,
    nombre: String(raw.nombre || ""),
    naturaleza: String(raw.naturaleza || inferNaturalezaFromCodigo(codigo)),
    grupoReporte,
    grupoReporteLabel: accountGroupLabels[grupoReporte] || "Grupo",
    categoriaEstado,
    categoriaEstadoLabel:
      statementCategoryLabels[categoriaEstado] || "Categoria contable",
    permiteMovimientos: Boolean(
      raw.permiteMovimientos ?? raw.permite_movimientos ?? true
    ),
    requiereTercero: Boolean(raw.requiereTercero ?? raw.requiere_tercero ?? false),
    requiereCentroCosto: Boolean(
      raw.requiereCentroCosto ?? raw.requiere_centro_costo ?? false
    ),
    cuentaPadre: String(raw.cuentaPadre ?? raw.cuenta_padre ?? ""),
    activo: Boolean(raw.activo ?? true),
    descripcion: String(raw.descripcion ?? ""),
  };
}

function resolveAccountMeta(codigo, planMap) {
  const normalizedCode = String(codigo || "").trim();
  const account = planMap.get(normalizedCode);
  if (account) return account;

  const inferredGroup = inferGroupFromCodigo(normalizedCode);
  return normalizePlanCuenta({
    codigo: normalizedCode,
    nombre: `Cuenta ${normalizedCode}`,
    grupoReporte: inferredGroup,
    categoriaEstado: defaultCategoryByGroup[inferredGroup],
    naturaleza: inferNaturalezaFromCodigo(normalizedCode),
    activo: true,
  });
}

function normalizeAsientoLines(lines = [], planMap = new Map()) {
  return safeArray(lines)
    .map((line) => {
      const cuentaCodigo = String(
        line.cuentaCodigo ?? line.cuenta_codigo ?? ""
      ).trim();
      const account = resolveAccountMeta(cuentaCodigo, planMap);
      return createAsientoLine({
        ...line,
        cuentaCodigo,
        cuentaNombre:
          line.cuentaNombre ?? line.cuenta_nombre ?? account.nombre ?? "",
      });
    })
    .filter(
      (line) => line.cuentaCodigo && (line.debito > 0 || line.credito > 0)
    );
}

export function normalizeAsientoContable(raw = {}, planCuentas = []) {
  const planMap = new Map(planCuentas.map((item) => [item.codigo, item]));
  const lineas = normalizeAsientoLines(
    raw.lineas ?? raw.movimientos ?? raw.detalle ?? [],
    planMap
  );
  const totalDebito = roundMoney(
    lineas.reduce((sum, line) => sum + Number(line.debito || 0), 0)
  );
  const totalCredito = roundMoney(
    lineas.reduce((sum, line) => sum + Number(line.credito || 0), 0)
  );
  const fecha = String(raw.fecha || "").trim();
  const terceroNitHeader = String(
    raw.terceroNit ??
      raw.tercero_nit ??
      lineas.find((line) => line.terceroNit)?.terceroNit ??
      ""
  ).trim();
  const terceroIdHeader = String(
    raw.terceroId ??
      raw.tercero_id ??
      lineas.find((line) => line.terceroId)?.terceroId ??
      ""
  ).trim();
  const terceroNombreHeader = String(
    raw.terceroNombre ??
      raw.tercero_nombre ??
      lineas.find((line) => line.terceroNombre)?.terceroNombre ??
      ""
  ).trim();
  return {
    id: String(raw.id || buildId("AST")),
    consecutivo: String(raw.consecutivo || raw.numero || ""),
    fecha,
    periodo: String(raw.periodo || (fecha ? fecha.slice(0, 7) : "")),
    tipoComprobante: String(
      raw.tipoComprobante ?? raw.tipo_comprobante ?? "Diario"
    ),
    estado: String(raw.estado || "Contabilizado"),
    automatico: Boolean(raw.automatico),
    origen: String(raw.origen || "manual"),
    origenRef: String(raw.origenRef ?? raw.origen_ref ?? ""),
    descripcion: String(raw.descripcion || ""),
    terceroId: terceroIdHeader,
    terceroNit: terceroNitHeader,
    terceroNombre: terceroNombreHeader,
    soporte: String(raw.soporte || ""),
    lineas,
    totalDebito,
    totalCredito,
    diferencia: roundMoney(totalDebito - totalCredito),
  };
}

export function isBalancedEntry(entry) {
  return roundMoney(entry.totalDebito) === roundMoney(entry.totalCredito);
}

function buildAutoEntry({
  id,
  consecutivo,
  fecha,
  tipoComprobante,
  origen,
  origenRef,
  descripcion,
  terceroId,
  terceroNit,
  terceroNombre,
  soporte,
  lineas,
  planMap,
}) {
  return normalizeAsientoContable(
    {
      id,
      consecutivo,
      fecha,
      periodo: String(fecha || "").slice(0, 7),
      tipoComprobante,
      estado: "Contabilizado",
      automatico: true,
      origen,
      origenRef,
      descripcion,
      terceroId,
      terceroNit,
      terceroNombre,
      soporte,
      lineas: normalizeAsientoLines(lineas, planMap),
    },
    Array.from(planMap.values())
  );
}

function normalizeCuentaPorPagar(raw = {}) {
  const valorTotalPagar = roundMoney(
    raw.valorTotalPagar ??
      raw.valor_total_pagar ??
      raw.monto ??
      raw.valorBrutoFactura ??
      raw.valor_bruto_factura ??
      0
  );
  const subtotal = roundMoney(raw.subtotal ?? raw.baseRetFuente ?? raw.monto ?? 0);
  const montoPagado = roundMoney(raw.montoPagado ?? raw.monto_pagado ?? 0);
  const pagosHistorial = safeArray(raw.pagosHistorial ?? raw.pagos_historial);
  const saldoPendienteActual = roundMoney(
    raw.saldoPendienteActual ??
      raw.saldo_pendiente_actual ??
      Math.max(0, valorTotalPagar - montoPagado)
  );
  return {
    ...raw,
    subtotal,
    valorIva: roundMoney(raw.valorIva ?? raw.valor_iva ?? 0),
    valorRetFuente: roundMoney(raw.valorRetFuente ?? raw.valor_ret_fuente ?? 0),
    valorReteiva: roundMoney(raw.valorReteiva ?? raw.valor_reteiva ?? 0),
    valorReteica: roundMoney(raw.valorReteica ?? raw.valor_reteica ?? 0),
    valorTotalPagar,
    montoPagado,
    saldoPendienteActual,
    pagosHistorial,
  };
}

function inferCuentaGasto(cuenta, config) {
  if (cuenta.obraId) {
    if (cuenta.tipoOperacion === "bien") return config.cuentaCostoMateriales;
    return config.cuentaCostoServiciosObra;
  }
  if (cuenta.tipoOperacion === "honorario") return config.cuentaGastoHonorarios;
  if (cuenta.tipoOperacion === "arrendamiento")
    return config.cuentaGastoArrendamiento;
  if (cuenta.tipoOperacion === "servicio") return config.cuentaGastoServicios;
  return config.cuentaGastoDiverso;
}

function buildSyntheticPayments(cuenta) {
  if (cuenta.pagosHistorial.length) return cuenta.pagosHistorial;
  if (cuenta.montoPagado <= 0) return [];
  return [
    {
      id: `${cuenta.id}-PAGO-SINT`,
      fecha: cuenta.fechaPago || cuenta.fecha || "",
      monto: cuenta.montoPagado,
      valor: cuenta.montoPagado,
      metodo: "Transferencia",
      medio: "Transferencia",
      estado: cuenta.estado || "Pagado",
      factura: cuenta.factura || "",
      conceptoFactura: cuenta.concepto || "",
      cuentaId: cuenta.id,
    },
  ];
}

function normalizeCobro(raw = {}) {
  return {
    ...raw,
    id: String(raw.id || buildId("PG")),
    obraId: String(raw.obraId ?? raw.obra_id ?? ""),
    tipo: String(raw.tipo ?? raw.referencia ?? "Abono"),
    monto: roundMoney(raw.monto ?? raw.valor ?? 0),
    valor: roundMoney(raw.valor ?? raw.monto ?? 0),
    fecha: String(raw.fecha || ""),
    estado: String(raw.estado || "Pendiente"),
    metodo: String(raw.metodo ?? raw.medio ?? ""),
    medio: String(raw.medio ?? raw.metodo ?? ""),
    notas: String(raw.notas || ""),
  };
}

function normalizeObraIngreso(raw = {}) {
  return {
    ...raw,
    id: String(raw.id || buildId("OB")),
    cliente: String(raw.cliente || ""),
    nit: String(raw.nit || ""),
    proyecto: String(raw.proyecto || raw.obra || ""),
    estado: String(raw.estado || ""),
    total: roundMoney(raw.total ?? 0),
    pagado: roundMoney(raw.pagado ?? 0),
    saldo: roundMoney(raw.saldo ?? 0),
    fechaInicio: String(raw.fechaInicio ?? raw.fecha_inicio ?? ""),
    fechaFin: String(raw.fechaFin ?? raw.fecha_fin ?? ""),
    cotizacionId: String(raw.cotizacionId ?? raw.cotizacion_id ?? ""),
  };
}

function normalizeNominaGenerada(raw = {}) {
  const snapshot = raw.snapshot ?? raw;
  const periodo = snapshot?.periodo ?? {};
  const totals = snapshot?.totals ?? {};
  return {
    ...raw,
    id: String(raw.id || snapshot?.id || buildId("NOM")),
    generadoEn: String(raw.generadoEn ?? raw.generado_en ?? snapshot?.generadoEn ?? ""),
    periodoMes: String(raw.periodoMes ?? raw.periodo_mes ?? periodo?.mes ?? ""),
    periodoCorte: String(raw.periodoCorte ?? raw.periodo_corte ?? periodo?.corte ?? ""),
    periodoLabel: String(raw.periodoLabel ?? raw.periodo_label ?? periodo?.label ?? ""),
    planoBanco: String(raw.planoBanco ?? raw.plano_banco ?? ""),
    snapshot: {
      ...snapshot,
      id: String(snapshot?.id || raw.id || ""),
      generadoEn: String(snapshot?.generadoEn ?? raw.generadoEn ?? raw.generado_en ?? ""),
      periodo: {
        mes: String(periodo?.mes || raw.periodoMes || raw.periodo_mes || ""),
        corte: String(periodo?.corte || raw.periodoCorte || raw.periodo_corte || ""),
        label: String(periodo?.label || raw.periodoLabel || raw.periodo_label || ""),
        startIso: String(periodo?.startIso || ""),
        endIso: String(periodo?.endIso || ""),
        diasReferencia: Number(periodo?.diasReferencia || 0),
      },
      registros: safeArray(snapshot?.registros),
      registrosBanco: safeArray(snapshot?.registrosBanco),
      totals: {
        totalNomina: roundMoney(totals?.totalNomina || 0),
        totalLiquidaciones: roundMoney(totals?.totalLiquidaciones || 0),
        totalPagar: roundMoney(totals?.totalPagar || 0),
        totalBanco: roundMoney(totals?.totalBanco || 0),
        totalRegistros: Number(totals?.totalRegistros || 0),
        totalRegistrosBanco: Number(totals?.totalRegistrosBanco || 0),
      },
    },
  };
}

function resolveCashAccount(method = "", settings) {
  const normalizedMethod = String(method || "").trim().toLowerCase();
  if (normalizedMethod.includes("efectivo") || normalizedMethod.includes("caja")) {
    return settings.cuentaCaja;
  }
  return settings.cuentaBanco;
}

function resolveAutoDate(...values) {
  const date = values.find((value) => String(value || "").trim());
  return String(date || "").trim();
}

export function buildAutomaticAccountingEntries({
  pagos = [],
  cuentas = [],
  clientes = [],
  proveedores = [],
  obras = [],
  nominasGeneradas = [],
  config,
  planCuentas = [],
}) {
  const settings = normalizeContabilidadConfig(config);

  const planMap = new Map(
    safeArray(planCuentas).map((item) => {
      const normalized = normalizePlanCuenta(item);
      return [normalized.codigo, normalized];
    })
  );
  const proveedoresMap = new Map(
    safeArray(proveedores).map((item) => [item.id, item])
  );
  const clientesById = new Map(
    safeArray(clientes).map((item) => [String(item.id || ""), item])
  );
  const clientesByName = new Map(
    safeArray(clientes).map((item) => [normalizeLookupKey(item.nombre), item])
  );
  const obrasMap = new Map(safeArray(obras).map((item) => [item.id, item]));

  const entries = [];

  if (settings.autoCxc) {
    safeArray(obras)
      .map(normalizeObraIngreso)
      .filter((obra) => obra.total > 0 && obra.estado.toLowerCase() !== "cotizacion")
      .forEach((obra) => {
        const fechaCausacion = resolveAutoDate(obra.fechaInicio, obra.fechaFin);
        if (!fechaCausacion) return;
        const cliente =
          clientesById.get(String(obra.clienteId || "")) ||
          clientesByName.get(normalizeLookupKey(obra.cliente)) ||
          {};
        const terceroId = String(cliente.id || obra.id || "");
        const terceroNit = String(obra.nit || cliente.nit || "").trim();
        const terceroNombre = String(obra.cliente || cliente.nombre || obra.proyecto || obra.id || "").trim();

        entries.push(
          buildAutoEntry({
            id: `AUTO-CXC-${obra.id}`,
            consecutivo: `CXC-${obra.id}`,
            fecha: fechaCausacion,
            tipoComprobante: "Causacion ingreso",
            origen: "cxc",
            origenRef: obra.id,
            descripcion: `Causacion ingreso ${obra.proyecto || obra.id}`,
            terceroId,
            terceroNit,
            terceroNombre,
            soporte: obra.cotizacionId || obra.id,
            lineas: [
              createAsientoLine({
                cuentaCodigo: settings.cuentaClientes,
                detalle: `Cuenta por cobrar ${obra.proyecto || obra.id}`,
                debito: obra.total,
                terceroId,
                terceroNit,
                terceroNombre,
                centroCosto: obra.id,
              }),
              createAsientoLine({
                cuentaCodigo: settings.cuentaIngresoServicios,
                detalle: `Ingreso causado ${obra.proyecto || obra.id}`,
                credito: obra.total,
                terceroId,
                terceroNit,
                terceroNombre,
                centroCosto: obra.id,
              }),
            ],
            planMap,
          })
        );
      });

    safeArray(pagos)
      .map(normalizeCobro)
      .filter((payment) => payment.monto > 0 && payment.estado.toLowerCase() === "pagado")
      .forEach((payment) => {
        const obra = obrasMap.get(payment.obraId) || {};
        const cliente =
          clientesById.get(String(obra.clienteId || "")) ||
          clientesByName.get(normalizeLookupKey(obra.cliente)) ||
          {};
        const cashAccount = resolveCashAccount(payment.metodo || payment.medio, settings);
        const terceroId = String(cliente.id || payment.obraId || "");
        const terceroNit = String(obra.nit || cliente.nit || "").trim();
        const terceroNombre = String(obra.cliente || cliente.nombre || obra.proyecto || payment.obraId || "").trim();

        entries.push(
          buildAutoEntry({
            id: `AUTO-CXC-RECAUDO-${payment.id}`,
            consecutivo: `RCB-${payment.id}`,
            fecha: payment.fecha || resolveAutoDate(obra.fechaFin, obra.fechaInicio),
            tipoComprobante: "Comprobante de ingreso",
            origen: "cxc_abono",
            origenRef: payment.id,
            descripcion:
              `${payment.tipo || "Abono"} ${obra.proyecto || payment.obraId || ""}`.trim(),
            terceroId,
            terceroNit,
            terceroNombre,
            soporte: payment.id,
            lineas: [
              createAsientoLine({
                cuentaCodigo: cashAccount,
                detalle: `Recaudo ${payment.tipo || "abono"} ${obra.proyecto || ""}`.trim(),
                debito: payment.monto,
                terceroId,
                terceroNit,
                terceroNombre,
                centroCosto: payment.obraId || "",
              }),
              createAsientoLine({
                cuentaCodigo: settings.cuentaClientes,
                detalle: `Abono cuenta por cobrar ${obra.proyecto || payment.obraId || ""}`.trim(),
                credito: payment.monto,
                terceroId,
                terceroNit,
                terceroNombre,
                centroCosto: payment.obraId || "",
              }),
            ],
            planMap,
          })
        );
      });
  }

  if (settings.autoCxp) {
    safeArray(cuentas)
      .map(normalizeCuentaPorPagar)
      .forEach((cuenta) => {
        const proveedor = proveedoresMap.get(cuenta.proveedorId) || {};
        const obra = obrasMap.get(cuenta.obraId) || {};
        const cuentaGasto = inferCuentaGasto(cuenta, settings);
        const terceroNit = String(proveedor.nit || "").trim();

        const causacionLines = [
          createAsientoLine({
            cuentaCodigo: cuentaGasto,
            detalle: cuenta.concepto || "Causacion cuenta por pagar",
            debito: cuenta.subtotal,
            terceroId: cuenta.proveedorId || "",
            terceroNit,
            terceroNombre: proveedor.nombre || "",
            centroCosto: cuenta.obraId || "",
          }),
        ];

        if (cuenta.valorIva > 0) {
          causacionLines.push(
            createAsientoLine({
            cuentaCodigo: settings.cuentaIvaDescontable,
            detalle: `IVA descontable ${cuenta.factura || cuenta.id}`,
            debito: cuenta.valorIva,
            terceroId: cuenta.proveedorId || "",
            terceroNit,
            terceroNombre: proveedor.nombre || "",
            centroCosto: cuenta.obraId || "",
          })
        );
      }

        if (cuenta.valorRetFuente > 0) {
          causacionLines.push(
            createAsientoLine({
            cuentaCodigo: settings.cuentaRetefuente,
            detalle: `Retefuente ${cuenta.factura || cuenta.id}`,
            credito: cuenta.valorRetFuente,
            terceroId: cuenta.proveedorId || "",
            terceroNit,
            terceroNombre: proveedor.nombre || "",
          })
        );
      }

        if (cuenta.valorReteiva > 0) {
          causacionLines.push(
            createAsientoLine({
            cuentaCodigo: settings.cuentaReteiva,
            detalle: `ReteIVA ${cuenta.factura || cuenta.id}`,
            credito: cuenta.valorReteiva,
            terceroId: cuenta.proveedorId || "",
            terceroNit,
            terceroNombre: proveedor.nombre || "",
          })
        );
      }

        if (cuenta.valorReteica > 0) {
          causacionLines.push(
            createAsientoLine({
            cuentaCodigo: settings.cuentaReteica,
            detalle: `ReteICA ${cuenta.factura || cuenta.id}`,
            credito: cuenta.valorReteica,
            terceroId: cuenta.proveedorId || "",
            terceroNit,
            terceroNombre: proveedor.nombre || "",
          })
        );
      }

        causacionLines.push(
          createAsientoLine({
            cuentaCodigo: settings.cuentaProveedores,
            detalle:
            (cuenta.factura ? `Factura ${cuenta.factura}` : cuenta.id) +
            " - neto a pagar",
          credito: cuenta.valorTotalPagar,
          terceroId: cuenta.proveedorId || "",
          terceroNit,
          terceroNombre: proveedor.nombre || "",
          centroCosto: cuenta.obraId || "",
        })
      );

        entries.push(
          buildAutoEntry({
            id: `AUTO-CXP-${cuenta.id}`,
            consecutivo: `CXP-${cuenta.id}`,
            fecha: cuenta.fecha || "",
            tipoComprobante: "Causacion gasto/servicio",
            origen: "cxp",
            origenRef: cuenta.id,
            descripcion:
              cuenta.concepto ||
              `Causacion proveedor ${proveedor.nombre || cuenta.proveedorId || ""}`,
            terceroId: cuenta.proveedorId || "",
            terceroNit,
            terceroNombre: proveedor.nombre || "",
            soporte: cuenta.factura || cuenta.id,
            lineas: causacionLines,
            planMap,
          })
        );

        buildSyntheticPayments(cuenta).forEach((payment) => {
          const amount = roundMoney(payment.monto ?? payment.valor ?? 0);
          if (amount <= 0) return;

          entries.push(
            buildAutoEntry({
              id: `AUTO-CXP-PAGO-${cuenta.id}-${payment.id}`,
              consecutivo: `EGR-${payment.id}`,
              fecha: payment.fecha || cuenta.fechaPago || cuenta.fecha || "",
              tipoComprobante: "Comprobante de egreso",
              origen: "cxp_pago",
              origenRef: `${cuenta.id}:${payment.id}`,
              descripcion:
                `Pago ${proveedor.nombre || cuenta.proveedorId || "proveedor"} ` +
                `(${cuenta.factura || cuenta.id})`,
              terceroId: cuenta.proveedorId || "",
              terceroNit,
              terceroNombre: proveedor.nombre || "",
              soporte: payment.factura || cuenta.factura || cuenta.id,
              lineas: [
                createAsientoLine({
                  cuentaCodigo: settings.cuentaProveedores,
                  detalle:
                    `Abono a factura ${cuenta.factura || cuenta.id}` +
                    (obra.id ? ` - ${obra.id}` : ""),
                  debito: amount,
                  terceroId: cuenta.proveedorId || "",
                  terceroNit,
                  terceroNombre: proveedor.nombre || "",
                  centroCosto: cuenta.obraId || "",
                }),
                createAsientoLine({
                  cuentaCodigo: resolveCashAccount(payment.metodo || payment.medio, settings),
                  detalle:
                    `Salida de banco por pago proveedor ${proveedor.nombre || ""}`,
                  credito: amount,
                  terceroId: cuenta.proveedorId || "",
                  terceroNit,
                  terceroNombre: proveedor.nombre || "",
                }),
              ],
              planMap,
            })
          );
        });
      });
  }

  if (settings.autoNomina) {
    safeArray(nominasGeneradas)
      .map(normalizeNominaGenerada)
      .forEach((payroll) => {
        const snapshot = payroll.snapshot || {};
        const totals = snapshot.totals || {};
        const registros = safeArray(snapshot.registros);
        const fechaNomina = resolveAutoDate(
          snapshot?.periodo?.endIso,
          payroll.generadoEn.slice(0, 10),
          snapshot?.generadoEn?.slice(0, 10)
        );
        if (!fechaNomina || totals.totalPagar <= 0 || !registros.length) return;

        const totalSalarios = roundMoney(
          registros.reduce((sum, registro) => sum + Number(registro?.resumen?.salario || 0), 0)
        );
        const totalExtras = roundMoney(
          registros.reduce(
            (sum, registro) =>
              sum +
              Number(registro?.resumen?.horasExtras || 0) +
              Number(registro?.resumen?.comisiones || 0),
            0
          )
        );
        const totalAuxilio = roundMoney(
          registros.reduce(
            (sum, registro) => sum + Number(registro?.resumen?.auxilioTransporte || 0),
            0
          )
        );
        const totalLiquidaciones = roundMoney(
          registros.reduce(
            (sum, registro) => sum + Number(registro?.liquidacionPrestaciones || 0),
            0
          )
        );
        const totalSalud = roundMoney(
          registros.reduce((sum, registro) => sum + Number(registro?.resumen?.salud || 0), 0)
        );
        const totalPension = roundMoney(
          registros.reduce((sum, registro) => sum + Number(registro?.resumen?.pension || 0), 0)
        );
        const totalOtrasDeducciones = roundMoney(
          registros.reduce(
            (sum, registro) => sum + Number(registro?.resumen?.otrasDeducciones || 0),
            0
          )
        );

        const causacionLines = [];
        if (totalSalarios > 0) {
          causacionLines.push(
            createAsientoLine({
              cuentaCodigo: settings.cuentaNominaSueldos,
              detalle: `Sueldos ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
              debito: totalSalarios,
            })
          );
        }
        if (totalExtras > 0) {
          causacionLines.push(
            createAsientoLine({
              cuentaCodigo: settings.cuentaNominaExtras,
              detalle: `Extras y comisiones ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
              debito: totalExtras,
            })
          );
        }
        if (totalAuxilio > 0) {
          causacionLines.push(
            createAsientoLine({
              cuentaCodigo: settings.cuentaNominaAuxilio,
              detalle: `Auxilio transporte ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
              debito: totalAuxilio,
            })
          );
        }
        if (totalLiquidaciones > 0) {
          causacionLines.push(
            createAsientoLine({
              cuentaCodigo: settings.cuentaNominaLiquidaciones,
              detalle: `Liquidaciones ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
              debito: totalLiquidaciones,
            })
          );
        }
        if (totals.totalPagar > 0) {
          causacionLines.push(
            createAsientoLine({
              cuentaCodigo: settings.cuentaNominaPorPagar,
              detalle: `Neto nomina por pagar ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
              credito: totals.totalPagar,
            })
          );
        }
        if (totalSalud > 0) {
          causacionLines.push(
            createAsientoLine({
              cuentaCodigo: settings.cuentaSaludPorPagar,
              detalle: `Salud por pagar ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
              credito: totalSalud,
            })
          );
        }
        if (totalPension > 0) {
          causacionLines.push(
            createAsientoLine({
              cuentaCodigo: settings.cuentaPensionPorPagar,
              detalle: `Pension por pagar ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
              credito: totalPension,
            })
          );
        }
        if (totalOtrasDeducciones > 0) {
          causacionLines.push(
            createAsientoLine({
              cuentaCodigo: settings.cuentaOtrasDeduccionesNomina,
              detalle: `Otras deducciones nomina ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
              credito: totalOtrasDeducciones,
            })
          );
        }

        entries.push(
          buildAutoEntry({
            id: `AUTO-NOM-${payroll.id}`,
            consecutivo: `NOM-${payroll.id}`,
            fecha: fechaNomina,
            tipoComprobante: "Comprobante de nomina",
            origen: "nomina",
            origenRef: payroll.id,
            descripcion: `Nomina ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
            terceroId: "",
            terceroNit: "VARIOS",
            terceroNombre: "Empleados",
            soporte: payroll.id,
            lineas: causacionLines,
            planMap,
          })
        );

        if (payroll.planoBanco && totals.totalBanco > 0) {
          entries.push(
            buildAutoEntry({
              id: `AUTO-NOM-PAGO-${payroll.id}`,
              consecutivo: `EGR-NOM-${payroll.id}`,
              fecha: fechaNomina,
              tipoComprobante: "Comprobante de egreso",
              origen: "nomina_pago",
              origenRef: payroll.id,
              descripcion: `Pago banco nomina ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
              terceroId: "",
              terceroNit: "VARIOS",
              terceroNombre: "Empleados",
              soporte: payroll.id,
              lineas: [
                createAsientoLine({
                  cuentaCodigo: settings.cuentaNominaPorPagar,
                  detalle: `Pago nomina ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
                  debito: totals.totalBanco,
                  terceroNit: "VARIOS",
                  terceroNombre: "Empleados",
                }),
                createAsientoLine({
                  cuentaCodigo: settings.cuentaBanco,
                  detalle: `Salida banco nomina ${payroll.periodoLabel || snapshot?.periodo?.label || payroll.id}`,
                  credito: totals.totalBanco,
                  terceroNit: "VARIOS",
                  terceroNombre: "Empleados",
                }),
              ],
              planMap,
            })
          );
        }
      });
  }

  return entries.sort((a, b) => {
    const dateCompare = String(a.fecha || "").localeCompare(String(b.fecha || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(a.consecutivo || a.id).localeCompare(String(b.consecutivo || b.id));
  });
}

export function buildCombinedEntries({
  asientosManuales = [],
  pagos = [],
  cuentas = [],
  clientes = [],
  proveedores = [],
  obras = [],
  nominasGeneradas = [],
  config,
  planCuentas = [],
}) {
  const manualEntries = safeArray(asientosManuales).map((entry) =>
    normalizeAsientoContable(entry, planCuentas)
  );
  const automaticEntries = buildAutomaticAccountingEntries({
    pagos,
    cuentas,
    clientes,
    proveedores,
    obras,
    nominasGeneradas,
    config,
    planCuentas,
  });
  return [...manualEntries, ...automaticEntries].sort((a, b) => {
    const dateCompare = String(a.fecha || "").localeCompare(String(b.fecha || ""));
    if (dateCompare !== 0) return dateCompare;
    return String(a.consecutivo || a.id).localeCompare(String(b.consecutivo || b.id));
  });
}

export function filterEntriesByPeriod(entries = [], period = "") {
  const normalized = String(period || "").trim();
  if (!normalized || normalized === "todas") return safeArray(entries);
  return safeArray(entries).filter((entry) =>
    String(entry.fecha || entry.periodo || "").startsWith(normalized)
  );
}

export function buildTrialBalance({ entries = [], planCuentas = [] }) {
  const planMap = new Map(
    safeArray(planCuentas).map((item) => {
      const normalized = normalizePlanCuenta(item);
      return [normalized.codigo, normalized];
    })
  );
  const rowsMap = new Map();

  safeArray(entries).forEach((entry) => {
    if (entry.estado === "Anulado") return;
    safeArray(entry.lineas).forEach((line) => {
      const meta = resolveAccountMeta(line.cuentaCodigo, planMap);
      const current =
        rowsMap.get(meta.codigo) || {
          ...meta,
          debitos: 0,
          creditos: 0,
        };
      current.debitos = roundMoney(current.debitos + Number(line.debito || 0));
      current.creditos = roundMoney(current.creditos + Number(line.credito || 0));
      rowsMap.set(meta.codigo, current);
    });
  });

  return Array.from(rowsMap.values())
    .map((row) => {
      const saldoNatural =
        row.naturaleza === "debito"
          ? roundMoney(row.debitos - row.creditos)
          : roundMoney(row.creditos - row.debitos);
      return {
        ...row,
        saldoNatural,
        saldoDebito: saldoNatural > 0 && row.naturaleza === "debito" ? saldoNatural : 0,
        saldoCredito:
          saldoNatural > 0 && row.naturaleza === "credito" ? saldoNatural : 0,
      };
    })
    .sort((a, b) => String(a.codigo).localeCompare(String(b.codigo), "es"));
}

export function buildFinancialStatements(trialBalance = []) {
  const activos = [];
  const pasivos = [];
  const patrimonio = [];
  const ingresos = [];
  const costos = [];
  const gastos = [];

  safeArray(trialBalance).forEach((row) => {
    if (!row.saldoNatural) return;
    if (row.grupoReporte === "activo") activos.push(row);
    if (row.grupoReporte === "pasivo") pasivos.push(row);
    if (row.grupoReporte === "patrimonio") patrimonio.push(row);
    if (row.grupoReporte === "ingreso") ingresos.push(row);
    if (row.grupoReporte === "costo") costos.push(row);
    if (row.grupoReporte === "gasto") gastos.push(row);
  });

  const total = (rows) =>
    roundMoney(rows.reduce((sum, item) => sum + Number(item.saldoNatural || 0), 0));

  const utilidadBruta = roundMoney(total(ingresos) - total(costos));
  const utilidadOperacional = roundMoney(utilidadBruta - total(gastos));
  const patrimonioTotal = roundMoney(total(patrimonio) + utilidadOperacional);

  return {
    balance: {
      activos,
      pasivos,
      patrimonio,
      totalActivos: total(activos),
      totalPasivos: total(pasivos),
      totalPatrimonio: patrimonioTotal,
    },
    resultados: {
      ingresos,
      costos,
      gastos,
      totalIngresos: total(ingresos),
      totalCostos: total(costos),
      totalGastos: total(gastos),
      utilidadBruta,
      utilidadOperacional,
    },
  };
}

export function summarizeEntries(entries = []) {
  return safeArray(entries).reduce(
    (acc, entry) => {
      acc.totalDebitos = roundMoney(acc.totalDebitos + Number(entry.totalDebito || 0));
      acc.totalCreditos = roundMoney(
        acc.totalCreditos + Number(entry.totalCredito || 0)
      );
      if (entry.automatico) acc.totalAutomaticos += 1;
      else acc.totalManuales += 1;
      if (entry.estado === "Anulado") acc.totalAnulados += 1;
      return acc;
    },
    {
      totalDebitos: 0,
      totalCreditos: 0,
      totalAutomaticos: 0,
      totalManuales: 0,
      totalAnulados: 0,
    }
  );
}

export function getStatementCategoryOptions() {
  return Object.entries(statementCategoryLabels).map(([value, label]) => ({
    value,
    label,
  }));
}

export function getAccountGroupOptions() {
  return Object.entries(accountGroupLabels).map(([value, label]) => ({
    value,
    label,
  }));
}
