import React, { useEffect, useState } from 'react';
import { getRankProgress } from '../utils/rankSystem';

interface FeedbackOverlayProps {
  isVisible: boolean;
  totalWins: number;
  type: 'WIN' | 'LOSS';
  customTitle?: string;
  customSub?: string;
  aiMessage?: string | null;
  isFrozen?: boolean;
  period?: string;
  onDismiss?: () => void;
}

const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ 
    isVisible, 
    totalWins, 
    type, 
    customTitle, 
    customSub,
    aiMessage,
    isFrozen = false,
    period = 'D',
    onDismiss
}) => {
  const [animateProgress, setAnimateProgress] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  const { currentRank, nextRank, progress, winsToNext } = getRankProgress(totalWins, period);
  // Adjusted promotion logic assumption: If we just hit a rank, progress might be 0 or we check if we just crossed a threshold.
  // Using existing logic for now.
  const isPromotion = type === 'WIN' && progress === 0 && totalWins > 0; 

  useEffect(() => {
    if (isVisible && type === 'WIN') {
      setAnimateProgress(0);
      const timer = setTimeout(() => {
        setAnimateProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isVisible, progress, type]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentY = e.touches[0].clientY;
    const diff = Math.abs(currentY - touchStart);
    
    if (diff > 10) { // Sensitive swipe detection
      onDismiss?.();
    }
  };

  if (!isVisible) return null;

  // Defeat / Loss Mode
  if (type === 'LOSS') {
      return (
        <div 
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto cursor-pointer"
            onClick={onDismiss}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
        >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in" />
            
            <div className="relative z-10 w-full animate-slide-up px-6">
                <div className="flex flex-col items-center py-12 space-y-8">
                    {/* AI Feedback - Prominent */}
                    {aiMessage && (
                        <div className="text-center space-y-4 max-w-sm mx-auto">
                            <div className="inline-block bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1 text-[10px] font-mono text-red-500 uppercase tracking-widest">
                                Tactical Feedback
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight font-mono">
                                "{aiMessage}"
                            </h2>
                        </div>
                    )}

                    {!aiMessage && (
                        <div className="text-center space-y-2">
                            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-red-500 drop-shadow-sm leading-none">
                                {customTitle || "MOMENTUM HALTED"}
                            </h1>
                        </div>
                    )}
                    
                    <div className="text-white/40 font-bold text-xs tracking-[0.3em] uppercase">
                        TAP TO DISMISS
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // Victory / Win Mode
  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-auto cursor-pointer"
        onClick={onDismiss}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md animate-fade-in" />
      
      <div className="relative z-10 w-full animate-slide-up">
        {/* Banner Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/90 to-transparent border-y border-yellow-500/10" />
        
        <div className="relative flex flex-col items-center py-10 px-6 gap-8">
            
            {/* AI Message - The Hero */}
            {aiMessage && (
                <div className="text-center space-y-4 max-w-md mx-auto z-20">
                     <div className="inline-flex items-center gap-2 text-yellow-500/60 font-mono text-[10px] uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                        Live Guidance
                     </div>
                     <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug font-mono drop-shadow-md">
                        "{aiMessage}"
                     </h2>
                </div>
            )}

            {/* Rank Status - Subtle unless Promotion */}
            <div className={`flex flex-col items-center transition-all duration-500 ${isPromotion ? 'scale-110 opacity-100 my-4' : 'scale-75 opacity-40 grayscale-[0.5]'}`}>
                {isPromotion && (
                    <div className="mb-4 animate-bounce-slight">
                        <span className="bg-yellow-500 text-black font-black text-xs px-4 py-1 rounded-full tracking-[0.3em] uppercase shadow-[0_0_20px_rgba(234,179,8,0.6)]">
                            Rank Up
                        </span>
                    </div>
                )}
                
                <div className="relative">
                     <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className={`w-16 h-16 ${currentRank.color}`}
                    >
                        <path d={currentRank.icon} />
                    </svg>
                </div>
                
                <div className="text-center mt-2">
                    <h3 className={`text-lg font-black italic tracking-tighter uppercase ${currentRank.color}`}>
                        {currentRank.name}
                    </h3>
                    <div className="flex items-center gap-2 justify-center mt-1">
                         <div className="h-1 w-16 bg-white/10 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${currentRank.color.replace('text-', 'bg-')}`} 
                                style={{ width: `${(progress / 5) * 100}%` }} // Approximate progress visual
                            />
                         </div>
                    </div>
                </div>
            </div>

            <div className="text-white/20 font-bold text-[10px] tracking-widest uppercase animate-pulse">
                Tap to Continue
            </div>
        </div>

      </div>
    </div>
  );
};

export default FeedbackOverlay;
