import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import {
  SIN_DATO,
  SIN_REGISTRAR,
  armarReporteActividad,
  fechaColombia,
  filasPorUsuarioYMes,
  listaMeses,
  restarMeses,
  tituloMes,
  valorCasilla,
} from "./reporteActividad";
import { hojasDelReporte, nombreArchivoReporte } from "./reporteActividadExport";
import { construirXlsx, letraColumna } from "./xlsxSimple";
import { puedeVerReporteActividad } from "./permisos";

const USUARIOS = [
  { user_id: "u-camila", nombre: "Camila Sepúlveda", email: "camila@empresa.co", activo: true },
  { user_id: "u-juan", nombre: "Juan Pérez", email: "juan@empresa.co", activo: true },
  { user_id: "u-ana", nombre: "Ana Gómez", email: "ana@empresa.co", activo: true },
  { user_id: "u-ido", nombre: "Pedro Ido", email: "pedro@empresa.co", activo: false },
];

const DATOS = {
  usuarios: USUARIOS,
  cotizaciones: [
    { id: "c1", numero: "COT-001", cliente: "ACME", creadoPor: "u-juan", creadoPorNombre: "Juan Pérez", creadoEn: "2026-10-15T15:00:00Z" },
    { id: "c2", numero: "COT-002", cliente: "ACME", creadoPor: "u-juan", creadoPorNombre: "juan perez", creadoEn: "2026-11-02T15:00:00Z" },
    // 1 de noviembre a la 1:00 UTC = 31 de octubre a las 8 p. m. en Colombia.
    { id: "c3", numero: "COT-003", cliente: "Beta", creadoPor: "u-camila", creadoPorNombre: "Camila Sepúlveda", creadoEn: "2026-11-01T01:00:00Z" },
    // Fuera del periodo.
    { id: "c4", numero: "COT-004", cliente: "Vieja", creadoPor: "u-juan", creadoEn: "2026-03-10T15:00:00Z" },
  ],
  informes: [
    { id: "INF-1", proyecto: "Torre", creadoPor: "u-juan", creadoPorNombre: "Juan Pérez", creadoEn: "2026-11-05T15:00:00Z" },
  ],
  certs: [
    // Usuario que ya no esta en el equipo: queda con el nombre guardado.
    { id: "k1", numero: "CERT-1", cliente: "ACME", creadoPor: "u-borrado", creadoPorNombre: "Luisa Marín", creadoEn: "2026-11-06T15:00:00Z" },
  ],
  obras: [
    { id: "OB-1", proyecto: "Torre", creadoPor: "u-camila", creadoPorNombre: "Camila Sepúlveda", creadoEn: "2026-11-07T15:00:00Z" },
    // Sin autor ni fecha de creacion: no se le carga a nadie del equipo... pero
    // tampoco tiene mes, asi que no entra en ningun periodo.
    { id: "OB-2", proyecto: "Sin datos" },
  ],
  desde: "2026-10",
  hasta: "2026-11",
};

describe("fechas del reporte", () => {
  it("pasa la hora guardada (UTC) al dia de Colombia", () => {
    expect(fechaColombia("2026-11-01T01:00:00Z")).toBe("2026-10-31");
    expect(fechaColombia("2026-11-01T05:00:00Z")).toBe("2026-11-01");
  });

  it("una fecha sin hora ya es el dia y no se mueve", () => {
    expect(fechaColombia("2026-11-01")).toBe("2026-11-01");
  });

  it("lo que no es una fecha queda vacio", () => {
    expect(fechaColombia("")).toBe("");
    expect(fechaColombia("no es fecha")).toBe("");
  });

  it("lista los meses del mas reciente al mas viejo, cruzando el año", () => {
    expect(listaMeses("2025-11", "2026-02")).toEqual(["2026-02", "2026-01", "2025-12", "2025-11"]);
    expect(listaMeses("2026-02", "2025-11")).toHaveLength(4);
    expect(listaMeses("", "2026-02")).toEqual([]);
    expect(restarMeses("2026-01", 1)).toBe("2025-12");
    expect(tituloMes("2026-11")).toBe("Noviembre 2026");
  });
});

