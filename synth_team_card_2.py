with open('old_td.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

start = content.find('function TeamCard({ reg, index, isSolo, showPoints, grandFinal }) {')
end = content.find('export default function TournamentDetail', start)
if end == -1: end = len(content)

old_team_card = content[start:end].strip()

new_signature = 'function TeamCard({ reg, index, stageGroup, stageSlot, isSolo, showPoints, grandFinal, showGroupBadge = true, currentStageIdx = 0, stagesList = [] }) {'

modified_card = old_team_card.replace(
    'function TeamCard({ reg, index, isSolo, showPoints, grandFinal }) {',
    new_signature
)

new_logic = '''
  const statusLower = String(reg.status || "").toLowerCase();
  const isDisqualified = Boolean(reg.is_disqualified || reg.is_eliminated || statusLower === "disqualified" || statusLower === "eliminated" || statusLower === "rejected");
  
  const teamStageIdx = stagesList.findIndex(s => {
    const raw = String(reg.stage || reg.stage_id || "").toLowerCase().trim().replace(/\\s+/g, '_');
    const sId = String(s.id || s).toLowerCase().trim().replace(/\\s+/g, '_');
    const sName = String(s.name || s).toLowerCase().trim().replace(/\\s+/g, '_');
    return raw === sId || raw === sName || (sName && raw.includes(sName)) || (sId && raw.includes(sId));
  });
  const isMovedAhead = teamStageIdx !== -1 && teamStageIdx > currentStageIdx;
  const isQualified = !isDisqualified && (isMovedAhead || Boolean(reg.is_qualified || statusLower === "qualified" || statusLower === "finalist" || reg.is_finalist || reg.is_semifinalist));
'''

insert_pos = modified_card.find('const isQualified =')
if insert_pos != -1:
    end_pos = modified_card.find(';', insert_pos) + 1
    modified_card = modified_card[:insert_pos] + new_logic + modified_card[end_pos:]

with open('new_team_card.jsx', 'w', encoding='utf-8') as f:
    f.write(modified_card)
