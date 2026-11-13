import Icono from "./Icono";

// Conmutador «tarjetas / lista» de los listados.
//
// Cotizaciones, Obras, Informes y Certificaciones tenian cada uno su copia
// escrita a mano, con marco, sombras propias y los simbolos ⊞ y ☰ como texto,
// que cada sistema dibuja distinto. Es el control segmentado del kit con dos
// iconos de trazo.
//
// `opciones` permite cambiar los ids si una pantalla los nombra distinto
// (por defecto «tarjetas» y «tabla», que es como los guardan las cuatro).

const OPCIONES = [
  { id: "tarjetas", icono: "cuadricula", titulo: "Ver como tarjetas" },
  { id: "tabla", icono: "lista", titulo: "Ver como lista" },
];

export default function ConmutadorVista({ valor, onChange, opciones = OPCIONES, style }) {
  return (
    <div className="ui-seg" role="tablist" aria-label="Vista" style={{ flexShrink: 0, ...style }}>
      {opciones.map((op) => (
        <button
          key={op.id}
          type="button"
          role="tab"
          aria-selected={valor === op.id}
          aria-label={op.titulo}
          title={op.titulo}
          className="ui-seg__op"
          onClick={() => onChange?.(op.id)}
          style={{ padding: "6px 10px", display: "inline-flex", alignItems: "center" }}
        >
          <Icono nombre={op.icono} size={16} />
        </button>
      ))}
    </div>
  );
}
