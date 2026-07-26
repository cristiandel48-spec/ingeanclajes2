import { AppDataProvider, useAppData } from "./context/AppDataContext";
import AppShell from "./components/layout/AppShell";
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
  const { scr, setScr } = ctx;
  const Screen = SCREENS[scr] || SCREENS.dashboard;

  return (
    <AppShell scr={scr} onNavigate={setScr}>
      <Screen ctx={ctx} go={setScr} />
    </AppShell>
  );
}
