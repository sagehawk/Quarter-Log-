import React, { useState, useMemo } from 'react';
import { LogEntry } from '../types';
import { generateInsights, PATTERN_MIN_ENTRIES, Insight } from '../utils/patternEngine';

interface InsightsCardProps {
    logs: LogEntry[];
}

const severityColors: Record<Insight['severity'], string> = {
    positive: 'border-green-500/30 bg-green-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    info: 'border-zinc-500/30 bg-zinc-800/50',
};

const severityAccent: Record<Insight['severity'], string> = {
    positive: 'text-green-400',
    warning: 'text-amber-400',
    info: 'text-zinc-400',
};

const InsightsCard: React.FC<InsightsCardProps> = ({ logs }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const insights = useMemo(() => generateInsights(logs), [logs]);
    const progress = Math.min(logs.length, PATTERN_MIN_ENTRIES);
    const isLocked = logs.length < PATTERN_MIN_ENTRIES;

    return (
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
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
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pattern Intel</h3>
                        {isLocked ? (
                            <p className="text-xs text-zinc-500 mt-0.5">
                                {progress}/{PATTERN_MIN_ENTRIES} entries — keep logging
                            </p>
                        ) : (
                            <p className="text-xs text-zinc-500 mt-0.5">
                                {insights.length} insight{insights.length !== 1 ? 's' : ''} detected
                            </p>
                        )}
                    </div>
                </div>
                {!isLocked && (
                    <svg
                        className={`w-4 h-4 text-zinc-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                )}
            </button>

            {/* Progress bar (locked state) */}
            {isLocked && (
                <div className="px-4 pb-4">
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
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
                                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
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
                    <p className="text-xs text-zinc-600 text-center py-4">
                        No clear patterns yet. More variety in your data will surface insights.
                    </p>
                </div>
            )}
        </div>
    );
};

export default InsightsCard;
