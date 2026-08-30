import React, { useState } from 'react';
import { X, CheckCircle2, Crosshair, Target, Clock, Shield, Map, Activity } from 'lucide-react';
import { PlayerMatchHistory, User } from '@/api/entities';
import { toast } from 'react-hot-toast';

import { Trophy } from 'lucide-react';

export default function AddMatchModal({ user, userRegistrations = [], onClose, onMatchAdded }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    kills: 0,
    position: 1,
    damage: 0,
    headshotPercent: 0,
    tournament_id: userRegistrations.length > 0 ? userRegistrations[0].tournament_id : '',
    map: 'Bermuda',
    mode: 'Squad',
    playTime: 15
  });

  const maps = ['Bermuda', 'Kalahari', 'Purgatory', 'Alpine', 'NeXTerra'];
  const modes = ['Solo', 'Duo', 'Squad', 'Clash Squad'];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['map', 'mode', 'tournament_id'].includes(name) ? value : Number(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // 1. Create match history record
      await PlayerMatchHistory.create({
        user_id: user.id,
        kills: formData.kills,
        position: formData.position,
        damage: formData.damage,
        headshot_percent: formData.headshotPercent,
        tournament_id: formData.tournament_id,
        tournament_name: userRegistrations.find(r => r.tournament_id === formData.tournament_id)?.tournament_name || '',
        map: formData.map,
        mode: formData.mode,
        play_time_minutes: formData.playTime,
        created_at: new Date().toISOString()
      });

      // 2. Update user's aggregate stats (optional, but good for quick reads)
      const currentKills = user.kills || 0;
      const currentWins = user.wins || 0;
      const currentMatches = user.matches_played || 0;
      
      const newWins = formData.position === 1 ? currentWins + 1 : currentWins;
      
      await User.update(user.id, {
        kills: currentKills + formData.kills,
        wins: newWins,
        matches_played: currentMatches + 1,
        kd_ratio: parseFloat(((currentKills + formData.kills) / (currentMatches + 1 - newWins || 1)).toFixed(2))
      });

      toast.success("Match results saved successfully!");
      if (onMatchAdded) onMatchAdded();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save match results.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-slate-950/50">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" /> Log Match Result
          </h2>
          <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Select Tournament</label>
              <div className="relative">
                <Trophy className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500" />
                <select 
                  name="tournament_id" 
                  value={formData.tournament_id} 
                  onChange={handleChange}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none"
                >
                  <option value="" disabled>Select a tournament</option>
                  {userRegistrations.map(reg => (
                    <option key={reg.id} value={reg.tournament_id}>{reg.tournament_name || 'Tournament ' + reg.tournament_id}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Map</label>
                <div className="relative">
                  <Map className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <select 
                    name="map" 
                    value={formData.map} 
                    onChange={handleChange}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none"
                  >
                    {maps.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Mode</label>
                <select 
                  name="mode" 
                  value={formData.mode} 
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 px-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none appearance-none"
                >
                  {modes.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Placement (#)</label>
                <div className="relative">
                  <Shield className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="number" 
                    name="position" 
                    value={formData.position} 
                    onChange={handleChange}
                    min="1" max="100"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Kills</label>
                <div className="relative">
                  <Crosshair className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="number" 
                    name="kills" 
                    value={formData.kills} 
                    onChange={handleChange}
                    min="0"
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Damage</label>
                <div className="relative">
                  <Activity className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="number" 
                    name="damage" 
                    value={formData.damage} 
                    onChange={handleChange}
                    min="0"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-400 uppercase">Headshot %</label>
                <div className="relative">
                  <Target className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="number" 
                    name="headshotPercent" 
                    value={formData.headshotPercent} 
                    onChange={handleChange}
                    min="0" max="100"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-400 uppercase">Play Time (Minutes)</label>
              <div className="relative">
                <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="number" 
                  name="playTime" 
                  value={formData.playTime} 
                  onChange={handleChange}
                  min="1" max="60"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2.5 pl-10 pr-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-gray-800 bg-slate-950/50 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 to-red-600 hover:from-purple-400 hover:to-red-500 text-white rounded-lg font-bold shadow-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Saving...' : <><CheckCircle2 className="w-4 h-4" /> Save Match</>}
          </button>
        </div>
      </div>
    </div>
  );
}
