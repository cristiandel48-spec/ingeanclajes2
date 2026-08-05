import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import SupabaseGate from "./SupabaseGate.jsx";

class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Error de arranque en App:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", background: "#fafafa", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Segoe UI', sans-serif" }}>
          <div style={{ maxWidth: 720, width: "100%", background: "#fff", border: "1px solid #fecaca", borderRadius: 18, padding: 24, boxShadow: "0 16px 40px rgba(15,23,42,0.08)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#cc0000", textTransform: "uppercase", letterSpacing: 1 }}>
              Error De Arranque
            </div>
            <h1 style={{ margin: "10px 0 8px", fontSize: 28, color: "#101828" }}>La aplicación encontró un error al renderizar</h1>
            <p style={{ margin: 0, color: "#475467", lineHeight: 1.6 }}>
              Ya no debería quedarse en blanco. Si vuelve a pasar, copia este mensaje y seguimos desde ahí.
            </p>
            <pre style={{ marginTop: 16, background: "#f2f4f7", border: "1px solid #fed7aa", color: "#475467", borderRadius: 12, padding: 16, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {this.state.error?.message || String(this.state.error)}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Al publicar una version nueva, los archivos de la anterior desaparecen del
// servidor. Quien tenga la pagina abierta y toque algo que se carga bajo
// demanda -generar un PDF, por ejemplo- recibe un 404 y un mensaje en ingles
// que no dice que hacer. Vite avisa de eso y aqui se traduce a una accion.
window.addEventListener("vite:preloadError", (evento) => {
  evento.preventDefault();
  console.error("Falta un archivo de una version anterior:", evento.payload);
  const recargar = window.confirm(
    "Se publicó una versión nueva del sistema mientras tenías esta página abierta.\n\n" +
    "Hay que recargarla para seguir. Tus cambios guardados no se pierden.\n\n" +
    "¿Recargar ahora?"
  );
  if (recargar) window.location.reload();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppErrorBoundary>
      <SupabaseGate>
        <App />
      </SupabaseGate>
    </AppErrorBoundary>
  </StrictMode>
);
