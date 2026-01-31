import React from 'react';
import { getRankProgress } from '../utils/rankSystem';

interface RankHUDProps {
  totalWins: number;
  isFrozen?: boolean;
  onClick?: () => void;
}

const RankHUD: React.FC<RankHUDProps> = ({ totalWins, isFrozen = false, onClick }) => {
  const { currentRank } = getRankProgress(totalWins);

  return (
    <div 
        onClick={onClick}
        className="flex items-center gap-3 bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl shadow-xl transition-all active:scale-95 hover:bg-white/10 cursor-pointer group"
    >
      <div className={`relative ${isFrozen ? 'grayscale brightness-50' : ''}`}>
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            className={`w-5 h-5 ${currentRank.color} transition-transform group-hover:scale-110`}
        >
            <path d={currentRank.icon} />
        </svg>
        {isFrozen && (
            <div className="absolute inset-0 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
        )}
      </div>
      
      <div className="flex flex-col">
        <span className={`text-[10px] font-black italic uppercase tracking-tighter leading-none ${isFrozen ? 'text-white/20' : currentRank.color}`}>
            {currentRank.name}
        </span>
        <span className="text-[8px] text-white/40 font-black uppercase tracking-widest mt-0.5">
            {totalWins} Wins
        </span>
      </div>
    </div>
  );
};

export default RankHUD;
