import { describe, expect, it } from "vitest";
import {
  SALUDO_SUGERIDO_POR_TIPO,
  TITULO_SUGERIDO_POR_TIPO,
  buildQuoteProposal,
  coincideTextoPlantilla,
  esPresentacionEstandarDeSistema,
  esSaludoEstandarDeSistema,
  esTituloEstandarDeSistema,
  getQuoteApprovalAccountingSnapshot,
  getQuoteProposalTotals,
  inferirTipoDesdeTitulo,
  normalizeProposalItems,
  normalizeQuoteItems,
  porcentajeUtilidad,
  presentacionSugeridaParaTipo,
  resolverTipoCotizacion,
  saludoSugeridoParaTipo,
  tipoCotizacionCanonico,
  tipoDocumentoDePropuesta,
  tituloSugeridoParaTipo,
} from "./cotizaciones";
import { getTextosDocumento } from "./cotizacionTextos";

// Subtotal 250.000: 2 x 100.000 + 1 x 50.000
const ITEMS = [
  { id: 1, desc: "LINEA DE VIDA", cant: 2, unit: "ML", vu: 100000 },
  { id: 2, desc: "CERTIFICACION", cant: 1, unit: "UND", vu: 50000 },
];

describe("porcentajeUtilidad", () => {
  it("respeta el 0 % guardado", () => {
    expect(porcentajeUtilidad(0)).toBe(0);
    expect(porcentajeUtilidad(0, 25)).toBe(0);
  });

  it("sin nada guardado es 10 %", () => {
    expect(porcentajeUtilidad()).toBe(10);
    expect(porcentajeUtilidad(undefined, null)).toBe(10);
  });

  it("toma el primer valor guardado", () => {
    expect(porcentajeUtilidad(undefined, 15)).toBe(15);
    expect(porcentajeUtilidad("12")).toBe(12);
  });

  it("vacio o no numerico es 0, como en el editor", () => {
    expect(porcentajeUtilidad("")).toBe(0);
    expect(porcentajeUtilidad("abc")).toBe(0);
  });

  it("negativa es 0", () => {
    expect(porcentajeUtilidad(-5)).toBe(0);
  });
});

describe("valores negativos (F15)", () => {
  it("una cantidad o un precio negativo no resta del total", () => {
    const items = [...ITEMS, { id: 3, desc: "ERROR", cant: -2, unit: "UND", vu: 100000 }, { id: 4, desc: "ERROR", cant: 1, unit: "UND", vu: -50000 }];
    expect(buildQuoteProposal({ items, util: 10 }).total).toBe(279750);
    expect(getQuoteProposalTotals({}, { items, util: 10 }).sub).toBe(250000);
  });

  it("la utilidad negativa cuenta como 0", () => {
    expect(buildQuoteProposal({ items: ITEMS, util: -10 }).total).toBe(250000);
  });
});

describe("total de una propuesta", () => {
  it("con AIU: utilidad sobre el subtotal e IVA solo sobre la utilidad", () => {
    const p = buildQuoteProposal({ items: ITEMS, util: 10 });
    // 250.000 + 25.000 + 4.750
    expect(p.total).toBe(279750);
  });

  it("sin AIU: IVA pleno sobre el subtotal, sin utilidad", () => {
    const p = buildQuoteProposal({ items: ITEMS, util: 10, sinAiu: true });
    // 250.000 + 47.500
    expect(p.total).toBe(297500);
  });

  it("con utilidad 0 % no cobra utilidad ni su IVA", () => {
    const p = buildQuoteProposal({ items: ITEMS, util: 0 });
    expect(p.util).toBe(0);
    expect(p.total).toBe(250000);
  });

  it("getQuoteProposalTotals da lo mismo que el total guardado", () => {
    const propuesta = { items: ITEMS, util: 0 };
    const { sub, ut, iva, tot } = getQuoteProposalTotals({ util: 10 }, propuesta);
    expect(sub).toBe(250000);
    expect(ut).toBe(0);
    expect(iva).toBe(0);
    expect(tot).toBe(250000);
  });

  it("la base contable del ingreso excluye el IVA", () => {
    const cot = { id: "COT-001", items: ITEMS, util: 10 };
    const snap = getQuoteApprovalAccountingSnapshot(cot);
    expect(snap.totalObra).toBe(279750);
    expect(snap.ivaGeneradoCotizacion).toBe(4750);
    expect(snap.baseIngresoContable).toBe(275000);
  });
});

