import { createContext, createElement, useContext, useEffect, useState } from "react";

// Deja que la pantalla abierta ponga un boton en la barra superior, al lado
// del indicador de "Guardado".
//
// Nace del formulario de cotizacion: es largo, el boton de guardar quedaba
// arriba del todo y para guardar habia que volver a subir. Ahora vive fijo en
// la barra, que ya esta siempre a la vista.
//
// Va en un archivo .js y el proveedor se arma con createElement en vez de JSX
// para no mezclar componentes y hooks en el mismo modulo, que rompe la recarga
// en caliente.

const Contexto = createContext({ acciones: null, setAcciones: () => {} });

export function AccionesPantallaProvider({ children }) {
  const [acciones, setAcciones] = useState(null);
  return createElement(Contexto.Provider, { value: { acciones, setAcciones } }, children);
}

/** Lo usa la barra superior para pintar lo que haya publicado la pantalla. */
export function useAccionesTopbar() {
  return useContext(Contexto).acciones;
}

/**
 * Publica los botones en la barra superior mientras la pantalla este montada.
 *
 * `dependencias` funciona como en useEffect: hay que incluir lo que use el
 * boton por dentro, o se quedaria llamando a una version vieja de la funcion.
 */
export function useAccionesPantalla(contenido, dependencias = []) {
  const { setAcciones } = useContext(Contexto);
  useEffect(() => {
    setAcciones(contenido);
    return () => setAcciones(null);
    // El contenido es JSX nuevo en cada render; ponerlo como dependencia
    // dejaria el efecto corriendo sin parar. Se confia en lo que declare la
    // pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);
}
