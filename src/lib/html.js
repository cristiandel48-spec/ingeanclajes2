// Escapes compartidos para HTML/XML generado
export function escapeXml(value=""){
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeHtml(v=""){
  return String(v)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// La firma que dibuja el cliente llega por un enlace publico y se pone en el
// src de un <img>. Solo pasa si es una imagen en base64 y nada mas: con unas
// comillas dentro podia meter codigo en la hoja que imprime el equipo.
const IMAGEN_BASE64 = /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/;
export function imagenDeFirmaSegura(v=""){
  const s = String(v ?? "").trim();
  return IMAGEN_BASE64.test(s) ? s : "";
}
