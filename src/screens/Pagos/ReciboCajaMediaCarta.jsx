import React from "react";
import { LOGO_INGEANCLAJES } from "../../assets/embeddedImages";
import { selloDe } from "../../lib/controlDocumental";
import { numeroALetras } from "../../lib/numeroALetras";

// Formatea moneda con decimales exactos estilo contable ERP: $ 2.500.000,00
export function fmtPesos(valor) {
  const num = Number(valor || 0);
  return "$ " + num.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Componente oficial de Recibo de Caja en formato Media Carta (8.5in x 5.5in / 216mm x 140mm).
 * Diseñado conforme al estándar ISO / SGC IA-FT-05 de Ingeanclajes SAS.
 * Incluye desglose oficial de retenciones en la fuente, IVA e ICA amarradas a sus cuentas PUC.
 */
export default function ReciboCajaMediaCarta({
  recibo,
  obra,
  cliente,
  empresaConfig,
  elaboradoPor = "Administración Ingeanclajes",
}) {
  const sello = selloDe(empresaConfig, "recibo_caja");
  const montoBruto = Number(recibo?.monto ?? recibo?.valor ?? 0);

  const ret = recibo?.retenciones || {};
  const vFuente = Number(ret.reteFuente?.valor ?? recibo?.valorRetFuente ?? 0);
  const vIca = Number(ret.reteIca?.valor ?? recibo?.valorReteica ?? 0);
  const vIva = Number(ret.reteIva?.valor ?? recibo?.valorReteiva ?? 0);
  const vOtras = Number(ret.otras?.valor ?? recibo?.valorOtrasRet ?? 0);
  const totalRet = vFuente + vIca + vIva + vOtras;
  const montoNeto = Number(recibo?.valorNeto ?? Math.max(0, montoBruto - totalRet));
  const tieneRet = totalRet > 0;

  const montoLetras = numeroALetras(tieneRet ? montoNeto : montoBruto);

  const saldoAnterior = Number(recibo?.saldoAnterior ?? (Number(obra?.saldo || 0) + montoBruto));
  const saldoNuevo = Number(recibo?.saldoNuevo ?? Math.max(0, saldoAnterior - montoBruto));

  const clienteNombre = cliente?.nombre || obra?.cliente || "Cliente sin registrar";
  const clienteNit = cliente?.nit || obra?.nit || "No registrado";
  const clienteTel = cliente?.tel || cliente?.telefono || obra?.tel || "No registrado";
  const clienteDir = cliente?.direccion || obra?.direccion || "No registrada";
  const clienteCiudad = cliente?.ciudad || obra?.ciudad || "Envigado";

  return (
    <div
      id="pz"
      className="recibo-caja-media-carta doc-shell"
      style={{
        width: "100%",
        maxWidth: 780,
        margin: "0 auto",
        background: "#ffffff",
        color: "#0f172a",
        fontFamily: "'Aptos', 'Segoe UI', Arial, sans-serif",
        fontSize: "10.5px",
        lineHeight: 1.3,
        border: "1px solid #cbd5e1",
        borderRadius: 4,
        padding: "14px 18px",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* 1. Encabezado Corporativo y Control SGC */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "stretch",
          borderBottom: "2px solid #cc0000",
          paddingBottom: 6,
          marginBottom: 8,
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img
            src={LOGO_INGEANCLAJES}
            alt="Ingeanclajes"
            style={{ height: 38, objectFit: "contain" }}
          />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 900, color: "#cc0000", letterSpacing: 0.5 }}>
              INGEANCLAJES S.A.S.
            </div>
            <div style={{ fontSize: 8, fontWeight: 700, color: "#334155", letterSpacing: 1.5, textTransform: "uppercase" }}>
              Especialistas en Anclajes
            </div>
            <div style={{ fontSize: 7.5, color: "#64748b" }}>
              NIT: 900.193.965-4 · Régimen Ordinario
            </div>
          </div>
        </div>

        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 7.5, color: "#475569", lineHeight: 1.25 }}>
            Calle 38 sur # 36 - 48, Envigado (Antioquia)<br />
            PBX: (604) 448 26 86 · Cel: 315 288 9541<br />
            <span style={{ color: "#cc0000", fontWeight: 700 }}>www.ingeanclajessas.com</span>
          </div>
        </div>

        {/* Cuadro Oficial SGC Calidad */}
        <div
          style={{
            border: "1px solid #334155",
            width: 135,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            textAlign: "center",
            fontSize: 7,
            background: "#f8fafc",
          }}
        >
          <div style={{ padding: "1px 3px", borderBottom: "1px solid #334155", fontWeight: 600, color: "#475569" }}>
            {sello?.linea || "SGC - INGEANCLAJES"}
          </div>
          <div style={{ padding: "1px 3px", borderBottom: "1px solid #334155", fontWeight: 800, fontFamily: "Consolas, monospace", fontSize: 8, color: "#0f172a" }}>
            {sello?.codigo || "IA-FT-05"}
          </div>
          <div style={{ padding: "1px 3px", borderBottom: "1px solid #334155", color: "#64748b" }}>
            {sello?.version || "Versión 1"}
          </div>
          <div style={{ padding: "1px 3px", fontWeight: 800, color: "#cc0000", fontSize: 8.5 }}>
            No. {recibo?.id || "RC-0000"}
          </div>
        </div>
      </div>

      {/* 2. Barra de Título y Valor Destacado */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#f1f5f9",
          border: "1px solid #cbd5e1",
          borderRadius: 4,
          padding: "5px 10px",
          marginBottom: 8,
        }}
      >
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: "#0f172a", textTransform: "uppercase", letterSpacing: 0.5 }}>
            RECIBO DE CAJA / COMPROBANTE DE INGRESO
          </div>
          <div style={{ fontSize: 7.5, color: "#64748b" }}>
            Soporte Oficial de Recaudo · Imputación Contable PUC
          </div>
        </div>
        <div
          style={{
            background: "#ffffff",
            border: "1.5px solid #cc0000",
            borderRadius: 4,
            padding: "3px 8px",
            textAlign: "right",
          }}
        >
          <div style={{ fontSize: 7, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
            {tieneRet ? `Bruto: ${fmtPesos(montoBruto)} · Ret: -${fmtPesos(totalRet)}` : "Valor Recibido"}
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, color: "#cc0000", fontFamily: "Consolas, monospace" }}>
            {tieneRet ? `NETO: ${fmtPesos(montoNeto)}` : fmtPesos(montoBruto)}
          </div>
        </div>
      </div>

      {/* 3. Cuadrícula Institucional de Datos del Cliente y Obra */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 6, fontSize: 9 }}>
        <tbody>
          <tr>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px", background: "#f8fafc", width: "16%", fontWeight: 700, color: "#334155" }}>
              CIUDAD Y FECHA:
            </td>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px", width: "34%" }}>
              {clienteCiudad}, {recibo?.fecha || "Hoy"}
            </td>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px", background: "#f8fafc", width: "16%", fontWeight: 700, color: "#334155" }}>
              FORMA DE PAGO:
            </td>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px", width: "34%" }}>
              <strong>{recibo?.metodo || recibo?.medio || "Transferencia"}</strong>
            </td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px", background: "#f8fafc", fontWeight: 700, color: "#334155" }}>
              RECIBIDO DE:
            </td>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px" }}>
              <strong>{clienteNombre}</strong>
            </td>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px", background: "#f8fafc", fontWeight: 700, color: "#334155" }}>
              NIT / C.C.:
            </td>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px" }}>
              <strong>{clienteNit}</strong>
            </td>
          </tr>
          <tr>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px", background: "#f8fafc", fontWeight: 700, color: "#334155" }}>
              DIRECCIÓN / TEL:
            </td>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px" }}>
              {clienteDir} · Tel: {clienteTel}
            </td>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px", background: "#f8fafc", fontWeight: 700, color: "#334155" }}>
              OBRA / PROYECTO:
            </td>
            <td style={{ border: "1px solid #cbd5e1", padding: "3px 6px" }}>
              <strong>{obra?.id ? `${obra.id} · ` : ""}{obra?.proyecto || obra?.obra || "Pago general"}</strong>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 4. Desglose Contable de Retenciones Practicadas por el Cliente */}
      {tieneRet && (
        <div
          style={{
            border: "1px solid #fed7aa",
            borderRadius: 4,
            background: "#fffbeb",
            padding: "4px 8px",
            marginBottom: 6,
            fontSize: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px dashed #fde68a", paddingBottom: 2, marginBottom: 3 }}>
            <span style={{ fontWeight: 800, color: "#92400e", textTransform: "uppercase" }}>
              🛡️ Retenciones Practicadas por el Cliente (Anticipo de Impuestos a Favor de Ingeanclajes):
            </span>
            <span style={{ fontWeight: 800, color: "#b45309", fontFamily: "Consolas, monospace" }}>
              Total Retenido: -{fmtPesos(totalRet)}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            <div style={{ background: "#ffffff", padding: "3px 5px", borderRadius: 3, border: "1px solid #fef3c7" }}>
              <span style={{ color: "#78350f", fontSize: 7.5 }}>ReteFuente (Cta 135515):</span><br />
              <strong style={{ fontFamily: "Consolas, monospace", color: vFuente > 0 ? "#b45309" : "#64748b" }}>
                {vFuente > 0 ? `${ret.reteFuente?.tarifa ? `${ret.reteFuente.tarifa}% · ` : ""}-${fmtPesos(vFuente)}` : "$ 0,00"}
              </strong>
            </div>
            <div style={{ background: "#ffffff", padding: "3px 5px", borderRadius: 3, border: "1px solid #fef3c7" }}>
              <span style={{ color: "#78350f", fontSize: 7.5 }}>ReteICA (Cta 135518):</span><br />
              <strong style={{ fontFamily: "Consolas, monospace", color: vIca > 0 ? "#b45309" : "#64748b" }}>
                {vIca > 0 ? `${ret.reteIca?.tarifa ? `${ret.reteIca.tarifa}‰ · ` : ""}-${fmtPesos(vIca)}` : "$ 0,00"}
              </strong>
            </div>
            <div style={{ background: "#ffffff", padding: "3px 5px", borderRadius: 3, border: "1px solid #fef3c7" }}>
              <span style={{ color: "#78350f", fontSize: 7.5 }}>ReteIVA (Cta 135517):</span><br />
              <strong style={{ fontFamily: "Consolas, monospace", color: vIva > 0 ? "#b45309" : "#64748b" }}>
                {vIva > 0 ? `-${fmtPesos(vIva)}` : "$ 0,00"}
              </strong>
            </div>
            <div style={{ background: "#ffffff", padding: "3px 5px", borderRadius: 3, border: "1px solid #fef3c7" }}>
              <span style={{ color: "#78350f", fontSize: 7.5 }}>Otras (Cta 135595):</span><br />
              <strong style={{ fontFamily: "Consolas, monospace", color: vOtras > 0 ? "#b45309" : "#64748b" }}>
                {vOtras > 0 ? `-${fmtPesos(vOtras)}` : "$ 0,00"}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* 5. Bloque de Valor en Letras y Concepto */}
      <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "5px 8px", marginBottom: 6, background: "#fafafa" }}>
        <div style={{ fontSize: 8.5, marginBottom: 2 }}>
          <strong style={{ color: "#334155" }}>LA SUMA DE (en letras): </strong>
          <span style={{ fontWeight: 700, color: "#0f172a" }}>
            {montoLetras}
            {tieneRet ? ` (Neto recibido de un abono bruto de ${fmtPesos(montoBruto)} con retenciones de ${fmtPesos(totalRet)})` : ""}
          </span>
        </div>
        <div style={{ fontSize: 8.5 }}>
          <strong style={{ color: "#334155" }}>POR CONCEPTO DE: </strong>
          <span>{recibo?.tipo || "Abono"} {recibo?.notas ? `— ${recibo.notas}` : "— Aplicación a saldo comercial de obra"}</span>
        </div>
      </div>

      {/* 6. Tabla Resumen de Saldos */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 8, fontSize: 8.5 }}>
        <thead>
          <tr style={{ background: "#f1f5f9", color: "#334155", textAlign: "center" }}>
            <th style={{ border: "1px solid #cbd5e1", padding: "3px" }}>Total Contratado</th>
            <th style={{ border: "1px solid #cbd5e1", padding: "3px" }}>Saldo Anterior</th>
            <th style={{ border: "1px solid #cbd5e1", padding: "3px", color: "#003B71" }}>Abono a Cartera (Bruto)</th>
            {tieneRet && <th style={{ border: "1px solid #cbd5e1", padding: "3px", color: "#c2410c" }}>(-) Retenciones</th>}
            {tieneRet && <th style={{ border: "1px solid #cbd5e1", padding: "3px", color: "#166534" }}>(=) Neto Recibido</th>}
            <th style={{ border: "1px solid #cbd5e1", padding: "3px", color: saldoNuevo > 0 ? "#cc0000" : "#166534" }}>Nuevo Saldo Pendiente</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ textAlign: "center", fontFamily: "Consolas, monospace", fontWeight: 700 }}>
            <td style={{ border: "1px solid #e2e8f0", padding: "4px" }}>{fmtPesos(obra?.total || saldoAnterior)}</td>
            <td style={{ border: "1px solid #e2e8f0", padding: "4px", color: "#475569" }}>{fmtPesos(saldoAnterior)}</td>
            <td style={{ border: "1px solid #e2e8f0", padding: "4px", color: "#003B71" }}>- {fmtPesos(montoBruto)}</td>
            {tieneRet && <td style={{ border: "1px solid #e2e8f0", padding: "4px", color: "#c2410c" }}>- {fmtPesos(totalRet)}</td>}
            {tieneRet && <td style={{ border: "1px solid #e2e8f0", padding: "4px", color: "#166534" }}>{fmtPesos(montoNeto)}</td>}
            <td style={{ border: "1px solid #e2e8f0", padding: "4px", color: saldoNuevo > 0 ? "#cc0000" : "#166534", fontSize: 9.5 }}>
              {fmtPesos(saldoNuevo)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 7. Firmas de Legalización (2 casillas) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 6 }}>
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "6px 8px", textAlign: "center", background: "#ffffff" }}>
          <div style={{ height: 26, borderBottom: "1px solid #94a3b8", marginBottom: 3, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <span style={{ fontSize: 8.5, color: "#166534", fontWeight: 700 }}>✓ Recibido Conforme</span>
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: "#0f172a" }}>INGEANCLAJES S.A.S.</div>
          <div style={{ fontSize: 7.5, color: "#64748b" }}>Elaboró / Recibió: {elaboradoPor}</div>
        </div>

        <div style={{ border: "1px solid #cbd5e1", borderRadius: 4, padding: "6px 8px", textAlign: "center", background: "#ffffff" }}>
          <div style={{ height: 26, borderBottom: "1px solid #94a3b8", marginBottom: 3 }} />
          <div style={{ fontSize: 9, fontWeight: 700, color: "#0f172a" }}>{clienteNombre}</div>
          <div style={{ fontSize: 7.5, color: "#64748b" }}>Firma y C.C. / Sello de Quien Entrega (Cliente Pagador)</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Genera el documento HTML completo listo para abrir en nueva pestaña e imprimir
 * nativamente en formato Media Carta (Half Letter / 8.5in x 5.5in).
 */
