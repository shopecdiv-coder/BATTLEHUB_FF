{/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowReportModal(null)}>
          <Card className="bg-gray-900 border-gray-700 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="w-5 h-5" />
                Report Player
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-white font-semibold">{showReportModal.player_ign || showReportModal.team_leader_ign}</p>
                <p className="text-xs text-gray-400">UID: {showReportModal.player_uid || showReportModal.team_members?.[0]?.uid || '-'}</p>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Reason *</Label>
                <select
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
                >
                  <option value="">Select reason...</option>
                  <option value="Hacking/Cheating">🎮 Hacking / Cheating</option>
                  <option value="Match Fixing">🤝 Match Fixing</option>
                  <option value="Abusive Behavior">💬 Abusive Behavior</option>
                  <option value="Multi-Accounting">👥 Multi-Accounting</option>
                  <option value="Other">❓ Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Description (Optional)</Label>
                <Textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe what happened..."
                  className="bg-gray-800 border-gray-700 text-white"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setShowReportModal(null)}
                  variant="outline"
                  className="flex-1 border-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => submitReport(showReportModal)}
                  disabled={!reportReason || submittingReport}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {submittingReport ? "Submitting..." : "Submit Report"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    