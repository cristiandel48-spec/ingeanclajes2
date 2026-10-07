import { useState, useEffect } from "react";
import logoIngeanclajes from "../../assets/logo-ingeanclajes.jpeg";

// Estado global para capturar el prompt de instalacion de PWA
let deferredPromptGlobal = null;
let promptListeners = new Set();

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPromptGlobal = e;
    promptListeners.forEach((fn) => fn(e));
  });
}

export function usePWAInstallPrompt() {
  const [prompt, setPrompt] = useState(deferredPromptGlobal);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkStandalone = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(standalone);
    };

    checkStandalone();

    const listener = (p) => setPrompt(p);
    promptListeners.add(listener);

    const mql = window.matchMedia("(display-mode: standalone)");
    if (mql?.addEventListener) {
      mql.addEventListener("change", checkStandalone);
    }

    return () => {
      promptListeners.delete(listener);
      if (mql?.removeEventListener) {
        mql.removeEventListener("change", checkStandalone);
      }
    };
  }, []);

  return { prompt, isStandalone, deferredPromptGlobal };
}

// Modal interactivo con guia paso a paso segun el dispositivo del usuario
export function ModalInstaladorApp({ abierto, onClose }) {
  const [dispositivo, setDispositivo] = useState("auto"); // 'ios' | 'android' | 'pc'
  const { prompt } = usePWAInstallPrompt();

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const ua = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
    const isAndroid = /Android/.test(ua);
    if (isIOS) setDispositivo("ios");
    else if (isAndroid) setDispositivo("android");
    else setDispositivo("pc");
  }, []);

  if (!abierto) return null;

  const handleInstalarNativo = async () => {
    if (deferredPromptGlobal) {
      deferredPromptGlobal.prompt();
      try {
        const { outcome } = await deferredPromptGlobal.userChoice;
        if (outcome === "accepted") {
          deferredPromptGlobal = null;
          onClose();
        }
      } catch (e) {
        console.warn("Error con install prompt:", e);
      }
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 480,
          background: "#ffffff",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          color: "#0f172a",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          animation: "fadeInUp .2s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e2029 0%, #0f1015 100%)",
            padding: "24px 20px 20px",
            color: "#ffffff",
            textAlign: "center",
            position: "relative",
          }}
        >
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              background: "rgba(255, 255, 255, 0.12)",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              color: "#ffffff",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ✕
          </button>

          <div
            style={{
              width: 58,
              height: 58,
              margin: "0 auto 12px",
              borderRadius: 14,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              padding: 6,
            }}
          >
            <img src={logoIngeanclajes} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>

          <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800 }}>
            Instalar App Ingeanclajes
          </h3>
          <p style={{ margin: 0, fontSize: 12.5, color: "#94a3b8" }}>
            Acceso directo rápido a pantalla completa en tu celular o PC
          </p>
        </div>

        {/* Pestañas de dispositivo */}
        <div
          style={{
            display: "flex",
            background: "#f1f5f9",
            padding: 4,
            margin: "16px 20px 0",
            borderRadius: 12,
            gap: 4,
          }}
        >
          <button
            onClick={() => setDispositivo("android")}
            style={{
              flex: 1,
              padding: "7px 0",
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              background: dispositivo === "android" ? "#ffffff" : "transparent",
              color: dispositivo === "android" ? "#c81e1e" : "#64748b",
              boxShadow: dispositivo === "android" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
              transition: "all .15s ease",
            }}
          >
            🤖 Android
          </button>
          <button
            onClick={() => setDispositivo("ios")}
            style={{
              flex: 1,
              padding: "7px 0",
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              background: dispositivo === "ios" ? "#ffffff" : "transparent",
              color: dispositivo === "ios" ? "#c81e1e" : "#64748b",
              boxShadow: dispositivo === "ios" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
              transition: "all .15s ease",
            }}
          >
            🍏 iPhone / iPad
          </button>
          <button
            onClick={() => setDispositivo("pc")}
            style={{
              flex: 1,
              padding: "7px 0",
              border: "none",
              borderRadius: 9,
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 700,
              background: dispositivo === "pc" ? "#ffffff" : "transparent",
              color: dispositivo === "pc" ? "#c81e1e" : "#64748b",
              boxShadow: dispositivo === "pc" ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
              transition: "all .15s ease",
            }}
          >
            💻 PC / Mac
          </button>
        </div>

        {/* Contenido según dispositivo */}
        <div style={{ padding: "16px 20px 20px" }}>
          {deferredPromptGlobal && dispositivo === "android" && (
            <div style={{ marginBottom: 16 }}>
              <button
                onClick={handleInstalarNativo}
                style={{
                  width: "100%",
                  padding: "12px 18px",
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 12,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                }}
              >
                <span>📲</span>
                <span>Instalar ahora con 1 toque</span>
              </button>
              <div style={{ textAlign: "center", fontSize: 11, color: "#64748b", marginTop: 8 }}>
                O sigue las instrucciones manuales abajo:
              </div>
            </div>
          )}

          {dispositivo === "ios" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#1e40af",
                  lineHeight: 1.45,
                }}
              >
                <strong>Importante en iPhone:</strong> Abre este enlace en <strong>Safari</strong> (Apple solo permite instalar PWAs desde Safari).
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#0f172a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: "#334155" }}>
                  En la parte inferior de Safari, toca el botón <strong>Compartir</strong> (el ícono del cuadro con flecha hacia arriba <span style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>[ ↑ ]</span>).
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#0f172a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: "#334155" }}>
                  Baja en el menú y selecciona <strong>"Agregar al inicio"</strong> <span style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>[ ⊞ ]</span>.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#0f172a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: "#334155" }}>
                  Toca <strong>"Agregar"</strong> en la esquina superior derecha. ¡Listo! Ya queda con su ícono en tu iPhone.
                </div>
              </div>
            </div>
          )}

          {dispositivo === "android" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#0f172a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: "#334155" }}>
                  Abre la app en <strong>Google Chrome</strong> en tu celular.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#0f172a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: "#334155" }}>
                  Toca los <strong>tres puntos verticales (⋮)</strong> arriba a la derecha en Chrome.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#0f172a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: "#334155" }}>
                  Toca <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong> y confirma.
                </div>
              </div>
            </div>
          )}

          {dispositivo === "pc" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#0f172a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: "#334155" }}>
                  En <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong>, busca el ícono de <strong>Instalar</strong> <span style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>[ ⊕ ]</span> en la barra de direcciones (a la derecha de la URL).
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#0f172a",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.4, color: "#334155" }}>
                  Haz clic en <strong>"Instalar"</strong>. Se creará un acceso directo en tu escritorio y barra de tareas.
                </div>
              </div>
            </div>
          )}

          {/* Ventajas */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 14,
              borderTop: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-around",
              textAlign: "center",
              fontSize: 11.5,
              color: "#64748b",
            }}
          >
            <div>⚡ Carga instantánea</div>
            <div>📱 Pantalla completa</div>
            <div>🔒 Sesión guardada</div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: "100%",
              marginTop: 14,
              padding: "10px 0",
              background: "#f1f5f9",
              border: "1px solid #cbd5e1",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              color: "#334155",
              cursor: "pointer",
            }}
          >
            Entendido, cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// Boton directo reutilizable para colocar en Topbar o Sidebar
