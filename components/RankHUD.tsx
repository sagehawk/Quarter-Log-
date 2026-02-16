import React from 'react';
import { getRankProgress } from '../utils/rankSystem';
import { AppTheme } from '../types';

interface RankHUDProps {
  totalWins: number;
  period?: string;
  isFrozen?: boolean;
  onClick?: () => void;
  dayStreak?: number;
  insurance?: number;
  theme?: AppTheme;
  iconOnly?: boolean;
}

const RankHUD: React.FC<RankHUDProps> = ({ totalWins, period = 'LIFETIME', isFrozen = false, onClick, dayStreak = 0, insurance = 0, theme = 'dark', iconOnly = false }) => {
  const { currentRank } = getRankProgress(totalWins, period);
  const isDark = theme === 'dark';

  // Next persona unlock threshold
  const nextThreshold = dayStreak < 7 ? 7 : dayStreak < 14 ? 14 : 0;
  const prevThreshold = dayStreak < 7 ? 0 : dayStreak < 14 ? 7 : 14;
  const progress = nextThreshold > 0 ? ((dayStreak - prevThreshold) / (nextThreshold - prevThreshold)) * 100 : 100;

  if (iconOnly) {
    return (
      <button
        onClick={onClick}
        className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all active:scale-95 group relative ${isDark ? 'bg-zinc-900/50 hover:bg-zinc-800 border-white/5 hover:border-white/10' : 'bg-white hover:bg-zinc-100 border-zinc-200 hover:border-zinc-300'}`}
        title={`Rank: ${currentRank.name}`}
      >
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

        {/* Streak dot indicator if streak > 0 */}
        {dayStreak > 0 && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-black animate-flame" />
        )}
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className={`relative group cursor-pointer overflow-hidden rounded-xl border shadow-2xl backdrop-blur-md transition-all active:scale-95 ${isDark ? 'bg-black/40 border-white/10 hover:border-white/20' : 'bg-white border-zinc-200 hover:border-zinc-300 shadow-sm'}`}
    >
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${currentRank.color.replace('text-', 'bg-')}`} />

      <div className="flex items-center gap-3 p-2 pr-4 relative z-10">
        {/* Rank Icon */}
        <div className={`w-10 h-10 flex items-center justify-center rounded-lg shadow-inner ${isFrozen ? 'grayscale opacity-50' : ''} ${isDark ? 'bg-white/5 border border-white/5' : 'bg-zinc-100 border border-zinc-200'}`}>
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
          <span className={`text-sm font-black uppercase italic tracking-tighter leading-none drop-shadow-sm ${isFrozen ? (isDark ? 'text-white/20' : 'text-zinc-300') : currentRank.color}`}>
            {currentRank.name}
          </span>
          <div className="flex items-center gap-1.5 mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${dayStreak > 0 ? 'text-orange-500 animate-flame' : (isDark ? 'text-white/20' : 'text-zinc-300')}`}>
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
            </svg>
            <span className={`text-[10px] font-black tracking-wider ${dayStreak > 0 ? 'text-orange-500' : (isDark ? 'text-white/20' : 'text-zinc-300')}`}>
              {dayStreak}d
            </span>
          </div>

          {/* Insurance Badge */}
          {insurance > 0 && (
            <div className={`absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full border ${isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              </svg>
              <span className="text-[9px] font-black leading-none pt-[1px]">{insurance}</span>
            </div>
          )}
        </div>
      </div>


      {/* Streak Progress Bar */}
      <div className={`h-[2px] w-full ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`}>
        <div
          className={`h-full transition-all duration-700 ${dayStreak > 0 ? 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_5px_rgba(249,115,22,0.5)]' : 'bg-white/10'}`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div >
  );
};

export default RankHUD;
