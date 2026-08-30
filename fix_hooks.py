with open('src/pages/TournamentDetail.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);\n', '')
content = content.replace(
    '  const [selectedStage, setSelectedStage] = useState("all");',
    '  const [selectedStage, setSelectedStage] = useState("all");\n  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);'
)

with open('src/pages/TournamentDetail.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
