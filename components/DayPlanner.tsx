import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LogEntry, ScheduleConfig, LogCategory, PlannedBlock, DayPlan, AppTheme } from '../types';
import { ParsedLog, parseLogInput } from '../utils/logParser';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

interface DayPlannerProps {
    schedule: ScheduleConfig;
    logs: LogEntry[];
    plan: DayPlan | null;
    onPlanUpdate: (plan: DayPlan) => void;
    theme?: AppTheme;
    cycleDuration: number; // in ms
    onSlotClick?: (time: string, dateKey: string) => void; // For Reflection Mode
    loggingMode?: boolean;
    onLogAdd?: (log: LogEntry) => void;
    strategicPriority?: string;
    onShowFeedback?: (message: string) => void;
    onPlanVerify?: (text: string, type: 'WIN', duration: number, category: string, timestamp?: number) => void;
}



const CATEGORY_COLORS: Record<LogCategory, string> = {
    'DEEP WORK': 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    'MEETINGS': 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    'RESEARCH': 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
    'BREAK': 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    'EXERCISE': 'bg-green-500/20 border-green-500/30 text-green-400',
    'ADMIN': 'bg-zinc-500/20 border-zinc-500/30 text-zinc-400',
    'BURN': 'bg-red-500/20 border-red-500/30 text-red-400',
};

const CATEGORY_DOT: Record<LogCategory, string> = {
    'DEEP WORK': 'bg-purple-500',
    'MEETINGS': 'bg-blue-500',
    'RESEARCH': 'bg-cyan-500',
    'BREAK': 'bg-amber-500',
    'EXERCISE': 'bg-green-500',
    'ADMIN': 'bg-zinc-500',
    'BURN': 'bg-red-500',
};

const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
};

const generateSlots = (schedule: ScheduleConfig, intervalMs: number): string[] => {
    if (!schedule.enabled) return [];
    const intervalMin = Math.floor(intervalMs / 60000);
    const slots: string[] = [];
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);

    // Normalize minutes from start of day
    const startMin = startH * 60 + startM;
    let endMin = endH * 60 + endM;

    // Handle cross-midnight schedule
    if (endMin <= startMin) {
        endMin += 24 * 60;
    }

    for (let t = startMin; t < endMin; t += intervalMin) {
        const normalizedT = t % (24 * 60);
        const h = Math.floor(normalizedT / 60);
        const m = normalizedT % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    return slots;
};

const getCurrentSlot = (intervalMs: number): string => {
    const now = new Date();
    const intervalMin = Math.floor(intervalMs / 60000);
    const h = now.getHours();
    const totalMin = h * 60 + now.getMinutes();
    const alignedMin = Math.floor(totalMin / intervalMin) * intervalMin;

    const slotH = Math.floor(alignedMin / 60);
    const slotM = alignedMin % 60;

    return `${String(slotH).padStart(2, '0')}:${String(slotM).padStart(2, '0')}`;
};

