import { useMemo, useState } from "react";
import { Button, Callout, Card, Input, SegmentedControl } from "../../components/ui";
import { useAppData } from "../../context/AppDataContext";
import { agruparCatalogo } from "../../lib/catalogo";
import { fmt } from "../../lib/format";
import {
  PLANTILLAS,
  armarDesdePlantilla,
  camposFaltantes,
  camposVisibles,
  plantillaPorId,
  valoresIniciales,
} from "../../lib/plantillasCotizacion";
import { CIFRA, TIPO } from "../../styles/designTokens";

// Panel «Plantilla»: se elige el tipo de trabajo, se dan las medidas y la
// cotizacion se arma sola con los servicios del catalogo.
//
// Como el dictado, nada se aplica sin verlo: abajo aparecen los items con sus
// cantidades y precios, y solo al pulsar «Agregar a la cotización» entran. La
// logica y las reglas de cantidad estan en lib/plantillasCotizacion.js.

export default function PlantillaCotizacion({ onAplicar, onCerrar, hayItems = false }) {
  const { catalogoItems } = useAppData();
  const catalogo = useMemo(() => agruparCatalogo(catalogoItems), [catalogoItems]);

  const [plantillaId, setPlantillaId] = useState(PLANTILLAS[0].id);
  const plantilla = plantillaPorId(plantillaId);
  // Cada plantilla guarda sus valores: al ir y volver no se pierde lo escrito.
  const [valores, setValores] = useState(() =>
    Object.fromEntries(PLANTILLAS.map((p) => [p.id, valoresIniciales(p)])));
  const actuales = valores[plantillaId];

  const cambiar = (campo, valor) =>
    setValores((prev) => ({ ...prev, [plantillaId]: { ...prev[plantillaId], [campo]: valor } }));

  const faltantes = camposFaltantes(plantilla, actuales);
  // Es un calculo de unas pocas lineas: no hace falta memorizarlo.
  const borrador = armarDesdePlantilla(plantilla, actuales, catalogo);
  const total = borrador.items.reduce((suma, i) => suma + i.vu * i.cant, 0);
  const listo = !faltantes.length && borrador.items.length > 0;

  return (
    <Card style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ ...TIPO.title2, color: "var(--text-primary)" }}>Armar con plantilla</div>
          <div style={{ ...TIPO.callout, color: "var(--text-tertiary)", marginTop: 2 }}>
            Elige el tipo de trabajo y da las medidas. Los precios salen del catálogo.
          </div>
        </div>
        <Button variante="tertiary" tam="sm" soloIcono icono="cerrar" onClick={onCerrar}
          aria-label="Cerrar plantilla" title="Cerrar" style={{ color: "var(--text-tertiary)" }} />
      </div>

      <SegmentedControl
        etiqueta="Tipo de trabajo"
        opciones={PLANTILLAS.map((p) => ({ id: p.id, label: p.nombre }))}
        valor={plantillaId}
        onChange={setPlantillaId}
      />
      <div style={{ ...TIPO.callout, color: "var(--text-secondary)", margin: "10px 0 16px" }}>
        {plantilla.resumen}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, alignItems: "start" }}>
        {camposVisibles(plantilla, actuales).map((campo) => {
          const id = `plantilla-${plantillaId}-${campo.id}`;
          if (campo.tipo === "si_no") {
            return (
              <label key={campo.id} htmlFor={id} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", paddingTop: 4 }}>
                <input
                  id={id}
                  type="checkbox"
                  checked={Boolean(actuales[campo.id])}
                  onChange={(e) => cambiar(campo.id, e.target.checked)}
                  style={{ width: 18, height: 18, marginTop: 1, accentColor: "var(--accent)", flexShrink: 0 }}
                />
                <span>
                  <span style={{ ...TIPO.body, color: "var(--text-primary)" }}>{campo.label}</span>
                  {campo.ayuda && (
                    <span style={{ ...TIPO.footnote, fontWeight: 400, display: "block", color: "var(--text-tertiary)", marginTop: 2 }}>
                      {campo.ayuda}
                    </span>
                  )}
                </span>
              </label>
            );
          }
          if (campo.tipo === "opcion") {
            return (
              <Input key={campo.id} id={id} como="select" label={campo.label}
                value={actuales[campo.id]} onChange={(e) => cambiar(campo.id, e.target.value)}>
                {campo.opciones.map((op) => <option key={op.id} value={op.id}>{op.label}</option>)}
              </Input>
            );
          }
          return (
            <Input
              key={campo.id}
              id={id}
              label={campo.unidad ? `${campo.label} (${campo.unidad})` : campo.label}
              obligatorio={campo.obligatorio}
              ayuda={campo.ayuda}
              inputMode="decimal"
              value={actuales[campo.id] ?? ""}
              onChange={(e) => cambiar(campo.id, e.target.value)}
              onFocus={(e) => e.target.select()}
              style={{ ...CIFRA }}
            />
          );
        })}
      </div>

      <div style={{ marginTop: 20, borderRadius: 14, background: "var(--surface-subtle)", overflow: "hidden" }}>
        {borrador.items.length === 0 ? (
          <div style={{ ...TIPO.callout, color: "var(--text-tertiary)", padding: "14px 16px" }}>
            {faltantes.length
              ? `Falta: ${faltantes.map((c) => c.label.toLowerCase()).join(", ")}.`
              : "Con estas medidas no sale ningún servicio."}
          </div>
        ) : (
          <>
            {borrador.items.map((item, i) => (
              <div key={item.desc} style={{
                display: "flex", justifyContent: "space-between", gap: 12, padding: "10px 16px",
                borderTop: i ? "1px solid var(--separator)" : "none",
              }}>
                <span style={{ ...TIPO.callout, color: "var(--text-primary)", minWidth: 0 }}>{item.desc}</span>
                <span style={{ ...TIPO.callout, ...CIFRA, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                  {String(item.cant).replace(".", ",")} {item.unit} · {item.vu ? fmt(item.vu * item.cant) : "sin precio"}
                </span>
              </div>
            ))}
            <div style={{
              display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 16px",
              borderTop: "1px solid var(--separator)",
            }}>
              <span style={{ ...TIPO.headline, color: "var(--text-secondary)" }}>Subtotal estimado</span>
              <span style={{ ...TIPO.headline, ...CIFRA, color: "var(--text-primary)" }}>{fmt(total)}</span>
            </div>
          </>
        )}
      </div>

      {borrador.notas?.length > 0 && borrador.items.length > 0 && (
        <div style={{ ...TIPO.footnote, fontWeight: 400, color: "var(--text-tertiary)", marginTop: 8 }}>
          {borrador.notas.join(" ")}
        </div>
      )}

      {borrador.avisos.length > 0 && (
        <Callout tono="aviso" titulo="Revisa esto" style={{ marginTop: 12 }}>
          {borrador.avisos.map((a) => <div key={a}>{a}</div>)}
        </Callout>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
        <Button variante="primary" disabled={!listo} onClick={() => onAplicar(borrador)}>
          Agregar a la cotización
        </Button>
        <Button variante="secondary" onClick={onCerrar}>Cancelar</Button>
        <span style={{ ...TIPO.footnote, fontWeight: 400, color: "var(--text-tertiary)", flex: "1 1 220px" }}>
          {hayItems
            ? "Se suman a los ítems que ya tiene la propuesta. Cambia también el tipo de sistema y, si está vacía, la descripción."
            : "Cambia el tipo de sistema y, si está vacía, la descripción. Nada se envía al cliente."}
        </span>
      </div>
    </Card>
  );
}
