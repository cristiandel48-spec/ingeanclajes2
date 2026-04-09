path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# These are 4-byte emoji that got mangled. The pattern is:
# ð (U+00F0) + Ÿ (U+0178) + ...
# In cp1252: F0=ð, 9F=Ÿ but Ÿ in unicode is U+0178 which encodes as C5 B8 in UTF-8
# So we need to handle multi-step decoding

# Let's do targeted replacements for known broken sequences
# ðŸ" = 📍 (map pin) U+1F4CD -> F0 9F 93 8D
# ðŸ"  = 📐 (triangular ruler) U+1F4D0
# ðŸ"\x90 = 📐? Let's check: F0 9F 94 90 = 🔐 (locked with key)
# Actually ðŸ"\x90 - ð=F0, Ÿ=9F, "=94 (but " is U+201C = E2 80 9C in utf8, 0x93 in cp1252), \x90=90
# So bytes would be F0 9F 93 90 = 📐 no... F0 9F 94 90 = 🔐

# Let me decode each bad sequence properly
# ð = cp1252 byte 0xF0
# Ÿ = cp1252 byte 0x9F
# " = cp1252 byte 0x93
# \x90 = cp1252 byte 0x90? No, \x90 is already U+0090

# The issue is some chars got decoded via cp1252 and others via utf-8
# Let me try a different approach: look at what we WANT them to be

# Known mappings from context:
DIRECT = [
    # map pin 📍
    ('ðŸ"\x8d', '📍'),
    # ruler/measuring 📐
    ('ðŸ"\x90', '📐'),
    # handshake 🤝
    ('ðŸ¤\x9d', '🤝'),
    # building 🏢
    ('ðŸ\x8f¢', '🏢'),
    # bank/classical building 🏦
    ('ðŸ\x8f¦', '🏦'),
    # white checkmark/certificate 🏅? or medal
    ('ðŸ\x8f—\ufe0f', '🏅'),
    ('ðŸ\x8f—️', '🏅'),
]

fixes = 0
for old, new in DIRECT:
    if old in content:
        count = content.count(old)
        content = content.replace(old, new)
        print(f"Fixed {repr(old)} -> {new} ({count}x)")
        fixes += count

# Also fix remaining Ã' -> Ñ and similar
more = [
    ("Ã'", "Ñ"),
    ("Ã'O", "ÑO"),
    ("LONDOÃ'O", "LONDOÑO"),
]
for old, new in more:
    if old in content:
        count = content.count(old)
        content = content.replace(old, new)
        print(f"Fixed {repr(old)} -> {new} ({count}x)")
        fixes += count

print(f"Total fixes: {fixes}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
