import re

with open('src/pages/TournamentDetail.jsx', 'r', encoding='utf-8') as f:
    old_td = f.read()

with open('old_details_tab.jsx', 'r', encoding='utf-8') as f:
    old_details_tab = f.read()

with open('new_tabs.jsx', 'r', encoding='utf-8') as f:
    new_tabs = f.read()

with open('new_team_card.jsx', 'r', encoding='utf-8') as f:
    new_team_card = f.read()

with open('new_leaderboard_tab.jsx', 'r', encoding='utf-8') as f:
    new_leaderboard_tab = f.read()

with open('old_report_modal.jsx', 'r', encoding='utf-8') as f:
    old_report_modal = f.read()

with open('closing_tags.jsx', 'r', encoding='utf-8') as f:
    closing_tags = f.read()

# 1. top_part
tabs_start = old_td.find('<Tabs ')
if tabs_start == -1: tabs_start = old_td.find('<Tabs>')
top_part = old_td[:tabs_start]

if 'activeStageFilter' not in top_part:
    top_part = top_part.replace('const [movingTeam, setMovingTeam] = useState(null);', 
        'const [movingTeam, setMovingTeam] = useState(null);\n  const [teamSearchQuery, setTeamSearchQuery] = useState("");\n  const [teamGroupFilter, setTeamGroupFilter] = useState("all");\n  const [activeStageFilter, setActiveStageFilter] = useState("qualifiers");\n  const [showCredentialsModal, setShowCredentialsModal] = useState(false);')

# 2. new_tabs_list
new_tabs_list = '''          <Tabs defaultValue="details" className="w-full">
            <TabsList className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-1 grid grid-cols-4 h-12 w-full mb-4 shadow-xl backdrop-blur-md">
              {[
                { id: "details", label: "Overview", icon: ScrollText },
                { id: "teams", label: `Teams (${registrations.length})`, icon: Users },
                { id: "standings", label: "Standings", icon: Trophy },
                { id: "rules", label: "Rules", icon: ScrollText },
              ].map((t) => {
                const IconComponent = t.icon;
                return (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="data-[state=active]:bg-orange-500 data-[state=active]:text-slate-950 text-slate-400 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <IconComponent className="w-4 h-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

'''

# 3. credentials_modal
credentials_modal = '''
      {/* Match Credentials Modal */}
      <AnimatePresence>
        {showCredentialsModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" onClick={() => setShowCredentialsModal(false)}>
            <div className="bg-slate-900 border border-cyan-900/50 rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-black text-cyan-400 text-sm tracking-wider uppercase mb-4 flex items-center gap-2">
                <Key className="w-4 h-4 animate-pulse" /> MATCH CREDENTIALS
              </h3>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-300">Credentials will be updated by admins closer to match time.</p>
                <div className="pt-4 flex justify-end">
                  <Button onClick={() => setShowCredentialsModal(false)} variant="outline">Close</Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
'''

assembled_component = top_part + new_tabs_list + old_details_tab + new_tabs

# Since new_tabs ends with </TabsContent>, we need to close the <Tabs> and the divs containing it
# In the OLD UI, after tabs, there were `</Tabs>\n        </div>\n      </div>\n    </div>\n`
assembled_component += '\n          </Tabs>\n        </div>\n      </div>\n    </div>\n'

# Add Report modal and credentials modal
assembled_component += old_report_modal + credentials_modal + closing_tags

other_functions = '''
function InfoCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 transition-all hover:bg-slate-800/50">
      <Icon className={`w-4 h-4 ${color}`} />
      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</span>
      <span className="text-sm text-white font-bold">{value}</span>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2.5 group">
      <div className="flex items-center gap-2 text-slate-400 group-hover:text-slate-300 transition-colors">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <span className="text-xs font-bold text-white text-right max-w-[60%] truncate">{value}</span>
    </div>
  );
}

function MoveCell({ reg, isQualifierType, isSemifinalType, sfATournament, sfBTournament, gfTournament, movingTeam, moveTeam }) {
  if (isQualifierType) {
    if (!sfATournament && !sfBTournament) return <td className="p-2 text-xs text-center text-slate-500">-</td>;
    return (
      <td className="p-2">
        <div className="flex items-center justify-center gap-1">
          <Button onClick={() => moveTeam(reg, "semifinal", "A")} disabled={movingTeam} className="h-6 text-[10px] bg-purple-600 hover:bg-purple-700 px-2 rounded-md">To SF A</Button>
          <Button onClick={() => moveTeam(reg, "semifinal", "B")} disabled={movingTeam} className="h-6 text-[10px] bg-indigo-600 hover:bg-indigo-700 px-2 rounded-md">To SF B</Button>
        </div>
      </td>
    );
  }
  if (isSemifinalType) {
    if (!gfTournament) return <td className="p-2 text-xs text-center text-slate-500">-</td>;
    return (
      <td className="p-2">
        <Button onClick={() => moveTeam(reg, "grand_final", null)} disabled={movingTeam} className="h-6 text-[10px] w-full bg-amber-600 hover:bg-amber-700 px-2 rounded-md">To Final</Button>
      </td>
    );
  }
  return null;
}

'''

final_file = assembled_component + other_functions + new_team_card + new_leaderboard_tab

with open('assembled_TD.jsx', 'w', encoding='utf-8') as f:
    f.write(final_file)
print("Done assembling!")
