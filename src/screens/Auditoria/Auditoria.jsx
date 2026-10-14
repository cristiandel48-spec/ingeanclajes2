// Quien hizo cada documento. Modulo propio, solo del Administrador.
//
// Estuvo un rato dentro de Usuarios y permisos, pero es una consulta que se
// hace por si misma -"¿quien tocó esta cotización?"- y buscarla dentro de la
// pantalla de crear cuentas no tenia sentido.
import AuditoriaDocumentos from "../../components/AuditoriaDocumentos";
import H1 from "../../components/ui/H1";
import { useIsMobile } from "../../hooks/useMediaQuery";

export default function Auditoria({ ctx }) {
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
        eyebrow="TRAZABILIDAD Y CONTROL"
        title="Auditoría y Registro de Cambios"
        subtitle="Historial de sesiones, conexiones y trazabilidad de creación y edición de obras, cotizaciones, informes y certificaciones"
      />
      <AuditoriaDocumentos ctx={ctx} />
    </div>
  );
}

