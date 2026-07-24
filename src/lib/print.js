// Impresion generica y documentos de nomina (colilla, vacaciones, liquidacion)
import { today } from "./format";
import { LOGO_INGEANCLAJES } from "../assets/embeddedImages";
import { openPrintTab } from "./cotizacionPrint";
import { NOMINA_CO_2026 } from "./nomina";

export function printCurrentPz(title = "Documento"){
  const node = document.getElementById("pz");
  if(!node) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      @page{size:Letter;margin:12mm;}
      *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Aptos,"Segoe UI",Arial,sans-serif;font-size:12pt;line-height:1.5;}
      .doc-shell{background:#fff;color:#111;}
      .doc-shell table{width:100%;border-collapse:collapse;}
      table,tr,td,th{break-inside:avoid;page-break-inside:avoid;}
      img{max-width:100%;}
    </style>
  </head><body>${node.outerHTML}</body></html>`;
  openPrintTab(html, title);
}

export function printColilla(empleado, resumen, periodo){
  const fmtC = n => '$ ' + Math.round(Number(n)||0).toLocaleString('es-CO');
  const periodLabel = periodo?.label || (periodo?.mes || new Date().toISOString().slice(0,7));
  const devengados = [
    ['Salario del corte', resumen.salario],
    ['Incapacidad empleador', resumen.incapacidadEmpleador],
    ['Incapacidad EPS', resumen.incapacidadEPS],
    ['Incapacidad Colpensiones', resumen.incapacidadColpensiones],
    ['Incapacidad ARL', resumen.incapacidadARL],
    ['Incapacidad EPS (541+)', resumen.incapacidadEPS540],
    ['Auxilio de transporte', resumen.auxilioTransporte],
    ['Horas extras', resumen.horasExtras],
    ['Comisiones', resumen.comisiones],
  ].filter(([,valor])=>Number(valor||0)>0);
  const deducciones = [
    ['Salud (4%)', resumen.salud],
    ['Pension (4%)', resumen.pension],
    ['Otras deducciones', resumen.otrasDeducciones],
  ].filter(([,valor])=>Number(valor||0)>0);
  const devRows = devengados.map(([concepto,valor])=>`<tr><td>${concepto}</td><td style="text-align:right">${fmtC(valor)}</td></tr>`).join('');
  const dedRows = deducciones.length
    ? deducciones.map(([concepto,valor])=>`<tr><td>${concepto}</td><td style="text-align:right">- ${fmtC(valor)}</td></tr>`).join('')
    : `<tr><td>Sin deducciones adicionales</td><td style="text-align:right">${fmtC(0)}</td></tr>`;
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Colilla ${periodLabel}</title>
<style>
@page{size:5.5in 8.5in;margin:8mm;}
body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#fff;color:#0f172a;}
.sheet{width:100%;max-width:127mm;margin:0 auto;border:1px solid #dbe3ec;border-radius:16px;overflow:hidden;background:#fff;}
.head{padding:14px 16px;background:linear-gradient(135deg,#fff7ed,#ffffff);border-bottom:1px solid #f1f5f9;}
.brand{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;}
.brand img{height:42px;object-fit:contain;}
.brand-title{font-size:10px;color:#64748b;letter-spacing:1.2px;text-transform:uppercase;font-weight:700;}
.chip{display:inline-block;background:#142840;color:#fff;border-radius:999px;padding:5px 10px;font-size:10px;font-weight:700;}
.employee{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;font-size:11px;line-height:1.6;}
.employee strong{display:block;font-size:14px;color:#142840;margin-bottom:2px;}
.body{padding:14px 16px 16px;}
.section{margin-bottom:14px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;}
.section h3{margin:0;padding:9px 12px;font-size:10px;letter-spacing:1px;text-transform:uppercase;background:#f8fafc;color:#475569;}
table{width:100%;border-collapse:collapse;font-size:11px;}
td{padding:8px 12px;border-top:1px solid #f1f5f9;}
.total{display:flex;justify-content:space-between;align-items:center;background:#142840;color:#fff;border-radius:12px;padding:12px 14px;}
.total .amount{font-size:18px;font-weight:800;color:#4ade80;}
.foot{padding-top:10px;text-align:center;color:#94a3b8;font-size:9px;line-height:1.5;}
@media print{body{padding:0;background:#fff;}.sheet{border:none;border-radius:0;box-shadow:none;max-width:none;}}
</style></head><body><div class="sheet">
<div class="head">
  <div class="brand">
    <img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes"/>
    <div style="text-align:right">
      <div class="brand-title">Colilla de pago</div>
      <div class="chip">${periodLabel}</div>
    </div>
  </div>
  <div class="employee">
    <strong>${empleado.nombre}</strong>
    Cedula: ${empleado.cedula||'-'} · Cargo: ${empleado.cargo||'-'}<br/>Banco: ${empleado.banco||'-'} · Cuenta: ${empleado.numeroCuenta||'-'}
    Periodo: ${periodLabel} · Dias laborados: ${resumen.diasNomina}${resumen.diasIncapacidad>0 ? ` · Dias incapacidad: ${resumen.diasIncapacidad}` : ""}
  </div>
</div>
<div class="body">
  <div class="section">
    <h3>Devengados</h3>
    <table>${devRows || `<tr><td>Sin devengados</td><td style="text-align:right">${fmtC(0)}</td></tr>`}</table>
  </div>
  <div class="section">
    <h3>Deducciones</h3>
    <table>${dedRows}</table>
  </div>
  <div class="total"><span>Total neto a pagar</span><span class="amount">${fmtC(resumen.neto)}</span></div>
  <div class="foot">Documento generado el ${new Date().toLocaleDateString('es-CO')} · Ingeanclajes S.A.S</div>
</div>
</div></body></html>`;
  openPrintTab(html, `Colilla ${empleado.nombre} - ${periodLabel}`);
}

