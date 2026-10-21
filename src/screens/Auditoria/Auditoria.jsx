// Quien hizo cada documento. Modulo propio, solo del Administrador.
//
// Estuvo un rato dentro de Usuarios y permisos, pero es una consulta que se
// hace por si misma -"¿quien tocó esta cotización?"- y buscarla dentro de la
// pantalla de crear cuentas no tenia sentido.
//
// Sin titulo grande: la barra de arriba ya dice en que modulo se esta, como
// en las demas pantallas.
import AuditoriaDocumentos from "../../components/AuditoriaDocumentos";
import { useIsMobile } from "../../hooks/useMediaQuery";

export default function Auditoria({ ctx }) {
  const isMobile = useIsMobile();
  return (
    <div
      style={{
        maxWidth: 1360,
        margin: "0 auto",
        padding: isMobile ? "12px 8px 24px" : "16px 16px 28px",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <AuditoriaDocumentos ctx={ctx} />
    </div>
  );
}
