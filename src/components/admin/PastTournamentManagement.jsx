import React, { useState, useEffect } from "react";
import { PastTournament } from "@/entities/PastTournament";
import { PhotoLibrary } from "@/entities/PhotoLibrary";
import { UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Plus, X, Upload, Trash2, Image } from "lucide-react";

import { format } from "date-fns";
import ReactQuill from 'react-quill';

export default function PastTournamentManagement({ tournaments = [], onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    tournament_id: "",
    title: "",
    mode: "Solo",
    date: "",
    end_time: "",
    winners: [],
    result_pdf_url: "",
    result_image_url: "",
    description: "",
    full_details: "",
    youtube_link: "",
    reward_structure: { first: 0, second: 0, third: 0 }
  });
  const [uploading, setUploading] = useState(false);
  const [newWinner, setNewWinner] = useState({
    rank: 1,
    player_name: "",
    uid: "",
    kills: 0,
    reward: 0
  });
  const [showPhotoLibrary, setShowPhotoLibrary] = useState(false);
  const [photoLibrary, setPhotoLibrary] = useState([]);

  useEffect(() => {
    loadPhotoLibrary();
  }, []);

  const loadPhotoLibrary = async () => {
    try {
      const photos = await PhotoLibrary.list();
      setPhotoLibrary(photos || []);
    } catch (error) {
      console.error("Error loading photos:", error);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData({ ...formData, result_image_url: file_url });
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image. Please try again.");
    }
    setUploading(false);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      setFormData({ ...formData, result_pdf_url: file_url });
    } catch (error) {
      console.error("Error uploading PDF:", error);
      alert("Failed to upload PDF. Please try again.");
    }
    setUploading(false);
  };

  const addWinner = () => {
    if (!newWinner.player_name || !newWinner.uid) return;
    
    setFormData({
      ...formData,
      winners: [...formData.winners, newWinner]
    });
    
    setNewWinner({
      rank: newWinner.rank + 1,
      player_name: "",
      uid: "",
      kills: 0,
      reward: 0
    });
  };

  const removeWinner = (index) => {
    setFormData({
      ...formData,
      winners: formData.winners.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await PastTournament.update(editingId, formData);
      } else {
        await PastTournament.create(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({
        tournament_id: "",
        title: "",
        mode: "Solo",
        date: "",
        end_time: "",
        winners: [],
        result_pdf_url: "",
        result_image_url: "",
        description: "",
        full_details: "",
        reward_structure: { first: 0, second: 0, third: 0 }
      });
      await onUpdate();
    } catch (error) {
      console.error("Error saving tournament:", error);
      alert("Failed to save tournament. Please try again.");
    }
  };

  const editTournament = (tournament) => {
    setFormData({
      tournament_id: tournament.tournament_id,
      title: tournament.title,
      mode: tournament.mode,
      date: tournament.date.split('T')[0],
      end_time: tournament.end_time || "",
      winners: tournament.winners || [],
      result_pdf_url: tournament.result_pdf_url || "",
      result_image_url: tournament.result_image_url || "",
      description: tournament.description || "",
      full_details: tournament.full_details || "",
      youtube_link: tournament.youtube_link || "",
      reward_structure: tournament.reward_structure || { first: 0, second: 0, third: 0 }
    });
    setEditingId(tournament.id);
    setShowForm(true);
  };

  const deleteTournament = async (id) => {
    if (confirm("Are you sure you want to delete this tournament?")) {
      try {
        await PastTournament.delete(id);
        await onUpdate();
      } catch (error) {
        console.error("Error deleting tournament:", error);
        alert("Failed to delete tournament. Please try again.");
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-gray-100">Past Tournaments Management</h3>
          <p className="text-sm text-gray-400">Add and manage completed tournament results</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Past Tournament
        </Button>
      </div>

      {showForm && (
        <div>
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Tournament ID</Label>
                      <Input
                        value={formData.tournament_id}
                        onChange={(e) => setFormData({...formData, tournament_id: e.target.value})}
                        placeholder="e.g., T2025_001"
                        className="bg-gray-900 border-gray-700 text-gray-100"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Title</Label>
                      <Input
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        placeholder="Tournament title"
                        className="bg-gray-900 border-gray-700 text-gray-100"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Mode</Label>
                      <Select
                        value={formData.mode}
                        onValueChange={(value) => setFormData({...formData, mode: value})}
                      >
                        <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Solo">Solo</SelectItem>
                          <SelectItem value="Duo">Duo</SelectItem>
                          <SelectItem value="Squad">Squad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Date</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="bg-gray-900 border-gray-700 text-gray-100"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Description (Brief Summary)</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Brief tournament summary..."
                      className="bg-gray-900 border-gray-700 text-gray-100 min-h-[100px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">YouTube Live/Replay Link</Label>
                    <Input
                      value={formData.youtube_link || ""}
                      onChange={(e) => setFormData({...formData, youtube_link: e.target.value})}
                      placeholder="https://youtube.com/watch?v=..."
                      className="bg-gray-900 border-gray-700 text-gray-100"
                    />
                    <p className="text-xs text-gray-500">Users can watch tournament gameplay replay</p>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Full Tournament Details (Rich Text - For Users)</Label>
                    <div className="bg-white rounded-lg">
                      <ReactQuill
                        value={formData.full_details}
                        onChange={(value) => setFormData({ ...formData, full_details: value })}
                        theme="snow"
                        placeholder="Write detailed match information: highlights, participants, rules summary, match moments, etc..."
                        modules={{
                          toolbar: [
                            ['bold', 'italic', 'underline'],
                            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                            ['link'],
                            ['clean']
                          ]
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Users will see this in Past Tournament details page</p>
                  </div>

                  {/* Winner Management */}
                  <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg">
                    <Label className="text-gray-300">Winners</Label>
                    
                    {formData.winners.map((winner, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-800 rounded">
                        <Badge>#{winner.rank}</Badge>
                        <span className="text-gray-300 flex-1">{winner.player_name} ({winner.uid})</span>
                        <span className="text-cyan-400">{winner.kills} kills</span>
                        <span className="text-gold-500">{winner.reward} 🪙</span>
                        <button
                          type="button"
                          onClick={() => removeWinner(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <div className="grid grid-cols-5 gap-2">
                      <Input
                        type="number"
                        value={newWinner.rank}
                        onChange={(e) => setNewWinner({...newWinner, rank: parseInt(e.target.value)})}
                        placeholder="Rank"
                        className="bg-gray-900 border-gray-700 text-gray-100"
                      />
                      <Input
                        value={newWinner.player_name}
                        onChange={(e) => setNewWinner({...newWinner, player_name: e.target.value})}
                        placeholder="Player name"
                        className="bg-gray-900 border-gray-700 text-gray-100"
                      />
                      <Input
                        value={newWinner.uid}
                        onChange={(e) => setNewWinner({...newWinner, uid: e.target.value})}
                        placeholder="UID"
                        className="bg-gray-900 border-gray-700 text-gray-100"
                      />
                      <Input
                        type="number"
                        value={newWinner.kills}
                        onChange={(e) => setNewWinner({...newWinner, kills: parseInt(e.target.value)})}
                        placeholder="Kills"
                        className="bg-gray-900 border-gray-700 text-gray-100"
                      />
                      <Input
                        type="number"
                        value={newWinner.reward}
                        onChange={(e) => setNewWinner({...newWinner, reward: parseInt(e.target.value)})}
                        placeholder="Reward"
                        className="bg-gray-900 border-gray-700 text-gray-100"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={addWinner}
                      variant="outline"
                      className="w-full border-gray-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Winner
                    </Button>
                  </div>

                  {/* Reward Structure */}
                  <div className="space-y-3 p-4 bg-gray-900/50 rounded-lg">
                    <Label className="text-gray-300">Reward Distribution</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-400">1st Place</Label>
                        <Input
                          type="number"
                          value={formData.reward_structure.first}
                          onChange={(e) => setFormData({
                            ...formData,
                            reward_structure: { ...formData.reward_structure, first: parseInt(e.target.value) || 0 }
                          })}
                          className="bg-gray-900 border-gray-700 text-gray-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-400">2nd Place</Label>
                        <Input
                          type="number"
                          value={formData.reward_structure.second}
                          onChange={(e) => setFormData({
                            ...formData,
                            reward_structure: { ...formData.reward_structure, second: parseInt(e.target.value) || 0 }
                          })}
                          className="bg-gray-900 border-gray-700 text-gray-100"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm text-gray-400">3rd Place</Label>
                        <Input
                          type="number"
                          value={formData.reward_structure.third}
                          onChange={(e) => setFormData({
                            ...formData,
                            reward_structure: { ...formData.reward_structure, third: parseInt(e.target.value) || 0 }
                          })}
                          className="bg-gray-900 border-gray-700 text-gray-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Media Upload */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Result Image (1200x800px)</Label>
                      {formData.result_image_url ? (
                        <div className="relative">
                          <img src={formData.result_image_url} alt="Result" className="w-full h-32 object-cover rounded" />
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, result_image_url: ""})}
                            className="absolute top-2 right-2 bg-red-500 p-1 rounded"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="cursor-pointer">
                            <div className="border-2 border-dashed border-gray-700 rounded p-4 text-center hover:border-cyan-500/50">
                              {uploading ? "Uploading..." : <><Upload className="w-6 h-6 mx-auto text-gray-500 mb-1" /><p className="text-sm text-gray-400">Upload Image</p></>}
                            </div>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                          </label>
                          <Button
                            type="button"
                            onClick={() => setShowPhotoLibrary(true)}
                            variant="outline"
                            className="w-full border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
                          >
                            <Image className="w-4 h-4 mr-2" />
                            Choose from Photo Library
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Result PDF (Upload OR Link)</Label>
                      {formData.result_pdf_url ? (
                        <div className="p-4 bg-gray-900 rounded flex items-center justify-between">
                          <span className="text-sm text-gray-300 truncate">
                            {formData.result_pdf_url.includes('http') ? '🔗 Link' : '📄 PDF'} Added
                          </span>
                          <button
                            type="button"
                            onClick={() => setFormData({...formData, result_pdf_url: ""})}
                            className="text-red-400"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Input
                            value={formData.result_pdf_url}
                            onChange={(e) => setFormData({...formData, result_pdf_url: e.target.value})}
                            placeholder="Or paste PDF link here..."
                            className="bg-gray-900 border-gray-700 text-gray-100"
                          />
                          <p className="text-xs text-gray-500 text-center">OR</p>
                          <label className="cursor-pointer">
                            <div className="border-2 border-dashed border-gray-700 rounded p-4 text-center hover:border-cyan-500/50">
                              {uploading ? "Uploading..." : <><Upload className="w-6 h-6 mx-auto text-gray-500 mb-1" /><p className="text-sm text-gray-400">Upload PDF File</p></>}
                            </div>
                            <input type="file" accept=".pdf" onChange={handlePdfUpload} className="hidden" disabled={uploading} />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="border-gray-700">
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700" disabled={uploading}>
                      Create Past Tournament
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

      {/* Tournament List */}
      <div className="space-y-3">
        {!tournaments || tournaments.length === 0 ? (
          <Card className="p-12 text-center bg-gray-900/50 border-gray-800">
            <p className="text-gray-500">No past tournaments yet</p>
          </Card>
        ) : (
          tournaments.map((tournament) => (
            <Card key={tournament.id} className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {tournament.result_image_url && (
                      <img src={tournament.result_image_url} alt="Result" className="w-20 h-20 object-cover rounded" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-cyan-500/20 text-cyan-400">{tournament.mode}</Badge>
                        <Badge variant="outline">{tournament.tournament_id}</Badge>
                      </div>
                      <h4 className="font-bold text-gray-100">{tournament.title}</h4>
                      <p className="text-xs text-gray-400">{format(new Date(tournament.date), "PPP")}</p>
                      {tournament.winners?.length > 0 && (
                        <p className="text-sm text-gray-400 mt-1">Winner: {tournament.winners[0].player_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editTournament(tournament)}
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTournament(tournament.id)}
                      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Photo Library Dialog */}
      <Dialog open={showPhotoLibrary} onOpenChange={setShowPhotoLibrary}>
        <DialogContent className="bg-gray-900 border-gray-700 max-w-4xl max-h-[80vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-100 mb-4">Select from Photo Library</h3>
          <div className="grid grid-cols-3 gap-4">
            {photoLibrary.map((photo) => (
              <div
                key={photo.id}
                onClick={() => {
                  setFormData({...formData, result_image_url: photo.photo_url});
                  setShowPhotoLibrary(false);
                }}
                className="cursor-pointer hover:opacity-75 transition-opacity"
              >
                <img src={photo.photo_url} alt={photo.title} className="w-full h-32 object-cover rounded" />
                <p className="text-xs text-gray-400 mt-1 truncate">{photo.title}</p>
              </div>
            ))}
          </div>
          {photoLibrary.length === 0 && (
            <p className="text-center text-gray-500 py-8">No photos in library</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}