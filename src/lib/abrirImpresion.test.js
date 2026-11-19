import { describe, expect, it } from "vitest";
import { aplicarTituloHtml, limpiarTituloImpresion, prepararHtmlImpresion } from "./abrirImpresion";
import { buildCotizacionPrintHtml } from "./cotizacionPrint";
import { cssHojaImpresion, MARGEN_HOJA } from "./hojaImpresion";
import { nombreCotizacion } from "./nombreArchivo";

describe("abrirImpresion", () => {
  it("reemplaza el <title> interno de la plantilla por el nombre completo del documento", () => {
    const htmlBase = `<!doctype html><html><head><meta charset="utf-8"><title>Cotizacion C-26224</title></head><body><section class="page">Hola</section></body></html>`;
    const titulo = nombreCotizacion({
      numero: "C-26224",
      cliente: "TRATAMIENTOS QUÍMICOS INDUSTRIALES S.A.S BIC",
      obra: "PETAR BELLO",
    });

    const { html, tituloLimpio } = prepararHtmlImpresion(htmlBase, titulo);

    expect(tituloLimpio).toBe("Cotizacion C-26224 TRATAMIENTOS QUÍMICOS INDUSTRIALES S.A.S BIC PETAR BELLO");
    expect(html).toContain(`<title>${tituloLimpio}</title>`);
    expect(html).not.toContain("<title>Cotizacion C-26224</title>");
  });

  it("inserta <title> dentro de <head> cuando la plantilla no trae uno", () => {
    const sinTitulo = "<!doctype html><html><head><meta charset=\"utf-8\"></head><body><p>Doc</p></body></html>";
    const conTitulo = aplicarTituloHtml(sinTitulo, "Informe de actividades INF-001");
    expect(conTitulo).toContain("<head><title>Informe de actividades INF-001</title>");
  });

  it("limpia caracteres no validos en nombres de archivo de Windows y escapa HTML", () => {
    const limpio = limpiarTituloImpresion('Cotizacion C-100: CLIENTE / OBRA "SUR" <script>');
    expect(limpio).not.toMatch(/[\\/:*?"<>|]/);
    expect(limpio).toBe("Cotizacion C-100 CLIENTE OBRA SUR script");

    const { html } = prepararHtmlImpresion("<html><head></head><body>x</body></html>", "A & B");
    expect(html).toContain("<title>A &amp; B</title>");
  });

  it("suprime encabezados y pies del navegador y no altera tamaños de imagen", () => {
    const { html } = prepararHtmlImpresion("<html><head></head><body><p>Ok</p></body></html>", "Doc");
    expect(html).toContain('@top-left { content: ""; }');
    expect(html).toContain('@bottom-right { content: ""; }');
    expect(html).not.toContain("crisp-edges");
    expect(html).not.toContain("height: auto !important");
  });
});

describe("cssHojaImpresion", () => {
  it("en documentos paginados (.page) iguala la geometria de Descargar PDF y evita encabezados del navegador", () => {
    const css = cssHojaImpresion();
    expect(css).toContain("size: Letter;");
    expect(css).toContain("margin: 0;");
    expect(css).toContain('@top-left { content: ""; }');
    expect(css).toContain('@bottom-right { content: ""; }');
    expect(css).toContain("width: 8.5in !important;");
    expect(css).toContain("height: 11in !important;");
    expect(css).toContain(`padding: ${MARGEN_HOJA} !important;`);
    // Nunca debe pisar las alturas explicitas de logos, fotos ni fichas tecnicas al imprimir.
    expect(css).not.toContain("height: auto !important");
    expect(css).not.toContain("max-width: 100% !important");
    expect(css).not.toContain("crisp-edges");
  });

  it("en documentos continuos (vistaPrevia: false) conserva el margen de @page sin encabezados del navegador", () => {
    const css = cssHojaImpresion({ vistaPrevia: false });
    expect(css).toContain(`margin: ${MARGEN_HOJA};`);
    expect(css).toContain('@top-left { content: ""; }');
    expect(css).not.toContain("height: 11in !important;");
    expect(css).not.toContain("height: auto !important");
  });
});

describe("nombreCotizacion", () => {
  it("incluye numero, cliente y obra sin repetir duplicados", () => {
    expect(
      nombreCotizacion({ numero: "C-26224", cliente: "ACME S.A.S", obra: "ACME S.A.S" })
    ).toBe("Cotizacion C-26224 ACME S.A.S");

    expect(
      nombreCotizacion({ numero: "C-26224", cliente: "ACME S.A.S", obra: "PLANTA NORTE" })
    ).toBe("Cotizacion C-26224 ACME S.A.S PLANTA NORTE");
  });
});

describe("empaquetado compacto de cotizaciones", () => {
  it("sube la tabla de precios y condiciones bajo el saludo cuando no hay fichas tecnicas", () => {
    const html = buildCotizacionPrintHtml({
      id: "COT-26224",
      numero: "C-26224",
      fecha: "2026-11-18",
      val: 30,
      cliente: "TRATAMIENTOS QUÍMICOS INDUSTRIALES S.A.S BIC",
      obra: "PETAR BELLO",
      tipoCotizacion: "manual",
      util: 10,
      items: [{ id: 1, desc: "INSTALACIÓN DE EQUIPO Y MONTAJE DE PANELES", cant: 1, unit: "UND", vu: 2500000 }],
      incluyeTexto: [
        "Tuercas y arandelas en ACERO GALVANIZADO.",
        "Transporte de materiales y de personal hasta el sitio de trabajo.",
        "Se entregan todos los certificados de acuerdo a la Resolución 4272.",
      ].join("\n"),
    });

    const paginas = html.match(/<section class="page/g) || [];
    // Portada + 2 hojas interiores balanceadas (en vez de 4 con 2 hojas casi vacias).
    expect(paginas.length).toBeLessThanOrEqual(3);
    // La portada sigue siendo hoja fija y el saludo + tabla comparten la hoja 2.
    const bloquesPagina = html.split(/<section class="page/).slice(1);
    expect(bloquesPagina[0]).toContain('data-fija="1"');
    expect(bloquesPagina[1]).toContain("Cordial saludo");
    expect(bloquesPagina[1]).toContain("Total propuesta");
  });

  it("mantiene las fichas tecnicas antes del precio y agrupa precio con condiciones despues", () => {
    const html = buildCotizacionPrintHtml({
      id: "COT-26226",
      numero: "C-26226",
      fecha: "2026-11-18",
      cliente: "ACME S.A.S",
      obra: "PLANTA SUR",
      tipoCotizacion: "puntos_anclaje",
      sinAiu: true,
      items: [{ id: 1, desc: "PUNTO DE ANCLAJE CERTIFICADO 5000 LB", cant: 10, unit: "UND", vu: 180000 }],
    });

    expect(html.indexOf("Punto de anclaje certificado en acero galvanizado")).toBeLessThan(
      html.indexOf("Total propuesta")
    );
    const bloquesPagina = html.split(/<section class="page/).slice(1);
    const hojaPrecio = bloquesPagina.find((b) => b.includes("Total propuesta"));
    expect(hojaPrecio).toContain("Condiciones comerciales");
  });
});
