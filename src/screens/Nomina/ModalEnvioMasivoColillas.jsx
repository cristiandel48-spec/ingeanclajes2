import { useState } from "react";
import { fmt } from "../../lib/format";
import Av from "../../components/ui/Av";
import { PAL } from "../../styles/tokens";
import { generarColillaPdf, blobABase64 } from "../../lib/colillaPdf";
import { enviarColillaPorCorreo } from "../../lib/backend/usuarios";

export default function ModalEnvioMasivoColillas({
  abierto,
  onCerrar,
  resumenesActivos = [],
  periodoNomina = {},
}) {
  const [canal, setCanal] = useState("gmail"); // 'gmail' o 'whatsapp'
  const [enviados, setEnviados] = useState({}); // { [empId]: { ok: true, hora: string } }
  const [errores, setErrores] = useState({}); // { [empId]: string }
  const [enviandoIndividual, setEnviandoIndividual] = useState({}); // { [empId]: true }
  const [enviandoMasivo, setEnviandoMasivo] = useState(false);
  const [progresoMasivo, setProgresoMasivo] = useState({ actual: 0, total: 0, actualNombre: "" });
  const [adjuntarPdf, setAdjuntarPdf] = useState(true);
  const [copiado, setCopiado] = useState(false);

  if (!abierto) return null;

  const total = resumenesActivos.length;
  const conCorreo = resumenesActivos.filter(({ empleado: e }) => Boolean(e.email?.trim()));
  const conTel = resumenesActivos.filter(({ empleado: e }) => Boolean(e.tel?.trim()));

  const armarTextoColilla = (e, resumen) => {
    const desglose = [
      `• Días laborados: ${resumen.diasNomina || 15}`,
      `• Salario básico correspondiente al corte: ${fmt(resumen.salario)}`,
      resumen.auxilioTransporte > 0 ? `• Auxilio de transporte: ${fmt(resumen.auxilioTransporte)}` : null,
      resumen.horasExtras + resumen.comisiones > 0
        ? `• Horas extras y comisiones: ${fmt(resumen.horasExtras + resumen.comisiones)}`
        : null,
      resumen.incapacidadTotal > 0 ? `• Incapacidades reconocidas: ${fmt(resumen.incapacidadTotal)}` : null,
      `• Aporte Salud (4%): -${fmt(resumen.salud)}`,
      `• Aporte Pensión (4%): -${fmt(resumen.pension)}`,
      resumen.totalDeducciones > resumen.salud + resumen.pension
        ? `• Otras deducciones: -${fmt(resumen.totalDeducciones - resumen.salud - resumen.pension)}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    return (
      `Estimado(a) ${e.nombre},\n\n` +
      `Le compartimos el detalle oficial de su colilla de pago de Ingeanclajes S.A.S. correspondiente al período ${periodoNomina?.label || "Corte de Nómina"}:\n\n` +
      `Documento de identidad: ${e.cedula || "N/A"}\n` +
      `Cargo: ${e.cargo || "N/A"}\n\n` +
      `RESUMEN DE DEVENGOS Y DEDUCCIONES:\n` +
      `-----------------------------------------\n` +
      `${desglose}\n` +
      `-----------------------------------------\n` +
      `TOTAL NETO A PAGAR: ${fmt(resumen.neto)}\n` +
      (e.banco
        ? `Forma de consignación: ${e.banco} (${e.tipoCuenta || "Ahorros"} N° ${e.numeroCuenta || "N/A"})\n`
        : "") +
      `-----------------------------------------\n\n` +
      (adjuntarPdf ? `En el archivo adjunto encontrará su colilla oficial en formato PDF.\n\n` : "") +
      `Para cualquier duda o aclaración sobre este corte, comuníquese con el área administrativa.\n\n` +
      `Cordialmente,\n` +
      `INGEANCLAJES S.A.S.\n` +
      `Gestión Humana y Nómina`
    );
  };

  const enviarEmpleadoPorGmail = async (e, resumen) => {
    if (!e.email?.trim()) return;

    setEnviandoIndividual((prev) => ({ ...prev, [e.id]: true }));
    setErrores((prev) => ({ ...prev, [e.id]: null }));

    try {
      let pdfBase64 = "";
      let nombreArchivo = "";

      if (adjuntarPdf) {
        try {
          const { blob, nombre } = await generarColillaPdf(e, resumen, periodoNomina);
          pdfBase64 = await blobABase64(blob);
          nombreArchivo = nombre;
        } catch (pdfErr) {
          console.warn("No se pudo generar PDF adjunto, enviando solo correo con detalle:", pdfErr);
        }
      }

      const mensaje = armarTextoColilla(e, resumen);
      const asunto = `Colilla de pago - ${periodoNomina?.label || "Corte"} - ${e.nombre}`;
      const numero = `COLILLA · ${periodoNomina?.label || ""}`;

      await enviarColillaPorCorreo({
        para: e.email.trim(),
        asunto,
        mensaje,
        numero,
        pdfBase64,
        nombreArchivo,
      });

      const ahora = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
      setEnviados((prev) => ({ ...prev, [e.id]: { ok: true, hora: ahora } }));
    } catch (err) {
      console.error("Error al enviar colilla por Gmail:", err);
      setErrores((prev) => ({ ...prev, [e.id]: err.message || "Error en el servidor de correo." }));
      throw err;
    } finally {
      setEnviandoIndividual((prev) => ({ ...prev, [e.id]: false }));
    }
  };

  const enviarTodosPorGmail = async () => {
    if (conCorreo.length === 0 || enviandoMasivo) return;

    setEnviandoMasivo(true);
    setProgresoMasivo({ actual: 0, total: conCorreo.length, actualNombre: "" });

    for (let i = 0; i < conCorreo.length; i++) {
      const { empleado: e, resumen } = conCorreo[i];
      setProgresoMasivo({ actual: i + 1, total: conCorreo.length, actualNombre: e.nombre });

      try {
        await enviarEmpleadoPorGmail(e, resumen);
      } catch (e) {
        // Continúa con el siguiente para no frenar la tanda masiva
      }

      // Pequeña pausa de 400ms para cuidar la tasa de peticiones de Gmail SMTP
      await new Promise((res) => setTimeout(res, 400));
    }

    setEnviandoMasivo(false);
  };

  const copiarTodosCorreos = () => {
    const lista = conCorreo.map(({ empleado: e }) => e.email.trim()).join(", ");
    navigator.clipboard.writeText(lista);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const generarUrlWhatsApp = (e, resumen) => {
    const telLimpio = Array.from(e.tel || "")
      .filter((ch) => ch >= "0" && ch <= "9")
      .join("");
    const texto = encodeURIComponent(
      `Hola ${e.nombre}, te compartimos el resumen de tu colilla de pago de Ingeanclajes S.A.S. (${periodoNomina?.label || "Corte"}).\n\n` +
        `• Cargo: ${e.cargo || "N/A"}\n` +
        `• Salario corte: ${fmt(resumen.salario)}\n` +
        (resumen.auxilioTransporte > 0 ? `• Aux. Transporte: ${fmt(resumen.auxilioTransporte)}\n` : "") +
        (resumen.horasExtras + resumen.comisiones > 0
          ? `• Extras/Comisiones: ${fmt(resumen.horasExtras + resumen.comisiones)}\n`
          : "") +
        `• Deducciones de ley: -${fmt(resumen.salud + resumen.pension)}\n\n` +
        `TOTAL NETO A PAGAR: ${fmt(resumen.neto)}\n` +
        (e.banco ? `Medio: ${e.banco} (${e.tipoCuenta || "Ahorros"} N° ${e.numeroCuenta || "N/A"})\n` : "") +
        `\nCualquier duda, comunícate con Gestión Humana.`
    );
    return `https://wa.me/57${telLimpio}?text=${texto}`;
  };

  const totalEnviadosGmail = conCorreo.filter(({ empleado: e }) => enviados[e.id]?.ok).length;
  const porcentaje = conCorreo.length > 0 ? Math.round((totalEnviadosGmail / conCorreo.length) * 100) : 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
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
          maxWidth: 900,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
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
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                boxShadow: "0 4px 10px rgba(37,99,235,0.3)",
              }}
            >
              ✉️
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                Enviar Colillas Masivas a Todos los Empleados
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                Periodo: <strong>{periodoNomina.label || "Corte Activo"}</strong> ·{" "}
                <span style={{ color: "#16a34a", fontWeight: 700 }}>Conexión automática Gmail de Ingeanclajes</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviandoMasivo}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 22,
              cursor: enviandoMasivo ? "not-allowed" : "pointer",
              color: "#64748b",
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>

        {/* Toolbar de acciones masivas */}
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
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => setCanal("gmail")}
              style={{
                background: canal === "gmail" ? "#2563eb" : "#f1f5f9",
                color: canal === "gmail" ? "#ffffff" : "#334155",
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
              <span>⚡</span> Por Gmail Automático ({conCorreo.length}/{total})
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

            {canal === "gmail" && (
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: "#475569",
                  marginLeft: 8,
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                <input
                  type="checkbox"
                  checked={adjuntarPdf}
                  onChange={(e) => setAdjuntarPdf(e.target.checked)}
                  style={{ cursor: "pointer" }}
                />
                <span>Adjuntar PDF oficial</span>
              </label>
            )}
          </div>

          {/* Botones de acción masiva / copia */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {canal === "gmail" ? (
              <button
                type="button"
                onClick={enviarTodosPorGmail}
                disabled={enviandoMasivo || conCorreo.length === 0}
                style={{
                  background: enviandoMasivo ? "#94a3b8" : "#1d4ed8",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  padding: "9px 18px",
                  fontSize: 12.5,
                  fontWeight: 800,
                  cursor: enviandoMasivo ? "not-allowed" : "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 3px 10px rgba(29,78,216,0.3)",
                }}
              >
                <span>{enviandoMasivo ? "⏳ Enviando..." : "🚀 Enviar a todos por Gmail ahora"}</span>
              </button>
            ) : (
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
              >
                {copiado ? "✓ Correos copiados" : "📋 Copiar todos los correos"}
              </button>
            )}
          </div>
        </div>

        {/* Barra de progreso visual si está enviando o ya hay avances */}
        {canal === "gmail" && (
          <div style={{ padding: "10px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 5 }}>
              <span style={{ fontWeight: 700, color: "#334155" }}>
                {enviandoMasivo
                  ? `⏳ Enviando (${progresoMasivo.actual} de ${progresoMasivo.total}): ${progresoMasivo.actualNombre}`
                  : `Progreso: ${totalEnviadosGmail} de ${conCorreo.length} colillas despachadas por Gmail (${porcentaje}%)`}
              </span>
              <span style={{ fontWeight: 800, color: totalEnviadosGmail === conCorreo.length ? "#16a34a" : "#2563eb" }}>
                {porcentaje}%
              </span>
            </div>
            <div style={{ width: "100%", height: 8, background: "#e2e8f0", borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  width: `${porcentaje}%`,
                  height: "100%",
                  background: totalEnviadosGmail === conCorreo.length ? "#16a34a" : "#2563eb",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        )}

        {/* Lista interactiva de empleados */}
        <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1, maxHeight: 420 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {resumenesActivos.map(({ empleado: e, resumen }, idx) => {
              const tieneContacto = canal === "gmail" ? Boolean(e.email?.trim()) : Boolean(e.tel?.trim());
              const valorContacto = canal === "gmail" ? e.email : e.tel;
              const envioData = enviados[e.id];
              const errorEnvio = errores[e.id];
              const cargando = Boolean(enviandoIndividual[e.id]);

              return (
                <div
                  key={e.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 14px",
                    borderRadius: 10,
                    border: envioData?.ok
                      ? "1px solid #bbf7d0"
                      : errorEnvio
                      ? "1px solid #fca5a5"
                      : tieneContacto
                      ? "1px solid #e2e8f0"
                      : "1px dashed #fed7aa",
                    background: envioData?.ok
                      ? "#f0fdf4"
                      : errorEnvio
                      ? "#fef2f2"
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
                            {canal === "gmail" ? "✉️ " : "📱 "}
                            <strong>{valorContacto}</strong>
                          </span>
                        ) : (
                          <span style={{ color: "#c2410c", fontWeight: 600 }}>
                            ⚠️ Sin {canal === "gmail" ? "correo electrónico" : "número de celular"} registrado
                          </span>
                        )}
                        {errorEnvio && (
                          <div style={{ color: "#dc2626", fontSize: 11, fontWeight: 700, marginTop: 2 }}>
                            ❌ {errorEnvio}
                          </div>
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

                    {/* Botón de acción */}
                    {canal === "gmail" ? (
                      tieneContacto ? (
                        envioData?.ok ? (
                          <div
                            style={{
                              background: "#dcfce7",
                              color: "#166534",
                              border: "1px solid #86efac",
                              borderRadius: 8,
                              padding: "6px 12px",
                              fontSize: 11.5,
                              fontWeight: 700,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                          >
                            <span>✓ Enviado por Gmail</span>
                            <span style={{ fontSize: 9.5, opacity: 0.8 }}>({envioData.hora})</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => enviarEmpleadoPorGmail(e, resumen)}
                            disabled={cargando || enviandoMasivo}
                            style={{
                              background: cargando ? "#94a3b8" : "#2563eb",
                              color: "#ffffff",
                              border: "none",
                              borderRadius: 8,
                              padding: "7px 14px",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: cargando || enviandoMasivo ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
                            }}
                          >
                            <span>{cargando ? "⏳ Enviando..." : "✉️ Enviar por Gmail"}</span>
                          </button>
                        )
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
                          Sin correo
                        </span>
                      )
                    ) : (
                      /* WhatsApp */
                      tieneContacto ? (
                        <a
                          href={generarUrlWhatsApp(e, resumen)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: "#16a34a",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: 8,
                            padding: "7px 14px",
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                            boxShadow: "0 2px 4px rgba(22,163,74,0.2)",
                          }}
                        >
                          💬 WhatsApp
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
                          Sin celular
                        </span>
                      )
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
            💡 Los correos se envían de forma directa y silenciosa a través de la cuenta oficial de Ingeanclajes por Gmail.
          </div>
          <button
            type="button"
            onClick={onCerrar}
            disabled={enviandoMasivo}
            style={{
              background: "#0f172a",
              color: "#ffffff",
              border: "none",
              borderRadius: 8,
              padding: "8px 22px",
              fontSize: 12.5,
              fontWeight: 700,
              cursor: enviandoMasivo ? "not-allowed" : "pointer",
            }}
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
