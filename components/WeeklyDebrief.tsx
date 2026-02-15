import React, { useMemo, useState } from 'react';
import { LogEntry, ScheduleConfig } from '../types';
import { calculateFocusScore, calculateHistoricalScores, DayScore } from '../utils/focusScoreEngine';

interface WeeklyDebriefProps {
    isOpen: boolean;
    logs: LogEntry[];
    streak: number;
    schedule?: ScheduleConfig;
    onClose: () => void;
}

interface DaySummary {
    label: string;
    wins: number;
    losses: number;
    draws: number;
    total: number;
    focusScore: number;
    topCategory: string;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const WeeklyDebrief: React.FC<WeeklyDebriefProps> = ({ isOpen, logs, streak, schedule, onClose }) => {
    const [activeSection, setActiveSection] = useState(0);

    // Get this week's logs (Mon-Sun)
    const { weekLogs, weekStart, weekEnd } = useMemo(() => {
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(now);
        start.setDate(diff);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(start.getDate() + 7);

        const filtered = logs.filter(l => l.timestamp >= start.getTime() && l.timestamp < end.getTime());
        return { weekLogs: filtered, weekStart: start, weekEnd: end };
    }, [logs]);

    // Daily breakdown
    const dailySummaries: DaySummary[] = useMemo(() => {
        const summaries: DaySummary[] = [];
        for (let i = 0; i < 7; i++) {
            const dayStart = new Date(weekStart);
            dayStart.setDate(weekStart.getDate() + i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayStart.getDate() + 1);

            const dayLogs = weekLogs.filter(l => l.timestamp >= dayStart.getTime() && l.timestamp < dayEnd.getTime());
            const wins = dayLogs.filter(l => l.type === 'WIN').length;
            const losses = dayLogs.filter(l => l.type === 'LOSS').length;
            const draws = dayLogs.filter(l => l.type === 'DRAW').length;
            const score = dayLogs.length > 0 ? calculateFocusScore(dayLogs, streak, schedule).score : 0;

            // Top category
            const cats: Record<string, number> = {};
            dayLogs.forEach(l => {
                const cat = (l.category || 'OTHER').toUpperCase();
                cats[cat] = (cats[cat] || 0) + 1;
            });
            const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

            summaries.push({ label: DAY_LABELS[i], wins, losses, draws, total: dayLogs.length, focusScore: score, topCategory: topCat });
        }
        return summaries;
    }, [weekLogs, weekStart, streak, schedule]);

    // Week-level stats
    const weekStats = useMemo(() => {
        const wins = weekLogs.filter(l => l.type === 'WIN').length;
        const losses = weekLogs.filter(l => l.type === 'LOSS').length;
        const draws = weekLogs.filter(l => l.type === 'DRAW').length;
        const total = wins + losses + draws;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        const avgScore = dailySummaries.filter(d => d.total > 0).length > 0
            ? Math.round(dailySummaries.filter(d => d.total > 0).reduce((a, d) => a + d.focusScore, 0) / dailySummaries.filter(d => d.total > 0).length)
            : 0;
        const bestDay = dailySummaries.filter(d => d.total > 0).sort((a, b) => b.focusScore - a.focusScore)[0];
        const worstDay = dailySummaries.filter(d => d.total > 0).sort((a, b) => a.focusScore - b.focusScore)[0];

        // Category breakdown
        const cats: Record<string, number> = {};
        weekLogs.forEach(l => {
            const cat = (l.category || 'OTHER').toUpperCase();
            cats[cat] = (cats[cat] || 0) + 1;
        });
        const topCategories = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 3);

        return { wins, losses, draws, total, winRate, avgScore, bestDay, worstDay, topCategories };
    }, [weekLogs, dailySummaries]);

    if (!isOpen) return null;

    const CATEGORY_DISPLAY: Record<string, string> = {
        'MAKER': 'Deep Work', 'MANAGER': 'Admin', 'R&D': 'Learning',
        'FUEL': 'Health', 'RECOVERY': 'Recovery', 'BURN': 'Wasted', 'OTHER': 'Other'
    };

    const CATEGORY_COLORS: Record<string, string> = {
        'MAKER': '#22c55e', 'MANAGER': '#eab308', 'R&D': '#a855f7',
        'FUEL': '#3b82f6', 'RECOVERY': '#06b6d4', 'BURN': '#ef4444', 'OTHER': '#71717a'
    };

    const sections = ['Overview', 'Daily', 'Categories'];

