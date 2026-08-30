<TabsContent value="details">
                <div className="space-y-4">
                  <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-100">Tournament Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <DetailRow icon={Calendar} label="Date & Time" value={safeFormatDate(tournament.date_time)} />
                      <div className="flex items-center gap-3">
                        <Clock className="w-5 h-5 text-purple-400" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-400">Registration Closes</p>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold text-gray-100">{safeFormatDate(tournament.registration_closes)}</p>
                            <RegistrationCloseTimer closingDate={tournament.registration_closes} />
                          </div>
                        </div>
                      </div>
                      <DetailRow icon={Flag} label="Mode" value={tournament.mode} />
                      <DetailRow icon={MapPin} label="Map" value={tournament.map} />
                      
                      {/* Prize Distribution - Collapsible */}
                      {tournament.prize_distribution && (
                        <div className="pt-4 border-t border-gray-700">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setPrizeCollapsed(!prizeCollapsed)}
                              className="flex items-center gap-2 text-left"
                            >
                              <h4 className="font-semibold text-yellow-400 flex items-center gap-2">
                                🏆 Prize Distribution
                              </h4>
                              {prizeCollapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
                            </button>
                            {tournament.prize_image_url && (
                              <button
                                onClick={() => setShowPrizeImageModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 rounded-lg text-yellow-400 text-xs font-semibold"
                              >
                                <Image className="w-3.5 h-3.5" />
                                Prize Chart
                              </button>
                            )}
                          </div>
                          {!prizeCollapsed && (
                            <div className="mt-3 space-y-1.5">
                              {Array.from({ length: tournament.max_teams || 3 }, (_, i) => {
                                const pos = i + 1;
                                const key = pos === 1 ? "first" : pos === 2 ? "second" : pos === 3 ? "third" : `pos_${pos}`;
                                const prize = tournament.prize_distribution[key];
                                if (!prize || prize <= 0) return null;
                                const medals = ["🥇", "🥈", "🥉"];
                                const label = pos <= 3 ? `${medals[i]} ${pos}${pos===1?"st":pos===2?"nd":"rd"} Place` : `🏅 #${pos} Place`;
                                return (
                                  <div key={pos} className="flex justify-between text-sm">
                                    <span className="text-gray-400">{label}</span>
                                    <span className="text-yellow-400 font-semibold">₹{prize}</span>
                                  </div>
                                );
                              })}
                              <p className="text-xs text-orange-400/80 mt-3 italic border border-orange-500/20 bg-orange-500/5 rounded p-2">⚠️ {tournament.prize_note || "Prize amount may vary based on performance of the match"}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Registration Section - hidden for Semifinal/Grand Final */}
                  {!isSemifinalOrFinal && (
                  <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                    <CardHeader>
                      <CardTitle className="text-gray-100">Registration</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {isRegistered ? (
                        <div className="space-y-3">
                          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                            <p className="text-green-400 font-semibold text-center">✓ You are registered for this tournament</p>
                            {user && (
                              <p className="text-center text-xs text-cyan-400 mt-1 font-mono">
                                Your Unique ID: <span className="font-bold">{user.unique_id || 'N/A'}</span>
                              </p>
                            )}
                            {userRegistration && (
                              <div className="mt-4 pt-4 border-t border-green-500/20">
                                <RegistrationInvoiceDownload 
                                  registration={userRegistration} 
                                  tournament={tournament} 
                                  className="w-full bg-green-600 hover:bg-green-700 text-white" 
                                />
                              </div>
                            )}
                          </div>
                          <div className="p-4 bg-gray-800/50 rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-gray-300 font-semibold">Your Details</p>
                              {!editingReg && tournament.status !== "Completed" && (
                                <Button size="sm" variant="ghost" onClick={() => setEditingReg(true)} className="text-cyan-400">
                                  <Edit className="w-4 h-4 mr-1" /> Edit
                                </Button>
                              )}
                            </div>
                            {editingReg ? (
                              <div className="space-y-3">
                                <div>
                                  <Label className="text-gray-400 text-xs">In-Game Name (IGN)</Label>
                                  <Input value={editIGN} onChange={(e) => setEditIGN(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
                                </div>
                                <div>
                                  <Label className="text-gray-400 text-xs">Game UID</Label>
                                  <Input value={editUID} onChange={(e) => setEditUID(e.target.value)} className="bg-gray-800 border-gray-700 text-white" />
                                </div>
                                <div className="flex gap-2">
                                  <Button onClick={saveRegistrationEdit} disabled={savingEdit || !editIGN || !editUID} className="flex-1 bg-green-600 hover:bg-green-700" size="sm">
                                    <Save className="w-4 h-4 mr-1" />{savingEdit ? "Saving..." : "Save"}
                                  </Button>
                                  <Button onClick={() => setEditingReg(false)} variant="outline" size="sm" className="border-gray-600">Cancel</Button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-white">IGN: <span className="text-cyan-400">{userRegistration?.team_members?.[0]?.ign || userRegistration?.team_leader_ign}</span></p>
                                <p className="text-white">UID: <span className="text-cyan-400 font-mono">{userRegistration?.team_members?.[0]?.uid || '-'}</span></p>
                              </div>
                            )}
                          </div>
                          <div className="p-4 bg-yellow-500/10 border-2 border-yellow-500/50 rounded-lg">
                            <p className="text-yellow-400 text-sm text-center font-medium">📢 Room ID & Password will appear in a pop-up 10 minutes before match starts. Please stay ready!</p>
                          </div>
                        </div>
                      ) : tournament.status === "Registration Open" ? (
                        <>
                          <p className="text-sm text-gray-400">Spots remaining: {tournament.max_teams - (registrations.length || 0)}</p>
                          <Button
                            className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600 text-white font-semibold"
                            onClick={() => setShowRegistrationModal(true)}
                            disabled={!user || registrations.length >= tournament.max_teams}
                          >
                            {registrations.length >= tournament.max_teams ? "Slots Full" : "Register Now"}
                          </Button>

                        </>
                      ) : (
                        <div className="p-4 bg-gray-800 rounded-lg">
                          <p className="text-gray-400 text-center">Registration is closed</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  )}

                  {/* Teams Section */}
                  {tournament.tournament_type === "Semifinal" && (
                    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-purple-500/30">
                      <CardHeader>
                        <CardTitle className="text-purple-400 flex items-center gap-2">
                          <Users className="w-5 h-5" /> Qualified Teams ({registrations.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {registrations.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-6">No teams qualified yet. Admin will move teams here from Qualifier.</p>
                          ) : (
                            registrations.map((reg, index) => (
                              <TeamCard key={reg.id} reg={reg} index={index} isSolo={tournament.mode === "Solo"} showPoints />
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {tournament.tournament_type === "Grand Final" && (
                    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/30">
                      <CardHeader>
                        <CardTitle className="text-yellow-400 flex items-center gap-2">
                          <Trophy className="w-5 h-5" /> Grand Final — Qualified Teams ({registrations.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {registrations.length === 0 ? (
                            <div className="text-center py-8">
                              <Trophy className="w-12 h-12 text-yellow-600 mx-auto mb-3 opacity-50" />
                              <p className="text-gray-500 text-sm">No teams qualified yet.</p>
                              <p className="text-gray-600 text-xs mt-1">Admin will move teams here from Semifinals.</p>
                            </div>
                          ) : (
                            registrations.map((reg, index) => (
                              <TeamCard key={reg.id} reg={reg} index={index} isSolo={tournament.mode === "Solo"} showPoints grandFinal />
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {!isSemifinalOrFinal && (
                    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-gray-100">
                          Registered Teams ({registrations.length}/{tournament.max_teams})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {registrations.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">No teams registered yet</p>
                          ) : (
                            registrations.map((reg, index) => (
                              <TeamCard key={reg.id} reg={reg} index={index} isSolo={tournament.mode === "Solo"} />
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {/* Slots section for Qualifier */}
                  {!isSemifinalOrFinal && registrations.length > 0 && (
                    <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
                      <CardHeader>
                        <CardTitle className="text-gray-100 text-sm">Time Slots</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {Array.from({ length: tournament.max_slots || 12 }, (_, i) => {
                            const slotNum = i + 1;
                            const slotReg = registrations.find(r => r.time_slot === slotNum);
                            return (
                              <div key={slotNum} className={`p-2 rounded-lg text-center text-xs border ${
                                slotReg 
                                  ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                                  : 'bg-gray-800 border-gray-700 text-gray-500'
                              }`}>
                                <p className="font-bold">Slot {slotNum}</p>
                                <p className="truncate">{slotReg ? (slotReg.team_name || slotReg.team_leader_ign) : 'Empty'}</p>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              