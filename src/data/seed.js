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
