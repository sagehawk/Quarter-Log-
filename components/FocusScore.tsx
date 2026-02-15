import React, { useState, useMemo, useEffect, useRef } from 'react';
import { LogEntry, AppTheme } from '../types';
import { calculateFocusScore, calculateHistoricalScores } from '../utils/focusScoreEngine';

interface FocusScoreProps {
    logs: LogEntry[];
    allLogs: LogEntry[];
    streak?: number;
    theme?: AppTheme;
}

const FocusScore: React.FC<FocusScoreProps> = ({ logs, allLogs, streak = 0, theme = 'dark' }) => {
    const [expanded, setExpanded] = useState(false);
    const [displayScore, setDisplayScore] = useState(0);
    const animFrameRef = useRef<number>(0);
    const isDark = theme === 'dark';

    const { score, breakdown } = useMemo(() => {
        return calculateFocusScore(logs, streak);
    }, [logs, streak]);

    // Animated counter effect
    useEffect(() => {
        const start = displayScore;
        const end = score;
        if (start === end) return;
        const duration = 800;
        const startTime = performance.now();

        const tick = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayScore(Math.round(start + (end - start) * eased));
            if (progress < 1) {
                animFrameRef.current = requestAnimationFrame(tick);
            }
        };
        animFrameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [score]);

    const history = useMemo(() => calculateHistoricalScores(allLogs, 14), [allLogs]);

    const getScoreColor = (s: number) => {
        if (s >= 90) return 'text-purple-400';
        if (s >= 70) return 'text-green-400';
        if (s >= 50) return 'text-amber-400';
        return 'text-zinc-500';
    };

    const getBarColor = (s: number) => {
        if (s >= 90) return 'bg-purple-500';
        if (s >= 70) return 'bg-green-500';
        if (s >= 50) return 'bg-amber-500';
        return 'bg-zinc-600';
    };

    const colorClass = getScoreColor(score);
    const barColorClass = getBarColor(score);

    // Sparkline Logic
    const sparklinePath = useMemo(() => {
        if (history.length < 2) return '';
        const max = 100;
        const width = 100;
        const height = 30; // Reduced height
        const step = width / (history.length - 1);

        const points = history.map((d, i) => {
            const x = i * step;
            const y = height - (d.score / max) * height;
            return `${x},${y}`;
        }).join(' ');

        return `M0,${height} L${points} L${width},${height} Z`; // Fill area
    }, [history]);

    const trend = useMemo(() => {
        if (history.length < 2) return 'flat';
        const last = history[history.length - 1].score;
        const prev = history[history.length - 2].score;
        return last > prev ? 'up' : last < prev ? 'down' : 'flat';
    }, [history]);

    return (
        <div className={`border rounded-3xl overflow-hidden backdrop-blur-sm shadow-sm relative group transition-all ${isDark ? 'bg-zinc-900 border-white/5' : 'bg-white border-zinc-200'}`}>
            {/* Background Grid Effect (Optional) */}
            <div className={`absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] pointer-events-none ${isDark ? 'opacity-[0.03]' : 'opacity-[0.05] invert'}`} />

            <div
                className={`p-5 relative z-10 cursor-pointer transition-colors ${isDark ? 'active:bg-white/5' : 'active:bg-zinc-50'}`}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-end justify-between mb-4">
                    <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            <div className={`w-1.5 h-1.5 rounded-sm ${barColorClass} animate-pulse`} />
                            Focus Integrity
                        </span>
                        <div className="flex items-baseline gap-3">
                            <span className={`text-5xl font-black tracking-tighter ${colorClass} leading-none`}>
                                {displayScore}
                            </span>
                            <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                / 100
                            </span>
                        </div>
                    </div>

                    {/* Right side: Trend & Status */}
                    <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border mb-2 ${isDark ? 'bg-white/5 border-white/5' : 'bg-zinc-100 border-zinc-200'}`}>
                            {trend === 'up' && <span className="text-[10px] text-green-500">▲ ASCENDING</span>}
                            {trend === 'down' && <span className="text-[10px] text-red-500">▼ DESCENDING</span>}
                            {trend === 'flat' && <span className={`text-[10px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>▬ STABLE</span>}
                        </div>
                        <span className={`text-xs font-black uppercase tracking-widest ${colorClass}`}>
                            {score >= 90 ? 'OPTIMAL' : score >= 70 ? 'EFFECTIVE' : score >= 50 ? 'STABLE' : 'CRITICAL'}
                        </span>
                    </div>
                </div>

                {/* Tactical Segmented Bar */}
                <div className="flex gap-1 h-3 w-full mb-4">
                    {[...Array(20)].map((_, i) => {
                        const threshold = (i + 1) * 5;
                        const filled = score >= threshold;
                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-sm transition-all duration-500 ${filled ? barColorClass : 'bg-zinc-800'}`}
                                style={{
                                    transitionDelay: filled ? `${i * 30}ms` : '0ms',
                                    opacity: filled ? 1 : 0.3,
                                    boxShadow: filled ? `0 0 10px ${score >= 90 ? 'rgba(192, 132, 252, 0.5)' : score >= 70 ? 'rgba(74, 222, 128, 0.5)' : 'rgba(251, 191, 36, 0.5)'}` : 'none'
                                }}
                            />
                        );
                    })}
                </div>

                {/* Sub-info line */}
                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    <span>Streak Impact: +{breakdown.streakBonus}</span>
                    <span>Raw Output: {breakdown.winRate + breakdown.makerRatio}</span>
                </div>
            </div>

            {/* Expanded Sparkline & Details */}
            {expanded && (
                <div className="border-t border-white/5 bg-black/20 animate-fade-in relative">
                    {/* Sparkline Background */}
                    <div className="h-20 w-full relative opacity-20 mask-image-gradient-b">
                        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="w-full h-full">
                            <path d={sparklinePath} fill="currentColor" className={colorClass} />
                        </svg>
                    </div>

                    <div className="p-5 pt-2 grid grid-cols-2 gap-4 relative z-10">
                        <ScoreDetail label="Win Efficiency" value={breakdown.winRate} max={40} color="text-green-400" />
                        <ScoreDetail label="Deep Work" value={breakdown.makerRatio} max={25} color="text-purple-400" />
                        <ScoreDetail label="Consistency" value={breakdown.consistency} max={20} color="text-blue-400" />
                        <ScoreDetail label="Momentum" value={breakdown.streakBonus} max={15} color="text-orange-400" />
                    </div>
                </div>
            )}
        </div>
    );
};

const ScoreDetail: React.FC<{ label: string; value: number; max: number; color: string }> = ({ label, value, max, color }) => (
    <div className="flex flex-col">
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-1">{label}</span>
        <div className="flex items-end gap-1">
            <span className={`text-xl font-black ${color} leading-none`}>{value}</span>
            <span className="text-[10px] font-bold text-zinc-600 mb-0.5">/ {max}</span>
        </div>
    </div>
);

export default FocusScore;
