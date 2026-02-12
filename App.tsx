import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { Haptics, NotificationType, ImpactStyle } from '@capacitor/haptics';
import LogList from './components/LogList';
import EntryModal from './components/EntryModal';
import SettingsModal from './components/SettingsModal';
import AIFeedbackModal from './components/AIFeedbackModal';
import PersonaSelector from './components/PersonaSelector';
import FeedbackOverlay from './components/FeedbackOverlay';
import RankHUD from './components/RankHUD';
import RankHierarchyModal from './components/RankHierarchyModal';
import Toast from './components/Toast';
import StatsCard from './components/StatsCard';
import Onboarding from './components/Onboarding';
import ExportModal from './components/ExportModal';
import { generateDemoData } from './utils/demoData';
import StatusCard from './components/StatusCard';
import { LogEntry, AppStatus, DEFAULT_INTERVAL_MS, ScheduleConfig, UserGoal, AIReport, FreezeState, FilterType, AIPersona } from './types';
import { requestNotificationPermission, checkNotificationPermission, scheduleNotification, cancelNotification, registerNotificationActions, configureNotificationChannel, sendNotification, sendReportNotification, sendFeedbackNotification } from './utils/notifications';
import { generateAIReport, generateInstantFeedback, generateProtocolRecovery } from './utils/aiService';
import TimerPlugin from './utils/nativeTimer';

