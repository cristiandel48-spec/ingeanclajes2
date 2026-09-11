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
  "servisio": "servicio",
  "servisios": "servicios",
  "cervicio": "servicio",
  "cervicios": "servicios",
  "producion": "producción",
  "produciones": "producciones",
  "intalacion": "instalación",
  "intalaciones": "instalaciones",
  "instalasion": "instalación",
  "instalasiones": "instalaciones",
  "instalacon": "instalación",
  "instaladao": "instalado",
  "instaladaos": "instalados",
  "instlados": "instalados",
  "instlado": "instalado",
  "dimenciones": "dimensiones",
  "dimencion": "dimensión",
  "esctrural": "estructural",
  "esctructural": "estructural",
  "esturctural": "estructural",
  "estuctural": "estructural",
  "extructural": "estructural",
  "esctructura": "estructura",
  "estrutura": "estructura",
  "estuctura": "estructura",
  "insepccion": "inspección",
  "insepcciones": "inspecciones",
  "ispeccion": "inspección",
  "ispecciones": "inspecciones",
  "inspecion": "inspección",
  "inspeciones": "inspecciones",
  "cotisacion": "cotización",
  "cotisaciones": "cotizaciones",
  "cotisasion": "cotización",
  "cotisasiones": "cotizaciones",
  "cotizacion": "cotización",
  "cotizaciones": "cotizaciones",
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
  "residensial": "residencial",
  "recidencial": "residencial",
  "reidencial": "residencial",
  "anclage": "anclaje",
  "anclages": "anclajes",
  "ancalje": "anclaje",
  "ancalges": "anclajes",
  "galvanisado": "galvanizado",
  "galbanizado": "galvanizado",
  "galvanisada": "galvanizada",
  "galbanizada": "galvanizada",
  "mantenimineto": "mantenimiento",
  "mantenimento": "mantenimiento",
  "seguriad": "seguridad",
  "segurida": "seguridad",
  "senalizacion": "señalización",
  "señalizacion": "señalización",
  "absorvedor": "absorbedor",
  "absorvedores": "absorbedores",
  "aproxiamdamente": "aproximadamente",
  "aproximadamete": "aproximadamente",
  "aprox": "aproximadamente",

  // Tildes obligatorias en términos técnicos y comerciales frecuentes
  "analisis": "análisis",
  "evaluacion": "evaluación",
  "evaluaciones": "evaluaciones",
  "evaluasion": "evaluación",
  "evaluasiones": "evaluaciones",
  "evualuacion": "evaluación",
  "evualuaciones": "evaluaciones",
  "presentacion": "presentación",
  "presentaciones": "presentaciones",
  "presentasion": "presentación",
  "descripcion": "descripción",
  "descripciones": "descripciones",
  "descripion": "descripción",
  "resolucion": "resolución",
  "resoluciones": "resoluciones",
  "inspeccion": "inspección",
  "inspecciones": "inspecciones",
  "certificacion": "certificación",
  "certificaciones": "certificaciones",
  "recertificacion": "recertificación",
  "recertificaciones": "recertificaciones",
  "fijacion": "fijación",
  "fijaciones": "fijaciones",
  "fabricacion": "fabricación",
  "fabricaciones": "fabricaciones",
  "perforacion": "perforación",
  "perforaciones": "perforaciones",
  "demolicion": "demolición",
  "demoliciones": "demoliciones",
  "remocion": "remoción",
  "remociones": "remociones",
  "construccion": "construcción",
  "construcciones": "construcciones",
  "edificacion": "edificación",
  "edificaciones": "edificaciones",
  "ubicacion": "ubicación",
  "ubicaciones": "ubicaciones",
  "direccion": "dirección",
  "direcciones": "direcciones",
  "condicion": "condición",
  "condiciones": "condiciones",
  "observacion": "observación",
  "observaciones": "observaciones",
  "ejecucion": "ejecución",
  "ejecuciones": "ejecuciones",
  "administracion": "administración",
  "atencion": "atención",
  "informacion": "información",
  "autorizacion": "autorización",
  "autorizaciones": "autorizaciones",
  "verificacion": "verificación",
  "verificaciones": "verificaciones",
  "calibracion": "calibración",
  "calibraciones": "calibraciones",
  "tencion": "tensión",
  "tenciones": "tensiones",
  "tension": "tensión",
  "tensiones": "tensiones",
  "traccion": "tracción",
  "tracciones": "tracciones",
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
  "mecanicos": "mecánicos",
  "mecanicas": "mecánicas",
  "quimico": "químico",
  "quimica": "química",
  "quimicos": "químicos",
  "quimicas": "químicas",
  "epoxico": "epóxico",
  "epoxica": "epóxica",
  "epoxicos": "epóxicos",
  "epoxicas": "epóxicas",
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
  "mosqueton": "mosquetón",
  "mosquetones": "mosquetones",
  "cancamo": "cáncamo",
  "cancamos": "cáncamos",
  "oxido": "óxido",
  "oxidos": "óxidos",
  "poliza": "póliza",
  "polizas": "pólizas",
  "garantia": "garantía",
  "garantias": "garantías",
  "regimen": "régimen",
  "maximo": "máximo",
  "maxima": "máxima",
  "maximos": "máximos",
  "maximas": "máximas",
  "minimo": "mínimo",
  "minima": "mínima",
  "minimos": "mínimos",
  "minimas": "mínimas",
  "optimo": "óptimo",
  "optima": "óptima",
  "optimos": "óptimos",
  "optimas": "óptimas",
  "unico": "único",
  "unica": "única",
  "unicos": "únicos",
  "unicas": "únicas",
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
  "tornilleria": "tornillería",
  "ingenieria": "ingeniería",
  "asesoria": "asesoría",
  "asesorias": "asesorías",
  "consultoria": "consultoría",
  "consultorias": "consultorías",
  "auditoria": "auditoría",
  "auditorias": "auditorías",
  "fotografia": "fotografía",
  "fotografias": "fotografías",
  "cerrajeria": "cerrajería",
  "albanileria": "albañilería",
  "patologia": "patología",
  "patologias": "patologías",
  "dia": "día",
  "dias": "días",
  "pagina": "página",
  "paginas": "páginas",
  "parrafo": "párrafo",
  "parrafos": "parrafos",
  "valido": "válido",
  "valida": "válida",
  "validos": "válidos",
  "validas": "válidas",
  "electronico": "electrónico",
  "electronica": "electrónica",
  "hidraulico": "hidráulico",
  "hidraulica": "hidráulica",
  "critico": "crítico",
  "critica": "crítica",
  "criticos": "críticos",
  "criticas": "críticas",
  "dinamico": "dinámico",
  "dinamica": "dinámica",
  "estatico": "estático",
  "estatica": "estática",
  "proximo": "próximo",
  "proxima": "próxima",
  "proximos": "próximos",
  "proximas": "próximas",
  "modulo": "módulo",
  "modulos": "módulos",
  "codigo": "código",
  "codigos": "códigos",
  "metodo": "método",
  "metodos": "métodos",
  "politica": "política",
  "politicas": "políticas",
  "publico": "público",
  "publica": "pública",
  "economico": "económico",
  "economica": "económica",
  "economicos": "económicos",
  "economicas": "económicas",
  "tambien": "también",
  "ademas": "además",
  "despues": "después",
  "segun": "según",
  "estan": "están",
  "estara": "estará",
  "estaran": "estarán",
  "sera": "será",
  "seran": "serán",
  "debera": "deberá",
  "deberan": "deberán",
  "podra": "podrá",
  "podran": "podrán",
  "incluira": "incluirá",
  "incluiran": "incluirán",
  "entregara": "entregará",
  "entregaran": "entregarán",
  "enviara": "enviará",
  "enviaran": "enviarán",
  "tendra": "tendrá",
  "tendran": "tendrán",
  "habra": "habrá",
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
