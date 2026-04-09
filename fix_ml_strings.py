"""
Collapse multiline single-quoted string literals anywhere in the file
(outside the protected backtick range).
"""
with open('src/App.jsx','r',encoding='utf-8') as f:
    content = f.read()

BT = chr(0x60)
fn_start = content.find('return ' + BT + '<!doctype html>')
fn_end = content.find('</body></html>' + BT, fn_start) + len('</body></html>' + BT)
print(f"Protected: {fn_start} - {fn_end}")

result = []
i = 0
fixes = 0

while i < len(content):
    # Pass through protected range as-is
    if fn_start <= i < fn_end:
        if i == fn_start:
            result.append(content[fn_start:fn_end])
            i = fn_end
        continue

    ch = content[i]
    
    if ch == "'":
        # Scan to find the closing single quote
        j = i + 1
        string_parts = []
        has_newline = False
        while j < len(content):
            c2 = content[j]
            if c2 == chr(92):  # backslash
                string_parts.append(content[j:j+2])
                j += 2
                continue
            if c2 == "'":
                break
            if c2 == '\n':
                has_newline = True
                string_parts.append('\n')
                j += 1
                continue
            string_parts.append(c2)
            j += 1
        
        if has_newline:
            result.append("'" + ''.join(string_parts) + "'")
            fixes += 1
        else:
            result.append(content[i:j+1])
        i = j + 1
    
    elif ch == '"':
        # Double-quoted strings - also handle
        j = i + 1
        string_parts = []
        has_newline = False
        while j < len(content):
            c2 = content[j]
            if c2 == chr(92):
                string_parts.append(content[j:j+2])
                j += 2
                continue
            if c2 == '"':
                break
            if c2 == '\n':
                has_newline = True
                string_parts.append('\n')
                j += 1
                continue
            string_parts.append(c2)
            j += 1
        
        if has_newline:
            result.append('"' + ''.join(string_parts) + '"')
            fixes += 1
        else:
            result.append(content[i:j+1])
        i = j + 1
    
    else:
        result.append(ch)
        i += 1

new_content = ''.join(result)
print(f"Fixed {fixes} multiline string literals")

with open('src/App.jsx','w',encoding='utf-8') as f:
    f.write(new_content)
print("Saved!")
