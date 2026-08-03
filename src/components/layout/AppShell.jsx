import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
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
export default function AppShell({ scr, onNavigate, children }) {
  const isMobile = useIsMobile();
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
          {children}
        </main>
      </div>
    </div>
  );
}
