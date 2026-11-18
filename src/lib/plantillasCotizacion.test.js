import { describe, expect, it } from "vitest";
import { ITEMS_DB } from "../data/seed";
import {
  PLANTILLAS,
  armarDesdePlantilla,
  camposFaltantes,
  camposVisibles,
  plantillaPorId,
  valoresIniciales,
} from "./plantillasCotizacion";

const armar = (id, cambios = {}, catalogo = ITEMS_DB) => {
  const p = plantillaPorId(id);
  return armarDesdePlantilla(p, { ...valoresIniciales(p), ...cambios }, catalogo);
};
const cant = (borrador, desc) => borrador.items.find((i) => i.desc === desc)?.cant;

describe("plantillas de cotización", () => {
  it("todas sus servicios existen en el catálogo semilla con los valores por defecto", () => {
    for (const p of PLANTILLAS) {
      const todoEncendido = Object.fromEntries(
        p.campos.map((c) => [c.id, c.tipo === "si_no" ? true : c.tipo === "numero" ? 3 : c.defecto]),
      );
      const b = armarDesdePlantilla(p, todoEncendido, ITEMS_DB);
      expect(b.fuera, p.id).toEqual([]);
      expect(b.items.length, p.id).toBeGreaterThan(0);
    }
  });

  it("línea horizontal: metros, conexión y anclajes con su tipo", () => {
    const b = armar("linea_horizontal", { metros: 45, metrosConexion: 6, anclajes: 4, tipoAnclaje: "PUNTO DE ANCLAJE SOLDADO" });
    expect(cant(b, "LINEA DE VIDA HORIZONTAL")).toBe(45);
    expect(cant(b, "LINEA DE VIDA CONEXION / TRANSVERSAL")).toBe(6);
    expect(cant(b, "PUNTO DE ANCLAJE SOLDADO")).toBe(4);
    expect(b.tipo).toBe("linea_vida");
    expect(b.alcance).toContain("45 ML");
    expect(b.items.find((i) => i.desc === "LINEA DE VIDA HORIZONTAL").vu).toBe(280000);
  });

  it("no agrega lo que quedó en cero ni lo que no se marcó", () => {
    const b = armar("linea_horizontal", { metros: 10 });
    expect(b.items.map((i) => i.desc)).toEqual(["LINEA DE VIDA HORIZONTAL"]);
  });

  it("línea camionera: postes y dados salen de los metros y la separación", () => {
    const b = armar("linea_camionera", { metros: 30, separacion: 12, puestos: 2 });
    // 30/12 = 2,5 -> 3 tramos -> 4 postes
    expect(cant(b, "POSTE TIPO CUELLO DE CISNE CON PEDESTAL")).toBe(4);
    expect(cant(b, "DADO DE CIMENTACION EN CONCRETO PARA POSTE")).toBe(4);
    expect(cant(b, "CARRO DESLIZANTE PARA LINEA DE VIDA CAMIONERA")).toBe(2);
    expect(cant(b, "LINEA AUTORRETRACTIL PARA LINEA DE VIDA CAMIONERA")).toBe(2);
    expect(cant(b, "CERTIFICACION DE LINEA DE VIDA CAMIONERA")).toBe(1);
  });

  it("avisa de los servicios sin precio en el catálogo", () => {
    const b = armar("linea_camionera", { metros: 12 });
    expect(b.avisos.join(" ")).toMatch(/no tienen? precio/);
  });

  it("deja fuera y avisa lo que no está en el catálogo", () => {
    const sinEscaleras = ITEMS_DB.filter((g) => g.categoria !== "Escaleras");
    const b = armar("escalera", { altura: 8 }, sinEscaleras);
    expect(b.items).toEqual([]);
    expect(b.fuera).toHaveLength(1);
    expect(b.avisos.join(" ")).toMatch(/quedaron fuera/);
  });

  it("recertificación: por metro o global", () => {
    expect(cant(armar("recertificacion", { modo: "metro", metros: 60 }), "RECERTIFICACION LINEA DE VIDA")).toBe(60);
    const global = armar("recertificacion", { modo: "global", metros: 60 });
    expect(cant(global, "RECERTIFICACION ANUAL")).toBe(1);
    expect(cant(global, "RECERTIFICACION LINEA DE VIDA")).toBeUndefined();
  });

  it("acepta decimales con coma y redondea a un decimal", () => {
    expect(cant(armar("linea_vertical", { metros: "7,25" }), "LINEA DE VIDA VERTICAL")).toBe(7.3);
  });

  it("oculta campos que no aplican y exige los obligatorios", () => {
    const p = plantillaPorId("linea_horizontal");
    const v = valoresIniciales(p);
    expect(camposVisibles(p, v).some((c) => c.id === "tipoAnclaje")).toBe(false);
    expect(camposVisibles(p, { ...v, anclajes: 2 }).some((c) => c.id === "tipoAnclaje")).toBe(true);
    expect(camposFaltantes(p, { ...v, metros: "" }).map((c) => c.id)).toEqual(["metros"]);
  });
});
