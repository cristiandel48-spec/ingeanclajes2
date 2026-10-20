import { beforeEach, describe, expect, it, vi } from "vitest";
import { PREFIJO_FOTO, crearAlmacenFotos } from "./fotosStorage";
import { fotoFalsa, storageFalso } from "./__pruebas__/fotos";

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("fotos al guardar", () => {
  it("sube las fotos y deja la referencia, sin tocar el original", async () => {
    const storage = storageFalso();
    const almacen = crearAlmacenFotos({ supabase: { storage }, tenantId: "t1" });
    const foto = fotoFalsa();
    const original = [{ titulo: "A", fotos: [{ img: foto, nota: "x" }] }];

    const guardado = await almacen.paraGuardar(original);

    const ref = guardado[0].fotos[0].img;
    expect(ref.startsWith(PREFIJO_FOTO + "t1/")).toBe(true);
    expect(ref.endsWith(".jpg")).toBe(true);
    expect(guardado[0].fotos[0].nota).toBe("x");
    expect(original[0].fotos[0].img).toBe(foto);
    expect(storage.archivos.size).toBe(1);
  });

  it("la misma foto se sube una sola vez", async () => {
    const storage = storageFalso();
    const almacen = crearAlmacenFotos({ supabase: { storage }, tenantId: "t1" });
    const foto = fotoFalsa();

    const guardado = await almacen.paraGuardar({ a: foto, b: [foto] });
    await almacen.paraGuardar([foto]);

    expect(guardado.a).toBe(guardado.b[0]);
    expect(storage.subidas).toHaveLength(1);
  });

  it("si el archivo ya estaba (otra sesion lo subio), usa la referencia", async () => {
    const storage = storageFalso();
    const foto = fotoFalsa();
    await crearAlmacenFotos({ supabase: { storage }, tenantId: "t1" }).paraGuardar(foto);

    const ref = await crearAlmacenFotos({ supabase: { storage }, tenantId: "t1" }).paraGuardar(foto);

    expect(ref.startsWith(PREFIJO_FOTO)).toBe(true);
    expect(storage.archivos.size).toBe(1);
  });

  it("deja dentro las imagenes pequeñas y lo que no es foto", async () => {
    const storage = storageFalso();
    const almacen = crearAlmacenFotos({ supabase: { storage }, tenantId: "t1" });
    const valor = { icono: "data:image/png;base64,AAAA", texto: "hola", n: 3 };

    expect(await almacen.paraGuardar(valor)).toEqual(valor);
    expect(storage.subidas).toHaveLength(0);
  });

  it("si la subida falla, la foto se guarda dentro, como antes", async () => {
    const storage = storageFalso({ falla: { message: "Failed to fetch" } });
    const almacen = crearAlmacenFotos({ supabase: { storage }, tenantId: "t1" });
    const foto = fotoFalsa();

    expect(await almacen.paraGuardar([foto])).toEqual([foto]);
  });

  it("sin el bucket (migracion sin aplicar) deja de intentarlo", async () => {
    const storage = storageFalso({ falla: { message: "Bucket not found" } });
    const almacen = crearAlmacenFotos({ supabase: { storage }, tenantId: "t1" });

    expect(await almacen.paraGuardar(fotoFalsa(1))).toBe(fotoFalsa(1));
    expect(await almacen.paraGuardar(fotoFalsa(2))).toBe(fotoFalsa(2));
    expect(storage.subidas).toHaveLength(1);
  });
});

describe("fotos al mostrar", () => {
  it("cambia la referencia por la foto original", async () => {
    const storage = storageFalso();
    const foto = fotoFalsa(7);
    const ref = await crearAlmacenFotos({ supabase: { storage }, tenantId: "t1" }).paraGuardar(foto);

    // Otra sesion, sin nada en memoria: tiene que descargarla.
    const otra = crearAlmacenFotos({ supabase: { storage }, tenantId: "t1" });
    expect(await otra.paraMostrar([{ img: ref }])).toEqual([{ img: foto }]);
  });

  it("si no se puede descargar, conserva la referencia para no perderla al guardar", async () => {
    const storage = storageFalso();
    const almacen = crearAlmacenFotos({ supabase: { storage }, tenantId: "t1" });
    const ref = PREFIJO_FOTO + "t1/no-existe.jpg";

    const mostrado = await almacen.paraMostrar({ img: ref });
    expect(mostrado.img).toBe(ref);
    expect(await almacen.paraGuardar(mostrado)).toEqual({ img: ref });
  });

  it("deja igual lo que ya son fotos dentro de la fila", async () => {
    const almacen = crearAlmacenFotos({ supabase: { storage: storageFalso() }, tenantId: "t1" });
    const valor = [{ img: fotoFalsa() }];
    expect(await almacen.paraMostrar(valor)).toBe(valor);
  });
});
