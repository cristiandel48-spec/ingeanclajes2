/**
 * Detecta y depura obras duplicadas generadas para una misma cotización
 * (por ejemplo si una cotización fue aprobada, desaprobada y vuelta a aprobar).
 *
 * Conserva únicamente la obra que tenga avance/trabajo registrado o, en su defecto,
 * la más antigua (menor ID). Descarta clones vacíos para evitar duplicidad y
 * no afectar el consecutivo.
 *
 * @param {Array} listaObras
 * @param {Array} listaCotizaciones (opcional, para corregir el obraId vinculado)
 * @returns {{ obrasDepuradas: Array, cotizacionesAjustadas: Array, huboLimpieza: boolean, eliminadas: Array }}
 */
export function depurarObrasDuplicadas(listaObras = [], listaCotizaciones = []) {
  if (!Array.isArray(listaObras) || listaObras.length === 0) {
    return {
      obrasDepuradas: listaObras,
      cotizacionesAjustadas: listaCotizaciones,
      huboLimpieza: false,
      eliminadas: [],
    };
  }

  const conTrabajo = (o) => {
    const avance = Number(o?.avance || 0);
    const pagado = Number(o?.pagado || 0);
    const costos = Number(o?.costos || 0);
    const tieneBitacora = Array.isArray(o?.bitacora) && o.bitacora.length > 0;
    const tieneEmpleados = Array.isArray(o?.empleados) && o.empleados.length > 0;
    const tieneTrazos = Array.isArray(o?.trazos) && o.trazos.length > 0;
    const tieneAnclajes = Array.isArray(o?.anclajes) && o.anclajes.length > 0;
    const tieneFotos = Number(o?.totalFotosAvance || 0) > 0;
    return (
      avance > 0 ||
      pagado > 0 ||
      costos > 0 ||
      tieneBitacora ||
      tieneEmpleados ||
      tieneTrazos ||
      tieneAnclajes ||
      tieneFotos
    );
  };

  const mapaCotizaciones = new Map();
  for (const c of (listaCotizaciones || [])) {
    const cid = String(c?.id || "").trim();
    const cnum = String(c?.numero || "").trim();
    if (cid) mapaCotizaciones.set(cid, cid);
    if (cnum) mapaCotizaciones.set(cnum, cid || cnum);
  }

  // Mapa de obraId -> cotizacionId según lo que digan las cotizaciones
  const obraIdACotId = new Map();
  for (const c of (listaCotizaciones || [])) {
    const cid = String(c?.id || c?.numero || "").trim();
    const oid = String(c?.obraId || "").trim();
    if (oid && cid) {
      obraIdACotId.set(oid, cid);
    }
  }

  const grupos = new Map();
  const sinCotizacion = [];

  for (const o of listaObras) {
    let rawCotId = String(o?.cotizacionId || "").trim();
    if (!rawCotId && o?.id && obraIdACotId.has(String(o.id).trim())) {
      rawCotId = obraIdACotId.get(String(o.id).trim());
    }

    const cotKey = rawCotId ? (mapaCotizaciones.get(rawCotId) || rawCotId) : null;
    if (!cotKey) {
      sinCotizacion.push(o);
    } else {
      if (!grupos.has(cotKey)) grupos.set(cotKey, []);
      grupos.get(cotKey).push(o);
    }
  }

  let huboLimpieza = false;
  const eliminadas = [];
  const depuradas = [...sinCotizacion];
  const mapaCotizacionAObra = new Map();

  for (const [cotId, lista] of grupos.entries()) {
    if (lista.length === 1) {
      depuradas.push(lista[0]);
      mapaCotizacionAObra.set(cotId, lista[0].id);
      continue;
    }

    // Hay más de una obra para la misma cotización (ej: OB-030, OB-031, OB-032 para COT-049)
    huboLimpieza = true;

    // Ordenar: primero las que tengan trabajo real (o mayor avance), luego por id menor (la original)
    const ordenadas = [...lista].sort((a, b) => {
      const aTrab = conTrabajo(a) ? (Number(a.avance || 0) || 1) : 0;
      const bTrab = conTrabajo(b) ? (Number(b.avance || 0) || 1) : 0;
      if (aTrab !== bTrab) return bTrab - aTrab;
      const numA = parseInt(String(a.id || "").replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(String(b.id || "").replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });

    const principal = ordenadas[0];
    const sobrantes = ordenadas.slice(1);

    depuradas.push(principal);
    mapaCotizacionAObra.set(cotId, principal.id);
    sobrantes.forEach((sob) => eliminadas.push(sob.id));
  }

  // Ordenar por ID numérico ascendente
  depuradas.sort((a, b) => {
    const numA = parseInt(String(a.id || "").replace(/\D/g, ""), 10) || 0;
    const numB = parseInt(String(b.id || "").replace(/\D/g, ""), 10) || 0;
    return numA - numB;
  });

  // Ajustar cotizaciones para que apunten a la obra principal conservada
  const cotizacionesAjustadas = Array.isArray(listaCotizaciones)
    ? listaCotizaciones.map((c) => {
        const idObraValida =
          mapaCotizacionAObra.get(c.id) || mapaCotizacionAObra.get(c.numero);
        if (idObraValida && c.obraId !== idObraValida) {
          return { ...c, obraId: idObraValida };
        }
        return c;
      })
    : listaCotizaciones;

  return { obrasDepuradas: depuradas, cotizacionesAjustadas, huboLimpieza, eliminadas };
}
