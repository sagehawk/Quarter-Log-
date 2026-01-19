import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';
import TimerCircle from './components/TimerCircle';
import LogList from './components/LogList';
import EntryModal from './components/EntryModal';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';
import { LogEntry, AppStatus, DEFAULT_INTERVAL_MS } from './types';
import { requestNotificationPermission, scheduleNotification, cancelNotification, registerNotificationActions } from './utils/notifications';
import { playNotificationSound } from './utils/sound';

const STORAGE_KEY_LOGS = 'quarterlog_entries';
const STORAGE_KEY_DURATION = 'quarterlog_duration';

type FilterType = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

const WORKER_CODE = `
let intervalId = null;
self.onmessage = function(e) {
  const { command } = e.data;
  if (command === 'start') {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
      self.postMessage({ type: 'tick' });
    }, 1000);
  } else if (command === 'stop') {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
};
`;

const App: React.FC = () => {
  // State
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [duration, setDuration] = useState(DEFAULT_INTERVAL_MS);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_INTERVAL_MS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [toast, setToast] = useState<{title: string, message: string, visible: boolean}>({ title: '', message: '', visible: false });
  const [hasPermission, setHasPermission] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  // Filter State
  const [filter, setFilter] = useState<FilterType>('today');
  const [customRange, setCustomRange] = useState({ start: '', end: '' });

  // Refs
  const endTimeRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const wasOpenedFromNotification = useRef(false);

  // Load initial data
  useEffect(() => {
    // Initialize Status Bar for full screen experience
    if (Capacitor.isNativePlatform()) {
      StatusBar.setOverlaysWebView({ overlay: true }).catch(err => console.log('StatusBar overlay error', err));
      StatusBar.hide().catch(err => console.log('StatusBar hide error', err));
    }

    const storedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
    if (storedLogs) {
      try { setLogs(JSON.parse(storedLogs)); } catch (e) { console.error(e); }
    }

    const storedDuration = localStorage.getItem(STORAGE_KEY_DURATION);
    if (storedDuration) {
      try {
        const parsed = parseInt(storedDuration, 10);
        if (!isNaN(parsed) && parsed > 0) {
          setDuration(parsed);
          setTimeLeft(parsed); 
        }
      } catch (e) { console.error(e); }
    }
    
    requestNotificationPermission().then(setHasPermission);
    registerNotificationActions();

    try {
      const blob = new Blob([WORKER_CODE], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);
      workerRef.current.onmessage = (e) => {
        if (e.data.type === 'tick') triggerTick();
      };
      return () => {
        workerRef.current?.terminate();
        URL.revokeObjectURL(workerUrl);
      };
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }, [logs]);

  const handleTimerComplete = useCallback((skipSound = false) => {
    workerRef.current?.postMessage({ command: 'stop' });
    setStatus(AppStatus.WAITING_FOR_INPUT);
    
    if (!skipSound) {
        playNotificationSound();
        if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]);
    }
    
    setToast({
      title: "Time's up!",
      message: "Take a moment to log your recent activity.",
      visible: true
    });
    
    setIsManualEntry(false);
    setIsEntryModalOpen(true);
  }, []);

  const tickLogic = useCallback(() => {
    if (!endTimeRef.current || status !== AppStatus.RUNNING) return;
    const now = Date.now();
    const remaining = Math.max(0, endTimeRef.current - now);
    setTimeLeft(remaining);
    if (remaining <= 0) handleTimerComplete();
  }, [handleTimerComplete, status]);

  const tickRef = useRef(tickLogic);
  useEffect(() => { tickRef.current = tickLogic; }, [tickLogic]);
  const triggerTick = () => tickRef.current();

  const startTimer = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestNotificationPermission();
      setHasPermission(granted);
    }
    playNotificationSound();
    setStatus(AppStatus.RUNNING);
    const now = Date.now();
    const targetTime = now + duration;
    endTimeRef.current = targetTime; 
    scheduleNotification("Time's up!", "Log your activity.", duration);
    workerRef.current?.postMessage({ command: 'start' });
    tickLogic(); 
  }, [duration, hasPermission, tickLogic]);

  const pauseTimer = () => {
    cancelNotification();
    workerRef.current?.postMessage({ command: 'stop' });
    setStatus(AppStatus.IDLE);
  };

  const resumeTimer = () => {
    if (timeLeft <= 0) return;
    setStatus(AppStatus.RUNNING);
    const targetTime = Date.now() + timeLeft;
    endTimeRef.current = targetTime;
    scheduleNotification("Time's up!", "Log your activity.", timeLeft);
    workerRef.current?.postMessage({ command: 'start' });
  };

  const resetTimer = () => {
    cancelNotification();
    workerRef.current?.postMessage({ command: 'stop' });
    setStatus(AppStatus.IDLE);
    setTimeLeft(duration);
  };

  const handleDurationSave = (minutes: number) => {
    const newDuration = minutes * 60 * 1000;
    setDuration(newDuration);
    localStorage.setItem(STORAGE_KEY_DURATION, String(newDuration));
    setIsSettingsModalOpen(false);
    if (status === AppStatus.IDLE) setTimeLeft(newDuration);
  };

  const handleDragUpdate = (newDurationMs: number) => {
    setDuration(newDurationMs);
    setTimeLeft(newDurationMs);
    localStorage.setItem(STORAGE_KEY_DURATION, String(newDurationMs));
  };

  // --- Logging Logic ---

  const handleManualLogStart = () => {
    setIsManualEntry(true);
    setIsEntryModalOpen(true);
  };

  const handleLogSave = useCallback(async (text: string) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      text,
    };
    setLogs(prev => [newLog, ...prev]);
    setIsEntryModalOpen(false);
    setToast({
      title: "Entry Saved",
      message: "Your activity has been logged.",
      visible: true
    });
    
    // Automatically restart timer if it wasn't a manual entry (or if triggered via notification)
    if (status === AppStatus.WAITING_FOR_INPUT || status === AppStatus.IDLE) {
       await startTimer();
    }

    if (wasOpenedFromNotification.current) {
      wasOpenedFromNotification.current = false;
      CapacitorApp.exitApp();
    }
  }, [startTimer, status]);

  const handleLogClose = () => {
    setIsEntryModalOpen(false);
    setToast(prev => ({ ...prev, visible: false }));
    if (!isManualEntry) {
      startTimer();
    }
  };

  const deleteLog = (id: string) => {
    if (window.confirm("Delete this entry?")) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  // Handle App State Changes & Notification Interactions
  useEffect(() => {
    const appStateSub = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        if (status === AppStatus.RUNNING && endTimeRef.current) {
          const now = Date.now();
          const remaining = endTimeRef.current - now;
          if (remaining <= 0) {
            handleTimerComplete(true);
          } else {
            setTimeLeft(remaining);
          }
        }
      }
    });

    const notificationSub = LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        // Handle inline input from notification
        if (notification.actionId === 'log_input' && notification.inputValue) {
           handleLogSave(notification.inputValue);
        } 
        // Handle tap on notification body or generic action
        else {
           wasOpenedFromNotification.current = true;
           setIsEntryModalOpen(true);
           setIsManualEntry(false); 
        }
    });

    return () => {
      appStateSub.then(sub => sub.remove());
      notificationSub.then(sub => sub.remove());
    };
  }, [status, handleTimerComplete, handleLogSave]);

  // --- Filtering Logic (Memoized) ---
  const filteredLogs = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    let startTime = 0;
    let endTime = Infinity;

    switch (filter) {
      case 'today': startTime = startOfDay; break;
      case 'week': {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const startOfWeek = new Date(now.setDate(diff)).setHours(0,0,0,0);
        startTime = startOfWeek;
        break;
      }
      case 'month': startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime(); break;
      case 'year': startTime = new Date(now.getFullYear(), 0, 1).getTime(); break;
      case 'custom':
        if (customRange.start) startTime = new Date(customRange.start).getTime();
        if (customRange.end) endTime = new Date(customRange.end).getTime() + 86400000 - 1;
        break;
      case 'all': default: startTime = 0;
    }
    return logs.filter(l => l.timestamp >= startTime && l.timestamp <= endTime);
  }, [logs, filter, customRange]);

  const formatDateReadable = (dateStr: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // --- Export Logic ---
  const formatLogsForExport = (logsToExport: LogEntry[]) => {
    const sortedLogs = [...logsToExport].sort((a, b) => a.timestamp - b.timestamp);
    let text = "QuarterLog Activity Export\n==========================\n\n";
    let currentDate = "";
    sortedLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString(undefined, { 
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
      });
      const timeStr = new Date(log.timestamp).toLocaleTimeString(undefined, { 
        hour: '2-digit', minute: '2-digit' 
      });
      if (dateStr !== currentDate) { text += `\n[ ${dateStr} ]\n`; currentDate = dateStr; }
      text += `${timeStr} - ${log.text}\n`;
    });
    return text;
  };

  const copyToClipboard = () => {
    if (filteredLogs.length === 0) return;
    navigator.clipboard.writeText(formatLogsForExport(filteredLogs)).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const handleDownload = async () => {
    if (filteredLogs.length === 0) { alert("No logs available."); return; }
    const text = formatLogsForExport(filteredLogs);
    const fileName = `quarterlog_${filter}_${Date.now()}.txt`;
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({ path: fileName, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
        const uriResult = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
        await Share.share({ title: 'QuarterLog Export', url: uriResult.uri });
      } catch (e) { alert("Export failed: " + (e as any).message); }
    } else {
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    }
  };

  const isRunning = status === AppStatus.RUNNING;

  return (
    <div className="min-h-screen font-sans bg-transparent">
      
      {/* Header */}
      <header className="p-5 flex justify-between items-center sticky top-0 z-30">
         <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-lg border-b border-white/5"></div>
        <div className="relative flex items-center gap-3">
           <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
             <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
           </div>
           <div>
             <h1 className="font-bold text-xl tracking-tight text-white leading-none">QuarterLog</h1>
             <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase mt-0.5">Stay on Track</p>
           </div>
        </div>
        
        <div className="relative z-10">
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-xl transition-all hover:shadow-lg border border-transparent hover:border-white/10"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </header>

      <Toast 
        title={toast.title} 
        message={toast.message} 
        isVisible={toast.visible} 
        onClose={() => setToast(prev => ({ ...prev, visible: false }))} 
      />

      <main className="max-w-xl mx-auto p-5 flex flex-col min-h-[calc(100vh-80px)]">
        
        {/* Timer Section */}
        <section className="flex-none mb-8 relative">
          <TimerCircle 
            timeLeft={timeLeft} 
            totalTime={duration} 
            isActive={isRunning} 
            onDurationChange={handleDragUpdate} 
          />
          
          <div className="flex justify-center gap-4 relative z-10">
            {!isRunning && timeLeft === duration && (
               <button onClick={startTimer} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-lg font-bold py-4 px-12 rounded-2xl shadow-xl shadow-blue-900/30 active:scale-95 transition-all w-full max-w-[260px] tracking-wide ring-1 ring-white/20">
                 Start Session
               </button>
            )}
            {!isRunning && timeLeft < duration && (
              <>
                 <button onClick={resumeTimer} className="glass-button text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 font-bold py-4 px-8 rounded-2xl shadow-lg active:scale-95 transition-all flex-1">Resume</button>
                 <button onClick={resetTimer} className="glass-button text-slate-300 bg-white/5 hover:bg-white/10 font-bold py-4 px-8 rounded-2xl shadow-lg active:scale-95 transition-all flex-1">Reset</button>
              </>
            )}
            {isRunning && (
               <button onClick={pauseTimer} className="glass-button text-amber-400 bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20 text-lg font-bold py-4 px-12 rounded-2xl shadow-xl active:scale-95 transition-all w-full max-w-[260px]">
                 Pause
               </button>
            )}
          </div>
        </section>

        {/* Logs Section */}
        <section className="flex-1 flex flex-col">
          
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-white tracking-tight">Timeline</h2>
            <button 
              onClick={handleManualLogStart}
              className="glass-button text-blue-400 hover:text-white hover:bg-blue-600 hover:border-blue-500 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all flex items-center gap-2 shadow-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Log Now
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="bg-slate-900/50 backdrop-blur-sm p-1.5 rounded-2xl mb-6 border border-white/5 flex gap-1 overflow-x-auto no-scrollbar shadow-inner">
            {(['today', 'week', 'month', 'year', 'all', 'custom'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-300 whitespace-nowrap ${
                  filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs (Interactive Overlay) */}
          {filter === 'custom' && (
            <div className="flex gap-3 mb-6 animate-fade-in">
               <div className="relative flex-1 bg-slate-800/40 border border-white/5 hover:border-blue-500/50 rounded-2xl p-4 flex flex-col justify-center transition-all group active:scale-95 shadow-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-blue-400 mb-1">From</span>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-blue-400 transition-colors"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    {formatDateReadable(customRange.start) || <span className="text-slate-500 italic">Select Date</span>}
                  </div>
                  <input 
                    type="date" 
                    value={customRange.start}
                    onChange={e => setCustomRange(p => ({...p, start: e.target.value}))}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    aria-label="Start Date"
                  />
               </div>
               <div className="relative flex-1 bg-slate-800/40 border border-white/5 hover:border-blue-500/50 rounded-2xl p-4 flex flex-col justify-center transition-all group active:scale-95 shadow-lg">
                  <span className="text-[10px] uppercase font-bold text-slate-500 group-hover:text-blue-400 mb-1">To</span>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 group-hover:text-blue-400 transition-colors"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    {formatDateReadable(customRange.end) || <span className="text-slate-500 italic">Select Date</span>}
                  </div>
                  <input 
                    type="date" 
                    value={customRange.end}
                    onChange={e => setCustomRange(p => ({...p, end: e.target.value}))}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    aria-label="End Date"
                  />
               </div>
            </div>
          )}

          {/* Action Bar (Copy/Download) */}
          {filteredLogs.length > 0 && (
            <div className="flex gap-3 mb-6">
              <button 
                 onClick={copyToClipboard}
                 className="glass-button flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300 hover:text-white py-3 rounded-xl transition-all"
               >
                 {copyFeedback ? (
                   <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span className="text-emerald-400">Copied</span>
                   </>
                 ) : (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                     Copy
                   </>
                 )}
               </button>
               <button 
                 onClick={handleDownload}
                 className="glass-button flex-1 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-300 hover:text-white py-3 rounded-xl transition-all"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                 Save .txt
               </button>
            </div>
          )}

          <div className="flex-1">
             <LogList logs={filteredLogs} onDelete={deleteLog} />
          </div>
        </section>

      </main>

      <EntryModal 
        isOpen={isEntryModalOpen}
        onSave={handleLogSave}
        onClose={handleLogClose}
        isManual={isManualEntry}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        currentDurationMs={duration}
        logs={logs}
        onSave={handleDurationSave}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      
      <div className="h-safe-bottom" />
    </div>
  );
};

export default App;