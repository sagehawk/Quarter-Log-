
import React from 'react';
import { ScheduleConfig } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface StatusCardProps {
  isActive: boolean;
  timeLeft: number;
  schedule: ScheduleConfig;
  onToggle: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({ isActive, timeLeft, schedule, onToggle }) => {
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
    <div className="w-full bg-black/20 backdrop-blur-md border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
        {/* Glow Effect */}
        <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl transition-opacity duration-1000 ${isActive ? 'bg-emerald-500/20 opacity-100' : 'bg-brand-500/10 opacity-50'}`}></div>

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-400' : 'text-slate-400'}`}>
                            {isActive ? 'Audit Active' : 'Audit Paused'}
                        </span>
                    </div>
                    <h2 className="text-brand-100 text-xs font-bold uppercase tracking-wide opacity-80">
                        {isActive ? 'Next Reality Check In' : 'Waiting for schedule'}
                    </h2>
                </div>
                <div className="text-right">
                     <div className="text-[10px] font-black uppercase text-brand-200 tracking-wider opacity-60">Schedule</div>
                     <div className="text-xs font-bold text-brand-100 tabular-nums">
                         {schedule.startTime} - {schedule.endTime}
                     </div>
                </div>
            </div>

            <div className="flex items-end justify-between">
                <div className="flex items-baseline gap-1">
                    <span className={`text-5xl font-black tabular-nums ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {minutes}<span className="text-2xl text-slate-400 ml-1 tracking-normal">m</span> {String(seconds).padStart(2, '0')}<span className="text-2xl text-slate-400 ml-1 tracking-normal">s</span>
                    </span>
                </div>
                
                <button 
                  onClick={handleToggle}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 ${isActive ? 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 border border-white/5' : 'bg-brand-600 hover:bg-brand-500 text-white shadow-brand-900/40'}`}
                >
                    {isActive ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="ml-1"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                    )}
                </button>
            </div>
            
            <div className="mt-4 h-1 w-full bg-slate-800/50 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ease-linear ${isActive ? 'bg-white' : 'bg-slate-500'}`}
                    style={{ width: `${Math.min(100, (timeLeft / (15 * 60 * 1000)) * 100)}%` }}
                />
            </div>
        </div>
    </div>
  );
};

export default StatusCard;
