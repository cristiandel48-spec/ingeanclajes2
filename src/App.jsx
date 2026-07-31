import { AppDataProvider, useAppData } from "./context/AppDataContext";
import AppShell from "./components/layout/AppShell";
import { puedeVer } from "./lib/permisos";
import Dashboard from "./screens/Dashboard/Dashboard";
import Cotizacion from "./screens/Cotizacion/Cotizacion";
import ClientesDB from "./screens/Clientes/ClientesDB";
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

// Registro de pantallas. Las claves coinciden con los `id` de
// config/navigation.jsx: para sumar una pantalla se agrega aqui y alli.
const SCREENS = {
  dashboard: Dashboard,
  cotizacion: Cotizacion,
  clientes: ClientesDB,
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
};

export default function App() {
  return (
    <AppDataProvider>
      <AppRoot />
    </AppDataProvider>
  );
}

function AppRoot() {
  const ctx = useAppData();
  const { scr, setScr, membresia } = ctx;

  // Si la persona no tiene acceso a la pantalla actual, cae al dashboard.
  // Pasa al entrar por primera vez o si le quitan un modulo estando dentro.
  const permitido = puedeVer(membresia, scr);
  const destino = permitido ? scr : "dashboard";
  const Screen = SCREENS[destino] || SCREENS.dashboard;

  return (
    <AppShell scr={destino} onNavigate={setScr}>
      <Screen ctx={ctx} go={setScr} />
    </AppShell>
  );
}
