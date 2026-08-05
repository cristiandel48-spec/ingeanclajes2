// Barra del proceso de nómina: tres fases, pasos numerados y el estado de
// cada uno. El orden y los nombres viven en pasosNominaConfig.js.
import { FASES, PASOS, indiceDePaso, pasoAnterior, pasoSiguiente } from "./pasosNominaConfig";

const NARANJA = "#2b2622";

function Circulo({ numero, estado }) {
  const estilos = {
    actual: { fondo: NARANJA, texto: "#fff", borde: NARANJA },
    hecho: { fondo: "#fff", texto: NARANJA, borde: NARANJA },
    pendiente: { fondo: "#fff", texto: "#a2988a", borde: "#dbe4f0" },
  }[estado];

  return (
    <div style={{
      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 12, fontWeight: 700, lineHeight: 1,
      background: estilos.fondo, color: estilos.texto,
      border: `1.5px solid ${estilos.borde}`,
    }}>
      {numero}
    </div>
  );
}

export default function PasosNomina({ activo, onIr }) {
  const indiceActivo = indiceDePaso(activo);

  return (
    <div style={{
      display: "flex", gap: 10, marginBottom: 18,
      overflowX: "auto", paddingBottom: 4,
    }}>
      {FASES.map((fase, iFase) => (
        <div key={fase.titulo} style={{
          flex: "0 0 auto",
          border: "1px solid #e8edf4", borderRadius: 14,
          background: "#fbfcfe", padding: "11px 14px 12px",
        }}>
          <div style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: ".07em",
            textTransform: "uppercase", color: "#a2988a", marginBottom: 2,
          }}>
            Fase {iFase + 1} · {fase.titulo}
          </div>
          <div style={{ fontSize: 10.5, color: "#a2988a", marginBottom: 9 }}>
            {fase.detalle}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
            {fase.pasos.map((paso, iPaso) => {
              // El numero sale de la posicion en la lista, no de un contador
              // que se va sumando mientras se dibuja.
              const indice = indiceDePaso(paso.id);
              const estado = paso.id === activo
                ? "actual"
                : indice < indiceActivo ? "hecho" : "pendiente";

              return (
                <div key={paso.id} style={{ display: "flex", alignItems: "center" }}>
                  {iPaso > 0 && (
                    <div style={{ width: 14, height: 1.5, background: "#e8dfd2", flexShrink: 0 }} />
                  )}
                  <button
                    onClick={() => onIr(paso.id)}
                    title={`Paso ${indice + 1} de ${PASOS.length}: ${paso.label}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      background: paso.id === activo ? "#f4eee4" : "transparent",
                      border: `1px solid ${paso.id === activo ? "#fed7aa" : "transparent"}`,
                      borderRadius: 10, padding: "5px 9px 5px 5px",
                      cursor: "pointer", fontFamily: "inherit",
                      minHeight: 38, whiteSpace: "nowrap",
                    }}
                  >
                    <Circulo numero={indice + 1} estado={estado} />
                    <span style={{
                      fontSize: 11.5,
                      fontWeight: paso.id === activo ? 700 : 600,
                      color: paso.id === activo ? "#574e44" : "#574e44",
                    }}>
                      {paso.label}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// Navegación al pie de cada paso. Sin esto hay que volver arriba para seguir,
// y no queda claro cuál es el siguiente.
export function NavegacionPasos({ activo, onIr }) {
  const previo = pasoAnterior(activo);
  const siguiente = pasoSiguiente(activo);
  if (!previo && !siguiente) return null;

  const boton = {
    display: "inline-flex", alignItems: "center", gap: 8,
    borderRadius: 10, padding: "10px 16px", minHeight: 42,
    fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  };

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      gap: 12, flexWrap: "wrap",
      marginTop: 22, paddingTop: 16, borderTop: "1px solid #e8edf4",
    }}>
      {previo ? (
        <button onClick={() => onIr(previo.id)}
          style={{ ...boton, background: "#fbf8f3", border: "1px solid #dbe4f0", color: "#574e44" }}>
          ← {previo.label}
        </button>
      ) : <span />}

      {siguiente && (
        <button onClick={() => onIr(siguiente.id)}
          style={{ ...boton, background: NARANJA, border: `1px solid ${NARANJA}`, color: "#fff" }}>
          Siguiente: {siguiente.label} →
        </button>
      )}
    </div>
  );
}
