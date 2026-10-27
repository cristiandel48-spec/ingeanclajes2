import { describe, expect, it } from "vitest";
import { esCamilaSepulveda, filtrarAgendaPorPermiso, puedeQuitarEstrellita } from "./agendaEspecial";

const estrellita = { id: "ESP-1", tipo: "especial", fecha: "2026-10-30", usuarioId: "u-cristian" };
const visita = { id: "AG-1", tipo: "visita", fecha: "2026-10-30", usuarioId: "u-camila" };

describe("quitar estrellitas", () => {
  it("la quita quien la puso aunque la app no lo reconozca como Cristian", () => {
    expect(puedeQuitarEstrellita(estrellita, { miUserId: "u-cristian" })).toBe(true);
  });

  it("la quitan Cristian y un administrador", () => {
    expect(puedeQuitarEstrellita(estrellita, { esCristian: true })).toBe(true);
    expect(puedeQuitarEstrellita(estrellita, { esAdmin: true })).toBe(true);
  });

  it("Camila, que solo la recibe, no", () => {
    expect(puedeQuitarEstrellita(estrellita, { miUserId: "u-camila" })).toBe(false);
  });

  it("no aplica a compromisos normales", () => {
    expect(puedeQuitarEstrellita(visita, { esCristian: true })).toBe(false);
  });

  it("quien la puso la ve aunque no sea Cristian ni Camila; los demás no", () => {
    const lista = [estrellita, visita];
    expect(filtrarAgendaPorPermiso(lista, { miUserId: "u-cristian" })).toEqual(lista);
    expect(filtrarAgendaPorPermiso(lista, { miUserId: "u-otro" })).toEqual([visita]);
    expect(filtrarAgendaPorPermiso(lista, {})).toEqual([visita]);
  });
});

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
