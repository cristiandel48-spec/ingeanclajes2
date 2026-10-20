import { describe, expect, it } from "vitest";
import {
  entidadesSinPermiso,
  modulosPermitidos,
  puedeEscribirTabla,
  puedeVerPagoEmpleados,
  tieneAccesoTabla,
} from "./permisos";

const DUENO = { role: "admin", activo: true, email: "cristiandel48@gmail.com", modulos: null };
const ADMIN = { role: "admin", activo: true, email: "admin@empresa.co", modulos: null };
const CONTADOR = { role: "contador", activo: true, email: "c@empresa.co", modulos: [] };
const OPERATIVO = { role: "operator", activo: true, email: "o@empresa.co", modulos: ["obras", "horarios"] };
const CONSULTA = { role: "viewer", activo: true, email: "v@empresa.co", modulos: ["obras"] };

describe("modulos visibles", () => {
  it("la auditoria solo la ve el dueño", () => {
    expect(modulosPermitidos(DUENO)).toContain("auditoria");
    expect(modulosPermitidos(ADMIN)).not.toContain("auditoria");
  });

  it("el administrador ve usuarios y el dashboard", () => {
    expect(modulosPermitidos(ADMIN)).toEqual(expect.arrayContaining(["usuarios", "dashboard"]));
  });

  it("los demas ven lo marcado mas sus tareas", () => {
    expect(modulosPermitidos(OPERATIVO).sort()).toEqual(["horarios", "obras", "tareas"]);
  });

  it("usuarios y dashboard no se conceden marcando la casilla", () => {
    const m = { ...OPERATIVO, modulos: ["obras", "usuarios", "dashboard", "auditoria"] };
    expect(modulosPermitidos(m).sort()).toEqual(["obras", "tareas"]);
  });

  it("una cuenta desactivada no ve nada", () => {
    expect(modulosPermitidos({ ...ADMIN, activo: false })).toEqual([]);
    expect(modulosPermitidos(null)).toEqual([]);
  });
});

describe("permisos sobre tablas (deben coincidir con las migraciones 063, 069 y 070)", () => {
  it("pagos y contabilidad solo con su modulo", () => {
    expect(tieneAccesoTabla(OPERATIVO, "pagos")).toBe(false);
    expect(tieneAccesoTabla({ ...OPERATIVO, modulos: ["pagos"] }, "pagos")).toBe(true);
    expect(tieneAccesoTabla(CONTADOR, "asientos_contables")).toBe(true);
  });

  it("cada tabla solo se modifica desde sus modulos", () => {
    expect(puedeEscribirTabla(OPERATIVO, "obras")).toBe(true);
    expect(puedeEscribirTabla(OPERATIVO, "horarios")).toBe(true);
    expect(puedeEscribirTabla(OPERATIVO, "certificaciones")).toBe(false);
    expect(puedeEscribirTabla(OPERATIVO, "agenda")).toBe(false);
  });

  it("el rol Consulta no modifica nada", () => {
    expect(puedeEscribirTabla(CONSULTA, "obras")).toBe(false);
  });

  it("el administrador y el contador modifican todo", () => {
    expect(entidadesSinPermiso(ADMIN)).toEqual([]);
    expect(entidadesSinPermiso(CONTADOR)).toEqual([]);
  });

  it("el autoguardado salta lo que la persona no puede modificar", () => {
    const sin = entidadesSinPermiso(OPERATIVO);
    expect(sin).toEqual(expect.arrayContaining(["pagos", "certificaciones", "agenda", "nominas_generadas"]));
    expect(sin).not.toContain("obras");
    expect(sin).not.toContain("empleados");
  });

  it("salarios y cuentas solo con el modulo Personal", () => {
    expect(puedeVerPagoEmpleados(OPERATIVO)).toBe(false);
    expect(puedeVerPagoEmpleados({ ...OPERATIVO, modulos: ["nomina"] })).toBe(true);
    expect(puedeVerPagoEmpleados(CONTADOR)).toBe(true);
    expect(puedeVerPagoEmpleados({ ...ADMIN, activo: false })).toBe(false);
  });
});
