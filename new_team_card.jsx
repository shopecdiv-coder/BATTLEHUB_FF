function TeamCard({ reg, index, stageGroup, stageSlot, isSolo, showPoints, grandFinal, showGroupBadge = true, currentStageIdx = 0, stagesList = [] }) {
  const [expanded, setExpanded] = useState(false);
  
  const statusLower = String(reg.status || "").toLowerCase();
  const isDisqualified = Boolean(reg.is_disqualified || reg.is_eliminated || statusLower === "disqualified" || statusLower === "eliminated" || statusLower === "rejected");
  
  const teamStageIdx = stagesList.findIndex(s => {
    const raw = String(reg.stage || reg.stage_id || "").toLowerCase().trim().replace(/\s+/g, '_');
    const sId = String(s.id || s).toLowerCase().trim().replace(/\s+/g, '_');
    const sName = String(s.name || s).toLowerCase().trim().replace(/\s+/g, '_');
    return raw === sId || raw === sName || (sName && raw.includes(sName)) || (sId && raw.includes(sId));
  });
  const isMovedAhead = teamStageIdx !== -1 && teamStageIdx > currentStageIdx;
  const isQualified = !isDisqualified && (isMovedAhead || Boolean(reg.is_qualified || statusLower === "qualified" || statusLower === "finalist" || reg.is_finalist || reg.is_semifinalist));

  const hasMembers = !isSolo && reg.team_members && reg.team_members.length > 0;
  
  return (
    <div className="bg-gray-800/50 rounded-lg overflow-hidden border border-gray-700/50">
      <div
        className={`flex items-center gap-3 p-3 ${hasMembers ? 'cursor-pointer hover:bg-gray-800 transition-colors' : ''}`}
        onClick={() => hasMembers && setExpanded(!expanded)}
      >
        {/* Logo or rank number */}
        {reg.team_logo_url ? (
          <img src={reg.team_logo_url} alt="logo" className="w-10 h-10 rounded-lg object-cover border border-gray-600 flex-shrink-0" onError={e => e.target.style.display='none'} />
        ) : (
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${
            grandFinal && index === 0 ? 'bg-gradient-to-br from-yellow-500 to-orange-500' :
            grandFinal && index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
            grandFinal && index === 2 ? 'bg-gradient-to-br from-orange-600 to-orange-700' :
            'bg-gradient-to-br from-purple-500 to-cyan-500'
          }`}>
            {index + 1}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-gray-100 text-sm">
              {isSolo ? (reg.team_members?.[0]?.ign || reg.team_leader_ign) : reg.team_name}
            </p>
            {isQualified && <span className="text-green-400 text-xs">Γ£à</span>}
          </div>
          {isSolo ? (
            <p className="text-xs text-cyan-400 font-mono">UID: {reg.team_members?.[0]?.uid || '-'}</p>
          ) : (
            <p className="text-xs text-gray-500">{reg.team_members?.length || 0} members</p>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {showPoints && (
            <Badge className="bg-cyan-500/20 text-cyan-400 text-xs border border-cyan-500/30">
              {reg.total_points || 0} pts
            </Badge>
          )}
          {hasMembers && (
            <span className="text-gray-500 text-xs">{expanded ? 'Γû▓' : 'Γû╝'}</span>
          )}
        </div>
      </div>
      
      {/* Expanded: show logo large + full team members */}
      {expanded && hasMembers && (
        <div className="border-t border-gray-700/50 bg-gray-900/40">
          {/* Logo + Team Name header */}
          {reg.team_logo_url && (
            <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-700/30">
              <img src={reg.team_logo_url} alt="logo" className="w-14 h-14 rounded-xl object-cover border-2 border-cyan-500/40" onError={e => e.target.style.display='none'} />
              <div>
                <p className="text-white font-bold">{reg.team_name}</p>
                <p className="text-xs text-cyan-400">{reg.team_members.length} Members</p>
              </div>
            </div>
          )}
          <div className="px-3 py-2 space-y-1.5">
            {reg.team_members.map((member, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 px-2 bg-gray-800/60 rounded">
                <div className="flex items-center gap-2">
                  {member.isLeader && <span className="text-yellow-400 text-xs">≡ƒææ</span>}
                  <div>
                    <p className="text-xs font-semibold text-white">{member.ign}</p>
                    <p className="text-[10px] text-cyan-400 font-mono">UID: {member.uid}</p>
                  </div>
                </div>
                {member.isLeader && (
                  <span className="text-yellow-400 text-[10px] font-semibold">Leader</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}