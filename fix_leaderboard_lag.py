import re

with open('E:\\BATTLEHUB  3.0\\src\\pages\\TournamentDetail.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace O(N^2) lbList search inside rawRows
raw_rows_search = r'''    if \(registrations && registrations\.length > 0\) \{
      registrations\.forEach\(\(reg, i\) => \{
        // 1\. Find stage-specific leaderboard entry strictly for targetStageNorm
        const stageSpecificLb = lbList\.find\(lb => \{
          const isMatchUser = \(
            \(lb\.user_id && String\(lb\.user_id\) === String\(reg\.team_leader_id\)\) ||
            \(lb\.user_id && String\(lb\.user_id\) === String\(reg\.user_id\)\) ||
            \(lb\.id && String\(lb\.id\) === String\(reg\.id\)\) ||
            \(lb\.team_name && reg\.team_name && String\(lb\.team_name\)\.trim\(\)\.toLowerCase\(\) === String\(reg\.team_name\)\.trim\(\)\.toLowerCase\(\)\) ||
            String\(lb\.unique_id || ""\)\.includes\(String\(reg\.id || '___'\)\) ||
            String\(lb\.unique_id || ""\)\.includes\(String\(reg\.team_leader_id || '___'\)\)
          \);
          if \(!isMatchUser\) return false;

          const lbStageNorm = String\(lb\.stage || ""\)\.toLowerCase\(\)\.trim\(\)\.replace\(/\[\^a-z0-9\]\+/g, '_'\);
          return lbStageNorm === targetStageNorm;
        \}\);'''

raw_rows_replace = '''    if (registrations && registrations.length > 0) {
      // O(N) Maps for faster lookups
      const lbByUserId = new Map();
      const lbByRegId = new Map();
      const lbByTeamName = new Map();
      
      lbList.forEach(lb => {
        const lbStageNorm = String(lb.stage || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
        if (lbStageNorm === targetStageNorm) {
          if (lb.user_id) lbByUserId.set(String(lb.user_id), lb);
          if (lb.id) lbByRegId.set(String(lb.id), lb);
          if (lb.team_name) lbByTeamName.set(String(lb.team_name).trim().toLowerCase(), lb);
        }
      });

      registrations.forEach((reg, i) => {
        // 1. Find stage-specific leaderboard entry strictly for targetStageNorm
        let stageSpecificLb = null;
        if (reg.team_leader_id && lbByUserId.has(String(reg.team_leader_id))) stageSpecificLb = lbByUserId.get(String(reg.team_leader_id));
        else if (reg.user_id && lbByUserId.has(String(reg.user_id))) stageSpecificLb = lbByUserId.get(String(reg.user_id));
        else if (reg.id && lbByRegId.has(String(reg.id))) stageSpecificLb = lbByRegId.get(String(reg.id));
        else if (reg.team_name && lbByTeamName.has(String(reg.team_name).trim().toLowerCase())) stageSpecificLb = lbByTeamName.get(String(reg.team_name).trim().toLowerCase());
        else {
           stageSpecificLb = lbList.find(lb => {
             const isMatchUser = (
               String(lb.unique_id || "").includes(String(reg.id || '___')) ||
               String(lb.unique_id || "").includes(String(reg.team_leader_id || '___'))
             );
             if (!isMatchUser) return false;
             const lbStageNorm = String(lb.stage || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
             return lbStageNorm === targetStageNorm;
           });
        }'''
content = re.sub(raw_rows_search, raw_rows_replace, content, count=1)


# Replace O(N^2) search in getRegForEntry
get_reg_search = r'''  const getRegForEntry = \(entry\) => registrations\.find\(r => r\.team_leader_id === entry\.user_id || r\.id === entry\.id\);
  const adminMsg = leaderboardEntries && leaderboardEntries\.length > 0 \? \(leaderboardEntries\[0\]\?\.admin_message || ""\) : "";
  const isFinalized = leaderboardEntries && leaderboardEntries\.length > 0 && leaderboardEntries\[0\]\?\.is_finalized;

  // Qualification counts
  const totalQualifiedCount = rawRows\.filter\(r => r\.is_qualified || getRegForEntry\(r\)\?\.is_qualified || getRegForEntry\(r\)\?\.status === "Qualified"\)\.length;

  // Search, Group & Stage Filter
  const filteredRows = rawRows\.filter\(\(r, idx\) => \{
    const origIdx = registrations\.findIndex\(reg => reg\.id === r\.id || \(reg\.team_leader_id && reg\.team_leader_id === r\.user_id\)\);
    const realIdx = origIdx >= 0 \? origIdx : idx;
    
    const grp = r\.group_number !== undefined && r\.group_number !== null && String\(r\.group_number\)\.trim\(\) !== ""
      \? String\(r\.group_number\)\.replace\(/\[\^0-9\]/g, ''\) || String\(r\.group_number\)
      : String\(Math\.floor\(realIdx / 12\) \+ 1\);

    const matchesGrp = selectedGroup === "all" || selectedGroup === grp;

    const isQual = r\.is_qualified || getRegForEntry\(r\)\?\.is_qualified || getRegForEntry\(r\)\?\.status === "Qualified";'''

get_reg_replace = '''  // Optimize O(N^2) lookups with Maps
  const regByLeaderId = new Map();
  const regById = new Map();
  registrations.forEach((r, idx) => {
    if (r.team_leader_id) regByLeaderId.set(String(r.team_leader_id), {reg: r, idx});
    if (r.id) regById.set(String(r.id), {reg: r, idx});
  });

  const getRegForEntry = (entry) => {
    if (entry.user_id && regByLeaderId.has(String(entry.user_id))) return regByLeaderId.get(String(entry.user_id)).reg;
    if (entry.id && regById.has(String(entry.id))) return regById.get(String(entry.id)).reg;
    return null;
  };
  const getRegIdxForEntry = (entry) => {
    if (entry.id && regById.has(String(entry.id))) return regById.get(String(entry.id)).idx;
    if (entry.user_id && regByLeaderId.has(String(entry.user_id))) return regByLeaderId.get(String(entry.user_id)).idx;
    return -1;
  };

  const adminMsg = leaderboardEntries && leaderboardEntries.length > 0 ? (leaderboardEntries[0]?.admin_message || "") : "";
  const isFinalized = leaderboardEntries && leaderboardEntries.length > 0 && leaderboardEntries[0]?.is_finalized;

  // Qualification counts
  const totalQualifiedCount = rawRows.filter(r => r.is_qualified || getRegForEntry(r)?.is_qualified || getRegForEntry(r)?.status === "Qualified").length;

  // Search, Group & Stage Filter
  const filteredRows = rawRows.filter((r, idx) => {
    const origIdx = getRegIdxForEntry(r);
    const realIdx = origIdx >= 0 ? origIdx : idx;
    
    const grp = r.group_number !== undefined && r.group_number !== null && String(r.group_number).trim() !== ""
      ? String(r.group_number).replace(/[^0-9]/g, '') || String(r.group_number)
      : String(Math.floor(realIdx / 12) + 1);

    const matchesGrp = selectedGroup === "all" || selectedGroup === grp;

    const matchedReg = getRegForEntry(r);
    const isQual = r.is_qualified || matchedReg?.is_qualified || matchedReg?.status === "Qualified";'''
content = re.sub(get_reg_search, get_reg_replace, content, count=1)


# Add row limit in render
render_search = r'''            <tbody className="divide-y divide-slate-800/60">
              \{sortedFilteredRows\.map\(\(entry, index\) => \{
                const reg = getRegForEntry\(entry\) || \{\};'''

render_replace = '''            <tbody className="divide-y divide-slate-800/60">
              {sortedFilteredRows.slice(0, 100).map((entry, index) => {
                const reg = getRegForEntry(entry) || {};'''
content = re.sub(render_search, render_replace, content, count=1)

# Add "Load more" warning if rows exceed limit
tbody_end_search = r'''                      </React\.Fragment>
                    \)}
                  </React\.Fragment>
                \);
              \}\)\}
            </tbody>'''

tbody_end_replace = '''                      </React.Fragment>
                    )}
                  </React.Fragment>
                );
              })}
              {sortedFilteredRows.length > 100 && (
                <tr>
                  <td colSpan="6" className="py-4 text-center text-xs text-slate-500 font-medium italic bg-slate-950">
                    Showing top 100 teams to maintain performance. Download the PDF for full standings.
                  </td>
                </tr>
              )}
            </tbody>'''
content = re.sub(tbody_end_search, tbody_end_replace, content, count=1)


with open('E:\\BATTLEHUB  3.0\\src\\pages\\TournamentDetail.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Done fixing leaderboard lag")