describe("lineas de la cotizacion", () => {
  it("no borra lineas iguales que son trabajo distinto", () => {
    const iguales = [1, 2, 3, 4, 5].map((id) => ({ id, desc: "SISTEMA ANTICAIDA", cant: 1, unit: "GL", vu: 1000 }));
    expect(normalizeQuoteItems({ items: iguales })).toHaveLength(5);
  });

  it("descarta solo las repetidas por identificador", () => {
    const items = [
      { id: 1, desc: "A", cant: 1, vu: 1 },
      { id: 1, desc: "A", cant: 1, vu: 1 },
      { id: 2, desc: "B", cant: 1, vu: 1 },
    ];
    expect(normalizeQuoteItems({ items }).map((it) => it.id)).toEqual([1, 2]);
  });

  it("da ids unicos a las lineas sin id o con id repetido", () => {
    const items = normalizeProposalItems([
      { id: 1, desc: "a", cant: 1, vu: 1 },
      { desc: "b", cant: 1, vu: 1 },
      { id: 1, desc: "c", cant: 1, vu: 1 },
    ]);
    const ids = items.map((it) => String(it.id));
    expect(new Set(ids).size).toBe(3);
    expect(items[0].id).toBe(1);
  });
});

describe("tipoCotizacionCanonico", () => {
  it("unifica las distintas formas de escribir el mismo tipo", () => {
    expect(tipoCotizacionCanonico("Anclajes")).toBe("puntos_anclaje");
    expect(tipoCotizacionCanonico("Puntos de anclaje")).toBe("puntos_anclaje");
    expect(tipoCotizacionCanonico("puntos_anclaje")).toBe("puntos_anclaje");
    expect(tipoCotizacionCanonico("Estructuras Metálicas")).toBe("estructuras_metalicas");
    expect(tipoCotizacionCanonico("Línea de vida")).toBe("linea_vida");
  });

  it("cada categoria del catalogo corresponde a su tipo de trabajo", () => {
    const categorias = {
      "Lineas de Vida": "linea_vida",
      "Sistemas Completos": "sistemas_completos",
      "Servicios": "servicios",
      "Anclajes": "puntos_anclaje",
      "Escaleras": "escaleras",
      "caminaderos": "caminaderos",
      "Lineas de Vida Camioneras": "linea_vida_camionera",
      "Estructuras Metálicas": "estructuras_metalicas",
      "Obra Blanca": "obra_blanca",
    };
    for (const [categoria, tipo] of Object.entries(categorias)) {
      expect(tipoCotizacionCanonico(categoria)).toBe(tipo);
    }
  });

  it("una categoria propia conserva su id", () => {
    expect(tipoCotizacionCanonico("Andamios")).toBe("andamios");
  });

  it("una linea de vida distinta no se vuelve la linea de vida normal", () => {
    expect(tipoCotizacionCanonico("Lineas de Vida")).toBe("linea_vida");
    expect(tipoCotizacionCanonico("linea_vida")).toBe("linea_vida");
    expect(tipoCotizacionCanonico("Línea de vida camionera")).toBe("linea_vida_camionera");
    expect(tipoCotizacionCanonico("linea_vida_camionera")).toBe("linea_vida_camionera");
    expect(tipoCotizacionCanonico("manual")).toBe("manual");
  });
});

