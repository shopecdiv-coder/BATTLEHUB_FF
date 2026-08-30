with open('src/pages/TournamentDetail.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('<TabsContent value="details">')
end = content.find('<TabsContent value="rules">')

if start != -1 and end != -1:
    with open('old_details_tab.jsx', 'w', encoding='utf-8') as f:
        f.write(content[start:end])
    print('Extracted old_details_tab.jsx')
