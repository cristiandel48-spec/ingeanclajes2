import { useEffect, useMemo, useState } from "react";
import * as backend from "./lib/backend";
import CreditoDesarrollo from "./components/CreditoDesarrollo";
import logoIngeanclajes from "./assets/logo-ingeanclajes.jpeg";
import { SERVICIO_SUSPENDIDO } from "./lib/servicioEstado";
import EstilosAcceso from "./styles/EstilosAcceso";
import { Button, Callout } from "./components/ui";
import { TIPO, FUENTE, SOMBRA, ESPACIO } from "./styles/designTokens";
import AceptacionTerminos from "./components/AceptacionTerminos";
import PantallaArranque from "./components/PantallaArranque";
import { VERSION_TERMINOS } from "./lib/terminos";
import Novedades from "./components/Novedades";
import { novedadesPendientes, marcarNovedadesVistas } from "./lib/novedades";
import CambiarMiClave from "./components/layout/CambiarMiClave";
import { borrarCopiasLocales } from "./lib/datosLocales";
import { medirDesfaseReloj, relojDesfasado } from "./lib/relojLocal";

// El enlace de «¿Olvidaste tu contraseña?» abre el sistema con sesion, sin
// pedir la contraseña (lo dice la direccion: «#...type=recovery»). Antes se
// entraba y ya; ahora hay que poner una nueva primero. Se anota al cargar,
// antes de que la libreria limpie la direccion, y en la pestaña, para que
// recargar no sirva para saltarse el paso.
const CLAVE_RECUPERACION = "ingeanclajes_debe_cambiar_clave";
const marcarRecuperacion = (valor) => {
  try {
    if (valor) sessionStorage.setItem(CLAVE_RECUPERACION, "1");
    else sessionStorage.removeItem(CLAVE_RECUPERACION);
  } catch { /* sin almacenamiento del navegador: vale lo que hay en memoria */ }
};
if (typeof window !== "undefined" && /type=recovery/.test(window.location.hash + window.location.search)) {
  marcarRecuperacion(true);
}
const vieneDeRecuperacion = () => {
  try { return sessionStorage.getItem(CLAVE_RECUPERACION) === "1"; } catch { return false; }
};

const isSupabaseConfigured = backend.isSupabaseConfigured;
const getSupabaseClient = backend.getSupabaseClient;
const getSessionUser = backend.getSessionUser;
const resolveTenantId = backend.resolveTenantId;
const reintentandoSiChocanPestanas = backend.reintentandoSiChocanPestanas;

// Titulo de pantalla de acceso. Los cuatro iban a 24, 26, 28 y 30 px en
// peso 800, cada uno segun lo que pidiera el momento; ahora todos son el
// mismo escalon de la escala.
// Centrados, con el interlineado apretado y la letra un punto mas grande de
// lo que pide la escala: en una pantalla que solo tiene un titulo y dos
// campos, el titulo puede permitirse pesar.
function Titulo({ children }) {
  return (
    <h1
      style={{
        fontSize: 30,
        lineHeight: "36px",
        fontWeight: 700,
        letterSpacing: "-0.024em",
        color: "var(--text-primary)",
        textAlign: "center",
        margin: "0 0 8px",
        textWrap: "balance",
      }}
    >
      {children}
    </h1>
  );
}

function Subtitulo({ children, style }) {
  return (
    <p
      style={{
        ...TIPO.body,
        color: "var(--text-tertiary)",
        textAlign: "center",
        margin: "0 auto",
        maxWidth: "32ch",
        ...style,
      }}
    >
      {children}
    </p>
  );
}

// Marco comun de todas las pantallas de acceso.
//
// Sin tarjeta: el contenido flota centrado sobre el fondo, que es como se
// presentan las pantallas de acceso de macOS y iOS. Una caja con borde y
// sombra dentro de otra caja es una capa de mas, y es justo lo que hacia
// que esto pareciera un formulario web y no una aplicacion.
function Pantalla({ children }) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--bg-app)",
        // Un halo del color de la marca, muy tenue, detras del contenido.
        // Es lo unico decorativo de la pantalla.
        backgroundImage:
          "radial-gradient(60rem 32rem at 50% -8rem, var(--accent-tint), transparent 70%)",
        padding: "40px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FUENTE,
        boxSizing: "border-box",
      }}
    >
      <EstilosAcceso />
      <div style={{ maxWidth: 380, width: "100%" }}>
        {children}
        <CreditoDesarrollo style={{ marginTop: 32 }} />
      </div>
    </div>
  );
}

