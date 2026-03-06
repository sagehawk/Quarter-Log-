import React, { useRef, useState } from 'react';
import StatusCard from '../StatusCard';
import LogList from '../LogList';
import BattlePlanCard from '../BattlePlanCard';
import { LogEntry, ScheduleConfig, AppTheme, AppStatus, DayPlan } from '../../types';
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
    dayPlan: DayPlan | null;
    onPlanUpdate: (plan: DayPlan) => void;
    onIntegrityLog?: (did: string) => void;
}

const CommandView: React.FC<CommandViewProps> = ({
    status, timeLeft, schedule, blockStats, onToggleTimer, onManualEntry, theme,
    strategicPriority, isEditingPriority, priorityInput, onPriorityEditStart, onPriorityInputChange, onPrioritySave,
    priorityAnimation, onWeeklyDebrief, recentLogs, onNavigateToIntel, dayPlan, onPlanUpdate, onIntegrityLog
}) => {
    const isDark = theme === 'dark';

    const [intention, setIntention] = useState(() => localStorage.getItem('ironlog_intention') || '');
    const [integrityStep, setIntegrityStep] = useState<0 | 1 | 2>(0);
    const [didInput, setDidInput] = useState('');
    const [willDoInput, setWillDoInput] = useState('');

    const textInputRef = useRef<HTMLInputElement>(null);

    const handleStartIntegrity = () => {
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
        setIntegrityStep(1);
        setTimeout(() => textInputRef.current?.focus(), 50);
    };

    const handleDidSubmit = () => {
        if (!didInput.trim()) return;
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
        setIntegrityStep(2);
        setTimeout(() => textInputRef.current?.focus(), 50);
    };

    const handleWillDoSubmit = () => {
        if (!willDoInput.trim()) return;

        const newIntention = willDoInput.trim();
        localStorage.setItem('ironlog_intention', newIntention);
        setIntention(newIntention);

        if (onIntegrityLog) {
            onIntegrityLog(didInput.trim());
        }

        setDidInput('');
        setWillDoInput('');
        setIntegrityStep(0);
    };

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

            {/* Battle Plan Card (Moved from Plan View) */}
            <BattlePlanCard
                plan={dayPlan}
                onPlanUpdate={onPlanUpdate}
                todayKey={new Date().toISOString().split('T')[0]} // Command view is always today
                theme={theme}
                strategicPriority={strategicPriority}
            />

            {/* Timer Card Removed */}


            {/* Integrity Logging Loop */}
            <div className={`mt-8 border rounded-3xl p-6 transition-all ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm'}`}>
                {integrityStep === 0 ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                        <div className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {intention ? "ACTIVE PROTOCOL" : "AWAITING ORDERS"}
                        </div>
                        {intention && (
                            <div className={`text-xl font-bold italic ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                                "{intention}"
                            </div>
                        )}
                        <div className="flex items-center justify-center gap-4 mt-2 w-full">
                            <button
                                onClick={onWeeklyDebrief}
                                className={`flex-1 flex justify-center items-center gap-2 px-4 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 ${isDark ? 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200'}`}
                            >
                                Review
                            </button>

                            <button
                                onClick={handleStartIntegrity}
                                className={`flex-[2] flex justify-center items-center gap-2 px-6 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg ${isDark ? 'bg-green-500 text-black shadow-green-500/20 hover:bg-green-400' : 'bg-zinc-900 text-white shadow-zinc-900/20 hover:bg-zinc-800'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                Log Block
                            </button>
                        </div>
                    </div>
                ) : integrityStep === 1 ? (
                    <div className="animate-fade-in flex flex-col gap-4">
                        <div className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-green-500' : 'text-green-600'}`}>
                            INTEGRITY CHECK
                        </div>
                        <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            {intention ? (
                                <>You said you would: <span className="opacity-50 line-through">"{intention}"</span><br />What did you actually do?</>
                            ) : "What did you do?"}
                        </div>
                        <input
                            ref={textInputRef}
                            type="text"
                            value={didInput}
                            onChange={(e) => setDidInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleDidSubmit(); }}
                            placeholder="Enter reality..."
                            className={`w-full bg-transparent border-b-2 text-lg py-2 outline-none transition-colors ${isDark ? 'border-zinc-700 focus:border-green-500 text-white placeholder:text-zinc-600' : 'border-zinc-300 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400'}`}
                        />
                        <button
                            onClick={handleDidSubmit}
                            disabled={!didInput.trim()}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${didInput.trim() ? (isDark ? 'bg-white text-black' : 'bg-black text-white') : (isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-200 text-zinc-400')}`}
                        >
                            Confirm Reality
                        </button>
                    </div>
                ) : (
                    <div className="animate-fade-in flex flex-col gap-4">
                        <div className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-blue-500' : 'text-blue-600'}`}>
                            NEXT PROTOCOL
                        </div>
                        <div className={`text-xl font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            What will you do next?
                        </div>
                        <input
                            ref={textInputRef}
                            type="text"
                            value={willDoInput}
                            onChange={(e) => setWillDoInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleWillDoSubmit(); }}
                            placeholder="Set intention..."
                            className={`w-full bg-transparent border-b-2 text-lg py-2 outline-none transition-colors ${isDark ? 'border-zinc-700 focus:border-blue-500 text-white placeholder:text-zinc-600' : 'border-zinc-300 focus:border-zinc-900 text-zinc-900 placeholder:text-zinc-400'}`}
                        />
                        <button
                            onClick={handleWillDoSubmit}
                            disabled={!willDoInput.trim()}
                            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${willDoInput.trim() ? (isDark ? 'bg-blue-500 text-white' : 'bg-zinc-900 text-white') : (isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-zinc-200 text-zinc-400')}`}
                        >
                            Commit Intention
                        </button>
                    </div>
                )}
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
