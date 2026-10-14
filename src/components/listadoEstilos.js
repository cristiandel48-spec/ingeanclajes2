// Colores, medidas y ayudas de los listados con filtros.
//
// Van en un archivo aparte del componente porque mezclar componentes y
// constantes en el mismo modulo rompe la recarga en caliente de Vite: al
// tocar un color se recarga la pagina entera en vez de solo la pieza.

export const C = {
  borde: "var(--c-borde, #eef0f3)",
  bordeFuerte: "var(--c-borde-fuerte, #e2e8f0)",
  tinta: "var(--c-tinta, #1a1a2e)",
  suave: "var(--c-suave, #475569)",
  apagado: "var(--c-apagado, #64748b)",
  tenue: "var(--c-tenue, #64748b)",
  relleno: "var(--c-relleno, #f8fafc)",
  rellenoFuerte: "var(--c-relleno-fuerte, #eef0f3)",
  acento: "#f47c20",
  acentoFuerte: "var(--text-main, #101828)",
  acentoSuave: "var(--c-acento-suave, #fff3e8)",
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

/** Boton pequeño de accion, el de las filas estilo Apple. */
export const boton = (fondo, color, extra = {}) => ({
  background: fondo,
  color,
  border: "1px solid var(--border, rgba(0,0,0,0.08))",
  borderRadius: 8,
  padding: "5px 11px",
  fontSize: 11.5,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
  lineHeight: 1.35,
  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
  transition: "all .15s ease",
  ...extra,
});
