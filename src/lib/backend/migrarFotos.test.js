import { beforeEach, describe, expect, it, vi } from "vitest";
import { migrarRegistro } from "./migrarFotos";
import { PREFIJO_FOTO, crearAlmacenFotos } from "./fotosStorage";
import { fotoFalsa, storageFalso } from "./__pruebas__/fotos";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

// Una "base" de un solo registro, con la regla de version de la migracion 072.
function registroFalso(inicial) {
  let fila = structuredClone(inicial);
  return {
    get fila() { return fila; },
    otraPersonaGuarda() { fila = { ...fila, updated_at: "v-otra" }; },
    escribir: async (valores) => {
      if (fila.updated_at !== inicial.updated_at) return "cambio";
      fila = { ...fila, ...valores }; // updated_at no cambia: la 072 apaga los disparadores
      return "ok";
    },
    releer: async () => structuredClone(fila),
  };
}

const informe = (fotos) => ({
  id: "INF-001",
  updated_at: "v1",
  actividades: [{ titulo: "A", fotos: fotos.map((img, i) => ({ img, descripcion: `foto ${i}` })) }],
  fotos: [],
});

describe("migrar un registro", () => {
  it("mueve las fotos, deja referencias y el registro se ve igual", async () => {
    const storage = storageFalso();
    const supabase = { storage };
    const original = informe([fotoFalsa(1), fotoFalsa(2)]);
    const reg = registroFalso(original);

    const r = await migrarRegistro({
      supabase, tenantId: "t1", original, columnas: ["actividades", "fotos"],
      escribir: reg.escribir, releer: reg.releer,
    });

    expect(r).toEqual({ estado: "ok", movidas: 2, quedan: 0 });
    expect(reg.fila.updated_at).toBe("v1");
    const imgs = reg.fila.actividades[0].fotos.map((f) => f.img);
    expect(imgs.every((i) => i.startsWith(PREFIJO_FOTO))).toBe(true);
    // Lo que veria la aplicacion al abrirlo: identico al original.
    const visto = await crearAlmacenFotos({ supabase, tenantId: "t1" }).paraMostrar(reg.fila.actividades);
    expect(visto).toEqual(original.actividades);
  });

  it("respeta las referencias que ya traia de la fase 1", async () => {
    const storage = storageFalso();
    const supabase = { storage };
    const yaSubida = await crearAlmacenFotos({ supabase, tenantId: "t1" }).paraGuardar(fotoFalsa(9));
    const original = informe([yaSubida, fotoFalsa(3)]);
    const reg = registroFalso(original);

    const r = await migrarRegistro({
      supabase, tenantId: "t1", original, columnas: ["actividades"],
      escribir: reg.escribir, releer: reg.releer,
    });

    expect(r.estado).toBe("ok");
    expect(r.movidas).toBe(1);
    expect(reg.fila.actividades[0].fotos[0].img).toBe(yaSubida);
  });

  it("si alguien lo guardo entretanto, no lo toca", async () => {
    const supabase = { storage: storageFalso() };
    const original = informe([fotoFalsa(1)]);
    const reg = registroFalso(original);
    reg.otraPersonaGuarda();

    const r = await migrarRegistro({
      supabase, tenantId: "t1", original, columnas: ["actividades"],
      escribir: reg.escribir, releer: reg.releer,
    });

    expect(r.estado).toBe("cambio");
    expect(reg.fila.actividades[0].fotos[0].img).toBe(fotoFalsa(1));
  });

  it("si Storage no responde, no escribe nada", async () => {
    const supabase = { storage: storageFalso({ falla: { message: "Failed to fetch" } }) };
    const original = informe([fotoFalsa(1)]);
    const reg = registroFalso(original);
    const escribir = vi.fn(reg.escribir);

    await expect(migrarRegistro({
      supabase, tenantId: "t1", original, columnas: ["actividades"], escribir, releer: reg.releer,
    })).rejects.toThrow();
    expect(escribir).not.toHaveBeenCalled();
  });

  it("si lo subido no se puede descargar igual, no escribe nada", async () => {
    const storage = storageFalso();
    // Storage que «pierde» los archivos: la descarga falla.
    const rota = { ...storage, from: () => ({ ...storage.from(), download: async () => ({ data: null, error: { message: "Object not found" } }) }) };
    const original = informe([fotoFalsa(1)]);
    const reg = registroFalso(original);
    const escribir = vi.fn(reg.escribir);

    await expect(migrarRegistro({
      supabase: { storage: rota }, tenantId: "t1", original, columnas: ["actividades"], escribir, releer: reg.releer,
    })).rejects.toThrow(/no se reconstruye igual/);
    expect(escribir).not.toHaveBeenCalled();
  });

  it("un registro sin fotos dentro se salta", async () => {
    const r = await migrarRegistro({
      supabase: { storage: storageFalso() }, tenantId: "t1", original: informe([]),
      columnas: ["actividades"], escribir: vi.fn(), releer: vi.fn(),
    });
    expect(r.estado).toBe("sin-fotos");
  });
});
