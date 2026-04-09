path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# ─────────────────────────────────────────────────────────────────────────────
# 1. Add printLiquidacion function right after printColilla
# ─────────────────────────────────────────────────────────────────────────────
AFTER_COLILLA = """

let googleMapsJsPromise = null;"""

PRINT_LIQ_FUNC = """
function printLiquidacion(empleado, pfl, indemn, diasVacPagar, fechaSalida){
  const fmtC = n => '$ ' + Math.round(Number(n)||0).toLocaleString('es-CO');
  const vacValorReal = Math.round(empleado.salario * (diasVacPagar||0) / 30);
  const total = pfl.cesantias + pfl.interesesCesantias + pfl.prima + vacValorReal + indemn;
  const rows = [
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
    +'Causa retiro: '+(empleado.causaRetiro||'—')+'&nbsp;·&nbsp;Tiempo laborado: '+pfl.diasTrabajados+' días ('+pfl.mesesTrabajados+' meses)'
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
  const win = window.open('','_blank','width=720,height=920');
  if(win){win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),500);}
}

"""

# Insert printLiquidacion before "let googleMapsJsPromise"
if AFTER_COLILLA in content:
    content = content.replace(AFTER_COLILLA, PRINT_LIQ_FUNC + AFTER_COLILLA, 1)
    print("✓ printLiquidacion function added")
else:
    print("✗ Could not find insertion point for printLiquidacion")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Add diasVacPagar state next to liquidarId
# ─────────────────────────────────────────────────────────────────────────────
OLD_STATE = "  const [liquidarId,setLiquidarId]=useState(null);"
NEW_STATE = "  const [liquidarId,setLiquidarId]=useState(null);\n  const [diasVacPagar,setDiasVacPagar]=useState({});"

if OLD_STATE in content:
    content = content.replace(OLD_STATE, NEW_STATE, 1)
    print("✓ diasVacPagar state added")
else:
    print("✗ Could not find liquidarId state")

# ─────────────────────────────────────────────────────────────────────────────
# 3. Update the liquidation panel: add vacation day input + print button
#    Find the block starting with the liquidarId IIFE section
# ─────────────────────────────────────────────────────────────────────────────

# Old: uses pfl.vacacionesDias and just shows it in the table
OLD_LIQ_IIFE = "                      {(()=>{\n                        const pfl=calcularParafiscales(e, e.fechaSalida||null);\n                        const indemn = e.causaRetiro===\"Despido sin justa causa\" ? (\n                          pfl.aniostrabajados<=1 ? Math.round(e.salario) : Math.round(e.salario + e.salario*0.2*(pfl.aniostrabajados-1))\n                        ) : 0;\n                        const total = pfl.cesantias + pfl.interesesCesantias + pfl.prima + pfl.vacacionesValor + indemn;\n                        return(\n                        <div>\n                          <table style={{width:\"100%\",borderCollapse:\"collapse\",fontSize:11,marginBottom:10}}>\n                            <thead><tr style={{background:\"#142840\",color:\"#fff\"}}><th style={{padding:\"5px 8px\",textAlign:\"left\"}}>Concepto</th><th style={{padding:\"5px 8px\",textAlign:\"left\"}}>Base cálculo</th><th style={{padding:\"5px 8px\",textAlign:\"right\"}}>Valor</th></tr></thead>\n                            <tbody>\n                              {[[\"Cesantías\",`${fmt(e.salario+(e.salario<=NOMINA_CO_2026.topeAuxilio?NOMINA_CO_2026.auxilioTransporte:0))} × ${pfl.diasTrabajados}d ÷ 360`,pfl.cesantias],[\"Int. cesantías\",\"12% anual s/ cesantías\",pfl.interesesCesantias],[\"Prima de servicios\",`Base × ${pfl.diasTrabajados}d ÷ 360`,pfl.prima],[\"Vacaciones\",`${pfl.vacacionesDias} días`,pfl.vacacionesValor],...(indemn>0?[[\"Indemnización (sin justa causa)\",\"Según CST art. 64\",indemn]]:[])].map(([k,b,v])=>(\n                                <tr key={k} style={{borderBottom:\"1px solid #f1f5f9\"}}><td style={{padding:\"5px 8px\"}}>{k}</td><td style={{padding:\"5px 8px\",color:\"#64748b\",fontSize:10}}>{b}</td><td style={{padding:\"5px 8px\",textAlign:\"right\",fontWeight:600,color:\"#0f172a\"}}>{fmt(v)}</td></tr>\n                              ))}\n                            </tbody>\n                            <tfoot><tr style={{background:\"#f5c842\"}}><td colSpan={2} style={{padding:\"7px 8px\",fontWeight:700}}>TOTAL LIQUIDACIÓN</td><td style={{padding:\"7px 8px\",textAlign:\"right\",fontWeight:700,fontSize:13}}>{fmt(total)}</td></tr></tfoot>\n                          </table>\n                          <button onClick={()=>updEmp(e.id,\"activo\",false)} style={{...B(\"#2d1414\",\"#ef4444\"),fontSize:11,width:\"100%\",justifyContent:\"center\"}}>Marcar como retirado</button>\n                        </div>\n                        );\n                      })()}"

