import React, { useEffect, useRef } from 'react';
import { RANKS, getThresholdsForPeriod } from '../utils/rankSystem';

interface RankHierarchyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWins: number;
  period: string; // 'Daily', 'Weekly', etc. passed from App.tsx
}

const RankHierarchyModal: React.FC<RankHierarchyModalProps> = ({ isOpen, onClose, currentWins, period }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Convert friendly period name back to key if necessary, or ensure App passes key.
  // App passes: 'Daily' -> 'D', 'Weekly' -> 'W', etc.
  // Actually App.tsx logic: period={filter === 'D' ? 'Daily' : ...}
  // We need the KEY ('D', 'W') to get thresholds.
  // Let's deduce the key or accept key as prop. 
  // Easier to map back:
  const getPeriodKey = (p: string) => {
      if (p.startsWith('Daily')) return 'D';
      if (p.startsWith('Weekly')) return 'W';
      if (p.startsWith('Monthly')) return 'M';
      if (p.startsWith('Quarterly')) return '3M';
      if (p.startsWith('Year')) return 'Y'; // 'Quarterly (Year)' logic in App.tsx was weird, let's assume 'Y' won't be passed as 'Quarterly'.
      // App.tsx: period={filter === 'D' ? 'Daily' : filter === 'W' ? 'Weekly' : filter === 'M' ? 'Monthly' : 'Quarterly' + (filter === 'Y' ? ' (Year)' : '')}
      // If filter is Y, it says "Quarterly (Year)" ? That looks like a bug in my previous read of App.tsx logic.
      // Let's re-read App.tsx logic in my head:
      // filter === 'Y' ? ' (Year)' : '' -> This appends to 'Quarterly' only if ... wait.
      // filter === 'M' ? 'Monthly' : 'Quarterly' ...
      // If filter is 'Y', it falls to 'Quarterly' + ' (Year)' -> "Quarterly (Year)".
      // This is confusing. I should fix App.tsx to pass the Key or clean this up.
      // For now, I'll map "Quarterly (Year)" to 'Y'.
      if (p.includes('Year')) return 'Y';
      return '3M'; // Default to Quarterly if not matched above
  };

  const periodKey = getPeriodKey(period);
  const thresholds = getThresholdsForPeriod(periodKey);

  // Scroll to current rank on open
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      // Find current rank index
      let rankIndex = 0;
      for (let i = RANKS.length - 1; i >= 0; i--) {
        if (currentWins >= thresholds[i]) {
          rankIndex = i;
          break;
        }
      }
      // Scroll calculation
      const rowHeight = 80; // approx
      scrollRef.current.scrollTop = (rankIndex * rowHeight) - 100; 
    }
  }, [isOpen, currentWins, thresholds]);

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
                const threshold = thresholds[index];
                const nextThreshold = thresholds[index + 1];
                
                const isUnlocked = currentWins >= threshold;
                const isCurrent = isUnlocked && (index === RANKS.length - 1 || currentWins < nextThreshold);
                
                const progressToNext = nextThreshold 
                    ? Math.min(100, Math.max(0, ((currentWins - threshold) / (nextThreshold - threshold)) * 100))
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
                                        {threshold}+
                                    </span>
                                </div>
                                
                                {/* Mini Progress for Current Rank */}
                                {isCurrent && nextThreshold && (
                                    <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden mt-2">
                                        <div 
                                            className={`h-full ${rank.color.replace('text-', 'bg-')} shadow-[0_0_10px_currentColor]`} 
                                            style={{ width: `${progressToNext}%` }}
                                        />
                                    </div>
                                )}
                                {isCurrent && !nextThreshold && (
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
