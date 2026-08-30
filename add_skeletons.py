with open('src/pages/TournamentDetail.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables
state_vars = '''
  const [visibleCount, setVisibleCount] = useState(20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [visibleLimit, setVisibleLimit] = useState(20);
'''
if 'const [visibleCount' not in content:
    content = content.replace('  const [activeStageFilter, setActiveStageFilter] = useState("qualifiers");',
        '  const [activeStageFilter, setActiveStageFilter] = useState("qualifiers");' + state_vars)

# 2. Add Skeleton components before TeamCard
skeletons = '''
function TeamCardSkeleton() {
  return (
    <div className="bg-slate-900/40 rounded-xl p-3 border border-slate-800/40 animate-pulse flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-slate-800/60 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-800/60 rounded w-1/3" />
        <div className="h-3 bg-slate-800/40 rounded w-1/4" />
      </div>
      <div className="h-6 bg-slate-800/40 rounded w-16" />
    </div>
  );
}

function LeaderboardRowSkeleton() {
  return (
    <tr className="border-b border-slate-800/40 animate-pulse bg-slate-900/20">
      <td className="py-3 px-3"><div className="h-4 bg-slate-800/60 rounded w-6 mx-auto" /></td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800/60 shrink-0" />
          <div className="space-y-1.5 w-32">
            <div className="h-3.5 bg-slate-800/60 rounded w-3/4" />
            <div className="h-2.5 bg-slate-800/40 rounded w-1/2" />
          </div>
        </div>
      </td>
      <td className="py-3 px-3"><div className="h-4 bg-slate-800/50 rounded w-12 mx-auto" /></td>
      <td className="py-3 px-3"><div className="h-4 bg-slate-800/50 rounded w-12 mx-auto" /></td>
      <td className="py-3 px-3"><div className="h-4 bg-amber-900/30 rounded w-14 mx-auto" /></td>
    </tr>
  );
}
'''

if 'function TeamCardSkeleton()' not in content:
    content = content.replace('function TeamCard(', skeletons + '\nfunction TeamCard(')

# 3. Add progressive rendering logic in Teams tab
# In Teams tab, we have `filteredRegistrations.map((reg, idx) => (`
# We need to slice it and add the Load More button.
teams_map_old = '                      {filteredRegistrations.map((reg, idx) => (\n                        <TeamCard'
teams_map_new = '''
                      {filteredRegistrations.slice(0, visibleCount).map((reg, idx) => (
                        <TeamCard
'''
content = content.replace(teams_map_old, teams_map_new)

# Add load more button for Teams
teams_end_old = '''                      )}
                    </div>
                  )}
                </div>
              </div>
'''
teams_end_new = '''                      )}
                    </div>
                    
                    {isLoadingMore && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                        <TeamCardSkeleton />
                        <TeamCardSkeleton />
                        <TeamCardSkeleton />
                      </div>
                    )}
                    
                    {visibleCount < filteredRegistrations.length && (
                      <div className="pt-4 flex justify-center">
                        <Button 
                          onClick={() => {
                            setIsLoadingMore(true);
                            setTimeout(() => {
                              setVisibleCount(prev => prev + 20);
                              setIsLoadingMore(false);
                            }, 300);
                          }}
                          disabled={isLoadingMore}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-6 py-2 rounded-full border border-slate-700/50 transition-all"
                        >
                          {isLoadingMore ? "Loading..." : `Load More Teams (${filteredRegistrations.length - visibleCount} remaining)`}
                        </Button>
                      </div>
                    )}
                    
                  )}
                </div>
              </div>
'''
content = content.replace(teams_end_old, teams_end_new)

# 4. Add progressive rendering in Standings tab
# We have `displayedRows = ...` and `gfRows = ...`
# Let's slice them.
content = content.replace('displayedGfRows.map((entry, i)', 'displayedGfRows.slice(0, visibleLimit).map((entry, i)')
content = content.replace('displayedRows.map((entry, i)', 'displayedRows.slice(0, visibleLimit).map((entry, i)')

# And load more for GF rows
standings_gf_end_old = '''              </tbody>
            </table>
          </div>
        </div>
      )}
'''
standings_gf_end_new = '''              </tbody>
            </table>
            
            {isLoadingMore && (
              <table className="w-full text-left">
                <tbody>
                  <LeaderboardRowSkeleton />
                  <LeaderboardRowSkeleton />
                </tbody>
              </table>
            )}
            
            {visibleLimit < gfRows.length && (
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-center">
                <Button 
                  onClick={() => {
                    setIsLoadingMore(true);
                    setTimeout(() => {
                      setVisibleLimit(prev => prev + 20);
                      setIsLoadingMore(false);
                    }, 300);
                  }}
                  disabled={isLoadingMore}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-full"
                >
                  {isLoadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
            
          </div>
        </div>
      )}
'''
content = content.replace(standings_gf_end_old, standings_gf_end_new)

# Same for regular rows
standings_end_old = '''              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
'''
standings_end_new = '''              </tbody>
            </table>
            
            {isLoadingMore && (
              <table className="w-full text-left">
                <tbody>
                  <LeaderboardRowSkeleton />
                  <LeaderboardRowSkeleton />
                </tbody>
              </table>
            )}
            
            {visibleLimit < rows.length && (
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex justify-center">
                <Button 
                  onClick={() => {
                    setIsLoadingMore(true);
                    setTimeout(() => {
                      setVisibleLimit(prev => prev + 20);
                      setIsLoadingMore(false);
                    }, 300);
                  }}
                  disabled={isLoadingMore}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-full"
                >
                  {isLoadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
            
          </div>
        </CardContent>
      </Card>
'''
content = content.replace(standings_end_old, standings_end_new)

with open('src/pages/TournamentDetail.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
