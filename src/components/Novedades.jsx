import { Button, Sheet } from "./ui";
import { NOVEDADES } from "../lib/novedades";

// Ventana de novedades que aparece una sola vez al entrar despues de una
// actualizacion. Se cierra con «Entendido», con Escape o pulsando el fondo:
// cualquiera de las tres cuenta como vista, para no perseguir a nadie con ella.

export default function Novedades({ onCerrar }) {
  return (
    <Sheet
      titulo="Novedades del sistema"
      subtitulo="Esto es lo que cambió desde la última vez. Explóralo."
      onCerrar={onCerrar}
      pie={
        <Button variante="primary" onClick={onCerrar}>
          Entendido
        </Button>
      }
    >
      {NOVEDADES.map((s) => (
        <section key={s.titulo} style={{ marginBottom: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 6px" }}>
            {s.titulo}
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {s.puntos.map((p) => (
              <li key={p} style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-secondary)", marginBottom: 3 }}>
                {p}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p style={{ fontSize: 12.5, color: "var(--text-tertiary)", margin: "4px 0 0" }}>
        Si tienes la app instalada en el celular y no ves los cambios, ciérrala y ábrela de nuevo.
      </p>
    </Sheet>
  );
}
