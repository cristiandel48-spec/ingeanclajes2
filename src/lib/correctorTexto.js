import { getSupabaseClient } from "./backend/supabaseClient";

// Puente con la funcion «corregir-texto», que repasa la ortografia de lo que
// se escribe en las cotizaciones y en los informes.
//
// La clave de la IA vive en el servidor, no aqui: lo que va en el bundle de
// Vite queda a la vista de cualquiera.

const FUNCION = "corregir-texto";

// Diccionario de correcciones directas de errores comunes y técnicos (casing-insensitive)
const DICCIONARIO_DIRECTO = {
  // Errores tipográficos directos
  "servivio": "servicio",
  "servivios": "servicios",
  "serivicio": "servicio",
  "serivicios": "servicios",
  "producion": "producción",
  "produciones": "producciones",
  "intalacion": "instalación",
  "intalaciones": "instalaciones",
  "instaladao": "instalado",
  "instaladaos": "instalados",
  "instlados": "instalados",
  "instlado": "instalado",
  "dimenciones": "dimensiones",
  "dimencion": "dimensión",
  "esctrural": "estructural",
  "esturctural": "estructural",
  "estuctural": "estructural",
  "insepccion": "inspección",
  "cotisacion": "cotización",
  "cotisaciones": "cotizaciones",
  "presupusto": "presupuesto",
  "peldano": "peldaño",
  "peldanos": "peldaños",
  "diseno": "diseño",
  "disenos": "diseños",
  "recertificasion": "recertificación",
  "recertificasiones": "recertificaciones",
  "certificasion": "certificación",
  "certificasiones": "certificaciones",
  "bivineda": "vivienda",
  "viviwnda": "vivienda",
  "aproxiamdamente": "aproximadamente",
  "aproximadamete": "aproximadamente",
  "aprox": "aproximadamente",

  // Tildes obligatorias en términos técnicos y comerciales frecuentes
  "analisis": "análisis",
  "evaluacion": "evaluación",
  "evaluaciones": "evaluaciones",
  "area": "área",
  "areas": "áreas",
  "linea": "línea",
  "lineas": "líneas",
  "numero": "número",
  "numeros": "números",
  "telefono": "teléfono",
  "telefonos": "teléfonos",
  "tecnico": "técnico",
  "tecnicos": "técnicos",
  "tecnica": "técnica",
  "tecnicas": "técnicas",
  "mecanico": "mecánico",
  "mecanica": "mecánica",
  "quimico": "químico",
  "quimica": "química",
  "epoxico": "epóxico",
  "epoxica": "epóxica",
  "metalico": "metálico",
  "metalica": "metálica",
  "metalicos": "metálicos",
  "metalicas": "metálicas",
  "estandar": "estándar",
  "estandares": "estándares",
  "caida": "caída",
  "caidas": "caídas",
  "arnes": "arnés",
  "arneses": "arneses",
  "poliza": "póliza",
  "polizas": "pólizas",
  "garantia": "garantía",
  "garantias": "garantías",
  "regimen": "régimen",
  "maximo": "máximo",
  "maxima": "máxima",
  "minimo": "mínimo",
  "minima": "mínima",
  "optimo": "óptimo",
  "optima": "óptima",
  "unico": "único",
  "unica": "única",
  "parametro": "parámetro",
  "parametros": "parámetros",
  "logistica": "logística",
  "especifico": "específico",
  "especifica": "específica",
  "especificos": "específicos",
  "especificas": "específicas",
  "caracteristica": "característica",
  "caracteristicas": "características",
  "tuberia": "tubería",
  "tuberias": "tuberías",
  "tambien": "también",
  "ademas": "además",
  "segun": "según",
};

