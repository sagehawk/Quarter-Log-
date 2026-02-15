import React from 'react';
import { ScheduleConfig } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface StatusCardProps {
    isActive: boolean;
    timeLeft: number;
    schedule: ScheduleConfig;
    blockStats: { total: number; remaining: number };
    onToggle: () => void;
}

const StatusCard: React.FC<StatusCardProps> = ({ isActive, timeLeft, schedule, blockStats, onToggle }) => {
    // Format time left
    const totalSeconds = Math.ceil(timeLeft / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    // Calculate progress relative to 15m (or whatever duration, simplified to 15m base for visual)
    const progress = Math.min(100, (timeLeft / (15 * 60 * 1000)) * 100);
    const currentCycle = Math.max(0, blockStats.total - blockStats.remaining + (isActive ? 1 : 0));

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) { }
        onToggle();
    };

    return (
        <div className="w-full bg-black/40 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl group">
            {/* Active State Ambient Glow */}
            <div className={`absolute top-0 right-0 w-64 h-64 bg-green-500/5 blur-[80px] rounded-full pointer-events-none transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

            {/* Animated Border effect for active state */}
            <div className={`absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-green-500/50 to-transparent w-full transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0'}`} />

            <div className="relative z-10 flex flex-col gap-5">
                {/* Header Row */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                        <div className="relative flex items-center justify-center w-2 h-2">
                            <div className={`absolute w-full h-full rounded-full ${isActive ? 'bg-green-500 animate-ping opacity-75' : 'bg-red-500/50'}`} />
                            <div className={`relative w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400' : 'bg-red-500'}`} />
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-white/40">
                            {isActive ? 'TIMER RUNNING' : 'TIMER PAUSED'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/30">CYCLE</span>
                        <span className="text-xs font-mono font-bold text-white">
                            <span className="text-green-500">{currentCycle}</span>
                            <span className="text-white/20 mx-0.5">/</span>
                            {blockStats.total}
                        </span>
                    </div>
                </div>

                {/* Timer Row */}
                <div className="flex justify-between items-end">
                    <div>
                        <div className={`text-7xl font-mono font-bold tracking-tighter leading-none transition-colors duration-300 ${isActive ? 'text-white drop-shadow-[0_0_15px_rgba(34,197,94,0.15)]' : 'text-white/10'}`}>
                            {minutes}:{String(seconds).padStart(2, '0')}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <div className="h-[1px] w-8 bg-green-500/50"></div>
                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-green-500/60">
                                {isActive ? 'STAY FOCUSED' : 'PRESS PLAY TO START'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleToggle}
                        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl active:scale-95 border group/btn relative overflow-hidden ${isActive ? 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-red-500 hover:border-red-500/30' : 'bg-white text-black border-white hover:bg-green-400 hover:border-green-400 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)]'}`}
                    >
                        {isActive ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="relative z-10"><rect x="6" y="4" width="4" height="16" rx="1"></rect><rect x="14" y="4" width="4" height="16" rx="1"></rect></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor" className="ml-1 relative z-10"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        )}
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className={`absolute inset-y-0 left-0 bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] transition-all duration-1000 ease-linear ${!isActive ? 'opacity-0' : 'opacity-100'}`}
                        style={{ width: `${progress}%` }}
                    />
                    {/* Tick marks overlay for 'ruler' effect */}
                    <div className="absolute inset-0 w-full h-full bg-[repeating-linear-gradient(90deg,transparent,transparent_19%,#000_20%)] opacity-30 mix-blend-overlay pointer-events-none" />
                </div>
            </div>
        </div>
    );
};

export default StatusCard;