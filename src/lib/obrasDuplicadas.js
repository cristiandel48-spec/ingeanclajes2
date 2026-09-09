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
 * @param {Object} otrasEntidades (opcional: cuentas, pagos, horarios, etc.)
 * @returns {{ obrasDepuradas: Array, cotizacionesAjustadas: Array, otrasEntidadesAjustadas: Object, huboLimpieza: boolean, eliminadas: Array, renombradas: Array }}
 */
export function depurarObrasDuplicadas(
  listaObras = [],
  listaCotizaciones = [],
  otrasEntidades = {}
) {
  if (!Array.isArray(listaObras) || listaObras.length === 0) {
    return {
      obrasDepuradas: listaObras,
      cotizacionesAjustadas: listaCotizaciones,
      otrasEntidadesAjustadas: otrasEntidades,
      huboLimpieza: false,
      eliminadas: [],
      renombradas: [],
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

  // -------------------------------------------------------------
  // RECOMPACTACIÓN DE CONSECUTIVOS AFECTADOS POR CLONES ELIMINADOS
  // -------------------------------------------------------------
  // Si se eliminaron obras clones (ej: OB-031 y OB-032), cualquier obra creada
  // después (como OB-033 para COT-050) se creó con un consecutivo inflado por
  // culpa de esos clones. Debemos reasignar su ID hacia abajo para cerrar el hueco.
  const mapaRenombramiento = new Map(); // idViejo -> idNuevo

  // 1) Si se acaban de detectar clones eliminados en esta pasada
  const numsEliminados = eliminadas
    .map((id) => parseInt(String(id).replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n) && n > 0)
    .sort((a, b) => a - b);

  if (numsEliminados.length > 0) {
    for (const o of depuradas) {
      const num = parseInt(String(o.id || "").replace(/\D/g, ""), 10);
      if (!Number.isFinite(num) || num <= 0) continue;
      // Cuántos IDs eliminados eran menores que este número
      const offset = numsEliminados.filter((e) => e < num).length;
      if (offset > 0) {
        const nuevoNum = num - offset;
        const nuevoId = "OB-" + String(nuevoNum).padStart(3, "0");
        if (nuevoId !== o.id) {
          mapaRenombramiento.set(o.id, nuevoId);
        }
      }
    }
  }

  // 2) Detección de respaldo: si los clones OB-031 y OB-032 ya no están en la lista
  // pero quedó OB-033 con salto (es decir, existe OB-030 y luego OB-033, sin 31 ni 32):
  const setIdsActuales = new Set(depuradas.map((o) => String(o.id || "").trim()));
  if (setIdsActuales.has("OB-030") && !setIdsActuales.has("OB-031") && !setIdsActuales.has("OB-032")) {
    for (const o of depuradas) {
      const num = parseInt(String(o.id || "").replace(/\D/g, ""), 10);
      if (Number.isFinite(num) && num >= 33) {
        // Estaba inflado en 2 unidades por los dos clones de COT-049
        const nuevoNum = num - 2;
        const nuevoId = "OB-" + String(nuevoNum).padStart(3, "0");
        if (nuevoId !== o.id) {
          mapaRenombramiento.set(o.id, nuevoId);
        }
      }
    }
  }

  // Si hay obras que renombrar:
  const renombradas = [];
  let obrasFinales = depuradas;

  if (mapaRenombramiento.size > 0) {
    huboLimpieza = true;
    obrasFinales = depuradas.map((o) => {
      if (mapaRenombramiento.has(o.id)) {
        const nuevoId = mapaRenombramiento.get(o.id);
        // El id viejo debe ser borrado en la nube
        eliminadas.push(o.id);
        renombradas.push({ desde: o.id, hasta: nuevoId, cliente: o.cliente });
        return { ...o, id: nuevoId };
      }
      return o;
    });

    // Reordenar por ID numérico
    obrasFinales.sort((a, b) => {
      const numA = parseInt(String(a.id || "").replace(/\D/g, ""), 10) || 0;
      const numB = parseInt(String(b.id || "").replace(/\D/g, ""), 10) || 0;
      return numA - numB;
    });
  }

  // Ajustar cotizaciones para que apunten a la obra principal conservada o renombrada
  const cotizacionesAjustadas = Array.isArray(listaCotizaciones)
    ? listaCotizaciones.map((c) => {
        let idObra = c.obraId;

        // 1) Si la obra a la que apuntaba fue renombrada (ej: OB-033 -> OB-031)
        if (idObra && mapaRenombramiento.has(idObra)) {
          idObra = mapaRenombramiento.get(idObra);
        }

        // 2) Si la cotización está en el mapa de duplicadas
        const idObraValida =
          mapaCotizacionAObra.get(c.id) || mapaCotizacionAObra.get(c.numero);
        if (idObraValida) {
          idObra = mapaRenombramiento.get(idObraValida) || idObraValida;
        }

        // 3) Si la obra en la lista final apunta a esta cotización por cotizacionId
        const obraDeEstaCot = obrasFinales.find(
          (o) =>
            String(o.cotizacionId || "").trim() === String(c.id || "").trim() ||
            (c.numero && String(o.cotizacionId || "").trim() === String(c.numero).trim())
        );
        if (obraDeEstaCot && obraDeEstaCot.id !== idObra) {
          idObra = obraDeEstaCot.id;
        }

        if (idObra !== c.obraId) {
          huboLimpieza = true;
          return { ...c, obraId: idObra };
        }
        return c;
      })
    : listaCotizaciones;

  // Ajustar otras entidades si se pasaron
  const otrasEntidadesAjustadas = {};
  if (otrasEntidades && typeof otrasEntidades === "object" && mapaRenombramiento.size > 0) {
    for (const [key, list] of Object.entries(otrasEntidades)) {
      if (!Array.isArray(list)) continue;
      otrasEntidadesAjustadas[key] = list.map((item) => {
        if (item && item.obraId && mapaRenombramiento.has(item.obraId)) {
          return { ...item, obraId: mapaRenombramiento.get(item.obraId) };
        }
        return item;
      });
    }
  }

  return {
    obrasDepuradas: obrasFinales,
    cotizacionesAjustadas,
    otrasEntidadesAjustadas,
    huboLimpieza,
    eliminadas: [...new Set(eliminadas)],
    renombradas,
  };
}
