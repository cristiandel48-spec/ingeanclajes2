import { useCallback, useSyncExternalStore } from "react";

// Lee una media query del navegador y se re-renderiza al cambiar el tamano
// o la orientacion. Se usa useSyncExternalStore porque matchMedia es estado
// externo a React: asi el primer render ya trae el valor correcto y no hay
// un parpadeo de escritorio a movil.
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      // Safari anterior a 14 solo implementa addListener.
      if (mql.addEventListener) mql.addEventListener("change", onChange);
      else mql.addListener(onChange);
      // Respaldo: algunos entornos (emuladores, ciertos WebView) cambian el
      // viewport sin emitir "change". React descarta el re-render si el
      // valor no cambio, asi que escuchar resize no cuesta nada.
      window.addEventListener("resize", onChange);
      window.addEventListener("orientationchange", onChange);
      return () => {
        if (mql.removeEventListener) mql.removeEventListener("change", onChange);
        else mql.removeListener(onChange);
        window.removeEventListener("resize", onChange);
        window.removeEventListener("orientationchange", onChange);
      };
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = () => false;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// Ancho por debajo del cual se usa el menu lateral deslizante.
export const useIsMobile = () => useMediaQuery("(max-width: 900px)");
