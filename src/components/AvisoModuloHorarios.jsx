import { useMemo, useState } from "react";
import { Icono } from "./ui";
import { useAppData } from "../context/AppDataContext";
import {
  CLAVE_AVISO_HORARIOS,
  claveAvisoUsuario,
  guardarMarcaAviso,
  leerMarcaAviso,
  personaDestinoAviso,
} from "../lib/avisosModulos";
import { puedeVer } from "../lib/permisos";
import { FUENTE } from "../styles/designTokens";

/**
 * Aviso de bienvenida con recorrido interactivo para presentar las mejoras del
 * modulo de Horarios a Paola Escobar, Richard Buelvas, Camila Sepulveda y
 * Cristian Florez al iniciar sesion.
 *
 * «Ahora no» lo oculta solo durante la sesion actual (vuelve a recordar al
 * volver a entrar). Al completar el recorrido y tocar «Ir a Horarios ahora»
 * (o «Ya lo vi»), queda marcado como visto en localStorage.
 */

const AZUL = "#2A3B8F";
const ACENTO_SUAVE = "#EEF2FF";

const PASOS = [
  {
    icono: "reloj",
    etiqueta: "Nuevo · Módulo de Horarios",
    titulo: (nombre) => `${nombre}, mira lo nuevo en Horarios: ahora ahorras tiempo desde el celular`,
    texto:
      "Rediseñamos el módulo de Horarios para que puedas programar la cuadrilla del día en segundos desde el celular o el computador, sin depender de Excel y sin volver a escribir la misma información en otras pantallas. Haz este recorrido rápido y empieza a sacarle provecho hoy mismo.",
    destacados: [
      { icono: "telefono", titulo: "Pensado para el celular", detalle: "Tarjetas limpias, sin zoom ni tablas incómodas" },
      { icono: "enviar", titulo: "1 toque a WhatsApp", detalle: "Imagen lista del día para enviar al grupo" },
      { icono: "obra", titulo: "Conectado a la obra", detalle: "Alimenta obras, informes y acta automáticamente" },
    ],
  },
  {
    icono: "calendario",
    etiqueta: "Paso 1 de 3 · Más rápido desde el celular",
    titulo: () => "Programa el día en segundos, sin volver a armar el Excel",
    lista: [
      ["cuadricula", "Cómodo en celular y computador:", "en el teléfono se adapta en tarjetas claras estilo Apple y en el computador conserva la planilla azul de siempre."],
      ["reloj", "Hora, fecha y personal en un toque:", "agrega cliente, actividad, cantidades, trabajadores, punto de encuentro y hora sin perder tiempo."],
      ["mas", "Copia el día anterior:", "si la cuadrilla sigue en la misma obra, duplica el horario con un clic y ajusta solo lo que cambie."],
      ["camara", "Vista previa en vivo para WhatsApp:", "ves al instante la imagen exacta del día y la compartes directo al grupo."],
    ],
  },
  {
    icono: "obra",
    etiqueta: "Paso 2 de 3 · Cero doble trabajo",
    titulo: () => "Lo que llenas en Horarios alimenta solo el resto del sistema",
    lista: [
      ["usuario", "Ejecución de obra (Personal y Horario):", "cada trabajador que programes queda asignado automáticamente en la obra, junto con su fecha, hora, actividad y cantidades."],
      ["documento", "Bitácora e Informes de actividades:", "al asignar el personal desde Horarios, la bitácora de obra queda lista para registrar avances y agilizar tus informes de actividades."],
      ["check", "Acta de entrega y Nómina por obra:", "los días trabajados y los colaboradores que estuvieron en sitio viajan automáticamente al cálculo de nómina proporcional y al Acta de entrega."],
      ["lapiz", "Siempre sincronizado:", "si cambias o quitas un trabajador en Horarios, la obra se actualiza sola para evitar errores."],
    ],
  },
  {
    icono: "enviar",
    etiqueta: "Paso 3 de 3 · Empieza hoy mismo",
    titulo: () => "Pruébalo en tu próxima programación del día",
    lista: [
      ["1", "Entra a Horarios", "desde el menú izquierdo (el ícono del reloj) o tocando el botón de abajo."],
      ["2", "Elige la obra y los trabajadores", "en la planilla «Actividades y clientes»: cada cambio se guarda automáticamente."],
      ["3", "Envía la imagen al grupo", "desde «Imagen del horario del día» con un solo toque en «Enviar por WhatsApp»."],
    ],
    nota: "Úsalo desde hoy: entre más programemos la operación aquí, menos tiempo perdemos pasando datos a mano entre Excel, obras e informes.",
  },
];

