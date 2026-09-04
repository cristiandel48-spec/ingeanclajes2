// Datos iniciales de la aplicacion.
//
// Los arreglos de negocio (obras, cotizaciones, clientes, empleados...) van
// VACIOS a proposito: la aplicacion se entrega sin datos de ejemplo y se
// llena con los del cliente. Antes traian casos de demostracion con nombres
// que parecian reales, y se veian por un instante al abrir, o de forma
// permanente si fallaba la carga desde la nube.
//
// Si se conservan porque no son ejemplos:
//   PLAN_CUENTAS_INIT / CONTABILIDAD_CONFIG_INIT -> plan contable y config
//   ITEMS_DB                                     -> catalogo de servicios
//   DEFAULT_COT_*                                -> textos estandar
import { buildDefaultContabilidadConfig, buildDefaultPlanCuentas } from "../lib/accounting";

// ======================================================
// DATOS INICIALES
// ======================================================

export const EMPLEADOS_INIT = [];

export const CARGOS_INIT = [...new Set(EMPLEADOS_INIT.map((empleado)=>empleado.cargo))].map((nombre,index)=>({
  id:"CAR-" + (String(index+1).padStart(3,"0")),
  nombre,
  descripcion:"",
  activo:true,
}));

export const COTIZACIONES_INIT = [];

export const OBRAS_INIT = [];

export const PAGOS_INIT = [];

export const HORARIOS_INIT = [];

export const CERTIFICACIONES_INIT = [];

export const INFORMES_INIT = [];


export const CLIENTES_INIT = [];

export const PROVEEDORES_INIT = [];

export const CUENTAS_PAGAR_INIT = [];

