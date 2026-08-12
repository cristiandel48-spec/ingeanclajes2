// Quien hizo cada documento. Modulo propio, solo del Administrador.
//
// Estuvo un rato dentro de Usuarios y permisos, pero es una consulta que se
// hace por si misma -"¿quien tocó esta cotización?"- y buscarla dentro de la
// pantalla de crear cuentas no tenia sentido.
import AuditoriaCotizaciones from "../../components/AuditoriaCotizaciones";
import H1 from "../../components/ui/H1";

export default function Auditoria({ ctx }) {
  return (
    <div style={{ padding: 28 }}>
      <H1
        title="Auditoría de documentos"
        subtitle="Quién creó cada documento y quién fue el último en modificarlo"
      />
      <AuditoriaCotizaciones ctx={ctx} />
    </div>
  );
}
