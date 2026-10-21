import { CAPA } from "../../styles/designTokens";

// Estilo para la fila de titulos de una tabla que va debajo de BarraFija: se
// pega justo bajo los filtros. Va aparte del componente para no mezclar
// constantes y componentes en un modulo (rompe la recarga en caliente).
export const CABECERA_FIJA = {
  position: "sticky",
  top: "var(--alto-barra-fija, 0px)",
  zIndex: CAPA.barra - 3,
};
