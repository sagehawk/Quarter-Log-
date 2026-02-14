import React, { useEffect, useState } from 'react';
import TacticalCoachView, { CoachMood } from './TacticalCoachView';

export interface TutorialStep {
  targetId?: string; 
  text: string;
  mood: CoachMood;
  actionLabel?: string;
  onAction?: () => void;
  waitForInteraction?: boolean; // If true, hides the "Next" button and allows click-through
}

interface TutorialOverlayProps {
  isActive: boolean;
  step: TutorialStep;
  onNext: () => void;
}

const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isActive, step, onNext }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

  useEffect(() => {
    if (isActive && step.targetId) {
      const updateRect = () => {
        const el = document.getElementById(step.targetId!);
        if (el) {
          const r = el.getBoundingClientRect();
          setRect(r);
          
          // Auto-scroll
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      };
      
      updateRect();
      
      const handleResize = () => {
          setWindowSize({ w: window.innerWidth, h: window.innerHeight });
          updateRect();
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', updateRect, true);
      
      const t = setTimeout(updateRect, 300); // Delay for animations to settle

      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', updateRect, true);
        clearTimeout(t);
      };
    } else {
      setRect(null);
    }
  }, [isActive, step.targetId]);

  if (!isActive) return null;

  // 4-Div Mask Layout
  const pad = 8; // Padding around target
  
  // If no rect (e.g. intro step), cover everything
  const topH = rect ? Math.max(0, rect.top - pad) : windowSize.h;
  const bottomTop = rect ? Math.min(windowSize.h, rect.bottom + pad) : windowSize.h;
  const bottomH = windowSize.h - bottomTop;
  const centerH = rect ? rect.height + (pad * 2) : 0;
  const leftW = rect ? Math.max(0, rect.left - pad) : 0;
  const rightLeft = rect ? Math.min(windowSize.w, rect.right + pad) : 0;
  const rightW = windowSize.w - rightLeft;

  const overlayClass = "absolute bg-black/85 transition-all duration-300 ease-out pointer-events-auto";

  return (
    <div className="fixed inset-0 z-[150] pointer-events-none">
      
      {/* Mask Layers - Blocking Clicks */}
      <div className={overlayClass} style={{ top: 0, left: 0, width: '100%', height: topH }} />
      <div className={overlayClass} style={{ top: bottomTop, left: 0, width: '100%', height: bottomH }} />
      <div className={overlayClass} style={{ top: topH, left: 0, width: leftW, height: centerH }} />
      <div className={overlayClass} style={{ top: topH, left: rightLeft, width: rightW, height: centerH }} />

      {/* Target Highlighter Border (Visual only) */}
      {rect && (
         <div 
            className="absolute border-2 border-green-500 rounded-xl animate-pulse pointer-events-none transition-all duration-300"
            style={{ 
                top: rect.top - pad, 
                left: rect.left - pad, 
                width: rect.width + (pad * 2), 
                height: rect.height + (pad * 2) 
            }}
         />
      )}

      {/* Coach Layer */}
      <div className="absolute inset-0 pointer-events-none">
          <TacticalCoachView 
            mood={step.mood} 
            message={step.text} 
            bgImage="transparent"
          >
             {!step.waitForInteraction && (
                 <div className="pointer-events-auto">
                     <button 
                        onClick={() => {
                            if (step.onAction) step.onAction();
                            else onNext();
                        }}
                        className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all shadow-[0_0_20px_rgba(34,197,94,0.5)]"
                     >
                        {step.actionLabel || "Next"}
                     </button>
                 </div>
             )}
          </TacticalCoachView>
      </div>

    </div>
  );
};

export default TutorialOverlay;