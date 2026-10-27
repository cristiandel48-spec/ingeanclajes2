import { describe, expect, it } from "vitest";
import { cabeceraEsHeic, esHeic, motivoImagenNoLegible } from "./imagenes";

const cabecera = (marca) => new Uint8Array([0, 0, 0, 24, ..."ftyp".split("").map((c) => c.charCodeAt(0)), ...marca.split("").map((c) => c.charCodeAt(0)), 0, 0, 0, 0]);

describe("fotos HEIC", () => {
  it("las reconoce por tipo o por nombre", () => {
    expect(esHeic({ type: "image/heic", name: "foto" })).toBe(true);
    expect(esHeic({ type: "", name: "IMG_0001.HEIC" })).toBe(true);
    expect(esHeic({ type: "image/jpeg", name: "foto.jpg" })).toBe(false);
  });

  it("las reconoce por contenido aunque lleguen sin tipo ni extension", () => {
    expect(cabeceraEsHeic(cabecera("heic"))).toBe(true);
    expect(cabeceraEsHeic(cabecera("mif1"))).toBe(true);
    expect(cabeceraEsHeic(cabecera("isom"))).toBe(false);
    expect(cabeceraEsHeic(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe(false);
  });

  it("explica que hacer segun el problema", () => {
    expect(motivoImagenNoLegible({ name: "a.heic", type: "" })).toMatch(/HEIC/);
    expect(motivoImagenNoLegible({ name: "a.jpg" }, { ilegible: true })).toMatch(/iCloud/);
    expect(motivoImagenNoLegible({ name: "a.bmp", type: "image/bmp" })).toMatch(/JPG o PNG/);
  });
});
