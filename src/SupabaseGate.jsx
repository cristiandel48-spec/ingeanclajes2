import { useEffect, useMemo, useState } from "react";
import * as backend from "./lib/backend";
import CreditoDesarrollo from "./components/CreditoDesarrollo";
import logoIngeanclajes from "./assets/logo-ingeanclajes.jpeg";
import { SERVICIO_SUSPENDIDO } from "./lib/servicioEstado";
import { obtenerMensajeCierreInactividad } from "./lib/seguridadSesion";
import EstilosAcceso from "./styles/EstilosAcceso";
import { Button, Input, Callout } from "./components/ui";
import { TIPO, FUENTE, RADIO, SOMBRA, ESPACIO } from "./styles/designTokens";

const isSupabaseConfigured = backend.isSupabaseConfigured;
const getSupabaseClient = backend.getSupabaseClient;
const getSessionUser = backend.getSessionUser;
const resolveTenantId = backend.resolveTenantId;
const reintentandoSiChocanPestanas = backend.reintentandoSiChocanPestanas;

// Titulo de pantalla de acceso. Los cuatro iban a 24, 26, 28 y 30 px en
// peso 800, cada uno segun lo que pidiera el momento; ahora todos son el
// mismo escalon de la escala.
function Titulo({ children }) {
  return (
    <h1 style={{ ...TIPO.largeTitle, color: "var(--text-primary)", margin: "0 0 8px" }}>
      {children}
    </h1>
  );
}

function Subtitulo({ children, style }) {
  return (
    <p style={{ ...TIPO.body, color: "var(--text-secondary)", margin: 0, ...style }}>
      {children}
    </p>
  );
}

// Marco comun de todas las pantallas de acceso.
function Pantalla({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        padding: "24px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FUENTE,
        boxSizing: "border-box",
      }}
    >
      <EstilosAcceso />
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--separator)",
            borderRadius: RADIO.hoja,
            padding: "36px 34px",
            boxShadow: SOMBRA.lg,
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
        <CreditoDesarrollo style={{ marginTop: 18 }} />
      </div>
    </div>
  );
}

function Encabezado({ etiqueta }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 22 }}>
      <div
        style={{
          width: 38, height: 38, borderRadius: 11, background: "var(--accent)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <img src={logoIngeanclajes} alt="" style={{ width: 25, height: 25, objectFit: "contain", borderRadius: 5 }} />
      </div>
      <div style={{ ...TIPO.eyebrow, color: "var(--text-tertiary)" }}>
        {etiqueta}
      </div>
    </div>
  );
}

function esFaltaDeSesion(error) {
  const texto = String(error?.message || error || "").toLowerCase();
  return (
    texto.includes("auth session missing") ||
    texto.includes("session_not_found") ||
    texto.includes("current_user_tenant_ids") ||
    texto.includes("jwt") ||
    texto.includes("expired")
  );
}

