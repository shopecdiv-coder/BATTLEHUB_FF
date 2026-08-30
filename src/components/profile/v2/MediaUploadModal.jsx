import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Upload, Video, Image as ImageIcon, FileText, 
  CheckCircle2, ChevronRight, ChevronLeft, Globe, Lock, EyeOff, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { db } from '@/api/firebaseClient';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Notification, Channel } from '@/api/entities';
import { UploadFile } from '@/api/integrations';
import { cacheInvalidateAll } from '@/lib/cache';

const STEPS = [
  { id: 1, title: 'Media' },
  { id: 2, title: 'Details' },
  { id: 3, title: 'Elements' },
  { id: 4, title: 'Visibility' }
];

export default function MediaUploadModal({ isOpen, onClose, user, onUploadComplete }) {
  const [step, setStep] = useState(1);
  const [uploadType, setUploadType] = useState('video'); 
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [visibility, setVisibility] = useState('published');
  const [privateOptions, setPrivateOptions] = useState({ friends: false, followers: false });
  const [allowedUsers, setAllowedUsers] = useState([]);
  const [userTagInput, setUserTagInput] = useState('');
  const [commentsEnabled, setCommentsEnabled] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const [duration, setDuration] = useState(0);
  const isCancelledRef = useRef(false);

  const thumbInputRef = useRef(null);

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        if (video.videoHeight > video.videoWidth) {
           setUploadType('reel');
        }
        setDuration(video.duration || 0);
      };
      video.src = URL.createObjectURL(selectedFile);

      setStep(2);
    }
  };

  const handleCancelUpload = () => {
    isCancelledRef.current = true;
    setIsUploading(false);
    onClose();
  };

  const handleThumbnailUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setThumbnailUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleAddUserTag = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
      e.preventDefault();
      const tag = userTagInput.trim().replace(/^#/, '');
      if (tag && !allowedUsers.includes(tag)) {
        setAllowedUsers([...allowedUsers, tag]);
      }
      setUserTagInput('');
    }
  };

  const removeUserTag = (tagToRemove) => {
    setAllowedUsers(allowedUsers.filter(tag => tag !== tagToRemove));
  };

  const handleUpload = async () => {
    if (!title || !file) return;
    setIsUploading(true);
    setIsSuccess(false);
    isCancelledRef.current = false;
    setStep(5); // Show uploading screen
    setUploadedBytes(0);
    setTotalBytes(file.size);
    setProgress(0);

    try {
      // Real upload to Cloudinary using the existing integrations function
      const uploadResult = await UploadFile({ 
        file,
        onProgress: (loaded, total) => {
          if (isCancelledRef.current) return;
          setUploadedBytes(loaded);
          setTotalBytes(total);
          setProgress(Math.round((loaded / total) * 100));
        }
      });
      if (isCancelledRef.current) return;
      
      const videoUrl = uploadResult.file_url;
      const finalThumbnailUrl = thumbnailUrl || (videoUrl ? videoUrl.replace(/\.[^/.]+$/, ".jpg") : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80');
      
      setProgress(100);

      if (isCancelledRef.current) return;

      let author_name = user.ign || user.full_name || "User";
      let author_avatar = user.avatar_url || "";
      let author_role = user.role || "user";
      
      try {
        const channels = await Channel.filter({ user_id: user.id });
        if (channels && channels.length > 0) {
          author_name = channels[0].name;
          author_avatar = channels[0].logo_url;
        }
      } catch (err) {
        console.error("Failed to fetch channel", err);
      }

      await addDoc(collection(db, 'media_posts'), {
        user_id: user.id,
        author_name,
        author_avatar,
        author_role,
        type: uploadType,
        title,
        description,
        tags: tags.split(',').map(t => t.trim()),
        video_url: videoUrl,
        thumbnail_url: finalThumbnailUrl,
        duration: duration,
        views: 0,
        likes: [],
        saves: [],
        comments_disabled: !commentsEnabled,
        status: visibility,
        visibility_settings: visibility === 'private' ? {
          friends: privateOptions.friends,
          followers: privateOptions.followers,
          allowed_users: allowedUsers
        } : null,
        created_at: new Date().toISOString(),
        created_date: new Date().toISOString(),
        timestamp: serverTimestamp()
      });

      cacheInvalidateAll();

      Notification.create({
        recipient_id: user.id,
        title: "Upload Complete",
        message: `Your ${uploadType} has been successfully uploaded.`,
        type: "system",
        read: false
      }).catch(console.error);

      setIsSuccess(true);

      setTimeout(() => {
        setIsUploading(false);
        setIsSuccess(false);
        onUploadComplete();
      }, 2000);

    } catch (err) {
      console.error("Error uploading:", err);
      setIsUploading(false);
      clearInterval(interval);
      setStep(4);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0c0d12] border border-gray-800 rounded-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-[#111218]">
            <h2 className="text-xl font-bold text-white">{isUploading ? 'Uploading...' : 'Upload Content'}</h2>
            {!isUploading && (
              <button onClick={onClose} className="p-1.5 hover:bg-slate-900 rounded-full text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Stepper UI */}
          {!isUploading && step <= 4 && (
            <div className="px-6 py-4 bg-[#111218]/50 border-b border-gray-800">
              <div className="flex items-center justify-between">
                {STEPS.map((s, idx) => (
                  <React.Fragment key={s.id}>
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${
                        step === s.id ? 'bg-red-600 text-white ring-4 ring-red-600/20' : 
                        step > s.id ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'
                      }`}>
                        {step > s.id ? <CheckCircle2 className="w-5 h-5" /> : s.id}
                      </div>
                      <span className={`text-xs font-medium ${step >= s.id ? 'text-gray-200' : 'text-gray-600'}`}>{s.title}</span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${step > s.id ? 'bg-emerald-500' : 'bg-gray-800'}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          <div className="p-6 flex-1 overflow-y-auto">
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Select Content Type</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setUploadType('video')}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${uploadType === 'video' ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-slate-900 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'}`}
                    >
                      <Video className="w-8 h-8" />
                      <span className="font-bold text-sm">Long Video</span>
                    </button>
                    <button 
                      onClick={() => setUploadType('reel')}
                      className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${uploadType === 'reel' ? 'bg-orange-500/10 border-orange-500 text-orange-500' : 'bg-slate-900 border-gray-800 text-gray-400 hover:border-gray-600 hover:text-white'}`}
                    >
                      <FileText className="w-8 h-8" />
                      <span className="font-bold text-sm">Reel / Short</span>
                    </button>
                  </div>
                </div>

                <div className="border-2 border-dashed border-gray-700 rounded-2xl p-12 flex flex-col items-center justify-center text-center bg-slate-900/50 hover:bg-slate-900 transition-colors relative group cursor-pointer">
                  <input 
                    type="file" 
                    accept="video/*"
                    onChange={handleFileSelect}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">Select video to upload</h3>
                  <p className="text-gray-400 text-sm">Drag and drop or click to browse files.</p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-slate-900 p-4 rounded-xl border border-gray-800">
                  <div className="w-24 h-16 bg-black rounded-lg flex items-center justify-center border border-gray-700 overflow-hidden relative">
                     <span className="text-xs text-gray-500">{file?.name?.substring(0,10)}...</span>
                     <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5"><CheckCircle2 className="w-3 h-3 text-white"/></div>
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-sm truncate max-w-[200px]">{file?.name}</h4>
                    <p className="text-gray-500 text-xs">{(file?.size / (1024*1024)).toFixed(2)} MB</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="ml-auto text-red-500 hover:text-red-400 hover:bg-red-500/10">Change File</Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-300">Title (required)</label>
                    <Input 
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Add a catchy title..."
                      className="bg-slate-900 border-gray-700 text-white h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-300">Description</label>
                    <Textarea 
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Tell viewers about your video..."
                      className="bg-slate-900 border-gray-700 text-white min-h-[120px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-300">Tags</label>
                    <Input 
                      value={tags}
                      onChange={e => setTags(e.target.value)}
                      placeholder="gaming, headshot, freefire (comma separated)"
                      className="bg-slate-900 border-gray-700 text-white h-12"
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Custom Thumbnail</h3>
                  <p className="text-sm text-gray-400 mb-4">Select or upload a picture that shows what's in your video. A good thumbnail stands out and draws viewers' attention.</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div 
                      onClick={() => thumbInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-700 rounded-xl aspect-video flex flex-col items-center justify-center bg-slate-900/50 hover:bg-slate-900 hover:border-gray-500 cursor-pointer transition-all relative overflow-hidden"
                    >
                      {thumbnailUrl ? (
                        <img src={thumbnailUrl} alt="Custom Thumbnail" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <>
                          <ImageIcon className="w-8 h-8 text-gray-500 mb-2" />
                          <span className="text-sm text-gray-400 font-medium">Upload Thumbnail</span>
                        </>
                      )}
                      <input type="file" ref={thumbInputRef} accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Visibility</h3>
                  <p className="text-sm text-gray-400 mb-4">Choose who can see your video.</p>
                  
                  <div className="space-y-3">
                    <label className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all ${visibility === 'published' ? 'border-red-500 bg-red-500/5' : 'border-gray-800 bg-slate-900 hover:border-gray-700'}`}>
                      <input type="radio" name="visibility" value="published" checked={visibility === 'published'} onChange={() => setVisibility('published')} className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500 border-gray-600 bg-gray-700" />
                      <div>
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-emerald-500" />
                          <span className="font-bold text-white">Public</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Everyone can watch your video.</p>
                      </div>
                    </label>


                    <div className={`transition-all ${visibility === 'private' ? 'border-red-500 bg-red-500/5' : 'border-gray-800 bg-slate-900 hover:border-gray-700'} rounded-xl border`}>
                      <label className="flex items-start gap-4 p-4 cursor-pointer">
                        <input type="radio" name="visibility" value="private" checked={visibility === 'private'} onChange={() => setVisibility('private')} className="mt-1 w-4 h-4 text-red-600 focus:ring-red-500 border-gray-600 bg-gray-700" />
                        <div>
                          <div className="flex items-center gap-2">
                            <Lock className="w-4 h-4 text-red-500" />
                            <span className="font-bold text-white">Private</span>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">Only you and people you choose can watch your video.</p>
                        </div>
                      </label>
                      
                      <AnimatePresence>
                        {visibility === 'private' && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }} 
                            animate={{ opacity: 1, height: 'auto' }} 
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 pb-4 pt-2 border-t border-red-500/10 ml-8"
                          >
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Who exactly can see this?</h4>
                            
                            <div className="flex gap-6 mt-2">
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                  type="checkbox" 
                                  checked={privateOptions.friends} 
                                  onChange={(e) => setPrivateOptions({...privateOptions, friends: e.target.checked})}
                                  className="rounded border-gray-600 text-red-500 focus:ring-red-500 bg-gray-800 w-4 h-4"
                                />
                                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">My Friends</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-pointer group">
                                <input 
                                  type="checkbox" 
                                  checked={privateOptions.followers} 
                                  onChange={(e) => setPrivateOptions({...privateOptions, followers: e.target.checked})}
                                  className="rounded border-gray-600 text-red-500 focus:ring-red-500 bg-gray-800 w-4 h-4"
                                />
                                <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">My Followers</span>
                              </label>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Engagement Settings</h3>
                  <div className="flex items-center justify-between p-4 bg-slate-900 border border-gray-800 rounded-xl">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-blue-400" />
                      <div>
                        <span className="font-bold text-white text-sm block">Allow Comments</span>
                        <span className="text-xs text-gray-400">Viewers can comment on this video.</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={commentsEnabled} onChange={(e) => setCommentsEnabled(e.target.checked)} />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {step === 5 && isUploading && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="w-32 h-32 mb-8 relative">
                  {!isSuccess ? (
                    <svg className="animate-spin w-full h-full text-gray-800" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" stroke="currentColor"/>
                      <circle cx="50" cy="50" r="45" fill="none" strokeWidth="8" stroke="#ef4444" strokeDasharray="283" strokeDashoffset={283 - (progress/100)*283} className="transition-all duration-300"/>
                    </svg>
                  ) : (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-full h-full bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                    >
                      <motion.svg 
                        className="w-16 h-16 text-white" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </motion.svg>
                    </motion.div>
                  )}
                  {!isSuccess && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-white font-black text-2xl">{progress}%</span>
                    </div>
                  )}
                </div>
                <h3 className="text-3xl font-black text-white mb-3">{isSuccess ? 'Published!' : (progress === 100 ? 'Finalizing...' : 'Uploading...')}</h3>
                
                {/* Show real MB stats */}
                {!isSuccess && (
                  <div className="text-gray-400 text-sm font-bold mb-3 flex items-center gap-2">
                    <span className={progress === 100 ? "text-emerald-500" : "text-white"}>{(uploadedBytes / (1024 * 1024)).toFixed(2)} MB</span> 
                    <span>/</span> 
                    <span>{(totalBytes / (1024 * 1024)).toFixed(2)} MB</span>
                  </div>
                )}

                <p className="text-gray-400 text-base text-center max-w-sm">
                  {isSuccess 
                    ? 'Your video is now live on BATTLEHUB!'
                    : (progress === 100 ? 'Upload complete. Processing and saving your post...' : 'Please do not close this window until the upload finishes.')}
                </p>
                {progress < 100 && (
                  <Button variant="outline" onClick={handleCancelUpload} className="mt-8 border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors bg-transparent px-8 rounded-xl font-bold">
                    Cancel Upload
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          {!isUploading && step <= 4 && (
            <div className="p-4 border-t border-gray-800 flex justify-between bg-[#111218]">
              {step > 1 ? (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="bg-transparent border-gray-700 text-gray-300 hover:bg-slate-800">
                  <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              ) : (
                <div /> // Spacer
              )}
              
              {step < 4 ? (
                <Button 
                  onClick={() => setStep(step + 1)} 
                  disabled={(step === 1 && !file) || (step === 2 && !title)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-6"
                >
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={handleUpload} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 shadow-lg shadow-emerald-500/20"
                >
                  Publish Content
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
