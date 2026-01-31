import React, { useEffect, useRef } from 'react';
import { RANKS, Rank } from '../utils/rankSystem';

interface RankHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWins: number;
  period: string;
}

const RankHierarchyModal: React.FC<RankHierarchyModalProps> = ({ isOpen, onClose, currentWins, period }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to current rank on open
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      // Find current rank index
      let rankIndex = 0;
      for (let i = RANKS.length - 1; i >= 0; i--) {
        if (currentWins >= RANKS[i].threshold) {
          rankIndex = i;
          break;
        }
      }
      // Scroll calculation
      const rowHeight = 80; // approx
      scrollRef.current.scrollTop = (rankIndex * rowHeight) - 100; 
    }
  }, [isOpen, currentWins]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,1)] flex flex-col animate-slide-up max-h-[85vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-8 pb-4 z-10 bg-[#0a0a0a] border-b border-white/5 shrink-0">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                Hierarchy
            </h2>
            <div className="flex items-center justify-between mt-2">
                <span className="text-yellow-500/60 text-[10px] font-black uppercase tracking-[0.2em] italic">
                    {period} Progression
                </span>
                <span className="bg-white/10 px-3 py-1 rounded-full text-xs font-black text-white tabular-nums">
                    {currentWins} WINS
                </span>
            </div>
        </div>

        {/* Rank List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-3">
            {RANKS.map((rank, index) => {
                const isUnlocked = currentWins >= rank.threshold;
                const isCurrent = isUnlocked && (index === RANKS.length - 1 || currentWins < RANKS[index + 1].threshold);
                const nextRank = RANKS[index + 1];
                const progressToNext = nextRank 
                    ? Math.min(100, Math.max(0, ((currentWins - rank.threshold) / (nextRank.threshold - rank.threshold)) * 100))
                    : 100;

                return (
                    <div 
                        key={rank.name}
                        className={`relative p-4 rounded-2xl border transition-all duration-300 ${
                            isCurrent 
                                ? 'bg-white/10 border-yellow-500/50 shadow-[0_0_30px_rgba(234,179,8,0.1)] scale-[1.02]' 
                                : isUnlocked 
                                    ? 'bg-white/5 border-white/5 opacity-60' 
                                    : 'bg-black/40 border-white/5 opacity-30 grayscale'
                        }`}
                    >
                        <div className="flex items-center gap-4 relative z-10">
                            {/* Icon */}
                            <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-black/50 border border-white/10 shrink-0 ${rank.color}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
                                    <path d={rank.icon} />
                                </svg>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h3 className={`font-black uppercase tracking-widest text-sm italic ${isUnlocked ? 'text-white' : 'text-white/40'}`}>
                                        {rank.name}
                                    </h3>
                                    <span className="text-[10px] font-bold text-white/20 font-mono">
                                        {rank.threshold}+
                                    </span>
                                </div>
                                
                                {/* Mini Progress for Current Rank */}
                                {isCurrent && nextRank && (
                                    <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden mt-2">
                                        <div 
                                            className={`h-full ${rank.color.replace('text-', 'bg-')} shadow-[0_0_10px_currentColor]`} 
                                            style={{ width: `${progressToNext}%` }}
                                        />
                                    </div>
                                )}
                                {isCurrent && !nextRank && (
                                     <div className="text-[9px] text-yellow-500 font-black uppercase tracking-widest mt-1">Max Rank Achieved</div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="p-6 bg-[#0a0a0a] border-t border-white/5 shrink-0">
            <button 
                onClick={onClose}
                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/40 font-black uppercase tracking-[0.2em] rounded-xl transition-all text-[10px] italic"
            >
                Close Intel
            </button>
        </div>
      </div>
    </div>
  );
};

export default RankHierarchyModal;
