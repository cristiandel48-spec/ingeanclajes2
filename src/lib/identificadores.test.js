import { describe, expect, it } from "vitest";
import { obrasMasNuevasPrimero, siguienteIdUnico } from "./identificadores";

describe("siguienteIdUnico", () => {
  it("sigue al mayor consecutivo", () => {
    expect(siguienteIdUnico([{ id: "COT-001" }, { id: "COT-002" }], "COT")).toBe("COT-003");
  });

  it("no reutiliza un numero despues de borrar un registro", () => {
    // Antes se contaba la lista: con COT-001 borrado salia COT-003 y pisaba al que ya estaba.
    expect(siguienteIdUnico([{ id: "COT-002" }, { id: "COT-003" }], "COT")).toBe("COT-004");
  });

  it("lista vacia empieza en 1 con el ancho pedido", () => {
    expect(siguienteIdUnico([], "OB")).toBe("OB-001");
    expect(siguienteIdUnico(null, "CERT", 4)).toBe("CERT-0001");
  });

  it("ignora los ids de otro prefijo", () => {
    expect(siguienteIdUnico([{ id: "OB-030" }, { id: "COT-099" }], "OB")).toBe("OB-031");
  });
});

describe("obrasMasNuevasPrimero", () => {
  it("ordena por consecutivo descendente sin cambiar la lista original", () => {
    const obras = [{ id: "OB-002" }, { id: "OB-010" }, { id: "OB-001" }];
    expect(obrasMasNuevasPrimero(obras).map((o) => o.id)).toEqual(["OB-010", "OB-002", "OB-001"]);
    expect(obras[0].id).toBe("OB-002");
  });
});
