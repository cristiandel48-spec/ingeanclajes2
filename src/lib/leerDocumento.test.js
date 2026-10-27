import { describe, expect, it } from "vitest";
import { mensajeErrorPdf, textoPlano } from "./leerDocumento";

describe("textoPlano", () => {
  it("lee UTF-8", () => {
    expect(textoPlano(new TextEncoder().encode("Bogotá, señor"))).toBe("Bogotá, señor");
  });

  it("relee como Windows-1252 cuando no es UTF-8", () => {
    // «Bogotá» guardado por el Bloc de notas viejo: la á es el byte 0xE1.
    const bytes = new Uint8Array([0x42, 0x6f, 0x67, 0x6f, 0x74, 0xe1]);
    expect(textoPlano(bytes)).toBe("Bogotá");
  });
});

describe("mensajeErrorPdf", () => {
  it("traduce los errores del archivo y deja pasar los demas", () => {
    expect(mensajeErrorPdf({ name: "PasswordException" })).toMatch(/contraseña/);
    expect(mensajeErrorPdf({ name: "InvalidPDFException" })).toMatch(/dañado/);
    expect(mensajeErrorPdf({ name: "Error" })).toBeNull();
    expect(mensajeErrorPdf(null)).toBeNull();
  });
});
