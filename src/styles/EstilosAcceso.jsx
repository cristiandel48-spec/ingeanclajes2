// Estilos para las pantallas que se ven ANTES de entrar (SupabaseGate).
//
// GlobalStyles se monta dentro de AppShell, y el armazon no existe todavia en
// el inicio de sesion: alli no habia tokens ni kit, y por eso esa pantalla
// acabo con sus propios campos y botones escritos a mano. Esto inyecta lo
// imprescindible -los tokens, el kit y el foco de teclado- sin arrastrar las
// reglas del armazon (alto de ventana, scroll bloqueado, impresion), que en
// una pagina suelta y centrada estorban.
//
// El tema lo decide aqui el SISTEMA OPERATIVO, no un interruptor: quien
// entra todavia no ha iniciado sesion, asi que no hay preferencia guardada
// que respetar. Si el Mac o el telefono estan en oscuro, la pantalla de
// acceso tambien, que es lo que uno espera de una aplicacion nativa.
//
// Los valores salen de VARS_OSCURO, los mismos que usa el armazon, para que
// no haya dos listas de colores oscuros que se vayan separando con el
// tiempo.

import { tokensCss, VARS_OSCURO } from "./designTokens";
import { componentesCss } from "./componentesCss";

export default function EstilosAcceso() {
  return (
    <style>{`
${tokensCss}
${componentesCss}

    @media (prefers-color-scheme: dark) {
      :root {
${VARS_OSCURO}
      }
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    /* Barra indeterminada de «Validando sesión» */
    @keyframes accesoProgreso {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(250%); }
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeInModal { from { opacity: 0; transform: scale(.98); } to { opacity: 1; transform: none; } }

    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    /* ── Lista agrupada, como la de Ajustes de iOS ──────────────────────
       Los campos van dentro de UN solo bloque redondeado, separados por una
       linea fina, en vez de ser dos cajas sueltas con su etiqueta encima.
       Es el patron que hace que una pantalla se lea como nativa. */
    .acceso-grupo {
      background: var(--surface);
      border: 1px solid var(--separator);
      border-radius: 14px;
      overflow: hidden;
    }
    .acceso-fila + .acceso-fila { border-top: 1px solid var(--separator); }
    .acceso-fila { position: relative; display: flex; align-items: center; }
    .acceso-fila > label {
      flex: 0 0 104px;
      padding: 0 0 0 16px;
      font-size: 15px;
      color: var(--text-secondary);
      user-select: none;
    }
    /* El campo no lleva marco propio: el marco es el del grupo. */
    .acceso-fila input {
      flex: 1 1 auto;
      min-width: 0;
      height: 52px;
      padding: 0 16px 0 0;
      border: none;
      background: transparent;
      color: var(--text-primary);
      font-family: inherit;
      font-size: 16px;
      outline: none;
    }
    .acceso-fila input::placeholder { color: var(--text-quaternary); }
    /* Al enfocar se tiñe la fila entera, no solo el campo: asi se ve cual
       de las dos esta activa sin dibujar un borde que rompa el grupo. */
    .acceso-fila:focus-within { background: var(--accent-tint); }
    .acceso-fila input:focus-visible { outline: none !important; }
    /* En el telefono la etiqueta cede ancho: con 104px fijos, al campo del
       correo le quedaban 230 y el texto se cortaba al escribir. */
    @media (max-width: 420px) {
      .acceso-fila > label { flex-basis: 88px; padding-left: 14px; font-size: 14px; }
      .acceso-fila input { padding-right: 14px; }
    }

    /* Enlace suelto, sin aspecto de boton. */
    .acceso-enlace {
      background: none; border: none; padding: 6px 8px;
      font-family: inherit; font-size: 14px; font-weight: 500;
      color: var(--accent); cursor: pointer; border-radius: 8px;
    }
    .acceso-enlace:hover:not(:disabled) { background: var(--accent-tint); }
    .acceso-enlace:disabled { opacity: .5; cursor: default; }

    *, *::before, *::after { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
    body { margin: 0; }
    @media (prefers-reduced-motion: reduce) {
      * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
    }
  `}</style>
  );
}
