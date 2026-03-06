import React, { useState } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { NotificationConfig } from '../types';
import { requestNotificationPermission } from '../utils/notifications';

interface OnboardingProps {
    onComplete: (notifConfig: NotificationConfig) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [step, setStep] = useState(0);
    const [morningTime, setMorningTime] = useState('08:00');
    const [eveningTime, setEveningTime] = useState('21:00');
    const [notifEnabled, setNotifEnabled] = useState(true);
    const [animating, setAnimating] = useState(false);

    const scenes = [
        {
            emoji: '⚔️',
            title: 'Ready to win your day?',
            subtitle: "Battle Plan helps you define what matters, execute, and track your discipline.",
        },
        {
            emoji: '📋',
            title: 'How it works',
            subtitle: "Set a daily battle plan with your goal, 3 strategies, and a sacrifice. Check them off as you go. The AI tracks your progress and gives you a report.",
        },
        {
            emoji: '🔔',
            title: 'Stay accountable',
            subtitle: "Set a morning reminder to create your plan and an evening reminder to review your day.",
        },
        {
            emoji: '🚀',
            title: "Let's go",
            subtitle: "You're all set. Create your first battle plan and start winning.",
        },
    ];

    const goNext = () => {
        try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { }
        setAnimating(true);
        setTimeout(() => {
            setStep(prev => prev + 1);
            setAnimating(false);
        }, 200);
    };

    const handleFinish = () => {
        try { Haptics.notification({ type: NotificationType.Success }); } catch (e) { }
        onComplete({
            morningTime,
            eveningTime,
            enabled: notifEnabled,
        });
    };

    const handleEnableNotifications = async () => {
        const granted = await requestNotificationPermission();
        setNotifEnabled(granted);
        goNext();
    };

    const current = scenes[step];
    const isLast = step === scenes.length - 1;
    const isNotifStep = step === 2;

    const renderStepContent = () => {
        if (isNotifStep) {
            return (
                <div className="space-y-5 w-full">
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 block mb-2">
                                Morning
                            </label>
                            <input
                                type="time"
                                value={morningTime}
                                onChange={e => setMorningTime(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold p-4 rounded-xl outline-none text-center focus:border-green-500 transition-all"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-green-600 block mb-2">
                                Evening
                            </label>
                            <input
                                type="time"
                                value={eveningTime}
                                onChange={e => setEveningTime(e.target.value)}
                                className="w-full bg-zinc-50 border border-zinc-200 text-zinc-900 font-bold p-4 rounded-xl outline-none text-center focus:border-green-500 transition-all"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleEnableNotifications}
                        className="w-full py-4 bg-green-500 text-white font-black uppercase tracking-widest rounded-xl hover:bg-green-400 transition-all text-sm"
                    >
                        Enable Notifications
                    </button>
                    <button
                        onClick={goNext}
                        className="w-full py-3 text-zinc-400 text-xs font-bold uppercase tracking-widest hover:text-zinc-600"
                    >
                        Skip For Now
                    </button>
                </div>
            );
        }

        return (
            <button
                onClick={isLast ? handleFinish : goNext}
                className="w-full py-4 bg-green-500 text-white font-black uppercase tracking-widest rounded-xl hover:bg-green-400 transition-all text-sm active:scale-[0.98]"
            >
                {isLast ? "Create My First Battle Plan" : step === 0 ? "Get Started" : "Got It"}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white px-8">
            {/* Progress dots */}
            <div className="absolute top-[calc(2rem+env(safe-area-inset-top))] left-0 right-0 flex justify-center gap-2">
                {scenes.map((_, i) => (
                    <div
                        key={i}
                        className={`w-2 h-2 rounded-full transition-all duration-500 ${i <= step ? 'bg-green-500 scale-110' : 'bg-zinc-200'
                            }`}
                    />
                ))}
            </div>

            <div className={`flex flex-col items-center text-center max-w-sm transition-opacity duration-200 ${animating ? 'opacity-0' : 'opacity-100'}`}>
                <span className="text-5xl mb-6">{current.emoji}</span>
                <h1 className="text-2xl font-black text-zinc-900 mb-3 leading-tight">
                    {current.title}
                </h1>
                <p className="text-sm text-zinc-500 mb-10 leading-relaxed">
                    {current.subtitle}
                </p>
                {renderStepContent()}
            </div>
        </div>
    );
};

export default Onboarding;