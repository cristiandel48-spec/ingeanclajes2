import { useEffect, useRef, useState } from "react";

// Recuadro para firmar con el dedo, el lapiz o el mouse.
//
// Se dibuja con eventos de puntero, que cubren los tres casos, y con
// `touch-action: none` para que en el celular el trazo no mueva la pagina.
// El lienzo se dimensiona a la densidad de la pantalla: si no, en un celular
// la firma sale borrosa en la constancia.
export default function RecuadroFirma({ onCambio, alto = 170 }) {
  const lienzoRef = useRef(null);
  const trazando = useRef(false);
  const ultimo = useRef(null);
  const [vacio, setVacio] = useState(true);

  useEffect(() => {
    const lienzo = lienzoRef.current;
    const ajustar = () => {
      const rect = lienzo.getBoundingClientRect();
      const densidad = Math.max(1, window.devicePixelRatio || 1);
      lienzo.width = Math.round(rect.width * densidad);
      lienzo.height = Math.round(rect.height * densidad);
      const ctx = lienzo.getContext("2d");
      ctx.scale(densidad, densidad);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = "#1d1d1f";
    };
    ajustar();
    // Girar el celular cambia el ancho: se reinicia el recuadro en vez de
    // dejar una firma deformada.
    const alGirar = () => { ajustar(); setVacio(true); onCambio?.(""); };
    window.addEventListener("orientationchange", alGirar);
    return () => window.removeEventListener("orientationchange", alGirar);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const punto = (e) => {
    const rect = lienzoRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const empezar = (e) => {
    e.preventDefault();
    lienzoRef.current.setPointerCapture?.(e.pointerId);
    trazando.current = true;
    ultimo.current = punto(e);
    const ctx = lienzoRef.current.getContext("2d");
    ctx.beginPath();
    ctx.arc(ultimo.current.x, ultimo.current.y, 1.1, 0, Math.PI * 2);
    ctx.fillStyle = "#1d1d1f";
    ctx.fill();
  };

  const mover = (e) => {
    if (!trazando.current) return;
    e.preventDefault();
    const p = punto(e);
    const ctx = lienzoRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(ultimo.current.x, ultimo.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ultimo.current = p;
  };

  const terminar = () => {
    if (!trazando.current) return;
    trazando.current = false;
    setVacio(false);
    onCambio?.(lienzoRef.current.toDataURL("image/png"));
  };

  const borrar = () => {
    const lienzo = lienzoRef.current;
    lienzo.getContext("2d").clearRect(0, 0, lienzo.width, lienzo.height);
    setVacio(true);
    onCambio?.("");
  };

  return (
    <div>
      <div style={{ position: "relative", border: "1px solid #d2d2d7", borderRadius: 10, background: "#ffffff" }}>
        <canvas
          ref={lienzoRef}
          aria-label="Recuadro para firmar"
          style={{ display: "block", width: "100%", height: alto, touchAction: "none", cursor: "crosshair", borderRadius: 10 }}
          onPointerDown={empezar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
          onPointerLeave={terminar}
        />
        <div style={{ position: "absolute", left: 16, right: 16, bottom: 34, borderBottom: "1px dashed #d2d2d7", pointerEvents: "none" }} />
        {vacio && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#86868b", fontSize: 13, pointerEvents: "none" }}>
            Firme aquí con el dedo o el mouse
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", marginTop: 6 }}>
        <button type="button" onClick={borrar} disabled={vacio}
          style={{ background: "none", border: 0, color: vacio ? "#c7c7cc" : "#1d1d1f", fontSize: 13, fontWeight: 600, cursor: vacio ? "default" : "pointer", fontFamily: "inherit" }}>
          Borrar firma
        </button>
      </div>
    </div>
  );
}
