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
// Banner de aviso de migración: se muestra siempre hasta que sea eliminado.
// Para quitarlo definitivamente, borrar este componente y su uso en el JSX.
function AvisoMigracion() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      role="alert"
      style={{
        position: "relative",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)",
        color: "#ffffff",
        padding: "14px 18px 14px 16px",
        fontSize: 13,
        fontWeight: 500,
        lineHeight: 1.5,
        borderBottom: "2px solid #b91c1c",
        zIndex: 50,
        flexShrink: 0,
      }}
    >
      {/* Icono de advertencia */}
      <span
        style={{
          fontSize: 20,
          lineHeight: 1,
          flexShrink: 0,
          marginTop: 1,
          filter: "drop-shadow(0 0 4px rgba(255,255,255,0.3))",
        }}
        aria-hidden="true"
      >
        ⚠️
      </span>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 4 }}>
          Aviso importante: esta dirección web dejará de funcionar pronto
        </div>
        <div style={{ opacity: 0.92, fontSize: 12.5 }}>
          El sistema de Ingeanclajes está siendo migrado a una nueva plataforma.
          Por favor comuníquese con el administrador para recibir la nueva dirección
          web y no perder acceso a sus datos de obras, cotizaciones y nómina.
        </div>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            opacity: 0.8,
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#fca5a5",
              animation: "pulse 1.6s ease-in-out infinite",
            }}
          />
          Contacte al administrador a la mayor brevedad posible.
        </div>
      </div>

      {/* Botón de cerrar (solo lo oculta temporalmente, reaparece al recargar) */}
      <button
        onClick={() => setVisible(false)}
        title="Cerrar aviso temporalmente (reaparece al recargar)"
        style={{
          flexShrink: 0,
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          color: "#ffffff",
          borderRadius: 6,
          width: 26,
          height: 26,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 700,
          lineHeight: 1,
          marginTop: 1,
          transition: "background 0.15s ease",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.28)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.15)"; }}
      >
        ✕
      </button>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>
    </div>
  );
}

function AvisoDeEjemplos() {
  return null;
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
          theme={theme}
          dark={dark}
          onToggleTheme={() => setThemeMode(dark ? "light" : "dark")}
          isMobile={isMobile}
          onOpenMenu={() => setMobileOpen(true)}
          acciones={accionesTopbar}
        />
        <AvisoMigracion />

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
