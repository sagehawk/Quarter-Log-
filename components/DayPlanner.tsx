import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LogEntry, ScheduleConfig, LogCategory, PlannedBlock, DayPlan, AppTheme } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface DayPlannerProps {
    schedule: ScheduleConfig;
    logs: LogEntry[];
    plan: DayPlan | null;
    onPlanUpdate: (plan: DayPlan) => void;
    theme?: AppTheme;
}

const PRESETS: { label: string; category: LogCategory; icon: string }[] = [
    { label: 'Deep Work', category: 'MAKER', icon: '🔨' },
    { label: 'Meetings', category: 'MANAGER', icon: '📞' },
    { label: 'Research', category: 'R&D', icon: '🔬' },
    { label: 'Break', category: 'FUEL', icon: '☕' },
    { label: 'Exercise', category: 'RECOVERY', icon: '💪' },
    { label: 'Admin', category: 'OTHER', icon: '📋' },
];

const CATEGORY_COLORS: Record<LogCategory, string> = {
    'MAKER': 'bg-purple-500/20 border-purple-500/30 text-purple-400',
    'MANAGER': 'bg-blue-500/20 border-blue-500/30 text-blue-400',
    'R&D': 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
    'FUEL': 'bg-amber-500/20 border-amber-500/30 text-amber-400',
    'RECOVERY': 'bg-green-500/20 border-green-500/30 text-green-400',
    'BURN': 'bg-red-500/20 border-red-500/30 text-red-400',
    'OTHER': 'bg-zinc-500/20 border-zinc-500/30 text-zinc-400',
};

const CATEGORY_DOT: Record<LogCategory, string> = {
    'MAKER': 'bg-purple-500',
    'MANAGER': 'bg-blue-500',
    'R&D': 'bg-cyan-500',
    'FUEL': 'bg-amber-500',
    'RECOVERY': 'bg-green-500',
    'BURN': 'bg-red-500',
    'OTHER': 'bg-zinc-500',
};

const getTodayKey = () => new Date().toISOString().split('T')[0];

const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
};

const generateSlots = (schedule: ScheduleConfig): string[] => {
    if (!schedule.enabled) return [];
    const slots: string[] = [];
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    for (let t = startMin; t < endMin; t += 15) {
        slots.push(`${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`);
    }
    return slots;
};

