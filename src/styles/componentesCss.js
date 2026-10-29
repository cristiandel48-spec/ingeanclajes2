// Hoja de estilos del kit de componentes (fase 2 del plan de revision visual).
//
// Va en clases y no en estilos en linea a proposito: el hover, el foco, el
// estado deshabilitado y las animaciones NO se pueden escribir en un style de
// React. Por eso la aplicacion acabo con botones que no reaccionan al cursor y
// sin ninguna senal de foco. El patron sale de la pantalla «Mis tareas», que
// ya lo hacia asi y es la que mejor se comporta.
//
// Todo el color sale de designTokens.js. Aqui no se escribe ni un hex.

export const componentesCss = `
    /* ── Boton ───────────────────────────────────────────────────────── */
    .ui-btn {
      --ui-btn-alto: 36px;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      height: var(--ui-btn-alto); padding: 0 16px;
      border: 1px solid transparent; border-radius: 10px;
      font-family: inherit; font-size: 13px; font-weight: 600; line-height: 1;
      white-space: nowrap; cursor: pointer;
      transition: background var(--transicion-rapida), border-color var(--transicion-rapida),
                  color var(--transicion-rapida), transform var(--transicion-rapida);
    }
    .ui-btn:active:not(:disabled) { transform: scale(.975); }
    .ui-btn:disabled { opacity: .45; cursor: not-allowed; }
    .ui-btn--sm { --ui-btn-alto: 32px; padding: 0 12px; font-size: 12.5px; }
    .ui-btn--lg { --ui-btn-alto: 44px; padding: 0 20px; font-size: 14px; }
    .ui-btn--bloque { width: 100%; }
    .ui-btn--icono { padding: 0; width: var(--ui-btn-alto); }

    /* Tres tipos de boton en todo el programa, en pildora, sin marco ni
       sombra y en grises, al estilo Apple:
         principal  -> gris un punto mas oscuro y negrita (una por pantalla)
         secundario -> gris claro
         borrar     -> gris claro con la letra roja
       Antes la principal era negra; ahora va en gris como en Soporte. */
    .ui-btn--primary { background: var(--boton-principal); color: var(--text-primary);
      border-radius: 980px; font-weight: 600; }
    .ui-btn--primary:hover:not(:disabled) { background: var(--boton-principal-hover); }

    .ui-btn--secondary { background: var(--fill); color: var(--text-primary);
      border-color: transparent; border-radius: 980px; font-weight: 500; }
    .ui-btn--secondary:hover:not(:disabled) { background: var(--separator); }

    .ui-btn--tertiary { background: transparent; color: var(--accent); }
    .ui-btn--tertiary:hover:not(:disabled) { background: var(--accent-tint); }

    .ui-btn--destructive { background: var(--fill); color: var(--danger-text);
      border-color: transparent; border-radius: 980px; font-weight: 500; }
    .ui-btn--destructive:hover:not(:disabled) { background: var(--separator); }

    /* Barra al estilo de la de apple.com: las acciones son solo texto, sin
       caja ni emoji, y la principal es una pildora oscura. */
    .ui-btn--texto { background: transparent; color: var(--text-secondary);
      font-weight: 400; padding: 0 10px; border-radius: 980px; }
    .ui-btn--texto:hover:not(:disabled) { color: var(--text-primary); background: var(--fill); }
    .ui-btn--texto[aria-pressed="true"] { color: var(--text-primary); font-weight: 600; background: var(--fill); }

    /* «oscuro» era la principal de las barras: ahora es la misma principal gris. */
    .ui-btn--oscuro { background: var(--boton-principal); color: var(--text-primary);
      border-radius: 980px; padding: 0 18px; font-weight: 600; }
    .ui-btn--oscuro:hover:not(:disabled) { background: var(--boton-principal-hover); }

    /* Entrada de cada modulo, como una ventana que vuelve del Dock en el Mac:
       crece desde abajo, se enfoca y aparece, despacio y sin rebote.
       Va con «backwards» y no «both» a proposito: al terminar no deja ningun
       transform ni filter puesto, que convertirian al envoltorio en el
       contenedor de los position:fixed y descolocarian modales y avisos. */
    @keyframes entrar-modulo {
      0%   { opacity: 0; transform: translateY(60px) scale(.88); filter: blur(10px); }
      70%  { opacity: 1; filter: blur(0); }
      100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
    }
    .transicion-modulo {
      animation: entrar-modulo .9s cubic-bezier(.22, .61, .36, 1) backwards;
      transform-origin: 50% 100%;
    }
    @media (prefers-reduced-motion: reduce) {
      .transicion-modulo { animation: none; }
    }

    /* ── Botones antiguos con estilo en linea ─────────────────────────────
       Cientos de botones traen su color, marco y sombra escritos a mano en
       cada pantalla. En vez de reescribirlos uno por uno, dentro de los
       modulos se les quita el marco y la sombra y quedan en pildora, que es
       el lenguaje de la barra de Cotizaciones. Va con !important porque es
       la unica forma de ganarle a un style={...}. Los del kit (.ui-btn) y
       los segmentos ya vienen bien y no se tocan. */
    .transicion-modulo button:not([class*="ui-"]),
    .topbar-acciones button:not([class*="ui-"]) {
      border-color: transparent !important;
      box-shadow: none !important;
      border-radius: 980px !important;
    }
    /* Los botones pintados a mano con un color de «accion principal» pasan a
       la principal gris. Se reconocen por su color, que el navegador guarda
       como rgb(): el ambar de «Guardar Cotizacion» (#B54708, tambien en el
       borde), el naranja de «Nueva obra» (#f47c20), los rojos (#E0342A y
       #cc0000 de la vista previa), el verde de «Ir a la obra» (#16a34a) y el
       negro que salia antes (#1d1d1f, #101828). */
    .transicion-modulo button[style*="181, 71, 8"],
    .topbar-acciones button[style*="181, 71, 8"],
    .transicion-modulo button[style*="background: rgb(244, 124, 32)"],
    .topbar-acciones button[style*="background: rgb(244, 124, 32)"],
    .transicion-modulo button[style*="background: rgb(224, 52, 42)"],
    .topbar-acciones button[style*="background: rgb(224, 52, 42)"],
    .transicion-modulo button[style*="background: rgb(204, 0, 0)"],
    .topbar-acciones button[style*="background: rgb(204, 0, 0)"],
    .transicion-modulo button[style*="background: rgb(22, 163, 74)"],
    .topbar-acciones button[style*="background: rgb(22, 163, 74)"],
    .transicion-modulo button[style*="background: rgb(29, 29, 31)"],
    .transicion-modulo button[style*="background: rgb(16, 24, 40)"],
    .transicion-modulo button[style*="background: rgb(15, 23, 42)"],
    /* El activo de los selectores «Ajustar / 100% Lectura» de la vista previa */
    .transicion-modulo button[style*="background: var(--btn-guardar-bg"] {
      background: var(--boton-principal) !important;
      color: var(--text-primary) !important;
      font-weight: 600 !important;
    }

    /* En el telefono y en obra todo lo que se toca mide 44 */
    @media (max-width: 768px) {
      .ui-btn { --ui-btn-alto: 44px; }
      .ui-btn--sm { --ui-btn-alto: 40px; }
    }

    /* ── Campo ───────────────────────────────────────────────────────── */
    .ui-field { display: block; min-width: 0; }
    .ui-label { display: block; font-size: 12px; line-height: 16px; font-weight: 500;
      color: var(--text-secondary); margin-bottom: 6px; }
    .ui-label__req { color: var(--danger); margin-left: 2px; }
    .ui-input {
      width: 100%; box-sizing: border-box; height: 36px; padding: 0 12px;
      background: var(--fill); color: var(--text-primary);
      border: 1px solid transparent; border-radius: 12px;
      font-family: inherit; font-size: 14px; line-height: 20px;
      transition: border-color var(--transicion-rapida), box-shadow var(--transicion-rapida),
                  background var(--transicion-rapida);
    }
    textarea.ui-input { height: auto; min-height: 84px; padding: 9px 12px; resize: vertical; }
    select.ui-input { padding-right: 32px; }
    .ui-input::placeholder { color: var(--text-quaternary); }
    .ui-input:hover:not(:disabled) { background: var(--separator); }
    .ui-input:focus {
      outline: none; border-color: var(--text-tertiary); background: var(--surface);
      box-shadow: 0 0 0 3px var(--fill);
    }
    .ui-input:disabled { background: var(--fill); color: var(--text-tertiary); cursor: not-allowed; }
    .ui-input[aria-invalid="true"] { border-color: var(--danger); }
    .ui-input[aria-invalid="true"]:focus { box-shadow: 0 0 0 3px var(--danger-bg); }
    /* Campo tactil, a juego con el boton lg. Lo usa el inicio de sesion. */
    .ui-input--lg { height: 44px; }
    .ui-help { font-size: 12px; line-height: 16px; color: var(--text-tertiary); margin-top: 5px; }
    .ui-help--error { color: var(--danger-text); }
    /* 16px evita que Safari en iPhone haga zoom al enfocar */
    @media (max-width: 768px) {
      .ui-input { height: 44px; font-size: 16px; }
      textarea.ui-input { height: auto; }
    }

    /* ── Control segmentado ──────────────────────────────────────────── */
    .ui-seg { display: inline-flex; padding: 2px; gap: 2px; background: var(--fill);
      border-radius: 10px; max-width: 100%; overflow-x: auto; scrollbar-width: none; }
    .ui-seg::-webkit-scrollbar { display: none; }
    .ui-seg__op {
      flex: 0 0 auto; border: none; background: transparent; cursor: pointer;
      padding: 6px 14px; border-radius: 8px;
      font-family: inherit; font-size: 13px; font-weight: 600; white-space: nowrap;
      color: var(--text-tertiary);
      transition: background var(--transicion-rapida), color var(--transicion-rapida);
    }
    .ui-seg__op:hover:not([aria-selected="true"]) { color: var(--text-primary); }
    .ui-seg__op[aria-selected="true"] { background: var(--surface); color: var(--text-primary);
      box-shadow: var(--sombra-sm); }
    .ui-seg__cuenta { margin-left: 6px; font-variant-numeric: tabular-nums; opacity: .65; }
    @media (max-width: 768px) { .ui-seg__op { padding: 10px 14px; } }

    /* ── Tarjeta ─────────────────────────────────────────────────────── */
    /* Sin marco ni sombra, como los bloques de apple.com: el blanco sobre el
       gris de la pagina ya separa. */
    .ui-card { background: var(--surface); border: 1px solid transparent;
      border-radius: 22px; padding: 22px; box-shadow: none; box-sizing: border-box; }
    .ui-card--plano { box-shadow: none; }
    .ui-card--ajustado { padding: 14px 16px; }
    .ui-card--interactivo { cursor: pointer;
      transition: box-shadow var(--transicion-rapida), transform var(--transicion-rapida),
                  border-color var(--transicion-rapida); }
    .ui-card--interactivo:hover { box-shadow: var(--sombra-md); transform: translateY(-1px);
      border-color: var(--border-strong); }
    @media (max-width: 768px) { .ui-card { padding: 16px 14px; } }

    /* ── Fila de lista ───────────────────────────────────────────────── */
    .ui-row { position: relative; display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; background: transparent;
      transition: background var(--transicion-rapida); }
    .ui-row + .ui-row::before { content: ""; position: absolute; top: 0; left: 16px; right: 16px;
      height: 1px; background: var(--separator); }
    .ui-row--clicable { cursor: pointer; }
    .ui-row--clicable:hover { background: var(--fill); }
    .ui-row--clicable:hover::before, .ui-row--clicable:hover + .ui-row::before { opacity: 0; }
    .ui-row--activa { background: var(--accent-tint); }
    .ui-row__main { flex: 1; min-width: 0; }
    .ui-row__title { font-size: 15px; line-height: 20px; font-weight: 600;
      color: var(--text-primary); overflow-wrap: anywhere; }
    .ui-row__meta { font-size: 13px; line-height: 18px; color: var(--text-secondary);
      margin-top: 2px; overflow-wrap: anywhere; }
    .ui-row__acciones { display: flex; align-items: center; gap: 4px; flex-shrink: 0;
      opacity: 0; transition: opacity var(--transicion-rapida); }
    .ui-row:hover .ui-row__acciones, .ui-row:focus-within .ui-row__acciones { opacity: 1; }
    /* Sin cursor no hay hover: en tactil las acciones se ven siempre */
    @media (hover: none) { .ui-row__acciones { opacity: 1; } }
    .ui-lista { display: flex; flex-direction: column; }

    /* ── Pastilla de estado ──────────────────────────────────────────── */
    .ui-pill { display: inline-flex; align-items: center; gap: 6px;
      background: var(--fill); color: var(--text-secondary);
      border-radius: 999px; padding: 3px 10px;
      font-size: 12px; line-height: 16px; font-weight: 500; white-space: nowrap; }
    .ui-pill__dot { width: 6px; height: 6px; border-radius: 50%; flex: none;
      background: var(--text-quaternary); }
    .ui-pill--exito   .ui-pill__dot { background: var(--success); }
    .ui-pill--aviso   .ui-pill__dot { background: var(--warning); }
    .ui-pill--peligro .ui-pill__dot { background: var(--danger); }
    .ui-pill--info    .ui-pill__dot { background: var(--info); }
    .ui-pill--acento  .ui-pill__dot { background: var(--accent); }

    /* ── Estado vacio ────────────────────────────────────────────────── */
    .ui-empty { display: flex; flex-direction: column; align-items: center; text-align: center;
      padding: 44px 20px 36px; }
    .ui-empty__icono { width: 56px; height: 56px; border-radius: 16px; background: var(--fill);
      color: var(--text-tertiary); display: flex; align-items: center; justify-content: center;
      margin-bottom: 14px; }
    .ui-empty__titulo { font-size: 15px; line-height: 20px; font-weight: 600; color: var(--text-primary); }
    .ui-empty__texto { font-size: 13px; line-height: 18px; color: var(--text-tertiary);
      margin: 4px 0 0; max-width: 46ch; }
    .ui-empty__accion { margin-top: 16px; }

    /* ── Aviso flotante ──────────────────────────────────────────────── */
    .ui-toaster { position: fixed; left: 50%; transform: translateX(-50%);
      bottom: calc(24px + var(--safe-bottom)); z-index: var(--capa-aviso);
      display: flex; flex-direction: column-reverse; align-items: center; gap: 8px;
      width: max-content; max-width: min(92vw, 520px); pointer-events: none; }
    .ui-toast { pointer-events: auto; display: flex; align-items: center; gap: 12px;
      padding: 10px 12px 10px 16px; border-radius: 999px;
      background: var(--surface); color: var(--text-primary);
      border: 1px solid var(--separator); box-shadow: var(--sombra-lg);
      font-size: 13px; line-height: 18px; font-weight: 500;
      animation: uiToastEntra var(--transicion-entrada); max-width: 100%; }
    .ui-toast__texto { min-width: 0; overflow-wrap: anywhere; }
    /* Icono del menu dentro de su cuadro de color: mas chico y de trazo mas
       grueso, para que se lea en blanco sobre el color. */
    .rail-icono svg { width: 17px; height: 17px; stroke-width: 2.1; }
    /* Atajos del resumen del dia en el Dashboard: cuadro de 24, icono de 14. */
    .dash-atajo .rail-icono svg { width: 14px; height: 14px; }
    .dash-atajo { transition: background .12s ease, border-color .12s ease; }
    .dash-atajo:hover { background: var(--surface-subtle); border-color: var(--text-quaternary); }
    /* En el centro: lo que frena el trabajo y hay que leer. Varias lineas,
       asi que deja la forma de pastilla por una tarjeta. */
    .ui-toaster--centro { bottom: auto; top: 50%; transform: translate(-50%, -50%);
      flex-direction: column; }
    .ui-toaster--centro .ui-toast { border-radius: 16px; padding: 16px 20px;
      font-size: 14px; line-height: 20px; align-items: flex-start; }
    .ui-toaster--centro .ui-toast__dot { margin-top: 6px; }
    .ui-toaster--centro .ui-toast--error { border-color: var(--danger); }
    .ui-toast__dot { width: 8px; height: 8px; border-radius: 50%; flex: none;
      background: var(--text-quaternary); }
    .ui-toast--exito .ui-toast__dot { background: var(--success); }
    .ui-toast--error .ui-toast__dot { background: var(--danger); }
    .ui-toast__accion { border: none; background: var(--fill); color: var(--accent);
      font-family: inherit; font-size: 12.5px; font-weight: 600;
      border-radius: 999px; padding: 6px 12px; cursor: pointer; flex: none;
      transition: background var(--transicion-rapida); }
    .ui-toast__accion:hover { background: var(--accent-tint); }
    @keyframes uiToastEntra { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

    /* ── Hoja / dialogo ──────────────────────────────────────────────── */
    .ui-overlay { position: fixed; inset: 0; z-index: var(--capa-hoja);
      background: rgba(16, 24, 40, .45); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; padding: 24px;
      animation: fadeIn var(--transicion-rapida); }
    .ui-sheet { display: flex; flex-direction: column; width: 100%; max-width: 560px;
      max-height: min(85vh, 760px);
      background: var(--surface); color: var(--text-primary);
      border: 1px solid var(--separator); border-radius: 20px; box-shadow: var(--sombra-lg);
      animation: fadeInModal var(--transicion-entrada); overflow: hidden; }
    .ui-sheet--ancha { max-width: 860px; }
    .ui-sheet__head { display: flex; align-items: flex-start; gap: 12px;
      padding: 20px 20px 14px; border-bottom: 1px solid var(--separator); }
    .ui-sheet__titulo { font-size: 18px; line-height: 24px; font-weight: 600;
      letter-spacing: -.01em; margin: 0; }
    .ui-sheet__sub { font-size: 13px; line-height: 18px; color: var(--text-tertiary); margin: 3px 0 0; }
    .ui-sheet__body { padding: 20px; overflow-y: auto; flex: 1; }
    .ui-sheet__pie { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap;
      padding: 14px 20px; border-top: 1px solid var(--separator); background: var(--surface); }
    /* En el telefono sube desde abajo, como en iOS */
    @media (max-width: 640px) {
      .ui-overlay { padding: 0; align-items: flex-end; }
      .ui-sheet { max-width: 100%; max-height: 92vh; border-radius: 20px 20px 0 0;
        border-bottom: none; animation: uiSheetSube var(--transicion-entrada); }
      .ui-sheet__pie { padding-bottom: calc(14px + var(--safe-bottom)); }
    }
    @keyframes uiSheetSube { from { transform: translateY(100%); } to { transform: none; } }

    /* ── Cabecera de pantalla ────────────────────────────────────────── */
    .ui-page-header { display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; padding: 24px 0 14px; margin-bottom: 20px;
      border-bottom: 1px solid var(--separator); }
    .ui-page-header--sin-linea { border-bottom: none; margin-bottom: 12px; }
    .ui-page-header__eyebrow { font-size: 11px; line-height: 14px; font-weight: 600;
      letter-spacing: .04em; text-transform: uppercase; color: var(--text-tertiary); }
    .ui-page-header__titulo { font-size: 28px; line-height: 34px; font-weight: 700;
      letter-spacing: -.022em; margin: 2px 0 0; color: var(--text-primary); }
    .ui-page-header__sub { font-size: 14px; line-height: 20px; color: var(--text-secondary);
      margin: 6px 0 0; max-width: 62ch; }
    .ui-page-header__acciones { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    @media (max-width: 768px) {
      .ui-page-header { padding-top: 16px; }
      .ui-page-header__titulo { font-size: 22px; line-height: 28px; letter-spacing: -.018em; }
    }

    /* ── Barra de herramientas ───────────────────────────────────────── */
    .ui-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
      margin-bottom: 16px; }
    .ui-toolbar__espacio { flex: 1 1 auto; min-width: 0; }
    .ui-toolbar__buscador { position: relative; flex: 1 1 220px; max-width: 320px; min-width: 0; }
    .ui-toolbar__buscador .ui-input { padding-left: 34px; }
    .ui-toolbar__lupa { position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
      color: var(--text-quaternary); pointer-events: none; display: flex; }

    /* ── Aviso en bloque ─────────────────────────────────────────────── */
    .ui-callout { display: flex; gap: 12px; align-items: flex-start;
      padding: 12px 14px; border-radius: 14px;
      background: var(--fill); border: 1px solid var(--separator);
      font-size: 13px; line-height: 18px; color: var(--text-secondary); }
    .ui-callout__icono { flex: none; display: flex; margin-top: 1px; color: var(--text-tertiary); }
    .ui-callout__titulo { font-weight: 600; color: var(--text-primary); margin-bottom: 2px; }
    .ui-callout--info    { background: var(--info-bg);    border-color: var(--info);    color: var(--info-text); }
    .ui-callout--exito   { background: var(--success-bg); border-color: var(--success); color: var(--success-text); }
    .ui-callout--aviso   { background: var(--warning-bg); border-color: var(--warning); color: var(--warning-text); }
    .ui-callout--peligro { background: var(--danger-bg);  border-color: var(--danger);  color: var(--danger-text); }
    .ui-callout--info .ui-callout__icono,
    .ui-callout--exito .ui-callout__icono,
    .ui-callout--aviso .ui-callout__icono,
    .ui-callout--peligro .ui-callout__icono { color: currentColor; }
    .ui-callout--info .ui-callout__titulo,
    .ui-callout--exito .ui-callout__titulo,
    .ui-callout--aviso .ui-callout__titulo,
    .ui-callout--peligro .ui-callout__titulo { color: currentColor; }
`;
