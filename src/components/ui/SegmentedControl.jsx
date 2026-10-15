// Selector de vista o de estado, al estilo de iOS.
//
// Habia tres copias distintas de esto -Obras, Tareas con el equipo, Informes y
// Certificaciones-, cada una con su alto y su color. Esta es la unica.
//
// opciones: [{ id, label, cuenta }]. `cuenta` sale a la derecha de la etiqueta
// y sirve para los filtros con numero, que hoy estan duplicados como pastillas
// aparte en la barra de la agenda.

export default function SegmentedControl({
  opciones = [],
  valor,
  onChange,
  etiqueta = "Vista",
  className = "",
}) {
  if (!opciones.length) return null;

  return (
    <div className={`ui-seg ${className}`.trim()} role="tablist" aria-label={etiqueta}>
      {opciones.map((op) => {
        const activa = op.id === valor;
        return (
          <button
            key={op.id}
            type="button"
            role="tab"
            aria-selected={activa}
            className="ui-seg__op"
            onClick={() => onChange?.(op.id)}
          >
            {op.label}
            {op.cuenta != null && <span className="ui-seg__cuenta">{op.cuenta}</span>}
          </button>
        );
      })}
    </div>
  );
}
