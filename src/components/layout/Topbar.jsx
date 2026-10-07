import { useMemo } from "react";
import MenuUsuario from "./MenuUsuario";
import SaveIndicator from "./SaveIndicator";
import { getScreenTitle, getScreenSection } from "../../config/navigation";
import { TOPBAR_HEIGHT } from "../../styles/shellTheme";
import { useAppData } from "../../context/AppDataContext";
import { resumenSeguimiento } from "../../lib/seguimientoCotizaciones";
import { esDestinatarioAlerta, puedeVer, pantallaInicial } from "../../lib/permisos";
import { esUsuarioCamila } from "../../lib/motivacionCamila";

// Barra superior: ubicacion actual, acciones de la pantalla, tema y usuario.
// En movil incluye el boton que abre el menu lateral.
//
// `acciones` lo publica la pantalla que este abierta (ver AccionesPantalla).
// Sirve para que un boton importante -guardar una cotizacion larga- quede
// siempre a la vista junto al indicador de guardado, sin tener que subir.
export default function Topbar({ scr, theme, dark, onToggleTheme, isMobile, onOpenMenu, acciones }) {
  const { cotizaciones, membresia, usuariosEnLinea, esSuperAdminCristian, authUserEmail, irAPantalla } = useAppData();
  const esCamila = useMemo(() => esUsuarioCamila(membresia, authUserEmail), [membresia, authUserEmail]);
  const title = getScreenTitle(scr);
  const section = getScreenSection(scr);

  const esAdminDestinatario = esDestinatarioAlerta(membresia);
  const seg = resumenSeguimiento(cotizaciones || [], new Date(), 100);
  const totalPendientes = seg.requierenAccion?.length || 0;

  const destinoMenu = useMemo(() => {
    if (!membresia) return "dashboard";
    return puedeVer(membresia, "dashboard") ? "dashboard" : pantallaInicial(membresia);
  }, [membresia]);

  const esPantallaMenu = scr === "dashboard" || (!puedeVer(membresia, "dashboard") && scr === destinoMenu);

  const totalEnLinea = useMemo(() => {
    if (!usuariosEnLinea || typeof usuariosEnLinea !== "object") return 0;
    const vistos = new Set();
    Object.values(usuariosEnLinea).forEach((u) => {
      if (u?.userId) vistos.add(u.userId);
    });
    return vistos.size;
  }, [usuariosEnLinea]);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: isMobile ? 8 : 12,
        minHeight: TOPBAR_HEIGHT,
        height: TOPBAR_HEIGHT,
        padding: isMobile ? "0 12px" : "0 28px",
        background: theme.surface,
        borderBottom: `1px solid ${theme.divider}`,
        // Deja pasar el notch en iPhone cuando la app va a pantalla completa.
        paddingTop: "env(safe-area-inset-top)",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, flexShrink: 1, minWidth: 0, overflow: "hidden" }}>
        {isMobile && (
          <button
            onClick={onOpenMenu}
            aria-label="Abrir menú"
            style={{
              width: 38, height: 38, flexShrink: 0,
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

        <div style={{ flexShrink: 1, minWidth: 0, overflow: "hidden" }}>
          {!isMobile && section && (
            <div style={{ fontSize: 11.5, color: theme.muted, letterSpacing: .2, whiteSpace: "nowrap" }}>
              {section}
            </div>
          )}
          <div style={{
            fontSize: isMobile ? 14 : 16.5, fontWeight: 700, color: theme.text,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            maxWidth: isMobile ? "140px" : "none",
          }}>
            {title}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 5 : 10, flexShrink: 0, minWidth: 0, justifyContent: "flex-end" }}>
        {!esPantallaMenu && (
          <button
            onClick={() => irAPantalla(destinoMenu || "dashboard")}
            aria-label="Volver al menú"
            title="Volver al menú principal (Dashboard)"
            style={{
              height: 34,
              padding: isMobile ? "0 9px" : "0 13px",
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: dark ? "rgba(255, 255, 255, 0.08)" : "#ffffff",
              border: `1px solid ${dark ? "rgba(255, 255, 255, 0.18)" : "#cbd5e1"}`,
              borderRadius: 8,
              color: dark ? "#f1f5f9" : "#334155",
              cursor: "pointer",
              fontSize: 12.5,
              fontWeight: 600,
              flexShrink: 0,
              boxShadow: "0 1px 2px rgba(0,0,0,.04)",
              transition: "all .15s ease",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = dark ? "rgba(255, 255, 255, 0.15)" : "#f8fafc";
              e.currentTarget.style.borderColor = dark ? "rgba(255, 255, 255, 0.3)" : "#94a3b8";
              e.currentTarget.style.color = dark ? "#ffffff" : "#0f172a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = dark ? "rgba(255, 255, 255, 0.08)" : "#ffffff";
              e.currentTarget.style.borderColor = dark ? "rgba(255, 255, 255, 0.18)" : "#cbd5e1";
              e.currentTarget.style.color = dark ? "#f1f5f9" : "#334155";
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>{isMobile ? "Menú" : "Volver al menú"}</span>
          </button>
        )}

        {acciones && (
          <div
            className="topbar-acciones"
            data-no-wrap="true"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              maxWidth: isMobile ? "44vw" : "none",
              overflowX: isMobile ? "auto" : "visible",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              flexShrink: 0,
            }}
          >
            {acciones}
          </div>
        )}
        {scr === "cotizacion" && esAdminDestinatario && totalPendientes > 0 && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("abrir-alerta-cotizaciones"))}
            aria-label="Ver recordatorio de cotizaciones"
            title={`${totalPendientes} cotizaciones sin respuesta o por vencer`}
            style={{
              position: "relative",
              height: 34,
              padding: isMobile ? "0 8px" : "0 12px",
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "#fff7ed",
              border: "1px solid #fdba74",
              borderRadius: 999,
              color: "#c2410c",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 13 }}>🔔</span>
            <span>{totalPendientes}{isMobile ? "" : " por llamar"}</span>
          </button>
        )}
        {esCamila && (
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("abrir-motivacion-camila"))}
            aria-label="Abrir motivación diaria para María Camila"
            title="Inspiración diaria para María Camila (Clic para leer una frase motivacional)"
            style={{
              height: 34,
              padding: isMobile ? "0 8px" : "0 12px",
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: dark ? "rgba(244, 114, 182, 0.16)" : "#fdf2f8",
              border: `1px solid ${dark ? "rgba(244, 114, 182, 0.45)" : "#fbcfe8"}`,
              borderRadius: 999,
              color: dark ? "#f472b6" : "#be185d",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
              transition: "all .15s ease",
            }}
          >
            <span>🌸</span>
            <span>{isMobile ? "Inspiración" : "Inspiración diaria"}</span>
          </button>
        )}
        <SaveIndicator theme={theme} compact={isMobile} />

        {esSuperAdminCristian && (
          <button
            onClick={() => irAPantalla("usuarios")}
            aria-label="Ver usuarios en línea"
            title={`Monitoreo en tiempo real (Exclusivo Cristian Delgado): ${totalEnLinea} usuario(s) conectado(s). Clic para abrir administración.`}
            style={{
              height: 34,
              padding: isMobile ? "0 6px" : "0 12px",
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "rgba(16, 185, 129, 0.12)",
              border: "1px solid rgba(16, 185, 129, 0.35)",
              borderRadius: 999,
              color: dark ? "#34d399" : "#065f46",
              cursor: "pointer",
              fontSize: 11.5,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#10b981",
                boxShadow: "0 0 6px #10b981",
                display: "inline-block",
              }}
            />
            <span>{totalEnLinea}{isMobile ? "" : " en línea"}</span>
          </button>
        )}

        <button
          onClick={onToggleTheme}
          aria-label={dark ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          title={dark ? "Tema oscuro" : "Tema claro"}
          style={{
            width: isMobile ? 34 : 40, height: isMobile ? 34 : 40,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: theme.surfaceTint, border: "none", borderRadius: 999,
            color: theme.text, cursor: "pointer", flexShrink: 0,
          }}
        >
          {dark ? (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>
            </svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
