import React, { useRef, useState } from 'react';
import StatusCard from '../StatusCard';
import LogList from '../LogList';
import { LogEntry, ScheduleConfig, AppTheme, AppStatus } from '../../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface CommandViewProps {
    status: AppStatus;
    timeLeft: number;
    schedule: ScheduleConfig;
    blockStats: { total: number; remaining: number };
    onToggleTimer: () => void;
    onManualEntry: () => void;
    theme: AppTheme;
    strategicPriority: string;
    isEditingPriority: boolean;
    priorityInput: string;
    onPriorityEditStart: () => void;
    onPriorityInputChange: (val: string) => void;
    onPrioritySave: () => void;
    priorityAnimation: boolean;
    onWeeklyDebrief: () => void;
    recentLogs: LogEntry[];
    onNavigateToIntel: () => void;
}

const CommandView: React.FC<CommandViewProps> = ({
    status, timeLeft, schedule, blockStats, onToggleTimer, onManualEntry, theme,
    strategicPriority, isEditingPriority, priorityInput, onPriorityEditStart, onPriorityInputChange, onPrioritySave,
    priorityAnimation, onWeeklyDebrief, recentLogs, onNavigateToIntel
}) => {
    const isDark = theme === 'dark';

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Strategic Priority / North Star */}
            <section className="group">
                {isEditingPriority ? (
                    <div className="bg-black border border-green-500/50 rounded-3xl p-1 animate-fade-in relative overflow-hidden">

                        <textarea
                            value={priorityInput}
                            onChange={(e) => onPriorityInputChange(e.target.value)}
                            className="w-full bg-transparent text-white font-black text-2xl p-6 outline-none resize-none tracking-tight placeholder:text-white/20 relative z-10"
                            placeholder="Define your objective..."
                            rows={3}
                            autoFocus
                            onBlur={onPrioritySave}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onPrioritySave(); } }}
                        />
                        <div className="absolute bottom-4 right-4 z-20">
                            <span className="text-[10px] font-black uppercase tracking-widest text-green-500 bg-black/50 px-2 py-1 rounded backdrop-blur-md">Press Enter</span>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={() => {
                            try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
                            onPriorityEditStart();
                        }}
                        className={`w-full text-left border rounded-3xl p-6 transition-all active:scale-[0.98] relative overflow-hidden group ${priorityAnimation ? 'animate-pulse ring-2 ring-green-500' : ''} ${isDark
                            ? 'bg-zinc-900 border-zinc-800'
                            : 'bg-white border-zinc-200 shadow-sm'
                            }`}
                    >


                        <div className="flex items-center justify-between mb-3 relative z-10">
                            <div className="flex flex-col">
                                <span className="text-xs font-black uppercase tracking-[0.3em] text-green-500 italic flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-green-500"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    North Star
                                </span>
                            </div>

                        </div>
                        <div className={`text-2xl font-black italic tracking-tighter leading-none relative z-10 ${strategicPriority ? (isDark ? 'text-white' : 'text-zinc-700') : (isDark ? 'text-white/20' : 'text-zinc-300')}`}>
                            {strategicPriority || "Tap to set your main goal"}
                        </div>
                    </button>
                )}
            </section>

            {/* Timer Card */}
            <section id="status-card">
                <StatusCard
                    isActive={status === AppStatus.RUNNING}
                    timeLeft={timeLeft}
                    schedule={schedule}
                    blockStats={blockStats}
                    onToggle={onToggleTimer}
                    onManualEntry={onManualEntry}
                    theme={theme}
                />
            </section>

            {/* Quick Actions (Weekly Review) */}
            <div className="flex items-center justify-center gap-4 mt-8">
                <button
                    onClick={onWeeklyDebrief}
                    className={`flex items-center gap-2 px-6 py-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${isDark ? 'bg-zinc-900 text-zinc-500 hover:text-white hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    Weekly Review
                </button>

                <button
                    id="manual-entry-btn"
                    onClick={() => {
                        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
                        onManualEntry();
                    }}
                    className={`flex items-center gap-2 px-6 py-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${isDark ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-white text-zinc-900 border border-zinc-100'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    Log Now
                </button>
            </div>

            {/* Recent Logs Section */}
            <div className={`mt-10 -mx-5 pt-8 pb-32 -mb-28 px-5 rounded-t-[40px] ${isDark ? 'bg-[#121212]' : 'bg-white'}`}>
                <div className="flex items-center justify-between mb-6">
                    <h3 className={`text-sm font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Recent Logs</h3>
                    <button
                        onClick={() => {
                            try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
                            onNavigateToIntel();
                        }}
                        className={`text-xs font-bold transition-opacity active:opacity-50 ${isDark ? 'text-green-500' : 'text-green-600'}`}
                    >
                        <span>All Logs</span>
                    </button>
                </div>

                <div>
                    {recentLogs.length > 0 ? (
                        <LogList
                            logs={recentLogs.slice(0, 5)}
                            onDelete={() => { }}
                            onEdit={() => { }}
                            theme={theme}
                        />
                    ) : (
                        <div className={`text-center py-8 text-xs font-black uppercase tracking-widest ${isDark ? 'text-zinc-800' : 'text-zinc-200'}`}>
                            No recent activity
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CommandView;
