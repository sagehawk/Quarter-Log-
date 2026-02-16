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
    const [displayScore, setDisplayScore] = useState(0);
    const animFrameRef = useRef<number>(0);
    const isDark = theme === 'dark';

    const { score } = useMemo(() => {
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



    const trend = useMemo(() => {
        if (history.length < 2) return 'flat';
        const last = history[history.length - 1].score;
        const prev = history[history.length - 2].score;
        return last > prev ? 'up' : last < prev ? 'down' : 'flat';
    }, [history]);

    return (
        <div className={`p-1 rounded-3xl transition-all ${isDark ? '' : ''}`}>
            <div className="flex flex-col gap-4">
                <div className="flex items-end justify-between px-2">
                    <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                            Focus Integrity
                        </span>
                        <div className="flex items-baseline gap-3">
                            <span className={`text-6xl font-black tracking-tighter ${colorClass} leading-none`}>
                                {displayScore}
                            </span>
                            <div className="flex flex-col mb-1">
                                <span className={`text-xs font-black uppercase tracking-widest ${colorClass}`}>
                                    {score >= 90 ? 'OPTIMAL' : score >= 70 ? 'EFFECTIVE' : score >= 50 ? 'STABLE' : 'CRITICAL'}
                                </span>
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>
                                    Score / 100
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Trend Indicator */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full mb-2 ${isDark ? 'bg-zinc-900/50' : 'bg-zinc-100'}`}>
                        {trend === 'up' && <span className="text-xs text-green-500">▲</span>}
                        {trend === 'down' && <span className="text-xs text-red-500">▼</span>}
                        {trend === 'flat' && <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-500'}`}>▬</span>}
                    </div>
                </div>

                {/* Single Sleek Progress Bar */}
                <div className={`h-2 w-full rounded-full overflow-hidden ${isDark ? 'bg-zinc-900' : 'bg-zinc-200'}`}>
                    <div
                        className={`h-full rounded-full ${barColorClass} transition-all duration-1000 ease-out`}
                        style={{ width: `${displayScore}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export default FocusScore;
