// FUENTE UNICA DE TOKENS del sistema de diseno.
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

// -- Escala tipografica ------------------------------------------------------
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

// -- Espaciado, radios, alturas ----------------------------------------------
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

// -- Apilado -----------------------------------------------------------------
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

// -- Movimiento --------------------------------------------------------------
export const TRANSICION = {
  rapida: "150ms cubic-bezier(.2,.8,.2,1)",
  entrada: "250ms cubic-bezier(.2,.8,.2,1)",
};

// -- Color -------------------------------------------------------------------
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

// Monoespaciada para codigos, consecutivos y cifras que se comparan.
// Es la del sistema: SF Mono en un Mac, Consolas en Windows. Varios sitios
// pedian 'JetBrains Mono', que no se carga en ninguna parte, asi que caian
// en la monoespaciada por defecto del navegador -Courier- y desentonaban.
export const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace";

// -- Nombres heredados -------------------------------------------------------
// Hay cientos de estilos en linea que escriben --text-main, --c-tinta,
// --border... Renombrarlos ahora seria tocar todas las pantallas a la vez, asi
// que se quedan como alias de los tokens nuevos.
//
// OJO, esto es la causa de un error sutil: un alias declarado solo en :root se
// resuelve UNA vez, con los valores claros, y el valor ya resuelto se hereda
// hacia abajo. Redefinir --text-primary en el bloque oscuro no vuelve a
// calcular --text-main, que se quedaba oscuro sobre fondo oscuro. Por eso la
// lista se repite dentro de cada tema: ahi si se resuelve con sus valores.
const ALIAS = `
      --surface-card: var(--surface);
      --text-main: var(--text-primary);
      --text-h1: var(--text-primary);
      --text-muted: var(--text-tertiary);
      --text-subtle: var(--text-quaternary);
      --border: var(--separator);
      --input-bg: var(--surface);
      --input-color: var(--text-primary);
      --input-border: var(--separator);
      --input-placeholder: var(--text-quaternary);
      --c-tinta: var(--text-primary);
      --c-suave: var(--text-secondary);
      --c-apagado: var(--text-tertiary);
      --c-tenue: var(--text-tertiary);
      --c-relleno: var(--surface-subtle);
      --c-relleno-fuerte: var(--separator);
      --c-borde: var(--separator);
      --c-borde-fuerte: var(--border-strong);
      --c-acento-suave: var(--naranja-heredado-tint);
      --c-tag-bg: var(--naranja-heredado-tint);
      --c-tag-text: var(--naranja-heredado-text);
      --btn-ver-bg: var(--info-bg);
      --btn-ver-text: var(--info-text);
      --btn-cancelar-bg: var(--fill);
      --btn-cancelar-text: var(--text-secondary);
      /* Escrito mal en 25 sitios: se define para que no caiga al respaldo */
      --btn-cancelar-txt: var(--text-secondary);
      --btn-guardar-bg: var(--accent);
      --rail-text-active: var(--accent);
      --rail-hover-bg: var(--fill);

      /* Se invocaban sin existir, asi que nunca cambiaban de tema */
      --card-bg: var(--surface);
      --border-color: var(--border-strong);
      --bg-subtle: var(--surface-subtle);
      --green-700: var(--success-text);
`;

