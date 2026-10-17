// Abrir la pestaña de impresion. Vive aparte de cotizacionPrint a proposito:
// ese archivo carga las fotos de la ficha tecnica (mas de 1 MB), y Informes,
// Pagos y la nomina solo necesitan esta funcion. Importandola desde alla se
// llevaban todas esas fotos sin usarlas.

// ─── Abre HTML completo en nueva pestaña con toolbar de impresión ───
// NO bloquea la app principal. El usuario imprime/guarda PDF desde la pestaña.

export function openPrintTab(fullHtml, title){
  const w = window.open("", "_blank");
  if(!w){ alert("El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio."); return; }

  // El aviso de los dos ajustes del cuadro de Chrome va AQUI, pegado al
  // boton, y no en un manual que nadie lee: son los dos que estropean el
  // documento que se le manda al cliente.
  //
  // - Sin quitar «Encabezados y pies de pagina», Chrome estampa la fecha y
  //   la direccion de la pagina encima del documento.
  // - Si el tamaño queda en A4 -lo habitual por defecto-, el documento, que
  //   esta maquetado en Carta, se reajusta y se sale de margen.
  //
  // Chrome recuerda las dos elecciones, asi que es una sola vez.
  const toolbar = `
    <div id="print-toolbar" style="position:fixed;top:0;left:0;right:0;z-index:99999;background:#1a2840;color:#fff;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:10px 20px;font-family:sans-serif;box-shadow:0 2px 12px rgba(0,0,0,.3);">
      <div style="min-width:0;">
        <div style="font-size:14px;font-weight:600;">${title || "Documento"}</div>
        <div style="font-size:11.5px;color:#cbd5e1;margin-top:2px;line-height:1.4;">
          En el cuadro de Chrome: tamaño <b style="color:#fff;">Carta</b> y quita
          <b style="color:#fff;">Encabezados y pies de página</b>. Solo hay que hacerlo una vez.
        </div>
      </div>
      <div style="display:flex;gap:10px;flex-shrink:0;">
        <button onclick="var tb=document.getElementById('print-toolbar');var sp=tb.nextElementSibling;tb.style.display='none';if(sp)sp.style.display='none';setTimeout(function(){window.print();setTimeout(function(){tb.style.display='flex';if(sp)sp.style.display='block';},300);},100);" style="background:#f47c20;color:#fff;border:none;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;">🖨 Imprimir / Guardar PDF</button>
        <button onclick="window.close();" style="background:#475569;color:#fff;border:none;padding:8px 16px;border-radius:8px;font-size:13px;cursor:pointer;">✕ Cerrar</button>
      </div>
    </div>
    <div style="height:72px;"></div>`;

  let output = fullHtml;
  const bodyMatch = fullHtml.match(/<body[^>]*>/i);
  if(bodyMatch){
    const idx = fullHtml.indexOf(bodyMatch[0]) + bodyMatch[0].length;
    const printHide = `<style>@media print{#print-toolbar,#print-toolbar+div{display:none!important;}body{padding-top:0!important;}}</style>`;
    output = fullHtml.slice(0, idx) + printHide + toolbar + fullHtml.slice(idx);
  } else {
    output = `<!doctype html><html><head><meta charset="utf-8"><title>${title||"Documento"}</title>
      <style>@media print{#print-toolbar,#print-toolbar+div{display:none!important;}}</style>
    </head><body>${toolbar}${fullHtml}</body></html>`;
  }
  w.document.write(output);
  w.document.close();
}
