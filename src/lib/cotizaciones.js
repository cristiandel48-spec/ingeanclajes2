// Modelo de cotizaciones y propuestas
import { DEFAULT_COT_FORMA_PAGO, DEFAULT_COT_TIEMPO_EJEC, DEFAULT_COT_INCLUYE } from "../data/seed";
import { measurementsToQuoteItems, buildGoogleStaticMapUrl, buildMeasurementNarrative } from "./maps";

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

export function buildQuoteProposal(propuesta = {}, index = 0) {
  const items = Array.isArray(propuesta.items)
    ? propuesta.items.map((item, itemIndex) => normalizeQuoteItem(item, itemIndex))
    : [];

  const util = Number(propuesta.util ?? 10);
  const subtotal = items.reduce((sum, item) => sum + (Number(item.cant || 0) * Number(item.vu || 0)), 0);
  const utilidadValor = subtotal * (util / 100);
  const ivaValor = utilidadValor * 0.19;
  const totalCalculado = Math.round(subtotal + utilidadValor + ivaValor);

  const base = {
    id: propuesta.id || createQuoteProposalId(index + 1),
    nombre: propuesta.nombre || getQuoteProposalLabel(index),
    alcance: propuesta.alcance ?? propuesta.propuestaAlcance ?? "",
    tipoCotizacion: propuesta.tipoCotizacion || "linea_vida",
    requerimientoCliente: propuesta.requerimientoCliente ?? "",
    incluyeTexto: String(propuesta.incluyeTexto || ""),
    formaPago: propuesta.formaPago || DEFAULT_COT_FORMA_PAGO,
    tiempoEjec: propuesta.tiempoEjec || DEFAULT_COT_TIEMPO_EJEC,
    util,
    items,
    fotos: Array.isArray(propuesta.fotos) ? propuesta.fotos : [],
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
    return cotizacion.propuestas.map((propuesta, index) => buildQuoteProposal(propuesta, index));
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
        util: Number(cotizacion.util ?? 10),
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
  const { quote, sub, ut, iva, tot } = getQuoteProposalTotals(cotizacion, activeProposal);
  const totalObra = Math.round(Number(quote.total || tot || 0));
  const subtotalCotizacion = Math.round(Number(sub || 0));
  const utilidadCotizacion = Math.round(Number(ut || 0));
  const ivaGeneradoCotizacion = Math.round(Number(iva || 0));

  return {
    cotizacion: quote,
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
  });
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
      desc: it?.desc ?? "",
      cant: Number(it?.cant || 0),
      unit: it?.unit ?? "UND",
      vu: Number(it?.vu || 0),
    };
  });
}

export function getQuoteProposalTotals(baseQuote={}, propuesta){
  const quote = mergeQuoteWithProposal(baseQuote, propuesta);
  const items = normalizeQuoteItems({ ...quote, items: propuesta?.items || [] });
  const sub = items.reduce((sum, item)=>sum + (Number(item.cant) || 0) * (Number(item.vu) || 0), 0);
  const ut = sub * (Number(propuesta?.util ?? 10) || 0) / 100;
  const iva = ut * 0.19;
  const tot = sub + ut + iva;
  return { quote, items, sub, ut, iva, tot };
}

export function hasVerticalLifeLineService(c={}){
  if((c.geoMediciones || []).some(seg => seg?.tipo === "LVV")) return true;
  return normalizeQuoteItems(c).some(it => {
    const desc = String(it?.desc || "").toUpperCase();
    return desc.includes("LINEA DE VIDA VERTICAL");
  });
}

export function getQuoteProposalPhotos(baseQuote = {}, propuesta = {}, activeProposalId = null){
  const ownPhotos = Array.isArray(propuesta?.fotos)
    ? propuesta.fotos.filter((foto)=>foto?.src)
    : [];

  if(ownPhotos.length) return ownPhotos;

  if(propuesta?.id && propuesta.id === activeProposalId){
    return Array.isArray(baseQuote?.fotosCotizacion)
      ? baseQuote.fotosCotizacion.filter((foto)=>foto?.src)
      : [];
  }

  return [];
}

export function getQuotePrintableProposals(baseQuote = {}){
  const proposals = getQuoteProposals(baseQuote);
  const activeProposal = getQuoteActiveProposal(baseQuote);

  return proposals.map((propuesta, index)=>{
    const quote = mergeQuoteWithProposal(baseQuote, propuesta);
    const items = normalizeQuoteItems(quote);
    const sub = items.reduce((sum, item)=>sum + (Number(item.cant) || 0) * (Number(item.vu) || 0), 0);
    const ut = sub * (Number(quote.util || 10) / 100);
    const iva = ut * 0.19;
    const tot = sub + ut + iva;
    const measurements = Array.isArray(quote.geoMediciones) ? quote.geoMediciones : [];
    const mapQuery = baseQuote.coords || `${baseQuote.obra||""} ${baseQuote.ciudad||""}`.trim();
    const mapImg = String(quote.mapImg || "").startsWith("data:")
      ? quote.mapImg
      : (buildGoogleStaticMapUrl(measurements, mapQuery, quote.geoMapView || baseQuote.geoMapView) || quote.mapImg || "");

    return {
      ...propuesta,
      index,
      quote,
      items,
      sub,
      ut,
      iva,
      tot,
      tipoLabel: quote.tipoCotizacion === "obra_blanca" ? "Obra blanca" : quote.tipoCotizacion === "puntos_anclaje" ? "Puntos de anclaje" : "Línea de vida",
      esObraBlanca: quote.tipoCotizacion === "obra_blanca",
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
