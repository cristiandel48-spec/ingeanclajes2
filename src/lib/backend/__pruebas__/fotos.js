// Ayudas para las pruebas de fotos en Storage. Solo las usan los *.test.js.

// Una "foto" de 12 KB: el contenido no importa, solo que sea data:image.
export function fotoFalsa(semilla = 1) {
  const bytes = new Uint8Array(12 * 1024).map((_, i) => (i * semilla) % 251);
  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return `data:image/jpeg;base64,${btoa(binario)}`;
}

// Storage en memoria con la forma de supabase-js.
export function storageFalso({ falla = null } = {}) {
  const archivos = new Map();
  const subidas = [];
  return {
    archivos,
    subidas,
    from: () => ({
      upload: async (ruta, blob) => {
        subidas.push(ruta);
        if (falla) return { data: null, error: falla };
        if (archivos.has(ruta)) return { data: null, error: { statusCode: "409", message: "The resource already exists" } };
        archivos.set(ruta, blob);
        return { data: { path: ruta }, error: null };
      },
      download: async (ruta) => {
        const blob = archivos.get(ruta);
        return blob ? { data: blob, error: null } : { data: null, error: { message: "Object not found" } };
      },
    }),
  };
}
