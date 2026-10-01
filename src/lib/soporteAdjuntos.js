// Utilidades para manejo, compresión y descarga de archivos y capturas en el chat de Ingeanclajes

/**
 * Formatea bytes en formato legible (ej: 140 KB, 2.3 MB)
 */
export function formatearTamano(bytes = 0) {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Devuelve un icono emoji representativo según el tipo de archivo o su extensión
 */
export function obtenerIconoPorTipo(tipo = "", nombre = "") {
  const t = (tipo || "").toLowerCase();
  const n = (nombre || "").toLowerCase();

  if (t.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(n)) {
    return "🖼️";
  }
  if (t.includes("pdf") || n.endsWith(".pdf")) {
    return "📄";
  }
  if (
    t.includes("sheet") ||
    t.includes("excel") ||
    /\.(xlsx|xls|csv)$/i.test(n)
  ) {
    return "📊";
  }
  if (
    t.includes("word") ||
    t.includes("document") ||
    /\.(docx|doc|rtf|txt)$/i.test(n)
  ) {
    return "📝";
  }
  if (t.includes("zip") || t.includes("rar") || /\.(zip|rar|7z|tar|gz)$/i.test(n)) {
    return "📦";
  }
  return "📁";
}

/**
 * Determina si un archivo o url es una imagen para renderizar en miniatura
 */
export function esTipoImagen(tipo = "", url = "", nombre = "") {
  if (tipo && tipo.toLowerCase().startsWith("image/")) return true;
  if (url && (url.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp|bmp)(\?.*)?$/i.test(url))) return true;
  if (nombre && /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(nombre)) return true;
  return false;
}

/**
 * Comprime y redimensiona una imagen en cliente usando Canvas para que suba en milisegundos
 * y no sobrecargue la base de datos ni el almacenamiento local.
 */
export async function comprimirImagen(fileOrBlob, maxDim = 1600, calidad = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a JPEG para compatibilidad y máximo ahorro de espacio
        const dataUrl = canvas.toDataURL("image/jpeg", calidad);
        resolve(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Procesa un archivo o captura de pantalla (Blob/File) seleccionado o pegado del portapapeles.
 * Retorna un objeto con metadatos y la data URI lista para enviar.
 */
export async function procesarArchivoAdjunto(file, nombreSugerido = "") {
  if (!file) return null;

  const nombreOriginal = file.name || nombreSugerido || `adjunto_${Date.now()}`;
  const tipoMime = file.type || "application/octet-stream";
  const esImg = esTipoImagen(tipoMime, "", nombreOriginal);

  // Límite de tamaño sugerido (10 MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("El archivo excede el límite máximo de 10 MB.");
  }

  let urlFinal = "";
  if (esImg) {
    try {
      urlFinal = await comprimirImagen(file);
    } catch {
      // Fallback a lectura directa si falla canvas
      urlFinal = await leerArchivoComoDataUrl(file);
    }
  } else {
    urlFinal = await leerArchivoComoDataUrl(file);
  }

  return {
    url: urlFinal,
    nombre: nombreOriginal,
    tipo: tipoMime,
    tamano: file.size || urlFinal.length,
    esImagen: esImg,
  };
}

function leerArchivoComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

/**
 * Serializa el objeto adjunto para almacenarlo en la columna `adjunto_url`
 */
export function serializarAdjunto(adjunto) {
  if (!adjunto) return null;
  if (typeof adjunto === "string") return adjunto;
  return JSON.stringify({
    url: adjunto.url,
    nombre: adjunto.nombre || "archivo",
    tipo: adjunto.tipo || "",
    tamano: adjunto.tamano || 0,
    esImagen: Boolean(adjunto.esImagen),
  });
}

/**
 * Deserializa la columna `adjunto_url` de un mensaje para obtener url, nombre e imagen
 */
export function deserializarAdjunto(adjuntoRaw) {
  if (!adjuntoRaw) return null;

  if (typeof adjuntoRaw === "object") {
    const esImg = esTipoImagen(adjuntoRaw.tipo, adjuntoRaw.url, adjuntoRaw.nombre);
    return { ...adjuntoRaw, esImagen: esImg };
  }

  const str = String(adjuntoRaw).trim();
  if (str.startsWith("{") && str.endsWith("}")) {
    try {
      const parsed = JSON.parse(str);
      const esImg = parsed.esImagen !== undefined
        ? Boolean(parsed.esImagen)
        : esTipoImagen(parsed.tipo, parsed.url, parsed.nombre);
      return {
        url: parsed.url || "",
        nombre: parsed.nombre || "archivo",
        tipo: parsed.tipo || "",
        tamano: parsed.tamano || 0,
        esImagen: esImg,
      };
    } catch {
      // no era json
    }
  }

  // Si era un string plano con la URL o DataURI directa
  const esImg = esTipoImagen("", str, "");
  return {
    url: str,
    nombre: esImg ? "imagen_adjunta.jpg" : "documento_adjunto",
    tipo: esImg ? "image/jpeg" : "application/octet-stream",
    tamano: 0,
    esImagen: esImg,
  };
}

/**
 * Descarga el archivo en el dispositivo del usuario
 */
export function descargarArchivoAdjunto(adjunto) {
  if (!adjunto || !adjunto.url) return;
  const link = document.createElement("a");
  link.href = adjunto.url;
  link.download = adjunto.nombre || (adjunto.esImagen ? "captura_ingeanclajes.jpg" : "archivo_adjunto");
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
