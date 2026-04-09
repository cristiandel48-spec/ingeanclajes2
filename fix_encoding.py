import sys

path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)

# Fix mojibake: chars in 0xC0-0xFF range followed by continuation bytes
# These are UTF-8 bytes that were decoded as Latin-1, then re-encoded as UTF-8
# Strategy: char by char, if we see a char in C0-FF range, try to encode as latin-1
# then decode the resulting bytes as UTF-8

result = []
i = 0
fixes = 0
while i < len(content):
    c = content[i]
    code = ord(c)
    # Check if this char is in the Latin-1 high range (C0-FF)
    # These would be the first byte of a multi-byte UTF-8 sequence stored as latin-1
    if 0xC0 <= code <= 0xFF:
        # Try to find the next char(s) that complete the UTF-8 sequence
        # Encode this char as latin-1 to get the byte value
        try:
            b1 = c.encode('latin-1')[0]
            # Determine how many continuation bytes needed
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

            # Check if next `needed` chars are continuation bytes (80-BF in latin-1)
            ok = True
            cont_bytes = []
            for j in range(needed):
                if i + 1 + j < len(content):
                    nc = content[i + 1 + j]
                    nc_code = ord(nc)
                    if 0x80 <= nc_code <= 0xBF:
                        cont_bytes.append(nc_code)
                    else:
                        ok = False
                        break
                else:
                    ok = False
                    break

            if ok and len(cont_bytes) == needed:
                # Reconstruct the bytes
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
    else:
        result.append(c)
        i += 1

fixed_content = ''.join(result)
print(f"Original length: {original_len}")
print(f"Fixed length: {len(fixed_content)}")
print(f"Total fixes applied: {fixes}")

with open(path, 'w', encoding='utf-8') as f:
    f.write(fixed_content)

print("Done!")
