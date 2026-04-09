"""
Fix multiline single-quoted strings that were incorrectly created by fix_all_bt.py.
These are inside buildCotizacionPrintHtml, between the top of the function and the
big return `...` template literal.
We just need to join the broken lines back into one-liners.
"""
path = r"C:\Users\cristian.florez\OneDrive - 900411781_FAJAS MYD POSQUIRURGICAS SAS\Documentos\ingeanclajes2\src\App.jsx"
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

BT = chr(0x60)

# Find the function boundaries
fn_start = content.find('function buildCotizacionPrintHtml(c){')
ret_start = content.find('return ' + BT + '<!doctype html>', fn_start)

# Extract the part before the return (where the broken multiline strings are)
before_return = content[fn_start:ret_start]
after_return = content[ret_start:]

# The broken multiline strings look like:
#   const mapBlock = quoteMapSrc ? '\n    <div...>\n    ...\n    </div>' : '';
# We need to collapse the newlines within single-quoted strings

# Strategy: find lines that don't end with ; or { or } or , but are
# continuation of a string — collapse them

# Better approach: find all single-quoted multiline strings and join them
import re

def collapse_multiline_sq(text):
    """
    In a JS code block, find single-quoted string literals that span multiple
    lines (invalid in JS) and collapse them to single lines, escaping newlines.
    """
    # We'll process char by char
    result = []
    i = 0
    fixes = 0
    while i < len(text):
        c = text[i]
        if c == "'":
            # Find matching closing quote (skip escaped chars)
            j = i + 1
            string_content = []
            multiline = False
            while j < len(text):
                c2 = text[j]
                if c2 == '\\':
                    string_content.append(text[j:j+2])
                    j += 2
                    continue
                if c2 == "'":
                    break
                if c2 == '\n':
                    multiline = True
                    string_content.append('\\n')
                    j += 1
                    continue
                string_content.append(c2)
                j += 1
            # j points to closing quote or end
            if multiline:
                result.append("'" + ''.join(string_content) + "'")
                fixes += 1
            else:
                result.append(text[i:j+1])
            i = j + 1
        else:
            result.append(c)
            i += 1
    return ''.join(result), fixes

fixed_before, fixes = collapse_multiline_sq(before_return)
print(f"Fixed {fixes} multiline strings in function preamble")

content = content[:fn_start] + fixed_before + after_return

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
