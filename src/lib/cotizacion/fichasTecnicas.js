// Fichas tecnicas de la cotizacion: las laminas de los sistemas de Artico
// (escalera tipo gato, linea de vida vertical) y la hoja de componentes de
// la linea de vida horizontal. Salieron de cotizacionPrint.js tal cual: el
// texto de las plantillas es el mismo, espacios incluidos, y las pruebas de
// plantillas (plantillas.test.js) lo comparan letra por letra.

import { escapeHtml } from "../html";

// Las fotos de la ficha tecnica van como archivos aparte, no metidas en el
// codigo: asi eran 1,3 MB de texto que se descargaban al abrir Cotizaciones
// aunque nadie fuera a imprimir. El navegador las pide solo cuando el
// documento las muestra, y las guarda en cache.
import urlArticoLineaVidaVertical from "../../assets/artico-linea-vida-vertical.jpg";
import urlArticoEscaleraGato from "../../assets/artico-escalera-gato.jpg";
import urlSoporte from "../../assets/componentes/soporte-intermedio-cubierta-cable.jpg";
import urlTensor from "../../assets/componentes/tensor.jpg";
import urlEmpalmes from "../../assets/componentes/empalmes-guardacables.jpg";
import urlCable from "../../assets/componentes/cable-acero.jpg";
import urlLineaCamionera from "../../assets/linea-vida-camionera.jpg";
import urlPuntoAnclaje from "../../assets/punto-anclaje-default.jpg";

// Direccion completa: el documento se abre en una pestaña nueva o dentro de
// un marco, y ahi una ruta como «/assets/…» podria no resolverse contra el
// sitio.
const absoluta = (url) => {
  try { return new URL(url, window.location.href).href; } catch { return url; }
};
const articoLineaVidaVertical = absoluta(urlArticoLineaVidaVertical);
const articoEscaleraGato = absoluta(urlArticoEscaleraGato);
const IMG_SOPORTE = absoluta(urlSoporte);
const IMG_TENSOR = absoluta(urlTensor);
const IMG_EMPALMES = absoluta(urlEmpalmes);
const IMG_CABLE = absoluta(urlCable);
const lineaCamionera = absoluta(urlLineaCamionera);
const puntoAnclaje = absoluta(urlPuntoAnclaje);

