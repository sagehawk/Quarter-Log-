import React from 'react';
import { ScheduleConfig } from '../types';

interface StatusCardProps {
  isActive: boolean;
  timeLeft: number;
  schedule: ScheduleConfig;
}

const StatusCard: React.FC<StatusCardProps> = ({ isActive, timeLeft, schedule }) => {
  // Format time left
  const totalSeconds = Math.ceil(timeLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
        {/* Glow Effect */}
        <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl transition-opacity duration-1000 ${isActive ? 'bg-emerald-500/20 opacity-100' : 'bg-brand-500/10 opacity-50'}`}></div>

        <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {isActive ? 'Audit Active' : 'Audit Paused'}
                        </span>
                    </div>
                    <h2 className="text-slate-400 text-xs font-bold uppercase tracking-wide">
                        {isActive ? 'Next Reality Check In' : 'Waiting for schedule'}
                    </h2>
                </div>
                <div className="text-right">
                     <div className="text-[10px] font-black uppercase text-slate-600 tracking-wider">Schedule</div>
                     <div className="text-xs font-bold text-slate-400 tabular-nums">
                         {schedule.startTime} - {schedule.endTime}
                     </div>
                </div>
            </div>

            <div className="flex items-baseline gap-1">
                <span className={`text-5xl font-black tracking-tighter tabular-nums ${isActive ? 'text-white' : 'text-slate-600'}`}>
                    {minutes}<span className="text-2xl text-slate-600">m</span> {String(seconds).padStart(2, '0')}<span className="text-2xl text-slate-600">s</span>
                </span>
            </div>
            
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <div 
                    className={`h-full transition-all duration-1000 ease-linear ${isActive ? 'bg-white' : 'bg-slate-700'}`}
                    style={{ width: `${Math.min(100, (timeLeft / (15 * 60 * 1000)) * 100)}%` }}
                />
            </div>
        </div>
    </div>
  );
};

export default StatusCard;