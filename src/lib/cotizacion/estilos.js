// Estilos de la plantilla de cotizacion (cotizacionPrint.js). Van aparte
// porque eran mas de 500 lineas en medio del armado del documento. El texto
// es el mismo de siempre, espacios incluidos: las pruebas de plantillas
// (plantillas.test.js) comparan el HTML resultante letra por letra.

import { FUENTE } from "../../styles/designTokens";

export const CSS_COTIZACION = `
      /* Estilo Apple: la misma letra del programa (Inter) y solo dos tonos de
         texto, el casi negro y el gris de Apple. Las lineas son grises y
         finas; nada va en rojo ni en bloques oscuros. */
      :root {
        --texto: 11.5px; --titulo: 17px;
        --letra: ${FUENTE};
        --tinta: #1d1d1f;
        --gris: #6e6e73;
        --linea: #d2d2d7;
        --linea-suave: #e8e8ed;
        --fondo-suave: #f5f5f7;
        /* Un punto mas oscuro que el fondo suave: en papel el #f5f5f7 casi
           no se ve, y la fila resaltada tiene que notarse. */
        --fondo-resalte: #e8e8ed;
      }
      body { font-family:var(--letra); color:var(--tinta); -webkit-font-smoothing:antialiased; }

      /* El relleno interno de 9mm desaparecio: ahora el margen lo pone
         @page. Antes se sumaban los dos -margen cero de hoja mas 9mm aqui-
         y el resultado solo cuadraba si quien imprimia escogia «sin
         margenes» en el cuadro de Chrome. */
      .page-inner { position:relative; width:100%; display:flex; flex-direction:column; flex:1 1 auto; }
      .page-content { display:block; flex:1 1 auto; }

      /* Bloques fluidos de las hojas interiores: evitan hojas casi vacias
         juntando saludo, tabla y cierre cuando caben, manteniendo un aire
         uniforme entre secciones sin sumar margenes arriba de la hoja. */
      .flow-block { display:block; }
      .flow-block + .flow-block { margin-top:6mm; }
      .flow-block:first-child > .doc-h3.con-espacio { margin-top:0; }
      .flow-block:first-child > .sst-block,
      .flow-block:first-child > .signature { border-top:none; padding-top:0; }
      .flow-block > .conditions-block,
      .flow-block > .incluye-block,
      .flow-block > .sst-block { margin-top:0; margin-bottom:0; }
      .flow-block > .price-table { margin-top:0; margin-bottom:0; }
      .flow-block > .content-block:last-child { margin-bottom:0; }
      .flow-block > p:last-child,
      .flow-block > .doc-copy:last-child { margin-bottom:0; }

      h1, h2, h3 { margin:0; font-family:var(--letra); font-weight:700; color:var(--tinta); text-wrap:balance; }
      p { margin:0 0 3mm; font-size: var(--texto); line-height:1.6;
          text-align: justify; text-justify: inter-word; hyphens: auto; color:var(--tinta); }

      .header { display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid var(--tinta); padding-bottom:2.6mm; margin:0 0 6mm; }
      .logo { height:30px; width:auto; object-fit:contain; }
      .header-right { font-size: var(--texto); letter-spacing:.06em; text-transform:uppercase; color:var(--tinta); font-weight:700; text-align:right; }
      /* El codigo del formato: mas pequeno y en monoespaciada, para que se
         lea como un codigo y no compita con el numero de la cotizacion. */
      .header-sello { font-family:var(--letra); font-variant-numeric:tabular-nums; font-size:calc(var(--texto) * .92); letter-spacing:.02em; text-transform:none; color:var(--tinta); font-weight:400; margin-top:2px; }
      .header-sello b { color:var(--tinta); font-weight:700; }

      /* Pie de pagina: una linea fina que termina en el numero de hoja, y
         debajo tres columnas -sede, telefonos, contacto-, cada una con su
         etiqueta pequeña, el dato principal en negro y el secundario en gris.
         Sin recuadro ni iconos: la tarjeta de antes media 19 mm y competia
         con el contenido; este mide 16, con la letra del tamaño del texto.
         Se apoya en el fondo del bloque de la hoja (margin-top:auto) en vez
         de ir anclado con position:absolute contra una hoja de 11 pulgadas
         clavadas: sigue abajo, pero si el contenido crece lo empuja en lugar
         de quedar encima del texto. */
      .footer {
        margin-top:auto;
        display:block;
        break-inside:avoid;
        page-break-inside:avoid;
      }
      .footer-linea { display:flex; align-items:center; gap:3mm; }
      /* La linea es un elemento y no un fondo ni un ::before: asi llega
         hasta donde empieza el numero de hoja, mida este lo que mida. */
      .footer-regla {
        flex:1 1 auto; height:1.5px;
        background:linear-gradient(90deg, #E0342A 0%, #B91C1C 26%, #d2d2d7 26%, #d2d2d7 100%);
        -webkit-print-color-adjust:exact; print-color-adjust:exact;
      }
      .footer-pagina { white-space:nowrap; font-size:10.5px; font-weight:500; color:var(--gris); line-height:1; }
      .footer-cols { display:grid; grid-template-columns:1fr 1fr 1fr; padding-top:2.2mm; line-height:1.4; }
      .footer-col--centro { text-align:center; border-left:.5pt solid var(--linea-suave); border-right:.5pt solid var(--linea-suave); }
      .footer-col--derecha { text-align:right; }
      .footer-label { font-size:9px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:#B91C1C; }
      .footer-main { font-size:12.5px; font-weight:600; color:var(--tinta); }
      .footer-sub { font-size:11.5px; font-weight:400; color:var(--gris); }

      .eyebrow { font-size: var(--texto); letter-spacing:.09em; text-transform:uppercase; color:var(--tinta); font-weight:700; text-align:center; margin:0 0 6mm; padding-bottom:3mm; border-bottom:2px solid var(--tinta); }
      .eyebrow-gap { margin-top:9mm; }
      .card-label { font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; color:var(--tinta); font-weight:700; }
      .block-label { margin-bottom:2.6mm; }
      .centered { text-align:center; }
      .tnum { font-variant-numeric:tabular-nums; }
      .accent { color:#8A1518; }

      .doc-h2 { font-size: var(--titulo); line-height:1.3; text-align:center; margin:0 auto 5mm; max-width:170mm; color:var(--tinta); font-family:var(--letra); font-weight:700; }
      .doc-h3.con-espacio { margin-top:12mm; }
      .doc-h3 { font-size: var(--titulo); text-align:center; margin:0 0 4.5mm; color:var(--tinta); font-family:var(--letra); font-weight:700; }
      .doc-copy.junto { margin-bottom:0; color:var(--tinta); }
      .doc-copy { font-size: var(--texto); line-height:1.65; color:var(--tinta); max-width:160mm; margin:0 auto 3mm;
                  text-align: justify; text-justify: inter-word; hyphens: auto; }
      .doc-copy strong { color:var(--tinta) !important; font-weight:800; }

      .cover {
        padding-top: 8mm;
        font-family: var(--letra);
      }
      .cover-header { display:flex; justify-content:center; padding-bottom:5mm; border-bottom:2px solid var(--tinta); }
      .cover-logo { height:44px; width:auto; }
      .cover-firm { text-align:center; margin-top:7mm; font-family:var(--letra); }
      .cover-firm-name { font-size:18px; font-weight:800; color:var(--tinta); letter-spacing:.06em; margin-bottom:2.2mm; font-family:var(--letra); text-transform:uppercase; }
      .cover-firm-nit { font-size:13px; font-weight:700; color:var(--tinta); margin-bottom:2.2mm; font-family:var(--letra); }
      .cover-firm-nit span { background:#ffffff; border:1.5px solid var(--tinta); padding:2px 14px; border-radius:6px; letter-spacing:.04em; color:var(--tinta); font-weight:700; }
      .cover-firm-contact { font-size:13px; color:var(--tinta); font-weight:600; letter-spacing:.01em; font-family:var(--letra); }
      /* 1. Bloque Cliente: con aire generoso arriba y bajo "COTIZACIÓN PREPARADA PARA" */
      .cover-client { margin-top:18mm; text-align:center; font-family:var(--letra); }
      .cover-client .meta-label { font-size:10px; letter-spacing:.14em; text-transform:uppercase; color:var(--tinta); font-weight:700; margin-bottom:4.5mm; font-family:var(--letra); }
      .cover-client-name { font-size:18px; font-weight:800; margin:0 0 2.5mm; font-family:var(--letra); color:var(--tinta); text-transform:uppercase; letter-spacing:.02em; line-height:1.3; }
      .cover-client-nit { font-size:13px; font-weight:700; color:var(--tinta); margin-top:0; margin-bottom:5.5mm; font-family:var(--letra); letter-spacing:.02em; }
      .cover-client-grid { display:inline-grid; grid-template-columns:repeat(2,auto); gap:4.5mm 16mm; text-align:left; font-family:var(--letra); }
      .ccg-k { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--tinta); margin-bottom:1.2mm; font-weight:700; font-family:var(--letra); }
      .ccg-v { font-size:13px; font-weight:700; color:var(--tinta); line-height:1.35; text-transform:uppercase; font-family:var(--letra); }
      /* 2. Bloque Propuesta Comercial: con separación clara y aire bajo "PROPUESTA COMERCIAL" */
      .cover-title { margin-top:20mm; text-align:center; font-family:var(--letra); }
      .cover-kicker { font-size:10px; letter-spacing:.18em; text-transform:uppercase; color:var(--tinta); margin-bottom:5mm; font-weight:700; font-family:var(--letra); }
      .cover-title h1 { font-size:18px; line-height:1.4; font-family:var(--letra);
        text-align:center; text-transform:uppercase; font-weight:800; color:var(--tinta);
        max-width:155mm; margin-left:auto; margin-right:auto; letter-spacing:.02em; }
      .meta-strip { margin-top:16mm; display:grid; grid-template-columns:repeat(4,1fr); border-top:1.5px solid var(--tinta); border-bottom:1.5px solid var(--tinta); padding:6.5mm 0; font-family:var(--letra); }
      .meta-cell { padding:0 3.5mm; border-right:1px solid #DDD; text-align:center; }
      .meta-cell.last { border-right:none; }
      .meta-label { font-size:10px; letter-spacing:.08em; text-transform:uppercase; color:var(--tinta); margin-bottom:2.5mm; font-weight:700; font-family:var(--letra); }
      .meta-value { font-size:13px; font-weight:700; color:var(--tinta); text-transform:uppercase; font-family:var(--letra); }
      .meta-value.accent { color:var(--tinta); font-weight:800; }
      /* 3. Pie de portada: expandido hacia abajo para balancear el folio carta */
      .cover-foot { margin-top:20mm; padding-top:4mm; border-top:1px solid #DDD; display:flex; justify-content:space-between; align-items:center; gap:6mm; font-size:10px; color:var(--tinta); font-family:var(--letra); font-weight:700; letter-spacing:.03em; }
      .cover-sello { font-family:var(--letra); font-size:10px; color:var(--tinta); white-space:nowrap; font-weight:700; }
      .cover-sello b { color:var(--tinta); font-weight:800; }

      .def-list { border-top:1px solid #DDD; max-width:170mm; margin:0 auto; }
      .def-row { display:grid; grid-template-columns:44mm 1fr; gap:7mm; padding:4.5mm 0; border-bottom:1px solid #DDD; }
      .def-term { font-size: var(--titulo); font-weight:700; font-family:var(--letra); color:var(--tinta); }
      .def-body { font-size: var(--texto); line-height:1.65; color:var(--tinta); }
      .def-body p { font-size: var(--texto); margin:0 0 2.5mm; color:var(--tinta); }
      .def-bullets { margin:0; padding-left:16px; font-size: var(--texto); line-height:1.65; color:var(--tinta); }
      .def-bullets li { margin-bottom:1.2mm; }
      .bullet-list { margin:1.5mm 0 0 0; padding-left:18px; font-size: var(--texto); line-height:1.5; color:var(--tinta); }
      .bullet-list li { margin-bottom:1.3mm; }
      .section-title { font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; color:var(--tinta); font-weight:700; margin-bottom:2.6mm; }
      .subheading { font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; color:var(--tinta); font-weight:700; margin-bottom:2.6mm; }

      .incluye-block { margin:6mm 0 0; }
      .incluye-list { border-top:1px solid #DDD; padding-top:3.5mm; }
      /* Sangria francesa: el guion cuelga fuera y los renglones siguientes
         quedan alineados bajo la primera palabra, no bajo la vinieta. */
      .incluye-item {
        position:relative; padding-left:5mm; margin-bottom:1.7mm;
        font-size: var(--texto); line-height:1.55; color:var(--tinta); text-align:justify;
      }
      .incluye-item:last-child { margin-bottom:0; }
      .incluye-item::before { content:"–"; position:absolute; left:1.2mm; color:var(--tinta); font-weight:700; }
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
      .photo-caption { padding:5px 8px 6px; text-align:center; font-size: var(--texto); letter-spacing:.04em; text-transform:uppercase; color:var(--tinta); border-top:1px solid #E2E8F0; background:#FAFAFA; font-weight:700; }

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

      .price-table { margin-top:2mm; margin-bottom:8mm; }
      .table { width:100%; border-collapse:collapse; font-size: var(--texto); }
      .table th { background:#1E1E1E; color:#fff; padding:8px 10px; font-size: var(--texto); letter-spacing:.07em; text-transform:uppercase; font-weight:600; text-align:center; border:none; }
      .table th.t-left { text-align:left; }
      .table th.t-right { text-align:right; }
      .table td { border-bottom:1px solid #DDD; padding:8px 10px; vertical-align:middle; color:var(--tinta); }
      .table .sub-row td { font-weight:700; color:var(--tinta); }
      .table .soft-row td { color:var(--tinta); font-size: var(--texto); border-bottom:1px solid #EEE; padding:6px 10px; }
      .table .grand-total td { border-top:2px solid #1E1E1E; border-bottom:none; padding-top:12px; }
      .total-label { font-size: var(--texto); font-weight:700; letter-spacing:.06em; text-transform:uppercase; color:var(--tinta); }
      .total-amount { font-size: var(--titulo); color:#8A1518; font-weight:700; }
      .row-num { color:var(--tinta); font-size: var(--texto); }

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
        font-family: var(--letra);
        color: var(--tinta);
        line-height: 1.2;
      }
      .ficha-card-tag {
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .04em;
        text-transform: uppercase;
        color: var(--tinta);
        background: #F8FAFC;
        border: 1px solid #CBD5E1;
        padding: 1px 5px;
        border-radius: 4px;
        white-space: nowrap;
      }
      .ficha-card-img-box {
        width: 100%;
        /* 58mm: con 66 las cuatro tarjetas llegaban hasta el pie sin dejar aire. */
        height: 58mm;
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
        color: var(--tinta);
        text-align: justify;
        text-justify: inter-word;
        hyphens: auto;
      }
      .ficha-card-desc strong {
        color: var(--tinta);
      }
      .ficha-card-desc .split {
        margin-bottom: 1.5mm;
        padding-bottom: 1.5mm;
        border-bottom: 1px dashed #E2E8F0;
      }

      .ficha-row { display:grid; grid-template-columns:42mm 38mm 1fr; gap:6mm; padding:4.5mm 0; border-top:1px solid #DDD; align-items:center; }
      .ficha-row:last-of-type { border-bottom:1px solid #DDD; }
      .ficha-name { font-size: var(--titulo); font-weight:700; font-family:var(--letra); color:var(--tinta); }
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
      .ficha-desc { font-size: var(--texto); line-height:1.6; color:var(--tinta); }
      .ficha-desc .split { margin-bottom:2.5mm; padding-bottom:2.5mm; border-bottom:1px dashed #DDD; }

      .conditions-block { margin:7mm 0 0; }
      .conditions-grid { display:grid; grid-template-columns:1fr 1fr; border-top:1px solid #DDD; }
      /* El cierre -condiciones, incluye, SST y firma- va apretado a proposito:
         con el aire de antes media unos 4 mm mas que una hoja y se partia en
         dos, dejando media hoja en blanco en cada una. */
      .meta-card { padding:3.4mm 6mm 3.4mm 0; border-bottom:1px solid #DDD; }
      .meta-card.pad-left { padding-left:6mm; padding-right:0; border-left:1px solid #EEE; }
      /* Los cuatro valores de las condiciones comerciales van en mayuscula.
         La forma de pago y el tiempo de ejecucion se escriben a mano y salian
         como los hubiera escrito cada quien; la validez y la certificacion
         venian del codigo en minuscula. Puestos aqui, los cuatro se ven
         iguales sin tener que acordarse al escribirlos. */
      .meta-strong { font-size: var(--texto); font-weight:700; margin-top:1.6mm;
        text-transform:uppercase; color:var(--tinta); }

      .sst-block { margin:6mm 0; padding-top:3.5mm; border-top:2px solid var(--tinta); }
      .sst-title { font-size: var(--texto); letter-spacing:.08em; text-transform:uppercase; font-weight:700; margin-bottom:2.6mm; color:var(--tinta); }
      .sst-block p { font-size: var(--texto); line-height:1.6; margin:0; color:var(--tinta); }

      .signature { display:grid; grid-template-columns:1fr 1.05fr; gap:10mm; padding-top:4mm; border-top:1px solid var(--tinta); }
      /* El numero de cada paso es texto y no la viñeta de la lista: en el
         PDF la viñeta salia montada sobre la primera letra («1Confirmar»). */
      .steps-list { margin:0; padding:0; list-style:none; font-size: var(--texto); line-height:1.65; color:var(--tinta); }
      .steps-list li { display:flex; gap:2mm; }
      .steps-list .paso-n { flex:0 0 auto; min-width:3.6mm; color:var(--gris); }
      .contact-box { margin-top:4mm; padding:3.2mm 5mm; background:#F8FAFC; border:1px solid #CBD5E1; color:var(--tinta); }
      .contact-line { font-size: var(--texto); line-height:1.6; color:var(--tinta); }
      .sig-space { height:14mm; border-bottom:1px solid var(--tinta); margin-bottom:3mm; display:flex; align-items:flex-end; }
      .sig-img { max-height:13mm; max-width:60mm; object-fit:contain; }
      .sig-name { font-size: 15px; font-weight:700; font-family:var(--letra); color:var(--tinta); white-space:nowrap; }
      .sig-role { font-size: var(--texto); color:var(--tinta); margin-top:.6mm; font-weight:600; }
      .sig-meta { font-size: var(--texto); color:var(--tinta); margin-top:2mm; line-height:1.65; }

      .appendix-page .page-content { padding: 0; box-sizing: border-box; }

      /* Ficha de sistema: dibujo a la izquierda, caracteristicas a la
         derecha. El recorte de la imagen se hace con clip-path, asi que el
         archivo original no se toca y se puede reajustar en una linea. */
      /* El dibujo no necesita media hoja: es alto y estrecho, y de su
         columna solo ocupa unos 40mm de ancho. Lo que sobra se le da al
         texto, que con descripciones detalladas lo agradece: con las dos
         columnas iguales, los bloques salian tan altos que las dos
         primeras llamadas se montaban una sobre otra. */
      .ficha-sistema {
        display: grid;
        grid-template-columns: 0.8fr 1.2fr;
        gap: 8mm;
        align-items: center;
        margin-top: 2mm;
      }
      /* El dibujo y la columna de llamadas miden EXACTAMENTE lo mismo, y
         por eso se fija el alto en las dos en vez de dejarlo al contenido:
         la altura de cada llamada es un porcentaje de su columna, asi que
         si una caja fuera mas alta que la otra las llamadas dejarian de
         caer sobre su pieza. */
      /* 164mm: medido. Con el pie de tres columnas y las notas de abajo en dos
         columnas, la ficha mas larga -la escalera con linea de vida- deja
         unos 6mm libres antes del pie. Subir este valor la monta sobre el
         pie; bajarlo acerca entre si las dos primeras llamadas hasta que
         se montan. */
      .ficha-sistema-img,
      .ficha-llamadas { height: 164mm; }
      /* Sin llamadas -la escalera tipo gato- no hay notas debajo: el dibujo
         puede ocupar casi todo el alto de la hoja. */
      .ficha-sistema--alta .ficha-sistema-img { height: 198mm; }
      .ficha-sistema-img {
        display: flex; align-items: center; justify-content: center;
        /* Recorta lo que la ampliacion saca de la caja. */
        overflow: hidden;
      }
      .ficha-sistema-img img {
        /* Se ajusta al alto de la caja ANTES de ampliar; la ampliacion la
           calcula ampliarRecorte() a partir del recorte. */
        height: 100%;
        width: auto;
        max-width: none;
        object-fit: contain;
      }
      /* Ficha «apilada»: la imagen arriba, a lo ancho, y las notas debajo en
         columnas (placa, punto de anclaje, camionera). Al lado del texto la
         imagen quedaba a media hoja de ancho y la mitad de abajo en blanco. */
      .ficha-apilada { display: flex; flex-direction: column; gap: 5mm; margin-top: 1.5mm; }
      .ficha-hero { margin: 0; text-align: center; }
      /* line-height 0: sin el, la caja mide unos pixeles mas que la imagen
         y los numeros -que van en porcentaje de la caja- caen corridos. */
      .ficha-hero-marco { position: relative; display: inline-block; max-width: 100%; line-height: 0; }
      .ficha-hero-marco img {
        display: block; width: auto; height: auto; max-width: 100%;
        border-radius: 2mm;
      }
      .ficha-hero figcaption {
        margin-top: 3mm;
        font-size: calc(var(--texto) * .9); line-height: 1.4; color: var(--gris);
      }
      /* La placa es clara: sobre el blanco de la hoja se perdia el borde.
         El panel gris la separa del fondo. */
      .ficha-hero--panel {
        background: var(--fondo-suave); border-radius: 12px; padding: 5mm 6mm 3.5mm;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .ficha-hero--panel .ficha-hero-marco img { border-radius: 0; }
      /* El numero que señala una casilla de la imagen y el mismo numero en
         la leyenda. Centrado con margenes negativos y no con transform:
         html2canvas -el PDF- lo coloca asi sin sorpresas. */
      .ficha-marca {
        position: absolute;
        width: 4.2mm; height: 4.2mm; margin: -2.1mm 0 0 -2.1mm;
        border-radius: 50%;
        background: #E0342A; color: #fff;
        font-size: 8.5px; font-weight: 700; line-height: 4.2mm; text-align: center;
        letter-spacing: 0;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .ficha-subtitulo {
        font-size: calc(var(--texto) * .92); font-weight: 500; color: var(--gris);
        margin-bottom: 3mm;
      }
      .ficha-leyenda { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 9mm; }
      .ficha-leyenda-item { display: flex; align-items: flex-start; gap: 2.6mm; }
      .ficha-leyenda-item .ficha-marca { position: static; flex: 0 0 4.2mm; margin: .3mm 0 0; }
      .ficha-leyenda-item b {
        display: block; font-size: var(--texto); font-weight: 600; color: var(--tinta); line-height: 1.4;
      }
      /* El interlineado va en la caja y no en el span: el alto del renglon
         lo pone la caja, y con el heredado cada renglon media 20px. */
      .ficha-leyenda-item > div { font-size: var(--texto); line-height: 1.45; color: var(--tinta); }
      /* Llamadas: cada una a la altura de la pieza que describe, con una
         linea fina que llega hasta el dibujo. */
      .ficha-llamadas { position: relative; }
      .ficha-llamada {
        position: absolute;
        left: 0; right: 0;
        display: flex;
        align-items: center;
        gap: 0;
        transform: translateY(-50%);
      }
      .ficha-llamada-guia {
        flex: 0 0 9mm;
        height: 1px;
        background: var(--tinta);
        opacity: .5;
      }
      .ficha-llamada-texto {
        padding-left: 2.5mm;
        line-height: 1.4;
      }
      .ficha-llamada-texto b {
        display: block;
        font-size: calc(var(--texto) * .92);
        font-weight: 700;
        letter-spacing: .05em;
        text-transform: uppercase;
        color: var(--tinta);
      }
      .ficha-llamada-texto span {
        font-size: var(--texto);
        color: var(--tinta);
      }

      /* Notas de la ficha -normativa, material, instalacion-: cada una en
         su caja, repartidas en una, dos o tres columnas. */
      .ficha-notas { margin: 0; display: grid; gap: 4mm 9mm; }
      .ficha-notas--1 { grid-template-columns: 1fr; gap: 5mm; }
      .ficha-notas--2 { grid-template-columns: 1fr 1fr; }
      .ficha-notas--3 { grid-template-columns: 1fr 1fr 1fr; gap: 4mm 7mm; }
      /* Debajo de la imagen, separadas por una linea. */
      .ficha-notas--linea { padding-top: 4mm; border-top: .5pt solid var(--linea); }
      .ficha-sistema + .ficha-notas--linea { margin-top: 4mm; }
      .ficha-nota dt { font-size: calc(var(--texto) * .92); }
      .ficha-nota dd {
        margin: 1.2mm 0 0;
        font-size: var(--texto);
        line-height: 1.55;
        color: var(--tinta);
      }
      .appendix-page .doc-h3 { margin: 0 0 2.5mm; }
      .appendix-img { width:auto; max-width:100%; height:auto; max-height:202mm; object-fit:contain; display:block; margin:0 auto; image-rendering: -webkit-optimize-contrast; image-rendering: auto; }
      .summary-spacing { margin-bottom:8mm; }
      .summary-page .page-content { padding-bottom:30mm; }

      .eyebrow, .doc-h2, .doc-h3, .photo-grid, .photo-card, .map-wrap,
      .price-table, .table, .table thead, .table tr,
      .def-row, .ficha-row, .meta-card, .conditions-grid,
      .sst-block, .signature, .content-block, .incluye-block { break-inside:avoid; page-break-inside:avoid; }

      /* Acabado estilo Apple. Va al final para afinar las reglas de arriba
         en un solo sitio: lineas finas en gris, etiquetas sin mayusculas
         sostenidas y en gris, pesos mas ligeros y titulos con el espaciado
         apretado de Apple. */
      body { color:var(--tinta); letter-spacing:-0.005em; }
      h1, h2, h3, .doc-h2, .doc-h3, .cover-title h1, .cover-client-name, .def-term,
      .ficha-name, .ficha-card-title, .sig-name { font-weight:600; letter-spacing:-0.02em; }
      .doc-copy strong { font-weight:600; }

      .header { border-bottom:.5pt solid var(--linea); }
      .header-right { text-transform:none; letter-spacing:0; font-weight:500; }
      .header-sello, .header-sello b { font-family:var(--letra); }

      .eyebrow { border-bottom:.5pt solid var(--linea); }
      .cover-header { border-bottom:.5pt solid var(--linea); }
      .cover-firm-name { font-weight:600; }
      .cover-firm-nit span { border:none; padding:0; }
      .cover-firm-nit, .cover-firm-contact, .cover-client-nit, .ccg-v, .meta-value { font-weight:400; }
      .cover-client-name { font-weight:600; }
      .cover-firm-nit span { font-weight:500; }
      /* El titulo es lo que se lee primero: grande, apretado y en tipo
         oracion, como los titulares de Apple. */
      .cover-title h1 { font-weight:600; font-size:28px; line-height:1.15; text-transform:none;
        letter-spacing:-0.03em; }
      /* El titulo crecio: se le quita aire arriba para que la portada siga
         cabiendo en una sola hoja. */
      .cover-title { margin-top:14mm; }
      .meta-strip { margin-top:12mm; }
      .meta-value.accent { font-weight:600; }
      .meta-strip { border-top:.5pt solid var(--linea); border-bottom:.5pt solid var(--linea); }
      .meta-cell { border-color:var(--linea-suave); }
      .cover-foot { border-color:var(--linea-suave); font-weight:400; }
      .cover-sello, .cover-sello b { font-weight:500; }

      .def-list, .def-row, .incluye-list, .conditions-grid, .meta-card, .meta-card.pad-left,
      .ficha-row, .ficha-row:last-of-type { border-color:var(--linea-suave); }
      .sst-block { border-top:.5pt solid var(--linea); }
      .signature, .sig-space { border-color:var(--linea); }
      .meta-strong { font-weight:500; }
      .sig-role { font-weight:400; }

      /* Las etiquetas: en gris, peso medio y sin mayusculas sostenidas. */
      .eyebrow, .card-label, .section-title, .subheading, .meta-label,
      .cover-client .meta-label, .ccg-k, .cover-kicker, .sst-title, .photo-caption,
      .ficha-card-tag, .ficha-llamada-texto b, .ficha-nota dt, .total-label {
        text-transform:none; letter-spacing:0; font-weight:500; color:var(--gris);
      }
      .header-sello, .header-sello b, .cover-firm-contact, .cover-client-nit,
      .cover-foot, .cover-sello, .cover-sello b, .row-num, .sig-role, .sig-meta,
      .incluye-item::before { color:var(--gris); }

      /* Tabla de precios: sin banda oscura, encabezado gris sobre linea fina y
         el total grande en negro. */
      .table th { background:transparent; color:var(--gris); font-weight:500; text-transform:none;
        letter-spacing:0; border-bottom:.5pt solid var(--linea); }
      .table td { border-bottom:.5pt solid var(--linea-suave); }
      .table .soft-row td { border-bottom:.5pt solid var(--linea-suave); }
      /* El subtotal va resaltado con fondo gris suave y en negrita: separa los
         items de lo que se suma encima, y es lo que se busca al leer la tabla.
         print-color-adjust hace que el fondo salga tambien al imprimir. */
      .table .sub-row td { font-weight:600; background:var(--fondo-resalte); border-bottom:none;
        -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .table .sub-row td:first-child { border-radius:8px 0 0 8px; }
      .table .sub-row td:last-child { border-radius:0 8px 8px 0; }
      /* El total va resaltado igual que el subtotal: fondo gris y esquinas
         redondeadas, en vez de la linea negra encima. */
      .table .grand-total td { border-top:none; background:var(--fondo-resalte);
        padding-top:12px; padding-bottom:12px;
        -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .table .grand-total td:first-child { border-radius:8px 0 0 8px; }
      .table .grand-total td:last-child { border-radius:0 8px 8px 0; }
      .total-label, .total-amount { color:var(--tinta); font-weight:600; font-size:20px; letter-spacing:-0.02em; }
      .accent { color:var(--tinta); }

      /* Tarjetas, fotos y fichas: esquinas amplias, linea suave y sin sombra. */
      .photo-card, .ficha-card, .map-wrap, .ficha-card-img-box, .ficha-img-box {
        border:.5pt solid var(--linea-suave); border-radius:12px; box-shadow:none; }
      .photo-caption { background:#fff; border-top:.5pt solid var(--linea-suave); }
      .ficha-card-header { border-bottom-color:var(--linea-suave); }
      .ficha-card-tag { background:var(--fondo-suave); border:none; border-radius:6px; }
      .ficha-card-img-box, .ficha-img-box { background:var(--fondo-suave); }
      .ficha-card-desc .split, .ficha-desc .split { border-bottom-color:var(--linea-suave); }
      .contact-box { background:var(--fondo-suave); border:none; border-radius:12px; }
      .ficha-llamada-guia { background:var(--linea); opacity:1; }

      /* Encabezado estilo Apple con identidad Ingeanclajes
         (rojo corporativo #E0342A, carbon Apple #1D1D1F y superficie perla #F8FAFC). */
      .header {
        display:flex;
        justify-content:space-between;
        align-items:center;
        border-bottom:none;
        padding-bottom:3mm;
        margin:0 0 5.5mm;
        background:linear-gradient(90deg, #E0342A 0%, #B91C1C 26%, #E2E8F0 26%, #E2E8F0 100%) bottom / 100% 2px no-repeat;
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
      }
      .header-brand { display:flex; align-items:center; }
      .header .logo { height:28px; width:auto; object-fit:contain; display:block; }
      .header-right {
        display:inline-flex;
        align-items:center;
        gap:8px;
        text-transform:none;
        letter-spacing:0;
        text-align:right;
      }
      .header-company {
        font-size:10.5px;
        font-weight:600;
        color:#6E6E73;
        letter-spacing:0.01em;
        white-space:nowrap;
      }
      .header-pill {
        display:inline-flex;
        align-items:center;
        background:#FEF2F2;
        color:#B91C1C;
        border:1px solid #FECACA;
        border-radius:999px;
        padding:2.5px 10px;
        font-size:10.5px;
        font-weight:700;
        font-variant-numeric:tabular-nums;
        letter-spacing:0.01em;
        white-space:nowrap;
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
      }

      .cover-header {
        border-bottom:none;
        padding-bottom:5.5mm;
        background:linear-gradient(90deg, transparent 0%, #E2E8F0 18%, #E0342A 50%, #E2E8F0 82%, transparent 100%) bottom / 100% 2px no-repeat;
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
      }

      @media print {
        body { background:#fff; }
        .page { margin:0; }
      }
    `;
