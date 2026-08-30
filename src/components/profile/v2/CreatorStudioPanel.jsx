import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Video, Image as ImageIcon, BarChart2, Plus, Play, ThumbsUp, MessageSquare, Eye, Calendar, MoreVertical, TrendingUp, Filter, Film, Clock, Settings, Globe, MessageCircle, AlertTriangle, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import MediaUploadModal from './MediaUploadModal';
import AnalyticsCharts from './AnalyticsCharts';
import VideoDetailModal from './VideoDetailModal';
import CreateChannelView from './CreateChannelView';
import { db, auth } from '@/api/firebaseClient';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { Channel, Notification, Follower } from '@/api/entities';
import { Report } from '@/entities/Report';
import EditChannelModal from './EditChannelModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";

export default function CreatorStudioPanel({ user, onClose }) {
  const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isEditChannelOpen, setIsEditChannelOpen] = useState(false);
  const [videoModal, setVideoModal] = useState({ video: null, mode: null });
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState(null);
  const [isCheckingChannel, setIsCheckingChannel] = useState(true);
  const { toast } = useToast();

  const handleDeletePost = async (postId) => {
    if (window.confirm("Are you sure you want to delete this video? This cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'media_posts', postId));
        setPosts(posts.filter(p => p.id !== postId));
        toast({ title: "Deleted", description: "Video deleted successfully." });
      } catch (err) {
        console.error("Failed to delete", err);
        toast({ title: "Error", description: "Failed to delete video.", variant: "destructive" });
      }
    }
  };

  const handleAppeal = async (post, e) => {
    if (e) e.stopPropagation();
    const reason = window.prompt("Explain why this video should not be banned:");
    if (!reason || !reason.trim()) return;

    try {
      await Report.create({
        type: 'media_appeal',
        target_id: post.id,
        reporter_id: user.id,
        reporter_ign: channel?.name || user.ign || user.full_name || 'Creator',
        reason: "Media Appeal",
        description: reason.trim(),
        evidence_urls: [post.media_url || post.video_url || ''],
        status: 'Pending',
        created_date: new Date().toISOString()
      });
      alert("Appeal submitted successfully! Admins will review it soon.");
    } catch (err) {
      console.error("Failed to submit appeal", err);
      alert("Failed to submit appeal. Please try again.");
    }
  };

  const handleToggleVisibility = async (post) => {
    const newStatus = post.status === 'private' ? 'published' : 'private';
    try {
      setPosts(posts.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
      
      if (post.id.length > 10) {
        await updateDoc(doc(db, 'media_posts', post.id), { status: newStatus });
      }

      Notification.create({
        recipient_id: user.id,
        title: "Visibility Updated",
        message: `Video is now ${newStatus}.`,
        type: "system",
        read: false
      }).catch(console.error);
    } catch (err) {
      console.error("Error updating visibility:", err);
    }
  };

  useEffect(() => {
    const checkChannel = async () => {
      if (!user?.id) return;
      try {
        const channels = await Channel.filter({ user_id: user.id });
        if (channels.length > 0) {
          setChannel(channels[0]);
        }
      } catch (err) {
        console.error("Error checking channel:", err);
      } finally {
        setIsCheckingChannel(false);
      }
    };
    checkChannel();
  }, [user?.id]);

  const [followerCount, setFollowerCount] = useState(0);
  useEffect(() => {
    if (channel?.user_id) {
      Follower.filter({ following_id: channel.user_id }).then(res => {
        if (res) setFollowerCount(res.length);
      }).catch(() => {});
    }
  }, [channel]);

  // Mock stats for overview
  const totalViews = posts.reduce((sum, post) => sum + (post.views || 0), 0);
  const totalLikes = posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0);
  const totalWatchTime = Math.floor(posts.reduce((sum, post) => sum + (post.watch_time || 0), 0));

  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        if (!user?.id) return;
        const q = query(collection(db, 'media_posts'), where('user_id', '==', user.id));
        const snap = await getDocs(q);
        const fetchedPosts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        if (fetchedPosts.length === 0) {
          const mockData = [
            {
              id: '1',
              type: 'video',
              title: 'Epic 1v4 Clutch in Ranked!',
              thumbnail_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80',
              views: 4500,
              likes: ['1','2','3','4'],
              comments_count: 45,
              created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
              status: 'published'
            },
            {
              id: '2',
              type: 'reel',
              title: 'New Sensitivity Settings 🔥',
              thumbnail_url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&q=80',
              views: 12500,
              likes: ['1','2','3'],
              comments_count: 120,
              created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
              status: 'published'
            }
          ];
          setPosts(mockData);
        } else {
          setPosts(fetchedPosts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)));
        }
      } catch (err) {
        console.error("Error fetching studio posts", err);
      } finally {
        setLoading(false);
      }
    };
    if (channel) {
      fetchPosts();
    }
  }, [channel]);

  if (isCheckingChannel) {
    return (
      <div className="h-full bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-800 border-t-red-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="h-full bg-slate-950 flex flex-col text-white pb-16 relative">
        <div className="sticky top-0 z-10 bg-slate-950 border-b border-gray-800 px-4 py-4 flex items-center gap-3">
          <button onClick={onClose} className="p-2 hover:bg-slate-900 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h1 className="text-xl font-black text-white">Back to Profile</h1>
        </div>
        <CreateChannelView user={user} onChannelCreated={setChannel} />
      </div>
    );
  }

  const renderTable = (filterType) => {
    const filteredPosts = posts.filter(p => p.type === filterType);

    return (
      <div className="bg-[#0c0d12] border border-gray-800 rounded-xl overflow-hidden mt-4">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#111218]">
          <h3 className="font-bold">{filterType === 'video' ? 'Your Videos' : 'Your Shorts'}</h3>
        </div>
        
        {loading ? (
          <div className="w-full flex flex-col divide-y divide-gray-800/50">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-row p-3 sm:p-4 gap-3 sm:gap-4 animate-pulse">
                <div className={`${filterType === 'reel' ? 'w-16 sm:w-24 aspect-[9/16]' : 'w-32 sm:w-40 h-20 sm:h-24'} bg-gray-800/60 rounded-lg shrink-0`}></div>
                <div className="flex-1 flex flex-col gap-3 py-1">
                  <div className="h-4 bg-gray-800/60 rounded-md w-3/4"></div>
                  <div className="h-3 bg-gray-800/60 rounded-md w-1/2"></div>
                  <div className="flex gap-4 mt-auto">
                    <div className="h-3 bg-gray-800/60 rounded-md w-8"></div>
                    <div className="h-3 bg-gray-800/60 rounded-md w-12"></div>
                    <div className="h-3 bg-gray-800/60 rounded-md w-10"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Video className="w-12 h-12 text-gray-600 mb-4" />
            <h3 className="text-lg font-bold text-gray-300">No content yet</h3>
            <p className="text-gray-500 text-sm mt-2 mb-6">Upload your first {filterType === 'reel' ? 'short' : 'video'} to start building your audience.</p>
            <Button onClick={() => setIsUploadOpen(true)} className="bg-slate-800 text-white hover:bg-slate-700">Upload Content</Button>
          </div>
        ) : (
          <div className="w-full flex flex-col divide-y divide-gray-800/50">
            {filteredPosts.map((post) => (
              <div 
                key={post.id} 
                onClick={() => setVideoModal({ video: post, mode: 'analytics' })}
                className="flex flex-row p-3 sm:p-4 gap-3 sm:gap-4 hover:bg-slate-900/50 transition-colors group cursor-pointer"
              >
                {/* Thumbnail */}
                <div className={`${post.type === 'reel' ? 'w-16 sm:w-24 aspect-[9/16]' : 'w-32 sm:w-40 h-20 sm:h-24'} bg-gray-800 rounded-lg overflow-hidden relative shrink-0`}>
                  <img src={post.thumbnail_url || 'https://via.placeholder.com/150'} alt={post.title} className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 right-1 bg-black/80 text-[9px] px-1 rounded text-white font-bold tracking-wider">
                    {formatDuration(post.duration)}
                  </div>
                </div>
                
                {/* Details */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col overflow-hidden mt-1">
                      <h4 className="font-bold text-gray-200 text-sm line-clamp-2 leading-tight uppercase tracking-tight">{post.title}</h4>
                      
                      {post.type === 'reel' && (
                         <div className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                           <BarChart2 className="w-3 h-3 text-gray-500" />
                           <span>{post.views?.toLocaleString() || 0}</span>
                           <span className="text-[10px]">•</span>
                           <span>{Math.floor(Math.random() * 5) + 1} months ago</span>
                         </div>
                      )}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 text-gray-500 hover:text-white shrink-0 -mt-1 -mr-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-gray-800 text-gray-300 z-[1100]">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setVideoModal({ video: post, mode: 'edit' }); }}>
                          Edit Details
                        </DropdownMenuItem>

                        <DropdownMenuSeparator className="bg-gray-800" />
                        <DropdownMenuItem 
                          onClick={(e) => { e.stopPropagation(); handleDeletePost(post.id); }} 
                          className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                        >
                          Delete Video
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  {/* Banned Alert */}
                  {post.status === 'banned' && (
                    <div className="mt-2 bg-red-500/10 border border-red-500/20 rounded-md p-2 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex flex-col">
                          <span className="text-red-500 text-[11px] font-black uppercase tracking-widest">Banned by Admin</span>
                          <span className="text-red-400/80 text-[10px] line-clamp-2 mt-0.5">{post.ban_reason || 'Violation of Community Guidelines'}</span>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={(e) => handleAppeal(post, e)}
                        className="h-6 text-[10px] px-2 py-0 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 shrink-0 uppercase tracking-wider font-bold"
                      >
                        Appeal
                      </Button>
                    </div>
                  )}

                  {/* Stats Row */}
                  <div className="mt-auto pt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-gray-400 font-medium">
                    {/* Status Badge (if not banned) */}
                    {post.status !== 'banned' && (
                      <div className={`flex items-center gap-1 ${post.status === 'private' ? 'text-yellow-500' : post.status === 'unpublished' ? 'text-gray-500' : 'text-emerald-500'}`}>
                        <Eye className="w-3.5 h-3.5" /> <span className="uppercase font-bold tracking-wider">{post.status || 'published'}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      <span>{new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <BarChart2 className="w-3.5 h-3.5" />
                      <span>{post.views?.toLocaleString() || 0}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <ThumbsUp className="w-3.5 h-3.5" />
                      <span>{post.likes?.length || post.likes || 0}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>{post.comments_count || 0}</span>
                    </div>

                    {post.type !== 'reel' && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{post.watch_time || Math.floor((post.views || 0) * 0.05) || 0}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full bg-slate-950 flex flex-col text-white pb-16 relative">
      {/* Studio Header */}
      <div className="sticky top-0 z-10 bg-slate-950 border-b border-gray-800 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-900 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 border-2 border-[#0c0d12]">
              <img src={channel.logo_url} alt="Channel Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-black flex items-center gap-2 text-white leading-tight">
                {channel.name}
              </h1>
              <p className="text-xs text-gray-400 font-medium">{channel.handle}</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="outline"
            size="icon"
            onClick={() => setIsEditChannelOpen(true)}
            className="bg-transparent border-gray-700 text-gray-300 hover:text-white hover:bg-slate-800 h-10 w-10 rounded-xl transition-all"
            title="Edit Channel Profile"
          >
            <Settings className="w-5 h-5" />
          </Button>
          <Button 
            onClick={() => setIsUploadOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold h-10 px-4 rounded-xl border border-slate-700 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" /> Upload
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-500">
            <AnalyticsCharts posts={posts} followerCount={followerCount} />
          </div>
        )}

        {activeTab === 'video' && (
          <div className="animate-in fade-in duration-500">
            {renderTable('video')}
          </div>
        )}

        {activeTab === 'shorts' && (
          <div className="animate-in fade-in duration-500">
            {renderTable('reel')}
          </div>
        )}
      </div>

      {/* New Custom Bottom Navigation for Studio */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-[#0c0d12] border-t border-gray-800 flex items-center justify-around z-[1100] px-4">
        <button 
          onClick={() => { setActiveTab('dashboard'); setVideoModal({ video: null, mode: null }); setIsUploadOpen(false); setIsEditChannelOpen(false); }} 
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
           <BarChart2 className="w-5 h-5" />
           <span className="text-[10px] font-bold uppercase tracking-wider">Dashboard</span>
        </button>
        <button 
          onClick={() => { setActiveTab('video'); setVideoModal({ video: null, mode: null }); setIsUploadOpen(false); setIsEditChannelOpen(false); }} 
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${activeTab === 'video' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
           <Video className="w-5 h-5" />
           <span className="text-[10px] font-bold uppercase tracking-wider">Video</span>
        </button>
        <button 
          onClick={() => { setActiveTab('shorts'); setVideoModal({ video: null, mode: null }); setIsUploadOpen(false); setIsEditChannelOpen(false); }} 
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${activeTab === 'shorts' ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
           <Film className="w-5 h-5" />
           <span className="text-[10px] font-bold uppercase tracking-wider">Shorts</span>
        </button>
      </div>

      {isUploadOpen && (
        <MediaUploadModal 
          isOpen={isUploadOpen} 
          onClose={() => setIsUploadOpen(false)} 
          user={user}
          onUploadComplete={() => {
            setIsUploadOpen(false);
          }}
        />
      )}

      {videoModal.video && (
        <VideoDetailModal 
          video={videoModal.video}
          user={user}
          initialMode={videoModal.mode}
          onClose={() => setVideoModal({ video: null, mode: null })}
          onSave={(updatedVideo) => {
            setPosts(posts.map(p => p.id === updatedVideo.id ? updatedVideo : p));
            setVideoModal({ video: null, mode: null });
          }}
        />
      )}

      {isEditChannelOpen && (
        <EditChannelModal 
          channel={channel}
          onClose={() => setIsEditChannelOpen(false)}
          onSave={(updatedChannel) => {
            setChannel(updatedChannel);
            setIsEditChannelOpen(false);
          }}
        />
      )}
    </div>
  );
}
