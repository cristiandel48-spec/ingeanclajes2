import { useMemo, useState } from "react";
import { Icono } from "./ui";
import { useAppData } from "../context/AppDataContext";
import {
  CLAVE_AVISO_INVENTARIO,
  claveAvisoUsuario,
  guardarMarcaAviso,
  leerMarcaAviso,
  personaDestinoAviso,
} from "../lib/avisosModulos";
import { puedeVer } from "../lib/permisos";
import { FUENTE } from "../styles/designTokens";

/**
 * Aviso de bienvenida con recorrido interactivo para presentar el modulo de
 * Inventario a Paola Escobar, Richard Buelvas, Camila Sepulveda y Cristian
 * Florez al iniciar sesion, con la misma dinamica Apple de AvisoModuloHorarios.
 *
 * «Ahora no» lo oculta solo durante la sesion actual (vuelve a salir al volver
 * a entrar). Al completar el recorrido y tocar «Ir a Inventario ahora» o
 * «Ya lo vi», queda marcado como visto en localStorage.
 */

const VERDE = "#00A878";
const VERDE_SUAVE = "#E6F7F1";

const PASOS = [
  {
    icono: "obra",
    etiqueta: "Nuevo · Módulo de Inventario",
    titulo: (nombre) => `${nombre}, ya está listo el módulo de Inventario de bienes`,
    texto:
      "Implementamos el módulo de Inventario para que todos los bienes de Ingeanclajes —equipos de alturas, herramientas, arneses, líneas de vida, vehículos y equipos de oficina— queden controlados en un solo lugar desde el celular o el computador. Haz este recorrido rápido y empieza a usarlo hoy.",
    destacados: [
      { icono: "camara", titulo: "Con foto y ficha", detalle: "Código, serial, valor, estado y evidencia" },
      { icono: "usuario", titulo: "Responsable claro", detalle: "Sabes en segundos quién tiene cada equipo" },
      { icono: "reloj", titulo: "Alertas a tiempo", detalle: "Control automático de calibraciones por vencer" },
    ],
  },
  {
    icono: "cuadricula",
    etiqueta: "Paso 1 de 3 · Qué puedes gestionar",
    titulo: () => "Todo lo que tiene la empresa, siempre a la mano",
    lista: [
      ["mas", "Registrar cada bien:", "con su categoría, código consecutivo automático (INV-001), marca, serial, cantidad, valor y foto."],
      ["usuario", "Asignar responsable u obra:", "vincula cada equipo con un trabajador, una obra en ejecución o una ubicación física."],
      ["calendario", "Controlar calibraciones y mantenimiento:", "el sistema avisa cuáles equipos están vigentes, próximos a vencer (30 días) o vencidos."],
      ["descargar", "Exportar a Excel y CSV:", "descarga el inventario completo con listado detallado y subtotales por categoría en un clic."],
    ],
  },
  {
    icono: "escudo",
    etiqueta: "Paso 2 de 3 · Orden y trazabilidad sin perder historia",
    titulo: () => "Control real de pérdidas, daños y estado de equipos",
    lista: [
      ["buscar", "Búsqueda y filtros instantáneos:", "encuentra cualquier bien por nombre, código, serial, categoría, estado o responsable sin buscar en hojas sueltas."],
      ["alerta", "Semáforo de atención:", "ves arriba de un vistazo cuántos bienes requieren mantenimiento, recalibración o revisión."],
      ["documento", "Dar de baja con soporte:", "cuando un equipo se daña, se pierde o sale de uso, se da de baja con motivo sin borrar su historial."],
      ["telefono", "Cómodo desde el celular:", "consulta o registra bienes directo desde bodega o en obra sin esperar a llegar a la oficina."],
    ],
  },
  {
    icono: "check",
    etiqueta: "Paso 3 de 3 · Empieza hoy mismo",
    titulo: () => "Entra y registra o revisa el inventario",
    lista: [
      ["1", "Abre Inventario", "en el menú izquierdo, justo debajo de «Personal y empleados»."],
      ["2", "Toca «Nuevo bien»", "y registra el equipo con los datos y la foto que tengas a la mano."],
      ["3", "Usa los filtros y el botón Excel", "para revisar totales por categoría o equipos por calibrar."],
    ],
    nota: "Úsalo desde hoy: tener el inventario al día evita pérdidas de herramienta, retrasos en obra y vencimientos de calibración por sorpresa.",
  },
];

export default function AvisoModuloInventario({ onIrAInventario, pausado = false }) {
  const { membresia, authUserEmail } = useAppData();
  const nombre = useMemo(() => personaDestinoAviso(membresia, authUserEmail), [membresia, authUserEmail]);
  const tieneAcceso = puedeVer(membresia, "inventario");

  const clave = claveAvisoUsuario(CLAVE_AVISO_INVENTARIO, membresia, authUserEmail, nombre);
  const [cerrado, setCerrado] = useState(false);
  const [paso, setPaso] = useState(0);

  const mostrar =
    !pausado &&
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
  };

  const noMostrarMas = () => {
    guardarMarcaAviso(localStorage, clave);
    setCerrado(true);
  };

  const irAInventario = () => {
    guardarMarcaAviso(localStorage, clave);
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
        {/* Cabecera verde/turquesa armonizada con el icono de Inventario */}
        <div
          style={{
            background: `linear-gradient(135deg, ${VERDE} 0%, #0D9488 55%, #0EA5E9 100%)`,
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
            id="titulo-aviso-inventario"
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
                      background: VERDE_SUAVE,
                      color: VERDE,
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
                        background: VERDE_SUAVE,
                        color: VERDE,
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
                background: VERDE_SUAVE,
                color: "#027A48",
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
                  background: i === paso ? VERDE : "var(--separator, #d0d5dd)",
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
              onClick={esUltimo ? irAInventario : () => setPaso(paso + 1)}
              style={{
                background: VERDE,
                color: "#ffffff",
                border: "none",
                borderRadius: 980,
                padding: "12px 22px",
                fontSize: 14.5,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                boxShadow: "0 6px 18px rgba(0, 168, 120, 0.28)",
              }}
            >
              {esUltimo ? "Ir a Inventario ahora →" : paso === 0 ? "Ver el recorrido →" : "Siguiente →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
