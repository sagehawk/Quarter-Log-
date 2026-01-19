import React, { useState, useEffect } from 'react';
import { playNotificationSound } from '../utils/sound';
import { sendNotification } from '../utils/notifications';

interface SettingsModalProps {
  isOpen: boolean;
  currentDurationMs: number;
  onSave: (minutes: number) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, currentDurationMs, onSave, onClose }) => {
  const [minutes, setMinutes] = useState(15);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMinutes(Math.floor(currentDurationMs / 60000));
    }
  }, [isOpen, currentDurationMs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (minutes > 0) {
      onSave(minutes);
    }
  };
  
  const handleTestAlert = () => {
    if (countdown !== null) return;

    setCountdown(5);
    
    // Start countdown
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

  const triggerTest = () => {
    // 1. Play Audio
    playNotificationSound();
    
    // 2. Send Notification
    // We use a random tag here for testing to ensure it doesn't get grouped silently by the OS
    // preventing the user from seeing it during a test.
    sendNotification("Test Alert", "This is your timer notification.", true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl shadow-2xl p-6 transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Timer Settings</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="duration" className="block text-sm font-medium text-slate-400 mb-2">
              Duration (minutes)
            </label>
            <div className="relative">
              <input
                id="duration"
                type="number"
                min="1"
                max="120"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 text-white text-center text-2xl font-bold rounded-xl border border-slate-600 p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div className="mb-6 bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
             <h3 className="text-xs font-bold text-slate-300 uppercase mb-2">How to test</h3>
             <ul className="text-xs text-slate-400 space-y-2 list-disc pl-4">
               <li>Tap 'Start 5s Delay'.</li>
               <li><strong>Immediately lock your screen</strong> or exit the app.</li>
               <li>Wait for the vibration and notification.</li>
             </ul>
          </div>

          <div className="mb-6">
            <button
              type="button"
              onClick={handleTestAlert}
              disabled={countdown !== null}
              className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                countdown !== null 
                  ? 'bg-blue-600 text-white shadow-lg scale-105' 
                  : 'text-amber-400 bg-amber-900/20 border border-amber-900/50 hover:bg-amber-900/40'
              }`}
            >
              {countdown !== null ? (
                <span className="text-lg font-bold animate-pulse">Wait... {countdown}</span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path><path d="M4 22h16"></path><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path></svg>
                  Start 5s Delay Test
                </>
              )}
            </button>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-xl font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;