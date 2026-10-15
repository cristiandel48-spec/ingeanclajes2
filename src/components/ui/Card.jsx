// Tarjeta del sistema. Reemplaza al objeto CD, que iba con radio 16 y se
// reescribia a mano en cada pantalla.
//
// `interactivo` solo para una tarjeta que ABRE algo: le pone cursor, elevacion
// al pasar el cursor y, si se le da `onClick`, la hace alcanzable con el
// teclado. Una tarjeta que solo muestra datos no debe parecer un boton.

export default function Card({
  interactivo = false,
  plano = false,
  ajustado = false,
  onClick,
  className = "",
  children,
  ...props
}) {
  const clicable = interactivo && typeof onClick === "function";
  const clases = [
    "ui-card",
    plano ? "ui-card--plano" : "",
    ajustado ? "ui-card--ajustado" : "",
    interactivo ? "ui-card--interactivo" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div
      className={clases}
      onClick={onClick}
      // Una tarjeta clicable tiene que poder usarse sin raton. Antes eran
      // <div> con onClick: invisibles para el tabulador.
      role={clicable ? "button" : undefined}
      tabIndex={clicable ? 0 : undefined}
      onKeyDown={clicable ? (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); }
      } : undefined}
      {...props}
    >
      {children}
    </div>
  );
}