    const weekDateRange = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${new Date(weekEnd.getTime() - 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/5 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Weekly Debrief</h2>
                            <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">{weekDateRange}</span>
                        </div>
                        <button onClick={onClose} className="text-white/30 hover:text-white p-2 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>

                    {/* Section tabs */}
                    <div className="flex gap-1 mt-4 bg-black/40 rounded-xl p-1">
                        {sections.map((s, i) => (
                            <button
                                key={s}
                                onClick={() => setActiveSection(i)}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSection === i ? 'bg-white text-black' : 'text-white/30 hover:text-white/50'
                                    }`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Overview Section */}
                    {activeSection === 0 && (
                        <div className="space-y-5 animate-fade-in">
                            {/* Big Score */}
                            <div className="text-center py-4">
                                <div className="text-6xl font-black text-white tracking-tighter">{weekStats.avgScore}</div>
                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 mt-1">Avg Focus Score</div>
                            </div>

                            {/* Stat Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <StatBlock label="Wins" value={weekStats.wins} color="text-green-400" />
                                <StatBlock label="Losses" value={weekStats.losses} color="text-red-400" />
                                <StatBlock label="Win Rate" value={`${weekStats.winRate}%`} color="text-cyan-400" />
                            </div>

                            {/* Best & Worst */}
                            <div className="grid grid-cols-2 gap-3">
                                {weekStats.bestDay && (
                                    <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-green-500/50 mb-1">Best Day</div>
                                        <div className="text-lg font-black text-green-400">{weekStats.bestDay.label}</div>
                                        <div className="text-[10px] text-white/30">Score: {weekStats.bestDay.focusScore}</div>
                                    </div>
                                )}
                                {weekStats.worstDay && (
                                    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-3">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-red-500/50 mb-1">Weakest Day</div>
                                        <div className="text-lg font-black text-red-400">{weekStats.worstDay.label}</div>
                                        <div className="text-[10px] text-white/30">Score: {weekStats.worstDay.focusScore}</div>
                                    </div>
                                )}
                            </div>

                            {/* Streak */}
                            <div className="bg-white/5 border border-white/5 rounded-xl p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500">
                                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                                    </svg>
                                    <span className="text-xs font-black text-white uppercase tracking-wider">Active Streak</span>
                                </div>
                                <span className="text-lg font-black text-orange-500">{streak}d</span>
                            </div>
                        </div>
                    )}

                    {/* Daily Section */}
                    {activeSection === 1 && (
                        <div className="space-y-2 animate-fade-in">
                            {dailySummaries.map((day, i) => {
                                const isToday = i === new Date().getDay() - 1 || (new Date().getDay() === 0 && i === 6);
                                return (
                                    <div
                                        key={day.label}
                                        className={`flex items-center gap-3 p-3 rounded-xl transition-all ${day.total === 0 ? 'opacity-30' : ''
                                            } ${isToday ? 'bg-white/5 border border-white/10' : 'bg-black/20'}`}
                                    >
                                        <div className="w-10 text-xs font-black text-white/40 uppercase">{day.label}</div>

                                        {/* Focus Score */}
                                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm ${day.focusScore >= 70 ? 'bg-green-500/10 text-green-400' :
                                                day.focusScore >= 40 ? 'bg-amber-500/10 text-amber-400' :
                                                    day.total > 0 ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/10'
                                            }`}>
                                            {day.total > 0 ? day.focusScore : '—'}
                                        </div>

                                        {/* W/L bar */}
                                        <div className="flex-1">
                                            {day.total > 0 ? (
                                                <div className="flex h-2 rounded-full overflow-hidden gap-[1px]">
                                                    {day.wins > 0 && (
                                                        <div className="bg-green-500 rounded-full" style={{ flex: day.wins }} />
                                                    )}
                                                    {day.draws > 0 && (
                                                        <div className="bg-amber-500 rounded-full" style={{ flex: day.draws }} />
                                                    )}
                                                    {day.losses > 0 && (
                                                        <div className="bg-red-500 rounded-full" style={{ flex: day.losses }} />
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="h-2 bg-white/5 rounded-full" />
                                            )}
                                        </div>

                                        {/* Count */}
                                        <div className="text-[10px] font-mono text-white/20 w-8 text-right">
                                            {day.total > 0 ? `${day.wins}W` : '—'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Categories Section */}
                    {activeSection === 2 && (
                        <div className="space-y-4 animate-fade-in">
                            {weekStats.topCategories.length > 0 ? (
                                <>
                                    <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-3">Time Distribution</div>
                                    {weekStats.topCategories.map(([cat, count]) => {
                                        const percent = weekStats.total > 0 ? Math.round((count / weekStats.total) * 100) : 0;
                                        return (
                                            <div key={cat} className="space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || '#71717a' }} />
                                                        <span className="text-xs font-bold text-white">{CATEGORY_DISPLAY[cat] || cat}</span>
                                                    </div>
                                                    <span className="text-xs font-black text-white/50">{percent}%</span>
                                                </div>
                                                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${percent}%`,
                                                            backgroundColor: CATEGORY_COLORS[cat] || '#71717a',
                                                            boxShadow: `0 0 8px ${CATEGORY_COLORS[cat] || '#71717a'}30`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Maker vs Burn comparison */}
                                    <div className="mt-6 pt-4 border-t border-white/5">
                                        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20 mb-3">Productive vs Wasted</div>
                                        {(() => {
                                            const makerCount = weekLogs.filter(l => ['MAKER', 'R&D'].includes((l.category || '').toUpperCase())).length;
                                            const burnCount = weekLogs.filter(l => (l.category || '').toUpperCase() === 'BURN').length;
                                            const maxCount = Math.max(makerCount, burnCount, 1);
                                            return (
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-green-400 w-16">Productive</span>
                                                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(makerCount / maxCount) * 100}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-white/40 w-6 text-right">{makerCount}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-[10px] font-bold text-red-400 w-16">Wasted</span>
                                                        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                                                            <div className="h-full bg-red-500 rounded-full transition-all" style={{ width: `${(burnCount / maxCount) * 100}%` }} />
                                                        </div>
                                                        <span className="text-[10px] font-black text-white/40 w-6 text-right">{burnCount}</span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-8 text-white/20">
                                    <span className="text-xs font-black uppercase tracking-widest">No data this week</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Sub-component for stat blocks
const StatBlock: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
    <div className="bg-black/40 border border-white/5 rounded-xl p-3 text-center">
        <div className={`text-xl font-black ${color}`}>{value}</div>
        <div className="text-[8px] font-black uppercase tracking-widest text-white/20 mt-0.5">{label}</div>
    </div>
);

export default WeeklyDebrief;
