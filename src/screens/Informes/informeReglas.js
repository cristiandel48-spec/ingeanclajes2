import { today } from "../../lib/format";
import { DEFAULT_INFORME_ACTIVIDADES, DEFAULT_INFORME_DESCRIPCION } from "../../data/seed";
import { conActividadSeparada } from "../../lib/informeTextos";
import { informeRepetido } from "../../lib/duplicados";
import { correoValido } from "../../lib/quienRecibe";

export function crearActividadVacia() {
  return {
    titulo: "",
    actividadesRealizadas: DEFAULT_INFORME_ACTIVIDADES,
    descripcion: DEFAULT_INFORME_DESCRIPCION,
    observaciones: "",
    fecha: "",
    fotos: [],
  };
}

export function normalizarActividadesInforme(data = {}) {
  if (Array.isArray(data.actividades) && data.actividades.length) {
    return data.actividades.map(conActividadSeparada).map((actividad) => ({
      ...crearActividadVacia(),
      ...actividad,
      fotos: Array.isArray(actividad?.fotos)
        ? actividad.fotos
            .filter((foto) => Boolean(foto?.img || foto?.url))
            .map((foto) => ({ img: foto.img || foto.url, comentario: foto.comentario || "" }))
        : [],
    }));
  }
  if (data.actividad || data.descripcion || data.observaciones || (Array.isArray(data.fotos) && data.fotos.length)) {
    return [
      {
        ...crearActividadVacia(),
        titulo: data.actividad || "",
        descripcion: data.descripcion || "",
        observaciones: data.observaciones || "",
        fotos: Array.isArray(data.fotos)
          ? data.fotos
              .filter((foto) => Boolean(foto?.img || foto?.url))
              .map((foto) => ({ img: foto.img || foto.url, comentario: foto.comentario || "" }))
          : [],
      },
    ];
  }
  return [crearActividadVacia()];
}

export function construirActividadDesdeItemCot(it = {}, cotNumero = "", fecha = today()) {
  const cantStr = `${it.cant || 1} ${it.unit || "Und"}`;
  const descItem = String(it.desc || "Actividad cotizada").trim();
  return {
    ...crearActividadVacia(),
    titulo: descItem,
    actividadesRealizadas: `Suministro, instalación y verificación técnica de ${cantStr} de ${descItem}. Fijación, alineación e inspección técnica conforme a requerimiento.`,
    descripcion: `Trabajos ejecutados según las especificaciones técnicas${cotNumero ? ` de la cotización ${cotNumero}` : ""}. Verificación de condiciones de anclaje y seguridad en alturas.`,
    observaciones: `${cantStr} · ${descItem}`,
    fecha,
    fotos: [],
  };
}

export function firmaContenidoActividades(lista = []) {
  return (Array.isArray(lista) ? lista : [])
    .map((a) =>
      [a?.titulo, a?.actividadesRealizadas, a?.descripcion, a?.observaciones]
        .map((t) => String(t || "").trim().toLowerCase())
        .join("|")
    )
    .filter((s) => s !== "|||")
    .join(";;");
}

/**
 * Evalúa el guardado de un informe de actividades:
 * - NUNCA bloquea por falta de acta de entrega (FORM-SST-89).
 * - NUNCA bloquea por correo de quien recibe vacío (solo valida formato si escribieron algo inválido).
 * - NUNCA bloquea crear múltiples informes por obra; solo sugiere confirmar si otro informe
 *   en el mismo período y proyecto ya contiene exactamente las mismas actividades.
 */
export function evaluarGuardadoInforme({ informes = [], form = {}, editId = null, recibeEmail = "" } = {}) {
  const emailEscrito = String(recibeEmail || "").trim();
  if (emailEscrito && !correoValido(emailEscrito)) {
    return {
      formatoCorreoInvalido: true,
      requiereConfirmarDuplicado: false,
      informeSimilar: null,
    };
  }

  if (editId) {
    return {
      formatoCorreoInvalido: false,
      requiereConfirmarDuplicado: false,
      informeSimilar: null,
    };
  }

  const repetido = informeRepetido(informes, { ...form, obraId: form.obraId || null });
  if (!repetido) {
    return {
      formatoCorreoInvalido: false,
      requiereConfirmarDuplicado: false,
      informeSimilar: null,
    };
  }

  const nuevasAct = normalizarActividadesInforme(form);
  const prevAct = normalizarActividadesInforme(repetido);
  const mismoContenido = firmaContenidoActividades(nuevasAct) === firmaContenidoActividades(prevAct);

  return {
    formatoCorreoInvalido: false,
    requiereConfirmarDuplicado: mismoContenido,
    informeSimilar: mismoContenido ? repetido : null,
  };
}
