import React from 'react';
import FocusScore from '../FocusScore';
import InsightsCard from '../InsightsCard';
import StatsCard from '../StatsCard';
import LogList from '../LogList';
import { LogEntry, AppTheme, ScheduleConfig, AIReport, FilterType } from '../../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface IntelViewProps {
    logs: LogEntry[];
    filteredLogs: LogEntry[];
    allLogs: LogEntry[];
    currentStreak: number;
    theme: AppTheme;
    filter: FilterType;
    setFilter: (f: FilterType) => void;
    viewDate: Date;
    setViewDate: (d: Date) => void;
    schedule: ScheduleConfig;
    onNavigate: (dir: -1 | 1) => void;
    onResetView: () => void;
    isCurrentView: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
    savedReportForView: AIReport | null;
    onGenerateReport: () => void;
    onOpenAIModal: () => void;
    onExport: () => void;
    copyFeedback: boolean;
    onLogDelete: (id: string) => void;
    onLogEdit: (log: LogEntry) => void;
    animationClass?: string;
}

const IntelView: React.FC<IntelViewProps> = ({
    logs, filteredLogs, allLogs, currentStreak, theme,
    filter, setFilter, viewDate, setViewDate, schedule,
    onNavigate, onResetView, isCurrentView, canGoBack, canGoForward,
    savedReportForView, onGenerateReport, onOpenAIModal, onExport, copyFeedback,
    onLogDelete, onLogEdit, animationClass = 'animate-fade-in'
}) => {
    const isDark = theme === 'dark';

    return (
        <div className="pb-32">
            {/* Date Navigator Header (Fixed Top) */}
            <div className={`fixed top-[calc(5rem+env(safe-area-inset-top))] left-0 right-0 z-30 px-5 py-3 flex items-center justify-between transition-colors duration-300 ${isDark ? 'bg-black' : 'bg-[#F4F5F7]'}`}>
                <div className="flex flex-col">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-zinc-500'}`}>
                        {filter === 'D' ? (isCurrentView ? 'TODAY' : 'DATE') : filter === 'W' ? 'WEEK OF' : filter === 'M' ? 'MONTH' : filter === '3M' ? 'QUARTER' : 'YEAR'}
                    </span>
                    <span className={`text-xl font-black uppercase tracking-tight ${isDark ? 'text-white' : 'text-zinc-700'}`}>
                        {viewDate.toLocaleDateString(undefined, {
                            month: 'short',
                            day: filter === 'D' || filter === 'W' ? 'numeric' : undefined,
                            year: filter !== 'D' && filter !== 'W' ? 'numeric' : undefined
                        })}
                        {filter === 'W' && ` - ${new Date(viewDate.getTime() + 6 * 86400000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { } onNavigate(-1); }}
                        disabled={!canGoBack}
                        className={`p-2.5 rounded-xl border transition-all active:scale-95 ${isDark ? 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 disabled:opacity-20' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-20'}`}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
                    </button>

                    <button
                        onClick={() => { try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { } onNavigate(1); }}
                        disabled={!canGoForward}
                        className={`p-2.5 rounded-xl border transition-all active:scale-95 ${isDark ? 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 disabled:opacity-20' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-20'}`}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </button>

                    <button
                        onClick={() => { try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { } onResetView(); }}
                        className={`p-2.5 rounded-xl border transition-all active:scale-95 ${isCurrentView
                            ? (isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-600' : 'bg-white border-zinc-200 text-zinc-400')
                            : (isDark ? 'bg-green-500 text-black border-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-green-500 text-white border-green-600 shadow-md')
                            }`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><path d="M8 14h.01"></path><path d="M12 14h.01"></path><path d="M16 14h.01"></path><path d="M8 18h.01"></path><path d="M12 18h.01"></path><path d="M16 18h.01"></path></svg>
                    </button>
                </div>
            </div>

            <div className={`pt-10 space-y-8 ${animationClass}`}>
                {/* Focus Score Section */}
                <div>
                    <FocusScore
                        logs={filteredLogs}
                        allLogs={allLogs}
                        streak={currentStreak}
                        theme={theme}
                    />
                </div>

                {/* Performance Stats */}
                <StatsCard
                    logs={filteredLogs}
                    filter={filter}
                    viewDate={viewDate}
                    onNavigate={onNavigate}
                    onReset={onResetView}
                    isCurrentView={isCurrentView}
                    canGoBack={canGoBack}
                    canGoForward={canGoForward}
                    theme={theme}
                    schedule={schedule}
                    durationMs={15 * 60 * 1000}
                />

                {/* Pattern Intelligence */}
                <div>
                    <InsightsCard logs={logs} theme={theme} />
                </div>

                {/* AI Summary Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className={`text-xs font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>AI Intelligence</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                        {savedReportForView ? (
                            <button
                                onClick={() => { try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { } onOpenAIModal(); }}
                                className={`flex-1 flex items-center gap-3 py-4 px-6 rounded-2xl transition-all border ${isDark ? 'bg-green-500/10 border-green-500/20 text-green-500 hover:bg-green-500/20' : 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 shadow-sm'}`}
                            >
                                <div className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-green-500/20' : 'bg-white'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-black uppercase tracking-[0.2em] leading-none">View Report</span>
                                    {savedReportForView.read === false && <span className="text-[10px] text-green-500 font-bold uppercase tracking-widest mt-1">NEW</span>}
                                </div>
                            </button>
                        ) : (
                            <button
                                onClick={() => { try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { } onGenerateReport(); }}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl border transition-all active:scale-95 ${isDark ? 'bg-zinc-900 border-zinc-800 text-green-500 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-green-600 hover:bg-zinc-50 shadow-sm'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                                <span className="text-sm font-black uppercase tracking-[0.2em] leading-none">Generate AI Insight</span>
                            </button>
                        )}

                        <button
                            onClick={onExport}
                            className={`flex items-center justify-center gap-2 py-4 px-6 rounded-2xl border transition-all active:scale-95 ${isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white' : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:text-zinc-700 shadow-sm'}`}
                        >
                            {copyFeedback ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            )}
                            <span className="text-sm font-black uppercase tracking-[0.2em] leading-none">Export Logs</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1">
                    <LogList logs={filteredLogs} onDelete={onLogDelete} onEdit={onLogEdit} theme={theme} />
                </div>
            </div>

            {/* Filter Bar (Sticky Bottom) */}
            <div className={`fixed bottom-[85px] left-0 right-0 px-5 z-40 transition-transform duration-300`}>
                <div className={`p-1.5 rounded-2xl flex items-center justify-between w-full max-w-md mx-auto border shadow-2xl backdrop-blur-xl ${isDark ? 'bg-black/80 border-white/10' : 'bg-white/80 border-zinc-200'}`}>
                    {(['D', 'W', 'M', '3M', 'Y'] as FilterType[]).map((f) => (
                        <button key={f} onClick={() => { try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { } setFilter(f); setViewDate(new Date()); }} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all duration-300 ${filter === f ? 'bg-green-500 text-black shadow-lg shadow-green-500/20' : isDark ? 'text-zinc-500 hover:text-white hover:bg-zinc-800' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50'}`} >
                            {f}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default IntelView;
