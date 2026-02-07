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

  const getPeriodKey = (p: string) => {
      if (p.startsWith('Daily')) return 'D';
      if (p.startsWith('Weekly')) return 'W';
      if (p.startsWith('Monthly')) return 'M';
      if (p.startsWith('Quarterly')) return '3M';
      if (p.includes('Year')) return 'Y';
      return '3M'; 
  };

  const periodKey = getPeriodKey(period);
  const thresholds = getThresholdsForPeriod(periodKey);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      let rankIndex = 0;
      for (let i = RANKS.length - 1; i >= 0; i--) {
        if (currentWins >= thresholds[i]) {
          rankIndex = i;
          break;
        }
      }
      const rowHeight = 100; 
      scrollRef.current.scrollTop = (rankIndex * rowHeight) - 150; 
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
        <div className="p-8 pb-6 z-10 bg-[#0a0a0a] border-b border-white/5 shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 blur-[50px] rounded-full pointer-events-none" />
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic relative z-10">
                Clearance Levels
            </h2>
            <div className="flex items-center justify-between mt-2 relative z-10">
                <span className="text-yellow-500/60 text-[10px] font-black uppercase tracking-[0.2em] italic">
                    {period} Protocol
                </span>
                <span className="bg-zinc-900 border border-white/10 px-3 py-1 rounded-lg text-xs font-mono font-bold text-white tabular-nums">
                    ORD: {currentWins}
                </span>
            </div>
        </div>

        {/* Rank List */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-0">
            {RANKS.map((rank, index) => {
                const threshold = thresholds[index];
                const nextThreshold = thresholds[index + 1];
                
                const isUnlocked = currentWins >= threshold;
                const isCurrent = isUnlocked && (index === RANKS.length - 1 || currentWins < nextThreshold);
                
                const progressToNext = nextThreshold 
                    ? Math.min(100, Math.max(0, ((currentWins - threshold) / (nextThreshold - threshold)) * 100))
                    : 100;

                return (
                    <div key={rank.name} className="relative pl-4 pb-10 last:pb-0 group">
                        {/* Connecting Line */}
                        {index !== RANKS.length - 1 && (
                            <div className={`absolute left-[27px] top-10 bottom-0 w-[2px] ${isUnlocked && currentWins >= nextThreshold ? 'bg-yellow-500/20' : 'bg-white/5'}`} />
                        )}

                        <div className="flex items-start gap-5 relative z-10">
                            {/* Node */}
                            <div className={`w-6 h-6 rounded-full border-[3px] shrink-0 flex items-center justify-center mt-1 transition-all duration-500 ${
                                isCurrent 
                                    ? 'border-yellow-500 bg-black shadow-[0_0_15px_rgba(234,179,8,0.6)] scale-110' 
                                    : isUnlocked 
                                        ? 'border-yellow-500/50 bg-yellow-500/10' 
                                        : 'border-white/10 bg-black'
                            }`}>
                                {isUnlocked && <div className="w-1.5 h-1.5 rounded-full bg-yellow-500" />}
                            </div>

                            {/* Card */}
                            <div className={`flex-1 transition-all duration-300 ${isCurrent ? 'opacity-100' : isUnlocked ? 'opacity-60 hover:opacity-80' : 'opacity-30 grayscale'}`}>
                                <div className={`p-4 rounded-2xl border transition-all ${
                                    isCurrent 
                                        ? 'bg-zinc-900 border-yellow-500/30 shadow-lg' 
                                        : 'bg-transparent border-white/5'
                                }`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className={`font-black uppercase tracking-widest text-sm italic ${isCurrent ? 'text-yellow-500' : 'text-white'}`}>
                                            {rank.name}
                                        </h3>
                                        <div className="flex items-center gap-1">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={isUnlocked ? "text-yellow-500" : "text-white/20"}>
                                                {isUnlocked ? <polyline points="20 6 9 17 4 12"></polyline> : <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>}
                                            </svg>
                                            <span className="text-[10px] font-mono font-bold text-white/40">{threshold}</span>
                                        </div>
                                    </div>

                                    {/* Progress Bar for Current */}
                                    {isCurrent && nextThreshold && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-white/30 mb-1">
                                                <span>Progress</span>
                                                <span>{Math.round(progressToNext)}%</span>
                                            </div>
                                            <div className="h-1 w-full bg-black rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)] transition-all duration-1000 ease-out" 
                                                    style={{ width: `${progressToNext}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>

        <div className="p-6 bg-[#0a0a0a] border-t border-white/5 shrink-0 z-20">
            <button 
                onClick={onClose}
                className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-white/40 font-black uppercase tracking-[0.2em] rounded-xl transition-all text-[10px] italic border border-white/5"
            >
                Acknwloedge
            </button>
        </div>
      </div>
    </div>
  );
};

export default RankHierarchyModal;
