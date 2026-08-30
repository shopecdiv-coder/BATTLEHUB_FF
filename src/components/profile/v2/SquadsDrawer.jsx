import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Users, UserPlus, Save, Trash2, Edit2, ChevronLeft, ArrowLeft, Shield, X, Plus, Upload, Loader2, ImageIcon, Crown, CheckCircle2, QrCode, ScanLine, Copy, Search, UserCheck, Send, UserMinus } from 'lucide-react';
import { User, Squad, SquadRequest, Notification, Friendship } from '@/api/entities';
import { db } from "@/api/firebaseClient";
import { collection, query, where, onSnapshot, doc } from "firebase/firestore";
import { useAuth } from '@/lib/AuthContext';
import { UploadFile } from '@/integrations/Core';
import { QRCodeSVG } from 'qrcode.react';
import CustomScanner from '@/components/CustomScanner';
import { Camera } from '@capacitor/camera';

export default function SquadsDrawer({ children, isOpen: externalIsOpen, onOpenChange: externalOnOpenChange }) {
  const { user, reloadUser } = useAuth();
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = (val) => {
    setInternalIsOpen(val);
    if (externalOnOpenChange) externalOnOpenChange(val);
  };

  useEffect(() => {
    const handleGlobalOpen = () => {
      setIsOpen(true);
    };
    window.addEventListener('openSquadsDrawer', handleGlobalOpen);
    return () => window.removeEventListener('openSquadsDrawer', handleGlobalOpen);
  }, []);

  const [mySquad, setMySquad] = useState(null);
  const [squadMembers, setSquadMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);


  const handleScanClick = async () => {
    try {
      const status = await Camera.checkPermissions();
      if (status.camera !== 'granted') {
        const reqStatus = await Camera.requestPermissions({ permissions: ['camera'] });
        if (reqStatus.camera !== 'granted') {
          alert('Camera permission is required to scan QR codes.');
          return;
        }
      }
    } catch (e) {
      console.log('Web environment or permission check failed, proceeding to scan...', e);
    }
    setView('scan');
  };

  // Views: 'main' | 'create' | 'join' | 'scan' | 'requests'
  const [view, setView] = useState('main'); 
  const [showInvite, setShowInvite] = useState(false);
  const [showFriendSheet, setShowFriendSheet] = useState(false);
  
  // Friend Invite States
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [invitedFriends, setInvitedFriends] = useState([]);
  
  // Create States
  const [squadName, setSquadName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [leaderIgn, setLeaderIgn] = useState("");
  const [leaderUid, setLeaderUid] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);

  // Join States
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  // Role State
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingRoleValue, setEditingRoleValue] = useState("");

  const [leaveTimer, setLeaveTimer] = useState(null);

  useEffect(() => {
    let interval;
    if (leaveTimer !== null && leaveTimer > 0) {
      interval = setInterval(() => {
        setLeaveTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [leaveTimer]);

  useEffect(() => {
    if (!isOpen) setLeaveTimer(null);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && user) {
      loadData();
    }
  }, [isOpen, user]);

  const loadData = async (forcedSquadId = undefined) => {
    setLoading(true);
    try {
      const dbUser = user ? await User.get(user.id) : null;
      const currentSquadId = forcedSquadId !== undefined ? forcedSquadId : dbUser?.squad_id;
      
      if (currentSquadId) {
        const sq = await Squad.get(currentSquadId);
        setMySquad(sq);
        
        // Let the real-time listeners handle members and requests
      } else {
        setMySquad(null);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Real-time listeners for Members, Requests, and My User Data
  useEffect(() => {
    let unsubMembers = () => {};
    let unsubRequests = () => {};
    let unsubUser = () => {};

    if (user?.uid || user?.id) {
      const uid = user.id;
      unsubUser = onSnapshot(doc(db, "users", uid), (docSnap) => {
        if (docSnap.exists()) {
          const dbUser = docSnap.data();
          if (dbUser.squad_id && dbUser.squad_id !== mySquad?.id) {
            loadData(dbUser.squad_id);
          } else if (!dbUser.squad_id && mySquad?.id) {
            setMySquad(null);
            setSquadMembers([]);
          }
        }
      });
    }

    if (mySquad?.id) {
      // Listen for squad members
      const qMembers = query(collection(db, "users"), where("squad_id", "==", mySquad.id));
      unsubMembers = onSnapshot(qMembers, (snapshot) => {
        setSquadMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      // Listen for pending requests
      const qRequests = query(collection(db, "squad_requests"), where("squad_id", "==", mySquad.id), where("status", "==", "pending"));
      unsubRequests = onSnapshot(qRequests, (snapshot) => {
        setRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      });
    }

    return () => {
      unsubMembers();
      unsubRequests();
      unsubUser();
    };
  }, [mySquad?.id, user]);

  const generateJoinCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    try {
      const { file_url } = await UploadFile({ file });
      setLogoUrl(file_url);
    } catch (err) {
      alert("Logo upload failed.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const createSquad = async () => {
    if (!squadName.trim()) {
      alert("Squad Name is required!");
      return;
    }
    if (!leaderIgn.trim() || !leaderUid.trim()) {
      alert("Leader IGN and UID are required!");
      return;
    }
    setSaving(true);
    try {
      const newSquad = await Squad.create({
        name: squadName,
        logo_url: logoUrl,
        leader_id: user.id,
        leader_uid: leaderUid,
        join_code: generateJoinCode(),
        max_players: maxPlayers,
        members: [{ uid: leaderUid, ign: leaderIgn, role: 'leader' }]
      });
      await User.updateMyUserData({ squad_id: newSquad.id, ign: leaderIgn, game_id: leaderUid });
      await reloadUser();
      await loadData(newSquad.id);
      setView('main');
    } catch (err) {
      console.error(err);
      alert("Failed to create squad");
    }
    setSaving(false);
  };

  const joinSquad = async (code = joinCode) => {
    if (!code) return;
    const cleanCode = code.trim().toUpperCase();
    setJoining(true);
    try {
      const sqList = await Squad.filter({ join_code: cleanCode });
      if (sqList.length === 0) {
        alert("Invalid Squad Code or Squad not found!");
        setJoining(false);
        return;
      }
      
      const targetSquad = sqList[0];

      // Check if squad is already full
      const targetSquadMembers = await User.filter({ squad_id: targetSquad.id });
      if (targetSquadMembers.length >= (targetSquad.max_players || 4)) {
        alert(`This squad is already full (${targetSquad.max_players || 4}/${targetSquad.max_players || 4} members)!`);
        setJoining(false);
        return;
      }
      
      // Check existing pending request
      const existingReqs = await SquadRequest.filter({ requester_uid: user.id, squad_id: targetSquad.id, status: 'pending' });
      if (existingReqs.length > 0) {
        alert("You have already requested to join this squad. Please wait for approval.");
        setJoining(false);
        return;
      }

      const req = await SquadRequest.create({
        squad_id: targetSquad.id,
        squad_name: targetSquad.name,
        requester_uid: user.id,
        requester_ign: user.ign,
        status: 'pending'
      });

      await Notification.create({
        recipient_id: targetSquad.leader_uid,
        title: "Squad Join Request",
        message: `${user.ign} requested to join your squad: ${targetSquad.name}`,
        type: "squad_request",
        related_id: req.id
      });

      alert("Request sent successfully! Wait for the team leader to accept.");
      setView('main');
    } catch (err) {
      console.error(err);
      alert("Error sending join request.");
    }
    setJoining(false);
  };

  const acceptRequest = async (reqId, requesterUid) => {
    if (squadMembers.length >= (mySquad?.max_players || 4)) {
      alert(`Your squad is already full! (${mySquad?.max_players || 4} members). Remove a member before accepting new requests.`);
      return;
    }
    try {
      await SquadRequest.update(reqId, { status: 'accepted' });
      
      let targetUser = await User.get(requesterUid).catch(() => null);
      if (!targetUser) {
        const userRes = await User.filter({ uid: requesterUid });
        if (userRes.length > 0) targetUser = userRes[0];
      }

      if (targetUser) {
        await User.update(targetUser.id, { squad_id: mySquad.id });
        await Notification.create({
          recipient_id: targetUser.id,
          title: "Squad Request Accepted",
          message: `Your request to join ${mySquad.name} was accepted!`,
          type: "squad_accepted",
          related_id: mySquad.id
        });
        alert("Player added to your squad!");
        loadData(mySquad.id);
      } else {
        alert("Player profile not found. They might have deleted their account.");
        loadData(mySquad.id);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to accept request.");
    }
  };

  const rejectRequest = async (reqId, requesterUid) => {
    try {
      await SquadRequest.update(reqId, { status: 'rejected' });
      await Notification.create({
        recipient_id: requesterUid,
        title: "Squad Request Rejected",
        message: `Your request to join ${mySquad.name} was rejected.`,
        type: "squad_rejected"
      });
      loadData(mySquad.id);
    } catch (err) {
      console.error(err);
    }
  };

  const loadFriends = async () => {
    setFriendsLoading(true);
    try {
      const [sent, received] = await Promise.all([
        Friendship.filter({ user_id: user.id }),
        Friendship.filter({ friend_id: user.id })
      ]);
      const allRelations = [...sent, ...received].filter(rel => rel.status === 'accepted');
      const friendIds = [...new Set(allRelations.map(rel => rel.user_id === user.id ? rel.friend_id : rel.user_id))];
      
      if (friendIds.length > 0) {
        const friendData = await Promise.all(friendIds.map(id => User.get(id).catch(() => null)));
        setFriends(friendData.filter(Boolean));
      } else {
        setFriends([]);
      }
    } catch (e) { console.error(e); }
    setFriendsLoading(false);
  };

  const inviteFriend = async (friend) => {
    if (squadMembers.length >= (mySquad?.max_players || 4)) {
      alert("Squad is already full!");
      return;
    }
    try {
      await Notification.create({
        recipient_id: friend.id || friend.uid,
        sender_id: user.id || user.uid,
        title: "Squad Invitation",
        message: `${user.ign} invited you to join their squad: ${mySquad.name}!`,
        type: "squad_invite",
        related_id: mySquad.id
      });
      setInvitedFriends(prev => [...prev, friend.id || friend.uid]);
      alert(`Invitation sent to ${friend.ign || 'your friend'}!`);
    } catch (e) {
      console.error(e);
      alert("Failed to send invitation.");
    }
  };

  const openInviteView = () => {
    if (squadMembers.length >= (mySquad?.max_players || 4)) {
      alert("Squad is full! Remove a member first.");
      return;
    }
    setShowFriendSheet(true);
    loadFriends();
  };

  const handleLeaveClick = () => {
    if (leaveTimer === null) {
      setLeaveTimer(3);
    } else if (leaveTimer === 0) {
      leaveSquad();
      setLeaveTimer(null);
    }
  };

  const leaveSquad = async () => {
    const reason = prompt("Are you sure you want to leave the squad? Enter a reason (optional):");
    if (reason !== null) {
      try {
        if (mySquad.leader_id === user.id && squadMembers.length === 1) {
          // Dissolve squad
          await Squad.delete(mySquad.id);
        } else {
          // Notify other members
          const promises = squadMembers
             .filter(m => (m.id || m.uid) !== user.id)
             .map(m => Notification.create({
                recipient_id: m.id || m.uid,
                title: "Squad Member Left",
                message: `${user.ign} left ${mySquad.name}. Reason: ${reason || 'No reason provided'}`,
                type: "squad_left"
             }));
          await Promise.all(promises);
        }
        await User.update(user.id, { squad_id: null });
        loadData(null); // will clear mySquad
      } catch (err) {
        console.error(err);
      }
    }
  };

  const kickMember = async (member) => {
    if (confirm(`Are you sure you want to kick ${member.ign || 'this player'} from the squad?`)) {
      try {
        await User.update(member.id, { squad_id: null });
        await Notification.create({
          recipient_id: member.id || member.uid,
          title: "Removed from Squad",
          message: `You were removed from ${mySquad.name} by the leader.`,
          type: "squad_kicked"
        });
      } catch (err) {
        console.error(err);
        alert("Failed to kick member.");
      }
    }
  };

  const saveMemberRole = async (memberId) => {
    try {
      await User.update(memberId, { squad_role: editingRoleValue });
      setEditingRoleId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to update role");
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {children && (
        <SheetTrigger asChild>
          {children}
        </SheetTrigger>
      )}
      
      <SheetContent 
        side="right" 
        hideClose={true}
        className="w-full sm:w-[450px] h-full bg-slate-950 border-l border-slate-800 p-0 flex flex-col z-[100] overflow-hidden"
      >
        <SheetHeader className="px-6 py-4 border-b border-slate-800 bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
            {view !== 'main' ? (
              <button 
                onClick={() => {
                  setView('main');
                  setSquadName("");
                  setLogoUrl("");
                  setJoinCode("");
                  setLeaderIgn("");
                  setLeaderUid("");
                  setShowInvite(false);
                }}
                className="w-8 h-8 flex items-center justify-center bg-gray-900 rounded-full text-white hover:bg-gray-800"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 flex items-center justify-center bg-gray-900 rounded-full text-white hover:bg-gray-800 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex-1">
              <SheetTitle className="text-white text-lg font-black uppercase tracking-wider text-left">
                {view === 'create' ? 'Create Squad' : 
                 view === 'join' ? 'Join Squad' : 
                 view === 'scan' ? 'Scan QR' : 
                 view === 'requests' ? 'Join Requests' : 
                 'Your Squad'}
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-8 h-8 text-[#0ea5e9] animate-spin" />
            </div>
          ) : (
            <>
              {/* MAIN VIEW */}
              {view === 'main' && (
                <>
                  {!mySquad ? (
                    <div className="space-y-6 h-full flex flex-col">
                      <div className="flex flex-col items-center justify-center py-10 text-center space-y-4 bg-slate-950 border border-dashed border-slate-800 rounded-2xl">
                        <div className="w-20 h-20 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center shadow-inner">
                          <Shield className="w-10 h-10 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="text-white font-black text-lg mb-1 uppercase tracking-wider">No Squad Found</h3>
                          <p className="text-gray-500 text-sm">Create a new team or join an existing one.</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setLeaderIgn(user?.ign || "");
                          setLeaderUid(user?.game_id || "");
                          setView('create');
                        }}
                        className="w-full py-4 bg-gradient-to-r from-[#0ea5e9] to-red-600 text-white font-black uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#0ea5e9]/20 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-5 h-5" /> Create New Squad
                      </button>

                      <div className="flex items-center gap-4">
                        <div className="flex-1 h-px bg-[#1f2029]"></div>
                        <span className="text-gray-500 font-bold uppercase text-[10px]">OR</span>
                        <div className="flex-1 h-px bg-[#1f2029]"></div>
                      </div>

                      <button
                        onClick={() => setView('join')}
                        className="w-full py-4 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-[#0ea5e9]/50 text-white font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg"
                      >
                        <Search className="w-5 h-5" /> Join Another Team
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Squad Identity */}
                      <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden min-h-[220px] flex flex-col justify-center items-center transition-all duration-300">
                        {/* QR Toggle Button at Top Right */}
                        <button 
                          onClick={() => setShowInvite(!showInvite)}
                          className="absolute top-4 right-4 w-10 h-10 bg-slate-900 hover:bg-[#0ea5e9] border border-slate-700 hover:border-[#0ea5e9] flex items-center justify-center rounded-lg text-gray-500 hover:text-white transition-all shadow-md z-10"
                          title={showInvite ? "Close QR" : "Show QR Code"}
                        >
                          {showInvite ? <X className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                        </button>

                        {!showInvite ? (
                          <div className="animate-in fade-in zoom-in-95 duration-300 w-full mt-4">
                            <div className="w-24 h-24 mx-auto rounded-2xl bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center mb-4">
                              {mySquad.logo_url ? (
                                <img src={mySquad.logo_url} alt="Logo" className="w-full h-full object-cover" />
                              ) : (
                                <Shield className="w-10 h-10 text-[#0ea5e9]" />
                              )}
                            </div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-widest">{mySquad.name}</h2>
                          </div>
                        ) : (
                          <div className="animate-in fade-in zoom-in-95 duration-300 w-full flex flex-col items-center mt-6">
                            <div className="bg-white p-3 rounded-xl shadow-2xl mb-4">
                              <QRCodeSVG value={mySquad.join_code} size={130} />
                            </div>
                            <div className="flex flex-col items-center">
                               <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">Squad Code</p>
                               <div className="flex items-center gap-3 bg-slate-900 border border-[#0ea5e9]/30 px-4 py-2 rounded-xl">
                                 <span className="text-white font-black tracking-[0.3em] text-lg">{mySquad.join_code}</span>
                                 <button onClick={() => copyToClipboard(mySquad.join_code)} className="text-gray-500 hover:text-[#0ea5e9] transition-colors"><Copy className="w-4 h-4"/></button>
                               </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Leader Actions */}
                      {mySquad.leader_id === user.id && requests.length > 0 && squadMembers.length < (mySquad?.max_players || 4) && (
                        <div 
                          onClick={() => setView('requests')}
                          className="bg-slate-900 border border-[#0ea5e9]/50 p-4 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#0ea5e9]/10 rounded-lg flex items-center justify-center">
                              <UserCheck className="w-5 h-5 text-[#0ea5e9]" />
                            </div>
                            <div>
                              <h4 className="text-white font-bold uppercase tracking-wider text-sm">Join Requests</h4>
                              <p className="text-[#0ea5e9] text-[10px] font-bold uppercase">
                                {requests.length} Pending
                              </p>
                            </div>
                          </div>
                          <ChevronLeft className="w-5 h-5 text-gray-500 rotate-180" />
                        </div>
                      )}

                      {/* Roster */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
                          <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                            <Users className="w-4 h-4" /> MEMBERS
                          </h4>
                          <div className="flex items-center gap-3">
                            <span className="text-white font-black bg-gray-800 px-2 rounded">{squadMembers.length}/{mySquad?.max_players || 4}</span>
                            {squadMembers.length < (mySquad?.max_players || 4) && (
                              <button 
                                onClick={openInviteView}
                                className="w-6 h-6 bg-slate-900 border border-slate-700 hover:bg-white/10 text-gray-400 hover:text-white rounded flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-3">
                          {squadMembers.map((m, idx) => {
                            const isCurrentUserLeader = mySquad.leader_uid === user?.uid || mySquad.leader_id === user?.id;
                            const isMemberLeader = mySquad.leader_uid === m.uid || mySquad.leader_id === m.id;
                            
                            return (
                              <div key={idx} className="flex items-center gap-3">
                                <div className={`relative w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border p-0.5 ${
                                  isMemberLeader ? 'bg-white/5 border-white/20' : 'bg-slate-950 border-slate-800'
                                }`}>
                                  <img src={m.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (m.uid || m.id)} className="w-full h-full rounded-[6px] object-cover" />
                                  {isMemberLeader && (
                                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-slate-900 rounded-full flex items-center justify-center border border-white/20 shadow-lg">
                                      <Crown className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 overflow-hidden flex flex-col justify-center">
                                  <div className="flex items-center gap-2">
                                    <p className="text-white font-bold text-sm truncate">{m.ign}</p>
                                    {isMemberLeader && <span className="text-[9px] bg-white/10 text-white border border-white/10 px-1.5 py-0.5 rounded font-black uppercase tracking-wider shrink-0">Leader</span>}
                                  </div>
                                  <div className="flex items-center gap-2 text-[9px] mt-0.5">
                                    <span className="text-gray-500 uppercase font-bold tracking-wider">UID: {m.game_id || m.uid}</span>
                                    <span className="text-gray-700">•</span>
                                    {editingRoleId === m.id ? (
                                      <div className="flex items-center gap-1">
                                        <input 
                                          autoFocus
                                          type="text" 
                                          value={editingRoleValue} 
                                          onChange={(e) => setEditingRoleValue(e.target.value)}
                                          onKeyDown={(e) => e.key === 'Enter' && saveMemberRole(m.id)}
                                          className="bg-slate-900 border border-slate-700 text-gray-300 px-2 py-1 rounded-md uppercase font-bold text-[10px] w-28 tracking-widest focus:outline-none focus:border-gray-500 focus:text-white transition-colors"
                                          placeholder="ASSIGN ROLE"
                                          maxLength={12}
                                        />
                                        <div className="flex items-center gap-1 ml-1">
                                          <button onClick={() => saveMemberRole(m.id)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Save Role">
                                            <CheckCircle2 className="w-4 h-4" />
                                          </button>
                                          <button onClick={() => setEditingRoleId(null)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Cancel">
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1 group">
                                        <span className={`font-black uppercase tracking-wider ${m.squad_role ? 'text-gray-300' : 'text-gray-600'}`}>{m.squad_role || 'NO ROLE'}</span>
                                        {isCurrentUserLeader && (
                                          <button 
                                            onClick={() => {
                                              setEditingRoleId(m.id);
                                              setEditingRoleValue(m.squad_role || "");
                                            }}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-white"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {isCurrentUserLeader && !isMemberLeader && (
                                  <button 
                                    onClick={() => kickMember(m)}
                                    className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 hover:bg-white/10 text-gray-500 hover:text-white flex items-center justify-center transition-colors shrink-0"
                                    title="Kick Player"
                                  >
                                    <UserMinus className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={handleLeaveClick}
                        disabled={leaveTimer !== null && leaveTimer > 0}
                        className={`w-full py-4 font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                          leaveTimer === 0 
                            ? 'bg-red-600/20 text-red-500 border border-red-500/50 hover:bg-red-600 hover:text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]' 
                            : 'bg-slate-950 border border-slate-700 text-gray-400 hover:text-white hover:bg-white/5'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {leaveTimer !== null && leaveTimer > 0 
                          ? `Confirm in ${leaveTimer}s` 
                          : leaveTimer === 0 
                            ? 'Confirm Leave!' 
                            : (mySquad.leader_id === user.id && squadMembers.length === 1 ? 'Dissolve Squad' : 'Leave Squad')}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* CREATE SQUAD VIEW */}
              {view === 'create' && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  
                  {/* Top Intro Card */}
                  <div className="bg-gradient-to-br from-[#0ea5e9]/10 to-[#8b5cf6]/10 border border-[#0ea5e9]/20 p-5 rounded-2xl text-center relative overflow-hidden shadow-[0_0_20px_rgba(14,165,233,0.1)]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#0ea5e9]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-[#8b5cf6]/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                    <p className="text-gray-300 text-xs sm:text-sm font-medium leading-relaxed relative z-10">
                      Create your own squad, invite friends using your unique 6-digit <strong className="text-white">Squad Code</strong> or <strong className="text-white">QR code</strong>, and dominate the leaderboards!
                    </p>
                  </div>

                  {/* Logo Upload */}
                  <div className="space-y-3">
                    <label className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Squad Logo (Optional)</label>
                    <div className="flex items-center gap-5">
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0a0a0c] border-2 border-dashed border-[#0ea5e9]/40 hover:border-[#0ea5e9] overflow-hidden flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(14,165,233,0.15)] transition-all">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-[#0ea5e9]/50" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          id="squad-logo"
                          accept="image/*"
                          className="hidden"
                          onChange={handleLogoUpload}
                          disabled={uploadingLogo}
                        />
                        <label 
                          htmlFor="squad-logo"
                          className="inline-flex items-center justify-center gap-2 px-4 py-3 sm:py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-all w-full backdrop-blur-sm group"
                        >
                          {uploadingLogo ? (
                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 text-[#0ea5e9] animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-white transition-colors" />
                          )}
                          <span className="text-xs sm:text-sm font-bold text-gray-300 group-hover:text-white uppercase tracking-wider transition-colors">
                            {uploadingLogo ? 'Uploading...' : 'Upload Image'}
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Squad Name */}
                  <div className="space-y-3">
                    <label className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Squad Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Team Alpha"
                      value={squadName}
                      onChange={(e) => setSquadName(e.target.value)}
                      className="w-full bg-[#0a0a0c] border border-slate-800 text-white px-5 py-4 rounded-xl focus:border-[#0ea5e9] focus:bg-[#0c0d12] outline-none font-black text-lg sm:text-xl transition-all shadow-inner focus:shadow-[0_0_15px_rgba(14,165,233,0.15)] placeholder:text-gray-700"
                    />
                  </div>

                  {/* Max Players */}
                  <div className="space-y-3">
                    <label className="text-[10px] sm:text-xs font-black text-gray-400 uppercase tracking-widest pl-1">Max Players</label>
                    <div className="grid grid-cols-5 gap-2 sm:gap-3">
                      {[2, 3, 4, 5, 6].map(num => (
                        <button
                          key={num}
                          onClick={() => setMaxPlayers(num)}
                          className={`py-3 sm:py-4 rounded-xl font-black text-lg transition-all duration-300 ${maxPlayers === num ? 'bg-[#0ea5e9] text-white shadow-[0_0_15px_rgba(14,165,233,0.4)] scale-[1.02] border-transparent' : 'bg-[#0a0a0c] border border-slate-800 text-gray-500 hover:text-white hover:border-gray-600 hover:bg-slate-900'}`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Leader Info */}
                  <div className="bg-[#0a0a0c] border border-slate-800 p-5 rounded-2xl space-y-4 relative overflow-hidden group hover:border-slate-700 transition-colors">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#0ea5e9] to-[#8b5cf6]"></div>
                    <h4 className="text-white text-xs sm:text-sm font-black uppercase tracking-widest flex items-center gap-2">
                      <Crown className="w-4 h-4 text-[#0ea5e9]" /> Your Info (Leader)
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Your IGN</label>
                        <input
                          type="text"
                          placeholder="In-game Name"
                          value={leaderIgn}
                          onChange={(e) => setLeaderIgn(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-lg outline-none focus:border-[#0ea5e9] transition-all focus:bg-[#0c0d12]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Your UID</label>
                        <input
                          type="text"
                          placeholder="Game UID"
                          value={leaderUid}
                          onChange={(e) => setLeaderUid(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 text-white px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm rounded-lg outline-none focus:border-[#0ea5e9] transition-all focus:bg-[#0c0d12]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Create Button */}
                  <button
                    onClick={createSquad}
                    disabled={saving}
                    className="w-full py-4 sm:py-5 mt-2 bg-gradient-to-r from-[#0ea5e9] to-[#8b5cf6] hover:from-[#0284c7] hover:to-[#7c3aed] text-white font-black text-sm sm:text-base uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)] active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {saving ? <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" /> : <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />} 
                    {saving ? 'Creating Squad...' : 'Create Squad'}
                  </button>
                </div>
              )}

              {/* JOIN SQUAD VIEW */}
              {view === 'join' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex flex-col h-full">
                  <div className="text-center py-6">
                    <QrCode className="w-16 h-16 text-[#0ea5e9] mx-auto mb-4" />
                    <h3 className="text-white font-black text-xl tracking-wide uppercase">Have a Squad Code?</h3>
                    <p className="text-gray-500 text-sm mt-2">Enter the 6-digit Squad Code or scan the QR code to join your friends.</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Squad Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="000000"
                        maxLength={6}
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="flex-1 bg-slate-900 border border-slate-700 text-white px-4 py-4 rounded-xl focus:border-[#0ea5e9] outline-none font-black text-2xl tracking-[0.5em] text-center transition-colors placeholder:text-gray-800"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleScanClick}
                      className="w-16 h-16 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white rounded-xl transition-colors flex flex-col items-center justify-center shrink-0"
                    >
                      <ScanLine className="w-6 h-6 text-[#0ea5e9]" />
                    </button>
                    
                    <button
                      onClick={() => joinSquad(joinCode)}
                      disabled={joining || joinCode.length < 6}
                      className="flex-1 bg-gradient-to-r from-[#0ea5e9] to-red-600 text-white font-black uppercase tracking-wider rounded-xl hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-[#0ea5e9]/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send Request'}
                    </button>
                  </div>
                </div>
              )}

              {/* SCAN QR VIEW */}
              {view === 'scan' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 flex flex-col h-full relative items-center justify-center">
                  <style>
                    {`
                      @keyframes scanLine {
                        0% { top: 0%; }
                        50% { top: 100%; }
                        100% { top: 0%; }
                      }
                      .animate-scan-line {
                        animation: scanLine 2.5s ease-in-out infinite;
                      }
                    `}
                  </style>
                  
                  <div className="w-[280px] h-[280px] rounded-3xl overflow-hidden relative shadow-[0_0_50px_rgba(255,85,0,0.15)] ring-4 ring-[#0ea5e9]/30 ring-offset-4 ring-offset-[#0a0a0c]">
                    <CustomScanner
                      onScan={(result) => {
                        if (result && result.length > 0) {
                          setJoinCode(result[0].rawValue);
                          setView('join');
                        }
                      }}
                      onError={(error) => {
                        console.error("Scanner Error:", error);
                      }}
                    />
                    
                    {/* Custom Corner Accents */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[#0ea5e9] rounded-tl-3xl z-10"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[#0ea5e9] rounded-tr-3xl z-10"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[#0ea5e9] rounded-bl-3xl z-10"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[#0ea5e9] rounded-br-3xl z-10"></div>

                    {/* Animated scan line */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-[#0ea5e9] shadow-[0_0_15px_#0ea5e9] animate-scan-line z-20"></div>
                  </div>
                  
                  <div className="text-center mt-6">
                    <p className="text-white text-base font-black uppercase tracking-widest mb-1">Align QR Code</p>
                    <p className="text-slate-400 text-sm font-medium tracking-wide">Position QR within frame to join</p>
                  </div>
                </div>
              )}

              {/* REQUESTS VIEW */}
              {view === 'requests' && (
                <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                  {requests.length === 0 ? (
                    <div className="text-center py-10 bg-slate-950 border border-dashed border-slate-800 rounded-2xl">
                      <UserCheck className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                      <h3 className="text-white font-black text-lg uppercase tracking-wider">No Pending Requests</h3>
                    </div>
                  ) : (
                    requests.map(req => (
                      <div key={req.id} className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-white font-bold text-sm">{req.requester_ign}</p>
                          <p className="text-gray-500 text-[10px] uppercase font-bold mt-1">UID: {req.requester_uid}</p>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => acceptRequest(req.id, req.requester_uid)} className="px-4 py-2 bg-[#0ea5e9] hover:bg-orange-700 text-white font-bold text-xs uppercase rounded-lg">Accept</button>
                          <button onClick={() => rejectRequest(req.id, req.requester_uid)} className="px-4 py-2 bg-gray-800 hover:bg-red-500/20 text-gray-300 hover:text-red-500 font-bold text-xs uppercase rounded-lg">Reject</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

            </>
          )}
        </div>

        {/* INVITE FRIENDS RIGHT SLIDE-IN */}
        <div 
          className={`absolute top-0 right-0 h-full bg-slate-900 border-l border-slate-700 transition-transform duration-300 z-50 shadow-[-10px_0_40px_rgba(0,0,0,0.8)] flex flex-col ${showFriendSheet ? 'translate-x-0 w-[85%]' : 'translate-x-full w-[85%]'}`}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
            <h3 className="text-white font-black uppercase tracking-wider flex items-center gap-2 text-sm">
              <UserPlus className="w-5 h-5 text-[#0ea5e9]" /> Invite Friends
            </h3>
            <button 
              onClick={() => setShowFriendSheet(false)}
              className="w-8 h-8 flex items-center justify-center bg-gray-900 rounded-full text-white hover:bg-red-500 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">


            {friendsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 text-[#0ea5e9] animate-spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-10 bg-slate-950 border border-dashed border-slate-800 rounded-2xl">
                <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                <h3 className="text-white font-black text-lg uppercase tracking-wider">No Friends Found</h3>
                <p className="text-gray-500 text-xs mt-1">Add friends first to invite them.</p>
              </div>
            ) : (
              <div className="space-y-3 pb-10">
                {friends.map(friend => {
                  const isMember = squadMembers.some(m => m.uid === friend.uid || m.id === friend.id);
                  const isInvited = invitedFriends.includes(friend.id) || invitedFriends.includes(friend.uid);
                  
                  return (
                    <div key={friend.id} className="bg-slate-950 border border-slate-700 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img 
                          src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.uid}`} 
                          className="w-10 h-10 rounded-lg bg-slate-900"
                        />
                        <div>
                          <p className="text-white font-bold text-sm">{friend.ign || friend.displayName || 'Unknown'}</p>
                          <p className="text-gray-500 text-[10px] uppercase font-bold mt-1">UID: {friend.game_id || friend.uid}</p>
                        </div>
                      </div>
                      
                      {isMember ? (
                        <span className="text-gray-500 text-[10px] font-bold uppercase bg-gray-800 px-2 py-1 rounded">Joined</span>
                      ) : isInvited ? (
                        <button 
                          onClick={() => inviteFriend(friend)}
                          className="px-3 py-1.5 bg-slate-950 border border-slate-700 hover:border-[#0ea5e9]/50 text-gray-400 hover:text-white font-bold text-xs uppercase rounded-lg flex items-center gap-1 transition-colors"
                        >
                          <Send className="w-3 h-3" /> Resend
                        </button>
                      ) : (
                        <button 
                          onClick={() => inviteFriend(friend)}
                          className="px-3 py-1.5 bg-[#0ea5e9] hover:bg-orange-700 text-white font-bold text-xs uppercase rounded-lg flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" /> Invite
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
