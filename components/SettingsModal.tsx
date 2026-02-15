import React, { useState, useEffect } from 'react';
import { Share } from '@capacitor/share';
import { keepAwake } from '../utils/sound';
import { sendNotification, requestNotificationPermission } from '../utils/notifications';
import { LogEntry, ScheduleConfig, UserGoal, AppTheme } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  currentDurationMs: number;
  currentTheme: AppTheme;
  logs: LogEntry[];
  schedule?: ScheduleConfig;
  breakUntil: number | null;
  onSave: (minutes: number) => void;
  onSaveSchedule?: (schedule: ScheduleConfig) => void;
  onSaveTheme: (theme: AppTheme) => void;
  onTakeBreak: (durationMs: number | null) => void;
  onLoadDemoData?: () => void;
  onOpenPersona: () => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentDurationMs,
  currentTheme,
  schedule,
  breakUntil,
  onSave,
  onSaveSchedule,
  onSaveTheme,
  onTakeBreak,
  onLoadDemoData,
  onOpenPersona,
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
    } catch (e) { }
  };

  const handleRate = () => {
    window.open('https://play.google.com/store/apps/details?id=com.quarterlog.app', '_system');
  };

  if (!isOpen) return null;

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  // Theme helpers
  const isDark = currentTheme === 'dark';
  const bgColor = isDark ? 'bg-black/95' : 'bg-zinc-200/95';
  const cardBg = isDark ? 'bg-white/5 border-white/5' : 'bg-zinc-50 border-zinc-200 shadow-sm';
  const textColor = isDark ? 'text-white' : 'text-zinc-800';
  const subTextColor = isDark ? 'text-white/40' : 'text-zinc-500';
  const labelColor = isDark ? 'text-white/30' : 'text-zinc-400';
  const inputBg = isDark ? 'bg-black/40 border-white/10 text-white' : 'bg-zinc-100 border-zinc-200 text-zinc-900';
  const dividerColor = isDark ? 'bg-white/5' : 'bg-zinc-200';
  const footerBg = isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-zinc-100 border-zinc-200';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${bgColor} backdrop-blur-xl transition-colors duration-500`}>
      <div className="w-full max-w-md h-full flex flex-col p-6 overflow-y-auto no-scrollbar">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className={`text-3xl font-black uppercase tracking-tighter ${textColor} transition-colors`}>Settings</h2>
            <p className={`text-xs font-mono uppercase tracking-[0.2em] mt-1 ${subTextColor}`}>Configuration Protocol</p>
          </div>
          <button onClick={onClose} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10' : 'bg-zinc-50 text-zinc-400 hover:text-zinc-900 border border-zinc-200 shadow-sm'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Duration Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <span className={`font-black uppercase text-sm tracking-[0.2em] border-l-4 border-green-500 pl-4 ${textColor}`}>Cycle Duration</span>
            <span className={`font-mono text-xs ${isDark ? 'text-green-400' : 'text-green-600'}`}>{duration} min</span>
          </div>

          <div className={`rounded-3xl p-6 ${cardBg} transition-all`}>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full accent-green-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
            />
            <div className={`flex justify-between mt-2 text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-white/20' : 'text-zinc-400'}`}>
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
              <span className={`font-black uppercase text-sm tracking-[0.2em] border-l-4 border-green-500 pl-4 ${textColor}`}>Active Duty</span>
              <button
                onClick={() => setLocalSchedule(p => ({ ...p, enabled: !p.enabled }))}
                className={`w-12 h-6 rounded-full transition-colors relative ${localSchedule.enabled ? 'bg-green-500' : 'bg-zinc-800'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-black transition-all ${localSchedule.enabled ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className={`rounded-3xl p-6 space-y-6 transition-all ${cardBg} ${localSchedule.enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>

              {/* Days */}
              <div>
                <label className={`text-xs uppercase font-black block mb-3 tracking-[0.2em] ${labelColor}`}>Battlegrounds</label>
                <div className="flex justify-between gap-1.5">
                  {days.map((day, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleDay(idx)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all duration-300 ${localSchedule.daysOfWeek.includes(idx)
                        ? 'bg-green-500 text-black shadow-lg shadow-green-500/20 scale-110'
                        : isDark ? 'bg-white/5 text-white/20 hover:bg-white/10' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
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
                  <label className={`text-xs uppercase font-black block mb-2 tracking-[0.2em] ${labelColor}`}>Start Ops</label>
                  <input
                    type="time"
                    value={localSchedule.startTime}
                    onChange={(e) => setLocalSchedule(p => ({ ...p, startTime: e.target.value }))}
                    className={`w-full font-black text-sm rounded-xl px-4 py-4 border outline-none focus:border-green-500/50 transition-all text-center ${inputBg}`}
                  />
                </div>
                <div className="flex-1">
                  <label className={`text-xs uppercase font-black block mb-2 tracking-[0.2em] ${labelColor}`}>End Ops</label>
                  <input
                    type="time"
                    value={localSchedule.endTime}
                    onChange={(e) => setLocalSchedule(p => ({ ...p, endTime: e.target.value }))}
                    className={`w-full font-black text-sm rounded-xl px-4 py-4 border outline-none focus:border-green-500/50 transition-all text-center ${inputBg}`}
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Visual Theme */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className={`font-black uppercase text-sm tracking-[0.2em] border-l-4 border-green-500 pl-4 ${textColor}`}>Interface Theme</span>
          </div>
          <div className={`border rounded-2xl p-2 flex relative ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-zinc-100 border-zinc-200'}`}>
            <button
              onClick={() => onSaveTheme('light')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all z-10 ${currentTheme === 'light' ? 'text-black' : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Day Ops
            </button>
            <button
              onClick={() => onSaveTheme('dark')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all z-10 ${currentTheme === 'dark' ? 'text-white' : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Night Ops
            </button>
            <div className={`absolute top-2 bottom-2 w-[calc(50%-8px)] bg-green-500 rounded-xl transition-all duration-300 ${currentTheme === 'light' ? 'left-2' : 'left-[calc(50%+4px)]'}`} />
          </div>
          <p className={`text-[10px] font-mono mt-3 uppercase tracking-wider text-center ${subTextColor}`}>
            {currentTheme === 'light' ? 'High Visibility Mode (White/Black)' : 'Stealth Mode (Black/White)'}
          </p>
        </div>

        {/* Tactical Persona */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className={`font-black uppercase text-sm tracking-[0.2em] border-l-4 border-green-500 pl-4 ${textColor}`}>Tactical Coach</span>
          </div>
          <button
            onClick={onOpenPersona}
            className={`w-full p-5 rounded-3xl border flex items-center justify-between group transition-all ${isDark ? 'bg-zinc-900 hover:bg-zinc-800 border-white/5' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 shadow-sm'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`}>
                🤖
              </div>
              <div className="text-left">
                <span className={`block font-black uppercase text-sm tracking-wide ${textColor}`}>Select Personality</span>
                <span className={`block text-[10px] font-mono mt-1 uppercase tracking-wider ${subTextColor}`}>Current: Active</span>
              </div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-white/5 text-zinc-500' : 'bg-zinc-100 text-zinc-400'} group-hover:bg-green-500 group-hover:text-black`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </button>
        </div>

        {/* Stand Down Protocol (Timed Breaks) */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <span className={`font-black uppercase text-sm tracking-[0.2em] border-l-4 border-green-500 pl-4 ${textColor}`}>Stand Down</span>
          </div>

          {breakUntil && breakUntil > Date.now() ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-6 text-center space-y-4">
              <p className="text-green-500 font-black uppercase tracking-[0.2em] text-xs">Operations Paused Until</p>
              <p className={`text-2xl font-black ${textColor}`}>{new Date(breakUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              <button
                onClick={() => onTakeBreak(null)}
                className="w-full py-3 bg-green-500 text-black font-black uppercase tracking-[0.2em] rounded-xl text-xs active:scale-95 transition-transform"
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
                  className={`py-4 border rounded-2xl text-xs font-black uppercase transition-all active:scale-95 ${isDark ? 'bg-zinc-900 border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 text-white/60 hover:text-white' : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-500 hover:text-zinc-900'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={`h-px my-10 ${dividerColor}`}></div>

        {/* Tactical Actions */}
        <div className="space-y-4">

          <button
            onClick={() => setShowTroubleshoot(!showTroubleshoot)}
            className={`w-full text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 py-4 transition-colors ${isDark ? 'text-white/20 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
          >
            {showTroubleshoot ? 'HIDE SYSTEM LOGS' : 'SYSTEM TROUBLESHOOTING'}
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={`transition - transform ${showTroubleshoot ? 'rotate-180' : ''} `}><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>

          {showTroubleshoot && (
            <div className={`rounded-2xl p-6 text-sm space-y-4 border animate-fade-in ${isDark ? 'bg-black/60 text-white/40 border-white/5' : 'bg-zinc-100/50 text-zinc-600 border-zinc-200'}`}>
              <div>
                <strong className={`block mb-1 font-black uppercase tracking-widest text-xs ${textColor}`}>1. COMMS CHANNEL</strong>
                <p className="mb-3">Ensure tactical notifications are authorized.</p>
                <button onClick={checkPermissions} className={`text-xs px-4 py-2 rounded-lg font-black uppercase tracking-widest transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900'}`}>
                  RE-AUTHORIZE
                </button>
              </div>
              <div>
                <strong className={`block mb-1 font-black uppercase tracking-widest text-xs ${textColor}`}>2. POWER MANAGEMENT</strong>
                <p>Disable <span className="text-green-500">Battery Optimization</span> to prevent cycle drift.</p>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className={`h-px my-10 ${dividerColor}`}></div>

        {/* Social Section */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleShare}
            className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-95 group border ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/5' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors group-hover:text-green-500 ${isDark ? 'text-white/20' : 'text-zinc-400'}`}><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            <span className={`text-xs font-black uppercase tracking-[0.2em] transition-colors ${isDark ? 'text-white/20 group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`}>Invite Friends</span>
          </button>
          <button
            onClick={handleRate}
            className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-95 group border ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/5' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors group-hover:text-green-500 ${isDark ? 'text-white/20' : 'text-zinc-400'}`}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <span className={`text-xs font-black uppercase tracking-[0.2em] transition-colors ${isDark ? 'text-white/20 group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`}>Review</span>
          </button>
        </div>

      </div>


      <div className={`p-8 pt-6 border-t z-10 ${footerBg}`}>
        <div className="max-w-xl mx-auto w-full">
          {onLoadDemoData && (
            <button
              onClick={onLoadDemoData}
              className={`w-full text-center text-[10px] uppercase tracking-widest transition-colors mb-2 ${isDark ? 'text-white/5 hover:text-white/20' : 'text-zinc-300 hover:text-zinc-500'}`}
            >
                        // Load Simulation Data //
            </button>
          )}
          <button
            type="button"
            onClick={handleSaveAndClose}
            className={`w-full py-5 rounded-xl font-black uppercase transition-colors tracking-[0.3em] text-sm ${isDark ? 'text-white/20 hover:text-white' : 'text-zinc-400 hover:text-zinc-900'}`}
          >
            CLOSE COMMAND
          </button>
        </div>
      </div>
    </div >
  );
};

export default SettingsModal;