export default function AvisoModuloHorarios({ onIrAHorarios, onCerrado }) {
  const { membresia, authUserEmail } = useAppData();
  const nombre = useMemo(() => personaDestinoAviso(membresia, authUserEmail), [membresia, authUserEmail]);
  const tieneAcceso = puedeVer(membresia, "horarios");

  const clave = claveAvisoUsuario(CLAVE_AVISO_HORARIOS, membresia, authUserEmail, nombre);
  const [cerrado, setCerrado] = useState(false);
  const [paso, setPaso] = useState(0);

  const mostrar =
    Boolean(nombre) &&
    tieneAcceso &&
    !cerrado &&
    !leerMarcaAviso(localStorage, clave) &&
    !leerMarcaAviso(sessionStorage, clave);

  if (!mostrar) return null;

  const actual = PASOS[paso];
  const esUltimo = paso === PASOS.length - 1;

  const ahoraNo = () => {
    guardarMarcaAviso(sessionStorage, clave);
    setCerrado(true);
    onCerrado?.();
  };

  const noMostrarMas = () => {
    guardarMarcaAviso(localStorage, clave);
    setCerrado(true);
    onCerrado?.();
  };

  const irAHorarios = () => {
    guardarMarcaAviso(localStorage, clave);
    setCerrado(true);
    onCerrado?.();
    onIrAHorarios?.();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-aviso-horarios"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2450,
        background: "rgba(15, 23, 42, 0.56)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
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
          maxWidth: 640,
          maxHeight: "calc(100dvh - 32px)",
          overflowY: "auto",
          background: "var(--surface, #ffffff)",
          color: "var(--text-primary, #1d1d1f)",
          borderRadius: 26,
          border: "1px solid var(--separator, #e2e8f0)",
          boxShadow: "0 30px 80px -16px rgba(15, 23, 42, 0.45)",
          boxSizing: "border-box",
        }}
      >
        {/* Cabecera azul/indigo armonizada con la planilla de Horarios */}
        <div
          style={{
            background: "linear-gradient(135deg, #2A3B8F 0%, #4F46E5 55%, #5856D6 100%)",
            padding: "30px 26px 26px",
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
              width: 34,
              height: 34,
              borderRadius: "50%",
              border: "none",
              background: "rgba(255,255,255,0.2)",
              color: "#ffffff",
              fontSize: 18,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ×
          </button>

          <div
            style={{
              width: 60,
              height: 60,
              margin: "0 auto 14px",
              borderRadius: 18,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icono nombre={actual.icono} size={30} strokeWidth={1.9} />
          </div>

          <div
            style={{
              display: "inline-block",
              background: "rgba(255,255,255,0.18)",
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
            id="titulo-aviso-horarios"
            style={{
              margin: "12px 0 0",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.22,
              textWrap: "balance",
            }}
          >
            {actual.titulo(nombre)}
          </h2>
        </div>

        <div style={{ padding: "22px 24px 20px" }}>
          {actual.texto && (
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--text-secondary, #475467)" }}>
              {actual.texto}
            </p>
          )}

          {actual.destacados && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
                marginTop: 18,
              }}
            >
              {actual.destacados.map((item) => (
                <div
                  key={item.titulo}
                  style={{
                    background: "var(--surface-subtle, #f8fafc)",
                    border: "1px solid var(--separator, #eaecf0)",
                    borderRadius: 14,
                    padding: "12px 13px",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background: ACENTO_SUAVE,
                      color: AZUL,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Icono nombre={item.icono} size={16} />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary, #101828)" }}>
                    {item.titulo}
                  </div>
                  <div style={{ fontSize: 12.5, lineHeight: 1.45, color: "var(--text-tertiary, #667085)", marginTop: 3 }}>
                    {item.detalle}
                  </div>
                </div>
              ))}
            </div>
          )}

          {actual.lista && (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
              {actual.lista.map(([marca, fuerte, resto]) => {
                const esNumero = /^[0-9]+$/.test(marca);
                return (
                  <li key={fuerte} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span
                      style={{
                        flexShrink: 0,
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: ACENTO_SUAVE,
                        color: AZUL,
                        fontWeight: 700,
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {esNumero ? marca : <Icono nombre={marca} size={17} />}
                    </span>
                    <span style={{ fontSize: 14.5, lineHeight: 1.5, color: "var(--text-secondary, #475467)", paddingTop: 4 }}>
                      <strong style={{ color: "var(--text-primary, #101828)" }}>{fuerte}</strong> {resto}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {actual.nota && (
            <div
              style={{
                marginTop: 16,
                padding: "11px 14px",
                borderRadius: 12,
                background: ACENTO_SUAVE,
                color: AZUL,
                fontSize: 13,
                lineHeight: 1.5,
                fontWeight: 500,
              }}
            >
              {actual.nota}
            </div>
          )}

          {/* Indicador de progreso */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20 }}>
            {PASOS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Ir al paso ${i + 1}`}
                onClick={() => setPaso(i)}
                style={{
                  width: i === paso ? 24 : 8,
                  height: 8,
                  padding: 0,
                  border: "none",
                  borderRadius: 999,
                  background: i === paso ? AZUL : "var(--separator, #d0d5dd)",
                  cursor: "pointer",
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
              paddingTop: 14,
              borderTop: "1px solid var(--separator, #e2e8f0)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                type="button"
                onClick={paso === 0 ? ahoraNo : () => setPaso(paso - 1)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-tertiary, #667085)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "8px 4px",
                }}
              >
                {paso === 0 ? "Ahora no" : "← Atrás"}
              </button>
              {esUltimo && (
                <button
                  type="button"
                  onClick={noMostrarMas}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--text-tertiary, #667085)",
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: "8px 4px",
                  }}
                >
                  Ya lo vi
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={esUltimo ? irAHorarios : () => setPaso(paso + 1)}
              style={{
                background: AZUL,
                color: "#ffffff",
                border: "none",
                borderRadius: 980,
                padding: "12px 22px",
                fontSize: 14.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 6px 18px rgba(42, 59, 143, 0.28)",
              }}
            >
              {esUltimo ? "Ir a Horarios ahora →" : paso === 0 ? "Ver el recorrido →" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
