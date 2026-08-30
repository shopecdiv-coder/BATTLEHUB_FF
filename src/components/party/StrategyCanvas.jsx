import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

const StrategyCanvas = forwardRef(({ lines, onLinesChange, onAddNumber, onAddText, tool, color, user, zoomScale = 1 }, ref) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [currentLine, setCurrentLine] = useState(null);
  const [textInputState, setTextInputState] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Animation Loop for Pings
  useEffect(() => {
    let animationFrameId;
    const hasActivePings = lines.some(l => l.tool === 'ping' && Date.now() - (l.timestamp || 0) < 3000);
    
    if (hasActivePings) {
      const render = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          drawAll(ctx, canvas);
        }
        animationFrameId = requestAnimationFrame(render);
      };
      render();
    }
    
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [lines, zoomScale]);

  // Expose clear method to parent
  useImperativeHandle(ref, () => ({
    clear: () => {
      onLinesChange([]);
    }
  }));

  const drawAll = (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw committed lines
    lines.forEach(line => drawShape(ctx, line));
    // Draw current active line
    if (currentLine) {
      drawShape(ctx, currentLine);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (let entry of entries) {
        setCanvasSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (canvas.width !== canvasSize.width || canvas.height !== canvasSize.height) {
      canvas.width = canvasSize.width;
      canvas.height = canvasSize.height;
    }

    const ctx = canvas.getContext('2d');
    drawAll(ctx, canvas);
  }, [lines, currentLine, zoomScale, canvasSize]);

  const drawShape = (ctx, line) => {
    ctx.beginPath();
    ctx.globalCompositeOperation = line.tool === 'eraser' ? 'destination-out' : 'source-over';
    const strokeZoom = line.drawnAtZoom || 1;
    
    // Transparency and width settings
    if (line.tool === 'highlight') {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = Math.max(5, Math.min(80, 25 / strokeZoom));
    } else if (line.tool === 'ping') {
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = 2;
    } else {
      ctx.globalAlpha = 1.0;
      ctx.lineWidth = line.tool === 'eraser' ? Math.max(10, Math.min(80, 25 / strokeZoom)) : 3;
    }
    
    ctx.strokeStyle = line.tool === 'eraser' ? 'rgba(0,0,0,1)' : line.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.fillStyle = line.tool === 'eraser' ? 'transparent' : line.color;

    if (!line.points || line.points.length === 0) return;
    const start = line.points[0];

    if (line.tool === 'pen' || line.tool === 'eraser' || line.tool === 'highlight') {
      ctx.moveTo(start.x, start.y);
      for (let i = 1; i < line.points.length; i++) {
        ctx.lineTo(line.points[i].x, line.points[i].y);
      }
      ctx.stroke();
    } else if (line.points.length >= 2) {
      const end = line.points[line.points.length - 1];

      if (line.tool === 'line') {
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      } else if (line.tool === 'arrow') {
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headlen = 15;
        ctx.beginPath();
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headlen * Math.cos(angle - Math.PI / 6), end.y - headlen * Math.sin(angle - Math.PI / 6));
        ctx.moveTo(end.x, end.y);
        ctx.lineTo(end.x - headlen * Math.cos(angle + Math.PI / 6), end.y - headlen * Math.sin(angle + Math.PI / 6));
        ctx.stroke();
      } else if (line.tool === 'circle') {
        const radius = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (line.tool === 'rect') {
        ctx.rect(start.x, start.y, end.x - start.x, end.y - start.y);
        ctx.stroke();
      } else if (line.tool === 'ruler') {
        ctx.setLineDash([5, 5]);
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        const distanceStr = Math.round(dist) + 'm';
        
        ctx.globalAlpha = 1.0;
        ctx.font = 'bold 14px "Inter", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        const textMetrics = ctx.measureText(distanceStr);
        const padding = 4;
        ctx.fillRect(midX - textMetrics.width/2 - padding, midY - 10 - padding, textMetrics.width + padding*2, 20 + padding*2);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(distanceStr, midX, midY);
      }
    } else if (line.tool === 'ping') {
      const age = Date.now() - (line.timestamp || Date.now());
      if (age < 3000) {
        // Fade out smoothly in the last 500ms
        const fadeOut = age > 2500 ? (3000 - age) / 500 : 1;
        
        // Pulse animation (loops 0 to 1 every 1000ms)
        const pulse = (age % 1000) / 1000;
        const pulse2 = ((age + 500) % 1000) / 1000;
        
        ctx.shadowColor = line.color;
        ctx.shadowBlur = 15;
        
        // Outer expanding ring
        const radius = 5 + (pulse * 50);
        ctx.globalAlpha = Math.max(0, 1 - pulse) * fadeOut;
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.lineWidth = 3;
        ctx.stroke();
        
        // Secondary expanding ring
        const radius2 = 5 + (pulse2 * 50);
        ctx.globalAlpha = Math.max(0, 1 - pulse2) * fadeOut * 0.5;
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius2, 0, 2 * Math.PI);
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Inner solid dot
        ctx.beginPath();
        ctx.arc(start.x, start.y, 6, 0, 2 * Math.PI);
        ctx.globalAlpha = fadeOut;
        ctx.fillStyle = line.color;
        ctx.fill();
        
        // Inner white dot for extra brightness
        ctx.beginPath();
        ctx.arc(start.x, start.y, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        ctx.shadowBlur = 0;
      }
    }
    
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
  };

  const getCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = rect.width / canvasRef.current.offsetWidth || 1;
    const scaleY = rect.height / canvasRef.current.offsetHeight || 1;
    
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) / scaleX,
      y: (clientY - rect.top) / scaleY
    };
  };

  const handleStart = (e) => {
    if (e.type === 'mousedown' && e.button !== 0) return;
    if (!['pen', 'line', 'arrow', 'circle', 'rect', 'eraser', 'highlight', 'ruler', 'text', 'number', 'ping'].includes(tool)) return;
    
    e.preventDefault();
    const pos = getCoordinates(e);

    if (tool === 'text') {
       setTextInputState({
          x: e.clientX,
          y: e.clientY,
          canvasX: pos.x,
          canvasY: pos.y
       });
       return;
    }

    if (tool === 'number') {
       if (onAddNumber) onAddNumber({x: pos.x, y: pos.y}, color);
       return;
    }

    if (tool === 'ping') {
       const newLine = {
          id: Date.now().toString(),
          userId: user?.id,
          tool,
          color,
          points: [pos],
          timestamp: Date.now()
       };
       onLinesChange([...lines, newLine]);
       return;
    }

    setIsDrawing(true);
    setStartPos(pos);
    
    setCurrentLine({
      id: Date.now().toString(),
      userId: user?.id,
      tool,
      color,
      points: [pos],
      drawnAtZoom: zoomScale
    });
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getCoordinates(e);
    
    setCurrentLine(prev => {
      if (!prev) return prev;
      if (tool === 'pen' || tool === 'eraser' || tool === 'highlight') {
        return { ...prev, points: [...prev.points, pos] };
      } else {
        return { ...prev, points: [startPos, pos] };
      }
    });
  };

  const handleEnd = (e) => {
    if (!isDrawing) return;
    e.preventDefault();
    setIsDrawing(false);
    
    if (currentLine && currentLine.points.length > 1) {
      onLinesChange([...lines, currentLine]);
    }
    setCurrentLine(null);
    setStartPos(null);
  };

  return (
    <div ref={containerRef} className="absolute inset-0 w-full h-full z-10 touch-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      />
      {textInputState && (
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const text = e.target.elements.text.value.trim();
            if (text && onAddText) {
               onAddText({ x: textInputState.canvasX, y: textInputState.canvasY }, text, color);
            }
            setTextInputState(null);
          }}
          className="fixed z-50 flex"
          style={{ top: textInputState.y, left: textInputState.x }}
        >
          <input 
            autoFocus
            name="text"
            autoComplete="off"
            className="px-2 py-1 bg-black/80 text-white font-bold text-lg outline-none border border-white/30 rounded shadow-2xl"
            style={{ color: color }}
            placeholder="Type and press Enter"
            onBlur={(e) => {
              const text = e.target.value.trim();
              if (text && onAddText) {
                 onAddText({ x: textInputState.canvasX, y: textInputState.canvasY }, text, color);
              }
              setTextInputState(null);
            }}
          />
        </form>
      )}
    </div>
  );
});

export default StrategyCanvas;
