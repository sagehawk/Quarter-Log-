
import React, { useState, useEffect } from 'react';
import { Share } from '@capacitor/share';
import { keepAwake } from '../utils/sound';
import { sendNotification, requestNotificationPermission } from '../utils/notifications';
import { LogEntry, ScheduleConfig, UserGoal, AIPersona } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  currentDurationMs: number;
  logs: LogEntry[];
  schedule?: ScheduleConfig; 
  onSave: (minutes: number) => void;
  onSaveSchedule?: (schedule: ScheduleConfig) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  schedule, 
  onSaveSchedule, 
  onClose 
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);
  const [localSchedule, setLocalSchedule] = useState<ScheduleConfig>(schedule || {
    enabled: true,
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5]
  });

  useEffect(() => {
    if (isOpen) {
        if (schedule) {
            setLocalSchedule({ ...schedule, enabled: true });
        }
    }
  }, [isOpen, schedule]);

  const handleTestAlert = () => {
    if (countdown !== null) return;
    keepAwake(6); 
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          triggerTest();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const triggerTest = async () => {
    try {
        await sendNotification("Cycle Alert", "Declare your status: WIN or LOSS.", true);
    } catch (e) {
        alert("Failed to send test: " + e);
    }
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
    if (onSaveSchedule) {
      onSaveSchedule({ ...localSchedule, enabled: true });
    }
    onClose();
  };

  const handleShare = async () => {
      try {
          await Share.share({
              title: 'IronLog: Momentum is Everything',
              text: 'Stacking wins and building momentum. Join the leaderboard:',
              url: 'https://play.google.com/store/apps/details?id=com.quarterlog.app',
              dialogTitle: 'Share IronLog',
          });
      } catch (e) {}
  };

  const handleRate = () => {
      window.open('https://play.google.com/store/apps/details?id=com.quarterlog.app', '_system');
  };

  if (!isOpen) return null;

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in"
        onClick={handleSaveAndClose}
      />
      <div className="relative bg-[#0a0a0a] border border-white/10 w-full max-w-sm rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,1)] p-8 transform transition-all animate-slide-up max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="text-center mb-10">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">Tactical Configuration</h2>
            <p className="text-yellow-500/40 text-[9px] font-black uppercase tracking-[0.3em] mt-2 italic">Refine your operational edge</p>
        </div>
        
        {/* Schedule Section */}
        {onSaveSchedule && (
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <span className="text-white font-black uppercase text-xs tracking-[0.2em] italic border-l-2 border-yellow-500 pl-3">Cycle Window</span>
          </div>

          <div className="bg-white/5 rounded-3xl p-6 space-y-6 border border-white/5 shadow-inner">
            
            {/* Days */}
            <div>
              <label className="text-[9px] uppercase font-black text-white/30 block mb-3 tracking-[0.2em] italic">Active Battlegrounds</label>
              <div className="flex justify-between gap-1.5">
                {days.map((day, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleDay(idx)}
                    className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all duration-300 ${
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
                  <label className="text-[9px] uppercase font-black text-white/30 block mb-2 tracking-[0.2em] italic">Start Ops</label>
                  <input 
                    type="time" 
                    value={localSchedule.startTime}
                    onChange={(e) => setLocalSchedule(p => ({ ...p, startTime: e.target.value }))}
                    className="w-full bg-black/40 text-white font-black text-xs rounded-xl px-4 py-4 border border-white/10 outline-none focus:border-yellow-500/50 transition-all"
                  />
               </div>
               <div className="flex-1">
                  <label className="text-[9px] uppercase font-black text-white/30 block mb-2 tracking-[0.2em] italic">End Ops</label>
                  <input 
                    type="time" 
                    value={localSchedule.endTime}
                    onChange={(e) => setLocalSchedule(p => ({ ...p, endTime: e.target.value }))}
                    className="w-full bg-black/40 text-white font-black text-xs rounded-xl px-4 py-4 border border-white/10 outline-none focus:border-yellow-500/50 transition-all"
                  />
               </div>
            </div>

          </div>
          <p className="text-[9px] text-white/20 mt-4 text-center font-black uppercase tracking-[0.1em] italic">
            Cycle auto-restarts within these parameters.
          </p>
        </div>
        )}

        {/* Divider */}
        <div className="h-px bg-white/5 my-10"></div>

        {/* Tactical Actions */}
        <div className="space-y-4">
            
            <button
              type="button"
              onClick={handleTestAlert}
              disabled={countdown !== null}
              className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 italic border ${
                countdown !== null 
                  ? 'bg-yellow-500 text-black border-yellow-400' 
                  : 'text-yellow-500 bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10'
              }`}
            >
              {countdown !== null ? (
                <span className="text-xs animate-pulse">DEPLOYING IN {countdown}S</span>
              ) : (
                <span className="text-xs flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  TEST CYCLE ALERT
                </span>
              )}
            </button>

            <button 
                onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                className="w-full text-[9px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white flex items-center justify-center gap-2 py-3 transition-colors italic"
            >
                {showTroubleshoot ? 'HIDE SYSTEM LOGS' : 'SYSTEM TROUBLESHOOTING'}
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showTroubleshoot ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            {showTroubleshoot && (
                <div className="bg-black/60 rounded-2xl p-6 text-[10px] text-white/40 space-y-4 border border-white/5 animate-fade-in italic">
                    <div>
                        <strong className="text-white block mb-1 font-black uppercase tracking-widest italic">1. COMMS CHANNEL</strong>
                        <p className="mb-3">Ensure tactical notifications are authorized.</p>
                        <button onClick={checkPermissions} className="text-[9px] bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-white font-black uppercase tracking-widest italic transition-colors">
                            RE-AUTHORIZE
                        </button>
                    </div>
                    <div>
                        <strong className="text-white block mb-1 font-black uppercase tracking-widest italic">2. POWER MANAGEMENT</strong>
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
                className="bg-white/5 hover:bg-white/10 p-5 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-95 group border border-white/5"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-yellow-500 transition-colors"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                <span className="text-[9px] font-black uppercase text-white/20 group-hover:text-white tracking-[0.2em] italic transition-colors">Deploy Invite</span>
            </button>
             <button 
                onClick={handleRate}
                className="bg-white/5 hover:bg-white/10 p-5 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-95 group border border-white/5"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-white/20 group-hover:text-yellow-500 transition-colors"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <span className="text-[9px] font-black uppercase text-white/20 group-hover:text-white tracking-[0.2em] italic transition-colors">Combat Report</span>
            </button>
        </div>

        <div className="mt-10 pt-6 border-t border-white/5">
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="w-full py-4 rounded-xl font-black uppercase text-white/20 hover:text-white transition-colors tracking-[0.3em] text-[10px] italic"
            >
              CLOSE COMMAND
            </button>
        </div>
      </div>
    </div>
  );
};

        <div className="h-0.5 bg-slate-800 my-6"></div>

        {/* Schedule Section */}
        {onSaveSchedule && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-200 font-extrabold uppercase text-sm tracking-wide">Schedule</span>
          </div>

          <div className="transition-all duration-300 opacity-100 max-h-96">
             <div className="bg-black/30 rounded-2xl p-4 space-y-4 border border-white/5">
                
                {/* Days */}
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-500 block mb-2 tracking-wider">Active Days</label>
                  <div className="flex justify-between gap-1">
                    {days.map((day, idx) => (
                      <button
                        key={idx}
                        onClick={() => toggleDay(idx)}
                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                          localSchedule.daysOfWeek.includes(idx)
                            ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50 scale-105'
                            : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Times */}
                <div className="flex gap-3">
                   <div className="flex-1">
                      <label className="text-[10px] uppercase font-black text-slate-500 block mb-1 tracking-wider">Start Time</label>
                      <input 
                        type="time" 
                        value={localSchedule.startTime}
                        onChange={(e) => setLocalSchedule(p => ({ ...p, startTime: e.target.value }))}
                        className="w-full bg-slate-800 text-white font-bold text-sm rounded-xl px-3 py-3 border border-white/10 outline-none focus:border-brand-500"
                      />
                   </div>
                   <div className="flex-1">
                      <label className="text-[10px] uppercase font-black text-slate-500 block mb-1 tracking-wider">End Time</label>
                      <input 
                        type="time" 
                        value={localSchedule.endTime}
                        onChange={(e) => setLocalSchedule(p => ({ ...p, endTime: e.target.value }))}
                        className="w-full bg-slate-800 text-white font-bold text-sm rounded-xl px-3 py-3 border border-white/10 outline-none focus:border-brand-500"
                      />
                   </div>
                </div>

             </div>
             <p className="text-[10px] text-slate-500 mt-3 text-center font-bold uppercase tracking-wide">
               Timer only auto-restarts within these hours.
             </p>
          </div>
        </div>
        )}

        {/* Divider */}
        <div className="h-0.5 bg-slate-800 my-6"></div>

        {/* Test & Troubleshoot Section */}
        <div className="space-y-4">
            
            {/* Test Button */}
            <button
              type="button"
              onClick={handleTestAlert}
              disabled={countdown !== null}
              className={`w-full py-4 px-4 rounded-xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                countdown !== null 
                  ? 'bg-brand-600 text-white shadow-lg' 
                  : 'text-amber-400 bg-amber-500/10 border-2 border-amber-500/20 hover:bg-amber-500/20'
              }`}
            >
              {countdown !== null ? (
                <span className="text-sm animate-pulse">Wait... {countdown}s</span>
              ) : (
                <span className="text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  Test Notification
                </span>
              )}
            </button>

            {/* Troubleshoot Toggle */}
            <button 
                onClick={() => setShowTroubleshoot(!showTroubleshoot)}
                className="w-full text-xs font-bold uppercase tracking-wide text-slate-500 hover:text-white flex items-center justify-center gap-1.5 py-2"
            >
                {showTroubleshoot ? 'Hide Help' : 'Troubleshooting & Permissions'}
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showTroubleshoot ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>

            {/* Expanded Guide */}
            {showTroubleshoot && (
                <div className="bg-slate-800/50 rounded-xl p-4 text-xs text-slate-300 space-y-4 border border-white/5 animate-fade-in font-medium">
                    <div>
                        <strong className="text-white block mb-1 font-bold uppercase">1. Notifications</strong>
                        <p className="mb-2">Ensure notifications are allowed.</p>
                        <button onClick={checkPermissions} className="text-[10px] bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-white font-bold uppercase">
                            Check Permission
                        </button>
                    </div>
                    <div>
                        <strong className="text-white block mb-1 font-bold uppercase">2. Run in Background</strong>
                        <p>Disable <span className="text-amber-300 font-bold">Battery Optimization</span>.</p>
                    </div>
                </div>
            )}
        </div>
        
        {/* Divider */}
        <div className="h-0.5 bg-slate-800 my-6"></div>

        {/* Share & Rate Section */}
        <div className="grid grid-cols-2 gap-3 mb-2">
            <button 
                onClick={handleShare}
                className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 group"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-white"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white tracking-widest">Share App</span>
            </button>
             <button 
                onClick={handleRate}
                className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-95 group"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-amber-400"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white tracking-widest">Rate Us</span>
            </button>
        </div>

        <div className="mt-6 pt-4 border-t-2 border-slate-800">
            <button
              type="button"
              onClick={handleSaveAndClose}
              className="w-full py-4 px-4 rounded-xl font-black uppercase text-slate-400 hover:bg-white/5 hover:text-white transition-colors tracking-widest"
            >
              Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
