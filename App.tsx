
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType, ImpactStyle } from '@capacitor/haptics';
import LogList from './components/LogList';
import EntryModal from './components/EntryModal';
import SettingsModal from './components/SettingsModal';
import AIFeedbackModal from './components/AIFeedbackModal';
import Toast from './components/Toast';
import StatsCard from './components/StatsCard';
import Onboarding from './components/Onboarding';
import StatusCard from './components/StatusCard';
import { LogEntry, AppStatus, DEFAULT_INTERVAL_MS, ScheduleConfig, UserGoal, AIReport } from './types';
import { requestNotificationPermission, checkNotificationPermission, scheduleNotification, cancelNotification, registerNotificationActions, configureNotificationChannel, sendNotification } from './utils/notifications';
import { generateAIReport } from './utils/aiService';

const STORAGE_KEY_LOGS = 'quarterlog_entries';
const STORAGE_KEY_SCHEDULE = 'quarterlog_schedule';
const STORAGE_KEY_ONBOARDED = 'quarterlog_onboarded';
const STORAGE_KEY_GOAL = 'quarterlog_goal';
const STORAGE_KEY_PERSONA = 'quarterlog_persona';
const STORAGE_KEY_TIMER_TARGET = 'quarterlog_timer_target';
const STORAGE_KEY_REPORTS = 'quarterlog_ai_reports';

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
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(true); 
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_INTERVAL_MS);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [reports, setReports] = useState<Record<string, AIReport>>({});
  const [schedule, setSchedule] = useState<ScheduleConfig>({
    enabled: true, 
    startTime: '09:00',
    endTime: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5] 
  });
  
  const [isPaused, setIsPaused] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // AI Report State
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportContent, setAiReportContent] = useState<string | null>(null);

  const [toast, setToast] = useState<{title: string, message: string, visible: boolean}>({ title: '', message: '', visible: false });
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Filter State
  const [filter, setFilter] = useState<FilterType>('D');
  const [viewDate, setViewDate] = useState<Date>(new Date());

  // Refs
  const endTimeRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const hasCheckedAutoReport = useRef(false);

  // Load initial data
  useEffect(() => {
    // Check Onboarding
    const onboarded = localStorage.getItem(STORAGE_KEY_ONBOARDED);
    if (!onboarded) {
        setHasOnboarded(false);
    }

    const storedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
    if (storedLogs) {
      try { setLogs(JSON.parse(storedLogs)); } catch (e) { console.error(e); }
    }

    const storedReports = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (storedReports) {
      try { setReports(JSON.parse(storedReports)); } catch (e) { console.error(e); }
    }

    const storedSchedule = localStorage.getItem(STORAGE_KEY_SCHEDULE);
    if (storedSchedule) {
      try { 
          const parsed = JSON.parse(storedSchedule);
          setSchedule({ ...parsed, enabled: true }); 
      } catch (e) { console.error(e); }
    }
    
    // Initialize notifications
    const initNotifications = async () => {
        await configureNotificationChannel();
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
      
      const savedTarget = localStorage.getItem(STORAGE_KEY_TIMER_TARGET);
      if (savedTarget) {
          const targetTime = parseInt(savedTarget, 10);
          const now = Date.now();
          if (targetTime > now) {
              endTimeRef.current = targetTime;
              setStatus(AppStatus.RUNNING);
              workerRef.current.postMessage({ command: 'start' });
          } else {
              endTimeRef.current = null;
              localStorage.removeItem(STORAGE_KEY_TIMER_TARGET);
              setStatus(AppStatus.WAITING_FOR_INPUT);
              setIsEntryModalOpen(true);
          }
      }

      return () => {
        workerRef.current?.terminate();
        URL.revokeObjectURL(workerUrl);
      };
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(reports));
  }, [reports]);

  // --- Auto-Generate Logic for Yesterday ---
  useEffect(() => {
    if (!hasOnboarded || logs.length === 0 || hasCheckedAutoReport.current) return;

    // We only automate "Yesterday's" report for now to save tokens and avoid spam
    // 1. Calculate Yesterday's Key
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = `D_${yesterday.toISOString().substring(0, 10)}`;

    // 2. Check if we already have it
    if (reports[dateKey]) {
        hasCheckedAutoReport.current = true;
        return;
    }

    // 3. Check if we have logs for yesterday
    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23,59,59,999);
    
    const yesterdaysLogs = logs.filter(l => l.timestamp >= startOfDay.getTime() && l.timestamp <= endOfDay.getTime());

    if (yesterdaysLogs.length > 0) {
        hasCheckedAutoReport.current = true; // Mark checked so we don't loop
        
        const runAutoGen = async () => {
            const goal = localStorage.getItem(STORAGE_KEY_GOAL) as UserGoal || 'FOCUS';
            const persona = localStorage.getItem(STORAGE_KEY_PERSONA) as any || 'LOGIC';
            
            // Generate BRIEF for Notification
            const summary = await generateAIReport(yesterdaysLogs, 'Day', goal, persona, schedule, 'BRIEF');
            await sendNotification("Daily Report Ready", summary.replace('Report Ready:', '').trim(), false);
            setToast({ title: "Report Ready", message: "Yesterday's analysis is available.", visible: true });

            // Generate FULL for Storage (Background)
            const fullContent = await generateAIReport(yesterdaysLogs, 'Day', goal, persona, schedule, 'FULL');
            
            const newReport: AIReport = {
                id: crypto.randomUUID(),
                dateKey,
                content: fullContent,
                summary,
                timestamp: Date.now(),
                period: 'D',
                logCount: yesterdaysLogs.length,
                read: false // Mark as unread so user sees indicator
            };

            setReports(prev => ({ ...prev, [dateKey]: newReport }));
        };
        runAutoGen();
    } else {
        hasCheckedAutoReport.current = true;
    }

  }, [logs, hasOnboarded, reports, schedule]);


  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isWithinSchedule = useCallback(() => {
    const onboarded = localStorage.getItem(STORAGE_KEY_ONBOARDED);
    if (!onboarded) return false;

    const now = new Date();
    const currentDay = now.getDay();
    if (!schedule.daysOfWeek.includes(currentDay)) return false;

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const endTotal = endH * 60 + endM;

    return currentMinutes >= startTotal && currentMinutes < endTotal;
  }, [schedule]);

  const handleTimerComplete = useCallback(async () => {
    workerRef.current?.postMessage({ command: 'stop' });
    setStatus(AppStatus.WAITING_FOR_INPUT);
    localStorage.removeItem(STORAGE_KEY_TIMER_TARGET);
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

  const startTimer = useCallback(async (overrideTime?: number) => {
    const timeToUse = overrideTime ?? DEFAULT_INTERVAL_MS;
    setIsPaused(false);
    setStatus(AppStatus.RUNNING);
    const now = Date.now();
    const targetTime = now + timeToUse;
    endTimeRef.current = targetTime;
    localStorage.setItem(STORAGE_KEY_TIMER_TARGET, targetTime.toString());
    await cancelNotification();
    await scheduleNotification("What are you doing?", "Tap to log. Be honest.", timeToUse);
    workerRef.current?.postMessage({ command: 'start' });
    tickLogic(); 
  }, [tickLogic]);

  const pauseTimer = useCallback(async () => {
    setIsPaused(true);
    await cancelNotification();
    workerRef.current?.postMessage({ command: 'stop' });
    setStatus(AppStatus.IDLE);
    setTimeLeft(DEFAULT_INTERVAL_MS);
    localStorage.removeItem(STORAGE_KEY_TIMER_TARGET);
  }, []);

  const handleToggleTimer = () => {
      if (status === AppStatus.RUNNING) {
          pauseTimer();
      } else {
          startTimer();
      }
  };

  useEffect(() => {
    if (!hasOnboarded) return;
    const checkInterval = setInterval(() => {
        const shouldRun = isWithinSchedule();
        if (shouldRun && status === AppStatus.IDLE && !isPaused) {
            startTimer();
        } 
    }, 2000);
    return () => clearInterval(checkInterval);
  }, [isWithinSchedule, status, startTimer, pauseTimer, hasOnboarded, isPaused]);


  const handleScheduleSave = (newSchedule: ScheduleConfig) => {
    const configWithEnabled = { ...newSchedule, enabled: true };
    setSchedule(configWithEnabled);
    localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(configWithEnabled));
    setIsSettingsModalOpen(false);
  };

  const handleOnboardingComplete = (goal: UserGoal, config: ScheduleConfig) => {
      const configWithEnabled = { ...config, enabled: true };
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
      localStorage.setItem(STORAGE_KEY_GOAL, goal);
      // Set Default Persona based on Goal
      const defaultPersona = goal === 'LIFE' ? 'KIND' : goal === 'BUSINESS' ? 'LOGIC' : 'TOUGH';
      localStorage.setItem(STORAGE_KEY_PERSONA, defaultPersona);

      localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(configWithEnabled));
      setSchedule(configWithEnabled);
      setHasOnboarded(true);
      setTimeout(() => {
         const now = new Date();
         const currentMinutes = now.getHours() * 60 + now.getMinutes();
         const [startH, startM] = config.startTime.split(':').map(Number);
         const startTotal = startH * 60 + startM;
         const [endH, endM] = config.endTime.split(':').map(Number);
         const endTotal = endH * 60 + endM;
         if (currentMinutes >= startTotal && currentMinutes < endTotal) {
             startTimer();
         }
      }, 500);
  };

  const handleNavigate = (direction: -1 | 1) => {
    const newDate = new Date(viewDate);
    if (filter === 'D') newDate.setDate(newDate.getDate() + direction);
    else if (filter === 'W') newDate.setDate(newDate.getDate() + (direction * 7));
    else if (filter === 'M') newDate.setMonth(newDate.getMonth() + direction);
    else if (filter === '3M') newDate.setMonth(newDate.getMonth() + (direction * 3));
    else if (filter === 'Y') newDate.setFullYear(newDate.getFullYear() + direction);
    
    setViewDate(newDate);
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    
    // Reset AI report when view changes
    setAiReportContent(null);
  };

  const handleResetView = () => {
    setViewDate(new Date());
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    setAiReportContent(null);
  };

  const isCurrentView = useMemo(() => {
    const now = new Date();
    const checkSame = (d1: Date, d2: Date) => {
        if (filter === 'D') return d1.toDateString() === d2.toDateString();
        if (filter === 'M') return d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
        if (filter === 'Y') return d1.getFullYear() === d2.getFullYear();
        if (filter === 'W') {
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

  const { canGoBack, canGoForward } = useMemo(() => {
    if (logs.length === 0) return { canGoBack: false, canGoForward: false };
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
    return { canGoBack: viewStart > minTimestamp, canGoForward: viewEnd < maxTimestamp };
  }, [viewDate, filter, logs]);


  const handleManualLogStart = () => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    setIsManualEntry(true);
    setIsEntryModalOpen(true);
  };

  const handleLogSave = useCallback(async (text: string, isFromNotification: boolean = false) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      text,
    };
    setLogs(prev => [newLog, ...prev]);
    setIsEntryModalOpen(false);
    setToast(prev => ({ ...prev, visible: false }));
    try { await Haptics.notification({ type: NotificationType.Success }); } catch(e) {}
    localStorage.removeItem(STORAGE_KEY_TIMER_TARGET);
    setTimeLeft(DEFAULT_INTERVAL_MS);
    if (isWithinSchedule()) {
       await startTimer(DEFAULT_INTERVAL_MS);
    } else {
       setStatus(AppStatus.IDLE);
       setIsPaused(false);
    }
  }, [startTimer, isWithinSchedule, isManualEntry]);

  const handleLogClose = () => {
    setIsEntryModalOpen(false);
    setToast(prev => ({ ...prev, visible: false }));
    if (!isManualEntry) {
       setTimeLeft(DEFAULT_INTERVAL_MS);
       if (isWithinSchedule()) {
          startTimer();
       } else {
          setStatus(AppStatus.IDLE);
          setIsPaused(false);
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
        const savedTarget = localStorage.getItem(STORAGE_KEY_TIMER_TARGET);
        if (savedTarget) {
            const target = parseInt(savedTarget);
            const now = Date.now();
            if (target > now) {
                endTimeRef.current = target;
                setStatus(AppStatus.RUNNING);
                workerRef.current?.postMessage({ command: 'start' });
            } else {
                handleTimerComplete();
            }
        }
      }
    });

    const notificationSub = LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
        if (notification.actionId === 'log_input' && notification.inputValue) {
           handleLogSave(notification.inputValue, true);
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

  const handleCopyClick = async () => {
    if (filteredLogs.length === 0) return;
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    
    const text = formatLogsForExport(filteredLogs);
    try {
        await navigator.clipboard.writeText(text);
        setCopyFeedback(true);
        setTimeout(() => setCopyFeedback(false), 2000);
    } catch(e) {
        setToast({ title: "Error", message: "Failed to copy logs.", visible: true });
    }
  };

  // Generate Date Key for Current View
  const getCurrentDateKey = () => {
     const current = new Date(viewDate);
     if (filter === 'D') return `D_${current.toISOString().substring(0, 10)}`;
     if (filter === 'M') return `M_${current.toISOString().substring(0, 7)}`;
     if (filter === 'Y') return `Y_${current.getFullYear()}`;
     if (filter === 'W') {
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(current);
        monday.setDate(diff);
        return `W_${monday.toISOString().substring(0, 10)}`;
     }
     return `Q_${current.getFullYear()}_${Math.floor(current.getMonth()/3)}`;
  };

  const savedReportForView = useMemo(() => {
      const key = getCurrentDateKey();
      return reports[key] || null;
  }, [viewDate, filter, reports]);

  // Determine if we can update the report
  const canUpdateReport = useMemo(() => {
     if (!savedReportForView) return false;
     // If log count differs, we have new entries (or deletions)
     return filteredLogs.length !== savedReportForView.logCount;
  }, [savedReportForView, filteredLogs]);

  // --- AI Report Logic ---
  const handleGenerateAIReport = async () => {
      const goal = localStorage.getItem(STORAGE_KEY_GOAL) as UserGoal || 'FOCUS';
      const persona = localStorage.getItem(STORAGE_KEY_PERSONA) as any || 'LOGIC';
      
      const periodMap: Record<FilterType, string> = {
          'D': 'Day', 'W': 'Week', 'M': 'Month', '3M': 'Quarter', 'Y': 'Year'
      };
      
      setAiReportLoading(true);

      try {
        // MANUAL GENERATION: Only generate FULL report, no brief notification.
        const content = await generateAIReport(filteredLogs, periodMap[filter], goal, persona, schedule, 'FULL');
        
        // Save it
        const key = getCurrentDateKey();
        const newReport: AIReport = {
            id: crypto.randomUUID(),
            dateKey: key,
            content: content,
            summary: savedReportForView?.summary || "Manual Analysis", // Preserve summary if exists or use placeholder
            timestamp: Date.now(),
            period: filter,
            logCount: filteredLogs.length, // Capture current count
            read: true // Manual generation implies user is viewing it immediately
        };
        
        setReports(prev => ({ ...prev, [key]: newReport }));
        setAiReportContent(content);

        // Feedback for completion
        try { Haptics.notification({ type: NotificationType.Success }); } catch(e) {}

      } catch (error) {
        console.error("Manual AI generation failed", error);
        setToast({ title: "Error", message: "Failed to generate report.", visible: true });
      } finally {
        setAiReportLoading(false);
      }
  };

  // Open modal logic
  const handleOpenAIModal = () => {
      if (savedReportForView) {
          setAiReportContent(savedReportForView.content);
          
          // If it was unread, mark it as read now that we are opening it
          if (savedReportForView.read === false) {
             const updatedReport = { ...savedReportForView, read: true };
             setReports(prev => ({ ...prev, [savedReportForView.dateKey]: updatedReport }));
          }

      } else {
          setAiReportContent(null);
      }
      setIsAIModalOpen(true);
  };

  if (!hasOnboarded) {
      return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen font-sans pb-[env(safe-area-inset-bottom)]">
      
      {/* Fixed Background */}
      <div 
        className="fixed inset-0 -z-50"
        style={{
          background: 'linear-gradient(135deg, #4a001b 0%, #0f172a 100%)'
        }}
      />

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

      <main className="max-w-xl mx-auto p-5 pt-32 flex flex-col min-h-[calc(100vh-80px)]">
        
        <section className="flex-none mb-8">
            <StatusCard 
                isActive={status === AppStatus.RUNNING} 
                timeLeft={timeLeft}
                schedule={schedule}
                onToggle={handleToggleTimer}
            />
        </section>

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
            durationMs={DEFAULT_INTERVAL_MS} 
            viewDate={viewDate} 
            onNavigate={handleNavigate}
            onReset={handleResetView}
            isCurrentView={isCurrentView}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
          />

          <div className="flex justify-center mb-6">
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
          
          {filteredLogs.length > 0 && (
             <div className="flex items-center justify-between mb-6 px-1 gap-4">
                 <button
                    onClick={() => {
                        try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
                        handleOpenAIModal();
                    }}
                    className={`flex-1 flex items-center gap-2 py-3 px-4 rounded-xl transition-all border ${savedReportForView ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-brand-400 hover:border-brand-500/30 hover:bg-slate-800'}`}
                 >
                    <div className={`p-1.5 rounded-lg ${savedReportForView ? 'bg-emerald-500/20' : 'bg-slate-800'}`}>
                        {savedReportForView ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                        )}
                    </div>
                    <div className="flex flex-col items-start">
                         <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                             {savedReportForView ? 'View Report' : 'AI Insight'}
                         </span>
                         {savedReportForView && savedReportForView.read === false && (
                            <span className="text-[9px] text-emerald-400 font-bold leading-none mt-1 animate-pulse">New Analysis Available</span>
                         )}
                         {!savedReportForView && (
                             <span className="text-[9px] opacity-60 font-medium leading-none mt-1">Generate Analysis</span>
                         )}
                    </div>
                 </button>

                 <button 
                    onClick={handleCopyClick}
                    className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 transition-all active:scale-95"
                    title="Copy Logs"
                 >
                     {copyFeedback ? (
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                     ) : (
                       <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                     )}
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
        currentDurationMs={DEFAULT_INTERVAL_MS}
        logs={logs}
        schedule={schedule}
        onSave={() => {}} 
        onSaveSchedule={handleScheduleSave}
        onClose={() => setIsSettingsModalOpen(false)}
      />
      
      <AIFeedbackModal
        isOpen={isAIModalOpen}
        isLoading={aiReportLoading}
        report={aiReportContent}
        isSaved={!!savedReportForView}
        canUpdate={canUpdateReport}
        period={filter === 'D' ? 'Daily' : filter === 'W' ? 'Weekly' : filter === 'M' ? 'Monthly' : 'Quarterly'}
        onClose={() => setIsAIModalOpen(false)}
        onGenerate={handleGenerateAIReport}
      />
      
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
};

export default App;
