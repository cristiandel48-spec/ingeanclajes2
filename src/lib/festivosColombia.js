/**
 * Utilidades para días festivos oficiales en Colombia (Ley 51 de 1983 - Ley Emiliani).
 * Especialmente optimizado y verificado para el año 2026 y años circundantes.
 */

// Lista oficial precalculada y verificada para Colombia 2026 (19 festivos)
export const FESTIVOS_COLOMBIA_2026 = {
  "2026-01-01": { nombre: "Año Nuevo", nombreCorto: "Año Nuevo", fecha: "2026-01-01", leyEmiliani: false },
  "2026-01-12": { nombre: "Día de los Reyes Magos", nombreCorto: "Reyes Magos", fecha: "2026-01-12", leyEmiliani: true },
  "2026-03-23": { nombre: "Día de San José", nombreCorto: "San José", fecha: "2026-03-23", leyEmiliani: true },
  "2026-04-02": { nombre: "Jueves Santo", nombreCorto: "Jueves Santo", fecha: "2026-04-02", leyEmiliani: false },
  "2026-04-03": { nombre: "Viernes Santo", nombreCorto: "Viernes Santo", fecha: "2026-04-03", leyEmiliani: false },
  "2026-05-01": { nombre: "Día del Trabajo", nombreCorto: "Día del Trabajo", fecha: "2026-05-01", leyEmiliani: false },
  "2026-05-18": { nombre: "Ascensión del Señor", nombreCorto: "Ascensión", fecha: "2026-05-18", leyEmiliani: true },
  "2026-06-08": { nombre: "Corpus Christi", nombreCorto: "Corpus Christi", fecha: "2026-06-08", leyEmiliani: true },
  "2026-06-15": { nombre: "Sagrado Corazón de Jesús", nombreCorto: "Sagrado Corazón", fecha: "2026-06-15", leyEmiliani: true },
  "2026-06-29": { nombre: "San Pedro y San Pablo", nombreCorto: "San Pedro y San Pablo", fecha: "2026-06-29", leyEmiliani: true },
  "2026-07-13": { nombre: "Virgen de Chiquinquirá", nombreCorto: "Virgen Chiquinquirá", fecha: "2026-07-13", leyEmiliani: true },
  "2026-07-20": { nombre: "Día de la Independencia", nombreCorto: "Independencia", fecha: "2026-07-20", leyEmiliani: false },
  "2026-08-07": { nombre: "Batalla de Boyacá", nombreCorto: "Batalla Boyacá", fecha: "2026-08-07", leyEmiliani: false },
  "2026-08-17": { nombre: "La Asunción de la Virgen", nombreCorto: "La Asunción", fecha: "2026-08-17", leyEmiliani: true },
  "2026-10-12": { nombre: "Día de la Raza (Diversidad Étnica)", nombreCorto: "Día de la Raza", fecha: "2026-10-12", leyEmiliani: true },
  "2026-11-02": { nombre: "Día de Todos los Santos", nombreCorto: "Todos los Santos", fecha: "2026-11-02", leyEmiliani: true },
  "2026-11-16": { nombre: "Independencia de Cartagena", nombreCorto: "Indep. Cartagena", fecha: "2026-11-16", leyEmiliani: true },
  "2026-12-08": { nombre: "Inmaculada Concepción", nombreCorto: "Inmaculada Concepción", fecha: "2026-12-08", leyEmiliani: false },
  "2026-12-25": { nombre: "Navidad", nombreCorto: "Navidad", fecha: "2026-12-25", leyEmiliani: false },
};

/**
 * Calcula la fecha de Domingo de Pascua para cualquier año gregoriano
 * usando el algoritmo de Butcher / Meeus.
 */
function calcularDomingoPascua(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, mes - 1, dia));
}

/**
 * Mueve una fecha al siguiente lunes según la Ley Emiliani (Ley 51 de 1983)
 * Si ya cae en lunes, se mantiene.
 */
function aplicarLeyEmiliani(fecha) {
  const f = new Date(fecha.getTime());
  const diaSemana = f.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  if (diaSemana === 1) return f;
  const diasHastaLunes = (8 - diaSemana) % 7;
  f.setUTCDate(f.getUTCDate() + diasHastaLunes);
  return f;
}