// Ficha de un sistema. Recibe el encabezado y el pie de la cotizacion.
export function crearFichaSistema({ headerHtml, footerHtml }) {
  // Ficha de un sistema: el dibujo a la izquierda y las caracteristicas a
  // la derecha, como texto del documento.
  //
  // Antes era la lamina del catalogo del proveedor metida entera como
  // imagen: el logotipo de Artico impreso en la cotizacion, los textos
  // incrustados en el JPEG con otra tipografia y recuadros con linea guia.
  // `recorte` deja a la vista solo el objeto; el resto se escribe aqui.
  // `llamadas` son las que señalan una pieza concreta: van a la altura a la
  // que esa pieza aparece en el dibujo, con una linea fina hasta ella, como
  // en una ficha tecnica. `notas` es lo que no apunta a ninguna pieza en
  // particular -normativa, material- y va debajo.
  // Convierte un recorte en una ampliacion que lo haga llenar su caja.
  //
  // Con `clip-path` solo, el dibujo salia diminuto: recorta lo que se ve,
  // pero el elemento sigue ocupando el ancho de la imagen ENTERA. Como la
  // columna mide 90mm y del ancho original solo se conserva unos 31, el
  // objeto quedaba en 28mm de ancho, y agrandar la caja no servia de nada
  // porque lo que manda es el ancho de la imagen completa.
  //
  // Aqui se amplia la imagen hasta que el trozo conservado llena el alto de
  // la caja, y se desplaza para centrar ese trozo. La caja recorta lo que
  // sobra. Vale para dibujos altos y estrechos, que es lo que hay; uno
  // apaisado habria que ajustarlo por ancho.
  const ampliarRecorte = (recorte) => {
    const [arr, der, aba, izq] = recorte.split(/\s+/).map(parseFloat);
    const altoConservado = (100 - arr - aba) / 100;
    const escala = 1 / altoConservado;
    // Centro del trozo conservado, en fraccion de la imagen.
    const cx = (izq / 100 + (100 - der) / 100) / 2;
    const cy = (arr / 100 + (100 - aba) / 100) / 2;
    // El desplazamiento va DESPUES de escalar -por eso scale() primero-,
    // asi que los porcentajes son del tamaño sin escalar.
    return `scale(${escala.toFixed(4)}) translate(${((0.5 - cx) * 100).toFixed(2)}%, ${((0.5 - cy) * 100).toFixed(2)}%)`;
  };

  const fichaSistema = ({ titulo, imagen, alt, recorte, llamadas = [], notas = [], ancha = false }) => `
    <section class="page appendix-page">
      <div class="page-inner">
        ${headerHtml}
        <div class="page-content">
          <h3 class="doc-h3">${escapeHtml(titulo)}</h3>
          <div class="ficha-sistema${ancha ? " ficha-sistema--ancha" : ""}">
            <div class="ficha-sistema-img">
              <!-- Los dos hacen falta: clip-path quita lo que sobra -el
                   logotipo del proveedor y sus recuadros de texto-, y el
                   transform amplia lo que queda. Solo con el transform, la
                   caja es mas ancha que el recorte y vuelven a asomar los
                   recuadros por los lados. -->
              <img
                src="${imagen}"
                alt="${escapeHtml(alt)}"
                style="clip-path: inset(${recorte}); transform: ${ampliarRecorte(recorte)};"
              />
            </div>
            ${llamadas.length ? `
              <div class="ficha-llamadas">
                ${llamadas.map(([alto, k, v]) => `
                  <div class="ficha-llamada" style="top:${alto};">
                    <span class="ficha-llamada-guia"></span>
                    <div class="ficha-llamada-texto">
                      <b>${escapeHtml(k)}</b>
                      <span>${escapeHtml(v)}</span>
                    </div>
                  </div>
                `).join("")}
              </div>
            ` : `
              <dl class="ficha-sistema-datos">
                ${notas.map(([k, v]) => `
                  <dt>${escapeHtml(k)}</dt>
                  <dd>${escapeHtml(v)}</dd>
                `).join("")}
              </dl>
            `}
          </div>
          ${llamadas.length && notas.length ? `
            <dl class="ficha-sistema-datos ficha-sistema-datos--pie">
              ${notas.map(([k, v]) => `
                <dt>${escapeHtml(k)}</dt>
                <dd>${escapeHtml(v)}</dd>
              `).join("")}
            </dl>
          ` : ""}
        </div>
        ${footerHtml}
      </div>
    </section>
  `;
  return fichaSistema;
}

export const FICHA_ESCALERA_GATO = {
  titulo: "Sistema de escalera fija tipo gato",
  imagen: articoEscaleraGato,
  alt: "Escalera fija tipo gato en tubería redonda",
  // Recorte: la lamina original traia el logotipo del proveedor arriba
  // a la izquierda y los textos dentro del propio JPEG. Se deja solo la
  // escalera y lo demas se escribe aqui abajo como texto del documento.
  recorte: "4% 12% 2% 52%",
  notas: [
    ["Normatividad",
      "Cumple la Resolución 4272 de 2021 del Ministerio del Trabajo de Colombia y la norma EN 795:2012, aplicables a los sistemas de acceso y a los dispositivos de anclaje para trabajo en alturas."],
    ["Largueros",
      "Tubería redonda de 2″ de diámetro, que es el elemento que recibe la carga y la transmite a los soportes de fijación a la estructura."],
    ["Peldaños",
      "Tubería redonda de 1 ½″ de diámetro, instalados cada 30 cm y con un ancho útil de 40 cm, de acuerdo con la norma existente."],
    ["Material",
      "Acero estructural 1040 en toda la escalera, con acabado y protección definidos según el ambiente de instalación."],
  ],
};

