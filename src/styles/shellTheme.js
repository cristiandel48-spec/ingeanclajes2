// Paleta del armazon de la aplicacion (navegacion, barra superior, fondo).
//
// Ya no tiene colores propios: los lee de styles/designTokens.js, que es la
// unica fuente. Devuelve cadenas `var(--token)`, asi que el tema lo decide el
// atributo data-theme del armazon y no este archivo. Por eso las dos variantes
// son iguales: `getTheme` conserva su firma para no tocar a quien la llama.

export const BRAND = "var(--accent)";

const tema = {
  bg: "var(--bg-app)",
  surface: "var(--surface)",
  surfaceTint: "var(--fill)",
  text: "var(--text-primary)",
  muted: "var(--text-tertiary)",
  divider: "var(--separator)",
  railBg: "var(--rail-bg)",
  railBorder: "var(--rail-border)",
  railText: "var(--rail-text)",
  railTextHover: "var(--rail-text-hover)",
  railTextActive: "var(--rail-text-active)",
  railActiveBg: "var(--rail-active-bg)",
  railHoverBg: "var(--rail-hover-bg)",
  railDivider: "var(--rail-divider)",
  railTitle: "var(--rail-title)",
  railBrandText: "var(--rail-brand-text)",
};

export const getTheme = () => tema;

// Medidas del armazon reutilizadas por varios componentes.
export const RAIL_WIDTH = 72;
export const RAIL_WIDTH_EXPANDED = 252;
export const TOPBAR_HEIGHT = 64;
