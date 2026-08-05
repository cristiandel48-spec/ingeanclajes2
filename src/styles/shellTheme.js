// Paleta del armazon de la aplicacion (navegacion, barra superior, fondo).
// Los tokens de las pantallas viven en styles/tokens.js.

export const BRAND = "#cc0000";

// El menu lateral era un bloque negro de lado a lado de la pantalla: la pieza
// mas grande de la interfaz y la mas dura. Ahora va en beige, con el elemento
// activo en blanco para que se despegue del fondo. La aplicacion entera queda
// en tonos claros y el unico oscuro que queda es el de los botones.
const light = {
  bg: "#fbf8f3",
  surface: "#ffffff",
  surfaceTint: "#f4eee4",
  text: "#2b2622",
  muted: "#756a5e",
  divider: "#e8dfd2",
  railBg: "#f4eee4",
  railText: "#6b6155",
  railTextActive: "#2b2622",
  railActiveBg: "#ffffff",
  railHoverBg: "rgba(43,38,34,.05)",
  railDivider: "#e2d8c9",
  railTitle: "#a2988a",
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
  railTitle: "#756a5e",
};

export const getTheme = (mode) => (mode === "dark" ? dark : light);

// Medidas del armazon reutilizadas por varios componentes.
export const RAIL_WIDTH = 72;
export const RAIL_WIDTH_EXPANDED = 252;
export const TOPBAR_HEIGHT = 64;
