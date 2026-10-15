// Colores, medidas y ayudas de los listados con filtros.
//
// Van en un archivo aparte del componente porque mezclar componentes y
// constantes en el mismo modulo rompe la recarga en caliente de Vite: al
// tocar un color se recarga la pagina entera en vez de solo la pieza.

// Los colores salen de styles/designTokens.js, la unica fuente del sistema.
// Este objeto ya no define ninguno: solo les pone el nombre que usan los
// listados. El acento sigue siendo el naranja heredado porque cambiarlo
// repinta cuatro modulos de golpe; eso es la fase 3 del plan, y entonces
// bastara con apuntar `acento` a COLOR.accent.
import { COLOR } from "../styles/designTokens";

export const C = {
  borde: COLOR.separator,
  bordeFuerte: "var(--border-strong)",
  tinta: COLOR.textPrimary,
  suave: COLOR.textSecondary,
  apagado: COLOR.textTertiary,
  tenue: COLOR.textTertiary,
  relleno: "var(--surface-subtle)",
  rellenoFuerte: COLOR.separator,
  acento: "var(--naranja-heredado)",
  acentoFuerte: COLOR.textPrimary,
  acentoSuave: "var(--naranja-heredado-tint)",
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
  border: "1px solid var(--border)",
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
