import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LogEntry, ScheduleConfig, LogCategory, PlannedBlock, DayPlan } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface DayPlannerProps {
    schedule: ScheduleConfig;
    logs: LogEntry[];
    plan: DayPlan | null;
    onPlanUpdate: (plan: DayPlan) => void;
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

const CATEGORY_LABELS: Record<LogCategory, string> = {
    'MAKER': 'Deep Work',
    'MANAGER': 'Meetings',
    'R&D': 'Research',
    'FUEL': 'Break',
    'RECOVERY': 'Recovery',
    'BURN': 'Burnout',
    'OTHER': 'Other',
};

const getTodayKey = () => new Date().toISOString().split('T')[0];

const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
};

const addMinutes = (time: string, mins: number): string => {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + mins;
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
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

const DayPlanner: React.FC<DayPlannerProps> = ({ schedule, logs, plan, onPlanUpdate }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [editingSlot, setEditingSlot] = useState<string | null>(null);
    const [customLabel, setCustomLabel] = useState('');
    const currentSlotRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);

    const todayKey = getTodayKey();
    const isToday = plan?.dateKey === todayKey;
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
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
            {/* Header */}
            <button
                onClick={() => {
                    try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
                    setIsExpanded(!isExpanded);
                }}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-sm">
                        📋
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Day Plan</h3>
                            {!isExpanded && currentBlock && (
                                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${CATEGORY_COLORS[currentBlock.category]}`}>
                                    {currentBlock.label}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                            {plannedCount === 0
                                ? 'No plan set — tap to create'
                                : !isExpanded && currentBlock
                                    ? `Now: ${currentBlock.label}`
                                    : `${filledSlots}/${slots.length} blocks planned`
                            }
                            {adherence !== null && ` · ${adherence}% adherence`}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {adherence !== null && (
                        <span className={`text-xs font-black ${adherence >= 70 ? 'text-green-500' : adherence >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                            {adherence}%
                        </span>
                    )}
                    <svg
                        className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </button>

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
                                    className={`flex items-stretch gap-3 relative transition-all cursor-pointer ${isCurrent ? 'bg-white/5 rounded-lg -mx-1 px-1' : ''
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
                                    <div className={`w-12 flex-shrink-0 text-right py-2 ${showHourLabel ? 'text-[10px] font-black text-zinc-400' : 'text-[9px] text-zinc-600'
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
                                                            'bg-zinc-700'
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
                                                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-zinc-600 outline-none focus:border-zinc-500"
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
                                            <div className="text-zinc-700 text-[10px] font-mono">
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
