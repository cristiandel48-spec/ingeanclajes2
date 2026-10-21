import { useLayoutEffect, useRef } from "react";
import { CAPA } from "../../styles/designTokens";
import { useIsMobile } from "../../hooks/useMediaQuery";

// Pestañas, buscador y filtros de una lista, pegados debajo de la barra de
// arriba al bajar. Con 80 cotizaciones, para cambiar de filtro habia que
// volver a subir.
//
// Mide su alto y lo deja en --alto-barra-fija para que los titulos de las
// columnas de la tabla se peguen justo debajo (CabeceraFija). Ningun padre
// puede tener overflow hidden/auto entre esta barra y main.app-scroll, o deja
// de pegarse: para recortar esquinas va `overflow: clip`.
//
// El fondo es el de la pagina para que las filas no se vean al pasar por
// debajo.
//
// En el celular no se pega: pestañas, buscador y filtros apilados ocupan un
// tercio de la pantalla y dejaban poco espacio para la lista.
export default function BarraFija({ children, style }) {
  const ref = useRef(null);
  const isMobile = useIsMobile();

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const raiz = document.documentElement;
    const medir = () => raiz.style.setProperty("--alto-barra-fija", isMobile ? "0px" : `${el.offsetHeight}px`);
    medir();
    const observador = typeof ResizeObserver === "function" ? new ResizeObserver(medir) : null;
    observador?.observe(el);
    return () => {
      observador?.disconnect();
      raiz.style.removeProperty("--alto-barra-fija");
    };
  }, [isMobile]);

  return (
    <div
      ref={ref}
      className="barra-fija"
      style={{
        position: isMobile ? "relative" : "sticky",
        top: 0,
        zIndex: CAPA.barra - 2,
        background: "var(--bg-app)",
        paddingTop: 12,
        paddingBottom: 4,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
