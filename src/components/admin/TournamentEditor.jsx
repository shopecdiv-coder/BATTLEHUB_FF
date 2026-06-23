import React, { useState } from "react";
import { Tournament } from "@/entities/Tournament";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Save, X, Images } from "lucide-react";
import { PhotoLibrary } from "@/entities/PhotoLibrary";

export default function TournamentEditor({ tournament, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: tournament.title,
    mode: tournament.mode,
    map: tournament.map,
    entry_fee: tournament.entry_fee,
    prize_pool: tournament.prize_pool,
    date_time: tournament.date_time?.substring(0, 16) || "",
    registration_closes: tournament.registration_closes?.substring(0, 16) || "",
    max_teams: tournament.max_teams,
    rules: tournament.rules || "",
    room_code: tournament.room_code || "",
    room_password: tournament.room_password || "",
    status: tournament.status,
    prize_distribution: tournament.prize_distribution || { first: 0, second: 0, third: 0 },
    prize_image_url: tournament.prize_image_url || "",
    banner_url: tournament.banner_url || ""
  });

  const [saving, setSaving] = useState(false);
  const [uploadingPrizeImg, setUploadingPrizeImg] = useState(false);
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);
  const [photoLibraryImages, setPhotoLibraryImages] = useState([]);

  const handlePrizeImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPrizeImg(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, prize_image_url: file_url }));
    } catch (err) {
      alert("Image upload failed");
    }
    setUploadingPrizeImg(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Tournament.update(tournament.id, formData);
      alert("✅ Tournament updated!");
      onSave();
      onClose();
    } catch (error) {
      alert("Failed to update tournament");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="bg-gray-900 border-gray-700 max-w-4xl w-full my-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-cyan-400" />
              Edit Tournament
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 max-h-[600px] overflow-y-auto">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Tournament Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                  <SelectItem value="Registration Open">Registration Open</SelectItem>
                  <SelectItem value="Registration Closed">Registration Closed</SelectItem>
                  <SelectItem value="Live">Live</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Mode</Label>
              <Select value={formData.mode} onValueChange={(v) => setFormData({ ...formData, mode: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solo">Solo</SelectItem>
                  <SelectItem value="Duo">Duo</SelectItem>
                  <SelectItem value="Squad">Squad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Map</Label>
              <Select value={formData.map} onValueChange={(v) => setFormData({ ...formData, map: v })}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bermuda">Bermuda</SelectItem>
                  <SelectItem value="Purgatory">Purgatory</SelectItem>
                  <SelectItem value="Kalahari">Kalahari</SelectItem>
                  <SelectItem value="Alpine">Alpine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-gray-300">Entry Fee</Label>
              <Input
                type="number"
                value={formData.entry_fee}
                onChange={(e) => setFormData({ ...formData, entry_fee: parseInt(e.target.value) || 0 })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Prize Pool</Label>
              <Input
                type="number"
                value={formData.prize_pool}
                onChange={(e) => setFormData({ ...formData, prize_pool: parseInt(e.target.value) || 0 })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Max Teams</Label>
              <Input
                type="number"
                value={formData.max_teams}
                onChange={(e) => setFormData({ ...formData, max_teams: parseInt(e.target.value) || 0 })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Tournament Date & Time</Label>
              <Input
                type="datetime-local"
                value={formData.date_time}
                onChange={(e) => setFormData({ ...formData, date_time: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Registration Closes</Label>
              <Input
                type="datetime-local"
                value={formData.registration_closes}
                onChange={(e) => setFormData({ ...formData, registration_closes: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div>
              <Label className="text-gray-300">Room Code</Label>
              <Input
                value={formData.room_code}
                onChange={(e) => setFormData({ ...formData, room_code: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Room ID"
              />
            </div>

            <div>
              <Label className="text-gray-300">Room Password</Label>
              <Input
                value={formData.room_password}
                onChange={(e) => setFormData({ ...formData, room_password: e.target.value })}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Password"
              />
            </div>
          </div>

          {/* Prize Distribution - all positions up to max_teams */}
          <div>
            <Label className="text-gray-300 mb-3 block">🏆 Prize Distribution (all {formData.max_teams || 32} places)</Label>
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg mb-3">
              <p className="text-yellow-400 text-xs">⚠️ Note: Enter custom note for players below (shown in prize section)</p>
              <input
                value={formData.prize_note || "Prize amounts shown here are estimated and may vary based on actual match performance."}
                onChange={(e) => setFormData({ ...formData, prize_note: e.target.value })}
                className="w-full mt-2 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                placeholder="Custom note for prize distribution..."
              />
            </div>
            <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
              {Array.from({ length: formData.max_teams || 32 }, (_, i) => {
                const pos = i + 1;
                const key = pos === 1 ? "first" : pos === 2 ? "second" : pos === 3 ? "third" : `pos_${pos}`;
                const medals = ["🥇", "🥈", "🥉"];
                const label = pos <= 3 ? `${medals[i]} ${pos}${pos===1?"st":pos===2?"nd":"rd"} Place` : `#${pos} Place`;
                const val = formData.prize_distribution[key] || 0;
                return (
                  <div key={pos}>
                    <Label className="text-gray-400 text-xs">{label} (₹)</Label>
                    <Input
                      type="number"
                      value={val}
                      onChange={(e) => setFormData({
                        ...formData,
                        prize_distribution: { ...formData.prize_distribution, [key]: parseInt(e.target.value) || 0 }
                      })}
                      className="bg-gray-800 border-gray-700 text-white h-9"
                      min="0"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tournament Banner Image */}
          <div>
            <Label className="text-gray-300 mb-2 block">🖼️ Tournament Banner Image</Label>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const photos = await PhotoLibrary.list("-created_date");
                    setPhotoLibraryImages(photos || []);
                    setShowPhotoLibrary("banner");
                  } catch { alert("Failed to load photos"); }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-800/50 hover:bg-purple-700/60 border border-purple-600 rounded-lg text-purple-300 text-sm"
              >
                <Images className="w-4 h-4" />
                Choose Banner from Photos
              </button>
              {formData.banner_url && (
                <div className="flex items-center gap-2">
                  <img src={formData.banner_url} alt="Banner" className="h-10 w-20 object-cover rounded border border-gray-600" />
                  <button onClick={() => setFormData(prev => ({ ...prev, banner_url: "" }))} className="text-red-400 text-xs">Remove</button>
                </div>
              )}
            </div>
            {showPhotoLibrary === "banner" && (
              <div className="mt-3 p-3 bg-gray-800 border border-gray-700 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-gray-300 text-sm font-semibold">Select Banner Photo</p>
                  <button onClick={() => setShowPhotoLibrary(false)} className="text-gray-500 hover:text-white">✕</button>
                </div>
                {photoLibraryImages.length === 0 ? (
                  <p className="text-gray-500 text-sm">No photos in library</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {photoLibraryImages.map(photo => (
                      <div key={photo.id} onClick={() => { setFormData(prev => ({ ...prev, banner_url: photo.photo_url })); setShowPhotoLibrary(false); }} className="cursor-pointer rounded overflow-hidden border-2 border-transparent hover:border-purple-500">
                        <img src={photo.photo_url} alt={photo.title} className="w-full h-16 object-cover" />
                        <p className="text-[10px] text-gray-400 truncate px-1 py-0.5">{photo.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Prize Distribution Image Upload */}
          <div>
            <Label className="text-gray-300 mb-2 block">🖼️ Prize Distribution Image (optional)</Label>
            <div className="flex items-center gap-3 flex-wrap">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm">
                <input type="file" accept="image/*" onChange={handlePrizeImageUpload} className="hidden" />
                {uploadingPrizeImg ? "Uploading..." : "Upload Image"}
              </label>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const photos = await PhotoLibrary.list("-created_date");
                    setPhotoLibraryImages(photos || []);
                    setShowPhotoLibrary("prize");
                  } catch { alert("Failed to load photos"); }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-purple-800/50 hover:bg-purple-700/60 border border-purple-600 rounded-lg text-purple-300 text-sm"
              >
                <Images className="w-4 h-4" />
                Choose from Photos
              </button>
              {formData.prize_image_url && (
                <div className="flex items-center gap-2">
                  <img src={formData.prize_image_url} alt="Prize" className="h-10 w-16 object-cover rounded border border-gray-600" />
                  <button onClick={() => setFormData(prev => ({ ...prev, prize_image_url: "" }))} className="text-red-400 text-xs">Remove</button>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Shown as "Prize Chart" button on tournament page</p>

            {/* Photo Library Picker */}
            {showPhotoLibrary === "prize" && (
            <div className="mt-3 p-3 bg-gray-800 border border-gray-700 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <p className="text-gray-300 text-sm font-semibold">Select from Photo Library</p>
                <button onClick={() => setShowPhotoLibrary(false)} className="text-gray-500 hover:text-white">✕</button>
              </div>
              {photoLibraryImages.length === 0 ? (
                <p className="text-gray-500 text-sm">No photos in library</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                  {photoLibraryImages.map(photo => (
                    <div
                      key={photo.id}
                      onClick={() => { setFormData(prev => ({ ...prev, prize_image_url: photo.photo_url })); setShowPhotoLibrary(false); }}
                      className="cursor-pointer rounded overflow-hidden border-2 border-transparent hover:border-purple-500"
                    >
                      <img src={photo.photo_url} alt={photo.title} className="w-full h-16 object-cover" />
                      <p className="text-[10px] text-gray-400 truncate px-1 py-0.5">{photo.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </div>

          <div>
            <Label className="text-gray-300">Tournament Rules</Label>
            <Textarea
              value={formData.rules}
              onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
              className="bg-gray-800 border-gray-700 text-white min-h-[150px]"
              placeholder="Enter tournament rules..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1 border-gray-600">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}