import React, { useState, useEffect } from 'react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
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

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, currentDurationMs, logs, onSave, onClose }) => {
  const [minutes, setMinutes] = useState(15);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMinutes(Math.floor(currentDurationMs / 60000));
      // Reset dates when opening
      setStartDate('');
      setEndDate('');
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
    playNotificationSound();
    try {
        await sendNotification("Test Alert", "This is your timer notification.", true);
    } catch (e) {
        alert("Failed to send test notification: " + e);
    }
  };

  const handleExport = async () => {
    // 1. Filter Logs
    const startMs = startDate ? new Date(startDate).getTime() : 0;
    // End date should include the whole day, so add 24h - 1ms
    const endMs = endDate ? new Date(endDate).getTime() + (24 * 60 * 60 * 1000) - 1 : Date.now();
    
    const filteredLogs = logs
      .filter(l => l.timestamp >= startMs && l.timestamp <= endMs)
      .sort((a, b) => a.timestamp - b.timestamp);

    if (filteredLogs.length === 0) {
      alert("No logs found for the selected range.");
      return;
    }

    // 2. Format Text
    let textToExport = "QuarterLog Export\n=================\n\n";
    let currentDate = "";

    filteredLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString(undefined, { 
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
      });
      const timeStr = new Date(log.timestamp).toLocaleTimeString(undefined, { 
        hour: '2-digit', minute: '2-digit' 
      });

      if (dateStr !== currentDate) {
        textToExport += `\n[ ${dateStr} ]\n`;
        currentDate = dateStr;
      }
      textToExport += `${timeStr} - ${log.text}\n`;
    });

    const fileName = `quarterlog_export_${startDate || 'start'}_to_${endDate || 'end'}.txt`;

    // 3. Save/Share
    if (Capacitor.isNativePlatform()) {
      try {
        // Write file to cache
        await Filesystem.writeFile({
          path: fileName,
          data: textToExport,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        // Get URI
        const uriResult = await Filesystem.getUri({
          directory: Directory.Cache,
          path: fileName,
        });

        // Share
        await Share.share({
          title: 'Export Logs',
          text: `Logs from ${startDate || 'beginning'} to ${endDate || 'now'}`,
          url: uriResult.uri,
          dialogTitle: 'Save Logs To...',
        });
      } catch (e) {
        console.error("Export failed", e);
        alert("Export failed: " + (e as any).message);
      }
    } else {
      // Web Fallback
      const blob = new Blob([textToExport], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl shadow-2xl p-6 transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Timer Settings</h2>
        
        <form onSubmit={handleSubmit}>
          {/* Duration Section */}
          <div className="mb-6 border-b border-slate-700/50 pb-6">
            <label htmlFor="duration" className="block text-sm font-medium text-slate-400 mb-2">
              Interval (minutes)
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

          {/* Export Section */}
          <div className="mb-6 border-b border-slate-700/50 pb-6">
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Export History
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">From</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 text-white text-sm rounded-lg border border-slate-600 p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">To</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-800 text-white text-sm rounded-lg border border-slate-600 p-2 focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={handleExport}
                className="w-full py-2 px-3 rounded-lg text-sm font-semibold bg-slate-700 text-white hover:bg-slate-600 transition-colors mt-1"
              >
                Download .txt
              </button>
            </div>
          </div>

          {/* Test Section */}
          <div className="mb-6">
             <button
              type="button"
              onClick={handleTestAlert}
              disabled={countdown !== null}
              className={`w-full py-2 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                countdown !== null 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-amber-400 bg-amber-900/20 border border-amber-900/50 hover:bg-amber-900/40'
              }`}
            >
              {countdown !== null ? (
                <span className="text-sm font-bold animate-pulse">Wait... {countdown}s</span>
              ) : (
                <span className="text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  Test Notification (5s)
                </span>
              )}
            </button>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-xl font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Close
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