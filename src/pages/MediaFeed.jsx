import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MediaPost } from "@/entities/MediaPost";
import { MediaComment as MediaCommentEntity } from "@/entities/MediaComment";
import { Notification } from "@/entities/Notification";
import { User } from "@/entities/User";
import { Follower } from "@/entities/Follower";
import { Channel } from "@/api/entities";
import { containsProfanity } from '@/utils/profanityFilter';
import MediaPostCard from "@/components/media/MediaPostCard";
import MediaAllCard from "@/components/media/MediaAllCard";
import VideoCard from "@/components/media/VideoCard";
import VideoDetailView from "@/components/media/VideoDetailView";
import MediaShareDrawer from "@/components/media/MediaShareDrawer";
import PlayerProfile from "@/pages/PlayerProfile";
import CreatorStudioPanel from "@/components/profile/v2/CreatorStudioPanel";
import { Film, TrendingUp, Bookmark, Loader2, X, Send, Megaphone, MonitorPlay, Smartphone, Heart, MessageCircle, Trash2, ArrowLeft, Search, ChevronDown, ChevronUp, Play, Pause, Maximize2, Flag, Check, History, ThumbsUp, ChevronRight, Settings, Grid, Volume2, VolumeX, Star } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";

// Safe date parsing helper to prevent white screens
const parseDate = (d) => {
  try {
    if (!d) return 0;
    const time = new Date(d).getTime();
    return isNaN(time) ? 0 : time;
  } catch (e) {
    return 0;
  }
};

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

// ─── Module-level cache (survives component unmount/remount) ────────────────
// Posts are cached per tab key so switching tabs is instant after first load.
const _postsCache = {}; // key: "tab_subtab" => [...posts]
let _allPostsCache = null; // raw full list
let _allPostsCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 60 seconds freshness window
let _cachedUser = undefined; // undefined = not fetched yet, null = not logged in

