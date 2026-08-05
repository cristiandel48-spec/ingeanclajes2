import { N, PAL_TEXTO } from "../../styles/tokens";

// Iniciales de una persona. En gris sobre fondo neutro, no en un color por
// cabeza: rotando ocho colores, una lista de personal salia como un arcoiris y
// era lo que mas ensuciaba Horarios y Nomina.
//
// `color` se sigue aceptando porque las pantallas lo pasan desde PAL; lo que
// cambio es que PAL ya no trae colores vivos.
export default function Av({ init, color = N.superficie, size = 36 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.32, fontWeight: 600, color: PAL_TEXTO, flexShrink: 0,
    }}>{init}</div>
  );
}
