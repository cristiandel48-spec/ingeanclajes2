"""
Fix ALL remaining template literal issues outside the protected HTML block.
Strategy: replace every backtick template literal NOT in protected ranges
with single-quote string concatenation.
"""
import re

path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

BT = chr(0x60)

# ── Protected ranges (multiline template literals that are intentional) ──
# buildCotizacionPrintHtml returns: return `<!doctype html>...`
# These are OK because rolldown handles them inside the function return
protected_ranges = []

def add_protected(start_marker, end_marker):
    idx = 0
    while True:
        s = content.find(start_marker, idx)
        if s == -1: break
        e = content.find(end_marker, s + len(start_marker))
        if e == -1: break
        e += len(end_marker)
        protected_ranges.append((s, e))
        idx = e

# The big cotizacion HTML template
add_protected('return ' + BT + '<!doctype html>', '</body></html>' + BT)

print(f"Protected ranges: {len(protected_ranges)}")
for s, e in protected_ranges:
    print(f"  {s} - {e} ({e-s} chars)")

def is_protected(s, e):
    """Check if range [s,e] overlaps any protected range."""
    return any(ps <= s and e <= pe for ps, pe in protected_ranges)

# ── Step 1: fix the CSS-only template in openCertificacionPrint / doc print ──
# These are template literals with only CSS (no ${} expressions)
# `\n  .doc-shell{...}\n`
# Already handled but let's check lines 1494-1503

# ── Step 2: Scan for ALL remaining backtick sequences and fix them ──
# We'll scan the content for backtick literals
# and convert them to string concatenation

def convert_tl_inner(inner):
    """Convert template literal inner text to JS string concatenation parts."""
    parts = []
    i = 0
    cur = ''
    while i < len(inner):
        if inner[i:i+2] == '${':
            depth = 1; j = i+2
            while j < len(inner) and depth > 0:
                if inner[j] == '{': depth += 1
                elif inner[j] == '}': depth -= 1
                j += 1
            expr = inner[i+2:j-1]
            if cur:
                parts.append("'" + cur.replace('\\', '\\\\').replace("'", "\\'") + "'")
                cur = ''
            parts.append('(' + expr + ')')
            i = j
        else:
            cur += inner[i]; i += 1
    if cur:
        parts.append("'" + cur.replace('\\', '\\\\').replace("'", "\\'") + "'")
    if not parts: return "''"
    return ' + '.join(parts)

# Find all template literals in content
# We need to handle both single-line and multiline
fixes = 0
result = []
i = 0

while i < len(content):
    ch = content[i]

    # Check if in protected range
    in_prot = is_protected(i, i+1)

    if ch == BT and not in_prot:
        # Check if this BT starts a protected range
        skip_this = False
        for ps, pe in protected_ranges:
            if i == ps:
                # Copy entire protected range as-is
                result.append(content[ps:pe])
                i = pe
                skip_this = True
                break
        if skip_this:
            continue

        # Find the closing backtick
        j = i + 1
        depth = 0  # for nested ${ } tracking
        while j < len(content):
            c2 = content[j]
            if c2 == '\\':
                j += 2; continue  # skip escaped char
            if c2 == '$' and j+1 < len(content) and content[j+1] == '{':
                depth += 1; j += 2; continue
            if c2 == '{' and depth > 0:
                depth += 1; j += 1; continue
            if c2 == '}' and depth > 0:
                depth -= 1; j += 1; continue
            if c2 == BT and depth == 0:
                break
            j += 1

        inner = content[i+1:j]
        closing = j

        # Check if this TL contains ${ } (is a real template literal)
        if '${' in inner:
            converted = convert_tl_inner(inner)
            result.append(converted)
            fixes += 1
        else:
            # No interpolation - just replace backticks with single quotes
            # but need to escape single quotes in content
            safe = inner.replace('\\', '\\\\').replace("'", "\\'")
            result.append("'" + safe + "'")
            fixes += 1

        i = closing + 1
    else:
        result.append(ch)
        i += 1

new_content = ''.join(result)
print(f"\nTotal template literals converted: {fixes}")

# Verify no backtick template literals remain (outside HTML block)
remaining = 0
lines = new_content.split('\n')
for no, line in enumerate(lines, 1):
    if BT in line and '${' in line:
        # Check if in protected
        line_pos = sum(len(l)+1 for l in lines[:no-1])
        if not is_protected(line_pos, line_pos+len(line)):
            remaining += 1
            print(f"  REMAINING {no}: {line[:80]}")

print(f"Remaining unprotected template literals: {remaining}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(new_content)

print("Done!")
