import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType, ImpactStyle } from '@capacitor/haptics';
import LogList from './components/LogList';
import EntryModal from './components/EntryModal';
import SettingsModal from './components/SettingsModal';
import AIFeedbackModal from './components/AIFeedbackModal';
import FeedbackOverlay from './components/FeedbackOverlay';
import RankHUD from './components/RankHUD';
import RankHierarchyModal from './components/RankHierarchyModal';
import Toast from './components/Toast';
import StatsCard from './components/StatsCard';
import Onboarding from './components/Onboarding';
import StatusCard from './components/StatusCard';
import { LogEntry, AppStatus, DEFAULT_INTERVAL_MS, ScheduleConfig, UserGoal, AIReport, FreezeState } from './types';
import { requestNotificationPermission, checkNotificationPermission, scheduleNotification, cancelNotification, registerNotificationActions, configureNotificationChannel, sendNotification } from './utils/notifications';
import { generateAIReport } from './utils/aiService';

const STORAGE_KEY_LOGS = 'ironlog_entries';
const STORAGE_KEY_SCHEDULE = 'ironlog_schedule';
const STORAGE_KEY_ONBOARDED = 'ironlog_onboarded';
const STORAGE_KEY_GOAL = 'ironlog_goal'; 
const STORAGE_KEY_PERSONA = 'ironlog_persona';
const STORAGE_KEY_TIMER_TARGET = 'ironlog_timer_target';
const STORAGE_KEY_REPORTS = 'ironlog_ai_reports';
const STORAGE_KEY_FREEZE = 'ironlog_freeze_state';
const STORAGE_KEY_SEEN_FREEZE_WARNING = 'ironlog_seen_freeze_warning';

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
  
  const [freezeState, setFreezeState] = useState<FreezeState>({
      isFrozen: false,
      recoveryWins: 0,
      lastLossTimestamp: null
  });

  const [hasSeenFreezeWarning, setHasSeenFreezeWarning] = useState(false);

  const [isPaused, setIsPaused] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportContent, setAiReportContent] = useState<string | null>(null);

  const [toast, setToast] = useState<{title: string, message: string, visible: boolean}>({ title: '', message: '', visible: false });
  const [feedbackState, setFeedbackState] = useState<{ visible: boolean, totalWins: number, type: 'WIN' | 'LOSS', customTitle?: string, customSub?: string }>({ 
      visible: false, totalWins: 0, type: 'WIN' 
  });
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [filter, setFilter] = useState<FilterType>('D');
  const [viewDate, setViewDate] = useState<Date>(new Date());

  const endTimeRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const hasCheckedAutoReport = useRef(false);

  const getStoredGoals = (): UserGoal[] => {
      const stored = localStorage.getItem(STORAGE_KEY_GOAL);
      if (!stored) return ['FOCUS'];
      try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
          return [stored as UserGoal]; 
      } catch (e) {
          return [stored as UserGoal];
      }
  };

  useEffect(() => {
    const onboarded = localStorage.getItem(STORAGE_KEY_ONBOARDED);
    if (!onboarded) setHasOnboarded(false);

    const storedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
    if (storedLogs) {
      try { setLogs(JSON.parse(storedLogs)); } catch (e) { console.error(e); }
    }

    const storedReports = localStorage.getItem(STORAGE_KEY_REPORTS);
    if (storedReports) {
      try { setReports(JSON.parse(storedReports)); } catch (e) { console.error(e); }
    }

    const seenWarning = localStorage.getItem(STORAGE_KEY_SEEN_FREEZE_WARNING);
    if (seenWarning) setHasSeenFreezeWarning(true);

    const storedFreeze = localStorage.getItem(STORAGE_KEY_FREEZE);
    if (storedFreeze) {
        try { 
            const parsed = JSON.parse(storedFreeze);
            const lastLoss = parsed.lastLossTimestamp;
            if (lastLoss) {
                const lastDate = new Date(lastLoss).toDateString();
                const today = new Date().toDateString();
                if (lastDate !== today) {
                    setFreezeState({ isFrozen: false, recoveryWins: 0, lastLossTimestamp: null });
                } else {
                    setFreezeState(parsed);
                }
            } else {
                setFreezeState(parsed);
            }
        } catch (e) { console.error(e); }
    }

    const storedSchedule = localStorage.getItem(STORAGE_KEY_SCHEDULE);
    if (storedSchedule) {
      try { 
          const parsed = JSON.parse(storedSchedule);
          setSchedule({ ...parsed, enabled: true }); 
      } catch (e) { console.error(e); }
    }
    
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

  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_FREEZE, JSON.stringify(freezeState));
  }, [freezeState]);

  useEffect(() => {
    if (!hasOnboarded || logs.length === 0 || hasCheckedAutoReport.current) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateKey = `D_${yesterday.toISOString().substring(0, 10)}`;
    if (reports[dateKey]) {
        hasCheckedAutoReport.current = true;
        return;
    }
    const startOfDay = new Date(yesterday);
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23,59,59,999);
    const yesterdaysLogs = logs.filter(l => l.timestamp >= startOfDay.getTime() && l.timestamp <= endOfDay.getTime());
    if (yesterdaysLogs.length > 0) {
        hasCheckedAutoReport.current = true; 
        const runAutoGen = async () => {
            const goals = getStoredGoals();
            const persona = localStorage.getItem(STORAGE_KEY_PERSONA) as any || 'LOGIC';
            const summary = await generateAIReport(yesterdaysLogs, 'Day', goals, persona, schedule, 'BRIEF');
            await sendNotification("Daily Report Ready", summary.replace('Report Ready:', '').trim(), false);
            setToast({ title: "Report Ready", message: "Yesterday's analysis is available.", visible: true });
            const fullContent = await generateAIReport(yesterdaysLogs, 'Day', goals, persona, schedule, 'FULL');
            const newReport: AIReport = {
                id: crypto.randomUUID(),
                dateKey,
                content: fullContent,
                summary,
                timestamp: Date.now(),
                period: 'D',
                logCount: yesterdaysLogs.length,
                read: false 
            };
            setReports(prev => ({ ...prev, [dateKey]: newReport }));
        };
        runAutoGen();
    } else {
        hasCheckedAutoReport.current = true;
    }
  }, [logs, hasOnboarded, reports, schedule]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
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

  // NEW: Calculate Blocks Remaining
  const getBlockStats = useCallback(() => {
    if (!schedule.enabled) return { total: 0, remaining: 0 };
    
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    const now = new Date();
    const currentTotal = now.getHours() * 60 + now.getMinutes();
    
    const totalDuration = endTotal - startTotal;
    if (totalDuration <= 0) return { total: 0, remaining: 0 };

    const totalBlocks = Math.floor(totalDuration / 15);
    
    // Calculate elapsed from start
    let elapsed = currentTotal - startTotal;
    if (elapsed < 0) elapsed = 0;
    // Cap elapsed at total duration (day over)
    if (elapsed > totalDuration) elapsed = totalDuration;
    
    const usedBlocks = Math.floor(elapsed / 15);
    const remaining = Math.max(0, totalBlocks - usedBlocks);
    
    return { total: totalBlocks, remaining };
  }, [schedule]);

  // Use a timer to update block stats every minute if visible, but calculating on render is fine for now
  // Since schedule doesn't change often and minute tick will trigger re-render if we had one.
  // Actually, we need to force re-render every minute to update "Remaining" if no other state changes.
  // The worker tick handles timeLeft, but not this. 
  // Let's add a minute ticker.
  const [minuteTick, setMinuteTick] = useState(0);
  useEffect(() => {
      const i = setInterval(() => setMinuteTick(p => p + 1), 60000);
      return () => clearInterval(i);
  }, []);

  const blockStats = useMemo(() => getBlockStats(), [getBlockStats, minuteTick]);

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
    
    // Notification with Remaining Opportunities
    const stats = getBlockStats();
    const nextRemaining = Math.max(0, stats.remaining - 1);
    await cancelNotification();
    await scheduleNotification("Win or Loss?", `Declare your status. ${nextRemaining} opportunities left today.`, timeToUse);
    
    workerRef.current?.postMessage({ command: 'start' });
    tickLogic(); 
  }, [tickLogic, getBlockStats]);

  const pauseTimer = useCallback(async () => {
    setIsPaused(true);
    await cancelNotification();
    workerRef.current?.postMessage({ command: 'stop' });
    setStatus(AppStatus.IDLE);
    setTimeLeft(DEFAULT_INTERVAL_MS);
    localStorage.removeItem(STORAGE_KEY_TIMER_TARGET);
  }, []);

  const handleToggleTimer = () => {
      if (status === AppStatus.RUNNING) pauseTimer();
      else startTimer();
  };

  useEffect(() => {
    if (!hasOnboarded) return;
    const checkInterval = setInterval(() => {
        const shouldRun = isWithinSchedule();
        if (shouldRun && status === AppStatus.IDLE && !isPaused) startTimer();
    }, 2000);
    return () => clearInterval(checkInterval);
  }, [isWithinSchedule, status, startTimer, pauseTimer, hasOnboarded, isPaused]);

  const handleScheduleSave = (newSchedule: ScheduleConfig) => {
    const configWithEnabled = { ...newSchedule, enabled: true };
    setSchedule(configWithEnabled);
    localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(configWithEnabled));
    setIsSettingsModalOpen(false);
  };

  const handleOnboardingComplete = (goals: UserGoal[], config: ScheduleConfig) => {
      const configWithEnabled = { ...config, enabled: true };
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
      localStorage.setItem(STORAGE_KEY_GOAL, JSON.stringify(goals));
      const primaryGoal = goals[0] || 'FOCUS';
      const defaultPersona = primaryGoal === 'LIFE' ? 'KIND' : primaryGoal === 'BUSINESS' ? 'LOGIC' : 'TOUGH';
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
         if (currentMinutes >= startTotal && currentMinutes < endTotal) startTimer();
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

  // MOVE FILTERED LOGS HERE (Before using it)
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

  const { canGoBack, canGoForward } = useMemo(() => {
    if (logs.length === 0) return { canGoBack: false, canGoForward: false };
    const minTimestamp = Math.min(...logs.map(l => l.timestamp));
    const maxTimestamp = Date.now(); 
    const current = new Date(viewDate);
    let viewStart = 0;
    let viewEnd = 0;

    switch(filter) {
        case 'D':
            current.setHours(0,0,0,0);
            viewStart = current.getTime();
            viewEnd = viewStart + 86400000;
            break;
        case 'W':
            const day = current.getDay();
            const diff = current.getDate() - day + (day === 0 ? -6 : 1);
            current.setDate(diff);
            current.setHours(0,0,0,0);
            viewStart = current.getTime();
            viewEnd = viewStart + (7 * 86400000);
            break;
        case 'M':
            viewStart = new Date(current.getFullYear(), current.getMonth(), 1).getTime();
            viewEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0).getTime();
            break;
        case '3M':
            const qStartMonth = Math.floor(current.getMonth() / 3) * 3;
            const qStart = new Date(current.getFullYear(), qStartMonth, 1);
            viewStart = qStart.getTime();
            const qEnd = new Date(qStart);
            qEnd.setMonth(qEnd.getMonth() + 3);
            viewEnd = qEnd.getTime();
            break;
        case 'Y':
            viewStart = new Date(current.getFullYear(), 0, 1).getTime();
            viewEnd = new Date(current.getFullYear() + 1, 0, 1).getTime();
            break;
    }
    return { canGoBack: viewStart > minTimestamp, canGoForward: viewEnd < maxTimestamp };
  }, [viewDate, filter, logs]);

  // PERSISTENT RANK CALCULATION (Lifetime)
  const totalLifetimeWins = useMemo(() => logs.filter(l => l.type === 'WIN' && !l.isFrozenWin).length, [logs]);
  
  // CURRENT PERIOD RANK CALCULATION
  const currentPeriodWins = useMemo(() => filteredLogs.filter(l => l.type === 'WIN' && !l.isFrozenWin).length, [filteredLogs]);

  const handleManualLogStart = () => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    setIsManualEntry(true);
    setIsEntryModalOpen(true);
  };

  const handleLogSave = useCallback(async (text: string, type: 'WIN' | 'LOSS' = 'WIN', isFromNotification: boolean = false) => {
    let entryIsFrozen = false;
    let nextFreezeState = { ...freezeState };
    let overlayTitle = "";
    let overlaySub = "";

    if (type === 'LOSS') {
        nextFreezeState.lastLossTimestamp = Date.now();
        const lastEntry = logs[0];
        
        // --- FIRST LOSS TUTORIAL CHECK ---
        if (!hasSeenFreezeWarning) {
            setHasSeenFreezeWarning(true);
            localStorage.setItem(STORAGE_KEY_SEEN_FREEZE_WARNING, 'true');
            overlayTitle = "MOMENTUM BREACH";
            overlaySub = "WARNING: 2 LOSSES = RANK FREEZE. NEXT 15MIN IS CRITICAL.";
        } else if (lastEntry && lastEntry.type === 'LOSS') {
            nextFreezeState.isFrozen = true;
            nextFreezeState.recoveryWins = 0;
            overlayTitle = "RANK FROZEN";
            overlaySub = "DOWNWARD SPIRAL DETECTED. RANK GROWTH HALTED.";
        } else {
            overlayTitle = "MOMENTUM BREACH";
            overlaySub = "YOUR BRAIN IS SIGNALING A LOSS. PROTECT YOUR RANK.";
        }
    } else {
        if (freezeState.isFrozen) {
            entryIsFrozen = true;
            const nextWins = freezeState.recoveryWins + 1;
            nextFreezeState.recoveryWins = nextWins;
            if (nextWins >= 2) {
                nextFreezeState.isFrozen = false;
                nextFreezeState.recoveryWins = 0;
                overlayTitle = "WINNER EFFECT RESTORED";
                overlaySub = "RANK UNLOCKED. MOMENTUM REGAINED.";
            } else {
                overlayTitle = "RECOVERY IN PROGRESS";
                overlaySub = "ONE MORE WIN TO UNLOCK YOUR RANK.";
            }
        } else {
            nextFreezeState.recoveryWins = 0;
        }
    }

    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      text,
      type,
      isFrozenWin: entryIsFrozen
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(prev => [newLog, ...prev]);
    setFreezeState(nextFreezeState);
    setIsEntryModalOpen(false);
    setToast(prev => ({ ...prev, visible: false }));
    
    try { 
        const totalWinsForRank = updatedLogs.filter(l => l.type === 'WIN' && !l.isFrozenWin).length;

        if (type === 'WIN') {
            await Haptics.notification({ type: NotificationType.Success });
            setFeedbackState({ 
                visible: true, 
                totalWins: totalWinsForRank, 
                type: 'WIN',
                customTitle: overlayTitle,
                customSub: overlaySub
            });
        } else {
            await Haptics.impact({ style: ImpactStyle.Heavy });
            setFeedbackState({ 
                visible: true, 
                totalWins: totalWinsForRank, 
                type: 'LOSS',
                customTitle: overlayTitle,
                customSub: overlaySub
            });
        }
        // Auto-dismiss logic handled in FeedbackOverlay or App timeout
        setTimeout(() => setFeedbackState(prev => ({ ...prev, visible: false })), 3500); 
    } catch(e) {}

    localStorage.removeItem(STORAGE_KEY_TIMER_TARGET);
    setTimeLeft(DEFAULT_INTERVAL_MS);
    if (isWithinSchedule()) await startTimer(DEFAULT_INTERVAL_MS);
    else {
       setStatus(AppStatus.IDLE);
       setIsPaused(false);
    }
  }, [startTimer, isWithinSchedule, logs, freezeState, hasSeenFreezeWarning]);

  const handleLogClose = () => {
    setIsEntryModalOpen(false);
    setToast(prev => ({ ...prev, visible: false }));
    if (!isManualEntry) {
       setTimeLeft(DEFAULT_INTERVAL_MS);
       if (isWithinSchedule()) startTimer();
       else {
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
        if (notification.actionId === 'WIN_INPUT' && notification.inputValue) {
           handleLogSave(notification.inputValue, 'WIN', true);
           cancelNotification(); 
        } else if (notification.actionId === 'LOSS_INPUT' && notification.inputValue) {
           handleLogSave(notification.inputValue, 'LOSS', true);
           cancelNotification();
        } else if (notification.actionId === 'log_input' && notification.inputValue) {
           // Fallback for old notification type
           handleLogSave(notification.inputValue, 'WIN', true);
           cancelNotification();
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

  const canUpdateReport = useMemo(() => {
     if (!savedReportForView) return false;
     return filteredLogs.length !== savedReportForView.logCount;
  }, [savedReportForView, filteredLogs]);

  const handleGenerateAIReport = async () => {
      const goals = getStoredGoals();
      const persona = localStorage.getItem(STORAGE_KEY_PERSONA) as any || 'LOGIC';
      const periodMap: Record<FilterType, string> = { 'D': 'Day', 'W': 'Week', 'M': 'Month', '3M': 'Quarter', 'Y': 'Year' };
      setAiReportLoading(true);
      try {
        const content = await generateAIReport(filteredLogs, periodMap[filter], goals, persona, schedule, 'FULL');
        const key = getCurrentDateKey();
        const newReport: AIReport = {
            id: crypto.randomUUID(),
            dateKey: key,
            content: content,
            summary: savedReportForView?.summary || "Manual Analysis", 
            timestamp: Date.now(),
            period: filter,
            logCount: filteredLogs.length, 
            read: true 
        };
        setReports(prev => ({ ...prev, [key]: newReport }));
        setAiReportContent(content);
        try { Haptics.notification({ type: NotificationType.Success }); } catch(e) {}
      } catch (error) {
        setToast({ title: "Error", message: "Failed to generate report.", visible: true });
      } finally {
        setAiReportLoading(false);
      }
  };

  const handleOpenAIModal = () => {
      if (savedReportForView) {
          setAiReportContent(savedReportForView.content);
          if (savedReportForView.read === false) {
             const updatedReport = { ...savedReportForView, read: true };
             setReports(prev => ({ ...prev, [savedReportForView.dateKey]: updatedReport }));
          }
      } else setAiReportContent(null);
      setIsAIModalOpen(true);
  };

  if (!hasOnboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div className="min-h-screen font-sans pb-[env(safe-area-inset-bottom)] text-white relative">
      <div className="fixed inset-0 -z-50 bg-[#050505]" />
      <div className="fixed inset-0 -z-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2e3248] via-[#050505] to-[#000000]" />
      <div className="fixed inset-0 -z-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJnoiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2cpIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] opacity-[0.05] pointer-events-none mix-blend-overlay" />
      
      <div className="relative z-10">
        <header className={`fixed top-0 w-full z-40 transition-all duration-500 ease-in-out border-b pt-[calc(1.25rem+env(safe-area-inset-top))] px-5 pb-5 flex justify-between items-center ${isScrolled ? 'bg-black/80 backdrop-blur-xl border-white/10 shadow-2xl shadow-black/20' : 'bg-transparent border-transparent'}`} >
          <div className="relative flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl overflow-hidden transition-all duration-500">
               <img src="/icon.png" alt="App Icon" className="w-full h-full object-cover" />
             </div>
             <div className="flex flex-col">
               <span className="text-xl font-bold tracking-[0.1em] uppercase text-white leading-none">Winner</span>
               <span className="text-xl font-light tracking-[0.1em] uppercase text-white leading-none">Effect</span>
             </div>
          </div>
          <div className="flex items-center gap-3">
              <RankHUD 
                  totalWins={totalLifetimeWins} 
                  isFrozen={freezeState.isFrozen} 
                  onClick={() => {
                      try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
                      setIsRankModalOpen(true);
                  }}
              />
              <button onClick={() => { try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {} setIsSettingsModalOpen(true); }} className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-2.5 rounded-xl transition-all border border-zinc-800 hover:border-zinc-700" title="Settings" >
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              </button>
          </div>
        </header>
        <FeedbackOverlay 
          isVisible={feedbackState.visible} 
          totalWins={feedbackState.totalWins}
          type={feedbackState.type}
          customTitle={feedbackState.customTitle}
          customSub={feedbackState.customSub}
          isFrozen={freezeState.isFrozen}
          onDismiss={() => setFeedbackState(prev => ({ ...prev, visible: false }))}
        />
        <Toast title={toast.title} message={toast.message} isVisible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} />
        <main className="max-w-xl mx-auto p-5 pt-44 flex flex-col min-h-[calc(100vh-80px)]">
          <section className="flex-none mb-8">
              <StatusCard isActive={status === AppStatus.RUNNING} timeLeft={timeLeft} schedule={schedule} blockStats={blockStats} onToggle={handleToggleTimer} />
          </section>
          <section className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-white tracking-tight uppercase italic">Battle History</h2>
              <button onClick={handleManualLogStart} className="text-zinc-500 hover:text-yellow-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:border-yellow-500/20" >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Manual Win
              </button>
            </div>
            <StatsCard logs={filteredLogs} filter={filter} schedule={schedule} durationMs={DEFAULT_INTERVAL_MS} viewDate={viewDate} onNavigate={handleNavigate} onReset={handleResetView} isCurrentView={isCurrentView} canGoBack={canGoBack} canGoForward={canGoForward} />
            <div className="flex justify-center mb-6">
              <div className="bg-zinc-900 p-1 rounded-2xl flex items-center justify-between w-full border border-zinc-800">
                  {(['D', 'W', 'M', '3M', 'Y'] as FilterType[]).map((f) => (
                  <button key={f} onClick={() => { try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {} setFilter(f); setViewDate(new Date()); }} className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${ filter === f ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800' }`} >
                      {f}
                  </button>
                  ))}
              </div>
            </div>
            {filteredLogs.length > 0 && (
               <div className="flex items-center justify-between mb-6 px-1 gap-4">
                   <button onClick={() => { try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {} handleOpenAIModal(); }} className={`flex-1 flex items-center gap-3 py-3.5 px-5 rounded-2xl transition-all border ${savedReportForView ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-yellow-500 hover:border-yellow-500/30 hover:bg-zinc-800'}`} >
                      <div className={`p-1.5 rounded-lg transition-colors ${savedReportForView ? 'bg-yellow-500/20' : 'bg-zinc-800'}`}>
                          {savedReportForView ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                          ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                          )}
                      </div>
                      <div className="flex flex-col items-start">
                           <span className="text-[10px] font-black uppercase tracking-[0.2em] leading-none">{savedReportForView ? 'The Cornerman' : 'Get Insight'}</span>
                           {savedReportForView && savedReportForView.read === false && ( <span className="text-[8px] text-yellow-500/60 font-black uppercase tracking-widest leading-none mt-1.5 animate-pulse">New Tactical Analysis</span> )}
                           {!savedReportForView && ( <span className="text-[8px] opacity-40 font-black uppercase tracking-widest leading-none mt-1.5">Analyze Performance</span> )}
                      </div>
                   </button>
                   <button onClick={handleCopyClick} className="flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all active:scale-95 shadow-inner" title="Export Logs" >
                       {copyFeedback ? ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><polyline points="20 6 9 17 4 12"></polyline></svg> ) : ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> )}
                   </button>
               </div>
            )}
            <div className="flex-1"><LogList logs={filteredLogs} onDelete={deleteLog} /></div>
          </section>
        </main>
      </div>

      <EntryModal isOpen={isEntryModalOpen} onSave={handleLogSave} onClose={handleLogClose} isManual={isManualEntry} />
      <SettingsModal isOpen={isSettingsModalOpen} currentDurationMs={DEFAULT_INTERVAL_MS} logs={logs} schedule={schedule} onSave={() => {}} onSaveSchedule={handleScheduleSave} onClose={() => setIsSettingsModalOpen(false)} />
      <AIFeedbackModal isOpen={isAIModalOpen} isLoading={aiReportLoading} report={aiReportContent} isSaved={!!savedReportForView} canUpdate={canUpdateReport} period={filter === 'D' ? 'Daily' : filter === 'W' ? 'Weekly' : filter === 'M' ? 'Monthly' : 'Quarterly'} onClose={() => setIsAIModalOpen(false)} onGenerate={handleGenerateAIReport} />
      <RankHierarchyModal 
        isOpen={isRankModalOpen} 
        onClose={() => setIsRankModalOpen(false)} 
        currentWins={currentPeriodWins}
        period={filter === 'D' ? 'Daily' : filter === 'W' ? 'Weekly' : filter === 'M' ? 'Monthly' : 'Quarterly' + (filter === 'Y' ? ' (Year)' : '')}
      />
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
};

export default App;