// FUENTE UNICA DE TOKENS del sistema de diseÃ±o.
//
// Antes habia cuatro sitios que definian colores y se contradecian entre si:
// este archivo, shellTheme.js, el bloque :root de GlobalStyles.jsx y el objeto
// C de components/listadoEstilos.js. Cada uno tenia su propio gris de borde y
// su propio acento, y por eso la aplicacion parecia quince programas distintos.
//
// Ahora el color vive UNA sola vez, aqui, en `tokensCss`. Los demas archivos
// -incluido el :root de GlobalStyles- leen de aqui. Para cambiar un color del
// producto se toca este archivo y nada mas.
//
// Las pantallas siguen escribiendo `var(--token)` en sus estilos en linea, que
// es lo que hace que el modo oscuro funcione sin tocar cada componente.

// â”€â”€ Escala tipografica â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ocho escalones y nada por debajo de 11px. Listos para esparcir en un style.
export const TIPO = {
  largeTitle: { fontSize: 28, lineHeight: "34px", fontWeight: 700, letterSpacing: "-0.022em" },
  title1:     { fontSize: 22, lineHeight: "28px", fontWeight: 700, letterSpacing: "-0.018em" },
  title2:     { fontSize: 18, lineHeight: "24px", fontWeight: 600, letterSpacing: "-0.01em" },
  headline:   { fontSize: 15, lineHeight: "20px", fontWeight: 600 },
  body:       { fontSize: 14, lineHeight: "20px", fontWeight: 400 },
  callout:    { fontSize: 13, lineHeight: "18px", fontWeight: 400 },
  footnote:   { fontSize: 12, lineHeight: "16px", fontWeight: 500 },
  caption:    { fontSize: 11, lineHeight: "14px", fontWeight: 500 },
  // Etiqueta en mayusculas sobre un titulo.
  eyebrow:    { fontSize: 11, lineHeight: "14px", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" },
};

// Toda cifra que se compare en columna lleva esto.
export const CIFRA = { fontVariantNumeric: "tabular-nums" };

// â”€â”€ Espaciado, radios, alturas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const ESPACIO = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32, max: 40 };

export const RADIO = { chip: 6, control: 10, tarjeta: 14, hoja: 20, pildora: 999 };

// Altura de los controles. 44 es el minimo para usar con el dedo, y con
// guantes en obra: por debajo de eso no se acierta.
export const ALTURA = { compacta: 32, normal: 36, tactil: 44 };

export const SOMBRA = {
  sm: "var(--sombra-sm)",
  md: "var(--sombra-md)",
  lg: "var(--sombra-lg)",
};

// â”€â”€ Apilado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Una escala con nombre, para que nadie vuelva a escribir 99999 a ojo.
export const CAPA = {
  contenido: 1,
  barra: 40,
  navegacion: 100,
  menu: 1000,
  hoja: 2000,
  aviso: 3000,
  visor: 4000,
};

// â”€â”€ Movimiento â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const TRANSICION = {
  rapida: "150ms cubic-bezier(.2,.8,.2,1)",
  entrada: "250ms cubic-bezier(.2,.8,.2,1)",
};

// â”€â”€ Color â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Siempre a traves de var(): es lo unico que responde al modo oscuro.
export const COLOR = {
  accent: "var(--accent)",
  accentHover: "var(--accent-hover)",
  accentTint: "var(--accent-tint)",
  textPrimary: "var(--text-primary)",
  textSecondary: "var(--text-secondary)",
  textTertiary: "var(--text-tertiary)",
  textQuaternary: "var(--text-quaternary)",
  separator: "var(--separator)",
  fill: "var(--fill)",
  bgApp: "var(--bg-app)",
  surface: "var(--surface)",
  success: "var(--success)", successBg: "var(--success-bg)", successText: "var(--success-text)",
  warning: "var(--warning)", warningBg: "var(--warning-bg)", warningText: "var(--warning-text)",
  danger: "var(--danger)",   dangerBg: "var(--danger-bg)",   dangerText: "var(--danger-text)",
  info: "var(--info)",       infoBg: "var(--info-bg)",       infoText: "var(--info-text)",
};

