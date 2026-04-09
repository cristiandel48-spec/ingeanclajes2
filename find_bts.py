path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()
BT = chr(0x60)
i = 0
lits = []
while i < len(content):
    if content[i] == BT:
        start = i
        j = i+1
        depth = 0
        while j < len(content):
            c = content[j]
            if c == chr(92):  # backslash
                j += 2; continue
            if c == '$' and j+1 < len(content) and content[j+1] == '{':
                depth += 1; j += 2; continue
            if depth > 0:
                if c == '{': depth += 1
                elif c == '}': depth -= 1
                j += 1; continue
            if c == BT:
                break
            j += 1
        end = j
        ln = content[:start].count('\n') + 1
        inner = content[start+1:end]
        multiline = '\n' in inner
        has_interp = '${' in inner
        lits.append((start, end, ln, multiline, has_interp, inner[:80]))
        i = end + 1
    else:
        i += 1

print(f"Total backtick literals: {len(lits)}")
for start, end, ln, ml, hi, preview in lits:
    print(f"  line {ln} {'MULTI' if ml else 'SINGLE'} {'INTERP' if hi else 'PLAIN'}: {repr(preview)}")
