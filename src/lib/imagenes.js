// Las fotos de obra se guardan como dataURL dentro de la fila de la obra o del
// informe. Una foto de celular pesa 4-8 MB en base64 y hace que el guardado
// falle o quede lentisimo, asi que se reduce antes de guardar: lado maximo
// 1400 px y JPEG de calidad media, que es mas que suficiente para el PDF.

const LADO_MAX = 1800;
const CALIDAD = 0.85;

// Formatos que el PDF y la impresion saben mostrar. Una foto chica en uno de
// estos se guarda tal cual; cualquier otro (HEIC, TIFF, BMP...) se pasa a JPEG.
const FORMATOS_DIRECTOS = ["image/jpeg", "image/png", "image/webp"];

// Las fotos del iPhone y del Mac salen en HEIC. Safari las abre, pero Chrome
// y Edge no; a veces llegan ademas sin tipo, asi que se mira tambien el nombre.
export const esHeic = (file) =>
  /hei[cf]/i.test(file?.type || "") || /\.(heic|heif)$/i.test(file?.name || "");

// Los HEIC empiezan con «....ftypheic» (o heix, mif1, msf1...). Sirve cuando
// llegan sin tipo y con otro nombre, como a veces los entrega Safari.
export const cabeceraEsHeic = (bytes) =>
  bytes?.length >= 12 &&
  String.fromCharCode(...bytes.slice(4, 8)) === "ftyp" &&
  /^(heic|heix|hevc|hevx|heim|heis|mif1|msf1)$/.test(String.fromCharCode(...bytes.slice(8, 12)));

// Lee los primeros bytes. Si ni eso se puede, el archivo no esta disponible:
// pasa con fotos de iCloud que aun no se bajaron al Mac, o con las escogidas
// desde la barra lateral de Fotos en Safari. Antes ese error se perdia y la
// foto simplemente no aparecia.
async function leerCabecera(file) {
  try {
    return new Uint8Array(await file.slice(0, 16).arrayBuffer());
  } catch {
    return null;
  }
}

/** Explica en palabras de la persona por que una foto no se pudo usar. */
export function motivoImagenNoLegible(file, { heic = esHeic(file), ilegible = false } = {}) {
  const nombre = file?.name ? `«${file.name}»` : "La foto";
  if (ilegible) {
    return `No se pudo leer ${nombre}. Si está en iCloud o en la app Fotos, primero guárdala en el Mac `
      + "(arrástrala al Escritorio o usa Archivo › Exportar) y súbela desde esa copia.";
  }
  if (heic) {
    return `${nombre} está en formato HEIC (el de las fotos de iPhone y Mac) y este navegador no lo puede abrir. `
      + "Súbela desde Safari, o en la app Fotos usa Archivo › Exportar y elige JPEG.";
  }
  return `${nombre} no es una imagen que el navegador pueda abrir. Usa una foto JPG o PNG.`;
}

function leerComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error(`No se pudo leer ${file?.name ? `«${file.name}»` : "la foto"}.`));
    lector.onload = (ev) => resolve(String(ev.target?.result || ""));
    lector.readAsDataURL(file);
  });
}

// Devuelve algo que se puede dibujar en un canvas, o null si el navegador no
// entiende el formato. Se decodifica desde el archivo y no desde un dataURL:
// con fotos de 12-48 MP el dataURL intermedio pesa decenas de MB.
async function decodificar(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Algunos navegadores no aceptan la opcion o el formato: se intenta con <img>.
    }
  }
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
    return img;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Lee la foto que escogio la persona y la deja lista para guardar (dataURL
 * JPEG reducido). Si el navegador no la puede abrir, rechaza con un mensaje
 * que se le puede mostrar tal cual: antes se guardaba el archivo crudo, que
 * luego no se veia ni salia en el PDF y nadie se enteraba.
 */
