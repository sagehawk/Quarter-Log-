import React, { useState } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { BattlePlan, SacrificeLog, AppTheme, AIPersona } from '../types';
import { generateBattleReport } from '../utils/aiService';

interface BattleDashboardProps {
    plan: BattlePlan;
    sacrificeLog: SacrificeLog;
    theme: AppTheme;
    persona: AIPersona;
    onPlanUpdate: (plan: BattlePlan) => void;
    onSacrificeUpdate: (log: SacrificeLog) => void;
    onCreateNewPlan: () => void;
}

const BattleDashboard: React.FC<BattleDashboardProps> = ({
    plan,
    sacrificeLog,
    theme,
    persona,
    onPlanUpdate,
    onSacrificeUpdate,
    onCreateNewPlan,
}) => {
    const [reportContent, setReportContent] = useState<string | null>(null);
    const [reportLoading, setReportLoading] = useState(false);
    const [showReport, setShowReport] = useState(false);

    const isDark = theme === 'dark';
    const bg = isDark ? 'bg-zinc-950' : 'bg-[#F8F9FA]';
    const cardBg = isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200 shadow-sm';
    const textColor = isDark ? 'text-white' : 'text-zinc-900';
    const subText = isDark ? 'text-zinc-500' : 'text-zinc-400';
    const accent = isDark ? 'text-green-500' : 'text-green-600';

    const completedCount = plan.strategies.filter(s => s.completed).length;
    const allDone = completedCount === plan.strategies.length && plan.strategies.length > 0;

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        let h = d.getHours();
        const m = d.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    const toggleStrategy = (index: number) => {
        try { Haptics.notification({ type: NotificationType.Success }); } catch (e) { }
        const updated = { ...plan };
        updated.strategies = plan.strategies.map((s, i) => {
            if (i === index) {
                return {
                    ...s,
                    completed: !s.completed,
                    completedAt: !s.completed ? Date.now() : undefined,
                };
            }
            return s;
        });
        onPlanUpdate(updated);
    };

    const handleSacrificeFail = () => {
        try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) { }
        const updated: SacrificeLog = {
            ...sacrificeLog,
            failCount: sacrificeLog.failCount + 1,
            failTimestamps: [...sacrificeLog.failTimestamps, Date.now()],
        };
        onSacrificeUpdate(updated);
    };

    const handleGenerateReport = async () => {
        setReportLoading(true);
        setShowReport(true);
        try {
            const report = await generateBattleReport(plan, sacrificeLog, persona);
            setReportContent(report);
        } catch (e) {
            setReportContent("Failed to generate report. Try again.");
        } finally {
            setReportLoading(false);
        }
    };

    return (
        <div className={`flex flex-col gap-4 pb-8 animate-fade-in`}>

            {/* North Star */}
            <div className={`rounded-2xl border p-4 ${cardBg}`}>
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-green-500' : 'text-green-600'}`}>
                        ★ North Star
                    </span>
                </div>
                <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {plan.northStar}
                </p>
            </div>

            {/* Victory Condition */}
            <div className={`rounded-2xl border p-5 ${cardBg}`}>
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-2 ${isDark ? 'text-green-500' : 'text-green-600'}`}>
                    Today's Victory
                </span>
                <p className={`text-lg font-bold leading-snug ${textColor}`}>
                    {plan.victoryCondition}
                </p>
            </div>

            {/* Strategies */}
            <div className={`rounded-2xl border overflow-hidden ${cardBg}`}>
                <div className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-green-500' : 'text-green-600'}`}>
                            Battle Plan
                        </span>
                        <span className={`text-xs font-bold ${allDone ? accent : subText}`}>
                            {completedCount}/{plan.strategies.length}
                        </span>
                    </div>
                </div>

                <div className="px-3 pb-3 space-y-2">
                    {plan.strategies.map((strategy, i) => (
                        <button
                            key={i}
                            onClick={() => toggleStrategy(i)}
                            className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all active:scale-[0.98] text-left ${strategy.completed
                                ? isDark
                                    ? 'bg-green-500/10 border-green-500/30'
                                    : 'bg-green-50 border-green-200'
                                : isDark
                                    ? 'bg-zinc-800/50 border-zinc-700 hover:bg-zinc-800'
                                    : 'bg-zinc-50 border-zinc-200 hover:bg-zinc-100'
                                }`}
                        >
                            {/* Checkbox */}
                            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border-2 transition-all ${strategy.completed
                                ? 'bg-green-500 border-green-500'
                                : isDark ? 'border-zinc-600' : 'border-zinc-300'
                                }`}>
                                {strategy.completed && (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>

                            {/* Text */}
                            <div className="flex-1 min-w-0">
                                <span className={`text-sm font-semibold block ${strategy.completed
                                    ? isDark ? 'text-green-400 line-through opacity-70' : 'text-green-700 line-through opacity-70'
                                    : textColor
                                    }`}>
                                    {strategy.text}
                                </span>
                                {strategy.completed && strategy.completedAt && (
                                    <span className={`text-[10px] font-mono ${isDark ? 'text-green-500/60' : 'text-green-600/60'}`}>
                                        Completed at {formatTime(strategy.completedAt)}
                                    </span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Sacrifice */}
            <div className={`rounded-2xl border p-4 ${cardBg}`}>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            Sacrifice
                        </span>
                        <p className={`text-sm font-semibold mt-1 ${textColor}`}>
                            {plan.sacrifice}
                        </p>
                    </div>
                    <div className={`text-center px-3 py-1 rounded-xl ${sacrificeLog.failCount === 0
                        ? isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-600'
                        : isDark ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-zinc-900'
                        }`}>
                        <span className="text-lg font-black block leading-none">{sacrificeLog.failCount}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">fails</span>
                    </div>
                </div>

                <button
                    onClick={handleSacrificeFail}
                    className={`w-full py-3 rounded-xl border text-sm font-bold uppercase tracking-wider transition-all active:scale-[0.98] ${isDark
                        ? 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                        : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
                        }`}
                >
                    I Broke the Sacrifice
                </button>
            </div>

            {/* Progress bar */}
            {allDone && sacrificeLog.failCount === 0 && (
                <div className={`rounded-2xl border p-5 text-center ${cardBg}`}>
                    <span className="text-3xl block mb-2">🏆</span>
                    <p className={`text-lg font-black ${textColor}`}>Mission Complete</p>
                    <p className={`text-xs ${subText}`}>All strategies done. Sacrifice held. You won today.</p>
                </div>
            )}

            {/* Battle Report */}
            <button
                onClick={handleGenerateReport}
                disabled={reportLoading}
                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98] ${isDark
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20'
                    : 'bg-green-50 border border-green-200 text-green-700 hover:bg-green-100'
                    }`}
            >
                {reportLoading ? 'Generating...' : '📊 Generate Battle Report'}
            </button>

            {/* New Plan */}
            <button
                onClick={onCreateNewPlan}
                className={`w-full py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${subText} hover:${textColor}`}
            >
                Create New Plan
            </button>

            {/* Report Modal */}
            {showReport && (
                <div className={`fixed inset-0 z-[200] flex items-end justify-center ${isDark ? 'bg-black/80' : 'bg-black/40'} backdrop-blur-sm`}
                    onClick={() => setShowReport(false)}
                >
                    <div
                        className={`w-full max-w-md rounded-t-3xl border-t p-6 pb-[calc(2rem+env(safe-area-inset-bottom))] max-h-[70vh] overflow-y-auto ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
                            }`}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-green-500' : 'text-green-600'}`}>
                                Battle Report
                            </span>
                            <button onClick={() => setShowReport(false)} className={`p-2 rounded-full ${subText}`}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        {reportLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-3">
                                <div className={`w-8 h-8 border-2 border-t-green-500 rounded-full animate-spin ${isDark ? 'border-zinc-700' : 'border-zinc-200'}`} />
                                <span className={`text-xs font-bold uppercase tracking-wider ${subText}`}>Analyzing your day...</span>
                            </div>
                        ) : reportContent ? (
                            <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                                {reportContent}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BattleDashboard;