// Traduce los mensajes de Supabase a algo que entienda quien usa la app.
function mensajeAmable(error) {
  const texto = String(error?.message || error || "").toLowerCase();
  if (esFaltaDeSesion(error)) return "Se cerró la sesión por inactividad. Por favor vuelve a ingresar.";
  if (texto.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (texto.includes("email not confirmed")) return "La cuenta existe pero no está confirmada. Pide que la activen desde el panel.";
  if (texto.includes("membres")) return "La cuenta no tiene permisos en esta empresa. Pide que te asignen acceso.";
  if (texto.includes("rate limit") || texto.includes("too many")) return "Demasiados intentos. Espera un momento y vuelve a intentar.";
  if (texto.includes("failed to fetch") || texto.includes("network")) return "Sin conexión con el servidor. Revisa tu internet.";
  // El mensaje original ("Lock ... was released because another request stole
  // it") no le dice nada a nadie, y la solucion es cerrar las otras pestañas.
  if (backend.esChoqueEntrePestanas(error)) {
    return "Tienes el sistema abierto en varias pestañas y se estorban entre ellas. " +
      "Cierra las demás, deja solo esta y vuelve a entrar.";
  }
  // "canceling statement due to statement timeout": la consulta tardo mas de lo
  // que la base permite. Casi siempre es que hay fotos muy pesadas guardadas
  // dentro de las filas y arrastrarlas se lleva todo el tiempo.
  if (texto.includes("statement timeout") || texto.includes("canceling statement")) {
    return "La base de datos tardó demasiado en responder y canceló la consulta. " +
      "Suele ser por fotos muy pesadas guardadas dentro de los registros: " +
      "entra a Usuarios y permisos y usa «Mantenimiento · fotos guardadas».";
  }
  if (texto.includes("stack depth")) {
    return "Las reglas de acceso de la base de datos se están llamando a sí mismas. " +
      "Es un problema de configuración, no de tu cuenta.";
  }
  return error?.message || "No fue posible iniciar sesión.";
}

// Que la consulta del tenant falle no significa que la persona no tenga
// permisos: puede ser un fallo tecnico. Decirle "tu cuenta no tiene acceso"
// cuando en realidad la base esta mal configurada manda a buscar donde no es.
function esFaltaDePermisos(error) {
  return String(error?.message || error || "").toLowerCase().includes("membres");
}

// Pantalla de fallo de conexion. Se muestra cuando el servicio esta suspendido
// (ver src/lib/servicioEstado.js).
function PantallaSinConexion() {
  return (
    <Pantalla>
      <Encabezado etiqueta="Conexión" />
      <div
        style={{
          width: 48, height: 48, borderRadius: 14,
          background: "var(--danger-bg)", border: "1px solid var(--danger-bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 18, color: "var(--danger)",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
          <line x1="3" y1="12" x2="21" y2="12" />
        </svg>
      </div>
      <Titulo>Error de conexión con la base de datos</Titulo>
      {/* El resto de la aplicacion tutea; aqui trataba de usted. */}
      <Subtitulo style={{ marginBottom: 20 }}>
        No se pudo establecer comunicación con la base de datos. Revisa tu conexión o el acceso
        a la red e inténtalo de nuevo.
      </Subtitulo>
      <Button variante="primary" tam="lg" bloque onClick={() => window.location.reload()}>
        Reintentar conexión
      </Button>
    </Pantalla>
  );
}

export default function SupabaseGate({ children }) {
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [status, setStatus] = useState(configured ? "checking" : "unconfigured");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(null);
  // "permisos" = a la cuenta le falta membresia; "tecnico" = algo fallo.
  const [motivoBloqueo, setMotivoBloqueo] = useState("permisos");
  const [mensajeInactividad, setMensajeInactividad] = useState(null);

  useEffect(() => {
    const msg = obtenerMensajeCierreInactividad();
    if (msg) {
      setMensajeInactividad(msg);
    }
  }, []);

  const validateAccess = async (currentUser) => {
    if (!currentUser) {
      setUser(null);
      setStatus("login");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      await reintentandoSiChocanPestanas(() => resolveTenantId(supabase, import.meta.env.VITE_SUPABASE_TENANT_SLUG));
      setUser(currentUser);
      setError("");
      setStatus("ready");
      if (typeof backend.registrarActividadUsuario === "function") {
        backend.registrarActividadUsuario().catch(() => {});
      }
    } catch (tenantError) {
      console.error("No se pudo resolver la empresa del usuario:", tenantError);
      setUser(currentUser);
      setMotivoBloqueo(esFaltaDePermisos(tenantError) ? "permisos" : "tecnico");
      setError(mensajeAmable(tenantError));
      setStatus("blocked");
    }
  };

  useEffect(() => {
    if (!configured || SERVICIO_SUSPENDIDO) return;

    let active = true;
    const supabase = getSupabaseClient();

    const loadUser = async () => {
      try {
        const currentUser = await reintentandoSiChocanPestanas(() => getSessionUser());
        if (!active) return;
        setEmail(currentUser?.email ?? "");
        await validateAccess(currentUser ?? null);
      } catch (sessionError) {
        if (!active) return;
        // "Auth session missing" no es un fallo: es simplemente que nadie ha
        // iniciado sesion todavia. Mostrarlo asustaria sin motivo.
        if (!esFaltaDeSesion(sessionError)) setError(mensajeAmable(sessionError));
        setStatus("login");
      }
    };

    loadUser();

    const listener = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const currentUser = session?.user ?? null;
      setEmail(currentUser?.email ?? "");
      validateAccess(currentUser);
    });

    const subscription = listener?.data?.subscription ?? listener?.subscription ?? null;

    return () => {
      active = false;
      if (subscription?.unsubscribe) subscription.unsubscribe();
    };
  }, [configured]);

  const handleLogin = async (event) => {
    event.preventDefault();
    if (!configured || busy) return;

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError("Escribe tu correo y contraseña.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      setAviso("");
      const supabase = getSupabaseClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) throw authError;

      try {
        sessionStorage.removeItem("bienvenida_camila_mostrada_sesion");
      } catch {}

      setPassword("");
      await validateAccess(data.user ?? null);
    } catch (authError) {
      setError(mensajeAmable(authError));
    } finally {
      setBusy(false);
    }
  };

  const handleRecuperar = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Escribe tu correo para enviarte el enlace de recuperación.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      setAviso("");
      const supabase = getSupabaseClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: window.location.origin,
      });
      if (resetError) throw resetError;
      setAviso(`Te enviamos un enlace a ${cleanEmail} para restablecer la contraseña.`);
    } catch (resetError) {
      setError(mensajeAmable(resetError));
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      setBusy(true);
      setError("");
      await backend.signOut();
      try {
        sessionStorage.removeItem("bienvenida_camila_mostrada_sesion");
      } catch {}
      setUser(null);
      setPassword("");
      setStatus("login");
    } catch (logoutError) {
      setError(mensajeAmable(logoutError));
    } finally {
      setBusy(false);
    }
  };

  // Servicio suspendido: se corta el arranque antes de cualquier otra pantalla.
  if (SERVICIO_SUSPENDIDO) {
    return <PantallaSinConexion />;
  }

  if (!configured) {
    return (
      <Pantalla>
        <Encabezado etiqueta="Configuración pendiente" />
        <Titulo>Falta configurar el servidor</Titulo>
        <Subtitulo>
          Hay que definir <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code> y{" "}
          <code>VITE_SUPABASE_TENANT_SLUG</code> donde está publicada la aplicación.
        </Subtitulo>
      </Pantalla>
    );
  }

  if (status === "checking") {
    return (
      <Pantalla>
        <Encabezado etiqueta="Acceso Cloud" />
        <Titulo>Validando sesión</Titulo>
        <Subtitulo>Un momento, estamos comprobando tu acceso.</Subtitulo>
        {/* Antes solo habia texto: cuando el servidor tardaba, la pantalla
            parecia congelada y no habia forma de saber si seguia trabajando. */}
        <div
          role="progressbar"
          aria-label="Comprobando tu acceso"
          style={{
            marginTop: ESPACIO.xl, height: 4, borderRadius: 999,
            background: "var(--fill)", overflow: "hidden",
          }}
        >
          <div style={{
            width: "40%", height: "100%", borderRadius: 999,
            background: "var(--accent)", animation: "accesoProgreso 1.4s ease-in-out infinite",
          }} />
        </div>
      </Pantalla>
    );
  }

  if (status === "blocked" && user) {
    const esInactividad = motivoBloqueo !== "permisos";

    return (
      <Pantalla>
        <Encabezado etiqueta="Acceso Cloud" />
        <Titulo>
          {esInactividad ? "Sesión cerrada por inactividad" : "Tu cuenta no tiene acceso"}
        </Titulo>
        <Subtitulo style={{ marginBottom: 20 }}>
          {esInactividad ? (
            <>Se cerró la sesión por inactividad. Vuelve a ingresar.</>
          ) : (
            <>
              Entraste como <strong style={{ color: "var(--text-primary)" }}>{user.email}</strong>, pero esa
              cuenta todavía no tiene permisos asignados en la empresa.
            </>
          )}
        </Subtitulo>

        {!esInactividad && error ? <Callout tono="peligro">{error}</Callout> : null}

        <div style={{ marginTop: 18 }}>
          <Button variante="primary" tam="lg" bloque onClick={handleLogout} cargando={busy}>
            {busy ? "Cerrando…" : esInactividad ? "Volver a ingresar" : "Salir e intentar con otra cuenta"}
          </Button>
        </div>
      </Pantalla>
    );
  }

  if (status !== "ready" || !user) {
    return (
      <Pantalla>
        <Encabezado etiqueta="Acceso Cloud" />

        <Titulo>Inicia sesión</Titulo>
        <Subtitulo style={{ marginBottom: 22 }}>
          Guarda tus datos automáticamente en la nube.
        </Subtitulo>

        {mensajeInactividad && (
          <div style={{ marginBottom: 18 }}>
            <Callout tono="aviso" icono="reloj">{mensajeInactividad}</Callout>
          </div>
        )}

        {error ? <div style={{ marginBottom: 20 }}><Callout tono="peligro">{error}</Callout></div> : null}
        {aviso ? <div style={{ marginBottom: 20 }}><Callout tono="exito">{aviso}</Callout></div> : null}

        <form onSubmit={handleLogin} style={{ display: "grid", gap: ESPACIO.lg }}>
          <Input
            id="acceso-correo"
            className="ui-input--lg"
            label="Correo"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="correo@ingeanclajessas.com"
          />
          <Input
            id="acceso-clave"
            className="ui-input--lg"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />

          <Button type="submit" variante="primary" tam="lg" bloque cargando={busy} style={{ marginTop: 2 }}>
            {busy ? "Ingresando…" : "Entrar"}
          </Button>
        </form>

        <div style={{ textAlign: "center", marginTop: 14 }}>
          <Button variante="tertiary" tam="sm" onClick={handleRecuperar} disabled={busy}>
            ¿Olvidaste tu contraseña?
          </Button>
        </div>
      </Pantalla>
    );
  }

  return children;
}
