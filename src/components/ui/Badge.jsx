import StatusPill from "./StatusPill";

// Insignia de estado de las pantallas antiguas. Pintaba texto de color sobre
// un tinte del mismo color, leyendo de EC, y el mismo estado salia distinto
// aqui y en las pantallas que ya usan StatusPill. Ahora es esa misma
// pastilla: fondo neutro y un punto de color.
export default function Badge({ estado }) {
  return <StatusPill estado={estado} className="ui-badge" data-estado={estado} />;
}
