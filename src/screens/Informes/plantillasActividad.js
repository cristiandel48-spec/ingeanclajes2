// Textos que se repiten en los informes de actividades.
//
// POR QUE: los trabajos son siempre los mismos -certificar, recertificar,
// instalar o mantener lineas de vida, puntos de anclaje y escaleras- y el
// texto que se escribe es practicamente igual cada vez. Tenerlo aqui evita
// reescribirlo y, sobre todo, evita que cada informe lo diga distinto.
//
// COMO SE USA: al elegir el titulo de la actividad se rellenan solas las
// "Actividades realizadas" y la "Descripcion". Siguen siendo editables: la
// plantilla es el punto de partida, no la ultima palabra. Si en la obra pasó
// algo distinto -hubo que cambiar una pieza, el cable estaba flojo- hay que
// corregirlo a mano, porque el informe dice lo que de verdad se hizo.
//
// PARA AÑADIR UNA: se copia un bloque y se cambian los tres campos. Aparece
// sola en la lista del titulo.

/**
 * @typedef {Object} PlantillaActividad
 * @property {string} titulo                nombre que se ve en la lista
 * @property {string} actividadesRealizadas lo que se hizo, una linea por punto
 * @property {string} descripcion           el parrafo de resumen
 */

// Punto de partida: el texto que ya se venia usando para la certificacion de
// lineas de vida horizontales. Los demas siguen su misma forma.
const INSPECCION_LVH = [
  "Se realizó la inspección visual y física de todos elementos que componen el sistema, soportes laterales e intermedios, cable, guardacables, tensor. Etc",
  "No fue necesario realizar ajustes al cable ya que este se encontraba en óptimas condiciones de tensión.",
  "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura que no presentara porosidad",
  "Se realizó limpieza del sistema y la aplicación de pintura anticorrosiva sobre los elementos inspeccionados.",
  "Se actualizó fechas en las tarjetas de identificación de los sistemas",
  "No se identificaron componentes afectados o en mal estado, por lo tanto no fue necesario ningún reemplazo.",
].join("\n");

const DESCRIPCION_LVH =
  "Se realizaron labores de mantenimiento en los soportes de las líneas de vida, las cuales incluyeron una " +
  "limpieza a fondo de todo el sistema metálico y la aplicación de una capa de pintura anticorrosiva en los " +
  "soportes y anclajes, con el fin de protegerlos de futuras corrosiones. Finalmente, se verificó el sistema " +
  "completo, asegurando que todos los elementos estuvieran en óptimas condiciones. Con estas acciones, se " +
  "garantizó que las líneas de vida quedaran completamente operativas y seguras para su uso.";

