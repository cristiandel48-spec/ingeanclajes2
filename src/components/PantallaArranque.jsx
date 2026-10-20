import { useEffect, useState } from "react";
import logoIngeanclajes from "../assets/logo-ingeanclajes.jpeg";
import { signOut } from "../lib/backend";

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

// Si el arranque pasa de esto, algo se trabo (la red, la sesion): en vez de
// dejar la barra quieta para siempre se ofrece reintentar o volver a entrar.
const TOPE_ARRANQUE_MS = 20000;

const BOTON_ARRANQUE = {
  border: "none", borderRadius: 980, padding: "9px 18px", fontSize: 13.5, fontWeight: 600,
  cursor: "pointer", fontFamily: "inherit",
};

export default function PantallaArranque() {
  // Se toma una sola vez, al montarse, y no en cada render.
  const [transcurrido] = useState(tomarTranscurrido);
  const [tarde, setTarde] = useState(false);
  useEffect(() => programarReinicio, []);
  useEffect(() => {
    const t = setTimeout(() => setTarde(true), Math.max(0, TOPE_ARRANQUE_MS - transcurrido));
    return () => clearTimeout(t);
  }, [transcurrido]);

  const volverAEntrar = async () => {
    try { await signOut(); } catch { /* si ni eso responde, igual se recarga */ }
    window.location.reload();
  };
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
      {/* Debajo de la barra, sin mover el logotipo ni la barra de su sitio. */}
      {tarde && (
        <div
          role="alert"
          style={{
            position: "absolute", top: "calc(50% + 120px)", left: 16, right: 16,
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
            color: "rgba(255, 255, 255, 0.78)", fontSize: 14, textAlign: "center",
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          }}
        >
          <div>Esto está tardando más de lo normal.</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            <button type="button" onClick={() => window.location.reload()} style={{ ...BOTON_ARRANQUE, background: "#ffffff", color: "#000000" }}>
              Reintentar
            </button>
            <button type="button" onClick={volverAEntrar} style={{ ...BOTON_ARRANQUE, background: "rgba(255, 255, 255, 0.14)", color: "#ffffff" }}>
              Volver a iniciar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
