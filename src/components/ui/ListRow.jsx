// Fila de lista.
//
// Pensada para sustituir a las tablas hechas con rejilla cuando la pantalla es
// estrecha: el CSS global las aplasta a una sola columna y los encabezados
// quedan apilados sobre los datos. Una fila se lee igual de bien en un
// telefono que en el escritorio.
//
// `acciones` aparecen al pasar el cursor en escritorio y siempre en tactil,
// donde no hay cursor que pasar.

export function Lista({ className = "", children, ...props }) {
  return <div className={`ui-lista ${className}`.trim()} {...props}>{children}</div>;
}

export default function ListRow({
  titulo,
  meta,
  izquierda,
  derecha,
  acciones,
  activa = false,
  onClick,
  className = "",
  children,
  ...props
}) {
  const clicable = typeof onClick === "function";
  const clases = [
    "ui-row",
    clicable ? "ui-row--clicable" : "",
    activa ? "ui-row--activa" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div
      className={clases}
      onClick={onClick}
      role={clicable ? "button" : undefined}
      tabIndex={clicable ? 0 : undefined}
      onKeyDown={clicable ? (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); }
      } : undefined}
      {...props}
    >
      {izquierda}
      <div className="ui-row__main">
        {titulo && <div className="ui-row__title">{titulo}</div>}
        {meta && <div className="ui-row__meta">{meta}</div>}
        {children}
      </div>
      {derecha}
      {acciones && (
        // Las acciones no heredan el clic de la fila: pulsar "Eliminar" no
        // debe abrir tambien el registro.
        <div className="ui-row__acciones" onClick={(e) => e.stopPropagation()}>
          {acciones}
        </div>
      )}
    </div>
  );
}
