import React, { useState, useEffect } from 'react';
import { DayPlan, AppTheme } from '../types';

interface BattlePlanCardProps {
    plan: DayPlan | null;
    onPlanUpdate: (updatedPlan: DayPlan) => void;
    todayKey: string;
    theme: AppTheme;
    strategicPriority?: string;
}

const BattlePlanCard: React.FC<BattlePlanCardProps> = ({
    plan,
    onPlanUpdate,
    todayKey,
    theme,
    strategicPriority
}) => {
    const isDark = theme === 'dark';
    const [dragon, setDragon] = useState('');
    const [pillars, setPillars] = useState<string[]>(['', '', '']);
    const [constraints, setConstraints] = useState<string[]>(['']);
    const [isPlanExpanded, setIsPlanExpanded] = useState(false);

    useEffect(() => {
        if (plan) {
            setDragon(plan.dragon || '');
            setPillars(plan.pillars && plan.pillars.length === 3 ? plan.pillars : ['', '', '']);
            setConstraints(plan.constraints && plan.constraints.length > 0 ? plan.constraints : ['']);
        } else {
            setDragon('');
            setPillars(['', '', '']);
            setConstraints(['']);
        }
    }, [plan]);

    const savePlan = (updates: Partial<DayPlan>) => {
        const updatedPlan: DayPlan = {
            dateKey: todayKey,
            blocks: (plan && plan.dateKey === todayKey) ? plan.blocks : [],
            createdAt: (plan && plan.dateKey === todayKey) ? plan.createdAt : Date.now(),
            dragon: dragon,
            pillars: pillars,
            constraints: constraints,
            ...updates
        };
        onPlanUpdate(updatedPlan);
    };

    const handleDragonBlur = () => savePlan({ dragon });
    const handlePillarBlur = () => savePlan({ pillars });
    const handleConstraintBlur = () => savePlan({ constraints });

    return (
        <section className={`rounded-3xl border shadow-sm transition-all overflow-hidden ${isDark ? 'bg-zinc-900/50 border-white/5' : 'bg-white border-zinc-200'}`}>

            {/* Header / Toggle */}
            <div
                className={`p-4 flex items-center justify-between cursor-pointer transition-colors ${isDark ? 'active:bg-white/5' : 'active:bg-zinc-50'}`}
                onClick={() => setIsPlanExpanded(!isPlanExpanded)}
            >
                <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>BATTLE PLAN</span>
                    </div>
                </div>

                <button className={`p-2 rounded-full hover:bg-black/5 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                    {isPlanExpanded ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                    ) : (
                        <div className="flex items-center gap-2">
                            {!isPlanExpanded && dragon && <span className={`text-[10px] font-bold italic truncate max-w-[150px] ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>{dragon}</span>}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                    )}
                </button>
            </div>

            {/* Expanded Content */}
            {isPlanExpanded && (
                <div className="px-4 pb-6 pt-0 space-y-5 animate-slide-down">
                    {/* Divider */}
                    <div className={`h-px w-full mb-2 ${isDark ? 'bg-white/5' : 'bg-zinc-100'}`} />

                    {/* 1. THE CROWN (The Dragon) */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-amber-500' : 'text-amber-600'}`}>
                                I. The Crown
                            </span>
                        </div>
                        <textarea
                            value={dragon}
                            onChange={(e) => setDragon(e.target.value)}
                            onBlur={handleDragonBlur}
                            placeholder="Victory Condition..."
                            rows={2}
                            className={`w-full bg-transparent p-0 text-lg font-bold italic outline-none resize-none placeholder:italic transition-all ${isDark
                                ? 'text-white placeholder-white/20'
                                : 'text-zinc-900 placeholder-zinc-300'}`}
                        />
                    </div>

                    {/* 2. THE PILLARS (Strategy) */}
                    <div className="space-y-2">
                        <label className={`block text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            II. Strategy
                        </label>
                        <div className="space-y-2">
                            {pillars.map((p, idx) => (
                                <div key={idx} className="flex gap-2 items-center group">
                                    <span className={`text-[9px] font-mono font-bold opacity-30 ${isDark ? 'text-white' : 'text-black'}`}>0{idx + 1}</span>
                                    <input
                                        type="text"
                                        value={p}
                                        onChange={(e) => {
                                            const newPillars = [...pillars];
                                            newPillars[idx] = e.target.value;
                                            setPillars(newPillars);
                                        }}
                                        onBlur={handlePillarBlur}
                                        placeholder={`Tactic #${idx + 1}`}
                                        className={`flex-1 bg-transparent border-b border-dashed outline-none py-0.5 text-xs font-medium transition-all ${isDark
                                            ? 'border-white/10 focus:border-blue-400 text-white placeholder-white/10'
                                            : 'border-zinc-300 focus:border-blue-600 text-zinc-900 placeholder-zinc-300'}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. THE CONSTRAINTS (Rules) */}
                    <div className="space-y-2">
                        <label className={`block text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                            III. Constraints
                        </label>
                        <div className="space-y-2">
                            {constraints.map((c, idx) => (
                                <div key={idx} className="flex gap-2 items-center group">
                                    <span className={`text-[9px] font-mono font-bold opacity-30 ${isDark ? 'text-white' : 'text-black'}`}>Ø</span>
                                    <input
                                        type="text"
                                        value={c}
                                        onChange={(e) => {
                                            const newConstraints = [...constraints];
                                            newConstraints[idx] = e.target.value;
                                            setConstraints(newConstraints);
                                        }}
                                        onBlur={handleConstraintBlur}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && idx === constraints.length - 1 && c.trim() !== '') {
                                                setConstraints([...constraints, '']);
                                            }
                                        }}
                                        placeholder="Sacrifice..."
                                        className={`flex-1 bg-transparent border-b border-dashed outline-none py-0.5 text-xs font-medium transition-all ${isDark
                                            ? 'border-white/10 focus:border-red-400 text-white placeholder-white/10'
                                            : 'border-zinc-300 focus:border-red-600 text-zinc-900 placeholder-zinc-300'}`}
                                    />
                                    {constraints.length > 1 && (
                                        <button onClick={() => {
                                            const newConstraints = constraints.filter((_, i) => i !== idx);
                                            setConstraints(newConstraints);
                                            savePlan({ constraints: newConstraints });
                                        }} className="text-zinc-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">×</button>
                                    )}
                                </div>
                            ))}
                            {constraints.length < 5 && constraints[constraints.length - 1] !== '' && (
                                <button
                                    onClick={() => setConstraints([...constraints, ''])}
                                    className={`text-[9px] font-bold uppercase tracking-wider opacity-50 hover:opacity-100 mt-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}
                                >
                                    + Add Rule
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default BattlePlanCard;
