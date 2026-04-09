path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The sequences contain control chars (\x90, \x8d) which are not in cp1252 map
# But we know from context:
# ðŸ"\x90 in context of "trazos", "Total ML", "Plano de Trazos" -> 📐 (triangular ruler = measuring)
# ðŸ"\x8d in context of "ciudad" -> 📍 (map pin)
# These match our earlier analysis: F0 9F 93 90 = 📐, F0 9F 93 8D = 📍

# The char sequence: ð=U+00F0, Ÿ=U+0178, "=U+201C, \x90=U+0090
# In the original broken encoding:
#   F0 -> ð (U+00F0) in latin-1
#   9F -> Ÿ (U+0178) in cp1252 (since 9F maps to Ÿ in cp1252)
#   93 -> " (U+201C) in cp1252 (since 93 maps to left double quote in cp1252)
#   90 -> U+0090 (control char, not printable, maps to nothing in cp1252)
#   8D -> U+008D (control char)
# So the byte sequence was: F0 9F 93 90 = 📐 and F0 9F 93 8D = 📍

import re

# Do direct string replacement - match the exact unicode sequences
replacements = []

# ðŸ"\x90 -> 📐 (mapping: F0 9F 93 90)
seq1 = '\u00f0\u0178\u201c\u0090'  # ð Ÿ " \x90
replacements.append((seq1, '📐'))

# ðŸ"\x8d -> 📍 (mapping: F0 9F 93 8D)
seq2 = '\u00f0\u0178\u201c\u008d'  # ð Ÿ " \x8d
replacements.append((seq2, '📍'))

fixes = 0
for old, new in replacements:
    count = content.count(old)
    if count > 0:
        content = content.replace(old, new)
        print(f"Fixed {repr(old)} -> {new} ({count}x)")
        fixes += count

print(f"Total emoji fixes: {fixes}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