// El logotipo como icono de aplicacion: cuadrado redondeado, centrado y
// arriba del todo. Es la primera cosa que se ve al abrir algo en un Mac.
function Encabezado() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
      <div
        style={{
          width: 64, height: 64,
          // 22% del lado: la curva continua de los iconos de iOS.
          borderRadius: 14,
          // Blanco fijo, no var(--surface): el logotipo es un JPEG con fondo
          // blanco, asi que sobre una superficie oscura dejaba un recuadro
          // blanco dentro del icono. Un icono de aplicacion conserva sus
          // colores en modo oscuro, que es justo lo que hace falta aqui.
          background: "#ffffff",
          border: "1px solid var(--separator)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: SOMBRA.md,
          overflow: "hidden",
        }}
      >
        <img
          src={logoIngeanclajes}
          alt=""
          style={{ width: 52, height: 52, objectFit: "contain" }}
        />
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
  if (esFaltaDeSesion(error)) return "La sesión ya no está abierta. Por favor vuelve a ingresar.";
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
      <Encabezado />
      <div
        style={{
          width: 48, height: 48, borderRadius: 14,
          background: "var(--danger-bg)", border: "1px solid var(--danger-bg)",
          display: "flex", alignItems: "center", justifyContent: "center",
          // Centrado como el resto de la pantalla: suelto a la izquierda
          // rompia la columna.
          margin: "0 auto 18px", color: "var(--danger)",
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
      <Button
        variante="primary"
        tam="lg"
        bloque
        onClick={() => window.location.reload()}
        style={{ height: 50, borderRadius: 13 }}
      >
        Reintentar conexión
      </Button>
    </Pantalla>
  );
}

