with open('src/App.jsx','r',encoding='utf-8') as f:
    content = f.read()

OLD = '''function printVacaciones(empleado, diasVacaciones, valorVacaciones){
  const fmtC = n => '$ ' + Math.round(Number(n)||0).toLocaleString('es-CO');
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Vacaciones ' + (empleado.nombre) + '</title>
<style>
@page{size:Letter;margin:12mm;}
body{font-family:\'Segoe UI\',Arial,sans-serif;margin:0;padding:18px;background:#fff;color:#0f172a;}
.wrap{max-width:620px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;}
.hd{padding:16px 18px;background:linear-gradient(135deg,#ecfdf5,#ffffff);border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;}
.hd img{height:48px;object-fit:contain;}
.bd{padding:18px;}
.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:14px;line-height:1.7;font-size:12px;}
.total{background:#166534;color:#fff;border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;font-size:16px;font-weight:700;}
.footer{text-align:center;color:#94a3b8;font-size:10px;padding:14px;}
</style></head><body><div class="wrap">
<div class="hd"><img src="' + (LOGO_INGEANCLAJES) + '" alt="Ingeanclajes"/><div style="text-align:right"><div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#64748b;font-weight:700">Liquidacion de vacaciones</div><div style="font-size:12px;font-weight:700;color:#166534">' + (today()) + '</div></div></div>
<div class="bd">
<div class="card"><strong style="font-size:16px;color:#142840">' + (empleado.nombre) + '</strong><br/>Cedula: ' + (empleado.cedula||'-') + ' · Cargo: ' + (empleado.cargo||'-') + '<br/>Salario base: ' + (fmtC(empleado.salario||0)) + ' · Dias a liquidar: ' + (diasVacaciones) + '</div>
<div class="card">Esta liquidacion corresponde a vacaciones pagadas sin retiro del empleado. Valor calculado sobre salario basico: ' + (fmtC(empleado.salario||0)) + ' ÷ 30 × ' + (diasVacaciones) + ' dias.</div>
<div class="total"><span>Valor vacaciones</span><span>' + (fmtC(valorVacaciones)) + '</span></div>
</div>
<div class="footer">Ingeanclajes S.A.S · Documento generado automaticamente</div>
</div></body></html>';
  const win = window.open('','_blank','width=760,height=820');
  if(win){win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),500);}
}'''

NEW = '''function printVacaciones(empleado, diasVacaciones, valorVacaciones){
  const fmtC = n => '$ ' + Math.round(Number(n)||0).toLocaleString('es-CO');
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    +'<title>Vacaciones ' + empleado.nombre + '</title>'
    +'<style>'
    +'@page{size:Letter;margin:12mm;}'
    +'body{font-family:"Segoe UI",Arial,sans-serif;margin:0;padding:18px;background:#fff;color:#0f172a;}'
    +'.wrap{max-width:620px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;}'
    +'.hd{padding:16px 18px;background:linear-gradient(135deg,#ecfdf5,#ffffff);border-bottom:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:center;}'
    +'.hd img{height:48px;object-fit:contain;}'
    +'.bd{padding:18px;}'
    +'.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:14px 16px;margin-bottom:14px;line-height:1.7;font-size:12px;}'
    +'.total{background:#166534;color:#fff;border-radius:12px;padding:14px 16px;display:flex;justify-content:space-between;font-size:16px;font-weight:700;}'
    +'.footer{text-align:center;color:#94a3b8;font-size:10px;padding:14px;}'
    +'</style></head><body><div class="wrap">'
    +'<div class="hd"><img src="' + LOGO_INGEANCLAJES + '" alt="Ingeanclajes"/>'
    +'<div style="text-align:right"><div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#64748b;font-weight:700">Liquidacion de vacaciones</div>'
    +'<div style="font-size:12px;font-weight:700;color:#166534">' + today() + '</div></div></div>'
    +'<div class="bd">'
    +'<div class="card"><strong style="font-size:16px;color:#142840">' + empleado.nombre + '</strong><br/>'
    +'Cedula: ' + (empleado.cedula||'-') + ' &middot; Cargo: ' + (empleado.cargo||'-') + '<br/>'
    +'Salario base: ' + fmtC(empleado.salario||0) + ' &middot; Dias a liquidar: ' + diasVacaciones + '</div>'
    +'<div class="card">Esta liquidacion corresponde a vacaciones pagadas sin retiro del empleado. '
    +'Valor calculado sobre salario basico: ' + fmtC(empleado.salario||0) + ' &divide; 30 &times; ' + diasVacaciones + ' dias.</div>'
    +'<div class="total"><span>Valor vacaciones</span><span>' + fmtC(valorVacaciones) + '</span></div>'
    +'</div>'
    +'<div class="footer">Ingeanclajes S.A.S &middot; Documento generado automaticamente</div>'
    +'</div></body></html>';
  const win = window.open('','_blank','width=760,height=820');
  if(win){win.document.write(html);win.document.close();win.focus();setTimeout(()=>win.print(),500);}
}'''

if OLD in content:
    content = content.replace(OLD, NEW, 1)
    print("Replaced printVacaciones successfully")
    with open('src/App.jsx','w',encoding='utf-8') as f:
        f.write(content)
    print("Saved!")
else:
    print("Pattern NOT found - checking for partial match...")
    # Try to find what's there
    idx = content.find('function printVacaciones')
    if idx > 0:
        end = content.find('\nfunction ', idx+1)
        print(repr(content[idx:idx+500]))
