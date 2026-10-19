import { useEffect, useState } from "react";
import logoIngeanclajes from "../assets/logo-ingeanclajes.jpeg";

// Pantalla de arranque, como la del Mac al encender: fondo negro, el logotipo
// en el centro y una barra delgada que se va llenando. Sin textos. Se usa
// mientras se valida la sesion, al pulsar «Entrar» y mientras carga el acceso.
//
// La barra no mide un avance real -no hay forma de saber cuanto falta-: crece
// rapido al principio y cada vez mas despacio, sin llegar al final, que es
// como se siente una barra de arranque. Si tarda, nunca se queda «llena» y
// quieta, que pareceria que se colgo.
const CSS = `
  @keyframes arranqueLlenado {
    0%   { transform: scaleX(0.02); }
    40%  { transform: scaleX(0.55); }
    100% { transform: scaleX(0.92); }
  }
  @keyframes arranqueAparece {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .arranque-relleno { animation: none !important; transform: scaleX(0.5) !important; }
  }
`;

// La pantalla se monta varias veces seguidas al entrar (validar la sesion,
// entrar, cargar el acceso). Para que la barra no vuelva a cero en cada una,
// la animacion arranca con un retraso negativo igual al tiempo que ya paso
// desde la primera vez: sigue desde donde iba.
// Si pasa un rato sin pantalla de arranque -ya se entro-, la proxima vez
// (cerrar sesion y volver a entrar) empieza de cero.
let inicioArranque = null;
let reinicio = null;

function tomarTranscurrido() {
  if (reinicio) { clearTimeout(reinicio); reinicio = null; }
  if (inicioArranque === null) inicioArranque = performance.now();
  return Math.round(performance.now() - inicioArranque);
}

function programarReinicio() {
  reinicio = setTimeout(() => { inicioArranque = null; }, 1500);
}

export default function PantallaArranque() {
  // Se toma una sola vez, al montarse, y no en cada render.
  const [transcurrido] = useState(tomarTranscurrido);
  useEffect(() => programarReinicio, []);
  return (
    <div
      role="progressbar"
      aria-label="Cargando Ingeanclajes"
      aria-busy="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 48,
        // Solo aparece con fundido la primera vez; al pasar de una a otra no.
        animation: transcurrido < 50 ? "arranqueAparece .4s ease both" : "none",
        zIndex: 10000,
      }}
    >
      <style>{CSS}</style>
      {/* El logotipo es un JPEG con fondo blanco: va en su icono redondeado,
          igual que en el acceso, para que no quede un recuadro sobre el negro. */}
      <div
        style={{
          width: 104,
          height: 104,
          borderRadius: 24,
          background: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <img src={logoIngeanclajes} alt="" style={{ width: 86, height: 86, objectFit: "contain" }} />
      </div>
      <div
        style={{
          width: 180,
          height: 4,
          borderRadius: 999,
          background: "rgba(255, 255, 255, 0.22)",
          overflow: "hidden",
        }}
      >
        <div
          className="arranque-relleno"
          style={{
            width: "100%",
            height: "100%",
            borderRadius: 999,
            background: "#ffffff",
            transformOrigin: "left center",
            animation: "arranqueLlenado 9s cubic-bezier(.2,.7,.3,1) forwards",
            animationDelay: `-${transcurrido}ms`,
          }}
        />
      </div>
    </div>
  );
}
