{/* ── TEAMS TAB (SINGLE TOURNAMENT 3-STAGE PROGRESSION SYSTEM) ── */}

          <TabsContent value="teams" className="space-y-3 mt-0">

            {/* Stage Switcher - Premium Step Flow Navigation */}

            {(() => {

              const defaultStages = [

                { id: "qualifiers", name: "Qualifier" },

                { id: "semifinals", name: "Semifinal" },

                { id: "grand_final", name: "Grand Final" }

              ];

              const rawStages = (tournament?.stages && Array.isArray(tournament.stages) && tournament.stages.length > 0)

                ? tournament.stages

                : defaultStages;

              const stagesList = rawStages.map((st, i) => {

                if (typeof st === 'string') {

                  const slug = st.toLowerCase().replace(/[^a-z0-9]+/g, '_');

                  return { id: slug, name: st, idx: i };

                }

                return { id: st.id || `stage_${i}`, name: st.name || st.id || `Stage ${i+1}`, idx: i };

              });

              const activeIdx = stagesList.findIndex(s => s.id === activeStageFilter || s.name === activeStageFilter);

              const currentActiveIdx = activeIdx >= 0 ? activeIdx : 0;

              const currentStageObj = stagesList[currentActiveIdx] || stagesList[0];

              return (

                <div className="bg-slate-900/80 border border-slate-800/60 rounded-2xl p-2.5 mb-3">

                  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">

                    {stagesList.map((st, i) => {

                      const isActive = i === currentActiveIdx;

                      const isPast = i < currentActiveIdx;

                      return (

                        <React.Fragment key={st.id}>

                          {i > 0 && (

                            <div className={`h-[2px] w-4 shrink-0 rounded-full transition-all duration-300 ${

                              isPast ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :

                              isActive ? 'bg-gradient-to-r from-orange-500 to-amber-400' :

                              'bg-slate-700/60'

                            }`} />

                          )}

                          <button

                            onClick={() => setActiveStageFilter(st.id)}

                            className={`group flex items-center gap-1.5 py-1.5 px-3 text-[11px] font-black transition-all duration-300 shrink-0 whitespace-nowrap rounded-xl border cursor-pointer active:scale-95 ${

                              isActive 

                                ? "text-orange-300 bg-gradient-to-br from-orange-500/20 to-amber-500/10 border-orange-500/50 shadow-[0_0_12px_rgba(249,115,22,0.15)]" 

                                : isPast

                                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"

                                  : "text-slate-400 hover:text-slate-200 bg-slate-800/60 border-slate-700/60 hover:border-slate-600/80"

                            }`}

                          >

                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black transition-all ${

                              isActive

                                ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-slate-950 shadow-[0_0_8px_rgba(249,115,22,0.5)]'

                                : isPast

                                  ? 'bg-emerald-500 text-slate-950'

                                  : 'bg-slate-700 text-slate-400 group-hover:bg-slate-600'

                            }`}>

                              {isPast ? '✓' : i + 1}

                            </span>

                            <span className="uppercase tracking-wider">{st.name}</span>

                          </button>

                        </React.Fragment>

                      );

                    })}

                  </div>

                </div>

              );

            })()}

            {/* Search & Group Filter Header */}

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 space-y-2.5">

              <div className="flex items-center justify-between">

                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">

                  {(() => {

                    const defaultStages = [

                      { id: "qualifiers", name: "Qualifiers" },

                      { id: "semifinals", name: "Semifinals" },

                      { id: "grand_final", name: "Grand Final" }

                    ];

                    const rawStages = (tournament?.stages && Array.isArray(tournament.stages) && tournament.stages.length > 0)

                      ? tournament.stages

                      : defaultStages;

                    const stagesList = rawStages.map((st, i) => {

                      if (typeof st === 'string') {

                        const slug = st.toLowerCase().replace(/[^a-z0-9]+/g, '_');

                        return { id: slug, name: st, idx: i };

                      }

                      return { id: st.id || `stage_${i}`, name: st.name || st.id || `Stage ${i+1}`, idx: i };

                    });

                    const activeIdx = stagesList.findIndex(s => s.id === activeStageFilter || s.name === activeStageFilter);

                    const activeObj = stagesList[activeIdx >= 0 ? activeIdx : 0] || stagesList[0];

                    return `${activeObj.name} (${registrations.length} Total Teams)`;

                  })()}

                </p>

                <div className="flex items-center gap-2">

                  <Button 

                    onClick={generate500DummyTeams} 

                    size="sm" 

                    className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[10px] h-6 px-2.5 rounded-md shadow flex items-center gap-1 active:scale-95 transition-all"

                  >

                    ⚡ Fill 500 Teams

                  </Button>

                  <span className="text-[10px] font-bold text-orange-400">

                    {Math.ceil(registrations.length / 12) || 1} Groups

                  </span>

                </div>

              </div>

              {/* Always Visible Search Team Input & Group Select Dropdown */}

              <div className="grid grid-cols-2 gap-2">

                <Input

                  placeholder="Search team..."

                  value={teamSearchQuery}

                  onChange={(e) => setTeamSearchQuery(e.target.value)}

                  className="bg-slate-950 border-slate-800 text-white h-8.5 text-xs"

                />

                <select

                  value={teamGroupFilter}

                  onChange={(e) => setTeamGroupFilter(e.target.value)}

                  className="bg-slate-950 border border-slate-800 text-slate-200 h-8.5 rounded-md px-2.5 text-xs focus:outline-none"

                >

                  <option value="all">All Groups</option>

                  {Array.from({ length: Math.ceil(registrations.length / 12) || 1 }, (_, i) => (

                    <option key={i + 1} value={String(i + 1)}>

                      Group {i + 1}

                    </option>

                  ))}

                </select>

              </div>

              {/* Group Match Schedule Banner */}

              {teamGroupFilter !== "all" && (

                <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5 flex items-center justify-between text-xs mt-1">

                  <span className="font-semibold text-slate-300">Group {teamGroupFilter} Match Schedule:</span>

                  <span className="font-bold text-amber-400">

                    {(() => {

                      const rawTime = getGroupMatchTime(teamGroupFilter);

                      if (!rawTime) return "To Be Announced (TBA)";

                      try {

                        const d = new Date(rawTime);

                        if (isNaN(d.getTime())) return String(rawTime);

                        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) + ", " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

                      } catch (e) {

                        return "To Be Announced (TBA)";

                      }

                    })()}

                  </span>

                </div>

              )}

            </div>

            {/* Teams List Filtered By Stage */}

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">

              <div className="space-y-2 max-h-[560px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">

                {(() => {

                  const defaultStages = [

                    { id: "qualifiers", name: "Qualifier" },

                    { id: "semifinals", name: "Semifinal" },

                    { id: "grand_final", name: "Grand Final" }

                  ];

                  const rawStages = (tournament?.stages && Array.isArray(tournament.stages) && tournament.stages.length > 0)

                    ? tournament.stages

                    : defaultStages;

                  const stagesList = rawStages.map((st, i) => {

                    if (typeof st === 'string') {

                      const slug = st.toLowerCase().replace(/[^a-z0-9]+/g, '_');

                      return { id: slug, name: st, idx: i };

                    }

                    return { id: st.id || `stage_${i}`, name: st.name || st.id || `Stage ${i+1}`, idx: i };

                  });

                  const activeIdx = stagesList.findIndex(s => s.id === activeStageFilter || s.name === activeStageFilter);

                  const currentActiveIdx = activeIdx >= 0 ? activeIdx : 0;

                  const currentStageObj = stagesList[currentActiveIdx] || stagesList[0];

                  let pool = registrations;

                  

                  if (currentActiveIdx > 0) {

                    const stNameLower = (currentStageObj.name || "").toLowerCase();

                    const stIdLower = (currentStageObj.id || "").toLowerCase();

                    pool = registrations.filter(r => {

                      const rStage = String(r.stage || r.stage_id || "").toLowerCase();

                      const rStatus = String(r.status || "").toLowerCase();

                      if (rStage === stIdLower || rStage === stNameLower) return true;

                      if (stNameLower && rStage.includes(stNameLower)) return true;

                      if (stNameLower.includes("semi") && (rStage.includes("semi") || r.is_qualified || rStatus === "qualified")) return true;

                      if (stNameLower.includes("final") && (rStage.includes("final") || r.is_finalist)) return true;

                      if (r.stage_index === currentActiveIdx) return true;

                      return false;

                    });

                  }

                  const filtered = pool.filter((reg, idx) => {

                    const grp = Math.floor(idx / 12) + 1;

                    const matchesGrp = teamGroupFilter === "all" || teamGroupFilter === String(grp);

                    const q = (teamSearchQuery || "").toLowerCase().trim();

                    const rawMembers = Array.isArray(reg.team_members) ? reg.team_members : [];

                    const memberMatches = rawMembers.some(m => {

                      if (!m) return false;

                      const mIgn = typeof m === 'string' ? m : (m.ign || m.name || m.player_ign || '');

                      const mUid = typeof m === 'object' ? (m.uid || m.game_id || '') : '';

                      return String(mIgn).toLowerCase().includes(q) || String(mUid).toLowerCase().includes(q);

                    });

                    const slotStr = String(idx + 1);

                    const matchesQ = !q ||

                      (String(reg.team_name || "").toLowerCase().includes(q)) ||

                      (String(reg.team_leader_ign || "").toLowerCase().includes(q)) ||

                      (String(reg.team_leader_uid || "").toLowerCase().includes(q)) ||

                      memberMatches ||

                      slotStr === q ||

                      `#${slotStr}` === q;

                    return matchesGrp && matchesQ;

                  });

                  if (filtered.length === 0) {

                    return (

                      <div className="py-12 text-center space-y-2">

                        <p className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">

                          No teams in {currentStageObj.name || "this stage"} yet

                        </p>

                        <p className="text-[11px] text-slate-400 max-w-xs mx-auto">

                          Teams will appear here once promoted or qualified from previous rounds.

                        </p>

                      </div>

                    );

                  }

                  return filtered.map((reg) => {

                    const originalIndex = registrations.findIndex(r => r.id === reg.id);

                    return (

                      <TeamCard

                        key={reg.id}

                        reg={reg}

                        index={originalIndex >= 0 ? originalIndex : 0}

                        isSolo={tournament.mode === "Solo"}

                        grandFinal={currentStageObj.name?.toLowerCase().includes("final")}

                        showGroupBadge={teamGroupFilter === "all"}

                      />

                    );

                  });

                })()}

              </div>

            </div>

          </TabsContent>

          {/* ── STANDINGS TAB ── */}

          <TabsContent value="standings" className="space-y-3 mt-0">

            <LeaderboardTab

              registrations={registrations}

              leaderboardEntries={leaderboardEntries}

              tournament={tournament}

              user={user}

              isRegistered={isRegistered}

              matchCredentials={matchCredentials}

              setShowCredentialsModal={setShowCredentialsModal}

              canMove={canMove}

              isQualifierType={isQualifierType}

              isSemifinalType={isSemifinalType}

              isGrandFinalType={tournament?.tournament_type === "Grand Final" || tournament?.stage === "grand_final"}

              sfATournament={sfATournament}

              sfBTournament={sfBTournament}

              gfTournament={gfTournament}

              movingTeam={movingTeam}

              moveTeam={moveTeam}

              setShowReportModal={setShowReportModal}

              matches={matches}

            />

          </TabsContent>

          {/* ── RULES TAB ── */}

          <TabsContent value="rules" className="space-y-3 mt-0">

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3.5">

              <div className="flex items-center gap-2 mb-3">

                <ScrollText className="w-4 h-4 text-orange-400" />

                <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">Tournament Rules</p>

              </div>

              <div className="text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">

                {tournament.rules || "No rules specified for this tournament."}

              </div>

            </div>

          </TabsContent>

        