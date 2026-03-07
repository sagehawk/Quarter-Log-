import React, { useState } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { BattlePlan, Strategy, AppTheme } from '../types';

interface BattlePlanSetupProps {
    theme: AppTheme;
    existingNorthStar?: string;
    onComplete: (plan: BattlePlan) => void;
    onCancel?: () => void;
}

const BattlePlanSetup: React.FC<BattlePlanSetupProps> = ({ theme, existingNorthStar, onComplete, onCancel }) => {
    const [step, setStep] = useState(0);
    const [northStar, setNorthStar] = useState(existingNorthStar || '');
    const [victoryCondition, setVictoryCondition] = useState('');
    const [strategies, setStrategies] = useState(['', '', '']);
    const [sacrifice, setSacrifice] = useState('');
    const [animating, setAnimating] = useState(false);

    const isDark = theme === 'dark';
    const bg = isDark ? 'bg-zinc-950' : 'bg-white';
    const textColor = isDark ? 'text-white' : 'text-zinc-900';
    const subText = isDark ? 'text-zinc-500' : 'text-zinc-400';
    const inputBg = isDark
        ? 'bg-zinc-900 border-zinc-800 text-white placeholder-zinc-600 focus:border-green-500'
        : 'bg-zinc-50 border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:border-green-500';

    const goNext = () => {
        try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { }
        setAnimating(true);
        setTimeout(() => {
            setStep(prev => prev + 1);
            setAnimating(false);
        }, 200);
    };

    const goBack = () => {
        try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
        setAnimating(true);
        setTimeout(() => {
            setStep(prev => prev - 1);
            setAnimating(false);
        }, 200);
    };

    const handleFinish = () => {
        try { Haptics.notification({ type: NotificationType.Success }); } catch (e) { }
        const plan: BattlePlan = {
            id: crypto.randomUUID(),
            dateKey: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })(),
            northStar: northStar.trim(),
            victoryCondition: victoryCondition.trim(),
            strategies: strategies.filter(s => s.trim()).map(s => ({
                text: s.trim(),
                completed: false,
            })),
            sacrifice: sacrifice.trim(),
            createdAt: Date.now(),
        };
        onComplete(plan);
    };

    const updateStrategy = (idx: number, value: string) => {
        const updated = [...strategies];
        updated[idx] = value;
        setStrategies(updated);
    };

    const steps = [
        {
            label: 'I',
            title: 'What is your North Star?',
            subtitle: 'The overarching goal that guides everything you do.',
            content: (
                <textarea
                    autoFocus
                    value={northStar}
                    onChange={e => setNorthStar(e.target.value)}
                    placeholder="e.g. Build a profitable SaaS by Q3..."
                    rows={3}
                    className={`w-full rounded-2xl border p-4 text-lg font-medium outline-none resize-none transition-all ${inputBg}`}
                />
            ),
            canAdvance: northStar.trim().length > 0,
        },
        {
            label: 'II',
            title: 'What does victory look like today?',
            subtitle: 'If you could only accomplish one thing today, what would it be?',
            content: (
                <textarea
                    autoFocus
                    value={victoryCondition}
                    onChange={e => setVictoryCondition(e.target.value)}
                    placeholder="e.g. Ship the landing page and get 3 signups..."
                    rows={3}
                    className={`w-full rounded-2xl border p-4 text-lg font-medium outline-none resize-none transition-all ${inputBg}`}
                />
            ),
            canAdvance: victoryCondition.trim().length > 0,
        },
        {
            label: 'III',
            title: "What's your battle plan?",
            subtitle: 'Three concrete actions to achieve victory today.',
            content: (
                <div className="space-y-3">
                    {strategies.map((s, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <span className={`text-sm font-black w-6 text-center ${isDark ? 'text-green-500' : 'text-green-600'}`}>
                                {i + 1}
                            </span>
                            <input
                                autoFocus={i === 0}
                                type="text"
                                value={s}
                                onChange={e => updateStrategy(i, e.target.value)}
                                placeholder={`Strategy #${i + 1}`}
                                className={`flex-1 rounded-xl border p-3 text-base font-medium outline-none transition-all ${inputBg}`}
                            />
                        </div>
                    ))}
                </div>
            ),
            canAdvance: strategies.filter(s => s.trim()).length >= 1,
        },
        {
            label: 'IV',
            title: 'What will you sacrifice?',
            subtitle: "What are you giving up today to win? Track every time you fail to hold the line.",
            content: (
                <input
                    autoFocus
                    type="text"
                    value={sacrifice}
                    onChange={e => setSacrifice(e.target.value)}
                    placeholder="e.g. No social media, No sugar, No Netflix..."
                    className={`w-full rounded-2xl border p-4 text-lg font-medium outline-none transition-all ${inputBg}`}
                />
            ),
            canAdvance: sacrifice.trim().length > 0,
        },
    ];

    const current = steps[step];
    const isLast = step === steps.length - 1;

    return (
        <div className={`fixed inset-0 z-[100] flex flex-col ${bg} transition-colors`}>
            {/* Progress bar */}
            <div className="px-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
                <div className="flex gap-2">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-500 ${i <= step
                                ? 'bg-green-500'
                                : isDark ? 'bg-zinc-800' : 'bg-zinc-200'
                                }`}
                        />
                    ))}
                </div>
            </div>

            {/* Back / Cancel */}
            <div className="px-6 pt-4 flex justify-between items-center">
                {step > 0 ? (
                    <button onClick={goBack} className={`text-sm font-bold uppercase tracking-wider ${subText}`}>
                        ← Back
                    </button>
                ) : onCancel ? (
                    <button onClick={onCancel} className={`text-sm font-bold uppercase tracking-wider ${subText}`}>
                        Cancel
                    </button>
                ) : <div />}
                <span className={`text-xs font-mono font-bold tracking-wider ${subText}`}>
                    {step + 1} / {steps.length}
                </span>
            </div>

            {/* Content */}
            <div className={`flex-1 flex flex-col justify-center px-8 transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>
                <div className="mb-2">
                    <span className={`text-xs font-black uppercase tracking-[0.3em] ${isDark ? 'text-green-500' : 'text-green-600'}`}>
                        {current.label}
                    </span>
                </div>
                <h1 className={`text-2xl font-black mb-2 leading-tight ${textColor}`}>
                    {current.title}
                </h1>
                <p className={`text-sm mb-8 ${subText}`}>
                    {current.subtitle}
                </p>
                {current.content}
            </div>

            {/* Action button */}
            <div className="px-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
                <button
                    onClick={isLast ? handleFinish : goNext}
                    disabled={!current.canAdvance}
                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98] ${current.canAdvance
                        ? 'bg-green-500 text-white shadow-lg shadow-green-500/25 hover:bg-green-400'
                        : isDark
                            ? 'bg-zinc-900 text-zinc-700 cursor-not-allowed'
                            : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                        }`}
                >
                    {isLast ? 'Lock In Battle Plan' : 'Continue'}
                </button>
            </div>
        </div>
    );
};

export default BattlePlanSetup;
