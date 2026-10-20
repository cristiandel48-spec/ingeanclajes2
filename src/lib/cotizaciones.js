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
    cant: Number(item.cant ?? 0),
    unit: item.unit ?? "ML",
    vu: Number(item.vu ?? 0),
  };
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
export function tipoCotizacionCanonico(tipo) {
  const t = String(tipo || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
  if (!t) return "";
  if (t.includes("anclaje")) return "puntos_anclaje";
  if (t.includes("linea") || t.includes("vida")) return "linea_vida";
  if (t.includes("estructura") || t.includes("metalic")) return "estructuras_metalicas";
  if (t.includes("blanca")) return "obra_blanca";
  if (t.includes("escaler")) return "escaleras";
  if (t.includes("caminad") || t.includes("pasarel")) return "caminaderos";
  if (t.includes("sistema")) return "sistemas_completos";
  if (t.includes("servicio")) return "servicios";
  // Una categoria que el cliente agregue al catalogo se queda con su propio id.
  return t;
}

const ETIQUETAS_TIPO = {
  linea_vida: "Línea de vida",
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
  let fotos = Array.isArray(propuesta.fotos) ? propuesta.fotos : [];
  if (tipoCotizacionCanonico(tipoCotizacion) === "puntos_anclaje") {
    if (!fotos.some(isFotoPuntoAnclajeDefault)) {
      fotos = [fotoPuntoAnclajeDefault(), ...fotos];
    }
  } else {
    fotos = fotos.filter((f) => !isFotoPuntoAnclajeDefault(f));
  }

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
      cant: Number(it?.cant || 0),
      unit: it?.unit ?? "UND",
      vu: Number(it?.vu || 0),
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
  return Number(valor) || 0;
}

export function getQuoteProposalTotals(baseQuote={}, propuesta){
  const quote = mergeQuoteWithProposal(baseQuote, propuesta);
  const sinAiu = Boolean(propuesta?.sinAiu ?? quote.sinAiu);
  const items = normalizeQuoteItems({ ...quote, items: propuesta?.items || [] });
  const sub = items.reduce((sum, item)=>sum + (Number(item.cant) || 0) * (Number(item.vu) || 0), 0);
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

  let ownPhotos = Array.isArray(propuesta?.fotos)
    ? propuesta.fotos.filter((foto)=>foto?.src)
    : [];

  if (tipo !== "puntos_anclaje") {
    ownPhotos = ownPhotos.filter((f) => !isFotoPuntoAnclajeDefault(f));
  }

  if(ownPhotos.length) return ownPhotos;

  if(propuesta?.id && propuesta.id === activeProposalId){
    let basePhotos = Array.isArray(baseQuote?.fotosCotizacion)
      ? baseQuote.fotosCotizacion.filter((foto)=>foto?.src)
      : [];
    if (tipo !== "puntos_anclaje") {
      basePhotos = basePhotos.filter((f) => !isFotoPuntoAnclajeDefault(f));
    }
    if(basePhotos.length) return basePhotos;
  }

  if(tipo === "puntos_anclaje"){
    return [fotoPuntoAnclajeDefault()];
  }

  return [];
}

export function getQuotePrintableProposals(baseQuote = {}){
  const proposals = getQuoteProposals(baseQuote);
  const activeProposal = getQuoteActiveProposal(baseQuote);

  return proposals.map((propuesta, index)=>{
    const quote = mergeQuoteWithProposal(baseQuote, propuesta);
    const sinAiu = Boolean(propuesta.sinAiu ?? quote.sinAiu);
    const items = normalizeQuoteItems(quote);
    const sub = items.reduce((sum, item)=>sum + (Number(item.cant) || 0) * (Number(item.vu) || 0), 0);
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
