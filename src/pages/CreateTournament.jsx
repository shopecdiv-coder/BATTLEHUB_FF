import React, { useState, useEffect } from "react";
import { Tournament } from "@/entities/Tournament";
import { User } from "@/entities/User";
import { PhotoLibrary } from "@/entities/PhotoLibrary";
import { UploadFile } from "@/integrations/Core";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trophy, X, Image as ImageIcon, Grid, Save } from "lucide-react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TournamentTemplateManager from "../components/admin/TournamentTemplateManager";

export default function CreateTournament() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    tournament_type: "Qualifier",
    mode: "Squad",
    game_type: "Battle Royale",
    map: "Bermuda",
    entry_fee: 0,
    prize_pool: 0,
    date_time: "",
    registration_closes: "",
    max_teams: 32,
    banner_url: "",
    rules: `⚔️ BattleHub Free Fire Tournament Rules & Eligibility

Ensuring Fair Play, Integrity, and True Skill in every match.
Participation in any BattleHub event signifies full acceptance of these rules.

1. Entry Eligibility

Players must use a Free Fire account that meets the following criteria:

🎯 Minimum Account Level: 50 or higher
📅 Account Age: At least 30 days old
🔒 Linked Device: Must be connected to one verified device
🪪 KYC Required: For tournaments with a prize pool above ₹5,000
(Valid ID + phone verification mandatory)

⚠️ Any account not meeting these requirements will be ineligible for participation.

2. Headshot & CS-Rank Integrity Rules

Auto-Flag Conditions:

Players with an average headshot rate > 80% (last 50 matches)
Sudden spike detection: +30% increase in headshot rate in the last 5 matches

Verification Requirement:

Players may be asked to submit Competitive / CS Rank telemetry data
Failure to provide data → temporary ineligibility

3. Pre-Match Compliance (for flagged or high-value matches)

Only official Free Fire client versions are allowed.
❌ Use of modified clients, unauthorized emulators, or third-party tools is strictly prohibited.
Gameplay must be conducted only on supported devices/platforms.
🚫 PC players and unauthorized emulators are not allowed.

4. Detection & Blocking Protocol

Auto-Blocking:
Players exceeding system detection thresholds are automatically suspended.

Telemetry Review:
Flagged accounts undergo a detailed review of kill patterns, aim accuracy, and movement data.

Evidence Submission:
Flagged players must provide screen recordings and device logs within 24 hours.
Failure to comply → temporary suspension until review is complete

5. Penalties & Enforcement

First Offense: 7-day suspension + prize forfeiture + account probation
Second Offense: 30-day suspension + 1-year blacklist + prize forfeiture
Third Offense: Permanent ban + internal blacklist + potential legal action

6. Appeals & Transparency

Players may file an appeal within 7 days of any disciplinary action.

Review Timelines:
Initial Review → within 48 hours
Final Decision → within 7 days

Players will receive:
Reason for the action
Summary of supporting evidence (system logs remain confidential)

7. Match Conduct & Integrity

🚷 Multi-accounting = permanent ban for all linked accounts
🤝 Collusion, teaming, or match-fixing = instant disqualification
💣 Cheating, macros, or any unfair manipulation = Immediate prize forfeiture + expulsion

8. Organizer Rights

Organizers may:
Request livestreams, recordings, or device proofs anytime
Freeze prize pools during active investigations
Modify or update rules to maintain fair play

⚖️ All administrative decisions are final.
Appeals are reviewed by a rotating fairness panel for transparency.

9. Automated System Notifications

Auto-Flag Notice:
"Your account has been flagged for unusual gameplay activity. Submit device logs and screen recordings within 24 hours for review."

Suspension Notice:
"Your account has been suspended for confirmed rule violations. You may file an appeal within 7 days."

10. Technical & Implementation Notes

Headshot % is based on the last 50 verified matches (weighted for tournament games).

Players must display Anti-Cheat Badges:
✅ Headshot ≤ 80%
✅ Account Level ≥ 50

Pre-Join Check:
Flagged players cannot join until verification is complete.

All evidence is securely hashed and stored for authorized investigators only.

🛠️ Admins reserve the right to update or extend these rules based on game patches or case severity.

⚠️ Disclaimer

BattleHub reserves full rights to modify, suspend, or terminate participation if evidence of cheating, unfair play, or system manipulation is found.

Stay fair. Play hard. Be legendary. 🏆`,
    prize_distribution: {
      first: 0,
      second: 0,
      third: 0
    }
  });

  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);
  const [libraryPhotos, setLibraryPhotos] = useState([]);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showPrizeDistribution, setShowPrizeDistribution] = useState(false);

  useEffect(() => {
    loadUser();
    loadPhotoLibrary();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await User.me();
      if (currentUser.role !== 'admin') {
        navigate(createPageUrl("Home"));
        return;
      }
      setUser(currentUser);
    } catch (error) {
      navigate(createPageUrl("Home"));
    }
  };

  const loadPhotoLibrary = async () => {
    try {
      const photos = await PhotoLibrary.list("-created_date", 50);
      setLibraryPhotos(photos || []);
    } catch (error) {
      console.error("Error loading photo library:", error);
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingBanner(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData({ ...formData, banner_url: file_url });
    } catch (error) {
      console.error("Error uploading banner:", error);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (saveAsTemplate) {
        // Save as template
        await Tournament.create({
          ...formData,
          organizer_id: user.id,
          organizer_name: user.ign || user.full_name,
          is_template: true,
          template_name: templateName || formData.title,
          status: "Upcoming"
        });
        alert("✅ Tournament template saved!");
      } else {
        // Create normal tournament
        await Tournament.create({
          ...formData,
          organizer_id: user.id,
          organizer_name: user.ign || user.full_name,
          current_teams: 0,
          status: "Registration Open"
        });
      }

      navigate(createPageUrl("Tournaments"));
    } catch (error) {
      console.error("Error creating tournament:", error);
    }
    setSubmitting(false);
  };

  const loadTemplate = (templateData) => {
    setFormData({
      ...formData,
      ...templateData,
      date_time: "",
      registration_closes: ""
    });
  };

  const updatePrizeDistribution = (place, value) => {
    setFormData({
      ...formData,
      prize_distribution: {
        ...formData.prize_distribution,
        [place]: parseFloat(value) || 0
      }
    });
  };

  // Generate prize place keys based on max_teams
  const prizeKeys = Array.from({ length: Math.min(formData.max_teams || 3, 48) }, (_, i) => i + 1);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Tournaments"))}
            className="text-gray-400 hover:text-gray-100 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </Button>

          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-400">
                Create Tournament
              </h1>
              <p className="text-gray-400">Set up a new Free Fire tournament</p>
            </div>
          </div>
        </motion.div>

        <TournamentTemplateManager onLoadTemplate={loadTemplate} />

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-100">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-300">Tournament Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="bg-gray-800 border-gray-700 text-gray-100"
                  placeholder="e.g., Weekend Warriors Cup"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-300">Tournament Poster/Banner *</Label>
                <div className="space-y-3">
                  {formData.banner_url ? (
                    <div className="relative group">
                      <img 
                        src={formData.banner_url} 
                        alt="Tournament Banner" 
                        className="w-full h-48 object-cover rounded-lg border-2 border-orange-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, banner_url: "" })}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="cursor-pointer">
                        <div className="border-2 border-dashed border-gray-700 hover:border-orange-500/50 rounded-lg p-8 text-center transition-colors">
                          {uploadingBanner ? (
                            <div className="flex flex-col items-center gap-3">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
                              <p className="text-sm text-gray-400">Uploading banner...</p>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                              <p className="text-sm text-gray-400 mb-1">Click to upload tournament poster</p>
                              <p className="text-xs text-gray-500">Recommended: 1200x600px, PNG or JPG</p>
                            </>
                          )}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBannerUpload}
                          className="hidden"
                          disabled={uploadingBanner}
                        />
                      </label>
                      <Button
                        type="button"
                        onClick={() => setShowPhotoLibrary(true)}
                        variant="outline"
                        className="w-full border-purple-500/50 text-purple-400"
                      >
                        <Grid className="w-4 h-4 mr-2" />
                        Choose from Photo Library
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Game Type Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                {[
                  { value: "Battle Royale", emoji: "🏆", desc: "Classic BR" },
                  { value: "Lone Wolf", emoji: "🐺", desc: "Solo Survival" },
                  { value: "Clash Squad 4v4", emoji: "⚔️", desc: "4v4 CS" },
                  { value: "Clash Squad 6v6", emoji: "🔥", desc: "6v6 CS" },
                ].map(gt => (
                  <button
                    key={gt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, game_type: gt.value })}
                    className={`flex flex-col items-center justify-center gap-1 p-3 rounded-xl border-2 transition-all ${
                      formData.game_type === gt.value
                        ? "border-orange-500 bg-orange-500/10 text-orange-400"
                        : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600"
                    }`}
                  >
                    <span className="text-2xl">{gt.emoji}</span>
                    <span className="text-xs font-bold text-center leading-tight">{gt.value}</span>
                    <span className="text-[10px] opacity-60">{gt.desc}</span>
                  </button>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tournament_type" className="text-gray-300">Tournament Type *</Label>
                  <Select value={formData.tournament_type} onValueChange={(value) => setFormData({ ...formData, tournament_type: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Qualifier">🏆 Qualifier</SelectItem>
                      <SelectItem value="Semifinal">⚔️ Semifinal</SelectItem>
                      <SelectItem value="Grand Final">👑 Grand Final</SelectItem>
                      <SelectItem value="Scrims">🎯 Scrims</SelectItem>
                      <SelectItem value="Practice Match">🏋️ Practice Match</SelectItem>
                      <SelectItem value="League Match">📊 League Match</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode" className="text-gray-300">Team Size Mode *</Label>
                  <Select value={formData.mode} onValueChange={(value) => setFormData({ ...formData, mode: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Solo">Solo (1 player)</SelectItem>
                      <SelectItem value="Duo">Duo (2 players)</SelectItem>
                      <SelectItem value="Squad">Squad (4 players)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="map" className="text-gray-300">Map *</Label>
                  <Select value={formData.map} onValueChange={(value) => setFormData({ ...formData, map: value })}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bermuda">🗺️ Bermuda</SelectItem>
                      <SelectItem value="Bermuda Remastered">🗺️ Bermuda Remastered</SelectItem>
                      <SelectItem value="Purgatory">🗺️ Purgatory</SelectItem>
                      <SelectItem value="Kalahari">🗺️ Kalahari</SelectItem>
                      <SelectItem value="Alpine">🗺️ Alpine</SelectItem>
                      <SelectItem value="Nexterra">🗺️ Nexterra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.tournament_type === "Semifinal" && (
                  <div className="space-y-2">
                    <Label className="text-gray-300">Semifinal Group Label</Label>
                    <Input
                      value={formData.semifinal_group || ""}
                      onChange={(e) => setFormData({ ...formData, semifinal_group: e.target.value })}
                      placeholder="e.g. A, B, C, D..."
                      className="bg-gray-800 border-gray-700 text-gray-100"
                    />
                    <p className="text-xs text-gray-500">This group label is shown on the tournament page (Group A, Group B, etc.)</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="date_time" className="text-gray-300">Tournament Date & Time *</Label>
                  <Input
                    id="date_time"
                    type="datetime-local"
                    value={formData.date_time}
                    onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-gray-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="registration_closes" className="text-gray-300">Registration Closes *</Label>
                  <Input
                    id="registration_closes"
                    type="datetime-local"
                    value={formData.registration_closes}
                    onChange={(e) => setFormData({ ...formData, registration_closes: e.target.value })}
                    className="bg-gray-800 border-gray-700 text-gray-100"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_teams" className="text-gray-300">Max Teams *</Label>
                  <Input
                    id="max_teams"
                    type="number"
                    min="4"
                    max="100"
                    value={formData.max_teams}
                    onChange={(e) => setFormData({ ...formData, max_teams: parseInt(e.target.value) })}
                    className="bg-gray-800 border-gray-700 text-gray-100"
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-100">Prize & Entry Fee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prize_pool" className="text-gray-300">Total Prize Pool (₹)</Label>
                  <Input
                    id="prize_pool"
                    type="number"
                    min="0"
                    value={formData.prize_pool}
                    onChange={(e) => setFormData({ ...formData, prize_pool: parseFloat(e.target.value) || 0 })}
                    className="bg-gray-800 border-gray-700 text-gray-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="entry_fee" className="text-gray-300">Entry Fee (BH Coins/Diamonds)</Label>
                  <Input
                    id="entry_fee"
                    type="number"
                    min="0"
                    value={formData.entry_fee}
                    onChange={(e) => setFormData({ ...formData, entry_fee: parseFloat(e.target.value) || 0 })}
                    className="bg-gray-800 border-gray-700 text-gray-100"
                    placeholder="e.g., 10 (users can pay in 🪙 or 💎)"
                  />
                  <p className="text-xs text-gray-500">Users can pay using BH Coins or Diamonds (1💎 = 1🪙)</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowPrizeDistribution(!showPrizeDistribution)}
                  className="w-full flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-orange-500/50 text-left"
                >
                  <span className="text-gray-200 font-semibold">🏆 Prize Distribution (1st to {Math.min(formData.max_teams, 48)} Place)</span>
                  <span className="text-gray-400 text-sm">{showPrizeDistribution ? '▲ Hide' : '▼ Show'}</span>
                </button>

                {showPrizeDistribution && (
                  <div className="mt-3 space-y-3">
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                      <p className="text-amber-400 text-xs font-medium">
                        ⚠️ <strong>Note:</strong> Prize amounts shown here are estimated and may vary based on actual match performance, final rankings, and organizer discretion. Final prizes are determined after the match concludes. By registering, players acknowledge this condition.
                      </p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                      {prizeKeys.map((place) => {
                        const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : `#${place}`;
                        return (
                          <div key={place} className="space-y-1">
                            <Label className="text-gray-400 text-xs">{medal} Place (₹)</Label>
                            <Input
                              type="number"
                              min="0"
                              value={formData.prize_distribution[place] || 0}
                              onChange={(e) => updatePrizeDistribution(place, e.target.value)}
                              className="bg-gray-800 border-gray-700 text-gray-100 h-8 text-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-gray-100">Tournament Rules</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                className="bg-gray-800 border-gray-700 text-gray-100 min-h-[300px] font-mono text-sm"
                placeholder="Enter tournament rules..."
              />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={saveAsTemplate}
                  onChange={(e) => setSaveAsTemplate(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label className="text-gray-300 cursor-pointer">
                  Save as Template (for reuse later)
                </Label>
              </div>
              {saveAsTemplate && (
                <div className="mt-3">
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Template name (optional)"
                    className="bg-gray-800 border-gray-700 text-gray-100"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(createPageUrl("Tournaments"))}
              className="border-gray-700 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || uploadingBanner}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white"
            >
              {submitting ? (saveAsTemplate ? "Saving..." : "Creating...") : (saveAsTemplate ? <><Save className="w-4 h-4 mr-2" /> Save Template</> : "Create Tournament")}
            </Button>
          </div>
        </form>
      </div>

      {/* Photo Library Modal */}
      <Dialog open={showPhotoLibrary} onOpenChange={setShowPhotoLibrary}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-100">Select from Photo Library</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
            {libraryPhotos.length === 0 ? (
              <div className="col-span-full text-center py-12 text-gray-500">
                <Grid className="w-16 h-16 mx-auto mb-4 text-gray-700" />
                <p>No photos in library. Please upload photos from Admin Dashboard.</p>
              </div>
            ) : (
              libraryPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => {
                    setFormData({ ...formData, banner_url: photo.photo_url });
                    setShowPhotoLibrary(false);
                  }}
                  className="cursor-pointer group relative overflow-hidden rounded-lg border-2 border-gray-700 hover:border-purple-500 transition-all"
                >
                  <img
                    src={photo.photo_url}
                    alt={photo.title}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white text-sm font-semibold text-center px-2">{photo.title}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}