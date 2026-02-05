import React, { useEffect, useState } from 'react';
import { getRankProgress } from '../utils/rankSystem';

interface FeedbackOverlayProps {
  isVisible: boolean;
  totalWins: number;
  type: 'WIN' | 'LOSS';
  customTitle?: string;
  customSub?: string;
  isFrozen?: boolean;
  onDismiss?: () => void;
}

const FeedbackOverlay: React.FC<FeedbackOverlayProps> = ({ 
    isVisible, 
    totalWins, 
    type, 
    customTitle, 
    customSub,
    isFrozen = false,
    onDismiss
}) => {
  const [animateProgress, setAnimateProgress] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  const { currentRank, nextRank, progress, winsToNext } = getRankProgress(totalWins);
  const isPromotion = type === 'WIN' && progress < 5 && totalWins > 0; 

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
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
            
            <div className="relative z-10 w-full animate-slide-up">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-950/90 to-transparent border-y border-red-500/20 blur-sm" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-950/90 to-transparent border-y border-red-500/20" />

                <div className="relative flex flex-col items-center py-12">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse" />
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 w-24 h-24 drop-shadow-[0_0_25px_rgba(220,38,38,0.5)]">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>

                    <div className="text-center space-y-2 px-8">
                        <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-red-500 drop-shadow-sm leading-none">
                            {customTitle || "MOMENTUM HALTED"}
                        </h1>
                        <p className="text-white/60 font-bold text-xs tracking-[0.3em] uppercase leading-relaxed">
                            {customSub || "RECALIBRATE IMMEDIATE"}
                        </p>
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
      
      <div className="relative z-10 w-full animate-slide-up">
        {/* Banner Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/90 to-transparent border-y border-yellow-500/20 blur-sm" />
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/90 to-transparent border-y border-yellow-500/20" />
        
        <div className="relative flex flex-col items-center py-10 px-4">
            
            {customTitle && (
                <div className="absolute -top-12 animate-pulse-slow">
                    <span className="text-yellow-500/60 font-black text-[10px] tracking-[0.5em] uppercase">
                        {customTitle}
                    </span>
                </div>
            )}

            {isPromotion && (
                <div className="absolute -top-6 animate-bounce-slight z-20">
                    <span className="bg-yellow-500 text-black font-black text-xs px-4 py-1 rounded-full tracking-[0.3em] uppercase shadow-[0_0_20px_rgba(234,179,8,0.6)]">
                        Promotion Secured
                    </span>
                </div>
            )}

            <div className={`relative mb-6 ${isPromotion ? 'scale-125 transition-transform duration-500' : ''} ${isFrozen ? 'grayscale brightness-50' : ''}`}>
                <div className={`absolute inset-0 bg-white/10 blur-3xl rounded-full ${currentRank.color.replace('text-', 'bg-')}/20`} />
                <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                    className={`w-24 h-24 md:w-32 md:h-32 ${currentRank.color} drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] animate-pulse-slow`}
                >
                    <path d={currentRank.icon} />
                </svg>
                {isFrozen && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="opacity-80"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                    </div>
                )}
            </div>

            <div className="text-center mb-6">
                <div className="text-white/40 font-bold text-[9px] tracking-[0.4em] uppercase mb-1">
                    {isFrozen ? "RANK FROZEN" : "Current Status"}
                </div>
                <h1 className={`text-4xl md:text-5xl font-black italic tracking-tighter uppercase ${isFrozen ? 'text-white/20' : currentRank.color} drop-shadow-sm`}>
                    {currentRank.name}
                </h1>
                {customSub && (
                    <p className="mt-2 text-yellow-500 font-black text-[10px] tracking-widest uppercase animate-pulse">
                        {customSub}
                    </p>
                )}
            </div>

            <div className={`w-full max-w-xs space-y-2 ${isFrozen ? 'opacity-20' : ''}`}>
                <div className="flex justify-between items-end px-1">
                    <span className="text-white/60 font-black text-[10px] tracking-widest">{totalWins} WINS</span>
                    {nextRank && (
                        <span className="text-white/40 font-bold text-[8px] tracking-widest uppercase">
                            {winsToNext} to {nextRank.name}
                        </span>
                    )}
                </div>
                
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                    <div className="absolute inset-0 bg-white/5" />
                    <div 
                        className={`h-full ${isFrozen ? 'bg-white/20' : currentRank.color.replace('text-', 'bg-')} shadow-[0_0_15px_currentColor] transition-all duration-1000 ease-out relative`}
                        style={{ width: `${animateProgress}%` }}
                    >
                        <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50" />
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default FeedbackOverlay;
