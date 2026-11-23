// Perfiles y firmas escaneadas de los coordinadores de obra / SST
// (por ejemplo Richard Buelvas, Paola Escobar u otro encargado del personal).
//
// Se guardan como filas propias en `app.empresa_config` con id
// `firma_coord:<clave>`, reutilizando exactamente las columnas que ya existen
// en la base de datos (`firma_img`, `firma_nombre`, `firma_cargo` y
// `control_documental` para la cedula y el empleadoId), sin tocar la fila
// principal `empresa` ni requerir migraciones SQL adicionales.
//
// Al subir la firma escaneada en PDF, JPEG o PNG de un coordinador una sola
// vez, cualquier informe donde se seleccione o detecte a ese coordinador se
// firma automaticamente.

import { normalizarNombrePropio } from "./normalizarEntrada";

export const PREFIJO_FIRMA_COORDINADOR = "firma_coord:";
export const FIRMA_COORD_MAX_BYTES = 8 * 1024 * 1024;
export const TIPOS_FIRMA_ACEPTADOS = "application/pdf,.pdf,image/jpeg,image/jpg,image/png,image/webp";

// Coordinadores frecuentes de obra / SST en Ingeanclajes. Si ya existen en el
// directorio de empleados o tienen firma guardada, se fusionan sin duplicarse.
export const COORDINADORES_SUGERIDOS = [
  { nombre: "Richard Buelvas", cargo: "COORDINADOR SST" },
  { nombre: "Paola Escobar", cargo: "COORDINADORA SST" },
];

// Recordatorios dirigidos a una sola persona. El aviso de firma ya le sale a
// cada coordinador que no la ha subido, pero se cierra con «Ahora no»; un
// recordatorio lo vuelve a abrir aunque lo haya cerrado y le pone encima un
// mensaje propio. Solo lo ve quien tenga abierta la sesion de esa persona, y
// deja de salir en cuanto guarda la firma. Para relanzarlo otra vez basta con
// cambiar `version`.
export const RECORDATORIOS_FIRMA = [
  {
    persona: "Richard Buelvas",
    version: "2026-11-23",
    titulo: "todavía falta tu firma",
    mensaje:
      "Se necesita para imprimirla en el Informe de Actividades. Mientras no la subas, los informes donde eres coordinador salen sin tu firma.",
  },
];

const ES_CARGO_COORDINADOR = /COORDINAD|SST|HSEQ|SEGURIDAD\s+Y\s+SALUD/i;

export function esCargoCoordinador(cargo = "") {
  return ES_CARGO_COORDINADOR.test(String(cargo || "").trim());
}

