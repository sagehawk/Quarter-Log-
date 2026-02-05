import React from 'react';
import { getRankProgress } from '../utils/rankSystem';

interface RankHUDProps {
  totalWins: number;
  period?: string;
  isFrozen?: boolean;
  onClick?: () => void;
}

const RankHUD: React.FC<RankHUDProps> = ({ totalWins, period = 'LIFETIME', isFrozen = false, onClick }) => {
  const { currentRank } = getRankProgress(totalWins, period);

  return (
    <div 
        onClick={onClick}
        className="relative group cursor-pointer overflow-hidden rounded-xl bg-black/40 border border-white/10 shadow-2xl backdrop-blur-md transition-all active:scale-95 hover:border-white/20"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${currentRank.color.replace('text-', 'bg-')}`} />
      
      <div className="flex items-center gap-3 p-2 pr-4 relative z-10">
        <div className={`w-10 h-10 flex items-center justify-center rounded-lg bg-white/5 border border-white/5 shadow-inner ${isFrozen ? 'grayscale opacity-50' : ''}`}>
            <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className={`w-6 h-6 ${currentRank.color} drop-shadow-[0_0_8px_currentColor] transition-transform group-hover:scale-110 duration-300`}
            >
                <path d={currentRank.icon} />
            </svg>
        </div>
        
        <div className="flex flex-col">
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/30 leading-none mb-1.5">
                STATUS
            </span>
            <span className={`text-sm font-black uppercase italic tracking-tighter leading-none ${isFrozen ? 'text-white/20' : currentRank.color} drop-shadow-sm`}>
                {currentRank.name}
            </span>
        </div>
      </div>
      
      {/* Decorative Progress Line */}
      <div className="h-[2px] w-full bg-white/5 mt-0.5">
          <div className={`h-full ${isFrozen ? 'bg-white/20' : currentRank.color.replace('text-', 'bg-')} shadow-[0_0_5px_currentColor]`} style={{ width: '100%' }} />
      </div>
    </div>
  );
};

export default RankHUD;
