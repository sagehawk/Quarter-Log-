import React, { useState, useEffect, useRef, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import TimerCircle from './components/TimerCircle';
import LogList from './components/LogList';
import EntryModal from './components/EntryModal';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';
import { LogEntry, AppStatus, DEFAULT_INTERVAL_MS } from './types';
import { requestNotificationPermission, scheduleNotification, cancelNotification } from './utils/notifications';
import { playNotificationSound } from './utils/sound';

const STORAGE_KEY_LOGS = 'quarterlog_entries';
const STORAGE_KEY_DURATION = 'quarterlog_duration';

// Inline worker code for visual countdown (foreground only)
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
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [toast, setToast] = useState<{title: string, message: string, visible: boolean}>({ title: '', message: '', visible: false });
  const [hasPermission, setHasPermission] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Refs
  const endTimeRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Handle App State Changes (Resume from background)
  useEffect(() => {
    const subscription = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        // App just came to foreground. Check if timer finished while we were away.
        if (status === AppStatus.RUNNING && endTimeRef.current) {
          const now = Date.now();
          const remaining = endTimeRef.current - now;
          
          if (remaining <= 0) {
            // Timer expired while backgrounded
            handleTimerComplete(true); // true = skip sound, OS notification likely already rang
          } else {
            // Timer still running, just update visual
            setTimeLeft(remaining);
          }
        }
      }
    });

    return () => {
      subscription.then(sub => sub.remove());
    };
  }, [status]);

  // Load initial data
  useEffect(() => {
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

    // Initialize Web Worker for visual ticker
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

  // Logic for timer completion
  const handleTimerComplete = useCallback((skipSound = false) => {
    workerRef.current?.postMessage({ command: 'stop' });
    setStatus(AppStatus.WAITING_FOR_INPUT);
    
    // Only play sound/vibrate if we are completing actively in foreground
    // If returning from background (skipSound=true), the system notification already alerted the user
    if (!skipSound) {
        playNotificationSound();
        if (navigator.vibrate) navigator.vibrate([1000, 500, 1000]);
    }
    
    setToast({
      title: "Time's up!",
      message: "Take a moment to log your recent activity.",
      visible: true
    });
    
    setIsEntryModalOpen(true);
  }, []);

  // Visual Tick Logic (updates UI only)
  const tickLogic = useCallback(() => {
    if (!endTimeRef.current || status !== AppStatus.RUNNING) return;
    
    const now = Date.now();
    const remaining = Math.max(0, endTimeRef.current - now);
    
    setTimeLeft(remaining);

    if (remaining <= 0) {
      handleTimerComplete();
    }
  }, [handleTimerComplete, status]);

  const tickRef = useRef(tickLogic);
  useEffect(() => { tickRef.current = tickLogic; }, [tickLogic]);
  const triggerTick = () => tickRef.current();

  const startTimer = async () => {
    if (!hasPermission) {
      const granted = await requestNotificationPermission();
      setHasPermission(granted);
    }

    // Unmute audio context
    playNotificationSound();

    setStatus(AppStatus.RUNNING);
    
    const now = Date.now();
    const targetTime = now + duration;
    endTimeRef.current = targetTime; 
    
    // 1. Schedule Native Notification (The real alarm)
    // This lives in the OS, so it works even if app closes
    scheduleNotification("Time's up!", "Log your activity.", duration);

    // 2. Start Visual Ticker
    workerRef.current?.postMessage({ command: 'start' });
    tickLogic(); 
  };

  const pauseTimer = () => {
    // Cancel the scheduled OS alarm
    cancelNotification();
    workerRef.current?.postMessage({ command: 'stop' });
    setStatus(AppStatus.IDLE);
  };

  const resumeTimer = () => {
    if (timeLeft <= 0) return;
    
    setStatus(AppStatus.RUNNING);
    
    // Recalculate end time based on remaining time
    const targetTime = Date.now() + timeLeft;
    endTimeRef.current = targetTime;
    
    // Reschedule OS alarm
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

  const handleLogSave = (text: string) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      text,
    };
    setLogs(prev => [newLog, ...prev]);
    setIsEntryModalOpen(false);
    setToast(prev => ({ ...prev, visible: false }));
    startTimer();
  };

  const handleLogSkip = () => {
    setIsEntryModalOpen(false);
    setToast(prev => ({ ...prev, visible: false }));
    startTimer();
  };

  const deleteLog = (id: string) => {
    if (window.confirm("Delete this entry?")) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  const copyToClipboard = () => {
    if (logs.length === 0) return;
    const sortedLogs = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    let textToCopy = "";
    let currentDate = "";

    sortedLogs.forEach(log => {
      const dateStr = new Date(log.timestamp).toLocaleDateString(undefined, { 
        weekday: 'short', month: 'short', day: 'numeric' 
      });
      const timeStr = new Date(log.timestamp).toLocaleTimeString(undefined, { 
        hour: '2-digit', minute: '2-digit' 
      });

      if (dateStr !== currentDate) {
        textToCopy += `\n📅 ${dateStr}\n`;
        currentDate = dateStr;
      }
      textToCopy += `${timeStr} - ${log.text}\n`;
    });

    navigator.clipboard.writeText(textToCopy.trim()).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  };

  const isRunning = status === AppStatus.RUNNING;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans selection:bg-blue-500/30">
      
      {/* Header */}
      <header className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#0f172a]/80 backdrop-blur sticky top-0 z-20">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
           </div>
           <h1 className="font-bold text-xl tracking-tight">QuarterLog</h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSettingsModalOpen(true)}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-lg transition-colors"
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

      <main className="max-w-md mx-auto p-4 flex flex-col min-h-[calc(100vh-80px)]">
        
        <section className="flex-none">
          <TimerCircle timeLeft={timeLeft} totalTime={duration} isActive={isRunning} />
          
          <div className="flex justify-center gap-4 mb-12">
            {!isRunning && timeLeft === duration && (
               <button 
                onClick={startTimer}
                className="bg-blue-600 hover:bg-blue-500 text-white text-lg font-bold py-4 px-12 rounded-2xl shadow-xl shadow-blue-900/30 active:scale-95 transition-all w-full max-w-[240px]"
              >
                Start Session
              </button>
            )}

            {!isRunning && timeLeft < duration && (
              <>
                 <button 
                  onClick={resumeTimer}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 px-8 rounded-2xl shadow-lg shadow-emerald-900/30 active:scale-95 transition-all flex-1"
                >
                  Resume
                </button>
                <button 
                  onClick={resetTimer}
                  className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 px-8 rounded-2xl shadow-lg active:scale-95 transition-all flex-1"
                >
                  Reset
                </button>
              </>
            )}

            {isRunning && (
               <button 
                onClick={pauseTimer}
                className="bg-amber-600 hover:bg-amber-500 text-white text-lg font-bold py-4 px-12 rounded-2xl shadow-xl shadow-amber-900/30 active:scale-95 transition-all w-full max-w-[240px]"
              >
                Pause
              </button>
            )}
          </div>
        </section>

        <section className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3">
               <h2 className="text-xl font-bold text-slate-200">Activity Log</h2>
               <span className="text-slate-500 text-sm font-medium bg-slate-800 px-2 py-1 rounded-md">{logs.length} entries</span>
             </div>
             
             {logs.length > 0 && (
               <button 
                 onClick={copyToClipboard}
                 className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-blue-400 transition-colors bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-blue-500/30"
               >
                 {copyFeedback ? (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     <span className="text-emerald-400">Copied!</span>
                   </>
                 ) : (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                     <span>Copy All</span>
                   </>
                 )}
               </button>
             )}
          </div>
          <div className="flex-1">
             <LogList logs={logs} onDelete={deleteLog} />
          </div>
        </section>

      </main>

      <EntryModal 
        isOpen={isEntryModalOpen}
        onSave={handleLogSave}
        onClose={handleLogSkip}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        currentDurationMs={duration}
        onSave={handleDurationSave}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      
      <div className="h-safe-bottom" />
    </div>
  );
};

export default App;