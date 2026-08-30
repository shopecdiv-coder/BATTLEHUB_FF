import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  X, Send, CheckCircle2, Share2, Link as LinkIcon, 
  Download, Loader2, Trophy, Users, Award, ShieldCheck, Flame
} from "lucide-react";
import { Friendship, User, GroupChatMessage } from "@/api/entities";
import { doc, setDoc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/api/firebaseClient';
import { Button } from "@/components/ui/button";
import { Share } from '@capacitor/share';
import { toast } from "react-hot-toast";
import { generateTournamentPDF, getTournamentPDFFile, generateLeaderboardPosterPNG, PDFProgressModal } from "./TournamentPDFReport";

let cachedFriends = null;
let cachedGroups = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000;

export default function TournamentStandingsShareDrawer({
  open,
  onClose,
  tournament,
  leaderboardRows = [],
  registrations = [],
  matches = [],
  selectedStage = "all",
  selectedGroup = "all",
  user
}) {
  const [friends, setFriends] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [sentList, setSentList] = useState(new Set());
  const [sendingTo, setSendingTo] = useState(null);
  const [isSharingSystem, setIsSharingSystem] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [isDownloadingPoster, setIsDownloadingPoster] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(null);

  const tTitle = tournament?.title || "Tournament Standings";
  const stageName = selectedStage === "all" ? (tournament?.stage || "All Stages") : selectedStage;
  const groupName = selectedGroup === "all" ? "All Groups" : `Group ${selectedGroup}`;
  
  // URL to tournament standings
  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/TournamentDetail?id=${tournament?.id}&tab=standings` 
    : "";

  const shareText = `🏆 *${tTitle} - Official Standings*\n📍 Stage: ${stageName} | ${groupName}\n⚡ Check out the live leaderboard & match results on BATTLEHUB! 🔥`;

  useEffect(() => {
    if (!open) return;

    if (!user) {
      setLoadingContacts(false);
      return;
    }

    const loadFriendsAndGroups = async () => {
      if (cachedFriends && cachedGroups && (Date.now() - lastCacheTime < CACHE_DURATION)) {
        setFriends(cachedFriends);
        setUserGroups(cachedGroups);
        setLoadingContacts(false);
        return;
      }

      setLoadingContacts(true);
      try {
        const [sent, received] = await Promise.all([
          Friendship.filter({ user_id: user.id }),
          Friendship.filter({ friend_id: user.id })
        ]);
        const allRelations = [...sent, ...received].filter(rel => rel.status === 'accepted');
        
        const uniqueConvos = [];
        const seen = new Set();
        
        for (const rel of allRelations) {
          const otherId = rel.user_id === user.id ? rel.friend_id : rel.user_id;
          if (!seen.has(otherId)) {
            seen.add(otherId);
            uniqueConvos.push(otherId);
          }
        }
        
        const convos = await Promise.all(
          uniqueConvos.map(async (otherId) => await User.get(otherId).catch(() => null))
        );
        
        const validFriends = convos.filter(Boolean);

        // Load Groups
        const q = query(
          collection(db, "user_groups"),
          where("members", "array-contains", user.id)
        );
        const docs = await getDocs(q);
        const gList = docs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const allowedGroups = gList.filter(g => {
          if (g.settings_send_messages === 'admins') {
            return g.admins && g.admins.includes(user.id);
          }
          return true;
        });
        
        cachedFriends = validFriends;
        cachedGroups = allowedGroups;
        lastCacheTime = Date.now();
        
        setFriends(validFriends);
        setUserGroups(allowedGroups);
      } catch (e) {
        console.error("Failed to load contacts for share drawer", e);
      }
      setLoadingContacts(false);
    };

    loadFriendsAndGroups();
  }, [user, open]);

  // Send Standings in BattleHub in-app chat
  const handleInAppSend = async (targetId, isGroup = false) => {
    if (!user) {
      toast.error("Please login to send to friends");
      return;
    }
    setSendingTo(targetId);

    try {
      const formattedMessage = `${shareText}\n\n🔗 ${shareUrl}`;
      const groupId = isGroup ? targetId : `direct_${[user.id, targetId].sort().join('_')}`;

      await GroupChatMessage.create({
        user_id: user.id,
        username: user.full_name || user.ign || 'User',
        user_ign: user.ign || user.full_name || 'User',
        avatar_url: user.avatar_url || '',
        sender_email: user.email || '',
        sender_role: user.role || 'user',
        message: formattedMessage,
        message_type: 'tournament_share',
        reply_to_id: null,
        reply_to_text: null,
        reply_to_user: null,
        reply_to_type: 'text',
        is_deleted: false,
        is_pinned: false,
        is_read: false,
        reactions: { likes: [], hearts: [], laughs: [], fire: [], claps: [] },
        created_at: new Date().toISOString(),
        group_id: groupId
      });

      if (!isGroup) {
        const chatRef = doc(db, "direct_chats", groupId);
        await setDoc(chatRef, {
          participants: [user.id, targetId],
          [`unread_count_${targetId}`]: increment(1),
          last_message: `🏆 Shared ${tTitle} Standings`,
          last_message_timestamp: new Date().toISOString(),
          last_sender_name: user.ign || user.full_name || 'User'
        }, { merge: true });
      }

      setSentList(prev => new Set(prev).add(targetId));
      toast.success("Standings sent! ✉️");
    } catch (err) {
      console.error("Failed to send standings in chat:", err);
      toast.error("Failed to send message");
    } finally {
      setSendingTo(null);
    }
  };

  // System Share / Mobile Native Share with PDF File
  const handleSystemShare = async () => {
    if (isSharingSystem) return;
    setIsSharingSystem(true);
    const toastId = toast.loading("Preparing Standings PDF for sharing...");

    try {
      // 1. Generate the actual PDF File object
      const pdfFile = await getTournamentPDFFile({
        tournament,
        leaderboardRows,
        registrations,
        matches,
        selectedStage,
        selectedGroup
      });

      // 2. Try Native Web Share with the PDF File (WhatsApp, Telegram, Drive, Discord, etc.)
      if (navigator.canShare && pdfFile && navigator.canShare({ files: [pdfFile] })) {
        toast.dismiss(toastId);
        await navigator.share({
          files: [pdfFile],
          title: `${tTitle} - Official Standings`,
          text: shareText
        });
        toast.success("Standings shared! 🚀");
        return;
      }

      // 3. Capacitor Share Plugin Fallback
      if (window.Capacitor?.isNativePlatform?.()) {
        toast.dismiss(toastId);
        await Share.share({
          title: `${tTitle} - Standings`,
          text: shareText,
          url: shareUrl,
          dialogTitle: "Share Standings via"
        });
        return;
      }

      // 4. Standard Web Share with Text & URL
      if (navigator.share) {
        toast.dismiss(toastId);
        await navigator.share({
          title: `${tTitle} - Standings`,
          text: shareText,
          url: shareUrl
        });
        return;
      }

      // 5. Fallback: Copy link & trigger direct download
      toast.dismiss(toastId);
      navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      toast.success("Link copied! Downloading Standings PDF...");
      await generateTournamentPDF({
        tournament,
        leaderboardRows,
        registrations,
        matches,
        selectedStage,
        selectedGroup
      });

    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("System share error:", err);
        // Fallback to clipboard
        navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
        toast.error("Opened fallback share. Link copied to clipboard!", { id: toastId });
      } else {
        toast.dismiss(toastId);
      }
    } finally {
      setIsSharingSystem(false);
    }
  };

  // Direct Save PDF with real-time visual progress modal
  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    setIsDownloadingPdf(true);
    setPdfProgress({ page: 1, totalPages: 1, percentage: 0, title: "Initializing PDF Generator..." });
    try {
      await generateTournamentPDF({
        tournament,
        leaderboardRows,
        registrations,
        matches,
        selectedStage,
        selectedGroup,
        onProgress: (prog) => {
          setPdfProgress(prog);
        }
      });
      toast.success("Standings PDF Downloaded! 📄");
    } catch (err) {
      console.error("Download PDF failed:", err);
      toast.error("Download failed. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
      setPdfProgress(null);
    }
  };

  // Direct Save High-Res Social Media Leaderboard Poster (PNG)
  const handleDownloadPoster = async () => {
    if (isDownloadingPoster) return;
    setIsDownloadingPoster(true);
    const toastId = toast.loading("🖼️ Generating High-Res Social Media Poster...");
    try {
      await generateLeaderboardPosterPNG({
        tournament,
        leaderboardRows,
        registrations
      });
      toast.success("Social Media Poster Saved! 📱", { id: toastId });
    } catch (err) {
      console.error("Download poster failed:", err);
      toast.error("Poster generation failed. Try again.", { id: toastId });
    } finally {
      setIsDownloadingPoster(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
    toast.success("Standings link copied to clipboard! 📋");
  };

  if (!open) return null;

  const topTeam = leaderboardRows[0]?.team_name || leaderboardRows[0]?.player_ign || "TBD";
  const totalKills = leaderboardRows.reduce((sum, r) => sum + (Number(r.kills) || 0), 0);

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 z-[1050] flex flex-col pointer-events-auto">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Sliding Sheet Container */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[85dvh] bg-slate-950 rounded-t-[2.25rem] flex flex-col animate-in slide-in-from-bottom-full duration-300 shadow-[0_-10px_50px_rgba(0,0,0,0.9)] border-t border-slate-800 overflow-hidden pb-safe">
        
        {/* Top Handle & Header Bar */}
        <div className="flex flex-col items-center pt-3.5 pb-2.5 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl shrink-0">
          <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mb-3" />
          
          <div className="w-full px-4 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shrink-0">
                <Share2 className="w-4 h-4 text-orange-400" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-black text-white tracking-wide truncate">
                  Share Official Standings
                </h3>
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  {tTitle} • {stageName}
                </p>
              </div>
            </div>

            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose} 
              className="rounded-full text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 h-8 w-8 shrink-0 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">

          {/* Mini Standings Preview Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-orange-950/30 border border-slate-800/90 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
              <Trophy className="w-28 h-28 text-orange-500" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="bg-orange-500 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                  BATTLEHUB
                </span>
                <span className="text-[10px] font-bold text-slate-300 uppercase">
                  Official Certificate
                </span>
              </div>
              <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> VERIFIED
              </span>
            </div>

            <h4 className="text-sm font-black text-white truncate mb-2">{tTitle}</h4>

            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-800/80">
              <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/60">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Teams</div>
                <div className="text-xs font-black text-white">{leaderboardRows.length}</div>
              </div>
              <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/60">
                <div className="text-[9px] text-slate-400 font-bold uppercase">Total Kills</div>
                <div className="text-xs font-black text-orange-400">{totalKills}</div>
              </div>
              <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/60">
                <div className="text-[9px] text-slate-400 font-bold uppercase">#1 Champion</div>
                <div className="text-xs font-black text-amber-400 truncate">{topTeam}</div>
              </div>
            </div>
          </div>

          {/* IN-APP CONTACTS: FRIENDS & GROUPS */}
          <div className="space-y-4">
            {loadingContacts ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              </div>
            ) : (
              <>
                {/* Friends Horizontal Row */}
                {friends.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5 px-1">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-orange-400" /> SEND TO FRIENDS
                      </span>
                      <span className="text-[10px] text-slate-400">{friends.length} online</span>
                    </div>

                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                      {friends.map(friend => {
                        const isSent = sentList.has(friend.id);
                        const isSending = sendingTo === friend.id;

                        return (
                          <button
                            key={friend.id}
                            disabled={isSent || isSending}
                            onClick={() => handleInAppSend(friend.id, false)}
                            className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none cursor-pointer"
                          >
                            <div className="relative w-13 h-13 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-800 group-hover:border-orange-500 transition-all shadow-md">
                              <img 
                                src={friend.avatar_url || `https://api.dicebear.com/6.x/bottts/svg?seed=${friend.email}`}
                                alt={friend.ign || friend.full_name || 'Friend'}
                                className="w-full h-full object-cover"
                              />
                              {isSending && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                  <Loader2 className="w-5 h-5 text-orange-500 animate-spin" />
                                </div>
                              )}
                              {isSent && (
                                <div className="absolute inset-0 bg-emerald-950/80 flex items-center justify-center">
                                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-300 font-medium truncate w-14 text-center">
                              {friend.ign || friend.full_name?.split(' ')[0]}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Groups Horizontal Row */}
                {userGroups.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2.5 px-1">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-amber-400" /> SEND TO SQUADS & GROUPS
                      </span>
                      <span className="text-[10px] text-slate-400">{userGroups.length} groups</span>
                    </div>

                    <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                      {userGroups.map(group => {
                        const isSent = sentList.has(group.id);
                        const isSending = sendingTo === group.id;

                        return (
                          <button
                            key={group.id}
                            disabled={isSent || isSending}
                            onClick={() => handleInAppSend(group.id, true)}
                            className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none cursor-pointer"
                          >
                            <div className="relative w-13 h-13 rounded-2xl overflow-hidden bg-slate-900 border-2 border-slate-800 group-hover:border-amber-500 transition-all shadow-md">
                              <img 
                                src={group.dp || `https://api.dicebear.com/7.x/shapes/svg?seed=${group.name}`}
                                alt={group.name}
                                className="w-full h-full object-cover"
                              />
                              {isSending && (
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                  <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                                </div>
                              )}
                              {isSent && (
                                <div className="absolute inset-0 bg-emerald-950/80 flex items-center justify-center">
                                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-300 font-medium truncate w-14 text-center">
                              {group.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>

        {/* ── BOTTOM ACTIONS: SHARE APPS • DOWNLOAD PDF • SOCIAL POSTER • COPY LINK ── */}
        <div className="shrink-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/90 p-3">
          <div className="grid grid-cols-4 gap-2 max-w-lg mx-auto">
            
            {/* Action 1: System Share (WhatsApp, Telegram, IG, Drive, etc. with PDF) */}
            <button
              onClick={handleSystemShare}
              disabled={isSharingSystem}
              className="flex flex-col items-center justify-center gap-1 bg-gradient-to-b from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-slate-950 font-black p-2 rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer border border-orange-400/40"
              title="Share PDF to WhatsApp, Telegram, Instagram, etc."
            >
              {isSharingSystem ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <Share2 className="w-4 h-4 stroke-[2.5]" />
              )}
              <span className="text-[10px] leading-tight font-black truncate w-full text-center">
                {isSharingSystem ? "Sharing..." : "Share Apps"}
              </span>
            </button>

            {/* Action 2: Direct Download PDF */}
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex flex-col items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold p-2 rounded-xl border border-slate-700/80 active:scale-95 transition-all shadow-md cursor-pointer"
              title="Download PDF Booklet"
            >
              {isDownloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
              ) : (
                <Download className="w-4 h-4 text-orange-400 stroke-[2.5]" />
              )}
              <span className="text-[10px] leading-tight font-bold truncate w-full text-center">
                {isDownloadingPdf ? "Saving..." : "PDF Booklet"}
              </span>
            </button>

            {/* Action 3: Social Media Poster PNG */}
            <button
              onClick={handleDownloadPoster}
              disabled={isDownloadingPoster}
              className="flex flex-col items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold p-2 rounded-xl border border-slate-700/80 active:scale-95 transition-all shadow-md cursor-pointer"
              title="Download Social Media Poster Image (PNG)"
            >
              {isDownloadingPoster ? (
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              ) : (
                <Award className="w-4 h-4 text-cyan-400 stroke-[2.5]" />
              )}
              <span className="text-[10px] leading-tight font-bold truncate w-full text-center">
                {isDownloadingPoster ? "Creating..." : "Social PNG"}
              </span>
            </button>

            {/* Action 4: Copy Link */}
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold p-2 rounded-xl border border-slate-700/80 active:scale-95 transition-all shadow-md cursor-pointer"
              title="Copy Tournament Standings Link"
            >
              <LinkIcon className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
              <span className="text-[10px] leading-tight font-bold truncate w-full text-center">Copy Link</span>
            </button>

          </div>
        </div>

      </div>

      {/* Real-time PDF Progress Modal */}
      <PDFProgressModal open={isDownloadingPdf} progress={pdfProgress} />
    </div>,
    document.body
  ) : null;
}
