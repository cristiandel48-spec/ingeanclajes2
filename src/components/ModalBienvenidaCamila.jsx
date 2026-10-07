import { useEffect, useState, useMemo } from "react";
import {
  esUsuarioCamila,
  obtenerSaludoSegunHora,
  obtenerFechaHoyTexto,
  obtenerFraseDelDia,
  obtenerFraseAleatoria,
  obtenerFavoritas,
  alternarFavorita,
  FRASES_MOTIVACIONALES_CAMILA,
} from "../lib/motivacionCamila";

const CLAVE_MOSTRAR_SIEMPRE = "camila_mostrar_bienvenida_siempre";
const CLAVE_SESION_VISTA = "bienvenida_camila_mostrada_sesion";

export default function ModalBienvenidaCamila({ membresia, authUserEmail }) {
  const esCamila = useMemo(
    () => esUsuarioCamila(membresia, authUserEmail),
    [membresia, authUserEmail]
  );

  const [abierto, setAbierto] = useState(false);
  const [fraseActual, setFraseActual] = useState(() => obtenerFraseDelDia());
  const [favoritas, setFavoritas] = useState(() => obtenerFavoritas());
  const [mostrarSiempre, setMostrarSiempre] = useState(() => {
    try {
      return localStorage.getItem(CLAVE_MOSTRAR_SIEMPRE) !== "false";
    } catch {
      return true;
    }
  });
  const [animando, setAnimando] = useState(false);

  // Apertura automática al iniciar sesión si es Camila
  useEffect(() => {
    if (!esCamila) return;

    let yaVista = false;
    try {
      yaVista = Boolean(sessionStorage.getItem(CLAVE_SESION_VISTA));
    } catch {}

    const permitir = localStorage.getItem(CLAVE_MOSTRAR_SIEMPRE) !== "false";

    if (!yaVista && permitir) {
      const timer = setTimeout(() => {
        setAbierto(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [esCamila]);

  // Escuchar evento manual para abrir desde Topbar o Dashboard
  useEffect(() => {
    const handleAbrir = () => {
      setAbierto(true);
    };
    window.addEventListener("abrir-motivacion-camila", handleAbrir);
    return () => window.removeEventListener("abrir-motivacion-camila", handleAbrir);
  }, []);

  if (!esCamila || !abierto) return null;

  const saludoInfo = obtenerSaludoSegunHora();
  const fechaHoy = obtenerFechaHoyTexto();
  const esFavorita = favoritas.includes(fraseActual.id);

  const handleCerrar = () => {
    try {
      sessionStorage.setItem(CLAVE_SESION_VISTA, "true");
    } catch {}
    setAbierto(false);
  };

  const handleCambiarFrase = () => {
    setAnimando(true);
    setTimeout(() => {
      setFraseActual((prev) => obtenerFraseAleatoria(prev?.id));
      setAnimando(false);
    }, 180);
  };

  const handleToggleFavorita = () => {
    const nuevas = alternarFavorita(fraseActual.id);
    setFavoritas(nuevas);
  };

  const handleToggleMostrarSiempre = (e) => {
    const val = e.target.checked;
    setMostrarSiempre(val);
    try {
      localStorage.setItem(CLAVE_MOSTRAR_SIEMPRE, val ? "true" : "false");
    } catch {}
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(7px)",
        WebkitBackdropFilter: "blur(7px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeInCamila .25s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCerrar();
      }}
    >
      <style>{`
        @keyframes fadeInCamila {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes quoteFade {
          0% { opacity: 0.2; transform: translateY(6px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .btn-camila-hover:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(225, 29, 72, 0.28);
        }
        .btn-camila-secondary:hover {
          background: #fce7f3 !important;
          border-color: #f472b6 !important;
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bienvenida y motivación para María Camila"
        style={{
          width: "100%",
          maxWidth: "540px",
          background: "linear-gradient(155deg, #ffffff 0%, #fff7f9 55%, #fdf2f8 100%)",
          borderRadius: "26px",
          border: "1.5px solid rgba(244, 114, 182, 0.45)",
          boxShadow: "0 25px 65px -15px rgba(225, 29, 72, 0.28), 0 10px 25px rgba(15, 23, 42, 0.12)",
          padding: "28px 26px 22px",
          position: "relative",
          boxSizing: "border-box",
          color: "#1e293b",
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        }}
      >
        {/* Botón cerrar X */}
        <button
          onClick={handleCerrar}
          aria-label="Cerrar ventana de bienvenida"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "1px solid #fbcfe8",
            background: "#ffffff",
            color: "#94a3b8",
            fontSize: "16px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all .15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#be185d";
            e.currentTarget.style.background = "#fdf2f8";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#94a3b8";
            e.currentTarget.style.background = "#ffffff";
          }}
        >
          ✕
        </button>

        {/* Encabezado: Saludo y Bienvenida */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          {/* Badge superior */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "linear-gradient(90deg, #fdf2f8 0%, #fce7f3 100%)",
              border: "1px solid #fbcfe8",
              borderRadius: "999px",
              padding: "4px 14px",
              fontSize: "11.5px",
              fontWeight: "700",
              color: "#be185d",
              letterSpacing: ".02em",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            <span>🌸</span>
            <span>Espacio de María Camila Sepúlveda</span>
          </div>

          <h2
            style={{
              margin: "0 0 6px",
              fontSize: "24px",
              fontWeight: "800",
              color: "#0f172a",
              letterSpacing: "-.02em",
              lineHeight: 1.25,
            }}
          >
            {saludoInfo.saludo} {saludoInfo.icono}
          </h2>

          <p
            style={{
              margin: "0 0 8px",
              fontSize: "13.5px",
              color: "#64748b",
              lineHeight: 1.5,
              maxWidth: "440px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            {saludoInfo.subtitulo}
          </p>

          <div
            style={{
              fontSize: "11px",
              fontWeight: "600",
              color: "#94a3b8",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <span>📅</span>
            <span>{fechaHoy}</span>
          </div>
        </div>

        {/* Tarjeta de Frase Motivacional */}
        <div
          style={{
            position: "relative",
            background: "#ffffff",
            borderRadius: "20px",
            border: "1px solid #fbcfe8",
            boxShadow: "0 8px 24px -6px rgba(244, 114, 182, 0.15)",
            padding: "22px 24px 18px",
            marginBottom: "18px",
            overflow: "hidden",
            animation: animando ? "none" : "quoteFade .3s ease-out",
          }}
        >
          {/* Marca de agua de comilla */}
          <div
            style={{
              position: "absolute",
              top: "-15px",
              left: "14px",
              fontSize: "76px",
              fontFamily: "Georgia, serif",
              color: "rgba(244, 114, 182, 0.14)",
              userSelect: "none",
              pointerEvents: "none",
              lineHeight: 1,
            }}
          >
            “
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#db2777",
                  background: "#fdf2f8",
                  border: "1px solid #fbcfe8",
                  borderRadius: "6px",
                  padding: "2px 8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>{fraseActual.icono}</span>
                <span>{fraseActual.tag}</span>
              </span>

              <span
                style={{
                  fontSize: "10.5px",
                  color: "#94a3b8",
                  fontWeight: "600",
                }}
              >
                Inspiración {fraseActual.id} de {FRASES_MOTIVACIONALES_CAMILA.length}
              </span>
            </div>

            {/* Texto de la frase */}
            <p
              style={{
                margin: "0 0 14px",
                fontSize: "15.5px",
                fontWeight: "600",
                color: "#1e293b",
                lineHeight: "1.65",
                fontStyle: "italic",
              }}
            >
              “{fraseActual.frase}”
            </p>

            {/* Autor y botón favorita */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                paddingTop: "10px",
                borderTop: "1px dashed #fce7f3",
                fontSize: "12px",
              }}
            >
              <div style={{ color: "#64748b", fontWeight: "600" }}>
                — <span style={{ color: "#be185d" }}>{fraseActual.autor}</span>
              </div>

              <button
                type="button"
                onClick={handleToggleFavorita}
                title={esFavorita ? "Quitar de mis favoritas" : "Guardar como favorita"}
                style={{
                  background: esFavorita ? "#fce7f3" : "transparent",
                  border: "1px solid",
                  borderColor: esFavorita ? "#f472b6" : "#fbcfe8",
                  borderRadius: "999px",
                  padding: "3px 10px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: esFavorita ? "#be185d" : "#94a3b8",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all .15s ease",
                }}
              >
                <span>{esFavorita ? "💖" : "🤍"}</span>
                <span>{esFavorita ? "Favorita" : "Guardar"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Acciones interactivas */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={handleCambiarFrase}
            className="btn-camila-secondary"
            style={{
              flex: "1 1 180px",
              background: "#ffffff",
              border: "1.5px solid #fbcfe8",
              borderRadius: "14px",
              padding: "11px 16px",
              fontSize: "13px",
              fontWeight: "700",
              color: "#be185d",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all .15s ease",
            }}
          >
            <span>🎲</span>
            <span>Otra frase inspiradora</span>
          </button>

          <button
            type="button"
            onClick={handleCerrar}
            className="btn-camila-hover"
            style={{
              flex: "1 1 200px",
              background: "linear-gradient(135deg, #e11d48 0%, #f43f5e 50%, #f97316 100%)",
              border: "none",
              borderRadius: "14px",
              padding: "11px 20px",
              fontSize: "13.5px",
              fontWeight: "800",
              color: "#ffffff",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all .2s ease",
            }}
          >
            <span>✨</span>
            <span>Comenzar mi jornada</span>
          </button>
        </div>

        {/* Pie: Opción de configuración y recordatorio */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11.5px",
            color: "#64748b",
            paddingTop: "12px",
            borderTop: "1px solid #fce7f3",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={mostrarSiempre}
              onChange={handleToggleMostrarSiempre}
              style={{ cursor: "pointer", accentColor: "#e11d48" }}
            />
            <span>Mostrar bienvenida al iniciar sesión</span>
          </label>

          <span style={{ color: "#94a3b8", fontSize: "11px" }}>
            Reabre tus frases desde el botón <strong>🌸</strong> en la barra
          </span>
        </div>
      </div>
    </div>
  );
}

export function TarjetaMotivacionalCamila({ style = {} }) {
  const [frase, setFrase] = useState(() => obtenerFraseDelDia());

  const cambiarFrase = () => {
    setFrase((prev) => obtenerFraseAleatoria(prev?.id));
  };

  const abrirModal = () => {
    window.dispatchEvent(new CustomEvent("abrir-motivacion-camila"));
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #fdf2f8 0%, #fff1f2 50%, #fef2f2 100%)",
        border: "1px solid #fbcfe8",
        borderRadius: "16px",
        padding: "16px 20px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
        boxShadow: "0 4px 14px -3px rgba(244, 114, 182, 0.15)",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: "1 1 320px" }}>
        <div
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "12px",
            background: "#ffffff",
            border: "1px solid #fbcfe8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(244, 114, 182, 0.2)",
          }}
        >
          {frase.icono || "🌸"}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", fontWeight: "800", color: "#be185d", textTransform: "uppercase", letterSpacing: ".5px" }}>
              Inspiración para María Camila
            </span>
            <span style={{ fontSize: "10.5px", background: "#ffffff", color: "#db2777", border: "1px solid #fbcfe8", borderRadius: "999px", padding: "1px 7px", fontWeight: "700" }}>
              {frase.tag}
            </span>
          </div>
          <div style={{ fontSize: "13.5px", fontWeight: "600", color: "#1e293b", marginTop: "3px", fontStyle: "italic", lineHeight: 1.45 }}>
            “{frase.frase}”
          </div>
          <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
            — {frase.autor}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={cambiarFrase}
          title="Cambiar frase inspiradora"
          style={{
            background: "#ffffff",
            border: "1px solid #fbcfe8",
            borderRadius: "10px",
            padding: "7px 12px",
            fontSize: "12px",
            fontWeight: "700",
            color: "#be185d",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            transition: "all .15s ease",
          }}
        >
          <span>🎲</span>
          <span>Otra frase</span>
        </button>

        <button
          type="button"
          onClick={abrirModal}
          title="Ver mensaje en grande con más detalles"
          style={{
            background: "linear-gradient(135deg, #e11d48 0%, #f43f5e 100%)",
            border: "none",
            borderRadius: "10px",
            padding: "7px 14px",
            fontSize: "12px",
            fontWeight: "700",
            color: "#ffffff",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            boxShadow: "0 2px 8px rgba(225, 29, 72, 0.25)",
            transition: "all .15s ease",
          }}
        >
          <span>✨</span>
          <span>Ver mensaje</span>
        </button>
      </div>
    </div>
  );
}
