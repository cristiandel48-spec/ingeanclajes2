import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { esUsuarioCamila, esUsuarioCristian } from "../lib/agendaEspecial";
import { puedeVer } from "../lib/permisos";
import { FUENTE } from "../styles/designTokens";

/**
 * Aviso grande para presentar el modulo de Inventario a Paola Escobar,
 * Richard Buelvas y Camila Sepulveda.
 *
 * Sale al abrir el programa y los lleva en un recorrido corto de tres pasos
 * hasta el modulo. «Ahora no» lo esconde solo en esta sesion: vuelve a salir
 * la proxima vez que abran el programa. Deja de salir para siempre cuando
 * entran a Inventario (desde el aviso o por el menu).
 */

const CLAVE = "ingeanclajes_aviso_inventario_v1";
const VERDE = "#00A878";

function personaDestino(membresia, authUserEmail) {
  if (!membresia || membresia.activo === false) return null;
  if (esUsuarioCristian(membresia, authUserEmail)) return null;
  const email = String(membresia.email || authUserEmail || "").toLowerCase();
  const nombre = String(membresia.nombre || "").toLowerCase();
  const texto = `${nombre} ${email}`;
  if (texto.includes("paola") || texto.includes("escobar")) return "Paola";
  if (texto.includes("richard") || texto.includes("buelvas")) return "Richard";
  if (esUsuarioCamila(membresia, authUserEmail)) return "Camila";
  return null;
}

function leer(almacen, clave) {
  try {
    return almacen.getItem(clave) === "1";
  } catch {
    return false;
  }
}

function guardar(almacen, clave) {
  try {
    almacen.setItem(clave, "1");
  } catch {
    // Sin almacenamiento disponible: el aviso se cierra igual en pantalla.
  }
}

const PASOS = [
  {
    icono: "📦",
    etiqueta: "Nuevo en el programa",
    titulo: (nombre) => `${nombre}, ya está listo el módulo de Inventario`,
    texto:
      "Ahora todos los bienes de Ingeanclajes —equipos, herramientas, arneses, líneas de vida, vehículos y equipos de oficina— quedan registrados en un solo lugar. Te mostramos en un minuto cómo funciona.",
  },
  {
    icono: "🧭",
    etiqueta: "Paso 1 de 2 · Qué puedes hacer",
    titulo: () => "Todo lo que tiene la empresa, a la mano",
    lista: [
      ["➕", "Registrar cada bien", "con su categoría, código, cantidad, valor y foto."],
      ["👷", "Asignar un responsable", "para saber siempre quién tiene cada equipo."],
      ["📅", "Controlar la calibración", "y ver qué equipos están por vencer."],
      ["🗂️", "Dar de baja", "lo que se daña o se pierde, sin borrar su historia."],
      ["📊", "Exportar a Excel", "el inventario completo con sus totales."],
    ],
  },
  {
    icono: "🚀",
    etiqueta: "Paso 2 de 2 · Cómo empezar",
    titulo: () => "Entra y registra tu primer bien",
    lista: [
      ["1", "Abre Inventario", "en el menú de la izquierda, justo debajo de «Personal y empleados»."],
      ["2", "Toca «Nuevo bien»", "y llena los datos que tengas a la mano."],
      ["3", "Explora los filtros", "por categoría y estado, y el buscador."],
    ],
    nota: "Puedes volver a este módulo cuando quieras desde el menú.",
  },
];

