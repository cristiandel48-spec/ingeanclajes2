// Circulo con las iniciales de la persona.
//
// Las iniciales iban a size*0.32: en el avatar de 30px de la barra superior
// salian a 9,6px, por debajo del minimo de 11 de la escala tipografica, y
// nadie podia leerlas. Ahora arrancan en footnote (12px) y crecen con el
// circulo.
export default function Av({ init, color = "var(--accent)", size = 36 }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%", background: color,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: Math.max(12, Math.round(size * 0.4)), lineHeight: 1,
        fontWeight: 700, color: "#fff", flexShrink: 0,
        letterSpacing: "-0.01em",
      }}
    >
      {init}
    </div>
  );
}
