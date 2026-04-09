import re

path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the big HTML template string returned by buildCotizacionPrintHtml
html_start_marker = 'return `<!doctype html>'
html_end_marker = '</body></html>`'

html_start = content.find(html_start_marker)
html_end = content.find(html_end_marker, html_start) + len(html_end_marker)
print(f"HTML block: {html_start} - {html_end}")

# Also locate printLiquidacion and printColilla HTML strings
# They use: const html = '...' (single quotes) so they're fine
# But there might be other backtick HTML blocks
# Let's protect all backtick blocks longer than 500 chars
protected_ranges = [(html_start, html_end)]

def in_protected(pos):
    return any(s <= pos <= e for s, e in protected_ranges)

def escape_for_js_string(s):
    return s.replace('\\', '\\\\').replace('"', '\\"')

def convert_template_inner(inner):
    """Convert template literal inner content to JS string concatenation."""
    parts = []
    i = 0
    cur = ""
    while i < len(inner):
        if inner[i:i+2] == '${':
            depth = 1
            j = i + 2
            while j < len(inner) and depth > 0:
                if inner[j] == '{':
                    depth += 1
                elif inner[j] == '}':
                    depth -= 1
                j += 1
            expr = inner[i+2:j-1]
            if cur:
                parts.append('"' + escape_for_js_string(cur) + '"')
                cur = ""
            parts.append('(' + expr + ')')
            i = j
        else:
            cur += inner[i]
            i += 1
    if cur:
        parts.append('"' + escape_for_js_string(cur) + '"')
    if not parts:
        return '""'
    return ' + '.join(parts)

# Process the file in segments, skipping protected ranges
# Build line-by-line result
lines = content.split('\n')
new_lines = []
pos = 0

for line in lines:
    line_start = pos
    line_end = pos + len(line)
    pos = line_end + 1  # +1 for \n

    # Skip if in protected range
    if in_protected(line_start):
        new_lines.append(line)
        continue

    # Only process lines with backtick template literals
    if '`' not in line or '${' not in line:
        new_lines.append(line)
        continue

    # Convert single-line template literals
    def replacer(m):
        inner = m.group(1)
        return convert_template_inner(inner)

    # Match simple single-line template literals: `...${...}...`
    new_line = re.sub(r'`([^`\n]*\$\{[^`\n]*)`', replacer, line)
    new_lines.append(new_line)

new_content = '\n'.join(new_lines)

# Count remaining template literals with ${ (outside protected)
remaining = 0
for line in new_content.split('\n'):
    if '`' in line and '${' in line:
        remaining += 1

print(f"Remaining template literal lines: {remaining}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done!")
