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
    const [editingSlot, setEditingSlot] = useState<string | null>(null);
    const [customLabel, setCustomLabel] = useState('');
    const currentSlotRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const isDark = theme === 'dark';

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
        const relevantBlocks = plan.blocks.filter(b => b.startTime < currentSlot);
        const currentBlock = plan.blocks.find(b => b.startTime === currentSlot);
        const currentLog = currentBlock ? logMatchMap[currentBlock.startTime] : null;

        if (currentBlock && currentLog && currentLog.type === 'WIN') {
            relevantBlocks.push(currentBlock);
        }

        if (relevantBlocks.length === 0) return null;

        let matched = 0;
        relevantBlocks.forEach(b => {
            const log = logMatchMap[b.startTime];
            if (log && log.type === 'WIN') matched++;
        });
        return Math.round((matched / relevantBlocks.length) * 100);
    }, [plan, logMatchMap, currentSlot]);

    // Initial scroll to current time
    useEffect(() => {
        if (currentSlotRef.current) {
            setTimeout(() => {
                currentSlotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 500);
        }
    }, []);

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

    const plannedCount = plan?.blocks.length || 0;
    const filledSlots = slots.filter(s => blockMap[s]).length;
    const currentBlock = blockMap[currentSlot] || null;

    if (slots.length === 0) return null;

    return (
        <div
            ref={containerRef}
            className="flex flex-col h-full"
        >
            <div className="pb-6 pt-2 z-10">
                <div className="flex items-center justify-between px-2">
                    <div>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 block ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>TODAY'S MISSION</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-4xl font-black italic tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>{adherence ?? 0}%</span>
                            <div className={`text-[10px] px-2 py-1 rounded font-black uppercase tracking-wider ${!adherence ? 'bg-zinc-700 text-white' : adherence >= 80 ? 'bg-green-500 text-black' : adherence >= 50 ? 'bg-amber-500 text-black' : 'bg-red-500 text-white'}`}>
                                {adherence === null ? 'PENDING' : adherence >= 80 ? 'ELITE' : adherence >= 50 ? 'SOLID' : 'DRIFT'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 pb-20 scrollbar-thin relative mask-gradient">
                {/* Current time indicator line logic could go here if handled globally but CSS is fine */}
                <div className="absolute left-[52px] top-0 bottom-0 w-px bg-zinc-800/10 dark:bg-zinc-800" />
                <div className="py-4 space-y-1">
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
                                className={`flex items-stretch gap-3 relative transition-all cursor-pointer group rounded-xl p-2 border border-transparent ${isCurrent ? (isDark ? 'bg-white/5 border-white/5 ring-1 ring-green-500/20' : 'bg-zinc-50 border-zinc-200 ring-1 ring-zinc-200') : 'hover:bg-black/5 dark:hover:bg-white/5'
                                    }`}
                                onClick={() => {
                                    if (editingSlot === slot) return;
                                    if (block) {
                                        handleClearSlot(slot);
                                    } else {
                                        setEditingSlot(slot);
                                        setCustomLabel('');
                                    }
                                }}
                            >
                                {/* Time label */}
                                <div className={`w-12 flex-shrink-0 text-right py-1.5 ${showHourLabel ? (isDark ? 'text-[11px] font-bold text-zinc-300' : 'text-[11px] font-bold text-zinc-600') : (isDark ? 'text-[10px] text-zinc-600' : 'text-[10px] text-zinc-400')
                                    }`}>
                                    {showHourLabel ? formatTime(slot) : formatTime(slot).replace(/ [AP]M/, '')}
                                </div>

                                {/* Timeline dot */}
                                <div className="relative flex items-center justify-center w-3 flex-shrink-0">
                                    <div className={`w-2.5 h-2.5 rounded-full z-10 transition-all ${isCurrent ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse scale-125' :
                                        status === 'win' ? 'bg-green-500' :
                                            status === 'loss' ? 'bg-red-500' :
                                                status === 'missed' ? 'bg-amber-500' :
                                                    block ? CATEGORY_DOT[block.category] :
                                                        isDark ? 'bg-zinc-800' : 'bg-zinc-300'
                                        }`} />
                                </div>

                                {/* Content */}
                                <div className={`flex-1 min-h-[44px] flex items-center`}>
                                    {editingSlot === slot ? (
                                        <div className="w-full animate-fade-in" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-start gap-2 mb-2">
                                                <div className="flex flex-wrap gap-2 flex-1">
                                                    {PRESETS.map(p => (
                                                        <button
                                                            key={p.label}
                                                            onClick={() => handlePresetSelect(p)}
                                                            className={`text-[10px] font-bold px-3 py-2 rounded-lg border transition-all active:scale-95 shadow-sm ${CATEGORY_COLORS[p.category]}`}
                                                        >
                                                            {p.icon} {p.label}
                                                        </button>
                                                    ))}
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingSlot(null); }}
                                                    className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white' : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-400 hover:text-zinc-900'}`}
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                </button>
                                            </div>

                                            <input
                                                type="text"
                                                placeholder="Custom Label..."
                                                value={customLabel}
                                                onChange={e => setCustomLabel(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && handleCustomSave()}
                                                autoFocus
                                                className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/20 ${isDark ? 'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-600' : 'bg-white border-zinc-200 text-zinc-900 placeholder-zinc-400 shadow-sm'}`}
                                            />
                                        </div>
                                    ) : block ? (
                                        <div
                                            className="flex items-center justify-between w-full group select-none pl-1"
                                        >
                                            <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded border shadow-sm ${CATEGORY_COLORS[block.category]}`}>
                                                {block.label}
                                            </span>
                                            <div className="flex items-center gap-2 opacity-80">
                                                {status === 'win' && <span className="text-green-500 font-black text-sm">WIN</span>}
                                                {status === 'loss' && <span className="text-red-500 font-black text-sm">LOSS</span>}
                                                {status === 'missed' && <span className="text-amber-500 font-black text-xs">MISSED</span>}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`${isDark ? 'text-zinc-800' : 'text-zinc-200'} text-xs font-mono ml-1`}>
                                            —
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default DayPlanner;
