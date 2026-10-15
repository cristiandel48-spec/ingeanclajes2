import { tonoDeEstado } from "./estadoTono";

// Pastilla de estado: fondo neutro y un punto de color.
//
// Antes convivian tres sistemas de estado -EC/Badge, los mapas de color de
// cada pantalla y Tailwind suelto-, y el mismo estado cambiaba de color segun
// donde se mirara: «En Obra» era naranja en la lista e indigo en el detalle.
//
// Con fondo neutro y punto de color el estado se lee igual en todas partes, el
// contraste del texto esta garantizado -nunca es texto de color sobre un tinte
// del mismo color- y la pastilla deja de competir con el acento de la pagina.
//
// Que tono le toca a cada estado esta en estadoTono.js.

export default function StatusPill({ estado, tono, children, className = "", ...props }) {
  const texto = children ?? estado;
  const t = tono || tonoDeEstado(estado);
  return (
    <span className={`ui-pill ui-pill--${t} ${className}`.trim()} {...props}>
      <span className="ui-pill__dot" aria-hidden="true" />
      {texto}
    </span>
  );
}
