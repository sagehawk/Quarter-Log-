import React, { useState, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AppTheme, LogEntry, ScheduleConfig, DayPlan, LogCategory } from '../types';
import DayPlanner from './DayPlanner';
import TacticalCoachView, { CoachMood } from './TacticalCoachView';

interface CycleReflectionOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (text: string, category: LogCategory, startTime?: number, duration?: number) => void;
    schedule: ScheduleConfig;
    logs: LogEntry[];
    plan: DayPlan | null;
    onPlanUpdate: (plan: DayPlan) => void;
    theme?: AppTheme;
    cycleDuration: number;
}

const CycleReflectionOverlay: React.FC<CycleReflectionOverlayProps> = ({
    isOpen,
    onClose,
    onSave,
    schedule,
    logs,
    plan,
    onPlanUpdate,
    theme = 'dark',
    cycleDuration
}) => {
    const [logText, setLogText] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<LogCategory>('MAKER');
    const [coachMood, setCoachMood] = useState<CoachMood>('ASKING');
    const [coachMessage, setCoachMessage] = useState("Report status. What did you execute?");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    const isDark = theme === 'dark';

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setCoachMood('ASKING');
            setCoachMessage("Cycle complete. Report your status.");
            setLogText('');
            setIsSubmitting(false);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 500);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleSlotClick = (time: string, dateKey: string) => {
        // If user clicks a slot, we could auto-fill based on plan
        if (!plan) return;
        const block = plan.blocks.find(b => b.startTime === time);
        if (block) {
            setLogText(prev => prev ? `${prev}; ${block.label}` : block.label);
            setSelectedCategory(block.category);
            try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
        }
    };

    const handleSubmit = () => {
        if (!logText.trim()) return;

        try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { }
        setIsSubmitting(true);
        setCoachMood('PROCESSING');
        setCoachMessage("Logging execution...");

        // Small delay for animation
        setTimeout(() => {
            onSave(logText.trim(), selectedCategory);
            // The parent component should handle closing
        }, 800);
    };

    if (!isVisible) return null;

    return (
        <div className={`fixed inset-0 z-[60] transition-transform duration-500 ease-in-out ${isOpen && !isSubmitting ? 'translate-x-0' : 'translate-x-full'}`}>
            {/* Background/Planner Layer */}
            <div className={`absolute inset-0 ${isDark ? 'bg-black' : 'bg-[#F4F5F7]'}`}>
                <TacticalCoachView
                    mood={coachMood}
                    message={coachMessage}
                    theme={theme}
                    mode="MINI"
                >
                    <div className="h-full pt-12 px-4 pb-48 opacity-50 pointer-events-auto">
                        <DayPlanner
                            schedule={schedule}
                            logs={logs}
                            plan={plan}
                            onPlanUpdate={onPlanUpdate}
                            theme={theme}
                            cycleDuration={cycleDuration}
                            onSlotClick={handleSlotClick}
                        />
                    </div>
                </TacticalCoachView>
            </div>

            {/* Input Overlay (Bottom Right) */}
            <div className={`absolute bottom-6 right-6 left-28 z-50 transition-all duration-500 ${isSubmitting ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
                <div className={`p-4 rounded-xl shadow-2xl border backdrop-blur-md ${isDark ? 'bg-zinc-900/90 border-zinc-800' : 'bg-white/90 border-zinc-200'}`}>
                    <div className="flex gap-2 mb-3 overflow-x-auto pb-2 scrollbar-hide">
                        {(['MAKER', 'MANAGER', 'R&D', 'FUEL', 'RECOVERY', 'BURN', 'OTHER'] as LogCategory[]).map(cat => (
                            <button
                                key={cat}
                                onClick={() => { setSelectedCategory(cat); try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { } }}
                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border ${selectedCategory === cat
                                        ? (isDark ? 'bg-white text-black border-white' : 'bg-zinc-900 text-white border-zinc-900')
                                        : (isDark ? 'bg-zinc-800/50 text-zinc-400 border-transparent hover:bg-zinc-800' : 'bg-zinc-100/50 text-zinc-500 border-transparent hover:bg-zinc-200')
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={logText}
                            onChange={e => setLogText(e.target.value)}
                            placeholder="Log activity..."
                            className={`flex-1 bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-zinc-600' : 'text-zinc-900 placeholder-zinc-400'}`}
                            autoFocus
                            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={!logText.trim()}
                            className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${logText.trim()
                                    ? 'bg-green-500 text-black hover:bg-green-400 shadow-[0_0_10px_rgba(34,197,94,0.4)]'
                                    : (isDark ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-200 text-zinc-400')
                                }`}
                        >
                            Log
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CycleReflectionOverlay;
