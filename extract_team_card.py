import re

with open('extracted_fixed.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

team_card_match = re.search(r'function TeamCard\(\{ reg, index, stageGroup, stageSlot.*?^}', content, re.DOTALL | re.MULTILINE)
if team_card_match:
    with open('new_team_card.jsx', 'w', encoding='utf-8') as f:
        f.write(team_card_match.group(0))
    print("Found TeamCard")
else:
    print("Not found TeamCard")

