// Cambia el fondo oscuro de una foto de producto por blanco.
//
// La foto del punto de anclaje esta tomada sobre fondo negro de estudio.
// Se ve bien en pantalla, pero en una hoja impresa deja un rectangulo negro
// en medio del documento, que es justo lo que se queria quitar.
//
// Esto NO recorta la silueta. Aclara el fondo: lo que esta por debajo de un
// umbral de luminosidad pasa a blanco, y entre los dos umbrales se mezcla
// de forma progresiva para no dejar un borde duro alrededor de la pieza.
// Funciona porque el contraste de la foto es grande -acero claro sobre
// negro-; con una foto de obra, donde hay grises por todas partes, no se
// debe usar.

const UMBRAL_NEGRO = 42;   // por debajo: fondo, va a blanco del todo
const UMBRAL_PIEZA = 110;  // por encima: pieza, no se toca

// La vista previa del documento se rehace cada vez que se escribe una letra,
// y esto recorre la imagen pixel a pixel. Como siempre es la misma foto -la
// de por defecto del punto de anclaje-, el resultado se guarda y a partir de
// la segunda vez no cuesta nada.
const yaAclaradas = new Map();

/**
 * La version ya aclarada de una imagen, si se calculo antes; null si no.
 * Sirve para los sitios que arman HTML de forma sincrona y no pueden esperar
 * a una promesa.
 */
export function fondoAclaradoEnCache(dataUrl) {
  return yaAclaradas.get(dataUrl) || null;
}

/**
 * @param {string} dataUrl  La imagen de origen.
 * @returns {Promise<string>} La imagen con el fondo en blanco. Si algo
 *   falla devuelve la original: mejor la foto con fondo negro que ninguna.
 */
export function aclararFondo(dataUrl) {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || !dataUrl || !dataUrl.startsWith("data:image")) {
      resolve(dataUrl);
      return;
    }

    const guardada = yaAclaradas.get(dataUrl);
    if (guardada) {
      resolve(guardada);
      return;
    }

    const img = new Image();
    img.onerror = () => resolve(dataUrl);
    img.onload = () => {
      try {
        const lienzo = document.createElement("canvas");
        lienzo.width = img.naturalWidth;
        lienzo.height = img.naturalHeight;
        const ctx = lienzo.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);

        const datos = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
        const p = datos.data;

        for (let i = 0; i < p.length; i += 4) {
          // Luminosidad percibida: el verde pesa mas que el rojo y el azul.
          const luz = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
          if (luz >= UMBRAL_PIEZA) continue;

          // 0 = fondo puro, 1 = pieza. Entre los dos umbrales se mezcla.
          const mezcla =
            luz <= UMBRAL_NEGRO ? 0 : (luz - UMBRAL_NEGRO) / (UMBRAL_PIEZA - UMBRAL_NEGRO);

          p[i] = p[i] * mezcla + 255 * (1 - mezcla);
          p[i + 1] = p[i + 1] * mezcla + 255 * (1 - mezcla);
          p[i + 2] = p[i + 2] * mezcla + 255 * (1 - mezcla);
        }

        ctx.putImageData(datos, 0, 0);
        const aclarada = lienzo.toDataURL("image/jpeg", 0.92);
        yaAclaradas.set(dataUrl, aclarada);
        resolve(aclarada);
      } catch {
        resolve(dataUrl);
      }
    };
    img.src = dataUrl;
  });
}