/** @type {PlantillaActividad[]} */
export const PLANTILLAS_ACTIVIDAD = [
  {
    titulo: "Certificación Líneas de Vida Horizontales",
    actividadesRealizadas: INSPECCION_LVH,
    descripcion: DESCRIPCION_LVH,
  },
  {
    titulo: "Recertificación Líneas de Vida Horizontales",
    actividadesRealizadas: INSPECCION_LVH,
    descripcion: DESCRIPCION_LVH,
  },
  {
    titulo: "Certificación Líneas de Vida Verticales",
    actividadesRealizadas: [
      "Se realizó la inspección visual y física de todos los elementos que componen el sistema, anclaje superior e inferior, cable, guiadera y absorbedor de energía.",
      "No fue necesario realizar ajustes al cable ya que este se encontraba en óptimas condiciones de tensión.",
      "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura que no presentara porosidad",
      "Se realizó limpieza del sistema y la aplicación de pintura anticorrosiva sobre los elementos inspeccionados.",
      "Se verificó el libre desplazamiento del deslizador a lo largo de todo el recorrido.",
      "Se actualizó fechas en las tarjetas de identificación de los sistemas",
      "No se identificaron componentes afectados o en mal estado, por lo tanto no fue necesario ningún reemplazo.",
    ].join("\n"),
    descripcion:
      "Se realizaron labores de mantenimiento sobre la línea de vida vertical, las cuales incluyeron la limpieza " +
      "del sistema metálico y la aplicación de una capa de pintura anticorrosiva en los anclajes y soportes, con " +
      "el fin de protegerlos de futuras corrosiones. Se verificó el libre desplazamiento del deslizador en todo " +
      "el recorrido y el estado del absorbedor de energía. Con estas acciones, se garantizó que el sistema " +
      "quedara completamente operativo y seguro para su uso.",
  },
  {
    titulo: "Recertificación Líneas de Vida Verticales",
    actividadesRealizadas: [
      "Se realizó la inspección visual y física de todos los elementos que componen el sistema, anclaje superior e inferior, cable, guiadera y absorbedor de energía.",
      "No fue necesario realizar ajustes al cable ya que este se encontraba en óptimas condiciones de tensión.",
      "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura que no presentara porosidad",
      "Se realizó limpieza del sistema y la aplicación de pintura anticorrosiva sobre los elementos inspeccionados.",
      "Se verificó el libre desplazamiento del deslizador a lo largo de todo el recorrido.",
      "Se actualizó fechas en las tarjetas de identificación de los sistemas",
      "No se identificaron componentes afectados o en mal estado, por lo tanto no fue necesario ningún reemplazo.",
    ].join("\n"),
    descripcion:
      "Se realizaron labores de mantenimiento sobre la línea de vida vertical, las cuales incluyeron la limpieza " +
      "del sistema metálico y la aplicación de una capa de pintura anticorrosiva en los anclajes y soportes, con " +
      "el fin de protegerlos de futuras corrosiones. Se verificó el libre desplazamiento del deslizador en todo " +
      "el recorrido y el estado del absorbedor de energía. Con estas acciones, se garantizó que el sistema " +
      "quedara completamente operativo y seguro para su uso.",
  },
  {
    titulo: "Certificación Puntos de Anclaje",
    actividadesRealizadas: [
      "Se realizó la inspección visual y física de todos los puntos de anclaje, verificando placa de reparto, tornillería y argolla.",
      "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura que no presentara porosidad",
      "Se verificó la fijación de cada punto a la estructura y que no presentara juego ni deformación.",
      "Se realizó limpieza del sistema y la aplicación de pintura anticorrosiva sobre los elementos inspeccionados.",
      "Se actualizó fechas en las tarjetas de identificación de los sistemas",
      "No se identificaron componentes afectados o en mal estado, por lo tanto no fue necesario ningún reemplazo.",
    ].join("\n"),
    descripcion:
      "Se realizaron labores de mantenimiento sobre los puntos de anclaje, las cuales incluyeron la limpieza del " +
      "sistema metálico y la aplicación de una capa de pintura anticorrosiva en las placas de reparto y la " +
      "tornillería, con el fin de protegerlos de futuras corrosiones. Se verificó la fijación de cada punto a la " +
      "estructura y el estado de sus argollas. Con estas acciones, se garantizó que los puntos de anclaje " +
      "quedaran completamente operativos y seguros para su uso.",
  },
  {
    titulo: "Recertificación Puntos de Anclaje",
    actividadesRealizadas: [
      "Se realizó la inspección visual y física de todos los puntos de anclaje, verificando placa de reparto, tornillería y argolla.",
      "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura que no presentara porosidad",
      "Se verificó la fijación de cada punto a la estructura y que no presentara juego ni deformación.",
      "Se realizó limpieza del sistema y la aplicación de pintura anticorrosiva sobre los elementos inspeccionados.",
      "Se actualizó fechas en las tarjetas de identificación de los sistemas",
      "No se identificaron componentes afectados o en mal estado, por lo tanto no fue necesario ningún reemplazo.",
    ].join("\n"),
    descripcion:
      "Se realizaron labores de mantenimiento sobre los puntos de anclaje, las cuales incluyeron la limpieza del " +
      "sistema metálico y la aplicación de una capa de pintura anticorrosiva en las placas de reparto y la " +
      "tornillería, con el fin de protegerlos de futuras corrosiones. Se verificó la fijación de cada punto a la " +
      "estructura y el estado de sus argollas. Con estas acciones, se garantizó que los puntos de anclaje " +
      "quedaran completamente operativos y seguros para su uso.",
  },
  {
    titulo: "Certificación Escalera Fija con Línea de Vida Vertical",
    actividadesRealizadas: [
      "Se realizó la inspección visual y física de la escalera fija, verificando peldaños, largueros y su fijación a la estructura.",
      "Se realizó la inspección de la línea de vida vertical instalada sobre la escalera, anclaje superior e inferior, cable y absorbedor de energía.",
      "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura que no presentara porosidad",
      "Se realizó limpieza del sistema y la aplicación de pintura anticorrosiva sobre los elementos inspeccionados.",
      "Se actualizó fechas en las tarjetas de identificación de los sistemas",
      "No se identificaron componentes afectados o en mal estado, por lo tanto no fue necesario ningún reemplazo.",
    ].join("\n"),
    descripcion:
      "Se realizaron labores de mantenimiento sobre la escalera fija y su línea de vida vertical, las cuales " +
      "incluyeron una limpieza a fondo del sistema metálico y la aplicación de una capa de pintura " +
      "anticorrosiva en peldaños, largueros y anclajes, con el fin de protegerlos de futuras corrosiones. " +
      "Finalmente, se verificó el sistema completo, asegurando que todos los elementos estuvieran en óptimas " +
      "condiciones. Con estas acciones, se garantizó que la escalera quedara completamente operativa y segura " +
      "para su uso.",
  },
  {
    titulo: "Instalación Líneas de Vida Horizontales",
    actividadesRealizadas: [
      "Se realizó el replanteo y la marcación de los puntos de fijación de acuerdo con el diseño aprobado.",
      "Se instalaron los soportes laterales e intermedios y se verificó su fijación a la estructura.",
      "Se tendió y tensionó el cable, dejándolo dentro del rango de tensión indicado por el fabricante.",
      "Se instalaron guardacables, tensor y absorbedor de energía.",
      "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura que no presentara porosidad",
      "Se aplicó pintura anticorrosiva sobre los elementos instalados y se instalaron las tarjetas de identificación del sistema.",
    ].join("\n"),
    descripcion:
      "Se realizó la instalación de la línea de vida horizontal de acuerdo con el diseño aprobado, incluyendo el " +
      "montaje de los soportes laterales e intermedios, el tendido y tensionado del cable y la instalación de " +
      "sus accesorios. Se aplicó pintura anticorrosiva sobre los elementos instalados y se verificó el sistema " +
      "completo, asegurando que todos los elementos quedaran en óptimas condiciones. Con estas acciones, se " +
      "garantizó que la línea de vida quedara completamente operativa y segura para su uso.",
  },
  {
    titulo: "Instalación Puntos de Anclaje",
    actividadesRealizadas: [
      "Se realizó el replanteo y la marcación de los puntos de anclaje de acuerdo con el diseño aprobado.",
      "Se instalaron las placas de reparto y se verificó su fijación a la estructura.",
      "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura que no presentara porosidad",
      "Se aplicó pintura anticorrosiva sobre los elementos instalados.",
      "Se instalaron las tarjetas de identificación de los sistemas.",
    ].join("\n"),
    descripcion:
      "Se realizó la instalación de los puntos de anclaje de acuerdo con el diseño aprobado, incluyendo el " +
      "montaje de las placas de reparto y su fijación a la estructura. Se aplicó pintura anticorrosiva sobre " +
      "los elementos instalados y se verificó cada punto, asegurando que quedara en óptimas condiciones. Con " +
      "estas acciones, se garantizó que los puntos de anclaje quedaran completamente operativos y seguros para " +
      "su uso.",
  },
  {
    titulo: "Mantenimiento Preventivo de Sistemas Anticaídas",
    actividadesRealizadas: [
      "Se realizó la inspección visual y física de todos los sistemas anticaídas instalados en la sede.",
      "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura que no presentara porosidad",
      "Se realizó limpieza del sistema y la aplicación de pintura anticorrosiva sobre los elementos inspeccionados.",
      "Se actualizó fechas en las tarjetas de identificación de los sistemas",
      "No se identificaron componentes afectados o en mal estado, por lo tanto no fue necesario ningún reemplazo.",
    ].join("\n"),
    descripcion:
      "Se realizaron labores de mantenimiento preventivo sobre los sistemas anticaídas de la sede, las cuales " +
      "incluyeron una limpieza a fondo del sistema metálico y la aplicación de una capa de pintura " +
      "anticorrosiva en soportes y anclajes, con el fin de protegerlos de futuras corrosiones. Finalmente, se " +
      "verificaron los sistemas completos, asegurando que todos los elementos estuvieran en óptimas " +
      "condiciones. Con estas acciones, se garantizó que quedaran completamente operativos y seguros para su uso.",
  },
];

const normalizar = (t) => String(t || "").trim().replace(/\s+/g, " ");

/** Devuelve la plantilla cuyo titulo coincide, sin fijarse en mayusculas ni espacios. */
export function buscarPlantillaActividad(titulo) {
  const buscado = normalizar(titulo).toLowerCase();
  if (!buscado) return null;
  return PLANTILLAS_ACTIVIDAD.find(
    (p) => normalizar(p.titulo).toLowerCase() === buscado
  ) || null;
}

/**
 * Si lo que hay escrito salio tal cual de una plantilla -o no hay nada-.
 *
 * Sirve para no preguntar de mas: cambiar de plantilla cuando aun no se ha
 * tocado el texto no pierde trabajo de nadie, pero pisar algo escrito a mano
 * si, y eso hay que confirmarlo.
 */
export function esTextoDePlantilla(actividadesRealizadas, descripcion) {
  const a = normalizar(actividadesRealizadas);
  const d = normalizar(descripcion);
  if (!a && !d) return true;
  return PLANTILLAS_ACTIVIDAD.some(
    (p) => normalizar(p.actividadesRealizadas) === a && normalizar(p.descripcion) === d
  );
}