describe("conteo por usuario y mes", () => {
  const reporte = armarReporteActividad(DATOS);
  const de = (nombre) => reporte.filas.find((f) => f.usuario === nombre);

  it("cuenta cada documento a nombre de quien lo creo", () => {
    expect(de("Juan Pérez").totales).toEqual({ cotizaciones: 2, informes: 1, certificaciones: 0, obras: 0, visitas: 0, total: 3 });
    expect(de("Camila Sepúlveda").totales).toEqual({ cotizaciones: 1, informes: 0, certificaciones: 0, obras: 1, visitas: 0, total: 2 });
  });

  it("separa por mes en hora de Colombia", () => {
    expect(de("Juan Pérez").porMes["2026-10"].cotizaciones).toBe(1);
    expect(de("Juan Pérez").porMes["2026-11"].cotizaciones).toBe(1);
    // La de Camila se guardo el 1 de noviembre UTC, pero la hizo el 31 de octubre.
    expect(de("Camila Sepúlveda").porMes["2026-10"].cotizaciones).toBe(1);
    expect(de("Camila Sepúlveda").porMes["2026-11"].cotizaciones).toBe(0);
  });

  it("no cuenta lo que queda fuera del periodo", () => {
    expect(reporte.totales.general.cotizaciones).toBe(3);
    expect(reporte.detalle.some((d) => d.codigo === "COT-004")).toBe(false);
  });

  it("junta a la misma persona aunque el nombre venga escrito distinto", () => {
    expect(reporte.filas.filter((f) => /juan/i.test(f.usuario))).toHaveLength(1);
  });

  it("el equipo activo sale aunque este en cero, y el inactivo no", () => {
    expect(de("Ana Gómez").totales.total).toBe(0);
    expect(de("Pedro Ido")).toBeUndefined();
  });

  it("quien ya no esta en el equipo conserva el nombre guardado", () => {
    expect(de("Luisa Marín").totales.certificaciones).toBe(1);
  });

  it("los totales cuadran con el detalle", () => {
    expect(reporte.totales.general.total).toBe(6);
    expect(reporte.detalle).toHaveLength(6);
    const suma = reporte.filas.reduce((n, f) => n + f.totales.total, 0);
    expect(suma).toBe(6);
  });

  it("ordena por quien mas hizo y deja Sin registrar al final", () => {
    expect(reporte.filas[0].usuario).toBe("Juan Pérez");
    expect(reporte.filas.some((f) => f.usuario === SIN_REGISTRAR)).toBe(false);
  });

  it("un periodo sin documentos no revienta", () => {
    const vacio = armarReporteActividad({ ...DATOS, desde: "2020-01", hasta: "2020-02" });
    expect(vacio.totales.general.total).toBe(0);
    expect(vacio.detalle).toEqual([]);
    expect(armarReporteActividad().filas).toEqual([]);
  });

  it("da una linea por usuario y mes para el Excel", () => {
    const lineas = filasPorUsuarioYMes(reporte);
    expect(lineas).toHaveLength(reporte.filas.length * 2);
    expect(lineas.find((l) => l.usuario === "Juan Pérez" && l.mes === "2026-11").total).toBe(2);
  });
});

describe("visitas de la agenda", () => {
  const AGENDA = [
    { id: "AG-1", tipo: "visita", titulo: "Visita técnica", cliente: "ACME", fecha: "2026-11-10" },
    { id: "AG-2", tipo: "visita", cliente: "Beta", fecha: "2026-11-20", estado: "completado" },
    { id: "AG-3", tipo: "visita", cliente: "Gamma", fecha: "2026-10-05" },
    // No son visitas.
    { id: "AG-4", tipo: "llamada", cliente: "ACME", fecha: "2026-11-11" },
    { id: "ESP-1", tipo: "especial", fecha: "2026-11-12" },
    // Fuera del periodo y sin fecha.
    { id: "AG-5", tipo: "visita", fecha: "2026-02-01" },
    { id: "AG-6", tipo: "visita", fecha: "" },
  ];
  // El nombre de la cuenta viene sin tilde; es la misma persona de los documentos.
  const reporte = armarReporteActividad({ ...DATOS, agenda: AGENDA, agendaDe: "Camila Sepulveda" });
  const de = (nombre) => reporte.filas.find((f) => f.usuario === nombre);

  it("cuenta solo las visitas, en el mes para el que estan agendadas", () => {
    expect(de("Camila Sepúlveda").porMes["2026-11"].visitas).toBe(2);
    expect(de("Camila Sepúlveda").porMes["2026-10"].visitas).toBe(1);
    expect(reporte.totales.general.visitas).toBe(3);
  });

  it("las visitas suman al total, como las demas tareas", () => {
    expect(de("Camila Sepúlveda").totales.total).toBe(5);
    expect(reporte.totales.general.total).toBe(9);
    expect(reporte.detalle.filter((d) => d.tipo === "visitas")).toHaveLength(3);
  });

  it("quedan en la misma fila de sus documentos, no en una aparte", () => {
    expect(reporte.filas.filter((f) => /camila/i.test(f.usuario))).toHaveLength(1);
  });

  it("en los demas va sin dato, porque su agenda es privada", () => {
    expect(valorCasilla(de("Camila Sepúlveda"), de("Camila Sepúlveda").totales, "visitas")).toBe(3);
    expect(valorCasilla(de("Juan Pérez"), de("Juan Pérez").totales, "visitas")).toBe(SIN_DATO);
    expect(valorCasilla(de("Juan Pérez"), de("Juan Pérez").totales, "cotizaciones")).toBe(2);
    // El total general no es de nadie: siempre es la cifra.
    expect(valorCasilla(undefined, reporte.totales.general, "visitas")).toBe(3);
  });
});

