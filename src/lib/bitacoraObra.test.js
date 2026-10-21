import { describe, expect, it } from "vitest";
import { calcularAvanceObra, maximoParaJornada } from "./bitacoraObra";

const jornada = (id, fecha, avance) => ({ id, fecha, avance, avanceObligatorio: true, fotos: [] });

describe("avance de la obra", () => {
  it("suma lo que avanzo cada jornada (OB-038: 26% + 30% = 56%)", () => {
    const r = calcularAvanceObra(0, [jornada("a", "2026-10-08", 26), jornada("b", "2026-10-13", 30)]);
    expect(r.avance).toBe(56);
    expect(r.jornadas).toBe(56);
    expect(r.fecha).toBe("2026-10-13");
  });

  it("parte del avance inicial con el que entro la obra", () => {
    const r = calcularAvanceObra(40, [jornada("a", "2026-10-08", 10)]);
    expect(r.avance).toBe(50);
    expect(r.inicial).toBe(40);
  });

  it("sin jornadas con avance queda el inicial", () => {
    expect(calcularAvanceObra(35, []).avance).toBe(35);
    expect(calcularAvanceObra(35, [{ id: "x", fecha: "2026-10-01", avance: null, fotos: [] }]).fecha).toBeNull();
  });

  it("nunca pasa de 100%", () => {
    expect(calcularAvanceObra(80, [jornada("a", "2026-10-08", 30)]).avance).toBe(100);
  });

  it("el maximo de una jornada es lo que falta, sin contarse a si misma", () => {
    const bitacora = [jornada("a", "2026-10-08", 26), jornada("b", "2026-10-13", 30)];
    expect(maximoParaJornada(0, bitacora, "b")).toBe(74);
    expect(maximoParaJornada(0, bitacora, null)).toBe(44);
    expect(maximoParaJornada(40, bitacora, null)).toBe(4);
  });
});
