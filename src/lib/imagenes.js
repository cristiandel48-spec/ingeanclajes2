// Las fotos de obra se guardan como dataURL dentro de la fila de la obra o del
// informe. Una foto de celular pesa 4-8 MB en base64 y hace que el guardado
// falle o quede lentisimo, asi que se reduce antes de guardar: lado maximo
// 1400 px y JPEG de calidad media, que es mas que suficiente para el PDF.

const LADO_MAX = 1400;
const CALIDAD = 0.72;

export function leerImagenComprimida(file, { ladoMax = LADO_MAX, calidad = CALIDAD } = {}) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No se recibió ninguna imagen"));
      return;
    }

    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer la imagen"));
    lector.onload = (ev) => {
      const original = String(ev.target?.result || "");
      const img = new Image();

      // Si el navegador no puede decodificarla, se guarda tal cual antes que
      // perder la foto que la persona acaba de tomar.
      img.onerror = () => resolve(original);
      img.onload = () => {
        try {
          const escala = Math.min(1, ladoMax / Math.max(img.width, img.height));
          if (escala === 1 && original.length < 900_000) {
            resolve(original);
            return;
          }
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * escala);
          canvas.height = Math.round(img.height * escala);
          const ctx = canvas.getContext("2d");
          // Fondo blanco: los PNG con transparencia salen negros en JPEG.
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", calidad));
        } catch {
          resolve(original);
        }
      };
      img.src = original;
    };

    lector.readAsDataURL(file);
  });
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
// comprimida (1400 px, calidad media) ronda los 350 mil caracteres, asi que el
// margen es amplio y no se toca lo que ya estaba bien.
export const UMBRAL_FOTO_PESADA = 700_000;

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
