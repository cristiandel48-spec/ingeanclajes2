import { fmt } from "../../lib/format";
import { getEstadoFlujoObra } from "../../lib/flujoObra";
import { B } from "../../styles/tokens";

// Guia paso a paso de lo que falta en una obra para poder generar el informe
// de actividades y la certificacion. Esta pensada para alguien que no conoce
// el sistema: dice que ya esta hecho, que falta y por que importa.

function Fila({ estado, titulo, detalle, accion }) {
  const colores = {
    listo: { fg: "#15803D", bg: "#F0FDF4", borde: "#BBF7D0", icono: "✓" },
    falta: { fg: "#B54708", bg: "#f4eee4", borde: "#e8dfd2", icono: "!" },
    aviso: { fg: "#cc0000", bg: "#f9e9e4", borde: "#eec7bd", icono: "!" },
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
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#2b2622" }}>{titulo}</div>
        <div style={{ fontSize: 11.5, color: "#756a5e", marginTop: 2, lineHeight: 1.45 }}>{detalle}</div>
      </div>
      {accion}
    </div>
  );
}

export default function GuiaFlujoObra({
  obra, empleadosAsignados, registrosAvance = 0, fotosAvance = 0,
  // Sin permiso para ver cifras, la guia habla del estado del cobro sin decir
  // cuanto: "falta cobrar" en vez de "faltan $14.200.000".
  verDinero = true,
  onVerAvance, onCrearInforme, onCrearCertificacion,
}) {
  const { total, pagado, saldo, avance, estaPagada, estaTerminada } = getEstadoFlujoObra(obra);
  const personal = Number(empleadosAsignados || 0);
  const registros = Number(registrosAvance || 0);
  const fotos = Number(fotosAvance || 0);

  // La certificacion se entrega con el pago total: es la condicion comercial
  // que sale impresa en la propia cotizacion.
  const pedirConfirmacionCertificado = () => {
    if (!estaPagada) {
      const seguir = window.confirm(
        (verDinero
          ? `Esta obra tiene un saldo pendiente de ${fmt(saldo)}.`
          : "Esta obra todavía tiene saldo pendiente por cobrar.") + "\n\n" +
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
      background: "#fff", border: "1px solid #e8dfd2", borderRadius: 14,
      padding: 18, marginBottom: 18,
    }}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#2b2622" }}>
          Qué sigue en esta obra
        </div>
        <div style={{ fontSize: 11.5, color: "#756a5e", marginTop: 3, lineHeight: 1.5 }}>
          El informe y la certificación toman los datos de aquí. Entre más completa esté la obra,
          menos hay que escribir después: <strong>lo que se alimenta en la obra no se vuelve a
          escribir en el informe</strong>.
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
        <Fila
          estado="listo"
          titulo="Obra creada desde la cotización"
          detalle={`${obra.cliente} · ${obra.proyecto || "sin proyecto"}${verDinero ? ` · ${fmt(total)}` : ""}`}
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
          estado={fotos > 0 ? "listo" : "falta"}
          titulo={
            fotos > 0
              ? `${registros} avance(s) registrado(s) · ${fotos} foto(s)`
              : "Falta registrar el avance con fotos"
          }
          detalle={
            fotos > 0
              ? "El informe de actividades va a traer estos registros con sus fotos y comentarios."
              : "Ve a la pestaña «Avance y fotos» y registra qué se hizo cada día, con las fotos y el comentario de cada una. Sin esto el informe sale vacío y toca escribirlo todo a mano."
          }
          accion={
            onVerAvance && (
              <button
                onClick={onVerAvance}
                style={{ ...B("#f4eee4", "#574e44"), fontSize: 11, padding: "7px 12px", flexShrink: 0, alignSelf: "center" }}
              >
                {fotos > 0 ? "Ver" : "Registrar"}
              </button>
            )
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
          titulo={
            estaPagada
              ? "Obra pagada por completo"
              : verDinero ? `Saldo pendiente: ${fmt(saldo)}` : "Todavía queda por cobrar"
          }
          detalle={
            estaPagada
              ? "Se puede entregar la certificación sin problema."
              : verDinero
                ? `Cobrado ${fmt(pagado)} de ${fmt(total)}. Registra los abonos en «Cuentas por cobrar». Según la cotización, la certificación se entrega con el pago total.`
                : "Según la cotización, la certificación se entrega con el pago total. Quien lleva la cartera sabrá si ya está al día."
          }
        />
      </div>

      <div style={{
        display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16,
        paddingTop: 14, borderTop: "1px solid #f4eee4",
      }}>
        <button
          onClick={onCrearInforme}
          style={{ ...B("#f4eee4", "#574e44"), fontSize: 12, padding: "9px 16px" }}
        >
          Crear informe de actividades
        </button>
        <button
          onClick={pedirConfirmacionCertificado}
          style={{
            ...B(estaPagada && estaTerminada ? "#16a34a" : "#f4eee4",
                 estaPagada && estaTerminada ? "#fff" : "#574e44"),
            fontSize: 12, padding: "9px 16px",
          }}
        >
          Crear certificación
        </button>
        <div style={{ fontSize: 10.5, color: "#a2988a", alignSelf: "center", flex: "1 1 180px" }}>
          Se abren con los datos de esta obra ya cargados.
        </div>
      </div>
    </div>
  );
}