export function BotonInstalarApp({ estilo = "topbar", dark = false }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const { isStandalone } = usePWAInstallPrompt();

  // Si ya esta instalada en modo standalone, podemos no mostrarlo o dejarlo como distintivo
  if (isStandalone) {
    return null;
  }

  const handleClick = () => {
    if (deferredPromptGlobal) {
      deferredPromptGlobal.prompt();
      deferredPromptGlobal.userChoice.then(({ outcome }) => {
        if (outcome !== "accepted") {
          setModalAbierto(true);
        }
      }).catch(() => setModalAbierto(true));
    } else {
      setModalAbierto(true);
    }
  };

  if (estilo === "sidebar") {
    return (
      <>
        <button
          onClick={handleClick}
          title="Descargar e instalar la aplicación en tu celular o PC"
          style={{
            width: "100%",
            minHeight: 40,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "0 12px",
            marginBottom: 6,
            borderRadius: 10,
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(135deg, #c81e1e 0%, #991b1b 100%)",
            color: "#ffffff",
            fontSize: 12.5,
            fontWeight: 700,
            fontFamily: "inherit",
            textAlign: "left",
            boxShadow: "0 2px 6px rgba(200, 30, 30, 0.25)",
            transition: "all .15s ease",
          }}
        >
          <span style={{ fontSize: 15, flexShrink: 0 }}>📲</span>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden" }}>Instalar Aplicación</span>
        </button>
        <ModalInstaladorApp abierto={modalAbierto} onClose={() => setModalAbierto(false)} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        title="Descargar e instalar la aplicación en tu dispositivo"
        style={{
          height: 34,
          padding: "0 11px",
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: dark ? "rgba(220, 38, 38, 0.2)" : "#fef2f2",
          border: `1px solid ${dark ? "rgba(220, 38, 38, 0.4)" : "#fecaca"}`,
          borderRadius: 8,
          color: dark ? "#fca5a5" : "#b91c1c",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          transition: "all .15s ease",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = dark ? "rgba(220, 38, 38, 0.3)" : "#fee2e2";
          e.currentTarget.style.borderColor = "#f87171";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = dark ? "rgba(220, 38, 38, 0.2)" : "#fef2f2";
          e.currentTarget.style.borderColor = dark ? "rgba(220, 38, 38, 0.4)" : "#fecaca";
        }}
      >
        <span style={{ fontSize: 13 }}>📲</span>
        <span>Descargar App</span>
      </button>
      <ModalInstaladorApp abierto={modalAbierto} onClose={() => setModalAbierto(false)} />
    </>
  );
}

// Banner/Tarjeta para el Dashboard
export function TarjetaInstalarAppDashboard() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [descartado, setDescartado] = useState(() => {
    try {
      return localStorage.getItem("ingeanclajes.pwa.banner_descartado") === "true";
    } catch {
      return false;
    }
  });
  const { isStandalone } = usePWAInstallPrompt();

  if (isStandalone || descartado) return null;

  const handleDescartar = () => {
    setDescartado(true);
    try {
      localStorage.setItem("ingeanclajes.pwa.banner_descartado", "true");
    } catch {}
  };

  const handleInstalar = () => {
    if (deferredPromptGlobal) {
      deferredPromptGlobal.prompt();
      deferredPromptGlobal.userChoice.then(({ outcome }) => {
        if (outcome !== "accepted") {
          setModalAbierto(true);
        }
      }).catch(() => setModalAbierto(true));
    } else {
      setModalAbierto(true);
    }
  };

  return (
    <>
      <div
        style={{
          background: "linear-gradient(90deg, #1e293b 0%, #0f172a 100%)",
          color: "#ffffff",
          borderRadius: 14,
          padding: "14px 18px",
          marginBottom: 18,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 260, flex: 1 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              padding: 4,
            }}
          >
            <img src={logoIngeanclajes} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", display: "flex", alignItems: "center", gap: 6 }}>
              <span>📲 Instala Ingeanclajes en tu celular o PC</span>
            </div>
            <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
              Accede con 1 toque en pantalla completa sin barras del navegador y con carga instantánea.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={handleInstalar}
            style={{
              background: "#dc2626",
              color: "#ffffff",
              border: "none",
              borderRadius: 9,
              padding: "8px 16px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(220, 38, 38, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>📥</span>
            <span>Instalar ahora</span>
          </button>
          <button
            onClick={handleDescartar}
            title="Ocultar este aviso"
            style={{
              background: "transparent",
              color: "#94a3b8",
              border: "none",
              cursor: "pointer",
              padding: 6,
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>
      </div>
      <ModalInstaladorApp abierto={modalAbierto} onClose={() => setModalAbierto(false)} />
    </>
  );
}
