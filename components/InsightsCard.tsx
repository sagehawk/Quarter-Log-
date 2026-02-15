import React, { useState, useMemo } from 'react';
import { LogEntry, AppTheme } from '../types';
import { generateInsights, PATTERN_MIN_ENTRIES, Insight } from '../utils/patternEngine';

interface InsightsCardProps {
    logs: LogEntry[];
    theme?: AppTheme;
}

const severityColors: Record<Insight['severity'], string> = {
    positive: 'border-green-500/30 bg-green-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    info: 'border-zinc-500/30 bg-zinc-500/5',
};

const severityAccent: Record<Insight['severity'], string> = {
    positive: 'text-green-500',
    warning: 'text-amber-500',
    info: 'text-zinc-500',
};

const InsightsCard: React.FC<InsightsCardProps> = ({ logs, theme = 'dark' }) => {
    const isDark = theme === 'dark';
    const [isExpanded, setIsExpanded] = useState(false);

    const insights = useMemo(() => generateInsights(logs), [logs]);
    const progress = Math.min(logs.length, PATTERN_MIN_ENTRIES);
    const isLocked = logs.length < PATTERN_MIN_ENTRIES;

    return (
        <div className={`border rounded-2xl overflow-hidden transition-colors duration-300 ${isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-50 border-zinc-200 shadow-sm'}`}>
            {/* Header */}
            <button
                onClick={() => !isLocked && setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-sm">
                        🧠
                    </div>
                    <div>
                        <h3 className={`text-sm font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-zinc-900'}`}>Pattern Intel</h3>
                        {isLocked ? (
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                {progress}/{PATTERN_MIN_ENTRIES} entries — keep logging
                            </p>
                        ) : (
                            <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                                {insights.length} insight{insights.length !== 1 ? 's' : ''} detected
                            </p>
                        )}
                    </div>
                </div>
                {!isLocked && (
                    <svg
                        className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''} ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                )}
            </button>

            {/* Progress bar (locked state) */}
            {isLocked && (
                <div className="px-4 pb-4">
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-100'}`}>
                        <div
                            className="h-full bg-purple-500/60 rounded-full transition-all duration-500"
                            style={{ width: `${(progress / PATTERN_MIN_ENTRIES) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Insights list (expanded) */}
            {!isLocked && isExpanded && insights.length > 0 && (
                <div className="px-4 pb-4 space-y-2 animate-fade-in">
                    {insights.map((insight) => (
                        <div
                            key={insight.id}
                            className={`border rounded-xl p-3 ${severityColors[insight.severity]}`}
                        >
                            <div className="flex items-start gap-2.5">
                                <span className="text-lg mt-0.5 shrink-0">{insight.icon}</span>
                                <div className="min-w-0">
                                    <p className={`text-sm font-bold ${severityAccent[insight.severity]}`}>
                                        {insight.headline}
                                    </p>
                                    <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                                        {insight.detail}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* No insights state */}
            {!isLocked && isExpanded && insights.length === 0 && (
                <div className="px-4 pb-4">
                    <p className={`text-xs text-center py-4 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                        No clear patterns yet. More variety in your data will surface insights.
                    </p>
                </div>
            )}
        </div>
    );
};

export default InsightsCard;
