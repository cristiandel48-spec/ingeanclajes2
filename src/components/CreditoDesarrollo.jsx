// Credito de autoria del sistema. Un solo sitio donde cambiarlo, porque
// aparece en la pantalla de acceso y en el pie del menu lateral.
//
// Va deliberadamente discreto: se lee si lo buscas, no compite con la marca
// del cliente ni con lo que la persona vino a hacer.

export const AUTOR_SISTEMA = "Cristian Flórez";

export default function CreditoDesarrollo({ tono = "claro", style }) {
  // "claro" = sobre fondo blanco (pantalla de acceso).
  // "oscuro" = sobre el riel del menu.
  const color = tono === "oscuro" ? "rgba(255,255,255,.38)" : "#98a2b3";

  return (
    <div
      style={{
        fontSize: 10.5,
        letterSpacing: ".02em",
        color,
        textAlign: "center",
        lineHeight: 1.5,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      Sistema desarrollado por <span style={{ fontWeight: 600 }}>{AUTOR_SISTEMA}</span>
    </div>
  );
}
