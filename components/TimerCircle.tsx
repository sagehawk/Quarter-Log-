import React, { useRef, useState, useEffect } from 'react';
import { DEFAULT_INTERVAL_MS } from '../types';

interface TimerCircleProps {
  timeLeft: number;
  isActive: boolean;
  totalTime?: number;
  onDurationChange?: (newDurationMs: number) => void;
}

const TimerCircle: React.FC<TimerCircleProps> = ({ timeLeft, isActive, totalTime = DEFAULT_INTERVAL_MS, onDurationChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Visual Scale: Fixed to 60 minutes for the clock-face interaction
  const VISUAL_MAX_MINUTES = 60;
  const VISUAL_MAX_MS = VISUAL_MAX_MINUTES * 60 * 1000;
  
  // Snap step: 5 minutes
  const SNAP_MINUTES = 5;
  const SNAP_MS = SNAP_MINUTES * 60 * 1000;

  // Calculate progress based on 60 min scale
  const progress = Math.min(1, Math.max(0, timeLeft / VISUAL_MAX_MS));
  
  // Dimensions
  const SIZE = 340; // Increased ViewBox size to prevent clipping
  const CENTER = SIZE / 2;
  const RADIUS = 145; // Adjusted radius to fill the larger viewbox
  
  const circumference = 2 * Math.PI * RADIUS;
  const dashoffset = circumference * (1 - progress);

  // Knob Position Calculation
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

    onDurationChange(minutes * 60 * 1000);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (isActive) return;
    setIsDragging(true);
    (e.target as Element).setPointerCapture(e.pointerId);
    handleDrag(e);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (isDragging) handleDrag(e);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  // Format time text
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="relative flex items-center justify-center w-80 h-80 mx-auto my-8 touch-none">
      {/* Background Glow */}
      <div className={`absolute inset-0 rounded-full blur-3xl transition-opacity duration-1000 ${isActive ? 'bg-blue-600/20 opacity-100' : 'opacity-0'}`}></div>

      <svg 
        ref={svgRef}
        className={`absolute w-full h-full transform -rotate-90 drop-shadow-xl ${!isActive && !isDragging ? 'cursor-grab' : ''} ${isDragging ? 'cursor-grabbing' : ''}`} 
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Interaction Hit Area (Invisible but captures clicks around the ring) */}
        {!isActive && (
          <circle cx={CENTER} cy={CENTER} r={RADIUS + 20} fill="transparent" />
        )}

        {/* Track (Dimmed) */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke="rgba(255,255,255,0.05)"
          strokeWidth="12"
          fill="none"
        />
        
        {/* Progress Arc */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          stroke="url(#gradient)"
          strokeWidth="12"
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
             r={isDragging ? 16 : 12} // Slightly larger for better touch target visual
             fill="#fff" 
             stroke="#3b82f6"
             strokeWidth="3"
             className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
             style={{ 
               filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))', 
               transition: 'r 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' // Springy transition
             }}
           />
        )}

        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#818cf8" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Time Text (Not interactive) */}
      <div className="relative z-10 text-center flex flex-col items-center justify-center pointer-events-none select-none">
        <div className={`text-6xl font-sans font-bold tracking-tight transition-colors duration-300 ${isActive ? 'text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400' : 'text-slate-200'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <p className={`mt-2 text-xs font-bold uppercase tracking-[0.2em] transition-colors duration-300 ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
          {isActive ? 'Session Active' : 'Drag to Set'}
        </p>
      </div>
    </div>
  );
};

export default TimerCircle;