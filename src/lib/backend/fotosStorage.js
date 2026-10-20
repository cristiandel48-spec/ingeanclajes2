// Fotos en Supabase Storage en vez de dentro de las filas (migracion 071).
//
// La aplicacion sigue trabajando con fotos «data:image/...;base64,...» como
// siempre: pantallas, impresion y PDF no cambian. El cambio esta solo en la
// frontera con la base:
//
//   - al guardar, cada foto de las columnas pesadas se sube al bucket y en la
//     fila queda «sb-foto:<empresa>/<huella>.<ext>»;
//   - al leer, cada referencia se descarga y se vuelve a convertir en foto.
//
// Nada de esto puede perder una foto. Si la subida falla -sin conexion, la
// migracion todavia sin aplicar- la foto se guarda dentro de la fila, como
// antes. Si la descarga falla, la referencia se deja tal cual: no se ve, pero
// al volver a guardar se conserva y la foto sigue en el bucket.

export const PREFIJO_FOTO = "sb-foto:";
const BUCKET = "fotos";

// Las imagenes pequeñas (iconos, firmas) no compensan un viaje aparte.
const TAMANO_MINIMO = 8 * 1024;
const SIMULTANEAS = 4;
// Recuerda las ultimas fotos subidas o bajadas para no repetir el trabajo
// en cada autoguardado. Con tope, para no acumular memoria toda la sesion.
const RECORDAR = 400;

const EXTENSIONES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };

export const esFotoIncrustada = (valor) =>
  typeof valor === "string" && valor.length >= TAMANO_MINIMO && /^data:image\/[a-z+]+;base64,/i.test(valor);

export const esReferenciaFoto = (valor) => typeof valor === "string" && valor.startsWith(PREFIJO_FOTO);

function dataUrlABytes(dataUrl) {
  const coma = dataUrl.indexOf(",");
  const tipo = dataUrl.slice(5, dataUrl.indexOf(";")).toLowerCase();
  const binario = atob(dataUrl.slice(coma + 1));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return { tipo, bytes };
}

function bytesADataUrl(bytes, tipo) {
  let binario = "";
  const BLOQUE = 0x8000;
  for (let i = 0; i < bytes.length; i += BLOQUE) {
    binario += String.fromCharCode.apply(null, bytes.subarray(i, i + BLOQUE));
  }
  return `data:${tipo};base64,${btoa(binario)}`;
}

async function huella(bytes) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function recordar(mapa, clave, valor) {
  mapa.delete(clave);
  mapa.set(clave, valor);
  if (mapa.size > RECORDAR) mapa.delete(mapa.keys().next().value);
}

// Ejecuta las tareas de a pocas a la vez.
async function enParalelo(tareas) {
  const resultados = new Array(tareas.length);
  let siguiente = 0;
  const trabajador = async () => {
    while (siguiente < tareas.length) {
      const i = siguiente;
      siguiente += 1;
      resultados[i] = await tareas[i]();
    }
  };
  await Promise.all(Array.from({ length: Math.min(SIMULTANEAS, tareas.length) }, trabajador));
  return resultados;
}

// Recorre un valor (texto, lista u objeto) y reemplaza cada texto que cumpla
// `cumple` por lo que devuelva `cambiar`. Devuelve una copia: el original no
// se toca, porque es el estado de la aplicacion.
async function reemplazarEn(valor, cumple, cambiar) {
  const encontrados = new Set();
  const buscar = (v) => {
    if (cumple(v)) encontrados.add(v);
    else if (Array.isArray(v)) v.forEach(buscar);
    else if (v && typeof v === "object") Object.values(v).forEach(buscar);
  };
  buscar(valor);
  if (!encontrados.size) return valor;

  const lista = [...encontrados];
  const nuevos = await enParalelo(lista.map((v) => () => cambiar(v)));
  const cambio = new Map(lista.map((v, i) => [v, nuevos[i]]));

  const copiar = (v) => {
    if (cambio.has(v)) return cambio.get(v);
    if (Array.isArray(v)) return v.map(copiar);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copiar(x)]));
    }
    return v;
  };
  return copiar(valor);
}

export function crearAlmacenFotos({ supabase, tenantId }) {
  const referenciaDe = new Map(); // foto -> referencia
  const fotoDe = new Map(); // referencia -> foto
  // Si el bucket no existe (migracion 071 sin aplicar) no se insiste en cada
  // guardado: las fotos siguen yendo dentro de la fila.
  let sinBucket = false;

  const subir = async (dataUrl) => {
    if (sinBucket) return dataUrl;
    const conocida = referenciaDe.get(dataUrl);
    if (conocida) return conocida;
    try {
      const { tipo, bytes } = dataUrlABytes(dataUrl);
      const ext = EXTENSIONES[tipo];
      if (!ext) return dataUrl;
      const ruta = `${tenantId}/${await huella(bytes)}.${ext}`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(ruta, new Blob([bytes], { type: tipo }), { contentType: tipo, upsert: false, cacheControl: "31536000" });
      // Ya estaba: es la misma foto (el nombre es su huella).
      const yaExiste = error && (String(error.statusCode) === "409" || /already exists|duplicate/i.test(error.message || ""));
      if (error && !yaExiste) {
        if (/bucket not found/i.test(error.message || "")) sinBucket = true;
        console.warn("No se pudo subir una foto; se guarda dentro del registro.", error.message || error);
        return dataUrl;
      }
      const referencia = PREFIJO_FOTO + ruta;
      recordar(referenciaDe, dataUrl, referencia);
      recordar(fotoDe, referencia, dataUrl);
      return referencia;
    } catch (e) {
      console.warn("No se pudo subir una foto; se guarda dentro del registro.", e?.message || e);
      return dataUrl;
    }
  };

  const bajar = async (referencia) => {
    const conocida = fotoDe.get(referencia);
    if (conocida) return conocida;
    try {
      const ruta = referencia.slice(PREFIJO_FOTO.length);
      const { data, error } = await supabase.storage.from(BUCKET).download(ruta);
      if (error || !data) throw error || new Error("respuesta vacia");
      const tipo = data.type || Object.keys(EXTENSIONES).find((t) => ruta.endsWith(`.${EXTENSIONES[t]}`)) || "image/jpeg";
      const dataUrl = bytesADataUrl(new Uint8Array(await data.arrayBuffer()), tipo);
      recordar(fotoDe, referencia, dataUrl);
      recordar(referenciaDe, dataUrl, referencia);
      return dataUrl;
    } catch (e) {
      console.warn("No se pudo descargar una foto:", referencia, e?.message || e);
      return referencia;
    }
  };

  return {
    /** Copia del valor con las fotos subidas y cambiadas por su referencia. */
    paraGuardar: (valor) => reemplazarEn(valor, esFotoIncrustada, subir),
    /** Copia del valor con las referencias cambiadas por la foto. */
    paraMostrar: (valor) => reemplazarEn(valor, esReferenciaFoto, bajar),
  };
}