const getCurrentSlot = (): string => {
    const now = new Date();
    const h = now.getHours();
    const m = Math.floor(now.getMinutes() / 15) * 15;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const DayPlanner: React.FC<DayPlannerProps> = ({ schedule, logs, plan, onPlanUpdate, theme = 'dark' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [editingSlot, setEditingSlot] = useState<string | null>(null);
    const [customLabel, setCustomLabel] = useState('');
    const currentSlotRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDark = theme === 'dark';

    // Collapse on scroll away
    useEffect(() => {
        if (!isExpanded) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) {
                    setIsExpanded(false);
                    setEditingSlot(null);
                }
            },
            { threshold: 0 }
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, [isExpanded]);

    const todayKey = getTodayKey();
    const slots = useMemo(() => generateSlots(schedule), [schedule]);
    const currentSlot = getCurrentSlot();

    // Build block map for quick lookup
    const blockMap = useMemo(() => {
        const map: Record<string, PlannedBlock> = {};
        if (plan) {
            plan.blocks.forEach(b => { map[b.startTime] = b; });
        }
        return map;
    }, [plan]);

    // Match logs to slots
    const logMatchMap = useMemo(() => {
        const map: Record<string, LogEntry | null> = {};
        const todayLogs = logs.filter(l => {
            const d = new Date(l.timestamp);
            return d.toISOString().split('T')[0] === todayKey;
        });

        slots.forEach(slot => {
            const [h, m] = slot.split(':').map(Number);
            const slotStart = new Date();
            slotStart.setHours(h, m, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + 15 * 60 * 1000);

            const match = todayLogs.find(l => {
                const logTime = new Date(l.timestamp);
                return logTime >= slotStart && logTime < slotEnd;
            });
            map[slot] = match || null;
        });
        return map;
    }, [logs, slots, todayKey]);

    // Adherence calculation
    const adherence = useMemo(() => {
        if (!plan || plan.blocks.length === 0) return null;
        const pastBlocks = plan.blocks.filter(b => b.startTime < currentSlot);
        if (pastBlocks.length === 0) return null;

        let matched = 0;
        pastBlocks.forEach(b => {
            // Check if there was a WIN during this block
            // Logic simplified: if log exists and is WIN
            const log = logMatchMap[b.startTime];
            if (log && log.type === 'WIN') matched++;
        });
        return Math.round((matched / pastBlocks.length) * 100);
    }, [plan, logMatchMap, currentSlot]);

    // Scroll to current slot on expand
    useEffect(() => {
        if (isExpanded && currentSlotRef.current) {
            setTimeout(() => {
                currentSlotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        }
    }, [isExpanded]);

    const handlePresetSelect = (preset: typeof PRESETS[0]) => {
        if (!editingSlot) return;
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }

        const newBlock: PlannedBlock = {
            id: `${editingSlot}-${Date.now()}`,
            startTime: editingSlot,
            label: preset.label,
            category: preset.category,
        };

        const existingBlocks = plan?.blocks.filter(b => b.startTime !== editingSlot) || [];
        const updatedPlan: DayPlan = {
            dateKey: todayKey,
            blocks: [...existingBlocks, newBlock].sort((a, b) => a.startTime.localeCompare(b.startTime)),
            createdAt: plan?.createdAt || Date.now(),
        };
        onPlanUpdate(updatedPlan);
        setEditingSlot(null);
        setCustomLabel('');
    };

    const handleCustomSave = () => {
        if (!editingSlot || !customLabel.trim()) return;
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }

        const newBlock: PlannedBlock = {
            id: `${editingSlot}-${Date.now()}`,
            startTime: editingSlot,
            label: customLabel.trim(),
            category: 'OTHER',
        };

        const existingBlocks = plan?.blocks.filter(b => b.startTime !== editingSlot) || [];
        const updatedPlan: DayPlan = {
            dateKey: todayKey,
            blocks: [...existingBlocks, newBlock].sort((a, b) => a.startTime.localeCompare(b.startTime)),
            createdAt: plan?.createdAt || Date.now(),
        };
        onPlanUpdate(updatedPlan);
        setEditingSlot(null);
        setCustomLabel('');
    };

    const handleClearSlot = (slotTime: string) => {
        if (!plan) return;
        try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) { }
        const updatedPlan: DayPlan = {
            ...plan,
            blocks: plan.blocks.filter(b => b.startTime !== slotTime),
        };
        onPlanUpdate(updatedPlan);
    };

    const handleBlockPressStart = (slotTime: string) => {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            handleClearSlot(slotTime);
        }, 600);
    };

    const handleBlockPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const plannedCount = plan?.blocks.length || 0;
    const filledSlots = slots.filter(s => blockMap[s]).length;
    const currentBlock = blockMap[currentSlot] || null;

    if (slots.length === 0) return null;

    return (
        <div
            ref={containerRef}
            className={`transition-all duration-300 overflow-hidden relative ${isDark ? 'bg-zinc-900 border border-white/5' : 'bg-zinc-50 border border-zinc-200 shadow-sm'} rounded-3xl ${isExpanded ? 'max-h-[800px]' : 'max-h-[88px]'}`}
        >
            <div
                className={`p-6 flex items-center justify-between cursor-pointer sticky top-0 z-20 ${isDark ? 'bg-zinc-900' : 'bg-zinc-50'}`}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div>
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Tactical Plan</span>
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>{adherence ?? 0}% Adherence</span>
                        <div className={`text-[10px] px-2 py-0.5 rounded font-black uppercase ${!adherence ? 'bg-zinc-700 text-white' : adherence >= 80 ? 'bg-green-500 text-black' : adherence >= 50 ? 'bg-amber-500 text-black' : 'bg-red-500 text-white'}`}>
                            {adherence === null ? 'PENDING' : adherence >= 80 ? 'ELITE' : adherence >= 50 ? 'SOLID' : 'DRIFT'}
                        </div>
                    </div>
                </div>
                <button className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isExpanded ? 'bg-green-500 text-black rotate-180' : isDark ? 'bg-white/5 text-zinc-500 hover:text-white' : 'bg-zinc-100 text-zinc-400 hover:text-zinc-900'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
            </div>

            {/* Expanded Timeline */}
            {isExpanded && (
                <div className="px-4 pb-4 animate-fade-in">
                    {/* Timeline */}
                    <div className="relative max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
                        <div className="absolute left-[52px] top-0 bottom-0 w-px bg-zinc-800" />

                        {slots.map((slot, i) => {
                            const block = blockMap[slot];
                            const log = logMatchMap[slot];
                            const isCurrent = slot === currentSlot;
                            const isPast = slot < currentSlot;
                            const showHourLabel = i === 0 || slot.endsWith(':00');

                            let status: 'upcoming' | 'active' | 'win' | 'loss' | 'missed' | 'empty' = 'upcoming';
                            if (isCurrent) status = 'active';
                            else if (isPast && log?.type === 'WIN') status = 'win';
                            else if (isPast && log?.type === 'LOSS') status = 'loss';
                            else if (isPast && block && !log) status = 'missed';
                            else if (isPast) status = 'empty';

                            return (
                                <div
                                    key={slot}
                                    ref={isCurrent ? currentSlotRef : undefined}
                                    className={`flex items-stretch gap-3 relative transition-all cursor-pointer ${isCurrent ? (isDark ? 'bg-white/5 rounded-lg -mx-1 px-1' : 'bg-zinc-100 rounded-lg -mx-1 px-1') : ''
                                        }`}
                                    onClick={() => {
                                        if (isLongPress.current) {
                                            isLongPress.current = false;
                                            return;
                                        }
                                        setEditingSlot(prev => prev === slot ? null : slot);
                                        setCustomLabel(block ? block.label : '');
                                    }}
                                >
                                    {/* Time label */}
                                    <div className={`w-12 flex-shrink-0 text-right py-2 ${showHourLabel ? (isDark ? 'text-[10px] font-black text-zinc-400' : 'text-[10px] font-black text-zinc-500') : (isDark ? 'text-[9px] text-zinc-600' : 'text-[9px] text-zinc-400')
                                        }`}>
                                        {showHourLabel ? formatTime(slot) : formatTime(slot).replace(/ [AP]M/, '')}
                                    </div>

                                    {/* Timeline dot */}
                                    <div className="relative flex items-start pt-3 justify-center w-3 flex-shrink-0">
                                        <div className={`w-2 h-2 rounded-full z-10 transition-all ${isCurrent ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' :
                                            status === 'win' ? 'bg-green-500' :
                                                status === 'loss' ? 'bg-red-500' :
                                                    status === 'missed' ? 'bg-amber-500' :
                                                        block ? CATEGORY_DOT[block.category] :
                                                            isDark ? 'bg-zinc-700' : 'bg-zinc-300'
                                            }`} />
                                    </div>

                                    {/* Content */}
                                    <div className={`flex-1 py-1.5 min-h-[36px] flex items-center`}>
                                        {editingSlot === slot ? (
                                            // Editing this slot
                                            <div className="w-full animate-fade-in" onClick={e => e.stopPropagation()}>
                                                <div className="flex flex-wrap gap-1.5 mb-2">
                                                    {PRESETS.map(p => (
                                                        <button
                                                            key={p.label}
                                                            onClick={() => handlePresetSelect(p)}
                                                            className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all active:scale-95 ${CATEGORY_COLORS[p.category]}`}
                                                        >
                                                            {p.icon} {p.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Custom..."
                                                    value={customLabel}
                                                    onChange={e => setCustomLabel(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && handleCustomSave()}
                                                    className={`w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-zinc-500 ${isDark ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600' : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400'}`}
                                                />
                                            </div>
                                        ) : block ? (
                                            // Filled slot — long press to delete
                                            <div
                                                className="flex items-center justify-between w-full group select-none"
                                                onTouchStart={() => handleBlockPressStart(slot)}
                                                onTouchEnd={handleBlockPressEnd}
                                                onMouseDown={() => handleBlockPressStart(slot)}
                                                onMouseUp={handleBlockPressEnd}
                                                onMouseLeave={handleBlockPressEnd}
                                            >
                                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[block.category]}`}>
                                                    {block.label}
                                                </span>
                                                <div className="flex items-center gap-1.5">
                                                    {status === 'win' && <span className="text-green-500 text-xs">✓</span>}
                                                    {status === 'loss' && <span className="text-red-500 text-xs">✕</span>}
                                                    {status === 'missed' && <span className="text-amber-500 text-xs">—</span>}
                                                </div>
                                            </div>
                                        ) : (
                                            // Empty slot
                                            <div className={`${isDark ? 'text-zinc-700' : 'text-zinc-200'} text-[10px] font-mono`}>
                                                —
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DayPlanner;
