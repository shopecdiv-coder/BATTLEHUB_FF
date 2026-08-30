import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { User as UserIcon, Image as ImageIcon, MapPin, Hash, Quote, Save, Link2, Upload, Loader2 } from 'lucide-react';
import { User, Squad } from '@/api/entities';
import { UploadFile } from '@/integrations/Core';

export default function ProfileSettingsDrawer({ children, user }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    avatar_url: user?.avatar_url || '',
    banner_url: user?.banner_url || '',
    ign: user?.ign || '',
    game: user?.game || 'FF',
    game_id: user?.game_id || '',
    phone: user?.phone || '',
    bio: user?.bio || ''
  });

  // Always reset form to the latest user data when the drawer opens
  React.useEffect(() => {
    if (open && user) {
      setFormData({
        full_name: user.full_name || '',
        avatar_url: user.avatar_url || '',
        banner_url: user.banner_url || '',
        ign: user.ign || '',
        game: user.game || 'FF',
        game_id: user.game_id || '',
        phone: user.phone || '',
        bio: user.bio || '',
        social_link_1: user.social_link_1 || user.instagram_url || '',
        social_link_2: user.social_link_2 || user.youtube_url || ''
      });
    }
  }, [open, user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileUpload = async (e, field) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (field === 'avatar_url') setUploadingAvatar(true);
    if (field === 'banner_url') setUploadingBanner(true);

    try {
      const { file_url } = await UploadFile({ file });
      setFormData(prev => ({ ...prev, [field]: file_url }));
    } catch (err) {
      alert("Upload failed. Please try again.");
    } finally {
      if (field === 'avatar_url') setUploadingAvatar(false);
      if (field === 'banner_url') setUploadingBanner(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await User.updateMyUserData(formData);
      
      // If user is in a squad, sync the IGN/GameID in the Squad document's members array
      if (user?.squad_id) {
        try {
          const squadData = await Squad.getById(user.squad_id);
          if (squadData && squadData.members) {
            const updatedMembers = squadData.members.map(m => {
              if (m.uid === user.unique_id || m.uid === user.game_id || (user.id && m.id === user.id)) {
                return { ...m, ign: formData.ign };
              }
              return m;
            });
            await Squad.update(user.squad_id, { members: updatedMembers });
          }
        } catch (err) {
          console.error("Failed to sync squad IGN:", err);
        }
      }

      setOpen(false);
      // Reload page to reflect changes everywhere
      window.location.reload();
    } catch (error) {
      console.error("Save error:", error);
      alert("Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      
      {/* 
        [&>button]:bg-gray-800 overrides the default close button style 
        to make it highly visible.
      */}
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-md bg-slate-950 border-l border-slate-800 p-0 flex flex-col h-full overflow-hidden z-[100] pb-20 sm:pb-0 !pt-0 [&>button]:bg-slate-900 [&>button]:text-white [&>button]:p-2 [&>button]:rounded-lg [&>button]:border [&>button]:border-slate-700 [&>button:hover]:bg-[#0ea5e9] [&>button:hover]:border-[#0ea5e9] [&>button]:transition-all [&>button]:right-6 [&>button]:top-6 [&>button]:shadow-lg"
      >
        <SheetHeader className="p-6 border-b border-slate-800 bg-[#0c0d12]">
          <SheetTitle className="text-xl font-black tracking-widest text-white uppercase text-left pr-10">
            Edit Profile
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8">
          
          {/* Visuals Section */}
          <div className="space-y-4">
            <h4 className="text-[#0ea5e9] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Visuals
            </h4>
            
            <div className="space-y-6 pt-2">
              <div className="space-y-2">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Avatar</label>
                <div className="flex gap-3 items-center">
                  <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-inner">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-600 text-[10px] font-bold uppercase tracking-wider">None</span>
                    )}
                  </div>
                  <label className="cursor-pointer shrink-0 bg-slate-900 hover:bg-[#0ea5e9] border border-slate-800 hover:border-[#0ea5e9] text-white p-3 rounded-xl transition-all flex items-center justify-center shadow-sm">
                    {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'avatar_url')} />
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Banner Image</label>
                <div className="flex gap-3 items-center">
                  <div className="flex-1 h-20 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center relative shadow-inner">
                    <img 
                      src={formData.banner_url || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop"} 
                      alt="Banner" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <label className="cursor-pointer shrink-0 bg-slate-900 hover:bg-[#0ea5e9] border border-slate-800 hover:border-[#0ea5e9] text-white p-3 rounded-xl transition-all flex items-center justify-center shadow-sm">
                    {uploadingBanner ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'banner_url')} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h4 className="text-[#0ea5e9] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <UserIcon className="w-4 h-4" /> Basic Info
            </h4>
            
            <div className="space-y-5 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Your Name</label>
                <input 
                  type="text" 
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your real name"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0ea5e9] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Game Name (IGN)</label>
                <input 
                  type="text" 
                  name="ign"
                  value={formData.ign}
                  onChange={handleChange}
                  placeholder="Enter your in-game name"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0ea5e9] transition-all"
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-1.5 flex-[0.7]">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">Game</label>
                  <select 
                    name="game"
                    value={formData.game}
                    onChange={handleChange}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0ea5e9] transition-all appearance-none"
                  >
                    <option value="FF">Free Fire</option>
                    <option value="BGMI">BGMI</option>
                    <option value="Valorant">Valorant</option>
                  </select>
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3"/> {formData.game} ID
                  </label>
                  <input 
                    type="text" 
                    name="game_id"
                    value={formData.game_id}
                    onChange={handleChange}
                    placeholder="Enter Game ID"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0ea5e9] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Phone Number</label>
                <input 
                  type="tel" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0ea5e9] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Bio & Social Section */}
          <div className="space-y-4">
            <h4 className="text-[#0ea5e9] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Quote className="w-4 h-4" /> Personalization
            </h4>
            
            <div className="space-y-5 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Bio / Status</label>
                <textarea 
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0ea5e9] transition-all resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Social Link 1</label>
                <input 
                  type="url" 
                  name="social_link_1"
                  value={formData.social_link_1}
                  onChange={handleChange}
                  placeholder="https://instagram.com/username"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0ea5e9] transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-500 font-bold uppercase tracking-wider">Social Link 2</label>
                <input 
                  type="url" 
                  name="social_link_2"
                  value={formData.social_link_2}
                  onChange={handleChange}
                  placeholder="https://youtube.com/@channel"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#0ea5e9] transition-all"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-slate-800 bg-[#0c0d12] flex gap-4">
          <button 
            onClick={() => setOpen(false)}
            className="flex-1 py-3 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-xl text-white font-bold transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-[#0ea5e9] hover:bg-[#38bdf8] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-black flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,85,0,0.3)]"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
        
      </SheetContent>
    </Sheet>
  );
}
