// El catalogo de servicios: lo que se cotiza y a que precio.
//
// DE DONDE SALE. Vive en la base -app.catalogo_items-, para que los precios se
// cambien desde la pantalla sin publicar una version del programa, y para que
// la funcion que atiende WhatsApp lea exactamente los mismos.
//
// ITEMS_DB (src/data/seed.js) se queda como SEMILLA: es de donde salieron los
// precios la primera vez y es el respaldo si la tabla todavia no existe o esta
// vacia. Asi la aplicacion nunca se queda sin catalogo, ni siquiera con las
// migraciones a medias.

import { ITEMS_DB } from "../data/seed";

// La forma que usa toda la aplicacion, agrupada por categoria:
//   [{ categoria, items: [{ id, desc, unit, vu }] }]
//
// Se conserva `desc`, `unit` y `vu` -y no los nombres de la base- porque asi
// se llaman en las cotizaciones guardadas, en el editor de propuestas y en el
// documento impreso. Cambiarlo obligaria a tocar todo eso sin ganar nada.

const DESDE_SEMILLA = () => ITEMS_DB;

/**
 * Agrupa las filas de la base en el formato de siempre.
 * Si no hay nada guardado, devuelve el catalogo del codigo.
 */
export function agruparCatalogo(filas) {
  const lista = (Array.isArray(filas) ? filas : []).filter((f) => f && f.descripcion);
  if (!lista.length) return DESDE_SEMILLA();

  const porCategoria = new Map();
  for (const fila of lista) {
    // Un servicio apagado no se ofrece, pero sigue existiendo para las
    // cotizaciones viejas.
    if (fila.disponible === false) continue;
    const categoria = String(fila.categoria || "Otros");
    if (!porCategoria.has(categoria)) porCategoria.set(categoria, []);
    porCategoria.get(categoria).push({
      id: fila.id,
      desc: fila.descripcion,
      unit: fila.unidad,
      vu: Number(fila.precioBase) || 0,
    });
  }

  if (!porCategoria.size) return DESDE_SEMILLA();

  return [...porCategoria.entries()].map(([categoria, items]) => ({ categoria, items }));
}

/** Todos los servicios en una sola lista, sin categorias. */
export function itemsPlanos(catalogo) {
  return (catalogo ?? []).flatMap((grupo) =>
    (grupo.items ?? []).map((item) => ({ ...item, categoria: grupo.categoria })),
  );
}

/**
 * Las descripciones que se le mandan a la IA para que use los nombres exactos
 * del sistema en vez de inventarse servicios.
 */
export function catalogoPlano(catalogo) {
  return itemsPlanos(catalogo).map((item) => `${item.desc} (${item.unit})`);
}

// ── Emparejar lo que dijo la IA con un servicio real ────────────────────────

// El catalogo esta escrito sin tildes ("LINEA DE VIDA HORIZONTAL") y la IA
// responde con la ortografia correcta. Comparando letra a letra no coincidian
// y todos los servicios se descartaban.
const sinTildes = (texto) =>
  String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Palabras que no distinguen un servicio de otro y solo estorban al comparar.
const VACIAS = new Set(["DE", "DEL", "LA", "EL", "LOS", "LAS", "EN", "Y", "CON", "A", "PARA"]);
const clave = (texto) => sinTildes(texto).split(" ").filter((p) => p && !VACIAS.has(p));

// El catalogo esta en singular ("PUNTO DE ANCLAJE EPOXICO") y la gente pide en
// plural ("cuatro puntos de anclaje epoxico"). Comparando palabras completas
// "PUNTO" no estaba en lo pedido y el servicio se descartaba entero, tanto al
// dictar como al importar un documento.
//
// Basta con que una empiece por la otra: PUNTO/PUNTOS, ANCLAJE/ANCLAJES,
// VERTICAL/VERTICALES. Se piden cuatro letras para no emparejar por un
// pedacito suelto.
function estaLaPalabra(palabra, pedidas) {
  return pedidas.some((otra) =>
    otra === palabra ||
    (palabra.length >= 4 && otra.length >= 4 &&
      (otra.startsWith(palabra) || palabra.startsWith(otra))));
}

/**
 * Busca el servicio real a partir de la descripcion que devolvio la IA.
 * Primero por coincidencia limpia; si no, por palabras, para que "linea de
 * vida horizontal en cubierta" encuentre "LINEA DE VIDA HORIZONTAL".
 *
 * Devuelve null cuando no hay uno claro: «linea de vida» a secas no elige
 * entre la horizontal y la vertical. Antes que adivinar, se deja fuera.
 */
export function buscarItemCatalogo(desc, catalogo) {
  const buscado = sinTildes(desc);
  if (!buscado) return null;

  const todos = itemsPlanos(catalogo?.length ? catalogo : DESDE_SEMILLA());

  const exacto = todos.find((item) => sinTildes(item.desc) === buscado);
  if (exacto) return exacto;

  const palabrasBuscadas = clave(desc);
  const candidatos = todos
    .map((item) => ({ item, palabras: clave(item.desc) }))
    .filter(({ palabras }) => palabras.length && palabras.every((p) => estaLaPalabra(p, palabrasBuscadas)))
    .sort((a, b) => b.palabras.length - a.palabras.length);

  return candidatos[0]?.item ?? null;
}

// ── Para la pantalla de precios ─────────────────────────────────────────────

/** Las filas tal como se editan, ordenadas por categoria y descripcion. */
export function filasEditables(catalogoItems) {
  const lista = Array.isArray(catalogoItems) ? [...catalogoItems] : [];
  return lista.sort((a, b) =>
    String(a.categoria || "").localeCompare(String(b.categoria || ""), "es") ||
    String(a.descripcion || "").localeCompare(String(b.descripcion || ""), "es"));
}

/** Siembra la tabla con el catalogo del codigo, la primera vez. */
export function filasDesdeSemilla() {
  const filas = [];
  let n = 0;
  for (const grupo of ITEMS_DB) {
    for (const item of grupo.items) {
      n += 1;
      filas.push({
        id: `CAT-${String(n).padStart(3, "0")}`,
        categoria: grupo.categoria,
        descripcion: item.desc,
        unidad: item.unit,
        precioBase: item.vu,
        disponible: true,
      });
    }
  }
  return filas;
}
