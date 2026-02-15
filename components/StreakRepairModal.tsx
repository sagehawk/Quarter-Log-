import React from 'react';
import { AppTheme } from '../types';

interface StreakRepairModalProps {
    isOpen: boolean;
    onRepair: () => void;
    onDismiss: () => void;
    insuranceBalance: number;
    theme?: AppTheme;
}

const StreakRepairModal: React.FC<StreakRepairModalProps> = ({
    isOpen,
    onRepair,
    onDismiss,
    insuranceBalance,
    theme = 'dark'
}) => {
    if (!isOpen) return null;

    const isDark = theme === 'dark';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onDismiss}
            />

            <div className={`relative w-full max-w-sm rounded-3xl p-6 shadow-2xl transform transition-all scale-100 ${isDark ? 'bg-zinc-900 border border-red-500/30' : 'bg-white border border-red-200'}`}>
                {/* Header Icon */}
                <div className="flex justify-center -mt-10 mb-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${isDark ? 'bg-zinc-900 border-4 border-red-500/20' : 'bg-white border-4 border-red-100'}`}>
                        <span className="text-4xl">🛡️</span>
                    </div>
                </div>

                <div className="text-center space-y-2 mb-6">
                    <h2 className={`text-2xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        Streak Broken!
                    </h2>
                    <p className={`text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                        You missed yesterday's log. <br />
                        Use a shield to repair it?
                    </p>
                </div>

                <div className={`flex items-center justify-center gap-2 mb-8 p-3 rounded-xl border ${isDark ? 'bg-zinc-800/50 border-white/5' : 'bg-zinc-50 border-zinc-200'}`}>
                    <span className="text-xl">🛡️</span>
                    <span className={`font-mono font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                        {insuranceBalance} Remaining
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onDismiss}
                        className={`py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wide transition-colors ${isDark ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'}`}
                    >
                        Accept Loss
                    </button>
                    <button
                        onClick={onRepair}
                        disabled={insuranceBalance <= 0}
                        className={`py-3 px-4 rounded-xl font-bold text-sm uppercase tracking-wide transition-all shadow-lg active:scale-95 ${insuranceBalance > 0
                            ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-blue-500/30'
                            : 'bg-zinc-700 text-zinc-500 cursor-not-allowed opacity-50'}`}
                    >
                        Repair Streak
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StreakRepairModal;
