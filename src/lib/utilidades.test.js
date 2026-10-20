import { afterEach, describe, expect, it, vi } from "vitest";
import { today } from "./format";
import { escapeHtml } from "./html";
import { numeroALetras } from "./numeroALetras";

describe("today", () => {
  afterEach(() => vi.useRealTimers());

  it("da la fecha de Colombia, no la de UTC, despues de las 7 p. m.", () => {
    vi.useFakeTimers();
    // 20 de octubre, 11:30 p. m. en Bogota = 21 de octubre en UTC
    vi.setSystemTime(new Date("2026-10-21T04:30:00Z"));
    expect(today()).toBe("2026-10-20");
  });
});

describe("escapeHtml", () => {
  it("neutraliza etiquetas y comillas en lo que se imprime", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;"
    );
    expect(escapeHtml("A & B")).toBe("A &amp; B");
    expect(escapeHtml(null)).toBe("null");
  });
});

describe("numeroALetras", () => {
  it("convierte valores en pesos", () => {
    expect(numeroALetras(0)).toBe("CERO PESOS M/CTE");
    expect(numeroALetras(1500)).toBe("MIL QUINIENTOS PESOS M/CTE");
    expect(numeroALetras(21000)).toBe("VEINTIÚN MIL PESOS M/CTE");
    expect(numeroALetras(100000)).toBe("CIEN MIL PESOS M/CTE");
    expect(numeroALetras(2000000)).toBe("DOS MILLONES DE PESOS M/CTE");
    expect(numeroALetras(1250300)).toBe("UN MILLÓN DOSCIENTOS CINCUENTA MIL TRESCIENTOS PESOS M/CTE");
  });

  it("redondea y no se rompe con valores raros", () => {
    expect(numeroALetras(999.6)).toBe("MIL PESOS M/CTE");
    expect(numeroALetras("abc")).toBe("CERO PESOS M/CTE");
  });
});
