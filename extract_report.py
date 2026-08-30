with open('src/pages/TournamentDetail.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('{/* Report Modal */}')
end = content.find('  const moveTeam = async')

if start != -1 and end != -1:
    with open('old_report_modal.jsx', 'w', encoding='utf-8') as f:
        f.write(content[start:end])
    print('Extracted old_report_modal.jsx')
else:
    print('Could not find Report Modal')
