/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

// Avisos flotantes.
//
// La aplicacion confirmaba las cosas con 69 alert() del navegador: ventanas
// grises del sistema que bloquean la pagina y no dicen de donde salen. Y en
// muchos sitios no confirmaba nada, asi que la persona guardaba sin saber si
// se habia guardado.
//
// Un aviso aqui no bloquea, se va solo y, cuando la accion se puede revertir,
// trae un «Deshacer», que es mejor que preguntar antes: no estorba a quien
// acierta y salva a quien se equivoca.
//
// Uso:
//   const aviso = useToast();
//   aviso.exito("Cotización guardada");
//   aviso.error("No se pudo enviar el correo");
//   aviso.mostrar("Tarea eliminada", { accion: { label: "Deshacer", onClick: restaurar } });
//   aviso.error("Falta el acta firmada…", { posicion: "centro" });
//
// `posicion: "centro"` es para lo que frena el trabajo y hay que leer: abajo,
// junto al borde, pasaba desapercibido sobre el contenido de la pantalla.

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  // Sin proveedor no se rompe la pantalla: se registra y sigue. Un aviso que
  // falta es un fastidio; una pantalla en blanco es un problema.
  if (!ctx) {
    return {
      mostrar: (texto) => console.info("[aviso]", texto),
      exito: (texto) => console.info("[aviso]", texto),
      error: (texto) => console.warn("[aviso]", texto),
      warning: (texto) => console.warn("[aviso]", texto),
      cerrar: () => {},
    };
  }
  return ctx;
}

let contador = 0;

function Toast({ aviso, onCerrar }) {
  const { texto, tono, accion, duracion } = aviso;
  // El temporizador se arma una sola vez por aviso, pero tiene que cerrar con
  // la funcion actual, no con la del primer render. Se guarda en un ref, y se
  // actualiza en un efecto: tocarlo durante el render descoloca a React.
  const cerrarRef = useRef(onCerrar);
  useEffect(() => { cerrarRef.current = onCerrar; }, [onCerrar]);

  useEffect(() => {
    if (!duracion) return undefined;
    const t = setTimeout(() => cerrarRef.current?.(), duracion);
    return () => clearTimeout(t);
  }, [duracion]);

  return (
    <div className={`ui-toast ui-toast--${tono}`} role={tono === "error" ? "alert" : "status"}>
      <span className="ui-toast__dot" aria-hidden="true" />
      <span className="ui-toast__texto">{texto}</span>
      {accion && (
        <button
          type="button"
          className="ui-toast__accion"
          onClick={() => { accion.onClick?.(); onCerrar?.(); }}
        >
          {accion.label}
        </button>
      )}
    </div>
  );
}

export function ToastProvider({ children }) {
  const [avisos, setAvisos] = useState([]);

  const cerrar = useCallback((id) => {
    setAvisos((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const mostrar = useCallback((texto, opciones = {}) => {
    const id = ++contador;
    const { tono = "neutro", accion, duracion, posicion = "abajo" } = opciones;
    setAvisos((prev) => [
      // Mas de tres a la vez tapan la pantalla; se queda con los ultimos.
      ...prev.slice(-2),
      {
        id,
        texto,
        tono,
        accion,
        posicion,
        // Con «Deshacer» se da mas tiempo: hay que leerlo y decidir.
        duracion: duracion ?? (accion ? 7000 : tono === "error" ? 8000 : 4000),
      },
    ]);
    return id;
  }, []);

  const valor = useMemo(() => ({
    mostrar,
    exito: (texto, opciones) => mostrar(texto, { ...opciones, tono: "exito" }),
    error: (texto, opciones) => mostrar(texto, { ...opciones, tono: "error" }),
    warning: (texto, opciones) => mostrar(texto, { ...opciones, tono: "warning" }),
    cerrar,
  }), [mostrar, cerrar]);

  return (
    <ToastContext.Provider value={valor}>
      {children}
      {avisos.some((a) => a.posicion !== "centro") && (
        <div className="ui-toaster" aria-live="polite">
          {avisos.filter((a) => a.posicion !== "centro").map((a) => (
            <Toast key={a.id} aviso={a} onCerrar={() => cerrar(a.id)} />
          ))}
        </div>
      )}
      {avisos.some((a) => a.posicion === "centro") && (
        <div className="ui-toaster ui-toaster--centro" aria-live="assertive">
          {avisos.filter((a) => a.posicion === "centro").map((a) => (
            <Toast key={a.id} aviso={a} onCerrar={() => cerrar(a.id)} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
