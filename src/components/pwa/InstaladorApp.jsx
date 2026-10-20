import { useState, useEffect } from "react";
import logoIngeanclajes from "../../assets/logo-ingeanclajes.jpeg";
import { Button, Card } from "../ui";
import { TIPO } from "../../styles/designTokens";

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

// Un paso numerado de las instrucciones.
function Paso({ n, children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div
        style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "#0f172a", color: "#ffffff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 12, flexShrink: 0,
        }}
      >
        {n}
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.4, color: "#334155" }}>{children}</div>
    </div>
  );
}

// Teclas y nombres de menu, para que se distingan del texto corrido.
function Tecla({ children }) {
  return (
    <span style={{ background: "#e2e8f0", padding: "2px 6px", borderRadius: 4, fontWeight: 700 }}>
      {children}
    </span>
  );
}

// Encabezado de cada bloque de instrucciones de escritorio. La pastilla marca
// el navegador que la persona tiene delante, para que no lea los tres.
function TituloBloque({ children, esElSuyo }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: "#0f172a" }}>{children}</div>
      {esElSuyo && (
        <span
          style={{
            fontSize: 10, fontWeight: 700, letterSpacing: ".4px", textTransform: "uppercase",
            background: "#dcfce7", color: "#166534", padding: "3px 8px", borderRadius: 999,
          }}
        >
          Tu navegador
        </span>
      )}
    </div>
  );
}

// Que tiene delante quien abre el modal.
//
// Safari de Mac se mira aparte porque no tiene el boton de instalar en la
// barra de direcciones: ahi se hace por el menu Archivo. Sin distinguirlo, la
// guia de escritorio mandaba a buscar un icono que en ese navegador no existe.
function detectarDispositivo() {
  if (typeof navigator === "undefined") return { dispositivo: "pc", esSafariDeMac: false };

  const ua = navigator.userAgent || "";
  // Un iPad en «modo escritorio» se presenta como Macintosh; lo unico que lo
  // delata es que tiene pantalla tactil. Un Mac reporta cero.
  const esTactil = (navigator.maxTouchPoints || 0) > 1;
  const esIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && esTactil);
  const esAndroid = /Android/.test(ua);

  return {
    dispositivo: esIOS ? "ios" : esAndroid ? "android" : "pc",
    esSafariDeMac:
      /Macintosh/.test(ua) && !esTactil &&
      /Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR/.test(ua),
  };
}

// Modal interactivo con guia paso a paso segun el dispositivo del usuario
export function ModalInstaladorApp({ abierto, onClose }) {
  // Se mira al crear el estado y no en un efecto: el dato ya esta disponible
  // en el primer dibujo, asi que no hay un parpadeo con la pestaña equivocada.
  const [detectado] = useState(detectarDispositivo);
  const [dispositivo, setDispositivo] = useState(detectado.dispositivo); // 'ios' | 'android' | 'pc'
  const esSafariDeMac = detectado.esSafariDeMac;
  // No se usa el valor, pero suscribe el modal: si el navegador ofrece el
  // instalador mientras esta abierto, aparece el boton de un toque.
  usePWAInstallPrompt();

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
          maxHeight: "calc(100dvh - 32px)",
          background: "#ffffff",
          borderRadius: 20,
          overflowY: "auto",
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

              <Paso n={1}>
                En la parte inferior de Safari, toca el botón <strong>Compartir</strong> (el ícono del cuadro con flecha hacia arriba <Tecla>↑</Tecla>).
              </Paso>
              <Paso n={2}>
                Baja en el menú y selecciona <strong>«Agregar al inicio»</strong> <Tecla>⊞</Tecla>.
              </Paso>
              <Paso n={3}>
                Toca <strong>«Agregar»</strong> en la esquina superior derecha. Ya queda con su ícono en tu iPhone.
              </Paso>
            </div>
          )}

          {dispositivo === "android" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <Paso n={1}>
                Abre la app en <strong>Google Chrome</strong> en tu celular.
              </Paso>
              <Paso n={2}>
                Toca los <strong>tres puntos verticales</strong> <Tecla>⋮</Tecla> arriba a la derecha.
              </Paso>
              <Paso n={3}>
                Toca <strong>«Instalar aplicación»</strong> o <strong>«Agregar a la pantalla principal»</strong> y confirma.
              </Paso>
            </div>
          )}

          {dispositivo === "pc" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* El navegador que la persona tiene delante va primero: si esta
                  en Safari, los pasos de Chrome no le sirven de nada. */}
              {[
                esSafariDeMac ? "safari" : "chrome",
                esSafariDeMac ? "chrome" : "safari",
              ].map((cual) => (
                cual === "safari" ? (
                  <div key="safari">
                    <TituloBloque esElSuyo={esSafariDeMac}>Safari en Mac</TituloBloque>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <Paso n={1}>
                        En la barra de arriba abre el menú <strong>Archivo</strong> (<em>File</em> si tu Mac está en inglés).
                      </Paso>
                      <Paso n={2}>
                        Elige <strong>«Añadir al Dock…»</strong> <Tecla>Add to Dock…</Tecla>
                      </Paso>
                      <Paso n={3}>
                        Deja el nombre <strong>Ingeanclajes</strong> y pulsa <strong>Añadir</strong>. Queda en el Dock con su ícono y se abre en su propia ventana, sin barra de direcciones.
                      </Paso>
                      <div
                        style={{
                          background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10,
                          padding: "10px 12px", fontSize: 12, color: "#92400e", lineHeight: 1.45,
                        }}
                      >
                        {/* No se dice «los de abajo»: segun el navegador que detecte, el
                            bloque de Chrome puede quedar encima de este. */}
                        <strong>Si no aparece «Añadir al Dock»:</strong> esa opción llegó con macOS Sonoma (14).
                        En un Mac más antiguo no se puede instalar desde Safari; abre la página en Chrome o
                        Edge y sigue los pasos de ese navegador.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key="chrome">
                    <TituloBloque esElSuyo={!esSafariDeMac}>Chrome o Edge</TituloBloque>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <Paso n={1}>
                        Busca el ícono de <strong>Instalar</strong> <Tecla>⊕</Tecla> en la barra de direcciones, a la derecha de la dirección de la página.
                      </Paso>
                      <Paso n={2}>
                        Si no está, abre el menú <strong>⋮</strong> y entra en <strong>Guardar y compartir</strong> o <strong>Más herramientas</strong>, donde aparece <strong>«Instalar Ingeanclajes»</strong>.
                      </Paso>
                      <Paso n={3}>
                        Haz clic en <strong>Instalar</strong>. Queda como una aplicación más, con su acceso directo.
                      </Paso>
                    </div>
                  </div>
                )
              ))}
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
            <div>Pantalla completa</div>
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

