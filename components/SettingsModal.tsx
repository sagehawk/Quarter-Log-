import React, { useState, useEffect } from 'react';
import { Share } from '@capacitor/share';
import { keepAwake } from '../utils/sound';
import { sendNotification, requestNotificationPermission } from '../utils/notifications';
import { LogEntry, ScheduleConfig, UserGoal } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  currentDurationMs: number;
  logs: LogEntry[];
  schedule?: ScheduleConfig; 
  breakUntil: number | null;
  onSave: (minutes: number) => void;
  onSaveSchedule?: (schedule: ScheduleConfig) => void;
  onTakeBreak: (durationMs: number | null) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  currentDurationMs,
  schedule, 
  breakUntil,
  onSave,
  onSaveSchedule, 
  onTakeBreak,
  onClose 
}) => {
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [duration, setDuration] = useState(Math.floor(currentDurationMs / 60000));
  const [localSchedule, setLocalSchedule] = useState<ScheduleConfig>(schedule || {
    enabled: true,
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5]
  });
  const [goals, setGoals] = useState<UserGoal[]>([]);

  useEffect(() => {
    if (isOpen) {
        setDuration(Math.floor(currentDurationMs / 60000));
        // ... (existing goal loading)
        const storedGoal = localStorage.getItem('ironlog_goal');
        if (storedGoal) {
            try {
                const parsed = JSON.parse(storedGoal);
                if (Array.isArray(parsed)) {
                    setGoals(parsed);
                } else {
                    setGoals([storedGoal as UserGoal]);
                }
            } catch (e) {
                setGoals([storedGoal as UserGoal]);
            }
        } else {
            setGoals(['FOCUS']);
        }

        if (schedule) {
            setLocalSchedule({ ...schedule, enabled: true });
        }
    }
  }, [isOpen, schedule, currentDurationMs]);

  // ... (existing methods: toggleGoal, checkPermissions, toggleDay)
  const toggleGoal = (goal: UserGoal) => {
      setGoals(prev => {
          let newGoals: UserGoal[];
          if (prev.includes(goal)) {
              newGoals = prev.filter(g => g !== goal);
          } else {
              newGoals = [...prev, goal];
          }
          if (newGoals.length === 0) newGoals = [goal]; 
          localStorage.setItem('ironlog_goal', JSON.stringify(newGoals));
          return newGoals;
      });
  };

  const checkPermissions = async () => {
    await requestNotificationPermission();
  };

  const toggleDay = (dayIndex: number) => {
    setLocalSchedule(prev => {
      const newDays = prev.daysOfWeek.includes(dayIndex)
        ? prev.daysOfWeek.filter(d => d !== dayIndex)
        : [...prev.daysOfWeek, dayIndex].sort();
      return { ...prev, daysOfWeek: newDays };
    });
  };

  const handleSaveAndClose = () => {
    onSave(duration * 60000); // Convert minutes to ms
    if (onSaveSchedule) {
      onSaveSchedule({ ...localSchedule });
    }
    onClose();
  };

  const handleShare = async () => {
      try {
          await Share.share({
              title: 'Winner Effect: Log the Win',
              text: 'Stacking wins and building momentum. Join the leaderboard:',
              url: 'https://play.google.com/store/apps/details?id=com.quarterlog.app',
              dialogTitle: 'Share Winner Effect',
          });
      } catch (e) {}
  };

  const handleRate = () => {
      window.open('https://play.google.com/store/apps/details?id=com.quarterlog.app', '_system');
  };

  if (!isOpen) return null;

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col overflow-hidden animate-fade-in">
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pb-32">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-10 mt-10">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter italic">Tactical Configuration</h2>
            <p className="text-yellow-500/40 text-xs font-black uppercase tracking-[0.3em] mt-2 italic">Refine your operational edge</p>
        </div>
        
        {/* Cycle Duration */}
        <div className="mb-10">
             <div className="flex items-center justify-between mb-4">
                <span className="text-white font-black uppercase text-sm tracking-[0.2em] italic border-l-4 border-yellow-500 pl-4">Cycle Length</span>
                <span className="text-yellow-500 font-black italic">{duration}m</span>
             </div>
             <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                 <input 
                    type="range" 
                    min="5" 
                    max="60" 
                    step="5" 
                    value={duration} 
                    onChange={(e) => setDuration(parseInt(e.target.value))}
                    className="w-full accent-yellow-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                 />
                 <div className="flex justify-between mt-2 text-[10px] font-black text-white/20 uppercase tracking-widest">
                     <span>5m</span>
                     <span>30m</span>
                     <span>60m</span>
                 </div>
             </div>
        </div>

        {/* Schedule Section */}
        {onSaveSchedule && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <span className="text-white font-black uppercase text-sm tracking-[0.2em] italic border-l-4 border-yellow-500 pl-4">Active Duty</span>
            <button 
                onClick={() => setLocalSchedule(p => ({ ...p, enabled: !p.enabled }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${localSchedule.enabled ? 'bg-yellow-500' : 'bg-zinc-800'}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all ${localSchedule.enabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          <div className={`bg-white/5 rounded-3xl p-6 space-y-6 border border-white/5 shadow-inner transition-opacity ${localSchedule.enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            
            {/* Days */}
            <div>
              <label className="text-xs uppercase font-black text-white/30 block mb-3 tracking-[0.2em] italic">Battlegrounds</label>
              <div className="flex justify-between gap-1.5">
                {days.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleDay(idx)}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all duration-300 ${
                      localSchedule.daysOfWeek.includes(idx)
                        ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-110'
                        : 'bg-white/5 text-white/20 hover:bg-white/10'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Times */}
            <div className="flex gap-4">
               <div className="flex-1">
                  <label className="text-xs uppercase font-black text-white/30 block mb-2 tracking-[0.2em] italic">Start Ops</label>
                  <input 
                    type="time" 
                    value={localSchedule.startTime}
                    onChange={(e) => setLocalSchedule(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full bg-black/40 text-white font-black text-sm rounded-xl px-4 py-4 border border-white/10 outline-none focus:border-yellow-500/50 transition-all text-center"
                  />
               </div>
               <div className="flex-1">
                  <label className="text-xs uppercase font-black text-white/30 block mb-2 tracking-[0.2em] italic">End Ops</label>
                  <input 
                    type="time" 
                    value={localSchedule.endTime}
                    onChange={(e) => setLocalSchedule(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full bg-black/40 text-white font-black text-sm rounded-xl px-4 py-4 border border-white/10 outline-none focus:border-yellow-500/50 transition-all text-center"
                  />
               </div>
            </div>

          </div>
        </div>
        )}

        {/* Stand Down Protocol (Timed Breaks) */}
        <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
                <span className="text-white font-black uppercase text-sm tracking-[0.2em] italic border-l-4 border-yellow-500 pl-4">Stand Down</span>
            </div>
            
            {breakUntil && breakUntil > Date.now() ? (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-6 text-center space-y-4">
                    <p className="text-yellow-500 font-black uppercase tracking-[0.2em] text-xs italic">Operations Paused Until</p>
                    <p className="text-2xl font-black text-white italic">{new Date(breakUntil).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    <button 
                        onClick={() => onTakeBreak(null)}
                        className="w-full py-3 bg-yellow-500 text-black font-black uppercase tracking-[0.2em] rounded-xl text-xs italic active:scale-95 transition-transform"
                    >
                        Resume Operations
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    {[
                        { label: '15 Mins', val: 15 * 60 * 1000 },
                        { label: '1 Hour', val: 60 * 60 * 1000 },
                        { label: '8 Hours', val: 8 * 60 * 60 * 1000 },
                        { label: '24 Hours', val: 24 * 60 * 60 * 1000 },
                    ].map((opt) => (
                        <button 
                            key={opt.label}
                            onClick={() => onTakeBreak(opt.val)}
                            className="py-4 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 rounded-2xl text-xs font-black uppercase text-white/60 hover:text-white transition-all italic active:scale-95"
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Divider */}
        <div className="h-px bg-white/5 my-10"></div>

        {/* Tactical Actions */}
        <div className="space-y-4">
            
            <button 
                onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                className="w-full text-xs font-black uppercase tracking-[0.2em] text-white/20 hover:text-white flex items-center justify-center gap-2 py-4 transition-colors italic"
            >
                {showTroubleshoot ? 'HIDE SYSTEM LOGS' : 'SYSTEM TROUBLESHOOTING'}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showTroubleshoot ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            {showTroubleshoot && (
                <div className="bg-black/60 rounded-2xl p-6 text-sm text-white/40 space-y-4 border border-white/5 animate-fade-in italic">
                    <div>
                        <strong className="text-white block mb-1 font-black uppercase tracking-widest italic text-xs">1. COMMS CHANNEL</strong>
                        <p className="mb-3">Ensure tactical notifications are authorized.</p>
                        <button onClick={checkPermissions} className="text-xs bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg text-white font-black uppercase tracking-widest italic transition-colors">
                            RE-AUTHORIZE
                        </button>
                    </div>
                    <div>
                        <strong className="text-white block mb-1 font-black uppercase tracking-widest italic text-xs">2. POWER MANAGEMENT</strong>
                        <p>Disable <span className="text-yellow-500">Battery Optimization</span> to prevent cycle drift.</p>
                    </div>
                </div>
            )}
        </div>
        
        {/* Divider */}
        <div className="h-px bg-white/5 my-10"></div>

        {/* Social Section */}
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={handleShare}
                className="bg-white/5 hover:bg-white/10 p-6 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-95 group border border-white/5"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-yellow-500 transition-colors"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                <span className="text-xs font-black uppercase text-white/20 group-hover:text-white tracking-[0.2em] italic transition-colors">Invite Friends</span>
            </button>
             <button 
                onClick={handleRate}
                className="bg-white/5 hover:bg-white/10 p-6 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-95 group border border-white/5"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-yellow-500 transition-colors"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <span className="text-xs font-black uppercase text-white/20 group-hover:text-white tracking-[0.2em] italic transition-colors">Review</span>
            </button>
        </div>

          </div>
        </div>

        <div className="p-8 pt-6 border-t border-white/5 bg-[#0a0a0a] z-10">
            <div className="max-w-xl mx-auto w-full">
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="w-full py-5 rounded-xl font-black uppercase text-white/20 hover:text-white transition-colors tracking-[0.3em] text-sm italic"
            >
              CLOSE COMMAND
            </button>
            </div>
        </div>
    </div>
  );
};

export default SettingsModal;