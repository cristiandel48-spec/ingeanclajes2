// Historial de personal en obras: donde estuvo cada persona, dia por dia.
//
// Sale de los mismos turnos de Horarios; aqui no se guarda nada. Sirve para
// responder «¿donde estuvo Wladimir el mes pasado?» o «¿quien fue a esa obra
// el martes?» y para bajarlo en Excel o PDF (historialPersonalExport.js).
//
// Una persona puede tener dos turnos el mismo dia en la misma obra (mañana y
// tarde). En el historial eso es UNA asistencia: el dato que se consulta es
// «estuvo ahi ese dia», con las actividades y el horario juntos.

const limpio = (v) => String(v ?? "").trim();
const dos = (n) => String(n).padStart(2, "0");
const aIso = (d) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
const desdeIso = (iso) => new Date(`${iso}T12:00:00`);
const distintos = (lista) => [...new Set(lista)];
const porNombre = (a, b) => a.localeCompare(b, "es", { sensitivity: "base" });

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export const esFechaIso = (v) => /^\d{4}-\d{2}-\d{2}$/.test(limpio(v));

export const diaDeLaSemana = (iso) => (esFechaIso(iso) ? DIAS[desdeIso(iso).getDay()] : "");

// «23 de noviembre de 2026»
export const fechaLargaHistorial = (iso) => {
  if (!esFechaIso(iso)) return limpio(iso);
  const d = desdeIso(iso);
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};

