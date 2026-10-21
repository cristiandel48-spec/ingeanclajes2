// Migracion de un registro de fotos dentro de la fila a Storage (R2, fase 2).
// La usa scripts/migrar-fotos-storage.mjs; esta aparte para poder probarla.
//
// Nunca deja un registro a medias: si algo no cuadra antes de escribir, no
// escribe; si lo escrito no coincide al releerlo, avisa con error.

import { crearAlmacenFotos, esFotoIncrustada } from "./fotosStorage.js";

export function contarFotosDentro(valor) {
  let n = 0;
  let bytes = 0;
  const recorrer = (v) => {
    if (esFotoIncrustada(v)) { n += 1; bytes += v.length; }
    else if (Array.isArray(v)) v.forEach(recorrer);
    else if (v && typeof v === "object") Object.values(v).forEach(recorrer);
  };
  recorrer(valor);
  return { n, bytes };
}

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Migra un registro. `original` trae id, updated_at y las columnas de fotos.
 * `escribir(valores)` guarda en la base (debe respetar la version) y
 * devuelve "ok" o "cambio". `releer()` vuelve a traer el registro.
 *
 * Devuelve { estado: "sin-fotos" | "ok" | "cambio", movidas, quedan }.
 */
export async function migrarRegistro({ supabase, tenantId, original, columnas, escribir, releer }) {
  const conFotos = columnas.filter((c) => contarFotosDentro(original[c]).n > 0);
  if (!conFotos.length) return { estado: "sin-fotos", movidas: 0, quedan: 0 };
  const antes = conFotos.reduce((s, c) => s + contarFotosDentro(original[c]).n, 0);

  // Subir.
  const almacen = crearAlmacenFotos({ supabase, tenantId });
  const nuevos = {};
  for (const c of conFotos) nuevos[c] = await almacen.paraGuardar(original[c]);
  const quedan = conFotos.reduce((s, c) => s + contarFotosDentro(nuevos[c]).n, 0);
  if (quedan === antes) throw new Error("no se pudo subir ninguna foto");

  // Comprobar con un almacen nuevo, sin nada en memoria: obliga a descargar
  // de Storage lo que se acaba de subir. Se comparan las dos versiones tal
  // como las veria la aplicacion, porque el registro puede traer ya
  // referencias de la fase 1 junto a fotos dentro.
  const verificador = crearAlmacenFotos({ supabase, tenantId });
  for (const c of conFotos) {
    const comoQueda = await verificador.paraMostrar(nuevos[c]);
    const comoEstaba = await verificador.paraMostrar(original[c]);
    if (!igual(comoQueda, comoEstaba)) throw new Error(`la columna ${c} no se reconstruye igual desde Storage`);
  }

  // Escribir, solo si nadie lo guardo entretanto.
  const r = await escribir(nuevos);
  if (r !== "ok") return { estado: "cambio", movidas: 0, quedan: antes };

  // Confirmar lo escrito.
  const despues = await releer();
  const confirmado = despues && despues.updated_at === original.updated_at &&
    conFotos.every((c) => igual(despues[c], nuevos[c]));
  if (!confirmado) throw new Error("lo escrito no coincide al volver a leerlo");

  return { estado: "ok", movidas: antes - quedan, quedan };
}
