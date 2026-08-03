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
    fotos: [],
  };
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
      fotos: Array.isArray(registro.fotos)
        ? registro.fotos
            .filter(Boolean)
            .map((foto) => ({ img: foto.img || foto.url || null, comentario: foto.comentario || "" }))
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
export function bitacoraAActividades(registros) {
  return registros
    .filter(registroTieneContenido)
    .map((registro) => ({
      titulo: registro.actividad || "Actividad ejecutada",
      descripcion: registro.descripcion || "",
      observaciones: registro.observaciones || "",
      fecha: registro.fecha || "",
      origenBitacoraId: registro.id,
      fotos: (registro.fotos || []).filter((foto) => foto.img).map((foto) => ({
        img: foto.img,
        comentario: foto.comentario || "",
      })),
    }));
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
