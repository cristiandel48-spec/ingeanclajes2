import { useEffect, useState } from "react";
import Sheet from "./ui/Sheet";
import Button from "./ui/Button";
import logoIngeanclajes from "../assets/logo-ingeanclajes.jpeg";
import { suscribirDialogos, cerrarDialogo, mostrarGuardando, avisar } from "../lib/dialogos";

// Pinta los dialogos que piden confirmar() y avisar() (lib/dialogos.js).
// Se monta una sola vez, en main.jsx, para que sirva en cualquier pantalla.
//
// Tambien reemplaza window.alert(): los avisos que todavia lo usan salen en
// este mismo dialogo en vez de la ventana gris del navegador. Un aviso no
// devuelve nada, asi que cambiarlo no altera lo que hace el codigo.

const CSS = `
  @keyframes dialogoGuardando {
    0%   { transform: scaleX(0.05); }
    100% { transform: scaleX(1); }
  }
`;

function Guardando({ texto, fraccion = null }) {
  // Con avance conocido (hoja 2 de 5) la barra muestra cuanto va; sin el, se
  // llena sola como al guardar.
  const conAvance = typeof fraccion === "number";
  return (
    <div
      role="status"
      aria-live="polite"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "18px 8px 10px" }}
    >
      <style>{CSS}</style>
      <div style={{ width: 64, height: 64, borderRadius: 15, background: "#ffffff", border: "1px solid var(--separator)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <img src={logoIngeanclajes} alt="" style={{ width: 52, height: 52, objectFit: "contain" }} />
      </div>
      <div style={{ width: 160, height: 4, borderRadius: 999, background: "var(--fill)", overflow: "hidden" }}>
        <div style={{
          width: "100%", height: "100%", borderRadius: 999, background: "var(--text-primary)", transformOrigin: "left center",
          ...(conAvance
            ? { transform: `scaleX(${Math.max(0.05, Math.min(1, fraccion))})`, transition: "transform .3s ease" }
            : { animation: "dialogoGuardando 1s cubic-bezier(.3,.7,.3,1) forwards" }),
        }} />
      </div>
      <div style={{ fontSize: 13.5, color: "var(--text-secondary)" }}>{texto}</div>
    </div>
  );
}

export default function DialogosGlobales() {
  const [cola, setCola] = useState([]);

  useEffect(() => suscribirDialogos(setCola), []);

  useEffect(() => {
    const original = window.alert;
    window.alert = (mensaje) => { avisar(String(mensaje ?? "")); };
    return () => { window.alert = original; };
  }, []);

  // De uno en uno, en el orden en que se pidieron.
  const d = cola[0];
  if (!d) return null;

  if (d.guardando) {
    return (
      <Sheet abierta titulo={null} cerrarAlPulsarFondo={false}>
        <Guardando texto={d.textoGuardando} fraccion={d.fraccion} />
      </Sheet>
    );
  }

  const cancelar = () => cerrarDialogo(d.id, d.tipo === "confirmar" ? false : undefined);
  // Cerrar sin elegir (Escape, la X, tocar fuera) cuenta como cancelar, salvo
  // en las preguntas donde las dos opciones hacen algo: ahi devuelve
  // `alCerrar`, para que quien pregunta pueda no hacer nada.
  const cerrarSinElegir = () => (
    d.tipo === "confirmar" && d.alCerrar !== undefined ? cerrarDialogo(d.id, d.alCerrar) : cancelar()
  );
  const aceptar = () => {
    if (d.tipo === "confirmar" && d.conGuardando) {
      // Se responde ya, para que la accion arranque, y el dialogo se queda
      // mostrando el logotipo y la barra mientras se guarda.
      d.resolver(true);
      mostrarGuardando(d.id);
      return;
    }
    cerrarDialogo(d.id, d.tipo === "confirmar" ? true : undefined);
  };

  return (
    <Sheet
      key={d.id}
      abierta
      titulo={d.titulo}
      onCerrar={cerrarSinElegir}
      pie={
        d.tipo === "confirmar" ? (
          <>
            <Button variante="secondary" onClick={cancelar}>{d.textoCancelar}</Button>
            <Button variante={d.destructivo ? "destructive" : "primary"} onClick={aceptar}>{d.textoConfirmar}</Button>
          </>
        ) : (
          <Button variante="primary" onClick={aceptar}>{d.textoConfirmar}</Button>
        )
      }
    >
      {d.mensaje ? (
        <p style={{ margin: 0, fontSize: 14, lineHeight: "21px", color: "var(--text-secondary)", whiteSpace: "pre-line" }}>
          {d.mensaje}
        </p>
      ) : null}
    </Sheet>
  );
}
