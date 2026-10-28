// Resultado identico de las plantillas de impresion (M4/M5).
//
// Guarda el HTML exacto que producen la cotizacion y el informe para varios
// casos de ejemplo. Cualquier cambio en las plantillas -dividirlas en partes,
// mover estilos- tiene que dejar estos archivos iguales, letra por letra. Si
// un cambio de diseño es a proposito, se regeneran con:
//
//   npx vitest run src/lib/plantillas.test.js -u
//
// y se revisa la diferencia antes de subirla.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { buildActaPrintHtml } from "./actaEntregaPrint";
import { buildCotizacionPrintHtml } from "./cotizacionPrint";
import { buildInformePrintHtml } from "./informePrint";

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-20T15:00:00Z"));
});
afterAll(() => vi.useRealTimers());

// Una imagen minima: el contenido no importa, solo que aparezca donde va.
const FOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

const base = {
  id: "COT-001",
  numero: "C-26001",
  cliente: "CONSTRUCTORA DE PRUEBA S.A.S.",
  nit: "900123456-7",
  contacto: "Ana Pérez",
  telefono: "3001234567",
  ciudad: "MEDELLÍN",
  direccion: "CRA 1 # 2-3",
  obra: "EDIFICIO TORRE NORTE",
  fecha: "2026-10-20",
};

const COTIZACIONES = {
  "linea-vida-horizontal": {
    ...base,
    tipoCotizacion: "linea_vida",
    util: 10,
    items: [
      { id: 1, desc: "LÍNEA DE VIDA HORIZONTAL EN CABLE DE ACERO GALVANIZADO", cant: 40, unit: "ML", vu: 95000 },
      { id: 2, desc: "CERTIFICACIÓN DEL SISTEMA", cant: 1, unit: "UND", vu: 450000 },
    ],
  },
  "escalera-y-vertical": {
    ...base,
    id: "COT-002",
    numero: "C-26002",
    tipoCotizacion: "escaleras",
    util: 15,
    items: [
      { id: 1, desc: "ESCALERA TIPO GATO CON GUARDA", cant: 6, unit: "ML", vu: 380000 },
      { id: 2, desc: "LÍNEA DE VIDA VERTICAL EN ESCALERA", cant: 6, unit: "ML", vu: 210000 },
    ],
  },
  "puntos-de-anclaje-sin-aiu": {
    ...base,
    id: "COT-003",
    numero: "C-26003",
    tipoCotizacion: "puntos_anclaje",
    sinAiu: true,
    items: [{ id: 1, desc: "PUNTO DE ANCLAJE CERTIFICADO 5000 LB", cant: 12, unit: "UND", vu: 180000 }],
    fotos: [{ img: FOTO, descripcion: "Cubierta" }],
  },
  "varias-propuestas": {
    ...base,
    id: "COT-004",
    numero: "C-26004",
    propuestaActivaId: "prop-b",
    propuestas: [
      {
        id: "prop-a", nombre: "Propuesta A", tipoCotizacion: "linea_vida", util: 10,
        items: [{ id: 1, desc: "LÍNEA DE VIDA HORIZONTAL", cant: 20, unit: "ML", vu: 100000 }],
      },
      {
        id: "prop-b", nombre: "Propuesta B", tipoCotizacion: "linea_vida", util: 0,
        items: [{ id: 1, desc: "LÍNEA DE VIDA HORIZONTAL EN INOX", cant: 20, unit: "ML", vu: 160000 }],
      },
    ],
  },
  // Lo que pidio Camila: un trabajo que no es de ningun sistema. No debe
  // salir nada de la linea de vida normal (ni fichas ni definiciones).
  "ninguno-camionera": {
    ...base,
    id: "COT-005",
    numero: "C-26005",
    tipoCotizacion: "manual",
    util: 10,
    items: [{ id: 1, desc: "LÍNEA DE VIDA CAMIONERA PARA CARGUE DE VEHÍCULOS", cant: 1, unit: "GL", vu: 9500000 }],
  },
};

describe("cotizacion en «Ninguno»", () => {
  it("no lleva fichas ni definiciones de la linea de vida normal", () => {
    const html = buildCotizacionPrintHtml(COTIZACIONES["ninguno-camionera"], { firmaImg: FOTO });
    const lineaVida = buildCotizacionPrintHtml(COTIZACIONES["linea-vida-horizontal"], { firmaImg: FOTO });
    expect(html).not.toContain("Definiciones que estructuran el alcance");
    expect(html).not.toContain("Tensor de línea");
    expect(lineaVida).toContain("Definiciones que estructuran el alcance");
    expect(lineaVida).toContain("Tensor de línea");
  });
});

