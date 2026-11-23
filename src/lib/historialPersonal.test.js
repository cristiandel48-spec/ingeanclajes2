import { describe, expect, it } from "vitest";
import {
  armarHistorial,
  horarioLegible,
  rangoEsteMes,
  rangoMesPasado,
  rangoUltimosDias,
  tituloPeriodoHistorial,
} from "./historialPersonal";
import { hojasDelHistorial, nombreArchivoHistorial } from "./historialPersonalExport";

const OBRAS = [
  { id: "OB-1", cliente: "Dunkin Donuts", proyecto: "Dunkin Donuts", direccion: "Calle 61A", ciudad: "Medellín" },
  { id: "OB-2", cliente: "Colombiana de Comercio", proyecto: "Corbeta", direccion: "El Poblado", ciudad: "Medellín" },
];
const EMPLEADOS = [
  { id: "E1", nombre: "Wladimir Celestino", cargo: "INSTALADOR" },
  { id: "E2", nombre: "Ana Ruiz", cargo: "SST" },
];
const turno = (empleadoId, obraId, fecha, extra = {}) => ({
  id: `${empleadoId}${obraId}${fecha}${extra.turno || ""}`,
  empleadoId, obraId, fecha, turno: "07:00 - 17:00", tarea: "Instalación", ...extra,
});

describe("rangos de fechas", () => {
  it("el mes pasado va del primer al último día del mes anterior", () => {
    expect(rangoMesPasado("2026-11-23")).toEqual({ desde: "2026-10-01", hasta: "2026-10-31" });
  });

  it("en enero, el mes pasado es diciembre del año anterior", () => {
    expect(rangoMesPasado("2027-01-05")).toEqual({ desde: "2026-12-01", hasta: "2026-12-31" });
  });

  it("este mes llega hasta su último día, también en febrero", () => {
    expect(rangoEsteMes("2027-02-10")).toEqual({ desde: "2027-02-01", hasta: "2027-02-28" });
  });

  it("los últimos 7 días cuentan hoy", () => {
    expect(rangoUltimosDias("2026-11-23", 7)).toEqual({ desde: "2026-11-17", hasta: "2026-11-23" });
  });

  it("titula un mes entero con su nombre y un rango suelto con las dos fechas", () => {
    expect(tituloPeriodoHistorial("2026-10-01", "2026-10-31")).toBe("Octubre de 2026");
    expect(tituloPeriodoHistorial("2026-10-28", "2026-11-03")).toBe("28 de octubre de 2026 al 3 de noviembre de 2026");
  });
});

describe("horarioLegible", () => {
  it("pasa el turno a 12 horas", () => {
    expect(horarioLegible("07:30 - 17:00")).toBe("7:30 AM – 5:00 PM");
  });

  it("deja tal cual lo que no es un rango de horas", () => {
    expect(horarioLegible("Turno completo")).toBe("Turno completo");
  });
});

