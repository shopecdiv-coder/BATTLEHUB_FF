import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Image as ImageIcon, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/api/firebaseClient';
import { useToast } from '@/components/ui/use-toast';
import { Notification } from '@/api/entities';

export default function EditChannelModal({ channel, onClose, onSave }) {
  const [name, setName] = useState(channel.name || '');
  const [handle, setHandle] = useState(channel.handle || '');
  const [description, setDescription] = useState(channel.description || '');
  const [logoUrl, setLogoUrl] = useState(channel.logo_url || '');
  const [bannerUrl, setBannerUrl] = useState(channel.banner_url || '');
  const [isSaving, setIsSaving] = useState(false);
  
  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const { toast } = useToast();

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setBannerUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !handle.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please enter a Channel Name and Handle.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      let cleanHandle = handle.trim();
      if (!cleanHandle.startsWith('@')) cleanHandle = '@' + cleanHandle;
      cleanHandle = cleanHandle.replace(/\s+/g, '');

      const updatedData = {
        name: name.trim(),
        handle: cleanHandle,
        description: description.trim(),
        logo_url: logoUrl,
        banner_url: bannerUrl,
      };

      if (channel.id && channel.id.length > 10) {
        await updateDoc(doc(db, 'channels', channel.id), updatedData);
      }

      Notification.create({
        recipient_id: channel.user_id,
        title: "Channel Updated",
        message: "Your channel details have been saved.",
        type: "system",
        read: false
      }).catch(console.error);

      onSave({ ...channel, ...updatedData });
    } catch (err) {
      console.error("Error updating channel:", err);
      toast({
        title: "Error",
        description: "Failed to update channel. Try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[1200] bg-slate-950 flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-800 bg-[#111218]">
          <h2 className="text-xl font-black text-white">Edit Channel Profile</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-20">
          {/* Banner Edit */}
          <div 
            className="relative h-32 sm:h-48 bg-gray-900 group cursor-pointer border-b border-gray-800"
            onClick={() => bannerInputRef.current?.click()}
          >
            <img src={bannerUrl || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=1000'} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white backdrop-blur-sm">
              <Camera className="w-8 h-8 mb-2" />
              <span className="font-bold">Change Banner</span>
            </div>
            <input type="file" ref={bannerInputRef} className="hidden" accept="image/*" onChange={handleBannerUpload} />
          </div>

          <div className="max-w-3xl mx-auto px-4 sm:px-6 relative">
            {/* Logo Edit */}
            <div className="relative -mt-12 sm:-mt-16 mb-8 w-24 h-24 sm:w-32 sm:h-32">
              <div 
                className="w-full h-full bg-gray-800 rounded-full border-4 border-slate-950 overflow-hidden relative group cursor-pointer"
                onClick={() => logoInputRef.current?.click()}
              >
                <img src={logoUrl || 'https://via.placeholder.com/150'} alt="Logo" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                  <Camera className="w-6 h-6" />
                </div>
              </div>
              <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </div>

            {/* Form Fields */}
            <div className="space-y-6">
              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Channel Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  className="bg-[#0c0d12] border-gray-800 text-white focus:border-red-500 h-12 text-lg font-bold"
                  placeholder="Your gaming alias"
                />
              </div>

              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Channel Handle</Label>
                <Input 
                  value={handle} 
                  onChange={(e) => setHandle(e.target.value)} 
                  className="bg-[#0c0d12] border-gray-800 text-gray-400 focus:border-red-500 h-12"
                  placeholder="@handle"
                />
              </div>

              <div>
                <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Description / Bio</Label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0c0d12] border border-gray-800 rounded-md text-white focus:outline-none focus:border-red-500 p-3 text-sm min-h-[120px] resize-none"
                  placeholder="Tell your viewers what your channel is about..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-800 bg-[#111218] flex justify-end gap-4">
          <Button variant="ghost" onClick={onClose} className="text-gray-400 hover:text-white" disabled={isSaving}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-8 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)]"
          >
            {isSaving ? "Saving..." : <span className="flex items-center gap-2"><Save className="w-4 h-4" /> Save Channel</span>}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
