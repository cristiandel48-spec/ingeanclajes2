import sys

with open('src/App.jsx','r',encoding='utf-8') as f:
    content = f.read()

START_ANCHOR = '\n  return(\n    <div style={{padding:28}}>'
END_ANCHOR = '\n  );\n}\n\nfunction CotizacionPrint'

start_idx = content.find(START_ANCHOR)
end_idx = content.find(END_ANCHOR, start_idx)

print(f'Form starts at char {start_idx}, ends at char {end_idx}')

if start_idx == -1 or end_idx == -1:
    print('ANCHOR NOT FOUND')
    sys.exit(1)

new_form = open('new_form_jsx.txt','r',encoding='utf-8').read()
print(f'New form length: {len(new_form)}')

old_section = content[start_idx : end_idx]
print(f'Old form length: {len(old_section)}')

new_content = content[:start_idx] + new_form + content[end_idx:]
with open('src/App.jsx','w',encoding='utf-8') as f:
    f.write(new_content)
print('Done!')