describe("cotizacion camionera", () => {
  it("el tipo «Línea de vida camionera» no lleva los componentes de la horizontal", () => {
    const html = buildCotizacionPrintHtml(
      { ...COTIZACIONES["ninguno-camionera"], tipoCotizacion: "linea_vida_camionera" },
      { firmaImg: FOTO },
    );
    expect(html).not.toContain("Componentes del sistema");
    expect(html).not.toContain("Tensor de línea");
    // Lleva su propia definicion y su ilustracion, no la de cubierta.
    expect(html).toContain("Línea de vida camionera");
    expect(html).toContain("cuello de cisne");
    expect(html).not.toContain("tensionada y sujeta en tres o dos puntos de anclaje");
    // La ilustracion va en su ficha tecnica, antes del precio, y no como
    // foto de la propuesta.
    expect(html).toContain("Sistema de línea de vida camionera");
    expect(html).toContain("linea-vida-camionera");
    expect(html).not.toContain("foto-def-linea-camionera");
    expect(html.indexOf("Sistema de línea de vida camionera")).toBeLessThan(html.indexOf("Total propuesta"));
  });
});

describe("fichas del punto de anclaje", () => {
  const GALV = "Punto de anclaje certificado en acero galvanizado";
  const INOX = "Punto de anclaje certificado en acero inoxidable";
  const imprimir = (cotizacion) => buildCotizacionPrintHtml(cotizacion, { firmaImg: FOTO });

  it("sin material escrito va la de galvanizado, que es lo corriente", () => {
    const html = imprimir(COTIZACIONES["puntos-de-anclaje-sin-aiu"]);
    expect(html).toContain(GALV);
    expect(html).not.toContain(INOX);
    expect(html).not.toContain("foto-def-punto-anclaje");
    expect(html.indexOf(GALV)).toBeLessThan(html.indexOf("Total propuesta"));
  });

  it("los dos materiales cotizados llevan las dos fichas, en el orden de los items", () => {
    const html = imprimir({
      ...COTIZACIONES["puntos-de-anclaje-sin-aiu"],
      items: [
        { id: 1, desc: "PUNTO DE ANCLAJE EPÓXICO EN ACERO GALVANIZADO", cant: 8, unit: "UND", vu: 180000 },
        { id: 2, desc: "PUNTO DE ANCLAJE EPÓXICO EN ACERO INOXIDABLE", cant: 4, unit: "UND", vu: 240000 },
      ],
    });
    expect(html).toContain(GALV);
    expect(html).toContain(INOX);
    expect(html.indexOf(GALV)).toBeLessThan(html.indexOf(INOX));
    expect(html.indexOf(GALV)).toBeLessThan(html.indexOf("Total propuesta"));
  });

  it("solo inoxidable cuando solo se cotiza ese", () => {
    const html = imprimir({
      ...COTIZACIONES["puntos-de-anclaje-sin-aiu"],
      items: [{ id: 1, desc: "PUNTO DE ANCLAJE EN ACERO INOXIDABLE", cant: 4, unit: "UND", vu: 240000 }],
    });
    expect(html).toContain(INOX);
    expect(html).not.toContain(GALV);
  });

  it("una cotizacion de linea de vida no lleva ficha de punto de anclaje", () => {
    const html = imprimir(COTIZACIONES["linea-vida-horizontal"]);
    expect(html).not.toContain(GALV);
    expect(html).not.toContain(INOX);
  });

  it("una propuesta con puntos de anclaje y linea de vida horizontal muestra ambas fichas", () => {
    const html = imprimir({
      ...COTIZACIONES["puntos-de-anclaje-sin-aiu"],
      items: [
        { id: 1, desc: "INSTALACIÓN PUNTO DE IANCLAJE ARTICO SAFE WORK ACERO INOXIDABLE", cant: 10, unit: "UND", vu: 340000 },
        { id: 2, desc: "REMPLAZO DE ARGOLLAS EXISTENTES POR PUNTO DE ANCLAJE ARTICO SAFE WORK", cant: 50, unit: "UND", vu: 290000 },
        { id: 3, desc: "DISEÑO INSTALACIÓN Y CERTIFICACIÓN DE LÍNEA DE VIDA HORIZONTAL FIJA EN ACERO INOXIDABLE", cant: 50, unit: "ML", vu: 360000 },
      ],
    });
    expect(html).toContain(INOX);
    expect(html).toContain("Componentes del sistema en acero inoxidable");
  });
});

