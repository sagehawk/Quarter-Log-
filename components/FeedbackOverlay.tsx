import React, { useEffect, useState, useMemo } from 'react';
import { getRankProgress, getRankForPeriod, getThresholdsForPeriod } from '../utils/rankSystem';
import TacticalCoachView, { CoachMood } from './TacticalCoachView';

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
    aiMessage,
    period = 'D',
    onDismiss
}) => {
  const [animationStage, setAnimationStage] = useState<'INIT' | 'FILLING' | 'PROMOTING' | 'CELEBRATING' | 'RESET'>('INIT');

  // Calculate Rank State
  const prevWins = Math.max(0, totalWins - 1);
  const currWins = totalWins;

  const getState = (wins: number) => {
      const thresholds = getThresholdsForPeriod(period);
      let rankIndex = 0;
      for (let i = thresholds.length - 1; i >= 0; i--) {
        if (wins >= thresholds[i]) {
          rankIndex = i;
          break;
        }
      }
      return getRankProgress(wins, period);
  };

  const prevState = useMemo(() => getState(prevWins), [prevWins, period]);
  const currState = useMemo(() => getState(currWins), [currWins, period]);
  const isRankUp = prevState.currentRank.name !== currState.currentRank.name;

  // Determine Coach Mood & Clean Message
  const { cleanMessage, mood } = useMemo((): { cleanMessage: string, mood: CoachMood } => {
    if (!isVisible) return { cleanMessage: "", mood: 'IDLE' };
    
    // Initial "Processing" state usually set by parent
    if (!aiMessage || aiMessage.includes("Analyzing") || aiMessage === "Processing...") {
        return { cleanMessage: "Analyzing tactical data...", mood: 'PROCESSING' };
    }

    // Parse Tag
    const match = aiMessage.match(/^\[MOOD:\s*(\w+)\]/);
    if (match) {
        const tag = match[1].toUpperCase();
        let parsedMood: CoachMood = 'IDLE';
        if (['IDLE','ASKING','PROCESSING','WIN','LOSS','SAVAGE','STOIC'].includes(tag)) {
            parsedMood = tag as CoachMood;
        }
        return { 
            cleanMessage: aiMessage.replace(match[0], '').trim(), 
            mood: parsedMood 
        };
    }

    // Fallback if no tag
    return { 
        cleanMessage: aiMessage, 
        mood: type === 'WIN' ? 'WIN' : 'LOSS' 
    };
  }, [aiMessage, type, isVisible]);


  useEffect(() => {
    if (isVisible && type === 'WIN') {
      setAnimationStage('INIT');
      const t1 = setTimeout(() => setAnimationStage('FILLING'), 300);
      
      if (isRankUp) {
          const t2 = setTimeout(() => setAnimationStage('PROMOTING'), 1500);
          const t3 = setTimeout(() => setAnimationStage('CELEBRATING'), 2000);
          const t4 = setTimeout(() => setAnimationStage('RESET'), 4500); 
          return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
      }
      return () => clearTimeout(t1);
    }
  }, [isVisible, type, isRankUp]);


  if (!isVisible) return null;

  // Render Variables for Rank Animation
  const showOldState = ['INIT', 'FILLING', 'PROMOTING'].includes(animationStage);
  const showCelebration = animationStage === 'CELEBRATING';
  const showNewState = animationStage === 'RESET';
  
  const displayLeftRank = showNewState ? currState.currentRank : prevState.currentRank;
  const displayRightRank = showNewState ? currState.nextRank : prevState.nextRank;
  
  let progressWidth = 0;
  if (animationStage === 'INIT') progressWidth = prevState.progress;
  else if (showOldState) progressWidth = isRankUp ? 100 : currState.progress; 
  else if (showNewState) progressWidth = currState.progress;

  return (
    <div className="fixed inset-0 z-[100]" onClick={onDismiss}>
        <TacticalCoachView mood={mood} message={cleanMessage}>
            
            {/* Rank Animation Container (Bottom Overlay) */}
            <div className="w-full pb-8">
                
                {/* Celebration Icon Overlay */}
                {showCelebration && (
                    <div className="absolute inset-0 -top-40 flex items-center justify-center animate-scale-up-bounce pointer-events-none">
                        <div className="flex flex-col items-center">
                            <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="1" 
                                strokeLinecap="round" 
                                strokeLinejoin="round"
                                className={`w-32 h-32 ${currState.currentRank.color} drop-shadow-[0_0_30px_rgba(34,197,94,0.8)]`}
                            >
                                <path d={currState.currentRank.icon} />
                            </svg>
                            <h3 className={`mt-4 text-3xl font-black italic tracking-tighter uppercase ${currState.currentRank.color} animate-slide-up`}>
                                {currState.currentRank.name}
                            </h3>
                            <span className="text-white/60 font-mono text-xs uppercase tracking-[0.5em] animate-fade-in bg-black/50 px-2 rounded">
                                PROMOTION
                            </span>
                        </div>
                    </div>
                )}

                {/* Standard Progress Bar */}
                <div className={`transition-all duration-500 ${showCelebration ? 'opacity-0' : 'opacity-100'}`}>
                    {/* Labels */}
                    <div className="flex justify-between items-end mb-2 px-1">
                        <div className="flex items-center gap-2">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-5 h-5 ${displayLeftRank.color}`}><path d={displayLeftRank.icon}/></svg>
                             <span className={`text-[10px] font-black uppercase tracking-widest ${displayLeftRank.color}`}>{displayLeftRank.name}</span>
                        </div>
                        {displayRightRank && (
                             <div className="flex items-center gap-2 opacity-50">
                                 <span className={`text-[10px] font-bold uppercase tracking-widest ${displayRightRank.color}`}>{displayRightRank.name}</span>
                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`w-4 h-4 ${displayRightRank.color}`}><path d={displayRightRank.icon}/></svg>
                             </div>
                        )}
                    </div>

                    {/* Bar */}
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/5">
                        <div 
                            className={`h-full bg-green-500 transition-all duration-1000 ease-out rounded-full ${animationStage === 'PROMOTING' ? 'shadow-[0_0_15px_rgba(34,197,94,1)] brightness-125' : ''}`}
                            style={{ width: `${progressWidth}%` }}
                        />
                    </div>
                </div>

                <div className="text-center mt-6">
                    <p className="text-white/20 text-[9px] font-black uppercase tracking-[0.3em] animate-pulse">
                        Tap screen to dismiss
                    </p>
                </div>
            </div>

        </TacticalCoachView>
    </div>
  );
};

export default FeedbackOverlay;