// Boton directo reutilizable para colocar en Topbar o Sidebar.
//
// Era un boton con degradado rojo, sombra de color y un emoji de telefono:
// el elemento mas llamativo de toda la barra para la accion menos importante
// que hay en ella. Ahora es un Button secondary del kit, como los demas.
export function BotonInstalarApp({ estilo = "topbar" }) {
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
        <Button
          variante="secondary"
          tam="sm"
          bloque
          icono="descargar"
          onClick={handleClick}
          title="Descargar e instalar la aplicación en tu celular o PC"
          style={{ marginBottom: 6, justifyContent: "flex-start" }}
        >
          Instalar aplicación
        </Button>
        <ModalInstaladorApp abierto={modalAbierto} onClose={() => setModalAbierto(false)} />
      </>
    );
  }

  return (
    <>
      <Button
        variante="secondary"
        tam="sm"
        icono="descargar"
        onClick={handleClick}
        title="Descargar e instalar la aplicación en tu dispositivo"
      >
        Instalar
      </Button>
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
    } catch { /* sin almacenamiento del navegador: se sigue igual */ }
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

  // Tarjeta del sistema, no un cartel negro con degradado: es una sugerencia,
  // no una alarma, y antes pesaba mas que el saludo y las acciones juntas.
  return (
    <>
      <Card
        ajustado
        style={{
          marginBottom: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 240, flex: 1 }}>
          <div
            style={{
              width: 40, height: 40, borderRadius: 12,
              background: "var(--fill)", border: "1px solid var(--separator)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, padding: 5, boxSizing: "border-box",
            }}
          >
            <img src={logoIngeanclajes} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ ...TIPO.headline, color: "var(--text-primary)" }}>
              Instala Ingeanclajes en tu celular o PC
            </div>
            <div style={{ ...TIPO.callout, color: "var(--text-tertiary)", marginTop: 2 }}>
              Se abre a pantalla completa, sin barras del navegador y con carga instantánea.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Button variante="secondary" tam="sm" icono="descargar" onClick={handleInstalar}>
            Instalar
          </Button>
          <Button
            variante="tertiary"
            tam="sm"
            soloIcono
            icono="cerrar"
            onClick={handleDescartar}
            aria-label="Ocultar este aviso"
            title="Ocultar este aviso"
            style={{ color: "var(--text-tertiary)" }}
          />
        </div>
      </Card>
      <ModalInstaladorApp abierto={modalAbierto} onClose={() => setModalAbierto(false)} />
    </>
  );
}
