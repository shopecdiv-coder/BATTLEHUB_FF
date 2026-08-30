import re

with open('src/pages/TournamentDetail.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove all occurrences of isDownloadingPdf useState
content = re.sub(r'\s*const \[isDownloadingPdf, setIsDownloadingPdf\] = useState\(false\);', '', content)

# Insert it before the early return
insert_pos = content.find('  if (registrations.length === 0) {')
if insert_pos != -1:
    content = content[:insert_pos] + '  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);\n' + content[insert_pos:]

with open('src/pages/TournamentDetail.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
