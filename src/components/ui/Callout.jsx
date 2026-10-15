import Icono from "./Icono";

// Aviso en bloque dentro de una pantalla.
//
// Reemplaza a los paneles de aviso que estaban escritos para fondo oscuro y
// acabaron sobre fondo claro: texto #f87171, #4ade80 o #fbbf24 sobre un tinte
// del 15%, que da entre 1,7 y 2,8 de contraste. En obra, con sol, eso no se
// lee. Aqui el par fondo/texto sale de los tokens semanticos y funciona en
// los dos temas.

const ICONOS = { info: "info", exito: "check", aviso: "alerta", peligro: "alerta", neutro: "info" };

export default function Callout({
  tono = "info",
  titulo,
  icono,
  children,
  className = "",
  ...props
}) {
  return (
    <div
      className={`ui-callout ui-callout--${tono} ${className}`.trim()}
      role={tono === "peligro" ? "alert" : "status"}
      {...props}
    >
      <span className="ui-callout__icono">
        <Icono nombre={icono || ICONOS[tono] || "info"} size={18} />
      </span>
      <div style={{ minWidth: 0 }}>
        {titulo && <div className="ui-callout__titulo">{titulo}</div>}
        {children}
      </div>
    </div>
  );
}
