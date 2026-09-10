// Paleta del armazon de la aplicacion (navegacion, barra superior, fondo).
// Los tokens de las pantallas viven en styles/tokens.js.

export const BRAND = "#E0342A";

const light = {
  bg: "#f6f7f9",
  surface: "#ffffff",
  surfaceTint: "#f2f4f7",
  text: "#101828",
  muted: "#667085",
  divider: "#eaecf0",
  railBg: "#ffffff",
  railBorder: "#eaecf0",
  railText: "#475467",
  railTextHover: "#101828",
  railTextActive: "#E0342A",
  railActiveBg: "rgba(224, 52, 42, 0.09)",
  railHoverBg: "#f2f4f7",
  railDivider: "#eaecf0",
  railTitle: "#98a2b3",
  railBrandText: "#101828",
};

const dark = {
  bg: "#0f1115",
  surface: "#181a20",
  surfaceTint: "#20232b",
  text: "#f0f2f5",
  muted: "#98a1b0",
  divider: "#2a2d36",
  railBg: "#101116",
  railBorder: "#24262e",
  railText: "#9aa2b1",
  railTextHover: "#ffffff",
  railTextActive: "#ffffff",
  railActiveBg: "rgba(255,255,255,.08)",
  railHoverBg: "rgba(255,255,255,.04)",
  railDivider: "#24262e",
  railTitle: "#6b7280",
  railBrandText: "#ffffff",
};

export const getTheme = (mode) => (mode === "dark" ? dark : light);

// Medidas del armazon reutilizadas por varios componentes.
export const RAIL_WIDTH = 72;
export const RAIL_WIDTH_EXPANDED = 252;
export const TOPBAR_HEIGHT = 64;
