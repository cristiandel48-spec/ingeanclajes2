import { useEffect, useMemo, useState } from "react";
import * as backend from "./lib/backend";

const isSupabaseConfigured = backend.isSupabaseConfigured;
const getSupabaseClient = backend.getSupabaseClient;
const getSessionUser = backend.getSessionUser;
const resolveTenantId = backend.resolveTenantId;

const inputStyle = {
  background: "#f8fafc",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  color: "#0f172a",
  padding: "12px 14px",
  fontSize: 14,
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

const buttonStyle = {
  background: "#cc0000",
  color: "#fff",
  border: "1px solid #cc0000",
  borderRadius: 10,
  padding: "12px 18px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

function cardStyle(accent = "#e2e8f0") {
  return {
    maxWidth: 480,
    width: "100%",
    background: "#fff",
    border: `1px solid ${accent}`,
    borderRadius: 18,
    padding: 24,
    boxShadow: "0 16px 40px rgba(15,23,42,0.08)",
  };
}

export default function SupabaseGate({ children }) {
  const configured = useMemo(() => isSupabaseConfigured(), []);
  const [status, setStatus] = useState(configured ? "checking" : "unconfigured");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState(null);

  const validateAccess = async (currentUser) => {
    if (!currentUser) {
      setUser(null);
      setStatus("login");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      await resolveTenantId(supabase, import.meta.env.VITE_SUPABASE_TENANT_SLUG);
      setUser(currentUser);
      setError("");
      setStatus("ready");
    } catch (tenantError) {
      setUser(currentUser);
      setError(tenantError?.message ?? "El usuario inició sesión, pero no pudo resolver el tenant.");
      setStatus("blocked");
    }
  };

  useEffect(() => {
    if (!configured) return;

    let active = true;
    const supabase = getSupabaseClient();

    const loadUser = async () => {
      try {
        const currentUser = await getSessionUser();
        if (!active) return;
        setEmail(currentUser?.email ?? "");
        await validateAccess(currentUser ?? null);
      } catch (sessionError) {
        if (!active) return;
        setError(sessionError?.message ?? "No fue posible validar la sesión en Supabase.");
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
      setError("Escribe el correo y la contraseña del usuario creado en Supabase Auth.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const supabase = getSupabaseClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) throw authError;

      setPassword("");
      await validateAccess(data.user ?? null);
    } catch (authError) {
      const message = authError?.message ?? "No fue posible iniciar sesión en Supabase.";
      if (message.toLowerCase().includes("membres")) {
        setError("El usuario existe, pero no tiene membresía en el tenant 'ingeanclajes'.");
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    try {
      setBusy(true);
      setError("");
      const supabase = getSupabaseClient();
      const { error: logoutError } = await supabase.auth.signOut();
      if (logoutError) throw logoutError;
      setUser(null);
      setPassword("");
      setStatus("login");
    } catch (logoutError) {
      setError(logoutError?.message ?? "No fue posible cerrar la sesión.");
    } finally {
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={cardStyle("#fecaca")}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: 1 }}>
            Supabase No Configurado
          </div>
          <h1 style={{ margin: "10px 0 8px", fontSize: 26, color: "#0f172a" }}>Faltan variables en Vercel</h1>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>
            Agrega <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code> y <code>VITE_SUPABASE_TENANT_SLUG=ingeanclajes</code>.
          </p>
        </div>
      </div>
    );
  }

  if (status === "checking") {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc", padding: 24, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={cardStyle()}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#cc0000", textTransform: "uppercase", letterSpacing: 1 }}>
            Conectando
          </div>
          <h1 style={{ margin: "10px 0 8px", fontSize: 26, color: "#0f172a" }}>Validando sesión</h1>
          <p style={{ margin: 0, color: "#475569" }}>Estamos comprobando el acceso a Supabase.</p>
        </div>
      </div>
    );
  }

  if (status === "blocked" && user) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #fff7ed 0%, #fff1f2 100%)", padding: 24, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={cardStyle("#fecaca")}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", textTransform: "uppercase", letterSpacing: 1 }}>
            Acceso Bloqueado
          </div>
          <h1 style={{ margin: "10px 0 8px", fontSize: 28, color: "#0f172a" }}>La sesión existe, pero el tenant no quedó habilitado</h1>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
            El usuario <strong>{user.email}</strong> inició sesión, pero Supabase no devolvió membresías válidas para <code>ingeanclajes</code>.
          </p>
          <div style={{ marginTop: 16, background: "#fff", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 12, padding: "12px 14px", fontSize: 13 }}>
            {error}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button type="button" onClick={handleLogout} disabled={busy} style={{ ...buttonStyle, opacity: busy ? 0.7 : 1 }}>
              {busy ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status !== "ready" || !user) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)", padding: 24, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={cardStyle("#dbe4f0")}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#cc0000", textTransform: "uppercase", letterSpacing: 1 }}>
            Acceso Cloud
          </div>
          <h1 style={{ margin: "10px 0 8px", fontSize: 28, color: "#0f172a" }}>Inicia sesión para guardar en la nube</h1>
          <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
            Tu SQL de membresía puede estar bien, pero esta app necesita una sesión activa en Supabase Auth para que RLS permita leer y escribir.
          </p>
          <form onSubmit={handleLogin} style={{ marginTop: 18, display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#475569", marginBottom: 6 }}>Correo de Supabase Auth</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cristiandel48@gmail.com" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#475569", marginBottom: 6 }}>Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
            </div>
            {error ? (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 12, padding: "10px 12px", fontSize: 13 }}>
                {error}
              </div>
            ) : null}
            <button type="submit" style={{ ...buttonStyle, opacity: busy ? 0.7 : 1 }} disabled={busy}>
              {busy ? "Ingresando..." : "Entrar y activar guardado"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return children;
}