export default function MediaFeed({ isSavedView = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mainTab, setMainTab] = useState(searchParams.get('tab') || (isSavedView ? "saved" : "reels")); // "reels" | "videos" | "saved" | "channel"
  const [reelsTab, setReelsTab] = useState("all"); // "all" | "following" | "watchlater"
  const [isNavExpanded, setIsNavExpanded] = useState(false);
  const [dialRotation, setDialRotation] = useState(isSavedView ? 90 : 0);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [historySlidePanel, setHistorySlidePanel] = useState(null); // 'videos' | 'reels' | null
  
  // Dashboard states
  const [historyPosts, setHistoryPosts] = useState([]);
  const [savedPosts, setSavedPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  
  const navTimeoutRef = useRef(null);
  // Sync mute state globally
  useEffect(() => {
    const handleMuteChange = () => {
      const muted = localStorage.getItem('global_muted') === 'true';
      setIsMiniMuted(muted);
      if (miniVideoRef.current) {
        miniVideoRef.current.muted = muted;
      }
    };
    window.addEventListener('mute_changed', handleMuteChange);
    return () => window.removeEventListener('mute_changed', handleMuteChange);
  }, []);

  const scrollRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, rotation: 0 });

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      navigate('/Home');
    }, 300); // Wait for slide-out animation to finish
  };

  const removeHistoryPost = (post) => {
    if (!user) return;
    const key = `bh_watch_history_${user.id}`;
    const existing = JSON.parse(localStorage.getItem(key)) || [];
    const updated = existing.filter(h => h.postId !== post.id);
    localStorage.setItem(key, JSON.stringify(updated));
    setHistoryPosts(prev => prev.filter(p => p.id !== post.id));
  };

  const removeSavedPost = async (post) => {
    if (!user) return;
    try {
      await MediaPost.toggleSave(post.id, user.id);
      // Update local state immediately so it disappears from the list
      setSavedPosts(prev => prev.filter(p => p.id !== post.id));
      // Update module-level cache to prevent it reappearing within TTL
      if (_allPostsCache) {
        const cachedPost = _allPostsCache.find(p => p.id === post.id);
        if (cachedPost && cachedPost.saves) {
          cachedPost.saves = cachedPost.saves.filter(id => id !== user.id);
        }
      }
      toast.success("Removed from Watch Later");
    } catch {}
  };

  // Free Dragging FAB state with Persistence
  const savedOffset = localStorage.getItem('battlehub_dial_offset');
  const initialOffset = savedOffset ? JSON.parse(savedOffset) : { x: 0, y: 0 };
  
  const [dragOffset, setDragOffset] = useState(initialOffset);
  const [isMovingFab, setIsMovingFab] = useState(false);
  const dragOffsetRef = useRef(initialOffset);
  const longPressTimerRef = useRef(null);
  const moveStartRef = useRef({ x: 0, y: 0, initialOffsetX: 0, initialOffsetY: 0 });

  const tabs = [
    { id: "saved", label: "Saved", icon: Bookmark, angle: -90 },
    { id: "reels", label: "Reels", icon: Smartphone, angle: 0 },
    { id: "videos", label: "Videos", icon: MonitorPlay, angle: 90 },
  ];
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(_cachedUser !== undefined ? _cachedUser : null);

  // Load user once; cache it in module scope so re-opening Explore is instant
  useEffect(() => {
    if (_cachedUser !== undefined) {
      setUser(_cachedUser);
      return;
    }
    User.me().then(u => {
      _cachedUser = u;
      setUser(u);
    }).catch(() => {
      _cachedUser = null;
      setUser(null);
    });
  }, []);

  // Comments Drawer State
  const [selectedPost, setSelectedPost] = useState(null);
  const [viewProfileId, setViewProfileId] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  
  // Share Drawer State
  const [sharePost, setSharePost] = useState(null);
  // Creator Studio State
  const [showCreatorStudio, setShowCreatorStudio] = useState(false);
  // Liked Videos State
  const [showLikedPosts, setShowLikedPosts] = useState(false);
  // Watch Later State
  const [showSavedPosts, setShowSavedPosts] = useState(false);
  // Selected video for detail view (YouTube-style)
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [isMiniPlayer, setIsMiniPlayer] = useState(false);
  const [isMiniPlaying, setIsMiniPlaying] = useState(true);
  const [isMiniMuted, setIsMiniMuted] = useState(() => localStorage.getItem('global_muted') === 'true');
  const miniVideoRef = useRef(null);
  const sharedVideoState = useRef({ currentTime: 0, isPlaying: true });

  const handleSelectVideo = (p) => {
    if (p?.id !== selectedVideo?.id) {
      sharedVideoState.current = { currentTime: 0, isPlaying: true };
    }
    setSelectedVideo(p);
    setIsMiniPlayer(false);
  };
  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Report state
  const [reportingCommentId, setReportingCommentId] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [expandedReplies, setExpandedReplies] = useState({});

  const toggleReplies = (commentId) => {
    setExpandedReplies(prev => ({
      ...prev,
      [commentId]: !prev[commentId]
    }));
  };

  const searchInputRef = useRef(null);

  const [currentUserChannel, setCurrentUserChannel] = useState(null);
  useEffect(() => {
    if (user?.id) {
      Channel.filter({ user_id: user.id }).then(c => {
        if (c && c.length > 0) setCurrentUserChannel(c[0]);
      }).catch(() => {});
    }
  }, [user?.id]);

  // Handle Deep Linking
  useEffect(() => {
    const postId = searchParams.get('postId');
    if (postId && !selectedPost) {
      MediaPost.get(postId).then(post => {
        if (post) {
          // Switch to correct tab based on post type so user can view it properly
          if (post.type === 'reel' || (post.type === 'video' && post.video_type === 'short')) {
             setMainTab('reels');
          } else if (post.type === 'video') {
             setMainTab('videos');
          } else {
             setMainTab('announcements');
          }
        }
      }).catch(() => {});
    }
  }, [searchParams]);

  useEffect(() => {
    loadPosts();
  }, [mainTab, reelsTab, user]);

  const loadPosts = async () => {
    const cacheKey = `${mainTab}_${reelsTab}_${user?.id || 'anon'}`;
    const cached = _postsCache[cacheKey];

    // Show cached data instantly if available
    if (cached) {
      setPosts(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      // Reuse raw all-posts if cache is fresh (< 60s)
      let allPosts;
      const now = Date.now();
      if (_allPostsCache && (now - _allPostsCacheTime) < CACHE_TTL) {
        allPosts = _allPostsCache;
      } else {
        allPosts = await MediaPost.filter({ status: "published" });
        _allPostsCache = allPosts;
        _allPostsCacheTime = now;
      }
      let fetchedPosts = [...allPosts];

      if (mainTab === "announcements") {
        fetchedPosts = fetchedPosts.filter(p => p.type === "text" || p.type === "image");
        fetchedPosts.sort((a, b) => parseDate(b.created_date || b.created_at) - parseDate(a.created_date || a.created_at));
      } else if (mainTab === "videos") {
        if (reelsTab === "all") {
          fetchedPosts = fetchedPosts.filter(p => p.type === "video" && p.video_type !== "short");
          fetchedPosts.sort((a, b) => parseDate(b.created_date || b.created_at) - parseDate(a.created_date || a.created_at));
        } else if (reelsTab === "following") {
          fetchedPosts = fetchedPosts.filter(p => p.type === "video" && p.video_type !== "short");
          if (!user) {
            fetchedPosts = [];
          } else {
            const follows = await Follower.filter({ follower_id: user.id });
            const followingIds = follows.map(f => f.following_id);
            fetchedPosts = fetchedPosts.filter(p => followingIds.includes(p.user_id) || followingIds.includes(p.author_id));
            fetchedPosts.sort((a, b) => parseDate(b.created_date || b.created_at) - parseDate(a.created_date || a.created_at));
          }
        } else if (reelsTab === "history") {
          if (!user) {
            fetchedPosts = [];
          } else {
            try {
              const hist = JSON.parse(localStorage.getItem(`bh_watch_history_${user.id}`)) || [];
              const histPostIds = hist.map(h => h.postId);
              fetchedPosts = fetchedPosts.filter(p => histPostIds.includes(p.id));
              // Sort by latest watched
              fetchedPosts.sort((a, b) => {
                const hA = hist.find(h => h.postId === a.id)?.lastWatched || 0;
                const hB = hist.find(h => h.postId === b.id)?.lastWatched || 0;
                return hB - hA;
              });
            } catch (e) {
              fetchedPosts = [];
            }
          }
        }
      } else if (mainTab === "reels") {
        if (reelsTab === "history") {
          try {
            const hist = JSON.parse(localStorage.getItem(`bh_watch_history_${user?.id || 'anon'}`)) || [];
            const histPostIds = hist.map(h => h.postId);
            fetchedPosts = fetchedPosts.filter(p => histPostIds.includes(p.id) && (p.type === "reel" || p.video_type === "short"));
            fetchedPosts.sort((a, b) => {
              const hA = hist.find(h => h.postId === a.id)?.lastWatched || 0;
              const hB = hist.find(h => h.postId === b.id)?.lastWatched || 0;
              return hB - hA;
            });
          } catch (e) {
            fetchedPosts = [];
          }
        } else {
          // Reels now includes only reels and short videos
          fetchedPosts = fetchedPosts.filter(p => p.type === "reel" || (p.type === "video" && p.video_type === "short"));
          fetchedPosts.sort((a, b) => parseDate(b.created_date || b.created_at) - parseDate(a.created_date || a.created_at));
        }
      } else if (mainTab === "channel") {
        if (!user) {
          fetchedPosts = [];
          setHistoryPosts([]);
          setSavedPosts([]);
          setLikedPosts([]);
        } else {
          fetchedPosts = fetchedPosts.filter(p => p.user_id === user.id || p.author_id === user.id);
          fetchedPosts.sort((a, b) => parseDate(b.created_date || b.created_at) - parseDate(a.created_date || a.created_at));
          
          // Dashboard Collections
          try {
            const hist = JSON.parse(localStorage.getItem(`bh_watch_history_${user.id}`)) || [];
            const histPostIds = hist.map(h => h.postId);
            let histPosts = allPosts.filter(p => histPostIds.includes(p.id));
            histPosts.sort((a, b) => {
              const hA = hist.find(h => h.postId === a.id)?.lastWatched || 0;
              const hB = hist.find(h => h.postId === b.id)?.lastWatched || 0;
              return hB - hA;
            });
            setHistoryPosts(histPosts);
          } catch(e) { setHistoryPosts([]); }
          
          setSavedPosts(allPosts.filter(p => p.saves?.includes(user.id)));
          setLikedPosts(allPosts.filter(p => p.likes?.includes(user.id)));
        }
      }

      // Sort pinned posts and deep-linked post to the top while preserving the underlying order
      const targetPostId = searchParams.get('postId');
      
      fetchedPosts.sort((a, b) => {
        // Deep linked post always at the very top
        if (targetPostId) {
          if (a.id === targetPostId && b.id !== targetPostId) return -1;
          if (b.id === targetPostId && a.id !== targetPostId) return 1;
        }
        
        // Pinned posts next
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        
        return 0;
      });

      setPosts(fetchedPosts);
      // Store in cache
      _postsCache[cacheKey] = fetchedPosts;
      
      // Reset scroll position to top when switching tabs
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    } catch (e) {
      console.error("Error loading posts", e);
    }
    setLoading(false);
  };

  const handleUpdate = (postId, updates) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, ...updates } : p));
  };

  const handlePointerDown = (e) => {
    setIsDragging(true);
    setIsNavExpanded(true);
    dragStartRef.current = {
      x: e.clientX || (e.touches && e.touches[0].clientX) || 0,
      rotation: dialRotation,
    };
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const dx = clientX - dragStartRef.current.x;
    setDialRotation(dragStartRef.current.rotation + dx);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    let closest = Math.round(dialRotation / 90) * 90;
    if (closest > 90) closest = 90;
    if (closest < -90) closest = -90;
    
    setDialRotation(closest);
    
    if (closest === 0) setMainTab("reels");
    else if (closest === -90) setMainTab("videos"); 
    else if (closest === 90) setMainTab("saved");
    
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    navTimeoutRef.current = setTimeout(() => setIsNavExpanded(false), 2000);
  };

  const handleFabPointerDown = (e) => {
    if (isNavExpanded) return;
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    longPressTimerRef.current = setTimeout(() => {
      setIsMovingFab(true);
      moveStartRef.current = {
        x: clientX,
        y: clientY,
        initialOffsetX: dragOffsetRef.current.x,
        initialOffsetY: dragOffsetRef.current.y
      };
      if (navigator.vibrate) navigator.vibrate(50);
    }, 400); 
  };

  const handleFabPointerMove = (e) => {
    if (isMovingFab) {
      e.preventDefault();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      const dx = clientX - moveStartRef.current.x;
      const dy = clientY - moveStartRef.current.y;
      
      const newX = moveStartRef.current.initialOffsetX + dx;
      const newY = moveStartRef.current.initialOffsetY + dy;
      
      dragOffsetRef.current = { x: newX, y: newY };
      setDragOffset({ x: newX, y: newY });
    }
  };

  const handleFabPointerUp = (e, tabId, targetAngle) => {
    if (e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId);
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    
    if (isMovingFab) {
      setIsMovingFab(false);
      localStorage.setItem('battlehub_dial_offset', JSON.stringify(dragOffsetRef.current));
      return;
    }
    handleNavClick(tabId, targetAngle);
  };

  const handleNavClick = (tabId, targetAngle) => {
    if (!isNavExpanded) {
      setIsNavExpanded(true);
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
      navTimeoutRef.current = setTimeout(() => setIsNavExpanded(false), 3000);
      return;
    }

    setDialRotation(-targetAngle);
    setMainTab(tabId);
    
    if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    navTimeoutRef.current = setTimeout(() => setIsNavExpanded(false), 1200);
  };

  const handleOpenComments = async (post) => {
    setSelectedPost(post);
    setCommentsLoading(true);
    try {
      const fetchedComments = await MediaCommentEntity.filter({ post_id: post.id, is_deleted: false });
      fetchedComments.sort((a, b) => parseDate(b.created_date) - parseDate(a.created_date));
      setComments(fetchedComments);
      
      // Always compute the true count from live data
      const trueCount = fetchedComments.length + fetchedComments.reduce((acc, c) => acc + (c.replies?.length || 0), 0);
      // Update selectedPost so the drawer header is in sync
      setSelectedPost(prev => ({ ...prev, comments_count: trueCount }));
      // Only write to backend if it's out of sync
      if (trueCount !== (post.comments_count || 0)) {
        await MediaPost.update(post.id, { comments_count: trueCount });
        handleUpdate(post.id, { comments_count: trueCount });
      }
    } catch (e) {
      console.error("Error loading comments", e);
    }
    setCommentsLoading(false);
  };

  const handleCloseComments = () => {
    setSelectedPost(null);
    setComments([]);
    setReplyingTo(null);
    setNewComment("");
  };

  const handleLikeComment = async (comment) => {
    if (!user) { alert("Please login to like"); return; }
    try {
      const isLiked = await MediaCommentEntity.toggleLike(comment.id, user.id);
      
      if (isLiked && comment.user_id !== user.id) {
        Notification.create({
          recipient_id: comment.user_id,
          type: "Media",
          priority: "Normal",
          title: "New Like",
          message: `${user.ign || user.full_name?.split(' ')[0] || "Someone"} liked your comment.`,
          action_url: `/MediaFeed?postId=${selectedPost.id}`,
          read: false
        }).catch(() => {});
      }

      setComments(prev => prev.map(c => {
        if (c.id === comment.id) {
          const newLikes = isLiked 
            ? [...(c.likes || []).filter(id => id !== user.id), user.id]
            : (c.likes || []).filter(id => id !== user.id);
          return { ...c, likes: newLikes };
        }
        return c;
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;
    try {
      const commentToDelete = comments.find(c => c.id === commentId);
      const replyCount = commentToDelete?.replies?.length || 0;
      await MediaCommentEntity.update(commentId, { is_deleted: true });
      setComments(prev => prev.filter(c => c.id !== commentId));
      
      const newCount = Math.max(0, (selectedPost.comments_count || 0) - 1 - replyCount);
      await MediaPost.update(selectedPost.id, { comments_count: newCount });
      handleUpdate(selectedPost.id, { comments_count: newCount });
    } catch (e) {
      console.error("Error deleting comment", e);
    }
  };

  const handleDeleteReply = async (commentId, replyId) => {
    if (!window.confirm("Are you sure you want to delete this reply?")) return;
    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;
      const updatedReplies = (comment.replies || []).filter(r => r.id !== replyId);
      
      await MediaCommentEntity.update(commentId, { replies: updatedReplies });
      
      setComments(prev => prev.map(c => {
        if (c.id === commentId) {
          return { ...c, replies: updatedReplies };
        }
        return c;
      }));

      const newCount = Math.max(0, (selectedPost.comments_count || 0) - 1);
      await MediaPost.update(selectedPost.id, { comments_count: newCount });
      handleUpdate(selectedPost.id, { comments_count: newCount });
    } catch (e) {
      console.error("Error deleting reply", e);
    }
  };

  const handleLikeReply = async (commentId, replyId) => {
    if (!user) { alert("Please login to like"); return; }
    try {
      const comment = comments.find(c => c.id === commentId);
      if (!comment) return;
      
      const updatedReplies = (comment.replies || []).map(r => {
        if (r.id === replyId) {
          const isLiked = !(r.likes || []).includes(user.id);
          const newLikes = isLiked 
            ? [...(r.likes || []).filter(id => id !== user.id), user.id]
            : (r.likes || []).filter(id => id !== user.id);
            
          if (isLiked && r.user_id !== user.id) {
            Notification.create({
              recipient_id: r.user_id,
              type: "Media",
              priority: "Normal",
              title: "New Like",
              message: `${user.ign || user.full_name?.split(' ')[0] || "Someone"} liked your reply.`,
              action_url: `/MediaFeed?postId=${selectedPost.id}`,
              read: false
            }).catch(() => {});
          }

          return { ...r, likes: newLikes };
        }
        return r;
      });
      
      // Optimistic UI update
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, replies: updatedReplies } : c));
      
      // Save to backend
      await MediaCommentEntity.update(commentId, { replies: updatedReplies });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!user) { alert("Please login to comment"); return; }
    if (!newComment.trim() || sendingComment || !selectedPost) return;

    if (containsProfanity(newComment)) {
      alert("Inappropriate language detected. Please modify your text.");
      return;
    }
    
    setSendingComment(true);
    try {
      const userChannels = await Channel.filter({ user_id: user.id });
      const channelName = userChannels && userChannels.length > 0 ? userChannels[0].name : null;
      const finalUsername = channelName || user.ign || user.full_name?.split(' ')[0] || "User";
      const finalAvatar = (userChannels && userChannels.length > 0 && userChannels[0].logo_url) ? userChannels[0].logo_url : (user.avatar_url || "");

      if (replyingTo) {
        // Threaded Reply Logic
        const parentComment = comments.find(c => c.id === replyingTo.id);
        if (parentComment) {
          const newReply = {
            id: Date.now().toString(), // Simple unique ID for array
            user_id: user.id,
            username: finalUsername,
            avatar_url: finalAvatar,
            text: newComment.trim(),
            created_date: new Date().toISOString(),
            likes: []
          };
          const updatedReplies = [...(parentComment.replies || []), newReply];
          await MediaCommentEntity.update(parentComment.id, { replies: updatedReplies });
          
          if (parentComment.user_id !== user.id) {
            Notification.create({
              recipient_id: parentComment.user_id,
              type: "Media",
              priority: "Normal",
              title: "New Reply",
              message: `${finalUsername} replied to your comment: "${newComment.substring(0, 30)}${newComment.length > 30 ? '...' : ''}"`,
              action_url: `/MediaFeed?postId=${selectedPost.id}`,
              read: false
            }).catch(() => {});
          }
          
          // Refresh locally
          setComments(prev => prev.map(c => c.id === parentComment.id ? { ...c, replies: updatedReplies } : c));
          
          // Increment global comments count
          const newCount = (selectedPost.comments_count || 0) + 1;
          await MediaPost.update(selectedPost.id, { comments_count: newCount });
          handleUpdate(selectedPost.id, { comments_count: newCount });
          setSelectedPost(prev => ({ ...prev, comments_count: newCount }));
        }
      } else {
        // Top-Level Comment Logic
        const commentData = {
          post_id: selectedPost.id,
          user_id: user.id,
          username: finalUsername,
          avatar_url: finalAvatar,
          text: newComment.trim(),
          created_date: new Date().toISOString(),
          is_deleted: false,
          likes: [],
          replies: []
        };
        await MediaCommentEntity.create(commentData);
        
        // Refetch top-level comments to get accurate IDs
        const fetchedComments = await MediaCommentEntity.filter({ post_id: selectedPost.id, is_deleted: false });
        fetchedComments.sort((a, b) => parseDate(a.created_date) - parseDate(b.created_date));
        setComments(fetchedComments);

        // Increment global comments count
        const newCount = (selectedPost.comments_count || 0) + 1;
        await MediaPost.update(selectedPost.id, { comments_count: newCount });
        handleUpdate(selectedPost.id, { comments_count: newCount });
        setSelectedPost(prev => ({ ...prev, comments_count: newCount }));
      }
      
      setNewComment("");
      setReplyingTo(null);
    } catch (err) {
      console.error(err);
      alert("Failed to send comment");
    }
    setSendingComment(false);
  };

  const renderCommentText = (text) => {
    if (!text) return null;
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-orange-500 font-medium">{part}</span>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <motion.div 
      initial={{ x: "100%" }}
      animate={{ x: isClosing ? "100%" : 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 bg-gray-950 text-white flex flex-col z-50"
    >
      
      {/* === TOP HEADER === */}
      {!(mainTab === 'reels' && reelsTab === 'history') && (
        <div className="flex-none bg-[#0c0d12] border-b border-white/5 shadow-sm z-[60]">
        {/* Main header row */}
        <div className="flex items-center justify-between px-4 h-12">
          <h1 className="text-lg font-bold text-white tracking-wide">Explore</h1>
          <div className="flex items-center gap-1">
            {/* Search icon moved to tabs */}
            {/* Close Explore */}
            <button
              onClick={handleClose}
              className="p-2 -mr-1 flex items-center justify-center"
            >
              <div className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors">
                <X className="w-5 h-5" />
              </div>
            </button>
          </div>
        </div>

        {/* Search bar removed in favor of inline tabs search */}
        </div>
      )}

      {/* === SUB NAVIGATION === */}
      {mainTab === "videos" && (
        <div className="flex-none flex items-center px-4 h-12 bg-[#0c0d12] border-b border-white/5 z-[60] w-full">
          <div className="flex w-full gap-2 items-center">
            <button
              onClick={() => setReelsTab('all')}
              className={`flex-none px-4 whitespace-nowrap py-1.5 rounded-full text-sm font-medium transition-colors border ${
                reelsTab === 'all' 
                  ? "bg-white text-black border-white" 
                  : "bg-transparent text-gray-400 border-gray-800 hover:border-gray-600 hover:text-gray-200"
              }`}
            >
              All
            </button>
            
            <div className="flex-1 relative flex items-center group">
              <Search className="absolute left-3 w-4 h-4 text-gray-400 group-focus-within:text-[#00FFFF] transition-colors" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full bg-[#1c1d22] hover:bg-[#25262c] focus:bg-[#25262c] transition-all rounded-full py-1.5 pl-9 pr-8 text-sm text-white placeholder-gray-500 outline-none border border-transparent focus:border-[#00FFFF]/30 focus:ring-1 focus:ring-[#00FFFF]/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setReelsTab('following')}
              className={`flex-none px-4 whitespace-nowrap py-1.5 rounded-full text-sm font-medium transition-colors border ${
                reelsTab === 'following' 
                  ? "bg-white text-black border-white" 
                  : "bg-transparent text-gray-400 border-gray-800 hover:border-gray-600 hover:text-gray-200"
              }`}
            >
              Following
            </button>
          </div>
        </div>
      )}

      {/* History Reels Header */}
      {mainTab === "reels" && reelsTab === "history" && (
        <div className="absolute top-4 left-4 z-[100]">
          <button 
            onClick={(e) => { e.stopPropagation(); setMainTab('channel'); setReelsTab('all'); setSearchParams({}, { replace: true }); }}
            className="flex items-center gap-2 px-3 py-2 bg-black/50 hover:bg-black/70 border border-white/10 backdrop-blur-md rounded-full text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-semibold pr-1">Back to History</span>
          </button>
        </div>
      )}

      {/* Content Area */}
      <div ref={scrollRef} className={`flex-1 overflow-y-auto overflow-x-hidden overscroll-y-none no-scrollbar relative ${mainTab === "reels" ? "snap-y snap-mandatory bg-black" : "bg-gray-950 pb-24"}`}>
        {loading ? (
          mainTab === "reels" ? (
            <div className="w-full h-[calc(100dvh-98px)] bg-slate-950 animate-pulse relative">
              <div className="absolute right-4 bottom-24 flex flex-col gap-6">
                <div className="w-12 h-12 bg-slate-800/80 rounded-full" />
                <div className="w-12 h-12 bg-slate-800/80 rounded-full" />
                <div className="w-12 h-12 bg-slate-800/80 rounded-full" />
                <div className="w-12 h-12 bg-slate-800/80 rounded-full" />
              </div>
              <div className="absolute left-4 bottom-6 flex flex-col gap-3 w-3/4">
                <div className="w-40 h-5 bg-slate-800/80 rounded-full" />
                <div className="w-56 h-4 bg-slate-800/80 rounded-full" />
                <div className="w-64 h-4 bg-slate-800/80 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto w-full p-4 sm:pt-4 space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="w-full bg-[#0c0d12] border border-slate-800 rounded-xl animate-pulse flex flex-col overflow-hidden">
                  <div className="p-4 flex items-center gap-3 border-b border-slate-800">
                    <div className="w-10 h-10 bg-slate-800 rounded-full" />
                    <div className="flex flex-col gap-2">
                      <div className="w-32 h-3 bg-slate-800 rounded-full" />
                      <div className="w-20 h-2 bg-slate-800 rounded-full" />
                    </div>
                  </div>
                  <div className="w-full aspect-[4/3] bg-slate-800/50" />
                  <div className="p-4 flex items-center gap-4 border-t border-slate-800">
                    <div className="w-8 h-8 bg-slate-800 rounded-full" />
                    <div className="w-8 h-8 bg-slate-800 rounded-full" />
                    <div className="w-8 h-8 bg-slate-800 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )
        ) : posts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 mt-20">
            <Film className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-bold text-gray-400">No posts found</p>
            <p className="mt-2 text-sm text-center px-8">Check back later for new content.</p>
          </div>
        ) : (
          <div className={mainTab !== "reels" ? "max-w-2xl mx-auto" : ""}>
            {mainTab === "videos" ? (
              // YouTube-style video grid
              <div className="px-3 pt-3 pb-2">
                {posts
                  .filter(post => {
                    if (!searchQuery.trim()) return true;
                    const q = searchQuery.toLowerCase();
                    return (
                      (post.title || "").toLowerCase().includes(q) ||
                      (post.author_name || "").toLowerCase().includes(q) ||
                      (post.description || "").toLowerCase().includes(q)
                    );
                  })
                  .map(post => (
                    <VideoCard
                      key={post.id}
                      post={post}
                      user={user}
                      onClick={(p) => handleSelectVideo(p)}
                      onShare={(p) => setSharePost(p)}
                    />
                  ))
                }
                {searchQuery.trim() && posts.filter(post => {
                  const q = searchQuery.toLowerCase();
                  return (
                    (post.title || "").toLowerCase().includes(q) ||
                    (post.author_name || "").toLowerCase().includes(q) ||
                    (post.description || "").toLowerCase().includes(q)
                  );
                }).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Search className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-base font-semibold text-gray-400">No results for "{searchQuery}"</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                  </div>
                )}
              </div>
            ) : mainTab === "channel" ? (
              // Creator Dashboard (You Tab)
              <div className="px-4 pt-6 pb-24 max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden border border-white/10 bg-slate-800">
                    <img src={currentUserChannel?.avatar_url || user?.avatar_url || '/api/placeholder/80/80'} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">
                      {currentUserChannel ? currentUserChannel.name : (user?.username || 'Guest')}
                    </h2>
                    <p className="text-gray-400 text-sm">
                      @{currentUserChannel?.name?.toLowerCase().replace(/\s+/g, '') || user?.username?.toLowerCase().replace(/\s+/g, '') || 'guest'}
                    </p>
                    <button 
                      onClick={() => setShowCreatorStudio(true)} 
                      className="mt-3 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded-full transition-colors"
                    >
                      {currentUserChannel ? 'Your Channel' : 'Create Channel'}
                    </button>
                  </div>
                </div>

                {/* History Carousels */}
                {(() => {
                  const historyVideos = historyPosts.filter(p => p.type !== 'reel' && p.video_type !== 'short');
                  const historyReels = historyPosts.filter(p => p.type === 'reel' || p.video_type === 'short');
                  
                  return (
                    <div className="space-y-6">
                      {/* Videos History */}
                      {historyVideos.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <History className="w-5 h-5 text-gray-400" />
                              <h3 className="text-lg font-bold text-white">Video History</h3>
                            </div>
                            <button onClick={() => setHistorySlidePanel('videos')} className="text-xs text-orange-500 font-semibold">View All</button>
                          </div>
                          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
                            {historyVideos.slice(0, 10).map(post => (
                              <div key={post.id} className="flex-none w-44 snap-start">
                                <VideoCard
                                  post={post}
                                  user={user}
                                  onClick={(p) => handleSelectVideo(p)}
                                  onShare={(p) => setSharePost(p)}
                                  onRemoveHistory={removeHistoryPost}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Shorts History */}
                      {historyReels.length > 0 && (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Smartphone className="w-5 h-5 text-gray-400" />
                              <h3 className="text-lg font-bold text-white">Reel History</h3>
                            </div>
                            <button onClick={() => setHistorySlidePanel('reels')} className="text-xs text-orange-500 font-semibold">View All</button>
                          </div>
                          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory">
                            {historyReels.slice(0, 10).map(post => (
                              <div key={post.id} className="flex-none w-28 snap-start">
                                <VideoCard
                                  post={post}
                                  user={user}
                                  onClick={(p) => {
                                    if (p.type === 'reel' || p.video_type === 'short') {
                                      setMainTab('reels');
                                      setReelsTab('history');
                                      setSearchParams({ tab: 'reels', postId: p.id }, { replace: true });
                                    } else {
                                      handleSelectVideo(p);
                                    }
                                  }}
                                  onShare={(p) => setSharePost(p)}
                                  onRemoveHistory={removeHistoryPost}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Collections Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setShowSavedPosts(true)} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3.5 rounded-xl transition-colors text-left border border-white/5">
                    <Bookmark className="w-6 h-6 text-orange-500" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Watch Later</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{savedPosts.length} saved</p>
                    </div>
                  </button>
                  <button onClick={() => setShowLikedPosts(true)} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 p-3.5 rounded-xl transition-colors text-left border border-white/5">
                    <ThumbsUp className="w-6 h-6 text-pink-500" />
                    <div>
                      <h4 className="text-sm font-semibold text-white">Liked Videos</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{likedPosts.length} liked</p>
                    </div>
                  </button>
                </div>

              </div>
            ) : mainTab === "reels" ? (
              posts.map(post => (
                <div key={post.id} className={`${mainTab === 'reels' && reelsTab === 'history' ? 'h-[100dvh]' : 'h-[calc(100dvh-98px)]'} w-full relative snap-start snap-always`}>
                  <MediaPostCard 
                    post={post} 
                    user={user} 
                    onUpdate={handleUpdate} 
                    onOpenComments={handleOpenComments}
                    onShare={setSharePost}
                    onViewProfile={() => setViewProfileId(post.user_id)}
                    bottomOffset={0}
                    onScrollNext={() => {
                      if (scrollRef.current) {
                        scrollRef.current.scrollBy({ top: scrollRef.current.clientHeight, behavior: 'smooth' });
                      }
                    }}
                  />
                </div>
              ))
            ) : (
              posts.map(post => (
                <MediaAllCard
                  key={post.id}
                  post={post}
                  user={user}
                  onUpdate={handleUpdate}
                  onOpenComments={handleOpenComments}
                  onShare={setSharePost}
                  onViewProfile={() => setViewProfileId(post.user_id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* YouTube-style Video Detail Overlay */}
      {/* YouTube-style Video Detail Overlay */}
      <AnimatePresence>
        {selectedVideo && !isMiniPlayer && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.25 }}
            className="fixed inset-0 z-[80] bg-[#0f0f0f] flex flex-col"
          >
            {/* Top Bar */}
            <div className="flex-none flex items-center gap-3 px-3 h-12 bg-[#0f0f0f] border-b border-white/5 z-[81]">
              <button
                onClick={() => setIsMiniPlayer(true)}
                className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-white"
              >
                <ChevronDown className="w-6 h-6" />
              </button>
              <h1 className="text-white font-bold text-base truncate flex-1">{selectedVideo.title || "Video"}</h1>
            </div>
            <div className="flex-1 overflow-hidden">
              <VideoDetailView
                key={selectedVideo.id}
                post={selectedVideo}
                user={user}
                suggestedPosts={posts}
                onSelectVideo={(p) => handleSelectVideo(p)}
                onBack={() => setSelectedVideo(null)}
                onShare={setSharePost}
                onViewProfile={(uid) => { setViewProfileId(uid); }}
                onOpenComments={handleOpenComments}
                sharedVideoState={sharedVideoState}
                onMinimize={() => setIsMiniPlayer(true)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Player */}
      <AnimatePresence>
        {selectedVideo && isMiniPlayer && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-[60px] right-2 w-[220px] aspect-video z-[90] bg-black rounded-lg shadow-2xl border border-white/10 overflow-hidden cursor-pointer group"
            onClick={() => setIsMiniPlayer(false)}
          >
            <video
              ref={(el) => {
                miniVideoRef.current = el;
                if (el && isMiniPlayer && sharedVideoState.current && !el.dataset.synced) {
                  el.currentTime = sharedVideoState.current.currentTime || 0;
                  if (sharedVideoState.current.isPlaying) {
                    el.play().catch(() => {});
                    setIsMiniPlaying(true);
                  } else {
                    el.pause();
                    setIsMiniPlaying(false);
                  }
                  el.dataset.synced = "true";
                }
              }}
              src={selectedVideo.media_url || selectedVideo.video_url}
              muted={isMiniMuted}
              loop
              playsInline
              onPlay={() => { setIsMiniPlaying(true); sharedVideoState.current.isPlaying = true; }}
              onPause={() => { setIsMiniPlaying(false); sharedVideoState.current.isPlaying = false; }}
              onTimeUpdate={(e) => { sharedVideoState.current.currentTime = e.target.currentTime; }}
              className="w-full h-full object-cover pointer-events-none"
            />
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors pointer-events-none" />
            
            {/* Sound Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                const newMuted = !isMiniMuted;
                setIsMiniMuted(newMuted);
                if (miniVideoRef.current) {
                  miniVideoRef.current.muted = newMuted;
                }
                localStorage.setItem('global_muted', newMuted);
                window.dispatchEvent(new Event('mute_changed'));
              }}
              title={isMiniMuted ? "Unmute" : "Mute"}
              className="absolute bottom-1.5 left-1.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-[#00FFFF] transition-all hover:scale-110 opacity-0 group-hover:opacity-100 shadow-md"
            >
              {isMiniMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            
            {/* Play/Pause Center Button */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (miniVideoRef.current) {
                    if (isMiniPlaying) miniVideoRef.current.pause();
                    else miniVideoRef.current.play();
                  }
                }}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-[#00FFFF] transition-all hover:scale-110 active:scale-95 shadow-lg pointer-events-auto"
              >
                {isMiniPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 ml-0.5 fill-current" />}
              </button>
            </div>

            {/* Expand Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsMiniPlayer(false);
              }}
              title="Expand"
              className="absolute top-1.5 left-1.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedVideo(null);
                setIsMiniPlayer(false);
              }}
              title="Close"
              className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/90 transition-colors opacity-0 group-hover:opacity-100"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimalistic Bottom Navigation (Instagram/YouTube style) */}
      {!isSavedView && !(mainTab === 'reels' && reelsTab === 'history') && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/10 pb-safe">
          <div className="flex items-center justify-around h-[50px] px-2 max-w-md mx-auto">
            {[
              { id: "reels", label: "Reels", icon: Smartphone },
              { id: "videos", label: "Videos", icon: MonitorPlay },
              { id: "channel", label: "You", isAvatar: true },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = mainTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setMainTab(tab.id); if (tab.id === 'reels' && reelsTab === 'history') setReelsTab('all'); setSearchOpen(false); setSearchQuery(""); }}
                  className={`flex flex-col items-center justify-center w-20 h-full gap-0.5 transition-colors ${
                    isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-center h-6">
                    {tab.isAvatar ? (
                      <div className={`w-6 h-6 rounded-full overflow-hidden border-[1.5px] ${isActive ? 'border-white' : 'border-transparent'}`}>
                        {user ? (
                          <img src={user.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${user.email}`} alt="You" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gray-700" />
                        )}
                      </div>
                    ) : (
                      <Icon className={`w-6 h-6 transition-all duration-200 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? 'text-white font-semibold' : ''}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      {!(mainTab === 'reels' && reelsTab === 'history') && (
        <BottomNavigation />
      )}
      {/* Comments Drawer (Modernized via Portal to ensure absolute top layer) */}
      {selectedPost && createPortal(
        <div className="fixed inset-0 z-[1000] flex flex-col pointer-events-none">
          <div 
            className={`absolute inset-0 transition-opacity ${(selectedPost?.type === 'video' && selectedPost?.video_type !== 'short') ? 'bg-transparent pointer-events-none' : 'bg-black/70 backdrop-blur-sm pointer-events-auto'}`} 
            onClick={handleCloseComments}
          />
          <div
            className="absolute left-0 right-0 bg-gray-950 flex flex-col animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_50px_rgba(0,0,0,0.8)] border-t border-gray-800 overflow-hidden pb-safe pointer-events-auto"
            style={
              (selectedPost?.type === 'video' && selectedPost?.video_type !== 'short')
                ? {
                    // Attach just below the top bar (48px) + sticky video (16:9 = 56.25vw)
                    top: `calc(48px + min(56.25vw, 56.25vh))`,
                    bottom: 0,
                    borderRadius: 0,
                  }
                : {
                    bottom: 0,
                    height: '65dvh',
                    borderTopLeftRadius: '2rem',
                    borderTopRightRadius: '2rem',
                  }
            }
          >
            
            {/* Header */}
            <div className="flex flex-col items-center pt-4 pb-3 border-b border-gray-800/60 bg-gray-900/50 backdrop-blur-md">
              <div className="w-12 h-1.5 bg-gray-700 rounded-full mb-4" />
              <div className="w-full px-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-bold text-white">
                    Comments <span className="text-gray-500 text-sm font-normal">({selectedPost?.comments_count || 0})</span>
                  </h3>
                </div>
                <Button variant="ghost" size="icon" onClick={handleCloseComments} className="rounded-full text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-700">
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {commentsLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
                </div>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-10">
                  <MessageCircle className="w-12 h-12 mb-3 opacity-20" />
                  <p>No comments yet. Start the conversation!</p>
                </div>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div 
                      className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gray-800 border border-gray-700 cursor-pointer"
                      onClick={() => setViewProfileId(comment.user_id)}
                    >
                      <img 
                        src={(comment.user_id === user?.id && currentUserChannel) ? currentUserChannel.logo_url : (comment.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${comment.user_id}`)}
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = `https://api.dicebear.com/6.x/bottts/svg?seed=${comment.user_id}`; }}
                      />
                    </div>
                    <div className="flex-1">
                      {/* Parent Comment */}
                      <div 
                        className="cursor-pointer select-none"
                        onClick={(e) => {
                          if (e.detail === 2) handleLikeComment(comment);
                          if (e.detail === 3) setReplyingTo(comment);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-xs text-gray-200 flex items-center gap-1">
                            <span>{(comment.user_id === user?.id && currentUserChannel) ? currentUserChannel.name : comment.username}</span>
                            {(((comment.user_id === user?.id && currentUserChannel?.name?.includes("BATTLEHUB")) || comment.username?.includes("BATTLEHUB") || comment.user_id === "shopecdiv@gmail.com")) && (
                              <Check className="w-3.5 h-3.5 text-[#00FFFF] bg-[#00FFFF]/20 rounded-full p-0.5 flex-shrink-0" />
                            )}
                          </span>
                          <span className="text-[10px] text-gray-500">{safeFormatDistance(comment.created_date)}</span>
                        </div>
                        <p className="text-[13px] text-gray-200 leading-snug whitespace-pre-wrap">
                          {renderCommentText(comment.text)}
                          {comment.creator_starred && (
                            <span className="inline-flex relative group cursor-pointer ml-1.5 align-middle">
                              <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 drop-shadow-sm" />
                              <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-800/90 border border-gray-700 px-2 py-1 rounded-md text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999] shadow-xl">
                                {selectedPost?.channel_name || selectedPost?.username || 'Creator'}
                              </span>
                            </span>
                          )}
                        </p>
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
                        {(user?.id === comment.user_id || user?.role === 'admin' || user?.email === 'shopecdiv@gmail.com') ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteComment(comment.id); }}
                            className="text-xs font-medium text-red-500/70 hover:text-red-400 transition-colors ml-auto"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button 
                            onClick={(e) => { e.stopPropagation(); e.preventDefault(); setReportingCommentId(comment.id); }}
                            className="text-xs font-medium text-gray-500 hover:text-red-400 transition-colors ml-auto"
                            title="Report comment"
                          >
                            <Flag className="w-3.5 h-3.5" />
                          </button>
                        )}
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
                                onClick={() => setViewProfileId(reply.user_id)}
                              >
                                <img src={(reply.user_id === user?.id && currentUserChannel) ? currentUserChannel.logo_url : (reply.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${reply.user_id}`)} alt="Avatar" className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1">
                                <div 
                                  className="cursor-pointer select-none"
                                  onClick={(e) => {
                                    if (e.detail === 2) handleLikeReply(comment.id, reply.id);
                                    if (e.detail === 3) {
                                      setReplyingTo(comment);
                                      setNewComment(`@${reply.username} `);
                                    }
                                  }}
                                >
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-bold text-xs text-gray-200 flex items-center gap-1">
                                      <span>{(reply.user_id === user?.id && currentUserChannel) ? currentUserChannel.name : reply.username}</span>
                                      {(((reply.user_id === user?.id && currentUserChannel?.name?.includes("BATTLEHUB")) || reply.username?.includes("BATTLEHUB") || reply.user_id === "shopecdiv@gmail.com")) && (
                                        <Check className="w-3.5 h-3.5 text-[#00FFFF] bg-[#00FFFF]/20 rounded-full p-0.5 flex-shrink-0" />
                                      )}
                                    </span>
                                    <span className="text-[10px] text-gray-500">{safeFormatDistance(reply.created_date)}</span>
                                  </div>
                                  <p className="text-[13px] text-gray-200 leading-snug">
                                    {renderCommentText(reply.text)}
                                    {reply.creator_starred && (
                                      <span className="inline-flex relative group cursor-pointer ml-1.5 align-middle">
                                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500 drop-shadow-sm" />
                                        <span className="absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap bg-gray-800/90 border border-gray-700 px-2 py-1 rounded-md text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[9999] shadow-xl">
                                          {selectedPost?.channel_name || selectedPost?.username || 'Creator'}
                                        </span>
                                      </span>
                                    )}
                                  </p>
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
                                  {(user?.id === reply.user_id || user?.role === 'admin' || user?.email === 'shopecdiv@gmail.com') ? (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteReply(comment.id, reply.id); }}
                                      className="text-[11px] font-medium text-red-500/70 hover:text-red-400 transition-colors ml-auto"
                                      title="Delete reply"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  ) : (
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); setReportingCommentId(reply.id); }}
                                      className="text-[11px] font-medium text-gray-500 hover:text-red-400 transition-colors ml-auto"
                                      title="Report reply"
                                    >
                                      <Flag className="w-3 h-3" />
                                    </button>
                                  )}
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
                    <img src={currentUserChannel?.logo_url || user.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${user.email}`} alt="Me" className="w-full h-full object-cover" />
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
                    className="bg-gray-800/60 border-transparent focus-visible:ring-1 focus-visible:ring-gray-600 rounded-full h-10 text-[13px] px-4 pr-10 text-white placeholder:text-gray-500 shadow-none"
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

      {/* User Profile Slide-over */}
      {createPortal(
        <AnimatePresence>
          {viewProfileId && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[2000]"
                onClick={() => setViewProfileId(null)}
              />
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-full sm:w-[450px] md:w-[600px] bg-slate-950 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-[2001] overflow-hidden"
              >
                <PlayerProfile inlineUid={viewProfileId} isDrawer={true} onClose={() => setViewProfileId(null)} />
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Share Drawer */}
      {sharePost && <MediaShareDrawer post={sharePost} user={user} onClose={() => setSharePost(null)} />}

      {/* Report Modal */}
      {reportingCommentId && createPortal(
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 animate-in fade-in backdrop-blur-sm" onClick={() => setReportingCommentId(null)} />
          <div className="relative bg-[#1c1c1e] w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 border border-white/10">
            <div className="flex items-center gap-3 mb-4 text-red-400">
              <Flag className="w-5 h-5" />
              <h3 className="text-white text-lg font-bold">Report Comment</h3>
            </div>
            <p className="text-gray-400 text-sm mb-4">Please describe why you are reporting this comment. Your report will be reviewed by our moderation team.</p>
            <textarea
              autoFocus
              className="w-full bg-black/40 text-white rounded-xl p-3 outline-none focus:ring-1 focus:ring-red-500/50 border border-white/5 resize-none min-h-[100px] text-[13px] placeholder-gray-500"
              placeholder="What's wrong with this comment?"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setReportingCommentId(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.success("Comment reported successfully!");
                  setReportingCommentId(null);
                  setReportReason("");
                }}
                disabled={!reportReason.trim()}
                className="px-5 py-2 text-[13px] font-bold text-white bg-red-600 rounded-full disabled:opacity-50 disabled:bg-gray-800 hover:bg-red-700 transition-colors"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* History Slide Panel */}
      <AnimatePresence>
        {historySlidePanel && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[999] bg-slate-950 overflow-y-auto"
          >
            <div className="flex flex-col min-h-[100dvh]">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 border-b border-white/5 shadow-sm">
                <button onClick={() => setHistorySlidePanel(null)} className="p-2 -ml-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  {historySlidePanel === 'videos' ? 'Video History' : 'Reel History'}
                </h2>
              </div>
              
              {/* Content Grid */}
              <div className={`p-4 grid gap-2 sm:gap-4 ${historySlidePanel === 'videos' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-3 md:grid-cols-4'}`}>
                {(historySlidePanel === 'videos' 
                  ? historyPosts.filter(p => p.type === 'video' && p.video_type !== 'short') 
                  : historyPosts.filter(p => p.type === 'reel' || p.video_type === 'short')
                ).map(post => (
                  <div key={post.id} className="animate-in fade-in zoom-in-95 duration-300">
                    <VideoCard
                      post={post}
                      user={user}
                      onClick={(p) => {
                         setHistorySlidePanel(null); // Close panel when opening a video
                         if (p.type === 'reel' || p.video_type === 'short') {
                           setMainTab('reels');
                           setReelsTab('history');
                           setSearchParams({ tab: 'reels', postId: p.id }, { replace: true });
                         } else {
                           handleSelectVideo(p);
                         }
                      }}
                      onShare={(p) => setSharePost(p)}
                      onRemoveHistory={removeHistoryPost}
                    />
                  </div>
                ))}
                
                {historyPosts.length === 0 && (
                  <div className="col-span-full py-12 text-center text-gray-500 font-medium">
                    No history found.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Creator Studio Overlay */}
        {showCreatorStudio && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[999] bg-slate-950 overflow-y-auto"
          >
            <CreatorStudioPanel user={user} onClose={() => setShowCreatorStudio(false)} />
          </motion.div>
        )}
        
        {/* Liked Videos Slide Panel */}
        {showLikedPosts && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[999] bg-slate-950 overflow-y-auto"
          >
            <div className="flex flex-col min-h-[100dvh]">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 border-b border-white/5 shadow-sm">
                <button onClick={() => setShowLikedPosts(false)} className="p-2 -ml-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Liked Videos
                </h2>
              </div>
              
              {/* Content Grid */}
              <div className="flex-1 pb-10">
                {(() => {
                  const likedVideos = likedPosts.filter(p => p.type !== 'reel' && p.video_type !== 'short');
                  const likedReels = likedPosts.filter(p => p.type === 'reel' || p.video_type === 'short');
                  
                  return (
                    <>
                      {/* Liked Videos */}
                      {likedVideos.length > 0 && (
                        <div className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                            {likedVideos.map(post => (
                              <div key={post.id} className="animate-in fade-in zoom-in-95 duration-300">
                                <VideoCard
                                  post={post}
                                  user={user}
                                  onClick={(p) => {
                                     setShowLikedPosts(false);
                                     handleSelectVideo(p);
                                  }}
                                  onShare={(p) => setSharePost(p)}
                                  onRemoveLikedVideo={async (p) => {
                                    if (!user) return;
                                    try {
                                      await MediaPost.toggleLike(p.id, user.id);
                                      setLikedPosts(prev => prev.filter(x => x.id !== p.id));
                                    } catch(e) {}
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Liked Reels */}
                      {likedReels.length > 0 && (
                        <div className="p-4 pt-2">
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4 mt-2">
                            {likedReels.map(post => (
                              <div key={post.id} className="animate-in fade-in zoom-in-95 duration-300">
                                <VideoCard
                                  post={post}
                                  user={user}
                                  onClick={(p) => {
                                     setShowLikedPosts(false);
                                     setMainTab('reels');
                                     setReelsTab('history');
                                     setSearchParams({ tab: 'reels', postId: p.id }, { replace: true });
                                  }}
                                  onShare={(p) => setSharePost(p)}
                                  onRemoveLikedVideo={async (p) => {
                                    if (!user) return;
                                    try {
                                      await MediaPost.toggleLike(p.id, user.id);
                                      setLikedPosts(prev => prev.filter(x => x.id !== p.id));
                                    } catch(e) {}
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {likedPosts.length === 0 && (
                        <div className="py-20 text-center text-gray-500 font-medium">
                          You haven't liked any videos yet.
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}

        {/* Watch Later Slide Panel */}
        {showSavedPosts && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[999] bg-slate-950 overflow-y-auto"
          >
            <div className="flex flex-col min-h-[100dvh]">
              {/* Header */}
              <div className="flex items-center gap-3 p-4 sticky top-0 bg-slate-950/90 backdrop-blur-md z-10 border-b border-white/5 shadow-sm">
                <button onClick={() => setShowSavedPosts(false)} className="p-2 -ml-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-white">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Watch Later
                </h2>
              </div>
              
              {/* Content Grid */}
              <div className="flex-1 pb-10">
                {(() => {
                  const savedVideos = savedPosts.filter(p => p.type !== 'reel' && p.video_type !== 'short');
                  const savedReels = savedPosts.filter(p => p.type === 'reel' || p.video_type === 'short');
                  
                  return (
                    <>
                      {/* Saved Videos */}
                      {savedVideos.length > 0 && (
                        <div className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
                            {savedVideos.map(post => (
                              <div key={post.id} className="animate-in fade-in zoom-in-95 duration-300">
                                <VideoCard
                                  post={post}
                                  user={user}
                                  onClick={(p) => {
                                     setShowSavedPosts(false);
                                     handleSelectVideo(p);
                                  }}
                                  onShare={(p) => setSharePost(p)}
                                  onRemoveWatchLater={removeSavedPost}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Saved Reels */}
                      {savedReels.length > 0 && (
                        <div className="p-4 pt-2">
                          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4 mt-2">
                            {savedReels.map(post => (
                              <div key={post.id} className="animate-in fade-in zoom-in-95 duration-300">
                                <VideoCard
                                  post={post}
                                  user={user}
                                  onClick={(p) => {
                                     setShowSavedPosts(false);
                                     setMainTab('reels');
                                     setReelsTab('history');
                                     setSearchParams({ tab: 'reels', postId: p.id }, { replace: true });
                                  }}
                                  onShare={(p) => setSharePost(p)}
                                  onRemoveWatchLater={removeSavedPost}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {savedPosts.length === 0 && (
                        <div className="py-20 text-center text-gray-500 font-medium">
                          You haven't saved any videos yet.
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
