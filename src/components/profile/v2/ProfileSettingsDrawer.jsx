import React, { useState } from 'react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { User as UserIcon, Image as ImageIcon, MapPin, Hash, Quote, Save, Link2, Upload, Loader2 } from 'lucide-react';
import { User } from '@/entities/User';
import { UploadFile } from '@/integrations/Core';

export default function ProfileSettingsDrawer({ children, user }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Safe fallbacks for form fields
  const [formData, setFormData] = useState({
    avatar_url: user?.avatar_url || '',
    banner_url: user?.banner_url || '',
    ign: user?.ign || '',
    uid: user?.unique_id || user?.id?.substring(0, 8) || '',
    location: user?.location || '',
    bio: user?.bio || '',
    social_link: user?.social_link || ''
  });

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
        className="w-full sm:max-w-md bg-[#0a0a0c] border-l border-[#1f2029] p-0 flex flex-col h-full overflow-hidden z-50 [&>button]:bg-[#111115] [&>button]:text-white [&>button]:p-2 [&>button]:rounded-lg [&>button]:border [&>button]:border-[#2a2a35] [&>button:hover]:bg-[#ff5500] [&>button:hover]:border-[#ff5500] [&>button]:transition-all [&>button]:right-6 [&>button]:top-6 [&>button]:shadow-lg pt-16"
      >
        <SheetHeader className="p-6 border-b border-[#1f2029] bg-[#0c0d12]">
          <SheetTitle className="text-xl font-black tracking-widest text-white uppercase text-left pr-10">
            Edit Profile
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-8">
          
          {/* Visuals Section */}
          <div className="space-y-4">
            <h4 className="text-[#ff5500] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Visuals
            </h4>
            
            <div className="space-y-4 bg-[#111115] border border-[#1f2029] rounded-xl p-4">
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Avatar</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    name="avatar_url"
                    value={formData.avatar_url}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="flex-1 bg-[#0a0a0c] border border-[#2a2a35] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#ff5500] transition-colors"
                  />
                  <label className="cursor-pointer shrink-0 bg-[#1a1a20] hover:bg-[#ff5500] border border-[#2a2a35] hover:border-[#ff5500] text-white p-2 rounded-lg transition-colors flex items-center justify-center">
                    {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'avatar_url')} />
                  </label>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Banner Image</label>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text" 
                    name="banner_url"
                    value={formData.banner_url}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="flex-1 bg-[#0a0a0c] border border-[#2a2a35] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#ff5500] transition-colors"
                  />
                  <label className="cursor-pointer shrink-0 bg-[#1a1a20] hover:bg-[#ff5500] border border-[#2a2a35] hover:border-[#ff5500] text-white p-2 rounded-lg transition-colors flex items-center justify-center">
                    {uploadingBanner ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'banner_url')} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Basic Info Section */}
          <div className="space-y-4">
            <h4 className="text-[#ff5500] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <UserIcon className="w-4 h-4" /> Basic Info
            </h4>
            
            <div className="space-y-4 bg-[#111115] border border-[#1f2029] rounded-xl p-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Player Name (IGN)</label>
                <input 
                  type="text" 
                  name="ign"
                  value={formData.ign}
                  onChange={handleChange}
                  className="w-full bg-[#0a0a0c] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff5500] transition-colors"
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1"><Hash className="w-3 h-3"/> UID</label>
                  <input 
                    type="text" 
                    name="uid"
                    value={formData.uid}
                    onChange={handleChange}
                    className="w-full bg-[#0a0a0c] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff5500] transition-colors"
                  />
                </div>
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1"><MapPin className="w-3 h-3"/> Location</label>
                  <input 
                    type="text" 
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full bg-[#0a0a0c] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff5500] transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bio & Social Section */}
          <div className="space-y-4">
            <h4 className="text-[#ff5500] text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Quote className="w-4 h-4" /> Personalization
            </h4>
            
            <div className="space-y-4 bg-[#111115] border border-[#1f2029] rounded-xl p-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Bio / Status</label>
                <textarea 
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-[#0a0a0c] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff5500] transition-colors resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-semibold uppercase tracking-wider flex items-center gap-1"><Link2 className="w-3 h-3"/> Social Link</label>
                <input 
                  type="text" 
                  name="social_link"
                  value={formData.social_link}
                  onChange={handleChange}
                  placeholder="https://youtube.com/c/yourchannel"
                  className="w-full bg-[#0a0a0c] border border-[#2a2a35] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ff5500] transition-colors"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-[#1f2029] bg-[#0c0d12] flex gap-4">
          <button 
            onClick={() => setOpen(false)}
            className="flex-1 py-3 bg-[#111115] border border-[#2a2a35] hover:bg-[#1a1a20] rounded-xl text-white font-bold transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-[#ff5500] hover:bg-[#ff6600] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-black flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,85,0,0.3)]"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} 
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
        
      </SheetContent>
    </Sheet>
  );
}
