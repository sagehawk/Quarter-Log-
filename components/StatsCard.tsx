import React, { useMemo, useState, useRef } from 'react';
import { LogEntry, ScheduleConfig } from '../types';

interface StatsCardProps {
  logs: LogEntry[];
  filter: string; // 'D' | 'W' | 'M' | '3M' | 'Y'
  schedule: ScheduleConfig;
  durationMs: number;
  viewDate: Date;
  onNavigate: (direction: -1 | 1) => void;
  onReset: () => void;
  isCurrentView: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
}

// --- Types & Helpers ---

type ChartDataPoint = {
  label: string;
  value: number; 
  displayValue: string; 
  isCurrent?: boolean; 
  fullDate?: string; 
  hour?: number; 
  day?: number;
};

// SVG Constants
const CHART_HEIGHT = 80;
const CHART_WIDTH = 280; 
const MAX_BAR_WIDTH = 24;

const StatsCard: React.FC<StatsCardProps> = ({ 
  logs, 
  filter, 
  schedule, 
  durationMs, 
  viewDate,
  onNavigate,
  onReset,
  isCurrentView,
  canGoBack,
  canGoForward
}) => {
  const [interactionIndex, setInteractionIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const isDragging = useRef(false);

  // 1. Process Data for Charts based on Filter
  const { durationChartData, summaryStats } = useMemo(() => {
    const now = new Date(viewDate);
    const todayReal = new Date();
    const durationMinutes = durationMs / 1000 / 60;
    
    // -- Summary Stats --
    const totalMinutesLogged = logs.length * durationMinutes;
    const hours = Math.floor(totalMinutesLogged / 60);
    const mins = Math.round(totalMinutesLogged % 60);
    const timeDisplay = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    
    // -- Chart Bucketing --
    let buckets: { [key: string]: { logs: LogEntry[], date: Date, label: string } } = {};
    let keys: string[] = [];
    
    // Schedule Range Helper
    const getScheduleRange = () => {
        if (!schedule.enabled) return { start: 0, end: 24 };
        const s = parseInt(schedule.startTime.split(':')[0], 10);
        let e = parseInt(schedule.endTime.split(':')[0], 10);
        const eMin = parseInt(schedule.endTime.split(':')[1], 10);
        if (eMin > 0) e += 1; 
        if (e <= s) e = 24; 
        return { start: s, end: e };
    };

    // Helper to fill buckets
    const fillBuckets = (start: Date, count: number, stepUnit: 'hour' | 'day' | 'week' | 'month') => {
        const current = new Date(start);
        for (let i = 0; i < count; i++) {
            let key = '';
            let label = '';
            
            if (stepUnit === 'hour') {
                key = current.toISOString().substring(0, 13);
                const h = current.getHours();
                const h12 = h % 12 || 12;
                const isStandardTick = h % 4 === 0;
                const isLast = i === count - 1;
                const is11PM = h === 23;
                if (isStandardTick) label = `${h12}`;
                else if (isLast && is11PM) label = '11'; 

            } else if (stepUnit === 'day') {
                key = current.toISOString().substring(0, 10);
                const day = current.getDate();
                
                if (filter === 'M') { // Month view
                    const isSpecialTick = [1, 5, 10, 15, 20, 25].includes(day);
                    const isLast = i === count - 1;
                    if (isSpecialTick || isLast) label = String(day);
                } else if (filter === 'W') { // Week view
                    label = current.toLocaleDateString('en-US', { weekday: 'narrow' });
                }

            } else if (stepUnit === 'week') {
                // Key is Monday of the week
                const day = current.getDay();
                const diff = current.getDate() - day + (day === 0 ? -6 : 1);
                const monday = new Date(current);
                monday.setDate(diff);
                key = monday.toISOString().substring(0, 10); // Group by Monday date

                // Label logic for 3M view
                // Simple heuristic: Label roughly once a month (if it's the start of the data or near start of month)
                if (i === 0 || monday.getDate() <= 7) {
                     label = monday.toLocaleDateString('en-US', { month: 'short' });
                }
            } else if (stepUnit === 'month') {
                key = current.toISOString().substring(0, 7);
                label = current.toLocaleDateString('en-US', { month: 'narrow' });
            }

            if (!buckets[key]) {
                buckets[key] = { logs: [], date: new Date(current), label };
                keys.push(key);
            }
            
            // Increment
            if (stepUnit === 'hour') current.setHours(current.getHours() + 1);
            if (stepUnit === 'day') current.setDate(current.getDate() + 1);
            if (stepUnit === 'week') current.setDate(current.getDate() + 7);
            if (stepUnit === 'month') current.setMonth(current.getMonth() + 1);
        }
    };

    // --- Range & Bucket Logic ---
    if (filter === 'D') {
        const { start, end } = getScheduleRange();
        const startDate = new Date(now);
        startDate.setHours(start, 0, 0, 0);
        const count = Math.max(1, end - start);
        fillBuckets(startDate, count, 'hour');

    } else if (filter === 'W') {
        const start = new Date(now);
        const day = start.getDay();
        const diff = start.getDate() - day + (day === 0 ? -6 : 1);
        start.setDate(diff);
        start.setHours(0,0,0,0);
        fillBuckets(start, 7, 'day');

    } else if (filter === 'M') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        fillBuckets(start, daysInMonth, 'day');

    } else if (filter === '3M') {
        // Quarter view: 3 Months starting from current quarter start
        const currentMonth = now.getMonth();
        const startMonth = Math.floor(currentMonth / 3) * 3;
        const start = new Date(now.getFullYear(), startMonth, 1);
        const endOfQuarter = new Date(now.getFullYear(), startMonth + 3, 0); // Last day of quarter

        // Dynamically calculate how many weeks we need to cover the entire quarter
        let count = 0;
        const probe = new Date(start);
        while (true) {
             const d = probe.getDay();
             const diff = probe.getDate() - d + (d === 0 ? -6 : 1);
             const monday = new Date(probe);
             monday.setDate(diff);
             
             // Stop if the week starts after the quarter ends
             if (monday > endOfQuarter) break;
             
             count++;
             probe.setDate(probe.getDate() + 7);
        }

        fillBuckets(start, count, 'week');

    } else if (filter === 'Y') {
        const start = new Date(now.getFullYear(), 0, 1);
        fillBuckets(start, 12, 'month');
    }

    // --- Distribute Logs ---
    logs.forEach(log => {
        const logDate = new Date(log.timestamp);
        let key = '';
        if (filter === 'D') {
            key = logDate.toISOString().substring(0, 13);
        } else if (filter === 'Y') {
            key = logDate.toISOString().substring(0, 7);
        } else if (filter === '3M') {
            // Group by Week Monday
            const day = logDate.getDay();
            const diff = logDate.getDate() - day + (day === 0 ? -6 : 1);
            const monday = new Date(logDate);
            monday.setDate(diff);
            key = monday.toISOString().substring(0, 10);
        } else {
            // W, M use full date
            key = logDate.toISOString().substring(0, 10);
        }
        
        if (buckets[key]) buckets[key].logs.push(log);
    });

    // --- Generate Chart Data ---
    const dChart: ChartDataPoint[] = [];
    const isTodayReal = (key: string) => {
        if (filter === 'D') return key === todayReal.toISOString().substring(0, 13);
        if (filter === 'Y') return key === todayReal.toISOString().substring(0, 7);
        if (filter === '3M') {
             // Check if today falls in that week key
             const day = todayReal.getDay();
             const diff = todayReal.getDate() - day + (day === 0 ? -6 : 1);
             const monday = new Date(todayReal);
             monday.setDate(diff);
             return key === monday.toISOString().substring(0, 10);
        }
        return key === todayReal.toISOString().substring(0, 10);
    };

    keys.forEach(key => {
        const bucket = buckets[key];
        const count = bucket.logs.length;
        
        // --- FIX: Cap minutes at 60 for the graph ---
        // Actual calculation
        const rawMinutes = count * durationMinutes;
        // Capped calculation for visualization
        const minutes = Math.min(rawMinutes, 60);
        
        // Header Date Formatting
        let fullDate = '';
        if (filter === 'D') fullDate = bucket.date.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'});
        else if (filter === 'Y') fullDate = bucket.date.toLocaleDateString([], {month: 'long', year: 'numeric'});
        else if (filter === '3M') {
             // Week range
             const end = new Date(bucket.date);
             end.setDate(end.getDate() + 6);
             fullDate = `${bucket.date.toLocaleDateString([], {month:'short', day:'numeric'})} - ${end.toLocaleDateString([], {month:'short', day:'numeric'})}`;
        }
        else fullDate = bucket.date.toLocaleDateString([], {weekday: 'short', month: 'short', day: 'numeric'});

        dChart.push({
            label: bucket.label,
            value: minutes, // Capped value used for chart height
            displayValue: rawMinutes >= 60 ? `${Math.floor(rawMinutes/60)}h ${Math.round(rawMinutes%60)}m` : `${rawMinutes}m`, // Real value for text
            isCurrent: isTodayReal(key),
            hour: bucket.date.getHours(),
            day: bucket.date.getDate(),
            fullDate
        });
    });

    return {
        durationChartData: dChart,
        summaryStats: { timeDisplay }
    };
  }, [logs, filter, schedule, durationMs, viewDate]);

  // --- Interaction Handlers ---

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    isDragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
    handlePointerMove(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!isDragging.current || !svgRef.current || durationChartData.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const relativeX = Math.max(0, Math.min(1, x / rect.width));
    const rawIndex = Math.floor(relativeX * durationChartData.length);
    setInteractionIndex(Math.min(rawIndex, durationChartData.length - 1));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    isDragging.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
    setInteractionIndex(null);
  };

  // --- Render ---

  const getBarWidth = (count: number) => {
      const gap = count > 12 ? 3 : 5;
      const totalGap = (count - 1) * gap;
      return Math.min((CHART_WIDTH - totalGap) / count, MAX_BAR_WIDTH);
  };
  const getGap = (count: number) => count > 12 ? 3 : 5;
  const getColumnX = (index: number, count: number) => {
     const gap = getGap(count);
     const slotWidth = (CHART_WIDTH - ((count - 1) * gap)) / count;
     return (index * (slotWidth + gap)) + (slotWidth / 2);
  };

  const renderBarChart = () => {
    const maxVal = Math.max(...durationChartData.map(d => d.value), 1); 
    const count = durationChartData.length;
    const barWidth = getBarWidth(count);

    return (
        <svg 
            ref={svgRef}
            viewBox={`0 -5 ${CHART_WIDTH} ${CHART_HEIGHT + 25}`} 
            className="w-full h-full overflow-visible touch-none cursor-crosshair"
            preserveAspectRatio="none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
        >
            {durationChartData.map((d, i) => {
                let height = (d.value / maxVal) * CHART_HEIGHT;
                if (height > 0 && height < barWidth) height = barWidth;

                const cx = getColumnX(i, count);
                const x = cx - (barWidth / 2);
                const y = CHART_HEIGHT - height;
                const isZero = d.value === 0;
                
                // Show ticks if label exists
                const showTickMark = !!d.label;

                // Invisible hit area
                if (isZero && !showTickMark) {
                     return <rect key={i} x={x} y="-5" width={barWidth} height={CHART_HEIGHT + 20} fill="transparent" />;
                }

                // Determine colors
                // Track color removed (silhouette issue)
                const barColor = d.isCurrent ? "#f472b6" : "#db2777"; // brand-400 : brand-600
                const tickColor = d.isCurrent ? "#f472b6" : "#475569";

                return (
                    <g key={i}>
                        {!isZero && (
                            <>
                                <rect x={x} y={y} width={barWidth} height={height} rx={barWidth / 2} fill={barColor} className={interactionIndex !== null && interactionIndex !== i ? 'opacity-40' : 'opacity-100'} />
                            </>
                        )}
                        {showTickMark && (
                            <rect x={cx - 0.75} y={CHART_HEIGHT + 4} width={1.5} height={6} rx={0.5} fill={tickColor} />
                        )}
                        <rect x={x} y="-5" width={barWidth} height={CHART_HEIGHT + 20} fill="transparent" />
                    </g>
                );
            })}
            
            {interactionIndex !== null && durationChartData[interactionIndex] && (
                <line x1={getColumnX(interactionIndex, count)} y1="0" x2={getColumnX(interactionIndex, count)} y2={CHART_HEIGHT} stroke="#fff" strokeWidth="0.5" strokeDasharray="2 2" className="pointer-events-none" />
            )}
        </svg>
    );
  };

  const renderLabels = () => {
    return (
        <div className="absolute inset-0 pointer-events-none">
            {durationChartData.map((d, i) => {
                if (!d.label) return null;
                const count = durationChartData.length;
                const cx = getColumnX(i, count);
                const leftPct = (cx / CHART_WIDTH) * 100;
                
                return (
                    <div 
                      key={i} 
                      // FIX: Increased bottom spacing from 0.5 to 2 to separate text from ticks
                      className={`absolute bottom-2 text-[9px] font-bold uppercase tracking-wider transform -translate-x-1/2 ${d.isCurrent ? 'text-white' : 'text-slate-500'}`}
                      style={{ left: `${leftPct}%` }}
                    >
                        {d.label}
                    </div>
                );
            })}
        </div>
    );
  };

  const activeData = interactionIndex !== null ? durationChartData[interactionIndex] : null;
  const headerValue = activeData ? activeData.displayValue : summaryStats.timeDisplay;
  const headerLabel = activeData && activeData.fullDate ? activeData.fullDate : 'Time Logged';
  const labelColor = activeData ? 'text-brand-400' : 'text-slate-500';

  return (
    <div className="mb-8 w-full">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl px-3 py-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="mb-2 relative z-10 pointer-events-none">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className={`text-[10px] font-black uppercase tracking-widest mb-0.5 transition-colors duration-200 ${labelColor}`}>{headerLabel}</h3>
                        <span className="text-3xl font-black text-white tracking-tighter italic tabular-nums block h-9">{headerValue}</span>
                    </div>
                    
                    {/* Updated Navigation Controls */}
                    <div className="pointer-events-auto flex items-center gap-1.5">
                        
                        {/* Back Arrow - Vertical Pill */}
                        <button 
                            onClick={() => onNavigate(-1)}
                            disabled={!canGoBack}
                            className={`w-8 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 border ${!canGoBack ? 'bg-slate-800/50 border-slate-800 text-slate-700 cursor-not-allowed' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600 shadow-lg shadow-black/20'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                        </button>

                        {/* Forward Arrow - Vertical Pill */}
                        <button 
                            onClick={() => onNavigate(1)}
                            disabled={!canGoForward}
                            className={`w-8 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 border ${!canGoForward ? 'bg-slate-800/50 border-slate-800 text-slate-700 cursor-not-allowed' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 hover:border-slate-600 shadow-lg shadow-black/20'}`}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                        </button>

                        {/* Reset / Calendar Button - Circle */}
                        <button 
                            onClick={onReset}
                            disabled={isCurrentView}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 border ${isCurrentView ? 'bg-slate-800/50 border-slate-800 text-slate-700 cursor-default' : 'bg-slate-800 border-slate-700 text-brand-400 hover:text-white hover:bg-brand-600 hover:border-brand-500 shadow-lg shadow-black/20'}`}
                            title="Jump to Today"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </button>
                    </div>
                </div>
            </div>
            <div className="h-36 w-full pt-4 relative">
                {durationChartData.length > 0 ? (
                    <>
                        {renderBarChart()}
                        {renderLabels()}
                    </>
                ) : (
                    <div className="h-full flex items-center justify-center text-slate-600 text-xs font-bold uppercase tracking-wider">No Data</div>
                )}
            </div>
        </div>
    </div>
  );
};

export default StatsCard;