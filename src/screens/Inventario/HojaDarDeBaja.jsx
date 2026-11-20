import { useState } from "react";
import { Button, Callout, Input, Sheet } from "../../components/ui";
import { ESPACIO } from "../../styles/designTokens";

// Hoja dedicada para registrar el motivo al dar de baja un bien:
// dar de baja cambia el estado y conserva el registro para trazabilidad.
export default function HojaDarDeBaja({ bien, onConfirmar, onCerrar }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");

  if (!bien) return null;

  const enviar = (e) => {
    e?.preventDefault();
    const limpio = motivo.trim();
    if (!limpio) {
      setError("Escribe el motivo por el cual se da de baja este bien.");
      return;
    }
    onConfirmar?.(bien, limpio);
  };

  return (
    <Sheet
      abierta
      onCerrar={onCerrar}
      titulo="Dar de baja bien"
      subtitulo={`${bien.id} · ${bien.nombre}`}
      pie={
        <>
          <Button variante="secondary" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button variante="destructive" onClick={enviar}>
            Confirmar baja
          </Button>
        </>
      }
    >
      <form onSubmit={enviar} style={{ display: "grid", gap: ESPACIO.lg }}>
        <Callout tono="neutro" titulo="El registro no se elimina">
          El bien pasará al estado «Dado de baja» con fecha de hoy, dejará de sumar al valor
          vigente del inventario y conservará su historial.
        </Callout>

        <Input
          como="textarea"
          label="Motivo de la baja"
          obligatorio
          rows={3}
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            if (error) setError("");
          }}
          placeholder="Ej. Daño irreparable del motor, pérdida en obra, fin de vida útil o reemplazo."
          error={error}
        />
      </form>
    </Sheet>
  );
}
