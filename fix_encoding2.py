path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

print("File size:", len(content))

# The remaining mojibake uses cp1252 (Windows-1252) encoding for byte 0x9F = Ÿ (U+0178)
# Strategy: scan char by char, if we see chars in cp1252 high range,
# try to encode as cp1252 and decode as UTF-8

result = []
i = 0
fixes = 0
while i < len(content):
    c = content[i]
    code = ord(c)

    # Check if char could be a cp1252 high byte (0x80-0xFF in cp1252 space)
    # These appear as their cp1252 unicode equivalents
    # The key ones we see: 0xF0=ð, 0x9F=Ÿ(U+0178), 0x8F=?(U+017D maybe), etc.
    # Let's try encoding as cp1252
    try:
        b1_bytes = c.encode('cp1252')
        if len(b1_bytes) == 1:
            b1 = b1_bytes[0]
            if b1 >= 0x80:
                # This could be start of multi-byte UTF-8 sequence
                if 0xC0 <= b1 <= 0xDF:
                    needed = 1
                elif 0xE0 <= b1 <= 0xEF:
                    needed = 2
                elif 0xF0 <= b1 <= 0xF7:
                    needed = 3
                else:
                    result.append(c)
                    i += 1
                    continue

                # Try to collect continuation bytes
                cont_bytes = []
                ok = True
                for j in range(needed):
                    if i + 1 + j < len(content):
                        nc = content[i + 1 + j]
                        try:
                            nb = nc.encode('cp1252')
                            if len(nb) == 1 and 0x80 <= nb[0] <= 0xBF:
                                cont_bytes.append(nb[0])
                            else:
                                ok = False
                                break
                        except:
                            ok = False
                            break
                    else:
                        ok = False
                        break

                if ok and len(cont_bytes) == needed:
                    all_bytes = bytes([b1] + cont_bytes)
                    try:
                        decoded = all_bytes.decode('utf-8')
                        result.append(decoded)
                        fixes += 1
                        i += 1 + needed
                        continue
                    except:
                        pass
    except:
        pass

    result.append(c)
    i += 1

fixed = ''.join(result)
print("Fixes applied:", fixes)

# Also do specific text replacements for remaining bad patterns
replacements = [
    # Arrow back
    ('\u2190 Obras', '\u2190 Obras'),  # already correct
    # Fix Ã˜ -> Ø (diameter symbol)
    ('Ã˜', 'Ø'),
    # Fix Ã' -> Ñ
    ("Ã'", 'Ñ'),
    # Fix ÃƒËœ -> Ø
    ('ÃƒËœ', 'Ø'),
    # Fix â†' -> →
    ('â†\x91', '↑'),
    ('â†\x93', '↓'),
    ('â†\x90', '←'),
    ('â†\x92', '→'),
    # Fix â€" -> –
    ('â€"', '–'),
    ('â€"', '—'),
    # Fix remaining
    ('â€¢', '•'),
    ('â€˜', '\u2018'),
    ('â€™', '\u2019'),
    ('â€œ', '\u201C'),
    ('â€\x9d', '\u201D'),
]

for old, new in replacements:
    if old in fixed and old != new:
        count = fixed.count(old)
        fixed = fixed.replace(old, new)
        print(f"Replaced {repr(old)} -> {repr(new)} ({count}x)")

with open(path, 'w', encoding='utf-8') as f:
    f.write(fixed)

print("Done!")
