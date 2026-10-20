// Aviso de avance mientras se genera un PDF (hallazgo R5).
//
// Cada hoja se fotografia en el hilo principal del navegador: con fotos tarda
// unos segundos y la pantalla no responde. Sin aviso parecia que el programa
// se habia colgado y la gente volvia a pulsar el boton. Ahora se ve el
// logotipo, «hoja 2 de 5» y la barra avanzando.
//
// Si quien llama ya muestra su propio avance (pasa onProgreso), no se pone
// otro encima.

import { mostrarProgreso } from "./dialogos";

export function avanceDePdf(onProgreso) {
  if (onProgreso) return { hoja: onProgreso, cerrar() {} };
  const aviso = mostrarProgreso("Preparando el PDF…");
  return {
    hoja: (actual, total) => aviso.actualizar(`Generando el PDF · hoja ${actual} de ${total}`, (actual - 1) / total),
    cerrar: aviso.cerrar,
  };
}

// Espera a que el navegador pinte: el avance, o el documento dentro de su
// marco (`ventana`). Con la pestaña en segundo plano el navegador no pinta
// (requestAnimationFrame no llega) y el PDF se quedaba detenido hasta volver
// a ella; el tope de tiempo lo deja seguir.
export const dejarPintar = (ventana = window) =>
  new Promise((listo) => {
    let hecho = false;
    const seguir = () => {
      if (hecho) return;
      hecho = true;
      setTimeout(listo, 0);
    };
    ventana.requestAnimationFrame(seguir);
    setTimeout(seguir, 100);
  });
