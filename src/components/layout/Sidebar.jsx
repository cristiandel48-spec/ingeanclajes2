import { useState } from "react";
import CreditoDesarrollo from "../CreditoDesarrollo";
import logoIngeanclajes from "../../assets/logo-ingeanclajes.jpeg";
import { NAV_SECTIONS, ICONS } from "../../config/navigation";
import { useAppData } from "../../context/AppDataContext";
import { filtrarSecciones } from "../../lib/permisos";
import { BRAND, RAIL_WIDTH, RAIL_WIDTH_EXPANDED } from "../../styles/shellTheme";

// Navegacion lateral.
// Escritorio: barra de iconos que se despliega al pasar el cursor mostrando
// los nombres. Se puede fijar abierta con el boton inferior.
// Movil: panel deslizante sobre el contenido.
export default function Sidebar({
  scr,
  onNavigate,
  theme,
  isMobile,
  mobileOpen,
  onCloseMobile,
  pinned,
  onTogglePin,
}) {
  const [hovered, setHovered] = useState(false);
  // Cada quien ve solo sus modulos. Mientras la membresia carga se
  // muestra el menu completo: no hay datos aun y evita un parpadeo.
  const { membresia } = useAppData();
  const secciones = membresia ? filtrarSecciones(NAV_SECTIONS, membresia) : NAV_SECTIONS;

  const open = isMobile ? true : pinned || hovered;
  const reservedWidth = pinned ? RAIL_WIDTH_EXPANDED : RAIL_WIDTH;
  const showLabels = open;

  const railStyle = {
    position: "fixed",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 60,
    width: isMobile ? 280 : open ? RAIL_WIDTH_EXPANDED : RAIL_WIDTH,
    background: theme.railBg,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    transition: "width .18s ease, transform .22s ease",
    transform: isMobile && !mobileOpen ? "translateX(-100%)" : "translateX(0)",
    // Respeta el notch y la barra inferior del iPhone.
    paddingTop: "env(safe-area-inset-top)",
    paddingBottom: "env(safe-area-inset-bottom)",
    paddingLeft: "env(safe-area-inset-left)",
    boxShadow: (isMobile && mobileOpen) || (!isMobile && hovered && !pinned)
      ? "0 0 0 100vmax rgba(9,11,16,.32), 8px 0 28px rgba(9,11,16,.28)"
      : "none",
  };

  const handleNavigate = (id) => {
    onNavigate(id);
    if (isMobile) onCloseMobile();
  };

  return (
    <>
      {/* Reserva el espacio del riel en el flujo del layout (solo escritorio). */}
      {!isMobile && <div style={{ width: reservedWidth, flexShrink: 0, transition: "width .18s ease" }} />}

      {/* Capa oscura detras del panel en movil. */}
      {isMobile && mobileOpen && (
        <div
          onClick={onCloseMobile}
          aria-hidden="true"
          style={{ position: "fixed", inset: 0, background: "rgba(9,11,16,.45)", zIndex: 55 }}
        />
      )}

      <nav
        style={railStyle}
        onMouseEnter={() => !isMobile && setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        aria-label="Navegación principal"
      >
        {/* Marca */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "18px 16px 14px", flexShrink: 0, minHeight: 74,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: BRAND, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <img src={logoIngeanclajes} alt="" style={{ width: 26, height: 26, objectFit: "contain", borderRadius: 6 }} />
          </div>
          <div style={{
            opacity: showLabels ? 1 : 0,
            transition: "opacity .15s ease",
            whiteSpace: "nowrap", lineHeight: 1.25,
          }}>
            <div style={{ color: theme.railTextActive, fontSize: 14, fontWeight: 600, letterSpacing: .2 }}>Ingeanclajes</div>
            <div style={{ color: theme.railTitle, fontSize: 11 }}>Sistema de gestión</div>
          </div>
        </div>

        {/* Secciones */}
        <div className="app-scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "4px 12px 12px" }}>
          {secciones.map((section, sectionIndex) => (
            <div key={section.title} style={{ marginBottom: 6 }}>
              {showLabels ? (
                <div style={{
                  padding: "12px 10px 6px", fontSize: 10, fontWeight: 700,
                  letterSpacing: ".09em", textTransform: "uppercase",
                  color: theme.railTitle, whiteSpace: "nowrap",
                }}>
                  {section.title}
                </div>
              ) : (
                sectionIndex > 0 && (
                  <div style={{ height: 1, background: theme.railDivider, margin: "10px 8px" }} />
                )
              )}

              {section.items.map((item) => {
                const active = scr === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    aria-current={active ? "page" : undefined}
                    title={item.label}
                    style={{
                      width: "100%",
                      // 44px es el minimo tactil recomendado por Apple.
                      minHeight: 44,
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "0 12px", marginBottom: 3,
                      borderRadius: 10, border: "none", cursor: "pointer",
                      background: active ? theme.railActiveBg : "transparent",
                      color: active ? theme.railTextActive : theme.railText,
                      fontSize: 13.5,
                      fontWeight: active ? 600 : 500,
                      fontFamily: "inherit",
                      textAlign: "left",
                      whiteSpace: "nowrap",
                      transition: "background .12s ease, color .12s ease",
                    }}
                    onFocus={(e) => { if (!active) e.currentTarget.style.background = theme.railHoverBg; }}
                    onBlur={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ flexShrink: 0, display: "flex", width: 20, justifyContent: "center" }}>
                      {ICONS[item.id]}
                    </span>
                    <span style={{
                      opacity: showLabels ? 1 : 0,
                      transition: "opacity .15s ease",
                      overflow: "hidden",
                    }}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* En movil el panel se despliega completo, asi que el credito va aqui;
            en escritorio se muestra bajo el boton de fijar, mas abajo. */}
        {isMobile && (
          <div style={{ padding: "10px 12px 16px", borderTop: `1px solid ${theme.railDivider}`, flexShrink: 0 }}>
            <CreditoDesarrollo tono="oscuro" />
          </div>
        )}

        {/* Fijar / soltar el panel (solo escritorio) */}
        {!isMobile && (
          <div style={{ padding: "8px 12px 14px", borderTop: `1px solid ${theme.railDivider}`, flexShrink: 0 }}>
            <button
              onClick={onTogglePin}
              title={pinned ? "Contraer menú" : "Mantener menú abierto"}
              style={{
                width: "100%", minHeight: 40, display: "flex", alignItems: "center", gap: 12,
                padding: "0 12px", borderRadius: 10, border: "none", cursor: "pointer",
                background: "transparent", color: theme.railText,
                fontSize: 12.5, fontFamily: "inherit", whiteSpace: "nowrap",
              }}
            >
              <span style={{ flexShrink: 0, display: "flex", width: 20, justifyContent: "center" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  {pinned
                    ? <><path d="M15 6l-6 6 6 6"/></>
                    : <><path d="M9 6l6 6-6 6"/></>}
                </svg>
              </span>
              <span style={{ opacity: showLabels ? 1 : 0, transition: "opacity .15s ease" }}>
                {pinned ? "Contraer menú" : "Fijar menú"}
              </span>
            </button>
            {/* Solo con el menu desplegado: en el riel angosto se cortaria. */}
            <CreditoDesarrollo
              tono="oscuro"
              style={{
                marginTop: 6,
                opacity: showLabels ? 1 : 0,
                transition: "opacity .15s ease",
                pointerEvents: "none",
              }}
            />
          </div>
        )}
      </nav>

    </>
  );
}
