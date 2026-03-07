import React, { useState, useEffect, useCallback } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { BattlePlan, SacrificeLog, NotificationConfig, AppTheme, AIPersona } from './types';
import Onboarding from './components/Onboarding';
import BattlePlanSetup from './components/BattlePlanSetup';
import BattleDashboard from './components/BattleDashboard';
import SettingsModal from './components/SettingsModal';
import Toast from './components/Toast';
import {
    configureNotificationChannel,
    scheduleMorningNotification,
    scheduleEveningNotification,
    cancelAllNotifications,
} from './utils/notifications';

const STORAGE_KEY_ONBOARDED = 'bp_onboarded';
const STORAGE_KEY_BATTLE_PLAN = 'bp_battle_plan';
const STORAGE_KEY_SACRIFICE_LOG = 'bp_sacrifice_log';
const STORAGE_KEY_NOTIF_CONFIG = 'bp_notif_config';
const STORAGE_KEY_THEME = 'bp_theme';
const STORAGE_KEY_NORTH_STAR = 'bp_north_star';

const getTodayKey = (): string => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const App: React.FC = () => {
    // --- Onboarding ---
    const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
        return !!localStorage.getItem(STORAGE_KEY_ONBOARDED);
    });

    // --- Theme ---
    const [theme, setTheme] = useState<AppTheme>(() => {
        const stored = localStorage.getItem(STORAGE_KEY_THEME);
        if (stored) return stored as AppTheme;
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
        return 'light';
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_THEME, theme);
    }, [theme]);

    // --- Notification Config ---
    const [notifConfig, setNotifConfig] = useState<NotificationConfig>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_NOTIF_CONFIG);
            if (stored) return JSON.parse(stored);
        } catch (e) { }
        return { morningTime: '08:00', eveningTime: '21:00', enabled: true };
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY_NOTIF_CONFIG, JSON.stringify(notifConfig));
        if (notifConfig.enabled) {
            scheduleMorningNotification(notifConfig.morningTime);
            scheduleEveningNotification(notifConfig.eveningTime);
        } else {
            cancelAllNotifications();
        }
    }, [notifConfig]);

    // --- Persisted North Star ---
    const [persistedNorthStar, setPersistedNorthStar] = useState<string>(() => {
        return localStorage.getItem(STORAGE_KEY_NORTH_STAR) || '';
    });

    // --- Battle Plan ---
    const [battlePlan, setBattlePlan] = useState<BattlePlan | null>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_BATTLE_PLAN);
            if (stored) {
                const parsed = JSON.parse(stored) as BattlePlan;
                if (parsed.dateKey === getTodayKey()) return parsed;
            }
        } catch (e) { }
        return null;
    });

    const handlePlanUpdate = useCallback((plan: BattlePlan) => {
        setBattlePlan(plan);
        localStorage.setItem(STORAGE_KEY_BATTLE_PLAN, JSON.stringify(plan));
        // Persist north star across days
        if (plan.northStar) {
            setPersistedNorthStar(plan.northStar);
            localStorage.setItem(STORAGE_KEY_NORTH_STAR, plan.northStar);
        }
    }, []);

    // --- Sacrifice Log ---
    const [sacrificeLog, setSacrificeLog] = useState<SacrificeLog>(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY_SACRIFICE_LOG);
            if (stored) {
                const parsed = JSON.parse(stored) as SacrificeLog;
                if (parsed.dateKey === getTodayKey()) return parsed;
            }
        } catch (e) { }
        return { dateKey: getTodayKey(), failCount: 0, failTimestamps: [] };
    });

    const handleSacrificeUpdate = useCallback((log: SacrificeLog) => {
        setSacrificeLog(log);
        localStorage.setItem(STORAGE_KEY_SACRIFICE_LOG, JSON.stringify(log));
    }, []);

    // --- UI State ---
    const [isCreatingPlan, setIsCreatingPlan] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [toast, setToast] = useState<{ title: string; message: string; visible: boolean }>({
        title: '', message: '', visible: false,
    });

    // --- Init ---
    useEffect(() => {
        configureNotificationChannel();
    }, []);

    // --- Android back button ---
    useEffect(() => {
        const setup = async () => {
            const handler = await CapacitorApp.addListener('backButton', () => {
                if (isCreatingPlan) { setIsCreatingPlan(false); return; }
                if (isSettingsOpen) { setIsSettingsOpen(false); return; }
                CapacitorApp.exitApp();
            });
            return handler;
        };
        const p = setup();
        return () => { p.then(h => h.remove()); };
    }, [isCreatingPlan, isSettingsOpen]);

    // --- Onboarding Complete ---
    const handleOnboardingComplete = (config: NotificationConfig) => {
        setNotifConfig(config);
        setHasOnboarded(true);
        localStorage.setItem(STORAGE_KEY_ONBOARDED, 'true');
        setIsCreatingPlan(true);
    };

    // --- Plan Creation Complete ---
    const handlePlanCreated = (plan: BattlePlan) => {
        handlePlanUpdate(plan);
        setSacrificeLog({ dateKey: getTodayKey(), failCount: 0, failTimestamps: [] });
        localStorage.setItem(STORAGE_KEY_SACRIFICE_LOG, JSON.stringify({ dateKey: getTodayKey(), failCount: 0, failTimestamps: [] }));
        setIsCreatingPlan(false);
        setToast({ title: 'Battle Plan Locked', message: 'Go win your day.', visible: true });
    };

    // --- Derived ---
    const isDark = theme === 'dark';
    const todayKey = getTodayKey();
    const hasTodaysPlan = battlePlan && battlePlan.dateKey === todayKey;

    // --- Render ---
    if (!hasOnboarded) {
        return <Onboarding onComplete={handleOnboardingComplete} />;
    }

    if (isCreatingPlan) {
        return (
            <BattlePlanSetup
                theme={theme}
                existingNorthStar={persistedNorthStar}
                onComplete={handlePlanCreated}
                onCancel={hasTodaysPlan ? () => setIsCreatingPlan(false) : undefined}
            />
        );
    }

    return (
        <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-zinc-950 text-white' : 'bg-[#F8F9FA] text-zinc-900'}`}>
            {/* Header */}
            <header className={`fixed top-0 w-full z-40 transition-all pt-[calc(1.25rem+env(safe-area-inset-top))] px-5 pb-4 flex justify-between items-center border-b ${isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-[#F8F9FA] border-zinc-200/50'}`}>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-auto rounded-xl overflow-hidden">
                        <img src="/winner-effect-logo.png" alt="Battle Plan" className="h-full w-auto object-contain" />
                    </div>
                    <div className="hidden md:flex flex-col">
                        <span className={`text-xl font-bold tracking-[0.1em] uppercase leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>Battle</span>
                        <span className={`text-xl font-light tracking-[0.1em] uppercase leading-none ${isDark ? 'text-white' : 'text-zinc-900'}`}>Plan</span>
                    </div>
                </div>

                <button
                    onClick={() => { try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { } setIsSettingsOpen(true); }}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${isDark ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border-zinc-800' : 'bg-white hover:bg-zinc-50 text-zinc-400 hover:text-zinc-900 border-zinc-200 shadow-sm'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                </button>
            </header>

            {/* Main Content */}
            <div className="max-w-md mx-auto w-full px-5 pt-[calc(5rem+env(safe-area-inset-top))] pb-12">
                {hasTodaysPlan ? (
                    <BattleDashboard
                        plan={battlePlan!}
                        sacrificeLog={sacrificeLog}
                        theme={theme}
                        onPlanUpdate={handlePlanUpdate}
                        onSacrificeUpdate={handleSacrificeUpdate}
                        onCreateNewPlan={() => setIsCreatingPlan(true)}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                        <span className="text-6xl mb-6">⚔️</span>
                        <h1 className={`text-2xl font-black mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            No Battle Plan Today
                        </h1>
                        <p className={`text-sm mb-8 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            Define your mission, strategies, and sacrifice.
                        </p>
                        <button
                            onClick={() => { try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { } setIsCreatingPlan(true); }}
                            className="px-8 py-4 bg-green-500 text-white font-black uppercase tracking-widest rounded-2xl text-sm shadow-lg shadow-green-500/25 hover:bg-green-400 transition-all active:scale-[0.98]"
                        >
                            Create Battle Plan
                        </button>
                    </div>
                )}
            </div>

            {/* Modals */}
            <Toast title={toast.title} message={toast.message} isVisible={toast.visible} onClose={() => setToast(prev => ({ ...prev, visible: false }))} theme={theme} />

            <SettingsModal
                isOpen={isSettingsOpen}
                currentTheme={theme}
                notifConfig={notifConfig}
                onSaveTheme={setTheme}
                onSaveNotifConfig={setNotifConfig}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};

export default App;