function formatearIsoUtc(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function sumarDiasUtc(fecha, dias) {
  const res = new Date(fecha.getTime());
  res.setUTCDate(res.getUTCDate() + dias);
  return res;
}

// Caché en memoria para otros años calculados dinámicamente
const cacheFestivosAnio = new Map();

/**
 * Retorna todos los festivos de Colombia para un año específico
 * Devuelve un Map o diccionario { "YYYY-MM-DD": { nombre, nombreCorto, fecha, leyEmiliani } }
 */
export function getFestivosColombiaPorAnio(year) {
  const anioNum = Number(year);
  if (anioNum === 2026) {
    return FESTIVOS_COLOMBIA_2026;
  }

  if (cacheFestivosAnio.has(anioNum)) {
    return cacheFestivosAnio.get(anioNum);
  }

  const pascua = calcularDomingoPascua(anioNum);
  const festivos = {};

  const registrar = (iso, nombre, nombreCorto, leyEmiliani = false) => {
    festivos[iso] = { nombre, nombreCorto, fecha: iso, leyEmiliani };
  };

  // 1. Festivos Fijos
  registrar(`${anioNum}-01-01`, "Año Nuevo", "Año Nuevo", false);
  registrar(`${anioNum}-05-01`, "Día del Trabajo", "Día del Trabajo", false);
  registrar(`${anioNum}-07-20`, "Día de la Independencia", "Independencia", false);
  registrar(`${anioNum}-08-07`, "Batalla de Boyacá", "Batalla Boyacá", false);
  registrar(`${anioNum}-12-08`, "Inmaculada Concepción", "Inmaculada Concepción", false);
  registrar(`${anioNum}-12-25`, "Navidad", "Navidad", false);

  // 2. Fijos que se trasladan al siguiente lunes (Ley Emiliani)
  const fReyes = aplicarLeyEmiliani(new Date(Date.UTC(anioNum, 0, 6)));
  registrar(formatearIsoUtc(fReyes), "Día de los Reyes Magos", "Reyes Magos", true);

  const fSanJose = aplicarLeyEmiliani(new Date(Date.UTC(anioNum, 2, 19)));
  registrar(formatearIsoUtc(fSanJose), "Día de San José", "San José", true);

  const fSanPedro = aplicarLeyEmiliani(new Date(Date.UTC(anioNum, 5, 29)));
  registrar(formatearIsoUtc(fSanPedro), "San Pedro y San Pablo", "San Pedro y San Pablo", true);

  if (anioNum >= 2024) {
    const fChiquinquira = aplicarLeyEmiliani(new Date(Date.UTC(anioNum, 6, 9)));
    registrar(formatearIsoUtc(fChiquinquira), "Virgen de Chiquinquirá", "Virgen Chiquinquirá", true);
  }

  const fAsuncion = aplicarLeyEmiliani(new Date(Date.UTC(anioNum, 7, 15)));
  registrar(formatearIsoUtc(fAsuncion), "La Asunción de la Virgen", "La Asunción", true);

  const fRaza = aplicarLeyEmiliani(new Date(Date.UTC(anioNum, 9, 12)));
  registrar(formatearIsoUtc(fRaza), "Día de la Raza (Diversidad Étnica)", "Día de la Raza", true);

  const fSantos = aplicarLeyEmiliani(new Date(Date.UTC(anioNum, 10, 1)));
  registrar(formatearIsoUtc(fSantos), "Día de Todos los Santos", "Todos los Santos", true);

  const fCartagena = aplicarLeyEmiliani(new Date(Date.UTC(anioNum, 10, 11)));
  registrar(formatearIsoUtc(fCartagena), "Independencia de Cartagena", "Indep. Cartagena", true);

  // 3. Basados en Pascua
  const juevesSanto = sumarDiasUtc(pascua, -3);
  registrar(formatearIsoUtc(juevesSanto), "Jueves Santo", "Jueves Santo", false);

  const viernesSanto = sumarDiasUtc(pascua, -2);
  registrar(formatearIsoUtc(viernesSanto), "Viernes Santo", "Viernes Santo", false);

  // Ascensión del Señor: Pascua + 43 días (trasladado a lunes)
  const ascension = sumarDiasUtc(pascua, 43);
  registrar(formatearIsoUtc(ascension), "Ascensión del Señor", "Ascensión", true);

  // Corpus Christi: Pascua + 64 días (trasladado a lunes)
  const corpus = sumarDiasUtc(pascua, 64);
  registrar(formatearIsoUtc(corpus), "Corpus Christi", "Corpus Christi", true);

  // Sagrado Corazón: Pascua + 71 días (trasladado a lunes)
  const sagradoCorazon = sumarDiasUtc(pascua, 71);
  registrar(formatearIsoUtc(sagradoCorazon), "Sagrado Corazón de Jesús", "Sagrado Corazón", true);

  cacheFestivosAnio.set(anioNum, festivos);
  return festivos;
}

/**
 * Consulta si una fecha ISO ("YYYY-MM-DD") es día festivo en Colombia.
 * Retorna el objeto del festivo o null.
 */
export function getFestivoColombia(isoStr) {
  if (!isoStr || typeof isoStr !== "string") return null;
  const partes = isoStr.split("-");
  if (partes.length < 3) return null;
  const anio = parseInt(partes[0], 10);
  if (isNaN(anio)) return null;

  const dict = getFestivosColombiaPorAnio(anio);
  return dict[isoStr] || null;
}

/**
 * Consulta booleana si es festivo en Colombia.
 */
export function esDiaFestivoColombia(isoStr) {
  return Boolean(getFestivoColombia(isoStr));
}

/**
 * Obtiene la lista de festivos correspondientes a un mes específico (mes 0-indexed: 0=Enero, 9=Octubre).
 */
export function getFestivosDelMes(anio, mes) {
  const dict = getFestivosColombiaPorAnio(anio);
  const mesStr = String(mes + 1).padStart(2, "0");
  const prefijo = `${anio}-${mesStr}-`;
  return Object.values(dict)
    .filter((f) => f.fecha.startsWith(prefijo))
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}
