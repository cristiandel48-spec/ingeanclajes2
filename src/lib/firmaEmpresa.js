// Firma escaneada de la empresa. Se sube una sola vez (desde el formulario de
// cotizaciones) y queda disponible para todos los documentos: cotizaciones,
// certificaciones e informes de actividades.
//
// Se guarda como data URI dentro de app.empresa_config, en una unica fila por
// tenant, igual que las fotos de las propuestas. Asi no dependemos de un
// almacenamiento de archivos aparte y la firma viaja con el resto del estado.

export const EMPRESA_CONFIG_ID = "empresa";

// Limite de peso del archivo original. Una firma escaneada razonable pesa
// mucho menos; el tope evita que alguien suba una foto de 8 MP y bloquee el
// guardado en la nube.
export const FIRMA_MAX_BYTES = 2 * 1024 * 1024;

export function getEmpresaConfig(empresaConfig) {
  const lista = Array.isArray(empresaConfig) ? empresaConfig : [];
  return lista.find((row) => row?.id === EMPRESA_CONFIG_ID) || null;
}

export function getFirmaImg(empresaConfig) {
  return getEmpresaConfig(empresaConfig)?.firmaImg || "";
}

// Devuelve la lista completa con la firma actualizada, creando la fila si
// todavia no existe. El autoguardado del contexto se encarga del resto.
export function setFirmaImg(empresaConfig, firmaImg) {
  const lista = Array.isArray(empresaConfig) ? empresaConfig : [];
  const actual = getEmpresaConfig(lista);
  const fila = { ...(actual || { id: EMPRESA_CONFIG_ID }), firmaImg: firmaImg || "" };
  if (!actual) return [...lista, fila];
  return lista.map((row) => (row?.id === EMPRESA_CONFIG_ID ? fila : row));
}

// Lee un archivo de imagen como data URI. Rechaza lo que no sea imagen o pese
// de mas, con un mensaje que la persona pueda entender.
export function leerFirmaComoDataUri(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No se selecciono ningun archivo."));
      return;
    }
    if (!file.type?.startsWith("image/")) {
      reject(new Error("El archivo debe ser una imagen (PNG o JPG)."));
      return;
    }
    if (file.size > FIRMA_MAX_BYTES) {
      reject(new Error("La imagen pesa mas de 2 MB. Usa una version mas liviana."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.readAsDataURL(file);
  });
}
