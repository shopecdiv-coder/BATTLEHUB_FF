import React, { useRef, useState, useEffect } from 'react';
import { db } from '@/api/firebaseClient';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PenTool, MousePointer2, Minus, ArrowRight, Circle, Square, Eraser, 
  Undo2, Redo2, Trash2, Download, Save, Map, Users, ChevronDown, AlignLeft,
  Target, Send, X, MoreVertical, Palette, Flag, Maximize,
  Type, ListOrdered, Highlighter, Ruler, Eye, Radio
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import StrategyCanvas from './StrategyCanvas';
import StrategyObjects, { OBJECT_ICONS } from './StrategyObjects';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { uploadFileToAWS } from '@/utils/awsStorage';
import { GroupChatMessage } from "@/api/entities";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { Hand } from 'lucide-react';

import { collection, query, orderBy } from 'firebase/firestore';

const PHASES = ['PRE-MATCH', 'EARLY GAME', 'MID GAME', 'END GAME'];

const COLORS = [
  { id: 'red', hex: '#ef4444' },
  { id: 'blue', hex: '#3b82f6' },
  { id: 'green', hex: '#22c55e' },
  { id: 'purple', hex: '#a855f7' },
  { id: 'white', hex: '#ffffff' },
  { id: 'yellow', hex: '#eab308' },
];

