import re
path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The issue: rolldown is choking on template literals OUTSIDE of JSX / the big HTML string
# Specifically in plain JS functions (not inside the buildCotizacionPrintHtml return string)
# Lines found problematic: 1374, 1379
# These are inside generateCotizacionPdfFile function

# Fix line 1374: container.innerHTML = `${styleTag}${parsed.body.innerHTML}`;
old1 = 'container.innerHTML = `${styleTag}${parsed.body.innerHTML}`;'
new1 = 'container.innerHTML = styleTag + parsed.body.innerHTML;'
if old1 in content:
    content = content.replace(old1, new1, 1)
    print("Fixed container.innerHTML template literal")

# Fix line 1379: filename: `${sanitizeFileName(...)}...`
old2 = "      filename: `${sanitizeFileName(c?.numero || c?.id || \"cotizacion\")}.pdf`,"
new2 = '      filename: sanitizeFileName(c?.numero || c?.id || "cotizacion") + ".pdf",'
if old2 in content:
    content = content.replace(old2, new2, 1)
    print("Fixed filename template literal")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
