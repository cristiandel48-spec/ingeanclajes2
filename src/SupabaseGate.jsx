import { useEffect, useMemo, useState } from "react";
import * as backend from "./lib/backend";
import CreditoDesarrollo from "./components/CreditoDesarrollo";
import logoIngeanclajes from "./assets/logo-ingeanclajes.jpeg";

const isSupabaseConfigured = backend.isSupabaseConfigured;
const getSupabaseClient = backend.getSupabaseClient;
const getSessionUser = backend.getSessionUser;
const resolveTenantId = backend.resolveTenantId;
const reintentandoSiChocanPestanas = backend.reintentandoSiChocanPestanas;

const MARCA = "#E0342A";

const inputStyle = {
  background: "#fff",
  border: "1px solid #e4e7ec",
  borderRadius: 10,
  color: "#101828",
  padding: "13px 14px",
  // 16px evita que Safari en iPhone haga zoom al enfocar el campo.
  fontSize: 16,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
  fontFamily: "inherit",
};

const labelStyle = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "#344054",
  marginBottom: 7,
};

const botonStyle = {
  width: "100%",
  background: MARCA,
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "14px 18px",
  fontSize: 15,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

// Marco comun de todas las pantallas de acceso.
function Pantalla({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #f4f5f9 0%, #eceef6 100%)",
        padding: "24px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif",
        boxSizing: "border-box",
      }}
    >
      <div style={{ maxWidth: 420, width: "100%" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 20,
            padding: "36px 34px",
            boxShadow: "0 24px 60px -20px rgba(16,24,40,.18), 0 2px 6px rgba(16,24,40,.04)",
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
          width: 38, height: 38, borderRadius: 11, background: MARCA,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        <img src={logoIngeanclajes} alt="" style={{ width: 25, height: 25, objectFit: "contain", borderRadius: 5 }} />
      </div>
      <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "#98a2b3" }}>
        {etiqueta}
      </div>
    </div>
  );
}

