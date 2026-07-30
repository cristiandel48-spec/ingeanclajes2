import { fmt } from "../../lib/format";
import { B } from "../../styles/tokens";

// Guia paso a paso de lo que falta en una obra para poder generar el informe
// de actividades y la certificacion. Esta pensada para alguien que no conoce
// el sistema: dice que ya esta hecho, que falta y por que importa.

function Fila({ estado, titulo, detalle, accion }) {
  const colores = {
    listo: { fg: "#15803D", bg: "#F0FDF4", borde: "#BBF7D0", icono: "✓" },
    falta: { fg: "#B54708", bg: "#FFFAF0", borde: "#FDE3C4", icono: "!" },
    aviso: { fg: "#B42318", bg: "#FEF3F2", borde: "#FECDCA", icono: "!" },
  }[estado];

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "10px 12px", borderRadius: 10,
      background: colores.bg, border: `1px solid ${colores.borde}`,
    }}>
      <div style={{
        width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
        background: colores.fg, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, lineHeight: 1, marginTop: 1,
      }}>
        {colores.icono}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#1a1a2e" }}>{titulo}</div>
        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.45 }}>{detalle}</div>
      </div>
      {accion}
    </div>
  );
}

export default function GuiaFlujoObra({ obra, empleadosAsignados, onCrearInforme, onCrearCertificacion }) {
  const total = Number(obra?.total || 0);
  const pagado = Number(obra?.pagado || 0);
  const saldo = Number(obra?.saldo ?? Math.max(0, total - pagado));
  const avance = Number(obra?.avance || 0);
  const personal = Number(empleadosAsignados || 0);

  const estaPagada = total > 0 && saldo <= 0;
  const estaTerminada = avance >= 100 || String(obra?.estado || "").toLowerCase() === "finalizado";

  // La certificacion se entrega con el pago total: es la condicion comercial
  // que sale impresa en la propia cotizacion.
  const pedirConfirmacionCertificado = () => {
    if (!estaPagada) {
      const seguir = window.confirm(
        `Esta obra tiene un saldo pendiente de ${fmt(saldo)}.\n\n` +
        "En las condiciones de la cotización, la certificación se entrega con el pago total.\n\n" +
        "¿Aun así quieres crear la certificación?"
      );
      if (!seguir) return;
    }
    if (!estaTerminada) {
      const seguir = window.confirm(
        `La obra va en ${avance}% de avance y todavía no está marcada como finalizada.\n\n` +
        "¿Aun así quieres crear la certificación?"
      );
      if (!seguir) return;
    }
    onCrearCertificacion();
  };

  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
      padding: 18, marginBottom: 18,
    }}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#f47c20" }}>
          Qué sigue en esta obra
        </div>
        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3, lineHeight: 1.5 }}>
          El informe y la certificación toman los datos de aquí. Entre más completa esté la obra,
          menos hay que escribir después.
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        <Fila
          estado="listo"
          titulo="Obra creada desde la cotización"
          detalle={`${obra.cliente} · ${obra.proyecto || "sin proyecto"} · ${fmt(total)}`}
        />

        <Fila
          estado={personal > 0 ? "listo" : "falta"}
          titulo={personal > 0 ? `${personal} persona(s) asignada(s)` : "Falta asignar el personal"}
          detalle={
            personal > 0
              ? "El informe de actividades traerá esta gente con sus turnos del período."
              : "Asigna el personal en la pestaña «Personal». Sin esto, el informe sale sin trabajadores y toca escribirlos a mano."
          }
        />

        <Fila
          estado={estaTerminada ? "listo" : "falta"}
          titulo={estaTerminada ? "Obra finalizada" : `Avance en ${avance}%`}
          detalle={
            estaTerminada
              ? "Ya se puede certificar el trabajo."
              : "Sube el avance a 100% o cambia el estado a «Finalizado» cuando terminen. La certificación se hace sobre trabajo terminado."
          }
        />

        <Fila
          estado={estaPagada ? "listo" : "aviso"}
          titulo={estaPagada ? "Obra pagada por completo" : `Saldo pendiente: ${fmt(saldo)}`}
          detalle={
            estaPagada
              ? "Se puede entregar la certificación sin problema."
              : `Cobrado ${fmt(pagado)} de ${fmt(total)}. Registra los abonos en «Cuentas por cobrar». Según la cotización, la certificación se entrega con el pago total.`
          }
        />
      </div>

      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16,
        paddingTop: 14, borderTop: "1px solid #f1f5f9",
      }}>
        <button
          onClick={onCrearInforme}
          style={{ ...B("#dbeafe", "#1e40af"), fontSize: 12, padding: "9px 16px" }}
        >
          Crear informe de actividades
        </button>
        <button
          onClick={pedirConfirmacionCertificado}
          style={{
            ...B(estaPagada && estaTerminada ? "#16a34a" : "#f1f5f9",
                 estaPagada && estaTerminada ? "#fff" : "#475569"),
            fontSize: 12, padding: "9px 16px",
          }}
        >
          Crear certificación
        </button>
        <div style={{ fontSize: 10.5, color: "#94a3b8", alignSelf: "center", flex: "1 1 180px" }}>
          Se abren con los datos de esta obra ya cargados.
        </div>
      </div>
    </div>
  );
}
