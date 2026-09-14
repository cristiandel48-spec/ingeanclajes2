import { useState } from "react";
import { fmt } from "../../lib/format";
import Av from "../../components/ui/Av";
import { PAL } from "../../styles/tokens";

export default function ModalEnvioMasivoColillas({
  abierto,
  onCerrar,
  resumenesActivos = [],
  periodoNomina = {},
}) {
  const [canal, setCanal] = useState("correo"); // 'correo' o 'whatsapp'
  const [enviados, setEnviados] = useState({}); // { [empId]: true }
  const [copiado, setCopiado] = useState(false);

  if (!abierto) return null;

  const total = resumenesActivos.length;
  const conCorreo = resumenesActivos.filter(({ empleado: e }) => Boolean(e.email));
  const conTel = resumenesActivos.filter(({ empleado: e }) => Boolean(e.tel));

  const marcarEnviado = (id) => {
    setEnviados((prev) => ({ ...prev, [id]: true }));
  };

  const generarUrlCorreo = (e, resumen) => {
    const asunto = encodeURIComponent(`Colilla de pago - ${periodoNomina.label} - ${e.nombre}`);
    const desglose = [
      `• Días laborados: ${resumen.diasNomina}`,
      `• Salario básico corte: ${fmt(resumen.salario)}`,
      resumen.auxilioTransporte > 0 ? `• Auxilio de transporte: ${fmt(resumen.auxilioTransporte)}` : null,
      (resumen.horasExtras + resumen.comisiones) > 0
        ? `• Horas extras y comisiones: ${fmt(resumen.horasExtras + resumen.comisiones)}`
        : null,
      resumen.incapacidadTotal > 0 ? `• Incapacidades: ${fmt(resumen.incapacidadTotal)}` : null,
      `• Salud (4%): -${fmt(resumen.salud)}`,
      `• Pensión (4%): -${fmt(resumen.pension)}`,
      resumen.totalDeducciones > resumen.salud + resumen.pension
        ? `• Otras deducciones: -${fmt(resumen.totalDeducciones - resumen.salud - resumen.pension)}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const cuerpo = encodeURIComponent(
      `Estimado(a) ${e.nombre},\n\n` +
        `Le compartimos el detalle oficial de su colilla de pago correspondiente al período ${periodoNomina.label}:\n\n` +
        `Cargo: ${e.cargo || "N/A"}\n` +
        `Documento: ${e.cedula || "N/A"}\n\n` +
        `RESUMEN DE DEVENGOS Y DEDUCCIONES:\n` +
        `${desglose}\n\n` +
        `-----------------------------------------\n` +
        `TOTAL NETO A PAGAR: ${fmt(resumen.neto)}\n` +
        (e.banco
          ? `Forma de pago: ${e.banco} (${e.tipoCuenta || "Ahorros"} N° ${e.numeroCuenta || "N/A"})\n`
          : "") +
        `-----------------------------------------\n\n` +
        `Para cualquier duda o aclaración sobre este corte, comuníquese con el área administrativa.\n\n` +
        `Cordialmente,\n` +
        `INGEANCLAJES S.A.S.\n` +
        `Gestión Humana y Nómina`
    );

    return `mailto:${e.email}?subject=${asunto}&body=${cuerpo}`;
  };

  const generarUrlWhatsApp = (e, resumen) => {
    const telLimpio = Array.from(e.tel || "")
      .filter((ch) => ch >= "0" && ch <= "9")
      .join("");
    const texto = encodeURIComponent(
      `Hola ${e.nombre}, te compartimos el resumen oficial de tu colilla de pago de Ingeanclajes S.A.S. correspondiente al corte ${periodoNomina.label}.\n\n` +
        `• Cargo: ${e.cargo || "N/A"}\n` +
        `• Salario corte: ${fmt(resumen.salario)}\n` +
        (resumen.auxilioTransporte > 0 ? `• Aux. Transporte: ${fmt(resumen.auxilioTransporte)}\n` : "") +
        (resumen.horasExtras + resumen.comisiones > 0
          ? `• Extras / Comisiones: ${fmt(resumen.horasExtras + resumen.comisiones)}\n`
          : "") +
        `• Deducciones (Salud + Pensión): -${fmt(resumen.salud + resumen.pension)}\n\n` +
        `TOTAL NETO A PAGAR: ${fmt(resumen.neto)}\n` +
        (e.banco ? `Medio: ${e.banco} (${e.tipoCuenta || "Ahorros"} N° ${e.numeroCuenta || "N/A"})\n` : "") +
        `\nSi tienes alguna inquietud sobre tu colilla, comunícate con el área administrativa.`
    );
    return `https://wa.me/57${telLimpio}?text=${texto}`;
  };

  const copiarTodosCorreos = () => {
    const lista = conCorreo.map(({ empleado: e }) => e.email).join(", ");
    navigator.clipboard.writeText(lista);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const totalEnviadosCanal =
    canal === "correo"
      ? conCorreo.filter(({ empleado: e }) => enviados[e.id]).length
      : conTel.filter(({ empleado: e }) => enviados[e.id]).length;

  const totalObjetivo = canal === "correo" ? conCorreo.length : conTel.length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(3px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: 16,
          width: "100%",
          maxWidth: 860,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
        }}
      >
        {/* Cabecera del Modal */}
        <div
          style={{
            padding: "18px 24px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "#2563eb",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
              }}
            >
              📤
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
                Enviar Colillas Masivas a Todos los Empleados
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Periodo: <strong>{periodoNomina.label || "Corte Activo"}</strong> · {total} empleados activos en nómina
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "#64748b",
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Métricas y pestañas de canal */}
        <div
          style={{
            padding: "14px 24px",
            background: "#ffffff",
            borderBottom: "1px solid #f1f5f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Selector de Canal */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setCanal("correo")}
              style={{
                background: canal === "correo" ? "#2563eb" : "#f1f5f9",
                color: canal === "correo" ? "#ffffff" : "#334155",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>✉️</span> Por Correo Electrónico ({conCorreo.length}/{total})
            </button>

            <button
              type="button"
              onClick={() => setCanal("whatsapp")}
              style={{
                background: canal === "whatsapp" ? "#16a34a" : "#f1f5f9",
                color: canal === "whatsapp" ? "#ffffff" : "#334155",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span>💬</span> Por WhatsApp ({conTel.length}/{total})
            </button>
          </div>

          {/* Progreso del envío */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {canal === "correo" && (
              <button
                type="button"
                onClick={copiarTodosCorreos}
                style={{
                  background: copiado ? "#dcfce7" : "#ffffff",
                  color: copiado ? "#166534" : "#475569",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  padding: "6px 12px",
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Copia los correos de todos los empleados separados por coma"
              >
                {copiado ? "✓ Correos copiados" : "📋 Copiar todos los correos"}
              </button>
            )}

            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: totalEnviadosCanal === totalObjetivo && totalObjetivo > 0 ? "#16a34a" : "#64748b",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                padding: "6px 12px",
                borderRadius: 8,
              }}
            >
              Progreso: {totalEnviadosCanal} de {totalObjetivo} enviados
            </div>
          </div>
        </div>

        {/* Lista interactiva de empleados para despacho */}
        <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1, maxHeight: 420 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {resumenesActivos.map(({ empleado: e, resumen }, idx) => {
              const tieneContacto = canal === "correo" ? Boolean(e.email) : Boolean(e.tel);
              const valorContacto = canal === "correo" ? e.email : e.tel;
              const yaEnviado = Boolean(enviados[e.id]);

              return (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: yaEnviado
                      ? "1px solid #bbf7d0"
                      : tieneContacto
                      ? "1px solid #e2e8f0"
                      : "1px dashed #fed7aa",
                    background: yaEnviado
                      ? "#f0fdf4"
                      : tieneContacto
                      ? "#ffffff"
                      : "#fff7ed",
                    transition: "all 0.15s ease",
                  }}
                >
                  {/* Info empleado */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Av init={e.avatar} color={PAL[idx % PAL.length]} size={36} />
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: "#0f172a" }}>
                          {e.nombre}
                        </span>
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          ({e.cargo || "Sin cargo"})
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>
                        {tieneContacto ? (
                          <span>
                            {canal === "correo" ? "✉️ " : "📱 "}
                            <strong>{valorContacto}</strong>
                          </span>
                        ) : (
                          <span style={{ color: "#c2410c", fontWeight: 600 }}>
                            ⚠️ Sin {canal === "correo" ? "correo electrónico" : "número de celular"} registrado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Valor neto y acción */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase" }}>
                        Neto a Pagar
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#16a34a" }}>
                        {fmt(resumen.neto)}
                      </div>
                    </div>

                    {/* Botón de envío individual dentro de la lista masiva */}
                    {tieneContacto ? (
                      <a
                        href={canal === "correo" ? generarUrlCorreo(e, resumen) : generarUrlWhatsApp(e, resumen)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => marcarEnviado(e.id)}
                        style={{
                          background: yaEnviado
                            ? "#dcfce7"
                            : canal === "correo"
                            ? "#2563eb"
                            : "#16a34a",
                          color: yaEnviado ? "#166534" : "#ffffff",
                          border: yaEnviado
                            ? "1px solid #86efac"
                            : "none",
                          borderRadius: 8,
                          padding: "8px 14px",
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: "none",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          boxShadow: yaEnviado ? "none" : "0 2px 4px rgba(0,0,0,0.1)",
                        }}
                      >
                        <span>{yaEnviado ? "✓ Enviado" : canal === "correo" ? "✉️ Enviar" : "💬 Enviar"}</span>
                      </a>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          background: "#f1f5f9",
                          padding: "6px 10px",
                          borderRadius: 6,
                          fontWeight: 600,
                        }}
                      >
                        No disponible
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pie del modal */}
        <div
          style={{
            padding: "14px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 12, color: "#64748b" }}>
            💡 Al hacer clic en cada empleado se abre el mensaje con la colilla oficial desglosada y el pago neto.
          </div>
          <button
            type="button"
            onClick={onCerrar}
            style={{
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
