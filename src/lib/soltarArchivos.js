// Fotos y documentos se pueden arrastrar a sus recuadros (ZonaArchivos). Si se
// sueltan fuera, el navegador abre el archivo en lugar de la app y se pierde
// lo que se estaba escribiendo. Esto lo evita: fuera de un recuadro, soltar no
// hace nada. Los recuadros lo atienden antes (React escucha en la raiz, que
// esta por debajo de window), asi que si ya lo hicieron se deja en paz.

const traeArchivos = (evento) => Array.from(evento.dataTransfer?.types || []).includes("Files");

function soltarFueraDeRecuadro(evento) {
  if (evento.defaultPrevented || !traeArchivos(evento)) return;
  evento.preventDefault();
  if (evento.type === "dragover") evento.dataTransfer.dropEffect = "none";
}

export function protegerSoltarFuera(destino = window) {
  destino.addEventListener("dragover", soltarFueraDeRecuadro);
  destino.addEventListener("drop", soltarFueraDeRecuadro);
}
