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
import { LogEntry, AppStatus, DEFAULT_INTERVAL_MS, ScheduleConfig, UserGoal, AIReport, FreezeState, FilterType, AIPersona, DayPlan, AppTheme } from './types';
import { requestNotificationPermission, checkNotificationPermission, scheduleNotification, cancelNotification, registerNotificationActions, configureNotificationChannel, sendNotification, sendReportNotification, sendFeedbackNotification } from './utils/notifications';
import { generateAIReport, analyzeEntry } from './utils/aiService';
import TimerPlugin from './utils/nativeTimer';
import TutorialOverlay, { TutorialStep } from './components/TutorialOverlay';
import WeeklyDebrief from './components/WeeklyDebrief';

import StreakRepairModal from './components/StreakRepairModal';
import CommandView from './components/views/CommandView';
import PlanView from './components/views/PlanView';
import IntelView from './components/views/IntelView';
import BottomNav, { TabId } from './components/BottomNav';

const STORAGE_KEY_LOGS = 'ironlog_entries';
const STORAGE_KEY_INSURANCE = 'ironlog_streak_insurance';
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
const STORAGE_KEY_DAY_PLAN = 'ironlog_day_plan';

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
    const [activeTab, setActiveTab] = useState<TabId>('COMMAND');
    const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
    const [timeLeft, setTimeLeft] = useState(DEFAULT_INTERVAL_MS);
    const [cycleDuration, setCycleDuration] = useState(DEFAULT_INTERVAL_MS);
    const [breakUntil, setBreakUntil] = useState<number | null>(null);
    const [challengeStartDate, setChallengeStartDate] = useState<number | null>(null);
    const [persona, setPersona] = useState<AIPersona>(() => {
        return (localStorage.getItem(STORAGE_KEY_PERSONA) as AIPersona) || 'LOGIC';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_PERSONA, persona);
    }, [persona]);

    const [theme, setTheme] = useState<AppTheme>(() => {
        const stored = localStorage.getItem('ironlog_theme');
        if (stored) return stored as AppTheme;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        return 'light';
    });

    const [streakInsurance, setStreakInsurance] = useState<number>(() => {
        const stored = localStorage.getItem(STORAGE_KEY_INSURANCE);
        return stored ? parseInt(stored, 10) : 2; // Default 2 shields
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_INSURANCE, streakInsurance.toString());
    }, [streakInsurance]);

    useEffect(() => {
        localStorage.setItem('ironlog_theme', theme);
    }, [theme]);

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
    const [isWeeklyDebriefOpen, setIsWeeklyDebriefOpen] = useState(false);
    const [isRepairModalOpen, setIsRepairModalOpen] = useState(false);

    const [dayPlan, setDayPlan] = useState<DayPlan | null>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_DAY_PLAN);
            if (stored) {
                const parsed = JSON.parse(stored) as DayPlan;
                const todayKey = new Date().toISOString().split('T')[0];
                if (parsed.dateKey === todayKey) return parsed;
            }
        } catch (e) { }
        return null;
    });

    const handlePlanUpdate = useCallback((plan: DayPlan) => {
        setDayPlan(plan);
        localStorage.setItem(STORAGE_KEY_DAY_PLAN, JSON.stringify(plan));
    }, []);

    const [isTutorialActive, setIsTutorialActive] = useState(false);
    const [tutorialStepIndex, setTutorialStepIndex] = useState(0);
    const [tutorialPrefill, setTutorialPrefill] = useState<string | null>(null);

    const [intelAnimation, setIntelAnimation] = useState('animate-fade-in');

    const handleNavigateToIntel = useCallback(() => {
        setIntelAnimation('animate-swipe-left');
        setActiveTab('INTEL');
    }, []);

    useEffect(() => {
        if (activeTab !== 'INTEL') {
            setIntelAnimation('animate-fade-in');
        }
    }, [activeTab]);

    const tutorialSteps: TutorialStep[] = [
        { text: "Here's your dashboard. Let me show you around.", mood: 'IDLE' },
        { targetId: 'status-card', text: "This is your timer. Every 15 minutes, you log in and I grade it.", mood: 'PROCESSING' },
        {
            targetId: 'manual-entry-btn',
            text: "You can also log anytime. Tap this now.",
            mood: 'ASKING',
            waitForInteraction: true
        },
        {
            text: "Good. Your stats will build from here. Stay honest and I'll keep you sharp.",
            mood: 'WIN'
        }
    ];

    const handleTutorialNext = () => {
        if (tutorialStepIndex < tutorialSteps.length - 1) {
            setTutorialStepIndex(prev => prev + 1);
        } else {
            setIsTutorialActive(false);
            localStorage.setItem('ironlog_tutorial_complete', 'true');
        }
    };

    // blockStats logic exists below at line 665


    const currentStreak = useMemo(() => {
        const winsByDate = new Map<string, number>();

        // 1. Group wins by date
        logs.forEach(l => {
            if (l.type === 'WIN') {
                const dateStr = new Date(l.timestamp).toDateString();
                winsByDate.set(dateStr, (winsByDate.get(dateStr) || 0) + 1);
            }
        });

        // 2. Identify "Valid Streak Days" (>= 4 wins)
        const validStreakDates = new Set<string>();
        winsByDate.forEach((count, dateStr) => {
            if (count >= 4) {
                validStreakDates.add(dateStr);
            }
        });

        let streak = 0;
        const today = new Date();
        const todayStr = today.toDateString();

        // If we have met the quota today, count it.
        if (validStreakDates.has(todayStr)) streak++;

        let checkDate = new Date();
        // If quota not met today, check if streak is alive from yesterday
        if (streak === 0) {
            checkDate.setDate(today.getDate() - 1);
            if (!validStreakDates.has(checkDate.toDateString())) return 0;
            streak++; // Yesterday met quota, streak is active
        }

        // Count backwards
        for (let i = 1; i < 365; i++) {
            const d = new Date(checkDate);
            d.setDate(checkDate.getDate() - i);
            if (validStreakDates.has(d.toDateString())) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }, [logs]);

    // Check for broken streak on mount/logs change
    useEffect(() => {
        if (currentStreak === 0 && logs.length > 0 && streakInsurance > 0) {
            // Check if YESTERDAY was missed, but DAY BEFORE was valid.
            // 1. Get logs for yesterday
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toDateString();

            const yesterdayWins = logs.filter(l =>
                l.type === 'WIN' && new Date(l.timestamp).toDateString() === yesterdayStr
            ).length;

            if (yesterdayWins < 4) {
                // 2. Check Day Before Yesterday
                const dayBefore = new Date();
                dayBefore.setDate(dayBefore.getDate() - 2);
                const dayBeforeStr = dayBefore.toDateString();

                const dayBeforeWins = logs.filter(l =>
                    l.type === 'WIN' && new Date(l.timestamp).toDateString() === dayBeforeStr
                ).length;

                // Simple check: if we HAD a streak going (>=4 wins day before), offer repair
                // Or recursively check streak logic? 
                // Let's rely on the fact that if we had a streak, dayBeforeWins would likely be >= 4 (or covered by insurance)
                // Actually, currentStreak===0 means we lost it.

                if (dayBeforeWins >= 4) {
                    // Check if we already asked today? (avoid spam) - ignoring for now
                    // Only open if NOT already open
                    if (!isRepairModalOpen) setIsRepairModalOpen(true);
                }
            }
        }
    }, [currentStreak, logs.length, streakInsurance]);

    const handleRepairStreak = () => {
        if (streakInsurance > 0) {
            setStreakInsurance(prev => prev - 1);

            // Add a "WIN" log for yesterday at 23:59:59
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(23, 59, 59, 999);

            const newLog: LogEntry = {
                id: crypto.randomUUID(),
                timestamp: yesterday.getTime(),
                text: "Streak Insurance Auto-Save",
                type: 'WIN',
                category: 'OTHER',
                isInsuranceWin: true
            };

            setLogs(prev => [...prev, newLog]);
            setIsRepairModalOpen(false);
            try { Haptics.notification({ type: NotificationType.Success }); } catch (e) { }
            setToast({ title: 'Streak Saved!', message: 'Shield used to repair history.', visible: true });
        }
    };



    const [isRankModalOpen, setIsRankModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [aiReportLoading, setAiReportLoading] = useState(false);
    const [aiReportContent, setAiReportContent] = useState<string | null>(null);
    const [overrideReport, setOverrideReport] = useState<AIReport | null>(null);

    const [toast, setToast] = useState<{ title: string, message: string, visible: boolean, onAction?: () => void }>({ title: '', message: '', visible: false });

    const [feedbackState, setFeedbackState] = useState<{ visible: boolean, totalWins: number, type: 'WIN' | 'LOSS' | 'DRAW', customTitle?: string, customSub?: string, period?: string, aiMessage?: string | null }>({
        visible: false,
        totalWins: 0,
        type: 'WIN',
        period: 'D',
        aiMessage: null
    });
    const [copyFeedback, setCopyFeedback] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [flashWin, setFlashWin] = useState(false);

    const [filter, setFilter] = useState<FilterType>('D');
    const [viewDate, setViewDate] = useState<Date>(new Date());
    const [strategicPriority, setStrategicPriority] = useState<string>("");
    const [isEditingPriority, setIsEditingPriority] = useState(false);
    const [priorityInput, setPriorityInput] = useState("");
    const [priorityAnimation, setPriorityAnimation] = useState(false);

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
                    LocalNotifications.cancel({ notifications: [{ id: 1 }] }).catch(() => { });
                    LocalNotifications.cancel({ notifications: [{ id: 2 }] }).catch(() => { });
                }
            } catch (e) { }

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
                if (isPersonaModalOpen) { setIsPersonaModalOpen(false); return; } // Added for PersonaSelector
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

    const lastCheckedDateRef = useRef(new Date().toDateString());
    useEffect(() => {
        const today = new Date().toDateString();
        if (today !== lastCheckedDateRef.current) {
            // New day detected
            if (filter === 'D' && viewDate.toDateString() === lastCheckedDateRef.current) {
                setViewDate(new Date());
            }
            lastCheckedDateRef.current = today;
        }
    }, [minuteTick, viewDate, filter]);

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
            try { await TimerPlugin.cancelDailyStart(); } catch (e) { }
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

    const handleOnboardingComplete = (goals: UserGoal[], config: ScheduleConfig, priority?: string, startChallenge?: boolean, startWithWin?: boolean) => {
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

        if (startWithWin) {
            setTimeout(() => {
                handleLogSave("Protocol Initiated", 'WIN', true);
                setTimeout(() => setIsTutorialActive(true), 2000);
            }, 500);
        } else {
            setIsTutorialActive(true);
        }

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
        try { Haptics.notification({ type: NotificationType.Success }); } catch (e) { }
    };

    const handleNavigate = (direction: -1 | 1) => {
        const newDate = new Date(viewDate);
        if (filter === 'D') newDate.setDate(newDate.getDate() + direction);
        else if (filter === 'W') newDate.setDate(newDate.getDate() + (direction * 7));
        else if (filter === 'M') newDate.setMonth(newDate.getMonth() + direction);
        else if (filter === '3M') newDate.setMonth(newDate.getMonth() + (direction * 3));
        else if (filter === 'Y') newDate.setFullYear(newDate.getFullYear() + direction);
        setViewDate(newDate);
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
        setAiReportContent(null);
    };

    const handleResetView = () => {
        setViewDate(new Date());
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
        setAiReportContent(null);
    };

    const handlePrioritySave = () => {
        const trimmed = priorityInput.trim();
        setStrategicPriority(trimmed);
        localStorage.setItem('ironlog_strategic_priority', trimmed);
        setIsEditingPriority(false);
        setPriorityAnimation(true);
        setTimeout(() => setPriorityAnimation(false), 2000);
        try { Haptics.notification({ type: NotificationType.Success }); } catch (e) { }
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
                startOfWeek.setHours(0, 0, 0, 0);
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

        switch (filter) {
            case 'D':
                current.setHours(0, 0, 0, 0);
                viewStart = current.getTime();
                viewEnd = viewStart + 86400000;
                break;
            case 'W':
                const day = current.getDay();
                const diff = current.getDate() - day + (day === 0 ? -6 : 1);
                current.setDate(diff);
                current.setHours(0, 0, 0, 0);
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

    const totalLifetimeWins = useMemo(() => logs.filter(l => l.type === 'WIN' && !l.isInsuranceWin).length, [logs]);

    const dailyWins = useMemo(() => {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        return logs.filter(l => l.type === 'WIN' && !l.isInsuranceWin && l.timestamp >= startOfDay).length;
    }, [logs]);

    const currentPeriodWins = useMemo(() => filteredLogs.filter(l => l.type === 'WIN' && !l.isInsuranceWin).length, [filteredLogs]);

    const handleManualLogStart = () => {
        try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { }

        if (isTutorialActive && tutorialStepIndex === 2) {
            setIsTutorialActive(false);
            setTutorialPrefill("Completed system initialization and strategic planning");
        } else {
            setTutorialPrefill(null);
        }

        setIsManualEntry(true);
        setIsEntryModalOpen(true);
    };

    const handleLogSave = useCallback(async (text: string, type?: 'WIN' | 'LOSS' | 'DRAW', timestampOrIsNotification?: number | boolean, duration?: number, explicitEndTime?: number) => {
        let timestamp = Date.now();
        let isFromNotification = false;
        let finalDuration = duration;

        if (typeof timestampOrIsNotification === 'boolean') {
            isFromNotification = timestampOrIsNotification;
        } else if (typeof timestampOrIsNotification === 'number') {
            timestamp = timestampOrIsNotification;
        }

        const trimmedText = text.trim();
        if (!trimmedText && !type) return;

        if (editingLog) {
            const updatedLogs = logs.map(l => l.id === editingLog.id ? {
                ...l,
                text: trimmedText || l.text,
                type: type || l.type || 'WIN',
                timestamp: timestamp,
                duration: finalDuration
            } : l);
            setLogs(updatedLogs);
            setEditingLog(null);
            setIsEntryModalOpen(false);
            try { await Haptics.notification({ type: NotificationType.Success }); } catch (e) { }
            return;
        }

        setIsEntryModalOpen(false);
        setToast(prev => ({ ...prev, visible: false }));
        setTutorialPrefill(null);

        if (!isFromNotification) {
            setFeedbackState({
                visible: true,
                totalWins: dailyWins,
                type: 'WIN',
                period: 'D',
                customTitle: "ANALYZING...",
                customSub: "PROCESSING INTEL",
                aiMessage: "Analyzing data..."
            });
        }

        const strategic = localStorage.getItem('ironlog_strategic_priority') || undefined;
        let analysis = { category: 'OTHER', type: type || 'WIN', feedback: 'Log recorded.' };

        if (!type) {
            try {
                // Calculate Daily Stats for Context
                const startOfDay = new Date().setHours(0, 0, 0, 0);
                const todaysLogs = logs.filter(l => l.timestamp >= startOfDay);
                const wins = todaysLogs.filter(l => l.type === 'WIN').length;
                const losses = todaysLogs.filter(l => l.type === 'LOSS').length;
                const categoryBreakdown: Record<string, number> = {};
                todaysLogs.forEach(l => {
                    const cat = l.category || 'OTHER';
                    categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
                });
                const dailyStats = { wins, losses, categoryBreakdown };

                // @ts-ignore
                analysis = await analyzeEntry(trimmedText, strategic, persona, schedule, timestamp, logs.slice(0, 5), dailyStats);
            } catch (e) {
                console.error(e);
            }
        }

        // @ts-ignore
        const finalType = type || analysis.type;

        const newLog: LogEntry = {
            id: crypto.randomUUID(),
            timestamp: timestamp,
            text: trimmedText || (finalType === 'WIN' ? "Focused Work" : "Distracted"),
            type: finalType as 'WIN' | 'LOSS',
            // @ts-ignore
            category: analysis.category,
            isFrozenWin: false,
            duration: finalDuration
        };

        const updatedLogs = [newLog, ...logs];
        setLogs(prev => [newLog, ...prev]);

        if (!isFromNotification) {
            if (finalType === 'WIN') {
                try { await Haptics.notification({ type: NotificationType.Success }); } catch (e) { }
            } else if (finalType === 'DRAW') {
                try { await Haptics.notification({ type: NotificationType.Warning }); } catch (e) { }
            } else {
                try { await Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { }
            }

            const newDailyWins = updatedLogs.filter(l => l.type === 'WIN' && l.timestamp >= new Date().setHours(0, 0, 0, 0)).length;

            const title = finalType === 'WIN' ? "MISSION ACCOMPLISHED" : finalType === 'DRAW' ? "HOLDING PATTERN" : "BREACH DETECTED";

            setFeedbackState({
                visible: true,
                totalWins: newDailyWins,
                type: finalType as 'WIN' | 'LOSS' | 'DRAW',
                period: 'D',
                customTitle: title,
                customSub: (analysis.category || "LOGGED").toUpperCase(),
                aiMessage: analysis.feedback
            });
        } else {
            await sendFeedbackNotification(analysis.feedback);
        }

        // Update Daily Report silently
        const now = new Date();
        const dateKey = `D_${now.toISOString().substring(0, 10)}`;
        const existingReport = reports[dateKey];
        const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newEntryBlock = `[${timeStr}] [${analysis.category}] ${trimmedText} >> ${analysis.feedback}`;

        const finalContent = existingReport
            ? existingReport.content + "\n\n" + newEntryBlock
            : `TACTICAL LOG - ${now.toLocaleDateString()}\n================================\n\n${newEntryBlock}`;

        const newReport: AIReport = {
            id: existingReport?.id || crypto.randomUUID(),
            dateKey,
            content: finalContent,
            summary: existingReport?.summary || analysis.feedback,
            timestamp: Date.now(),
            period: 'D',
            logCount: (existingReport?.logCount || 0) + 1,
            read: true
        };
        setReports(prev => ({ ...prev, [dateKey]: newReport }));

        localStorage.removeItem(STORAGE_KEY_TIMER_TARGET);
        setTimeLeft(cycleDuration);
        if (isWithinSchedule()) await startTimer(cycleDuration, explicitEndTime);
        else {
            setStatus(AppStatus.IDLE);
            setIsPaused(false);
            scheduleNextStartNotification();
        }
    }, [startTimer, isWithinSchedule, logs, scheduleNextStartNotification, cycleDuration, editingLog, dailyWins, persona, reports]);

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
        try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { }
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
                        LocalNotifications.cancel({ notifications: [{ id: 1 }] }).catch(() => { });
                        LocalNotifications.cancel({ notifications: [{ id: 2 }] }).catch(() => { });
                        return;
                    }
                } catch (e) { }

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

            if (notification.actionId === 'log_input' && notification.inputValue) {
                handleLogSave(notification.inputValue, undefined, true);
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
                    LocalNotifications.cancel({ notifications: [{ id: 1 }] }).catch(() => { });
                    LocalNotifications.cancel({ notifications: [{ id: 2 }] }).catch(() => { });
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
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
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
                startOfWeek.setHours(0, 0, 0, 0);
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
        ).sort((a, b) => a.timestamp - b.timestamp);

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

            const content = await generateAIReport(todaysLogs, 'Day', goals, persona, schedule, 'FULL', priority, logs, dayPlan);
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
            try { Haptics.notification({ type: NotificationType.Success }); } catch (e) { }
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

    const initialEntryProp = useMemo(() => {
        if (editingLog) return { text: editingLog.text, type: editingLog.type || 'WIN', timestamp: editingLog.timestamp, duration: editingLog.duration };
        if (tutorialPrefill) return { text: tutorialPrefill, type: 'WIN' as const, timestamp: Date.now() };
        return null;
    }, [editingLog, tutorialPrefill]);

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

    const currentChallengeProgress = useMemo(() => {
        const dailyTarget = 4;
        const progress = Math.min(dailyWins, dailyTarget);
        return { wins: progress, target: dailyTarget, percent: (progress / dailyTarget) * 100 };
    }, [dailyWins]);

    if (!hasOnboarded) return <Onboarding onComplete={handleOnboardingComplete} />;

    const isDark = theme === 'dark';

    return (
        <div className={`min-h-screen transition-colors duration-500 selection:bg-green-500/30 ${isDark ? 'bg-black text-white' : 'bg-[#F4F5F7] text-zinc-900'}`}>

            <div className={`fixed inset-0 -z-50 transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-zinc-50'}`} />
            <div className={`fixed inset-0 pointer-events-none z-50 bg-green-500/20 transition-opacity duration-150 ease-out ${flashWin ? 'opacity-100' : 'opacity-0'}`} />

            <div className="relative z-10">
                <header className={`fixed top-0 w-full z-40 transition-all duration-500 ease-in-out pt-[calc(1.25rem+env(safe-area-inset-top))] px-5 pb-5 flex justify-between items-center border-b ${isDark ? 'bg-black' : 'bg-[#F4F5F7]'} ${isScrolled ? (isDark ? 'border-white/5' : 'border-zinc-200/50') : 'border-transparent'}`} >
                    <div className="relative flex items-center gap-3">
                        <div className="h-10 w-auto rounded-xl overflow-hidden transition-all duration-500">
                            <img src="/winner-effect-logo.png" alt="Winner Effect" className="h-full w-auto object-contain" />
                        </div>
                        <div className="hidden md:flex flex-col">
                            <span className={`text-xl font-bold tracking-[0.1em] uppercase leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>Winner</span>
                            <span className={`text-xl font-light tracking-[0.1em] uppercase leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>Effect</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <RankHUD
                            totalWins={dailyWins}
                            period="D"
                            isFrozen={freezeState.isFrozen}
                            dayStreak={currentStreak}
                            insurance={streakInsurance}
                            theme={theme}
                            iconOnly={true}
                            onClick={() => {
                                try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { }
                                setIsRankModalOpen(true);
                            }}
                        />
                        <button onClick={() => { try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { } setIsSettingsModalOpen(true); }} id="settings-btn" className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isDark ? 'bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white border-white/5 hover:border-white/10' : 'bg-white hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 border-zinc-200 hover:border-zinc-300'}`} title="Settings" >
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
                    onDismiss={() => {
                        setFeedbackState(prev => ({ ...prev, visible: false }));
                        if (tutorialStepIndex === 2 && !localStorage.getItem('ironlog_tutorial_complete')) {
                            setTutorialStepIndex(3);
                            setIsTutorialActive(true);
                        }
                    }}
                />
                <StreakRepairModal
                    isOpen={isRepairModalOpen}
                    onRepair={handleRepairStreak}
                    onDismiss={() => setIsRepairModalOpen(false)}
                    insuranceBalance={streakInsurance}
                    theme={theme}
                />

                <Toast title={toast.title} message={toast.message} isVisible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} onAction={toast.onAction} theme={theme} />
                <div className={`max-w-md mx-auto w-full relative pt-32 px-5 pb-20 ${activeTab === 'PLAN' ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
                    {activeTab === 'COMMAND' && (
                        <CommandView
                            status={status}
                            timeLeft={timeLeft}
                            schedule={schedule}
                            blockStats={blockStats}
                            onToggleTimer={handleToggleTimer}
                            onManualEntry={handleManualLogStart}
                            theme={theme}
                            strategicPriority={strategicPriority}
                            isEditingPriority={isEditingPriority}
                            priorityInput={priorityInput}
                            onPriorityEditStart={() => setIsEditingPriority(true)}
                            onPriorityInputChange={setPriorityInput}
                            onPrioritySave={handlePrioritySave}
                            priorityAnimation={priorityAnimation}
                            onWeeklyDebrief={() => setIsWeeklyDebriefOpen(true)}
                            recentLogs={logs}
                            onNavigateToIntel={handleNavigateToIntel}
                        />
                    )}

                    {activeTab === 'PLAN' && (
                        <PlanView
                            schedule={schedule}
                            logs={logs}
                            dayPlan={dayPlan}
                            onPlanUpdate={handlePlanUpdate}
                            theme={theme}
                        />
                    )}

                    {activeTab === 'INTEL' && (
                        <IntelView
                            logs={logs}
                            filteredLogs={filteredLogs}
                            allLogs={logs}
                            currentStreak={currentStreak}
                            theme={theme}
                            filter={filter}
                            setFilter={setFilter}
                            viewDate={viewDate}
                            setViewDate={setViewDate}
                            schedule={schedule}
                            onNavigate={handleNavigate}
                            onResetView={handleResetView}
                            isCurrentView={isCurrentView}
                            canGoBack={canGoBack}
                            canGoForward={canGoForward}
                            savedReportForView={savedReportForView}
                            onGenerateReport={handleGenerateAIReport}
                            onOpenAIModal={handleOpenAIModal}
                            onExport={handleCopyClick}
                            copyFeedback={copyFeedback}
                            onLogDelete={deleteLog}
                            onLogEdit={handleLogEdit}
                            animationClass={intelAnimation}
                        />
                    )}
                </div>
                <BottomNav activeTab={activeTab} onTabChange={setActiveTab} theme={theme} />

                <TutorialOverlay
                    isActive={isTutorialActive}
                    step={tutorialSteps[tutorialStepIndex]}
                    onNext={handleTutorialNext}
                />
                <EntryModal
                    isOpen={isEntryModalOpen}
                    initialEntry={editingLog}
                    onSave={handleLogSave}
                    onClose={() => { setIsEntryModalOpen(false); setIsManualEntry(false); setEditingLog(null); }}
                    isTutorial={isTutorialActive && tutorialStepIndex === 2}
                    theme={theme}
                />
                <SettingsModal
                    isOpen={isSettingsModalOpen}
                    currentDurationMs={cycleDuration}
                    currentTheme={theme}
                    logs={logs}
                    schedule={schedule}
                    breakUntil={breakUntil}
                    onSave={handleDurationSave}
                    onSaveSchedule={handleScheduleSave}
                    onSaveTheme={setTheme}
                    onTakeBreak={handleTakeBreak}
                    onLoadDemoData={handleLoadDemoData}
                    onOpenPersona={() => setIsPersonaModalOpen(true)}
                    onClose={() => setIsSettingsModalOpen(false)}
                />
                {
                    isPersonaModalOpen && (
                        <PersonaSelector
                            currentPersona={persona}
                            onSelect={(p) => {
                                setPersona(p);
                                setIsPersonaModalOpen(false);
                            }}
                            onClose={() => setIsPersonaModalOpen(false)}
                            theme={theme}
                        />
                    )
                }
                <ExportModal
                    isOpen={isExportModalOpen}
                    onClose={() => setIsExportModalOpen(false)}
                    logs={filteredLogs}
                    onSuccess={(msg) => setToast({ title: "Export Success", message: msg, visible: true })}
                    theme={theme}
                />
                <AIFeedbackModal isOpen={isAIModalOpen} isLoading={aiReportLoading} report={aiReportContent} isSaved={!!savedReportForView} canUpdate={canUpdateReport} period={'Daily'} onClose={() => { setIsAIModalOpen(false); setOverrideReport(null); }} onGenerate={handleGenerateAIReport} theme={theme} />
                <RankHierarchyModal
                    isOpen={isRankModalOpen}
                    onClose={() => setIsRankModalOpen(false)}
                    currentWins={dailyWins}
                    period="Daily"
                    theme={theme}
                />
                <WeeklyDebrief
                    isOpen={isWeeklyDebriefOpen}
                    logs={logs}
                    streak={currentStreak}
                    schedule={schedule}
                    onClose={() => setIsWeeklyDebriefOpen(false)}
                    theme={theme}
                />
                <div className="h-[env(safe-area-inset-bottom)]" />
            </div>
        </div>
    );
};

export default App;