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
//
// DE DONDE SALE CADA TEXTO: las que llevan la nota "tal cual la de los
// informes que ya se entregaron" estan copiadas de documentos reales y no hay
// que tocarlas. Las demas estan escritas a semejanza de esas, cambiando el
// vocabulario a cada sistema, y conviene que las revise quien firma el
// informe antes de darlas por buenas.

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
    // Descripcion tal cual la de los informes que ya se entregaron.
    titulo: "Instalación de línea de vida horizontal",
    // Las actividades siguen el orden real del trabajo: primero se decide
    // donde van los soportes, luego se fijan, se tiende el cable, se tensiona
    // y al final se comprueba y se identifica. La descripcion de abajo es la
    // de los informes ya entregados y no se toca; esto es el desglose.
    actividadesRealizadas: [
      "Se realizó una evaluación detallada de la cubierta para determinar las ubicaciones óptimas de los soportes laterales e intermedios.",
      "Se instalaron los soportes de extremo y los intermedios, asegurándolos firmemente a la estructura de la cubierta.",
      "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura, que no presentara porosidad.",
      "Se tendió el cable de acero a través de los soportes y se instalaron guardacables, tensor y absorbedor de energía.",
      "Se tensionó la línea dejándola dentro del rango indicado por el fabricante, para que en caso de caída la distancia sea mínima.",
      "Se verificó la tensión y la alineación del cable, y el libre desplazamiento del carro deslizador en todo el recorrido.",
      "Se aplicó pintura anticorrosiva sobre los elementos instalados y se instalaron las tarjetas de identificación del sistema.",
    ].join("\n"),
    descripcion:
      "Primero, se realizó una evaluación detallada de la cubierta para determinar las ubicaciones óptimas para " +
      "los soportes que sostendrán las líneas. A continuación, se instalaron estos soportes asegurándolos " +
      "firmemente a la cubierta, por ultimo se realizó la instalación de los cables o líneas horizontales. Este " +
      "cable se desliza a través de los soportes, asegurándolo con tensores para mantener la línea en la " +
      "posición deseada y evitar movimientos indeseados. Finalmente, se realiza una verificación de la tensión " +
      "y la alineación de los cables para asegurar que cumpla con los estándares de seguridad y funcionalidad.",
  },
  {
    // La vertical no es la horizontal puesta de pie: no lleva soportes
    // intermedios ni tensor a lo largo, sino un anclaje arriba y otro abajo,
    // el cable tensionado entre los dos y un deslizador que sube con la
    // persona. Por eso tiene su propia plantilla y no se reaprovecha aquella.
    titulo: "Instalación de línea de vida vertical",
    actividadesRealizadas: [
      "Se realizó la evaluación del sitio para definir el recorrido de la línea y los puntos de anclaje superior e inferior.",
      "Se instaló el anclaje superior sobre la estructura, verificando su fijación y capacidad de carga.",
      "Se instaló el anclaje inferior y se tendió el cable de acero entre los dos extremos.",
      "Se tensionó el cable dentro del rango indicado por el fabricante y se instaló el absorbedor de energía.",
      "Se instalaron las guiaderas intermedias para mantener el cable alineado en todo el recorrido.",
      "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura, que no presentara porosidad.",
      "Se verificó el libre desplazamiento del deslizador de arriba abajo y su bloqueo ante una caída simulada.",
      "Se aplicó pintura anticorrosiva sobre los elementos instalados y se instalaron las tarjetas de identificación del sistema.",
    ].join("\n"),
    descripcion:
      "Se realizó la instalación de la línea de vida vertical para el acceso seguro en altura. Primero se " +
      "evaluó el sitio para definir el recorrido de la línea y la ubicación de los anclajes superior e " +
      "inferior. Se instaló el anclaje superior sobre la estructura, verificando su fijación, y a " +
      "continuación el anclaje inferior, tendiendo entre ambos el cable de acero. El cable se tensionó " +
      "dentro del rango indicado por el fabricante y se le instaló su absorbedor de energía, junto con las " +
      "guiaderas que lo mantienen alineado en todo el recorrido. Finalmente se verificó el libre " +
      "desplazamiento del deslizador de arriba abajo y su bloqueo ante una caída, y se aplicó pintura " +
      "anticorrosiva sobre los elementos instalados. Con estas acciones se garantizó que la línea de vida " +
      "quedara completamente operativa y segura para su uso.",
  },
  {
    // Descripcion tal cual la de los informes que ya se entregaron.
    titulo: "Instalación de escalera",
    actividadesRealizadas: [
      "Se realizó la instalación de una escalera vertical fija a la fachada para el acceso a las cubiertas con cerramiento.",
      "Se ancló la escalera firmemente a la estructura para garantizar estabilidad estructural y durabilidad.",
      "Se instaló la línea de vida vertical sobre la escalera.",
      "Se realizó el ajuste a tornillería y se verificó el estado de la soldadura que no presentara porosidad",
    ].join("\n"),
    descripcion:
      "Se realizó la instalación de una escalera vertical fija a la fachada para el acceso a las cubiertas con " +
      "cerramiento. La escalera se encuentra anclada firmemente para garantizar estabilidad estructural y " +
      "durabilidad.",
  },
  {
    // Escrita a partir de la memoria tecnica que va en la cotizacion, pasada
    // a lo que se hizo. Las medidas y los perfiles se cambian en cada obra:
    // los de aqui son los que mas se repiten, no una regla.
    titulo: "Instalación de pérgola",
    actividadesRealizadas: [
      "Se fabricó la estructura metálica de la pérgola de acuerdo con los cálculos estructurales aprobados.",
      "Se instalaron las columnas en tubería cuadrada de 150 mm x 150 mm en 4.0 mm (Acero ASTM A36).",
      "Se montaron las vigas longitudinales y transversales en tubería rectangular de 305 x 80 mm en 2.5 mm (Acero ASTM A36).",
      "Se instalaron las correas en tubería rectangular de 80 mm x 40 mm en 2.5 mm (Acero ASTM A36).",
      "Se instaló la cubierta en teja UPVC de 2.5 mm, cresta alta.",
      "Se aplicaron dos capas de anticorrosivo y dos capas del color final acordado con el cliente.",
      "Se verificó el aplome de las columnas y el estado de la soldadura, que no presentara porosidad.",
    ].join("\n"),
    descripcion:
      "Se realizó la fabricación e instalación de la estructura de la pérgola en estructura metálica, de acuerdo " +
      "con los cálculos estructurales aprobados. Las columnas se ejecutaron en tubería cuadrada de 150 mm x 150 " +
      "mm en 4.0 mm y las vigas longitudinales y transversales en tubería rectangular de 305 x 80 mm en 2.5 mm, " +
      "ambas en acero ASTM A36, con correas en tubería rectangular de 80 mm x 40 mm. La cubierta se instaló en " +
      "teja UPVC de 2.5 mm de cresta alta. Toda la estructura fue pintada con dos capas de anticorrosivo y dos " +
      "capas del color final acordado con el cliente. Finalmente se verificó el aplome de las columnas y el " +
      "estado de las soldaduras, garantizando que la pérgola quedara estable y terminada.",
  },
  {
    // Distinta de "Instalación de escalera": aquella es la escalera fija a
    // fachada con linea de vida vertical, y esta es la de acceso a cubierta
    // sin linea de vida. En obra son dos trabajos que se cotizan aparte.
    titulo: "Instalación de escalera metálica",
    actividadesRealizadas: [
      "Se fabricó la escalera metálica de acceso a cubierta según las medidas tomadas en sitio.",
      "Se instaló la escalera y se ancló firmemente a la estructura.",
      "Se verificó la fijación de peldaños y largueros, y el estado de la soldadura, que no presentara porosidad.",
      "Se aplicó pintura anticorrosiva sobre los elementos instalados.",
    ].join("\n"),
    descripcion:
      "Se realizó el suministro e instalación de una escalera metálica para el acceso a cubierta. La escalera " +
      "quedó anclada firmemente a la estructura, garantizando estabilidad estructural y durabilidad. Se " +
      "verificó la fijación de peldaños y largueros y el estado de las soldaduras, y se aplicó pintura " +
      "anticorrosiva sobre los elementos instalados.",
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
    // La prueba de carga con la que se comprueba que un punto de anclaje
    // aguanta. Escrita a partir de los informes de esos dias: el ensayo con
    // el gato hidraulico, las 5.000 lb de la resolucion y las tarjetas.
    titulo: "Ensayos de tracción",
    actividadesRealizadas: [
      "Se realizaron los ensayos de tracción con gato hidráulico sobre los puntos de anclaje instalados.",
      "Se aplicó la carga de prueba a cada punto para medir su resistencia y verificar el cumplimiento de las 5.000 lb exigidas.",
      "Se verificó que ningún punto presentara deformación, desprendimiento ni juego en su fijación tras la prueba.",
      "Se realizó el mantenimiento de cada punto y se aplicó pintura anticorrosiva para su acabado final.",
      "Se instalaron las placas y tarjetas de identificación de los puntos ensayados.",
      "No se identificaron puntos afectados o en mal estado, por lo tanto no fue necesario ningún reemplazo.",
    ].join("\n"),
    descripcion:
      "Se realizaron los ensayos de tracción sobre los puntos de anclaje instalados, aplicando con gato " +
      "hidráulico las correspondientes pruebas de carga o presión, las cuales permiten medir la resistencia de " +
      "cada punto de anclaje para cumplir con las 5.000 lb de carga. Se verificó que ninguno presentara " +
      "deformación ni desprendimiento tras la prueba. A cada punto se le hizo mantenimiento y para su acabado " +
      "final se pintaron con anticorrosivo, y por último se instalaron las placas para su identificación. Con " +
      "estas acciones se garantizó que los puntos de anclaje quedaran certificados y seguros para su uso.",
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

// Para comparar titulos: sin mayusculas, sin tildes y sin espacios de sobra.
//
// Lo de las tildes no es un capricho: en los informes ya entregados el titulo
// esta escrito "instalacion de escalera", sin tilde. Comparando tal cual, esa
// no encontraba su plantilla y habia que escribir los textos a mano.
const paraComparar = (t) =>
  normalizar(t).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Devuelve la plantilla cuyo titulo coincide, se escriba como se escriba. */
export function buscarPlantillaActividad(titulo) {
  const buscado = paraComparar(titulo);
  if (!buscado) return null;
  return PLANTILLAS_ACTIVIDAD.find((p) => paraComparar(p.titulo) === buscado) || null;
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
