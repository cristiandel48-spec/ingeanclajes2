/**
 * Configuración oficial de retenciones que practican los clientes a Ingeanclajes S.A.S.
 * Cada concepto está estrictamente amarrado a su cuenta PUC (Plan Único de Cuentas).
 */

export const CUENTAS_RETENCION = {
  retefuente: {
    codigo: "135515",
    nombre: "Retención en la fuente a favor (Renta)",
    tipo: "Activo - Anticipo de impuestos",
  },
  reteiva: {
    codigo: "135517",
    nombre: "Impuesto a las ventas retenido a favor (ReteIVA)",
    tipo: "Activo - Anticipo de impuestos",
  },
  reteica: {
    codigo: "135518",
    nombre: "Impuesto de industria y comercio retenido (ReteICA a favor)",
    tipo: "Activo - Anticipo de impuestos",
  },
  otras: {
    codigo: "135595",
    nombre: "Otras retenciones y contribuciones a favor",
    tipo: "Activo - Anticipo de impuestos",
  },
  clientes: {
    codigo: "130505",
    nombre: "Clientes nacionales",
    tipo: "Activo - Cuentas por cobrar",
  },
  bancos: {
    codigo: "111005",
    nombre: "Bancos moneda nacional",
    tipo: "Activo - Disponible",
  },
  caja: {
    codigo: "110505",
    nombre: "Caja general",
    tipo: "Activo - Disponible",
  },
};

export const CONCEPTOS_RETEFUENTE = [
  { id: "obra_2", label: "Contratos de construcción y obra civil · 2.0%", tarifa: 2.0, cuenta: "135515" },
  { id: "serv_4", label: "Servicios de ingeniería y especializados · 4.0%", tarifa: 4.0, cuenta: "135515" },
  { id: "serv_6", label: "Servicios generales (Otros) · 6.0%", tarifa: 6.0, cuenta: "135515" },
  { id: "compras_25", label: "Compras de suministros y materiales · 2.5%", tarifa: 2.5, cuenta: "135515" },
  { id: "honorarios_11", label: "Honorarios profesionales (Persona Jurídica) · 11.0%", tarifa: 11.0, cuenta: "135515" },
  { id: "honorarios_10", label: "Honorarios profesionales (Persona Natural) · 10.0%", tarifa: 10.0, cuenta: "135515" },
  { id: "ninguna", label: "No aplica retención en la fuente (0%)", tarifa: 0, cuenta: "135515" },
  { id: "personalizada", label: "Tarifa personalizada (%)", tarifa: null, cuenta: "135515" },
];

export const CONCEPTOS_RETEIVA = [
  { id: "ninguna", label: "No aplica ReteIVA (0%)", tarifa: 0, cuenta: "135517" },
  { id: "iva_15", label: "ReteIVA 15% sobre IVA (15% del 19% ≈ 2.85% de la base)", tarifa: 2.85, esSobreIva: true, cuenta: "135517" },
  { id: "personalizada", label: "Tarifa directa sobre base (%)", tarifa: null, cuenta: "135517" },
  { id: "manual", label: "Digitar valor manual en pesos ($)", tarifa: null, cuenta: "135517" },
];

export const CONCEPTOS_RETEICA = [
  { id: "ica_69", label: "Servicios de construcción / obra Medellín y Envigado · 6.9 ‰ (0.69%)", tarifa: 6.9, cuenta: "135518" },
  { id: "ica_70", label: "Servicios de construcción y obra · 7.0 ‰ (0.70%)", tarifa: 7.0, cuenta: "135518" },
  { id: "ica_80", label: "Servicios de construcción y obra · 8.0 ‰ (0.80%)", tarifa: 8.0, cuenta: "135518" },
  { id: "ica_966", label: "Servicios comerciales y generales · 9.66 ‰ (0.966%)", tarifa: 9.66, cuenta: "135518" },
  { id: "ica_1104", label: "Actividades industriales · 11.04 ‰ (1.104%)", tarifa: 11.04, cuenta: "135518" },
  { id: "ninguna", label: "No aplica ReteICA (0 ‰)", tarifa: 0, cuenta: "135518" },
  { id: "personalizada", label: "Tarifa por mil personalizada (‰)", tarifa: null, cuenta: "135518" },
  { id: "manual", label: "Digitar valor manual en pesos ($)", tarifa: null, cuenta: "135518" },
];