export const ORDENES_COMPRA_INIT = [
  {
    id: "OC02718",
    fecha: "2026-09-04 08:35:10",
    fechaEntregaEsperada: "2026-09-11",
    proveedorId: "PRV-001",
    proveedorNombre: "SUMINISTROS Y SOLUCIONES DE COLOMBIA SAS",
    solicitante: "Carlos Restrepo (Residente de Obra)",
    comprador: "Juan Pérez",
    obraId: "OB-901",
    obraNombre: "Bodega Itagüí — Línea de vida en cubierta",
    documentoOrigen: "OP/54776",
    items: [
      { desc: "Cable de acero 8mm 7x19 galvanizado alma de acero", cant: 150, unit: "ML", vu: 18500, total: 2775000 },
      { desc: "Tensores de ojo y horquilla 5/8 forjados norma ANSI", cant: 8, unit: "UND", vu: 85000, total: 680000 },
      { desc: "Grapas prensacables 5/16 acero forjado alta resistencia", cant: 40, unit: "UND", vu: 15000, total: 600000 },
      { desc: "Amortiguador de impacto en línea para línea de vida", cant: 2, unit: "UND", vu: 1152000, total: 2304000 },
    ],
    subtotal: 6359000,
    iva: 1208210,
    total: 7567210,
    estadoAprobacion: "Aprobada",
    aprobadoPor: "María Camila Sepúlveda",
    aprobadoEn: "2026-09-04 10:15:00",
    motivoRechazo: "",
    estadoFacturacion: "Para facturar",
    facturaVinculadaId: "",
    observaciones: "Entrega urgente en bodega de Itagüí para instalación el lunes.",
  },
  {
    id: "OC02717",
    fecha: "2026-09-04 09:12:44",
    fechaEntregaEsperada: "2026-09-12",
    proveedorId: "PRV-002",
    proveedorNombre: "SOLUCIONES DE SEGURIDAD INDUSTRIAL SAS",
    solicitante: "Alejandro Gómez (Ing. Residente)",
    comprador: "Juan Pérez",
    obraId: "OB-902",
    obraNombre: "Sabaneta — Adecuación de accesos seguros",
    documentoOrigen: "OP/54775",
    items: [
      { desc: "Arnés de cuerpo entero 4 argollas dieléctrico certificado", cant: 4, unit: "UND", vu: 420000, total: 1680000 },
      { desc: "Eslinga de posicionamiento doble con absorbedor", cant: 4, unit: "UND", vu: 285000, total: 1140000 },
      { desc: "Casco de seguridad tipo II con barbuquejo 3 puntos", cant: 8, unit: "UND", vu: 52000, total: 416000 },
    ],
    subtotal: 3236000,
    iva: 614840,
    total: 3850840,
    estadoAprobacion: "Pendiente",
    aprobadoPor: "",
    aprobadoEn: "",
    motivoRechazo: "",
    estadoFacturacion: "Nada por facturar",
    facturaVinculadaId: "",
    observaciones: "EPP requeridos para ingreso del nuevo personal a cubierta.",
  },
  {
    id: "OC02716",
    fecha: "2026-09-03 14:20:00",
    fechaEntregaEsperada: "2026-09-08",
    proveedorId: "PRV-003",
    proveedorNombre: "DISTRIBUIDORA DE MALLAS Y FERRETERIA SAS",
    solicitante: "Carlos Restrepo (Residente de Obra)",
    comprador: "María Camila Sepúlveda",
    obraId: "OB-901",
    obraNombre: "Bodega Itagüí — Línea de vida en cubierta",
    documentoOrigen: "OP/54774",
    items: [
      { desc: "Varilla roscada 5/8 B7 grado industrial", cant: 20, unit: "UND", vu: 32000, total: 640000 },
      { desc: "Epóxico estructural Hilti HIT-RE 500 V4 cartucho 500ml", cant: 3, unit: "UND", vu: 295000, total: 885000 },
    ],
    subtotal: 1525000,
    iva: 289750,
    total: 1814750,
    estadoAprobacion: "Aprobada",
    aprobadoPor: "María Camila Sepúlveda",
    aprobadoEn: "2026-09-03 16:30:12",
    motivoRechazo: "",
    estadoFacturacion: "Facturado",
    facturaVinculadaId: "CXP-002",
    observaciones: "Fijaciones químicas para anclajes en viga de concreto.",
  },
  {
    id: "OC02715",
    fecha: "2026-09-02 11:05:18",
    fechaEntregaEsperada: "2026-09-06",
    proveedorId: "PRV-004",
    proveedorNombre: "FERRETERIA INDUSTRIAL ANDINA",
    solicitante: "Mateo Morales (Supervisor)",
    comprador: "Juan Pérez",
    obraId: "OB-903",
    obraNombre: "Distribuciones del Valle — Recertificación de línea",
    documentoOrigen: "OP/54773",
    items: [
      { desc: "Disco de corte 7 pulgadas para metal", cant: 25, unit: "UND", vu: 12000, total: 300000 },
      { desc: "Pintura anticorrosiva epóxica galón gris", cant: 2, unit: "GL", vu: 145000, total: 290000 },
    ],
    subtotal: 590000,
    iva: 112100,
    total: 702100,
    estadoAprobacion: "Rechazada",
    aprobadoPor: "María Camila Sepúlveda",
    aprobadoEn: "2026-09-02 15:45:00",
    motivoRechazo: "Cotizar primero con el proveedor de convenio institucional para descuento por volumen.",
    estadoFacturacion: "Nada por facturar",
    facturaVinculadaId: "",
    observaciones: "Consumibles para taller y mantenimiento en obra.",
  },
];

export const CONTABILIDAD_CONFIG_INIT = [buildDefaultContabilidadConfig()];
export const PLAN_CUENTAS_INIT = buildDefaultPlanCuentas();
export const ASIENTOS_CONTABLES_INIT = [];

export const ITEMS_DB = [
  { categoria:"Lineas de Vida", items:[
    { desc:"LINEA DE VIDA HORIZONTAL",            unit:"ML",  vu:280000 },
    { desc:"LINEA DE VIDA VERTICAL",              unit:"ML",  vu:320000 },
    { desc:"LINEA DE VIDA CONEXION / TRANSVERSAL",unit:"ML",  vu:280000 },
    { desc:"RECERTIFICACION LINEA DE VIDA",       unit:"ML",  vu:45000  },
  ]},
  { categoria:"Escaleras", items:[
    { desc:"ESCALERA FIJA CON LINEA DE VIDA VERTICAL", unit:"Metro", vu:1200000 },
    { desc:"ESCALERA TIPO GATO",                       unit:"Metro", vu:850000  },
    { desc:"ESCALERA MARINERA",                        unit:"Metro", vu:950000  },
  ]},
  { categoria:"Anclajes", items:[
    { desc:"PUNTO DE ANCLAJE EPOXICO",                unit:"Und",  vu:380000  },
    { desc:"PUNTO DE ANCLAJE SOLDADO",                unit:"Und",  vu:290000  },
    { desc:"PUNTO DE ANCLAJE EN FACHADA",             unit:"Und",  vu:420000  },
    { desc:"ANCLAJE ARTICO ACERO GALVANIZADO",        unit:"Und",  vu:450000  },
  ]},
  { categoria:"Sistemas Completos", items:[
    { desc:"SISTEMA ANTICAIDA CUBIERTA (COMPLETO)",   unit:"Global",vu:8500000 },
    { desc:"BARANDILLA DE PROTECCION EN CABLE",       unit:"ML",   vu:320000  },
    { desc:"PASARELA DE SEGURIDAD EN CUBIERTA",       unit:"ML",   vu:550000  },
  ]},
  { categoria:"Servicios", items:[
    { desc:"CERTIFICACION SISTEMA ANTICAIDA",         unit:"Global",vu:1200000 },
    { desc:"RECERTIFICACION ANUAL",                   unit:"Global",vu:650000  },
    { desc:"INSPECCION Y DIAGNOSTICO",                unit:"Global",vu:400000  },
    { desc:"COORDINADOR SST EN OBRA",                 unit:"Dia",   vu:280000  },
  ]},
];

