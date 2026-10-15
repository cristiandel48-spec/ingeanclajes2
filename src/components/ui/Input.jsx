import { useId } from "react";

// Campo del sistema: etiqueta, ayuda y error en un solo sitio.
//
// Lo que aporta frente al SI de antes: anillo de foco visible -el SI traia
// outline:none-, estado deshabilitado con aspecto propio, y el error atado al
// campo con aria-describedby para que un lector de pantalla lo anuncie.
//
// `como` permite "input" (por defecto), "textarea" o "select".

export default function Input({
  label,
  ayuda,
  error = "",
  obligatorio = false,
  como = "input",
  className = "",
  wrapStyle,
  id,
  children,
  ...props
}) {
  const auto = useId();
  const campoId = id || auto;
  const ayudaId = `${campoId}-ayuda`;
  const hayError = Boolean(error);
  const mensaje = error || ayuda;
  const Etiqueta = como;

  return (
    <div className="ui-field" style={wrapStyle}>
      {label && (
        <label className="ui-label" htmlFor={campoId}>
          {label}
          {obligatorio && <span className="ui-label__req" aria-hidden="true">*</span>}
        </label>
      )}
      <Etiqueta
        id={campoId}
        className={`ui-input ${className}`.trim()}
        aria-invalid={hayError || undefined}
        aria-describedby={mensaje ? ayudaId : undefined}
        aria-required={obligatorio || undefined}
        {...props}
      >
        {children}
      </Etiqueta>
      {mensaje && (
        <div id={ayudaId} className={`ui-help ${hayError ? "ui-help--error" : ""}`.trim()}>
          {mensaje}
        </div>
      )}
    </div>
  );
}