export const CONCEPTOS_OTRAS = [
  { id: "ninguna", label: "No aplica otras retenciones (0%)", tarifa: 0, cuenta: "135595" },
  { id: "estampilla_1", label: "Estampillas pro-cultura / pro-anciano · 1.0%", tarifa: 1.0, cuenta: "135595" },
  { id: "estampilla_2", label: "Estampillas departamentales · 2.0%", tarifa: 2.0, cuenta: "135595" },
  { id: "retegarantia_5", label: "Retegarantía contractual de obra · 5.0%", tarifa: 5.0, cuenta: "135595" },
  { id: "manual", label: "Digitar valor manual en pesos ($)", tarifa: null, cuenta: "135595" },
];

/**
 * Calcula automáticamente el desglose de retenciones a partir de la base bruta y las tarifas
 */
export function calcularRetencionesRecibo({
  base = 0,
  reteFuente = { concepto: "obra_2", tarifa: 2.0, valor: 0, manual: false },
  reteIva = { concepto: "ninguna", tarifa: 0, valor: 0, manual: false },
  reteIca = { concepto: "ica_69", tarifa: 6.9, valor: 0, manual: false },
  otras = { concepto: "ninguna", tarifa: 0, valor: 0, manual: false },
}) {
  const montoBase = Math.max(0, Number(base || 0));

  // 1. ReteFuente
  let vFuente = 0;
  if (reteFuente.manual) {
    vFuente = Math.max(0, Number(reteFuente.valor || 0));
  } else {
    const t = Number(reteFuente.tarifa || 0);
    vFuente = t > 0 ? Math.round(montoBase * (t / 100)) : 0;
  }

  // 2. ReteIVA
  let vIva = 0;
  if (reteIva.manual) {
    vIva = Math.max(0, Number(reteIva.valor || 0));
  } else {
    const t = Number(reteIva.tarifa || 0);
    vIva = t > 0 ? Math.round(montoBase * (t / 100)) : 0;
  }

  // 3. ReteICA (Tarifa es por mil)
  let vIca = 0;
  if (reteIca.manual) {
    vIca = Math.max(0, Number(reteIca.valor || 0));
  } else {
    const t = Number(reteIca.tarifa || 0);
    vIca = t > 0 ? Math.round(montoBase * (t / 1000)) : 0;
  }

  // 4. Otras
  let vOtras = 0;
  if (otras.manual) {
    vOtras = Math.max(0, Number(otras.valor || 0));
  } else {
    const t = Number(otras.tarifa || 0);
    vOtras = t > 0 ? Math.round(montoBase * (t / 100)) : 0;
  }

  const totalRetenciones = vFuente + vIva + vIca + vOtras;
  const montoNeto = Math.max(0, montoBase - totalRetenciones);

  return {
    montoBruto: montoBase,
    reteFuente: {
      cuenta: "135515",
      cuentaNombre: CUENTAS_RETENCION.retefuente.nombre,
      concepto: reteFuente.concepto,
      tarifa: Number(reteFuente.tarifa || 0),
      valor: vFuente,
      manual: !!reteFuente.manual,
    },
    reteIva: {
      cuenta: "135517",
      cuentaNombre: CUENTAS_RETENCION.reteiva.nombre,
      concepto: reteIva.concepto,
      tarifa: Number(reteIva.tarifa || 0),
      valor: vIva,
      manual: !!reteIva.manual,
    },
    reteIca: {
      cuenta: "135518",
      cuentaNombre: CUENTAS_RETENCION.reteica.nombre,
      concepto: reteIca.concepto,
      tarifa: Number(reteIca.tarifa || 0),
      valor: vIca,
      manual: !!reteIca.manual,
    },
    otras: {
      cuenta: "135595",
      cuentaNombre: CUENTAS_RETENCION.otras.nombre,
      concepto: otras.concepto,
      tarifa: Number(otras.tarifa || 0),
      valor: vOtras,
      manual: !!otras.manual,
    },
    totalRetenciones,
    montoNeto,
  };
}