export function generarHtmlMediaCarta(recibo, obra, cliente, empresaConfig, elaboradoPor) {
  const sello = selloDe(empresaConfig, "recibo_caja");
  const montoBruto = Number(recibo?.monto ?? recibo?.valor ?? 0);

  const ret = recibo?.retenciones || {};
  const vFuente = Number(ret.reteFuente?.valor ?? recibo?.valorRetFuente ?? 0);
  const vIca = Number(ret.reteIca?.valor ?? recibo?.valorReteica ?? 0);
  const vIva = Number(ret.reteIva?.valor ?? recibo?.valorReteiva ?? 0);
  const vOtras = Number(ret.otras?.valor ?? recibo?.valorOtrasRet ?? 0);
  const totalRet = vFuente + vIca + vIva + vOtras;
  const montoNeto = Number(recibo?.valorNeto ?? Math.max(0, montoBruto - totalRet));
  const tieneRet = totalRet > 0;

  const montoLetras = numeroALetras(tieneRet ? montoNeto : montoBruto);

  const saldoAnterior = Number(recibo?.saldoAnterior ?? (Number(obra?.saldo || 0) + montoBruto));
  const saldoNuevo = Number(recibo?.saldoNuevo ?? Math.max(0, saldoAnterior - montoBruto));

  const clienteNombre = cliente?.nombre || obra?.cliente || "Cliente sin registrar";
  const clienteNit = cliente?.nit || obra?.nit || "No registrado";
  const clienteTel = cliente?.tel || cliente?.telefono || obra?.tel || "No registrado";
  const clienteDir = cliente?.direccion || obra?.direccion || "No registrada";
  const clienteCiudad = cliente?.ciudad || obra?.ciudad || "Envigado";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Recibo de Caja No. ${recibo?.id || "RC"}</title>
  <style>
    @page {
      size: 8.5in 5.5in;
      margin: 5mm;
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; }
    body {
      font-family: 'Aptos', 'Segoe UI', Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.25;
      color: #0f172a;
      background: #ffffff;
      padding: 2px;
    }
    .sheet {
      width: 100%;
      border: 1px solid #cbd5e1;
      padding: 10px 14px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: stretch;
      border-bottom: 2px solid #cc0000;
      padding-bottom: 5px;
      margin-bottom: 6px;
    }
    .title-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 4px 8px;
      margin-bottom: 6px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 6px; font-size: 8pt; }
    td, th { border: 1px solid #cbd5e1; padding: 3px 5px; }
    .lbl { background: #f8fafc; font-weight: 700; color: #334155; }
    .mono { font-family: Consolas, monospace; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 6px; }
    .sig-box { border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-size: 7.5pt; }
    .sig-line { height: 24px; border-bottom: 1px solid #94a3b8; margin-bottom: 3px; }
    @media print {
      body { padding: 0; }
      .sheet { border: 1px solid #000; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div style="display:flex; align-items:center; gap:8px;">
        <img src="${LOGO_INGEANCLAJES}" style="height:34px; object-fit:contain;" alt="Logo" />
        <div>
          <div style="font-size:10.5pt; font-weight:900; color:#cc0000;">INGEANCLAJES S.A.S.</div>
          <div style="font-size:6.5pt; font-weight:700; color:#334155; letter-spacing:1px; text-transform:uppercase;">Especialistas en Anclajes</div>
          <div style="font-size:6pt; color:#64748b;">NIT: 900.193.965-4 · Régimen Ordinario</div>
        </div>
      </div>
      <div style="text-align:center; font-size:6.5pt; color:#475569; display:flex; flex-direction:column; justify-content:center;">
        <div>Calle 38 sur # 36 - 48, Envigado (Antioquia)</div>
        <div>PBX: (604) 448 26 86 · Cel: 315 288 9541</div>
        <div style="color:#cc0000; font-weight:700;">www.ingeanclajessas.com</div>
      </div>
      <div style="border:1px solid #334155; width:125px; text-align:center; font-size:6pt; background:#f8fafc;">
        <div style="padding:1px; border-bottom:1px solid #334155;">${sello?.linea || "SGC - INGEANCLAJES"}</div>
        <div style="padding:1px; border-bottom:1px solid #334155; font-weight:700; font-family:Consolas,monospace;">${sello?.codigo || "IA-FT-05"}</div>
        <div style="padding:1px; border-bottom:1px solid #334155;">${sello?.version || "Versión 1"}</div>
        <div style="padding:1px; font-weight:800; color:#cc0000; font-size:7.5pt;">No. ${recibo?.id || "RC-0000"}</div>
      </div>
    </div>

    <div class="title-bar">
      <div>
        <div style="font-size:9pt; font-weight:800; text-transform:uppercase;">RECIBO DE CAJA / COMPROBANTE DE INGRESO</div>
        <div style="font-size:6pt; color:#64748b;">Soporte Oficial de Recaudo · Imputación Contable PUC</div>
      </div>
      <div style="background:#fff; border:1.5px solid #cc0000; padding:2px 6px; text-align:right;">
        <div style="font-size:6pt; font-weight:700; color:#64748b;">${tieneRet ? `Bruto: ${fmtPesos(montoBruto)} · Ret: -${fmtPesos(totalRet)}` : "VALOR RECIBIDO"}</div>
        <div style="font-size:10.5pt; font-weight:900; color:#cc0000; font-family:Consolas,monospace;">${tieneRet ? `NETO: ${fmtPesos(montoNeto)}` : fmtPesos(montoBruto)}</div>
      </div>
    </div>

    <table>
      <tr>
        <td class="lbl" style="width:16%;">CIUDAD Y FECHA:</td>
        <td style="width:34%;">${clienteCiudad}, ${recibo?.fecha || "Hoy"}</td>
        <td class="lbl" style="width:16%;">FORMA DE PAGO:</td>
        <td style="width:34%;"><strong>${recibo?.metodo || recibo?.medio || "Transferencia"}</strong></td>
      </tr>
      <tr>
        <td class="lbl">RECIBIDO DE:</td>
        <td><strong>${clienteNombre}</strong></td>
        <td class="lbl">NIT / C.C.:</td>
        <td><strong>${clienteNit}</strong></td>
      </tr>
      <tr>
        <td class="lbl">DIRECCIÓN / TEL:</td>
        <td>${clienteDir} · Tel: ${clienteTel}</td>
        <td class="lbl">OBRA / DESTINO:</td>
        <td><strong>${obra?.id ? `${obra.id} · ` : ""}${obra?.proyecto || obra?.obra || "Pago general"}</strong></td>
      </tr>
    </table>

    ${tieneRet ? `
    <div style="border:1px solid #fed7aa; background:#fffbeb; padding:3px 6px; margin-bottom:5px; font-size:7pt;">
      <div style="display:flex; justify-content:space-between; border-bottom:1px dashed #fde68a; padding-bottom:1px; margin-bottom:2px;">
        <strong style="color:#92400e;">🛡️ RETENCIONES PRACTICADAS POR EL CLIENTE (ANTICIPO DE IMPUESTOS A FAVOR):</strong>
        <strong style="color:#b45309; font-family:Consolas,monospace;">Total Retenido: -${fmtPesos(totalRet)}</strong>
      </div>
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:4px;">
        <div>ReteFuente (Cta 135515): <strong>${vFuente > 0 ? `${ret.reteFuente?.tarifa ? `${ret.reteFuente.tarifa}% · ` : ""}-${fmtPesos(vFuente)}` : "$ 0,00"}</strong></div>
        <div>ReteICA (Cta 135518): <strong>${vIca > 0 ? `${ret.reteIca?.tarifa ? `${ret.reteIca.tarifa}‰ · ` : ""}-${fmtPesos(vIca)}` : "$ 0,00"}</strong></div>
        <div>ReteIVA (Cta 135517): <strong>${vIva > 0 ? `-${fmtPesos(vIva)}` : "$ 0,00"}</strong></div>
        <div>Otras (Cta 135595): <strong>${vOtras > 0 ? `-${fmtPesos(vOtras)}` : "$ 0,00"}</strong></div>
      </div>
    </div>
    ` : ""}

    <div style="border:1px solid #cbd5e1; padding:4px 6px; margin-bottom:5px; font-size:7pt; background:#fafafa;">
      <div><strong style="color:#334155;">LA SUMA DE (en letras):</strong> <strong>${montoLetras}${tieneRet ? ` (Neto recibido de un abono bruto de ${fmtPesos(montoBruto)} con retenciones de ${fmtPesos(totalRet)})` : ""}</strong></div>
      <div style="margin-top:1px;"><strong style="color:#334155;">POR CONCEPTO DE:</strong> ${recibo?.tipo || "Abono"} ${recibo?.notas ? `— ${recibo.notas}` : "— Aplicación a saldo comercial de obra"}</div>
    </div>

    <table>
      <tr style="background:#f1f5f9; text-align:center;">
        <th>Total Contratado</th>
        <th>Saldo Anterior</th>
        <th style="color:#003B71;">Abono a Cartera (Bruto)</th>
        ${tieneRet ? `<th style="color:#c2410c;">(-) Retenciones</th>` : ""}
        ${tieneRet ? `<th style="color:#166534;">(=) Neto Recibido</th>` : ""}
        <th style="color:${saldoNuevo > 0 ? "#cc0000" : "#166534"};">Nuevo Saldo Pendiente</th>
      </tr>
      <tr style="text-align:center; font-family:Consolas,monospace; font-weight:700;">
        <td>${fmtPesos(obra?.total || saldoAnterior)}</td>
        <td style="color:#475569;">${fmtPesos(saldoAnterior)}</td>
        <td style="color:#003B71;">- ${fmtPesos(montoBruto)}</td>
        ${tieneRet ? `<td style="color:#c2410c;">- ${fmtPesos(totalRet)}</td>` : ""}
        ${tieneRet ? `<td style="color:#166534;">${fmtPesos(montoNeto)}</td>` : ""}
        <td style="color:${saldoNuevo > 0 ? "#cc0000" : "#166534"}; font-size:8.5pt;">${fmtPesos(saldoNuevo)}</td>
      </tr>
    </table>

    <div class="signatures">
      <div class="sig-box">
        <div class="sig-line" style="display:flex; align-items:flex-end; justify-content:center; color:#166534; font-weight:700; font-size:7pt;">✓ Recibido Conforme</div>
        <div style="font-weight:700;">INGEANCLAJES S.A.S.</div>
        <div style="color:#64748b; font-size:6pt;">Elaboró / Recibió: ${elaboradoPor}</div>
      </div>
      <div class="sig-box">
        <div class="sig-line"></div>
        <div style="font-weight:700;">${clienteNombre}</div>
        <div style="color:#64748b; font-size:6pt;">Firma y C.C. / Sello del Cliente Pagador</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
