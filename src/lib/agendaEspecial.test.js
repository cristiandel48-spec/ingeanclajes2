import { describe, expect, it } from "vitest";
import { esCamilaSepulveda } from "./agendaEspecial";

describe("solo Camila Sepúlveda", () => {
  it("la reconoce por correo o por nombre y apellido", () => {
    expect(esCamilaSepulveda({ email: "camilascadavid@gmail.com" })).toBe(true);
    expect(esCamilaSepulveda({ nombre: "Camila Sepúlveda" })).toBe(true);
    expect(esCamilaSepulveda({}, "CamilaScadavid@gmail.com")).toBe(true);
  });

  it("no deja pasar a otros Sepúlveda ni a la cuenta del sistema", () => {
    expect(esCamilaSepulveda({ nombre: "Jhon Jaime Sepúlveda Londoño" })).toBe(false);
    expect(esCamilaSepulveda({ email: "sistemasingeanclajes@gmail.com", nombre: "Sistemas" })).toBe(false);
    expect(esCamilaSepulveda({ nombre: "Camila Rojas" })).toBe(false);
    expect(esCamilaSepulveda(null)).toBe(false);
  });
});