const STORAGE_KEY_LOGS = 'ironlog_entries';
const STORAGE_KEY_SCHEDULE = 'ironlog_schedule';
const STORAGE_KEY_ONBOARDED = 'ironlog_onboarded';
const STORAGE_KEY_GOAL = 'ironlog_goal'; 
const STORAGE_KEY_PERSONA = 'ironlog_persona';
const STORAGE_KEY_TIMER_TARGET = 'ironlog_timer_target';
const STORAGE_KEY_REPORTS = 'ironlog_ai_reports';
const STORAGE_KEY_FREEZE = 'ironlog_freeze_state';
const STORAGE_KEY_SEEN_FREEZE_WARNING = 'ironlog_seen_freeze_warning';
const STORAGE_KEY_CYCLE_DURATION = 'ironlog_cycle_duration';
const STORAGE_KEY_BREAK_UNTIL = 'ironlog_break_until';
const STORAGE_KEY_CHALLENGE_START = 'ironlog_challenge_start';

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
  const [cycleDuration, setCycleDuration] = useState(DEFAULT_INTERVAL_MS);
  const [breakUntil, setBreakUntil] = useState<number | null>(null);
  const [challengeStartDate, setChallengeStartDate] = useState<number | null>(null);
  const [persona, setPersona] = useState<AIPersona>('LOGIC');
  
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
  const [editingLog, setEditingLog] = useState<LogEntry | null>(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);

  // ...

  const currentStreak = useMemo(() => {
      const winsByDate = new Set<string>();
      logs.forEach(l => {
          if (l.type === 'WIN') {
              const dateStr = new Date(l.timestamp).toDateString();
              winsByDate.add(dateStr);
          }
      });

      let streak = 0;
      const today = new Date();
      // If we have a win today, count it. If not, check yesterday to start streak.
      if (winsByDate.has(today.toDateString())) streak++;
      
      let checkDate = new Date();
      if (streak === 0) {
           // If no win today yet, maybe streak is alive from yesterday
           checkDate.setDate(today.getDate() - 1);
           if (!winsByDate.has(checkDate.toDateString())) return 0;
           streak++; // Yesterday had a win, so streak is at least 1 (active)
      }

      // Count backwards
      for (let i = 1; i < 365; i++) {
          const d = new Date(checkDate);
          d.setDate(checkDate.getDate() - i);
          if (winsByDate.has(d.toDateString())) {
              streak++;
          } else {
              break;
          }
      }
      return streak;
  }, [logs]);
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [aiReportLoading, setAiReportLoading] = useState(false);
  const [aiReportContent, setAiReportContent] = useState<string | null>(null);
  const [overrideReport, setOverrideReport] = useState<AIReport | null>(null);

    const [toast, setToast] = useState<{title: string, message: string, visible: boolean, onAction?: () => void}>({ title: '', message: '', visible: false });

    const [feedbackState, setFeedbackState] = useState<{ visible: boolean, totalWins: number, type: 'WIN' | 'LOSS', customTitle?: string, customSub?: string, period?: string, aiMessage?: string | null }>({
        visible: false,
        totalWins: 0,
        type: 'WIN',
        period: 'D',
        aiMessage: null
    });
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [filter, setFilter] = useState<FilterType>('D');
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [strategicPriority, setStrategicPriority] = useState<string>("");
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [priorityInput, setPriorityInput] = useState("");

  const endTimeRef = useRef<number | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const statusRef = useRef(status);
  const lastNativeInputTime = useRef(0);
  const blockStatsRef = useRef({ total: 0, remaining: 0 });

  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const setupListener = async () => {
      try {
          const pending = await TimerPlugin.checkPendingLog();
          if (pending && pending.input) {
              lastNativeInputTime.current = Date.now();
              setIsEntryModalOpen(false);
              handleLogSave(pending.input, pending.type, true, undefined, pending.activeEndTime);
              LocalNotifications.cancel({ notifications: [{ id: 1 }] }).catch(() => {});
              LocalNotifications.cancel({ notifications: [{ id: 2 }] }).catch(() => {});
          }
      } catch (e) {}

      const handler = await CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) {
           if (statusRef.current === AppStatus.RUNNING && endTimeRef.current) {
               const remaining = endTimeRef.current - Date.now();
               if (remaining > 0) {
                   TimerPlugin.start({ 
                       duration: remaining,
                       totalCycles: blockStatsRef.current.total,
                       cyclesLeft: blockStatsRef.current.remaining
                   });
               }
           }
        } else {
           TimerPlugin.stop();
           if (Date.now() - lastNativeInputTime.current < 2000) return;
        }
      });
    };
    setupListener();
  }, []);

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

    const storedPersona = localStorage.getItem(STORAGE_KEY_PERSONA);
    if (storedPersona) setPersona(storedPersona as AIPersona);

    const storedSchedule = localStorage.getItem(STORAGE_KEY_SCHEDULE);
    if (storedSchedule) {
      try { 
          const parsed = JSON.parse(storedSchedule);
          setSchedule({ ...parsed, enabled: true }); 
      } catch (e) { console.error(e); }
    }

    const storedPriority = localStorage.getItem('ironlog_strategic_priority');
    if (storedPriority) {
        setStrategicPriority(storedPriority);
        setPriorityInput(storedPriority);
    }

    const storedDuration = localStorage.getItem(STORAGE_KEY_CYCLE_DURATION);
    if (storedDuration) setCycleDuration(parseInt(storedDuration, 10));

    const storedBreak = localStorage.getItem(STORAGE_KEY_BREAK_UNTIL);
    if (storedBreak) {
        const ts = parseInt(storedBreak, 10);
        if (ts > Date.now()) setBreakUntil(ts);
        else localStorage.removeItem(STORAGE_KEY_BREAK_UNTIL);
    }

    const storedChallenge = localStorage.getItem(STORAGE_KEY_CHALLENGE_START);
    if (storedChallenge) setChallengeStartDate(parseInt(storedChallenge, 10));
    
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
      if (breakUntil) localStorage.setItem(STORAGE_KEY_BREAK_UNTIL, breakUntil.toString());
      else localStorage.removeItem(STORAGE_KEY_BREAK_UNTIL);
  }, [breakUntil]);

  // Removed auto-generation effect for yesterday's report

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleDurationSave = (ms: number) => {
      setCycleDuration(ms);
      localStorage.setItem(STORAGE_KEY_CYCLE_DURATION, ms.toString());
      setIsSettingsModalOpen(false);
      if (status === AppStatus.IDLE) {
          setTimeLeft(ms);
      }
  };

  useEffect(() => {
      const setupBackListener = async () => {
          const handler = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
              if (isEntryModalOpen) { setIsEntryModalOpen(false); return; }
              if (isSettingsModalOpen) { setIsSettingsModalOpen(false); return; }
              if (isAIModalOpen) { setIsAIModalOpen(false); setOverrideReport(null); return; }
              if (isRankModalOpen) { setIsRankModalOpen(false); return; }
              if (isEditingPriority) { setIsEditingPriority(false); return; }
              
              CapacitorApp.exitApp();
          });
          return handler;
      };
      
      const handlerPromise = setupBackListener();
      
      return () => {
          handlerPromise.then(h => h.remove());
      };
  }, [isEntryModalOpen, isSettingsModalOpen, isAIModalOpen, isRankModalOpen, isEditingPriority]);

  const handleTakeBreak = (durationMs: number | null) => {
      if (durationMs === null) {
          setBreakUntil(null);
      } else {
          setBreakUntil(Date.now() + durationMs);
          pauseTimer();
      }
  };

  const isWithinSchedule = useCallback(() => {
    if (breakUntil && Date.now() < breakUntil) return false;
    const onboarded = localStorage.getItem(STORAGE_KEY_ONBOARDED);
    if (!onboarded || !schedule.enabled) return false;
    const now = new Date();
    const currentDay = now.getDay();
    if (!schedule.daysOfWeek.includes(currentDay)) return false;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const endTotal = endH * 60 + endM;
    
    if (startTotal <= endTotal) {
      return currentMinutes >= startTotal && currentMinutes < endTotal;
    } else {
      return currentMinutes >= startTotal || currentMinutes < endTotal;
    }
  }, [schedule, breakUntil]);

  const scheduleNextStartNotification = useCallback(async () => {
      if (!schedule.enabled || schedule.daysOfWeek.length === 0) return;
      
      const now = new Date();
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      
      for (let i = 0; i <= 7; i++) {
          const checkDate = new Date(now);
          checkDate.setDate(now.getDate() + i);
          
          if (schedule.daysOfWeek.includes(checkDate.getDay())) {
              const targetTime = new Date(checkDate);
              targetTime.setHours(startH, startM, 0, 0);
              
              if (targetTime.getTime() <= now.getTime()) continue;
              
              await scheduleNotification(
                  "Ready to Win?", 
                  "Time to start your priority tracking for the day.", 
                  targetTime.getTime() - now.getTime()
              );
              return;
          }
      }
  }, [schedule]);

  const [minuteTick, setMinuteTick] = useState(0);
  useEffect(() => {
      const i = setInterval(() => setMinuteTick(p => p + 1), 60000);
      return () => clearInterval(i);
  }, []);

  const getBlockStats = useCallback(() => {
    if (!schedule.enabled) return { total: 0, remaining: 0 };
    
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    const now = new Date();
    const currentTotal = now.getHours() * 60 + now.getMinutes();
    
    let totalDuration = endTotal - startTotal;
    if (totalDuration < 0) totalDuration += 1440; 

    if (totalDuration <= 0) return { total: 0, remaining: 0 };

    const totalBlocks = Math.floor(totalDuration / 15);
    
    let elapsed = 0;
    if (startTotal <= endTotal) {
        if (currentTotal >= startTotal) {
            elapsed = currentTotal - startTotal;
        }
    } else {
        if (currentTotal >= startTotal) {
            elapsed = currentTotal - startTotal;
        } else if (currentTotal < endTotal) {
            elapsed = (1440 - startTotal) + currentTotal;
        }
    }
    
    if (elapsed < 0) elapsed = 0;
    if (elapsed > totalDuration) elapsed = totalDuration;
    
    const usedBlocks = Math.floor(elapsed / 15);
    const remaining = Math.max(0, totalBlocks - usedBlocks);
    
    return { total: totalBlocks, remaining };
  }, [schedule]);

  const blockStats = useMemo(() => getBlockStats(), [getBlockStats, minuteTick]);
  useEffect(() => { blockStatsRef.current = blockStats; }, [blockStats]);

  const handleTimerComplete = useCallback(async () => {
    workerRef.current?.postMessage({ command: 'stop' });
    setStatus(AppStatus.WAITING_FOR_INPUT);
    localStorage.removeItem(STORAGE_KEY_TIMER_TARGET);
    setIsManualEntry(false);
    setIsEntryModalOpen(true);
  }, []);

  const scheduleNativeAutoStart = useCallback(async () => {
      if (!schedule.enabled) {
          try { await TimerPlugin.cancelDailyStart(); } catch(e) {}
          return;
      }
      
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      
      let totalDuration = endTotal - startTotal;
      if (totalDuration < 0) totalDuration += 1440;
      
      // Calculate cycles based on duration (convert ms to minutes)
      const durationMin = Math.floor(cycleDuration / 60000);
      const totalCycles = Math.floor(totalDuration / durationMin);
      
      try {
          await TimerPlugin.scheduleDailyStart({
              hour: startH,
              minute: startM,
              duration: cycleDuration,
              totalCycles: totalCycles
          });
          console.log(`Scheduled auto-start for ${startH}:${startM} with ${totalCycles} cycles`);
      } catch (e) {
          console.error("Failed to schedule auto-start", e);
      }
  }, [schedule, cycleDuration]);

  useEffect(() => {
      scheduleNativeAutoStart();
  }, [scheduleNativeAutoStart]);

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

  const startTimer = useCallback(async (overrideTime?: number, explicitEndTime?: number) => {
    setIsPaused(false);
    setStatus(AppStatus.RUNNING);
    
    const now = Date.now();
    let targetTime = 0;
    
    if (explicitEndTime && explicitEndTime > now) {
        targetTime = explicitEndTime;
    } else {
        const timeToUse = overrideTime ?? cycleDuration;
        targetTime = now + timeToUse;
    }
    
    endTimeRef.current = targetTime;
    localStorage.setItem(STORAGE_KEY_TIMER_TARGET, targetTime.toString());
    
    const stats = getBlockStats();
    await cancelNotification();
    
    const remaining = targetTime - now;
    if (remaining > 0) {
        TimerPlugin.start({ 
            duration: remaining,
            totalCycles: stats.total,
            cyclesLeft: stats.remaining
        });

        workerRef.current?.postMessage({ command: 'start' });
        setStatus(AppStatus.RUNNING);
        tickLogic(); 
    } else {
        handleTimerComplete();
    }
  }, [tickLogic, getBlockStats, cycleDuration, handleTimerComplete]);

  const pauseTimer = useCallback(async () => {
    setIsPaused(true);
    await cancelNotification();
    workerRef.current?.postMessage({ command: 'stop' });
    setStatus(AppStatus.IDLE);
    setTimeLeft(cycleDuration);
    localStorage.removeItem(STORAGE_KEY_TIMER_TARGET);
    scheduleNextStartNotification();
  }, [scheduleNextStartNotification, cycleDuration]);

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
    const storedPriority = localStorage.getItem('ironlog_strategic_priority');
    if (storedPriority) setStrategicPriority(storedPriority);
    setIsSettingsModalOpen(false);
  };

  const handleOnboardingComplete = (goals: UserGoal[], config: ScheduleConfig, priority?: string, startChallenge?: boolean) => {
      const configWithEnabled = { ...config, enabled: true };
      localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
      localStorage.setItem(STORAGE_KEY_GOAL, JSON.stringify(goals));
      localStorage.setItem(STORAGE_KEY_PERSONA, 'LOGIC');
      localStorage.setItem(STORAGE_KEY_SCHEDULE, JSON.stringify(configWithEnabled));
      if (priority) {
          localStorage.setItem('ironlog_strategic_priority', priority);
          setStrategicPriority(priority);
          setPriorityInput(priority);
      }
      if (startChallenge) {
          const now = Date.now();
          localStorage.setItem(STORAGE_KEY_CHALLENGE_START, now.toString());
          setChallengeStartDate(now);
      }
      setSchedule(configWithEnabled);
      setHasOnboarded(true);
      setTimeout(() => {
         const now = new Date();
         const currentMinutes = now.getHours() * 60 + now.getMinutes();
         const [startH, startM] = config.startTime.split(':').map(Number);
         const startTotal = startH * 60 + startM;
         const [endH, endM] = config.endTime.split(':').map(Number);
         const endTotal = endH * 60 + endM;
         
         let shouldStart = false;
         if (startTotal <= endTotal) {
             shouldStart = currentMinutes >= startTotal && currentMinutes < endTotal;
         } else {
             shouldStart = currentMinutes >= startTotal || currentMinutes < endTotal;
         }
         
         if (shouldStart) startTimer();
      }, 500);
  };

  const handlePersonaSave = (newPersona: AIPersona) => {
      setPersona(newPersona);
      localStorage.setItem(STORAGE_KEY_PERSONA, newPersona);
      setIsPersonaModalOpen(false);
      try { Haptics.notification({ type: NotificationType.Success }); } catch(e) {}
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

  const handlePrioritySave = () => {
      const trimmed = priorityInput.trim();
      setStrategicPriority(trimmed);
      localStorage.setItem('ironlog_strategic_priority', trimmed);
      setIsEditingPriority(false);
      try { Haptics.notification({ type: NotificationType.Success }); } catch(e) {}
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

  const totalLifetimeWins = useMemo(() => logs.filter(l => l.type === 'WIN' && !l.isFrozenWin).length, [logs]);
  
  const dailyWins = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return logs.filter(l => l.type === 'WIN' && !l.isFrozenWin && l.timestamp >= startOfDay).length;
  }, [logs]);
  
  const currentPeriodWins = useMemo(() => filteredLogs.filter(l => l.type === 'WIN' && !l.isFrozenWin).length, [filteredLogs]);

  const handleManualLogStart = () => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    setIsManualEntry(true);
    setIsEntryModalOpen(true);
  };

  const handleLogSave = useCallback(async (text: string, type: 'WIN' | 'LOSS' = 'WIN', timestampOrIsNotification?: number | boolean, duration?: number, explicitEndTime?: number) => {
    let timestamp = Date.now();
    let isFromNotification = false;
    let finalDuration = duration;

    if (typeof timestampOrIsNotification === 'boolean') {
        isFromNotification = timestampOrIsNotification;
    } else if (typeof timestampOrIsNotification === 'number') {
        timestamp = timestampOrIsNotification;
    }

    let finalText = text.trim();
    if (!finalText) {
        finalText = type === 'WIN' ? "Focused on priority" : "Distracted / Off-track";
    }

    if (editingLog) {
        const updatedLogs = logs.map(l => l.id === editingLog.id ? { 
            ...l, 
            text: finalText, 
            type,
            timestamp: timestamp, 
            duration: finalDuration 
        } : l);
        setLogs(updatedLogs);
        setEditingLog(null);
        setIsEntryModalOpen(false);
        try { await Haptics.notification({ type: NotificationType.Success }); } catch(e) {}
        return;
    }

    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: timestamp,
      text: finalText,
      type,
      isFrozenWin: false,
      duration: finalDuration
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(prev => [newLog, ...prev]);
    setIsEntryModalOpen(false);
    setToast(prev => ({ ...prev, visible: false }));
    
    try { 
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const dailyWins = updatedLogs.filter(l => l.type === 'WIN' && l.timestamp >= startOfDay).length;

        if (type === 'WIN' && !isFromNotification) {
            await Haptics.notification({ type: NotificationType.Success });
            setFeedbackState({ 
                visible: true, 
                totalWins: dailyWins, 
                type: 'WIN', 
                period: 'D',
                customTitle: "ANALYZING...",
                customSub: "CALCULATING NEXT STEP",
                aiMessage: "Analyzing data..."
            });
        } else if (!isFromNotification) {
            await Haptics.impact({ style: ImpactStyle.Medium });
            setFeedbackState({ 
                visible: true, 
                totalWins: dailyWins, 
                type: 'LOSS', 
                period: 'D',
                customTitle: "ANALYZING...",
                customSub: "RECALIBRATING...",
                aiMessage: "Analyzing data..."
            });
        }

        // Trigger AI Logic
        const runFeedback = async () => {
             const strategic = localStorage.getItem('ironlog_strategic_priority') || undefined;
             let feedback = "Processing...";
             
             if (type === 'LOSS') {
                 feedback = await generateProtocolRecovery(newLog, updatedLogs.slice(1, 10), strategic, persona);
             } else {
                 feedback = await generateInstantFeedback(newLog, updatedLogs.slice(1, 10), strategic, persona);
             }
             
             if (isFromNotification) {
                 await sendFeedbackNotification(feedback);
             } else {
                 setFeedbackState(prev => ({ 
                     ...prev, 
                     aiMessage: feedback,
                     customTitle: type === 'WIN' ? "COMPLETE" : "HALTED",
                     customSub: type === 'WIN' ? "CYCLE SECURED" : "RECALIBRATE"
                 }));
                 // Overlay remains until dismissed by user
             }

             // Update Daily Report silently by appending
             const dateKey = `D_${now.toISOString().substring(0, 10)}`;
             const existingReport = reports[dateKey];
             
             const timeStr = new Date(timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
             // Only append AI advice, not user log text
             const newEntryBlock = `[${timeStr}] >> ${feedback}`;
             
             const finalContent = existingReport 
                ? existingReport.content + "\n\n" + newEntryBlock 
                : `TACTICAL LOG - ${now.toLocaleDateString()}\n================================\n\n${newEntryBlock}`;
             
             const newReport: AIReport = {
                id: existingReport?.id || crypto.randomUUID(),
                dateKey,
                content: finalContent,
                summary: existingReport?.summary || feedback,
                timestamp: Date.now(),
                period: 'D',
                logCount: (existingReport?.logCount || 0) + 1,
                read: true 
             };
             
             setReports(prev => ({ ...prev, [dateKey]: newReport }));
             
             // Update live content if modal is open
             if (isAIModalOpen && filter === 'D') {
                 setAiReportContent(finalContent);
             }
        };
        runFeedback();

    } catch(e) {}

    localStorage.removeItem(STORAGE_KEY_TIMER_TARGET);
    setTimeLeft(cycleDuration);
    if (isWithinSchedule()) await startTimer(cycleDuration, explicitEndTime);
    else { 
       setStatus(AppStatus.IDLE);
       setIsPaused(false);
       scheduleNextStartNotification();
    }
  }, [startTimer, isWithinSchedule, logs, scheduleNextStartNotification, cycleDuration, editingLog, isAIModalOpen, filter, schedule]);

  const handleLogClose = () => {
    setIsEntryModalOpen(false);
    setEditingLog(null);
    setToast(prev => ({ ...prev, visible: false }));
    if (!isManualEntry && !editingLog) {
       setTimeLeft(cycleDuration);
       if (isWithinSchedule()) startTimer();
       else {
          setStatus(AppStatus.IDLE);
          setIsPaused(false);
          scheduleNextStartNotification();
       }
    }
  };

  const handleLogEdit = (log: LogEntry) => {
      setEditingLog(log);
      setIsEntryModalOpen(true);
  };

  const deleteLog = (id: string) => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    if (window.confirm("Delete this entry?")) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  useEffect(() => {
    const appStateSub = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (isActive) {
        if (Date.now() - lastNativeInputTime.current < 2000) return;
        try {
            const pending = await TimerPlugin.checkPendingLog();
            if (pending && pending.type) {
                lastNativeInputTime.current = Date.now();
                setIsEntryModalOpen(false);
                handleLogSave(pending.input || "", pending.type, true, undefined, pending.activeEndTime);
                LocalNotifications.cancel({ notifications: [{ id: 1 }] }).catch(() => {});
                LocalNotifications.cancel({ notifications: [{ id: 2 }] }).catch(() => {});
                return;
            }
        } catch(e) {}

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
        LocalNotifications.removeAllDeliveredNotifications();
        
        // Handle AI Report Click
        if (notification.notification.extra?.type === 'AI_REPORT' || notification.notification.id === 3) {
             const now = new Date();
             const dateKey = `D_${now.toISOString().substring(0, 10)}`;
             const report = reports[dateKey];
             
             if (report) {
                 setAiReportContent(report.content);
                 setOverrideReport(report);
                 setIsAIModalOpen(true);
             } else {
                 setToast({ title: "Report Error", message: "Could not load report.", visible: true });
             }
             return;
        }

        // Handle AI Feedback (Instant) Click
        if (notification.notification.extra?.type === 'AI_FEEDBACK' || notification.notification.id === 4) {
            const message = notification.notification.body;
            if (message) {
                setFeedbackState({ 
                    visible: true, 
                    totalWins: dailyWins, // rough estimate, state might be stale but acceptable for this view
                    type: 'WIN', // Assume win or generic for feedback display
                    period: 'D',
                    customTitle: "TACTICAL UPDATE",
                    customSub: "RECEIVED",
                    aiMessage: message
                });
                // Keep it visible for a bit longer or until dismissed
            }
            return;
        }

        if (notification.actionId === 'WIN_INPUT') {
           handleLogSave(notification.inputValue || "Focused on priority", 'WIN', true);
        } else if (notification.actionId === 'LOSS_INPUT') {
           handleLogSave(notification.inputValue || "Distracted / Off-track", 'LOSS', true);
        } else if (notification.actionId === 'log_input' && notification.inputValue) {
           handleLogSave(notification.inputValue, 'WIN', true);
        } else {
           setIsEntryModalOpen(true);
           setIsManualEntry(false); 
        }
    });

    const handleNativeInput = async () => {
        try {
            const pending = await TimerPlugin.checkPendingLog();
            if (pending && pending.type) {
                lastNativeInputTime.current = Date.now();
                setIsEntryModalOpen(false);
                handleLogSave(pending.input || "", pending.type, true, undefined, pending.activeEndTime);
                LocalNotifications.cancel({ notifications: [{ id: 1 }] }).catch(() => {});
                LocalNotifications.cancel({ notifications: [{ id: 2 }] }).catch(() => {});
            }
        } catch (e) { console.error(e); }
    };

    window.addEventListener('nativeLogInput', handleNativeInput);

    return () => {
      appStateSub.then(sub => sub.remove());
      notificationSub.then(sub => sub.remove());
      window.removeEventListener('nativeLogInput', handleNativeInput);
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
    setIsExportModalOpen(true);
  };

  const getCurrentDateKey = () => {
     const current = new Date(viewDate);
     if (filter === 'D') return `D_${current.toISOString().substring(0, 10)}`;
     return `D_${current.toISOString().substring(0, 10)}`; // Fallback
  };

  const savedReportForView = useMemo(() => {
      if (overrideReport) return overrideReport;
      
      if (filter === 'D') {
          const key = getCurrentDateKey();
          return reports[key] || null;
      }

      // Aggregate Logic for W, M, 3M, Y
      const current = new Date(viewDate);
      let startTime = 0; 
      let endTime = 0;
      switch (filter) {
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
        default: return null;
      }

      const dailyReports = Object.values(reports).filter(r => 
          r.period === 'D' && r.timestamp >= startTime && r.timestamp <= endTime
      ).sort((a,b) => a.timestamp - b.timestamp);
      
      if (dailyReports.length === 0) return null;
      
      return {
          id: 'aggregate',
          dateKey: 'AGGREGATE',
          content: dailyReports.map(r => `--- ${new Date(r.timestamp).toLocaleDateString()} ---\n${r.content}`).join('\n\n'),
          summary: "Aggregate Report",
          timestamp: Date.now(),
          period: filter,
          logCount: dailyReports.length,
          read: true
      } as AIReport;

  }, [viewDate, filter, reports, overrideReport]);

  const canUpdateReport = useMemo(() => {
     if (!savedReportForView) return false;
     if (savedReportForView.id === 'aggregate') return false; // Cannot manually regenerate aggregate
     return filteredLogs.length !== savedReportForView.logCount;
  }, [savedReportForView, filteredLogs]);

  const handleGenerateAIReport = async () => {
      if (filter !== 'D') return; // Only Daily allowed
      const goals = getStoredGoals();
      const priority = localStorage.getItem('ironlog_strategic_priority') || undefined;
      
      setAiReportLoading(true);
      try {
        // Enforce STRICT limit: Only logs from today
        const current = new Date(viewDate);
        const startOfDay = new Date(current.getFullYear(), current.getMonth(), current.getDate());
        const todaysLogs = logs.filter(l => l.timestamp >= startOfDay.getTime() && l.timestamp < startOfDay.getTime() + 86400000);

        const content = await generateAIReport(todaysLogs, 'Day', goals, persona, schedule, 'FULL', priority, logs);
        const key = getCurrentDateKey();
        const newReport: AIReport = {
            id: crypto.randomUUID(),
            dateKey: key,
            content: content,
            summary: savedReportForView?.summary || "Manual Analysis", 
            timestamp: Date.now(),
            period: filter,
            logCount: todaysLogs.length, 
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

  // Removed checkAndGenerateEndShiftReport logic

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

  const initialEntryProp = useMemo(() => 
    editingLog ? { text: editingLog.text, type: editingLog.type || 'WIN', timestamp: editingLog.timestamp, duration: editingLog.duration } : null
  , [editingLog]);

  const handleLoadDemoData = () => {
      if (confirm("Load Demo Data? This will replace current logs.")) {
          const demoLogs = generateDemoData();
          setLogs(demoLogs);
          setToast({ title: "Demo Data Loaded", message: "System populated with simulation data.", visible: true });
          setIsSettingsModalOpen(false);
      }
  };

  const currentChallengeDay = useMemo(() => {
    if (!challengeStartDate) return 0;
    const diff = Date.now() - challengeStartDate;
    return Math.floor(diff / 86400000) + 1;
  }, [challengeStartDate]);

  if (!hasOnboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

  return (
    <div className="min-h-screen font-sans pb-[env(safe-area-inset-bottom)] text-white relative">
      <div className="fixed inset-0 -z-50 bg-[#050505]" />
      <div className="fixed inset-0 -z-40 bg-[linear-gradient(160deg,_#2a220a_0%,_#050505_40%,_#000000_100%)]" />
      <div className="fixed inset-0 -z-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJnoiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2cpIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] opacity-[0.05] pointer-events-none mix-blend-overlay" />
      
      <div className="relative z-10">
        <header className={`fixed top-0 w-full z-40 transition-all duration-500 ease-in-out pt-[calc(1.25rem+env(safe-area-inset-top))] px-5 pb-5 flex justify-between items-center border-b ${isScrolled ? 'bg-[#050505]/80 backdrop-blur-md border-white/5' : 'border-transparent'}`} >
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
                  totalWins={dailyWins} 
                  period="D"
                  isFrozen={freezeState.isFrozen} 
                  onClick={() => {
                      try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
                      setIsRankModalOpen(true);
                  }}
              />
              <button onClick={() => { try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {} setIsSettingsModalOpen(true); }} className="text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-zinc-800 p-2.5 rounded-xl transition-all border border-white/5 hover:border-white/10" title="Settings" >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              </button>
          </div>
        </header>
        <FeedbackOverlay 
          isVisible={feedbackState.visible} 
          totalWins={feedbackState.totalWins}
          type={feedbackState.type}
          customTitle={feedbackState.customTitle}
          customSub={feedbackState.customSub}
          aiMessage={feedbackState.aiMessage}
          period={feedbackState.period}
          isFrozen={freezeState.isFrozen}
          onDismiss={() => setFeedbackState(prev => ({ ...prev, visible: false }))}
        />
        <Toast title={toast.title} message={toast.message} isVisible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} onAction={toast.onAction} />
        <main className="max-w-xl mx-auto p-5 pt-44 flex flex-col min-h-[calc(100vh-80px)]">
          {/* Challenge Banner */}
          {currentChallengeDay > 0 && currentChallengeDay <= 7 && (
              <div className="mb-6 p-1 rounded-2xl bg-gradient-to-r from-yellow-500/20 via-yellow-500/10 to-transparent border border-yellow-500/20 animate-fade-in relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20" />
                  <div className="flex items-center justify-between px-4 py-3 relative z-10">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-black font-black text-lg shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                              {currentChallengeDay}
                          </div>
                          <div className="flex flex-col">
                              <span className="text-xs font-black uppercase tracking-[0.2em] text-yellow-500">Dopamine Detox</span>
                              <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Day {currentChallengeDay} of 7</span>
                          </div>
                      </div>
                      <div className="h-1 flex-1 max-w-[80px] bg-white/10 rounded-full ml-4 overflow-hidden">
                          <div className="h-full bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.8)]" style={{ width: `${(currentChallengeDay / 7) * 100}%` }} />
                      </div>
                  </div>
              </div>
          )}

          {/* Strategic Priority / North Star */}
          <section className="mb-6 group">
              {isEditingPriority ? (
                  <div className="bg-black border border-yellow-500/50 rounded-3xl p-1 shadow-[0_0_30px_rgba(234,179,8,0.15)] animate-fade-in relative overflow-hidden">
                      <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none" />
                      <textarea 
                        value={priorityInput}
                        onChange={(e) => setPriorityInput(e.target.value)}
                        className="w-full bg-transparent text-white font-black text-2xl p-6 outline-none resize-none italic tracking-tight placeholder:text-white/20 relative z-10"
                        placeholder="Define your objective..."
                        rows={3}
                        autoFocus
                        onBlur={handlePrioritySave}
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handlePrioritySave(); } }}
                      />
                      <div className="absolute bottom-4 right-4 z-20">
                           <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500 bg-black/50 px-2 py-1 rounded backdrop-blur-md">Press Enter</span>
                      </div>
                  </div>
              ) : (
                  <button 
                    onClick={() => {
                        try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
                        setIsEditingPriority(true);
                    }}
                    className="w-full text-left bg-gradient-to-br from-white/10 to-black border border-yellow-500/20 rounded-3xl p-6 transition-all active:scale-[0.98] shadow-2xl relative overflow-hidden group"
                  >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-yellow-500/20 transition-all" />

                      <div className="flex items-center justify-between mb-3 relative z-10">
                          <span className="text-xs font-black uppercase tracking-[0.3em] text-yellow-500 italic drop-shadow-sm flex items-center gap-2">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                              North Star
                          </span>
                          
                      </div>
                      <div className={`text-2xl font-black italic tracking-tighter leading-none relative z-10 ${strategicPriority ? 'text-white drop-shadow-lg' : 'text-white/20'}`}>
                          {strategicPriority || "DEFINE YOUR PRIMARY OBJECTIVE"}
                      </div>
                  </button>
              )}
          </section>

          <section className="flex-none mb-8">
              <StatusCard isActive={status === AppStatus.RUNNING} timeLeft={timeLeft} schedule={schedule} blockStats={blockStats} onToggle={handleToggleTimer} />
          </section>
          <section className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Priority Log</h2>
              <button onClick={handleManualLogStart} className="text-zinc-500 hover:text-yellow-500 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 hover:border-yellow-500/20" >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                Manual Entry
              </button>
            </div>
            <StatsCard logs={filteredLogs} filter={filter} schedule={schedule} durationMs={DEFAULT_INTERVAL_MS} viewDate={viewDate} onNavigate={handleNavigate} onReset={handleResetView} isCurrentView={isCurrentView} canGoBack={canGoBack} canGoForward={canGoForward} />
            <div className="flex justify-center mb-6">
              <div className="bg-zinc-900 p-1.5 rounded-2xl flex items-center justify-between w-full border border-zinc-800">
                  {(['D', 'W', 'M', '3M', 'Y'] as FilterType[]).map((f) => (
                  <button key={f} onClick={() => { try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {} setFilter(f); setViewDate(new Date()); }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${ filter === f ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800' }`} >
                      {f}
                  </button>
                  ))}
              </div>
            </div>
            {filteredLogs.length > 0 && (
               <div className="flex items-center justify-between mb-6 px-1 gap-4">
                   {savedReportForView ? (
                     <button onClick={() => { try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {} handleOpenAIModal(); }} className="flex-1 flex items-center gap-3 py-4 px-6 rounded-2xl transition-all border bg-yellow-500/10 border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/20" >
                        <div className="p-2 rounded-lg transition-colors bg-yellow-500/20">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </div>
                        <div className="flex flex-col items-start">
                             <span className="text-sm font-black uppercase tracking-[0.2em] leading-none">Tactical Intel</span>
                             {savedReportForView.read === false && ( <span className="text-xs text-yellow-500/60 font-black uppercase tracking-widest leading-none mt-2 animate-pulse">New Tactical Analysis</span> )}
                        </div>
                     </button>
                   ) : (
                     <button onClick={() => { try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {} handleGenerateAIReport(); }} className="flex-0 p-4 rounded-2xl transition-all border bg-zinc-900 border-zinc-800 text-zinc-600 hover:text-white hover:bg-zinc-800" title="Generate Insight">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                     </button>
                   )}
                   <button onClick={handleCopyClick} className={`flex items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 transition-all active:scale-95 shadow-inner ${savedReportForView ? 'w-14 h-14' : 'flex-1 py-4 px-6'}`} title="Export Logs" >
                       <div className="flex items-center gap-2">
                           {copyFeedback ? ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500"><polyline points="20 6 9 17 4 12"></polyline></svg> ) : ( <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> )}
                           {!savedReportForView && <span className="text-sm font-black uppercase tracking-[0.2em] leading-none">EXPORT DATA</span>}
                       </div>
                   </button>
               </div>
            )}
            <div className="flex-1"><LogList logs={filteredLogs} onDelete={deleteLog} onEdit={handleLogEdit} /></div>
          </section>
        </main>
      </div>

      <EntryModal 
        isOpen={isEntryModalOpen} 
        onSave={handleLogSave} 
        onClose={handleLogClose} 
        isManual={isManualEntry} 
        initialEntry={initialEntryProp} 
        defaultDuration={cycleDuration}
      />
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        currentDurationMs={cycleDuration} 
        logs={logs} 
        schedule={schedule} 
        breakUntil={breakUntil}
        onSave={handleDurationSave} 
        onSaveSchedule={handleScheduleSave} 
        onTakeBreak={handleTakeBreak}
        onLoadDemoData={handleLoadDemoData}
        onOpenPersona={() => setIsPersonaModalOpen(true)}
        onClose={() => setIsSettingsModalOpen(false)} 
      />
      <PersonaSelector 
        isOpen={isPersonaModalOpen}
        currentPersona={persona}
        currentStreak={currentStreak}
        onSelect={handlePersonaSave}
        onClose={() => setIsPersonaModalOpen(false)}
      />
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        logs={filteredLogs}
        onSuccess={(msg) => setToast({ title: "Export Success", message: msg, visible: true })}
      />
      <AIFeedbackModal isOpen={isAIModalOpen} isLoading={aiReportLoading} report={aiReportContent} isSaved={!!savedReportForView} canUpdate={canUpdateReport} period={'Daily'} onClose={() => { setIsAIModalOpen(false); setOverrideReport(null); }} onGenerate={handleGenerateAIReport} />
      <RankHierarchyModal 
        isOpen={isRankModalOpen} 
        onClose={() => setIsRankModalOpen(false)} 
        currentWins={dailyWins}
        period="Daily"
      />
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
};

export default App;