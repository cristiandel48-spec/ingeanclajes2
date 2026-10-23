import { describe, expect, it } from "vitest";
import { clientesConQuienRecibe, destinatarioDeInforme, obraTieneQuienRecibe } from "./quienRecibe";

const obra = { id: "OB-001", cliente: "Constructora Prueba S.A.S.", nit: "900.111.222-3", ciudad: "MEDELLÍN" };

describe("quien recibe los informes", () => {
  it("una obra sin correo valido no tiene quien recibe", () => {
    expect(obraTieneQuienRecibe({ recibeEmail: "" })).toBe(false);
    expect(obraTieneQuienRecibe({ recibeEmail: "residente@" })).toBe(false);
    expect(obraTieneQuienRecibe({ recibeEmail: " Residente@Obra.com " })).toBe(true);
  });

  it("le pone el correo al cliente que no tenia", () => {
    const clientes = [{ id: "CLI-001", nombre: "CONSTRUCTORA PRUEBA S.A.S.", nit: "900.111.222-3", email: "", contacto: "" }];
    const r = clientesConQuienRecibe(clientes, obra, { nombre: "María Ruiz", email: "MRuiz@Prueba.com" });
    expect(r[0].email).toBe("mruiz@prueba.com");
    expect(r[0].contacto).toBe("María Ruiz");
  });

  it("no pisa el correo que el cliente ya tenia", () => {
    const clientes = [{ id: "CLI-001", nombre: "CONSTRUCTORA PRUEBA S.A.S.", nit: "", email: "gerencia@prueba.com" }];
    const r = clientesConQuienRecibe(clientes, obra, { nombre: "María Ruiz", email: "mruiz@prueba.com" });
    expect(r).toBe(clientes);
  });

  it("agrega el cliente si no esta en el directorio", () => {
    const r = clientesConQuienRecibe([{ id: "CLI-004", nombre: "OTRO" }], obra, { nombre: "maría ruiz", email: "mruiz@prueba.com" });
    expect(r).toHaveLength(2);
    expect(r[1]).toMatchObject({ id: "CLI-005", email: "mruiz@prueba.com", estado: "Activo" });
  });

  it("el informe toma primero el de la obra, luego la cotizacion y luego el directorio", () => {
    const clientes = [{ nombre: "CONSTRUCTORA PRUEBA S.A.S.", email: "dir@prueba.com", contacto: "Directorio" }];
    const cot = { contactoEmail: "cot@prueba.com", contacto: "Cotización" };
    expect(destinatarioDeInforme({ obra: { ...obra, recibeEmail: "obra@prueba.com" }, cotizacion: cot, clientes }).origen).toBe("obra");
    expect(destinatarioDeInforme({ obra, cotizacion: cot, clientes }).email).toBe("cot@prueba.com");
    expect(destinatarioDeInforme({ obra, cotizacion: null, clientes }).email).toBe("dir@prueba.com");
    expect(destinatarioDeInforme({ obra, cotizacion: null, clientes: [] }).email).toBe("");
  });
});
