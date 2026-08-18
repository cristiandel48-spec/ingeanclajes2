// Generacion del HTML imprimible de cotizaciones y mensajes de envio
import { fmt } from "./format";
import { escapeHtml } from "./html";
import { normalizarMayusculas } from "./normalizarEntrada";
import { LOGO_INGEANCLAJES } from "../assets/embeddedImages";
import { getQuotePrintableProposals } from "./cotizaciones";
import { getStaticMapDimensions, buildStaticMapLabelData } from "./maps";
import { hasVerticalLifeLineService } from "./cotizaciones";
import { getTextosDocumento, lineasDeTexto } from "./cotizacionTextos";
import articoLineaVidaVertical from "../assets/artico-linea-vida-vertical.jpg";

export function buildCotizacionPrintHtml(c, { firmaImg = "", sello = null } = {}){
  const propuestas = getQuotePrintableProposals(c);
  const textoInicial = String(c?.textoInicial || "").trim();
  const textos = getTextosDocumento(c);
  // La lamina de la escalera sale si la nombra cualquier propuesta o los
  // textos del documento: en algunas cotizaciones la escalera solo aparece en
  // el titulo de la portada -"Linea de Vida en Acero Galvanizado y Escalera"-
  // y los items son metros a secas.
  const showVerticalAppendix = propuestas.some((propuesta)=>hasVerticalLifeLineService(propuesta?.quote))
    || hasVerticalLifeLineService({ alcance: textos?.tituloPortada, requerimientoCliente: textoInicial });
  const showTechnicalPage = propuestas.some((propuesta)=>propuesta?.quote?.tipoCotizacion === "linea_vida");

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
      <span>Calle 38 Sur # 36 &ndash; 48, Envigado &middot; PBX 448 26 86 &middot; Cel. 315 288 9541 &middot; NIT 900193965-4</span>
      <span>comercial1ingeanclajes@gmail.com &middot; www.ingeanclajes.com</span>
    </div>
  `;

  // El codigo y la version del formato, si estan configurados. Aqui el
  // encabezado es una sola linea y no un cuadro con bordes como en el informe:
  // la cotizacion lleva su propia caja de datos debajo y otro recuadro mas
  // arriba cargaba la hoja.
  const selloHtml = sello
    ? `<div class="header-sello"><b>${escapeHtml(sello.codigo)}</b>${sello.linea ? ` &middot; ${escapeHtml(sello.linea)}` : ""}</div>`
    : "";

  const headerHtml = `
    <div class="header">
      <img src="${LOGO_INGEANCLAJES}" class="logo" alt="Ingeanclajes" />
      <div class="header-right">
        <div>Especialistas en anclajes &middot; Cotización ${escapeHtml(c?.numero || c?.id || "")}</div>
        ${selloHtml}
      </div>
    </div>
  `;

  const renderPhotoGrid = (fotos = [], proposalIndex = 0) => {
    if(!Array.isArray(fotos) || !fotos.length) return "";
    const images = fotos.slice(0, 2);
    return `
      <div class="card-label block-label">Registro fotográfico de la propuesta</div>
      <div class="photo-grid ${images.length === 1 ? "single" : ""}">
        ${images.map((foto, idx)=>{
          const src = escapeHtml(foto?.src || "");
          const label = escapeHtml(foto?.label || `Foto ${idx + 1}`);
          return `
            <div class="photo-card">
              <img
                src="${src}"
                alt="${label}"
                class="photo ${proposalIndex === 2 ? "proposal-3-photo" : ""}"
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
    if (items.length <= FILAS_JUNTO_AL_TEXTO) {
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
      // que ya estaban guardadas traen descripciones escritas en minuscula y
      // en la tabla desentonan al lado de las demas.
      const desc = escapeHtml(String(item?.desc || `ITEM ${idx + 1}`).toUpperCase());
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
            <tr class="soft-row">
              <td colspan="4">Utilidades (${numberFmt(propuesta.quote?.util || 10)}% del valor de la obra)</td>
              <td class="t-right tnum">${money(propuesta.ut || 0)}</td>
            </tr>
            <tr class="soft-row">
              <td colspan="4">IVA (19% sobre utilidades)</td>
              <td class="t-right tnum">${money(propuesta.iva || 0)}</td>
            </tr>
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
    return plan.hojas.map((itemsHoja, i) => {
      const esUltima = i === totalHojas - 1;
      const arranque = desde;
      desde += itemsHoja.length;
      const titulo = escapeHtml(propuesta.nombre || `Propuesta ${idx + 1}`);
      return `
        <section class="page">
          <div class="page-inner">
            ${headerHtml}
            <div class="page-content">
              <h2 class="doc-h2">${titulo}${totalHojas > 1 ? ` &middot; Detalle ${i + 1} de ${totalHojas}` : " &middot; Detalle"}</h2>
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

    const fotosHtml = renderPhotoGrid(propuesta.fotos, idx);
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

    return `
      <section class="page">
        <div class="page-inner">
          ${headerHtml}
          <div class="page-content">
            <h2 class="doc-h2">${escapeHtml(propuesta.nombre || `Propuesta ${idx + 1}`)}</h2>

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
            <div class="cover-firm-name">ESPECIALISTAS EN ANCLAJES</div>
            <div>Calle 38 Sur # 36 &ndash; 48, Envigado &middot; PBX 448 26 86 &middot; Cel. 315 288 9541 &middot; NIT 900193965-4</div>
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
          <div class="cover-client">
            <div class="meta-label">Cotización preparada para</div>
            <div class="cover-client-name">${escapeHtml(c?.cliente || "")}</div>
            ${c?.nit ? `<div class="cover-client-nit tnum">NIT ${escapeHtml(c.nit)}</div>` : ""}
            <div class="cover-client-grid">
              <div><div class="ccg-k">Obra</div><div class="ccg-v">${escapeHtml(normalizarMayusculas(c?.obra || ""))}</div></div>
              <div><div class="ccg-k">Ciudad</div><div class="ccg-v">${escapeHtml(c?.ciudad || "")}</div></div>
              <div><div class="ccg-k">Contacto</div><div class="ccg-v">${escapeHtml(c?.contacto || c?.cliente || "")}</div></div>
              <div><div class="ccg-k">Teléfono</div><div class="ccg-v tnum">${escapeHtml(c?.telefono || "")}</div></div>
            </div>
          </div>
          <div class="cover-foot">
            <span>Documento confidencial &middot; Uso exclusivo del destinatario</span>
            ${sello
              ? `<span class="cover-sello"><b>${escapeHtml(sello.codigo)}</b>${sello.linea ? ` &middot; ${escapeHtml(sello.linea)}` : ""}</span>`
              : ""}
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
          <h2 class="doc-h2">Cordial saludo${c?.cliente ? `, ${escapeHtml(c.cliente)}` : ""}</h2>
          ${(()=>{
            // La obra se agrega al final de la frase de apertura. Se quita el
            // punto final si lo trae, para no imprimir "...alturas. en la obra X".
            const apertura = String(textos.saludo || "").trim().replace(/\.$/, "");
            const conObra = c?.obra
              ? `${escapeHtml(apertura)} en la obra <strong>${escapeHtml(c.obra)}</strong>.`
              : `${escapeHtml(apertura)}.`;
            return `<p class="doc-copy">${conObra}</p>`;
          })()}
          <!-- Los renglones de la presentacion van seguidos, sin hueco entre
               ellos: son un mismo texto partido en lineas, no parrafos
               distintos, y separados dejaban tres huecos en mitad de la hoja. -->
          ${lineasDeTexto(textos.presentacion).map((parrafo)=>`<p class="doc-copy junto">${escapeHtml(parrafo)}</p>`).join("")}
          ${textoInicial ? `<p class="doc-copy">${escapeHtml(textoInicial)}</p>` : ""}

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
            const tipo = propuestas[0]?.quote?.tipoCotizacion || "linea_vida";
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
            ${i === hojas.length - 1 ? `<div class="thanks-row"><span>Gracias por su confianza</span></div>` : ""}
          </div>
          ${footerHtml}
        </div>
      </section>
    `).join("");
  };

  const IMG_SOPORTE = "data:image/png;base64,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";
  const IMG_TENSOR = "data:image/png;base64,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";
  const IMG_EMPALMES = "data:image/png;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCADHALoDASIAAhEBAxEB/8QAHAABAAEFAQEAAAAAAAAAAAAAAAYBAgQFBwMI/8QASBAAAQMDAQQGBwMJBwIHAAAAAQACAwQFEQYSITFRBxMiQWGBF1VxkZah1BQywRUjQkNSYoKx0QgkV5XS4fAWciU0NnOSwvH/xAAYAQEBAQEBAAAAAAAAAAAAAAAAAQIDBP/EAB0RAQEAAwEBAQEBAAAAAAAAAAABAhExEiFRA0H/2gAMAwEAAhEDEQA/APpj0aac9Zaz+M7t9Sno0056y1n8Z3b6lTNUdwQQ30aac9Zaz+M7t9Sno0056y1n8Z3b6lTDJ5pk80EP9GmnPWWs/jO7fUp6NNOestZ/Gd2+pUwyeaZPNBD/AEaac9Zaz+M7t9Sno0056y1n8Z3b6lTDJ5pk80EP9GmnPWWs/jO7fUp6NNOestZ/Gd2+pUufI1gJe8NAGSSeC55qbpm0PY6p1M6vnuEjTh32KIyNbj984afIlTcO8bX0aac9Zaz+M7t9Sno0056y1n8Z3b6lQKb+0joyP71r1DjfvbFCT7utW4sHT70b3OeOCW71FskfgD7dTujaCd2C8ZaPaThNxdVJfRppz1lrP4zu31KejTTnrLWfxndvqVJbbc7fcqYVVur6asgccCWnlEjD5tJCy9rfjKqIf6NNOestZ/Gd2+pT0aac9Zaz+M7t9SphteKZ8fmgh/o0056y1n8Z3b6lPRppz1lrP4zu31KmGfH5pk80EP8ARppz1lrP4zu31KejTTnrLWfxndvqVMMnmmTzQQ/0aac9Zaz+M7t9Sno0056y1n8Z3b6lTDJ5pk80EP8ARppz1lrP4zu31KejTTnrLWfxndvqVM0QFR3BVVHcEFqIiAiIgKjtzTvwqqjgHNIPAjCD5oq9R6h6Zuk246WsNy+zaWt0jTVSDsExg7OR3ue5wOznAA7srtVh6N9F2eJv2awUcrh+sqmde/PPL84PswuD12l9d9DevbtfdG2z8o2OuOXxOhMrdjJcGu2O00tLnAO4b3ccqTW3+0fEICy66NrqapGAGQ1TXtce/e5rSPcsT51u7s+O2P0/YXxGN9mtzo+9ppmEe7Cjd+6Kej28RFlRpq3xOcNz6ZnUuzz7GFzWXp+v1xldFYtDl2/AfPUOkcOeWMbv8istt36aNTMIp6cWmJ5wDDSCHA/7pC4jywrtNVptW9BVdpmae+aF1ZJZGMYTIZqt1Psj/wB0d3/coXZunLpQtFTJSOnt2oWQntyOgEoDR3h8RbkfvHK6zQ9EFyvEoqdXXqpq5AcgTzGcj2bRwPJSL0KaFfEI6ujqavd+nOWj3NwE1V+Trm1J00X3UULLjTagtenIj2H0b6Q1ZY4HBPWbIByd+O4EDfvKzI+kTUj2uezpQsOwOG3Z3AlZ9/0Ro2xV8lmtFhDy3ttjlme9r3luSBnhuHvBWpi0pRyP/wDRFOMnfkuWpjZ1PWL0g6Wr5anPuNz1jaLpSUzXSPpIaEwvnaGk7LXkbjnG87ltLN/aEN0pmVFPo2p6t2QHfawRkd+5nDw4+1e2mtJWymutNJU6Jt4p3P2ZC4ucBndkg7iBnJBCm+rqpumKa3UFko6Shp5ttgEcDWsj2dnDQAMDILuHJTzbdJcoijOm6R7A7/pCsaN+f7yDw/h4nlx8F7t6Zal2CNHVzhjJDZwceG5pyfAcO9b6rl1C2iklNVTxbLNraztYGOPBbno/ub71Yvtk523NmfGHlgaXAbs4HDv9y1cLP9JlPxCPTLOB+d0ZconbOdkytPzxv8uHPuW20n0p02oNT01jbZK+kknDvzkpaWtLWlxzj2Yz3kromw3kreojLg4saSOBwsapbPx7oiLSCo7gqqjuCC1ERAREQEWHdrnQWukdVXCsipYW/pyOxk8hzKgF76VaRjTHZqGWpfnAln7DPaAN588K6o6S8tAyTuUXvOo9FU9QY66qt8sgO/Zh67HtLQcea5HfNR37UTw2trXiE5xBF2Ix7QOPmSvCitT3Y3K+Wdu7WO6WK4MxaZ6WUAZ2YgAR/CcEe5bfuXErRaJ4aqKekc6KVpy17TggrrGna+aqphHV7IqGDtY4OHPwS46NtqiIstIHqktg1F1x3DrIyTy4LY1Nwoo5HsfXwgtJGNpZGqdMNvU8c7KgQSsG5zmF48DgEf8AMclo4ejSmdg1l4rJT39Uxsf89pbuU1GdV6T3u0xNJdXsIG84Xp0ohs1gt1SBnq6tjgTxDSxw/nj3LLt/R/p2kqY6kwz1MkZBHXzFzSfFow0+YUmnpqeohMNRBHNGeLXtDgfJZ2siKVxD7RKCcZpvwV3RFD1GhqMEHL5JpN/eDK/HyUmNDRlmwaaItxs4LARjkveNjI2BjGhrWjAAGAAluyTS5ERRV6IiAqO4KqtkOGjHNBRU2m8xxwofqDWrKZ09LaqZtXUsBaHvcBEHeJBy7HIY4ceXLtU3HWNyyblcJnUxB/NUx6uIc8gYJ/iytTC1n06rqDpB03aJJIvtprKmMlroaZu2QeRduaPeoDqLpPvdwjMFrgZa4zxlyJJiPDI2W+4nxUGjpS0bLI8Y3LYUdumleAWnetTGG2HKauuqjPWVM9VKf1k0he73netnQ2t0h3jAW6tlheS383v9ilVssIHalaBgcFU2jtrsxBbiME+xSeisrA1rpGADvW3hpoIGgRtAXqX80o8IaeGJoEbcEeC9qd5gnbM3GW9x7/BUc4ea83kuHDAWeiU0kzKiBssZyHL1WisU74nmN+RG85B5H/db1Yal2IiIoiIgIiICIiC9ERAWNdC5tuqHsOHtjcWnkcHCyV5ztDo9k7weI5oOEueKWnYQC4lu/er7XdoHzGmqgGtfuyTuz7VsrzZnRVVVb9+zE4iN2OIByPe1YTLFT7BbKS7IwvV2OTZQaabNUHq8Dv2fDmP+cuYW6otOsiwXDhx3LD0xWysaKd2+posYLjukZvwfMbvblTR72VVOyogxsPHDvB7wfPKxlNLtr4KWni3NbvC9ZHDu3exWk4QNJG9YotLt2FQAkZOV6sYe5ejmBvaccBFY4i2iCcleoZHGAZCB5rGrLlBBGdnGVG7nfXOBxgeKX4JDVXSKDOyRu7srfabuQudB124PY4seAe8f7Y+a49WXR7iQDncpZ0OVb5667RFxLRHC/wBhy8fh8li3bUmnSERFFEREBERAREQXoiICo/eFVUdwQRjVVEI5hXxjskBsox93ua78PconVwdS4Fo7DsluDny+Y+R710yphZPA+KRu017SCOYUHrKN8EslFUfeZ2mPcMbQ7ju9mD/sF3/nluaYsR6ZskFRDXU7XOlhO9rTve08W/iPFSqwV8UgDGvH2epw5js42XH+vD245qPyN2SQRuBwsahqBRVLqZ3YhmdtRuzua7vHnxHjlbs3GU6fCWScM4KuLGsyXEe9YsN2jmthkkLRUR9l458nef8AVRy5Xxznu2ZN3guXOrEiqrlDA0jOSo5dL7kkNJwtBW3R5LsyEn2rTz1b3u3krHpqRta26F5IBK1FTVuIJc7HtKxpZtp7Y42SSTPIaxjGlznE9wA3lSzSvR1drnLHV37aoaPOfs4d+ekGO8j7g+fsWWviLUUNbdq37Fa6SWrqMZLWcGjhkk7gPaV2fo603Lp20PZWOjfW1D9uZzOAxua0HvAHzJW3s1mtlopRTW2iipou8MG9xxjJPEnxK2CAiIgIiICIiAiIgvREQFR3BVVHcEFq1Oore6qphLA3NRDkxj9od7fPC2yo4ZGFZdXaVzaua18fXMw1w3Pb3jxx8j445qO3yaFtK5rn9rILcdxG8HyXQNUWh0bpKynaXxyHMrP2T+0PDn7+8rnN0s2ZtqGXMZOcOPDz716Mb6jnxsKGvcaUTEECWLH9B7wtFU1bn5wtm2MU1KxmSQzCjNqgud+rvsVlo31UmcPcDhkQJ4ucdw/nyBWP6RvGFTVMjDnPcMgd5Wy01pa/aleySng+yUJ41U7SAR+6OLvLd4qf6R6M6C3VEdxu8ouNa07TWEYgjPg3vI5n24Cn7W4AycnmuTSOaV0VY9PnroIDUVhbsuqZ+085xnHc0HHAeeVJURQEREBERAREQEREBERBeiIghnpY6LP8S9Gf57Tf61stPa30XqWtfQ6c1fp+81ccZmfBQXKGokawEAvLWOJDcuaM8Mkc1IUQWIr0QeZGRwUcvWlYK6YzU8n2Vx+80N2mO8cbsf8ANyk6Ky2cEFh0FFLL/wCI1bpYAd8UWWbXgXZzjjuGD4qW26gpLfRspKSlhghYMNZEwNaPILNyOaZHNLbeixFfkc0yOagsRX5HNMjmgsRX5HNMjmgsRX5HNMjmgsRX5HNMjmgsRXogsRXoghnpY6LP8S9Gf57Tf609LHRZ/iXoz/Pab/WpmiAiIgIiICtdxVytdxQUQkDihOBkrlHSP0kdVPJaLBNl+9ktQ0bwTuw0/j7uasm0t0nGp9XWPTzD+UKxvWj9SwbTznhu7vNQGs6Y5jK8UNiHVg7nSy7yOeABhRy0WWW40Qqaxpc6Q7Re85ed+9X1VvoKCF4YzfneeOClxp6jfwdMlTDI0XDTnYI7ToZ8EeRG/v71N9K6801qN4goa9sdWR/5aoHVyZ5AHc7+ElcMqqc1k5JOw3iS5xcT+Cy6C3Wmmf1slQGyREOBD9kg8wkxpt9HZHMKq4dRX67wPabZeqnqxv8AzrjIzG7udlS7TuvKmMiDUkcTc/dqKdu4D99uSfMZ9g4poldDRedNPDURNlgkbLG8BzXtOWuB7we9eiiiIiC5vBVVG8FVAREQEREBERAREQFa/irl5zOaxjnPOGtaSSe4IOedMuppLZbBaaKVzKuqA2nNO9rO/wB/4rmOlLG6ZhutQCY2Ow3I+84d/kqaruj7/f6u4BpLZJBFA0HOQNwwul11qZaNMW+3k/nI4B1mf2zvd88r04Y6kcLl6tRm53ltvoTLMXbDN27i48gtPZ6W7ahrWU8MLnzSkHZz2IW83HuH47t53LHq46u76kgo6SPrmsf1ULM7nvPE+wd57gCV3XSVgpdP2ptJT5fI47c8rh2pX8z4dwHcPeuWepfjpj9iMWPozoItma81T61/EwxkxxD3do+3I9iztR6Bs9ZRbNupKejnY07OywbLvb/VTJFjda1HzPeqSusV3fC5hifE7BZ3Y/otpQ3OOshyAQ/kTkggLtWq9OUGoKTqqluxKwHq5WjtN/qPBcK1Rpm66XuW1JG7q85ZI3e145/7Lcy2zZpLdK6grbMYyxj30juzJCX4Dj+0zPB3yPfzHVrRcqW60Taukk243biCMOaeRHcVwG2XltTCI3vaHNGAMbwt5abvcbTXsr6GRxGNiWJ33ZByPjxweI96XHayu3ItPpnUFFfKRssDhHMGgywOd2oyf5jxW4G8ZC5tLm8FVUbwVUBERAREQEREBERAWn1lO+m0zcpmfebSvDc8yCB8ytwo/wBIYJ0jXhoGdlnHlttyg4hpO3sl1NbA9hMUcwkeO4gZKmOur85lPPMdouxssA7idwx71rtHsjFwa54Bc1jsY57JWm128zfZqYPx1kjsnwH/AOr0+vm3GY/Uo6EbUaq5T3uVuWU8fVRcttw349jcD+JddUM6G4I4tEQuibhsk0hHjh2x/wDVTNee9dZwREUUWJdLdR3OjfS1sDZon8Q7u8RyKy0QfPfSPoiu03UGvomuloHP3PbxbyB5LX2O9RVMDYKk4fnc7xX0hUwwzwPhnjZJG9pa5rhkEciuB9JWi/yRdH1lgcyrpnnMlLC8Omh9jRvI8j+K6Y3fxizXGRQV1RQz/aKWoME7R2Xt37s8DzHDcV1TR+qae9QCKYNp61jcuiBOHfvN5jw4jv7ieAUE1bT7MVbDKw5xmVpYR7cre0s7pZmPjmkge37jmu2S08wQpZtZX0Q3gqrSaFqamr0rR1FZUmpnft7UpABdh7gOG7gAFu1hoREQEREBERAREQFrtRUrq2zVtKwZdJA9rR+9g4+eFsVa9BwuzyMoqkPY7tNPEjjuWo1UGOr6GVrtz+t493BTLpHsj7XcHV9PFs0k5zkcGvPEHlv3+fgoHdyyp2BktdE4yDlw4fyXbsc78dj6HqiObRMMbHAmGeVjsdxLi/8Ak4KYrgvRjq6LTlfPFXOf+T6oBxwM9W8bsgezj5cl1Gp1zZo4ushM04Lct2Gjf7yFzsu2pfiUqhIAJJAA35XNL10jzdW5tHDFT8nO7TvbwwPmoPe9Z3KoGxU1U8uf0drsnyG5JjS5SO21+o7PRA9dWRk8mdvJ5blEr/0kw0zT9jp2s3feqDvPkP6rkktfdq54Yx0mORO4LwfRTl21WSkjv3rUxn+s3K3jf6h6SLxXxuijq5A07i2MbI+XHzUFqpbnXTB7nyF21nPflb3q7VBIXPJ2h+7nevCa5xNb/d4TkYw53HCvuTiebept0XahdYGVH5Xp3PgkaG4Y8DH8B3E+OQpo27dGV7JD326OX9PaaYHj2uGP5rgzprjc6oU0AmnfKexHEwuc72Ab1NtNdFepat8ctZTR0Mbt7jM/tY57Iyc+Bx5Lnb+Okd307DbKezwQ2d8b6Fu11To5esae0ScOyc78962C12mrTT2Oy09rpXPdDBtbJeRntOLjwAHErYqKIiICIiAiIgIiICtdxREHjV08FXTvp6mJksTxhzHjIK5tqTosE8kk1mrur2v1FRvb7A4bx5g+1EVls4lkrleqbLW2KufbLhsNkYA7IIcCHcOH/Ny10VxqKZrYetdsE4GURa2xGZG7b23VDtoEbXfuVH1cMbQ1jNp+d+W8N+B+KIpLtWHPcZ8dh53+OFjAzVUgjc52XO2QAeJKInqrOp/p3ohvlx2Z7lUQ2+F7QW5d1km/wbu+fkp7ZeibTlG9sle+puTwc7Mr9iP/AOLcZ9hJCIstJtbrXbbdF1VvoKakZjGzDEGD5LLREFzeCqiICIiAiIg//9k=";
  const IMG_CABLE = "data:image/png;base64,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";

  const renderTechnicalPage = () => `
    <section class="page">
      <div class="page-inner">
        ${headerHtml}
        <div class="page-content">
          <h3 class="doc-h3">Componentes del sistema en acero galvanizado</h3>

          <div class="ficha-row">
            <div class="ficha-name">Soporte lateral e intermedio</div>
            <img src="${IMG_SOPORTE}" class="ficha-img" alt="Soporte lateral e intermedio" />
            <div class="ficha-desc">Este elemento está diseñado para ser usado en sistemas de líneas de vida horizontales de tipo continuo. El componente soporta regularmente el cable de acero para que una sección libre de cable no supere la luz máxima permitida. Este soporte intermedio permite el uso de un carro deslizador para evitar el uso de eslinga en Y por parte del trabajador, y evitar que el colaborador se desconecte.</div>
          </div>

          <div class="ficha-row">
            <div class="ficha-name">Tensor</div>
            <img src="${IMG_TENSOR}" class="ficha-img" alt="Tensor" />
            <div class="ficha-desc">Este elemento está diseñado para ser usado en sistemas de líneas de vida horizontales. En sus extremos el tensor se asegura al cable de la línea de vida y a un absorbedor de energía respectivamente. Su función es tensionar la línea de vida para que, en el momento de una caída, la distancia de caída del trabajador sea mínima.</div>
          </div>

          <div class="ficha-row">
            <div class="ficha-name">Empalmes, fijaciones y guardacables</div>
            <img src="${IMG_EMPALMES}" class="ficha-img tall" alt="Empalmes y guardacables" />
            <div class="ficha-desc">
              <div class="split"><strong>Empalmes y fijaciones:</strong> Fabricados en aluminio. Resistentes a la corrosión y oxidación. Se utilizan para empalmar dos cables y fijar barandillas de cables.</div>
              <div><strong>Guardacables:</strong> Fabricado en acero con acabado galvanizado resistente a la corrosión. Protegen contra el desgaste y deformación del cable, alargando su vida útil.</div>
            </div>
          </div>

          <div class="ficha-row">
            <div class="ficha-name">Cable de acero</div>
            <img src="${IMG_CABLE}" class="ficha-img" alt="Cable de acero" />
            <div class="ficha-desc">El cable de acero se fabrica bajo un diseño que permite que sea capaz de absorber el desgaste y los esfuerzos causados por el contacto con poleas, tambores y otras superficies, así como las tensiones estáticas y dinámicas del trabajo al que se someta. Se compone por alambres de acero, estirados en frío, trenzados en espiral, formando unidades denominadas torones. Mientras más alambres conformen este elemento, mayor será su flexibilidad y resistencia en esfuerzos elevados.</div>
          </div>
        </div>
        ${footerHtml}
      </div>
    </section>
  `;

  const proposalSections = propuestas.map((propuesta, idx) => renderProposalPage(propuesta, idx)).join("");
  const closingSections = mostrarResumenFinal
    ? renderFinalPage({ includeSummary: true })
    : renderFinalPage();

  return `<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&display=swap" rel="stylesheet" />
    <title>Cotizacion ${escapeHtml(c?.numero || "")}</title>
    <style>
      @page { size: Letter; margin: 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      :root { --texto: 11.5px; --titulo: 17px; }
      html, body { margin:0; padding:0; background:#ffffff; }
      body { font-family:'Source Sans 3', 'Segoe UI', Arial, sans-serif; color:#1E1E1E; -webkit-font-smoothing:antialiased; }

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

      h1, h2, h3 { margin:0; font-family:'Source Serif 4', Georgia, serif; font-weight:600; text-wrap:balance; }
      p { margin:0 0 3mm; font-size: var(--texto); line-height:1.6;
          text-align: justify; text-justify: inter-word; hyphens: auto; }

      .header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #1E1E1E; padding-bottom:2.6mm; margin:0 9mm 6mm 9mm; }
      .logo { height:30px; width:auto; object-fit:contain; }
      .header-right { font-size: var(--texto); letter-spacing:.06em; text-transform:uppercase; color:#6B6B6B; font-weight:600; text-align:right; }
      /* El codigo del formato: mas pequeno y en monoespaciada, para que se
         lea como un codigo y no compita con el numero de la cotizacion. */
      .header-sello { font-family:Consolas,"Courier New",monospace; font-size:calc(var(--texto) * .92); letter-spacing:.02em; text-transform:none; color:#8A8A8A; font-weight:400; margin-top:2px; }
      .header-sello b { color:#4A4A4A; font-weight:700; }

      .footer {
        position:absolute;
        left:9mm; right:9mm; bottom:8mm;
        padding-top:2mm;
        border-top:1px solid #DDD;
        display:flex; justify-content:space-between; gap:6mm;
        font-size: var(--texto); letter-spacing:.03em; color:#666;
        background:#fff;
      }

      .eyebrow { font-size: var(--texto); letter-spacing:.09em; text-transform:uppercase; color:#6B6B6B; font-weight:600; text-align:center; margin:0 0 6mm; padding-bottom:3mm; border-bottom:2px solid #1E1E1E; }
      .eyebrow-gap { margin-top:9mm; }
      .card-label { font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; color:#6B6B6B; font-weight:600; }
      .block-label { margin-bottom:2.6mm; }
      .centered { text-align:center; }
      .tnum { font-variant-numeric:tabular-nums; }
      .accent { color:#8A1518; }

      .doc-h2 { font-size: var(--titulo); line-height:1.3; text-align:center; margin:0 auto 5mm; max-width:170mm; }
      .doc-h3.con-espacio { margin-top:12mm; }
      .doc-h3 { font-size: var(--titulo); text-align:center; margin:0 0 4.5mm; }
      .doc-copy.junto { margin-bottom:0; }
      .doc-copy { font-size: var(--texto); line-height:1.65; color:#2A2A2A; max-width:160mm; margin:0 auto 3mm;
                  text-align: justify; text-justify: inter-word; hyphens: auto; }

      .cover { padding-top:10mm; }
      .cover-header { display:flex; justify-content:center; padding-bottom:6mm; border-bottom:2px solid #1E1E1E; }
      .cover-logo { height:44px; width:auto; }
      .cover-firm { text-align:center; font-size: var(--texto); color:#444; line-height:1.8; margin-top:4mm; }
      .cover-firm-name { font-weight:700; color:#1E1E1E; letter-spacing:.08em; }
      .cover-title { margin-top:14mm; text-align:center; }
      .cover-kicker { font-size: var(--texto); letter-spacing:.18em; text-transform:uppercase; color:#6B6B6B; margin-bottom:5mm; font-weight:700; }
      /* El titulo de la portada, centrado y en mayuscula. El centrado va
         tambien aqui y no solo en el contenedor porque el h1 trae el suyo del
         navegador; y el ancho limitado es para que un titulo largo parta en
         varias lineas centradas en vez de irse de lado a lado de la hoja. */
      .cover-title h1 { font-size: var(--titulo); line-height:1.3;
        text-align:center; text-transform:uppercase;
        max-width:150mm; margin-left:auto; margin-right:auto; }
      .meta-strip { margin-top:13mm; display:grid; grid-template-columns:repeat(4,1fr); border-top:1px solid #CCC; border-bottom:1px solid #CCC; padding:6mm 0; }
      .meta-cell { padding:0 4mm; border-right:1px solid #DDD; text-align:center; }
      .meta-cell.last { border-right:none; }
      .meta-label { font-size: var(--texto); letter-spacing:.08em; text-transform:uppercase; color:#777; margin-bottom:2mm; }
      .meta-value { font-size: var(--titulo); font-weight:700; }
      .cover-client { margin-top:10mm; text-align:center; }
      .cover-client-name { font-size: var(--titulo); font-weight:700; margin:2mm 0 1.5mm; font-family:'Source Serif 4', Georgia, serif; }
      .cover-client-nit { font-size: var(--texto); color:#667085; margin-bottom:4mm; letter-spacing:.02em; }
      /* Los datos del cliente son lo primero que busca quien recibe el
         documento, asi que van con el mismo peso y tamano que las demas
         cifras destacadas de la portada (.meta-value). En negrita a 11.5px no
         se distinguian del rotulo. La etiqueta pasa arriba, pequena y en gris,
         para que la vista caiga en el dato. */
      .cover-client-grid { display:inline-grid; grid-template-columns:repeat(2,auto); gap:4mm 14mm; text-align:left; }
      .ccg-k { font-size: var(--texto); letter-spacing:.08em; text-transform:uppercase; color:#777; margin-bottom:.8mm; }
      .ccg-v { font-size: var(--titulo); font-weight:700; color:#1E1E1E; line-height:1.3; }
      .cover-foot { margin-top:12mm; padding-top:4mm; border-top:1px solid #DDD; display:flex; justify-content:space-between; align-items:center; gap:6mm; font-size: var(--texto); color:#777; }
      /* El codigo del formato en la portada. Discreto y en el centro del
         pie: es lo primero que se mira en una auditoria, pero no es lo que
         el cliente tiene que leer. */
      .cover-sello { font-family:Consolas,"Courier New",monospace; font-size:calc(var(--texto) * .95); color:#8A8A8A; white-space:nowrap; }
      .cover-sello b { color:#4A4A4A; font-weight:700; }

      .def-list { border-top:1px solid #DDD; max-width:170mm; margin:0 auto; }
      .def-row { display:grid; grid-template-columns:44mm 1fr; gap:7mm; padding:4.5mm 0; border-bottom:1px solid #DDD; }
      .def-term { font-size: var(--titulo); font-weight:600; font-family:'Source Serif 4', Georgia, serif; }
      .def-body { font-size: var(--texto); line-height:1.65; color:#333; }
      .def-body p { font-size: var(--texto); margin:0 0 2.5mm; }
      .def-bullets { margin:0; padding-left:16px; font-size: var(--texto); line-height:1.65; color:#333; }
      .def-bullets li { margin-bottom:1.2mm; }
      .bullet-list { margin:1.5mm 0 0 0; padding-left:18px; font-size: var(--texto); line-height:1.5; }
      .bullet-list li { margin-bottom:1.3mm; }
      .section-title { font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; color:#6B6B6B; font-weight:600; margin-bottom:2.6mm; }
      .subheading { font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; color:#6B6B6B; font-weight:600; margin-bottom:2.6mm; }

      .incluye-block { margin:6mm 0 0; }
      .incluye-list { border-top:1px solid #DDD; padding-top:3.5mm; }
      /* Sangria francesa: el guion cuelga fuera y los renglones siguientes
         quedan alineados bajo la primera palabra, no bajo la vinieta. */
      .incluye-item {
        position:relative; padding-left:5mm; margin-bottom:1.7mm;
        font-size: var(--texto); line-height:1.55; color:#2A2A2A; text-align:justify;
      }
      .incluye-item:last-child { margin-bottom:0; }
      .incluye-item::before { content:"–"; position:absolute; left:1.2mm; color:#6B6B6B; }
      .content-block { margin-bottom:5mm; }

      .photo-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin:0 0 5mm; }
      .photo-grid.single { grid-template-columns:1fr; }
      .photo-card { border:1px solid #DDD; border-radius:6px; overflow:hidden; background:#fff; }
      /* La foto entra ENTERA en su recuadro, no recortada.
         Estaba con object-fit cover, que llena el hueco a base de cortar lo
         que sobresale: en una foto de obra se nota poco, pero en un plano
         -que es lo que se adjunta en estas propuestas- se comia el cajetin,
         las cotas y media leyenda. Con contain se ve completo; lo que sobra
         a los lados queda en blanco, que en una hoja impresa ni se nota. La
         altura sigue fija para que las dos columnas queden alineadas. */
      .photo { display:block; width:100%; height:62mm; object-fit:contain; object-position:center; background:#ffffff; }
      .photo-grid.single .photo { height:100mm; }
      .proposal-3-photo { height:52mm; object-fit:contain; object-position:center; background:#ffffff; }
      .photo-caption { padding:5px 8px 6px; text-align:center; font-size: var(--texto); letter-spacing:.04em; text-transform:uppercase; color:#777; border-top:1px solid #EEE; }

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
      .table td { border-bottom:1px solid #DDD; padding:8px 10px; vertical-align:middle; color:#1E1E1E; }
      .table .sub-row td { font-weight:600; }
      .table .soft-row td { color:#666; font-size: var(--texto); border-bottom:1px solid #EEE; padding:6px 10px; }
      .table .grand-total td { border-top:2px solid #1E1E1E; border-bottom:none; padding-top:12px; }
      .total-label { font-size: var(--texto); font-weight:700; letter-spacing:.06em; text-transform:uppercase; }
      .total-amount { font-size: var(--titulo); color:#8A1518; font-weight:700; }
      .row-num { color:#777; font-size: var(--texto); }

      .t-center { text-align:center; }
      .t-right { text-align:right; }
      .t-left { text-align:left; }
      .strong { font-weight:600; }

      .ficha-row { display:grid; grid-template-columns:42mm 34mm 1fr; gap:7mm; padding:4.5mm 0; border-top:1px solid #DDD; align-items:center; }
      .ficha-row:last-of-type { border-bottom:1px solid #DDD; }
      .ficha-name { font-size: var(--titulo); font-weight:600; font-family:'Source Serif 4', Georgia, serif; }
      .ficha-img { width:100%; height:26mm; object-fit:contain; }
      .ficha-img.tall { height:32mm; }
      .ficha-desc { font-size: var(--texto); line-height:1.6; color:#333; }
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
      .meta-strong { font-size: var(--texto); font-weight:600; margin-top:1.6mm;
        text-transform:uppercase; }

      .sst-block { margin:6mm 0; padding-top:4mm; border-top:2px solid #1E1E1E; }
      .sst-title { font-size: var(--texto); letter-spacing:.08em; text-transform:uppercase; font-weight:700; margin-bottom:2.6mm; }
      .sst-block p { font-size: var(--texto); line-height:1.7; margin:0; }

      .signature { display:grid; grid-template-columns:1fr 1fr; gap:12mm; padding-top:5mm; border-top:1px solid #DDD; }
      .steps-list { margin:0; padding-left:17px; font-size: var(--texto); line-height:1.8; color:#2A2A2A; }
      .contact-box { margin-top:5mm; padding:4mm 5mm; background:#F4F4F2; border:1px solid #DDD; }
      .contact-line { font-size: var(--texto); line-height:1.6; }
      .sig-space { height:14mm; border-bottom:1px solid #1E1E1E; margin-bottom:3mm; display:flex; align-items:flex-end; }
      .sig-img { max-height:13mm; max-width:60mm; object-fit:contain; }
      .sig-name { font-size: var(--titulo); font-weight:600; font-family:'Source Serif 4', Georgia, serif; }
      .sig-role { font-size: var(--texto); color:#333; margin-top:.6mm; }
      .sig-meta { font-size: var(--texto); color:#666; margin-top:2mm; line-height:1.65; }
      .thanks-row { margin-top:8mm; padding-top:4mm; border-top:1px solid #DDD; text-align:right; font-size: var(--texto); letter-spacing:.08em; text-transform:uppercase; color:#777; }

      .appendix-img { width:100%; height:auto; max-height:235mm; object-fit:contain; display:block; margin:0 auto; }
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
    ${showVerticalAppendix ? `
      <section class="page">
        <div class="page-inner">
          ${headerHtml}
          <div class="page-content">
            <h3 class="doc-h3">Sistema certificado para escalera fija</h3>
            <img src="${articoLineaVidaVertical}" alt="Sistema de linea de vida vertical Artico Safe Work" class="appendix-img" />
          </div>
          ${footerHtml}
        </div>
      </section>
    ` : ""}
    ${showTechnicalPage ? renderTechnicalPage() : ""}
    ${mostrarResumenFinal ? "" : renderResumenPropuestas()}
    ${closingSections}
    <script>
      async function waitForImages(){
        const images = Array.from(document.images || []);
        await Promise.all(images.map((img)=>{
          if(img.complete) return Promise.resolve();
          return new Promise((resolve)=>{
            img.onload = resolve;
            img.onerror = resolve;
          });
        }));
      }
      window.addEventListener('load', async ()=>{ await waitForImages(); });
    </script>
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
