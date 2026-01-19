import React, { useState } from 'react';
import { playNotificationSound, keepAwake } from '../utils/sound';
import { sendNotification } from '../utils/notifications';
import { LogEntry } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  currentDurationMs: number;
  logs: LogEntry[];
  onSave: (minutes: number) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleTestAlert = () => {
    if (countdown !== null) return;
    keepAwake(6); // Keep awake for slightly longer than the 5s countdown
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
    // Play sound and send notification in parallel to minimize delay
    playNotificationSound();
    try {
        await sendNotification("Test Alert", "This is your timer notification. Tap 'Log Activity' to save an entry!", true);
    } catch (e) {
        alert("Failed to send test notification: " + e);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      <div className="relative bg-slate-900/90 backdrop-blur-xl border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl p-6 transform transition-all animate-slide-up max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-6 text-center">Settings</h2>
        
        {/* Test Section */}
        <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/5">
            <button
            type="button"
            onClick={handleTestAlert}
            disabled={countdown !== null}
            className={`w-full py-3 px-4 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
              countdown !== null 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20'
            }`}
          >
            {countdown !== null ? (
              <span className="text-sm font-bold animate-pulse">Wait... {countdown}s</span>
            ) : (
              <span className="text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                Test Notification
              </span>
            )}
          </button>
          <p className="text-xs text-slate-500 text-center mt-3 leading-relaxed">
            Triggers a test alarm in 5 seconds. Tap "Log Activity" in the notification to test inline logging.
          </p>
        </div>
        
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-xl font-semibold text-slate-300 hover:bg-white/5 hover:text-white transition-colors border border-white/5"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;