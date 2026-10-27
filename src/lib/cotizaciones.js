// Modelo de cotizaciones y propuestas
import { DEFAULT_COT_FORMA_PAGO, DEFAULT_COT_TIEMPO_EJEC, DEFAULT_COT_INCLUYE } from "../data/seed";
import { measurementsToQuoteItems, buildMeasurementNarrative } from "./maps";
import { corregirOrtografiaLocal } from "./correctorTexto";
import { FOTO_PUNTO_ANCLAJE_DEFAULT } from "../assets/embeddedImages";

// La foto por defecto del punto de anclaje, tal como es: la foto de
// producto, sobre su fondo negro de estudio.
export function fotoPuntoAnclajeDefault() {
  return {
    id: "foto-def-punto-anclaje",
    src: FOTO_PUNTO_ANCLAJE_DEFAULT,
    label: "Punto de anclaje certificado",
  };
}

export function isFotoPuntoAnclajeDefault(foto) {
  if (!foto) return false;
  return (
    foto.id === "foto-def-punto-anclaje" ||
    foto.src === FOTO_PUNTO_ANCLAJE_DEFAULT ||
    foto.label === "Punto de anclaje certificado"
  );
}

// La foto que una propuesta lleva sola segun su tipo: la del punto de
// anclaje. Al cambiar de tipo se quita y se pone segun corresponda; las
// fotos propias no se tocan.
export const TIPO_CAMIONERA = "linea_vida_camionera";

const FOTOS_POR_TIPO = {

};

// La ilustracion de la linea camionera iba como foto de la propuesta, al
// lado de las fotos de la obra. Ahora es su ficha tecnica, despues del
// precio (fichasTecnicas.js). Las propuestas que ya la tenian guardada la
// pierden sola: se reconoce por su id y su rotulo.
const FOTOS_RETIRADAS = [
  { id: "foto-def-linea-camionera", label: "Línea de vida camionera (ilustración)" },
  { id: "foto-def-punto-anclaje", src: FOTO_PUNTO_ANCLAJE_DEFAULT, label: "Punto de anclaje certificado" },
];

export function fotoDefaultDeTipo(tipo) {
  const foto = FOTOS_POR_TIPO[tipoCotizacionCanonico(tipo)];
  return foto ? { ...foto } : null;
}

export function isFotoDefaultDeTipo(foto) {
  if (!foto) return false;
  return Object.values(FOTOS_POR_TIPO).some((d) => foto.id === d.id || foto.src === d.src || foto.label === d.label)
    || FOTOS_RETIRADAS.some((d) => foto.id === d.id || (d.src && foto.src === d.src) || foto.label === d.label);
}

/** Las fotos de la propuesta con la automatica del tipo, y sin la de otro. */
export function fotosParaTipo(fotos, tipo) {
  const lista = Array.isArray(fotos) ? fotos : [];
  const def = fotoDefaultDeTipo(tipo);
  const propias = lista.filter((f) => !isFotoDefaultDeTipo(f));
  if (!def) return propias;
  const yaEsta = lista.find((f) => f?.id === def.id || f?.src === def.src);
  return [yaEsta || def, ...propias];
}

export function hasAnchorPointsService(propuesta = {}) {
  const ownText = [
    propuesta?.nombre || "",
    propuesta?.alcance || "",
    propuesta?.propuestaAlcance || "",
    propuesta?.requerimientoCliente || "",
  ].join(" ");

  const itemsText = Array.isArray(propuesta?.items)
    ? propuesta.items.map((item) => [
        item?.desc || "",
        item?.descripcion || "",
        item?.nombre || "",
      ].join(" ")).join(" ")
    : "";

  const text = `${ownText} ${itemsText}`.toLowerCase();

  return (
    text.includes("punto de anclaje") ||
    text.includes("puntos de anclaje") ||
    text.includes("anclaje importado") ||
    text.includes("anclaje nacional") ||
    text.includes("anclaje epoxico") ||
    text.includes("anclaje químico") ||
    text.includes("anclaje soldado")
  );
}

const FRASES_PUNTO_ANCLAJE = [
  "punto de anclaje",
  "punto de ianclaje",
  "puntos de anclaje",
  "anclaje importado",
  "anclaje nacional",
  "anclaje epoxico",
  "anclaje epóxico",
  "anclaje químico",
  "anclaje quimico",
  "anclaje soldado",
  "anclaje artico",
  "anclaje ártico",
];

export function esTextoPuntoAnclaje(texto) {
  const t = String(texto || "").toLowerCase();
  return FRASES_PUNTO_ANCLAJE.some((frase) => t.includes(frase));
}

const textoDeItem = (item) => [item?.desc, item?.descripcion, item?.nombre]
  .filter(Boolean)
  .join(" ");

export const MATERIAL_GALVANIZADO = "galvanizado";
export const MATERIAL_INOXIDABLE = "inoxidable";

export function materialAceroDeTexto(texto) {
  const t = String(texto || "").toLowerCase();
  if (/inoxidable|\binox\b/.test(t)) return MATERIAL_INOXIDABLE;
  if (/galvanizad|\bgalv\b/.test(t)) return MATERIAL_GALVANIZADO;
  return "";
}

