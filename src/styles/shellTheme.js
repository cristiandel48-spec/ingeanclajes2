// Paleta del armazon de la aplicacion (navegacion, barra superior, fondo).
// Los tokens de las pantallas viven en styles/tokens.js.

export const BRAND = "#cc0000";

const light = {
  bg: "#f6f7f9",
  surface: "#ffffff",
  surfaceTint: "#f2f4f7",
  text: "#101828",
  muted: "#667085",
  divider: "#eaecf0",
  railBg: "#14151a",
  railText: "#9aa2b1",
  railTextActive: "#14151a",
  railActiveBg: "#ffffff",
  railHoverBg: "rgba(255,255,255,.08)",
  railDivider: "#262931",
  railTitle: "#667085",
};

const dark = {
  bg: "#0f1115",
  surface: "#181a20",
  surfaceTint: "#20232b",
  text: "#f0f2f5",
  muted: "#98a1b0",
  divider: "#2a2d36",
  railBg: "#101116",
  railText: "#9aa2b1",
  railTextActive: "#14151a",
  railActiveBg: "#ffffff",
  railHoverBg: "rgba(255,255,255,.08)",
  railDivider: "#24262e",
  railTitle: "#667085",
};

export const getTheme = (mode) => (mode === "dark" ? dark : light);

// Medidas del armazon reutilizadas por varios componentes.
export const RAIL_WIDTH = 72;
export const RAIL_WIDTH_EXPANDED = 252;
export const TOPBAR_HEIGHT = 64;
