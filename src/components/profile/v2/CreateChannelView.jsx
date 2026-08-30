import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Video, ArrowRight, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Channel, Notification } from '@/api/entities';

export default function CreateChannelView({ user, onChannelCreated }) {
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
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

  const handleCreate = async () => {
    if (!name.trim() || !handle.trim()) {
      toast({
        title: "Required Fields Missing",
        description: "Please enter a Channel Name and Handle.",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    try {
      // Clean handle (ensure it starts with @ and has no spaces)
      let cleanHandle = handle.trim();
      if (!cleanHandle.startsWith('@')) {
        cleanHandle = '@' + cleanHandle;
      }
      cleanHandle = cleanHandle.replace(/\s+/g, '');

      const newChannelData = {
        user_id: user.id,
        name: name.trim(),
        handle: cleanHandle,
        description: description.trim(),
        logo_url: logoUrl || 'https://via.placeholder.com/150',
        banner_url: bannerUrl || 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?q=80&w=1000',
        created_at: new Date().toISOString(),
        subscribers: 0,
        total_views: 0
      };

      const docRef = await Channel.create(newChannelData);
      const createdChannel = { id: docRef.id, ...newChannelData };
      
      Notification.create({
        recipient_id: user.id,
        title: "Channel Created! 🚀",
        message: "Welcome to Creator Studio. Start uploading videos!",
        type: "system",
        read: false
      }).catch(console.error);

      onChannelCreated(createdChannel);
    } catch (err) {
      console.error("Error creating channel:", err);
      toast({
        title: "Error",
        description: "Failed to create channel. Try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#0c0d12] sm:bg-slate-950 flex flex-col items-center sm:py-12 sm:px-6">
      <div className="w-full sm:max-w-2xl bg-[#0c0d12] sm:border sm:border-gray-800 sm:rounded-2xl overflow-hidden sm:shadow-2xl flex flex-col min-h-full sm:min-h-0 pb-10">
        
        {/* Banner Upload Area */}
        <div 
          className="relative h-32 sm:h-48 bg-gray-900 group cursor-pointer overflow-hidden border-b border-gray-800"
          onClick={() => bannerInputRef.current?.click()}
        >
          {bannerUrl ? (
            <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
              <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-xs font-medium uppercase tracking-widest">Upload Banner</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button variant="secondary" className="bg-white/20 text-white backdrop-blur-sm border-0 pointer-events-none">
              <Camera className="w-4 h-4 mr-2" /> Change Banner
            </Button>
          </div>
          <input type="file" ref={bannerInputRef} onChange={handleBannerUpload} className="hidden" accept="image/*" />
        </div>

        {/* Profile Details Area */}
        <div className="px-6 sm:px-10 pb-10 relative">
          
          {/* Logo Upload (Avatar) */}
          <div className="relative -mt-12 sm:-mt-16 mb-6 flex justify-center sm:justify-start">
            <div 
              className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-[#0c0d12] bg-gray-900 overflow-hidden group cursor-pointer shadow-xl"
              onClick={() => logoInputRef.current?.click()}
            >
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                  <Camera className="w-8 h-8 opacity-50" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <input type="file" ref={logoInputRef} onChange={handleLogoUpload} className="hidden" accept="image/*" />
          </div>

          <div className="text-center sm:text-left mb-8">
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center justify-center sm:justify-start gap-2">
              How you'll appear <Video className="w-6 h-6 text-red-500" />
            </h1>
            <p className="text-gray-400 text-sm mt-1">Create a channel to start publishing videos and shorts.</p>
          </div>

          <div className="space-y-5">
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Name</Label>
              <Input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. BattleHub FF"
                className="bg-[#111218] border-gray-800 text-white focus:border-red-500 h-12 text-lg"
              />
            </div>
            
            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Handle</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-bold">@</span>
                <Input 
                  value={handle}
                  onChange={(e) => setHandle(e.target.value.replace(/\s/g, ''))}
                  placeholder="battlehub_ff"
                  className="bg-[#111218] border-gray-800 text-white focus:border-red-500 h-12 pl-8"
                />
              </div>
            </div>

            <div>
              <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Description (Optional)</Label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell viewers about your content..."
                className="w-full bg-[#111218] border border-gray-800 rounded-md text-white focus:outline-none focus:border-red-500 p-3 text-sm min-h-[100px] resize-none"
              />
            </div>
          </div>

          <div className="mt-10 flex flex-col sm:flex-row justify-end items-center gap-4 mt-auto pt-6 border-t border-gray-800/50">
            <p className="text-[11px] sm:text-xs text-gray-500 text-center sm:text-left flex-1">
              By clicking Create Channel, you agree to BattleHub's Terms of Service. Changes made here will be visible across the platform.
            </p>
            <Button 
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold h-12 px-8 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.3)]"
            >
              {isCreating ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating...</>
              ) : (
                <>Create Channel <ArrowRight className="w-5 h-5 ml-2" /></>
              )}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
}
