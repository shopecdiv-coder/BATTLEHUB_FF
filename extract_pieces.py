import re

with open('extracted_fixed.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

teams_tab_match = re.search(r'\{/\*\s*?\s*TEAMS TAB \(SINGLE TOURNAMENT 3-STAGE PROGRESSION SYSTEM\)\s*?\s*\*/\}.*?</TabsContent>', content, re.DOTALL | re.IGNORECASE)
if teams_tab_match:
    with open('new_teams_tab.jsx', 'w', encoding='utf-8') as f:
        f.write(teams_tab_match.group(0))
    print("Found and extracted TEAMS TAB")
else:
    print("Could not find TEAMS TAB")

team_card_match = re.search(r'function TeamCard\(\{ reg, index, stageGroup, stageSlot,.*?^\}', content, re.DOTALL | re.MULTILINE)
if team_card_match:
    with open('new_team_card.jsx', 'w', encoding='utf-8') as f:
        f.write(team_card_match.group(0))
    print("Found and extracted NEW TeamCard")
else:
    print("Could not find NEW TeamCard")
