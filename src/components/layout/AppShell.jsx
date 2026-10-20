import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAccionesTopbar } from "../../context/accionesPantalla";
import GlobalStyles from "../../styles/GlobalStyles";
import { getTheme } from "../../styles/shellTheme";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { useAppData } from "../../context/AppDataContext";
import Sheet from "../ui/Sheet";
import Button from "../ui/Button";

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
  return null;
}

// Si la carga inicial falla, la app queda con datos que no son los reales y
// el guardado esta bloqueado. Antes el aviso era un punto rojo en la barra
// -en el celular, solo el punto- y se podia seguir trabajando una tarde
// entera sin que se guardara nada. Ahora no se puede cerrar: la unica salida
// es volver a cargar.
function AvisoCargaFallida() {
  const { loadError } = useAppData();
  if (!loadError) return null;
  const motivo = String(loadError?.message || loadError || "").trim();
  return (
    <Sheet abierta titulo="No se pudieron cargar los datos" cerrarAlPulsarFondo={false}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 6 }}>
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          Lo que hay en pantalla no es la información real y no se está guardando nada.
          Revisa la conexión a internet y vuelve a cargar.
        </p>
        {motivo && (
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-secondary)", wordBreak: "break-word" }}>
            Detalle: {motivo}
          </p>
        )}
        <Button onClick={() => window.location.reload()}>Volver a cargar</Button>
      </div>
    </Sheet>
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
      className={`app-shell ${dark ? "dark-theme" : "light-theme"}`}
      data-theme={themeMode}
      style={{
        display: "flex",
        width: "100%",
        maxWidth: "100vw",
        height: "100vh",
        maxHeight: "100dvh",
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
        background: theme.bg,
        color: theme.text,
        overflow: "hidden",
      }}
    >
      <GlobalStyles divider={theme.divider} dark={dark} />
      <AvisoCargaFallida />

      <Sidebar
        scr={scr}
        onNavigate={onNavigate}
        theme={theme}
        dark={dark}
        isMobile={isMobile}
        mobileOpen={drawerOpen}
        onCloseMobile={() => setMobileOpen(false)}
        pinned={pinned}
        onTogglePin={() => setPinned((value) => !value)}
      />

      <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0, height: "100%", maxHeight: "100vh", overflow: "hidden" }}>
        <Topbar
          scr={scr}
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
            padding: isMobile ? "0 12px 28px" : "0 32px 40px",
            paddingBottom: isMobile
              ? "calc(110px + env(safe-area-inset-bottom))"
              : "40px",
            width: "100%",
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        >
          <AvisoDeEjemplos />
          {children}
        </main>
      </div>
    </div>
  );
}
