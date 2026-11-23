import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

// El aviso lee la sesion del contexto de la aplicacion; aqui se finge para
// pintarlo como lo veria cada persona.
let sesion = {};
vi.mock("../context/AppDataContext", () => ({ useAppData: () => sesion }));
vi.mock("./ui", () => ({
  Button: ({ children }) => <button type="button">{children}</button>,
  useToast: () => ({ exito: () => {} }),
}));

import AvisoFirmaCoordinador from "./AvisoFirmaCoordinador";

const EMPLEADOS = [
  { id: "E01", nombre: "Yesli Paola Escobar Sanchez", cargo: "COORDINADORA SST", activo: true },
  { id: "E16", nombre: "Richard Javier Buelvas Mendoza", cargo: "COORDINADOR SST", activo: true },
];

const pintar = (membresia, empresaConfig = []) => {
  sesion = {
    membresia,
    authUserEmail: membresia.email,
    empleados: EMPLEADOS,
    empresaConfig,
    setEmpresaConfig: () => {},
    nubeLista: true,
  };
  return renderToStaticMarkup(<AvisoFirmaCoordinador />);
};

describe("AvisoFirmaCoordinador", () => {
  beforeEach(() => { sesion = {}; });

  it("a Richard Buelvas le muestra el recordatorio y lo trata de coordinador", () => {
    const html = pintar({ nombre: "Richard Buelvas", email: "richard@prueba.local", role: "manager" });
    expect(html).toContain("Richard, todavía falta tu firma");
    expect(html).toContain("Se necesita para imprimirla en el Informe de Actividades");
    expect(html).toContain("COORDINADOR SST");
    expect(html).toContain("coordinador en obra");
    expect(html).not.toMatch(/coordinadora/i);
  });

  it("a otra coordinadora sin firma le sale el aviso de siempre, sin el recordatorio", () => {
    const html = pintar({ nombre: "Paola Escobar", email: "paola@prueba.local", role: "manager" });
    expect(html).toContain("Hola, Paola Escobar");
    expect(html).toContain("coordinadora en obra");
    expect(html).not.toContain("todavía falta tu firma");
  });

  it("no le sale a quien no es coordinador", () => {
    expect(pintar({ nombre: "Camila Sepulveda", email: "camila@prueba.local", role: "admin" })).toBe("");
  });
});