const DayPlanner: React.FC<DayPlannerProps> = ({ schedule, logs, plan, onPlanUpdate, theme = 'dark', cycleDuration, onSlotClick, loggingMode, onLogAdd, strategicPriority, onShowFeedback, onPlanVerify }) => {
    const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
    const [customLabel, setCustomLabel] = useState('');
    const [dragon, setDragon] = useState('');
    const [pillars, setPillars] = useState<string[]>(['', '', '']);
    const [constraints, setConstraints] = useState<string[]>(['']);
    const [isPlanExpanded, setIsPlanExpanded] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const currentSlotRef = useRef<HTMLDivElement>(null);
    const firstEmptyRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [now, setNow] = useState(new Date());
    const isDark = theme === 'dark';

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (plan) {
            setDragon(plan.dragon || '');
            setPillars(plan.pillars && plan.pillars.length === 3 ? plan.pillars : ['', '', '']);
            setConstraints(plan.constraints && plan.constraints.length > 0 ? plan.constraints : ['']);
        } else {
            setDragon('');
            setPillars(['', '', '']);
            setConstraints(['']);
        }
    }, [plan]);

    // ... existing getTodayKey ...
    const getTodayKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const todayKey = getTodayKey(viewDate);
    const isToday = todayKey === getTodayKey(new Date());

    const savePlan = (updates: Partial<DayPlan>) => {
        const updatedPlan: DayPlan = {
            dateKey: todayKey,
            blocks: (plan && plan.dateKey === todayKey) ? plan.blocks : [],
            createdAt: (plan && plan.dateKey === todayKey) ? plan.createdAt : Date.now(),
            dragon: dragon,
            pillars: pillars,
            constraints: constraints,
            ...updates
        };
        onPlanUpdate(updatedPlan);
    };

    const handleDragonBlur = () => savePlan({ dragon });
    const handlePillarBlur = () => savePlan({ pillars });
    const handleConstraintBlur = () => savePlan({ constraints });

    const getSlotTimestamp = (slot: string) => {
        const [h, m] = slot.split(':').map(Number);
        const d = new Date(viewDate);
        d.setHours(h, m, 0, 0);

        // Handle Next-Day logic for cross-midnight schedules
        if (schedule.enabled) {
            const [startH, startM] = schedule.startTime.split(':').map(Number);
            const [endH, endM] = schedule.endTime.split(':').map(Number);

            // Check if schedule wraps (e.g. 22:00 -> 02:00)
            if (startH > endH || (startH === endH && startM > endM)) {
                // If the slot time is earlier than start time, it belongs to the next day
                if (h < startH) {
                    d.setDate(d.getDate() + 1);
                }
            }
        }
        return d.getTime();
    };

    const slots = useMemo(() => generateSlots(schedule, cycleDuration), [schedule, cycleDuration]);
    const currentSlot = getCurrentSlot(cycleDuration);

    // Unified Scroll Logic
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loggingMode && firstEmptyRef.current) {
                firstEmptyRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (currentSlotRef.current) {
                currentSlotRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else if (firstEmptyRef.current) {
                firstEmptyRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 100); // 100ms delay to ensure layout stability and prevent "bounce"

        return () => clearTimeout(timer);
    }, [viewDate, loggingMode]); // Only scroll when Date changes (includes mount)

    const handleSlotClickInternal = (slot: string, block: PlannedBlock | undefined) => {
        // If external handler exists (Reflection)
        if (onSlotClick) { onSlotClick(slot, todayKey); return; }

        // Always Selection Mode (Tap to Select/Deselect)
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }

        setSelectedSlots(prev => {
            const newSet = new Set(prev);
            if (newSet.has(slot)) newSet.delete(slot);
            else newSet.add(slot);
            return newSet;
        });
    };



    // Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'ArrowLeft') {
                const prev = new Date(viewDate);
                prev.setDate(prev.getDate() - 1);
                setViewDate(prev);
                try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
            } else if (e.key === 'ArrowRight') {
                const next = new Date(viewDate);
                next.setDate(next.getDate() + 1);
                setViewDate(next);
                try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [viewDate]);

    // Build block map for quick lookup
    const blockMap = useMemo(() => {
        const map: Record<string, PlannedBlock> = {};
        if (plan && plan.dateKey === todayKey) {
            plan.blocks.forEach(b => { map[b.startTime] = b; });
        }
        return map;
    }, [plan, todayKey]);

    // Match logs to slots
    const logMatchMap = useMemo(() => {
        const map: Record<string, LogEntry | null> = {};
        const dateLogs = logs.filter(l => {
            const d = new Date(l.timestamp);
            return d.toISOString().split('T')[0] === todayKey;
        });

        const intervalMin = Math.floor(cycleDuration / 60000);

        slots.forEach(slot => {
            const [h, m] = slot.split(':').map(Number);
            const slotStart = new Date(viewDate);
            slotStart.setHours(h, m, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + intervalMin * 60 * 1000);

            const match = dateLogs.find(l => {
                const logTime = new Date(l.timestamp);
                return logTime >= slotStart && logTime < slotEnd;
            });
            map[slot] = match || null;
        });
        return map;
    }, [logs, slots, todayKey, viewDate, cycleDuration]);

    // Adherence calculation (Updated to 100% / Total Slots)
    const adherence = useMemo(() => {
        if (!schedule.enabled || slots.length === 0) return 0;

        let verifiedWinCount = 0;
        slots.forEach(slot => {
            const log = logMatchMap[slot];
            const block = blockMap[slot];
            // Only assign points to plans that were planned then validated (Logged as WIN matches Block)
            if (log && log.type === 'WIN' && block) {
                verifiedWinCount++;
            }
        });

        const score = Math.round((verifiedWinCount / slots.length) * 100);
        return score;
    }, [slots, logMatchMap, schedule, blockMap]);

    const firstEmptySlotIndex = useMemo(() => {
        if (!isToday) return -1;
        const currentIdx = slots.indexOf(currentSlot);
        if (currentIdx === -1) return -1;

        for (let i = 0; i < currentIdx; i++) {
            const slot = slots[i];
            const block = blockMap[slot];
            const log = logMatchMap[slot];
            if (!block && !log) return i;
        }
        return -1;
    }, [slots, currentSlot, blockMap, logMatchMap, isToday]);

    // Initial scroll to current time or logging context




    const handleCustomSave = async () => {
        const slotsToUpdate = Array.from(selectedSlots);
        if (slotsToUpdate.length === 0 || !customLabel.trim()) return;

        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }

        // Start Loading State (could be improved with UI indicator)

        let parsed: ParsedLog | null = null;
        try {
            parsed = await parseLogInput(customLabel, strategicPriority);
        } catch (e) {
            console.error("Log parsing failed", e);
            // Fallback
            parsed = { text: customLabel, category: 'ADMIN', type: 'WIN' };
        }

        let currentBlocks = (plan && plan.dateKey === todayKey ? plan.blocks : []);


        const nowMs = Date.now();
        slotsToUpdate.forEach(slot => {
            // Remove existing for this slot
            currentBlocks = currentBlocks.filter(b => b.startTime !== slot);

            const newBlock: PlannedBlock = {
                id: `${slot}-${Date.now()}-${Math.random()}`,
                startTime: slot,
                label: parsed?.text || customLabel,
                category: parsed?.category || 'ADMIN',
            };
            currentBlocks.push(newBlock);

            const slotTs = getSlotTimestamp(slot);
            if (onLogAdd && slotTs <= nowMs + 60000) {
                onLogAdd({
                    id: `${Date.now()}-${Math.random()}`,
                    timestamp: slotTs,
                    text: parsed?.text || customLabel,
                    category: parsed?.category || 'ADMIN',
                    type: parsed?.type || 'WIN',
                    duration: cycleDuration
                });
            }
        });

        const updatedPlan: DayPlan = {
            dateKey: todayKey,
            blocks: currentBlocks.sort((a, b) => a.startTime.localeCompare(b.startTime)),
            createdAt: (plan && plan.dateKey === todayKey) ? plan.createdAt : Date.now(),
            dragon: dragon,
            pillars: pillars,
            constraints: constraints,
        };
        onPlanUpdate(updatedPlan);

        // onShowFeedback call removed to prevent AI toast on plan creation
        // If we have feedback, it is simply ignored for planned events as per user request.
        if (parsed?.feedback) {
            console.log("AI Feedback (Hidden):", parsed.feedback);
        }

        setSelectedSlots(new Set());
        setCustomLabel('');
    };

    const handleClearSlot = (slotTime: string) => {
        if (!plan || plan.dateKey !== todayKey) return;
        try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) { }
        const updatedPlan: DayPlan = {
            ...plan,
            blocks: plan.blocks.filter(b => b.startTime !== slotTime),
            dragon: dragon,
            pillars: pillars,
            constraints: constraints,
        };
        onPlanUpdate(updatedPlan);
    };

    if (slots.length === 0) return null;

    return (
        <div
            ref={containerRef}
            className="flex flex-col h-full bg-transparent"
        >
            <div className={`z-20 sticky top-0 transition-all ${isDark ? 'bg-black' : 'bg-[#F4F5F7]'}`}>
                {/* Date Navigation */}
                <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <button onClick={() => {
                        const prev = new Date(viewDate);
                        prev.setDate(prev.getDate() - 1);
                        setViewDate(prev);
                        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
                    }} className={`p-3 rounded-xl hover:bg-white/5 transition-all active:scale-95 ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>

                    <div className="flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-black uppercase tracking-[0.25em] ${isDark ? 'text-green-500' : 'text-green-600'}`}>
                            {isToday ? "ACTIVE MISSION" : "MISSION ARCHIVE"}
                        </span>
                        <span className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            {viewDate.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' })}
                        </span>

                    </div>

                    <button onClick={() => {
                        const next = new Date(viewDate);
                        next.setDate(next.getDate() + 1);
                        setViewDate(next);
                        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
                    }} className={`p-3 rounded-xl hover:bg-white/5 transition-all active:scale-95 ${isDark ? 'text-zinc-500 hover:text-white' : 'text-zinc-400 hover:text-zinc-600'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 pb-32 pl-1">

                {/* Scrollable Status Card (Protocol Adherence) */}
                <div className={`sticky top-0 z-30 px-4 py-2 transition-all border-b ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-[#F4F5F7] border-zinc-200'}`}>
                    <div className="flex items-center justify-between">
                        {/* Score */}
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Daily Score</span>
                            <span className={`text-2xl font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                {adherence ?? 0}%
                            </span>
                        </div>

                        {/* Pillars & Sacrifice */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                                {pillars.map((p, i) => {
                                    const isCompleted = plan?.pillarsCompleted?.[i];
                                    return (
                                        <div
                                            key={i}
                                            className={`w-2 h-2 rounded-full transition-colors ${isCompleted
                                                ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                                                : p
                                                    ? (isDark ? 'bg-blue-500/50' : 'bg-blue-600/50')
                                                    : (isDark ? 'bg-zinc-800' : 'bg-zinc-300')
                                                }`}
                                        />
                                    );
                                })}
                            </div>
                            <div className={`w-px h-3 ${isDark ? 'bg-zinc-800' : 'bg-zinc-300'}`} />
                            <span className={`text-[10px] font-mono font-bold ${plan?.constraintViolated
                                ? 'text-red-500 animate-pulse shadow-red-500/50 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                : (isDark ? 'text-zinc-600' : 'text-zinc-400')
                                }`}>
                                {plan?.constraintViolated ? 'FAILED' : 'SACRIFICE'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Timeline Container */}
                <div className="relative flex-1">
                    {/* Continuous Timeline Line */}
                    <div className={`absolute left-[60px] top-0 bottom-0 w-px ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

                    <div className="py-2 space-y-0.5">
                        {slots.map((slot, i) => {
                            const block = blockMap[slot];
                            const log = logMatchMap[slot];
                            const isCurrent = isToday && slot === currentSlot;

                            const nowSlotIdx = slots.indexOf(currentSlot);
                            const thisSlotIdx = i;
                            const isPast = isToday ? (thisSlotIdx < nowSlotIdx) : (new Date(todayKey) < new Date());

                            const showHourLabel = i === 0 || slot.endsWith(':00');

                            let status: 'upcoming' | 'active' | 'win' | 'loss' | 'missed' | 'empty' = 'upcoming';
                            if (isCurrent) status = 'active';
                            else if (isPast && log?.type === 'WIN') status = 'win';
                            else if (isPast && log?.type === 'LOSS') status = 'loss';
                            else if (isPast && block && !log) status = 'missed';
                            else if (isPast) status = 'empty';

                            // Yellow State Logic: Removed (User Request)
                            // const isYellowState = (isPast || isCurrent) && block && !log;

                            const isSelected = selectedSlots.has(slot);

                            // Check for Day Break (rollover from 23:xx to 00:xx)
                            const isNextDay = i > 0 && slot < slots[i - 1];

                            return (
                                <React.Fragment key={slot}>
                                    {isNextDay && (
                                        <div className="flex items-center gap-4 py-4 opacity-50">
                                            <div className="w-12 text-right text-[10px] font-bold tracking-wider text-zinc-500">NEXT DAY</div>
                                            <div className="flex-1 h-px bg-zinc-500/20 border-t border-dashed border-zinc-500/50"></div>
                                        </div>
                                    )}
                                    <div
                                        ref={i === firstEmptySlotIndex ? firstEmptyRef : (isCurrent ? currentSlotRef : undefined)}
                                        className={`flex items-start gap-0 relative group rounded-r-xl pr-0 transition-all ${isSelected
                                            ? (isDark ? 'bg-green-500/20' : 'bg-green-100')
                                            : isCurrent
                                                ? 'bg-transparent'
                                                : 'hover:bg-white/[0.02]'
                                            }`}
                                        onClick={() => {
                                            handleSlotClickInternal(slot, block);
                                        }}
                                    >
                                        {/* Horizontal Grid Line (Notebook Style) */}
                                        <div className={`absolute bottom-0 left-[48px] right-0 h-px ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`} />

                                        {/* Real-time Current Indicator (Google Cal Style) - Moved to Container Scope */}
                                        {isCurrent && (
                                            <div
                                                className="absolute left-[60px] right-0 z-50 flex items-center pointer-events-none"
                                                style={{
                                                    top: `${((now.getTime() % cycleDuration) / cycleDuration) * 100}%`,
                                                    transform: 'translateY(-50%)' // Center vertically on the exact time
                                                }}
                                            >
                                                {/* Left Dot (Centered on Axis) */}
                                                <div className="absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />

                                                {/* Horizontal Line */}
                                                <div className="h-[2px] w-full bg-green-500 shadow-[0_0_4px_rgba(34,197,94,0.4)]" />
                                            </div>
                                        )}

                                        {/* Time Column */}
                                        <div className={`w-14 flex-shrink-0 text-right pr-2 -mt-2.5 z-20 whitespace-nowrap ${showHourLabel
                                            ? `font-bold uppercase tracking-wider text-[11px] ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`
                                            : `text-[10px] font-mono ${isDark ? 'text-zinc-700 group-hover:text-zinc-500' : 'text-zinc-400 group-hover:text-zinc-500'}`
                                            }`}>
                                            {showHourLabel ? formatTime(slot) : slot.split(':')[1]}
                                        </div>

                                        {/* Timeline Node - Removed for flush fit */}
                                        {/* <div className="relative z-10 flex items-center justify-center w-2.5 h-2.5 flex-shrink-0" /> */}

                                        {/* Content Slot - Left Padding ensures start at 60px line */}
                                        <div className="flex-1 min-h-[36px] flex items-center relative py-0.5 pl-1">
                                            <div className="w-full pl-0 h-full">
                                                {(() => {
                                                    // Determine Background Color & Styles
                                                    let bgColor = 'bg-transparent';
                                                    let textColor = isDark ? 'text-zinc-400' : 'text-zinc-500';

                                                    if (block && log) {
                                                        // Verified Plan: Solid Category Color
                                                        bgColor = CATEGORY_DOT[block.category] || 'bg-zinc-500';
                                                        textColor = 'text-white';
                                                    } else if (block) {
                                                        // Planned Future: Tinted + Border (Outline Effect)
                                                        bgColor = CATEGORY_COLORS[block.category] || 'bg-zinc-500/20 border-zinc-500/30 text-zinc-400';
                                                        // Yellow State logic removed
                                                        // if (!isYellowState) textColor = '';
                                                    } else if (log) {
                                                        // Ad-hoc Log: Solid Category Color
                                                        bgColor = CATEGORY_DOT[log.category || 'ADMIN'] || 'bg-zinc-500';
                                                        textColor = 'text-white';
                                                    }

                                                    const containerClasses = `w-full h-full rounded-md px-2 flex items-center justify-between transition-all relative overflow-hidden border border-l-0 ${bgColor} ${block || log ? 'shadow-sm' : 'border-transparent'} ${isSelected ? 'ring-2 ring-offset-1 ring-blue-500 ring-offset-transparent' : ''}`;

                                                    if (block && log) {
                                                        return (
                                                            <div className={containerClasses}>
                                                                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-green-500 z-10" />
                                                                <div className="flex flex-col leading-none py-1 pl-2">
                                                                    <span className={`text-[10px] font-bold uppercase tracking-wider text-white/70`}>{block.category}</span>
                                                                    <span className={`text-xs font-bold text-white`}>{log.text}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    {log.type === 'WIN' && <span className="text-[10px] font-black italic text-white/90">+{Math.round(100 / slots.length)}%</span>}
                                                                    {log.pillarsMatches?.map(pIdx => (
                                                                        <div key={pIdx} className="w-3.5 h-3.5 rounded-full bg-white text-blue-600 flex items-center justify-center shadow-sm">
                                                                            <span className="text-[8px] font-bold relative top-[0.5px]">{pIdx}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    } else if (block) {
                                                        const isFuture = !isPast && !isCurrent;
                                                        return (
                                                            <div className={containerClasses}>
                                                                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-green-500 z-10" />
                                                                <div className="flex flex-col leading-none py-1 pl-2">
                                                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${textColor} opacity-70`}>{block.category}</span>
                                                                    <span className={`text-xs font-bold ${textColor}`}>{block.label}</span>
                                                                </div>

                                                                <div className="flex items-center gap-1 pr-2 relative z-20">
                                                                    {/* Present/Past: Verify Button */}
                                                                    {!isFuture && (
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                try { Haptics.notification({ type: NotificationType.Success }); } catch (e) { }
                                                                                if (onPlanVerify) {
                                                                                    onPlanVerify(block.label, 'WIN', cycleDuration, block.category, getSlotTimestamp(slot));
                                                                                }
                                                                            }}
                                                                            className={`p-1.5 rounded-md hover:bg-green-500 hover:text-white transition-colors text-green-500`}
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                                        </button>
                                                                    )}

                                                                    {/* Always: Delete Button */}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { }
                                                                            if (plan && onPlanUpdate) {
                                                                                const newBlocks = plan.blocks.filter(b => b.id !== block.id);
                                                                                onPlanUpdate({ ...plan, blocks: newBlocks });
                                                                            }
                                                                        }}
                                                                        className={`p-1.5 rounded-md hover:bg-red-500 hover:text-white transition-colors text-zinc-500`}
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    } else if (log) {
                                                        return (
                                                            <div className={containerClasses}>
                                                                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-green-500 z-10" />
                                                                <span className={`text-xs font-bold text-white py-1 pl-2`}>{log.text}</span>
                                                                <span className="text-[10px] font-black italic text-white/90">0%</span>
                                                            </div>
                                                        );
                                                    } else {
                                                        return <div className="h-full w-full flex items-center"></div>;
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
            {/* Bulk Action Bar */}
            {
                selectedSlots.size > 0 && (
                    <div className="absolute bottom-24 left-4 right-4 z-50 animate-slide-up">
                        <div className={`p-4 rounded-2xl shadow-2xl border backdrop-blur-xl ${isDark ? 'bg-zinc-900/90 border-white/10' : 'bg-white/90 border-zinc-200'}`}>

                            {/* Check/X Overrides for Yellow State */}
                            {/* We will implement specific Check/X buttons here if a yellow slot is selected */}
                            {(() => {
                                // Check if the selection is a single "Yellow State" block
                                if (selectedSlots.size === 1) {
                                    const slot = Array.from(selectedSlots)[0];
                                    const block = blockMap[slot];
                                    const log = logMatchMap[slot];
                                    const isCurrent = isToday && slot === currentSlot;
                                    const nowSlotIdx = slots.indexOf(currentSlot);
                                    const slotIdx = slots.indexOf(slot);
                                    const isPast = isToday ? (slotIdx < nowSlotIdx) : (new Date(todayKey) < new Date());

                                    if ((isPast || isCurrent) && block && !log) {
                                        return (
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1">
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>VERIFY MISSION</span>
                                                    <span className={`text-sm font-bold truncate block ${isDark ? 'text-white' : 'text-zinc-900'}`}>{block.label}</span>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) { }
                                                        // X Action: Clear the planned block
                                                        if (plan && onPlanUpdate && block) {
                                                            const newBlocks = plan.blocks.filter(b => b.id !== block.id);
                                                            onPlanUpdate({ ...plan, blocks: newBlocks });
                                                        }
                                                        setSelectedSlots(new Set());
                                                    }}
                                                    className={`p-3 rounded-xl border ${isDark ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-red-50 border-red-200 text-red-600'}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>

                                                <button
                                                    onClick={() => {
                                                        try { Haptics.notification({ type: NotificationType.Success }); } catch (e) { } // Success
                                                        // CHECK Action: Confirm as WIN
                                                        // DIRECT VERIFY
                                                        if (onPlanVerify) {
                                                            // Direct verify
                                                            onPlanVerify(block.label, 'WIN', cycleDuration, block.category, getSlotTimestamp(slot));
                                                            setSelectedSlots(new Set());
                                                            setCustomLabel('');
                                                        } else {
                                                            // Fallback to old behavior
                                                            setCustomLabel(block.label);
                                                            setTimeout(() => handleCustomSave(), 50);
                                                        }
                                                    }}
                                                    className={`p-3 rounded-xl bg-green-500 text-black shadow-[0_0_15px_rgba(34,197,94,0.4)]`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                                </button>
                                            </div>
                                        );
                                    }
                                }
                                return null;
                            })() || (
                                    <>
                                        <div className="flex items-center justify-between mb-3">
                                            <span className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                {selectedSlots.size} Slot{selectedSlots.size > 1 ? 's' : ''} Selected
                                            </span>
                                            <button onClick={() => { setSelectedSlots(new Set()); }} className="text-zinc-500 hover:text-white">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                        </div>

                                        <div className="flex gap-2 mb-3">
                                            <input
                                                type="text"
                                                placeholder="Bulk Mission Objective..."
                                                value={customLabel}
                                                onChange={e => setCustomLabel(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleCustomSave()}
                                                autoFocus
                                                className={`flex-1 bg-transparent border-b outline-none text-sm font-medium py-1 ${isDark ? 'text-white border-zinc-700 placeholder-zinc-600 focus:border-green-500' : 'text-zinc-900 border-zinc-300 placeholder-zinc-400 focus:border-zinc-900'}`}
                                            />
                                            <button
                                                onClick={handleCustomSave}
                                                disabled={!customLabel.trim()}
                                                className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${customLabel.trim()
                                                    ? 'bg-green-500 text-black hover:bg-green-400'
                                                    : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                                    }`}
                                            >
                                                SAVE
                                            </button>
                                        </div>
                                    </>
                                )}


                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DayPlanner;
