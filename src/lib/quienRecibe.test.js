import { describe, expect, it } from "vitest";
import { claveRazonSocial, clienteDeObra, clientesConQuienRecibe, destinatarioDeInforme, obraTieneQuienRecibe, obrasConContactoDeCliente, quienRecibeDeCliente } from "./quienRecibe";

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

  it("lo escrito en la obra actualiza la ficha del cliente", () => {
    const clientes = [{ id: "CLI-001", nombre: "CONSTRUCTORA PRUEBA S.A.S.", nit: "", email: "gerencia@prueba.com", contacto: "Gerencia", telefono: "3000000000" }];
    const r = clientesConQuienRecibe(clientes, obra, { nombre: "María Ruiz", email: "mruiz@prueba.com", telefono: "317 667 5114", documento: "10203040", cargo: "Residente" });
    expect(r[0]).toMatchObject({ email: "mruiz@prueba.com", contacto: "María Ruiz", telefono: "3176675114", contactoCedula: "10203040", contactoCargo: "RESIDENTE" });
    expect(clientesConQuienRecibe(r, obra, { nombre: "María Ruiz", email: "mruiz@prueba.com" })).toBe(r);
  });

  it("la obra toma el contacto del cliente y un cambio en Clientes llega a sus obras", () => {
    const cli = { nombre: "CONSTRUCTORA PRUEBA S.A.S.", nit: "900.111.222-3", email: "mateo@prueba.com", contacto: "Mateo Betancur", telefono: "3176675114" };
    expect(quienRecibeDeCliente([cli], obra)).toEqual({ nombre: "Mateo Betancur", email: "mateo@prueba.com", telefono: "3176675114", documento: "", cargo: "" });
    const obras = [
      { ...obra, recibeEmail: "mateo@prueba.com", recibeNombre: "Mateo Betancur" },
      { ...obra, id: "OB-002", recibeEmail: "" },
      { ...obra, id: "OB-003", recibeEmail: "otra.persona@prueba.com" },
      { id: "OB-004", cliente: "OTRO CLIENTE", recibeEmail: "" },
    ];
    const r = obrasConContactoDeCliente(obras, cli, { ...cli, email: "nuevo@prueba.com", contacto: "Ana Pérez" });
    expect(r.map((o) => o.recibeEmail)).toEqual(["nuevo@prueba.com", "nuevo@prueba.com", "otra.persona@prueba.com", ""]);
  });

  it("agrega el cliente si no esta en el directorio", () => {
    const r = clientesConQuienRecibe([{ id: "CLI-004", nombre: "OTRO" }], obra, { nombre: "maría ruiz", email: "mruiz@prueba.com" });
    expect(r).toHaveLength(2);
    expect(r[1]).toMatchObject({ id: "CLI-005", email: "mruiz@prueba.com", estado: "Activo" });
  });

  // El caso de la obra OB-046: el correo quedo guardado en la obra y la ficha
  // del cliente se quedo sin el. Al abrir la obra, lo que ella sabe sube al
  // directorio, que es de donde salen los informes y las certificaciones.
  it("lo que tiene la obra rellena la ficha del cliente que se quedo vacia", () => {
    const obraConDatos = {
      ...obra,
      recibeNombre: "Wilson Alzate",
      recibeEmail: "profesionalsst@inteckno.com",
      recibeCargo: "PROFESIONAL SST",
      tel: "3192315246",
    };
    const fichaVacia = [{ id: "CLI-001", nombre: "CONSTRUCTORA PRUEBA S.A.S.", nit: "900.111.222-3", email: "", contacto: "Wilson Alzate" }];
    const r = clientesConQuienRecibe(fichaVacia, obraConDatos, {
      nombre: obraConDatos.recibeNombre,
      email: obraConDatos.recibeEmail,
      telefono: obraConDatos.tel,
      cargo: obraConDatos.recibeCargo,
    });
    expect(r[0]).toMatchObject({
      email: "profesionalsst@inteckno.com",
      contacto: "Wilson Alzate",
      contactoCargo: "PROFESIONAL SST",
    });

    // Y al volver a pasar lo mismo devuelve LA MISMA lista, que es lo que
    // impide que el relleno automatico se repita en bucle al abrir la obra.
    const otraVez = clientesConQuienRecibe(r, obraConDatos, {
      nombre: obraConDatos.recibeNombre,
      email: obraConDatos.recibeEmail,
      telefono: obraConDatos.tel,
      cargo: obraConDatos.recibeCargo,
    });
    expect(otraVez).toBe(r);
  });

  it("rellenar desde la obra no pisa el correo que la ficha ya tenia", () => {
    const ficha = [{ id: "CLI-001", nombre: "CONSTRUCTORA PRUEBA S.A.S.", nit: "900.111.222-3", email: "gerencia@prueba.com", contacto: "Gerencia" }];
    const r = clientesConQuienRecibe(ficha, { ...obra, recibeEmail: "" }, { nombre: "", email: "", telefono: "", cargo: "PROFESIONAL SST" });
    expect(r[0].email).toBe("gerencia@prueba.com");
    expect(r[0].contacto).toBe("Gerencia");
    expect(r[0].contactoCargo).toBe("PROFESIONAL SST");
  });

  // La obra decia «INTECKNO» y la ficha «INTECKNO S.A.S»: no se reconocian, y
  // el acta salia sin NIT ni correo de facturacion teniendolos guardados.
  describe("encontrar la ficha cuando el nombre esta escrito distinto", () => {
    const ficha = {
      id: "CLI-009", nombre: "INTECKNO S.A.S", nit: "901166216-5",
      email: "profesionalsst@inteckno.com", contacto: "Wilson Alzate",
    };

    it("la forma juridica no cambia a que empresa se refiere", () => {
      expect(claveRazonSocial("INTECKNO S.A.S")).toBe("INTECKNO");
      expect(claveRazonSocial("INTECKNO")).toBe("INTECKNO");
      expect(claveRazonSocial("Constructora Prueba Ltda.")).toBe("CONSTRUCTORA PRUEBA");
      expect(claveRazonSocial("Gómez y Cía S.A.")).toBe("GOMEZ");
      // Una empresa que se llame asi de verdad no se queda sin nombre.
      expect(claveRazonSocial("SAS")).toBe("SAS");
    });

    it("la obra sin S.A.S encuentra la ficha igual", () => {
      expect(clienteDeObra([ficha], { cliente: "INTECKNO" })).toBe(ficha);
      expect(clienteDeObra([ficha], { cliente: "Inteckno s.a.s" })).toBe(ficha);
    });

    it("el NIT manda sobre el nombre", () => {
      const otra = { id: "CLI-010", nombre: "INTECKNO", nit: "800000000-1" };
      expect(clienteDeObra([otra, ficha], { cliente: "INTECKNO", nit: "901166216-5" })).toBe(ficha);
    });

    it("empresas distintas no se confunden", () => {
      expect(clienteDeObra([ficha], { cliente: "INTECNO" })).toBeNull();
      expect(clienteDeObra([ficha], { cliente: "OTRA EMPRESA S.A.S" })).toBeNull();
    });
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
