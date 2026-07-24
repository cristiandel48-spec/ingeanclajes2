// Descarga de archivos generados en el navegador
export function downloadGeneratedFile(file){
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function sanitizeFileName(v=""){
  return String(v || "documento")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^a-zA-Z0-9._-]+/g,"-")
    .replace(/-{2,}/g,"-")
    .replace(/^-|-$/g,"") || "documento";
}