// -- Tema oscuro -------------------------------------------------------------
// Los valores del modo oscuro, sueltos, para poder colgarlos de mas de un
// selector sin copiarlos a mano.
//
// Hacen falta en dos sitios: el armazon, donde el tema lo decide el
// interruptor (data-theme), y el inicio de sesion, que vive FUERA del armazon
// y sigue al tema del sistema operativo. Escribirlos dos veces dejaria una de
// las dos pantallas descolgada en cuanto se tocara un color, que es justo el
// problema que la fase 1 vino a cerrar.
export const VARS_OSCURO = `
      --accent: #FF6B5E;
      --accent-hover: #FF8A7F;
      --accent-tint: rgba(255, 107, 94, 0.14);

      --text-primary: #F0F2F5;
      --text-secondary: #CBD2DC;
      --text-tertiary: #98A1B0;
      --text-quaternary: #6B7280;

      --separator: #2A2D36;
      --fill: #20232B;
      --bg-app: #0F1115;
      --surface: #181A20;
      --surface-subtle: #20232B;
      --surface-hover: #20242E;
      --border-strong: #333846;

      --success: #32D583; --success-bg: rgba(18, 183, 106, 0.14); --success-text: #6CE9A6;
      --warning: #FDB022; --warning-bg: rgba(247, 144, 9, 0.14);  --warning-text: #FEC84B;
      --danger:  #F97066; --danger-bg:  rgba(217, 45, 32, 0.14);  --danger-text:  #FDA29B;
      --info:    #53B1FD; --info-bg:    rgba(46, 144, 250, 0.14); --info-text:    #84CAFF;

      --sombra-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
      --sombra-md: 0 4px 12px -2px rgba(0, 0, 0, 0.5);
      --sombra-lg: 0 20px 40px -12px rgba(0, 0, 0, 0.7);

      /* El armazon es mas oscuro que las tarjetas, para que estas floten */
      --rail-bg: #101116;
      --rail-border: #24262E;
      --rail-divider: #24262E;
      --rail-text: #9AA2B1;
      --rail-text-hover: #FFFFFF;
      /* Antes el elemento activo perdia el acento en oscuro y quedaba blanco
         sobre gris, indistinguible del que solo tiene el cursor encima. */
      --rail-active-bg: rgba(255, 107, 94, 0.16);
      --rail-title: #6B7280;
      --rail-brand-text: #FFFFFF;

      --btn-ver-border: #2563EB;

      --naranja-heredado: #FB923C;
      --naranja-heredado-tint: rgba(244, 124, 32, 0.15);
      --naranja-heredado-text: #FB923C;
${ALIAS}
      color-scheme: dark;
`;

// -- Definicion en CSS -------------------------------------------------------
// GlobalStyles inyecta esto. El bloque oscuro cuelga de .app-shell porque es
// donde vive el interruptor de tema.
export const tokensCss = `
    :root {
      /* Acento: el rojo del logotipo, y solo el */
      --accent: #E0342A;
      --accent-hover: #C42B22;
      --accent-tint: rgba(224, 52, 42, 0.08);

      /* Texto */
      --text-primary: #101828;
      --text-secondary: #475467;
      --text-tertiary: #667085;
      --text-quaternary: #98A2B3;

      /* Superficies */
      --separator: #EAECF0;
      --fill: #F2F4F7;
      --bg-app: #F6F7F9;
      --surface: #FFFFFF;
      --surface-subtle: #F8FAFC;
      --surface-hover: #FFFDFB;
      --border-strong: #E2E8F0;

      /* Semanticos: solo para decir un estado, nunca para decorar */
      --success: #12B76A; --success-bg: #ECFDF3; --success-text: #027A48;
      --warning: #F79009; --warning-bg: #FFFAEB; --warning-text: #B54708;
      --danger:  #D92D20; --danger-bg:  #FEF3F2; --danger-text:  #B42318;
      --info:    #2E90FA; --info-bg:    #EFF8FF; --info-text:    #175CD3;

      /* Sombras */
      --sombra-sm: 0 1px 2px rgba(16, 24, 40, 0.05);
      --sombra-md: 0 4px 12px -2px rgba(16, 24, 40, 0.08);
      --sombra-lg: 0 20px 40px -12px rgba(16, 24, 40, 0.25);

      /* Apilado */
      --capa-barra: 40;
      --capa-navegacion: 100;
      --capa-menu: 1000;
      --capa-hoja: 2000;
      --capa-aviso: 3000;
      --capa-visor: 4000;

      /* Movimiento */
      --transicion-rapida: 150ms cubic-bezier(.2, .8, .2, 1);
      --transicion-entrada: 250ms cubic-bezier(.2, .8, .2, 1);

      /* Armazon: menu lateral y barra superior */
      --rail-bg: #FFFFFF;
      --rail-border: #EAECF0;
      --rail-divider: #EAECF0;
      --rail-text: #475467;
      --rail-text-hover: #101828;
      --rail-active-bg: rgba(224, 52, 42, 0.09);
      --rail-title: #98A2B3;
      --rail-brand-text: #101828;

      --btn-ver-border: transparent;

      /* Naranja heredado. NO usar en codigo nuevo: es el acento viejo y se
         retira cuando los modulos pasen a --accent (fase 3 del plan). Existe
         para que ese cambio sea una linea y no una caceria por 43 archivos. */
      --naranja-heredado: #f47c20;
      --naranja-heredado-tint: #fff3e8;
      --naranja-heredado-text: #cc6600;
${ALIAS}
      /* Area segura del telefono */
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-right: env(safe-area-inset-right, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
      --safe-left: env(safe-area-inset-left, 0px);
      color-scheme: light;
    }

    .app-shell[data-theme="dark"] {
${VARS_OSCURO}
    }
`;
