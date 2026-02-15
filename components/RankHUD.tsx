import React from 'react';
import { getRankProgress } from '../utils/rankSystem';

interface RankHUDProps {
  totalWins: number;
  period?: string;
  isFrozen?: boolean;
  onClick?: () => void;
  dayStreak?: number;
}

const RankHUD: React.FC<RankHUDProps> = ({ totalWins, period = 'LIFETIME', isFrozen = false, onClick, dayStreak = 0 }) => {
  const { currentRank } = getRankProgress(totalWins, period);

  // Next persona unlock threshold
  const nextThreshold = dayStreak < 7 ? 7 : dayStreak < 14 ? 14 : 0;
  const prevThreshold = dayStreak < 7 ? 0 : dayStreak < 14 ? 7 : 14;
  const progress = nextThreshold > 0 ? ((dayStreak - prevThreshold) / (nextThreshold - prevThreshold)) * 100 : 100;

  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer overflow-hidden rounded-xl bg-black/40 border border-white/10 shadow-2xl backdrop-blur-md transition-all active:scale-95 hover:border-white/20"
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${currentRank.color.replace('text-', 'bg-')}`} />

      <div className="flex items-center gap-3 p-2 pr-4 relative z-10">
        {/* Rank Icon */}
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

        {/* Rank + Streak Info */}
        <div className="flex flex-col min-w-[80px]">
          <span className={`text-sm font-black uppercase italic tracking-tighter leading-none ${isFrozen ? 'text-white/20' : currentRank.color} drop-shadow-sm`}>
            {currentRank.name}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${dayStreak > 0 ? 'text-orange-500' : 'text-white/20'}`}>
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            <span className={`text-[10px] font-black tracking-wider ${dayStreak > 0 ? 'text-orange-500' : 'text-white/20'}`}>
              {dayStreak}d
            </span>
          </div>
        </div>
      </div>

      {/* Streak Progress Bar */}
      <div className="h-[2px] w-full bg-white/5">
        <div
          className={`h-full transition-all duration-700 ${dayStreak > 0 ? 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'bg-white/10'}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
};

export default RankHUD;
