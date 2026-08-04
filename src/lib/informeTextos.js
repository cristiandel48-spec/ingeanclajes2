// Reparto del texto de una actividad entre sus dos campos.
//
// Durante un tiempo "actividades realizadas" y "descripción" se escribieron
// juntos en un solo campo, con los encabezados dentro del propio texto. Salia
// un ladrillo: dos parrafos largos pegados en el mismo recuadro, con las
// palabras ACTIVIDADES REALIZADAS y DESCRIPCIÓN sueltas en medio.
//
// Ahora son dos campos y el rotulo lo pone la tabla del documento. Esto separa
// lo que ya estaba guardado, para no tener que recortar y pegar informe por
// informe.

// El encabezado que abre el bloque de descripcion. Se acepta con tilde y sin
// ella, y con los dos puntos o las comillas que se colaron al escribirlo.
const CORTE_DESCRIPCION = /\bDESCRIPCI[ÓO]N\b\s*[:"“]?\s*/;
const ENCABEZADO_ACTIVIDADES = /^\s*[:"“]?\s*ACTIVIDADES\s+REALIZADAS\b\s*[:"“]?\s*/i;

// Comillas sueltas al principio o al final: son las que quedaron de escribir el
// bloque entrecomillado, y sin su pareja no significan nada.
const limpiar = (texto) =>
  String(texto || "")
    .replace(/^[\s"“”']+/, "")
    .replace(/[\s"“”']+$/, "")
    .trim();

/**
 * Devuelve { realizadas, descripcion } a partir de un texto que puede traer
 * los dos bloques juntos.
 *
 * Si no aparece el encabezado de descripcion, todo se queda en `realizadas`:
 * es texto que alguien escribio, y repartirlo a ojo seria inventar.
 */
export function separarTextoActividad(texto) {
  const completo = String(texto || "").trim();
  if (!completo) return { realizadas: "", descripcion: "" };

  const corte = completo.search(CORTE_DESCRIPCION);
  if (corte < 0) {
    return { realizadas: limpiar(completo.replace(ENCABEZADO_ACTIVIDADES, "")), descripcion: "" };
  }

  const antes = completo.slice(0, corte);
  const despues = completo.slice(corte).replace(CORTE_DESCRIPCION, "");

  return {
    realizadas: limpiar(antes.replace(ENCABEZADO_ACTIVIDADES, "")),
    descripcion: limpiar(despues),
  };
}

/**
 * Acomoda una actividad guardada al formato de dos campos.
 *
 * Solo actua cuando `actividadesRealizadas` aun no existe: una vez separada, lo
 * que haya en cada campo manda y no se vuelve a tocar.
 */
export function conActividadSeparada(actividad = {}) {
  if (actividad.actividadesRealizadas !== undefined) return actividad;

  const { realizadas, descripcion } = separarTextoActividad(actividad.descripcion);
  return { ...actividad, actividadesRealizadas: realizadas, descripcion };
}
