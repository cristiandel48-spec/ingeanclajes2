// Generacion del HTML imprimible de cotizaciones y mensajes de envio
import { fmt } from "./format";
import { escapeHtml } from "./html";
import { normalizarMayusculas } from "./normalizarEntrada";
import { LOGO_INGEANCLAJES } from "../assets/embeddedImages";
import { getQuotePrintableProposals } from "./cotizaciones";
import { getStaticMapDimensions, buildStaticMapLabelData } from "./maps";
import { hasVerticalLifeLineService, hasCatLadderService } from "./cotizaciones";
import { getTextosDocumento, lineasDeTexto } from "./cotizacionTextos";
import { corregirOrtografiaLocal } from "./correctorTexto";
import articoLineaVidaVertical from "../assets/artico-linea-vida-vertical.jpg?inline";
import articoEscaleraGato from "../assets/artico-escalera-gato.jpg?inline";
import { IMG_SOPORTE, IMG_TENSOR, IMG_EMPALMES, IMG_CABLE } from "../assets/componentesLineasVida";

export function buildCotizacionPrintHtml(c, { firmaImg = "", sello = null } = {}){
  const propuestas = getQuotePrintableProposals(c);
  const textoInicial = String(c?.textoInicial || "").trim();
  const textos = getTextosDocumento(c);
  // Detección de láminas para escalera:
  // 1) Escalera fija con línea de vida vertical (cable, absorbedor, tensor)
  // 2) Escalera tipo gato sola (sin línea de vida, sin canastilla)
  const showVerticalLifelineAppendix = propuestas.some((propuesta)=>hasVerticalLifeLineService(propuesta?.quote || propuesta))
    || hasVerticalLifeLineService({ alcance: c?.alcance, requerimientoCliente: textoInicial, items: c?.items, titulo: c?.titulo });

  const showCatLadderAppendix = propuestas.some((propuesta)=>hasCatLadderService(propuesta?.quote || propuesta))
    || hasCatLadderService({ alcance: c?.alcance, requerimientoCliente: textoInicial, items: c?.items, titulo: c?.titulo });
  // La lamina tecnica de componentes se incluye si la cotizacion o alguna propuesta
  // es de linea de vida o si se cotizan postes/anclajes de linea de vida (ej. Anclaje Artico).
  const hasLifelineOrAnchorPost = (texto) => {
    const t = String(texto || "").toUpperCase();
    return t.includes("LINEA DE VIDA") ||
           t.includes("LÍNEA DE VIDA") ||
           t.includes("ANCLAJE ARTICO") ||
           t.includes("ANCLAJE ÁRTICO") ||
           t.includes("SOPORTE LATERAL") ||
           t.includes("SOPORTE INTERMEDIO");
  };

  const showTechnicalPage = propuestas.some((propuesta) => {
    const tipo = propuesta?.quote?.tipoCotizacion || propuesta?.tipoCotizacion || c?.tipoCotizacion;
    if (tipo === "linea_vida") return true;
    const items = Array.isArray(propuesta?.items)
      ? propuesta.items
      : (Array.isArray(propuesta?.quote?.items) ? propuesta.quote.items : []);
    return items.some(it => hasLifelineOrAnchorPost(it?.desc || it?.descripcion || it?.nombre));
  }) || (Array.isArray(c?.items) && c.items.some(it => hasLifelineOrAnchorPost(it?.desc || it?.descripcion || it?.nombre)))
     || hasLifelineOrAnchorPost(textos?.tituloPortada || c?.titulo || c?.alcance);

  const mapCenter = c?.geoMapView?.center || c?.geoMapView || { lat: 0, lng: 0 };
  const mapZoom = Number(c?.geoMapView?.zoom || 18);
  const monthNamesEs = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];

  const money = (n) => fmt(Number(n || 0));
  const numberFmt = (n) => Number(n || 0).toLocaleString("es-CO");
  const formatFechaComercial = (value) => {
    if (!value) return "";

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return `${value.getDate()} DE ${monthNamesEs[value.getMonth()]} DEL ${value.getFullYear()}`;
    }

    const raw = String(value || "").trim();
    if (!raw) return "";

    let year;
    let month;
    let day;

    let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      year = Number(match[1]);
      month = Number(match[2]) - 1;
      day = Number(match[3]);
    } else {
      match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
      if (match) {
        day = Number(match[1]);
        month = Number(match[2]) - 1;
        year = Number(match[3]);
      } else {
        const parsed = new Date(raw);
        if (!Number.isNaN(parsed.getTime())) {
          day = parsed.getDate();
          month = parsed.getMonth();
          year = parsed.getFullYear();
        }
      }
    }

    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year) && monthNamesEs[month]) {
      return `${day} DE ${monthNamesEs[month]} DEL ${year}`;
    }

    return raw.toUpperCase();
  };
  const fechaComercial = formatFechaComercial(c?.fecha);
  const ciudadEncabezado = "ENVIGADO";
  const encabezadoFecha = fechaComercial ? `${ciudadEncabezado}, ${fechaComercial}` : ciudadEncabezado;

  const normalizeProposalMeasureUnit = (unit = "") => {
    const raw = String(unit || "").trim().toUpperCase();
    if (!raw) return "UND";
    if (["UN", "UND", "UNIDAD", "UNIDADES"].includes(raw)) return "UND";
    if (["ML", "M.L", "M L", "METRO", "METROS", "MT", "MTS", "MTR", "METRO LINEAL", "METROS LINEALES"].includes(raw)) return "ML";
    return raw;
  };

  const formatProposalMeasureQuantity = (value = 0) => {
    const qty = Number(value || 0);
    if (!Number.isFinite(qty)) return "0";
    return Number.isInteger(qty)
      ? numberFmt(qty)
      : qty.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const formatProposalMeasures = (measures = []) => {
    if (!Array.isArray(measures) || !measures.length) return "0 UND";
    return measures
      .filter((measure) => Number(measure?.quantity || 0) > 0)
      .map((measure) => `${formatProposalMeasureQuantity(measure.quantity)} ${normalizeProposalMeasureUnit(measure.unit)}`)
      .join(" + ") || "0 UND";
  };

  const getProposalMeasureSummary = (propuesta = {}) => {
    const items = Array.isArray(propuesta?.items) ? propuesta.items : [];
    const totalsByUnit = new Map();

    items.forEach((item) => {
      const qty = Number(item?.cant || item?.cantidad || 0);
      if (!Number.isFinite(qty) || qty <= 0) return;
      const unit = normalizeProposalMeasureUnit(item?.unit || item?.unidad || "UND");
      totalsByUnit.set(unit, (totalsByUnit.get(unit) || 0) + qty);
    });

    if (!totalsByUnit.size) {
      const qty = Number(propuesta?.cantidad || propuesta?.cant || propuesta?.quote?.cantidad || 0);
      const unit = normalizeProposalMeasureUnit(
        propuesta?.unit || propuesta?.unidad || propuesta?.quote?.unit || propuesta?.quote?.unidad || "UND"
      );
      const measures = qty > 0 ? [{ quantity: qty, unit }] : [];
      return { measures, label: formatProposalMeasures(measures) };
    }

    const measures = Array.from(totalsByUnit.entries()).map(([unit, quantity]) => ({ unit, quantity }));
    return { measures, label: formatProposalMeasures(measures) };
  };

  const mergeProposalMeasures = (rows = []) => {
    const totalsByUnit = new Map();
    rows.forEach((row) => {
      const measures = Array.isArray(row?.measures) ? row.measures : [];
      measures.forEach((measure) => {
        const qty = Number(measure?.quantity || 0);
        if (!Number.isFinite(qty) || qty <= 0) return;
        const unit = normalizeProposalMeasureUnit(measure?.unit || "UND");
        totalsByUnit.set(unit, (totalsByUnit.get(unit) || 0) + qty);
      });
    });
    return Array.from(totalsByUnit.entries()).map(([unit, quantity]) => ({ unit, quantity }));
  };

  const resumenPropuestas = propuestas.map((propuesta, idx) => {
    const measureSummary = getProposalMeasureSummary(propuesta);
    return {
      nombre: propuesta?.nombre || propuesta?.quote?.propuestaNombre || `Propuesta ${idx + 1}`,
      measures: measureSummary.measures,
      cantidadLabel: measureSummary.label,
      total: Math.round(Number(propuesta?.tot || propuesta?.quote?.total || 0)),
    };
  });

  const mostrarResumenFinal = resumenPropuestas.length >= 2;
  const totalResumenCantidad = formatProposalMeasures(mergeProposalMeasures(resumenPropuestas));
  const totalResumenValor = resumenPropuestas.reduce((sum, row) => sum + Number(row.total || 0), 0);

  const renderResumenBlock = () => {
    if (!mostrarResumenFinal) return "";

    return `
      <h2 class="doc-h2">Valor total de la cotización</h2>
      <div class="price-table summary-spacing">
        <table class="table">
          <thead>
            <tr>
              <th class="t-left" style="width:26px;"></th>
              <th class="t-left">Propuesta / servicio</th>
              <th style="width:110px;">Cant.</th>
              <th class="t-right" style="width:150px;">Valor total</th>
            </tr>
          </thead>
          <tbody>
            ${resumenPropuestas.map((row, i) => `
              <tr>
                <td class="row-num tnum">${String(i + 1).padStart(2, "0")}</td>
                <td>${escapeHtml(row.nombre || "")}</td>
                <td class="t-center tnum">${escapeHtml(row.cantidadLabel || "0 UND")}</td>
                <td class="t-right tnum strong">${money(row.total || 0)}</td>
              </tr>
            `).join("")}
            <tr class="grand-total">
              <td></td>
              <td class="total-label">Total general</td>
              <td class="t-center tnum">${escapeHtml(totalResumenCantidad)}</td>
              <td class="t-right tnum total-amount">${money(totalResumenValor)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  };

  const renderResumenPropuestas = () => {
    if (!mostrarResumenFinal) return "";

    return `
      <section class="page summary-page">
        <div class="page-inner">
          ${headerHtml}
          <div class="page-content">
            ${renderResumenBlock()}
          </div>
          ${footerHtml}
        </div>
      </section>
    `;
  };

  const footerHtml = `
    <div class="footer">
      <div class="footer-col footer-col-left">
        <div class="footer-label">Sede Principal</div>
        <div class="footer-main">Calle 38 Sur # 36 &ndash; 48</div>
        <div class="footer-sub">Envigado</div>
      </div>
      <div class="footer-col footer-col-center">
        <div class="footer-label">Líneas de Atención</div>
        <div class="footer-main">PBX (604) 448 26 86</div>
        <div class="footer-sub">Cel. 315 288 9541</div>
      </div>
      <div class="footer-col footer-col-right">
        <div class="footer-label">Contacto Digital</div>
        <div class="footer-main">comercial1ingeanclajes@gmail.com</div>
        <div class="footer-sub footer-brand">www.ingeanclajessas.com</div>
      </div>
    </div>
  `;

  const headerHtml = `
    <div class="header">
      <img src="${LOGO_INGEANCLAJES}" class="logo" alt="Ingeanclajes" />
      <div class="header-right">
        <div>Ingeanclajes S.A.S. &middot; Cotización ${escapeHtml(c?.numero || c?.id || "")}</div>
      </div>
    </div>
  `;

  const renderPhotoGrid = (fotos = [], proposalIndex = 0, customHeight = null) => {
    if(!Array.isArray(fotos) || !fotos.length) return "";
    const images = fotos.slice(0, 2);
    const hStyle = customHeight ? `style="height:${customHeight}mm; --card-photo-h:${customHeight}mm;"` : "";
    return `
      <div class="photo-grid ${images.length === 1 ? "single" : ""}">
        ${images.map((foto, idx)=>{
          const src = escapeHtml(foto?.src || "");
          const label = escapeHtml(foto?.label || `Foto ${idx + 1}`);
          return `
            <div class="photo-card" ${customHeight ? `style="--card-photo-h:${customHeight}mm;"` : ""}>
              <img
                src="${src}"
                alt="${label}"
                class="photo ${proposalIndex === 2 ? "proposal-3-photo" : ""}"
                ${hStyle}
                loading="eager"
                referrerpolicy="no-referrer"
              />
              <div class="photo-caption">${label}</div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  };

  const renderMapBlock = (propuesta, proposalIndex = 0) => {
    const hasMap = typeof propuesta?.mapImg === "string" && propuesta.mapImg.trim() !== "";
    if(!hasMap) return "";

    const mapView = propuesta?.quote?.geoMapView || c?.geoMapView || null;
    const { width: mW, height: mH } = getStaticMapDimensions(mapView);
    const mapWrapStyle = proposalIndex === 2
      ? `style="height:132mm; margin-top:6mm;"`
      : `style="height:58mm;"`;

    const labels = Array.isArray(propuesta.measurements) && propuesta.measurements.length
      ? buildStaticMapLabelData(
          propuesta.measurements,
          mapView?.center || mapCenter,
          Number(mapView?.zoom || mapZoom),
          mW,
          mH
        ).map((label)=>`
          <g class="map-label-group" transform="translate(${Number(label.x || 0)} ${Number(label.y || 0)}) rotate(${Number(label.angle || 0)})">
            <text class="map-label-value" y="0" fill="${escapeHtml(label.color || "#2563EB")}">${escapeHtml(label.value)}</text>
          </g>
        `).join("")
      : "";

    return `
      <div class="card-label block-label">Medición satelital</div>
      <div class="map-wrap ${proposalIndex === 2 ? "proposal-3-map" : ""}" ${mapWrapStyle}>
        <svg class="map-svg" viewBox="0 0 ${mW} ${mH}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa de medicion">
          <image
            href="${escapeHtml(propuesta.mapImg)}"
            x="0"
            y="0"
            width="${mW}"
            height="${mH}"
            preserveAspectRatio="none"
          />
          ${labels}
        </svg>
      </div>
    `;
  };

  // "Esta cotizacion incluye" se imprime en el cierre, justo debajo de las
  // condiciones comerciales: son las dos cosas que el cliente compara antes de
  // aprobar, y separarlas obligaba a ir y volver entre paginas.
  //
  // Una linea del texto = una vinieta. Va a una sola columna porque las frases
  // son largas: a dos columnas cada una se partia en tres renglones y el bloque
  // se leia apretado.
  const renderIncluyeBlock = (texto) => {
    const crudas = String(texto || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    // Una linea NO siempre es una vinieta: hay textos escritos cortando los
    // renglones donde cabian en la pantalla, y ahi cada trozo salia como punto
    // aparte -"Los" en una vinieta y "elementos utilizados..." en la siguiente-.
    //
    // Lo que delata una continuacion es que la linea EMPIECE EN MINUSCULA: un
    // punto nuevo de la lista se escribe con mayuscula. Con eso solo se pegan
    // los pedazos de una misma frase -"Los" + "elementos utilizados..."- y
    // siguen separados dos puntos distintos aunque el primero no lleve punto
    // final, como "Obras estructurales de ser necesario".
    const lines = [];
    for (const cruda of crudas) {
      const marcada = /^[-–—•*·]\s*/.test(cruda);
      const limpia = cruda.replace(/^[-–—•*·]\s*/, "").trim();
      if (!limpia) continue;

      const anterior = lines[lines.length - 1];
      const continua =
        anterior &&
        !marcada &&
        /^[a-záéíóúüñ]/.test(limpia) &&
        !/[.;:!?]$/.test(anterior);

      if (continua) lines[lines.length - 1] = `${anterior} ${limpia}`;
      else lines.push(limpia);
    }

    if (!lines.length) return "";

    return `
      <div class="keep incluye-block">
        <div class="card-label block-label centered">Esta cotización incluye</div>
        <div class="incluye-list">
          ${lines.map((line) => `<div class="incluye-item">${escapeHtml(line)}</div>`).join("")}
        </div>
      </div>
    `;
  };

  // El cierre es uno solo para toda la cotizacion, igual que la forma de pago y
  // el tiempo de ejecucion: se imprime el texto de la propuesta activa.
  const propuestaDelCierre = propuestas.find((p) => p.id === c?.propuestaActivaId) || propuestas[0];
  const incluyeCierreHtml = renderIncluyeBlock(propuestaDelCierre?.incluyeTexto || c?.incluyeTexto || "");

  // Cada `.page` mide 11in exactas, asi que lo que no cabe se sale del papel y
  // no se imprime: con muchos items la tabla se cortaba sobre la fila 11 y el
  // resto desaparecia del PDF sin avisar.
  //
  // Por eso la tabla se reparte en varias hojas. Cuando son pocos items sigue
  // yendo junto al texto y las fotos, como siempre; a partir de ahi se lleva a
  // hojas propias, donde caben muchas mas filas y el documento respira.
  const FILAS_JUNTO_AL_TEXTO = 8;  // caben sin desbordar la hoja compartida
  const FILAS_HOJA = 20;           // hoja de tabla, contando el aviso de "continúa"
  const FILAS_HOJA_FINAL = 16;     // la ultima pierde sitio por subtotal, utilidad, IVA y total

  // Reparte parejo en vez de llenar hojas hasta arriba: con 50 items, tres
  // hojas de 17 se ven mucho mejor que dos llenas y una con dos renglones
  // sueltos en medio de una pagina en blanco.
  const repartirParejo = (lista, hojas) => {
    const grupos = [];
    let restantes = lista.length;
    let desde = 0;
    for (let quedan = hojas; quedan > 0; quedan -= 1) {
      const tamano = Math.ceil(restantes / quedan);
      grupos.push(lista.slice(desde, desde + tamano));
      desde += tamano;
      restantes -= tamano;
    }
    return grupos;
  };

  // Reparte los items en hojas y dice si la tabla va junto al texto o aparte.
  const planificarItems = (propuesta) => {
    const items = propuesta.items || [];
    const hasFotos = Array.isArray(propuesta.fotos) && propuesta.fotos.length > 0;
    const hasMap = typeof propuesta?.mapImg === "string" && propuesta.mapImg.trim() !== "";
    const hasScope = String(propuesta.alcancePropuesta || "").trim().length > 0;
    const hasNarrative = String(propuesta.narrative || "").trim().length > 0;
    const hasClientReq = propuesta.esObraBlanca && String(propuesta.requerimientoCliente || "").trim().length > 0;
    const hasText = hasScope || hasNarrative || hasClientReq;

    // Límite dinámico de filas para mantener la propuesta en 1 hoja compartida sin desbordar:
    // Con fotos grandes o mapas, la tabla se traslada limpiamente a hojas propias
    // cuando sobrepasa el espacio disponible, garantizando planos nítidos y amplios.
    let maxFilasJuntoAlTexto = 8;
    if (hasMap && hasFotos) {
      maxFilasJuntoAlTexto = 3;
    } else if (hasMap) {
      maxFilasJuntoAlTexto = hasText ? 3 : 5;
    } else if (hasFotos) {
      maxFilasJuntoAlTexto = hasText ? 4 : 6;
    } else if (hasText) {
      maxFilasJuntoAlTexto = 9;
    } else {
      maxFilasJuntoAlTexto = 11;
    }

    if (items.length <= maxFilasJuntoAlTexto) {
      return { juntoAlTexto: true, hojas: items.length ? [items] : [] };
    }

    // Minimo de hojas donde cabe todo, sabiendo que la ultima lleva totales.
    let hojas = 1;
    while ((hojas - 1) * FILAS_HOJA + FILAS_HOJA_FINAL < items.length) hojas += 1;

    // Al repartir parejo la ultima puede pasarse del sitio que le queda con
    // los totales; en ese caso se abre una hoja mas y se vuelve a repartir.
    let grupos = repartirParejo(items, hojas);
    while (grupos[grupos.length - 1].length > FILAS_HOJA_FINAL && hojas < items.length) {
      hojas += 1;
      grupos = repartirParejo(items, hojas);
    }

    return { juntoAlTexto: false, hojas: grupos };
  };

  const renderItemsTable = (propuesta, itemsHoja = null, opciones = {}) => {
    const { conTotales = true, desde = 0 } = opciones;
    const lista = itemsHoja ?? propuesta.items ?? [];
    const rows = lista.map((item, i) => {
      const idx = desde + i;
      // En mayuscula tambien aqui, no solo en el formulario: las cotizaciones
      // que ya estaban guardadas traen descripciones escritas en minuscula o con errores
      // y en la tabla salen impecables con ortografía correcta.
      const desc = escapeHtml(corregirOrtografiaLocal(String(item?.desc || `ITEM ${idx + 1}`)).toUpperCase());
      const qtyNumber = Number(item?.cant || 0);
      const qty = Number.isInteger(qtyNumber) ? String(qtyNumber) : qtyNumber.toFixed(2).replace(/\.00$/, "");
      const unit = escapeHtml(item?.unit || "UND");
      const value = money(item?.vu || 0);
      const subtotal = money((Number(item?.cant || 0) * Number(item?.vu || 0)));
      return `
        <tr>
          <td>${desc}</td>
          <td class="t-center tnum">${qty}</td>
          <td class="t-center">${unit}</td>
          <td class="t-right tnum">${value}</td>
          <td class="t-right tnum strong">${subtotal}</td>
        </tr>
      `;
    }).join("");

    return `
      <div class="price-table">
        <table class="table">
          <thead>
            <tr>
              <th class="t-left" style="width:44%;">Descripción</th>
              <th style="width:10%;">Cant.</th>
              <th style="width:12%;">Unidad</th>
              <th class="t-right" style="width:17%;">V. unitario</th>
              <th class="t-right" style="width:17%;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            ${conTotales ? `
            <tr class="sub-row">
              <td colspan="4">Subtotal</td>
              <td class="t-right tnum strong">${money(propuesta.sub || 0)}</td>
            </tr>
            ${propuesta.sinAiu ? `
            <tr class="soft-row">
              <td colspan="4">IVA (19%)</td>
              <td class="t-right tnum">${money(propuesta.iva || 0)}</td>
            </tr>
            ` : `
            <tr class="soft-row">
              <td colspan="4">Utilidades (${numberFmt(propuesta.quote?.util || 10)}% del valor de la obra)</td>
              <td class="t-right tnum">${money(propuesta.ut || 0)}</td>
            </tr>
            <tr class="soft-row">
              <td colspan="4">IVA (19% sobre utilidades)</td>
              <td class="t-right tnum">${money(propuesta.iva || 0)}</td>
            </tr>
            `}
            <tr class="grand-total">
              <td colspan="4" class="total-label">Total propuesta</td>
              <td class="t-right tnum total-amount">${money(propuesta.tot || 0)}</td>
            </tr>
            ` : `
            <tr class="soft-row">
              <td colspan="5" class="t-right">Continúa en la página siguiente</td>
            </tr>
            `}
          </tbody>
        </table>
      </div>
    `;
  };

  // Hojas dedicadas a la tabla, cuando los items no caben junto al texto.
  const renderItemsPages = (propuesta, idx, plan) => {
    if (plan.juntoAlTexto) return "";
    const totalHojas = plan.hojas.length;
    // Las hojas no tienen el mismo numero de filas, asi que el indice de
    // arranque se acumula en vez de multiplicarse.
    let desde = 0;
    const esNombreGenerico = !propuesta.nombre || /^propuesta(\s+[a-z0-9]+)?$/i.test(String(propuesta.nombre).trim());
    return plan.hojas.map((itemsHoja, i) => {
      const esUltima = i === totalHojas - 1;
      const arranque = desde;
      desde += itemsHoja.length;
      const titulo = !esNombreGenerico
        ? escapeHtml(propuesta.nombre)
        : "Detalle de la cotización";
      return `
        <section class="page">
          <div class="page-inner">
            ${headerHtml}
            <div class="page-content">
              <h2 class="doc-h2">${titulo}${totalHojas > 1 ? ` &middot; Parte ${i + 1} de ${totalHojas}` : ""}</h2>
              ${renderItemsTable(propuesta, itemsHoja, { conTotales: esUltima, desde: arranque })}
            </div>
            ${footerHtml}
          </div>
        </section>
      `;
    }).join("");
  };

  const renderProposalPage = (propuesta, idx) => {
    const hasScope = String(propuesta.alcancePropuesta || "").trim().length > 0;
    const hasNarrative = String(propuesta.narrative || "").trim().length > 0;
    const hasClientReq = propuesta.esObraBlanca && String(propuesta.requerimientoCliente || "").trim().length > 0;
    const plan = planificarItems(propuesta);
    const hasMap = typeof propuesta?.mapImg === "string" && propuesta.mapImg.trim() !== "";
    const fotos = Array.isArray(propuesta.fotos) ? propuesta.fotos : [];
    const numFotos = Math.min(2, fotos.length);

    // Cálculo dinámico de altura para aprovechar al máximo el espacio de la hoja:
    // Permite que planos, fotos e isométricos se expandan entre 100mm y 144mm
    // (o hasta 84mm en cuadrícula doble) llenando armónicamente la página
    // sin dejar huecos en blanco y asegurando que las cotas y textos se lean nítidos.
    let customPhotoHeight = null;
    if (numFotos > 0 && idx !== 2) {
      const esNombreGenerico = !propuesta.nombre || /^propuesta(\s+[a-z0-9]+)?$/i.test(String(propuesta.nombre).trim());
      const tituloH = !esNombreGenerico ? 10 : 0;
      const reqH = hasClientReq ? Math.max(16, Math.min(42, Math.ceil(String(propuesta.requerimientoCliente).length / 75) * 5.5 + 10)) : 0;
      const scopeH = hasScope ? Math.max(16, Math.min(45, Math.ceil(String(propuesta.alcancePropuesta).length / 75) * 5.5 + 10)) : 0;
      const narrH = hasNarrative ? Math.max(14, Math.min(40, Math.ceil(String(propuesta.narrative).length / 75) * 5.5 + 8)) : 0;
      const mapH = hasMap ? 64 : 0;
      const tableRows = plan.juntoAlTexto && plan.hojas.length ? plan.hojas[0].length : 0;
      const tableH = plan.juntoAlTexto
        ? (38 + tableRows * 7.5)
        : 8;
      const photoOverhead = 10;

      const espacioDisponible = 214 - (tituloH + reqH + scopeH + narrH + mapH + tableH + photoOverhead);

      if (numFotos === 1) {
        customPhotoHeight = Math.min(160, Math.max(105, Math.round(espacioDisponible * 0.95)));
      } else {
        customPhotoHeight = Math.min(105, Math.max(76, Math.round(espacioDisponible * 0.70)));
      }
    }

    const fotosHtml = renderPhotoGrid(propuesta.fotos, idx, customPhotoHeight);
    const mapaHtml = renderMapBlock(propuesta, idx);

    // Si la propuesta no trae texto, fotos ni mapa, y la tabla se fue a hojas
    // propias, esta hoja solo tendria el titulo y un aviso: una pagina en
    // blanco con dos lineas arriba. En ese caso no se imprime, y el detalle
    // arranca directo en su hoja.
    const tieneContenidoPropio = Boolean(
      hasClientReq || hasScope || hasNarrative ||
      fotosHtml.trim() || mapaHtml.trim()
    );
    if (!tieneContenidoPropio && !plan.juntoAlTexto) {
      return renderItemsPages(propuesta, idx, plan);
    }

    const esNombreGenerico = !propuesta.nombre || /^propuesta(\s+[a-z0-9]+)?$/i.test(String(propuesta.nombre).trim());
    const tituloPropuestaHtml = !esNombreGenerico ? `<h2 class="doc-h2">${escapeHtml(propuesta.nombre)}</h2>` : "";

    return `
      <section class="page">
        <div class="page-inner">
          ${headerHtml}
          <div class="page-content">
            ${tituloPropuestaHtml}

            ${hasClientReq ? `
              <div class="content-block">
                <div class="card-label block-label">Necesidad del cliente</div>
                <p class="doc-copy">${escapeHtml(propuesta.requerimientoCliente)}</p>
              </div>
            ` : ""}

            ${hasScope ? `
              <div class="content-block">
                <div class="card-label block-label">Alcance de esta propuesta</div>
                <p class="doc-copy">${escapeHtml(propuesta.alcancePropuesta)}</p>
              </div>
            ` : ""}

            ${hasNarrative ? `
              <div class="content-block">
                <p class="doc-copy">${escapeHtml(propuesta.narrative)}</p>
              </div>
            ` : ""}

            ${fotosHtml}
            ${mapaHtml}
            ${plan.juntoAlTexto
              ? (plan.hojas.length ? renderItemsTable(propuesta, plan.hojas[0], { conTotales: true }) : "")
              : `<p class="doc-copy"><em>El detalle de precios continúa en la página siguiente.</em></p>`}
          </div>
          ${footerHtml}
        </div>
      </section>
      ${renderItemsPages(propuesta, idx, plan)}
    `;
  };

  const coverPage = `
    <section class="page">
      <div class="page-inner">
        <div class="page-content cover">
          <header class="cover-header">
            <img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes" class="cover-logo" />
          </header>
          <div class="cover-firm">
            <div class="cover-firm-name">INGEANCLAJES S.A.S.</div>
            <div class="cover-firm-nit"><span>NIT 900.193.965-4</span></div>
            <div class="cover-firm-contact">Calle 38 Sur # 36 &ndash; 48, Envigado &middot; PBX: (604) 448 26 86 &middot; Cel: 315 288 9541</div>
          </div>
          <div class="cover-client">
            <div class="meta-label">Cotización preparada para</div>
            <div class="cover-client-name">${escapeHtml(normalizarMayusculas(c?.cliente || ""))}</div>
            ${c?.nit ? `<div class="cover-client-nit tnum">${/^nit\b/i.test(String(c.nit).trim()) ? escapeHtml(normalizarMayusculas(c.nit)) : `NIT ${escapeHtml(normalizarMayusculas(c.nit))}`}</div>` : ""}
            <div class="cover-client-grid">
              <div><div class="ccg-k">Obra</div><div class="ccg-v">${escapeHtml(normalizarMayusculas(c?.obra || ""))}</div></div>
              <div><div class="ccg-k">Ciudad</div><div class="ccg-v">${escapeHtml(normalizarMayusculas(c?.ciudad || ""))}</div></div>
              <div><div class="ccg-k">Contacto</div><div class="ccg-v">${escapeHtml(normalizarMayusculas(c?.contacto || c?.cliente || ""))}</div></div>
              <div><div class="ccg-k">Teléfono</div><div class="ccg-v tnum">${escapeHtml(c?.telefono || "")}</div></div>
            </div>
          </div>
          <div class="cover-title">
            <div class="cover-kicker">Propuesta Comercial</div>
            <!-- El titulo va seguido, en una sola frase. Antes cada renglon
                 que se escribiera en el formulario salia como una linea
                 aparte; ahora el propio titulo parte donde toque segun el
                 ancho, que es lo que hace que quede bien centrado. Se sigue
                 leyendo lo guardado con saltos -las cotizaciones de antes-,
                 pero unido con un espacio. -->
            <h1>${escapeHtml(lineasDeTexto(textos.tituloPortada).join(" "))}</h1>
          </div>
          <div class="meta-strip">
            <div class="meta-cell">
              <div class="meta-label">Cotización</div>
              <div class="meta-value tnum">${escapeHtml(c?.numero || c?.id || "")}</div>
            </div>
            <div class="meta-cell">
              <div class="meta-label">Emisión</div>
              <div class="meta-value">${escapeHtml(fechaComercial || "")}</div>
            </div>
            <div class="meta-cell">
              <div class="meta-label">Validez</div>
              <div class="meta-value">${escapeHtml(String(c?.val || 30))} días</div>
            </div>
            <div class="meta-cell last">
              <div class="meta-label">Valor total</div>
              <div class="meta-value tnum accent">${money(totalResumenValor)}</div>
            </div>
          </div>
          <div class="cover-foot">
            <span>Documento confidencial &middot; Uso exclusivo del destinatario</span>
            <span>${escapeHtml(encabezadoFecha)}</span>
          </div>
        </div>
        ${footerHtml}
      </div>
    </section>
  `;

  const introPage = `
    <section class="page">
      <div class="page-inner">
        ${headerHtml}
        <div class="page-content">
          <h2 class="doc-h2">Cordial saludo${c?.cliente ? `, ${escapeHtml(normalizarMayusculas(c.cliente))}` : ""}</h2>
          ${(()=>{
            // La obra y el alcance se destacan en negrita negra pura
            let apertura = String(textos.saludo || "").trim().replace(/\.$/, "");
            apertura = escapeHtml(apertura).replace(/\b([A-ZÁÉÍÓÚÜÑ0-9\(\)\-]{2,}(?:\s+[A-ZÁÉÍÓÚÜÑ0-9\(\)\-]+){2,})\b/g, '<strong style="color:#000000;font-weight:800;">$1</strong>');
            const conObra = c?.obra
              ? `${apertura} en la obra <strong style="color:#000000;font-weight:800;">${escapeHtml(normalizarMayusculas(c.obra))}</strong>.`
              : `${apertura}.`;
            return `<p class="doc-copy" style="color:#000000;">${conObra}</p>`;
          })()}
          <!-- Los renglones de la presentacion van seguidos, sin hueco entre
               ellos: son un mismo texto partido en lineas, no parrafos
               distintos, y separados dejaban tres huecos en mitad de la hoja. -->
          ${lineasDeTexto(textos.presentacion).map((parrafo)=>`<p class="doc-copy junto" style="color:#000000;">${escapeHtml(parrafo)}</p>`).join("")}
          ${textoInicial ? `<p class="doc-copy" style="color:#000000;">${escapeHtml(textoInicial)}</p>` : ""}

          <h3 class="doc-h3 con-espacio">Definiciones que estructuran el alcance</h3>
          ${(()=>{
            // Si la cotizacion trae un marco tecnico propio, reemplaza a las
            // definiciones automaticas por tipo.
            const propio = String(textos.marcoTecnico || "").trim();
            if (propio) {
              // Dentro de un parrafo las lineas se unen con un espacio, no con
              // un <br/>. Quien escribe el texto corta los renglones donde le
              // cabe en su pantalla, y al convertir cada corte en un salto de
              // verdad el parrafo salia dentado -renglones a media hoja, sin
              // justificar-. Los parrafos de verdad ya vienen separados por una
              // linea en blanco, que es lo que parte el split de arriba.
              return `<div class="def-list-libre">${
                propio.split(/\n{2,}/).map((parrafo)=>
                  `<p class="doc-copy">${lineasDeTexto(parrafo).map((l)=>escapeHtml(l)).join(" ")}</p>`
                ).join("")
              }</div>`;
            }
            const tipo = propuestas[0]?.quote?.tipoCotizacion || propuestas[0]?.tipoCotizacion || c?.tipoCotizacion || "linea_vida";
            if(tipo === "obra_blanca") return `
              <div class="def-list">
                <div class="def-row">
                  <div class="def-term">Obra blanca</div>
                  <div class="def-body">
                    <p>Comprende todas las actividades de acabado y revestimiento en edificaciones, incluyendo instalación de sistemas de protección integrados a la estructura arquitectónica del proyecto.</p>
                    <ul class="def-bullets">
                      <li>Instalación de elementos empotrados en la fase de obra para garantizar la mejor estética y durabilidad.</li>
                      <li>Cumplimiento estricto de los estándares constructivos y de seguridad vigentes.</li>
                      <li>Coordinación con el equipo de obra para minimizar el impacto en los cronogramas de construcción.</li>
                    </ul>
                  </div>
                </div>
              </div>
            `;
            if(tipo === "estructuras_metalicas") return `
              <div class="def-list">
                <div class="def-row">
                  <div class="def-term">Estructuras metálicas</div>
                  <div class="def-body">
                    <p>Comprende el diseño, suministro, fabricación, montaje y adecuación de elementos estructurales, plataformas y perfilería metálica en acero de alta resistencia para soporte de equipos, cubiertas y obras civiles o industriales.</p>
                    <ul class="def-bullets">
                      <li>Fabricación bajo especificaciones y normas técnicas estructurales vigentes (NSR-10 / AISC), garantizando capacidades portantes seguras.</li>
                      <li>Procesos de soldadura y anclajes certificados de alta resistencia química y mecánica.</li>
                      <li>Tratamiento de superficies con aplicación de pintura anticorrosiva y acabados de alta durabilidad para intemperie.</li>
                    </ul>
                  </div>
                </div>
              </div>
            `;
            if(tipo === "puntos_anclaje") return `
              <div class="def-list">
                <div class="def-row">
                  <div class="def-term">Trabajo en altura</div>
                  <div class="def-body">Se considera toda actividad, labor o trabajo que se deba realizar a una altura física igual o superior a <strong>2 metros desde el piso</strong>.</div>
                </div>
                <div class="def-row">
                  <div class="def-term">Puntos de anclaje</div>
                  <div class="def-body">Son componentes en acero, anclados con un epóxico químico, con perno de <span class="tnum">5/8"</span> a una profundidad de <span class="tnum">12 cm</span> o más según el caso, instalados en estructuras de concreto, con capacidad de resistir una fuerza de caída de más de <strong>5.000 Lbs (2.268 kg)</strong>.</div>
                </div>
                <div class="def-row">
                  <div class="def-term">Línea de vida</div>
                  <div class="def-body">
                    <p>Son componentes de un sistema/equipo de protección de caídas, consistentes en una cuerda de nylon o cable de acero instalada en forma horizontal y vertical, tensionada y sujeta en tres o dos puntos de anclaje para otorgar movilidad al personal que trabaja en áreas elevadas.</p>
                    <ul class="def-bullets">
                      <li>La línea de vida permite la fijación o enganche en forma directa o indirecta al arnés completo para el cuerpo, o a un dispositivo de impacto o amortiguador.</li>
                      <li>Los pernos son grado 8 &mdash; B7, resistentes a corrosión y condiciones ambientales extremas.</li>
                      <li>Las líneas de vida estarán constituidas por un solo cable continuo.</li>
                      <li>Los anclajes a los cuales se fijarán las líneas de vida deben resistir al menos 5.000 libras por cada persona asegurada.</li>
                    </ul>
                  </div>
                </div>
              </div>
            `;
            return `
              <div class="def-list">
                <div class="def-row">
                  <div class="def-term">Trabajo en altura</div>
                  <div class="def-body">Se considera toda actividad, labor o trabajo que se deba realizar a una altura física igual o superior a <strong>2 metros desde el piso</strong>.</div>
                </div>
                <div class="def-row">
                  <div class="def-term">Puntos de anclaje</div>
                  <div class="def-body">Son componentes en acero, anclado con un epóxico químico, con perno de <span class="tnum">5/8</span> a una profundidad de <span class="tnum">12 cm</span> o más según el caso a estructuras en concreto, con capacidad de resistir una fuerza de caída de más de <strong>5000 Lbs</strong>.</div>
                </div>
                <div class="def-row">
                  <div class="def-term">Línea de vida</div>
                  <div class="def-body">
                    <p>Son componentes de un sistema/equipo de protección de caídas, consistentes en una cuerda de nylon o cable de acero instalada en forma horizontal y vertical, tensionada y sujeta en tres o dos puntos de anclaje para otorgar movilidad al personal que trabaja en áreas elevadas.</p>
                    <ul class="def-bullets">
                      <li>La línea de vida permite la fijación o enganche en forma directa o indirecta al arnés completo para el cuerpo, o a un dispositivo de impacto o amortiguador.</li>
                      <li>Las líneas de vida estarán constituidas por un solo cable continuo.</li>
                      <li>Los anclajes a los cuales se fijarán las líneas de vida deben resistir al menos 5.000 libras por cada persona asegurada.</li>
                    </ul>
                  </div>
                </div>
              </div>
            `;
          })()}
        </div>
        ${footerHtml}
      </div>
    </section>
  `;

  // Alto aprovechable de una hoja carta, en milimetros, ya descontados los
  // margenes, el encabezado y el sitio que ocupa el pie.
  //
  // MEDIDO sobre el documento: el area de contenido de una hoja da 219,6 mm.
  // Estaba puesto en 200 -veinte milimetros por debajo de lo que hay- y por
  // eso el cierre se iba a una hoja mas dejando un tercio de la anterior en
  // blanco. Se dejan cinco de colchon por si una fuente rinde distinto.
  const ALTO_UTIL_CIERRE = 214;

  // Cuanto ocupa el bloque de "esta cotizacion incluye". Se estima por el texto
  // porque no hay forma de medirlo de verdad: el HTML se arma aqui y solo el
  // navegador sabe donde parte cada renglon. ~95 caracteres entran por renglon
  // al ancho de la hoja.
  //
  // OJO al contar el texto: al quitar las etiquetas hay que juntar los
  // espacios que dejan. Sin eso, cada `<div class="incluye-item">` contaba
  // como un puñado de caracteres de texto, salian renglones de mas y el
  // bloque se estimaba en 58 mm cuando mide 45. Esos trece milimetros de
  // humo eran los que empujaban la firma a una hoja para ella sola.
  //
  // Los numeros salen de medir en el navegador: con los seis puntos de
  // siempre mide 45,2 mm y esta cuenta devuelve 49,2. Se queda un pelo por
  // encima a proposito: pasarse parte una hoja de mas, pero quedarse corto
  // imprime encima del pie.
  const altoIncluye = (html) => {
    if (!html.trim()) return 0;
    const renglones = (html.match(/class="incluye-item"/g) || []).length;
    const textoPlano = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const renglonesReales = Math.max(renglones, Math.ceil(textoPlano.length / 95));
    return 12 + renglonesReales * 4.8 + renglones * 1.4;
  };

  // El cierre deja de ser un bloque unico y pasa a ser una lista de piezas con
  // su alto estimado, para poder repartirlas entre hojas. Antes iba todo en una
  // sola: cuando no cabia, la hoja recortaba el sobrante y el pie -que va
  // pegado abajo y con fondo blanco- quedaba impreso ENCIMA del texto.
  const bloquesDelCierre = ({ includeSummary = false } = {}) => {
    const bloques = [];

    if (includeSummary) {
      bloques.push({ alto: 34 + propuestas.length * 7, html: renderResumenBlock() });
    }

    bloques.push({ alto: 53, html: `
    <div class="keep conditions-block">
      <div class="card-label block-label centered">Condiciones comerciales</div>
      <div class="conditions-grid">
        <div class="meta-card">
          <div class="meta-label">Forma de pago</div>
          <div class="meta-strong">${escapeHtml(c?.formaPago || "50% ANTICIPO, 50% CONCLUIR LABORES")}</div>
        </div>
        <div class="meta-card pad-left">
          <div class="meta-label">Tiempo de ejecución</div>
          <div class="meta-strong">${escapeHtml(c?.tiempoEjec || "10 DIAS (4 EN FABRICACION, 6 DIAS EN INSTALACION)")}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Validez de la oferta</div>
          <div class="meta-strong">${escapeHtml(`${c?.val || 30} días desde la entrega de esta cotización`)}</div>
        </div>
        <div class="meta-card pad-left">
          <div class="meta-label">Certificación</div>
          <div class="meta-strong">Se entrega con el pago total</div>
        </div>
      </div>
    </div>
    ` });

    if (incluyeCierreHtml.trim()) {
      bloques.push({ alto: altoIncluye(incluyeCierreHtml), html: incluyeCierreHtml });
    }

    bloques.push({ alto: 39, html: `
    <div class="keep sst-block">
      <div class="sst-title">Sistema de Gestión de Seguridad y Salud en el Trabajo</div>
      <p>${escapeHtml(textos.sst)}</p>
    </div>
    ` });

    bloques.push({ alto: 66, html: `
    <div class="signature keep">
      <div>
        <div class="card-label block-label">Próximos pasos</div>
        <ol class="steps-list">
          ${lineasDeTexto(textos.proximosPasos).map((paso)=>`<li>${escapeHtml(paso)}</li>`).join("")}
        </ol>
        <div class="contact-box">
          <div class="meta-label">Para aceptar o resolver dudas</div>
          <div class="contact-line">${escapeHtml(textos.contactoTelefono)}</div>
          <div class="contact-line">${escapeHtml(textos.contactoEmail)}</div>
        </div>
      </div>
      <div>
        <div class="card-label block-label">Cordialmente</div>
        <div class="sig-space">${firmaImg ? `<img class="sig-img" src="${escapeHtml(firmaImg)}" alt=""/>` : ""}</div>
        <div class="sig-name">${escapeHtml(textos.firmaNombre)}</div>
        <div class="sig-role">${escapeHtml(textos.firmaCargo)}</div>
        <div class="sig-meta">${lineasDeTexto(textos.firmaDetalle).map((l)=>escapeHtml(l)).join("<br/>")}</div>
      </div>
    </div>
    ` });

    return bloques;
  };

  const renderFinalPage = ({ includeSummary = false } = {}) => {
    // Se van llenando hojas hasta que la siguiente pieza no cabe; ahi se abre
    // una nueva. Ninguna pieza se parte por dentro: son bloques que se leen de
    // corrido -las condiciones, lo que incluye, la firma- y cortarlos a la
    // mitad se ve peor que pasarlos enteros a la hoja siguiente.
    const hojas = [[]];
    let ocupado = 0;

    for (const bloque of bloquesDelCierre({ includeSummary })) {
      const ultima = hojas[hojas.length - 1];
      if (ultima.length && ocupado + bloque.alto > ALTO_UTIL_CIERRE) {
        hojas.push([bloque.html]);
        ocupado = bloque.alto;
      } else {
        ultima.push(bloque.html);
        ocupado += bloque.alto;
      }
    }

    return hojas.map((piezas, i) => `
      <section class="page premium-final-page ${includeSummary && i === 0 ? "premium-closing-page" : ""}">
        <div class="page-inner">
          ${headerHtml}
          <div class="page-content">
            ${piezas.join("\n")}
          </div>
          ${footerHtml}
        </div>
      </section>
    `).join("");
  };

  const checkTextForInox = (texto) => /inoxidable|\binox\b/i.test(String(texto || ""));

  const getProposalMaterial = (propuesta) => {
    const quote = propuesta?.quote || propuesta || {};
    const items = Array.isArray(propuesta?.items)
      ? propuesta.items
      : (Array.isArray(quote?.items) ? quote.items : []);

    const hasInoxItem = items.some(it =>
      checkTextForInox(it?.desc) ||
      checkTextForInox(it?.descripcion) ||
      checkTextForInox(it?.nombre)
    );

    const hasInoxMeta =
      checkTextForInox(propuesta?.nombre) ||
      checkTextForInox(propuesta?.titulo) ||
      checkTextForInox(propuesta?.alcance) ||
      checkTextForInox(propuesta?.propuestaAlcance) ||
      checkTextForInox(quote?.alcance);

    return (hasInoxItem || hasInoxMeta) ? "inoxidable" : "galvanizado";
  };

  const renderSingleTechnicalSheet = (material = "galvanizado") => {
    const isInox = material === "inoxidable";
    const materialTitulo = isInox ? "acero inoxidable" : "acero galvanizado";
    const tagAcero = isInox ? "Acero Inox." : "Acero Galv.";
    const tagEmpalmes = isInox ? "Aluminio / Inox." : "Aluminio / Galv.";
    const descGuardacables = isInox
      ? "En acero inoxidable. Protegen contra el desgaste, cizallamiento y deformación por curvatura, alargando la vida útil del cable."
      : "En acero galvanizado. Protegen contra el desgaste, cizallamiento y deformación por curvatura, alargando la vida útil del cable.";

    return `
    <section class="page">
      <div class="page-inner">
        ${headerHtml}
        <div class="page-content">
          <h3 class="doc-h3">Componentes del sistema en ${materialTitulo}</h3>

          <div class="ficha-grid">
            <div class="ficha-card">
              <div class="ficha-card-header">
                <span class="ficha-card-title">Soporte lateral e intermedio</span>
                <span class="ficha-card-tag">${tagAcero}</span>
              </div>
              <div class="ficha-card-img-box">
                <img src="${IMG_SOPORTE}" class="ficha-card-img" alt="Soporte lateral e intermedio" />
              </div>
              <div class="ficha-card-desc">
                Este elemento está diseñado para ser usado en sistemas de líneas de vida horizontales continuas. Soporta regularmente el cable de acero para no superar la luz máxima permitida y permite el paso continuo del carro deslizador sin desconexión del colaborador.
              </div>
            </div>

            <div class="ficha-card">
              <div class="ficha-card-header">
                <span class="ficha-card-title">Tensor de línea</span>
                <span class="ficha-card-tag">${tagAcero}</span>
              </div>
              <div class="ficha-card-img-box">
                <img src="${IMG_TENSOR}" class="ficha-card-img" alt="Tensor" />
              </div>
              <div class="ficha-card-desc">
                Diseñado para líneas de vida horizontales. Se asegura al cable y al absorbedor de energía respectivamente. Su función es mantener la tensión adecuada para que, ante una eventual caída, la deflexión y distancia de caída sean mínimas.
              </div>
            </div>

            <div class="ficha-card">
              <div class="ficha-card-header">
                <span class="ficha-card-title">Empalmes y guardacables</span>
                <span class="ficha-card-tag">${tagEmpalmes}</span>
              </div>
              <div class="ficha-card-img-box">
                <img src="${IMG_EMPALMES}" class="ficha-card-img" alt="Empalmes y guardacables" />
              </div>
              <div class="ficha-card-desc">
                <div class="split"><strong>Empalmes y fijaciones:</strong> Fabricados en aluminio de alta resistencia a la corrosión. Utilizados para empalme y remate seguro de cables.</div>
                <div><strong>Guardacables:</strong> ${descGuardacables}</div>
              </div>
            </div>

            <div class="ficha-card">
              <div class="ficha-card-header">
                <span class="ficha-card-title">Cable de acero</span>
                <span class="ficha-card-tag">Certificado</span>
              </div>
              <div class="ficha-card-img-box">
                <img src="${IMG_CABLE}" class="ficha-card-img" alt="Cable de acero" />
              </div>
              <div class="ficha-card-desc">
                Fabricado bajo diseño para absorber desgaste y esfuerzos por contacto con poleas y superficies, así como tensiones dinámicas de detención. Se compone de alambres de acero estirados en frío y trenzados en torones para óptima flexibilidad y resistencia.
              </div>
            </div>
          </div>
        </div>
        ${footerHtml}
      </div>
    </section>
  `;
  };

  const renderTechnicalPage = () => {
    const quoteLevelInox =
      checkTextForInox(c?.titulo) ||
      checkTextForInox(textos?.tituloPortada) ||
      checkTextForInox(c?.alcance) ||
      checkTextForInox(textoInicial) ||
      (Array.isArray(c?.items) && c.items.some(it =>
        checkTextForInox(it?.desc) ||
        checkTextForInox(it?.descripcion) ||
        checkTextForInox(it?.nombre)
      ));

    const technicalMaterials = [];
    if (propuestas.length > 0) {
      propuestas.forEach(p => {
        const mat = getProposalMaterial(p);
        if (!technicalMaterials.includes(mat)) {
          technicalMaterials.push(mat);
        }
      });
    }

    if (quoteLevelInox && !technicalMaterials.includes("inoxidable")) {
      if (technicalMaterials.length === 1 && technicalMaterials[0] === "galvanizado") {
        technicalMaterials[0] = "inoxidable";
      } else {
        technicalMaterials.push("inoxidable");
      }
    }

    if (technicalMaterials.length === 0) {
      technicalMaterials.push("galvanizado");
    }

    return technicalMaterials.map(mat => renderSingleTechnicalSheet(mat)).join("\n");
  };

  const proposalSections = propuestas.map((propuesta, idx) => renderProposalPage(propuesta, idx)).join("");
  const closingSections = mostrarResumenFinal
    ? renderFinalPage({ includeSummary: true })
    : renderFinalPage();

  return `<!doctype html>
  <html>
  <head>
    <base href="${typeof window !== 'undefined' && window.location ? window.location.origin : ''}/" />
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap" rel="stylesheet" />
    <title>Cotizacion ${escapeHtml(c?.numero || "")}</title>
    <style>
      @page { size: Letter; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      :root { --texto: 11.5px; --titulo: 17px; }
      html, body { margin:0; padding:0; background:#ffffff; }
      body { font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; color:#000000; -webkit-font-smoothing:antialiased; }

      .page {
        width:8.5in;
        height:11in;
        margin:0 auto;
        background:#fff;
        break-after:page;
        page-break-after:always;
        position:relative;
        overflow:hidden;
      }
      .page:last-child { break-after:auto; page-break-after:auto; }
      .page-inner { position:relative; width:100%; height:100%; padding:9mm 9mm 0 9mm; }
      .page-content { display:block; padding:0 9mm 30mm 9mm; }

      h1, h2, h3 { margin:0; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; font-weight:700; color:#000000; text-wrap:balance; }
      p { margin:0 0 3mm; font-size: var(--texto); line-height:1.6;
          text-align: justify; text-justify: inter-word; hyphens: auto; color:#000000; }

      .header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #000000; padding-bottom:2.6mm; margin:0 9mm 6mm 9mm; }
      .logo { height:30px; width:auto; object-fit:contain; }
      .header-right { font-size: var(--texto); letter-spacing:.06em; text-transform:uppercase; color:#000000; font-weight:700; text-align:right; }
      /* El codigo del formato: mas pequeno y en monoespaciada, para que se
         lea como un codigo y no compita con el numero de la cotizacion. */
      .header-sello { font-family:Consolas,"Courier New",monospace; font-size:calc(var(--texto) * .92); letter-spacing:.02em; text-transform:none; color:#000000; font-weight:400; margin-top:2px; }
      .header-sello b { color:#000000; font-weight:700; }

      .footer {
        position:absolute;
        left:9mm; right:9mm; bottom:7mm;
        padding-top:2.6mm;
        border-top:1.5px solid #000000;
        display:grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap:4mm;
        background:#fff;
        line-height:1.35;
      }
      .footer-col-left { text-align:left; }
      .footer-col-center { text-align:center; border-left:1px solid #E2E8F0; border-right:1px solid #E2E8F0; padding:0 2mm; }
      .footer-col-right { text-align:right; }
      .footer-label {
        font-size:calc(var(--texto) * 1.05);
        font-weight:800;
        text-transform:uppercase;
        letter-spacing:.07em;
        color:#000000;
        margin-bottom:2px;
      }
      .footer-main {
        font-weight:700;
        color:#000000;
        font-size:calc(var(--texto) * 1.22);
      }
      .footer-sub {
        font-weight:700;
        color:#000000;
        font-size:calc(var(--texto) * 1.13);
      }
      .footer-brand {
        color:#cc0000;
        font-weight:800;
      }

      .eyebrow { font-size: var(--texto); letter-spacing:.09em; text-transform:uppercase; color:#000000; font-weight:700; text-align:center; margin:0 0 6mm; padding-bottom:3mm; border-bottom:2px solid #000000; }
      .eyebrow-gap { margin-top:9mm; }
      .card-label { font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; color:#000000; font-weight:700; }
      .block-label { margin-bottom:2.6mm; }
      .centered { text-align:center; }
      .tnum { font-variant-numeric:tabular-nums; }
      .accent { color:#8A1518; }

      .doc-h2 { font-size: var(--titulo); line-height:1.3; text-align:center; margin:0 auto 5mm; max-width:170mm; color:#000000; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; font-weight:700; }
      .doc-h3.con-espacio { margin-top:12mm; }
      .doc-h3 { font-size: var(--titulo); text-align:center; margin:0 0 4.5mm; color:#000000; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; font-weight:700; }
      .doc-copy.junto { margin-bottom:0; color:#000000; }
      .doc-copy { font-size: var(--texto); line-height:1.65; color:#000000; max-width:160mm; margin:0 auto 3mm;
                  text-align: justify; text-justify: inter-word; hyphens: auto; }
      .doc-copy strong { color:#000000 !important; font-weight:800; }

      .cover {
        padding-top: 8mm;
        font-family: 'Source Sans 3', 'Segoe UI', Arial, sans-serif;
      }
      .cover-header { display:flex; justify-content:center; padding-bottom:5mm; border-bottom:2px solid #000000; }
      .cover-logo { height:44px; width:auto; }
      .cover-firm { text-align:center; margin-top:7mm; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      .cover-firm-name { font-size:18px; font-weight:800; color:#000000; letter-spacing:.06em; margin-bottom:2.2mm; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; text-transform:uppercase; }
      .cover-firm-nit { font-size:13px; font-weight:700; color:#000000; margin-bottom:2.2mm; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      .cover-firm-nit span { background:#ffffff; border:1.5px solid #000000; padding:2px 14px; border-radius:6px; letter-spacing:.04em; color:#000000; font-weight:700; }
      .cover-firm-contact { font-size:13px; color:#000000; font-weight:600; letter-spacing:.01em; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      /* 1. Bloque Cliente: con aire generoso arriba y bajo "COTIZACIÓN PREPARADA PARA" */
      .cover-client { margin-top:18mm; text-align:center; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      .cover-client .meta-label { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:#000000; font-weight:700; margin-bottom:4.5mm; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      .cover-client-name { font-size:18px; font-weight:800; margin:0 0 2.5mm; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; color:#000000; text-transform:uppercase; letter-spacing:.02em; line-height:1.3; }
      .cover-client-nit { font-size:13px; font-weight:700; color:#000000; margin-top:0; margin-bottom:5.5mm; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; letter-spacing:.02em; }
      .cover-client-grid { display:inline-grid; grid-template-columns:repeat(2,auto); gap:4.5mm 16mm; text-align:left; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      .ccg-k { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:#000000; margin-bottom:1.2mm; font-weight:700; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      .ccg-v { font-size:13px; font-weight:700; color:#000000; line-height:1.35; text-transform:uppercase; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      /* 2. Bloque Propuesta Comercial: con separación clara y aire bajo "PROPUESTA COMERCIAL" */
      .cover-title { margin-top:20mm; text-align:center; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      .cover-kicker { font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:#000000; margin-bottom:5mm; font-weight:700; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      .cover-title h1 { font-size:18px; line-height:1.4; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif;
        text-align:center; text-transform:uppercase; font-weight:800; color:#000000;
        max-width:155mm; margin-left:auto; margin-right:auto; letter-spacing:.02em; }
      .meta-strip { margin-top:16mm; display:grid; grid-template-columns:repeat(4,1fr); border-top:1.5px solid #000000; border-bottom:1.5px solid #000000; padding:6.5mm 0; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      .meta-cell { padding:0 3.5mm; border-right:1px solid #DDD; text-align:center; }
      .meta-cell.last { border-right:none; }
      .meta-label { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:#000000; margin-bottom:2.5mm; font-weight:700; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      .meta-value { font-size:13px; font-weight:700; color:#000000; text-transform:uppercase; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; }
      .meta-value.accent { color:#000000; font-weight:800; }
      /* 3. Pie de portada: expandido hacia abajo para balancear el folio carta */
      .cover-foot { margin-top:20mm; padding-top:4mm; border-top:1px solid #DDD; display:flex; justify-content:space-between; align-items:center; gap:6mm; font-size:10px; color:#000000; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; font-weight:700; letter-spacing:.03em; }
      .cover-sello { font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; font-size:10px; color:#000000; white-space:nowrap; font-weight:700; }
      .cover-sello b { color:#000000; font-weight:800; }

      .def-list { border-top:1px solid #DDD; max-width:170mm; margin:0 auto; }
      .def-row { display:grid; grid-template-columns:44mm 1fr; gap:7mm; padding:4.5mm 0; border-bottom:1px solid #DDD; }
      .def-term { font-size: var(--titulo); font-weight:700; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; color:#000000; }
      .def-body { font-size: var(--texto); line-height:1.65; color:#000000; }
      .def-body p { font-size: var(--texto); margin:0 0 2.5mm; color:#000000; }
      .def-bullets { margin:0; padding-left:16px; font-size: var(--texto); line-height:1.65; color:#000000; }
      .def-bullets li { margin-bottom:1.2mm; }
      .bullet-list { margin:1.5mm 0 0 0; padding-left:18px; font-size: var(--texto); line-height:1.5; color:#000000; }
      .bullet-list li { margin-bottom:1.3mm; }
      .section-title { font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; color:#000000; font-weight:700; margin-bottom:2.6mm; }
      .subheading { font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; color:#000000; font-weight:700; margin-bottom:2.6mm; }

      .incluye-block { margin:6mm 0 0; }
      .incluye-list { border-top:1px solid #DDD; padding-top:3.5mm; }
      /* Sangria francesa: el guion cuelga fuera y los renglones siguientes
         quedan alineados bajo la primera palabra, no bajo la vinieta. */
      .incluye-item {
        position:relative; padding-left:5mm; margin-bottom:1.7mm;
        font-size: var(--texto); line-height:1.55; color:#000000; text-align:justify;
      }
      .incluye-item:last-child { margin-bottom:0; }
      .incluye-item::before { content:"–"; position:absolute; left:1.2mm; color:#000000; font-weight:700; }
      .content-block { margin-bottom:5mm; }

      .photo-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:0 0 5mm; }
      .photo-grid.single { grid-template-columns:1fr; }
      .photo-card {
        border:1px solid #CBD5E1;
        border-radius:6px;
        overflow:hidden;
        background:#ffffff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.03);
      }
      /* La foto entra ENTERA en su recuadro con contain.
         Con altura dinámica y expandida (hasta 144mm en individuales y 84mm en dobles),
         los planos, isométricos, cotas y detalles de obra se ven nítidos y amplios
         sin recortes y aprovechando la altura disponible de la hoja. */
      .photo {
        display:block;
        width:100%;
        height: var(--card-photo-h, 76mm);
        object-fit:contain;
        object-position:center;
        background:#ffffff;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: auto;
        -webkit-backface-visibility: hidden;
        backface-visibility: hidden;
      }
      .photo-grid.single .photo { height: var(--card-photo-h, 140mm); }
      .proposal-3-photo { height:52mm !important; object-fit:contain; object-position:center; background:#ffffff; }
      .photo-caption { padding:5px 8px 6px; text-align:center; font-size: var(--texto); letter-spacing:.04em; text-transform:uppercase; color:#000000; border-top:1px solid #E2E8F0; background:#FAFAFA; font-weight:700; }

      .map-wrap {
        position:relative; width:100%; height:52mm;
        border:1px solid #DDD; border-radius:6px; overflow:hidden;
        background:#F4F4F2; margin:0 0 5mm;
        display:flex; align-items:center; justify-content:center;
      }
      .proposal-3-map { height:72mm; background:#ffffff; }
      .map-svg { display:block; width:100%; height:100%; background:#F4F4F2; }
      .proposal-3-map .map-svg { background:#ffffff; }
      .map-label-group { pointer-events:none; }
      .map-label-group text {
        text-anchor:middle; dominant-baseline:middle; font-weight:800; letter-spacing:.2px;
        paint-order:stroke; stroke:#ffffff; stroke-width:3; stroke-linejoin:round; stroke-linecap:round;
      }
      .map-label-title { font-size:0; }
      .map-label-value { font-size: var(--texto); }

      .price-table { margin-top:2mm; }
      .table { width:100%; border-collapse:collapse; font-size: var(--texto); }
      .table th { background:#1E1E1E; color:#fff; padding:8px 10px; font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; font-weight:600; text-align:center; border:none; }
      .table th.t-left { text-align:left; }
      .table th.t-right { text-align:right; }
      .table td { border-bottom:1px solid #DDD; padding:8px 10px; vertical-align:middle; color:#000000; }
      .table .sub-row td { font-weight:700; color:#000000; }
      .table .soft-row td { color:#000000; font-size: var(--texto); border-bottom:1px solid #EEE; padding:6px 10px; }
      .table .grand-total td { border-top:2px solid #1E1E1E; border-bottom:none; padding-top:12px; }
      .total-label { font-size: var(--texto); font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:#000000; }
      .total-amount { font-size: var(--titulo); color:#8A1518; font-weight:700; }
      .row-num { color:#000000; font-size: var(--texto); }

      .t-center { text-align:center; }
      .t-right { text-align:right; }
      .t-left { text-align:left; }
      .strong { font-weight:600; }

      .ficha-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        gap: 4.5mm;
        margin-top: 2mm;
      }
      .ficha-card {
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 3mm 3.5mm;
        background: #FFFFFF;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
      }
      .ficha-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 2mm;
        padding-bottom: 1.5mm;
        border-bottom: 1px solid #F1F5F9;
        margin-bottom: 2mm;
      }
      .ficha-card-title {
        font-size: 13px;
        font-weight: 700;
        font-family: 'Source Sans 3', 'Segoe UI', Arial, sans-serif;
        color: #000000;
        line-height: 1.2;
      }
      .ficha-card-tag {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .04em;
        text-transform: uppercase;
        color: #000000;
        background: #F8FAFC;
        border: 1px solid #CBD5E1;
        padding: 1px 5px;
        border-radius: 4px;
        white-space: nowrap;
      }
      .ficha-card-img-box {
        width: 100%;
        height: 66mm;
        background: #FAFAFA;
        border: 1px solid #E5E7EB;
        border-radius: 6px;
        padding: 2mm;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
        margin-bottom: 2mm;
      }
      .ficha-card-img {
        max-width: 100%;
        max-height: 100%;
        width: auto;
        height: auto;
        object-fit: contain;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.06));
      }
      .ficha-card-desc {
        font-size: 10px;
        line-height: 1.42;
        color: #000000;
        text-align: justify;
        text-justify: inter-word;
        hyphens: auto;
      }
      .ficha-card-desc strong {
        color: #000000;
      }
      .ficha-card-desc .split {
        margin-bottom: 1.5mm;
        padding-bottom: 1.5mm;
        border-bottom: 1px dashed #E2E8F0;
      }

      .ficha-row { display:grid; grid-template-columns:42mm 38mm 1fr; gap:6mm; padding:4.5mm 0; border-top:1px solid #DDD; align-items:center; }
      .ficha-row:last-of-type { border-bottom:1px solid #DDD; }
      .ficha-name { font-size: var(--titulo); font-weight:700; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; color:#000000; }
      .ficha-img-box {
        width: 100%;
        height: 32mm;
        background: #FAFAFA;
        border: 1px solid #E5E7EB;
        border-radius: 6px;
        padding: 2mm;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }
      .ficha-img { max-width:100%; max-height:100%; object-fit:contain; }
      .ficha-desc { font-size: var(--texto); line-height:1.6; color:#000000; }
      .ficha-desc .split { margin-bottom:2.5mm; padding-bottom:2.5mm; border-bottom:1px dashed #DDD; }

      .conditions-block { margin:7mm 0 0; }
      .conditions-grid { display:grid; grid-template-columns:1fr 1fr; border-top:1px solid #DDD; }
      .meta-card { padding:4.5mm 6mm 4.5mm 0; border-bottom:1px solid #DDD; }
      .meta-card.pad-left { padding-left:6mm; padding-right:0; border-left:1px solid #EEE; }
      /* Los cuatro valores de las condiciones comerciales van en mayuscula.
         La forma de pago y el tiempo de ejecucion se escriben a mano y salian
         como los hubiera escrito cada quien; la validez y la certificacion
         venian del codigo en minuscula. Puestos aqui, los cuatro se ven
         iguales sin tener que acordarse al escribirlos. */
      .meta-strong { font-size: var(--texto); font-weight:700; margin-top:1.6mm;
        text-transform:uppercase; color:#000000; }

      .sst-block { margin:6mm 0; padding-top:4mm; border-top:2px solid #000000; }
      .sst-title { font-size: var(--texto); letter-spacing:.08em; text-transform:uppercase; font-weight:700; margin-bottom:2.6mm; color:#000000; }
      .sst-block p { font-size: var(--texto); line-height:1.7; margin:0; color:#000000; }

      .signature { display:grid; grid-template-columns:1fr 1.05fr; gap:10mm; padding-top:5mm; border-top:1px solid #000000; }
      .steps-list { margin:0; padding-left:17px; font-size: var(--texto); line-height:1.8; color:#000000; }
      .contact-box { margin-top:5mm; padding:4mm 5mm; background:#F8FAFC; border:1px solid #CBD5E1; color:#000000; }
      .contact-line { font-size: var(--texto); line-height:1.6; color:#000000; }
      .sig-space { height:14mm; border-bottom:1px solid #000000; margin-bottom:3mm; display:flex; align-items:flex-end; }
      .sig-img { max-height:13mm; max-width:60mm; object-fit:contain; }
      .sig-name { font-size: 15px; font-weight:700; font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; color:#000000; white-space:nowrap; }
      .sig-role { font-size: var(--texto); color:#000000; margin-top:.6mm; font-weight:600; }
      .sig-meta { font-size: var(--texto); color:#000000; margin-top:2mm; line-height:1.65; }

      .appendix-page .page-content { padding-bottom:26mm; box-sizing:border-box; }
      .appendix-img { width:auto; max-width:100%; height:auto; max-height:180mm; object-fit:contain; display:block; margin:0 auto; image-rendering: -webkit-optimize-contrast; image-rendering: auto; }
      .summary-spacing { margin-bottom:8mm; }
      .summary-page .page-content { padding-bottom:30mm; }

      .eyebrow, .doc-h2, .doc-h3, .photo-grid, .photo-card, .map-wrap,
      .price-table, .table, .table thead, .table tr,
      .def-row, .ficha-row, .meta-card, .conditions-grid,
      .sst-block, .signature, .content-block, .incluye-block { break-inside:avoid; page-break-inside:avoid; }

      @media print {
        body { background:#fff; }
        .page { margin:0; }
      }
    </style>
  </head>
  <body>
    ${coverPage}
    ${introPage}
    ${proposalSections}
    ${showCatLadderAppendix ? `
      <section class="page appendix-page">
        <div class="page-inner">
          ${headerHtml}
          <div class="page-content">
            <h3 class="doc-h3">Sistema de escalera fija tipo gato</h3>
            <img src="${articoEscaleraGato}" alt="Sistema de escalera fija tipo gato Artico Safe Work" class="appendix-img" />
          </div>
          ${footerHtml}
        </div>
      </section>
    ` : ""}
    ${showVerticalLifelineAppendix ? `
      <section class="page appendix-page">
        <div class="page-inner">
          ${headerHtml}
          <div class="page-content">
            <h3 class="doc-h3">Sistema certificado para escalera fija con línea de vida vertical</h3>
            <img src="${articoLineaVidaVertical}" alt="Sistema de linea de vida vertical Artico Safe Work" class="appendix-img" />
          </div>
          ${footerHtml}
        </div>
      </section>
    ` : ""}
    ${showTechnicalPage ? renderTechnicalPage() : ""}
    ${mostrarResumenFinal ? "" : renderResumenPropuestas()}
    ${closingSections}
  </body>
  </html>`;
}


async function toDataUrl(src){
  if(!src) return "";
  if(typeof src !== "string"){
    if(src instanceof Blob || src instanceof File){
      return await new Promise((resolve, reject)=>{
        const reader = new FileReader();
        reader.onloadend = ()=>resolve(reader.result || "");
        reader.onerror = reject;
        reader.readAsDataURL(src);
      });
    }
    return "";
  }
  if(src.startsWith("data:")) return src;
  try {
    const response = await fetch(src);
    const blob = await response.blob();
    return await new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onloadend = ()=>resolve(reader.result || "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch(err){
    console.error("No se pudo convertir imagen a data URL:", src, err);
    return src;
  }
}

async function normalizeCotizacionForPrint(c={}){
  let clone;
  try {
    clone = structuredClone(c);
  } catch {
    clone = JSON.parse(JSON.stringify(c || {}));
  }

  if(Array.isArray(clone?.fotosCotizacion)){
    clone.fotosCotizacion = await Promise.all(clone.fotosCotizacion.map(async (foto)=>({
      ...foto,
      src: await toDataUrl(foto?.src || ""),
    })));
  }

  if(Array.isArray(clone?.propuestas)){
    clone.propuestas = await Promise.all(clone.propuestas.map(async (propuesta)=>{
      const fotos = Array.isArray(propuesta?.fotos)
        ? await Promise.all(propuesta.fotos.map(async (foto)=>({
            ...foto,
            src: await toDataUrl(foto?.src || ""),
          })))
        : propuesta?.fotos;

      const mapImg = propuesta?.mapImg ? await toDataUrl(propuesta.mapImg) : propuesta?.mapImg;
      return { ...propuesta, fotos, mapImg };
    }));
  }

  if(clone?.mapImg){
    clone.mapImg = await toDataUrl(clone.mapImg);
  }

  return clone;
}

export async function openCotizacionPrint(c, { firmaImg = "" } = {}){
  const printable = await normalizeCotizacionForPrint(c);
  const html = buildCotizacionPrintHtml(printable, { firmaImg });
  openPrintTab(html, "Cotización " + (c?.numero || c?.id || ""));
}



export const COTIZACION_AUTO_SEND_ENDPOINTS = {
  email: "",
  whatsapp: "",
};



export function normalizeEntityKey(v=""){
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"")
    .trim();
}

export function getCotizacionClientPhone(clienteInfo={}, cotizacion={}){
  const raw = clienteInfo?.telefono || clienteInfo?.tel || cotizacion?.telefono || "";
  const digits = String(raw).replace(/\D/g,"");
  if(!digits) return "";
  if(digits.startsWith("57")) return digits;
  return digits.length === 10 ? `57${digits}` : digits;
}

export function getCotizacionClientEmail(clienteInfo={}){
  return String(clienteInfo?.email || "").trim();
}

export function buildCotizacionShareMessage(c, clienteInfo={}){
  const saludo = clienteInfo?.contacto || clienteInfo?.nombre || c?.cliente || "cliente";
  return [
    `Hola ${saludo},`,
    `Te compartimos la cotizacion *${c?.numero || c?.id || ""}* de *${c?.obra || "su proyecto"}* por un valor de *${fmt(Number(c?.total || 0))}*.`,
    `Vigencia: ${c?.val || 30} dia(s) calendario.`,
    `Quedamos atentos a tu aprobacion o comentarios.`,
    `INGEANCLAJES S.A.S`,
  ].join("\n");
}

export function buildCotizacionEmailSubject(c){
  return `Cotizacion ${c?.numero || c?.id || ""} - ${c?.obra || c?.cliente || "INGEANCLAJES"}`;
}

export function buildCotizacionEmailBody(c, clienteInfo={}){
  const saludo = clienteInfo?.contacto || clienteInfo?.nombre || c?.cliente || "cliente";
  return [
    `Hola ${saludo},`,
    "",
    `Adjuntamos la cotizacion ${c?.numero || c?.id || ""} correspondiente a ${c?.obra || "su proyecto"}.`,
    `Valor total: ${fmt(Number(c?.total || 0))}.`,
    `Vigencia: ${c?.val || 30} dia(s) calendario.`,
    "",
    "Quedamos atentos a cualquier comentario o aprobacion.",
    "",
    "INGEANCLAJES S.A.S",
  ].join("\n");
}

// ─── Abre HTML completo en nueva pestaña con toolbar de impresión ───
// NO bloquea la app principal. El usuario imprime/guarda PDF desde la pestaña.

export function openPrintTab(fullHtml, title){
  const w = window.open("", "_blank");
  if(!w){ alert("El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio."); return; }

  const toolbar = `
    <div id="print-toolbar" style="position:fixed;top:0;left:0;right:0;z-index:99999;background:#1a2840;color:#fff;display:flex;align-items:center;justify-content:space-between;padding:10px 20px;font-family:sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.3);">
      <span style="font-size:14px;font-weight:600;">${title || "Documento"}</span>
      <div style="display:flex;gap:10px;">
        <button onclick="var tb=document.getElementById('print-toolbar');var sp=tb.nextElementSibling;tb.style.display='none';if(sp)sp.style.display='none';setTimeout(function(){window.print();setTimeout(function(){tb.style.display='flex';if(sp)sp.style.display='block';},300);},100);" style="background:#f47c20;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">🖨 Imprimir / Guardar PDF</button>
        <button onclick="window.close();" style="background:#475569;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">✕ Cerrar</button>
      </div>
    </div>
    <div style="height:56px;"></div>`;

  let output = fullHtml;
  const bodyMatch = fullHtml.match(/<body[^>]*>/i);
  if(bodyMatch){
    const idx = fullHtml.indexOf(bodyMatch[0]) + bodyMatch[0].length;
    const printHide = `<style>@media print{#print-toolbar,#print-toolbar+div{display:none!important;}body{padding-top:0!important;}}</style>`;
    output = fullHtml.slice(0, idx) + printHide + toolbar + fullHtml.slice(idx);
  } else {
    output = `<!doctype html><html><head><meta charset="utf-8"><title>${title||"Documento"}</title>
      <style>@media print{#print-toolbar,#print-toolbar+div{display:none!important;}}</style>
    </head><body>${toolbar}${fullHtml}</body></html>`;
  }
  w.document.write(output);
  w.document.close();
}

// AQUI ESTABAN sendCotizacionEmail y sendCotizacionWhatsApp.
//
// Se quitaron porque no las llamaba nadie: el envio de la cotizacion va
// por correoAprobacion.js y su Edge Function, que es la que manda el
// correo con el PDF adjunto al aprobar. Estas eran de una version
// anterior y se quedaron colgadas.
//
// Lo que usaban -COTIZACION_AUTO_SEND_ENDPOINTS, getCotizacionClientEmail,
// getCotizacionClientPhone, buildCotizacionEmailSubject,
// buildCotizacionEmailBody y buildCotizacionShareMessage- sigue aqui
// arriba y exportado, por si algun dia se quiere volver a enganchar.