export async function leerImagenComprimida(file, { ladoMax = LADO_MAX, calidad = CALIDAD } = {}) {
  if (!file) throw new Error("No se recibió ninguna imagen");

  const cabecera = await leerCabecera(file);
  // Un archivo de 0 bytes es el marcador de una foto que sigue en iCloud.
  if (!cabecera || !cabecera.length) {
    throw new Error(motivoImagenNoLegible(file, { ilegible: true }));
  }

  const fuente = await decodificar(file);
  if (!fuente || !fuente.width || !fuente.height) {
    throw new Error(motivoImagenNoLegible(file, { heic: esHeic(file) || cabeceraEsHeic(cabecera) }));
  }

  try {
    const escala = Math.min(1, ladoMax / Math.max(fuente.width, fuente.height));
    if (escala === 1 && FORMATOS_DIRECTOS.includes(file.type) && file.size < 260_000) {
      return await leerComoDataUrl(file);
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(fuente.width * escala);
    canvas.height = Math.round(fuente.height * escala);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Fondo blanco: los PNG con transparencia salen negros en JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(fuente, 0, 0, canvas.width, canvas.height);
    const salida = canvas.toDataURL("image/jpeg", calidad);
    // Un canvas demasiado grande para la memoria del equipo devuelve "data:,".
    if (!salida.startsWith("data:image/jpeg")) {
      throw new Error(`${file.name ? `«${file.name}»` : "La foto"} es demasiado grande para procesarla en este equipo. Prueba con una versión más pequeña.`);
    }
    return salida;
  } finally {
    fuente.close?.();
  }
}

// ======================================================
// REDUCIR FOTOS QUE YA ESTABAN GUARDADAS
// ======================================================
//
// Durante un tiempo las fotos de cotizacion y los planos entraron sin reducir,
// a 4-8 MB cada una. Esas ya estan dentro de las filas, y como cada guardado
// sube la fila completa, siguen ahogando la conexion aunque las nuevas ya
// entren comprimidas. Esto las arregla sin tener que volver a subirlas.

// Por encima de esto se da por hecho que la foto entro sin reducir. Una ya
// comprimida (1800 px, calidad alta) ronda los 400-500 mil caracteres, asi que el
// margen es amplio y no se toca lo que ya estaba bien.
export const UMBRAL_FOTO_PESADA = 1_200_000;

export const esFotoPesada = (valor) =>
  typeof valor === "string" &&
  valor.startsWith("data:image/") &&
  valor.length > UMBRAL_FOTO_PESADA;

/** Reduce una foto que ya esta guardada como dataURL. */
export function comprimirDataUrl(dataUrl, { ladoMax = LADO_MAX, calidad = CALIDAD } = {}) {
  return new Promise((resolve) => {
    const img = new Image();
    // Ante cualquier problema se devuelve la original: mas vale una foto
    // pesada que una foto perdida.
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      try {
        const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const salida = canvas.toDataURL("image/jpeg", calidad);
        // Si al reducirla no gana nada, se deja como estaba.
        resolve(salida.length < dataUrl.length ? salida : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}

/**
 * Recorre cualquier estructura -objetos, listas, lo que sea- y reduce las
 * fotos pesadas que encuentre, esten donde esten.
 *
 * Se hace asi y no campo por campo porque cada modulo guarda sus fotos con otro
 * nombre (`img` en bitacora e informes, `src` en cotizaciones, `imgPlano` en
 * planos): recorriendo a ciegas no se escapa ninguna, ni las que se agreguen
 * despues.
 *
 * Devuelve una copia; el original no se toca.
 */
export async function recomprimirFotosPesadas(valor, alProgresar = null) {
  if (esFotoPesada(valor)) {
    const reducida = await comprimirDataUrl(valor);
    alProgresar?.({ antes: valor.length, despues: reducida.length });
    return reducida;
  }

  if (Array.isArray(valor)) {
    const salida = [];
    for (const item of valor) salida.push(await recomprimirFotosPesadas(item, alProgresar));
    return salida;
  }

  // Solo objetos planos: nada de Date, File ni clases raras.
  if (valor && typeof valor === "object" && Object.getPrototypeOf(valor) === Object.prototype) {
    const salida = {};
    for (const [clave, dentro] of Object.entries(valor)) {
      salida[clave] = await recomprimirFotosPesadas(dentro, alProgresar);
    }
    return salida;
  }

  return valor;
}

/** Cuenta fotos pesadas y cuanto ocupan, sin modificar nada. */
export function contarFotosPesadas(valor) {
  if (esFotoPesada(valor)) return { fotos: 1, caracteres: valor.length };

  if (Array.isArray(valor)) {
    return valor.reduce((acc, item) => {
      const r = contarFotosPesadas(item);
      return { fotos: acc.fotos + r.fotos, caracteres: acc.caracteres + r.caracteres };
    }, { fotos: 0, caracteres: 0 });
  }

  if (valor && typeof valor === "object" && Object.getPrototypeOf(valor) === Object.prototype) {
    return Object.values(valor).reduce((acc, item) => {
      const r = contarFotosPesadas(item);
      return { fotos: acc.fotos + r.fotos, caracteres: acc.caracteres + r.caracteres };
    }, { fotos: 0, caracteres: 0 });
  }

  return { fotos: 0, caracteres: 0 };
}

/**
 * Rota una imagen en base64 / dataURL 90 grados en sentido horario
 * usando canvas, preservando alta calidad y fondo blanco.
 */
export function rotarImagen90(dataUrl, grados = 90, calidad = CALIDAD) {
  return new Promise((resolve) => {
    if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) {
      return resolve(dataUrl);
    }

    const img = new Image();
    img.onload = () => {
      try {
        const rad = (grados * Math.PI) / 180;
        const swap = Math.abs(grados % 180) === 90;
        const canvas = document.createElement("canvas");
        canvas.width = swap ? img.height : img.width;
        canvas.height = swap ? img.width : img.height;

        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Fondo blanco para evitar transparencias negras
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        resolve(canvas.toDataURL("image/jpeg", calidad));
      } catch (err) {
        console.error("Error al rotar imagen:", err);
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
