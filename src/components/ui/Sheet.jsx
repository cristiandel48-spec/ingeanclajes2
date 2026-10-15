import { useEffect, useRef } from "react";
import Button from "./Button";

// Hoja / dialogo del sistema.
//
// Habia seis modales distintos, con radios 14, 16, 18 y 20, cuatro fondos
// diferentes y ninguno que cerrara con Escape ni se anunciara como dialogo.
// Este trae lo que se espera de uno:
//
// - cierra con Escape y pulsando el fondo
// - bloquea el desplazamiento de la pagina mientras esta abierto
// - devuelve el foco a donde estaba al cerrarse
// - atrapa el tabulador dentro, para no tabular a lo que hay detras
// - en el telefono sube desde abajo, como en iOS
//
// Para confirmar algo destructivo hay abajo un `SheetConfirmacion`.

const FOCALIZABLES =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function Sheet({
  abierta = true,
  onCerrar,
  titulo,
  subtitulo,
  pie,
  ancha = false,
  cerrarAlPulsarFondo = true,
  children,
  className = "",
}) {
  const cajaRef = useRef(null);
  const focoPrevioRef = useRef(null);

  useEffect(() => {
    if (!abierta) return undefined;

    focoPrevioRef.current = document.activeElement;
    const overflowAntes = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // El primer campo, o la caja, para que el lector de pantalla entre aqui.
    const primero = cajaRef.current?.querySelector(FOCALIZABLES);
    (primero || cajaRef.current)?.focus?.();

    const alPulsarTecla = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCerrar?.();
        return;
      }
      if (e.key !== "Tab") return;
      const focos = cajaRef.current?.querySelectorAll(FOCALIZABLES);
      if (!focos?.length) return;
      const primeroF = focos[0];
      const ultimo = focos[focos.length - 1];
      if (e.shiftKey && document.activeElement === primeroF) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primeroF.focus();
      }
    };

    document.addEventListener("keydown", alPulsarTecla, true);
    return () => {
      document.removeEventListener("keydown", alPulsarTecla, true);
      document.body.style.overflow = overflowAntes;
      focoPrevioRef.current?.focus?.();
    };
  }, [abierta, onCerrar]);

  if (!abierta) return null;

  return (
    <div
      className="ui-overlay"
      onMouseDown={(e) => {
        if (cerrarAlPulsarFondo && e.target === e.currentTarget) onCerrar?.();
      }}
    >
      <div
        ref={cajaRef}
        className={`ui-sheet ${ancha ? "ui-sheet--ancha" : ""} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={typeof titulo === "string" ? titulo : undefined}
        tabIndex={-1}
      >
        {(titulo || onCerrar) && (
          <div className="ui-sheet__head">
            <div style={{ flex: 1, minWidth: 0 }}>
              {titulo && <h2 className="ui-sheet__titulo">{titulo}</h2>}
              {subtitulo && <p className="ui-sheet__sub">{subtitulo}</p>}
            </div>
            {onCerrar && (
              <Button
                variante="tertiary"
                tam="sm"
                soloIcono
                icono="cerrar"
                onClick={onCerrar}
                aria-label="Cerrar"
                title="Cerrar"
                style={{ color: "var(--text-tertiary)" }}
              />
            )}
          </div>
        )}
        <div className="ui-sheet__body">{children}</div>
        {pie && <div className="ui-sheet__pie">{pie}</div>}
      </div>
    </div>
  );
}

/**
 * Confirmacion para algo que no tiene vuelta atras.
 *
 * Sustituye a los 39 window.confirm del proyecto, que son ventanas grises del
 * sistema: no dicen que programa pregunta, no se pueden leer bien en el
 * telefono y bloquean la pagina entera.
 */
export function SheetConfirmacion({
  abierta = true,
  titulo,
  mensaje,
  textoConfirmar = "Eliminar",
  textoCancelar = "Cancelar",
  destructivo = true,
  cargando = false,
  onConfirmar,
  onCerrar,
}) {
  return (
    <Sheet
      abierta={abierta}
      onCerrar={onCerrar}
      titulo={titulo}
      pie={
        <>
          <Button variante="secondary" onClick={onCerrar} disabled={cargando}>
            {textoCancelar}
          </Button>
          <Button
            variante={destructivo ? "destructive" : "primary"}
            onClick={onConfirmar}
            cargando={cargando}
          >
            {textoConfirmar}
          </Button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: 14, lineHeight: "20px", color: "var(--text-secondary)" }}>
        {mensaje}
      </p>
    </Sheet>
  );
}
