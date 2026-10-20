import { describe, expect, it } from "vitest";
import {
  NOMINA_CO_2026,
  buildNominaPeriodo,
  calcularDiasNominaPeriodo,
  calcularParafiscales,
  calcularResumenNominaEmpleado,
  calcularValorHoraBase,
  calcularValorHoraRecargo,
} from "./index";

// El divisor de horas y el criterio de liquidacion estan en revision con el
// contador (hallazgos F6 y F7): estas pruebas no fijan esos valores, solo lo
// que no esta en discusion.

describe("periodos de nomina", () => {
  it("primera quincena: del 1 al 15", () => {
    const p = buildNominaPeriodo("2026-03", "primera");
    expect(p.startIso).toBe("2026-03-01");
    expect(p.endIso).toBe("2026-03-15");
    expect(p.diasReferencia).toBe(15);
  });

  it("segunda quincena de febrero: del 16 al 28", () => {
    const p = buildNominaPeriodo("2026-02", "segunda");
    expect(p.endIso).toBe("2026-02-28");
    expect(p.diasReferencia).toBe(13);
  });

  it("cuenta solo los dias trabajados dentro del periodo", () => {
    const p = buildNominaPeriodo("2026-03", "primera");
    expect(calcularDiasNominaPeriodo({ fechaIngreso: "2026-03-11" }, p)).toBe(5);
    expect(calcularDiasNominaPeriodo({ fechaIngreso: "2026-01-01", fechaSalida: "2026-03-04" }, p)).toBe(4);
    expect(calcularDiasNominaPeriodo({ fechaIngreso: "2026-04-01" }, p)).toBe(0);
  });
});

describe("resumen de nomina de un empleado", () => {
  it("quincena completa sin auxilio de transporte", () => {
    const p = buildNominaPeriodo("2026-03", "primera");
    const r = calcularResumenNominaEmpleado({ salario: 4000000, fechaIngreso: "2025-01-01" }, p);
    expect(r.salario).toBe(2000000);
    expect(r.aplicaAuxilio).toBe(false);
    expect(r.auxilioTransporte).toBe(0);
    expect(r.salud).toBe(80000);
    expect(r.pension).toBe(80000);
    expect(r.neto).toBe(1840000);
  });

  it("hasta dos salarios minimos recibe auxilio de transporte", () => {
    const r = calcularResumenNominaEmpleado({ salario: NOMINA_CO_2026.salarioMinimo });
    expect(r.aplicaAuxilio).toBe(true);
    expect(r.auxilioTransporte).toBe(NOMINA_CO_2026.auxilioTransporte);
    // El auxilio no entra en la base de salud y pension.
    expect(r.baseSaludPension).toBe(NOMINA_CO_2026.salarioMinimo);
  });

  it("descuenta las deducciones personalizadas", () => {
    const r = calcularResumenNominaEmpleado({
      salario: 4000000,
      deduccionesPersonalizadas: [{ id: "d1", concepto: "Prestamo", valor: 100000 }],
    });
    expect(r.otrasDeducciones).toBe(100000);
    expect(r.neto).toBe(4000000 - 160000 - 160000 - 100000);
  });

  it("suma las horas extra del periodo y no las de otros", () => {
    const p = buildNominaPeriodo("2026-03", "primera");
    const empleado = {
      salario: 4000000,
      horasExtrasPorObra: [
        { fecha: "2026-03-10", horas: 2, tipoRecargo: "recNocturno" },
        { fecha: "2026-03-20", horas: 5, tipoRecargo: "recNocturno" },
      ],
    };
    const r = calcularResumenNominaEmpleado(empleado, p);
    expect(r.horasExtras).toBe(2 * calcularValorHoraRecargo(empleado, "recNocturno", "2026-03-10"));
  });
});

describe("recargos", () => {
  const empleado = { salario: 4000000 };
  const base = calcularValorHoraBase(empleado);

  it("nocturno: 135 % de la hora", () => {
    expect(calcularValorHoraRecargo(empleado, "recNocturno", "2026-03-10")).toBe(Math.round(base * 1.35));
  });

  it("dominical sube de 180 % a 190 % en julio de 2026", () => {
    expect(calcularValorHoraRecargo(empleado, "recDominical", "2026-06-28")).toBe(Math.round(base * 1.8));
    expect(calcularValorHoraRecargo(empleado, "recDominical", "2026-07-05")).toBe(Math.round(base * 1.9));
  });

  it("valor manual cuando el recargo no tiene porcentaje", () => {
    expect(calcularValorHoraRecargo(empleado, "horaExtraManual", "2026-03-10", 25000)).toBe(25000);
  });
});

describe("prestaciones", () => {
  it("un año completo (360 dias) sin auxilio", () => {
    const pf = calcularParafiscales({ salario: 4000000, fechaIngreso: "2026-01-01", fechaSalida: "2026-12-26" });
    expect(pf.diasTrabajados).toBe(360);
    expect(pf.cesantias).toBe(4000000);
    expect(pf.interesesCesantias).toBe(480000);
    expect(pf.prima).toBe(4000000);
    expect(pf.vacacionesDias).toBe(15);
    expect(pf.vacacionesValor).toBe(2000000);
  });

  it("con auxilio, cesantias y prima lo incluyen; vacaciones no", () => {
    const salario = NOMINA_CO_2026.salarioMinimo;
    const pf = calcularParafiscales({ salario, fechaIngreso: "2026-01-01", fechaSalida: "2026-12-26" });
    expect(pf.cesantias).toBe(salario + NOMINA_CO_2026.auxilioTransporte);
    expect(pf.prima).toBe(salario + NOMINA_CO_2026.auxilioTransporte);
    expect(pf.vacacionesValor).toBe(Math.round(salario / 2));
  });

  it("sin fecha de ingreso no hay nada que liquidar", () => {
    expect(calcularParafiscales({ salario: 4000000 }).totalLiquidacion).toBe(0);
  });
});
