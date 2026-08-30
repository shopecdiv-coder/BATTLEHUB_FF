import React, { useRef, useState, useEffect } from 'react';
import { Target, MapPin, Skull, Shield, Sword, Eye, Package, RotateCcw, Flag, X } from 'lucide-react';

export const OBJECT_ICONS = {
  drop: MapPin,
  target: Target,
  enemy: Skull,
  hold: Shield,
  attack: Sword,
  scout: Eye,
  loot: Package,
  rotation: RotateCcw
};

export default function StrategyObjects({ objects, markers, onUpdateObject, onUpdateMarker, onRemoveObject, onRemoveMarker, zoomScale = 1 }) {
  const containerRef = useRef(null);
  
  const [dragging, setDragging] = useState(null); // { id, isMarker, offsetX, offsetY }
  const [dragPreview, setDragPreview] = useState(null); // { id, isMarker, x, y }
  const dragPreviewRef = useRef(null); // Store latest preview for pointerUp without re-binding
  const [selectedObjectId, setSelectedObjectId] = useState(null);
  const lastTapRef = useRef({});
  const longPressTimerRef = useRef(null);

  useEffect(() => {
    const handleGlobalClick = (e) => {
      if (selectedObjectId) {
        // Close if click is outside any slider, cone, or text object
        if (!e.target.closest('.slider-container') && !e.target.closest('.cone-object') && !e.target.closest('.text-object')) {
          setSelectedObjectId(null);
        }
      }
    };
    
    document.addEventListener('pointerdown', handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener('pointerdown', handleGlobalClick, { capture: true });
    };
  }, [selectedObjectId]);

  const handlePointerDown = (e, item, isMarker) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Ignore right clicks for drag
    if (e.button === 2) return;
    
    const now = Date.now();
    const lastTap = lastTapRef.current[item.id] || 0;
    
    if (now - lastTap < 350) {
      // Double tap detected!
      if (isMarker) {
        onRemoveMarker(item.id);
      } else {
        onRemoveObject(item.id);
      }
      lastTapRef.current[item.id] = 0;
      return;
    }
    
    lastTapRef.current[item.id] = now;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    const scaleX = containerRect.width / containerRef.current.offsetWidth || 1;
    const scaleY = containerRect.height / containerRef.current.offsetHeight || 1;
    
    const offsetX = (e.clientX - rect.left) / scaleX;
    const offsetY = (e.clientY - rect.top) / scaleY;
    
    // Start Long Press Timer (300ms)
    longPressTimerRef.current = {
      timeout: setTimeout(() => {
        setDragging({ id: item.id, isMarker, offsetX, offsetY });
        setDragPreview({ id: item.id, isMarker, x: item.x, y: item.y });
        if (navigator.vibrate) navigator.vibrate(50);
        longPressTimerRef.current = null;
      }, 500),
      startX: e.clientX,
      startY: e.clientY
    };
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      // If waiting for long press, cancel if they move finger > 10px
      if (longPressTimerRef.current) {
        const dx = e.clientX - longPressTimerRef.current.startX;
        const dy = e.clientY - longPressTimerRef.current.startY;
        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
          clearTimeout(longPressTimerRef.current.timeout);
          longPressTimerRef.current = null;
        }
        return;
      }

      if (!dragging || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const scaleX = containerRect.width / containerRef.current.offsetWidth || 1;
      const scaleY = containerRect.height / containerRef.current.offsetHeight || 1;

      let localX = (e.clientX - containerRect.left) / scaleX;
      let localY = (e.clientY - containerRect.top) / scaleY;
      
      let finalX = localX - dragging.offsetX;
      let finalY = localY - dragging.offsetY;

      finalX = Math.max(0, Math.min(finalX, containerRef.current.offsetWidth));
      finalY = Math.max(0, Math.min(finalY, containerRef.current.offsetHeight));

      const newPreview = { id: dragging.id, isMarker: dragging.isMarker, x: finalX, y: finalY };
      dragPreviewRef.current = newPreview;
      setDragPreview(newPreview);
    };

    const handleTouchStart = (e) => {
      // If two or more fingers are on the screen (pinch-zoom), cancel all dragging and long-presses
      if (e.touches && e.touches.length > 1) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current.timeout);
          longPressTimerRef.current = null;
        }
        setDragging(null);
        setDragPreview(null);
        dragPreviewRef.current = null;
      }
    };

    const handlePointerUp = () => {
      // Cancel long press if lifted before timeout
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current.timeout);
        longPressTimerRef.current = null;
      }

      if (dragging && dragPreviewRef.current) {
        if (dragging.isMarker) {
          onUpdateMarker(dragging.id, { x: dragPreviewRef.current.x, y: dragPreviewRef.current.y });
        } else {
          onUpdateObject(dragging.id, { x: dragPreviewRef.current.x, y: dragPreviewRef.current.y });
        }
      }
      setDragging(null);
      setDragPreview(null);
      dragPreviewRef.current = null;
    };

    if (dragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);
      document.addEventListener('pointercancel', handlePointerUp);
    }
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    
    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
      document.removeEventListener('pointercancel', handlePointerUp);
      document.removeEventListener('touchstart', handleTouchStart);
    };
  }, [dragging]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {/* Tactical Objects */}
      {objects.map(obj => {
        const Icon = OBJECT_ICONS[obj.type] || Target;
        const isDragging = dragging?.id === obj.id && !dragging?.isMarker;
        const displayX = isDragging && dragPreview ? dragPreview.x : obj.x;
        const displayY = isDragging && dragPreview ? dragPreview.y : obj.y;
        
        const baseScale = Math.min(1.5, 1 / zoomScale);
        const finalScale = (isDragging ? 1.15 : 1) * baseScale;
        
        if (obj.type === 'number') {
           return (
             <div
               key={obj.id}
               onPointerDown={(e) => handlePointerDown(e, obj, false)}
               style={{ 
                 transform: `translate(${displayX}px, ${displayY}px) scale(${finalScale}) translate(-50%, -100%)`,
                 transformOrigin: 'bottom center',
               }}
               className={`draggable-object absolute top-0 left-0 flex flex-col items-center cursor-move pointer-events-auto touch-none group ${isDragging ? 'opacity-90 z-50' : 'z-30'}`}
             >
               <div 
                 className="w-6 h-6 flex items-center justify-center rounded-full border border-white/20 text-white font-bold text-xs shadow-[0_0_15px_rgba(0,0,0,0.8)] hover:border-yellow-500 transition-colors"
                 style={{ backgroundColor: obj.color || '#ef4444' }}
               >
                 {obj.numberValue}
               </div>
               {/* Pointy Tail */}
               <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-transparent drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" style={{ borderTopColor: obj.color || '#ef4444' }} />
               
               {/* Delete Button (Desktop Only) */}
               <button
                 onPointerDown={(e) => { e.stopPropagation(); onRemoveObject(obj.id); }}
                 className="absolute -top-2 -right-4 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-10"
               >
                 <X className="w-3 h-3 text-white" />
               </button>
             </div>
           );
        }

        if (obj.type === 'text') {
           const textScale = obj.scaleFactor || 1;
           return (
             <div
               key={obj.id}
               onPointerDown={(e) => handlePointerDown(e, obj, false)}
               onClick={(e) => {
                 e.stopPropagation();
                 setSelectedObjectId(selectedObjectId === obj.id ? null : obj.id);
               }}
               style={{ 
                 transform: `translate(${displayX}px, ${displayY}px) scale(${finalScale}) translate(-50%, -100%)`,
                 transformOrigin: 'bottom center',
               }}
               className={`text-object draggable-object absolute top-0 left-0 flex flex-col items-center cursor-move pointer-events-auto touch-none group transition-transform duration-75 ${isDragging ? 'opacity-90 z-50' : 'z-30'}`}
             >
               <div 
                 className="font-bold text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-nowrap px-3 py-1 bg-black/60 backdrop-blur-md rounded-xl border border-white/20"
                 style={{
                   transform: `scale(${textScale})`,
                   transformOrigin: 'bottom center',
                   color: obj.color || '#ffffff'
                 }}
               >
                 {obj.textValue}
               </div>
               
               {/* Pointy Tail */}
               <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[12px] border-transparent -mt-px drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" style={{ borderTopColor: 'rgba(0,0,0,0.6)' }} />
               
               {/* Interactive Slider for Resize */}
               {selectedObjectId === obj.id && (
                 <div 
                   className="slider-container absolute bg-[#1a1a24]/90 p-2 rounded-lg border border-white/10 shadow-xl pointer-events-auto flex items-center justify-center gap-2 z-[100]"
                   style={{ left: 0, top: -40, width: '120px' }}
                   onClick={(e) => e.stopPropagation()}
                   onPointerDown={(e) => e.stopPropagation()}
                   onTouchStart={(e) => e.stopPropagation()}
                 >
                   <span className="text-[10px] text-gray-400 font-bold">SIZE</span>
                   <input 
                     type="range" 
                     min="0.5" 
                     max="4" 
                     step="0.1" 
                     value={textScale}
                     onChange={(e) => {
                       if (onUpdateObject) onUpdateObject(obj.id, { scaleFactor: parseFloat(e.target.value) });
                     }}
                     className="flex-1 w-full accent-yellow-500 h-1 bg-gray-700 rounded-full appearance-none outline-none"
                   />
                 </div>
               )}

               {/* Delete Button (Desktop Only) */}
               <button
                 onPointerDown={(e) => { e.stopPropagation(); onRemoveObject(obj.id); }}
                 className="absolute -top-3 -right-4 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-10"
               >
                 <X className="w-3 h-3 text-white" />
               </button>
             </div>
           );
        }

        // Cone rendering has been removed

        return (
          <div
            key={obj.id}
            onPointerDown={(e) => handlePointerDown(e, obj, false)}
            style={{ 
              transform: `translate(${displayX}px, ${displayY}px) scale(${finalScale}) translate(-50%, -100%)`,
              transformOrigin: 'bottom center'
            }}
            className={`draggable-object absolute top-0 left-0 flex flex-col items-center cursor-move pointer-events-auto touch-none group ${isDragging ? 'opacity-90 z-50' : 'z-30'}`}
          >
            <div className="p-2 rounded-full bg-black/80 border border-white/20 text-white shadow-[0_0_15px_rgba(0,0,0,0.8)] hover:bg-black hover:border-yellow-500 transition-colors">
              <Icon className="w-5 h-5 text-yellow-400 pointer-events-none" />
            </div>
            
            {/* Pointy Tail */}
            <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[10px] border-transparent -mt-px drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]" style={{ borderTopColor: 'rgba(0,0,0,0.8)' }} />
            
            {/* Delete Button (Desktop Only) */}
            <button
              onPointerDown={(e) => { e.stopPropagation(); onRemoveObject(obj.id); }}
              className="absolute -top-2 -right-4 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-10 shadow-lg"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        );
      })}

      {/* Player Markers (Flags) */}
      {markers.map(marker => {
        const isDragging = dragging?.id === marker.id && dragging?.isMarker;
        const displayX = isDragging && dragPreview ? dragPreview.x : marker.x;
        const displayY = isDragging && dragPreview ? dragPreview.y : marker.y;
        
        // Counteract map zoom so flags stay a crisp, professional size
        const baseScale = Math.min(1.5, 1 / zoomScale);
        const finalScale = (isDragging ? 1.15 : 1) * baseScale;
        
        return (
          <div
            key={marker.id}
            onPointerDown={(e) => handlePointerDown(e, marker, true)}
            style={{ 
              transform: `translate(${displayX}px, ${displayY}px) scale(${finalScale})`,
              transformOrigin: 'bottom left'
            }}
            className={`draggable-object absolute top-0 left-0 pointer-events-auto cursor-move touch-none group transition-transform duration-75 ${isDragging ? 'opacity-90 z-50' : 'z-40'}`}
          >
            {/* The wrapper is shifted up so that (0,0) represents the bottom of the pole */}
            <div className="relative flex items-start drop-shadow-2xl" style={{ marginTop: '-32px' }}>
              {/* Pole */}
              <div className="w-[3px] h-8 bg-gradient-to-b from-gray-200 to-gray-400 rounded-full border border-black/20 z-10 shadow-sm" />
              
              {/* Flag Banner */}
              <div 
                className="mt-0.5 -ml-px px-2.5 py-1 flex items-center justify-center shadow-xl border border-black/20"
                style={{ 
                  backgroundColor: marker.color, 
                  borderTopRightRadius: '6px',
                  borderBottomRightRadius: '6px'
                }}
              >
                <span className="text-[9px] font-black text-white mix-blend-plus-lighter tracking-widest uppercase truncate max-w-[80px] drop-shadow-md">
                  {marker.name}
                </span>
              </div>
              {/* Delete Button (Desktop Only) */}
              <button
                onPointerDown={(e) => { e.stopPropagation(); onRemoveMarker(marker.id); }}
                className="absolute -top-3 -right-3 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full hidden sm:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto z-20 cursor-pointer"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
