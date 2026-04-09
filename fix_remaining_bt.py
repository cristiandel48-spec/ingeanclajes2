with open('src/App.jsx','r',encoding='utf-8') as f:
    content = f.read()

BT = chr(0x60)
BS = chr(92)

# Protected range: buildCotizacionPrintHtml's return template
fn_start = content.find('return ' + BT + '<!doctype html>')
fn_end = content.find('</body></html>' + BT, fn_start) + len('</body></html>' + BT)
print(f"Protected: {fn_start} - {fn_end}")

def convert_tl(inner):
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
                safe = cur.replace(BS+BS, BS+BS+BS+BS).replace("'", BS+"'")
                parts.append("'" + safe + "'")
                cur = ''
            parts.append('(' + expr + ')')
            i = j
        else:
            cur += inner[i]; i += 1
    if cur:
        safe = cur.replace(BS+BS, BS+BS+BS+BS).replace("'", BS+"'")
        parts.append("'" + safe + "'")
    return (' + '.join(parts)) if parts else "''"

result = []
i = 0
fixes = 0

while i < len(content):
    if fn_start <= i < fn_end:
        if i == fn_start:
            result.append(content[fn_start:fn_end])
            i = fn_end
        continue
    
    if content[i] != BT:
        result.append(content[i]); i += 1; continue
    
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
        if c == BT and depth == 0: break
        j += 1
    
    inner = content[i+1:j]
    # Flatten newlines
    inner_flat = inner.replace('\n', BS+'n')
    converted = convert_tl(inner_flat)
    result.append(converted)
    fixes += 1
    i = j + 1

new_content = ''.join(result)
print(f"Converted {fixes} template literals")

remaining = []
for idx, ch in enumerate(new_content):
    if ch == BT and not (fn_start <= idx < fn_end):
        ln = new_content[:idx].count('\n') + 1
        remaining.append(ln)
print(f"Remaining backticks outside protected range: {len(remaining)}")
if remaining:
    print(f"  Lines: {remaining[:10]}")

with open('src/App.jsx','w',encoding='utf-8') as f:
    f.write(new_content)
print("Saved!")
