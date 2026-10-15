import Icono from "./Icono";

// Boton del sistema.
//
// Sustituye a B(color) de styles/tokens.js, que aceptaba CUALQUIER color de
// fondo: 256 usos con 26 fondos distintos, y de ahi que la aplicacion tuviera
// seis botones principales a la vez. Aqui el color no es un parametro, es una
// consecuencia de para que sirve el boton:
//
//   primary     la accion principal de la pantalla. Solo una.
//   secondary   acciones normales
//   tertiary    acciones de poco peso, sin marco
//   destructive borrar, quitar, cancelar algo con consecuencias
//
// Tamanos 32 / 36 / 44. En el telefono todo sube a 44 solo, que es lo minimo
// para acertar con el dedo y con guantes en obra.

export default function Button({
  variante = "secondary",
  tam = "md",
  icono,
  iconoDerecha,
  cargando = false,
  bloque = false,
  soloIcono = false,
  children,
  className = "",
  disabled,
  type = "button",
  ...props
}) {
  const clases = [
    "ui-btn",
    `ui-btn--${variante}`,
    tam !== "md" ? `ui-btn--${tam}` : "",
    bloque ? "ui-btn--bloque" : "",
    soloIcono ? "ui-btn--icono" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <button type={type} className={clases} disabled={disabled || cargando} {...props}>
      {cargando ? (
        <span
          aria-hidden="true"
          style={{
            width: 14, height: 14, borderRadius: "50%",
            border: "2px solid currentColor", borderTopColor: "transparent",
            opacity: .7, animation: "spin .7s linear infinite",
          }}
        />
      ) : (
        icono && <Icono nombre={icono} size={tam === "lg" ? 18 : 16} />
      )}
      {!soloIcono && children}
      {iconoDerecha && !cargando && <Icono nombre={iconoDerecha} size={16} />}
    </button>
  );
}