const INFORMES = {
  "informe-con-fotos": {
    id: "INF-001",
    proyecto: "EDIFICIO TORRE NORTE",
    localizacion: "MEDELLÍN",
    cliente: "CONSTRUCTORA DE PRUEBA S.A.S.",
    fechaInforme: "2026-10-20",
    periodoInicio: "2026-10-13",
    periodoFin: "2026-10-17",
    personal: [{ nombre: "Juan Gómez", cargo: "TÉCNICO" }, { nombre: "Luis Ríos", cargo: "AUXILIAR" }],
    actividades: [
      {
        titulo: "Instalación de línea de vida",
        fecha: "2026-10-14",
        actividadesRealizadas: "Se instalaron los anclajes extremos y el cable.",
        descripcion: "Trabajo en cubierta con acceso por escalera.",
        observaciones: "Sin novedades.",
        // Una con comentario y otra sin: sin comentario no se imprime texto.
        fotos: [{ img: FOTO, comentario: "Anclaje extremo instalado" }, { img: FOTO, descripcion: "Cable tensionado" }],
      },
      {
        titulo: "Prueba de carga",
        fecha: "2026-10-16",
        actividadesRealizadas: "Prueba de carga a 5000 lb en cada anclaje.",
        descripcion: "",
        observaciones: "",
        fotos: [{ img: FOTO, descripcion: "Dinamómetro" }],
      },
    ],
    recomendaciones: "Inspección anual por personal competente.",
  },
};

describe("plantilla de cotizacion", () => {
  for (const [nombre, cotizacion] of Object.entries(COTIZACIONES)) {
    it(nombre, async () => {
      await expect(buildCotizacionPrintHtml(cotizacion, { firmaImg: FOTO })).toMatchFileSnapshot(
        `./__snapshots__/plantillas/cotizacion-${nombre}.html`
      );
    });
  }
});

describe("plantilla de informe", () => {
  for (const [nombre, informe] of Object.entries(INFORMES)) {
    it(nombre, async () => {
      await expect(buildInformePrintHtml(informe, { firmaImg: FOTO })).toMatchFileSnapshot(
        `./__snapshots__/plantillas/${nombre}.html`
      );
    });
  }
});

// El acta de entrega de obra, con la misma obra de los ejemplos de arriba.
// Es la que se llenaba a mano: lo que se compara aqui es que las casillas del
// formato de papel sigan saliendo todas y en su sitio.
const ACTAS = {
  "acta-puntos-de-anclaje": {
    id: "ACT-001",
    obraId: "OB-010",
    fecha: "2026-10-20",
    contratante: "CONSTRUCTORA DE PRUEBA S.A.S.",
    nit: "900123456-7",
    telefono: "3001234567",
    correoFacturacion: "facturacion@prueba.com",
    correoAdministrativo: "residente@prueba.com",
    contactoAdministrativo: "Ana Pérez",
    direccionObra: "EDIFICIO TORRE NORTE, CRA 1 # 2-3, MEDELLÍN",
    objetivo: "PUNTOS DE ANCLAJE",
    areasIntervenidas: "CUBIERTA Y TERRAZA DE LA SUBESTACIÓN",
    fechaInicio: "2026-10-13",
    fechaEntrega: "2026-10-17",
    sistemas: [{ cantidad: 30, unidad: "Und", descripcion: "PUNTO DE ANCLAJE CERTIFICADO 5000 LB" }],
    acero: "galvanizado",
    colaboradores: ["Juan Gómez", "Luis Ríos"],
    coordinadorAlturas: "Paola Escobar",
    liderProyecto: "Jamer Rincón",
    descripcion: "Se instalaron 30 puntos de anclaje en terraza y cubierta, repartidos según la necesidad de cada módulo.",
    observaciones: "El sistema queda en óptimas condiciones para el debido uso.",
    recibeNombre: "Eduard Zuñiga",
    recibeDocumento: "1040354193",
    recibeCargo: "RESIDENTE SST",
  },
  // Un acta a medias, como sale cuando la obra no tiene cotizacion
  // vinculada: las casillas vacias salen con su raya para escribirlas a mano.
  "acta-sin-cotizacion": {
    id: "ACT-002",
    fecha: "2026-10-20",
    contratante: "CONSTRUCTORA DE PRUEBA S.A.S.",
    sistemas: [],
    colaboradores: [],
    acero: "",
    descripcion: "",
    observaciones: "",
  },
};

