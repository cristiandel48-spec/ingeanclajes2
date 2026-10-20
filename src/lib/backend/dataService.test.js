import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDataService } from "./dataService";

const TENANT = "t1";

// Base de datos en memoria con la forma de las consultas de supabase-js. Solo
// cubre lo que usa dataService. Una tabla que no esta en `tablas` no existe
// (responde PGRST205, como PostgREST). Un insert con un id repetido falla
// entero con 23505, como en Postgres.
function baseFalsa(tablas) {
  const db = Object.fromEntries(
    Object.entries(tablas).map(([t, filas]) => [t, filas.map((f) => ({ tenant_id: TENANT, ...f }))])
  );
  let reloj = 100;
  const nuevaVersion = () => `v${(reloj += 1)}`;
  const consultas = [];

  class Consulta {
    constructor(tabla) {
      this.tabla = tabla;
      this.op = "select";
      this.filtros = [];
      this.devuelve = false;
      consultas.push(this);
    }
    select() { if (this.op !== "select") this.devuelve = true; return this; }
    insert(filas) { this.op = "insert"; this.payload = filas; return this; }
    upsert(filas) { this.op = "upsert"; this.payload = filas; return this; }
    update(fila) { this.op = "update"; this.payload = fila; return this; }
    delete() { this.op = "delete"; return this; }
    eq(c, v) { this.filtros.push((f) => f[c] === v); return this; }
    in(c, vs) { this.filtros.push((f) => vs.includes(f[c])); return this; }
    like(c, patron) {
      const prefijo = patron.replace(/%$/, "");
      this.filtros.push((f) => String(f[c]).startsWith(prefijo));
      return this;
    }
    order() { return this; }
    range(desde, hasta) { this.rango = [desde, hasta]; return this; }
    maybeSingle() { this.una = true; return this; }
    then(ok, mal) { return Promise.resolve(this.ejecutar()).then(ok, mal); }

    ejecutar() {
      const filas = db[this.tabla];
      if (!filas) return { data: null, error: { code: "PGRST205", message: "not found" } };
      const coincide = (f) => this.filtros.every((filtro) => filtro(f));
      const salida = (data) => ({ data: this.una ? (data[0] ?? null) : data, error: null });

      if (this.op === "select") {
        let data = filas.filter(coincide);
        if (this.rango) data = data.slice(this.rango[0], this.rango[1] + 1);
        return salida(data.map((f) => ({ ...f })));
      }
      if (this.op === "insert") {
        const nuevas = [].concat(this.payload);
        if (nuevas.some((n) => filas.some((f) => f.tenant_id === n.tenant_id && f.id === n.id))) {
          return { data: null, error: { code: "23505", message: "duplicate key" } };
        }
        const guardadas = nuevas.map((n) => ({ ...n, updated_at: nuevaVersion() }));
        filas.push(...guardadas);
        return this.devuelve ? salida(guardadas) : { data: null, error: null };
      }
      if (this.op === "upsert") {
        for (const n of [].concat(this.payload)) {
          const i = filas.findIndex((f) => f.tenant_id === n.tenant_id && f.id === n.id);
          const fila = { ...(i >= 0 ? filas[i] : {}), ...n, updated_at: nuevaVersion() };
          if (i >= 0) filas[i] = fila; else filas.push(fila);
        }
        return { data: null, error: null };
      }
      if (this.op === "update") {
        const tocadas = [];
        filas.forEach((f, i) => {
          if (!coincide(f)) return;
          filas[i] = { ...f, ...this.payload, updated_at: nuevaVersion() };
          tocadas.push(filas[i]);
        });
        return salida(tocadas);
      }
      if (this.op === "delete") {
        db[this.tabla] = filas.filter((f) => !coincide(f));
        return { data: null, error: null };
      }
      throw new Error(`operacion no soportada: ${this.op}`);
    }
  }

  return { db, consultas, supabase: { from: (tabla) => new Consulta(tabla) } };
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("registros nuevos (insertMany)", () => {
  it("si el numero ya lo tiene otro registro, se guarda con el siguiente libre", async () => {
    const { db, supabase } = baseFalsa({
      clientes: [{ id: "CL-004", nombre: "Uno" }, { id: "CL-005", nombre: "Otro" }],
    });
    const svc = createDataService({ supabase, tenantId: TENANT });

    const cambios = await svc.insertMany("clientes", [{ id: "CL-005", nombre: "Nuevo" }]);

    expect(cambios).toEqual([{ entity: "clientes", viejo: "CL-005", nuevo: "CL-006", campos: {} }]);
    expect(db.clientes.find((f) => f.id === "CL-005").nombre).toBe("Otro");
    expect(db.clientes.find((f) => f.id === "CL-006").nombre).toBe("Nuevo");
  });

  it("si ya quedo guardado en un intento anterior, no lo duplica", async () => {
    const { db, supabase } = baseFalsa({ clientes: [{ id: "CL-005", nombre: "Nuevo" }] });
    const svc = createDataService({ supabase, tenantId: TENANT });

    const cambios = await svc.insertMany("clientes", [{ id: "CL-005", nombre: "Nuevo" }]);

    expect(cambios).toEqual([]);
    expect(db.clientes).toHaveLength(1);
  });

  it("varios nuevos sin choque entran de una vez", async () => {
    const { db, supabase } = baseFalsa({ clientes: [] });
    const svc = createDataService({ supabase, tenantId: TENANT });

    await svc.insertMany("clientes", [{ id: "CL-001", nombre: "A" }, { id: "CL-002", nombre: "B" }]);

    expect(db.clientes.map((f) => f.id)).toEqual(["CL-001", "CL-002"]);
  });
});

describe("edicion simultanea (actualizarConVersion)", () => {
  async function preparar() {
    const base = baseFalsa({ clientes: [{ id: "CL-001", nombre: "Original", updated_at: "v1" }] });
    const svc = createDataService({ supabase: base.supabase, tenantId: TENANT });
    await svc.list("clientes");
    return { ...base, svc };
  }

  it("guarda si nadie mas lo cambio, y vuelve a guardar despues", async () => {
    const { db, svc } = await preparar();

    expect((await svc.actualizarConVersion("clientes", [{ id: "CL-001", nombre: "Mio" }])).conflictos).toEqual([]);
    expect((await svc.actualizarConVersion("clientes", [{ id: "CL-001", nombre: "Mio 2" }])).conflictos).toEqual([]);
    expect(db.clientes[0].nombre).toBe("Mio 2");
  });

  it("no pisa el cambio de otra persona: lo devuelve como conflicto", async () => {
    const { db, svc } = await preparar();
    // Otra persona guarda entretanto.
    db.clientes[0] = { ...db.clientes[0], nombre: "De otra persona", updated_at: "v2" };

    const { conflictos } = await svc.actualizarConVersion("clientes", [{ id: "CL-001", nombre: "Mio" }]);

    expect(db.clientes[0].nombre).toBe("De otra persona");
    expect(conflictos).toHaveLength(1);
    expect(conflictos[0].enBase.nombre).toBe("De otra persona");
    expect(conflictos[0].versionBase).toBe("v2");
  });

  it("«guardar la mia» lo sobrescribe", async () => {
    const { db, svc } = await preparar();
    db.clientes[0] = { ...db.clientes[0], nombre: "De otra persona", updated_at: "v2" };

    const { conflictos } = await svc.actualizarConVersion(
      "clientes", [{ id: "CL-001", nombre: "Mio" }], new Set(["CL-001"])
    );

    expect(conflictos).toEqual([]);
    expect(db.clientes[0].nombre).toBe("Mio");
  });
});

describe("guardado en bloque (upsertMany)", () => {
  it("dos registros con el mismo id no tumban el guardado: queda el ultimo", async () => {
    const { db, supabase } = baseFalsa({ clientes: [] });
    const svc = createDataService({ supabase, tenantId: TENANT });

    await svc.upsertMany("clientes", [{ id: "CL-001", nombre: "Primero" }, { id: "CL-001", nombre: "Ultimo" }]);

    expect(db.clientes).toHaveLength(1);
    expect(db.clientes[0].nombre).toBe("Ultimo");
  });
});

describe("empleados sin el modulo Personal (migracion 070)", () => {
  it("lee la vista sin salarios y crea empleados sin pedirlos de vuelta", async () => {
    const { db, consultas, supabase } = baseFalsa({
      empleados: [{ id: "EMP-001", nombre: "Ana", salario: 3000000 }],
      empleados_basico: [{ id: "EMP-001", nombre: "Ana" }],
    });
    const svc = createDataService({ supabase, tenantId: TENANT });
    svc.usarTablaLectura("empleados", "empleados_basico");

    const lista = await svc.list("empleados");
    expect(lista[0].salario ?? null).toBeNull();
    expect(svc.lecturaReducida.has("empleados")).toBe(true);

    await svc.insertMany("empleados", [{ id: "EMP-002", nombre: "Luis" }]);
    const insert = consultas.find((c) => c.op === "insert");
    expect(insert.devuelve).toBe(false);
    expect(db.empleados.map((f) => f.id)).toContain("EMP-002");
  });

  it("si la vista todavia no existe, lee la tabla como antes", async () => {
    const { supabase } = baseFalsa({ empleados: [{ id: "EMP-001", nombre: "Ana", salario: 3000000 }] });
    const svc = createDataService({ supabase, tenantId: TENANT });
    svc.usarTablaLectura("empleados", "empleados_basico");

    const lista = await svc.list("empleados");
    expect(lista[0].salario).toBe(3000000);
    expect(svc.lecturaReducida.has("empleados")).toBe(false);
  });
});
