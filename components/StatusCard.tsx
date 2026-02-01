import React from 'react';
import { ScheduleConfig } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface StatusCardProps {
  isActive: boolean;
  timeLeft: number;
  schedule: ScheduleConfig;
  blockStats: { total: number; remaining: number };
  onToggle: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({ isActive, timeLeft, schedule, blockStats, onToggle }) => {
  // Format time left
  const totalSeconds = Math.ceil(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    onToggle();
  };

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
        {/* Glow Effect */}
        <div className={`absolute -right-10 -top-10 w-40 h-40 rounded-full blur-[80px] transition-opacity duration-1000 ${isActive ? 'bg-yellow-500/10 opacity-100' : 'bg-zinc-800/50 opacity-0'}`}></div>

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-yellow-500 animate-pulse shadow-[0_0_10px_rgba(234,179,8,1)]' : 'bg-zinc-700'}`}></span>
                        <span className={`text-xs font-black uppercase tracking-[0.3em] italic ${isActive ? 'text-yellow-500' : 'text-zinc-500'}`}>
                            {isActive ? 'Cycle Active' : 'Cycle Paused'}
                        </span>
                    </div>
                    <h2 className="text-zinc-500 text-xs font-black uppercase tracking-[0.2em] italic">
                        {isActive ? 'Next Tactical Decision In' : 'Standing by for cycle'}
                    </h2>
                </div>
                <div className="text-right">
                     <div className="text-xs font-black uppercase text-zinc-500 tracking-widest italic mb-1">Cycles Left</div>
                     <div className="text-sm font-black text-white/80 tracking-tighter italic">
                         <span className="text-yellow-500 text-2xl">{blockStats.remaining}</span> <span className="text-zinc-600 text-base">/ {blockStats.total}</span>
                     </div>
                </div>
            </div>

            <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                    <span className={`text-6xl font-black tracking-tighter italic tabular-nums ${isActive ? 'text-white' : 'text-zinc-700'}`}>
                        {minutes}<span className="text-2xl text-zinc-700 ml-1 tracking-normal not-italic">m</span> {String(seconds).padStart(2, '0')}<span className="text-2xl text-zinc-700 ml-1 tracking-normal not-italic">s</span>
                    </span>
                </div>
                
                <button 
                  onClick={handleToggle}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-xl active:scale-95 border ${isActive ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border-zinc-700' : 'bg-yellow-500 hover:bg-yellow-400 text-black border-yellow-400 shadow-yellow-500/20'}`}
                >
                    {isActive ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    )}
                </button>
            </div>
            
            {/* Progress Bar (Time Left in 15m) */}
            <div className="mt-6 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden border border-zinc-800">
                <div 
                    className={`h-full transition-all duration-1000 ease-linear ${isActive ? 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'bg-zinc-700'}`}
                    style={{ width: `${Math.min(100, (timeLeft / (15 * 60 * 1000)) * 100)}%` }}
                />
            </div>
        </div>
    </div>
  );
};

export default StatusCard;