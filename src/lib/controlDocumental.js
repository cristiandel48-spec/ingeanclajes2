// Codigo y version de cada formato de la empresa.
//
// Lo piden los sistemas de gestion -ISO 9001, ISO 45001, el SG-SST-. La idea
// es sencilla y conviene no confundirla:
//
//   EL CODIGO identifica LA PLANTILLA. Es el mismo en todos los informes que
//   se emitan, y solo cambia cuando se modifica el formato: ahi sube la
//   version.
//
//   EL CONSECUTIVO -INF-014, C-26122- identifica EL DOCUMENTO, y cambia en
//   cada uno. Ese ya lo lleva el programa por su cuenta.
//
// Los dos salen juntos en la hoja, y esta bien que asi sea: uno dice con que
// plantilla se hizo y el otro cual de todos es.
//
// Se guarda en app.empresa_config, en la misma fila que la firma.

import { EMPRESA_CONFIG_ID, getEmpresaConfig } from "./firmaEmpresa";

// Los documentos que se le entregan al cliente. Si manana hay mas -acta de
// entrega, lista de chequeo-, se agregan aqui y aparecen solos en la pantalla
// de configuracion.
export const FORMATOS = [
  { clave: "cotizacion",    etiqueta: "Cotización" },
  { clave: "informe",       etiqueta: "Informe de actividades" },
  { clave: "certificacion", etiqueta: "Certificación" },
];

// Los primeros codigos de Ingeanclajes. Sirven de punto de partida: se cambian
// desde la pantalla y lo que se guarde manda.
//
// «IA» por la empresa y «FT» por formato. Es deliberadamente simple: la
// codificacion de otras empresas -«EM.PR10.FT03»- lleva dentro el proceso y el
// procedimiento, y eso solo tiene sentido cuando existen esos procesos
// numerados. El dia que se monten, se cambia aqui y ya.
export const CONTROL_POR_DEFECTO = {
  cotizacion:    { codigo: "IA-FT-01", version: "1", fecha: "2026-08-14" },
  informe:       { codigo: "IA-FT-02", version: "1", fecha: "2026-08-14" },
  certificacion: { codigo: "IA-FT-03", version: "1", fecha: "2026-08-14" },
};

/** Lee la configuracion completa, con los valores por defecto de respaldo. */
export function getControlDocumental(empresaConfig) {
  const guardado = getEmpresaConfig(empresaConfig)?.controlDocumental;
  const salida = {};
  for (const { clave } of FORMATOS) {
    const suyo = guardado?.[clave] ?? {};
    const base = CONTROL_POR_DEFECTO[clave] ?? { codigo: "", version: "", fecha: "" };
    salida[clave] = {
      // Si nunca se ha configurado nada se usan los codigos de arranque; en
      // cuanto se guarda algo, manda lo guardado, aunque sea vacio.
      codigo:  guardado ? String(suyo.codigo ?? "")  : base.codigo,
      version: guardado ? String(suyo.version ?? "") : base.version,
      fecha:   guardado ? String(suyo.fecha ?? "")   : base.fecha,
    };
  }
  return salida;
}

/**
 * Lo que se imprime de un documento, ya armado.
 * Devuelve null cuando no hay codigo: entonces no se pinta el cuadro.
 */
export function selloDe(empresaConfig, clave) {
  const dato = getControlDocumental(empresaConfig)[clave];
  const codigo = String(dato?.codigo || "").trim();
  if (!codigo) return null;

  const version = String(dato?.version || "").trim();
  const fecha = String(dato?.fecha || "").trim();

  return {
    codigo,
    // «Versión 1 · 14/08/2026». Si falta alguno de los dos, no se deja el
    // separador suelto.
    linea: [version ? `Versión ${version}` : "", fechaCorta(fecha)].filter(Boolean).join(" · "),
  };
}

// 2026-08-14 -> 14/08/2026. Se hace aqui y no con Date para no correr un dia
// por la zona horaria.
function fechaCorta(iso) {
  const partes = String(iso || "").trim().split("-");
  if (partes.length !== 3) return String(iso || "").trim();
  const [ano, mes, dia] = partes;
  return `${dia}/${mes}/${ano}`;
}

/** Devuelve la lista de configuracion con un formato cambiado. */
export function setControlDocumental(empresaConfig, clave, campos) {
  const lista = Array.isArray(empresaConfig) ? empresaConfig : [];
  const actual = getEmpresaConfig(lista);
  const previo = getControlDocumental(lista);

  const fila = {
    ...(actual || { id: EMPRESA_CONFIG_ID }),
    controlDocumental: { ...previo, [clave]: { ...previo[clave], ...campos } },
  };

  if (!actual) return [...lista, fila];
  return lista.map((row) => (row?.id === EMPRESA_CONFIG_ID ? fila : row));
}