NEW_LIQ_IIFE = """                      {(()=>{
                        const pfl=calcularParafiscales(e, e.fechaSalida||null);
                        const indemn = e.causaRetiro==="Despido sin justa causa" ? (
                          pfl.aniostrabajados<=1 ? Math.round(e.salario) : Math.round(e.salario + e.salario*0.2*(pfl.aniostrabajados-1))
                        ) : 0;
                        const dvp = diasVacPagar[e.id] ?? Math.round(pfl.vacacionesDias);
                        const vacValorReal = Math.round(e.salario * dvp / 30);
                        const total = pfl.cesantias + pfl.interesesCesantias + pfl.prima + vacValorReal + indemn;
                        return(
                        <div>
                          <div style={{background:"#f0fdf4",borderRadius:6,padding:"8px 10px",marginBottom:8,display:"flex",alignItems:"center",gap:12,fontSize:11}}>
                            <span style={{color:"#166534",fontWeight:600}}>🏖 Días de vacaciones a liquidar:</span>
                            <input type="number" min={0} max={Math.ceil(pfl.vacacionesDias)+30} step={0.5}
                              value={dvp}
                              onChange={ev=>setDiasVacPagar(prev=>({...prev,[e.id]:Number(ev.target.value)}))}
                              style={{width:70,padding:"4px 8px",borderRadius:5,border:"1px solid #bbf7d0",fontSize:12,fontWeight:700,textAlign:"center"}}/>
                            <span style={{color:"#64748b",fontSize:10}}>Acumulados: {pfl.vacacionesDias} días · Valor: {fmt(vacValorReal)}</span>
                          </div>
                          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,marginBottom:10}}>
                            <thead><tr style={{background:"#142840",color:"#fff"}}><th style={{padding:"5px 8px",textAlign:"left"}}>Concepto</th><th style={{padding:"5px 8px",textAlign:"left"}}>Base cálculo</th><th style={{padding:"5px 8px",textAlign:"right"}}>Valor</th></tr></thead>
                            <tbody>
                              {[["Cesantías",fmt(e.salario+(e.salario<=NOMINA_CO_2026.topeAuxilio?NOMINA_CO_2026.auxilioTransporte:0))+" × "+pfl.diasTrabajados+"d ÷ 360",pfl.cesantias],["Int. cesantías","12% anual s/ cesantías",pfl.interesesCesantias],["Prima de servicios","Base × "+pfl.diasTrabajados+"d ÷ 360",pfl.prima],["Vacaciones",dvp+" días × salario ÷ 30",vacValorReal],...(indemn>0?[["Indemnización (sin justa causa)","Según CST art. 64",indemn]]:[])].map(([k,b,v])=>(
                                <tr key={k} style={{borderBottom:"1px solid #f1f5f9"}}><td style={{padding:"5px 8px"}}>{k}</td><td style={{padding:"5px 8px",color:"#64748b",fontSize:10}}>{b}</td><td style={{padding:"5px 8px",textAlign:"right",fontWeight:600,color:"#0f172a"}}>{fmt(v)}</td></tr>
                              ))}
                            </tbody>
                            <tfoot><tr style={{background:"#f5c842"}}><td colSpan={2} style={{padding:"7px 8px",fontWeight:700}}>TOTAL LIQUIDACIÓN</td><td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,fontSize:13}}>{fmt(total)}</td></tr></tfoot>
                          </table>
                          <div style={{display:"flex",gap:6,marginBottom:6}}>
                            <button onClick={()=>printLiquidacion(e, pfl, indemn, dvp, e.fechaSalida||null)} style={{...B("#142840","#f5c842"),fontSize:11,flex:1,justifyContent:"center"}}>🖨 Imprimir liquidación</button>
                            <button onClick={()=>updEmp(e.id,"activo",false)} style={{...B("#2d1414","#ef4444"),fontSize:11,flex:1,justifyContent:"center"}}>Marcar como retirado</button>
                          </div>
                        </div>
                        );
                      })()}"""

if OLD_LIQ_IIFE in content:
    content = content.replace(OLD_LIQ_IIFE, NEW_LIQ_IIFE, 1)
    print("✓ Liquidation panel updated with vacation selector + print button")
else:
    print("✗ Could not find old liquidation IIFE block")
    # Try to find something close to help debug
    idx = content.find("const pfl=calcularParafiscales(e, e.fechaSalida||null)")
    if idx >= 0:
        print(f"  Found calcularParafiscales at index {idx}")
        print(repr(content[idx-80:idx+400]))

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