export const FICHA_LINEA_VIDA_VERTICAL = {
  titulo: "Escalera fija con línea de vida vertical",
  imagen: articoLineaVidaVertical,
  alt: "Sistema de línea de vida vertical sobre escalera fija",
  recorte: "3% 32% 2% 37%",
  // El alto de cada llamada es la posicion de esa pieza DENTRO del
  // recorte, porque el recorte ampliado llena la caja de arriba abajo.
  // Comprobado contra las flechas del render original: 14 y 33 caen en
  // el absorbedor y en el cable, y por la misma proporcion el tensor
  // queda en 84. Si se reajusta el recorte hay que repasarlos.
  // El titulo va corto -una sola linea- y el detalle completo en el
  // cuerpo. Con el titulo largo ocupaba dos lineas y las dos primeras
  // llamadas acababan montandose una sobre otra.
  llamadas: [
    ["14%", "Soporte superior",
      "Con absorbedor de energía. Fija el extremo alto de la línea de vida a la estructura. El absorbedor se despliega ante una caída y disipa parte de la energía del impacto, de modo que la fuerza que llega al trabajador y a la estructura se mantiene dentro de los valores admisibles."],
    // El cable recorre toda la escalera, asi que su llamada no tiene
    // una altura unica: se baja al 45% para separarla de la de arriba.
    // A 33% los dos bloques de texto se montaban 1mm.
    ["45%", "Cable de acero",
      "Con alma de acero, SAE 316. Es el elemento por el que se desplaza el trabajador mientras sube o baja. El alma de acero reduce el alargamiento bajo carga, y la calidad SAE 316 le aporta resistencia a la corrosión, por lo que admite instalación a la intemperie y en ambientes agresivos."],
    ["84%", "Soporte inferior y tensor",
      "Ancla el extremo bajo del cable y permite regular su tensión. Mantener la tensión correcta evita holguras que alargarían el recorrido de caída, y es el punto donde el sistema se reajusta en cada inspección periódica."],
  ],
  notas: [
    ["Normatividad",
      "Cumple la Resolución 4272 de 2021 del Ministerio del Trabajo de Colombia y la norma EN 795:2012, aplicables a los dispositivos de anclaje para protección contra caídas en trabajo en alturas."],
    ["Estructura de la escalera",
      "Largueros en tubería redonda de 2″ y peldaños en tubería redonda de 1 ½″. Los peldaños se instalan cada 30 cm y con un ancho de 40 cm, conforme a la norma. Fabricada en acero estructural 1040."],
  ],
};

// Linea de vida camionera (aerea, sobre carrotanques y volquetas). La
// ilustracion ya trae sus piezas rotuladas, asi que va entera -sin recorte- y
// a la derecha lo que no se ve en el dibujo: normativa, diseño y conexion.
export const FICHA_LINEA_CAMIONERA = {
  titulo: "Sistema de línea de vida camionera",
  imagen: lineaCamionera,
  alt: "Línea de vida camionera aérea sobre un carrotanque",
  recorte: "0% 0% 0% 0%",
  // El dibujo es casi cuadrado: en la columna estrecha de las otras fichas
  // se le cortaban los lados.
  ancha: true,
  notas: [
    ["Normatividad",
      "Se diseña e instala conforme a la Resolución 4272 de 2021 del Ministerio del Trabajo de Colombia. El diseño de la línea horizontal sigue la norma ANSI/ASSP Z359.6, los postes y su cimentación la NSR-10, y las distancias a redes eléctricas el RETIE."],
    ["Postes",
      "Tipo cuello de cisne en tubo de acero con riostra, sobre pedestal y dado de cimentación en concreto, con platina y pernos de anclaje. Se calculan para la carga de detención de una caída."],
    ["Línea de vida",
      "Cable de acero galvanizado tensionado entre los postes, por encima del vehículo, con absorbedor de energía y tensor en los extremos."],
    ["Conexión del trabajador",
      "Arnés de cuerpo completo con conexión dorsal y línea autorretráctil unida a un carro que se desliza por el cable, de modo que la persona va conectada en todo momento a lo largo del vehículo."],
    ["Diseño",
      "La altura del cable y la luz entre postes se definen en la memoria de cálculo, según el vehículo y la distancia de detención. El sistema lo diseña y certifica una persona calificada."],
  ],
};