// Fecha u hora del computador mal puesta (ver src/lib/relojLocal.js). Sin
// esto la persona ve «Tu cuenta no tiene acceso» y busca el problema en la
// cuenta, que esta bien.
function PantallaRelojMal({ desfaseMs }) {
  const formato = { dateStyle: "medium", timeStyle: "short" };
  const horaLocal = new Date().toLocaleString("es-CO", formato);
  const horaReal = new Date(Date.now() + desfaseMs).toLocaleString("es-CO", formato);

  return (
    <Pantalla>
      <Encabezado />
      <Titulo>La fecha u hora de este computador está mal</Titulo>
      <Subtitulo style={{ marginBottom: 20, maxWidth: "36ch" }}>
        Tu computador marca <strong style={{ color: "var(--text-primary)" }}>{horaLocal}</strong>, pero
        la hora real es <strong style={{ color: "var(--text-primary)" }}>{horaReal}</strong>. Con el
        reloj así no se puede mantener la sesión abierta.
      </Subtitulo>
      <Callout tono="aviso">
        En Windows: clic derecho en el reloj de la barra de tareas → «Ajustar fecha y hora».
        Activa «Establecer la hora automáticamente», presiona «Sincronizar ahora» y vuelve a entrar.
      </Callout>
      <div style={{ marginTop: 18 }}>
        <Button
          variante="primary"
          tam="lg"
          bloque
          onClick={() => window.location.reload()}
          style={{ height: 50, borderRadius: 13 }}
        >
          Ya la corregí, volver a intentar
        </Button>
      </div>
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
  // Entre «Entrar» y la aplicacion lista se muestra la pantalla de arranque
  // (logotipo y barra), no el formulario con el boton girando.
  const [ingresando, setIngresando] = useState(false);
  const [user, setUser] = useState(null);
  // "permisos" = a la cuenta le falta membresia; "tecnico" = algo fallo.
  const [motivoBloqueo, setMotivoBloqueo] = useState("permisos");
  // Texto crudo del fallo tecnico: el mensaje amable no alcanza para
  // diagnosticar desde una foto de la pantalla.
  const [detalleTecnico, setDetalleTecnico] = useState("");
  // Hora del servidor menos hora local, en ms; null mientras no se mide.
  const [desfaseReloj, setDesfaseReloj] = useState(null);

  useEffect(() => {
    let vigente = true;
    medirDesfaseReloj().then((desfase) => { if (vigente) setDesfaseReloj(desfase); });
    return () => { vigente = false; };
  }, []);
  // Se cierra al instante, sin esperar a que la cuenta confirme que se vieron.
  const [novedadesCerradas, setNovedadesCerradas] = useState(false);
  const [debeCambiarClave, setDebeCambiarClave] = useState(vieneDeRecuperacion);

  const validateAccess = async (currentUser) => {
    if (!currentUser) {
      setUser(null);
      setStatus("login");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      await reintentandoSiChocanPestanas(() => resolveTenantId(supabase, import.meta.env.VITE_SUPABASE_TENANT_SLUG));
      // Terminos de uso y Politica de datos: si la persona no ha aceptado la
      // version vigente, se le muestran antes de entrar. Si no se pudo leer
      // (null: la base aun no tiene la migracion 061) se deja pasar, para no
      // dejar a nadie por fuera por un cambio pendiente en la base.
      const aceptacion = await backend.leerAceptacionTerminos(currentUser.id).catch(() => null);
      setUser(currentUser);
      setError("");
      setStatus(aceptacion && aceptacion.version !== VERSION_TERMINOS ? "terminos" : "ready");
      if (typeof backend.registrarActividadUsuario === "function") {
        backend.registrarActividadUsuario().catch(() => {});
      }
    } catch (tenantError) {
      console.error("No se pudo resolver la empresa del usuario:", tenantError);
      setUser(currentUser);
      setMotivoBloqueo(esFaltaDePermisos(tenantError) ? "permisos" : "tecnico");
      setError(mensajeAmable(tenantError));
      setDetalleTecnico(
        [tenantError?.code, tenantError?.message || String(tenantError || ""), tenantError?.details, tenantError?.hint]
          .filter(Boolean)
          .join(" · ")
      );
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

    const listener = supabase.auth.onAuthStateChange((evento, session) => {
      if (!active) return;
      // Cubre todas las salidas: el boton y el cierre remoto.
      if (evento === "SIGNED_OUT") borrarCopiasLocales();
      if (evento === "PASSWORD_RECOVERY") {
        marcarRecuperacion(true);
        setDebeCambiarClave(true);
      }
      const currentUser = session?.user ?? null;
      setEmail(currentUser?.email ?? "");
      // Fuera del aviso, como pide Supabase: validar hace consultas, y
      // esperarlas dentro del aviso puede dejar la sesion trabada.
      setTimeout(() => { if (active) validateAccess(currentUser); }, 0);
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
      setIngresando(true);
      setError("");
      setAviso("");
      const supabase = getSupabaseClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (authError) throw authError;

      // Entro con su contraseña: si quedo marcado un enlace de recuperacion
      // vencido, ya no hace falta cambiarla.
      marcarRecuperacion(false);
      setDebeCambiarClave(false);

      try {
        sessionStorage.removeItem("bienvenida_camila_mostrada_sesion");
      } catch { /* sin almacenamiento del navegador: se sigue igual */ }

      setPassword("");
      await validateAccess(data.user ?? null);
    } catch (authError) {
      setError(mensajeAmable(authError));
    } finally {
      setBusy(false);
      setIngresando(false);
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
      borrarCopiasLocales();
      try {
        sessionStorage.removeItem("bienvenida_camila_mostrada_sesion");
      } catch { /* sin almacenamiento del navegador: se sigue igual */ }
      setUser(null);
      setPassword("");
      setNovedadesCerradas(false);
      marcarRecuperacion(false);
      setDebeCambiarClave(false);
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
        <Encabezado />
        <Titulo>Falta configurar el servidor</Titulo>
        <Subtitulo>
          Hay que definir <code>VITE_SUPABASE_URL</code>, <code>VITE_SUPABASE_ANON_KEY</code> y{" "}
          <code>VITE_SUPABASE_TENANT_SLUG</code> donde está publicada la aplicación.
        </Subtitulo>
      </Pantalla>
    );
  }

  // Con el reloj mal, cualquier otra pantalla de acceso miente sobre la causa.
  // Si ya entro y la app funciona, no se interrumpe.
  if (relojDesfasado(desfaseReloj) && status !== "ready" && status !== "terminos") {
    return <PantallaRelojMal desfaseMs={desfaseReloj} />;
  }

  // Validando la sesion o entrando: solo el logotipo y la barra, como el
  // arranque del Mac.
  if (status === "checking" || ingresando) {
    return <PantallaArranque />;
  }

  if (status === "blocked" && user) {
    const esSesionVencida = motivoBloqueo !== "permisos";

    return (
      <Pantalla>
        <Encabezado />
        <Titulo>
          {esSesionVencida ? "No se pudo abrir la sesión" : "Tu cuenta no tiene acceso"}
        </Titulo>
        <Subtitulo style={{ marginBottom: 20 }}>
          {esSesionVencida ? (
            <>Hubo un problema técnico al abrir la sesión. Vuelve a ingresar; si sigue igual, envía una foto de esta pantalla a soporte.</>
          ) : (
            <>
              Entraste como <strong style={{ color: "var(--text-primary)" }}>{user.email}</strong>, pero esa
              cuenta todavía no tiene permisos asignados en la empresa.
            </>
          )}
        </Subtitulo>

        {error ? <Callout tono="peligro">{error}</Callout> : null}

        {esSesionVencida && detalleTecnico && detalleTecnico !== error ? (
          <div
            style={{
              marginTop: 10, padding: "8px 10px", borderRadius: 8,
              background: "var(--bg-secondary, rgba(0,0,0,0.04))",
              fontFamily: "ui-monospace, Consolas, monospace", fontSize: 11.5,
              color: "var(--text-secondary)", textAlign: "left",
              wordBreak: "break-word", userSelect: "text",
            }}
          >
            Detalle técnico: {detalleTecnico}
          </div>
        ) : null}

        <div style={{ marginTop: 18 }}>
          <Button
            variante="primary"
            tam="lg"
            bloque
            onClick={handleLogout}
            cargando={busy}
            style={{ height: 50, borderRadius: 13 }}
          >
            {busy ? "Cerrando…" : esSesionVencida ? "Volver a ingresar" : "Salir e intentar con otra cuenta"}
          </Button>
        </div>
      </Pantalla>
    );
  }

  if (status === "terminos" && user) {
    return (
      <AceptacionTerminos
        email={user.email}
        onAceptar={async () => {
          await backend.aceptarTerminos(VERSION_TERMINOS);
          setStatus("ready");
        }}
        onSalir={handleLogout}
      />
    );
  }

  if (status !== "ready" || !user) {
    return (
      <Pantalla>
        <Encabezado />

        <Titulo>Inicia sesión</Titulo>
        <div style={{ height: 20 }} />

        {error ? <div style={{ marginBottom: 18 }}><Callout tono="peligro">{error}</Callout></div> : null}
        {aviso ? <div style={{ marginBottom: 18 }}><Callout tono="exito">{aviso}</Callout></div> : null}

        <form onSubmit={handleLogin}>
          {/* Los dos campos en un solo bloque, con la etiqueta al lado y no
              encima: es la lista agrupada de Ajustes de iOS. */}
          <div className="acceso-grupo">
            <div className="acceso-fila">
              <label htmlFor="acceso-correo">Correo</label>
              <input
                id="acceso-correo"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ingeanclajessas.com"
              />
            </div>
            <div className="acceso-fila">
              <label htmlFor="acceso-clave">Contraseña</label>
              <input
                id="acceso-clave"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          </div>

          <Button
            type="submit"
            variante="primary"
            tam="lg"
            bloque
            cargando={busy}
            // «Entrar» se queda negro, como era: en el acceso es el unico
            // boton y la pantalla lo pide con fuerza. Dentro del programa la
            // principal es la pildora gris.
            style={{
              marginTop: ESPACIO.lg, height: 50, borderRadius: 13, fontSize: 15,
              background: "var(--text-primary)", color: "var(--surface)",
            }}
          >
            {busy ? "Ingresando…" : "Entrar"}
          </Button>
        </form>

        <div style={{ textAlign: "center", marginTop: ESPACIO.md }}>
          <button type="button" className="acceso-enlace" onClick={handleRecuperar} disabled={busy}>
            ¿Olvidaste tu contraseña?
          </button>
        </div>
      </Pantalla>
    );
  }

  if (debeCambiarClave) {
    return (
      <Pantalla>
        <Encabezado />
        <CambiarMiClave
          obligatorio
          onSalir={handleLogout}
          onCerrar={() => {
            marcarRecuperacion(false);
            setDebeCambiarClave(false);
          }}
        />
      </Pantalla>
    );
  }

  // Siempre la misma forma (fragmento con la ventana opcional): si se
  // devolviera `children` a secas al cerrarla, React montaria la app de nuevo.
  return (
    <>
      {children}
      {!novedadesCerradas && novedadesPendientes(user) ? (
        <Novedades
          user={user}
          onCerrar={() => {
            setNovedadesCerradas(true);
            marcarNovedadesVistas(getSupabaseClient(), user);
          }}
        />
      ) : null}
    </>
  );
}
