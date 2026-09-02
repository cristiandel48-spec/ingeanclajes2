import { useState } from "react";
import LBL from "./LBL";
import { SI } from "../../styles/tokens";

// Campo de texto que se corrige solo al salir de el.
//
// Mientras la persona escribe no se toca nada: reescribir tecla a tecla mueve
// el cursor y estorba. Al salir del campo (onBlur) se aplica el arreglo -poner
// mayuscula inicial, quitar espacios de sobra, bajar el correo a minuscula- y,
// si el dato quedo raro, se muestra un aviso debajo sin bloquear el guardado.
//
// `normalizar` y `revisar` vienen de lib/normalizarEntrada.

export default function CampoTexto({
  label,
  valor,
  onChange,
  normalizar,
  revisar,
  ayuda,
  obligatorio = false,
  error = "",
  style,
  // Para colocar el campo en la rejilla del formulario (gridColumn, etc.):
  // va al contenedor, no al input.
  wrapStyle,
  ...props
}) {
  const [tocado, setTocado] = useState(false);
  const aviso = tocado && revisar ? revisar(valor) : "";
  const faltaObligatorio = (tocado || Boolean(error)) && obligatorio && !String(valor ?? "").trim();
  const mensaje = error || (faltaObligatorio ? "Este campo es obligatorio" : aviso);
  const esErrorRojo = Boolean(error || faltaObligatorio);

  const alSalir = () => {
    setTocado(true);
    if (!normalizar) return;
    const limpio = normalizar(valor);
    if (limpio !== valor) onChange(limpio);
  };

  return (
    <div style={wrapStyle}>
      {label && (
        <LBL>
          {label}
          {obligatorio && <span style={{ color: "#dc2626", marginLeft: 4, fontWeight: 700 }} title="Obligatorio">*</span>}
        </LBL>
      )}
      {/* El corrector del navegador va encendido y en español: subraya en rojo
          lo que no reconoce y ofrece la palabra buena con clic derecho. Los
          campos que no lo quieren -cédulas, cuentas, correos- lo apagan con
          spellCheck={false}, que llega por `props` y pisa esto. */}
      <input
        spellCheck
        lang="es"
        value={valor ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onBlur={alSalir}
        style={{
          ...SI,
          ...(mensaje ? { borderColor: esErrorRojo ? "#dc2626" : "#f0a24a" } : null),
          ...style,
        }}
        {...props}
      />
      {mensaje ? (
        <div style={{ fontSize: 10.5, color: esErrorRojo ? "#dc2626" : "#b54708", marginTop: 3, lineHeight: 1.4, fontWeight: esErrorRojo ? 600 : 400 }}>
          {mensaje}
        </div>
      ) : ayuda ? (
        <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 3, lineHeight: 1.4 }}>{ayuda}</div>
      ) : null}
    </div>
  );
}
