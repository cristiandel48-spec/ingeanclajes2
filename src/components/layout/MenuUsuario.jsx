import { useEffect, useMemo, useRef, useState } from "react";
import Av from "../ui/Av";
import CambiarMiClave from "./CambiarMiClave";
import * as backend from "../../lib/backend";
import { useAppData } from "../../context/AppDataContext";
import { ROL_LABEL } from "../../lib/permisos";
import { ListRow, Icono, SheetConfirmacion, useToast } from "../ui";
import { TIPO, RADIO, CAPA, SOMBRA } from "../../styles/designTokens";

// Muestra quien esta conectado, deja cambiar la propia contrasena y salir.
// Antes solo se podia salir cerrando la pestana, y el nombre estaba escrito
// a mano en el codigo: no habia forma de saber con que cuenta se entro.
export default function MenuUsuario({ compact = false }) {
  const [abierto, setAbierto] = useState(false);
  const [correo, setCorreo] = useState("");
  const [saliendo, setSaliendo] = useState(false);
  const [cambiandoClave, setCambiandoClave] = useState(false);
  const [confirmandoSalida, setConfirmandoSalida] = useState(false);
  const contenedorRef = useRef(null);
  const aviso = useToast();
  const { membresia, agenda, authUserEmail, esSuperAdminCristian } = useAppData();

  useEffect(() => {
    if (!backend.isSupabaseConfigured()) return;
    let activo = true;
    backend
      .getSessionUser()
      .then((usuario) => { if (activo && usuario?.email) setCorreo(usuario.email); })
      .catch(() => { /* sin sesion: se deja vacio */ });
    return () => { activo = false; };
  }, []);

  const correoActivo = correo || membresia?.email || authUserEmail || "";

  // Se muestra el nombre real de la persona conectada
  const nombreUsuario = useMemo(() => {
    const n = membresia?.nombre?.trim();
    if (n) return n;
    if (correoActivo) {
      const emailLower = correoActivo.toLowerCase();
      if (emailLower.includes("cristian") || emailLower.includes("cristiandel48")) {
        return "Cristian Flórez";
      }
      if (emailLower.includes("camila")) {
        return "Camila Sepúlveda";
      }
      const parte = correoActivo.split("@")[0].replace(/[._-]/g, " ");
      return parte.charAt(0).toUpperCase() + parte.slice(1);
    }
    return "";
  }, [membresia?.nombre, correoActivo]);

  const titulo = nombreUsuario || correoActivo || "Usuario";
  const subtitulo = membresia?.role
    ? (ROL_LABEL[membresia.role] || "Ingeanclajes")
    : (esSuperAdminCristian || correoActivo.toLowerCase().includes("cristian") ? "Super Administrador" : "Ingeanclajes");

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

  const ejecutarCerrarSesion = async () => {
    try {
      setSaliendo(true);
      await backend.signOut();
      // SupabaseGate escucha el cambio de sesión y vuelve a la pantalla de
      // ingreso; se recarga para dejar la app en un estado limpio.
      window.location.reload();
    } catch (error) {
      console.error("No se pudo cerrar sesión:", error);
      setSaliendo(false);
      setConfirmandoSalida(false);
      aviso.error("No se pudo cerrar la sesión. Revisa tu conexión e inténtalo de nuevo.");
    }
  };

  const cerrarSesion = () => {
    if (saliendo) return;
    setAbierto(false);

    // Revisar si hay compromisos para mañana antes de cerrar
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dia = String(d.getDate()).padStart(2, "0");
    const mananaIso = `${y}-${m}-${dia}`;

    const esCristian = correoActivo.toLowerCase().includes("cristian") || esSuperAdminCristian;
    const esCamila = correoActivo.toLowerCase().includes("camila");

    const tieneCompromisosManana = Array.isArray(agenda) && agenda.some(
      (item) => {
        if (!esCristian && !esCamila && (item.tipo === "especial" || item.prioridad === "estrella")) {
          return false;
        }
        return item.fecha === mananaIso && item.estado !== "completado";
      }
    );

    if (tieneCompromisosManana) {
      window.dispatchEvent(
        new CustomEvent("abrir-aviso-agenda-manana", {
          detail: {
            modo: "cierre_sesion",
            onConfirmar: ejecutarCerrarSesion,
          },
        })
      );
      return;
    }

    setConfirmandoSalida(true);
  };

  // Iniciales del nombre ("Cristian Flórez" -> "CF", "Camila Sepúlveda" -> "CS").
  const iniciales = nombreUsuario
    ? nombreUsuario.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase()
    : (correoActivo ? correoActivo.slice(0, 2).toUpperCase() : "U");

  return (
    <div ref={contenedorRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        title={titulo || "Cuenta"}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          height: compact ? 34 : 40, padding: compact ? 0 : "0 10px 0 4px",
          borderRadius: 999, border: "none", cursor: "pointer",
          background: compact ? "transparent" : "var(--fill)",
          color: "var(--text-primary)", fontFamily: "inherit",
        }}
      >
        <Av init={iniciales} size={compact ? 34 : 32} />
        {!compact && (
          <>
            <div style={{ textAlign: "left", maxWidth: 190 }}>
              <div style={{
                ...TIPO.footnote, fontWeight: 600, color: "var(--text-primary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {titulo}
              </div>
              <div style={{ ...TIPO.caption, color: "var(--text-tertiary)" }}>{subtitulo}</div>
            </div>
            <Icono nombre="flechaAbajo" size={14} style={{ color: "var(--text-quaternary)" }} />
          </>
        )}
      </button>

      {abierto && (
        <div
          role="menu"
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: CAPA.menu,
            minWidth: 260, background: "var(--surface)",
            border: "1px solid var(--separator)", borderRadius: RADIO.tarjeta,
            boxShadow: SOMBRA.lg, overflow: "hidden",
          }}
        >
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--separator)" }}>
            <div style={{ ...TIPO.eyebrow, color: "var(--text-tertiary)" }}>
              Sesión activa
            </div>
            <div style={{ ...TIPO.footnote, fontWeight: 400, color: "var(--text-secondary)", marginTop: 4, wordBreak: "break-all" }}>
              {correoActivo || "Sin sesión de Supabase"}
            </div>
          </div>

          <ListRow
            role="menuitem"
            titulo="Cambiar mi contraseña"
            izquierda={<Icono nombre="candado" size={18} style={{ color: "var(--text-tertiary)" }} />}
            onClick={() => { setAbierto(false); setCambiandoClave(true); }}
          />

          <ListRow
            role="menuitem"
            titulo={
              <span style={{ color: "var(--danger-text)" }}>
                {saliendo ? "Cerrando sesión…" : "Cerrar sesión"}
              </span>
            }
            izquierda={<Icono nombre="salir" size={18} style={{ color: "var(--danger-text)" }} />}
            onClick={saliendo ? undefined : cerrarSesion}
          />
        </div>
      )}

      {confirmandoSalida && (
        <SheetConfirmacion
          titulo="¿Cerrar sesión?"
          mensaje="Los cambios guardados se conservan. Tendrás que volver a entrar con tu correo y contraseña."
          textoConfirmar="Cerrar sesión"
          cargando={saliendo}
          onConfirmar={ejecutarCerrarSesion}
          onCerrar={() => { if (!saliendo) setConfirmandoSalida(false); }}
        />
      )}

      {cambiandoClave && <CambiarMiClave onCerrar={() => setCambiandoClave(false)} />}
    </div>
  );
}
