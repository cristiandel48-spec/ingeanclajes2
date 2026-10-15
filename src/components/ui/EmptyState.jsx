import Icono from "./Icono";

// Lo que se ve cuando no hay nada que mostrar.
//
// Habia ocho versiones de esto: unas con un emoji de 32px, otras con una linea
// de texto suelta, y en varias pantallas -la tabla de materiales, la vista de
// radar- no habia ninguna, asi que la pantalla se quedaba en blanco y parecia
// que algo habia fallado.
//
// Un estado vacio bien hecho dice tres cosas: que no hay nada, por que, y cual
// es el siguiente paso.

export default function EmptyState({
  icono = "carpetaVacia",
  titulo,
  texto,
  accion,
  className = "",
  ...props
}) {
  return (
    <div className={`ui-empty ${className}`.trim()} {...props}>
      <div className="ui-empty__icono">
        <Icono nombre={icono} size={24} />
      </div>
      {titulo && <div className="ui-empty__titulo">{titulo}</div>}
      {texto && <p className="ui-empty__texto">{texto}</p>}
      {accion && <div className="ui-empty__accion">{accion}</div>}
    </div>
  );
}