/** Clave estable y sin acentos para identificar a un coordinador por nombre. */
export function claveCoordinador(nombre = "") {
  return String(nombre || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function textoNormalizado(v = "") {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function idFilaFirmaCoordinador(nombre = "") {
  const clave = claveCoordinador(nombre);
  return clave ? `${PREFIJO_FIRMA_COORDINADOR}${clave}` : "";
}

/**
 * Comprueba si dos nombres corresponden a la misma persona aunque uno sea
 * corto y el otro completo (p. ej. "Paola Escobar" y "Yesli Paola Escobar
 * Sanchez", o "Richard Buelvas" y "Richard Javier Buelvas Mendoza").
 */
export function coincidenNombresPersona(nombreA = "", nombreB = "") {
  const a = claveCoordinador(nombreA);
  const b = claveCoordinador(nombreB);
  if (!a || !b) return false;
  if (a === b) return true;
  const toksA = a.split("-").filter((t) => t.length >= 3);
  const toksB = b.split("-").filter((t) => t.length >= 3);
  if (toksA.length < 2 || toksB.length < 2) return false;
  const [corto, largo] = toksA.length <= toksB.length ? [toksA, toksB] : [toksB, toksA];
  return corto.every((tok) => largo.includes(tok));
}

/** Recordatorio de firma dirigido a este coordinador, o `null` si no tiene. */
export function recordatorioFirmaPara(coordinador, recordatorios = RECORDATORIOS_FIRMA) {
  const nombre = typeof coordinador === "string" ? coordinador : coordinador?.nombre;
  if (!String(nombre || "").trim()) return null;
  return (recordatorios || []).find((r) => coincidenNombresPersona(r.persona, nombre)) || null;
}

/** Lista todos los perfiles de coordinadores guardados en `empresaConfig`. */
export function listarFirmasCoordinadores(empresaConfig) {
  const lista = Array.isArray(empresaConfig) ? empresaConfig : [];
  return lista
    .filter((row) => typeof row?.id === "string" && row.id.startsWith(PREFIJO_FIRMA_COORDINADOR))
    .map((row) => {
      const meta = row.controlDocumental && typeof row.controlDocumental === "object"
        ? row.controlDocumental
        : {};
      return {
        id: row.id,
        clave: row.id.slice(PREFIJO_FIRMA_COORDINADOR.length),
        nombre: String(row.firmaNombre || meta.nombre || "").trim(),
        cargo: String(row.firmaCargo || meta.cargo || "COORDINADOR SST").trim(),
        cedula: String(meta.cedula || "").trim(),
        empleadoId: String(meta.empleadoId || "").trim(),
        firmaImg: String(row.firmaImg || "").trim(),
      };
    })
    .filter((item) => item.nombre || item.firmaImg);
}

/** Busca el perfil guardado (y su firma) de un coordinador por id o nombre. */
export function getFirmaCoordinador(empresaConfig, coordinador) {
  if (!coordinador) return null;
  const perfiles = listarFirmasCoordinadores(empresaConfig);
  if (!perfiles.length) return null;

  const nombreBuscado = typeof coordinador === "string" ? coordinador : coordinador.nombre;
  const empIdBuscado = typeof coordinador === "object" ? String(coordinador.empleadoId || "").trim() : "";
  const claveBuscada = claveCoordinador(nombreBuscado);

  if (empIdBuscado) {
    const porEmp = perfiles.find((p) => p.empleadoId && p.empleadoId === empIdBuscado);
    if (porEmp) return porEmp;
  }
  if (claveBuscada) {
    const porClaveExacta = perfiles.find((p) => p.clave === claveBuscada || claveCoordinador(p.nombre) === claveBuscada);
    if (porClaveExacta) return porClaveExacta;
    const porTokens = perfiles.find((p) => coincidenNombresPersona(p.nombre || p.clave, nombreBuscado));
    if (porTokens) return porTokens;
  }
  return null;
}

/**
 * Guarda o actualiza el perfil y la firma de un coordinador en `empresaConfig`.
 * Conserva intactas las demas filas (incluida la fila principal `empresa`).
 */
export function guardarFirmaCoordinador(empresaConfig, datos = {}) {
  const nombreLimpio = normalizarNombrePropio(String(datos.nombre || "").trim());
  const idPorNombre = idFilaFirmaCoordinador(nombreLimpio);
  if (!idPorNombre) return Array.isArray(empresaConfig) ? empresaConfig : [];

  const lista = Array.isArray(empresaConfig) ? empresaConfig : [];
  const empIdEntrante = String(datos.empleadoId || "").trim();
  const existente = lista.find((row) => {
    if (typeof row?.id !== "string" || !row.id.startsWith(PREFIJO_FIRMA_COORDINADOR)) return false;
    if (row.id === idPorNombre) return true;
    const meta = row.controlDocumental && typeof row.controlDocumental === "object" ? row.controlDocumental : {};
    if (empIdEntrante && meta.empleadoId && meta.empleadoId === empIdEntrante) return true;
    return coincidenNombresPersona(row.firmaNombre || meta.nombre || row.id.slice(PREFIJO_FIRMA_COORDINADOR.length), nombreLimpio);
  });

  const idFila = existente?.id || idPorNombre;
  const metaExistente = existente?.controlDocumental && typeof existente.controlDocumental === "object"
    ? existente.controlDocumental
    : {};

  // Conservar el nombre mas completo entre el existente y el nuevo
  const nombreExistente = String(existente?.firmaNombre || metaExistente.nombre || "").trim();
  const nombreFinal = nombreLimpio.length >= nombreExistente.length ? nombreLimpio : nombreExistente;

  const cargoFinal = String(
    datos.cargo !== undefined ? datos.cargo : (existente?.firmaCargo || "COORDINADOR SST")
  ).trim().toUpperCase();

  const cedulaFinal = String(
    datos.cedula !== undefined ? datos.cedula : (metaExistente.cedula || "")
  ).trim();

  const empleadoIdFinal = String(
    datos.empleadoId !== undefined ? datos.empleadoId : (metaExistente.empleadoId || "")
  ).trim();

  const firmaImgFinal = datos.firmaImg !== undefined
    ? String(datos.firmaImg || "")
    : String(existente?.firmaImg || "");

  const nuevaFila = {
    ...(existente || {}),
    id: idFila,
    firmaImg: firmaImgFinal,
    firmaNombre: nombreFinal,
    firmaCargo: cargoFinal || "COORDINADOR SST",
    controlDocumental: {
      ...metaExistente,
      tipo: "firma_coordinador",
      nombre: nombreFinal,
      cargo: cargoFinal || "COORDINADOR SST",
      cedula: cedulaFinal,
      empleadoId: empleadoIdFinal,
    },
  };

  if (existente) {
    return lista.map((row) => (row?.id === idFila ? nuevaFila : row));
  }
  return [...lista, nuevaFila];
}

/** Elimina solo la imagen de firma de un coordinador conservando sus datos basicos. */
export function quitarFirmaCoordinador(empresaConfig, coordinador) {
  const perfil = getFirmaCoordinador(empresaConfig, coordinador);
  if (!perfil) return Array.isArray(empresaConfig) ? empresaConfig : [];
  return guardarFirmaCoordinador(empresaConfig, {
    nombre: perfil.nombre,
    cargo: perfil.cargo,
    cedula: perfil.cedula,
    empleadoId: perfil.empleadoId,
    firmaImg: "",
  });
}

/**
 * Construye la lista deduplicada de coordinadores recomendados para elegir con
 * un toque: mezcla empleados con cargo de coordinador/SST, perfiles con firma
 * guardada y los coordinadores frecuentes (Richard Buelvas, Paola Escobar),
 * unificando nombres cortos y completos sin duplicarlos.
 */
export function obtenerOpcionesCoordinadores({ empleados = [], empresaConfig = [] } = {}) {
  const entradas = [];
  const perfilesGuardados = listarFirmasCoordinadores(empresaConfig);
  const listaEmp = Array.isArray(empleados) ? empleados : [];

  const registrar = (item, prioridad = false) => {
    const nombre = normalizarNombrePropio(String(item?.nombre || "").trim());
    const clave = claveCoordinador(nombre);
    if (!clave) return;

    const perfil = getFirmaCoordinador(empresaConfig, { nombre, empleadoId: item?.empleadoId });
    const empMatch = listaEmp.find((e) =>
      (item?.empleadoId && e?.id === item.empleadoId) || coincidenNombresPersona(e?.nombre, nombre)
    );

    const idxExistente = entradas.findIndex((x) =>
      (item?.empleadoId && x.empleadoId && x.empleadoId === item.empleadoId) ||
      (empMatch?.id && x.empleadoId && x.empleadoId === empMatch.id) ||
      coincidenNombresPersona(x.nombre, nombre)
    );

    const previo = idxExistente >= 0 ? entradas[idxExistente] : null;
    const candidatosNombre = [empMatch?.nombre, previo?.nombre, nombre].filter(Boolean).map((n) => normalizarNombrePropio(String(n).trim()));
    const nombreMasCompleto = candidatosNombre.sort((a, b) => b.length - a.length)[0] || nombre;

    const combinado = {
      clave: claveCoordinador(nombreMasCompleto),
      nombre: nombreMasCompleto,
      empleadoId: empMatch?.id || item?.empleadoId || perfil?.empleadoId || previo?.empleadoId || "",
      cargo: String(
        perfil?.cargo || empMatch?.cargo || item?.cargo || previo?.cargo || "COORDINADOR SST"
      ).trim().toUpperCase(),
      cedula: String(
        perfil?.cedula || empMatch?.cedula || item?.cedula || previo?.cedula || ""
      ).trim(),
      firmaImg: String(perfil?.firmaImg || previo?.firmaImg || "").trim(),
      destacado: Boolean(prioridad || previo?.destacado || perfil?.firmaImg),
    };

    if (idxExistente >= 0) {
      entradas[idxExistente] = combinado;
    } else {
      entradas.push(combinado);
    }
  };

  // 1. Empleados activos con cargo de coordinador / SST primero (traen nombre legal completo y cedula)
  listaEmp
    .filter((e) => e && e.activo !== false && esCargoCoordinador(e.cargo))
    .forEach((e) => registrar({
      empleadoId: e.id,
      nombre: e.nombre,
      cargo: e.cargo,
      cedula: e.cedula,
    }, true));

  // 2. Coordinadores frecuentes sugeridos (si ya entraron por empleados se unifican sin duplicarse)
  COORDINADORES_SUGERIDOS.forEach((s) => registrar(s, true));

  // 3. Cualquier otro coordinador que ya tenga perfil/firma guardada
  perfilesGuardados.forEach((p) => registrar(p, true));

  return entradas;
}

/**
 * Reconoce si la sesion actual pertenece a un coordinador de obra / SST
 * (por ejemplo Paola Escobar, Richard Buelvas o cualquier empleado activo
 * cuyo cargo corresponda a coordinador / SST / alturas) y devuelve su perfil
 * enriquecido con el estado de su firma guardada en `empresaConfig`.
 *
 * Devuelve `null` si el usuario conectado no es coordinador (p. ej. gerencia,
 * administracion o contabilidad).
 */
export function detectarCoordinadorEnSesion({
  membresia = null,
  authUserEmail = "",
  empleados = [],
  empresaConfig = [],
} = {}) {
  if (!membresia && !authUserEmail) return null;

  const nombreSesion = textoNormalizado(membresia?.nombre || "");
  const emails = [membresia?.email, authUserEmail]
    .map((e) => textoNormalizado(e))
    .filter(Boolean);
  const cargoSesion = String(membresia?.cargo || membresia?.puesto || "").trim();
  const listaEmp = Array.isArray(empleados) ? empleados : [];

  const coincideNombreConObjetivo = (textoNombre, objetivoNombre) => {
    const a = claveCoordinador(textoNombre);
    const b = claveCoordinador(objetivoNombre);
    if (!a || !b) return false;
    if (a === b) return true;
    const tokensObj = b.split("-").filter((t) => t.length >= 3);
    if (tokensObj.length >= 2) {
      return tokensObj.every((tok) => a.includes(tok));
    }
    return false;
  };

  // 1. Buscar coincidencia directa en empleados (por correo o por nombre)
  const empMatch = listaEmp.find((e) => {
    if (!e || e.activo === false) return false;
    const empEmail = textoNormalizado(e.email || "");
    if (empEmail && emails.includes(empEmail)) return true;
    if (nombreSesion && coincideNombreConObjetivo(nombreSesion, e.nombre)) return true;
    return false;
  }) || null;

  // 2. Comprobar coincidencia con coordinadores frecuentes (Paola Escobar, Richard Buelvas)
  const sugeridoMatch = COORDINADORES_SUGERIDOS.find((sug) => {
    const tokens = claveCoordinador(sug.nombre).split("-").filter((t) => t.length >= 3);
    if (nombreSesion && coincideNombreConObjetivo(nombreSesion, sug.nombre)) return true;
    // Reconocimiento por correo (ej. paola.escobar@..., pescobar@..., richardbuelvas@..., rbuelvas@...)
    return emails.some((em) => {
      const local = em.split("@")[0] || "";
      if (tokens.every((t) => local.includes(t))) return true;
      if (tokens.length >= 2) {
        const [nombreTok, apellidoTok] = tokens;
        if (local.includes(apellidoTok) && local.startsWith(nombreTok[0])) return true;
        if (local === nombreTok || local.startsWith(`${nombreTok}.`) || local.startsWith(`${nombreTok}_`) || local.startsWith(`${nombreTok}-`)) {
          return true;
        }
      }
      return false;
    });
  }) || null;

  // 3. Determinar si la persona de la sesion actua como coordinador de obra / SST
  const esCoordPorEmpleado = Boolean(empMatch && esCargoCoordinador(empMatch.cargo));
  const esCoordPorPerfilGuardado = Boolean(
    nombreSesion && getFirmaCoordinador(empresaConfig, { nombre: membresia?.nombre, empleadoId: empMatch?.id })
  );
  const esCoordPorCargoSesion = Boolean(cargoSesion && esCargoCoordinador(cargoSesion));

  if (!sugeridoMatch && !esCoordPorEmpleado && !esCoordPorPerfilGuardado && !esCoordPorCargoSesion) {
    return null;
  }

  const nombreBase = normalizarNombrePropio(
    empMatch?.nombre || sugeridoMatch?.nombre || String(membresia?.nombre || "").trim()
  );
  if (!nombreBase) return null;

  const clave = claveCoordinador(nombreBase);
  const empRespaldo = empMatch || listaEmp.find((e) => claveCoordinador(e?.nombre) === clave) || null;
  const perfilGuardado = getFirmaCoordinador(empresaConfig, {
    nombre: nombreBase,
    empleadoId: empRespaldo?.id || "",
  });

  const cargoFinal = String(
    perfilGuardado?.cargo || empRespaldo?.cargo || cargoSesion || sugeridoMatch?.cargo || "COORDINADOR SST"
  ).trim().toUpperCase();

  const cedulaFinal = String(
    perfilGuardado?.cedula || empRespaldo?.cedula || ""
  ).trim();

  const firmaImg = String(perfilGuardado?.firmaImg || "").trim();

  return {
    clave,
    empleadoId: String(empRespaldo?.id || perfilGuardado?.empleadoId || "").trim(),
    nombre: nombreBase,
    cargo: cargoFinal,
    cedula: cedulaFinal,
    firmaImg,
    tieneFirmaGuardada: Boolean(firmaImg),
  };
}

/**
 * Resuelve el coordinador de obra / SST asignado a un informe y le adjunta
 * automaticamente su cedula y su firma guardada en `empresaConfig`.
 */
export function extraerCoordinadorDeInforme(informe, { empleados = [], empresaConfig = [] } = {}) {
  if (!informe) return null;

  const listaEmp = Array.isArray(empleados) ? empleados : [];
  const personal = Array.isArray(informe.personal) ? informe.personal : [];

  let base = null;
  if (informe.coordinador && String(informe.coordinador.nombre || "").trim()) {
    base = informe.coordinador;
  } else {
    const marcado = personal.find((p) => p?.esCoordinadorInforme && String(p.nombre || "").trim());
    if (marcado) {
      base = marcado;
    } else {
      const detectado = personal.find((p) =>
        p && String(p.nombre || "").trim() && (
          esCargoCoordinador(p.cargo) ||
          Boolean(getFirmaCoordinador(empresaConfig, p))
        )
      );
      if (detectado) base = detectado;
    }
  }

  if (!base || !String(base.nombre || "").trim()) return null;

  const nombre = normalizarNombrePropio(String(base.nombre).trim());
  const emp = listaEmp.find((e) =>
    (base.empleadoId && e?.id === base.empleadoId) || coincidenNombresPersona(e?.nombre, nombre)
  );
  const perfil = getFirmaCoordinador(empresaConfig, { nombre, empleadoId: base.empleadoId || emp?.id });

  const cargo = String(
    base.cargo || perfil?.cargo || emp?.cargo || "COORDINADOR SST"
  ).trim().toUpperCase();

  const cedula = String(
    base.cedula || perfil?.cedula || emp?.cedula || ""
  ).trim();

  const firmaImg = String(
    base.firmaImg || perfil?.firmaImg || ""
  ).trim();

  return {
    empleadoId: String(base.empleadoId || emp?.id || perfil?.empleadoId || "").trim(),
    nombre,
    cargo,
    cedula,
    firmaImg,
    tieneFirmaGuardada: Boolean(firmaImg),
  };
}

/**
 * Embebe la seleccion del coordinador dentro del arreglo `personal` del informe
 * para que persista automaticamente en `app.informes.personal` (JSONB) sin
 * requerir columnas SQL nuevas.
 */
export function aplicarCoordinadorAPersonal(personal = [], coordinador = null) {
  const lista = (Array.isArray(personal) ? personal : [])
    .filter((p) => p && !p.soloFirmaCoordinador)
    .map((p) => {
      if (!p.esCoordinadorInforme) return p;
      const copia = { ...p };
      delete copia.esCoordinadorInforme;
      return copia;
    });

  if (!coordinador || !String(coordinador.nombre || "").trim()) {
    return lista;
  }

  const nombre = normalizarNombrePropio(String(coordinador.nombre).trim());
  const cargo = String(coordinador.cargo || "COORDINADOR SST").trim().toUpperCase();
  const cedula = String(coordinador.cedula || "").trim();
  const empleadoId = String(coordinador.empleadoId || "").trim();

  const idx = lista.findIndex((p) =>
    (empleadoId && p.empleadoId === empleadoId) || coincidenNombresPersona(p.nombre, nombre)
  );

  if (idx >= 0) {
    return lista.map((p, i) => (i === idx ? {
      ...p,
      empleadoId: empleadoId || p.empleadoId || "",
      nombre,
      cargo: cargo || p.cargo || "COORDINADOR SST",
      cedula: cedula || p.cedula || "",
      esCoordinadorInforme: true,
    } : p));
  }

  return [
    ...lista,
    {
      empleadoId,
      nombre,
      cargo,
      cedula,
      turno1: "",
      turno2: "",
      manual: !empleadoId,
      esCoordinadorInforme: true,
      soloFirmaCoordinador: true,
    },
  ];
}

/** Personal visible en la seccion "1. Personal Tecnico Asignado en Sitio". */
export function personalVisibleEnInforme(personal = []) {
  return (Array.isArray(personal) ? personal : []).filter((p) => p && !p.soloFirmaCoordinador);
}

// ── Procesamiento de firma escaneada (PDF, JPEG o PNG) ──────────────────────

/**
 * Limpia el fondo blanco de papel y recorta automaticamente los margenes
 * vacios alrededor de la firma para que salga grande, centrada y nitida
 * incluso si fue escaneada en una hoja completa carta/A4 en PDF.
 */
function procesarCanvasFirma(canvasOrigen) {
  const w = canvasOrigen.width;
  const h = canvasOrigen.height;
  const ctx = canvasOrigen.getContext("2d", { willReadFrequently: true });
  if (!ctx || !w || !h) return canvasOrigen.toDataURL("image/png");

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const sampleCorner = (x, y) => {
    const idx = (y * w + x) * 4;
    const a = data[idx + 3];
    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    return { lum, a };
  };
  const corners = [
    sampleCorner(0, 0),
    sampleCorner(w - 1, 0),
    sampleCorner(0, h - 1),
    sampleCorner(w - 1, h - 1),
  ];
  const avgLum = corners.reduce((s, c) => s + c.lum, 0) / 4;
  const allOpaque = corners.every((c) => c.a > 240);

  if (allOpaque && avgLum > 210) {
    const umbralBlanco = Math.min(244, Math.max(218, avgLum - 12));
    const umbralTinta = umbralBlanco - 44;
    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum >= umbralBlanco) {
        data[i + 3] = 0;
      } else if (lum > umbralTinta) {
        const factor = (umbralBlanco - lum) / (umbralBlanco - umbralTinta);
        data[i + 3] = Math.round(data[i + 3] * factor);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }

  // Recorte inteligente de margenes en blanco alrededor de los trazos de tinta
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  let pixelesTinta = 0;

  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const alpha = data[(y * w + x) * 4 + 3];
      if (alpha > 45) {
        pixelesTinta += 1;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  let sx = 0;
  let sy = 0;
  let sw = w;
  let sh = h;
  if (pixelesTinta > 25 && maxX > minX + 12 && maxY > minY + 6) {
    const pad = Math.max(8, Math.round(Math.max(maxX - minX, maxY - minY) * 0.04));
    sx = Math.max(0, minX - pad);
    sy = Math.max(0, minY - pad);
    sw = Math.min(w - sx, maxX - minX + pad * 2);
    sh = Math.min(h - sy, maxY - minY + pad * 2);
  }

  // Escala final optimizada para impresion a 336 DPI sin exceder 900x360 px
  const maxW = 900;
  const maxH = 360;
  const ratio = Math.min(1, maxW / sw, maxH / sh);
  const outW = Math.max(1, Math.round(sw * ratio));
  const outH = Math.max(1, Math.round(sh * ratio));

  const salida = document.createElement("canvas");
  salida.width = outW;
  salida.height = outH;
  const outCtx = salida.getContext("2d");
  if (!outCtx) return canvasOrigen.toDataURL("image/png");
  outCtx.imageSmoothingEnabled = true;
  outCtx.imageSmoothingQuality = "high";
  outCtx.drawImage(canvasOrigen, sx, sy, sw, sh, 0, 0, outW, outH);
  return salida.toDataURL("image/png");
}

async function renderizarPrimeraPaginaPdfACanvas(file) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.min.mjs");
  if (!pdfjs?.getDocument) {
    throw new Error("No se pudo cargar el lector de PDF. Recarga la página e inténtalo de nuevo.");
  }

  let workerPropio = null;
  try {
    workerPropio = (await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url")).default;
  } catch {
    // Respaldo externo
  }

  const version = pdfjs.version || "6.2.108";
  const opciones = {
    cMapUrl: new URL("/pdfjs/cmaps/", window.location.origin).href,
    cMapPacked: true,
    standardFontDataUrl: new URL("/pdfjs/standard_fonts/", window.location.origin).href,
  };
  const datos = new Uint8Array(await file.arrayBuffer());
  const workers = [
    workerPropio,
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/legacy/build/pdf.worker.min.mjs`,
  ].filter(Boolean);

  let documento = null;
  let ultimoError = null;
  for (const workerSrc of workers) {
    try {
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      const tarea = pdfjs.getDocument({ ...opciones, data: datos.slice() });
      documento = await tarea.promise;
      break;
    } catch (err) {
      ultimoError = err;
    }
  }
  if (!documento) {
    throw ultimoError || new Error("No se pudo abrir el PDF de la firma.");
  }

  try {
    const pagina = await documento.getPage(1);
    const baseVp = pagina.getViewport({ scale: 1 });
    const escala = Math.min(3, Math.max(2, 1600 / Math.max(baseVp.width, 1)));
    const viewport = pagina.getViewport({ scale: escala });

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("No se pudo preparar el lienzo para leer el PDF.");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  } finally {
    try {
      await documento.destroy?.();
    } catch {
      // Ignorar errores de limpieza
    }
  }
}

/**
 * Lee una firma escaneada en PDF, JPEG o PNG, limpia el fondo blanco, recorta
 * los margenes vacios y la deja lista en alta nitidez para imprimir en el
 * Informe de Actividades.
 */
export async function leerFirmaCoordinadorComoDataUri(file) {
  if (!file) {
    throw new Error("No se seleccionó ningún archivo.");
  }
  const esPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name || "");
  const esImagen = Boolean(file.type?.startsWith("image/")) || /\.(jpe?g|png|webp)$/i.test(file.name || "");

  if (!esPdf && !esImagen) {
    throw new Error("El archivo debe ser un PDF escaneado o una imagen (JPEG o PNG).");
  }
  if (file.size > FIRMA_COORD_MAX_BYTES) {
    throw new Error("El archivo pesa más de 8 MB. Usa una versión más liviana.");
  }

  if (esPdf) {
    if (typeof document === "undefined") {
      throw new Error("La lectura de PDF requiere un navegador activo.");
    }
    const canvasPdf = await renderizarPrimeraPaginaPdfACanvas(file);
    return procesarCanvasFirma(canvasPdf);
  }

  const rawDataUri = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo de firma."));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });

  if (typeof Image === "undefined" || typeof document === "undefined") {
    return rawDataUri;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onerror = () => resolve(rawDataUri);
    img.onload = () => {
      try {
        const maxEntrada = 1600;
        const ratio = Math.min(1, maxEntrada / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 400) * ratio));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 160) * ratio));
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(rawDataUri);
          return;
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(procesarCanvasFirma(canvas));
      } catch {
        resolve(rawDataUri);
      }
    };
    img.src = rawDataUri;
  });
}
