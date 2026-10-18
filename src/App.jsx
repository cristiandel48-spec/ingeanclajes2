import { lazy, Suspense, useEffect } from "react";
import { scrollAppToTop } from "./lib/format";
import { AppDataProvider, useAppData } from "./context/AppDataContext";
import AppShell from "./components/layout/AppShell";
import { AccionesPantallaProvider } from "./context/accionesPantalla";
import { pantallaInicial, puedeVer } from "./lib/permisos";
import BotonSoporteFlotante from "./components/soporte/BotonSoporteFlotante";
import NotificadorMensajesGlobal from "./components/notificaciones/NotificadorMensajesGlobal";
import AvisoInteligenteAgenda from "./components/agenda/AvisoInteligenteAgenda";
import { ToastProvider } from "./components/ui/Toast";

// Cada pantalla se trae al entrar en ella, no al abrir la aplicacion. Antes
// todas venian en el paquete inicial -y con ellas las fotos de la ficha
// tecnica de la cotizacion-: unos 3 MB que bajaba cualquiera, incluso para
// ver el inicio de sesion o una sola pantalla.
//
// Si se publica una version nueva con la aplicacion abierta, los archivos de
// la anterior dejan de existir y el import falla. En ese caso se recarga la
// pagina una vez para tomar la version nueva; la marca evita un bucle si el
// fallo es otro (sin conexion, por ejemplo).
const MARCA_RECARGA = "ingeanclajes_recarga_por_version";
const pantalla = (cargar) => lazy(() =>
  cargar()
    .then((modulo) => {
      try { sessionStorage.removeItem(MARCA_RECARGA); } catch { /* sin almacenamiento */ }
      return modulo;
    })
    .catch((error) => {
      let yaRecargo = true;
      try { yaRecargo = sessionStorage.getItem(MARCA_RECARGA) === "1"; } catch { /* sin almacenamiento */ }
      if (!yaRecargo) {
        try { sessionStorage.setItem(MARCA_RECARGA, "1"); } catch { /* sin almacenamiento */ }
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    })
);

const Dashboard = pantalla(() => import("./screens/Dashboard/Dashboard"));
const Cotizacion = pantalla(() => import("./screens/Cotizacion/Cotizacion"));
const ClientesDB = pantalla(() => import("./screens/Clientes/ClientesDB"));
const Catalogo = pantalla(() => import("./screens/Catalogo/Catalogo"));
const Obras = pantalla(() => import("./screens/Obras/Obras"));
const FototecaScreen = pantalla(() => import("./screens/Fototeca/FototecaScreen"));
const Certificaciones = pantalla(() => import("./screens/Certificaciones/Certificaciones"));
const Informes = pantalla(() => import("./screens/Informes/Informes"));
const Vencimientos = pantalla(() => import("./screens/Vencimientos/Vencimientos"));
const Usuarios = pantalla(() => import("./screens/Usuarios/Usuarios"));
const Auditoria = pantalla(() => import("./screens/Auditoria/Auditoria"));
const Formatos = pantalla(() => import("./screens/Formatos/Formatos"));
const Soporte = pantalla(() => import("./screens/Soporte/Soporte"));
const Agenda = pantalla(() => import("./screens/Agenda/Agenda"));
const MisTareas = pantalla(() => import("./screens/MisTareas/MisTareas"));
const RadarObras = pantalla(() => import("./screens/Radar/RadarObras"));
const Pagos = pantalla(() => import("./screens/Pagos/Pagos"));
const CuentasPagar = pantalla(() => import("./screens/CuentasPagar/CuentasPagar"));
const Contabilidad = pantalla(() => import("./screens/Contabilidad/Contabilidad"));
const Financiero = pantalla(() => import("./screens/Financiero/Financiero"));
const Nomina = pantalla(() => import("./screens/Nomina/Nomina"));
const Horarios = pantalla(() => import("./screens/Horarios/Horarios"));

// Registro de pantallas. Las claves coinciden con los `id` de
// config/navigation.jsx: para sumar una pantalla se agrega aqui y alli.
const SCREENS = {
  dashboard: Dashboard,
  soporte: Soporte,
  tareas: MisTareas,
  agenda: Agenda,
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
        {/* Los avisos flotantes del kit. Cuelgan de aqui para que cualquier
            pantalla pueda usar useToast() sin montar nada. */}
        <ToastProvider>
          <AppRoot />
        </ToastProvider>
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
      padding: "40px 24px",
      background: "#ffffff",
      color: "#000000",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      <div style={{ maxWidth: 600 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px 0", color: "#000000" }}>
          Error de conexión a la base de datos
        </h2>
        <p style={{ fontSize: 14, margin: "0 0 16px 0", color: "#000000", lineHeight: 1.5 }}>
          No se pudo sincronizar la sesión con el servidor central de datos. Por favor revisa tu conexión a la base de datos o inténtalo nuevamente más tarde.
        </p>
        <pre style={{
          fontSize: 13,
          color: "#000000",
          fontFamily: "monospace",
          margin: 0,
          whiteSpace: "pre-wrap",
        }}>
{`[ERROR 504] DB_GATEWAY_TIMEOUT
Host: db.ingeanclajes.app.internal
Status: Connection refused / unreachable`}
        </pre>
      </div>
    </div>
  );
}

function AppRoot() {
  const ctx = useAppData();
  const { scr, setScr, membresia, appBloqueada, esSuperAdminCristian } = ctx;

  // <main> es el mismo para todos los modulos y conservaba el scroll: al ir de
  // un modulo a otro -por ejemplo «Certificar» desde un informe de abajo- el
  // nuevo se abria a media pagina. Cada modulo empieza arriba.
  useEffect(() => {
    scrollAppToTop("auto");
  }, [scr]);

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
      {/* La clave hace que el envoltorio se monte de nuevo en cada cambio de
          modulo, y con eso se repite la animacion de entrada. */}
      <div key={destino} className="transicion-modulo">
        <Suspense fallback={<div style={{ padding: 32, textAlign: "center", color: "var(--text-muted, #64748b)", fontSize: 13 }}>Cargando módulo…</div>}>
          <Screen ctx={ctx} go={setScr} />
        </Suspense>
      </div>
      <NotificadorMensajesGlobal onIrASoporte={() => setScr("soporte")} />
      <AvisoInteligenteAgenda onIrAAgenda={() => setScr("agenda")} />
      {destino !== "soporte" && <BotonSoporteFlotante />}
    </AppShell>
  );
}
