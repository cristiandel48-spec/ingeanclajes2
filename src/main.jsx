import { Component, StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import SupabaseGate from "./SupabaseGate.jsx";
import VerificacionPublica from "./screens/Certificaciones/VerificacionPublica.jsx";
import FirmaRecibidoPublica from "./screens/Firma/FirmaRecibidoPublica.jsx";
import VerificacionRecibido from "./screens/Firma/VerificacionRecibido.jsx";
import DialogosGlobales from "./components/DialogosGlobales.jsx";
import { confirmar } from "./lib/dialogos";
import { protegerSoltarFuera } from "./lib/soltarArchivos";
import { FUENTE } from "./styles/designTokens";
import { cssFuenteInter } from "./lib/fuenteInter";

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
        <div style={{ minHeight: "100vh", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: FUENTE }}>
          <div style={{ maxWidth: 720, width: "100%", background: "#fff", border: "1px solid #fecaca", borderRadius: 18, padding: 24, boxShadow: "0 16px 40px rgba(15,23,42,0.08)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: 1 }}>
              Error De Arranque
            </div>
            <h1 style={{ margin: "10px 0 8px", fontSize: 28, color: "#0f172a" }}>La aplicación encontró un error al renderizar</h1>
            <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
              Ya no debería quedarse en blanco. Si vuelve a pasar, copia este mensaje y seguimos desde ahí.
            </p>
            <pre style={{ marginTop: 16, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a3412", borderRadius: 12, padding: 16, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
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
window.addEventListener("vite:preloadError", async (evento) => {
  evento.preventDefault();
  console.error("Falta un archivo de una version anterior:", evento.payload);
  const recargar = await confirmar({
    titulo: "Hay una versión nueva del sistema",
    mensaje: "Se publicó mientras tenías esta página abierta. Hay que recargarla para seguir; tus cambios guardados no se pierden.",
    textoConfirmar: "Recargar ahora",
    destructivo: false,
    conGuardando: false,
  });
  if (recargar) window.location.reload();
});

protegerSoltarFuera();

// Inter se declara aqui, antes de pintar nada, y no en GlobalStyles: esos
// estilos solo se montan despues de iniciar sesion, y la pantalla de acceso y
// la verificacion publica de certificados salian con la letra de respaldo.
const estiloFuente = document.createElement("style");
estiloFuente.id = "fuente-inter";
estiloFuente.textContent = cssFuenteInter();
document.head.appendChild(estiloFuente);

const searchParams = new URLSearchParams(window.location.search);
const esValidacionPublica = searchParams.has("validar") || searchParams.has("v");
// Paginas publicas de la firma de recibido: la que abre el cliente desde el
// correo y la que abre el QR de la constancia. Ninguna pide sesion.
const esFirmaPublica = searchParams.has("firmar");
const esVerificacionRecibido = searchParams.has("recibido");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppErrorBoundary>
      {esFirmaPublica ? (
        <FirmaRecibidoPublica />
      ) : esVerificacionRecibido ? (
        <VerificacionRecibido />
      ) : esValidacionPublica ? (
        <VerificacionPublica />
      ) : (
        <SupabaseGate>
          <App />
        </SupabaseGate>
      )}
      <DialogosGlobales />
    </AppErrorBoundary>
  </StrictMode>
);
