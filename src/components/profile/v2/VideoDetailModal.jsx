import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Eye, ThumbsUp, Clock, Image as ImageIcon, Video, Calendar, Upload, BarChart2, MessageSquare, Lock, Globe, EyeOff, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/api/firebaseClient';
import { useToast } from '@/components/ui/use-toast';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { Notification } from '@/api/entities';
import BHTVPlayer from '@/components/ui/BHTVPlayer';
import { MediaComment } from '@/entities/MediaComment';

export default function VideoDetailModal({ video, user, initialMode = 'analytics', onClose, onSave }) {
  const [title, setTitle] = useState(video.title || '');
  const [description, setDescription] = useState(video.description || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(video.thumbnail_url || '');
  const [commentsEnabled, setCommentsEnabled] = useState(video.comments_enabled !== false);
  const [videoStatus, setVideoStatus] = useState(video.status || 'published'); // 'published' | 'private' | 'unpublished'
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [timeRange, setTimeRange] = useState(7);
  const [comments, setComments] = useState([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  React.useEffect(() => {
    if (initialMode === 'analytics') {
      setIsLoadingComments(true);
      MediaComment.filter({ post_id: video.id }).then(fetchedComments => {
        fetchedComments.sort((a, b) => new Date(b.created_date || b.created_at) - new Date(a.created_date || a.created_at));
        setComments(fetchedComments);
        setIsLoadingComments(false);
      }).catch(err => {
        setComments([]);
        setIsLoadingComments(false);
      });
    }
  }, [video.id, initialMode]);

  const handleLikeComment = async (comment) => {
    if (!user) return;
    try {
      const isLiked = await MediaComment.toggleLike(comment.id, user.id);
      setComments(prev => prev.map(c => {
        if (c.id === comment.id) {
          const newLikes = isLiked 
            ? [...(c.likes || []), user.id]
            : (c.likes || []).filter(id => id !== user.id);
          return { ...c, likes: newLikes };
        }
        return c;
      }));
    } catch (e) {
      console.error("Error liking comment", e);
    }
  };

  const handleLikeReply = async (commentId, replyId) => {
    if (!user) return;
    try {
      let isLiked = false;
      const newComments = comments.map(c => {
        if (c.id === commentId) {
          const newReplies = (c.replies || []).map(r => {
            if (r.id === replyId) {
              isLiked = !(r.likes || []).includes(user.id);
              const newLikes = isLiked
                ? [...(r.likes || []).filter(id => id !== user.id), user.id]
                : (r.likes || []).filter(id => id !== user.id);
              return { ...r, likes: newLikes };
            }
            return r;
          });
          return { ...c, replies: newReplies };
        }
        return c;
      });
      
      setComments(newComments);
      const updatedComment = newComments.find(c => c.id === commentId);
      if (updatedComment) {
        await MediaComment.update(commentId, { replies: updatedComment.replies });
      }
    } catch (e) {
      console.error("Error liking reply", e);
    }
  };

  const handleStarComment = async (comment) => {
    if (!user) return;
    try {
      const newStarredStatus = !comment.creator_starred;
      await MediaComment.update(comment.id, { creator_starred: newStarredStatus });
      setComments(prev => prev.map(c => c.id === comment.id ? { ...c, creator_starred: newStarredStatus } : c));
    } catch (e) {
      console.error("Error starring comment", e);
    }
  };

  const handleStarReply = async (commentId, replyId) => {
    if (!user) return;
    try {
      const newComments = comments.map(c => {
        if (c.id === commentId) {
          const newReplies = (c.replies || []).map(r => r.id === replyId ? { ...r, creator_starred: !r.creator_starred } : r);
          return { ...c, replies: newReplies };
        }
        return c;
      });
      setComments(newComments);
      const updatedComment = newComments.find(c => c.id === commentId);
      if (updatedComment) {
        await MediaComment.update(commentId, { replies: updatedComment.replies });
      }
    } catch (e) {
      console.error("Error starring reply", e);
    }
  };

  const retentionData = React.useMemo(() => {
    const data = [];
    const hasViews = video.views > 0;
    const durationSec = video.duration || 60; // default 60s if not set
    for (let i = 0; i <= 100; i += 5) {
      let retention = hasViews ? Math.round(Math.max(10, 100 - i * 0.8 + (Math.random() * 4 - 2))) : 0;
      if (i === 0) retention = 100;
      if (retention > 100) retention = 100;
      
      const timeSec = Math.round((i / 100) * durationSec);
      const m = Math.floor(timeSec / 60);
      const s = timeSec % 60;
      const timeStr = `${m}:${s.toString().padStart(2, '0')}`;
      
      data.push({ 
        percent: timeStr, 
        retention: retention 
      });
    }
    return data;
  }, [video.views, video.duration]);

  const viewsData = React.useMemo(() => {
    const data = [];
    const totalViews = video.views || 0;
    const publishDateStr = video.created_at || video.created_date;
    const publishDate = publishDateStr ? new Date(publishDateStr) : new Date();
    
    let points = timeRange;
    let isHourly = false;
    let isMonthly = false;
    let labelFormat = { month: 'short', day: 'numeric' };

    if (timeRange === 1) {
      points = 24;
      isHourly = true;
      labelFormat = { hour: '2-digit', minute: '2-digit' };
    } else if (timeRange === 180) {
      points = 6;
      isMonthly = true;
      labelFormat = { month: 'short', year: '2-digit' };
    } else if (timeRange === 365) {
      points = 12;
      isMonthly = true;
      labelFormat = { month: 'short', year: '2-digit' };
    } else if (timeRange === 730) {
      points = 24;
      isMonthly = true;
      labelFormat = { month: 'short', year: '2-digit' };
    }

    const pointDates = [];
    for (let i = 0; i < points; i++) {
      const date = new Date();
      if (isHourly) {
        date.setHours(date.getHours() - (points - 1 - i));
      } else if (isMonthly) {
        date.setMonth(date.getMonth() - (points - 1 - i));
      } else {
        date.setDate(date.getDate() - (points - 1 - i));
      }
      pointDates.push(date);
    }

    const isSamePeriod = (d1, d2) => {
      if (isHourly) return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate() && d1.getHours() === d2.getHours();
      if (isMonthly) return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();
      return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    };

    let validPointsCount = 0;
    for (const d of pointDates) {
      if (d > publishDate || isSamePeriod(d, publishDate)) {
        validPointsCount++;
      }
    }
    if (validPointsCount === 0) validPointsCount = 1;

    const increments = [];
    if (totalViews > 0) {
      let remaining = totalViews;
      for (let i = 0; i < validPointsCount - 1; i++) {
        const maxIncrement = remaining / (validPointsCount - i) * 1.5;
        const increment = Math.round(Math.random() * maxIncrement);
        increments.push(increment);
        remaining -= increment;
      }
      increments.push(remaining);
    } else {
      for (let i = 0; i < validPointsCount; i++) increments.push(0);
    }

    let incrementIdx = 0;
    for (let i = 0; i < points; i++) {
      const d = pointDates[i];
      if (d < publishDate && !isSamePeriod(d, publishDate)) {
        data.push({ 
          date: d.toLocaleString('en-US', labelFormat), 
          views: 0 
        });
      } else {
        data.push({ 
          date: d.toLocaleString('en-US', labelFormat), 
          views: increments[incrementIdx] || 0
        });
        incrementIdx++;
      }
    }
    return data;
  }, [video.views, video.created_at, video.created_date, timeRange]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailUrl(reader.result);
        toast({
          title: "Thumbnail Selected",
          description: "Your new thumbnail is ready to be saved.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // If it's a real Firebase document with a long ID (not a mock one like '1' or '2')
      if (video.id.length > 10) {
        const docRef = doc(db, 'media_posts', video.id);
        await updateDoc(docRef, {
          title,
          description,
          thumbnail_url: thumbnailUrl,
          comments_enabled: commentsEnabled,
          comments_disabled: !commentsEnabled,
          status: videoStatus
        });
      }


      onSave({
        ...video,
        title,
        description,
        thumbnail_url: thumbnailUrl,
        comments_enabled: commentsEnabled,
        comments_disabled: !commentsEnabled,
        status: videoStatus
      });

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);

    } catch (err) {
      console.error("Error saving video details", err);
      toast({
        title: "Error",
        description: "Could not save details. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[1300] bg-slate-950 flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-800 bg-[#111218]">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              {initialMode === 'edit' ? <Upload className="w-5 h-5 text-red-500" /> : <BarChart2 className="w-5 h-5 text-red-500" />}
              {initialMode === 'edit' ? 'Edit Video Details' : 'Video Analytics'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-gray-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 text-gray-300">
            <div className="grid grid-cols-1 max-w-3xl mx-auto gap-8">
              
              {/* Edit Details Mode */}
              {initialMode === 'edit' && (
                <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Edit Content</h3>
                  
                  <div className="space-y-4">
                    {/* Thumbnail Edit */}
                    <div>
                      <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Thumbnail</Label>
                      <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden border-2 border-dashed border-gray-700 group flex items-center justify-center">
                        {thumbnailUrl ? (
                          <>
                            <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Button variant="secondary" onClick={() => fileInputRef.current?.click()} className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border-0">
                                <Upload className="w-4 h-4 mr-2" /> Change Image
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="text-center p-4">
                            <ImageIcon className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                            <p className="text-xs text-gray-500">No thumbnail available</p>
                            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="mt-3 border-gray-700 bg-transparent text-gray-400 hover:text-white hover:bg-gray-800">
                              Upload Image
                            </Button>
                          </div>
                        )}
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                        />
                      </div>
                    </div>

                    {/* Title */}
                    <div>
                      <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Title</Label>
                      <Input 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        className="bg-[#0c0d12] border-gray-800 text-white focus:border-red-500 h-12"
                        placeholder="Add a catchy title..."
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <Label className="text-gray-400 text-xs uppercase tracking-wider mb-2 block">Description</Label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-[#0c0d12] border border-gray-800 rounded-md text-white focus:outline-none focus:border-red-500 p-3 text-sm min-h-[120px] resize-none transition-colors"
                        placeholder="Tell viewers about your video..."
                      />
                    </div>

                    {/* Visibility & Settings */}
                    <div className="bg-[#0c0d12] border border-gray-800 rounded-xl overflow-hidden">
                      <div className="px-4 pt-4 pb-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Visibility &amp; Settings</p>
                      </div>

                      {/* 3-State Status Selector */}
                      <div className="px-4 pb-3">
                        <p className="text-[10px] text-gray-500 mb-2">Video Status</p>
                        <div className="grid grid-cols-3 gap-1.5 bg-black/30 p-1 rounded-xl">
                          {[
                            { val: 'published',   label: 'Public',      icon: Globe,      color: 'text-emerald-400', bg: 'bg-emerald-500/20 border-emerald-500/40' },
                            { val: 'private',     label: 'Private',     icon: Lock,       color: 'text-yellow-400',  bg: 'bg-yellow-500/20 border-yellow-500/40' },
                            { val: 'unpublished', label: 'Unpublish',   icon: EyeOff,     color: 'text-gray-400',    bg: 'bg-gray-700/40 border-gray-600/40' },
                          ].map(({ val, label, icon: Icon, color, bg }) => (
                            <button
                              key={val}
                              onClick={() => setVideoStatus(val)}
                              className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
                                videoStatus === val
                                  ? `${bg} ${color}`
                                  : 'border-transparent text-gray-600 hover:text-gray-400'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {label}
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-gray-600 mt-2">
                          {videoStatus === 'published'   && '✅ Visible to everyone on your profile'}
                          {videoStatus === 'private'     && '🔒 Only you can see this video'}
                          {videoStatus === 'unpublished' && '📂 Hidden from public but visible in your dashboard'}
                        </p>
                      </div>

                      <div className="h-px bg-gray-800/60 mx-4" />

                      {/* Comments Toggle */}
                      <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${commentsEnabled ? 'bg-blue-500/15' : 'bg-gray-800'}`}>
                            {commentsEnabled ? <MessageSquare className="w-4 h-4 text-blue-400" /> : <EyeOff className="w-4 h-4 text-gray-500" />}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">Comments {commentsEnabled ? 'On' : 'Off'}</p>
                            <p className="text-[10px] text-gray-500">{commentsEnabled ? 'Viewers can comment' : 'Comments are disabled'}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setCommentsEnabled(p => !p)}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-300 focus:outline-none flex-shrink-0 ${
                            commentsEnabled ? 'bg-blue-500' : 'bg-gray-700'
                          }`}
                        >
                          <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                            commentsEnabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`} />
                        </button>
                      </div>

                    </div>

                  </div>
                </div>
                </div>
              )}

              {/* Analytics Mode */}
              {initialMode === 'analytics' && (
                <div className="space-y-6">
                  {/* Video Player in Analytics Mode */}
                  <div className="w-full aspect-video bg-black rounded-xl overflow-hidden mb-4 shadow-lg border border-gray-800">
                    {video.video_url ? (
                      <BHTVPlayer 
                        src={video.video_url} 
                        poster={video.thumbnail_url}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img src={video.thumbnail_url || 'https://via.placeholder.com/800'} alt="Thumbnail" className="w-full h-full object-cover opacity-50" />
                    )}
                  </div>
                  <div className="mb-6">
                    <h3 className="font-black text-white text-xl leading-tight">{video.title}</h3>
                    <p className="text-sm text-gray-400 mt-2 line-clamp-3">{video.description}</p>
                  </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-4">Video Analytics</h3>
                  
                  {/* Quick Stats Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#0c0d12] border border-gray-800 rounded-xl p-4 flex flex-col">
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                        <Eye className="w-3 h-3" /> Views
                      </p>
                      <p className="text-2xl font-black text-white">{video.views?.toLocaleString() || 0}</p>
                    </div>
                    
                    <div className="bg-[#0c0d12] border border-gray-800 rounded-xl p-4 flex flex-col">
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                        <ThumbsUp className="w-3 h-3" /> Likes
                      </p>
                      <p className="text-2xl font-black text-white">{video.likes?.length || video.likes || 0}</p>
                    </div>

                    <div className="bg-[#0c0d12] border border-gray-800 rounded-xl p-4 flex flex-col">
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Watch Time (Hrs)
                      </p>
                      <p className="text-2xl font-black text-white">{video.watch_time || Math.floor((video.views || 0) * 0.05) || 0}</p>
                    </div>

                    <div className="bg-[#0c0d12] border border-gray-800 rounded-xl p-4 flex flex-col justify-center">
                      <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wider mb-1 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Published On
                      </p>
                      <p className="text-sm font-bold text-gray-300">
                        {new Date(video.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>

                  {/* Audience Retention Chart */}
                  <div className="bg-[#0c0d12] border border-gray-800 rounded-xl p-5">
                    <div className="flex justify-between items-center mb-1">
                      <h4 className="font-bold text-white flex items-center gap-2"><BarChart2 className="w-4 h-4 text-cyan-400" /> Audience Retention</h4>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">This chart shows how many viewers are still watching at each part of your video. 100% means everyone is watching, lower means they left.</p>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={retentionData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.4}/>
                              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                          <XAxis dataKey="percent" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} minTickGap={20} />
                          <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }} 
                            itemStyle={{ color: '#e2e8f0', fontWeight: 'bold' }} 
                            labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                            formatter={(value) => [`${value}%`, 'Retained']}
                          />
                          <Area type="monotone" dataKey="retention" name="Retention %" stroke="#94a3b8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRetention)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Views Over Time */}
                    <div className="bg-[#0c0d12] border border-gray-800 rounded-xl p-5 flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-white">Views Since Publish</h4>
                        <select 
                          value={timeRange} 
                          onChange={(e) => setTimeRange(Number(e.target.value))}
                          className="bg-slate-900 border border-gray-800 text-gray-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-red-500 cursor-pointer"
                        >
                          <option value={1}>Last 24 Hours</option>
                          <option value={7}>Last 7 Days</option>
                          <option value={28}>Last 28 Days</option>
                          <option value={180}>Last 6 Months</option>
                          <option value={365}>Last 1 Year</option>
                          <option value={730}>Overall</option>
                        </select>
                      </div>
                      <div className="h-[200px] min-h-[200px] w-full shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={viewsData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} cursor={{fill: '#1e293b'}} />
                            <Bar dataKey="views" name="Views" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Comments Section */}
                  <div className="bg-[#0c0d12] border border-gray-800 rounded-xl p-5 mt-6">
                    <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      Recent Comments ({comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0)})
                    </h4>
                    
                    {isLoadingComments ? (
                      <div className="text-center py-8">
                        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">Loading comments...</p>
                      </div>
                    ) : comments.length === 0 ? (
                      <div className="text-center py-8 bg-[#151720] rounded-lg border border-gray-800/50">
                        <MessageSquare className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No comments on this video yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {comments.map(comment => (
                          <div key={comment.id} className="flex gap-3">
                            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700">
                              <img 
                                src={comment.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.user_id}`} 
                                alt="Avatar" 
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              {/* Parent Comment */}
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="font-bold text-xs text-gray-200">@{comment.username}</span>
                                <span className="text-[10px] text-gray-500">
                                  {new Date(comment.created_date || comment.created_at).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-[13px] text-gray-200 leading-snug whitespace-pre-wrap">
                                {comment.text}
                                {comment.creator_starred && (
                                  <span className="inline-flex relative group cursor-pointer ml-1.5 align-middle">
                                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 drop-shadow-sm" />
                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-800/90 border border-gray-700 px-2 py-1 rounded-md text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999] shadow-xl">
                                      {video?.channel_name || user?.ign || 'Creator'}
                                    </span>
                                  </span>
                                )}
                              </p>
                              
                              <div className="flex items-center gap-4 mt-2">
                                <button 
                                  onClick={() => handleLikeComment(comment)}
                                  className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-white transition-colors"
                                  title="Like this comment"
                                >
                                  <Heart className={`w-3.5 h-3.5 ${(comment.likes || []).includes(user?.id) ? "fill-red-500 text-red-500" : ""}`} />
                                  {(comment.likes || []).length > 0 && <span>{(comment.likes || []).length}</span>}
                                </button>
                                <button
                                  onClick={() => handleStarComment(comment)}
                                  className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-amber-400 transition-colors"
                                  title={comment.creator_starred ? "Remove Creator Star" : "Give Creator Star"}
                                >
                                  <Star className={`w-3.5 h-3.5 ${comment.creator_starred ? "fill-amber-400 text-amber-400" : ""}`} />
                                </button>
                              </div>

                              {/* Replies List */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div className="mt-3 pl-4 border-l-2 border-gray-800/60 space-y-3">
                                  {comment.replies.map(reply => (
                                    <div key={reply.id} className="flex gap-2">
                                      <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-800">
                                        <img 
                                          src={reply.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${reply.user_id}`} 
                                          alt="Avatar" 
                                          className="w-full h-full object-cover" 
                                        />
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-0.5">
                                          <span className="font-bold text-xs text-gray-200">@{reply.username}</span>
                                          <span className="text-[10px] text-gray-500">
                                            {new Date(reply.created_date || reply.created_at).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <p className="text-[13px] text-gray-200 leading-snug whitespace-pre-wrap">
                                          {reply.text}
                                          {reply.creator_starred && (
                                            <span className="inline-flex relative group cursor-pointer ml-1.5 align-middle">
                                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 drop-shadow-sm" />
                                              <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-800/90 border border-gray-700 px-2 py-1 rounded-md text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999] shadow-xl">
                                                {video?.channel_name || user?.ign || 'Creator'}
                                              </span>
                                            </span>
                                          )}
                                        </p>
                                        <div className="flex items-center gap-4 mt-1.5">
                                          <button 
                                            onClick={() => handleLikeReply(comment.id, reply.id)}
                                            className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-white transition-colors"
                                            title="Like this reply"
                                          >
                                            <Heart className={`w-3.5 h-3.5 ${(reply.likes || []).includes(user?.id) ? "fill-red-500 text-red-500" : ""}`} />
                                            {(reply.likes || []).length > 0 && <span>{(reply.likes || []).length}</span>}
                                          </button>
                                          <button
                                            onClick={() => handleStarReply(comment.id, reply.id)}
                                            className="flex items-center gap-1 text-[11px] font-medium text-gray-400 hover:text-amber-400 transition-colors"
                                            title={reply.creator_starred ? "Remove Creator Star" : "Give Creator Star"}
                                          >
                                            <Star className={`w-3.5 h-3.5 ${reply.creator_starred ? "fill-amber-400 text-amber-400" : ""}`} />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
                </div>
              )}

            </div>
          </div>

          {/* Sticky Save Footer — above bottom nav */}
          {initialMode === 'edit' && (
            <div className="p-4 bg-[#0c0d12]/95 backdrop-blur border-t border-white/5 flex items-center justify-between gap-3 flex-shrink-0">
              {/* Live status pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full font-black text-[9px] border transition-all ${
                  videoStatus === 'published'   ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : videoStatus === 'private'   ? 'bg-yellow-500/10  text-yellow-400  border-yellow-500/20'
                  :                               'bg-gray-800       text-gray-500    border-gray-700'
                }`}>
                  { videoStatus === 'published'   ? <Globe         className="w-2.5 h-2.5" />
                  : videoStatus === 'private'     ? <Lock          className="w-2.5 h-2.5" />
                  :                                 <EyeOff        className="w-2.5 h-2.5" /> }
                  {videoStatus.charAt(0).toUpperCase() + videoStatus.slice(1)}
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full font-black text-[9px] border transition-all ${
                  commentsEnabled ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-gray-800 text-gray-500 border-gray-700'
                }`}>
                  <MessageSquare className="w-2.5 h-2.5" />
                  {commentsEnabled ? 'Comments On' : 'Off'}
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all duration-300 shadow-lg flex-shrink-0 ${
                  isSaved
                    ? 'bg-emerald-500 shadow-emerald-500/30 scale-105'
                    : 'bg-red-600 hover:bg-red-500 shadow-red-600/20 hover:scale-105 active:scale-95'
                } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isSaving ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /><span>Saving...</span></>
                ) : isSaved ? (
                  <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg><span>Updated!</span></>
                ) : (
                  <><Save className="w-4 h-4" /><span>Save</span></>
                )}
              </button>
            </div>
          )}
      </motion.div>
    </AnimatePresence>
  );
}
