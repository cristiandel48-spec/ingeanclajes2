path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

import re

# Find all remaining ðŸ sequences and analyze them
pattern = re.compile(r'ðŸ.{0,4}')
found = {}
for m in pattern.finditer(content):
    seq = m.group()
    codes = tuple(ord(c) for c in seq)
    if seq not in found:
        found[seq] = (codes, content[max(0,m.start()-30):m.start()+50])

print("Sequences found:")
for seq, (codes, ctx) in found.items():
    print(f"  {repr(seq)}")
    print(f"  codes: {[hex(c) for c in codes]}")
    # Try to decode via cp1252
    try:
        cp_bytes = seq.encode('cp1252')
        print(f"  cp1252 bytes: {[hex(b) for b in cp_bytes]}")
        try:
            decoded = cp_bytes.decode('utf-8')
            print(f"  -> {decoded}")
        except:
            # Try partial
            for end in range(len(cp_bytes), 0, -1):
                try:
                    d = cp_bytes[:end].decode('utf-8')
                    print(f"  -> partial({end}): {d}")
                    break
                except:
                    pass
    except Exception as e:
        print(f"  cp1252 error: {e}")
    print(f"  ctx: {repr(ctx)}")
    print()