describe("plantilla del acta de entrega", () => {
  for (const [nombre, acta] of Object.entries(ACTAS)) {
    it(nombre, async () => {
      await expect(buildActaPrintHtml(acta, { firmaImg: FOTO })).toMatchFileSnapshot(
        `./__snapshots__/plantillas/${nombre}.html`
      );
    });
  }

  it("marca el acero que se instaló y no el otro", () => {
    const galvanizado = buildActaPrintHtml(ACTAS["acta-puntos-de-anclaje"]);
    const inoxidable = buildActaPrintHtml({ ...ACTAS["acta-puntos-de-anclaje"], acero: "inoxidable" });
    const marcada = (html, etiqueta) =>
      new RegExp(`✕[^]{0,220}?${etiqueta}`).test(html);
    expect(marcada(galvanizado, "Acero galvanizado")).toBe(true);
    expect(marcada(galvanizado, "Acero inoxidable")).toBe(false);
    expect(marcada(inoxidable, "Acero inoxidable")).toBe(true);
  });

  it("lleva su codigo de formato y el numero de la orden de trabajo", () => {
    const html = buildActaPrintHtml(ACTAS["acta-puntos-de-anclaje"]);
    expect(html).toContain("FORM-SST-89");
    expect(html).toContain("Orden de trabajo");
    expect(html).toContain("ACT-001");
  });

  it("plasma la firma del cliente y el QR en el recuadro Recibe conforme cuando esta firmado", () => {
    const html = buildActaPrintHtml(ACTAS["acta-puntos-de-anclaje"], {
      qrVerificacion: "data:image/png;base64,QUFB",
      firmaCliente: {
        estado: "firmado",
        firma_imagen: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        firmante_nombre: "CARLOS MARIO PEREZ",
        firmante_documento: "98765432",
        firmante_cargo: "DIRECTOR DE OBRA",
        firmado_en: "2026-10-27T15:00:00Z",
      },
    });
    expect(html).toContain('alt="Firma del cliente"');
    expect(html).toContain("NOMBRE: CARLOS MARIO PEREZ");
    expect(html).toContain("C.C.: 98765432");
    expect(html).toContain("CARGO: DIRECTOR DE OBRA");
    // «Firma electronica», no «firma digital»: en Colombia la firma digital es
    // la de certificado, y esta no lo es. Lo mismo dice la constancia.
    expect(html).toContain("Firmado electrónicamente");
    // Y la fecha se lee, que es lo que fallaba: salia «NaN de undefined».
    expect(html).toContain("27 de octubre de 2026");
    expect(html).toContain('alt="Código QR de verificación"');
  });

  it("sin firmar no sale ni el QR ni la firma del cliente", () => {
    const html = buildActaPrintHtml(ACTAS["acta-puntos-de-anclaje"]);
    expect(html).not.toContain('alt="Firma del cliente"');
    expect(html).not.toContain('alt="Código QR de verificación"');
    expect(html).toContain("(Firma de recepción a satisfacción)");
    expect(html).not.toContain("Rastro del envío");
  });

  // Desde que el acta firmada no lleva la hoja de constancia, el rastro -como
  // se mando, cuando abrio el enlace y cuando firmo- va impreso en el acta.
  it("firmada lleva el rastro del envio al pie", () => {
    const html = buildActaPrintHtml(ACTAS["acta-puntos-de-anclaje"], {
      firmaCliente: { estado: "firmado", firmante_nombre: "CARLOS MARIO PEREZ" },
      rastro: {
        filas: [
          { fecha: "27 de octubre de 2026, 10:23:40 p. m.", etiqueta: "Enviado por WhatsApp", ip: "181.142.100.115" },
          { fecha: "27 de octubre de 2026, 10:25:20 p. m.", etiqueta: "Enlace abierto", ip: "181.142.100.115" },
          { fecha: "27 de octubre de 2026, 10:25:57 p. m.", etiqueta: "Recibido firmado", ip: "181.142.100.115" },
        ],
        omitidas: 2,
      },
    });
    expect(html).toContain("Rastro del envío");
    expect(html).toContain("Enviado por WhatsApp");
    expect(html).toContain("Enlace abierto");
    expect(html).toContain("Recibido firmado");
    expect(html).toContain("IP 181.142.100.115");
    expect(html).toContain("2 apertura(s) más");
  });
});
