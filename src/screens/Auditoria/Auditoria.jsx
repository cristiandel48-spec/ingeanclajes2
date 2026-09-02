// Quien hizo cada documento. Modulo propio, solo del Administrador.
//
// Estuvo un rato dentro de Usuarios y permisos, pero es una consulta que se
// hace por si misma -"¿quien tocó esta cotización?"- y buscarla dentro de la
// pantalla de crear cuentas no tenia sentido.
import AuditoriaDocumentos from "../../components/AuditoriaDocumentos";
import H1 from "../../components/ui/H1";

export default function Auditoria({ ctx }) {
  return (
    <div style={{ padding: 28 }}>
      <H1
        title="Auditoría y registro de cambios"
        subtitle="Quién creó y modificó obras, horarios, cotizaciones, informes y certificaciones"
      />
      <AuditoriaDocumentos ctx={ctx} />
    </div>
  );
}