// El punto de anclaje se cotiza en dos materiales -acero galvanizado y acero
// inoxidable- y cada uno es su propia ficha: cambian el acabado, el ambiente
// en el que se instala y la tornilleria. Es una funcion y no dos constantes
// porque tres de las cinco notas son las mismas en ambos materiales; escritas
// dos veces, al corregir una se queda la otra sin corregir. La hoja de
// componentes hace lo mismo con renderSingleTechnicalSheet(material).
export const MATERIALES_PUNTO_ANCLAJE = ["galvanizado", "inoxidable"];

const FOTO_PUNTO_ANCLAJE = {
  galvanizado: puntoAnclaje,
  inoxidable: puntoAnclaje,
};

export function fichaPuntoAnclaje(material = "galvanizado") {
  const esInox = material === "inoxidable";
  const acero = esInox ? "acero inoxidable" : "acero galvanizado";

  return {
    titulo: `Punto de anclaje certificado en ${acero}`,
    imagen: FOTO_PUNTO_ANCLAJE[esInox ? "inoxidable" : "galvanizado"],
    alt: `Punto de anclaje certificado en ${acero}`,
    recorte: "0% 0% 0% 0%",
    ancha: true,
    notas: [
      ["Normatividad",
        "Cumple la Resolución 4272 de 2021 del Ministerio del Trabajo de Colombia y la norma EN 795:2012, aplicable a los dispositivos de anclaje para protección contra caídas en trabajo en alturas."],
      ["Material", esInox
        ? "Platina y argolla en acero inoxidable, sin recubrimiento: la resistencia a la corrosión es del material mismo y no se pierde con un golpe o un corte en obra. Es el que se instala en ambiente agresivo: zona costera o con salinidad, planta de alimentos o de proceso químico, y sitios donde se lava con químicos."
        : "Platina y argolla en acero estructural con galvanizado en caliente por inmersión. El recubrimiento de zinc protege la pieza en cubiertas, fachadas y estructuras a la intemperie en ambiente normal; es el acabado corriente del punto de anclaje."],
      ["Resistencia",
        "Resiste una fuerza de detención de caída superior a 5.000 lb (2.268 kg) por cada persona asegurada."],
      ["Instalación", esInox
        ? "Se ancla a la estructura en concreto con epóxico químico y perno de 5/8″ a una profundidad de 12 cm o más según el caso; en estructura metálica va soldado. La tornillería es del mismo acero inoxidable: mezclarla con acero común forma un par galvánico que corroe la unión."
        : "Se ancla a la estructura en concreto con epóxico químico y perno de 5/8″ a una profundidad de 12 cm o más según el caso; en estructura metálica va soldado."],
      ["Conexión del trabajador",
        "Es el punto donde el trabajador conecta su eslinga con absorbedor de energía o su línea autorretráctil. Cada punto atiende a una sola persona a la vez."],
    ],
  };
}

// Hoja de componentes de la linea de vida horizontal, una por material
// (galvanizado o inoxidable) segun lo que se cotiza.
export function paginasComponentes({ c, textos, textoInicial, propuestas, hasLifelineItem, headerHtml, footerHtml }) {
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
      const propuestasConLinea = propuestas.filter(p => {
        const items = Array.isArray(p?.items) ? p.items : (Array.isArray(p?.quote?.items) ? p.quote.items : []);
        return items.some(it => hasLifelineItem(it?.desc || it?.descripcion || it?.nombre));
      });
      const targetPropuestas = propuestasConLinea.length > 0 ? propuestasConLinea : propuestas;
      targetPropuestas.forEach(p => {
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

  return renderTechnicalPage();
}
