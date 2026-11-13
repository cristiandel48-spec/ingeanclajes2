import { useMemo, useState } from "react";
import { Button, Callout, Input, Sheet } from "../../components/ui";
import Icono from "../../components/ui/Icono";

// Unificar dos fichas del mismo cliente. Era una ventana propia, con su fondo,
// su sombra y colores pensados solo para el modo oscuro (rojos y verdes
// translucidos que en claro casi no se leian). Ahora es la hoja del sistema.
export default function ModalUnificarCliente({ clienteOrigen, clientesDisponibles = [], onCerrar, onUnificar }) {
  const [busqueda, setBusqueda] = useState("");
  const [destinoId, setDestinoId] = useState("");

  const listaFiltrada = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return clientesDisponibles
      .filter((c) => c.id !== clienteOrigen.id)
      .filter((c) => {
        if (!q) return true;
        const nombre = String(c.nombre || "").toLowerCase();
        const nit = String(c.nit || "").toLowerCase();
        const ciudad = String(c.ciudad || "").toLowerCase();
        return nombre.includes(q) || nit.includes(q) || ciudad.includes(q);
      })
      .sort((a, b) => String(a.nombre || "").localeCompare(String(b.nombre || ""), "es"));
  }, [clientesDisponibles, clienteOrigen.id, busqueda]);

  const destinoSeleccionado = useMemo(() => {
    return clientesDisponibles.find((c) => c.id === destinoId) || null;
  }, [clientesDisponibles, destinoId]);

  const handleConfirmar = () => {
    if (!destinoSeleccionado) return;
    onUnificar(clienteOrigen, destinoSeleccionado);
  };

  const dato = { display: "inline-flex", alignItems: "center", gap: 4 };

  return (
    <Sheet
      onCerrar={onCerrar}
      titulo="Unificar clientes duplicados"
      subtitulo="Transfiere obras, cotizaciones y certificados a una sola ficha oficial."
      ancha
      pie={
        <>
          <Button variante="secondary" onClick={onCerrar}>Cancelar</Button>
          <Button variante="destructive" onClick={handleConfirmar} disabled={!destinoSeleccionado}>
            Unificar y transferir
          </Button>
        </>
      }
    >
      <Callout tono="peligro" titulo={`Se eliminará: ${clienteOrigen.nombre}`} style={{ marginBottom: 18 }}>
        <span style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 4 }}>
          <span style={dato}><Icono nombre="obra" size={14} /><strong>{clienteOrigen.obrasTotal || 0}</strong> obra(s)</span>
          <span style={dato}><Icono nombre="documento" size={14} /><strong>{clienteOrigen.cotizacionesTotal || 0}</strong> cotización(es)</span>
          <span style={dato}><Icono nombre="escudo" size={14} /><strong>{clienteOrigen.certificacionesTotal || 0}</strong> certificación(es)</span>
        </span>
      </Callout>

      <Input
        label="Cliente oficial que se queda"
        type="search"
        placeholder="Buscar por nombre, NIT o ciudad"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        wrapStyle={{ marginBottom: 8 }}
      />

      <div
        role="radiogroup"
        aria-label="Cliente destino"
        style={{ maxHeight: 220, overflowY: "auto", background: "var(--fill)", borderRadius: 12, marginBottom: 16 }}
      >
        {listaFiltrada.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center", fontSize: 13, color: "var(--text-tertiary)" }}>
            No se encontraron clientes con «{busqueda}»
          </div>
        ) : (
          listaFiltrada.map((c, i) => {
            const sel = c.id === destinoId;
            return (
              <label
                key={c.id}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  padding: "10px 14px", cursor: "pointer",
                  borderTop: i ? "1px solid var(--separator)" : "none",
                  background: sel ? "var(--accent-tint)" : "transparent",
                  transition: "background var(--transicion-rapida)",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: sel ? 600 : 500, color: "var(--text-primary)" }}>{c.nombre}</div>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                    {c.nit ? `NIT: ${c.nit}` : "Sin NIT"} {c.ciudad ? `· ${c.ciudad}` : ""} {c.telefono ? `· ${c.telefono}` : ""}
                  </div>
                </div>
                <input
                  type="radio"
                  name="clienteDestino"
                  checked={sel}
                  onChange={() => setDestinoId(c.id)}
                  style={{ accentColor: "var(--accent)", cursor: "pointer", flexShrink: 0 }}
                />
              </label>
            );
          })
        )}
      </div>

      {destinoSeleccionado ? (
        <Callout tono="exito" titulo="Resultado de la unificación">
          Todos los documentos de <strong>«{clienteOrigen.nombre}»</strong> se transferirán a{" "}
          <strong>«{destinoSeleccionado.nombre}»</strong>. Si «{destinoSeleccionado.nombre}» no tenía NIT o teléfono, se
          completará con los datos de «{clienteOrigen.nombre}».
        </Callout>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
          Elige el cliente que conservará los datos para poder unificar.
        </div>
      )}
    </Sheet>
  );
}
