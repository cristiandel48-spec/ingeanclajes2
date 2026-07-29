import { useEffect, useRef, useState } from "react";
import Av from "../ui/Av";
import * as backend from "../../lib/backend";

// Muestra quien esta conectado y permite cerrar sesion.
// Antes solo se podia salir cerrando la pestana, y el nombre estaba escrito
// a mano en el codigo: no habia forma de saber con que cuenta se entro.
export default function MenuUsuario({ theme, compact = false }) {
  const [abierto, setAbierto] = useState(false);
  const [correo, setCorreo] = useState("");
  const [saliendo, setSaliendo] = useState(false);
  const contenedorRef = useRef(null);

  useEffect(() => {
    if (!backend.isSupabaseConfigured()) return;
    let activo = true;
    backend
      .getSessionUser()
      .then((usuario) => { if (activo) setCorreo(usuario?.email || ""); })
      .catch(() => { /* sin sesion: se deja vacio */ });
    return () => { activo = false; };
  }, []);

  // Cierra el menu al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const alClic = (evento) => {
      if (!contenedorRef.current?.contains(evento.target)) setAbierto(false);
    };
    const alTeclear = (evento) => { if (evento.key === "Escape") setAbierto(false); };
    document.addEventListener("mousedown", alClic);
    window.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alClic);
      window.removeEventListener("keydown", alTeclear);
    };
  }, [abierto]);

  const cerrarSesion = async () => {
    if (saliendo) return;
    if (!window.confirm("¿Cerrar sesión? Los cambios guardados se conservan.")) return;
    try {
      setSaliendo(true);
      await backend.signOut();
      // SupabaseGate escucha el cambio de sesión y vuelve a la pantalla de
      // ingreso; se recarga para dejar la app en un estado limpio.
      window.location.reload();
    } catch (error) {
      console.error("No se pudo cerrar sesión:", error);
      setSaliendo(false);
      window.alert("No se pudo cerrar la sesión. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  const iniciales = (correo || "?").slice(0, 2).toUpperCase();

  return (
    <div ref={contenedorRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        title={correo || "Cuenta"}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          minHeight: 40, padding: compact ? 0 : "4px 10px 4px 4px",
          borderRadius: 999, border: "none", cursor: "pointer",
          background: compact ? "transparent" : theme.surfaceTint,
          color: theme.text, fontFamily: "inherit",
        }}
      >
        <Av init={iniciales} size={compact ? 34 : 30} />
        {!compact && (
          <>
            <div style={{ lineHeight: 1.2, textAlign: "left", maxWidth: 190 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 600, color: theme.text,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {correo || "Sesión local"}
              </div>
              <div style={{ fontSize: 11, color: theme.muted }}>Ingeanclajes</div>
            </div>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: .5 }}>
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </>
        )}
      </button>

      {abierto && (
        <div
          role="menu"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 80,
            minWidth: 250, background: theme.surface,
            border: `1px solid ${theme.divider}`, borderRadius: 12,
            boxShadow: "0 12px 32px rgba(9,11,16,.18)", overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px 14px", borderBottom: `1px solid ${theme.divider}` }}>
            <div style={{ fontSize: 10.5, color: theme.muted, letterSpacing: .3, textTransform: "uppercase", fontWeight: 600 }}>
              Sesión activa
            </div>
            <div style={{ fontSize: 12.5, color: theme.text, marginTop: 4, wordBreak: "break-all" }}>
              {correo || "Sin sesión de Supabase"}
            </div>
          </div>

          <button
            role="menuitem"
            onClick={cerrarSesion}
            disabled={saliendo}
            style={{
              width: "100%", minHeight: 44, display: "flex", alignItems: "center", gap: 10,
              padding: "0 14px", border: "none", cursor: saliendo ? "default" : "pointer",
              background: "transparent", color: "#B42318",
              fontSize: 13, fontWeight: 600, fontFamily: "inherit", textAlign: "left",
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <path d="M16 17l5-5-5-5"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
        </div>
      )}
    </div>
  );
}