describe("tipoDocumentoDePropuesta", () => {
  const camionera = [
    { desc: "CAMBIO DE CABLE PARA LÍNEA DE VIDA CAMIONERA EN ACERO INOXIDABLE CON TENSOR" },
    { desc: "LÍNEA DE VIDA CAMIONERA CON DOS SOPORTES" },
  ];
  it("una «Línea de vida» con items solo de la camionera se imprime como camionera (C-26189)", () => {
    expect(tipoDocumentoDePropuesta({ tipoCotizacion: "linea_vida", items: camionera })).toBe("linea_vida_camionera");
    expect(tipoDocumentoDePropuesta({ quote: { tipoCotizacion: "Lineas de Vida", items: camionera } })).toBe("linea_vida_camionera");
  });
  it("una propuesta mixta, sin items camioneros o de otro tipo no cambia", () => {
    expect(tipoDocumentoDePropuesta({ tipoCotizacion: "linea_vida", items: [...camionera, { desc: "LÍNEA DE VIDA HORIZONTAL EN CUBIERTA" }] })).toBe("linea_vida");
    expect(tipoDocumentoDePropuesta({ tipoCotizacion: "linea_vida", items: ITEMS })).toBe("linea_vida");
    expect(tipoDocumentoDePropuesta({ tipoCotizacion: "linea_vida", items: [] })).toBe("linea_vida");
    expect(tipoDocumentoDePropuesta({ tipoCotizacion: "manual", items: camionera })).toBe("manual");
    expect(tipoDocumentoDePropuesta({ tipoCotizacion: "puntos_anclaje", items: camionera })).toBe("puntos_anclaje");
  });
});

