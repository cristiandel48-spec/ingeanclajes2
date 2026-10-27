import { describe, expect, it } from "vitest";
import { leerFacturaDian, montoTexto } from "./lectorFacturaDian";

describe("montoTexto", () => {
  it("lee montos en formato colombiano", () => {
    expect(montoTexto("$ 1.250.000")).toBe(1250000);
    expect(montoTexto("1.250.000,50")).toBe(1250000.5);
    expect(montoTexto("125.000")).toBe(125000);
  });

  it("lee montos en formato ingles", () => {
    expect(montoTexto("1,250,000.00")).toBe(1250000);
    expect(montoTexto("1250000.75")).toBe(1250000.75);
  });

  it("decimales sueltos y vacios", () => {
    expect(montoTexto("19,5")).toBe(19.5);
    expect(montoTexto("")).toBe(0);
    expect(montoTexto("abc")).toBe(0);
  });
});

describe("leerFacturaDian", () => {
  it("rechaza notas credito y debito con un mensaje claro", async () => {
    await expect(leerFacturaDian('<?xml version="1.0"?><CreditNote xmlns="x"><ID>NC-1</ID></CreditNote>'))
      .rejects.toThrow(/nota crédito/);
    await expect(leerFacturaDian('<?xml version="1.0"?><fe:DebitNote xmlns:fe="x"></fe:DebitNote>'))
      .rejects.toThrow(/nota débito/);
  });

  it("explica cuando el archivo no se puede leer", async () => {
    const roto = { text: () => Promise.reject(new Error("NotReadableError")) };
    await expect(leerFacturaDian(roto)).rejects.toThrow(/iCloud/);
  });
});
