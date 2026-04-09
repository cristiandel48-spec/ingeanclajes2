"""
Fix template literals that contain HTML tags — rolldown's JSX parser misinterprets them.
All non-protected template literals get converted to string concatenation.
"""
path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

BT = chr(0x60)
BS = chr(92)

# Protected range: the big return `<!doctype html>...` in buildCotizacionPrintHtml
prot_start = content.find('return ' + BT + '<!doctype html>')
prot_end = content.find('</body></html>' + BT, prot_start) + len('</body></html>' + BT)
print(f"Protected: {prot_start} - {prot_end}")

def convert_inner(inner):
    """Convert template literal inner content to JS single-quote string concatenation."""
    parts = []
    i = 0
    cur = ''
    while i < len(inner):
        if inner[i] == BS:
            cur += inner[i:i+2]; i += 2; continue
        if inner[i:i+2] == '${':
            depth = 1; j = i+2
            while j < len(inner) and depth > 0:
                if inner[j] == '{': depth += 1
                elif inner[j] == '}': depth -= 1
                j += 1
            expr = inner[i+2:j-1]
            if cur:
                parts.append("'" + cur.replace(BS+BS, BS+BS+BS+BS).replace("'", BS+"'") + "'")
                cur = ''
            parts.append('(' + expr + ')')
            i = j
        else:
            cur += inner[i]; i += 1
    if cur:
        parts.append("'" + cur.replace(BS+BS, BS+BS+BS+BS).replace("'", BS+"'") + "'")
    return (' + '.join(parts)) if parts else "''"

result = []
i = 0
fixes = 0

while i < len(content):
    # Skip protected range verbatim
    if i == prot_start:
        result.append(content[prot_start:prot_end])
        i = prot_end
        continue

    if content[i] != BT:
        result.append(content[i]); i += 1; continue

    # Found a backtick - find its close
    j = i + 1
    depth = 0
    while j < len(content):
        c = content[j]
        if c == BS: j += 2; continue
        if c == '$' and j+1 < len(content) and content[j+1] == '{':
            depth += 1; j += 2; continue
        if depth > 0:
            if c == '{': depth += 1
            elif c == '}': depth -= 1
            j += 1; continue
        if c == BT: break
        j += 1

    inner = content[i+1:j]

    # Convert to string concatenation
    converted = convert_inner(inner)
    result.append(converted)
    fixes += 1
    i = j + 1

new_content = ''.join(result)
print(f"Converted {fixes} template literals")

# Verify
remaining = [(content[:m.start()].count('\n')+1) for m in __import__('re').finditer(BT, new_content)
             if m.start() < prot_start or m.start() > prot_end]
print(f"Remaining backticks outside protected range: {len(remaining)}")
if remaining:
    print("  Lines:", remaining[:10])

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Saved!")
