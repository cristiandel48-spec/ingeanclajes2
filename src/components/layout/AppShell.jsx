import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAccionesTopbar } from "../../context/accionesPantalla";
import { useAppData } from "../../context/AppDataContext";
import GlobalStyles from "../../styles/GlobalStyles";
import { getTheme } from "../../styles/shellTheme";
import { useIsMobile } from "../../hooks/useMediaQuery";

const PIN_KEY = "ingeanclajes.nav.pinned";
const THEME_KEY = "ingeanclajes.theme";

const readStored = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
};

const writeStored = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Modo privado de Safari puede bloquear la escritura; no es critico.
  }
};

// Arma la estructura de la aplicacion: navegacion, barra superior y area
// de contenido. Las pantallas se reciben ya resueltas en `children`.
// El aviso de que lo que se ve en las listas es de muestra.
//
// Va en el marco y no en cada pantalla porque los ejemplos se reparten por
// varias -clientes, cotizaciones, obras, informes, certificaciones, cobros- y
// repetir el cartel seis veces seria peor. Desaparece solo en cuanto haya
// registros de verdad.
//
// Es lo primero que se lee al entrar, a proposito: confundir una obra de
// ejemplo con una real seria mucho peor que un cartel de mas.
function AvisoDeEjemplos() {
  const { verEjemplos } = useAppData();
  if (!verEjemplos) return null;

  return (
    <div style={{
      background: "#eef2ff", border: "1px solid #c7d2fe", borderRadius: 12,
      padding: "10px 14px", margin: "14px 0 0", fontSize: 12, color: "#3730a3",
      lineHeight: 1.55,
    }}>
      <strong style={{ color: "#312e81" }}>Datos de muestra.</strong> Los clientes,
      cotizaciones y obras que ve son un ejemplo para conocer el programa: no están
      guardados en la base y desaparecen en cuanto registre los primeros de verdad.
    </div>
  );
}

export default function AppShell({ scr, onNavigate, children }) {
  const isMobile = useIsMobile();
  // Botones que publica la pantalla abierta, para que queden junto al
  // indicador de guardado en vez de perderse al bajar por el formulario.
  const accionesTopbar = useAccionesTopbar();
  const [themeMode, setThemeMode] = useState(() => readStored(THEME_KEY, "light"));
  const [pinned, setPinned] = useState(() => readStored(PIN_KEY, false));
  const [mobileOpen, setMobileOpen] = useState(false);

  const dark = themeMode === "dark";
  const theme = getTheme(themeMode);

  // El menu deslizante solo existe en movil: al volver a escritorio queda
  // cerrado por derivacion, sin necesidad de sincronizar estado.
  const drawerOpen = isMobile && mobileOpen;

  useEffect(() => { writeStored(THEME_KEY, themeMode); }, [themeMode]);
  useEffect(() => { writeStored(PIN_KEY, pinned); }, [pinned]);

  // Bloquea el scroll del fondo mientras el menu movil esta abierto.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [drawerOpen]);

  // Cierra el menu con la tecla Escape.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event) => { if (event.key === "Escape") setMobileOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div
      className="app-shell"
      style={{
        display: "flex",
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
        background: theme.bg,
        color: theme.text,
        overflow: "hidden",
      }}
    >
      <GlobalStyles divider={theme.divider} />

      <Sidebar
        scr={scr}
        onNavigate={onNavigate}
        theme={theme}
        isMobile={isMobile}
        mobileOpen={drawerOpen}
        onCloseMobile={() => setMobileOpen(false)}
        pinned={pinned}
        onTogglePin={() => setPinned((value) => !value)}
      />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
        <Topbar
          scr={scr}
          theme={theme}
          dark={dark}
          onToggleTheme={() => setThemeMode(dark ? "light" : "dark")}
          isMobile={isMobile}
          onOpenMenu={() => setMobileOpen(true)}
          acciones={accionesTopbar}
        />

        <main
          className="app-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            background: theme.bg,
            // Sin espacio arriba: cada pantalla ya trae el suyo (padding:28) y
            // sumarlo dejaba el titulo hundido casi 60px bajo la barra.
            padding: isMobile ? "0 14px 28px" : "0 32px 40px",
            paddingBottom: isMobile
              ? "calc(28px + env(safe-area-inset-bottom))"
              : "40px",
          }}
        >
          <AvisoDeEjemplos />
          {children}
        </main>
      </div>
    </div>
  );
}
