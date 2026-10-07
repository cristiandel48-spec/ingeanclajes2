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
        background: "rgba(35, 30, 24, 0.65)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        animation: "fadeInCamilaBeige .25s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleCerrar();
      }}
    >
      <style>{`
        @keyframes fadeInCamilaBeige {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes quoteFadeBeige {
          0% { opacity: 0.2; transform: translateY(5px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .btn-camila-beige-prim:hover {
          background: #6f4e34 !important;
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(111, 78, 52, 0.28) !important;
        }
        .btn-camila-beige-sec:hover {
          background: #f5efe6 !important;
          border-color: #cbbaa5 !important;
          color: #5c3e27 !important;
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reflexión y fortaleza para María Camila"
        style={{
          width: "100%",
          maxWidth: "530px",
          background: "linear-gradient(160deg, #fdfbf7 0%, #fbf8f2 50%, #f6f0e6 100%)",
          borderRadius: "24px",
          border: "1.5px solid #ded3c4",
          boxShadow: "0 25px 60px -12px rgba(90, 65, 42, 0.22), 0 10px 24px rgba(45, 35, 25, 0.08)",
          padding: "28px 26px 22px",
          position: "relative",
          boxSizing: "border-box",
          color: "#2c231a",
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        }}
      >
        {/* Botón cerrar X */}
        <button
          onClick={handleCerrar}
          aria-label="Cerrar ventana de reflexión"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "1px solid #ded3c4",
            background: "#ffffff",
            color: "#8c7b6c",
            fontSize: "15px",
            fontWeight: "700",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all .15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#5c3e27";
            e.currentTarget.style.background = "#f5efe6";
            e.currentTarget.style.borderColor = "#cbb9a3";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#8c7b6c";
            e.currentTarget.style.background = "#ffffff";
            e.currentTarget.style.borderColor = "#ded3c4";
          }}
        >
          ✕
        </button>

        {/* Encabezado: Saludo y Bienvenida */}
        <div style={{ textAlign: "center", marginBottom: "18px" }}>
          {/* Badge superior sobrio y femenino en beige suave */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "#f3ede3",
              border: "1px solid #dfd4c5",
              borderRadius: "999px",
              padding: "4px 14px",
              fontSize: "11px",
              fontWeight: "700",
              color: "#735339",
              letterSpacing: ".03em",
              textTransform: "uppercase",
              marginBottom: "10px",
            }}
          >
            <span>🕊️</span>
            <span>Espacio de Vida & Paz · María Camila</span>
          </div>

          <h2
            style={{
              margin: "0 0 6px",
              fontSize: "23px",
              fontWeight: "800",
              color: "#2c2219",
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
              color: "#6e5d4d",
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
              color: "#8e7c6d",
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <span>📅</span>
            <span>{fechaHoy}</span>
          </div>
        </div>

        {/* Tarjeta de Frase Motivacional en Marfil y Beige */}
        <div
          style={{
            position: "relative",
            background: "#ffffff",
            borderRadius: "18px",
            border: "1px solid #ded3c4",
            boxShadow: "0 8px 22px -6px rgba(120, 90, 60, 0.1)",
            padding: "22px 24px 18px",
            marginBottom: "18px",
            overflow: "hidden",
            animation: animando ? "none" : "quoteFadeBeige .3s ease-out",
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
              color: "rgba(180, 150, 120, 0.14)",
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
                marginBottom: "12px",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "700",
                  color: "#6e4f35",
                  background: "#f7f2ea",
                  border: "1px solid #ded3c4",
                  borderRadius: "6px",
                  padding: "2px 9px",
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
                  color: "#998777",
                  fontWeight: "600",
                }}
              >
                Mensaje {fraseActual.id} de {FRASES_MOTIVACIONALES_CAMILA.length}
              </span>
            </div>

            {/* Texto de la frase */}
            <p
              style={{
                margin: "0 0 14px",
                fontSize: "15px",
                fontWeight: "600",
                color: "#281f16",
                lineHeight: "1.7",
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
                borderTop: "1px dashed #e8ded2",
                fontSize: "12px",
              }}
            >
              <div style={{ color: "#746353", fontWeight: "600" }}>
                — <span style={{ color: "#8d6443", fontWeight: "700" }}>{fraseActual.autor}</span>
              </div>

              <button
                type="button"
                onClick={handleToggleFavorita}
                title={esFavorita ? "Quitar de mis favoritas" : "Guardar como favorita"}
                style={{
                  background: esFavorita ? "#f4ece0" : "transparent",
                  border: "1px solid",
                  borderColor: esFavorita ? "#cbb8a3" : "#ded3c4",
                  borderRadius: "999px",
                  padding: "3px 10px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: esFavorita ? "#6e4f35" : "#998777",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all .15s ease",
                }}
              >
                <span>{esFavorita ? "🤍" : "♡"}</span>
                <span>{esFavorita ? "Guardada" : "Guardar"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Acciones interactivas sobrias */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={handleCambiarFrase}
            className="btn-camila-beige-sec"
            style={{
              flex: "1 1 180px",
              background: "#ffffff",
              border: "1.5px solid #ded3c4",
              borderRadius: "12px",
              padding: "11px 16px",
              fontSize: "13px",
              fontWeight: "700",
              color: "#6e4f35",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all .15s ease",
            }}
          >
            <span>🕊️</span>
            <span>Otra reflexión de vida</span>
          </button>

          <button
            type="button"
            onClick={handleCerrar}
            className="btn-camila-beige-prim"
            style={{
              flex: "1 1 200px",
              background: "linear-gradient(135deg, #87654b 0%, #6f4e34 100%)",
              border: "none",
              borderRadius: "12px",
              padding: "11px 20px",
              fontSize: "13.5px",
              fontWeight: "700",
              color: "#ffffff",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              boxShadow: "0 4px 14px rgba(111, 78, 52, 0.22)",
              transition: "all .2s ease",
            }}
          >
            <span>✨</span>
            <span>Continuar con serenidad</span>
          </button>
        </div>

        {/* Pie: Opción de configuración y recordatorio */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "11.5px",
            color: "#746353",
            paddingTop: "12px",
            borderTop: "1px solid #ebd9c8",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={mostrarSiempre}
              onChange={handleToggleMostrarSiempre}
              style={{ cursor: "pointer", accentColor: "#7d5c40" }}
            />
            <span>Mostrar reflexión al iniciar sesión</span>
          </label>

          <span style={{ color: "#998777", fontSize: "11px" }}>
            Reabre tus palabras de vida desde el botón <strong>🕊️</strong> en la barra
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
        background: "linear-gradient(135deg, #faf7f2 0%, #f6f0e6 60%, #f0e6d6 100%)",
        border: "1.5px solid #ded3c4",
        borderRadius: "16px",
        padding: "16px 20px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
        boxShadow: "0 4px 14px -3px rgba(120, 90, 60, 0.1)",
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
            border: "1px solid #ded3c4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            flexShrink: 0,
            boxShadow: "0 2px 6px rgba(120, 90, 60, 0.12)",
          }}
        >
          {frase.icono || "🕊️"}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "11px", fontWeight: "800", color: "#6e4f35", textTransform: "uppercase", letterSpacing: ".5px" }}>
              Palabras de vida y esperanza · Camila
            </span>
            <span style={{ fontSize: "10.5px", background: "#ffffff", color: "#7a593c", border: "1px solid #ded3c4", borderRadius: "999px", padding: "1px 8px", fontWeight: "700" }}>
              {frase.tag}
            </span>
          </div>
          <div style={{ fontSize: "13.5px", fontWeight: "600", color: "#2c2219", marginTop: "3px", fontStyle: "italic", lineHeight: 1.5 }}>
            “{frase.frase}”
          </div>
          <div style={{ fontSize: "11px", color: "#746353", marginTop: "2px" }}>
            — {frase.autor}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
        <button
          type="button"
          onClick={cambiarFrase}
          title="Cambiar reflexión"
          style={{
            background: "#ffffff",
            border: "1px solid #ded3c4",
            borderRadius: "10px",
            padding: "7px 12px",
            fontSize: "12px",
            fontWeight: "700",
            color: "#6e4f35",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            transition: "all .15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#f7f2ea";
            e.currentTarget.style.borderColor = "#cbb9a3";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#ffffff";
            e.currentTarget.style.borderColor = "#ded3c4";
          }}
        >
          <span>🕊️</span>
          <span>Otra frase</span>
        </button>

        <button
          type="button"
          onClick={abrirModal}
          title="Ver mensaje en grande con más detalles"
          style={{
            background: "linear-gradient(135deg, #87654b 0%, #6f4e34 100%)",
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
            boxShadow: "0 2px 8px rgba(111, 78, 52, 0.22)",
            transition: "all .15s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#5c3e27";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "linear-gradient(135deg, #87654b 0%, #6f4e34 100%)";
          }}
        >
          <span>✨</span>
          <span>Ver mensaje</span>
        </button>
      </div>
    </div>
  );
}