export default function AvisoModuloInventario({ scr, onIrAInventario }) {
  const { membresia, authUserEmail } = useAppData();
  const nombre = useMemo(() => personaDestino(membresia, authUserEmail), [membresia, authUserEmail]);
  const tieneAcceso = puedeVer(membresia, "inventario");

  const clave = nombre ? `${CLAVE}:${String(membresia?.email || authUserEmail || nombre).toLowerCase()}` : "";
  const [cerrado, setCerrado] = useState(false);
  const [paso, setPaso] = useState(0);

  // Si entra a Inventario por su cuenta, ya conoce el modulo: no se repite.
  useEffect(() => {
    if (clave && scr === "inventario") {
      guardar(localStorage, clave);
    }
  }, [clave, scr]);

  const mostrar =
    Boolean(nombre) &&
    tieneAcceso &&
    !cerrado &&
    scr !== "inventario" &&
    !leer(localStorage, clave) &&
    !leer(sessionStorage, clave);

  if (!mostrar) return null;

  const actual = PASOS[paso];
  const esUltimo = paso === PASOS.length - 1;

  const ahoraNo = () => {
    guardar(sessionStorage, clave);
    setCerrado(true);
  };

  const irAInventario = () => {
    guardar(localStorage, clave);
    setCerrado(true);
    onIrAInventario?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-aviso-inventario"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2400,
        background: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        fontFamily: FUENTE,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 620,
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          background: "var(--surface, #ffffff)",
          color: "var(--text-primary, #1d1d1f)",
          borderRadius: 26,
          border: "1px solid var(--separator, #e2e8f0)",
          boxShadow: "0 30px 80px -16px rgba(15, 23, 42, 0.45)",
          boxSizing: "border-box",
        }}
      >
        {/* Cabecera verde con el icono del modulo */}
        <div
          style={{
            background: `linear-gradient(135deg, ${VERDE} 0%, #0EA5E9 100%)`,
            padding: "34px 28px 28px",
            color: "#ffffff",
            textAlign: "center",
            position: "relative",
          }}
        >
          <button
            type="button"
            onClick={ahoraNo}
            aria-label="Cerrar por ahora"
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.22)",
              color: "#ffffff",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ×
          </button>
          <div style={{ fontSize: 64, lineHeight: 1, marginBottom: 12 }}>{actual.icono}</div>
          <div
            style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.2)",
              borderRadius: 999,
              padding: "4px 12px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {actual.etiqueta}
          </div>
          <h2
            id="titulo-aviso-inventario"
            style={{
              margin: "14px 0 0",
              fontSize: 28,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
            }}
          >
            {actual.titulo(nombre)}
          </h2>
        </div>

        <div style={{ padding: "24px 28px 22px" }}>
          {actual.texto && (
            <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "var(--text-secondary, #475467)" }}>
              {actual.texto}
            </p>
          )}

          {actual.lista && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {actual.lista.map(([marca, fuerte, resto]) => (
                <li key={fuerte} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span
                    style={{
                      flexShrink: 0,
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      background: "#E6F7F1",
                      color: VERDE,
                      fontWeight: 800,
                      fontSize: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {marca}
                  </span>
                  <span style={{ fontSize: 15, lineHeight: 1.5, color: "var(--text-secondary, #475467)", paddingTop: 6 }}>
                    <strong style={{ color: "var(--text-primary, #1d1d1f)" }}>{fuerte}</strong> {resto}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {actual.nota && (
            <p style={{ margin: "16px 0 0", fontSize: 13, color: "var(--text-tertiary, #667085)" }}>{actual.nota}</p>
          )}

          {/* Puntos de avance */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 22 }}>
            {PASOS.map((_, i) => (
              <span
                key={i}
                style={{
                  width: i === paso ? 22 : 8,
                  height: 8,
                  borderRadius: 999,
                  background: i === paso ? VERDE : "var(--separator, #d0d5dd)",
                  transition: "all 0.2s ease",
                }}
              />
            ))}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid var(--separator, #e2e8f0)",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={paso === 0 ? ahoraNo : () => setPaso(paso - 1)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-tertiary, #667085)",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                padding: "10px 4px",
              }}
            >
              {paso === 0 ? "Ahora no" : "← Atrás"}
            </button>
            <button
              type="button"
              onClick={esUltimo ? irAInventario : () => setPaso(paso + 1)}
              style={{
                background: VERDE,
                color: "#ffffff",
                border: "none",
                borderRadius: 12,
                padding: "13px 24px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 4px 14px rgba(0, 168, 120, 0.35)",
              }}
            >
              {esUltimo ? "Entrar a Inventario →" : paso === 0 ? "Hacer el recorrido →" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