function ajustarCaso(palabraOriginal, palabraCorregida) {
  if (palabraOriginal === palabraOriginal.toUpperCase() && /[A-ZÁÉÍÓÚÜÑ]/.test(palabraOriginal)) {
    return palabraCorregida.toUpperCase();
  }
  if (palabraOriginal[0] === palabraOriginal[0].toUpperCase() && /[A-ZÁÉÍÓÚÜÑ]/.test(palabraOriginal[0])) {
    return palabraCorregida.charAt(0).toUpperCase() + palabraCorregida.slice(1).toLowerCase();
  }
  return palabraCorregida.toLowerCase();
}

/**
 * Corrección ortográfica local para errores comunes, tildes y terminaciones -ción/-sión
 */
export function corregirOrtografiaLocal(texto) {
  if (!texto || typeof texto !== "string") return "";

  return texto.replace(/\b[A-Za-zÁÉÍÓÚáéíóúñÑüÜ]+\b/g, (palabra) => {
    // Si contiene números o caracteres de unidad (ej. "80M", "5000LBS"), no tocar
    if (/\d/.test(palabra)) return palabra;

    const clave = palabra.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Búsqueda en diccionario directo
    if (DICCIONARIO_DIRECTO[clave]) {
      return ajustarCaso(palabra, DICCIONARIO_DIRECTO[clave]);
    }

    // 2. Regla morfológica: palabras terminadas en cion, sion, xion sin tilde
    const matchCion = palabra.match(/^(.+?)([csx]ion)$/i);
    if (matchCion) {
      const prefijo = matchCion[1];
      const sufijo = matchCion[2].toLowerCase();
      const sufijoConTilde = sufijo.replace("ion", "ión");
      return ajustarCaso(palabra, prefijo + sufijoConTilde);
    }

    return palabra;
  });
}

/**
 * Devuelve el texto con la ortografia repasada (IA con fallback local).
 *
 * @returns {Promise<{corregido:string, cambios:boolean, aviso?:string}>}
 */
export async function corregirTexto(texto) {
  const original = String(texto ?? "");
  if (!original.trim()) return { corregido: original, cambios: false };

  // 1. Intentar con la función de Supabase
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.functions.invoke(FUNCION, { body: { texto: original } });
      if (!error && !data?.error && data?.corregido) {
        const corregido = String(data.corregido);
        return { corregido, cambios: corregido !== original, aviso: data?.aviso };
      }
    }
  } catch (err) {
    console.warn("Fallo llamando al corrector en Supabase, aplicando corrector de respaldo:", err);
  }

  // 2. Respaldo local de alta precisión para español e ingeniería
  const corregido = corregirOrtografiaLocal(original);
  return { corregido, cambios: corregido !== original };
}

/**
 * Las diferencias entre dos textos, palabra a palabra, para poder enseñar que
 * cambio antes de aceptarlo.
 *
 * No se aplica nada a ciegas: estos textos salen impresos en documentos que se
 * entregan al cliente, y quien firma tiene que poder ver que se le toco.
 *
 * @returns {Array<{tipo:"igual"|"quitado"|"puesto", texto:string}>}
 */
export function diferencias(antes, despues) {
  const a = String(antes ?? "").split(/(\s+)/);
  const b = String(despues ?? "").split(/(\s+)/);

  // Trozo comun mas largo, que es lo que permite señalar solo lo que cambio
  // en vez de pintar el texto entero como distinto.
  const tabla = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      tabla[i][j] = a[i] === b[j] ? tabla[i + 1][j + 1] + 1 : Math.max(tabla[i + 1][j], tabla[i][j + 1]);
    }
  }

  const partes = [];
  const agregar = (tipo, texto) => {
    if (!texto) return;
    const ultima = partes[partes.length - 1];
    if (ultima && ultima.tipo === tipo) ultima.texto += texto;
    else partes.push({ tipo, texto });
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { agregar("igual", a[i]); i += 1; j += 1; }
    else if (tabla[i + 1][j] >= tabla[i][j + 1]) { agregar("quitado", a[i]); i += 1; }
    else { agregar("puesto", b[j]); j += 1; }
  }
  while (i < a.length) { agregar("quitado", a[i]); i += 1; }
  while (j < b.length) { agregar("puesto", b[j]); j += 1; }

  return partes;
}
