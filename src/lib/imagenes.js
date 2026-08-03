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