describe("armarHistorial", () => {
  const horarios = [
    turno("E1", "OB-1", "2026-10-05"),
    turno("E1", "OB-2", "2026-10-06"),
    turno("E2", "OB-2", "2026-10-06"),
    turno("E1", "OB-1", "2026-11-02"), // fuera de octubre
  ];
  const base = { horarios, obras: OBRAS, empleados: EMPLEADOS, desde: "2026-10-01", hasta: "2026-10-31" };

  it("solo trae lo que cae dentro del rango, con los extremos incluidos", () => {
    const h = armarHistorial(base);
    expect(h.registros.map((r) => r.fecha)).toEqual(["2026-10-05", "2026-10-06", "2026-10-06"]);
    expect(armarHistorial({ ...base, desde: "2026-10-06", hasta: "2026-10-06" }).registros).toHaveLength(2);
  });

  it("cuenta personas, días, obras y asistencias", () => {
    expect(armarHistorial(base).totales).toEqual({ asistencias: 3, personas: 2, dias: 2, obras: 2 });
  });

  it("por persona: en orden alfabético, con sus días y obras", () => {
    const [ana, wladimir] = armarHistorial(base).porPersona;
    expect(ana.persona).toBe("Ana Ruiz");
    expect(wladimir).toMatchObject({ persona: "Wladimir Celestino", dias: 2, obras: 2 });
    expect(wladimir.registros.map((r) => r.obraTexto)).toEqual(["Dunkin Donuts", "Colombiana de Comercio · Corbeta"]);
  });

  it("por día: cada obra con la gente que fue", () => {
    const dia = armarHistorial(base).porDia.find((d) => d.fecha === "2026-10-06");
    expect(dia.dia).toBe("Martes");
    expect(dia.personas).toBe(2);
    expect(dia.obras).toHaveLength(1);
    expect(dia.obras[0].personas).toEqual(["Ana Ruiz", "Wladimir Celestino"]);
  });

  it("dos turnos de la misma persona en la misma obra y día son una sola asistencia", () => {
    const h = armarHistorial({
      ...base,
      horarios: [
        turno("E1", "OB-1", "2026-10-05", { turno: "07:00 - 12:00", tarea: "Instalación" }),
        turno("E1", "OB-1", "2026-10-05", { turno: "13:00 - 17:00", tarea: "Entrega" }),
      ],
    });
    expect(h.registros).toHaveLength(1);
    expect(h.registros[0].actividad).toBe("Instalación / Entrega");
    expect(h.registros[0].horario).toBe("7:00 AM – 12:00 PM / 1:00 PM – 5:00 PM");
    expect(h.porPersona[0].dias).toBe(1);
  });

  it("filtra por persona y por obra", () => {
    expect(armarHistorial({ ...base, empleadoId: "E2" }).registros).toHaveLength(1);
    const soloObra = armarHistorial({ ...base, obraId: "OB-2" });
    expect(soloObra.registros).toHaveLength(2);
    expect(soloObra.soloObra).toBe("Colombiana de Comercio · Corbeta");
  });

  it("usa la dirección corregida a mano en el turno antes que la de la obra", () => {
    const h = armarHistorial({
      ...base,
      horarios: [turno("E1", "OB-1", "2026-10-05", { direccion: "Carrera 65 # 8B-91" })],
    });
    expect(h.registros[0].direccion).toBe("Carrera 65 # 8B-91");
    expect(armarHistorial(base).registros[0].direccion).toBe("Calle 61A, Medellín");
  });

  it("no se rompe con un trabajador o una obra que ya no existen", () => {
    const h = armarHistorial({ ...base, horarios: [turno("E9", "OB-9", "2026-10-07")] });
    expect(h.registros[0]).toMatchObject({ persona: "Trabajador retirado", cliente: "Obra eliminada" });
  });

  it("entiende el rango aunque las fechas vengan al revés", () => {
    expect(armarHistorial({ ...base, desde: "2026-10-31", hasta: "2026-10-01" }).registros).toHaveLength(3);
  });

  describe("libro de Excel", () => {
    const historial = armarHistorial(base);
    const [porPersona, porDia, resumen] = hojasDelHistorial(historial, new Date("2026-11-23T15:00:00Z"));
    const datos = (hoja) => hoja.filas.slice(hoja.filasFijas);

    it("trae las tres hojas con el período en la cabecera", () => {
      expect([porPersona.nombre, porDia.nombre, resumen.nombre]).toEqual(["Por persona", "Por día", "Resumen"]);
      expect(porPersona.filas[1][0].v).toContain("Octubre de 2026");
      expect(porPersona.filas[1][0].v).toContain("Todo el personal · Todas las obras");
    });

    it("Por persona: una fila por asistencia, con el nombre en cada una", () => {
      expect(datos(porPersona)).toHaveLength(3);
      expect(datos(porPersona).map((f) => f[0])).toEqual(["Ana Ruiz", "Wladimir Celestino", "Wladimir Celestino"]);
      expect(datos(porPersona)[0][2]).toEqual({ v: "2026-10-06", s: "fecha" });
    });

    it("Por día: una fila por obra, con sus trabajadores juntos", () => {
      expect(datos(porDia)).toHaveLength(2);
      expect(datos(porDia)[1].slice(5, 7)).toEqual([2, "Ana Ruiz, Wladimir Celestino"]);
    });

    it("Resumen: días y obras por persona, y el total al final", () => {
      const filas = datos(resumen);
      expect(filas[1].slice(0, 4)).toEqual(["Wladimir Celestino", "INSTALADOR", 2, 2]);
      expect(filas.at(-1)[2]).toEqual({ v: 3, s: "negrita" });
    });

    it("nombra el archivo con el período y, si se filtró, con la persona", () => {
      expect(nombreArchivoHistorial(historial, "xlsx")).toBe("Historial-personal-2026-10-01_a_2026-10-31.xlsx");
      expect(nombreArchivoHistorial(armarHistorial({ ...base, empleadoId: "E2" }), "pdf")).toMatch(/^Historial-personal-Ana.*2026-10-01_a_2026-10-31\.pdf$/);
    });
  });
});