export const DEFAULT_COT_FORMA_PAGO = "50% ANTICIPO, 50% CONCLUIR LABORES";
export const DEFAULT_COT_TIEMPO_EJEC = "10 DIAS (4 EN FABRICACION, 6 DIAS EN INSTALACION)";
// Textos con los que arranca un informe de actividades. Son un punto de
// partida, no una plantilla cerrada: se editan libremente y lo escrito manda.
//
// Van en DOS campos separados y no en uno solo con encabezados dentro: puestos
// seguidos en el mismo recuadro se leian como un ladrillo, y el rotulo de cada
// bloque ya lo pone la tabla del documento.
export const DEFAULT_INFORME_ACTIVIDADES =
  "Se realizó la inspección visual y física de todos elementos que componen el sistema, soportes laterales e intermedios, cable, guardacables, tensor. Etc No fue necesario realizar ajustes al cable ya que este se encontraba en óptimas condiciones de tensión. Se realizó el ajuste a tornillería y se verificó el estado de la soldadura que no presentara porosidad Se realizó limpieza del sistema y la aplicación de pintura anticorrosiva sobre los elementos inspeccionados. Se actualizó fechas en las tarjetas de identificación de los sistemas No se identificaron componentes afectados o en mal estado, por lo tanto no fue necesario ningún reemplazo.";

export const DEFAULT_INFORME_DESCRIPCION =
  "Se realizaron labores de mantenimiento en los soportes de las líneas de vida, las cuales incluyeron una limpieza a fondo de todo el sistema metálico y la aplicación de una capa de pintura anticorrosiva en los soportes y anclajes, con el fin de protegerlos de futuras corrosiones. Finalmente, se verificó el sistema completo, asegurando que todos los elementos estuvieran en óptimas condiciones. Con estas acciones, se garantizó que las líneas de vida quedaran completamente operativas y seguras para su uso.";

export const DEFAULT_INFORME_RECOMENDACIONES =
  "Para garantizar la efectividad y seguridad de las líneas de vida instaladas es fundamental " +
  "implementar un programa de inspección regular para verificar el estado de los anclajes, " +
  "asegurando que no presenten desgaste o daños. Además, la capacitación del personal es crucial, " +
  "todos los empleados deben recibir formación específica sobre el uso adecuado de este sistema, " +
  "del equipo de protección personal y los procedimientos de emergencia en caso de caída. Esta " +
  "combinación de inspección meticulosa y formación continua asegura un entorno de trabajo seguro " +
  "y conforme a las normativas vigentes.";

// Lo que la cotizacion incluye. Sale en el cierre del documento, debajo de las
// condiciones comerciales, y es editable propuesta por propuesta: este texto es
// solo el punto de partida cuando todavia no se ha escrito nada.
//
// Una linea = una vinieta. Las lineas en blanco se ignoran al imprimir.
export const DEFAULT_COT_INCLUYE = [
  "Tuercas y arandelas en ACERO GALVANIZADO.",
  "Los elementos utilizados en la instalación son certificados de fábrica, los cuales se adjuntan en la entrega de documentación de certificados.",
  "Transporte de materiales y de personal hasta el sitio de trabajo.",
  "Se entregan todos los certificados de acuerdo a la Resolución 4272 de trabajo seguro en alturas.",
  "Recertificación gratis al año siguiente de la instalación.",
  "Esta propuesta incluye el coordinador para trabajo seguro en alturas de tiempo completo en la obra."
].join("\n");