function Aviso({ tono = "error", children }) {
  const colores = tono === "ok"
    ? { bg: "#f0fdf4", border: "#bbf7d0", fg: "#15803d" }
    : { bg: "#fef3f2", border: "#fecdca", fg: "#b42318" };
  return (
    <div
      style={{
        display: "flex", gap: 9, alignItems: "flex-start",
        background: colores.bg, border: `1px solid ${colores.border}`,
        color: colores.fg, borderRadius: 12, padding: "12px 14px",
        fontSize: 13.5, lineHeight: 1.5,
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true">
        <circle cx="12" cy="12" r="9.5" />
        {tono === "ok" ? <path d="M8 12.5l2.5 2.5L16 9.5" /> : <><line x1="12" y1="7.5" x2="12" y2="13" /><line x1="12" y1="16.5" x2="12" y2="16.51" /></>}
      </svg>
      <span>{children}</span>
    </div>
  );
}

// Cuando no hay sesion iniciada, Supabase lanza "Auth session missing".
// Es el estado normal al abrir la app, no un error que haya que mostrar.
function esFaltaDeSesion(error) {
  const texto = String(error?.message || error || "").toLowerCase();
  return texto.includes("auth session missing") || texto.includes("session_not_found");
}

// Traduce los mensajes de Supabase a algo que entienda quien usa la app.
function mensajeAmable(error) {
  const texto = String(error?.message || error || "").toLowerCase();
  if (esFaltaDeSesion(error)) return "Tu sesión expiró. Inicia sesión de nuevo.";
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
    } catch (tenantError) {
      console.error("No se pudo resolver la empresa del usuario:", tenantError);
      setUser(currentUser);
      setMotivoBloqueo(esFaltaDePermisos(tenantError) ? "permisos" : "tecnico");
      setError(mensajeAmable(tenantError));
      setStatus("blocked");
    }
  };

  useEffect(() => {
    if (!configured) return;

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
      setUser(null);
      setPassword("");
      setStatus("login");
    } catch (logoutError) {
      setError(mensajeAmable(logoutError));
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <Pantalla>
        <Encabezado etiqueta="Configuración pendiente" />
        <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: "#101828" }}>Falta configurar el servidor</h1>
        <p style={{ margin: 0, color: "#667085", lineHeight: 1.6, fontSize: 14 }}>
          Hay que definir <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code> y{" "}
          <code>VITE_SUPABASE_TENANT_SLUG</code> donde está publicada la aplicación.
        </p>
      </Pantalla>
    );
  }

  if (status === "checking") {
    return (
      <Pantalla>
        <Encabezado etiqueta="Acceso Cloud" />
        <h1 style={{ margin: "0 0 8px", fontSize: 28, fontWeight: 800, color: "#101828" }}>Validando sesión</h1>
        <p style={{ margin: 0, color: "#667085", fontSize: 14.5 }}>Un momento, estamos comprobando tu acceso.</p>
      </Pantalla>
    );
  }

  if (status === "blocked" && user) {
    return (
      <Pantalla>
        <Encabezado etiqueta="Acceso Cloud" />
        <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, color: "#101828" }}>
          {motivoBloqueo === "permisos" ? "Tu cuenta no tiene acceso" : "No se pudo abrir la empresa"}
        </h1>
        <p style={{ margin: "0 0 16px", color: "#667085", lineHeight: 1.6, fontSize: 14 }}>
          {motivoBloqueo === "permisos" ? (
            <>
              Entraste como <strong style={{ color: "#101828" }}>{user.email}</strong>, pero esa cuenta todavía no
              tiene permisos asignados en la empresa.
            </>
          ) : (
            <>
              Tu usuario y contraseña están bien: entraste como{" "}
              <strong style={{ color: "#101828" }}>{user.email}</strong>. Lo que falló fue la conexión con los datos
              de la empresa, así que no es algo que puedas resolver desde aquí.
            </>
          )}
        </p>
        {error ? <Aviso>{error}</Aviso> : null}
        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          {motivoBloqueo === "tecnico" && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={botonStyle}
            >
              Reintentar
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            disabled={busy}
            style={
              motivoBloqueo === "tecnico"
                ? { ...botonStyle, background: "#fff", color: "#475569", border: "1px solid #e4e7ec", opacity: busy ? 0.7 : 1 }
                : { ...botonStyle, opacity: busy ? 0.7 : 1 }
            }
          >
            {busy ? "Cerrando…" : "Salir e intentar con otra cuenta"}
          </button>
        </div>
      </Pantalla>
    );
  }

  if (status !== "ready" || !user) {
    return (
      <Pantalla>
        <Encabezado etiqueta="Acceso Cloud" />

        <h1 style={{ margin: "0 0 8px", fontSize: 30, fontWeight: 800, color: "#101828", letterSpacing: "-.01em" }}>
          Inicia sesión
        </h1>
        <p style={{ margin: "0 0 22px", color: "#667085", fontSize: 14.5, lineHeight: 1.55 }}>
          Guarda tus datos automáticamente en la nube.
        </p>

        {error ? <div style={{ marginBottom: 20 }}><Aviso>{error}</Aviso></div> : null}
        {aviso ? <div style={{ marginBottom: 20 }}><Aviso tono="ok">{aviso}</Aviso></div> : null}

        <form onSubmit={handleLogin} style={{ display: "grid", gap: 18 }}>
          <div>
            <label htmlFor="acceso-correo" style={labelStyle}>Correo</label>
            <input
              id="acceso-correo"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="correo@ingeanclajes.com"
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="acceso-clave" style={labelStyle}>Contraseña</label>
            <input
              id="acceso-clave"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <button type="submit" style={{ ...botonStyle, opacity: busy ? 0.7 : 1, marginTop: 2 }} disabled={busy}>
            {busy ? "Ingresando…" : "Entrar"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button
            type="button"
            onClick={handleRecuperar}
            disabled={busy}
            style={{
              background: "none", border: "none", padding: 4,
              color: "#667085", fontSize: 13, cursor: "pointer",
              fontFamily: "inherit", textDecoration: "underline",
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </Pantalla>
    );
  }

  return children;
}
