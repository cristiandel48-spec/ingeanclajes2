import re

path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find big template literal blocks to skip (already working)
protected_ranges = []

start_marker = 'return `<!doctype html>'
end_marker = '</body></html>`'

idx = 0
while True:
    s = content.find(start_marker, idx)
    if s == -1: break
    e = content.find(end_marker, s)
    if e == -1: break
    e += len(end_marker)
    protected_ranges.append((s, e))
    print("Protected HTML block:", s, "-", e, "("+str(e-s)+" chars)")
    idx = e

def is_protected(pos):
    return any(s <= pos <= e for s, e in protected_ranges)

def convert_template_literal(inner):
    """Convert template literal content to string concatenation."""
    parts = []
    i = 0
    current_str = ""
    while i < len(inner):
        if inner[i:i+2] == '${':
            depth = 1
            j = i + 2
            while j < len(inner) and depth > 0:
                if inner[j] == '{': depth += 1
                elif inner[j] == '}': depth -= 1
                j += 1
            expr = inner[i+2:j-1]
            if current_str:
                parts.append('"' + current_str.replace('\\', '\\\\').replace('"', '\\"') + '"')
                current_str = ""
            parts.append('(' + expr + ')')
            i = j
        else:
            current_str += inner[i]
            i += 1
    if current_str:
        parts.append('"' + current_str.replace('\\', '\\\\').replace('"', '\\"') + '"')
    if not parts:
        return '""'
    return ' + '.join(parts) if len(parts) > 1 else parts[0]

# Process line by line
lines = content.split('\n')
fixes = [0]
new_lines = []

# Build cumulative positions
pos = 0
line_positions = []
for line in lines:
    line_positions.append(pos)
    pos += len(line) + 1

for line_idx, line in enumerate(lines):
    line_start = line_positions[line_idx]

    if is_protected(line_start):
        new_lines.append(line)
        continue

    if '`' not in line or '${' not in line:
        new_lines.append(line)
        continue

    def replacer(m):
        inner = m.group(1)
        result = convert_template_literal(inner)
        fixes[0] += 1
        return result

    new_line = re.sub(r'`([^`\n]*\$\{[^`\n]*)`', replacer, line)
    new_lines.append(new_line)

new_content = '\n'.join(new_lines)

print("Converted", fixes[0], "template literals")

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done!")
