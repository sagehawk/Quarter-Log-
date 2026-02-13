import React, { useEffect, useState, useMemo } from 'react';
import { getRankProgress, getRankForPeriod, getThresholdsForPeriod } from '../utils/rankSystem';

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
  const [animationStage, setAnimationStage] = useState<'INIT' | 'FILLING' | 'PROMOTING' | 'CELEBRATING' | 'RESET'>('INIT');
  const [touchStart, setTouchStart] = useState<number | null>(null);

  // Calculate State
  const prevWins = Math.max(0, totalWins - 1);
  const currWins = totalWins;

  // Helper to get full state for a specific win count
  const getState = (wins: number) => {
      const thresholds = getThresholdsForPeriod(period);
      // Logic duplicated from getRankProgress but specifically for arbitrary wins
      let rankIndex = 0;
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (wins >= thresholds[i]) {
          rankIndex = i;
          break;
        }
      }
      const currentRank = getRankForPeriod(wins, period);
      // We need to find the specific next rank from the full list based on index
      // Importing RANKS would be cleaner, but we can infer from utils or use the helper
      // The helper 'getRankProgress' does exactly this.
      return getRankProgress(wins, period);
  };

  const prevState = useMemo(() => getState(prevWins), [prevWins, period]);
  const currState = useMemo(() => getState(currWins), [currWins, period]);

  const isRankUp = prevState.currentRank.name !== currState.currentRank.name;

  useEffect(() => {
    if (isVisible && type === 'WIN') {
      setAnimationStage('INIT');
      
      // 1. Start Filling
      const t1 = setTimeout(() => {
          setAnimationStage('FILLING');
      }, 300);

      // 2. Handle Rank Up Sequence
      if (isRankUp) {
          const t2 = setTimeout(() => {
              setAnimationStage('PROMOTING'); // Bar lights up / hides
          }, 1500); // Wait for fill

          const t3 = setTimeout(() => {
              setAnimationStage('CELEBRATING'); // Big Icon
          }, 2000);

          const t4 = setTimeout(() => {
              setAnimationStage('RESET'); // Show new state
          }, 4500); 
          
          return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
      } else {
          // No Rank Up - Just stay filled
          return () => clearTimeout(t1);
      }
    }
  }, [isVisible, type, isRankUp]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentY = e.touches[0].clientY;
    const diff = Math.abs(currentY - touchStart);
    
    if (diff > 10) { 
      onDismiss?.();
    }
  };

  if (!isVisible) return null;

  // Defeat / Loss Mode (Unchanged)
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

  // --- WIN ANIMATION LOGIC ---

  // Display Variables based on Stage
  // INIT/FILLING/PROMOTING: Show Previous Rank -> Previous Next Rank
  // CELEBRATING: Show Current Rank (Large)
  // RESET: Show Current Rank -> Current Next Rank

  const showOldState = ['INIT', 'FILLING', 'PROMOTING'].includes(animationStage);
  const showCelebration = animationStage === 'CELEBRATING';
  const showNewState = animationStage === 'RESET';

  const displayLeftRank = showNewState ? currState.currentRank : prevState.currentRank;
  const displayRightRank = showNewState ? currState.nextRank : prevState.nextRank;
  
  // Progress Bar Logic
  let progressWidth = 0;
  if (animationStage === 'INIT') progressWidth = prevState.progress;
  else if (showOldState) progressWidth = isRankUp ? 100 : currState.progress; 
  else if (showNewState) progressWidth = currState.progress;

  return (
    <div 
        className="fixed inset-0 z-[100] flex flex-col justify-between pointer-events-auto cursor-pointer"
        onClick={onDismiss}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
    >
      <div className="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in" />
      
      {/* Top Section: AI Message */}
      <div className="relative z-10 w-full pt-16 px-6 animate-slide-down">
         {aiMessage && (
            <div className="text-center space-y-6 max-w-md mx-auto">
                    <div className="inline-flex items-center gap-2 text-green-500/60 font-mono text-[10px] uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    Live Guidance
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white leading-snug font-mono drop-shadow-md">
                    "{aiMessage}"
                    </h2>
            </div>
        )}
      </div>

      {/* Center/Bottom Section: Rank Animation */}
      <div className="relative z-10 w-full px-8 pb-12 mb-10">
        
        {/* Celebration State: Large Center Rank */}
        {showCelebration && (
            <div className="absolute inset-0 flex items-center justify-center -translate-y-20 animate-scale-up-bounce">
                <div className="flex flex-col items-center">
                    <div className="relative">
                        <div className="absolute inset-0 bg-green-500/30 blur-3xl rounded-full animate-pulse-fast" />
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="1" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className={`w-32 h-32 relative z-10 ${currState.currentRank.color} drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]`}
                        >
                            <path d={currState.currentRank.icon} />
                        </svg>
                    </div>
                    <h3 className={`mt-6 text-3xl font-black italic tracking-tighter uppercase ${currState.currentRank.color} animate-slide-up`}>
                        {currState.currentRank.name}
                    </h3>
                    <span className="mt-2 text-white/60 font-mono text-xs uppercase tracking-[0.5em] animate-fade-in">
                        PROMOTION SECURED
                    </span>
                </div>
            </div>
        )}

        {/* Bar & Ranks Container */}
        <div className={`transition-all duration-500 ${showCelebration ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            
            {/* Rank Labels Row */}
            <div className="flex justify-between items-end mb-4 px-2">
                {/* Left: Current Level */}
                <div className="flex flex-col items-start gap-2">
                    <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="1.5" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className={`w-8 h-8 ${displayLeftRank.color}`}
                    >
                        <path d={displayLeftRank.icon} />
                    </svg>
                    <span className={`text-xs font-black uppercase tracking-widest ${displayLeftRank.color}`}>
                        {displayLeftRank.name}
                    </span>
                </div>

                {/* Right: Next Level */}
                {displayRightRank && (
                    <div className="flex flex-col items-end gap-2 opacity-50">
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className={`w-6 h-6 ${displayRightRank.color}`}
                        >
                            <path d={displayRightRank.icon} />
                        </svg>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${displayRightRank.color}`}>
                            {displayRightRank.name}
                        </span>
                    </div>
                )}
            </div>

            {/* Progress Bar Container */}
            <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden">
                {/* Bar Fill */}
                <div 
                    className={`absolute top-0 left-0 h-full bg-green-500 transition-all duration-1000 ease-out rounded-full
                        ${animationStage === 'PROMOTING' ? 'shadow-[0_0_20px_rgba(34,197,94,1)] brightness-150' : ''}
                    `}
                    style={{ width: `${progressWidth}%` }}
                />
            </div>
            
             <div className="text-center mt-8">
                <div className="text-white/20 font-bold text-[10px] tracking-widest uppercase animate-pulse">
                    Tap to Continue
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};

export default FeedbackOverlay;