describe("inferirTipoDesdeTitulo", () => {
  it("distingue linea de vida camionera de la linea de vida normal", () => {
    expect(inferirTipoDesdeTitulo("Instalación de Línea de Vida Camionera")).toBe("linea_vida_camionera");
    expect(
      inferirTipoDesdeTitulo("Reemplazo de Cable para Línea de Vida Camionera e Instalación de Línea de Vida Camionera")
    ).toBe("linea_vida_camionera");
    expect(inferirTipoDesdeTitulo("Sistema de líneas de vida Certificadas para Trabajo en Alturas")).toBe("linea_vida");
    expect(inferirTipoDesdeTitulo("Sistema de l.v.h Certificado para Trabajo en Alturas")).toBe("linea_vida");
    expect(inferirTipoDesdeTitulo("Sistema de líneas de de vidaCertificado para Trabajo en Altura")).toBe("linea_vida");
  });

  it("detecta estructuras metalicas y pergolas", () => {
    expect(inferirTipoDesdeTitulo("estructura metálica plataforma de aires acondicionados")).toBe("estructuras_metalicas");
    expect(inferirTipoDesdeTitulo("repotenciación de pergola")).toBe("estructuras_metalicas");
    expect(inferirTipoDesdeTitulo("estructura metálica para parqueadero")).toBe("estructuras_metalicas");
    expect(inferirTipoDesdeTitulo("instalacion pergola")).toBe("estructuras_metalicas");
    expect(inferirTipoDesdeTitulo("Sistema de Líneas de Vida sobre Estructura Metálica")).toBe("linea_vida");
    expect(inferirTipoDesdeTitulo("Instalación de Anclajes en Cubierta Metálica")).toBe("puntos_anclaje");
  });

  it("detecta escaleras solas y sistemas combinados con linea de vida", () => {
    expect(inferirTipoDesdeTitulo("Sistema de ESCALERAS CertificadAS para Trabajo en Alturas")).toBe("escaleras");
    expect(inferirTipoDesdeTitulo("Sistema de escalera tipo gato para Trabajo en Alturas")).toBe("escaleras");
    expect(inferirTipoDesdeTitulo("ESCALERA PARA ACCESO A CUBIERTA")).toBe("escaleras");
    expect(inferirTipoDesdeTitulo("Escalera fija con línea de vida vertical")).toBe("escaleras");
    expect(inferirTipoDesdeTitulo("Sistema de lineas de vida y escalera Certificado para Trabajo en Alturas")).toBe("linea_vida");
    expect(
      inferirTipoDesdeTitulo("RECERTIFICACIÓN E INSTALACIÓN DE Sistema de Anclajes, LÍNEAS DE VIDA Y ESCALERAS")
    ).toBe("linea_vida");
  });

  it("detecta anclajes, servicios de recertificacion y trabajos manuales", () => {
    expect(inferirTipoDesdeTitulo("Sistema de Anclajes Certificado\npara Trabajo en Alturas")).toBe("puntos_anclaje");
    expect(inferirTipoDesdeTitulo("recertificación del Sistema de Anclajes para Trabajo en Alturas")).toBe("puntos_anclaje");
    expect(inferirTipoDesdeTitulo("recertificación Sistema de líneas de vida Certificadas")).toBe("linea_vida");
    expect(inferirTipoDesdeTitulo("Mantenimiento y Recertificación de Todo el Sistema Anticaidas para Trabajo en Alturas")).toBe("servicios");
    expect(inferirTipoDesdeTitulo("RECERTIFICACION SISTEMA ANTICAIDAS")).toBe("servicios");
    expect(inferirTipoDesdeTitulo("INSTALACIÓN DE TECHO TERMO ACUSTICO")).toBe("manual");
    expect(inferirTipoDesdeTitulo("serviCio de evaluación estructural")).toBe("manual");
    expect(inferirTipoDesdeTitulo("pruebas de carga horizontal/vertical")).toBe("manual");
    expect(inferirTipoDesdeTitulo("")).toBe("");
  });

  it("sincroniza en sentido inverso con titulos estandar por tipo", () => {
    expect(tituloSugeridoParaTipo("escaleras")).toBe("Sistema de Escaleras Certificadas para Trabajo en Alturas");
    expect(tituloSugeridoParaTipo("linea_vida_camionera")).toBe("Instalación de Línea de Vida Camionera");
    expect(tituloSugeridoParaTipo("obra_blanca")).toBe("Ejecución de Trabajos y Adecuaciones en Obra Blanca");
    expect(tituloSugeridoParaTipo("manual")).toBe("Propuesta Técnica y Económica");
    expect(esTituloEstandarDeSistema("Sistema de Anclajes Certificado\npara Trabajo en Alturas")).toBe(true);
    expect(esTituloEstandarDeSistema("Instalación de Sistema de Protección en Obra Blanca")).toBe(true);
    expect(esTituloEstandarDeSistema("Instalación de Pérgola en Terraza Norte")).toBe(false);
    expect(coincideTextoPlantilla("Sistema de Anclajes Certificado\npara Trabajo en Alturas", tituloSugeridoParaTipo("puntos_anclaje"))).toBe(true);
    expect(resolverTipoCotizacion({ tipoCotizacion: "linea_vida", propuestas: [{ id: "p1", tipoCotizacion: "escaleras" }] })).toBe("escaleras");
  });

  it("ajusta frase de apertura y presentacion segun el tipo de sistema sin pisar textos personalizados", () => {
    for (const [tipo, saludo] of Object.entries(SALUDO_SUGERIDO_POR_TIPO)) {
      expect(saludo.startsWith("Agradecemos la oportunidad de presentarles nuestra propuesta para ")).toBe(true);
      expect(saludo.endsWith(".")).toBe(false);
      expect(esSaludoEstandarDeSistema(saludo)).toBe(true);
      expect(Boolean(TITULO_SUGERIDO_POR_TIPO[tipo])).toBe(true);
    }
    expect(esSaludoEstandarDeSistema("Agradecemos la oportunidad de presentarles nuestra propuesta para impermeabilizar la terraza norte")).toBe(false);

    // Obra blanca, estructuras metálicas y manual no deben prometer certificación 4272 en la carta
    for (const tipoNoAlturas of ["obra_blanca", "estructuras_metalicas", "manual"]) {
      const pres = presentacionSugeridaParaTipo(tipoNoAlturas);
      expect(pres).not.toContain("4272");
      expect(esPresentacionEstandarDeSistema(pres)).toBe(true);
    }
    expect(presentacionSugeridaParaTipo("puntos_anclaje")).toContain("4272");

    const textosObraBlanca = getTextosDocumento({ tipoCotizacion: "obra_blanca" });
    expect(textosObraBlanca.saludo).toBe(saludoSugeridoParaTipo("obra_blanca"));
    expect(textosObraBlanca.presentacion).not.toContain("4272");

    const textosPersonalizados = getTextosDocumento({
      tipoCotizacion: "obra_blanca",
      textosDocumento: {
        saludo: "Propuesta especial para adecuación de consultorios",
        presentacion: "Presentación redactada a medida para el cliente.",
      },
    });
    expect(textosPersonalizados.saludo).toBe("Propuesta especial para adecuación de consultorios");
    expect(textosPersonalizados.presentacion).toBe("Presentación redactada a medida para el cliente.");
  });
});
