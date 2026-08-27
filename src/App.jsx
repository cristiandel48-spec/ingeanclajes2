import { AppDataProvider, useAppData } from "./context/AppDataContext";
import AppShell from "./components/layout/AppShell";
import { AccionesPantallaProvider } from "./context/accionesPantalla";
import { pantallaInicial, puedeVer } from "./lib/permisos";
import Dashboard from "./screens/Dashboard/Dashboard";
import Cotizacion from "./screens/Cotizacion/Cotizacion";
import ClientesDB from "./screens/Clientes/ClientesDB";
import WhatsAppCRM from "./screens/WhatsApp/WhatsAppCRM";
import Catalogo from "./screens/Catalogo/Catalogo";
import Pagos from "./screens/Pagos/Pagos";
import Obras from "./screens/Obras/Obras";
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
import ModalAlertaCotizaciones from "./components/ModalAlertaCotizaciones";

// Registro de pantallas. Las claves coinciden con los `id` de
// config/navigation.jsx: para sumar una pantalla se agrega aqui y alli.
const SCREENS = {
  dashboard: Dashboard,
  cotizacion: Cotizacion,
  clientes: ClientesDB,
  whatsapp: WhatsAppCRM,
  catalogo: Catalogo,
  obras: Obras,
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

function AppRoot() {
  const ctx = useAppData();
  const { scr, setScr, membresia } = ctx;

  // Si la persona no tiene acceso a la pantalla actual, cae en la primera que
  // si tenga. Pasa al entrar por primera vez -el estado arranca en el
  // dashboard, que ahora es solo del administrador- o si le quitan un modulo
  // estando dentro.
  const permitido = puedeVer(membresia, scr);
  const destino = permitido ? scr : pantallaInicial(membresia);

  // Mientras la membresia carga no se sabe que puede ver: mejor esperar que
  // enseñar una pantalla que quiza no le corresponde.
  if (membresia === null) return <PantallaMensaje titulo="Cargando tu acceso…" />;

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
    </AppShell>
  );
}
