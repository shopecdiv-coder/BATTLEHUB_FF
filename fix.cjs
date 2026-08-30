const fs = require('fs');
let content = fs.readFileSync('src/pages/TournamentDetail.jsx', 'utf-8');

// 1. Optimize rawRows
const rawRowsTarget = `    if (registrations && registrations.length > 0) {
      registrations.forEach((reg, i) => {
        // 1. Find stage-specific leaderboard entry strictly for targetStageNorm
        const stageSpecificLb = lbList.find(lb => {
          const isMatchUser = (
            (lb.user_id && String(lb.user_id) === String(reg.team_leader_id)) ||
            (lb.user_id && String(lb.user_id) === String(reg.user_id)) ||
            (lb.id && String(lb.id) === String(reg.id)) ||
            (lb.team_name && reg.team_name && String(lb.team_name).trim().toLowerCase() === String(reg.team_name).trim().toLowerCase()) ||
            String(lb.unique_id || "").includes(String(reg.id || '___')) ||
            String(lb.unique_id || "").includes(String(reg.team_leader_id || '___'))
          );
          if (!isMatchUser) return false;

          const lbStageNorm = String(lb.stage || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, '_');
          return lbStageNorm === targetStageNorm;
        });`;

const rawRowsReplace = `    if (registrations && registrations.length > 0) {
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
        }`;
content = content.replace(rawRowsTarget, rawRowsReplace);

// 2. Optimize getRegForEntry
const getRegTarget = `  const getRegForEntry = (entry) => registrations.find(r => r.team_leader_id === entry.user_id || r.id === entry.id);
  const adminMsg = leaderboardEntries && leaderboardEntries.length > 0 ? (leaderboardEntries[0]?.admin_message || "") : "";
  const isFinalized = leaderboardEntries && leaderboardEntries.length > 0 && leaderboardEntries[0]?.is_finalized;

  // Qualification counts
  const totalQualifiedCount = rawRows.filter(r => r.is_qualified || getRegForEntry(r)?.is_qualified || getRegForEntry(r)?.status === "Qualified").length;

  // Search, Group & Stage Filter
  const filteredRows = rawRows.filter((r, idx) => {
    const origIdx = registrations.findIndex(reg => reg.id === r.id || (reg.team_leader_id && reg.team_leader_id === r.user_id));
    const realIdx = origIdx >= 0 ? origIdx : idx;
    
    const grp = r.group_number !== undefined && r.group_number !== null && String(r.group_number).trim() !== ""
      ? String(r.group_number).replace(/[^0-9]/g, '') || String(r.group_number)
      : String(Math.floor(realIdx / 12) + 1);

    const matchesGrp = selectedGroup === "all" || selectedGroup === grp;

    const isQual = r.is_qualified || getRegForEntry(r)?.is_qualified || getRegForEntry(r)?.status === "Qualified";`;

const getRegReplace = `  const regByLeaderId = new Map();
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

  const totalQualifiedCount = rawRows.filter(r => r.is_qualified || getRegForEntry(r)?.is_qualified || getRegForEntry(r)?.status === "Qualified").length;

  const filteredRows = rawRows.filter((r, idx) => {
    const origIdx = getRegIdxForEntry(r);
    const realIdx = origIdx >= 0 ? origIdx : idx;
    
    const grp = r.group_number !== undefined && r.group_number !== null && String(r.group_number).trim() !== ""
      ? String(r.group_number).replace(/[^0-9]/g, '') || String(r.group_number)
      : String(Math.floor(realIdx / 12) + 1);

    const matchesGrp = selectedGroup === "all" || selectedGroup === grp;

    const matchedReg = getRegForEntry(r);
    const isQual = r.is_qualified || matchedReg?.is_qualified || matchedReg?.status === "Qualified";`;
content = content.replace(getRegTarget, getRegReplace);


// 3. Add pagination (limit to 100)
const mapTarget = `            <tbody className="divide-y divide-slate-800/60">
              {sortedFilteredRows.map((entry, index) => {
                const reg = getRegForEntry(entry) || {};`;

const mapReplace = `            <tbody className="divide-y divide-slate-800/60">
              {sortedFilteredRows.slice(0, 100).map((entry, index) => {
                const reg = getRegForEntry(entry) || {};`;
content = content.replace(mapTarget, mapReplace);

const loadMoreTarget = `                      </React.Fragment>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>`;

const loadMoreReplace = `                      </React.Fragment>
                    )}
                  </React.Fragment>
                );
              })}
              {sortedFilteredRows.length > 100 && (
                <tr>
                  <td colSpan="6" className="py-4 text-center text-xs text-slate-500 font-medium italic bg-slate-950">
                    Showing top 100 teams out of {sortedFilteredRows.length} to maintain performance. Download the PDF for full standings.
                  </td>
                </tr>
              )}
            </tbody>`;
content = content.replace(loadMoreTarget, loadMoreReplace);

fs.writeFileSync('src/pages/TournamentDetail.jsx', content, 'utf-8');
console.log('done fixing');