export function materialesPuntoAnclaje(c = {}) {
  const items = Array.isArray(c?.items) ? c.items : [];
  const itemsAnclaje = items.filter((it) => esTextoPuntoAnclaje(textoDeItem(it)));
  const esTipoAnclaje = tipoCotizacionCanonico(c?.tipoCotizacion) === "puntos_anclaje";

  if (!itemsAnclaje.length && !esTipoAnclaje) return [];

  const materiales = [];
  const agregar = (mat) => {
    if (mat && !materiales.includes(mat)) materiales.push(mat);
  };

  itemsAnclaje.forEach((it) => agregar(materialAceroDeTexto(textoDeItem(it))));

  if (!materiales.length) {
    agregar(materialAceroDeTexto([
      c?.nombre, c?.titulo, c?.alcance, c?.propuestaAlcance, c?.requerimientoCliente,
    ].filter(Boolean).join(" ")));
  }

  if (!materiales.length) materiales.push(MATERIAL_GALVANIZADO);
  return materiales;
}

// El texto de "esta cotizacion incluye" acompaña ahora a TODAS las propuestas,
// no solo a las de puntos de anclaje.
//
// Se rellena aqui, al construir la propuesta, y no con una migracion en la base:
// asi las cotizaciones que ya estaban guardadas lo estrenan en cuanto se abren,
// sin tocar un solo registro. Como cada propuesta viaja a la base dentro del
// JSON de `propuestas`, en el primer guardado queda escrito de verdad.
//
// Solo se rellena cuando esta vacio, de modo que un texto ya editado a mano
// nunca se pisa.
export function ensureProposalDefaultTexts(propuesta = {}) {
  const next = { ...propuesta };
  if (!String(next.incluyeTexto || "").trim()) {
    next.incluyeTexto = DEFAULT_COT_INCLUYE;
  }
  return next;
}

export function getQuoteProposalLabel(index = 0) {
  const safeIndex = Number.isFinite(Number(index)) ? Number(index) : 0;
  return `Propuesta ${String.fromCharCode(65 + Math.max(0, safeIndex % 26))}`;
}

