import React, { useState } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { UserGoal, ScheduleConfig } from '../types';
import { requestNotificationPermission } from '../utils/notifications';
import TacticalCoachView, { CoachMood } from './TacticalCoachView';

interface OnboardingProps {
    onComplete: (goals: UserGoal[], schedule: ScheduleConfig, priority?: string, startChallenge?: boolean, startWithWin?: boolean) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [scene, setScene] = useState(0);

    // Data State
    const [schedule, setSchedule] = useState<ScheduleConfig>({
        enabled: true,
        startTime: '09:00',
        endTime: '17:00',
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
    });
    const [priority, setPriority] = useState("");
    const [initials, setInitials] = useState("");

    const scenes: { mood: CoachMood; text: string }[] = [
        { mood: 'IDLE', text: "Welcome. I'm your Handler. My job is to keep you locked in and winning." },
        { mood: 'ASKING', text: "Every 15 minutes, you log what you did. I grade it. Wins stack. Losses get flagged. You see exactly where your time goes." },
        { mood: 'PROCESSING', text: "Over time, you'll see your patterns. What makes you productive. What drains you. No guesswork." },
        { mood: 'IDLE', text: "When do you operate? Set your active hours and I'll only check in during that window." },
        { mood: 'ASKING', text: "What are you working toward right now? I'll hold you accountable to this." },
        { mood: 'STOIC', text: "Turn on notifications so I can check in when each block ends." },
        { mood: 'IDLE', text: "One rule: log honestly. I'll handle the rest. Sign your initials to begin." },
    ];

    const { mood, text } = scenes[scene] || scenes[0];

    const nextScene = () => {
        try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { }
        setScene(prev => Math.min(prev + 1, scenes.length - 1));
    };

    const handleFinish = () => {
        try { Haptics.notification({ type: NotificationType.Success }); } catch (e) { }
        onComplete(['BUSINESS'], schedule, priority || "WIN THE DAY", true, false);
    };

    const renderContent = () => {
        switch (scene) {
            case 0:
                return (
                    <button onClick={nextScene} className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all">
                        Get Started
                    </button>
                );
            case 1:
                return (
                    <button onClick={nextScene} className="w-full py-4 bg-white/10 border border-white/20 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all">
                        Got It
                    </button>
                );
            case 2:
                return (
                    <button onClick={nextScene} className="w-full py-4 bg-white/10 border border-white/20 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all">
                        Makes Sense
                    </button>
                );
            case 3:
                return (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <input
                                type="time"
                                value={schedule.startTime}
                                onChange={(e) => setSchedule({ ...schedule, startTime: e.target.value })}
                                className="flex-1 bg-black/50 text-white font-bold p-4 rounded-xl border border-green-500/30 focus:border-green-500 outline-none text-center"
                            />
                            <input
                                type="time"
                                value={schedule.endTime}
                                onChange={(e) => setSchedule({ ...schedule, endTime: e.target.value })}
                                className="flex-1 bg-black/50 text-white font-bold p-4 rounded-xl border border-green-500/30 focus:border-green-500 outline-none text-center"
                            />
                        </div>
                        <button onClick={nextScene} className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all">
                            Confirm Schedule
                        </button>
                    </div>
                );
            case 4:
                return (
                    <div className="space-y-4">
                        <textarea
                            placeholder="e.g. Launch MVP, Close 3 Deals..."
                            value={priority}
                            onChange={(e) => setPriority(e.target.value)}
                            className="w-full bg-black/50 text-white font-bold p-4 rounded-xl border border-green-500/30 focus:border-green-500 outline-none min-h-[100px]"
                        />
                        <button onClick={nextScene} disabled={!priority} className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-50">
                            Set Objective
                        </button>
                    </div>
                );
            case 5:
                return (
                    <div className="space-y-3">
                        <button onClick={async () => { await requestNotificationPermission(); nextScene(); }} className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all">
                            Enable Notifications
                        </button>
                        <button onClick={nextScene} className="w-full py-3 text-white/40 text-xs font-black uppercase tracking-widest hover:text-white">
                            Skip For Now
                        </button>
                    </div>
                );
            case 6:
                return (
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="INTLS"
                            value={initials}
                            onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 3))}
                            className="w-full bg-black/50 text-white font-serif italic text-4xl p-4 border-b border-green-500 outline-none text-center"
                        />
                        <button onClick={handleFinish} disabled={!initials} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-green-500 transition-all disabled:opacity-50">
                            Let's Go
                        </button>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 z-[200]">
            <TacticalCoachView
                mood={mood}
                message={text}
            >
                {renderContent()}
            </TacticalCoachView>
        </div>
    );
};

export default Onboarding;