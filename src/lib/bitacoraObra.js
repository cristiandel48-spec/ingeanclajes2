// Bitacora de avance de una obra.
//
// Es lo que alimenta la persona que esta en campo: cada dia registra que se
// hizo, con sus fotos y el comentario de cada foto. El informe de actividades
// no se escribe desde cero: toma estos registros del periodo y los convierte
// en las actividades del documento.
//
//   obra  ->  bitacora (fotos + comentarios)  ->  informe de actividades
//         ->  personal + horarios             ->  tabla de personal
//
// Cada registro vive dentro de la obra (columna `bitacora`, migracion 027).

export function registroVacio(fecha) {
  return {
    id: "BIT-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    fecha: fecha || "",
    actividad: "",
    descripcion: "",
    observaciones: "",
    // Lo que avanzo la obra en esta jornada, en puntos de porcentaje: el
    // avance de la obra es la suma de todas (ver calcularAvanceObra). Es
    // obligatorio en las jornadas nuevas: hasta que se anota, el resto de la
    // jornada queda bloqueado. Las jornadas de antes de este cambio no lo
    // traen y no se bloquean (no tienen la marca avanceObligatorio).
    avance: null,
    avanceObligatorio: true,
    fotos: [],
  };
}

// La jornada pide el avance y todavia no lo tiene.
export function faltaAvance(registro) {
  return Boolean(registro?.avanceObligatorio) && registro?.avance === null;
}

// Deja el avance en un entero de 0 a 100, o null si no hay numero.
export function limpiarAvance(valor) {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Math.round(Number(valor));
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

// Avance de la obra = avance inicial + lo que suma cada jornada, hasta 100.
//
// Antes era el de la jornada mas reciente, como si cada una anotara el total.
// Pero en campo se anota lo que se avanzo ese dia: jornadas de 26% y 30%
// mostraban 30% en vez de 56%. El avance inicial es el que traia la obra al
// entrar al sistema o el que se le puso a mano antes (migracion 074).
//
// Devuelve { avance, inicial, jornadas, fecha }: `jornadas` es lo que suman
// las jornadas y `fecha` la de la ultima que trae avance (o null).
export function calcularAvanceObra(avanceInicial, bitacora) {
  const inicial = limpiarAvance(avanceInicial) ?? 0;
  const conAvance = normalizarBitacora(bitacora).filter((r) => r.avance !== null);
  const jornadas = conAvance.reduce((suma, r) => suma + r.avance, 0);
  return {
    avance: Math.min(100, inicial + jornadas),
    inicial,
    jornadas,
    fecha: conAvance.length ? conAvance[conAvance.length - 1].fecha : null,
  };
}

// Lo maximo que puede sumar una jornada sin que la obra pase de 100%: lo que
// falta, sin contar lo que ya tiene anotado esa misma jornada.
export function maximoParaJornada(avanceInicial, bitacora, registroId) {
  const otras = normalizarBitacora(bitacora).filter((r) => r.id !== registroId);
  const { avance } = calcularAvanceObra(avanceInicial, otras);
  return Math.max(0, 100 - avance);
}

export function fotoVacia() {
  return { img: null, comentario: "" };
}

// Normaliza lo que venga de la base o de datos viejos: siempre un arreglo de
// registros con la misma forma, ordenados por fecha.
export function normalizarBitacora(bitacora) {
  if (!Array.isArray(bitacora)) return [];
  return bitacora
    .filter(Boolean)
    .map((registro, i) => ({
      id: registro.id || "BIT-" + i,
      fecha: registro.fecha || "",
      actividad: registro.actividad || "",
      descripcion: registro.descripcion || "",
      observaciones: registro.observaciones || "",
      avance: limpiarAvance(registro.avance),
      avanceObligatorio: Boolean(registro.avanceObligatorio),
      fotos: Array.isArray(registro.fotos)
        ? registro.fotos
            .filter(Boolean)
            .filter((foto) => Boolean(foto?.img || foto?.url))
            .map((foto) => ({ img: foto.img || foto.url, comentario: foto.comentario || "" }))
        : [],
    }))
    .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
}

// Registros que caen dentro del periodo del informe. Sin fechas, devuelve todo.
export function registrosDelPeriodo(bitacora, desde, hasta) {
  return normalizarBitacora(bitacora).filter((registro) => {
    if (!registro.fecha) return true;
    if (desde && registro.fecha < desde) return false;
    if (hasta && registro.fecha > hasta) return false;
    return true;
  });
}

// Un registro sirve para el informe si tiene algo que contar: un titulo, una
// descripcion o al menos una foto.
export function registroTieneContenido(registro) {
  return Boolean(
    registro.actividad?.trim() ||
    registro.descripcion?.trim() ||
    registro.observaciones?.trim() ||
    (registro.fotos || []).some((foto) => foto.img)
  );
}

// Convierte los registros de bitacora en las actividades del informe. Es la
// traduccion de un formato al otro: mismo contenido, distinta pantalla.
//
// A DONDE VA CADA COSA:
//
//   obra · ¿Que se hizo?        ->  informe · Observaciones
//   obra · Descripcion          ->  informe · Descripcion
//   obra · Observaciones        ->  informe · Observaciones (detras de lo anterior)
//   obra · fecha y fotos        ->  informe · fecha y fotos
//   (el titulo queda vacio, se elige de la lista)
//
// El "¿que se hizo?" iba antes al TITULO, y no era su sitio: lo que se
// escribe en campo es una narracion -"Se realizo los 3 ensayos de traccion
// con el enerpac naranjado de los puntos de anclaje instalados el dia
// anterior"- y de titulo quedaba larguisimo. Ahora va a Observaciones, que
// es de donde la certificacion saca QUE se certifica, y el titulo se elige
// de la lista de trabajos.
export function bitacoraAActividades(registros) {
  return registros
    .filter(registroTieneContenido)
    .map((registro) => ({
      titulo: "",
      descripcion: registro.descripcion || "",
      observaciones: unirObservaciones(registro.actividad, registro.observaciones),
      fecha: registro.fecha || "",
      origenBitacoraId: registro.id,
      fotos: (registro.fotos || []).filter((foto) => foto.img).map((foto) => ({
        img: foto.img,
        comentario: foto.comentario || "",
      })),
    }));
}

// Junta lo que se hizo con las observaciones sueltas del registro, sin
// repetir si resultan ser lo mismo y cerrando la frase con punto.
function unirObservaciones(queSeHizo, observaciones) {
  const partes = [queSeHizo, observaciones]
    .map((t) => String(t || "").trim())
    .filter(Boolean);

  const vistas = [];
  for (const parte of partes) {
    const yaEsta = vistas.some((v) => v.toLowerCase() === parte.toLowerCase());
    if (!yaEsta) vistas.push(parte);
  }
  return vistas
    .map((t) => (/[.;:!?]$/.test(t) ? t : t + "."))
    .join(" ");
}

// Resumen para mostrar en la obra y en la guia de flujo.
export function resumenBitacora(bitacora, desde, hasta) {
  const registros = registrosDelPeriodo(bitacora, desde, hasta).filter(registroTieneContenido);
  const fotos = registros.reduce((suma, r) => suma + (r.fotos || []).filter((f) => f.img).length, 0);
  return {
    registros: registros.length,
    fotos,
    // Cuantos registros quedarian sin foto: el informe se ve pobre asi.
    sinFotos: registros.filter((r) => !(r.fotos || []).some((f) => f.img)).length,
  };
}