export function createQuoteProposalId(seed = "prop") {
  const normalizedSeed = String(seed || "prop")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "prop";
  return `${normalizedSeed}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function normalizeQuoteItem(item = {}, index = 0) {
  return {
    id: item.id ?? index + 1,
    desc: item.desc ?? "",
    cant: noNegativo(item.cant),
    unit: item.unit ?? "ML",
    vu: noNegativo(item.vu),
  };
}

// Cantidades, precios y utilidad no pueden ser negativos: un signo menos
// colado restaba del total sin que se notara.
function noNegativo(valor) {
  return Math.max(0, Number(valor) || 0);
}

// El mismo tipo de trabajo llega escrito de varias formas: el id de siempre
// -"puntos_anclaje"-, que es el que guardan las cotizaciones viejas; el que
// sale de normalizar el nombre de la categoria del catalogo -"anclajes"-, que
// es el que guarda el selector desde que la lista se arma con el catalogo; y
// el nombre tal cual -"Puntos de anclaje"-. Todo el programa compara contra
// UN solo valor, el de siempre, para que lo guardado antes y lo que se elige
// ahora signifiquen lo mismo: sin esto, elegir «Anclajes» dejaba la propuesta
// sin la foto del punto de anclaje y «Estructuras Metálicas» sin su campo de
// especificaciones ni su definicion en el documento.
export const TIPO_MANUAL = "manual";

export function tipoCotizacionCanonico(tipo) {
  const t = String(tipo || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
  if (!t) return "";
  // «Ninguno»: la propuesta no lleva textos, definiciones ni fichas de
  // ningun sistema; solo lo que se escriba a mano.
  if (t === "manual" || t === "ninguno") return TIPO_MANUAL;
  // La camionera (aerea, sobre vehiculos) es su propio sistema: lleva su
  // ilustracion y su definicion, no las de la linea de vida de cubierta.
  if (t.includes("camioner")) return TIPO_CAMIONERA;
  if (t.includes("anclaje")) return "puntos_anclaje";
  // Solo la linea de vida de siempre. Antes bastaba con que dijera «linea» o
  // «vida», asi que «Línea de vida camionera» -que no tiene nada que ver- se
  // volvia linea de vida y el documento salia con sus fichas y definiciones.
  if (["lineadevida", "lineasdevida", "lineavida", "lineasvida", "lvh"].includes(t)) return "linea_vida";
  if (t.includes("estructura") || t.includes("metalic")) return "estructuras_metalicas";
  if (t.includes("blanca")) return "obra_blanca";
  if (t.includes("escaler")) return "escaleras";
  if (t.includes("caminad") || t.includes("pasarel")) return "caminaderos";
  if (t.includes("sistema")) return "sistemas_completos";
  if (t.includes("servicio")) return "servicios";
  // Una categoria que el cliente agregue al catalogo se queda con su propio id.
  return t;
}

// El tipo con el que se imprime una propuesta. Es el guardado, salvo una
// propuesta en «Línea de vida» cuyos items de linea de vida son TODOS de la
// camionera: esa es una camionera. Quedaban asi cuando se marcaba el boton
// «Línea de vida» para un trabajo camionero, y el documento salia con las
// definiciones de la linea de cubierta y sin la ficha ni la ilustracion de la
// camionera (C-26189). Una propuesta mixta -cubierta y camionera- sigue
// siendo de linea de vida.
export function tipoDocumentoDePropuesta(propuesta) {
  const quote = propuesta?.quote || propuesta || {};
  const tipo = tipoCotizacionCanonico(quote.tipoCotizacion || propuesta?.tipoCotizacion || "");
  if (tipo !== "linea_vida") return tipo;
  const items = Array.isArray(propuesta?.items) ? propuesta.items : (Array.isArray(quote.items) ? quote.items : []);
  const deLinea = items
    .map((item) => normalizarTextoPlantilla(item?.desc || item?.descripcion || item?.nombre))
    .filter((texto) => /\blineas? de vida\b|camioner/.test(texto));
  if (deLinea.length && deLinea.every((texto) => texto.includes("camioner"))) return TIPO_CAMIONERA;
  return tipo;
}

const ETIQUETAS_TIPO = {
  manual: "Ninguno (manual)",
  linea_vida: "Línea de vida",
  linea_vida_camionera: "Línea de vida camionera",
  puntos_anclaje: "Puntos de anclaje",
  obra_blanca: "Obra blanca",
  estructuras_metalicas: "Estructuras metálicas",
  escaleras: "Escaleras",
  caminaderos: "Caminaderos",
  sistemas_completos: "Sistemas completos",
  servicios: "Servicios",
};

export function getTipoCotizacionLabel(tipo) {
  if (!tipo) return "Línea de vida";
  const etiqueta = ETIQUETAS_TIPO[tipoCotizacionCanonico(tipo)];
  if (etiqueta) return etiqueta;
  const str = String(tipo).trim();
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const TITULO_SUGERIDO_POR_TIPO = {
  puntos_anclaje: "Sistema de Anclajes Certificado para Trabajo en Alturas",
  linea_vida: "Sistema de Líneas de Vida Certificadas para Trabajo en Alturas",
  linea_vida_camionera: "Instalación de Línea de Vida Camionera",
  escaleras: "Sistema de Escaleras Certificadas para Trabajo en Alturas",
  estructuras_metalicas: "Fabricación e Instalación de Estructura Metálica",
  obra_blanca: "Ejecución de Trabajos y Adecuaciones en Obra Blanca",
  caminaderos: "Sistema de Caminaderos Certificados para Trabajo en Alturas",
  sistemas_completos: "Sistema de Protección contra Caídas para Trabajo en Alturas",
  servicios: "Mantenimiento y Recertificación del Sistema Anticaídas",
  [TIPO_MANUAL]: "Propuesta Técnica y Económica",
};

// Todas conservan el prefijo "Agradecemos la oportunidad de presentarles nuestra propuesta para "
// (usado por ObraDetalle) y van sin punto final (cotizacionPrint agrega " en la obra X.").
export const SALUDO_SUGERIDO_POR_TIPO = {
  puntos_anclaje:
    "Agradecemos la oportunidad de presentarles nuestra propuesta para el suministro e instalación de puntos de anclaje certificados para trabajo seguro en alturas",
  linea_vida:
    "Agradecemos la oportunidad de presentarles nuestra propuesta para el suministro e instalación de líneas de vida certificadas para trabajo seguro en alturas",
  linea_vida_camionera:
    "Agradecemos la oportunidad de presentarles nuestra propuesta para el suministro e instalación de una línea de vida camionera para el cargue y descargue seguro de vehículos",
  escaleras:
    "Agradecemos la oportunidad de presentarles nuestra propuesta para el suministro e instalación de escaleras certificadas para el acceso seguro en alturas",
  caminaderos:
    "Agradecemos la oportunidad de presentarles nuestra propuesta para el suministro e instalación de caminaderos certificados para el tránsito seguro sobre cubiertas",
  estructuras_metalicas:
    "Agradecemos la oportunidad de presentarles nuestra propuesta para el diseño, fabricación y montaje de la estructura metálica requerida",
  obra_blanca:
    "Agradecemos la oportunidad de presentarles nuestra propuesta para la ejecución de los trabajos de obra blanca solicitados",
  sistemas_completos:
    "Agradecemos la oportunidad de presentarles nuestra propuesta para el suministro e instalación de sistemas de protección contra caídas para trabajo seguro en alturas",
  servicios:
    "Agradecemos la oportunidad de presentarles nuestra propuesta para el mantenimiento y la recertificación del sistema de protección contra caídas",
  [TIPO_MANUAL]:
    "Agradecemos la oportunidad de presentarles nuestra propuesta para la ejecución de los trabajos solicitados",
};

const PRESENTACION_ARL_ALTURAS =
  "Nuestro personal está afiliado a ARL, salud y pensión, cuenta con los elementos de protección personal requeridos, y un coordinador de trabajo seguro en alturas acompaña la obra durante toda la ejecución. Entregamos las pólizas que exija el contratante y respondemos por los daños que puedan ocasionarse durante los trabajos.";

const PRESENTACION_ARL_OBRA =
  "Nuestro personal está afiliado a ARL, salud y pensión y cuenta con los elementos de protección personal requeridos; cuando el trabajo lo exige, un coordinador de trabajo seguro en alturas acompaña la obra durante toda la ejecución. Entregamos las pólizas que exija el contratante y respondemos por los daños que puedan ocasionarse durante los trabajos.";

const PRESENTACION_CIERRE =
  "Quedamos atentos a cualquier inquietud sobre el alcance, los materiales o las condiciones comerciales de esta propuesta.";

export const PRESENTACION_ALTURAS = [
  "INGEANCLAJES S.A.S. es una empresa especializada en el diseño, fabricación e instalación de sistemas de protección contra caídas. Cada sistema se entrega certificado bajo la Resolución 4272 de 2021, con los certificados de fábrica de todos los elementos instalados y una recertificación anual sin costo.",
  PRESENTACION_ARL_ALTURAS,
  PRESENTACION_CIERRE,
].join("\n");

const PRESENTACION_ESTRUCTURAS = [
  "INGEANCLAJES S.A.S. es una empresa especializada en el diseño, fabricación y montaje de estructuras metálicas. La perfilería y la tornillería se entregan con los certificados de fábrica correspondientes, la soldadura la ejecuta personal calificado y el montaje se recibe con el acta de entrega a satisfacción.",
  PRESENTACION_ARL_OBRA,
  PRESENTACION_CIERRE,
].join("\n");

const PRESENTACION_OBRA_BLANCA = [
  "INGEANCLAJES S.A.S. ejecuta obra civil y acabados con personal propio y materiales de primera calidad. Cada frente se entrega terminado, limpio y con el acta de recibo a satisfacción del contratante.",
  PRESENTACION_ARL_OBRA,
  PRESENTACION_CIERRE,
].join("\n");

const PRESENTACION_GENERICA = [
  "INGEANCLAJES S.A.S. es una empresa de ingeniería especializada en trabajo seguro en alturas, estructuras metálicas y obra civil. Los trabajos se ejecutan con personal propio y materiales con certificado de fábrica, y se entregan con el acta de recibo a satisfacción del contratante.",
  PRESENTACION_ARL_OBRA,
  PRESENTACION_CIERRE,
].join("\n");

export const PRESENTACION_SUGERIDA_POR_TIPO = {
  puntos_anclaje: PRESENTACION_ALTURAS,
  linea_vida: PRESENTACION_ALTURAS,
  linea_vida_camionera: PRESENTACION_ALTURAS,
  escaleras: PRESENTACION_ALTURAS,
  caminaderos: PRESENTACION_ALTURAS,
  sistemas_completos: PRESENTACION_ALTURAS,
  servicios: PRESENTACION_ALTURAS,
  estructuras_metalicas: PRESENTACION_ESTRUCTURAS,
  obra_blanca: PRESENTACION_OBRA_BLANCA,
  [TIPO_MANUAL]: PRESENTACION_GENERICA,
};

function normalizarTextoPlantilla(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function coincideTextoPlantilla(a, b) {
  return normalizarTextoPlantilla(a) === normalizarTextoPlantilla(b);
}

export function tituloSugeridoParaTipo(tipo) {
  return TITULO_SUGERIDO_POR_TIPO[tipoCotizacionCanonico(tipo)] || "";
}

export function esTituloEstandarDeSistema(titulo) {
  const actual = normalizarTextoPlantilla(titulo);
  if (!actual) return true;
  if (actual === normalizarTextoPlantilla("Instalación de Sistema de Protección en Obra Blanca")) {
    return true;
  }
  return Object.values(TITULO_SUGERIDO_POR_TIPO).some((sug) => normalizarTextoPlantilla(sug) === actual);
}

export function saludoSugeridoParaTipo(tipo) {
  return SALUDO_SUGERIDO_POR_TIPO[tipoCotizacionCanonico(tipo)] || "";
}

export function esSaludoEstandarDeSistema(saludo) {
  const actual = normalizarTextoPlantilla(saludo);
  if (!actual) return true;
  return Object.values(SALUDO_SUGERIDO_POR_TIPO).some((sug) => normalizarTextoPlantilla(sug) === actual);
}

export function presentacionSugeridaParaTipo(tipo) {
  return PRESENTACION_SUGERIDA_POR_TIPO[tipoCotizacionCanonico(tipo)] || PRESENTACION_ALTURAS;
}

export function esPresentacionEstandarDeSistema(presentacion) {
  const actual = normalizarTextoPlantilla(presentacion);
  if (!actual) return true;
  return Object.values(PRESENTACION_SUGERIDA_POR_TIPO).some((sug) => normalizarTextoPlantilla(sug) === actual);
}

export function resolverTipoCotizacion(cotizacion = {}) {
  const propuestas = Array.isArray(cotizacion?.propuestas) ? cotizacion.propuestas : [];
  const activa =
    propuestas.find((p) => p?.id && p.id === cotizacion?.propuestaActivaId) ||
    propuestas[0] ||
    null;
  return tipoCotizacionCanonico(activa?.tipoCotizacion || cotizacion?.tipoCotizacion || "linea_vida") || "linea_vida";
}

// Lee el título de la portada (textosDocumento.tituloPortada) y deduce el tipo
// canónico de trabajo/sistema para sincronizar la propuesta automáticamente.
// Devuelve "" si el título está vacío o no permite inferir un tipo claro.
export function inferirTipoDesdeTitulo(titulo) {
  const limpio = String(titulo || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!limpio) return "";

  // 1. Línea de vida camionera (antes que línea de vida normal)
  if (limpio.includes("camioner")) return TIPO_CAMIONERA;

  const mencionaSistemaAltura =
    /\b(?:anclaj|lineas?\s+(?:de\s+)+vida|l\s*v\s*h\b|l\s*v\s*v\b|anticaidas?|anti\s+caidas?|escaler|caminader|pasarel)/.test(limpio);

  // 2. Estructuras metálicas, pérgolas y plataformas estructurales
  // (salvo cuando el título solo nombra la cubierta/estructura metálica donde se instala un sistema de alturas)
  if (
    /\bpergolas?\b/.test(limpio) ||
    (
      !mencionaSistemaAltura &&
      (
        /\bestructuras?\s+metalic/.test(limpio) ||
        /\bplataformas?\s+(?:metalic|de\s+aires)/.test(limpio) ||
        /\bcubiertas?\s+metalic/.test(limpio)
      )
    )
  ) {
    return "estructuras_metalicas";
  }

  // 3. Obra blanca explícita
  if (!mencionaSistemaAltura && /\bobra\s+blanca\b/.test(limpio)) {
    return "obra_blanca";
  }

  // 4. Trabajos civiles, cubiertas termoacústicas o ensayos sin sistema anticaídas -> manual
  if (
    !mencionaSistemaAltura &&
    (
      /\bevaluacion\s+estructural\b/.test(limpio) ||
      /\banalisis\s+estructural\b/.test(limpio) ||
      /\bpruebas?\s+de\s+carga\b/.test(limpio) ||
      /\btecho\s+termo/.test(limpio) ||
      /\btejas?\s+(?:termo|upvc)\b/.test(limpio) ||
      /\bimpermeabiliz/.test(limpio) ||
      /\bperforacion\b/.test(limpio)
    )
  ) {
    return TIPO_MANUAL;
  }

  const tieneEscalera = /\bescaler|\bgato\b|\bmarinera\b/.test(limpio);
  const tieneAnclaje = /\banclaj/.test(limpio);
  const tieneCaminadero = /\bcaminader|\bpasarel/.test(limpio);
  const tieneLineaVida =
    /\blineas?\s+(?:de\s+)+vida/.test(limpio) ||
    /\bl\s*v\s*h\b/.test(limpio) ||
    /\bl\s*v\s*v\b/.test(limpio);

  // 5. Escaleras solas (o escalera únicamente con su línea de vida vertical)
  const esSoloVerticalConEscalera =
    tieneEscalera &&
    !tieneAnclaje &&
    !tieneCaminadero &&
    !/\bhorizontal|\bl\s*v\s*h\b/.test(limpio) &&
    (!tieneLineaVida || /\blineas?\s+(?:de\s+)+vida\s+vertical|\bl\s*v\s*v\b/.test(limpio));

  if (esSoloVerticalConEscalera) {
    return "escaleras";
  }

  // 6. Línea de vida (horizontal, vertical exclusiva o combinada con otros sistemas)
  if (tieneLineaVida) {
    return "linea_vida";
  }

  // 7. Caminaderos o pasarelas (sin línea de vida ni otros sistemas)
  if (tieneCaminadero && !tieneAnclaje && !tieneEscalera) {
    return "caminaderos";
  }

  // 8. Puntos de anclaje (instalación o recertificación de anclajes)
  if (tieneAnclaje) {
    return "puntos_anclaje";
  }

  // 9. Mantenimiento, certificación, recertificación o inspección general de sistemas anticaídas
  if (
    /\b(?:recertificac|certificac|mantenimiento|inspeccion)\w*/.test(limpio) &&
    /\b(?:anticaidas?|anti\s+caidas?|proteccion\s+contra\s+caidas|alturas?)/.test(limpio)
  ) {
    return "servicios";
  }

  // 10. Sistemas generales de protección contra caídas / sistemas completos
  if (/\b(?:anticaidas?|anti\s+caidas?|proteccion\s+contra\s+caidas|sistemas?\s+completos?)/.test(limpio)) {
    return "sistemas_completos";
  }

  return "";
}

export function buildQuoteProposal(propuesta = {}, index = 0) {
  const items = Array.isArray(propuesta.items)
    ? propuesta.items.map((item, itemIndex) => normalizeQuoteItem(item, itemIndex))
    : [];

  const sinAiu = Boolean(propuesta.sinAiu ?? propuesta.ivaPleno ?? false);
  const util = porcentajeUtilidad(propuesta.util);
  const subtotal = items.reduce((sum, item) => sum + (Number(item.cant || 0) * Number(item.vu || 0)), 0);
  const utilidadValor = sinAiu ? 0 : (subtotal * (util / 100));
  const ivaValor = sinAiu ? (subtotal * 0.19) : (utilidadValor * 0.19);
  const totalCalculado = Math.round(subtotal + utilidadValor + ivaValor);

  const tipoCotizacion = propuesta.tipoCotizacion || "linea_vida";
  const fotos = fotosParaTipo(propuesta.fotos, tipoCotizacion);

  const base = {
    id: propuesta.id || createQuoteProposalId(index + 1),
    nombre: propuesta.nombre || getQuoteProposalLabel(index),
    alcance: propuesta.alcance ?? propuesta.propuestaAlcance ?? "",
    tipoCotizacion,
    requerimientoCliente: propuesta.requerimientoCliente ?? "",
    incluyeTexto: String(propuesta.incluyeTexto || ""),
    formaPago: propuesta.formaPago || DEFAULT_COT_FORMA_PAGO,
    tiempoEjec: propuesta.tiempoEjec || DEFAULT_COT_TIEMPO_EJEC,
    sinAiu,
    util,
    items,
    fotos,
    geoMediciones: Array.isArray(propuesta.geoMediciones) ? propuesta.geoMediciones : [],
    geoMapView: propuesta.geoMapView ?? null,
    mapImg: propuesta.mapImg ?? null,
    medicionAutomatica: Boolean(propuesta.medicionAutomatica),
    total: Math.round(Number.isFinite(Number(propuesta.total)) ? Number(propuesta.total) : totalCalculado),
  };

  return ensureProposalDefaultTexts(base);
}

export function getQuoteProposals(cotizacion = {}) {
  if (Array.isArray(cotizacion.propuestas) && cotizacion.propuestas.length) {
    return cotizacion.propuestas.map((propuesta, index) => {
      const itemsPropuesta = (Array.isArray(propuesta.items) && propuesta.items.length)
        ? propuesta.items
        : (index === 0 && Array.isArray(cotizacion.items) && cotizacion.items.length ? cotizacion.items : (propuesta.items || []));
      return buildQuoteProposal({ ...propuesta, items: itemsPropuesta }, index);
    });
  }

  return [
    buildQuoteProposal(
      {
        id: cotizacion.propuestaActivaId || createQuoteProposalId(cotizacion.id || "base"),
        nombre: cotizacion.propuestaNombre || getQuoteProposalLabel(0),
        alcance: cotizacion.propuestaAlcance || "",
        tipoCotizacion: cotizacion.tipoCotizacion || "linea_vida",
        requerimientoCliente: cotizacion.requerimientoCliente || "",
        incluyeTexto: cotizacion.incluyeTexto || "",
        formaPago: cotizacion.formaPago || DEFAULT_COT_FORMA_PAGO,
        tiempoEjec: cotizacion.tiempoEjec || DEFAULT_COT_TIEMPO_EJEC,
        sinAiu: Boolean(cotizacion.sinAiu),
        util: porcentajeUtilidad(cotizacion.util),
        items: Array.isArray(cotizacion.items) ? cotizacion.items : [],
        geoMediciones: Array.isArray(cotizacion.geoMediciones) ? cotizacion.geoMediciones : [],
        geoMapView: cotizacion.geoMapView ?? null,
        mapImg: cotizacion.mapImg ?? null,
        total: cotizacion.total,
      },
      0
    ),
  ];
}

export function getQuoteActiveProposal(cotizacion = {}) {
  const proposals = getQuoteProposals(cotizacion);
  if (!proposals.length) {
    return buildQuoteProposal({}, 0);
  }
  return proposals.find((propuesta) => propuesta.id === cotizacion.propuestaActivaId) || proposals[0];
}

export function mergeQuoteWithProposal(cotizacion = {}, propuesta = null) {
  const activeProposal = propuesta ? buildQuoteProposal(propuesta, 0) : getQuoteActiveProposal(cotizacion);
  return {
    ...cotizacion,
    propuestaNombre: activeProposal.nombre,
    propuestaAlcance: activeProposal.alcance,
    propuestaActivaId: activeProposal.id,
    propuestas: getQuoteProposals(cotizacion),
    tipoCotizacion: activeProposal.tipoCotizacion,
    requerimientoCliente: activeProposal.requerimientoCliente,
    incluyeTexto: activeProposal.incluyeTexto,
    formaPago: activeProposal.formaPago,
    tiempoEjec: activeProposal.tiempoEjec,
    sinAiu: Boolean(activeProposal.sinAiu),
    util: activeProposal.util,
    items: activeProposal.items,
    geoMediciones: activeProposal.geoMediciones,
    geoMapView: activeProposal.geoMapView,
    mapImg: activeProposal.mapImg,
    total: activeProposal.total,
  };
}

export function getQuoteApprovalAccountingSnapshot(cotizacion = {}) {
  const activeProposal = getQuoteActiveProposal(cotizacion);
  const { quote, sub, ut, iva, tot, sinAiu } = getQuoteProposalTotals(cotizacion, activeProposal);
  const totalObra = Math.round(Number(quote.total || tot || 0));
  const subtotalCotizacion = Math.round(Number(sub || 0));
  const utilidadCotizacion = Math.round(Number(ut || 0));
  const ivaGeneradoCotizacion = Math.round(Number(iva || 0));

  return {
    cotizacion: quote,
    sinAiu,
    totalObra,
    subtotalCotizacion,
    utilidadCotizacion,
    ivaGeneradoCotizacion,
    baseIngresoContable: Math.max(0, totalObra - ivaGeneradoCotizacion),
  };
}

export function normalizeQuoteItems(c={}){
  const rawItems = Array.isArray(c.items) ? c.items : [];
  const hasMultipleProposals = Array.isArray(c.propuestas) && c.propuestas.length > 1;
  const geoItems = measurementsToQuoteItems(c.geoMediciones || []);
  const candidates = (rawItems.length ? rawItems : (!hasMultipleProposals ? geoItems : []))
    .filter(it => it && (String(it.desc||'').trim() || Number(it.cant||0)));
  // Se descartan repetidos por IDENTIFICADOR, no por contenido.
  //
  // Antes la clave era descripcion + cantidad + unidad + valor, y eso borraba
  // trabajo cotizado de verdad: cinco "SISTEMA ANTICAIDA CUBIERTA (COMPLETO)"
  // de 1 Global cada uno -cinco cubiertas del mismo edificio- son cinco lineas
  // legitimas, y al guardar se quedaba una sola. Dos lineas iguales pueden ser
  // un error de quien cotiza, pero eso lo ve en pantalla y lo borra; lo que no
  // puede ver es una linea que el sistema quito por su cuenta.
  const vistos = new Set();
  return candidates.filter((it) => {
    const id = it?.id;
    // Sin identificador no hay forma de distinguir una linea repetida a
    // proposito de una duplicada por error: se conserva.
    if(id === undefined || id === null || id === '') return true;
    const clave = String(id);
    if(vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  }).map((it) => ({
    ...it,
    desc: it?.desc ? corregirOrtografiaLocal(String(it.desc)).toUpperCase() : "",
  }));
}

export function normalizeProposalItems(items=[]){
  // Los identificadores tienen que salir unicos: ahora son ellos los que
  // deciden si dos lineas son la misma, asi que un id repetido haria
  // desaparecer una linea al guardar. Los que ya traen id lo conservan; a los
  // que no, se les da uno libre.
  const lista = Array.isArray(items) ? items : [];
  const usados = new Set(
    lista.map((it)=>it?.id).filter((id)=>id !== undefined && id !== null && id !== '').map(String)
  );
  let siguiente = 1;
  const idLibre = ()=>{
    while(usados.has(String(siguiente))) siguiente += 1;
    usados.add(String(siguiente));
    return siguiente;
  };

  const yaVistos = new Set();
  return lista.map((it)=>{
    const original = it?.id;
    const tieneId = original !== undefined && original !== null && original !== '';
    // Un id repetido dentro de la misma lista tampoco sirve: se reemplaza.
    const id = tieneId && !yaVistos.has(String(original)) ? original : idLibre();
    yaVistos.add(String(id));
    return {
      id,
      desc: it?.desc ? corregirOrtografiaLocal(String(it.desc)).toUpperCase() : "",
      cant: noNegativo(it?.cant),
      unit: it?.unit ?? "UND",
      vu: noNegativo(it?.vu),
    };
  });
}

// Porcentaje de utilidad de una propuesta: el primer valor guardado de los
// que se pasen. El 0 es un valor valido. Con `util || 10` se convertia en 10:
// el editor mostraba 0 % y el total guardado y el PDF cobraban 10 % mas su IVA.
// Sin nada guardado, 10 %; vacio o no numerico, 0, como en el editor.
export function porcentajeUtilidad(...candidatos) {
  const valor = candidatos.find((v) => v !== undefined && v !== null);
  if (valor === undefined) return 10;
  return noNegativo(valor);
}

export function getQuoteProposalTotals(baseQuote={}, propuesta){
  const quote = mergeQuoteWithProposal(baseQuote, propuesta);
  const sinAiu = Boolean(propuesta?.sinAiu ?? quote.sinAiu);
  const items = normalizeQuoteItems({ ...quote, items: propuesta?.items || [] });
  const sub = items.reduce((sum, item)=>sum + noNegativo(item.cant) * noNegativo(item.vu), 0);
  const ut = sinAiu ? 0 : (sub * porcentajeUtilidad(propuesta?.util, quote.util) / 100);
  const iva = sinAiu ? (sub * 0.19) : (ut * 0.19);
  const tot = sub + ut + iva;
  return { quote, items, sub, ut, iva, tot, sinAiu };
}

// Diferenciacion entre lamina de Escalera Tipo Gato (sola) y
// lamina de Sistema Certificado de Linea de Vida Vertical para Escalera
export function hasVerticalLifeLineService(c={}){
  // LVV es linea de vida vertical de las medidas del mapa.
  if((c.geoMediciones || []).some(seg => seg?.tipo === "LVV")) return true;

  // La descripcion de un item es una linea del catalogo: si ahi aparecen
  // escalera y cable, no puede significar otra cosa.
  const nombraEnItem = (texto)=>{
    const t = String(texto || "").toUpperCase();
    return t.includes("LINEA DE VIDA VERTICAL")
        || t.includes("LÍNEA DE VIDA VERTICAL")
        || (t.includes("ESCALERA") && (t.includes("LINEA DE VIDA") || t.includes("LÍNEA DE VIDA") || t.includes("GUAYA") || t.includes("CABLE")));
  };

  // El alcance es un parrafo entero, y ahi esa misma regla se dispara sola:
  // «linea de vida horizontal en cubierta y escalera de acceso» le bastaria
  // para colar la lamina vertical. En texto libre se exige que diga vertical.
  const nombraEnTexto = (texto)=>{
    const t = String(texto || "").toUpperCase();
    if(!t) return false;
    return t.includes("LINEA DE VIDA VERTICAL")
        || t.includes("LÍNEA DE VIDA VERTICAL")
        || (t.includes("ESCALERA") && t.includes("VERTICAL"));
  };

  // Los items mandan, pero si ninguno lo nombra todavia queda mirar el
  // alcance. Antes esto era un return seco sobre los items: con items -que
  // es siempre- el alcance no se leia nunca, asi que una cotizacion con
  // items genericos se quedaba sin lamina aunque el alcance la pidiera.
  const items = Array.isArray(c?.items) ? c.items : normalizeQuoteItems(c);
  if(items.some(it => nombraEnItem(it?.desc || it?.descripcion || it?.nombre))) return true;

  return nombraEnTexto(c.alcance) || nombraEnTexto(c.requerimientoCliente) || nombraEnTexto(c.titulo);
}

export function hasCatLadderService(c={}){
  // ESC es escalera de las medidas del mapa.
  if((c.geoMediciones || []).some(seg => seg?.tipo === "ESC")) return true;

  const nombraEscaleraSola = (texto)=>{
    const t = String(texto || "").toUpperCase();
    const tieneEscalera = t.includes("ESCALERA") || t.includes("GATO") || t.includes("MARINERA");
    const tieneLineaVida = t.includes("LINEA DE VIDA") || t.includes("LÍNEA DE VIDA") || t.includes("VERTICAL");
    return tieneEscalera && !tieneLineaVida;
  };

  // Igual que arriba: si ningun item la nombra, todavia queda el alcance.
  // La condicion de «sola» -escalera sin linea de vida- vale tambien para el
  // parrafo: si el alcance habla de linea de vida, la lamina que toca es la
  // otra, no esta.
  const items = Array.isArray(c?.items) ? c.items : normalizeQuoteItems(c);
  if(items.some(it => nombraEscaleraSola(it?.desc || it?.descripcion || it?.nombre))) return true;

  return nombraEscaleraSola(c.alcance) || nombraEscaleraSola(c.requerimientoCliente) || nombraEscaleraSola(c.titulo);
}

export function getQuoteProposalPhotos(baseQuote = {}, propuesta = {}, activeProposalId = null){
  const tipo = tipoCotizacionCanonico(
    propuesta?.quote?.tipoCotizacion || propuesta?.tipoCotizacion || baseQuote?.tipoCotizacion
  );

  // La foto automatica de otro tipo no se imprime; la del tipo de esta
  // propuesta si.
  const def = fotoDefaultDeTipo(tipo);
  const sinAjenas = (lista) => lista.filter((f) => !isFotoDefaultDeTipo(f) || (def && (f.id === def.id || f.src === def.src)));

  const ownPhotos = sinAjenas(Array.isArray(propuesta?.fotos)
    ? propuesta.fotos.filter((foto)=>foto?.src)
    : []);

  if(ownPhotos.length) return ownPhotos;

  if(propuesta?.id && propuesta.id === activeProposalId){
    const basePhotos = sinAjenas(Array.isArray(baseQuote?.fotosCotizacion)
      ? baseQuote.fotosCotizacion.filter((foto)=>foto?.src)
      : []);
    if(basePhotos.length) return basePhotos;
  }

  return def ? [def] : [];
}

export function getQuotePrintableProposals(baseQuote = {}){
  const proposals = getQuoteProposals(baseQuote);
  const activeProposal = getQuoteActiveProposal(baseQuote);

  return proposals.map((propuesta, index)=>{
    const quote = mergeQuoteWithProposal(baseQuote, propuesta);
    const sinAiu = Boolean(propuesta.sinAiu ?? quote.sinAiu);
    const items = normalizeQuoteItems(quote);
    const sub = items.reduce((sum, item)=>sum + noNegativo(item.cant) * noNegativo(item.vu), 0);
    const ut = sinAiu ? 0 : (sub * porcentajeUtilidad(quote.util) / 100);
    const iva = sinAiu ? (sub * 0.19) : (ut * 0.19);
    const tot = sub + ut + iva;
    const measurements = Array.isArray(quote.geoMediciones) ? quote.geoMediciones : [];
    // La imagen del mapa se compone al medir y se guarda con la propuesta. Antes
    // se armaba aqui una URL a la API de Google, que dejo de responder cuando se
    // cerro la facturacion y vacio el recuadro del mapa en todos los documentos.
    const mapImg = String(quote.mapImg || baseQuote.mapImg || "");

    return {
      ...propuesta,
      sinAiu,
      index,
      quote,
      items,
      sub,
      ut,
      iva,
      tot,
      tipoLabel: getTipoCotizacionLabel(quote.tipoCotizacion),
      esObraBlanca: ["obra_blanca", "estructuras_metalicas"].includes(tipoCotizacionCanonico(quote.tipoCotizacion)),
      requerimientoCliente: String(quote.requerimientoCliente || "").trim(),
      alcancePropuesta: String(quote.propuestaAlcance || propuesta.alcance || "").trim(),
      fotos: getQuoteProposalPhotos(baseQuote, propuesta, activeProposal?.id),
      measurements,
      narrative: buildMeasurementNarrative(measurements),
      mapImg,
      incluyeTexto: String(quote.incluyeTexto || "").trim(),
    };
  });
}
