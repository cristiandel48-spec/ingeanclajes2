// Historial de recibos de caja (ingresos y recaudos de clientes).
// Incluye botón para reimprimir el soporte oficial en formato Media Carta.
import ListadoConFiltros, { GrupoFiltro, Resaltable } from "../../components/ListadoConFiltros";
import { C, boton, enMilis } from "../../components/listadoEstilos";
import Badge from "../../components/ui/Badge";
import { SI } from "../../styles/tokens";
import { fmt, fmtD } from "../../lib/format";
import { normalizarRazonSocial } from "../../lib/normalizarEntrada";

const ORDENES = [
  { key: "recientes", label: "Más recientes", comparar: (a, b) => enMilis(b.fecha) - enMilis(a.fecha) },
  { key: "antiguos",  label: "Más antiguos",  comparar: (a, b) => enMilis(a.fecha) - enMilis(b.fecha) },
  { key: "mayor",     label: "Mayor monto",   comparar: (a, b) => Number(b.monto || 0) - Number(a.monto || 0) },
  { key: "menor",     label: "Menor monto",   comparar: (a, b) => Number(a.monto || 0) - Number(b.monto || 0) },
];

export default function ListaPagos({ pagos, obras, acciones }) {
  const obraDe = (id) => (obras || []).find((o) => o.id === id);

  return (
    <ListadoConFiltros
      datos={pagos || []}
      nombre="recibo de caja"
      nombrePlural="recibos de caja"
      marcador="Buscar por consecutivo RC, obra, cliente, método o notas…"
      buscarEn={(p) => [p.id, p.obraId, p.cliente, obraDe(p.obraId)?.cliente, p.tipo, p.metodo || p.medio, p.notas]
        .filter(Boolean).join(" ")}
      estadoDe={(p) => p.estado}
      estadosFijos={["Pagado", "Pendiente"]}
      fechaDe={(p) => p.fecha}
      ordenes={ORDENES}
      filtrosExtra={({ valores, poner }) => (
        <GrupoFiltro titulo="Obra">
          <select
            value={valores.obra || "todas"}
            onChange={(e) => poner("obra", e.target.value === "todas" ? null : e.target.value)}
            style={{ ...SI, fontSize: 12, padding: "6px 8px" }}
          >
            <option value="todas">Todas las obras</option>
            {(obras || []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.id} · {o.cliente}
              </option>
            ))}
          </select>
        </GrupoFiltro>
      )}
      aplicarExtra={(p, v) => !v.obra || p.obraId === v.obra}
      derecha={(lista) => {
        const cobrado = lista.filter((p) => p.estado === "Pagado")
          .reduce((s, p) => s + Number(p.monto || 0), 0);
        return (
          <span style={{ fontSize: 11.5, color: C.tenue, fontWeight: 600 }}>
            Total recaudado <strong style={{ color: "#166534" }}>{fmt(cobrado)}</strong>
          </span>
        );
      }}
      fila={(p, { compacta }) => (
        <Fila key={p.id} p={p} compacta={compacta} obra={obraDe(p.obraId)} acciones={acciones} />
      )}
      vacio={{
        titulo: "Todavía no hay recibos de caja registrados",
        texto: "Los recibos de caja se registran arriba, buscando al cliente por NIT u obra y digitando el valor recibido.",
      }}
    />
  );
}

function Fila({ p, compacta, obra, acciones }) {
  const pagado = p.estado === "Pagado";
  const alPulsar = (fn) => (e) => { e.stopPropagation(); fn(p); };
  const monto = Number(p.monto || 0);

  const botones = (
    <>
      {acciones.imprimir && (
        <button
          style={boton("#eff6ff", "#1d4ed8", { border: "1px solid #93c5fd", fontWeight: 700 })}
          title="Ver e imprimir Recibo de Caja Media Carta"
          onClick={alPulsar(acciones.imprimir)}
        >
          🖨️ Recibo
        </button>
      )}
      {!pagado && acciones.cobrar && (
        <button
          style={boton("#0f2d1a", "#4ade80", { border: "1px solid #166534" })}
          onClick={alPulsar(acciones.cobrar)}
        >
          Marcar cobrado
        </button>
      )}
      <button
        style={boton("#fff", "#ef4444", { border: "1.5px solid #ef4444" })}
        title="Eliminar este recibo y devolver el saldo a la obra"
        onClick={alPulsar(acciones.eliminar)}
      >
        🗑
      </button>
    </>
  );

  const nombreCliente = p.cliente || obra?.cliente || "Sin obra / Cliente general";

  const datos = (
    <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.tinta }}>
          {normalizarRazonSocial(nombreCliente)}
        </span>
        <span style={{ fontSize: 11, color: C.tenue, fontFamily: "Consolas, monospace", fontWeight: 700 }}>
          {p.id}{p.fecha ? ` · ${fmtD(p.fecha)}` : ""}
        </span>
      </div>
      <div style={{
        fontSize: 11.5,
        color: C.apagado,
        marginTop: 1,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        {[p.obraId, obra?.proyecto, p.tipo, p.metodo || p.medio].filter(Boolean).join(" · ")}
      </div>
    </>
  );

  const valor = (
    <span style={{
      fontSize: 14,
      fontWeight: 700,
      color: pagado ? "#166534" : "#c2410c",
      whiteSpace: "nowrap",
      fontVariantNumeric: "tabular-nums",
    }}>
      {fmt(monto)}
    </span>
  );

  if (compacta) {
    return (
      <Resaltable
        as="article"
        estiloHover={{ borderColor: C.acentoFuerte, background: "#fffdfb" }}
        style={{
          border: `1px solid ${C.bordeFuerte}`,
          borderRadius: 10,
          background: "#fff",
          padding: "9px 12px 9px 14px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          position: "relative",
          overflow: "hidden",
          transition: "border-color .16s ease, background .16s ease",
        }}
      >
        <div style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: pagado ? "#4ade80" : "#fb923c",
        }} />
        <div style={{ minWidth: 0, flex: 1 }}>{datos}</div>
        {valor}
        <Badge estado={p.estado} />
        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>{botones}</div>
      </Resaltable>
    );
  }

  return (
    <Resaltable
      as="article"
      estiloHover={{ borderColor: C.acentoFuerte, boxShadow: "0 12px 28px -16px rgba(15,23,42,.30)" }}
      style={{
        border: `1px solid ${C.bordeFuerte}`,
        borderRadius: 12,
        background: "#fff",
        padding: "12px 13px 10px",
        display: "flex",
        flexDirection: "column",
        gap: 9,
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow .2s ease, border-color .2s ease",
      }}
    >
      <div style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        background: pagado ? "#4ade80" : "#fb923c",
      }} />
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ minWidth: 0 }}>{datos}</div>
        <Badge estado={p.estado} />
      </div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: C.apagado }}>Valor recibido en caja</span>
        {valor}
      </div>
      {p.notas && <div style={{ fontSize: 11, color: C.tenue }}>{p.notas}</div>}
      <div style={{
        display: "flex",
        gap: 6,
        flexWrap: "wrap",
        paddingTop: 8,
        borderTop: `1px solid ${C.borde}`,
        alignItems: "center",
      }}>
        {botones}
      </div>
    </Resaltable>
  );
}
