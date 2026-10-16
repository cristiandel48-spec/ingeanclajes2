// Nombre del archivo con el que se descarga un documento.
//
// Los tres documentos que se le mandan al cliente -cotizacion, informe y
// certificado- lo armaban cada uno por su cuenta, y el del certificado se
// quedaba en «Certificación CERT-002 - CLIENTE»: en una carpeta con veinte,
// eso no dice de cual obra es.
//
// La regla es la misma para los tres: consecutivo, obra y cliente, sin
// repetir lo que ya se dijo, sin los caracteres que Windows no admite en un
// nombre de archivo, y recortado para que no pase del limite de la ruta.

/**
 * @param {string} tipo    «Cotización», «Informe de actividades», «Certificación»…
 * @param {Array<string>} partes  Consecutivo, obra, cliente… en ese orden.
 * @returns {string} Nombre listo, sin la extension.
 */
export function nombreDocumento(tipo, partes = []) {
  const vistas = [];
  for (const parte of [tipo, ...partes]) {
    const limpia = String(parte || "").trim();
    if (!limpia) continue;
    // Si una parte y otra son lo mismo, se queda la primera. Se comprueba en
    // las dos direcciones a proposito: la obra suele llamarse como el
    // cliente, y entonces una es «CONVIVIENDA» y la otra «CONVIVIENDA
    // S.A.S». Mirando solo si la nueva esta dentro de la vieja, el nombre
    // salia tartamudeando: «CERT-009 CONVIVIENDA CONVIVIENDA S.A.S».
    const baja = limpia.toLowerCase();
    const yaEsta = vistas.some((v) => {
      const vb = v.toLowerCase();
      return vb === baja || vb.includes(baja) || baja.includes(vb);
    });
    if (!yaEsta) vistas.push(limpia);
  }

  return vistas
    .join(" ")
    // Los que Windows rechaza en un nombre de archivo.
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120) || "Documento";
}