export const FUENTE = "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// â”€â”€ Definicion en CSS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GlobalStyles inyecta esto. El bloque oscuro cuelga de .app-shell porque es
// donde vive el interruptor de tema.
//
// Los nombres Â«heredadosÂ» (--text-main, --c-tinta, --borderâ€¦) se quedan como
// alias: hay cientos de estilos en linea que los usan y renombrarlos ahora
// seria tocar todas las pantallas a la vez. Apuntan al token nuevo, asi que
// cambiar el sistema ya cambia tambien lo heredado.

export const tokensCss = `
  :root {
    --bg-app: #f6f7f9;
    --surface: #ffffff;
    --surface-card: #ffffff;
    --surface-hover: #fffdfb;
    --surface-subtle: #f8fafc;
    --text-main: #101828;
    --text-h1: #101828;
    --text-muted: #667085;
    --text-subtle: #94a3b8;
    --border: #eef0f3;
    --border-strong: #e2e8f0;
    --input-bg: #ffffff;
    --input-color: #101828;
    --input-border: #eaecf0;
    --input-placeholder: #94a3b8;
    --c-tinta: #1a1a2e;
    --c-suave: #475569;
    --c-apagado: #64748b;
    --c-tenue: #64748b;
    --c-relleno: #f8fafc;
    --c-relleno-fuerte: #eef0f3;
    --c-borde: #eef0f3;
    --c-borde-fuerte: #e2e8f0;
    --c-acento-suave: #fff3e8;
    --c-tag-bg: #fff3e8;
    --c-tag-text: #cc6600;
    --btn-ver-bg: #dbeafe;
    --btn-ver-text: #1e40af;
    --btn-ver-border: transparent;
    --btn-cancelar-bg: #f1f5f9;
    --btn-cancelar-text: #475569;
    --accent: #f47c20;
    --accent-hover: #e06a12;
    --accent-tint: rgba(244,124,32,0.12);
    --sombra-sm: 0 1px 2px rgba(0,0,0,0.05);
    --sombra-md: 0 4px 6px -1px rgba(0,0,0,0.08);
    --sombra-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
    --safe-top: env(safe-area-inset-top, 0px);
    --safe-right: env(safe-area-inset-right, 0px);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
    --safe-left: env(safe-area-inset-left, 0px);
    color-scheme: light;
  }

  .app-shell[data-theme="dark"] {
    --bg-app: #0f1115;
    --surface: #181a20;
    --surface-card: #181a20;
    --surface-hover: #20242e;
    --surface-subtle: #20232b;
    --text-main: #f0f2f5;
    --text-h1: #f0f2f5;
    --text-muted: #98a1b0;
    --text-subtle: #6b7280;
    --border: #2a2d36;
    --border-strong: #333846;
    --input-bg: #20232b;
    --input-color: #f0f2f5;
    --input-border: #2a2d36;
    --input-placeholder: #8a94a6;
    --c-tinta: #f0f2f5;
    --c-suave: #cbd5e1;
    --c-apagado: #98a1b0;
    --c-tenue: #98a1b0;
    --c-relleno: #20232b;
    --c-relleno-fuerte: #262b35;
    --c-borde: #2a2d36;
    --c-borde-fuerte: #333846;
    --c-acento-suave: rgba(244,124,32,.18);
    --c-tag-bg: rgba(244,124,32,.15);
    --c-tag-text: #fb923c;
    --btn-ver-bg: #1e3a8a;
    --btn-ver-text: #93c5fd;
    --btn-ver-border: #2563eb;
    --btn-cancelar-bg: #262b35;
    --btn-cancelar-text: #cbd5e1;
    --accent: #f47c20;
    --accent-hover: #fb923c;
    --accent-tint: rgba(244,124,32,0.2);
    color-scheme: dark;
  }
`;
