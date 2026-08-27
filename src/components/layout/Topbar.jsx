import MenuUsuario from "./MenuUsuario";
import SaveIndicator from "./SaveIndicator";
import { getScreenTitle, getScreenSection } from "../../config/navigation";
import { TOPBAR_HEIGHT } from "../../styles/shellTheme";
import { useAppData } from "../../context/AppDataContext";
import { resumenSeguimiento } from "../../lib/seguimientoCotizaciones";
import { esDestinatarioAlerta } from "../../lib/permisos";

// Barra superior: ubicacion actual, acciones de la pantalla, tema y usuario.
// En movil incluye el boton que abre el menu lateral.
//
// `acciones` lo publica la pantalla que este abierta (ver AccionesPantalla).
// Sirve para que un boton importante -guardar una cotizacion larga- quede
// siempre a la vista junto al indicador de guardado, sin tener que subir.
export default function Topbar({ scr, theme, dark, onToggleTheme, isMobile, onOpenMenu, acciones }) {
  const { cotizaciones, membresia } = useAppData();
  const title = getScreenTitle(scr);
  const section = getScreenSection(scr);

  const esAdminDestinatario = esDestinatarioAlerta(membresia);
  const seg = resumenSeguimiento(cotizaciones || [], new Date(), 100);
  const totalPendientes = seg.requierenAccion?.length || 0;

  return (
    <header
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        minHeight: TOPBAR_HEIGHT,
        padding: isMobile ? "0 14px" : "0 28px",
        background: theme.surface,
        borderBottom: `1px solid ${theme.divider}`,
        // Deja pasar el notch en iPhone cuando la app va a pantalla completa.
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {isMobile && (
          <button
            onClick={onOpenMenu}
            aria-label="Abrir menú"
            style={{
              width: 44, height: 44, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 10, border: "none", cursor: "pointer",
              background: theme.surfaceTint, color: theme.text,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        )}

        <div style={{ minWidth: 0 }}>
          {!isMobile && section && (
            <div style={{ fontSize: 11.5, color: theme.muted, letterSpacing: .2 }}>
              {section}
            </div>
          )}
          <div style={{
            fontSize: isMobile ? 15 : 16.5, fontWeight: 700, color: theme.text,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {title}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        {acciones}
        {esAdminDestinatario && totalPendientes > 0 && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("abrir-alerta-cotizaciones"))}
            aria-label="Ver recordatorio de cotizaciones"
            title={`${totalPendientes} cotizaciones sin respuesta o por vencer`}
            style={{
              position: "relative",
              height: 36,
              padding: isMobile ? "0 10px" : "0 12px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "#fff7ed",
              border: "1px solid #fdba74",
              borderRadius: 999,
              color: "#c2410c",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <span style={{ fontSize: 13 }}>🔔</span>
            <span>{totalPendientes} {isMobile ? "" : "por llamar"}</span>
          </button>
        )}
        <SaveIndicator theme={theme} compact={isMobile} />

        <button
          onClick={onToggleTheme}
          aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          title={dark ? "Tema oscuro" : "Tema claro"}
          style={{
            width: 40, height: 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: theme.surfaceTint, border: "none", borderRadius: 999,
            color: theme.text, cursor: "pointer",
          }}
        >
          {dark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4.2"/>
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>
            </svg>
          )}
        </button>

        {!isMobile && <div style={{ width: 1, height: 26, background: theme.divider }} />}

        <MenuUsuario theme={theme} compact={isMobile} />
      </div>
    </header>
  );
}
