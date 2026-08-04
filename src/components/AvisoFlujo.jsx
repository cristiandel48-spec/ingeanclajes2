// Recordatorios del flujo automatico, pensados para quien apenas esta
// aprendiendo a usar el sistema: dicen de donde sale el documento y que hay
// que hacer antes. Van arriba de las pantallas de certificaciones e informes,
// que es donde la gente entra directo por el menu y se queda esperando que
// aparezca una obra que nunca se creo.

import { useIsMobile } from "../hooks/useMediaQuery";

const TONOS = {
  info: { bg: "#F0F6FF", borde: "#BFD8FF", fg: "#1E40AF", icono: "i" },
  falta: { bg: "#FFFAF0", borde: "#FDE3C4", fg: "#B54708", icono: "!" },
  listo: { bg: "#F0FDF4", borde: "#BBF7D0", fg: "#15803D", icono: "✓" },
};

export default function AvisoFlujo({ tono = "info", titulo, children, pasos, accion }) {
  const c = TONOS[tono] || TONOS.info;
  // En el telefono el boton de la accion no se encoge y se comia casi todo el
  // ancho: el texto quedaba en una columna de dos palabras y el aviso crecia
  // hasta ocupar la pantalla entera, empujando el formulario fuera de la
  // vista. Ahi la accion va debajo del texto, en una linea propia.
  const esMovil = useIsMobile();

  return (
    <div style={{
      display: "flex",
      flexDirection: esMovil ? "column" : "row",
      alignItems: esMovil ? "stretch" : "flex-start",
      gap: 11,
      background: c.bg, border: `1px solid ${c.borde}`,
      borderRadius: 12, padding: "13px 15px", marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
          background: c.fg, color: "#fff", marginTop: 1,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 12, fontWeight: 700, lineHeight: 1,
        }}>
          {c.icono}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: c.fg }}>{titulo}</div>
          {children && (
            <div style={{ fontSize: 11.5, color: "#475569", marginTop: 3, lineHeight: 1.5 }}>
              {children}
            </div>
          )}
          {pasos?.length > 0 && (
            <ol style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 11.5, color: "#475569", lineHeight: 1.7 }}>
              {pasos.map((paso, i) => <li key={i}>{paso}</li>)}
            </ol>
          )}
        </div>
      </div>

      {accion}
    </div>
  );
}