describe("archivo de Excel", () => {
  const reporte = armarReporteActividad(DATOS);

  it("nombra el archivo con el periodo", () => {
    expect(nombreArchivoReporte(reporte, "xlsx")).toBe("Reporte-actividad-2026-10_a_2026-11.xlsx");
  });

  it("nombra las columnas mas alla de la Z", () => {
    expect([letraColumna(0), letraColumna(25), letraColumna(26)]).toEqual(["A", "Z", "AA"]);
  });

  it("arma un .xlsx valido con sus tres hojas", async () => {
    const hojas = hojasDelReporte(reporte, new Date("2026-11-12T15:00:00Z"));
    const bytes = await construirXlsx(hojas, "uint8array");
    const zip = await JSZip.loadAsync(bytes);

    const libro = await zip.file("xl/workbook.xml").async("string");
    expect(libro).toContain('name="Por usuario y mes"');
    expect(libro).toContain('name="Total por usuario"');
    expect(libro).toContain('name="Detalle"');

    const hoja1 = await zip.file("xl/worksheets/sheet1.xml").async("string");
    expect(hoja1).toContain("Juan Pérez");
    expect(hoja1).toContain("Noviembre 2026");
    // Las cifras van como numero, no como texto.
    expect(hoja1).toMatch(/<c r="H\d+"><v>2<\/v><\/c>/);
    // Sin agenda de nadie, las visitas van sin dato y no en cero.
    expect(hoja1).toMatch(/<c r="G\d+" t="inlineStr"><is><t xml:space="preserve">—<\/t>/);

    // Las fechas del detalle van como fecha de Excel (numero de serie con formato).
    const hoja3 = await zip.file("xl/worksheets/sheet3.xml").async("string");
    expect(hoja3).toMatch(/<c r="E2" s="4"><v>\d+<\/v><\/c>/);

    // XML bien formado en todas las partes.
    for (const [ruta, entrada] of Object.entries(zip.files)) {
      if (entrada.dir) continue;
      const xml = await zip.file(ruta).async("string");
      expect(xml.startsWith("<?xml")).toBe(true);
    }
  });

  it("escapa los caracteres que romperian el archivo", async () => {
    const bytes = await construirXlsx([{ nombre: "A/B", filas: [["Obra <1> & \"2\""]] }], "uint8array");
    const zip = await JSZip.loadAsync(bytes);
    expect(await zip.file("xl/worksheets/sheet1.xml").async("string")).toContain("Obra &lt;1&gt; &amp; &quot;2&quot;");
    expect(await zip.file("xl/workbook.xml").async("string")).toContain('name="A B"');
  });
});

describe("quien ve el reporte", () => {
  it("Camila si", () => {
    expect(puedeVerReporteActividad({ role: "admin", activo: true, nombre: "Camila Sepúlveda", email: "gerencia@empresa.co" })).toBe(true);
    expect(puedeVerReporteActividad({ role: "manager", activo: true, nombre: "", email: "camila@empresa.co" })).toBe(true);
  });

  it("otro administrador, un usuario normal y la cuenta de soporte no", () => {
    expect(puedeVerReporteActividad({ role: "admin", activo: true, nombre: "Admin", email: "admin@empresa.co" })).toBe(false);
    expect(puedeVerReporteActividad({ role: "operator", activo: true, nombre: "Juan Pérez", email: "juan@empresa.co" })).toBe(false);
    expect(puedeVerReporteActividad({ role: "admin", activo: true, nombre: "Cristian Flórez", email: "cristiandel48@gmail.com" })).toBe(false);
  });

  it("con la cuenta desactivada o sin sesion, tampoco", () => {
    expect(puedeVerReporteActividad({ role: "admin", activo: false, nombre: "Camila Sepúlveda" })).toBe(false);
    expect(puedeVerReporteActividad(null)).toBe(false);
  });
});
