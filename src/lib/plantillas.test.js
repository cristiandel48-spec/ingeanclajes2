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
import { buildCotizacionPrintHtml } from "./cotizacionPrint";
import { buildInformePrintHtml } from "./informePrint";
import { FOTO_LINEA_CAMIONERA_DEFAULT } from "../assets/fotoLineaCamionera";

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
    expect(html).toContain(FOTO_LINEA_CAMIONERA_DEFAULT.slice(0, 80));
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