// «23 nov 2026», para las columnas angostas.
export const fechaCortaHistorial = (iso) => {
  if (!esFechaIso(iso)) return limpio(iso);
  const d = desdeIso(iso);
  return `${dos(d.getDate())} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
};

// ── Rangos de fechas de los atajos ─────────────────────────────────────────

export const rangoDelMes = (anio, mesBase1) => {
  const ultimo = new Date(anio, mesBase1, 0).getDate();
  return { desde: `${anio}-${dos(mesBase1)}-01`, hasta: `${anio}-${dos(mesBase1)}-${dos(ultimo)}` };
};

export const rangoEsteMes = (hoy) => {
  const d = desdeIso(hoy);
  return rangoDelMes(d.getFullYear(), d.getMonth() + 1);
};

export const rangoMesPasado = (hoy) => {
  const d = desdeIso(hoy);
  const previo = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return rangoDelMes(previo.getFullYear(), previo.getMonth() + 1);
};

// Los ultimos N dias contando hoy.
export const rangoUltimosDias = (hoy, dias) => {
  const d = desdeIso(hoy);
  d.setDate(d.getDate() - (dias - 1));
  return { desde: aIso(d), hasta: hoy };
};

// «Octubre de 2026» cuando el rango es un mes entero; si no, las dos fechas.
export const tituloPeriodoHistorial = (desde, hasta) => {
  if (!esFechaIso(desde) || !esFechaIso(hasta)) return "";
  if (desde === hasta) return `${diaDeLaSemana(desde)} ${fechaLargaHistorial(desde)}`;
  const d = desdeIso(desde);
  const mes = rangoDelMes(d.getFullYear(), d.getMonth() + 1);
  if (mes.desde === desde && mes.hasta === hasta) {
    const nombre = MESES[d.getMonth()];
    return `${nombre.charAt(0).toUpperCase()}${nombre.slice(1)} de ${d.getFullYear()}`;
  }
  return `${fechaLargaHistorial(desde)} al ${fechaLargaHistorial(hasta)}`;
};

// ── Horas ──────────────────────────────────────────────────────────────────

const hora12 = (hhmm) => {
  const [hs, ms = "00"] = limpio(hhmm).split(":");
  const h = Number(hs);
  if (!hs || Number.isNaN(h)) return "";
  return `${((h + 11) % 12) + 1}:${ms.padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
};

// «07:30 - 17:00» -> «7:30 AM – 5:00 PM». Lo que no sea un rango de horas
// («Turno completo») se deja como esta.
export const horarioLegible = (turno) => {
  const partes = limpio(turno).split("-").map((p) => p.trim()).filter(Boolean);
  if (partes.length === 2 && partes.every((p) => p.includes(":"))) {
    return `${hora12(partes[0])} – ${hora12(partes[1])}`;
  }
  return limpio(turno);
};

// ── El historial ───────────────────────────────────────────────────────────

const nombreDeObra = (obra) => {
  const cliente = limpio(obra?.cliente);
  const proyecto = limpio(obra?.proyecto);
  return proyecto && proyecto.toLowerCase() !== cliente.toLowerCase() ? proyecto : "";
};

/**
 * @param {object} datos
 * @param {Array} datos.horarios   Los turnos de Horarios.
 * @param {Array} datos.obras
 * @param {Array} datos.empleados
 * @param {string} datos.desde     AAAA-MM-DD, incluido.
 * @param {string} datos.hasta     AAAA-MM-DD, incluido.
 * @param {string} [datos.empleadoId]  Solo esa persona.
 * @param {string} [datos.obraId]      Solo esa obra.
 */
export function armarHistorial({
  horarios = [], obras = [], empleados = [], desde = "", hasta = "", empleadoId = "", obraId = "",
} = {}) {
  const obraDe = new Map((obras || []).map((o) => [o.id, o]));
  const empleadoDe = new Map((empleados || []).map((e) => [e.id, e]));
  // Con las fechas al reves se entiende lo que se quiso decir.
  const [ini, fin] = desde && hasta && desde > hasta ? [hasta, desde] : [desde, hasta];

  // Una asistencia por persona, obra y dia.
  const porClave = new Map();
  for (const h of horarios || []) {
    const fecha = limpio(h?.fecha);
    if (!esFechaIso(fecha) || !h?.empleadoId) continue;
    if (ini && fecha < ini) continue;
    if (fin && fecha > fin) continue;
    if (empleadoId && h.empleadoId !== empleadoId) continue;
    if (obraId && h.obraId !== obraId) continue;
    const clave = `${fecha}|${h.empleadoId}|${h.obraId || ""}`;
    if (!porClave.has(clave)) porClave.set(clave, []);
    porClave.get(clave).push(h);
  }

  const registros = [...porClave.values()].map((turnos) => {
    const primero = turnos[0];
    const e = empleadoDe.get(primero.empleadoId);
    const o = obraDe.get(primero.obraId);
    const cliente = limpio(o?.cliente) || (primero.obraId ? "Obra eliminada" : "Sin obra");
    const proyecto = nombreDeObra(o);
    const corregida = turnos.map((t) => limpio(t.direccion)).find(Boolean);
    const horarios12 = distintos(turnos.map((t) => limpio(t.turno)).filter(Boolean)).sort().map(horarioLegible);
    return {
      fecha: primero.fecha,
      dia: diaDeLaSemana(primero.fecha),
      empleadoId: primero.empleadoId,
      persona: limpio(e?.nombre) || "Trabajador retirado",
      cargo: limpio(e?.cargo),
      obraId: primero.obraId || "",
      cliente,
      proyecto,
      // «Cliente · Proyecto», para una sola columna.
      obraTexto: proyecto ? `${cliente} · ${proyecto}` : cliente,
      actividad: distintos(turnos.map((t) => limpio(t.tarea)).filter(Boolean)).join(" / "),
      horario: horarios12.join(" / "),
      cantidad: distintos(turnos.map((t) => limpio(t.cantidad)).filter(Boolean)).join(" / "),
      encuentro: distintos(turnos.map((t) => limpio(t.encuentro)).filter(Boolean)).join(" / "),
      // La corregida a mano en la planilla manda sobre la de la obra.
      direccion: corregida || [limpio(o?.direccion), limpio(o?.ciudad)].filter(Boolean).join(", "),
    };
  }).sort((a, b) =>
    a.fecha.localeCompare(b.fecha) || porNombre(a.persona, b.persona) || porNombre(a.obraTexto, b.obraTexto)
  );

  // Por persona: sus dias, en orden.
  const gruposPersona = new Map();
  for (const r of registros) {
    if (!gruposPersona.has(r.empleadoId)) gruposPersona.set(r.empleadoId, []);
    gruposPersona.get(r.empleadoId).push(r);
  }
  const porPersona = [...gruposPersona.entries()].map(([id, lista]) => ({
    empleadoId: id,
    persona: lista[0].persona,
    cargo: lista[0].cargo,
    dias: distintos(lista.map((r) => r.fecha)).length,
    obras: distintos(lista.map((r) => r.obraId)).length,
    obrasTexto: distintos(lista.map((r) => r.obraTexto)).join("; "),
    registros: lista,
  })).sort((a, b) => porNombre(a.persona, b.persona));

  // Por dia: las obras de ese dia, cada una con su gente.
  const gruposDia = new Map();
  for (const r of registros) {
    if (!gruposDia.has(r.fecha)) gruposDia.set(r.fecha, []);
    gruposDia.get(r.fecha).push(r);
  }
  const porDia = [...gruposDia.entries()].map(([fecha, lista]) => {
    const gruposObra = new Map();
    for (const r of lista) {
      if (!gruposObra.has(r.obraId)) gruposObra.set(r.obraId, []);
      gruposObra.get(r.obraId).push(r);
    }
    const obrasDelDia = [...gruposObra.entries()].map(([id, deLaObra]) => ({
      obraId: id,
      cliente: deLaObra[0].cliente,
      proyecto: deLaObra[0].proyecto,
      obraTexto: deLaObra[0].obraTexto,
      direccion: deLaObra[0].direccion,
      actividad: distintos(deLaObra.map((r) => r.actividad).filter(Boolean)).join(" / "),
      horario: distintos(deLaObra.map((r) => r.horario).filter(Boolean)).join(" / "),
      personas: deLaObra.map((r) => r.persona),
    })).sort((a, b) => porNombre(a.obraTexto, b.obraTexto));
    return {
      fecha,
      dia: diaDeLaSemana(fecha),
      personas: distintos(lista.map((r) => r.empleadoId)).length,
      obras: obrasDelDia,
    };
  }).sort((a, b) => a.fecha.localeCompare(b.fecha));

  return {
    desde: ini,
    hasta: fin,
    empleadoId,
    obraId,
    // Con quien y con que obra se filtro, para titular el archivo.
    soloPersona: empleadoId ? (limpio(empleadoDe.get(empleadoId)?.nombre) || "") : "",
    soloObra: obraId ? (() => {
      const o = obraDe.get(obraId);
      const nombre = nombreDeObra(o);
      return [limpio(o?.cliente), nombre].filter(Boolean).join(" · ") || obraId;
    })() : "",
    registros,
    porPersona,
    porDia,
    totales: {
      asistencias: registros.length,
      personas: porPersona.length,
      dias: porDia.length,
      obras: distintos(registros.map((r) => r.obraId)).length,
    },
  };
}