export function printVacaciones(empleado, diasVacaciones, valorVacaciones){
  const fmtC = n => '$ ' + Math.round(Number(n)||0).toLocaleString('es-CO');
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Vacaciones ${empleado.nombre}</title>
<style>
@page{size:Letter;margin:12mm;}
body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:18px;background:#fff;color:#0f172a;}
.wrap{max-width:620px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;}
.hd{padding:16px 18px;background:linear-gradient(135deg,#ecfdf5,#ffffff);border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;}
.hd img{height:48px;object-fit:contain;}
.bd{padding:18px;}
.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:14px;line-height:1.7;font-size:12px;}
.total{background:#166534;color:#fff;border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;font-size:16px;font-weight:700;}
.footer{text-align:center;color:#94a3b8;font-size:10px;padding:14px;}
</style></head><body><div class="wrap">
<div class="hd"><img src="${LOGO_INGEANCLAJES}" alt="Ingeanclajes"/><div style="text-align:right"><div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#64748b;font-weight:700">Liquidacion de vacaciones</div><div style="font-size:12px;font-weight:700;color:#166534">${today()}</div></div></div>
<div class="bd">
<div class="card"><strong style="font-size:16px;color:#142840">${empleado.nombre}</strong><br/>Cedula: ${empleado.cedula||'-'} · Cargo: ${empleado.cargo||'-'}<br/>Salario base: ${fmtC(empleado.salario||0)} · Dias a liquidar: ${diasVacaciones}</div>
<div class="card">Esta liquidacion corresponde a vacaciones pagadas sin retiro del empleado. Valor calculado sobre salario basico: ${fmtC(empleado.salario||0)} ÷ 30 × ${diasVacaciones} dias.</div>
<div class="total"><span>Valor vacaciones</span><span>${fmtC(valorVacaciones)}</span></div>
</div>
<div class="footer">Ingeanclajes S.A.S · Documento generado automaticamente</div>
</div></body></html>`;
  openPrintTab(html, `Vacaciones ${empleado.nombre}`);
}

export function printLiquidacion(empleado, pfl, indemn, diasVacPagar, fechaSalida, resumenRetiro, periodoRetiro){
  const fmtC = n => '$ ' + Math.round(Number(n)||0).toLocaleString('es-CO');
  const vacValorReal = Math.round(empleado.salario * (diasVacPagar||0) / 30);
  const total = pfl.cesantias + pfl.interesesCesantias + pfl.prima + vacValorReal + indemn + (resumenRetiro?.neto||0);
  const rows = [
    ['Salario días trabajados', (resumenRetiro?.diasNomina||0) + ' días × ' + fmtC((resumenRetiro?.valorDia)||0), fmtC(resumenRetiro?.salario||0)],
    ...((resumenRetiro?.incapacidadEmpleador||0)>0 ? [['Incapacidad empleador', 'Enfermedad común · días 1-2 del tramo reportado', fmtC(resumenRetiro?.incapacidadEmpleador||0)]] : []),
    ...((resumenRetiro?.incapacidadEPS||0)>0 ? [['Incapacidad EPS', 'Origen común a cargo de EPS', fmtC(resumenRetiro?.incapacidadEPS||0)]] : []),
    ...((resumenRetiro?.incapacidadColpensiones||0)>0 ? [['Incapacidad Colpensiones', 'Prórroga común día 181 a 540', fmtC(resumenRetiro?.incapacidadColpensiones||0)]] : []),
    ...((resumenRetiro?.incapacidadARL||0)>0 ? [['Incapacidad ARL', 'Origen laboral al 100% del IBC', fmtC(resumenRetiro?.incapacidadARL||0)]] : []),
    ...((resumenRetiro?.incapacidadEPS540||0)>0 ? [['Incapacidad EPS (541+)', 'Prórroga común posterior a 540 días', fmtC(resumenRetiro?.incapacidadEPS540||0)]] : []),
    ['Auxilio de transporte proporcional', 'Auxilio del corte según ' + (resumenRetiro?.diasNomina||0) + ' días', fmtC(resumenRetiro?.auxilioTransporte||0)],
    ...((resumenRetiro?.horasExtras||0)>0 ? [['Horas extras pendientes', 'Registradas dentro del corte final', fmtC(resumenRetiro?.horasExtras||0)]] : []),
    ...((resumenRetiro?.comisiones||0)>0 ? [['Comisiones pendientes', 'Registradas dentro del corte final', fmtC(resumenRetiro?.comisiones||0)]] : []),
    ...((resumenRetiro?.salud||0)>0 ? [['Descuento salud empleado', '4% sobre salario + incapacidades + extras + comisiones', '- ' + fmtC(resumenRetiro?.salud||0)]] : []),
    ...((resumenRetiro?.pension||0)>0 ? [['Descuento pensión empleado', '4% sobre salario + incapacidades + extras + comisiones', '- ' + fmtC(resumenRetiro?.pension||0)]] : []),
    ...((resumenRetiro?.otrasDeducciones||0)>0 ? [['Otras deducciones', 'Conceptos autorizados del empleado', '- ' + fmtC(resumenRetiro?.otrasDeducciones||0)]] : []),
    ['Neto nómina final', periodoRetiro?.label||'Corte final', fmtC(resumenRetiro?.neto||0)],
    ['Cesantías (Art. 249 CST)', (empleado.salario + (empleado.salario<=NOMINA_CO_2026.topeAuxilio?NOMINA_CO_2026.auxilioTransporte:0)).toLocaleString('es-CO') + ' × ' + pfl.diasTrabajados + 'd ÷ 360', fmtC(pfl.cesantias)],
    ['Intereses cesantías (12% anual)', '12% s/ ' + fmtC(pfl.cesantias), fmtC(pfl.interesesCesantias)],
    ['Prima de servicios (Art. 306 CST)', 'Base × ' + pfl.diasTrabajados + 'd ÷ 360', fmtC(pfl.prima)],
    ['Vacaciones (Art. 186 CST)', diasVacPagar + ' días × ' + fmtC(empleado.salario) + ' ÷ 30', fmtC(vacValorReal)],
    ...(indemn>0?[['Indemnización sin justa causa (Art. 64 CST)', 'Según años de servicio', fmtC(indemn)]]:[]),
  ];
  const rowsHtml = rows.map(([k,b,v])=>
    '<tr><td style="padding:6px 14px;border-bottom:1px solid #f1f5f9">'+k+'</td><td style="padding:6px 14px;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:10px">'+b+'</td><td style="padding:6px 14px;border-bottom:1px solid #f1f5f9;text-align:right;font-weight:600">'+v+'</td></tr>'
  ).join('');
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Liquidación '+empleado.nombre+'</title>'
    +'<style>body{font-family:"Segoe UI",Arial,sans-serif;margin:0;padding:20px;background:#f8fafc;}'
    +'.wrap{max-width:640px;margin:0 auto;background:#fff;border:1px solid #ddd;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);}'
    +'.hd{background:#cc0000;color:#fff;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;}'
    +'.hd h2{margin:0;font-size:16px;letter-spacing:.5px;}'
    +'.emp{padding:12px 20px;background:#fff8f8;border-bottom:2px solid #fecaca;font-size:12px;line-height:1.8;}'
    +'.emp strong{font-size:15px;display:block;color:#0f172a;}'
    +'table{width:100%;border-collapse:collapse;font-size:11.5px;}'
    +'.total-row td{background:#cc0000;color:#fff;font-weight:700;font-size:15px;padding:13px 16px;}'
    +'.total-amt{color:#fde68a;font-size:18px;}'
    +'.footer{padding:14px 20px;font-size:10px;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0;line-height:1.8;}'
    +'@media print{body{background:#fff;padding:0;}.wrap{box-shadow:none;border:none;}}'
    +'</style></head><body><div class="wrap">'
    +'<div class="hd"><div><h2>LIQUIDACIÓN DEFINITIVA DE PRESTACIONES SOCIALES</h2><div style="font-size:11px;opacity:.8;margin-top:3px">Ingeanclajes S.A.S — NIT 900193965-4</div></div></div>'
    +'<div class="emp"><strong>'+empleado.nombre+'</strong>'
    +'Cédula: '+(empleado.cedula||'-')+'&nbsp;·&nbsp;Cargo: '+(empleado.cargo||'-')+'<br/>'
    +'Tipo contrato: '+(empleado.tipoContrato||'indefinido')+'&nbsp;·&nbsp;Ingreso: '+(empleado.fechaIngreso||'N/A')+'&nbsp;·&nbsp;Salida: '+(fechaSalida||'N/A')+'<br/>'
    +'Causa retiro: '+(empleado.causaRetiro||'—')+'&nbsp;·&nbsp;Tiempo laborado: '+pfl.diasTrabajados+' días ('+pfl.mesesTrabajados+' meses)<br/>'
    +'Corte final: '+(periodoRetiro?.label||'No definido')
    +'</div>'
    +'<table><thead><tr style="background:#142840;color:#fff"><th style="padding:7px 14px;text-align:left">Concepto</th><th style="padding:7px 14px;text-align:left">Base de cálculo</th><th style="padding:7px 14px;text-align:right">Valor</th></tr></thead>'
    +'<tbody>'+rowsHtml+'</tbody>'
    +'<tfoot><tr class="total-row"><td colspan="2">TOTAL A PAGAR</td><td style="text-align:right"><span class="total-amt">'+fmtC(total)+'</span></td></tr></tfoot>'
    +'</table>'
    +'<div class="footer">'
    +'<div style="display:flex;justify-content:space-around;margin-bottom:10px;margin-top:10px">'
    +'<div style="text-align:center">________________________<br/><span style="font-size:11px;color:#374151">Firma Empleado<br/>'+empleado.nombre+'<br/>C.C. '+(empleado.cedula||'')+'</span></div>'
    +'<div style="text-align:center">________________________<br/><span style="font-size:11px;color:#374151">Representante Legal<br/>Ingeanclajes S.A.S</span></div>'
    +'</div>'
    +'Generado el '+new Date().toLocaleDateString('es-CO',{year:"numeric",month:"long",day:"numeric"})+' · Este documento es constancia de pago de prestaciones sociales.'
    +'</div>'
    +'</div></body></html>';
  openPrintTab(html, `Liquidación ${empleado.nombre}`);
}
