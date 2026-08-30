import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CommunityPost } from '@/entities/CommunityPost';
import { User } from '@/entities/User';
import { Loader2, ThumbsUp, ThumbsDown, MessageSquare, MoreVertical, Plus, Image as ImageIcon, CheckCircle, XCircle, X, Flag, Trash2, Send, Heart, Eye, BadgeCheck, Pin, Check, ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import CreatePostModal from './CreatePostModal';
import { createPageUrl } from '@/utils';
import { Report, Follower, Channel } from '@/api/entities';
import PlayerProfile from '@/pages/PlayerProfile';
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { createPortal } from 'react-dom';
import { formatDistanceToNow } from 'date-fns';
import { containsProfanity } from '@/utils/profanityFilter';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const safeFormatDistance = (d) => {
  try {
    if (!d) return "Unknown";
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "Unknown";
    return formatDistanceToNow(dateObj, { addSuffix: true });
  } catch (e) {
    return "Unknown";
  }
};

export default function CommunityFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [channelsMap, setChannelsMap] = useState({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  // New UI states
  const [activeTab, setActiveTab] = useState('all');
  const [follows, setFollows] = useState({});
  const [activeMenuPostId, setActiveMenuPostId] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null); // { urls: string[], index: number }
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [viewProfileId, setViewProfileId] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [expandedTexts, setExpandedTexts] = useState({});
  const isAdmin = user?.role === 'admin' || user?.email === 'shopecdiv@gmail.com';

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  useEffect(() => {
    User.me().then(u => {
      setUser(u);
      if (u) loadFollows(u.id);
    }).catch(() => setUser(null));
    loadPosts();
  }, []);

  const loadFollows = async (userId) => {
    try {
      const myFollows = await Follower.filter({ follower_id: userId });
      const followsMap = {};
      myFollows.forEach(f => {
        followsMap[f.following_id] = f.id;
      });
      setFollows(followsMap);
    } catch(e) {}
  };

  const fetchChannelsForPosts = async (postsList) => {
    try {
      const authorIds = [...new Set(postsList.map(p => p.author_id))];
      if (authorIds.length > 0) {
        const channels = await Promise.all(authorIds.map(id => Channel.filter({ user_id: id })));
        const cMap = {};
        channels.forEach((cArr, i) => {
          if (cArr && cArr.length > 0) cMap[authorIds[i]] = cArr[0];
        });
        setChannelsMap(prev => ({ ...prev, ...cMap }));
      }
    } catch(e) {}
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const fetchedPosts = await CommunityPost.filter({});
      fetchedPosts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      fetchedPosts.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return 0;
      });
      const topPosts = fetchedPosts.slice(0, 50);
      setPosts(topPosts);
      fetchChannelsForPosts(topPosts);
    } catch (e) {
      console.error("Error loading community posts", e);
    }
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const fetchedPosts = await CommunityPost.filter({});
      fetchedPosts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
      fetchedPosts.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return 0;
      });
      const topPosts = fetchedPosts.slice(0, 50);
      setPosts(topPosts);
      fetchChannelsForPosts(topPosts);
    } catch (e) {}
    setRefreshing(false);
  };



  const handleFollowToggle = async (authorId) => {
    if (!user) return alert("Please login to follow");
    try {
      if (follows[authorId]) {
        await Follower.delete(follows[authorId]);
        setFollows(prev => {
          const next = { ...prev };
          delete next[authorId];
          return next;
        });
      } else {
        // Prevent duplicate: check if already following
        const existing = await Follower.filter({ follower_id: user.id, following_id: authorId });
        if (existing && existing.length > 0) {
          setFollows(prev => ({ ...prev, [authorId]: existing[0].id }));
          return;
        }
        const newFollow = await Follower.create({
          follower_id: user.id,
          following_id: authorId
        });
        setFollows(prev => ({ ...prev, [authorId]: newFollow.id }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePin = async (post) => {
    if (!isAdmin) return;
    try {
      await CommunityPost.update(post.id, { is_pinned: !post.is_pinned });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: !post.is_pinned } : p));
      setActiveMenuPostId(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLike = async (post) => {
    if (!user) return alert("Please login to like");
    const isLiked = post.likes?.includes(user.id);
    const newLikes = isLiked 
      ? (post.likes || []).filter(id => id !== user.id)
      : [...(post.likes || []), user.id];
    
    // Remove from dislikes if liking
    const newDislikes = (post.dislikes || []).filter(id => id !== user.id);

    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: newLikes, dislikes: newDislikes } : p));
    try {
      await CommunityPost.update(post.id, { likes: newLikes, dislikes: newDislikes });
    } catch (e) {}
  };

  const handleDislike = async (post) => {
    if (!user) return alert("Please login to dislike");
    const isDisliked = post.dislikes?.includes(user.id);
    const newDislikes = isDisliked 
      ? (post.dislikes || []).filter(id => id !== user.id)
      : [...(post.dislikes || []), user.id];
    
    // Remove from likes if disliking
    const newLikes = (post.likes || []).filter(id => id !== user.id);

    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, dislikes: newDislikes, likes: newLikes } : p));
    try {
      await CommunityPost.update(post.id, { dislikes: newDislikes, likes: newLikes });
    } catch (e) {}
  };

  const handleVote = async (post, optionIndex) => {
    if (!user) return alert("Please login to vote");

    // Block changing vote if it's a quiz and already voted
    if (post.type === 'quiz' && post.votes && post.votes[user.id] !== undefined) {
      return; 
    }

    const newVotes = { ...(post.votes || {}) };
    newVotes[user.id] = optionIndex;

    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, votes: newVotes } : p));
    
    try {
      await CommunityPost.update(post.id, { votes: newVotes });
    } catch (e) {}
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await CommunityPost.delete(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (e) {
      alert("Failed to delete");
    }
  };

  const handleReport = async (postId) => {
    if (!user) return;
    const reason = window.prompt("Why are you reporting this post?");
    if (!reason || !reason.trim()) {
      setActiveMenuPostId(null);
      return;
    }
    try {
      const post = posts.find(p => p.id === postId);
      
      let evidence_urls = [];
      if (post?.image_url) evidence_urls.push(post.image_url);
      if (post?.options) {
        post.options.forEach(opt => {
          if (opt.image_url) evidence_urls.push(opt.image_url);
        });
      }

      await Report.create({
        type: 'community_post',
        target_id: postId,
        reporter_id: user.id,
        reporter_ign: user.ign || user.full_name || 'User',
        reported_user_id: post?.author_id || 'unknown',
        reported_ign: post?.author_name || post?.author_ign || 'Unknown User',
        reason: "Community Post Violation",
        description: `Reason: ${reason.trim()}\nPost Content: ${post?.text || 'Image/Poll Post'}`,
        evidence_urls: evidence_urls,
        status: 'Pending',
        created_date: new Date().toISOString()
      });
      alert("Post reported to admins for review.");
    } catch (e) {
      console.error("Failed to report", e);
    }
    setActiveMenuPostId(null);
  };

  const renderCommentText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) return <span key={i} className="text-cyan-400 font-medium">{part}</span>;
      return <span key={i}>{part}</span>;
    });
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !user || !activeCommentPost) return;
    
    if (containsProfanity(newComment)) {
      alert("Inappropriate language detected. Please modify your text.");
      return;
    }

    setSendingComment(true);
    const commentData = {
      id: Date.now().toString(),
      userId: user.id,
      username: user.ign || user.full_name || 'Player',
      avatar: user.avatar_url || '',
      text: newComment.trim(),
      created_date: new Date().toISOString(),
      likes: [],
      replies: []
    };

    let newComments = [...(activeCommentPost.comments || [])];
    
    if (replyingTo) {
      newComments = newComments.map(c => {
        if (c.id === replyingTo.id) {
          return { ...c, replies: [...(c.replies || []), commentData] };
        }
        return c;
      });
    } else {
      newComments.push(commentData);
    }
    
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === activeCommentPost.id ? { ...p, comments: newComments } : p));
    setActiveCommentPost(prev => ({ ...prev, comments: newComments }));
    setNewComment("");
    setReplyingTo(null);

    try {
      await CommunityPost.update(activeCommentPost.id, { comments: newComments });
    } catch (err) {}
    
    setSendingComment(false);
  };

  const handleLikeComment = async (comment) => {
    if (!user || !activeCommentPost) return;
    const isLiked = (comment.likes || []).includes(user.id);
    const newLikes = isLiked 
      ? (comment.likes || []).filter(id => id !== user.id)
      : [...(comment.likes || []), user.id];
      
    const newComments = (activeCommentPost.comments || []).map(c => {
      if (c.id === comment.id) return { ...c, likes: newLikes };
      return c;
    });
    
    setPosts(prev => prev.map(p => p.id === activeCommentPost.id ? { ...p, comments: newComments } : p));
    setActiveCommentPost(prev => ({ ...prev, comments: newComments }));
    try {
      await CommunityPost.update(activeCommentPost.id, { comments: newComments });
    } catch (err) {}
  };

  const handleLikeReply = async (commentId, replyId) => {
    if (!user || !activeCommentPost) return;
    
    const newComments = (activeCommentPost.comments || []).map(c => {
      if (c.id === commentId) {
        const newReplies = (c.replies || []).map(r => {
          if (r.id === replyId) {
            const isLiked = (r.likes || []).includes(user.id);
            const newLikes = isLiked ? (r.likes || []).filter(id => id !== user.id) : [...(r.likes || []), user.id];
            return { ...r, likes: newLikes };
          }
          return r;
        });
        return { ...c, replies: newReplies };
      }
      return c;
    });
    
    setPosts(prev => prev.map(p => p.id === activeCommentPost.id ? { ...p, comments: newComments } : p));
    setActiveCommentPost(prev => ({ ...prev, comments: newComments }));
    try {
      await CommunityPost.update(activeCommentPost.id, { comments: newComments });
    } catch (err) {}
  };

  const navigateToProfile = (userId) => {
    if (user && userId === user.id) return; // Prevent clicking on own profile
    setViewProfileId(userId);
  };

  const renderPollOptions = (post) => {
    const hasVoted = user && post.votes && post.votes[user.id] !== undefined;
    const totalVotes = Object.keys(post.votes || {}).length;
    const userVote = hasVoted ? post.votes[user.id] : null;

    if (post.type === 'text_poll' || post.type === 'quiz') {
      return (
        <div className="px-3 pb-2 space-y-1.5 mt-1.5">
          {post.options?.map((opt, idx) => {
            const votesForOption = Object.values(post.votes || {}).filter(v => v === idx).length;
            const percentage = totalVotes === 0 ? 0 : Math.round((votesForOption / totalVotes) * 100);
            
            let isCorrect = false;
            let isWrongPick = false;
            let bgColor = "bg-gray-800/50";
            let barColor = "bg-gray-700";
            
            if (post.type === 'quiz' && hasVoted) {
              isCorrect = idx === post.correct_answer_index;
              isWrongPick = userVote === idx && !isCorrect;
              if (isCorrect) {
                bgColor = "bg-green-900/30";
                barColor = "bg-green-600/50";
              } else if (isWrongPick) {
                bgColor = "bg-red-900/30";
                barColor = "bg-red-600/50";
              }
            } else if (hasVoted && userVote === idx) {
              bgColor = "bg-orange-900/30";
              barColor = "bg-orange-700/50";
            }

            return (
              <div 
                key={idx} 
                onClick={() => handleVote(post, idx)}
                className={`relative overflow-hidden rounded-md border ${hasVoted ? 'border-transparent' : 'border-gray-700 hover:border-gray-500 cursor-pointer'} ${bgColor} min-h-[36px] flex items-center px-3 transition-colors`}
              >
                {hasVoted && (
                  <div className={`absolute top-0 left-0 h-full ${barColor} transition-all duration-500`} style={{ width: `${percentage}%` }} />
                )}
                <div className="relative z-10 flex justify-between w-full items-center text-[13px] font-medium text-gray-200">
                  <div className="flex items-center gap-2">
                    {opt.text}
                    {post.type === 'quiz' && hasVoted && isCorrect && <CheckCircle className="w-3.5 h-3.5 text-green-400" />}
                    {post.type === 'quiz' && hasVoted && isWrongPick && <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  </div>
                  {hasVoted && <span>{percentage}%</span>}
                </div>
              </div>
            );
          })}
          <div className="text-[11px] text-gray-500 mt-1.5">{totalVotes} votes</div>
        </div>
      );
    }

    if (post.type === 'image_poll') {
      return (
        <div className="px-3 pb-2 mt-1.5">
          <div className="grid grid-cols-2 gap-1.5 max-w-sm mx-auto">
            {post.options?.map((opt, idx) => {
              const votesForOption = Object.values(post.votes || {}).filter(v => v === idx).length;
              const percentage = totalVotes === 0 ? 0 : Math.round((votesForOption / totalVotes) * 100);
              const isPicked = hasVoted && userVote === idx;

              return (
                <div 
                  key={idx}
                  className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all duration-300 ${isPicked ? 'border-orange-600 shadow-[0_0_15px_rgba(14,165,233,0.3)]' : 'border-gray-800/50 hover:border-gray-600'} cursor-pointer`}
                  onClick={() => handleVote(post, idx)}
                >
                  <img 
                    src={opt.image_url} 
                    alt={opt.text} 
                    className={`w-full h-full object-cover transition-transform duration-500 hover:scale-110 ${hasVoted && !isPicked ? 'grayscale-[30%]' : ''}`} 
                  />
                  
                  {hasVoted && !isPicked && (
                    <div className="absolute inset-0 bg-black/50 z-0 pointer-events-none transition-all duration-300" />
                  )}

                  {hasVoted && isPicked && (
                    <div className="absolute top-2 left-2 z-10 bg-orange-600 rounded-full p-1 shadow-lg shadow-orange-600/50 animate-in zoom-in">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}

                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-2.5 pt-8 z-10 flex flex-col pointer-events-none">
                    <div className="flex justify-between items-end gap-2">
                      <p className="text-white text-[13px] font-semibold truncate drop-shadow-md">{opt.text}</p>
                      {hasVoted && <span className="text-white text-[13px] font-bold drop-shadow-md">{percentage}%</span>}
                    </div>
                    {hasVoted && (
                      <div className="w-full h-1 bg-white/20 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${isPicked ? 'bg-orange-500 shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'bg-gray-400'}`} 
                          style={{ width: `${percentage}%` }} 
                        />
                      </div>
                    )}
                  </div>

                  <div 
                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-white hover:bg-black"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewPost(post);
                      setFullscreenImage({ urls: post.options.map(o => o.image_url), index: idx });
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[11px] text-gray-500 mt-1.5">{totalVotes} votes</div>
        </div>
      );
    }

    return null;
  };

  const handleViewPost = async (post) => {
    if (!user || !post) return;
    const isViewed = (post.viewers || []).includes(user.id);
    if (!isViewed) {
      const newViewers = [...(post.viewers || []), user.id];
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, viewers: newViewers } : p));
      try {
        await CommunityPost.update(post.id, { viewers: newViewers });
      } catch (err) {}
    }
  };

  const filteredPosts = posts.filter(post => {
    if (activeTab === 'my_posts') {
      return String(post.author_id) === String(user?.id) || (isAdmin && post.author_name === 'ADMIN');
    }
    return true;
  });

  return (
    <div className="flex-1 bg-[#0a0a0f] pb-24 relative" onClick={() => setActiveMenuPostId(null)}>
      
      <button 
        onClick={() => setIsCreateModalOpen(true)}
        className="fixed bottom-24 right-4 z-40 group flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-orange-600 to-orange-600 text-white rounded-full shadow-lg shadow-orange-600/30 hover:shadow-orange-600/60 hover:scale-110 active:scale-95 transition-all duration-300 before:absolute before:inset-0 before:rounded-full before:bg-white/20 before:opacity-0 hover:before:opacity-100 before:transition-opacity overflow-hidden"
      >
        <Plus className="w-7 h-7 relative z-10 group-hover:rotate-90 transition-transform duration-500" />
      </button>

      {/* Segmented Tabs */}
      <div className="max-w-xl mx-auto sticky top-16 z-30 bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5">
        <div className="flex">
          <button 
            className={`flex-1 text-[13px] font-bold py-3 transition-all duration-300 relative ${activeTab === 'all' ? 'text-orange-500' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            onClick={() => setActiveTab('all')}
          >
            All Posts
            {activeTab === 'all' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(56,189,248,0.8)] rounded-t-full"></div>
            )}
          </button>
          <button 
            className={`flex-1 text-[13px] font-bold py-3 transition-all duration-300 relative ${activeTab === 'my_posts' ? 'text-orange-500' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
            onClick={() => setActiveTab('my_posts')}
          >
            My Posts
            {activeTab === 'my_posts' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(56,189,248,0.8)] rounded-t-full"></div>
            )}
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto pt-4 px-3 sm:px-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-gradient-to-b from-[#16161e] to-[#0f0f15] border border-white/5 rounded-2xl p-4 shadow-lg animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex-shrink-0" />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="w-32 h-3.5 bg-white/10 rounded-md" />
                    <div className="w-20 h-2.5 bg-white/5 rounded-md" />
                  </div>
                </div>
                <div className="space-y-2.5 mb-5">
                  <div className="w-full h-3.5 bg-white/5 rounded-md" />
                  <div className="w-5/6 h-3.5 bg-white/5 rounded-md" />
                  <div className="w-4/6 h-3.5 bg-white/5 rounded-md" />
                </div>
                <div className="w-full h-40 bg-white/5 rounded-xl mb-4" />
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <div className="flex gap-4">
                    <div className="w-12 h-6 bg-white/5 rounded-md" />
                    <div className="w-12 h-6 bg-white/5 rounded-md" />
                  </div>
                  <div className="w-16 h-6 bg-white/5 rounded-md" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center text-gray-500 py-20 font-medium">
            {activeTab === 'my_posts' ? "You haven't made any posts yet." : "No posts yet. Be the first to share something!"}
          </div>
        ) : (
          filteredPosts.map(post => (
            <div 
              key={post.id} 
              className={`bg-gradient-to-b from-[#16161e] to-[#0f0f15] border rounded-2xl overflow-hidden mb-5 shadow-lg transition-all duration-300 hover:border-orange-600/30 hover:shadow-[0_8px_30px_rgba(14,165,233,0.1)] hover:-translate-y-0.5 ${
                post.is_pinned 
                  ? 'border-orange-500/50 bg-gradient-to-br from-blue-900/30 to-[#0f0f15] shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                  : 'border-white/5'
              }`}
            >
              
              <div className="px-4 py-3.5 flex items-start justify-between relative">
                <div 
                  className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigateToProfile(post.author_id)}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-800 flex-shrink-0 border border-white/10 shadow-sm">
                    <img 
                      src={channelsMap[post.author_id]?.logo_url || post.author_avatar || `https://api.dicebear.com/6.x/bottts/svg?seed=${post.author_id}`} 
                      alt={channelsMap[post.author_id]?.name || post.author_name}
                      className="w-full h-full object-cover" 
                      onError={(e) => { e.target.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${post.author_id}`; }}
                    />
                  </div>
                  <div className="flex flex-col justify-center">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-50 text-[15px] leading-tight tracking-wide">{channelsMap[post.author_id]?.name || post.author_name}</span>
                      {(post.author_role === 'admin' || post.author_name?.toUpperCase().includes("ADMIN") || post.author_name?.includes("BATTLEHUB") || post.author_id === 'shopecdiv@gmail.com' || channelsMap[post.author_id]?.name?.toUpperCase().includes("ADMIN")) && (
                        <BadgeCheck className="w-4 h-4 text-orange-500 fill-white flex-shrink-0 drop-shadow-[0_0_5px_rgba(59,130,246,0.5)]" />
                      )}
                      
                      {user && post.author_id !== user.id && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleFollowToggle(post.author_id); }}
                          className={`ml-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border transition-all duration-300 ${
                            follows[post.author_id] 
                              ? 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10' 
                              : 'bg-orange-600/10 border-orange-600/50 text-orange-500 hover:bg-orange-600 hover:text-white hover:shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                          }`}
                        >
                          {follows[post.author_id] ? 'Following' : 'Follow'}
                        </button>
                      )}
                      {post.is_pinned && <span className="text-[9px] bg-orange-500 text-white px-2 py-0.5 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)] font-bold tracking-wider">PINNED</span>}
                      {(post.type === 'quiz' || post.type?.includes('poll')) && (
                        <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-gray-300 border border-white/5">
                          {post.type.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium tracking-wide mt-0.5">{post.created_date ? new Date(post.created_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Just now'}</span>
                  </div>
                </div>
                
                <div className="relative">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id); }}
                    className="text-gray-400 hover:text-white p-1"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {activeMenuPostId === post.id && (
                    <div className="absolute right-0 top-6 w-32 bg-gray-800 border border-gray-700 rounded-md shadow-xl overflow-hidden z-20">
                      {isAdmin && (
                        <button 
                          onClick={() => handlePin(post)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-400 hover:bg-orange-500/10 hover:text-orange-500 border-b border-gray-700"
                        >
                          <Pin className="w-4 h-4" /> {post.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                      )}
                      <button 
                        onClick={() => handleReport(post.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
                      >
                        <Flag className="w-4 h-4" /> Report
                      </button>
                      {(user?.id === post.author_id || isAdmin) && (
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {post.text && (() => {
                const isLong = post.text.length > 250 || post.text.split('\n').length > 6;
                const isExpanded = expandedTexts[post.id];
                return (
                  <div className="px-4 pb-3">
                    <p 
                      className="text-gray-200 whitespace-pre-wrap text-[15px] leading-relaxed tracking-wide font-medium opacity-90 transition-all duration-300"
                      style={!isExpanded && isLong ? { display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' } : {}}
                    >
                      {post.text}
                    </p>
                    {isLong && (
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setExpandedTexts(prev => ({...prev, [post.id]: !prev[post.id]})); 
                        }}
                        className="text-orange-500 text-[13px] font-bold mt-1.5 hover:text-sky-300 transition-colors"
                      >
                        {isExpanded ? 'Show less' : 'Read more'}
                      </button>
                    )}
                  </div>
                );
              })()}

              {post.type === 'image' && post.image_url && (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-gray-800">
                  <img 
                    src={post.image_url} 
                    alt="Post" 
                    className="w-full h-full object-cover cursor-pointer hover:opacity-95"
                    onClick={() => { handleViewPost(post); setFullscreenImage({ urls: [post.image_url], index: 0 }); }}
                  />
                </div>
              )}

              {(post.type?.includes('poll') || post.type === 'quiz') && renderPollOptions(post)}

              <div className="px-4 py-3 flex items-center justify-between border-t border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleLike(post)}
                    className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ${post.likes?.includes(user?.id) ? 'bg-orange-600/10 text-orange-500' : 'text-gray-400 hover:bg-white/10 hover:text-gray-200'}`}
                  >
                    <ThumbsUp className={`w-[18px] h-[18px] ${post.likes?.includes(user?.id) ? 'fill-orange-500 drop-shadow-[0_0_5px_rgba(14,165,233,0.5)]' : ''}`} />
                  </button>
                  <span className="text-[13px] font-bold w-4 text-gray-300">{post.likes?.length > 0 ? post.likes.length : ''}</span>

                  <button 
                    onClick={() => handleDislike(post)}
                    className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-300 ml-1 ${post.dislikes?.includes(user?.id) ? 'bg-red-500/10 text-red-400' : 'text-gray-400 hover:bg-white/10 hover:text-gray-200'}`}
                  >
                    <ThumbsDown className={`w-[18px] h-[18px] ${post.dislikes?.includes(user?.id) ? 'fill-red-400' : ''}`} />
                  </button>
                  <span className="text-[13px] font-bold w-4 text-gray-300">{post.dislikes?.length > 0 ? post.dislikes.length : ''}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <div className="flex items-center justify-center gap-1.5 px-3 h-9 text-gray-400 rounded-full transition-colors">
                    <Eye className="w-[18px] h-[18px]" />
                    <span className="text-[13px] font-bold">{post.viewers?.length || 0}</span>
                  </div>
                  <button 
                    onClick={() => { handleViewPost(post); setActiveCommentPost(post); }}
                    className="flex items-center justify-center gap-1.5 px-3 h-9 rounded-full text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-all duration-300"
                  >
                    <MessageSquare className="w-[18px] h-[18px]" />
                    <span className="text-[13px] font-bold">{post.comments?.length > 0 ? post.comments.length : ''}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <CreatePostModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        user={user}
        onPostCreated={loadPosts}
      />

      {/* Fullscreen Image Modal */}
      {fullscreenImage && fullscreenImage.urls && createPortal(
        <div 
          className="fixed inset-0 z-[9999] bg-[#050508]/95 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-8 animate-in fade-in duration-300"
          onClick={() => setFullscreenImage(null)}
        >
          {/* Top Bar with Close Button */}
          <div className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex justify-end items-center z-[10000] bg-gradient-to-b from-black/60 to-transparent">
            <button 
              className="group flex items-center justify-center w-12 h-12 bg-white/10 hover:bg-white/20 hover:scale-105 active:scale-95 border border-white/20 rounded-full text-white transition-all duration-300 shadow-2xl backdrop-blur-md"
              onClick={(e) => { e.stopPropagation(); setFullscreenImage(null); }}
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div 
            className="relative w-full h-full max-w-5xl max-h-[90vh] flex flex-col justify-center items-center rounded-2xl sm:overflow-hidden sm:border sm:border-white/10 sm:shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {fullscreenImage.urls.length > 1 && (
              <>
                <button 
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-black/40 hover:bg-black/70 border border-white/10 rounded-full text-white z-50 transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenImage(prev => ({ ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length }));
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button 
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 p-3 sm:p-4 bg-black/40 hover:bg-black/70 border border-white/10 rounded-full text-white z-50 transition-all duration-300 hover:scale-110 backdrop-blur-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFullscreenImage(prev => ({ ...prev, index: (prev.index + 1) % prev.urls.length }));
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            )}

            <img 
              src={fullscreenImage.urls[fullscreenImage.index]} 
              alt="Fullscreen" 
              className="max-w-full max-h-[90vh] object-contain drop-shadow-2xl" 
            />
            
            {fullscreenImage.urls.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2.5 z-50 bg-black/30 px-4 py-2 rounded-full backdrop-blur-md">
                {fullscreenImage.urls.map((_, i) => (
                  <div key={i} className={`transition-all duration-300 rounded-full ${i === fullscreenImage.index ? 'bg-white w-6 h-2 shadow-[0_0_10px_rgba(255,255,255,0.8)]' : 'bg-white/40 w-2 h-2 hover:bg-white/60'}`} />
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Bottom Sheet Comments Modal (Ported from MediaFeed) */}
      {activeCommentPost && createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity" 
            onClick={() => { setActiveCommentPost(null); setReplyingTo(null); }}
          />
          <div className="absolute bottom-0 left-0 right-0 h-[65dvh] bg-gray-950 rounded-t-[2rem] flex flex-col animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] border-t border-gray-800 overflow-hidden pb-safe">
            
            {/* Header */}
            <div className="flex flex-col items-center pt-4 pb-3 border-b border-gray-800/60 bg-gray-900/50 backdrop-blur-md">
              <div className="w-12 h-1.5 bg-gray-700 rounded-full mb-4" />
              <div className="w-full px-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-bold text-white">Comments <span className="text-gray-500 text-sm font-normal">({activeCommentPost.comments?.length || 0})</span></h3>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setActiveCommentPost(null); setReplyingTo(null); }} className="rounded-full text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {!activeCommentPost.comments || activeCommentPost.comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10">
                  <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                  <p>No comments yet. Start the conversation!</p>
                </div>
              ) : (
                activeCommentPost.comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div 
                      className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700 cursor-pointer"
                      onClick={() => navigateToProfile(comment.userId)}
                    >
                      <img 
                        src={comment.avatar || `https://api.dicebear.com/6.x/bottts/svg?seed=${comment.userId}`} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${comment.userId}`; }}
                      />
                    </div>
                    <div className="flex-1">
                      {/* Parent Comment */}
                      <div 
                        className="bg-gray-900/80 rounded-2xl rounded-tl-none p-3.5 border border-gray-800/60 shadow-sm cursor-pointer select-none"
                        onClick={(e) => {
                          if (e.detail === 2) handleLikeComment(comment);
                          if (e.detail === 3) setReplyingTo(comment);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-gray-200 flex items-center gap-1">
                            <span>{comment.username}</span>
                            {(comment.username?.includes("BATTLEHUB") || comment.userId === "shopecdiv@gmail.com") && (
                              <Check className="w-3.5 h-3.5 text-[#00FFFF] bg-[#00FFFF]/20 rounded-full p-0.5 flex-shrink-0" />
                            )}
                          </span>
                          <span className="text-[11px] text-gray-500">{safeFormatDistance(comment.created_date)}</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{renderCommentText(comment.text)}</p>
                      </div>
                      
                      {/* Comment Actions */}
                      <div className="flex items-center gap-4 mt-2 px-2">
                        <button 
                          onClick={() => handleLikeComment(comment)}
                          className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-white transition-colors"
                        >
                          <Heart className={`w-3.5 h-3.5 ${(comment.likes || []).includes(user?.id) ? "fill-red-500 text-red-500" : ""}`} />
                          {(comment.likes || []).length > 0 && <span>{(comment.likes || []).length}</span>}
                        </button>
                        <button 
                          onClick={() => setReplyingTo(comment)}
                          className="text-xs font-medium text-gray-400 hover:text-white transition-colors"
                        >
                          Reply
                        </button>
                      </div>

                      {/* Replies List */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-gray-800/60">
                          <button
                            onClick={() => toggleReplies(comment.id)}
                            className="flex items-center gap-2 text-[13px] font-bold text-orange-600 hover:text-orange-500 mb-2 transition-colors focus:outline-none"
                          >
                            {expandedReplies[comment.id] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
                          </button>
                          
                          {expandedReplies[comment.id] && (
                            <div className="space-y-3 mt-3">
                              {comment.replies.map(reply => (
                                <div key={reply.id} className="flex gap-2">
                                  <div 
                                    className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 cursor-pointer"
                                    onClick={() => navigateToProfile(reply.userId)}
                                  >
                                <img src={reply.avatar || `https://api.dicebear.com/6.x/bottts/svg?seed=${reply.userId}`} alt="Avatar" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <div 
                                  className="bg-gray-900/60 rounded-2xl rounded-tl-none p-2.5 border border-gray-800/40 cursor-pointer select-none"
                                  onClick={(e) => {
                                    if (e.detail === 2) handleLikeReply(comment.id, reply.id);
                                    if (e.detail === 3) {
                                      setReplyingTo(comment);
                                      setNewComment(`@${reply.username} `);
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-bold text-xs text-gray-200 flex items-center gap-1">
                                      <span>{reply.username}</span>
                                      {(reply.username?.includes("BATTLEHUB") || reply.userId === "shopecdiv@gmail.com") && (
                                        <Check className="w-3.5 h-3.5 text-[#00FFFF] bg-[#00FFFF]/20 rounded-full p-0.5 flex-shrink-0" />
                                      )}
                                    </span>
                                    <span className="text-[10px] text-gray-500">{safeFormatDistance(reply.created_date)}</span>
                                  </div>
                                  <p className="text-sm text-gray-300 leading-snug">{renderCommentText(reply.text)}</p>
                                </div>
                                <div className="flex items-center gap-4 mt-1.5 px-2">
                                  <button 
                                    onClick={() => handleLikeReply(comment.id, reply.id)}
                                    className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-white"
                                  >
                                    <Heart className={`w-3 h-3 ${(reply.likes || []).includes(user?.id) ? "fill-red-500 text-red-500" : ""}`} />
                                    {(reply.likes || []).length > 0 && <span>{(reply.likes || []).length}</span>}
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setReplyingTo(comment);
                                      setNewComment(`@${reply.username} `);
                                    }}
                                    className="text-[11px] font-medium text-gray-500 hover:text-white transition-colors"
                                  >
                                    Reply
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Input Form Fixed at Bottom */}
            <div className="border-t border-gray-800 bg-gray-950 p-4 pb-6 sm:pb-4 shadow-[0_-10px_20px_rgba(0,0,0,0.3)] relative z-10">
              {replyingTo && (
                <div className="flex items-center justify-between mb-2 px-2">
                  <span className="text-xs text-orange-500 font-medium">Replying to {replyingTo.username}</span>
                  <button onClick={() => { setReplyingTo(null); setNewComment(""); }} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4"/></button>
                </div>
              )}
              <form onSubmit={handleSendComment} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700 shadow-inner">
                  {user ? (
                    <img src={user.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${user.id}`} alt="Me" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gray-800" />
                  )}
                </div>
                <div className="flex-1 relative">
                  <Input 
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder={user ? (replyingTo ? "Write a reply..." : "Add a comment...") : "Login to comment..."}
                    disabled={!user || sendingComment}
                    className="bg-gray-900 border-gray-800 focus-visible:ring-1 focus-visible:ring-orange-600/50 rounded-full h-12 text-sm px-5 pr-12 text-white placeholder:text-gray-500 shadow-inner"
                  />
                  <Button 
                    type="submit" 
                    size="icon" 
                    variant="ghost"
                    disabled={!user || !newComment.trim() || sendingComment}
                    className="absolute right-1 top-1 w-10 h-10 rounded-full text-orange-600 hover:text-white hover:bg-orange-600 transition-colors"
                  >
                    {sendingComment ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                  </Button>
                </div>
              </form>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Profile Modal */}
      <Sheet open={!!viewProfileId} onOpenChange={(val) => !val && setViewProfileId(null)}>
        <SheetContent 
          side="right"
          className="bg-slate-950 border-slate-800 p-0 flex flex-col w-full sm:max-w-md overflow-hidden z-[550]"
          onInteractOutside={(e) => e.preventDefault()}
        >
          {viewProfileId && (
            <PlayerProfile 
              inlineUid={viewProfileId} 
              isDrawer={true} 
              onClose={() => setViewProfileId(null)} 
            />
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
