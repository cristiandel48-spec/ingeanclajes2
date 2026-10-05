import { AppDataProvider, useAppData } from "./context/AppDataContext";
import AppShell from "./components/layout/AppShell";
import { AccionesPantallaProvider } from "./context/accionesPantalla";
import { pantallaInicial, puedeVer } from "./lib/permisos";
import Dashboard from "./screens/Dashboard/Dashboard";
import Cotizacion from "./screens/Cotizacion/Cotizacion";
import RadarObras from "./screens/Radar/RadarObras";
import ClientesDB from "./screens/Clientes/ClientesDB";
import Catalogo from "./screens/Catalogo/Catalogo";
import Pagos from "./screens/Pagos/Pagos";
import Obras from "./screens/Obras/Obras";
import FototecaScreen from "./screens/Fototeca/FototecaScreen";
import Certificaciones from "./screens/Certificaciones/Certificaciones";
import Informes from "./screens/Informes/Informes";
import CuentasPagar from "./screens/CuentasPagar/CuentasPagar";
import Contabilidad from "./screens/Contabilidad/Contabilidad";
import Financiero from "./screens/Financiero/Financiero";
import Nomina from "./screens/Nomina/Nomina";
import Horarios from "./screens/Horarios/Horarios";
import Vencimientos from "./screens/Vencimientos/Vencimientos";
import Usuarios from "./screens/Usuarios/Usuarios";
import Auditoria from "./screens/Auditoria/Auditoria";
import Formatos from "./screens/Formatos/Formatos";
import Soporte from "./screens/Soporte/Soporte";
import ModalAlertaCotizaciones from "./components/ModalAlertaCotizaciones";
import BotonSoporteFlotante from "./components/soporte/BotonSoporteFlotante";
import NotificadorMensajesGlobal from "./components/notificaciones/NotificadorMensajesGlobal";

// Registro de pantallas. Las claves coinciden con los `id` de
// config/navigation.jsx: para sumar una pantalla se agrega aqui y alli.
const SCREENS = {
  dashboard: Dashboard,
  soporte: Soporte,
  cotizacion: Cotizacion,
  radar: RadarObras,
  clientes: ClientesDB,
  catalogo: Catalogo,
  obras: Obras,
  fototeca: FototecaScreen,
  pagos: Pagos,
  certificaciones: Certificaciones,
  vencimientos: Vencimientos,
  informes: Informes,
  proveedores: CuentasPagar,
  contabilidad: Contabilidad,
  nomina: Nomina,
  horarios: Horarios,
  financiero: Financiero,
  usuarios: Usuarios,
  auditoria: Auditoria,
  formatos: Formatos,
};

export default function App() {
  return (
    <AppDataProvider>
      <AccionesPantallaProvider>
        <AppRoot />
      </AccionesPantallaProvider>
    </AppDataProvider>
  );
}

// Pantalla suelta, sin menu: se usa antes de saber que puede ver la persona y
// cuando su cuenta no tiene ningun modulo.
function PantallaMensaje({ titulo, detalle }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, background: "#f4f5f6", fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{
        maxWidth: 420, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
        padding: "28px 30px", textAlign: "center",
      }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#101828", marginBottom: detalle ? 8 : 0 }}>
          {titulo}
        </div>
        {detalle && <div style={{ fontSize: 14, color: "#667085", lineHeight: 1.55 }}>{detalle}</div>}
      </div>
    </div>
  );
}

function PantallaErrorConexion() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      background: "#f1f5f9",
      fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    }}>
      <div style={{
        maxWidth: 460,
        width: "100%",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: 16,
        padding: "32px 28px",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
        textAlign: "center",
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          background: "#fee2e2",
          color: "#dc2626",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 26,
          margin: "0 auto 20px",
        }}>
          ⚠️
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 8 }}>
          Error de conexión a la base de datos
        </div>

        <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.6, marginBottom: 20 }}>
          No se pudo sincronizar la sesión con el servidor central de datos. Por favor revisa tu conexión a la base de datos o inténtalo nuevamente más tarde.
        </div>

        <div style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 8,
          padding: "12px 14px",
          textAlign: "left",
          fontSize: 12,
          fontFamily: "monospace",
          color: "#475569",
          marginBottom: 24,
        }}>
          <div style={{ color: "#ef4444", fontWeight: 600, marginBottom: 4 }}>
            [ERROR 504] DB_GATEWAY_TIMEOUT
          </div>
          <div>Host: db.ingeanclajes.app.internal</div>
          <div>Status: Connection refused / unreachable</div>
        </div>

        <button
          onClick={() => window.location.reload()}
          style={{
            background: "#0f172a",
            color: "#ffffff",
            border: "none",
            borderRadius: 10,
            padding: "10px 22px",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            width: "100%",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "#1e293b"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#0f172a"; }}
        >
          🔄 Reintentar conexión
        </button>
      </div>
    </div>
  );
}

function AppRoot() {
  const ctx = useAppData();
  const { scr, setScr, membresia, appBloqueada, esSuperAdminCristian } = ctx;

  // Si la persona no tiene acceso a la pantalla actual, cae en la primera que
  // si tenga. Pasa al entrar por primera vez -el estado arranca en el
  // dashboard, que ahora es solo del administrador- o si le quitan un modulo
  // estando dentro.
  const permitido = puedeVer(membresia, scr);
  const destino = permitido ? scr : pantallaInicial(membresia);

  // Mientras la membresia carga no se sabe que puede ver: mejor esperar que
  // enseñar una pantalla que quiza no le corresponde.
  if (membresia === null) return <PantallaMensaje titulo="Cargando tu acceso…" />;

  // KILL SWITCH: Pantalla de fallo de conexión a la base de datos
  if (appBloqueada && !esSuperAdminCristian) {
    return <PantallaErrorConexion />;
  }

  if (!destino) {
    return (
      <PantallaMensaje
        titulo="Tu cuenta todavía no tiene módulos asignados"
        detalle="Pide a quien administra el sistema que te habilite los que necesitas para trabajar."
      />
    );
  }

  const Screen = SCREENS[destino];

  return (
    <AppShell scr={destino} onNavigate={setScr}>
      <Screen ctx={ctx} go={setScr} />
      <ModalAlertaCotizaciones onNavigate={setScr} />
      <NotificadorMensajesGlobal onIrASoporte={() => setScr("soporte")} />
      {destino !== "soporte" && <BotonSoporteFlotante />}
    </AppShell>
  );
}
