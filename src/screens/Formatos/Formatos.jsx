// Codigo y version de los formatos impresos. Pantalla propia, del Sistema.
//
// Estuvo dentro de Cotizaciones, en el bloque de cierre del documento, al lado
// de la firma. Ahi molestaba dos veces: quien esta cotizando no va a cambiar la
// version de un formato en mitad de una propuesta, y quien SI necesita
// cambiarla -cuando se modifica la plantilla- tenia que entrar a una cotizacion
// para llegar. Ademas la tabla vale para los tres documentos, no solo para la
// cotizacion, y vivir dentro de uno de ellos lo hacia parecer suyo.
//
// Se cambia de tarde en tarde -cuando cambia una plantilla- y por eso no
// estorba tenerla en su propia pantalla.
import ControlDocumentalConfig from "../../components/ControlDocumentalConfig";
import H1 from "../../components/ui/H1";
import { CD } from "../../styles/tokens";
import { useIsMobile } from "../../hooks/useMediaQuery";

export default function Formatos() {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: isMobile ? "10px 8px 24px" : "14px 16px 28px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <H1
        eyebrow="SISTEMA DE GESTIÓN DE CALIDAD"
        title="Formatos y Versiones"
        subtitle="El código y la versión que salen impresos en el encabezado de cada documento"
      />
      <div style={{ ...CD, maxWidth: 860 }}>
        <ControlDocumentalConfig />
      </div>
    </div>
  );
}
