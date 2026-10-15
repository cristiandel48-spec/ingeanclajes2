// Estilos para las pantallas que se ven ANTES de entrar (SupabaseGate).
//
// GlobalStyles se monta dentro de AppShell, y el armazon no existe todavia en
// el inicio de sesion: alli no habia tokens ni kit, y por eso esa pantalla
// acabo con sus propios campos y botones escritos a mano. Esto inyecta lo
// imprescindible -los tokens, el kit y el foco de teclado- sin arrastrar las
// reglas del armazon (alto de ventana, scroll bloqueado, impresion), que en
// una pagina suelta y centrada estorban.
//
// La pantalla de acceso siempre va en claro: el interruptor de tema vive en
// el armazon, y los valores oscuros cuelgan de el.

import { tokensCss } from "./designTokens";
import { componentesCss } from "./componentesCss";

export default function EstilosAcceso() {
  return (
    <style>{`
${tokensCss}
${componentesCss}

    @keyframes spin { to { transform: rotate(360deg); } }
    /* Barra indeterminada de «Validando sesión» */
    @keyframes accesoProgreso {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(250%); }
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeInModal { from { opacity: 0; transform: scale(.98); } to { opacity: 1; transform: none; } }

    :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    *, *::before, *::after { box-sizing: border-box; }
    html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
    body { margin: 0; }
    @media (prefers-reduced-motion: reduce) {
      * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
    }
  `}</style>
  );
}
