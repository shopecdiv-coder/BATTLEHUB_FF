function LeaderboardTab({ 

  registrations, 

  leaderboardEntries, 

  tournament, 

  user, 

  isRegistered, 

  canMove, 

  isQualifierType, 

  isSemifinalType, 

  isGrandFinalType, 

  sfATournament, 

  sfBTournament, 

  gfTournament, 

  movingTeam, 

  moveTeam, 

  setShowReportModal,

  matchCredentials,

  setShowCredentialsModal,

  matches = []

}) {

  const [expandedId, setExpandedId] = useState(null);

  const [searchQuery, setSearchQuery] = useState("");

  const [selectedGroup, setSelectedGroup] = useState("all");

  const [selectedStage, setSelectedStage] = useState("all");

  if (registrations.length === 0) {

    return (

      <Card className="bg-slate-900/80 border-slate-800 rounded-2xl">

        <CardContent className="py-14 text-center">

          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />

          <p className="text-slate-400 font-bold text-sm">No standings data available yet</p>

          <p className="text-slate-500 text-xs mt-1">Teams will appear here once registered or matches begin.</p>

        </CardContent>

      </Card>

    );

  }

  // Dynamic Stages List from tournament data

  const defaultStages = [

    { id: "all", name: "All Stages" },

    { id: "qualifiers", name: "Qualifier" },

    { id: "league", name: "League" },

    { id: "semifinals", name: "Semifinal" },

    { id: "grand_final", name: "Grand Final" }

  ];

  const stagesList = (tournament?.stages && Array.isArray(tournament.stages) && tournament.stages.length > 0)

    ? [{ id: "all", name: "All Stages" }, ...tournament.stages.map((st, i) => typeof st === 'string' ? { id: `stage_${i}`, name: st } : st)]

    : defaultStages;

  // Raw row generation - Merges leaderboardEntries with all registrations so ALL registered teams are visible!

  const rawRows = (() => {

    const lbMap = new Map();

    (leaderboardEntries || []).forEach(lb => {

      if (lb.user_id) lbMap.set(`user_${lb.user_id}`, lb);

      if (lb.id) lbMap.set(`id_${lb.id}`, lb);

      if (lb.team_name) lbMap.set(`name_${String(lb.team_name).trim().toLowerCase()}`, lb);

    });

    const rows = [];

    // If registered teams exist, use registrations as the master list so count matches SLOTS exactly

    if (registrations && registrations.length > 0) {

      registrations.forEach((reg, i) => {

        const lb = (reg.team_leader_id && lbMap.get(`user_${reg.team_leader_id}`)) ||

                   (reg.id && lbMap.get(`id_${reg.id}`)) ||

                   (reg.team_name && lbMap.get(`name_${String(reg.team_name).trim().toLowerCase()}`));

        if (lb) {

          rows.push({

            ...lb,

            _rowUid: `reg-${i}-${reg.id || reg.team_leader_id || i}`,

            id: lb.id || reg.id,

            team_name: reg.team_name || lb.team_name || reg.team_leader_ign || `Team ${i + 1}`,

            player_ign: reg.team_leader_ign || lb.player_ign || "Leader",

            player_uid: reg.team_members?.[0]?.uid || reg.team_leader_uid || lb.player_uid || '-',

            kills: lb.kills !== undefined ? lb.kills : (reg.total_kills || 0),

            points: lb.points !== undefined ? lb.points : (reg.total_points || 0),

            team_members: (reg.team_members && reg.team_members.length > 0) ? reg.team_members : (lb.team_members || []),

            user_id: reg.team_leader_id || lb.user_id,

            team_logo_url: reg.team_logo_url || lb.team_logo_url || "",

            is_qualified: Boolean(lb.is_qualified || reg.is_qualified || reg.status === "Qualified"),

            stage: reg.stage || lb.stage || (isGrandFinalType ? "Grand Final" : isSemifinalType ? "Semifinals" : "Qualifier"),

            group_number: String(Math.floor(i / 12) + 1),

            match_results: lb.match_results || reg.match_results || []

          });

        } else {

          rows.push({

            _rowUid: `reg-${i}-${reg.id || reg.team_leader_id || i}`,

            id: reg.id,

            rank: 999 + i,

            team_name: reg.team_name || reg.team_leader_ign || `Team ${i + 1}`,

            player_ign: reg.team_leader_ign || "Leader",

            player_uid: reg.team_members?.[0]?.uid || reg.team_leader_uid || '-',

            kills: reg.total_kills || 0,

            points: reg.total_points || 0,

            placement: 0,

            wins: 0,

            team_members: reg.team_members || [],

            user_id: reg.team_leader_id,

            team_logo_url: reg.team_logo_url || "",

            is_qualified: Boolean(reg.is_qualified || reg.status === "Qualified"),

            stage: reg.stage || (isGrandFinalType ? "Grand Final" : isSemifinalType ? "Semifinals" : "Qualifier"),

            group_number: String(Math.floor(i / 12) + 1),

            match_results: reg.match_results || []

          });

        }

      });

    } else {

      // Fallback if no registrations exist yet

      (leaderboardEntries || []).forEach((lb, idx) => {

        rows.push({

          ...lb,

          _rowUid: `lb-${idx}-${lb.id || lb.user_id || idx}`,

          id: lb.id,

          team_name: lb.team_name || lb.player_ign || "Unknown Team",

          player_ign: lb.player_ign || "Leader",

          player_uid: lb.player_uid || '-',

          kills: lb.kills || 0,

          points: lb.points || 0,

          team_members: lb.team_members || [],

          user_id: lb.user_id,

          team_logo_url: lb.team_logo_url || "",

          is_qualified: Boolean(lb.is_qualified),

          stage: lb.stage || (isGrandFinalType ? "Grand Final" : isSemifinalType ? "Semifinals" : "Qualifier"),

          group_number: String(Math.floor(idx / 12) + 1),

          match_results: lb.match_results || []

        });

      });

    }

    return rows;

  })();

  const getRegForEntry = (entry) => registrations.find(r => r.team_leader_id === entry.user_id || r.id === entry.id);

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

    const isQual = r.is_qualified || getRegForEntry(r)?.is_qualified || getRegForEntry(r)?.status === "Qualified";

    const regStage = String(r.stage || "").toLowerCase();

    let matchesStage = true;

    if (selectedStage === "all") {

      matchesStage = true;

    } else if (selectedStage === "qualified") {

      matchesStage = isQual;

    } else {

      const selLower = selectedStage.toLowerCase();

      const stObj = stagesList.find(s => String(s.id || s).toLowerCase() === selLower || String(s.name || s).toLowerCase() === selLower);

      const targetName = (stObj?.name || selectedStage).toLowerCase();

      const targetId = (stObj?.id || selectedStage).toLowerCase();

      if (targetName.includes("qualifier") || targetName.includes("round 1") || targetId.includes("qualifier")) {

        matchesStage = true;

      } else {

        matchesStage = regStage === targetId ||

                       regStage === targetName ||

                       (targetName && regStage.includes(targetName)) ||

                       (targetName.includes("semi") && (regStage.includes("semi") || isQual)) ||

                       (targetName.includes("final") && (regStage.includes("final") || regStage.includes("grand")));

      }

    }

    const q = (searchQuery || "").toLowerCase().trim();

    if (!q) return matchesGrp && matchesStage;

    const reg = getRegForEntry(r) || {};

    const rawMembers = Array.isArray(r.team_members) && r.team_members.length > 0

      ? r.team_members

      : (Array.isArray(reg.team_members) ? reg.team_members : []);

    const tName = String(r.team_name || reg.team_name || "").toLowerCase();

    const leaderIgn = String(r.player_ign || reg.team_leader_ign || "").toLowerCase();

    const uid = String(r.player_uid || reg.team_leader_uid || "").toLowerCase();

    const memberMatches = rawMembers.some(m => {

      if (!m) return false;

      const mIgn = typeof m === 'string' ? m : (m.ign || m.name || m.player_ign || '');

      const mUid = typeof m === 'object' ? (m.uid || m.game_id || '') : '';

      return String(mIgn).toLowerCase().includes(q) || String(mUid).toLowerCase().includes(q);

    });

    const rankStr = String(idx + 1);

    const matchesQ = tName.includes(q) || leaderIgn.includes(q) || uid.includes(q) || memberMatches || rankStr === q || `#${rankStr}` === q;

    return matchesGrp && matchesStage && matchesQ;

  });

  // Official eSports Tie-Breaker Rule Sorting:

  // Priority 1: Total Points (descending)

  const getBooyahCount = (row) => {

    if (!row?.match_results || !Array.isArray(row.match_results)) return 0;

    return row.match_results.filter(m => m && m.placement === 1).length;

  };

  

  const getLastMatchPlacement = (row) => {

    if (!row?.match_results || !Array.isArray(row.match_results)) return 999;

    const validMatches = row.match_results.filter(m => m);

    if (validMatches.length === 0) return 999;

    const sortedMatches = [...validMatches].sort((a,b) => String(b?.match_number||"").localeCompare(String(a?.match_number||"")));

    return sortedMatches[0]?.placement || 999;

  };

  const sortedFilteredRows = [...filteredRows].sort((a, b) => {

    const ptsA = a.points || 0;

    const ptsB = b.points || 0;

    if (ptsB !== ptsA) return ptsB - ptsA;

    const booA = getBooyahCount(a);

    const booB = getBooyahCount(b);

    if (booB !== booA) return booB - booA;

    const killA = a.kills || 0;

    const killB = b.kills || 0;

    if (killB !== killA) return killB - killA;

    const lastA = getLastMatchPlacement(a);

    const lastB = getLastMatchPlacement(b);

    return lastA - lastB;

  });

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const downloadOfficialStandings = async () => {

    if (isDownloadingPdf) return;

    setIsDownloadingPdf(true);

    const toastId = toast.loading("⚡ Initializing Esports Booklet Generator...");

    try {

      await generateTournamentPDF({

        tournament,

        leaderboardRows: sortedFilteredRows,

        registrations,

        matches,

        selectedStage,

        selectedGroup,

        onProgress: ({ page, totalPages, percentage, estimatedMb, remainingSec, title }) => {

          toast.loading(

            `📄 PDF Booklet Progress: ${percentage}%\n` +

            `Page ${page}/${totalPages}: ${title}\n` +

            `💾 Size: ~${estimatedMb} MB • ⏱️ ~${remainingSec}s left`,

            { id: toastId }

          );

        }

      });

      toast.success("Official Standings PDF Downloaded! 📄", { id: toastId });

    } catch (err) {

      console.error("PDF download failed:", err);

      toast.error(`Failed to generate PDF: ${err.message || err}`, { id: toastId, duration: 6000 });

    } finally {

      setIsDownloadingPdf(false);

    }

  };

  return (

    <div className="space-y-3">

      {/* ALWAYS VISIBLE CREDENTIALS BUTTON */}

      {isRegistered && (

        <Button 

          onClick={() => setShowCredentialsModal(true)}

          className={`w-full h-11 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-all cursor-pointer ${matchCredentials ? "bg-cyan-600 hover:bg-cyan-500 text-white animate-[pulse_2s_ease-in-out_infinite] shadow-cyan-900/30 border border-cyan-400" : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"}`}

        >

          <Key className={`w-4 h-4 mr-2 ${matchCredentials ? 'text-cyan-100' : 'text-orange-400'}`} />

          {matchCredentials ? "VIEW MATCH CREDENTIALS!" : "VIEW MATCH CREDENTIALS"}

        </Button>

      )}

      {/* Main Standings Table Card */}

      <Card className="bg-slate-900/80 border-slate-800 rounded-2xl overflow-hidden shadow-xl">

        {/* Header Bar */}

        <div className="bg-slate-950/90 border-b border-slate-800 p-2.5 space-y-2">

          {/* Top Row: Title + Badges on Left, Download Button on Right */}

          <div className="flex items-center justify-between gap-2">

            <div className="flex items-center gap-1.5 min-w-0">

              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />

              <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider truncate">Official Standings</h3>

              <Badge className="bg-slate-800/80 text-slate-300 border border-slate-700/60 text-[10px] font-bold px-1.5 py-0">

                {filteredRows.length}

              </Badge>

              {isFinalized && (

                <Badge className="bg-slate-800/80 text-cyan-400 border border-cyan-500/30 text-[10px] font-bold px-1.5 py-0">

                  ✓ Finalized

                </Badge>

              )}

            </div>

            <button

              onClick={downloadOfficialStandings}

              type="button"

              disabled={isDownloadingPdf}

              title="Download Official Standings PDF Report"

              className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 border border-slate-700/80 hover:border-slate-600 text-slate-200 hover:text-white text-[11px] font-bold h-7 px-2.5 rounded-md transition-all active:scale-95 shrink-0 cursor-pointer shadow-sm"

            >

              {isDownloadingPdf ? (

                <>

                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />

                  <span>Generating...</span>

                </>

              ) : (

                <>

                  <Download className="w-3.5 h-3.5 text-orange-400" />

                  <span>Download</span>

                </>

              )}

            </button>

          </div>

          {/* Filters Row: Stage, Group, Search (Fits 100% display width with ZERO horizontal scroll) */}

          <div className="grid grid-cols-12 gap-1.5 w-full">

            {/* Stage Select Dropdown */}

            <div className="col-span-4">

              <select

                value={selectedStage}

                onChange={(e) => setSelectedStage(e.target.value)}

                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-[11px] h-7 rounded-md px-1.5 focus:outline-none truncate"

              >

                {stagesList.map((st) => (

                  <option key={st.id || st.name} value={st.id || st.name}>

                    {st.name || st}

                  </option>

                ))}

              </select>

            </div>

            {/* Group Select Dropdown */}

            <div className="col-span-4">

              <select

                value={selectedGroup}

                onChange={(e) => setSelectedGroup(e.target.value)}

                className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-[11px] h-7 rounded-md px-1.5 focus:outline-none truncate"

              >

                <option value="all">All Groups</option>

                {Array.from({ length: Math.ceil(Math.max(registrations.length, rawRows.length) / 12) || 1 }, (_, i) => (

                  <option key={i + 1} value={String(i + 1)}>

                    Group {i + 1}

                  </option>

                ))}

              </select>

            </div>

            {/* Search Input */}

            <div className="col-span-4">

              <Input

                placeholder="Search..."

                value={searchQuery}

                onChange={e => setSearchQuery(e.target.value)}

                className="w-full bg-slate-900 border-slate-800 text-white text-[11px] h-7 px-2"

              />

            </div>

          </div>

        </div>

        {/* Admin Announcement Banner */}

        {adminMsg && (

          <div className="bg-cyan-500/10 border-b border-cyan-500/20 px-3.5 py-2 flex items-center gap-2 text-xs text-cyan-300">

            <span>📢</span>

            <p className="font-semibold truncate">{adminMsg}</p>

          </div>

        )}

        {/* Main Table (Standalone Internal Scroll Container with Sticky Header) */}

        <div className="w-full max-h-[560px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">

          <table className="w-full text-xs table-fixed">

            <thead className="sticky top-0 bg-slate-950 z-10 shadow-sm">

              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">

                <th className="py-2.5 px-1.5 text-left w-12">S.NO.</th>

                <th className="py-2.5 px-2 text-left">Team Name</th>

                <th className="py-2.5 px-1 text-center w-10">Kills</th>

                <th className="py-2.5 px-1 text-center w-12">POS</th>

                <th className="py-2.5 px-1 text-center w-14">Pts</th>

                <th className="w-6 py-2.5 text-center"></th>

              </tr>

            </thead>

            <tbody className="divide-y divide-slate-800/60">

              {sortedFilteredRows.map((entry, index) => {

                const reg = getRegForEntry(entry) || {};

                const logo = entry.team_logo_url || reg.team_logo_url;

                

                const rawMembers = Array.isArray(entry.team_members) ? entry.team_members : (Array.isArray(reg.team_members) ? reg.team_members : []);

                const members = rawMembers.map((m, idx) => {

                  if (typeof m === 'string') {

                    const isCurrentUser = user && (user.ign === m || user.full_name === m);

                    return {

                      ign: m,

                      uid: '-',

                      isLeader: idx === 0,

                      kills: 0,

                      avatar_url: isCurrentUser ? (user.avatar_url || user.avatar || user.dp || user.photoURL || '') : ''

                    };

                  }

                  if (!m) return { ign: `Player ${idx + 1}`, uid: '-', isLeader: idx === 0, kills: 0, avatar_url: '' };

                  const mUid = m.uid || m.game_id || m.in_game_id || '';

                  const mIgn = m.ign || m.name || m.player_ign || `Player ${idx + 1}`;

                  let mAvatar = m.avatar_url || m.avatar || m.dp || m.photoURL || m.logo || m.logo_url || '';

                  if (!mAvatar && user) {

                    if ((mUid && (mUid === user.game_uid || mUid === user.game_id || mUid === user.uid)) ||

                        (mIgn && (mIgn.toLowerCase() === (user.ign || '').toLowerCase() || mIgn.toLowerCase() === (user.full_name || '').toLowerCase())) ||

                        (idx === 0 && (entry.user_id === user.id || reg.team_leader_id === user.id))) {

                      mAvatar = user.avatar_url || user.avatar || user.dp || user.photoURL || '';

                    }

                  }

                  return {

                    ign: mIgn,

                    uid: mUid || '-',

                    isLeader: Boolean(m.isLeader || idx === 0),

                    kills: m.kills || 0,

                    avatar_url: mAvatar

                  };

                });

                

                const rowId = entry._rowUid || `row-${index}`;

                const isExpanded = expandedId === rowId;

                const rankNum = index + 1;

                const displayName = entry.team_name || entry.player_ign || "Unknown Team";

                const isQualified = entry.is_qualified || reg.is_qualified || reg.status === "Qualified";

                

                const matchResults = Array.isArray(entry.match_results) ? entry.match_results : [];

                const booyahCount = matchResults.filter(mr => mr && mr.placement === 1).length;

                return (

                  <React.Fragment key={rowId}>

                    <tr

                      onClick={() => setExpandedId(isExpanded ? null : rowId)}

                      className={`cursor-pointer transition-colors hover:bg-slate-800/40 ${

                        rankNum === 1 ? 'bg-amber-500/5' :

                        rankNum === 2 ? 'bg-slate-400/5' :

                        rankNum === 3 ? 'bg-amber-700/5' : ''

                      }`}

                    >

                      <td className="py-2.5 px-1.5 font-black text-left">

                        <span className={`text-[11px] ${

                          rankNum === 1 ? 'text-amber-400 font-black' :

                          rankNum === 2 ? 'text-slate-300 font-black' :

                          rankNum === 3 ? 'text-amber-600 font-black' : 'text-slate-500 font-bold'

                        }`}>

                          #{rankNum}

                        </span>

                      </td>

                      <td className="py-2.5 px-2">

                        <div className="flex items-center gap-1.5 min-w-0">

                          {logo ? (

                            <img src={logo} alt="" className="w-7 h-7 min-w-[28px] max-w-[28px] min-h-[28px] max-h-[28px] rounded-md object-cover border border-slate-700 shrink-0" onError={e=>e.target.style.display='none'} />

                          ) : (

                            <div className="w-7 h-7 min-w-[28px] max-w-[28px] min-h-[28px] max-h-[28px] rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 text-xs shrink-0">

                              {displayName.charAt(0).toUpperCase()}

                            </div>

                          )}

                          <div className="min-w-0 flex-1">

                            <p className="font-bold text-white text-[11px] truncate leading-tight">{displayName}</p>

                          </div>

                        </div>

                      </td>

                      <td className="py-2.5 px-1 text-center">

                        <span className="font-bold text-red-400 text-[11px]">{entry.kills || 0}</span>

                      </td>

                      <td className="py-2.5 px-1 text-center">

                        <span className="font-bold text-slate-300 text-[11px]">

                          {entry.placement_points !== undefined ? entry.placement_points : Math.max(0, (entry.points || 0) - (entry.kills || 0))}

                        </span>

                      </td>

                      <td className="py-2.5 px-1 text-center">

                        <span className="font-black text-cyan-400 text-[11px]">

                          {entry.points || 0}

                        </span>

                      </td>

                      <td className="py-2.5 text-center text-slate-500 text-[9px]">

                        {isExpanded ? '▲' : '▼'}

                      </td>

                    </tr>

                    {/* Expanded Team Breakdown Drawer */}

                    {isExpanded && (

                      <tr className="border-b border-slate-800/80">

                        <td colSpan={6} className="px-3 py-2.5 bg-slate-950/95">

                          <div className="space-y-2">

                            {/* Squad Roster — Clean Compact 4-Col Grid */}

                            {members.length > 0 && (

                              <div className="bg-slate-900/60 border border-slate-800/70 rounded-lg p-2">

                                <div className="flex items-center justify-between mb-1.5 px-0.5">

                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">

                                    <Users className="w-3.5 h-3.5 text-amber-400" /> Squad Roster

                                  </span>

                                  {user && isRegistered && entry.user_id !== user.id && (

                                    <button

                                      onClick={(e) => { e.stopPropagation(); setShowReportModal(entry); }}

                                      className="text-red-400 hover:text-red-300 flex items-center gap-1 text-[10px] font-semibold"

                                    >

                                      <AlertTriangle className="w-3 h-3" /> Report

                                    </button>

                                  )}

                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">

                                  {members.map((m, idx) => {

                                    const avatarSrc = m.avatar_url || m.avatar || m.dp || m.photoURL;

                                    return (

                                      <div key={idx} className="flex items-center justify-between px-2 py-1.5 bg-slate-950/70 border border-slate-800/50 rounded-lg">

                                        <div className="flex items-center gap-1.5 min-w-0">

                                          {avatarSrc ? (

                                            <img

                                              src={avatarSrc}

                                              alt={m.ign}

                                              className="w-6 h-6 rounded-full object-cover border border-amber-500/40 shrink-0 shadow-sm"

                                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}

                                            />

                                          ) : null}

                                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 items-center justify-center text-[10px] font-black text-amber-400 shrink-0 shadow-sm ${avatarSrc ? 'hidden' : 'flex'}`}>

                                            {m.ign?.charAt(0).toUpperCase() || (idx + 1)}

                                          </div>

                                          <div className="min-w-0">

                                            <div className="flex items-center gap-1">

                                              <span className="font-bold text-slate-200 text-[11px] truncate max-w-[65px]">{m.ign}</span>

                                              {m.isLeader && <span className="text-[7.5px] font-black text-amber-400 bg-amber-500/20 px-1 py-0.2 rounded shrink-0">IGL</span>}

                                            </div>

                                          </div>

                                        </div>

                                        <div className="flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded text-[10px] font-bold text-red-400 shrink-0 ml-1">

                                          <span className="text-[9px]">💀</span>

                                          <span>{m.kills || 0} Kills</span>

                                        </div>

                                      </div>

                                    );

                                  })}

                                </div>

                              </div>

                            )}

                            {/* Match Breakdown — Clean Grid */}

                            {matchResults.length > 0 && (() => {

                              const sortedMatches = [...matchResults]

                                .filter(mr => mr)

                                .sort((a, b) => {

                                  const numA = parseInt(String(a.match_number || '').replace(/\D/g, '')) || 0;

                                  const numB = parseInt(String(b.match_number || '').replace(/\D/g, '')) || 0;

                                  return numA - numB;

                                });

                              const totalMatchKills = sortedMatches.reduce((sum, mr) => sum + (mr.kills || 0), 0);

                              const totalMatchPts = sortedMatches.reduce((sum, mr) => sum + (mr.points || 0), 0);

                              const totalBooyahs = sortedMatches.filter(mr => mr.placement === 1).length;

                              return (

                                <div className="bg-slate-900/60 border border-slate-800/70 rounded-lg p-2">

                                  {/* Section header with totals */}

                                  <div className="flex items-center justify-between mb-1.5 px-0.5">

                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">

                                      <Trophy className="w-3.5 h-3.5 text-cyan-400" /> Match Breakdown

                                      <span className="text-slate-600 font-normal normal-case">({sortedMatches.length} matches)</span>

                                    </span>

                                    <div className="flex items-center gap-2 text-[10px]">

                                      {totalBooyahs > 0 && <span className="text-amber-400 font-bold">🏆 {totalBooyahs}x</span>}

                                      <span className="text-slate-400">Total: <span className="text-red-400 font-bold">{totalMatchKills} Kills</span></span>

                                      <span className="text-slate-600">·</span>

                                      <span className="text-cyan-400 font-bold">{totalMatchPts} Pts</span>

                                    </div>

                                  </div>

                                  <div className="grid grid-cols-2 gap-1.5">

                                    {sortedMatches.map((mr, mi) => {

                                      const pKillsRaw = mr.player_kills || mr.memberKills || mr.member_kills || [];

                                      const pKillsList = Array.isArray(pKillsRaw) && pKillsRaw.length > 0 ? pKillsRaw : members.map((m, idx) => {

                                        const totK = mr.kills || 0;

                                        let pK = 0;

                                        if (idx === 0) pK = Math.ceil(totK * 0.4);

                                        else if (idx === 1) pK = Math.floor(totK * 0.3);

                                        else if (idx === 2) pK = Math.floor(totK * 0.2);

                                        else pK = Math.max(0, totK - Math.ceil(totK * 0.4) - Math.floor(totK * 0.3) - Math.floor(totK * 0.2));

                                        return { ign: m.ign, kills: pK };

                                      });

                                      return (

                                        <div key={mi} className="bg-slate-950/70 border border-slate-800/50 rounded p-1.5">

                                          {/* Match header */}

                                          <div className="flex items-center justify-between mb-1">

                                            <span className="font-bold text-slate-200 text-[11px]">Match {String(mr.match_number || (mi+1)).replace(/\D/g, '')}</span>

                                            {mr.placement === 1

                                              ? <span className="text-amber-400 font-black text-[9.5px]">🏆 Booyah</span>

                                              : <span className="text-slate-400 text-[9.5px]">Rank #{mr.placement || '—'}</span>

                                            }

                                          </div>

                                          {/* Kills & Pts Bar */}

                                          <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1 pb-1 border-b border-slate-800/40">

                                            <span>Kills: <strong className="text-red-400">{mr.kills || 0}</strong></span>

                                            <span>Pts: <strong className="text-cyan-400">{mr.points || 0}</strong></span>

                                          </div>

                                          {/* Player Kills inline */}

                                          {pKillsList && pKillsList.length > 0 && (

                                            <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5 text-[9.5px]">

                                              {pKillsList.filter(pk => pk).map((pk, pki) => (

                                                <div key={pki} className="flex items-center justify-between">

                                                  <span className="text-slate-400 truncate max-w-[55px]">{pk.ign || `P${pki+1}`}</span>

                                                  <span className="text-red-400 font-bold">{pk.kills || 0}k</span>

                                                </div>

                                              ))}

                                            </div>

                                          )}

                                        </div>

                                      );

                                    })}

                                  </div>

                                </div>

                              );

                            })()}

                          </div>

                        </td>

                      </tr>

                    )}

                  </React.Fragment>

                );

              })}

            </tbody>

          </table>

        </div>

      </Card>

    </div>

  );

}
