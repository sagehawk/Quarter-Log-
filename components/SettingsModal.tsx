import React, { useState, useEffect } from 'react';
import { Share } from '@capacitor/share';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { requestNotificationPermission } from '../utils/notifications';
import { AppTheme, NotificationConfig } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  currentTheme: AppTheme;
  notifConfig: NotificationConfig;
  onSaveTheme: (theme: AppTheme) => void;
  onSaveNotifConfig: (config: NotificationConfig) => void;
  onOpenPersona: () => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentTheme,
  notifConfig,
  onSaveTheme,
  onSaveNotifConfig,
  onOpenPersona,
  onClose,
}) => {
  const [localNotifConfig, setLocalNotifConfig] = useState<NotificationConfig>(notifConfig);

  useEffect(() => {
    if (isOpen) {
      setLocalNotifConfig(notifConfig);
    }
  }, [isOpen, notifConfig]);

  if (!isOpen) return null;

  const isDark = currentTheme === 'dark';
  const bgColor = isDark ? 'bg-black/95' : 'bg-zinc-100/95';
  const cardBg = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm';
  const textColor = isDark ? 'text-white' : 'text-zinc-900';
  const subTextColor = isDark ? 'text-zinc-500' : 'text-zinc-400';
  const labelColor = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const inputBg = isDark ? 'bg-zinc-800 border-zinc-700 text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-900';
  const dividerColor = isDark ? 'bg-zinc-800' : 'bg-zinc-200';

  const handleSaveAndClose = () => {
    onSaveNotifConfig(localNotifConfig);
    onClose();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: 'Battle Plan App',
        text: 'I use Battle Plan to win every day. Join me:',
        url: 'https://play.google.com/store/apps/details?id=com.quarterlog.app',
        dialogTitle: 'Share Battle Plan',
      });
    } catch (e) { }
  };

  const handleRate = () => {
    window.open('https://play.google.com/store/apps/details?id=com.quarterlog.app', '_system');
  };

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${bgColor} backdrop-blur-xl transition-colors duration-500`}>
      <div className="w-full max-w-md flex-1 flex flex-col p-6 overflow-y-auto no-scrollbar">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className={`text-3xl font-black uppercase tracking-tighter ${textColor}`}>Settings</h2>
          </div>
          <button onClick={onClose} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800' : 'bg-white text-zinc-400 hover:text-zinc-900 border border-zinc-200 shadow-sm'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* Notifications */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className={`font-black uppercase text-sm tracking-[0.2em] border-l-4 border-green-500 pl-4 ${textColor}`}>Notifications</span>
            <button
              onClick={() => setLocalNotifConfig(p => ({ ...p, enabled: !p.enabled }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${localNotifConfig.enabled ? 'bg-green-500' : isDark ? 'bg-zinc-800' : 'bg-zinc-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full transition-all ${localNotifConfig.enabled ? 'left-7 bg-white' : 'left-1 bg-zinc-500'}`} />
            </button>
          </div>

          <div className={`rounded-2xl p-5 space-y-4 border transition-all ${cardBg} ${localNotifConfig.enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className={`text-xs uppercase font-black block mb-2 tracking-[0.2em] ${labelColor}`}>Morning</label>
                <input
                  type="time"
                  value={localNotifConfig.morningTime}
                  onChange={e => setLocalNotifConfig(p => ({ ...p, morningTime: e.target.value }))}
                  className={`w-full font-bold text-sm rounded-xl px-4 py-3 border outline-none focus:border-green-500 transition-all text-center ${inputBg}`}
                />
              </div>
              <div className="flex-1">
                <label className={`text-xs uppercase font-black block mb-2 tracking-[0.2em] ${labelColor}`}>Evening</label>
                <input
                  type="time"
                  value={localNotifConfig.eveningTime}
                  onChange={e => setLocalNotifConfig(p => ({ ...p, eveningTime: e.target.value }))}
                  className={`w-full font-bold text-sm rounded-xl px-4 py-3 border outline-none focus:border-green-500 transition-all text-center ${inputBg}`}
                />
              </div>
            </div>
            <p className={`text-[10px] ${subTextColor}`}>
              Morning: reminder to set your battle plan. Evening: check your results.
            </p>
          </div>
        </div>

        {/* Theme */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className={`font-black uppercase text-sm tracking-[0.2em] border-l-4 border-green-500 pl-4 ${textColor}`}>Theme</span>
          </div>
          <div className={`border rounded-2xl p-2 flex relative ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
            <button
              onClick={() => onSaveTheme('light')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all z-10 ${currentTheme === 'light' ? 'text-white' : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Light
            </button>
            <button
              onClick={() => onSaveTheme('dark')}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all z-10 ${currentTheme === 'dark' ? 'text-white' : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Dark
            </button>
            <div className={`absolute top-2 bottom-2 w-[calc(50%-8px)] bg-green-500 rounded-xl transition-all duration-300 ${currentTheme === 'light' ? 'left-2' : 'left-[calc(50%+4px)]'}`} />
          </div>
        </div>

        {/* AI Persona */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <span className={`font-black uppercase text-sm tracking-[0.2em] border-l-4 border-green-500 pl-4 ${textColor}`}>AI Coach</span>
          </div>
          <button
            onClick={onOpenPersona}
            className={`w-full p-5 rounded-2xl border flex items-center justify-between group transition-all ${isDark ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800' : 'bg-white hover:bg-zinc-50 border-zinc-200 shadow-sm'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                🤖
              </div>
              <div className="text-left">
                <span className={`block font-black uppercase text-sm tracking-wide ${textColor}`}>Select Personality</span>
                <span className={`block text-[10px] font-mono mt-1 uppercase tracking-wider ${subTextColor}`}>Change your AI coach's style</span>
              </div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-100 text-zinc-400'} group-hover:bg-green-500 group-hover:text-white`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className={`h-px my-6 ${dividerColor}`}></div>

        {/* Social */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleShare}
            className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-95 group border ${isDark ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800' : 'bg-white hover:bg-zinc-50 border-zinc-200'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors group-hover:text-green-500 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            <span className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-600 group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-700'}`}>Share</span>
          </button>
          <button
            onClick={handleRate}
            className={`p-6 rounded-2xl flex flex-col items-center gap-3 transition-all active:scale-95 group border ${isDark ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800' : 'bg-white hover:bg-zinc-50 border-zinc-200'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-colors group-hover:text-green-500 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
            <span className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-600 group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-700'}`}>Review</span>
          </button>
        </div>

      </div>

      <div className={`w-full p-8 pt-6 border-t z-10 ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'}`}>
        <div className="max-w-xl mx-auto w-full">
          <button
            type="button"
            onClick={handleSaveAndClose}
            className={`w-full py-5 rounded-xl font-black uppercase transition-colors tracking-[0.3em] text-sm ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-700'}`}
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;