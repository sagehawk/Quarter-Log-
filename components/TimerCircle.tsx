import React, { useRef, useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { DEFAULT_INTERVAL_MS } from '../types';

interface TimerCircleProps {
  timeLeft: number;
  isActive: boolean;
  totalTime?: number;
  onDurationChange?: (newDurationMs: number) => void;
  onDurationCommit?: (newDurationMs: number) => void;
  onToggle: () => void;
}

const TimerCircle: React.FC<TimerCircleProps> = ({ 
  timeLeft, 
  isActive, 
  totalTime = DEFAULT_INTERVAL_MS, 
  onDurationChange, 
  onDurationCommit,
  onToggle 
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  
  // Refs
  const isPressed = useRef(false);
  const lastHapticMinute = useRef<number>(-1);
  const svgRef = useRef<SVGSVGElement>(null);

  // Visual Scale: Fixed to 60 minutes for the clock-face interaction
  const VISUAL_MAX_MINUTES = 60;
  const VISUAL_MAX_MS = VISUAL_MAX_MINUTES * 60 * 1000;
  
  // Snap step: 5 minutes
  const SNAP_MINUTES = 5;
  
  // Dimensions - Increased stroke for bolder look matching new logo
  const SIZE = 400; 
  const CENTER = SIZE / 2;
  const RADIUS = 160; 
  const STROKE_WIDTH = 32; // Beefed up from 24
  
  const circumference = 2 * Math.PI * RADIUS;
  // Calculate progress based on 60 min scale
  const progress = Math.min(1, Math.max(0, timeLeft / VISUAL_MAX_MS));
  const dashoffset = circumference * (1 - progress);

  // Knob Position
  const angleInRadians = progress * 2 * Math.PI;
  const knobX = CENTER + RADIUS * Math.cos(angleInRadians);
  const knobY = CENTER + RADIUS * Math.sin(angleInRadians);

  const handleDrag = (e: React.PointerEvent | PointerEvent) => {
    if (isActive || !onDurationChange || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;
    let angle = Math.atan2(dy, dx); 
    
    // Adjust for our coordinate system (Visual Top is 0 degrees)
    let degrees = (angle * 180) / Math.PI;
    degrees += 90; // Shift so -90 becomes 0
    if (degrees < 0) degrees += 360;

    let minutes = (degrees / 360) * VISUAL_MAX_MINUTES;
    
    // Snap logic
    minutes = Math.round(minutes / SNAP_MINUTES) * SNAP_MINUTES;
    
    if (minutes <= 0) minutes = SNAP_MINUTES; 
    if (minutes > 60) minutes = 60;

    // Haptic Feedback on value change
    if (minutes !== lastHapticMinute.current) {
        if (isDragging) { // Only vibrate if we are actively dragging
            try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
        }
        lastHapticMinute.current = minutes;
    }

    onDurationChange(minutes * 60 * 1000);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    isPressed.current = true;
    setStartPos({ x: e.clientX, y: e.clientY });
    // Reset haptic tracker
    lastHapticMinute.current = -1;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Only drag if we are actually pressed and not active
    if (!isPressed.current || isActive) return;
    
    // Check if moved enough to consider it a drag
    const dist = Math.sqrt(Math.pow(e.clientX - startPos.x, 2) + Math.pow(e.clientY - startPos.y, 2));
    if (dist > 5) { // 5px threshold
      if (!isDragging) setIsDragging(true);
      handleDrag(e);
    }
  };

  const onPointerUp = async (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // CRITICAL FIX: If we aren't actively pressing, ignore this event.
    // This prevents accidental toggles when 'onPointerLeave' fires during simple hover.
    if (!isPressed.current) return;

    if (e.target instanceof Element) {
      try { (e.target as Element).releasePointerCapture(e.pointerId); } catch(e) {}
    }

    isPressed.current = false;
    
    if (!isDragging) {
       // It was a click (tap) -> Toggle
       try { await Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
       onToggle();
    } else {
       // Drag Release -> Light confirmation & Commit
       try { await Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
       if (onDurationCommit && lastHapticMinute.current > 0) {
          onDurationCommit(lastHapticMinute.current * 60 * 1000);
       }
    }
    
    setIsDragging(false);
  };

  // Format time text (Use ceil to avoid skipping seconds due to tick lag)
  const totalSeconds = Math.ceil(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return (
    <div className="relative flex items-center justify-center w-full max-w-[400px] aspect-square mx-auto my-4 touch-none select-none">
      {/* Background Glow - Intensified */}
      <div className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-500 ${isActive ? 'bg-brand-600/40 opacity-100' : 'opacity-0'}`}></div>

      <svg 
        ref={svgRef}
        className={`absolute w-full h-full transform -rotate-90 drop-shadow-2xl ${isActive ? 'cursor-pointer' : 'cursor-grab'} ${isDragging ? 'cursor-grabbing' : ''}`} 
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp} // Safety release
      >
        {/* Interaction Hit Area */}
        <circle cx={CENTER} cy={CENTER} r={RADIUS + 40} fill="transparent" />

        {/* Track (Dimmed) */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
        />
        
        {/* Progress Arc */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke="url(#gradient)"
          strokeWidth={STROKE_WIDTH}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className={isDragging ? '' : 'transition-all duration-500 ease-out'}
          style={{ pointerEvents: 'none' }}
        />

        {/* Knob handle (Visible when IDLE for setting time) */}
        {!isActive && (
           <circle 
             cx={knobX} 
             cy={knobY} 
             r={isDragging ? 26 : 22} 
             fill="#fff" 
             stroke="#db2777"
             strokeWidth="8"
             className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
             style={{ 
               filter: 'drop-shadow(0px 4px 12px rgba(0,0,0,0.6))', 
               transition: 'r 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
             }}
           />
        )}

        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff005c" />
            <stop offset="100%" stopColor="#ff3380" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Time Text */}
      <div className="relative z-10 text-center flex flex-col items-center justify-center pointer-events-none">
        <div className={`text-7xl sm:text-8xl font-bold tracking-tight transition-colors duration-300 ${isActive ? 'text-white' : 'text-slate-200'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <div className="flex items-center gap-2 mt-4">
           {!isActive && <span className="w-2 h-2 rounded-full bg-slate-500 animate-pulse"></span>}
           {isActive && <span className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></span>}
           <p className={`text-xs font-black uppercase tracking-[0.25em] transition-colors duration-300 ${isActive ? 'text-brand-400' : 'text-slate-500'}`}>
             {isActive ? 'Tap to Pause' : 'Tap to Start'}
           </p>
        </div>
      </div>
    </div>
  );
};

export default TimerCircle;