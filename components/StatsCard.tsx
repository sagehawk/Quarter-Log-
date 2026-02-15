import React, { useMemo } from 'react';
import { LogEntry, ScheduleConfig, FilterType } from '../types';
import { getRankForPeriod } from '../utils/rankSystem';
import CategoryPieChart from './CategoryPieChart';

interface StatsCardProps {
    logs: LogEntry[];
    filter: FilterType;
    schedule: ScheduleConfig;
    durationMs: number;
    viewDate: Date;
    onNavigate: (direction: -1 | 1) => void;
    onReset: () => void;
    isCurrentView: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
    logs,
    filter,
    viewDate,
    onNavigate,
    onReset,
    isCurrentView,
    canGoBack,
    canGoForward
}) => {
    const [hoverData, setHoverData] = React.useState<{ date: string, wins: number, losses: number, draws?: number } | null>(null);
    const [hoverPos, setHoverPos] = React.useState<{ x: number, y: number } | null>(null);

    // --- 1. Data Processing ---

    // Year View: Heatmap Data
    const heatmapData = useMemo(() => {
        if (filter !== 'Y') return null;
        const today = new Date();
        const isCurrentYear = viewDate.getFullYear() === today.getFullYear();

        let startDate: Date;
        let endDate: Date;

        if (isCurrentYear) {
            // Rolling Window (Last 365) - End Today
            endDate = new Date(today);
            startDate = new Date(today);
            startDate.setDate(today.getDate() - 364);
        } else {
            // Calendar Year
            startDate = new Date(viewDate.getFullYear(), 0, 1);
            endDate = new Date(viewDate.getFullYear(), 11, 31);
        }

        // Align start date to a Sunday
        const startDay = startDate.getDay(); // 0=Sun
        startDate.setDate(startDate.getDate() - startDay);

        const logMap = new Map<string, { wins: number, losses: number }>();
        logs.forEach(l => {
            const d = new Date(l.timestamp).toISOString().split('T')[0];
            const entry = logMap.get(d) || { wins: 0, losses: 0 };
            if (l.type === 'WIN') entry.wins++;
            else if (l.type === 'LOSS') entry.losses++;
            logMap.set(d, entry);
        });

        const days = [];
        let current = new Date(startDate);

        // Fill grid until end date (and complete the week)
        while (current <= endDate || current.getDay() !== 0) {
            if (current > endDate && current.getDay() === 0) break;

            const dateStr = current.toISOString().split('T')[0];
            const data = logMap.get(dateStr) || { wins: 0, losses: 0 };
            const total = data.wins + data.losses;
            let intensity = 0;
            if (total > 0) {
                if (data.losses > data.wins) intensity = -1;
                else if (data.wins < 3) intensity = 1;
                else if (data.wins < 6) intensity = 2;
                else if (data.wins < 10) intensity = 3;
                else intensity = 4;
            }
            days.push({ date: new Date(current), intensity, ...data });
            current.setDate(current.getDate() + 1);
        }
        return days;
    }, [logs, filter, viewDate]);

    // Other Views: Chart Data
    const chartData = useMemo(() => {
        if (filter === 'Y') return null;

        let buckets: { label: string, wins: number, losses: number, draws: number, isFuture?: boolean }[] = [];
        const current = new Date(viewDate);

        if (filter === 'D') {
            // 24 Hours
            for (let i = 0; i < 24; i++) {
                const h = i % 12 || 12;
                buckets.push({ label: `${h}`, wins: 0, losses: 0, draws: 0 });
            }
            logs.forEach(l => {
                const d = new Date(l.timestamp);
                if (d.toDateString() === current.toDateString()) {
                    const h = d.getHours();
                    if (l.type === 'WIN') buckets[h].wins++;
                    else if (l.type === 'DRAW') buckets[h].draws++;
                    else buckets[h].losses++;
                }
            });
        } else if (filter === 'W') {
            // 7 Days
            const start = new Date(current);
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);

            const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
            for (let i = 0; i < 7; i++) {
                const d = new Date(start);
                d.setDate(start.getDate() + i);
                const dayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === d.toDateString());
                const wins = dayLogs.filter(l => l.type === 'WIN').length;
                const draws = dayLogs.filter(l => l.type === 'DRAW').length;
                const losses = dayLogs.filter(l => l.type === 'LOSS').length;
                buckets.push({ label: days[i], wins, losses, draws });
            }
        } else if (filter === 'M') {
            // Days in Month
            const year = current.getFullYear();
            const month = current.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();

            for (let i = 1; i <= daysInMonth; i++) {
                const d = new Date(year, month, i);
                const dayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === d.toDateString());
                const wins = dayLogs.filter(l => l.type === 'WIN').length;
                const draws = dayLogs.filter(l => l.type === 'DRAW').length;
                const losses = dayLogs.filter(l => l.type === 'LOSS').length;
                buckets.push({ label: `${i}`, wins, losses, draws });
            }
        } else if (filter === '3M') {
            // 13 Weeks
            const startMonth = Math.floor(current.getMonth() / 3) * 3;
            const start = new Date(current.getFullYear(), startMonth, 1);
            for (let i = 0; i < 13; i++) {
                const wStart = new Date(start);
                wStart.setDate(start.getDate() + (i * 7));
                const wEnd = new Date(wStart);
                wEnd.setDate(wStart.getDate() + 7);

                const weekLogs = logs.filter(l => l.timestamp >= wStart.getTime() && l.timestamp < wEnd.getTime());
                const wins = weekLogs.filter(l => l.type === 'WIN').length;
                const draws = weekLogs.filter(l => l.type === 'DRAW').length;
                const losses = weekLogs.filter(l => l.type === 'LOSS').length;
                buckets.push({ label: `W${i + 1}`, wins, losses, draws });
            }
        }

        return buckets;
    }, [logs, filter, viewDate]);

    // --- 2. Current Stats Processing ---
    const stats = useMemo(() => {
        const wins = logs.filter(l => l.type === 'WIN').length;
        const total = logs.length;
        const rate = total > 0 ? Math.round((wins / total) * 100) : 0;
        const rank = filter === 'D' ? getRankForPeriod(wins, 'D') : getRankForPeriod(wins, 'LIFETIME');

        let streak = 0;
        const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);
        for (const log of sorted) {
            if (log.type === 'WIN') streak++;
            else if (log.type === 'DRAW') continue;
            else break;
        }

        return { wins, total, rate, rank, streak };
    }, [logs, filter]);

    // --- 3. Render Helpers ---
    const renderHeatmap = () => {
        if (!heatmapData) return null;
        const gridData = heatmapData;
        const realToday = new Date();
        realToday.setHours(0, 0, 0, 0);
        const isCurrentYearView = viewDate.getFullYear() === realToday.getFullYear();

        // Calculate month starts relative to the grid
        const monthLabels: { label: string, left: number }[] = [];
        let currentMonth = -1;

        const totalWeeks = Math.ceil(gridData.length / 7);

        for (let col = 0; col < totalWeeks; col++) {
            const dataIndex = col * 7;
            if (dataIndex < gridData.length) {
                const d = gridData[dataIndex].date;
                // In Calendar Mode, hide labels from prev year padding
                if (!isCurrentYearView && d.getFullYear() < viewDate.getFullYear()) continue;

                const m = d.getMonth();
                if (m !== currentMonth) {
                    // Show label if it's the start of the month OR the first column of the view
                    if (d.getDate() <= 14 || col === 0) {
                        monthLabels.push({
                            label: d.toLocaleDateString(undefined, { month: 'short' }),
                            left: (col / totalWeeks) * 100
                        });
                        currentMonth = m;
                    }
                }
            }
        }

        return (
            <div className="flex gap-2 w-full items-end">
                {/* Left Labels (Mon, Wed, Fri) - Fixed */}
                <div className="flex flex-col gap-[2px] h-full justify-end text-[6px] font-black uppercase text-white/40 w-5 shrink-0 text-right">
                    <div className="h-1.5 flex items-center justify-end">Mon</div>
                    <div className="h-1.5"></div>
                    <div className="h-1.5 flex items-center justify-end">Wed</div>
                    <div className="h-1.5"></div>
                    <div className="h-1.5 flex items-center justify-end">Fri</div>
                    <div className="h-1.5"></div>
                    <div className="h-1.5"></div>
                </div>
                <div className="flex gap-[2px] justify-between h-full items-end flex-1 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="min-w-max">
                        {/* Month Labels */}
                        <div className="relative w-full h-3 mb-1">
                            {monthLabels.map((m, i) => (
                                <span key={i} className="absolute text-[7px] font-black uppercase tracking-widest text-white/30 transform -translate-x-1/2" style={{ left: `${m.left}%` }}>{m.label}</span>
                            ))}
                        </div>

                        {/* Grid */}
                        <div className="flex gap-[2px] justify-between items-end">
                            {Array.from({ length: 53 }).map((_, colIndex) => (
                                <div key={colIndex} className="flex flex-col gap-[2px] h-full justify-end">
                                    {Array.from({ length: 7 }).map((_, rowIndex) => {

                                        const dataIndex = colIndex * 7 + rowIndex;
                                        const day = gridData[dataIndex];

                                        // Visibility Logic
                                        let isVisible = true;
                                        if (day) {
                                            const dayDate = new Date(day.date);
                                            dayDate.setHours(0, 0, 0, 0);

                                            if (isCurrentYearView) {
                                                // Rolling mode: Hide ONLY future relative to real today
                                                if (dayDate > realToday) isVisible = false;
                                            } else {
                                                // Calendar mode: Hide dates outside target year
                                                if (dayDate.getFullYear() !== viewDate.getFullYear()) isVisible = false;
                                            }
                                        } else {
                                            isVisible = false;
                                        }

                                        let bgClass = "bg-white/5";
                                        if (!isVisible) bgClass = "invisible";
                                        else if (day) {
                                            if (day.intensity === -1) bgClass = "bg-red-900/50 shadow-[0_0_5px_rgba(220,38,38,0.2)]";
                                            else if (day.intensity === 1) bgClass = "bg-green-900/40";
                                            else if (day.intensity === 2) bgClass = "bg-green-700/60";
                                            else if (day.intensity === 3) bgClass = "bg-green-500/80 shadow-[0_0_5px_rgba(34,197,94,0.4)]";
                                            else if (day.intensity === 4) bgClass = "bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.8)] z-10";
                                        }
                                        return (
                                            <div
                                                key={rowIndex}
                                                className={`w-1.5 h-1.5 rounded-[1px] transition-all duration-500 ${bgClass}`}
                                                onMouseEnter={(e) => {
                                                    if (!isVisible || !day) return;
                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                    setHoverData({
                                                        date: day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                                                        wins: day.wins,
                                                        losses: day.losses
                                                    });
                                                    setHoverPos({ x: rect.left + rect.width / 2, y: rect.top });
                                                }}
                                                onMouseLeave={() => {
                                                    setHoverData(null);
                                                    setHoverPos(null);
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Unified Tooltip (Fixed position) */}
                {hoverData && hoverPos && (
                    <div
                        className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-zinc-900 border border-white/10 px-3 py-2 rounded-lg shadow-2xl backdrop-blur-md"
                        style={{ left: hoverPos.x, top: hoverPos.y - 8 }}
                    >
                        <span className="block text-[10px] font-black uppercase tracking-widest text-green-500 mb-0.5">{hoverData.date}</span>
                        <span className="block text-[10px] font-mono text-white/60">{hoverData.wins} WINS / {hoverData.losses} LOSSES</span>
                        {/* Triangle Pointer */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-zinc-900 border-r border-b border-white/10"></div>
                    </div>
                )}
            </div>
        );
    };

    const renderChart = () => {
        if (!chartData) return null;
        const maxVal = Math.max(...chartData.map(d => d.wins + d.losses + d.draws), 1);

        return (
            <div className="flex items-end gap-1 h-32 w-full pt-6">
                {chartData.map((d, i) => {
                    const total = d.wins + d.losses + d.draws;
                    const winH = (d.wins / maxVal) * 100;
                    const drawH = (d.draws / maxVal) * 100;
                    const lossH = (d.losses / maxVal) * 100;

                    let showLabel = false;
                    if (filter === 'D') showLabel = i % 6 === 0;
                    else if (filter === 'W') showLabel = true;
                    else if (filter === 'M') showLabel = (i + 1) % 5 === 0 || i === 0 || i === chartData.length - 1;
                    else if (filter === '3M') showLabel = i % 4 === 0;

                    return (
                        <div
                            key={i}
                            className="flex-1 flex flex-col justify-end h-full group relative gap-[1px]"
                            onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoverData({
                                    date: d.label,
                                    wins: d.wins,
                                    losses: d.losses,
                                    draws: d.draws
                                });
                                setHoverPos({ x: rect.left + rect.width / 2, y: rect.top });
                            }}
                            onMouseLeave={() => {
                                setHoverData(null);
                                setHoverPos(null);
                            }}
                        >
                            {/* Label */}
                            {showLabel && (
                                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-[8px] font-black text-white/30 tracking-widest whitespace-nowrap">
                                    {d.label}
                                </div>
                            )}

                            <div style={{ height: `${lossH}%` }} className="w-full bg-red-500/50 rounded-[1px] transition-all duration-500" />
                            <div style={{ height: `${drawH}%` }} className="w-full bg-yellow-500/50 rounded-[1px] transition-all duration-500" />
                            <div style={{ height: `${winH}%` }} className="w-full bg-green-500 rounded-[1px] shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-500" />
                            {total === 0 && <div className="w-full h-[2px] bg-white/5 rounded-full" />}
                        </div>
                    );
                })}

                {/* Unified Tooltip (Reused) */}
                {hoverData && hoverPos && filter !== 'Y' && (
                    <div
                        className="fixed z-50 pointer-events-none transform -translate-x-1/2 -translate-y-full mb-2 bg-zinc-900 border border-white/10 px-3 py-2 rounded-lg shadow-2xl backdrop-blur-md"
                        style={{ left: hoverPos.x, top: hoverPos.y - 8 }}
                    >
                        <span className="block text-[10px] font-black uppercase tracking-widest text-green-500 mb-0.5">{hoverData.date}</span>
                        <span className="block text-[10px] font-mono text-white/60">
                            {hoverData.wins} W / {hoverData.draws || 0} D / {hoverData.losses} L
                        </span>
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-zinc-900 border-r border-b border-white/10"></div>
                    </div>
                )}
            </div>
        );
    };

    const renderVisual = () => {
        if (filter === 'Y') return renderHeatmap();
        return renderChart();
    };

    const getHeaderInfo = () => {
        const current = new Date(viewDate);
        if (filter === 'D') {
            return {
                label: isCurrentView ? "TODAY" : "DAILY LOG",
                date: current.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
            };
        }
        if (filter === 'W') {
            const day = current.getDay();
            const diff = current.getDate() - day + (day === 0 ? -6 : 1);
            const start = new Date(current);
            start.setDate(diff);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            return {
                label: "THIS WEEK",
                date: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
            };
        }
        if (filter === 'M') {
            return {
                label: "THIS MONTH",
                date: current.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
            };
        }
        if (filter === '3M') {
            const q = Math.floor(current.getMonth() / 3) + 1;
            return {
                label: "THIS QUARTER",
                date: `Q${q} ${current.getFullYear()}`
            };
        }
        if (filter === 'Y') {
            return {
                label: "THIS YEAR",
                date: `${current.getFullYear()}`
            };
        }
        return { label: "ARCHIVE", date: current.toDateString() };
    };

    const headerInfo = getHeaderInfo();

    return (
        <div className="w-full space-y-4 mb-6">

            {/* HEADER: Navigation & Rank */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <button onClick={() => onNavigate(-1)} disabled={!canGoBack} className="p-2 rounded-full hover:bg-white/5 disabled:opacity-20 transition-colors">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>
                    <div className="flex flex-col items-center cursor-pointer active:scale-95 transition-transform" onClick={onReset}>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">{headerInfo.label}</span>
                        <span className="text-sm font-black uppercase tracking-widest text-white">{headerInfo.date}</span>
                    </div>
                    <button onClick={() => onNavigate(1)} disabled={!canGoForward} className="p-2 rounded-full hover:bg-white/5 disabled:opacity-20 transition-colors">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>
                </div>

                {filter === 'D' && (
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${stats.rank.color.replace('text-', 'border-').replace('500', '500/30')} bg-black/40`}>
                        <svg className={`w-3 h-3 ${stats.rank.color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0"><path fill="currentColor" d={stats.rank.icon} /></svg>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${stats.rank.color}`}>{stats.rank.name}</span>
                    </div>
                )}
            </div>

            {/* PRIMARY VISUAL: THE SOVEREIGN GRID */}
            <div className="relative w-full bg-black/40 border border-white/5 rounded-3xl p-5 overflow-visible group">
                {/* Decorative Grid Lines */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 blur-[60px] rounded-full" />

                <div className="relative z-10 flex flex-col gap-4">
                    <div className="flex justify-between items-end">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mb-1">Win Rate</div>
                            <div className="text-5xl font-black tracking-tighter text-white drop-shadow-xl flex items-baseline gap-2">
                                {stats.rate}%
                                <span className="text-xs font-bold text-white/40 tracking-normal">OF ENTRIES</span>
                            </div>
                        </div>
                    </div>

                    {/* The Heatmap / Chart */}
                    <div className="mt-2 pt-4 border-t border-white/5">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
                                {filter === 'Y' ? 'Year Overview' : 'Activity'}
                            </span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/20">
                                {filter === 'Y' ? 'L-365' : filter}
                            </span>
                        </div>
                        {renderVisual()}

                        {/* Color Legend */}
                        {filter === 'Y' ? (
                            <div className="flex items-center justify-end gap-1.5 mt-3 text-[8px] font-black uppercase tracking-widest text-white/30">
                                <span>Less</span>
                                <div className="w-2 h-2 rounded-[1px] bg-white/5" />
                                <div className="w-2 h-2 rounded-[1px] bg-green-900/40" />
                                <div className="w-2 h-2 rounded-[1px] bg-green-700/60" />
                                <div className="w-2 h-2 rounded-[1px] bg-green-500/80" />
                                <div className="w-2 h-2 rounded-[1px] bg-green-400" />
                                <span>More</span>
                                <span className="ml-2">●</span>
                                <div className="w-2 h-2 rounded-[1px] bg-red-900/50" />
                                <span>Loss</span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-end gap-3 mt-3 text-[8px] font-black uppercase tracking-widest text-white/30">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500" />
                                    <span>Wins</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                                    <span>Draws</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 rounded-full bg-red-500/50" />
                                    <span>Losses</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* TELEMETRY DECK */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Total Entries</span>
                    <span className="text-3xl font-black text-white tracking-tighter">{stats.total}</span>
                </div>

                <div className="bg-zinc-900/50 border border-white/5 p-4 rounded-2xl flex flex-col justify-between h-24 relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-2 translate-y-2">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40">Wins</span>
                    <span className="text-3xl font-black text-green-500 tracking-tighter drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">{stats.wins}</span>
                </div>
            </div>

            {/* RESOURCE ALLOCATION (PIE CHART) */}
            <div id="pie-chart" className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 mt-3">
                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-4">Time Breakdown</div>
                <CategoryPieChart logs={logs} />
            </div>

        </div>
    );
};

export default StatsCard;