const TOOLS = [
  { id: 'pan', icon: Hand, label: 'Pan / Move' },
  { id: 'pen', icon: PenTool, label: 'Free Draw' },
  { id: 'highlight', icon: Highlighter, label: 'Highlighter' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { id: 'line', icon: Minus, label: 'Line' },
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'text', icon: Type, label: 'Text Tool' },
  { id: 'number', icon: ListOrdered, label: 'Numbered Steps' },
  { id: 'ruler', icon: Ruler, label: 'Distance Ruler' },
  { id: 'ping', icon: Radio, label: 'Live Ping' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' }
];

const DEFAULT_PHASE_DATA = { drawings: [], markers: [], objects: [], notes: '' };

export default function StrategyMap({ partyId, user, partyMembers = [] }) {
  const exportRef = useRef(null);
  
  // Local UI State
  const [activePhase, setActivePhase] = useState('PRE-MATCH');
  const [selectedMap, setSelectedMap] = useState('');
  const [mapLoading, setMapLoading] = useState(true);
  const [tool, setTool] = useState('pan');
  const [color, setColor] = useState('#ef4444');
  const [showMapSelect, setShowMapSelect] = useState(false);
  const [showSquadMenu, setShowSquadMenu] = useState(false);
  const [minScale, setMinScale] = useState(0.1);
  const [showObjectsMenu, setShowObjectsMenu] = useState(false);
  const hasShownTipRef = useRef(false);

  useEffect(() => {
    if (selectedMap) setMapLoading(true);
  }, [selectedMap]);
  
  const showDoubleTapTip = () => {
    if (!hasShownTipRef.current && window.innerWidth < 640) {
      toast('Tip: Double-tap any object to delete it!', {
        icon: '💡',
        style: {
          borderRadius: '10px',
          background: '#1a1a24',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)'
        },
        duration: 4000
      });
      hasShownTipRef.current = true;
    }
  };

  const [objMenuPos, setObjMenuPos] = useState({ left: 0, top: 0 });

  const handleObjClick = (e) => {
    if (!showObjectsMenu) {
      const rect = e.currentTarget.getBoundingClientRect();
      let left = rect.left;
      const menuWidth = 256; // w-64 is 256px
      if (left + menuWidth > window.innerWidth - 16) {
        left = window.innerWidth - menuWidth - 16;
      }
      setObjMenuPos({ left: left, top: rect.bottom + 8 });
    }
    setShowObjectsMenu(!showObjectsMenu);
    setShowSquadMenu(false);
  };
  const [hoveredTooltip, setHoveredTooltip] = useState(null);
  const [availableMaps, setAvailableMaps] = useState([]);
  const [zoomScale, setZoomScale] = useState(1);
  const [isShared, setIsShared] = useState(false);
  const transformComponentRef = useRef(null);

  // Fetch dynamic maps
  useEffect(() => {
    const q = query(collection(db, 'game_maps'), orderBy('created_date', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const maps = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailableMaps(maps);
      if (maps.length > 0 && !selectedMap) {
        setSelectedMap(maps[0].id);
      }
    });
    return () => unsub();
  }, []);
  
  // Undo/Redo History (Local)
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Active Colors mapped to party members
  const activeMembersColors = partyMembers.length > 0 
    ? partyMembers.map((m, i) => ({ ...COLORS[i % COLORS.length], member: m }))
    : [{ ...COLORS[0], member: user || { ign: 'You' } }];

  // Set default color based on user position
  useEffect(() => {
    if (user && partyMembers.length > 0) {
      const myIndex = partyMembers.findIndex(m => m.id === user?.id);
      if (myIndex !== -1) {
        setColor(COLORS[myIndex % COLORS.length].hex);
      }
    }
  }, [user, partyMembers]);

  // Synced State
  const [strategyData, setStrategyData] = useState({
    mapId: '',
    currentPhase: 'PRE-MATCH',
    phases: {
      'PRE-MATCH': { ...DEFAULT_PHASE_DATA },
      'EARLY GAME': { ...DEFAULT_PHASE_DATA },
      'MID GAME': { ...DEFAULT_PHASE_DATA },
      'END GAME': { ...DEFAULT_PHASE_DATA },
    }
  });

  // Load from Firebase
  useEffect(() => {
    if (!partyId) return;
    const unsub = onSnapshot(doc(db, 'party_drawings', partyId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.phases) {
          setStrategyData(data);
          if (data.mapId) setSelectedMap(data.mapId);
          if (data.currentPhase) setActivePhase(data.currentPhase);
        }
      }
    });
    return () => unsub();
  }, [partyId]);

  // Sync to Firebase
  const syncToFirebase = async (newData) => {
    try {
      await setDoc(doc(db, 'party_drawings', partyId), newData, { merge: true });
    } catch (err) {
      console.error("Failed to sync strategy", err);
    }
  };

  // Local state updaters that trigger sync
  const updateActivePhaseData = (key, value) => {
    const newData = {
      ...strategyData,
      phases: {
        ...strategyData.phases,
        [activePhase]: {
          ...strategyData.phases[activePhase],
          [key]: value
        }
      }
    };
    // Save to history for undo/redo if it's drawings
    if (key === 'drawings') {
      const newHistory = history.slice(0, historyStep + 1);
      newHistory.push(value);
      setHistory(newHistory);
      setHistoryStep(newHistory.length - 1);
    }
    
    setStrategyData(newData);
    syncToFirebase(newData);
  };

  const handleLinesChange = (newLines) => {
    updateActivePhaseData('drawings', newLines);
  };

  const handleNotesChange = (e) => {
    updateActivePhaseData('notes', e.target.value);
  };

  const handlePhaseChange = (phase) => {
    setActivePhase(phase);
    const newData = { ...strategyData, currentPhase: phase };
    setStrategyData(newData);
    syncToFirebase(newData);
    
    // Reset history for new phase
    setHistory([]);
    setHistoryStep(-1);
  };

  const handleMapChange = (mapId) => {
    setSelectedMap(mapId);
    setShowMapSelect(false);
    const newData = { ...strategyData, mapId };
    setStrategyData(newData);
    syncToFirebase(newData);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1;
      setHistoryStep(newStep);
      const restored = history[newStep];
      
      const newData = {
        ...strategyData,
        phases: {
          ...strategyData.phases,
          [activePhase]: {
             ...strategyData.phases[activePhase],
             drawings: restored
          }
        }
      };
      setStrategyData(newData);
      syncToFirebase(newData);
    } else if (historyStep === 0) {
      setHistoryStep(-1);
      const newData = {
        ...strategyData,
        phases: {
          ...strategyData.phases,
          [activePhase]: { ...strategyData.phases[activePhase], drawings: [] }
        }
      };
      setStrategyData(newData);
      syncToFirebase(newData);
    }
  };

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1;
      setHistoryStep(newStep);
      const restored = history[newStep];
      
      const newData = {
        ...strategyData,
        phases: {
          ...strategyData.phases,
          [activePhase]: { ...strategyData.phases[activePhase], drawings: restored }
        }
      };
      setStrategyData(newData);
      syncToFirebase(newData);
    }
  };

  const handleClear = () => {
    if (!window.confirm('Are you sure you want to clear your drawings and objects from this board?')) return;

    const currentDrawings = strategyData.phases[activePhase]?.drawings || [];
    const currentObjects = strategyData.phases[activePhase]?.objects || [];
    
    // Only remove drawings and objects created by the current user
    const filteredDrawings = currentDrawings.filter(d => d.userId !== user?.id);
    const filteredObjects = currentObjects.filter(o => o.userId !== user?.id);

    updateActivePhaseData('drawings', filteredDrawings);
    updateActivePhaseData('objects', filteredObjects);
  };

  // Object & Marker Management
  const getViewportCenter = () => {
    if (!transformComponentRef.current || !exportRef.current) return { x: 100, y: 100 };
    const wrapper = exportRef.current.parentElement?.parentElement;
    if (!wrapper) return { x: 100, y: 100 };
    
    const { scale, positionX, positionY } = transformComponentRef.current.state;
    const centerX = wrapper.clientWidth / 2;
    const centerY = wrapper.clientHeight / 2;
    
    return {
      x: (centerX - positionX) / scale,
      y: (centerY - positionY) / scale
    };
  };

  const handleAddObject = (type) => {
    const center = getViewportCenter();
    const newObj = {
      id: Date.now().toString(),
      userId: user?.id,
      type,
      x: center.x,
      y: center.y
    };
    const currentObjects = strategyData.phases[activePhase]?.objects || [];
    updateActivePhaseData('objects', [...currentObjects, newObj]);
    showDoubleTapTip();
  };

  const handleAddNumber = (pos, objColor) => {
    const currentObjects = strategyData.phases[activePhase]?.objects || [];
    const numberObjs = currentObjects.filter(o => o.type === 'number');
    const newNumber = numberObjs.length + 1;
    const newObj = {
      id: Date.now().toString(),
      userId: user?.id,
      type: 'number',
      numberValue: newNumber,
      color: objColor,
      x: pos.x,
      y: pos.y
    };
    updateActivePhaseData('objects', [...currentObjects, newObj]);
    showDoubleTapTip();
  };

  const handleAddText = (pos, text, objColor) => {
    const currentObjects = strategyData.phases[activePhase]?.objects || [];
    const newObj = {
      id: Date.now().toString(),
      userId: user?.id,
      type: 'text',
      textValue: text,
      color: objColor,
      x: pos.x,
      y: pos.y
    };
    updateActivePhaseData('objects', [...currentObjects, newObj]);
    showDoubleTapTip();
  };

  const handleAddFlagDirectly = () => {
    let myColorObj = activeMembersColors.find(c => c.member.id === user?.id);
    if (!myColorObj && activeMembersColors.length > 0) {
      myColorObj = activeMembersColors[0];
    }
    if (myColorObj) {
      handleAddMarker(myColorObj.member, myColorObj);
    } else {
      toast.error("No party members available to flag");
    }
  };

  const handleAddMarker = (member, squadColor) => {
    const center = getViewportCenter();
    const newMarker = {
      id: `marker_${member.id}_${Date.now()}`,
      name: member.ign,
      label: 'P' + ((strategyData.phases[activePhase]?.markers?.length || 0) + 1),
      color: squadColor.hex,
      role: 'Player',
      x: center.x,
      y: center.y
    };
    const currentMarkers = strategyData.phases[activePhase]?.markers || [];
    updateActivePhaseData('markers', [...currentMarkers, newMarker]);
  };

  const updateObjectPos = (id, newPos) => {
    const currentObjs = strategyData.phases[activePhase]?.objects || [];
    const updated = currentObjs.map(obj => obj.id === id ? { ...obj, ...newPos } : obj);
    updateActivePhaseData('objects', updated);
  };

  const updateMarkerPos = (id, newPos) => {
    const currentMarkers = strategyData.phases[activePhase]?.markers || [];
    const updated = currentMarkers.map(m => m.id === id ? { ...m, ...newPos } : m);
    updateActivePhaseData('markers', updated);
  };

  const removeObject = (id) => {
    const currentObjs = strategyData.phases[activePhase]?.objects || [];
    const updated = currentObjs.filter(obj => obj.id !== id);
    updateActivePhaseData('objects', updated);
  };

  const removeMarker = (id) => {
    const currentMarkers = strategyData.phases[activePhase]?.markers || [];
    const updated = currentMarkers.filter(m => m.id !== id);
    updateActivePhaseData('markers', updated);
  };

  // Export & Share to Chat
  const handleShareToChat = async () => {
    if (!exportRef.current) return;
    if (!partyId) {
      toast.error("No party active to share this plan.");
      return;
    }
    
    const toastId = toast.loading('Capturing plan and sending to chat...');
    try {
      const watermark = exportRef.current.querySelector('[data-export-watermark]');
      if (watermark) watermark.style.opacity = '0.5';

      const canvas = await html2canvas(exportRef.current, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#12121a'
      });

      if (watermark) watermark.style.opacity = '0';

      toast.loading('Optimizing image...', { id: toastId });
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      const file = new File([blob], `tactical_plan_${Date.now()}.jpg`, { type: 'image/jpeg' });

      toast.loading('Uploading to cloud...', { id: toastId });
      const file_url = await uploadFileToAWS(file);

      toast.loading('Sending to party chat...', { id: toastId });
      await GroupChatMessage.create({
        group_id: partyId,
        user_id: user?.id || 'unknown',
        username: user?.full_name || 'Player',
        user_ign: user?.ign || user?.username || 'Player',
        avatar_url: user?.avatar_url || '',
        message: file_url,
        message_type: 'image',
        created_at: new Date().toISOString(),
        is_deleted: false,
        is_pinned: false,
        is_read: false,
        reactions: { likes: [], hearts: [], laughs: [], fire: [], claps: [] }
      });

      toast.success('Strategy Plan shared to chat!', { id: toastId });
      setIsShared(true);
      setTimeout(() => setIsShared(false), 3000);
    } catch (err) {
      console.error(err);
      toast.error('Failed to share plan to chat', { id: toastId });
    }
  };

  const currentPhaseData = strategyData.phases[activePhase] || DEFAULT_PHASE_DATA;
  const currentDrawings = currentPhaseData.drawings || [];
  const currentObjects = currentPhaseData.objects || [];
  const currentMarkers = currentPhaseData.markers || [];

  return (
    <div className="flex flex-col h-full bg-[#0c0c11] font-sans overflow-hidden relative">
      {/* TOP BAR */}
      <div className="flex items-center px-4 py-2 bg-[#12121a] border-b border-white/5 z-40 shrink-0 shadow-md gap-1 sm:gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        
        {/* Shape Tools */}
        <div className="flex items-center gap-1 shrink-0">
          {TOOLS.filter(t => ['line', 'rect', 'circle'].includes(t.id)).map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`p-1.5 sm:p-2 flex justify-center items-center rounded-lg transition-all ${tool === t.id ? 'bg-white/20 text-white shadow-inner' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
              title={t.label}
            >
              <t.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          ))}
          <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />
          <button 
            onClick={handleAddFlagDirectly}
            className="p-1.5 sm:p-2 flex justify-center items-center rounded-lg transition-all text-gray-500 hover:text-white hover:bg-white/5"
            title="Add Player Flag"
          >
            <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

        {/* Right Side Tools */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* Tactical Objects Menu */}
          <div className="relative">
            <button 
              onClick={handleObjClick}
              className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-black uppercase tracking-wider transition-all ${showObjectsMenu ? 'bg-yellow-500/20 text-yellow-500' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            >
              <Target className={`w-4 h-4 ${showObjectsMenu ? 'text-yellow-500' : 'text-yellow-500/80'}`} />
              <span className="hidden sm:inline">Objects</span>
              <span className="sm:hidden">Obj</span>
            </button>
          </div>

          <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

          {/* Zoom Toggle */}
          <button
            onClick={() => {
               if (!transformComponentRef.current || !exportRef.current) return;
               const wrapper = exportRef.current.parentElement?.parentElement;
               const content = exportRef.current;
               if (!wrapper || !content) return;
               
               const scaleContain = Math.min(wrapper.clientWidth / content.offsetWidth, wrapper.clientHeight / content.offsetHeight);
               const scaleCover = Math.max(wrapper.clientWidth / content.offsetWidth, wrapper.clientHeight / content.offsetHeight);
               
               const currentScale = transformComponentRef.current.state.scale;
               const isCover = Math.abs(currentScale - scaleCover) < 0.05;
               
               if (isCover) {
                  transformComponentRef.current.centerView(scaleContain, 300, "easeOut");
               } else {
                  transformComponentRef.current.centerView(scaleCover, 300, "easeOut");
               }
            }}
            className="p-1.5 sm:p-2 flex justify-center items-center rounded-lg transition-all text-gray-400 hover:text-white hover:bg-white/10"
            title="Toggle Zoom"
          >
            <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

          {/* Actions */}
          <button onClick={handleUndo} disabled={historyStep <= -1} className="p-1.5 sm:p-2 flex justify-center items-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all" title="Undo">
            <Undo2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={handleRedo} disabled={historyStep >= history.length - 1} className="p-1.5 sm:p-2 flex justify-center items-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all" title="Redo">
            <Redo2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button onClick={handleClear} className="p-1.5 sm:p-2 flex justify-center items-center rounded-lg text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-all" title="Clear All">
            <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <div className="w-px h-6 bg-white/10 mx-1 shrink-0" />

          {/* Actions Menu Trigger */}
          <button 
            onClick={() => setShowMapSelect(true)}
            className="p-1.5 sm:p-2 flex justify-center items-center rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="More Options"
          >
            <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Right Side Drawer (Slider) */}
        <AnimatePresence>
          {showMapSelect && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/60 z-[100]"
                onClick={() => setShowMapSelect(false)}
              />
              
              {/* Drawer */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-[80%] sm:w-[400px] bg-[#12121a] border-l border-white/10 shadow-2xl z-[101] flex flex-col"
              >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-black/20">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Options</h3>
                  <button onClick={() => setShowMapSelect(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-6">
                  
                  {/* Actions Section */}
                  <div>
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Actions
                    </h4>
                    <button
                      onClick={handleShareToChat}
                      disabled={isShared}
                      className={`w-full py-3 ${isShared ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-500'} text-white font-black text-sm uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(147,51,234,0.3)] flex items-center justify-center gap-2`}
                    >
                      {isShared ? (
                        <>✅ SENT TO CHAT</>
                      ) : (
                        <><Send className="w-5 h-5" /> Share to Chat</>
                      )}
                    </button>
                  </div>

                  {/* Roster & Colors Section */}
                  <div>
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Squad Colors
                    </h4>
                    <div className="flex flex-col gap-2">
                      {activeMembersColors.map(c => {
                        const isYou = user?.id === c.member?.id;
                        return (
                          <div key={c.id} className={`flex items-center gap-3 p-2 rounded-xl border ${isYou ? 'bg-purple-600/10 border-purple-500/30' : 'bg-black/20 border-white/5'}`}>
                            <div
                              className="w-8 h-8 rounded-full border-2 border-white/20 flex items-center justify-center text-xs font-black text-white/90 shadow-md shrink-0"
                              style={{ backgroundColor: c.hex }}
                            >
                              {c.member?.ign?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                              <span className="text-sm font-bold text-white truncate">
                                {c.member?.ign || 'Unknown'} {isYou && <span className="text-purple-400 text-xs ml-1">(You)</span>}
                              </span>
                              <span className="text-[10px] text-gray-400 uppercase font-black">
                                {isYou ? 'Your Drawing Color' : 'Teammate'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px w-full bg-white/5" />

                  {/* Maps Section */}
                  <div>
                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Map className="w-4 h-4" /> Change Map
                    </h4>
                    <div className="flex flex-col gap-2">
                      {availableMaps.length === 0 ? (
                        <div className="p-4 text-sm text-gray-400 text-center bg-black/20 rounded-xl border border-white/5">No maps uploaded</div>
                      ) : (
                        availableMaps.map(map => (
                          <button
                            key={map.id}
                            onClick={() => {
                              handleMapChange(map.id);
                              setShowMapSelect(false);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${selectedMap === map.id ? 'bg-purple-600/20 border border-purple-500/50 text-white' : 'bg-black/20 border border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'}`}
                          >
                            <div className="w-16 h-16 rounded bg-black/50 overflow-hidden shrink-0 border border-white/10">
                              <img src={map.url} alt={map.name} className="w-full h-full object-cover" />
                            </div>
                            <span className="text-base font-bold text-left truncate flex-1">{map.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Global Modals for Top Bar */}
      <AnimatePresence>
        {showObjectsMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ left: objMenuPos.left, top: objMenuPos.top }}
            className="fixed w-64 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-[100] p-2 origin-top-left"
          >
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 pb-1 border-b border-white/10 mb-2">Place Map Object</div>
            <div className="grid grid-cols-2 gap-2">
              {['drop', 'enemy', 'attack', 'hold', 'scout', 'rotation', 'loot', 'target'].map(objType => {
                const Icon = OBJECT_ICONS[objType] || Target;
                return (
                  <button
                    key={objType}
                    onClick={() => { handleAddObject(objType); setShowObjectsMenu(false); }}
                    className="flex items-center gap-2 p-2 bg-black/20 hover:bg-white/10 rounded-lg transition-colors border border-white/5 hover:border-white/20 group"
                  >
                    <Icon className="w-4 h-4 text-gray-400 group-hover:text-yellow-400" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase group-hover:text-white truncate">{objType}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row flex-1 relative overflow-hidden">
        
        {/* CENTER EXPORT CONTAINER (Map + Canvas + Objects) */}
        <div className="flex-1 relative bg-[#0a0a0f] flex items-center justify-center p-2 sm:p-4 overflow-hidden order-1 sm:order-2">
          {/* Square aspect ratio container (1:1) */}
          <TransformWrapper
            ref={transformComponentRef}
            minScale={minScale}
            maxScale={20}
            initialScale={1}
            centerZoomedOut={true}
            onZoomStop={(ref) => setZoomScale(ref.state.scale)}
            onInit={(ref) => setZoomScale(ref.state.scale)}
            panning={{
              disabled: tool !== 'pan',
              excluded: ['draggable-object']
            }}
            pinch={{ step: 5, excluded: ['draggable-object'] }}
            doubleClick={{ disabled: true }}
            wheel={{ disabled: tool !== 'pan' }}
          >
            <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: 'max-content', height: 'max-content', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div 
                ref={exportRef}
                className="relative rounded-none sm:rounded-2xl overflow-hidden shadow-2xl border-0 sm:border border-white/10 bg-[#12121a] shrink-0 min-w-[300px] min-h-[300px]"
              >
                {/* Map Image (Actual Size) */}
                {availableMaps.find(m => m.id === selectedMap)?.url && (
                  <>
                    {mapLoading && (
                      <div className="absolute inset-0 z-50 bg-[#12121a] overflow-hidden pointer-events-none">
                        <div className="w-full h-full bg-slate-900 animate-pulse relative flex items-center justify-center">
                           <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                           <div className="absolute top-[10%] left-[10%] w-[20%] h-[15%] bg-slate-800 rounded-lg" />
                           <div className="absolute top-[30%] right-[15%] w-[30%] h-[40%] bg-slate-800 rounded-xl" />
                           <div className="absolute bottom-[20%] left-[25%] w-[40%] h-[20%] bg-slate-800 rounded-lg" />
                           <div className="absolute top-[40%] left-[40%] w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center">
                              <div className="w-4 h-4 bg-slate-600 rounded-full" />
                           </div>
                        </div>
                      </div>
                    )}
                    <img 
                      src={`https://wsrv.nl/?url=${encodeURIComponent(availableMaps.find(m => m.id === selectedMap)?.url || '')}`}
                      alt="Map"
                      crossOrigin="anonymous"
                      className={`block pointer-events-none transition-opacity duration-300 ${mapLoading ? 'opacity-0' : 'opacity-70'}`}
                      draggable={false}
                      onLoad={(e) => {
                        const img = e.target;
                        const wrapper = document.querySelector('.react-transform-wrapper');
                        if (wrapper && img) {
                          const scaleX = wrapper.offsetWidth / img.offsetWidth;
                          const scaleY = wrapper.offsetHeight / img.offsetHeight;
                          const fitScale = Math.min(scaleX, scaleY);
                          setMinScale(fitScale);
                        }
                        setMapLoading(false);
                      }}
                    />
                  </>
                )}
                {/* Fallback Grid if map fails or isn't loaded */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-20" />

                {/* Drawing Canvas */}
                <div className={tool === 'pan' ? 'pointer-events-none absolute inset-0' : 'absolute inset-0'}>
                  <StrategyCanvas 
                    lines={currentDrawings}
                    onLinesChange={handleLinesChange}
                    onAddNumber={handleAddNumber}
                    onAddText={handleAddText}
                    tool={tool}
                    color={color}
                    user={user}
                    zoomScale={zoomScale}
                  />
                </div>

                {/* Drag & Drop Overlay */}
                <StrategyObjects 
                  objects={currentObjects}
                  markers={currentMarkers}
                  onUpdateObject={updateObjectPos}
                  onUpdateMarker={updateMarkerPos}
                  onRemoveObject={removeObject}
                  onRemoveMarker={removeMarker}
                />
                
                {/* Watermark for Exported Image */}
                <div className="absolute bottom-4 right-4 text-white/30 font-black text-2xl uppercase tracking-widest pointer-events-none opacity-0" data-export-watermark>
                  BATTLEHUB STRATEGY
                </div>
              </div>
            </TransformComponent>
          </TransformWrapper>
        </div>

        {/* TOOLBAR (Left on desktop, Bottom on mobile) */}
        <div className="sm:w-14 w-full h-16 sm:h-auto shrink-0 bg-[#0c0c11] sm:border-r border-t sm:border-t-0 border-white/5 flex sm:flex-col flex-row items-center sm:py-4 px-2 gap-2 sm:gap-4 z-40 order-2 sm:order-1 overflow-x-auto sm:overflow-y-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Drawing Tools */}
          <div className="flex sm:flex-col flex-row gap-2 sm:w-full sm:px-2 shrink-0">
            {TOOLS.filter(t => !['line', 'rect', 'circle'].includes(t.id)).map(t => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                className={`p-2.5 flex justify-center items-center rounded-xl transition-all ${tool === t.id ? 'bg-white/10 text-white shadow-inner' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'}`}
                title={t.label}
              >
                <t.icon className="w-5 h-5" />
              </button>
            ))}
          </div>
        </div>


      </div>
      
      {/* Global Fixed Tooltip for Colors */}
      {hoveredTooltip && (
        <div 
          className="fixed z-[9999] px-2 py-1 bg-black/95 border border-white/10 text-white text-[11px] font-bold rounded pointer-events-none whitespace-nowrap transform -translate-x-1/2 sm:-translate-x-0 -translate-y-1/2 shadow-lg"
          style={{ top: hoveredTooltip.top, left: hoveredTooltip.left }}
        >
          {hoveredTooltip.name}
        </div>
      )}
    </div>
  );
}
