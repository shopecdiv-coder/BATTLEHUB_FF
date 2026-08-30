import re

with open('extracted_from_transcript.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

clean_lines = []
for line in lines:
    m = re.match(r'^\d+:\s?(.*)$', line)
    if m:
        clean_lines.append(m.group(1) + '\n')
    else:
        if not line.startswith('The above content does NOT show') and not line.startswith('Created At:') and not line.startswith('Completed At:') and not line.startswith('File Path:') and not line.startswith('Total Lines:') and not line.startswith('Total Bytes:') and not line.startswith('Showing lines') and not line.startswith('The following code has been modified'):
            clean_lines.append(line)

with open('clean_extracted.jsx', 'w', encoding='utf-8') as f:
    f.writelines(clean_lines)
print("Done cleaning!")
