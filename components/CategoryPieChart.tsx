import React, { useMemo } from 'react';
import { LogEntry, LogCategory } from '../types';

interface CategoryPieChartProps {
    logs: LogEntry[];
}

const CATEGORY_COLORS: Record<string, string> = {
    'MAKER': '#22c55e',   // Green (High Leverage / Revenue)
    'MANAGER': '#eab308', // Yellow (Maintenance / Admin)
    'R&D': '#a855f7',     // Purple (Learning / Skill Stacking)
    'FUEL': '#3b82f6',    // Blue (Health / Sleep / Bio)
    'RECOVERY': '#06b6d4',// Cyan (Leisure / Family)
    'BURN': '#ef4444',    // Red (Wasted / Drifting - THE ENEMY)
    'OTHER': '#71717a'    // Zinc (Uncategorized)
};

const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
    'MAKER': 'Deep Work',
    'MANAGER': 'Admin',
    'R&D': 'Learning',
    'FUEL': 'Health',
    'RECOVERY': 'Recovery',
    'BURN': 'Wasted',
    'OTHER': 'Other'
};

const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ logs }) => {
    const data = useMemo(() => {
        const counts: Record<string, number> = {};
        let total = 0;

        logs.forEach(log => {
            const cat = (log.category || 'OTHER').toUpperCase();
            // Fallback if category isn't in our list
            const key = CATEGORY_COLORS[cat] ? cat : 'OTHER';
            // Assume 15 mins (900000ms) per block roughly, or use duration if available
            // Ideally use duration.
            const duration = log.duration || 900000;
            counts[key] = (counts[key] || 0) + duration;
            total += duration;
        });

        return Object.entries(counts)
            .map(([key, value]) => ({
                key,
                displayName: CATEGORY_DISPLAY_NAMES[key] || key,
                value,
                percent: total > 0 ? (value / total) * 100 : 0,
                color: CATEGORY_COLORS[key]
            }))
            .sort((a, b) => b.value - a.value);
    }, [logs]);

    if (data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-48 text-white/20">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                <span className="text-xs font-black uppercase tracking-widest mt-2">NO DATA</span>
            </div>
        );
    }

    // SVG Calculation
    let cumulativePercent = 0;

    const getCoordinatesForPercent = (percent: number) => {
        const x = Math.cos(2 * Math.PI * percent);
        const y = Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    return (
        <div className="w-full flex gap-4 items-center">
            {/* Chart */}
            <div className="relative w-32 h-32 flex-shrink-0">
                <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)' }} className="w-full h-full overflow-visible">
                    {data.map((slice, i) => {
                        const startPercent = cumulativePercent;
                        const endPercent = cumulativePercent + (slice.percent / 100);
                        cumulativePercent = endPercent;

                        const [startX, startY] = getCoordinatesForPercent(startPercent);
                        const [endX, endY] = getCoordinatesForPercent(endPercent);
                        const largeArcFlag = slice.percent > 50 ? 1 : 0;

                        // Donut hole
                        const pathData = slice.percent === 100
                            ? `M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0` // Full circle
                            : `M ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} L 0 0`;

                        return (
                            <path
                                key={slice.key}
                                d={pathData}
                                fill={slice.color}
                                stroke="#000"
                                strokeWidth="0.05"
                            />
                        );
                    })}
                    {/* Center Hole for Donut Effect */}
                    <circle cx="0" cy="0" r="0.6" fill="#000" />
                </svg>
                {/* Total Center Text */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="text-xs font-black text-white">{logs.length}</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1">
                {data.map(slice => (
                    <div key={slice.key} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: slice.color }} />
                            <span className="text-white/60 font-mono uppercase truncate max-w-[80px]">{slice.displayName}</span>
                        </div>
                        <span className="font-bold text-white">{Math.round(slice.percent)}%</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CategoryPieChart;