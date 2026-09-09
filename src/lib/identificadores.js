// Identificadores de los registros que crea la aplicacion.
//
// POR QUE EXISTE ESTE ARCHIVO: los ids se generaban contando cuantos habia
// -`COT-${cotizaciones.length+1}`- y eso PIERDE DATOS. Basta con borrar un
// registro para que el contador retroceda y vuelva a dar un id que ya existe;
// como el id es la clave con la que se guarda en la base, el registro nuevo no
// se crea: PISA al que ya estaba. Se pierden dos de una vez, el viejo que se
// destruye y el nuevo que nunca aparece como tal.
//
// Se noto porque en el listado de cotizaciones faltaban numeros -COT-001, 008,
// 010 y 011- y una obra recien aprobada no aparecia por ningun lado.

/**
 * Devuelve un id con el formato de siempre (COT-012, OB-004…) pero comprobando
 * que no lo tenga nadie.
 *
 * Se sigue empezando por la cuenta de registros para que la numeracion salga
 * natural; la diferencia es que si ese numero esta cogido, se sigue subiendo
 * hasta encontrar uno libre en vez de machacar lo que hay.
 *
 * @param {Array}  lista   registros existentes de esa entidad
 * @param {string} prefijo "COT", "OB", "CERT"…
 */
export function siguienteIdUnico(lista, prefijo, ancho = 3) {
  const registros = Array.isArray(lista) ? lista : [];
  const usados = new Set(
    registros.map((r) => String(r?.id ?? "").trim()).filter(Boolean)
  );

  // Busca el mayor consecutivo numérico ya usado para este prefijo (ej: OB-030 -> 30)
  const regex = new RegExp(`^${prefijo}-(\\d+)$`, "i");
  let maxNum = 0;
  for (const id of usados) {
    const match = id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (Number.isFinite(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  let n = maxNum > 0 ? maxNum + 1 : registros.length + 1;
  let id = `${prefijo}-${String(n).padStart(ancho, "0")}`;
  // El tope evita un bucle infinito si algo raro pasa con la lista.
  const tope = Math.max(n, registros.length) + 1000;
  while (usados.has(id) && n <= tope) {
    n += 1;
    id = `${prefijo}-${String(n).padStart(ancho, "0")}`;
  }

  // Si ni asi -no deberia pasar nunca-, se cae a un id con marca de tiempo:
  // feo, pero unico. Antes que pisar un registro, cualquier cosa.
  return usados.has(id) ? `${prefijo}-${Date.now()}` : id;
}
