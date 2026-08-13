// Colores, medidas y ayudas de los listados con filtros.
//
// Van en un archivo aparte del componente porque mezclar componentes y
// constantes en el mismo modulo rompe la recarga en caliente de Vite: al
// tocar un color se recarga la pagina entera en vez de solo la pieza.

export const C = {
  borde: "#eef0f3", bordeFuerte: "#e2e8f0", tinta: "#1a1a2e", suave: "#475569",
  apagado: "#64748b", tenue: "#94a3b8", relleno: "#f8fafc", rellenoFuerte: "#eef0f3",
  acento: "#f47c20", acentoFuerte: "#cc0000", acentoSuave: "#fff3e8",
};

/** Rangos de fecha, los mismos en todos los modulos. */
export const RANGOS_FECHA = [
  { key: "7d",   label: "Últimos 7 días",  dias: 7 },
  { key: "30d",  label: "Últimos 30 días", dias: 30 },
  { key: "90d",  label: "Este trimestre",  dias: 90 },
  { key: "anio", label: "Este año",        dias: 365 },
];

export const enMilis = (fecha) => {
  const t = new Date(fecha || 0).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/** Boton pequeño de accion, el de las filas. */
export const boton = (fondo, color, extra = {}) => ({
  background: fondo, color, border: "none", borderRadius: 7, padding: "4px 9px",
  fontSize: 10.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  whiteSpace: "nowrap", lineHeight: 1.4, ...extra,
});
