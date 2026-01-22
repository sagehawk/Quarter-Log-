import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType, ImpactStyle } from '@capacitor/haptics';
import TimerCircle from './components/TimerCircle';
import LogList from './components/LogList';
import EntryModal from './components/EntryModal';
import SettingsModal from './components/SettingsModal';
import PromptLibraryModal from './components/PromptLibraryModal'; // Import Prompt Modal
import Toast from './components/Toast';
import StatsCard from './components/StatsCard'; 
import { LogEntry, AppStatus, DEFAULT_INTERVAL_MS, ScheduleConfig } from './types';
import { requestNotificationPermission, scheduleNotification, cancelNotification, registerNotificationActions, configureNotificationChannel } from './utils/notifications';

const STORAGE_KEY_LOGS = 'quarterlog_entries';
const STORAGE_KEY_DURATION = 'quarterlog_duration';
const STORAGE_KEY_SCHEDULE = 'quarterlog_schedule';

// Updated filter types
type FilterType = 'D' | 'W' | 'M' | '3M' | 'Y';

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
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    enabled: false,
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5] // Mon-Fri default
  });
  
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false); // Prompt Modal State
  const [toast, setToast] = useState<{title: string, message: string, visible: boolean}>({ title: '', message: '', visible: false });
  const [hasPermission, setHasPermission] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Filter State
  const [filter, setFilter] = useState<FilterType>('D');
  const [viewDate, setViewDate] = useState<Date>(new Date()); // State for navigation

  // Refs
  const endTimeRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);

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

    const storedSchedule = localStorage.getItem(STORAGE_KEY_SCHEDULE);
    if (storedSchedule) {
      try { setSchedule(JSON.parse(storedSchedule)); } catch (e) { console.error(e); }
    }
    
    // Initialize notifications
    const initNotifications = async () => {
        await configureNotificationChannel();
        const perm = await requestNotificationPermission();
        setHasPermission(perm);
        await registerNotificationActions();
    };
    initNotifications();

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

  // Handle Scroll Effect for Header
  useEffect(() => {
    const handleScroll = () => {
      // Change state when scrolled past 10px
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if current time matches schedule
  const isWithinSchedule = useCallback(() => {
    if (!schedule.enabled) return true; // Always active if schedule disabled

    const now = new Date();
    const currentDay = now.getDay();
    
    // Check Day
    if (!schedule.daysOfWeek.includes(currentDay)) return false;

    // Check Time
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const endTotal = endH * 60 + endM;

    return currentMinutes >= startTotal && currentMinutes < endTotal;
  }, [schedule]);

  const handleTimerComplete = useCallback(async () => {
    // 1. Stop the worker immediately
    workerRef.current?.postMessage({ command: 'stop' });
    
    // 2. Clear any pending notifications to prevent double-firing
    await cancelNotification();
    
    // 3. Update Status
    setStatus(AppStatus.WAITING_FOR_INPUT);
    
    // 4. Visual/Haptic Feedback
    try { Haptics.vibrate(); } catch(e) {}

    setToast({
      title: "Time's up.",
      message: "What did you do?",
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

  // START TIMER
  const startTimer = useCallback(async (overrideTime?: number) => {
    let perm = hasPermission;
    if (!perm) {
      perm = await requestNotificationPermission();
      setHasPermission(perm);
    }
    
    // Use override time if provided, otherwise current state
    const timeToUse = overrideTime ?? timeLeft;

    // Sanity check: prevent starting a 0ms timer or negative
    if (timeToUse <= 0) {
        // Fallback to default duration if something went wrong
        return; 
    }

    setStatus(AppStatus.RUNNING);
    const now = Date.now();
    
    const targetTime = now + timeToUse;
    endTimeRef.current = targetTime; 
    
    // Schedule with high priority - Cancel previous first to be safe
    await cancelNotification();
    await scheduleNotification("Time's up.", "What did you do?", timeToUse);
    
    workerRef.current?.postMessage({ command: 'start' });
    tickLogic(); 
  }, [hasPermission, tickLogic, timeLeft]);

  const pauseTimer = useCallback(async () => {
    await cancelNotification();
    workerRef.current?.postMessage({ command: 'stop' });
    setStatus(AppStatus.IDLE);
  }, []);

  const handleToggleTimer = () => {
    if (status === AppStatus.RUNNING) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  const handleDurationSave = (minutes: number) => {
    const newDuration = minutes * 60 * 1000;
    setDuration(newDuration);
    localStorage.setItem(STORAGE_KEY_DURATION, String(newDuration));
    setIsSettingsModalOpen(false);
    if (status === AppStatus.IDLE) setTimeLeft(newDuration);
  };

  const handleScheduleSave = (newSchedule: ScheduleConfig) => {
    setSchedule(newSchedule);
    localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(newSchedule));
    setIsSettingsModalOpen(false);
  };

  // Live preview update (Does NOT commit to global duration/stats)
  const handleDurationPreview = (newDurationMs: number) => {
    setTimeLeft(newDurationMs);
  };

  // Commit update (Updates global duration, saving stats & storage)
  const handleDurationCommit = (newDurationMs: number) => {
    setDuration(newDurationMs);
    setTimeLeft(newDurationMs);
    localStorage.setItem(STORAGE_KEY_DURATION, String(newDurationMs));
  };

  // --- Navigation Logic ---
  
  const handleNavigate = (direction: -1 | 1) => {
    const newDate = new Date(viewDate);
    if (filter === 'D') {
        newDate.setDate(newDate.getDate() + direction);
    } else if (filter === 'W') {
        newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (filter === 'M') {
        newDate.setMonth(newDate.getMonth() + direction);
    } else if (filter === '3M') {
        // Jump 3 months
        newDate.setMonth(newDate.getMonth() + (direction * 3));
    } else if (filter === 'Y') {
        newDate.setFullYear(newDate.getFullYear() + direction);
    }
    setViewDate(newDate);
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
  };

  const handleResetView = () => {
    setViewDate(new Date());
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
  };

  const isCurrentView = useMemo(() => {
    const now = new Date();
    // Helper to normalize dates for comparison based on filter
    const checkSame = (d1: Date, d2: Date) => {
        if (filter === 'D') return d1.toDateString() === d2.toDateString();
        if (filter === 'M') return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
        if (filter === 'Y') return d1.getFullYear() === d2.getFullYear();
        if (filter === 'W') {
            // Check if same week
            const getWeekStart = (d: Date) => {
                const copy = new Date(d);
                const day = copy.getDay();
                const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
                copy.setDate(diff);
                return copy.toDateString();
            };
            return getWeekStart(d1) === getWeekStart(d2);
        }
        if (filter === '3M') {
            const getQ = (d: Date) => Math.floor(d.getMonth() / 3);
            return getQ(d1) === getQ(d2) && d1.getFullYear() === d2.getFullYear();
        }
        return false;
    };
    return checkSame(now, viewDate);
  }, [viewDate, filter]);

  // Navigation Boundaries Logic
  const { canGoBack, canGoForward } = useMemo(() => {
    if (logs.length === 0) {
        return { canGoBack: false, canGoForward: false };
    }
    
    // Bounds
    const minTimestamp = Math.min(...logs.map(l => l.timestamp));
    const maxTimestamp = Date.now(); 
    
    const current = new Date(viewDate);
    let viewStart = 0;
    let viewEnd = 0;

    if (filter === 'D') {
        current.setHours(0,0,0,0);
        viewStart = current.getTime();
        viewEnd = viewStart + 86400000;
    } else if (filter === 'W') {
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1);
        current.setDate(diff);
        current.setHours(0,0,0,0);
        viewStart = current.getTime();
        viewEnd = viewStart + (7 * 86400000);
    } else if (filter === 'M') {
        viewStart = new Date(current.getFullYear(), current.getMonth(), 1).getTime();
        viewEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0).getTime();
    } else if (filter === '3M') {
        // Start of quarter
        const qStartMonth = Math.floor(current.getMonth() / 3) * 3;
        const qStart = new Date(current.getFullYear(), qStartMonth, 1);
        viewStart = qStart.getTime();
        const qEnd = new Date(qStart);
        qEnd.setMonth(qEnd.getMonth() + 3);
        viewEnd = qEnd.getTime();
    } else if (filter === 'Y') {
        viewStart = new Date(current.getFullYear(), 0, 1).getTime();
        viewEnd = new Date(current.getFullYear() + 1, 0, 1).getTime();
    }
    
    const canGoBack = viewStart > minTimestamp;
    const canGoForward = viewEnd < maxTimestamp;
    
    return { canGoBack, canGoForward };
  }, [viewDate, filter, logs]);


  // --- Logging Logic ---

  const handleManualLogStart = () => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
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
    
    setToast(prev => ({ ...prev, visible: false }));
    
    // Success Haptics
    try { await Haptics.notification({ type: NotificationType.Success }); } catch(e) {}

    // Check if this was a manual entry.
    if (isManualEntry) {
        return;
    }

    // Auto-restart logic (Only for Timer Completion)
    const wasAutomated = status === AppStatus.WAITING_FOR_INPUT;
    
    // Reset internal state
    setTimeLeft(duration);
    
    if (wasAutomated || status === AppStatus.IDLE) {
       if (isWithinSchedule()) {
         // CRITICAL FIX: Pass 'duration' explicitly. 
         // 'timeLeft' state won't update until next render, so startTimer would read '0' otherwise.
         await startTimer(duration);
       } else if (schedule.enabled) {
         setStatus(AppStatus.IDLE);
         setToast({
           title: "Schedule Ended",
           message: "We'll see you tomorrow!",
           visible: true
         });
       } else {
         await startTimer(duration);
       }
    }
  }, [startTimer, status, isWithinSchedule, schedule.enabled, duration, isManualEntry]);

  const handleLogClose = () => {
    setIsEntryModalOpen(false);
    setToast(prev => ({ ...prev, visible: false }));
    
    if (!isManualEntry) {
       setTimeLeft(duration);
       if (isWithinSchedule()) {
          startTimer(duration); // Pass duration explicit
       } else if (schedule.enabled) {
          setStatus(AppStatus.IDLE);
       } else {
          startTimer(duration); // Pass duration explicit
       }
    }
  };

  const deleteLog = (id: string) => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    if (window.confirm("Delete this entry?")) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  useEffect(() => {
    const appStateSub = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        if (status === AppStatus.RUNNING && endTimeRef.current) {
          const now = Date.now();
          const remaining = endTimeRef.current - now;
          if (remaining <= 0) {
            handleTimerComplete();
          } else {
            setTimeLeft(remaining);
          }
        }
      }
    });

    const notificationSub = LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        if (notification.actionId === 'log_input' && notification.inputValue) {
           handleLogSave(notification.inputValue);
        } else {
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
    const current = new Date(viewDate);
    let startTime = 0;
    let endTime = Infinity;

    switch (filter) {
      case 'D': 
        const startOfDay = new Date(current.getFullYear(), current.getMonth(), current.getDate());
        startTime = startOfDay.getTime(); 
        endTime = startTime + 86400000 - 1;
        break;
      case 'W': {
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(current);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0,0,0,0);
        startTime = startOfWeek.getTime();
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);
        endTime = endOfWeek.getTime() - 1;
        break;
      }
      case 'M': 
        startTime = new Date(current.getFullYear(), current.getMonth(), 1).getTime(); 
        endTime = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59).getTime();
        break;
      case '3M': {
        const qStartMonth = Math.floor(current.getMonth() / 3) * 3;
        const qStart = new Date(current.getFullYear(), qStartMonth, 1);
        startTime = qStart.getTime();
        const qEnd = new Date(qStart);
        qEnd.setMonth(qEnd.getMonth() + 3);
        endTime = qEnd.getTime() - 1;
        break;
      }
      case 'Y': 
        startTime = new Date(current.getFullYear(), 0, 1).getTime(); 
        endTime = new Date(current.getFullYear(), 11, 31, 23, 59, 59).getTime();
        break;
      default: startTime = 0;
    }
    
    return logs.filter(l => l.timestamp >= startTime && l.timestamp <= endTime);
  }, [logs, filter, viewDate]);

  const handleCopyClick = () => {
    if (filteredLogs.length === 0) return;
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    setIsPromptLibraryOpen(true);
  };

  const handleCopySuccess = () => {
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const formatLogsForExport = (logsToExport: LogEntry[]) => {
    const sortedLogs = [...logsToExport].sort((a, b) => a.timestamp - b.timestamp);
    let text = "Time Log Export\n==========================\n\n";
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

  const handleDownload = async () => {
    if (filteredLogs.length === 0) { alert("No logs available."); return; }
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    const text = formatLogsForExport(filteredLogs);
    const fileName = `timelog_${filter}_${Date.now()}.txt`;
    if (Capacitor.isNativePlatform()) {
      try {
        await Filesystem.writeFile({ path: fileName, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
        const uriResult = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
        await Share.share({ title: 'Time Log Export', url: uriResult.uri });
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
    <div className="min-h-screen font-sans pb-[env(safe-area-inset-bottom)]">
      
      {/* Fixed Background - Solves mobile viewport glitches */}
      <div 
        className="fixed inset-0 -z-50"
        style={{
          background: 'linear-gradient(135deg, #4a001b 0%, #0f172a 100%)'
        }}
      />

      {/* Header */}
      <header 
        className={`
          fixed top-0 w-full z-40 transition-all duration-500 ease-in-out border-b
          pt-[calc(1.25rem+env(safe-area-inset-top))] px-5 pb-5
          flex justify-between items-center
          ${isScrolled 
            ? 'bg-slate-950/70 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/20' 
            : 'bg-transparent border-transparent'}
        `}
      >
        <div className="relative flex items-center gap-3">
           <div className={`w-10 h-10 rounded-xl overflow-hidden transition-all duration-500 shadow-lg ${isScrolled ? 'shadow-brand-900/40 ring-0' : 'shadow-brand-500/20 ring-1 ring-white/10'}`}>
             <img src="https://i.imgur.com/43DnpQe.png" alt="App Icon" className="w-full h-full object-cover" />
           </div>
           <div>
             <h1 className="font-black text-2xl tracking-tighter uppercase text-white leading-none drop-shadow-sm italic">Time Log</h1>
             <p className={`text-[10px] font-extrabold tracking-widest uppercase mt-0.5 transition-colors duration-300 ${isScrolled ? 'text-slate-400' : 'text-brand-400'}`}>Stop Wasting Time</p>
           </div>
        </div>
        
        <div className="relative z-10">
          <button 
            onClick={() => {
                try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
                setIsSettingsModalOpen(true);
            }}
            className="text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-xl transition-all hover:shadow-lg border border-transparent hover:border-white/10"
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </button>
        </div>
      </header>

      <Toast 
        title={toast.title} 
        message={toast.message} 
        isVisible={toast.visible} 
        onClose={() => setToast(prev => ({ ...prev, visible: false }))} 
      />

      {/* Main Content */}
      <main className="max-w-xl mx-auto p-5 pt-32 flex flex-col min-h-[calc(100vh-80px)]">
        
        {/* Timer */}
        <section className="flex-none mb-10 relative">
          <TimerCircle 
            timeLeft={timeLeft} 
            totalTime={duration} 
            isActive={isRunning} 
            onDurationChange={handleDurationPreview}
            onDurationCommit={handleDurationCommit}
            onToggle={handleToggleTimer}
          />
        </section>

        {/* Logs */}
        <section className="flex-1 flex flex-col">
          
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-black text-white tracking-wide uppercase italic">Timeline</h2>
            <button 
              onClick={handleManualLogStart}
              className="text-slate-500 hover:text-white px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 opacity-60 hover:opacity-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Log Now
            </button>
          </div>
          
          <StatsCard 
            logs={filteredLogs} 
            filter={filter} 
            schedule={schedule} 
            durationMs={duration} 
            viewDate={viewDate} 
            onNavigate={handleNavigate}
            onReset={handleResetView}
            isCurrentView={isCurrentView}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
          />

          {/* New Filter Location - Replaced fixed footer */}
          <div className="flex justify-center mb-8">
            <div className="bg-slate-900 p-1.5 rounded-2xl flex items-center justify-between w-full border border-slate-800 shadow-sm">
                {(['D', 'W', 'M', '3M', 'Y'] as FilterType[]).map((f) => (
                <button
                    key={f}
                    onClick={() => {
                        try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
                        setFilter(f);
                        setViewDate(new Date()); 
                    }}
                    className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${
                    filter === f ? 'bg-brand-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                    }`}
                >
                    {f}
                </button>
                ))}
            </div>
          </div>

          {/* Action Bar */}
          {filteredLogs.length > 0 && (
            <div className="flex gap-3 mb-6">
              <button 
                 onClick={handleCopyClick}
                 className="glass-button flex-1 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white py-4 rounded-xl transition-all"
               >
                 {copyFeedback ? (
                   <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    <span className="text-emerald-400">Copied</span>
                   </>
                 ) : (
                   <>
                     <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                     Copy
                   </>
                 )}
               </button>
               <button 
                 onClick={handleDownload}
                 className="glass-button flex-1 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white py-4 rounded-xl transition-all"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
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
        schedule={schedule}
        onSave={handleDurationSave}
        onSaveSchedule={handleScheduleSave}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      <PromptLibraryModal
        isOpen={isPromptLibraryOpen}
        onClose={() => setIsPromptLibraryOpen(false)}
        logsText={formatLogsForExport(filteredLogs)}
        onCopySuccess={handleCopySuccess}
      />
      
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
};

export default App;