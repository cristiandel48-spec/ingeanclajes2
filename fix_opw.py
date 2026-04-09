path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

BT = chr(0x60)

# ── 1. Fix openPrintWindow – replace multiline template with string concat
OLD_OPW = (
    'function openPrintWindow(title, innerHtml, extraCss = ""){\n'
    '  const w = window.open("", "_blank", "width=950,height=1200");\n'
    '  if(!w) return;\n\n'
    '  w.document.write(`<!doctype html>\n'
    '  <html>\n'
    '    <head>\n'
    '      <meta charset="utf-8" />\n'
    '      <title>${title}</title>\n'
    '      <style>\n'
    '        @page { size: Letter; margin: 12mm; }\n'
    '        * {\n'
    '          box-sizing: border-box;\n'
    '          -webkit-print-color-adjust: exact;\n'
    '          print-color-adjust: exact;\n'
    '        }\n'
    '        html, body {\n'
    '          margin: 0;\n'
    '          padding: 0;\n'
    '          background: #fff;\n'
    '          color: #111;\n'
    '          font-family: Aptos, "Segoe UI", Arial, sans-serif;\n'
    '        }\n'
    '        body {\n'
    '          font-size: 12pt;\n'
    '          line-height: 1.5;\n'
    '        }\n'
    '        .print-root {\n'
    '          width: 100%;\n'
    '          margin: 0;\n'
    '          padding: 0;\n'
    '        }\n'
    '        .avoid-break, table, tr, td, th {\n'
    '          break-inside: avoid;\n'
    '          page-break-inside: avoid;\n'
    '        }\n'
    '        img {\n'
    '          max-width: 100%;\n'
    '        }\n'
    '        ${extraCss}\n'
    '      </style>\n'
    '    </head>\n'
    '    <body>\n'
    '      <div class="print-root">${innerHtml}</div>\n'
    '    </body>\n'
    '  </html>`);\n'
)

NEW_OPW = (
    'function openPrintWindow(title, innerHtml, extraCss = ""){\n'
    '  const w = window.open("", "_blank", "width=950,height=1200");\n'
    '  if(!w) return;\n\n'
    '  w.document.write(\n'
    '    \'<!doctype html><html><head><meta charset="utf-8"/>\'\n'
    '    + \'<title>\' + title + \'</title>\'\n'
    '    + \'<style>\'\n'
    '    + \'@page{size:Letter;margin:12mm}\'\n'
    '    + \'*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}\'\n'
    '    + \'html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Aptos,"Segoe UI",Arial,sans-serif}\'\n'
    '    + \'body{font-size:12pt;line-height:1.5}\'\n'
    '    + \'.print-root{width:100%;margin:0;padding:0}\'\n'
    '    + \'.avoid-break,table,tr,td,th{break-inside:avoid;page-break-inside:avoid}\'\n'
    '    + \'img{max-width:100%}\'\n'
    '    + extraCss\n'
    '    + \'</style></head><body><div class="print-root">\'\n'
    '    + innerHtml\n'
    '    + \'</div></body></html>\'\n'
    '  );\n'
)

if OLD_OPW in content:
    content = content.replace(OLD_OPW, NEW_OPW, 1)
    print("Fixed openPrintWindow")
else:
    print("NOT FOUND - checking partial...")
    idx = content.find('function openPrintWindow')
    if idx >= 0:
        end = content.find('\nfunction ', idx+1)
        print(repr(content[idx:end][:300]))

# ── 2. Fix printColilla and printLiquidacion – they use const html = `...`
# Check if there are more multiline templates remaining
import re
BT = chr(0x60)
remaining = [(i+1, l.rstrip()) for i,l in enumerate(content.split('\n'))
             if BT in l and '${' in l]
print(f"\nRemaining template literal lines: {len(remaining)}")
for no, l in remaining[:20]:
    print(f"  {no}: {l[:100]}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("\nDone!")
