import React, { useState } from 'react';
import { AppTheme } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type TabId = 'COMMAND' | 'PLAN' | 'INTEL';

interface BottomNavProps {
    activeTab: TabId;
    onTabChange: (tab: TabId) => void;
    theme: AppTheme;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, theme }) => {
    const isDark = theme === 'dark';

    const handleTabClick = (tab: TabId) => {
        if (tab !== activeTab) {
            try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
            onTabChange(tab);
        }
    };

    return (
        <div className={`fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t z-50 transition-colors duration-300 ${isDark ? 'bg-black/80 border-white/10 backdrop-blur-xl' : 'bg-white/90 border-zinc-200 backdrop-blur-xl'}`}>
            <div className={`flex items-center justify-around max-w-md mx-auto relative`}>
                {/* Active Indicator Background */}
                {/* Simplified: Just use button styles for now */}

                <NavButton
                    active={activeTab === 'COMMAND'}
                    onClick={() => handleTabClick('COMMAND')}
                    label="Command"
                    isDark={isDark}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                </NavButton>

                <NavButton
                    active={activeTab === 'PLAN'}
                    onClick={() => handleTabClick('PLAN')}
                    label="Plan"
                    isDark={isDark}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                </NavButton>

                <NavButton
                    active={activeTab === 'INTEL'}
                    onClick={() => handleTabClick('INTEL')}
                    label="Intel"
                    isDark={isDark}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                </NavButton>
            </div>
        </div>
    );
};

const NavButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode, label: string, isDark: boolean }> = ({ active, onClick, children, label, isDark }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center gap-1 transition-all duration-300 w-16 ${active
            ? (isDark ? 'text-green-500 scale-105' : 'text-zinc-900 scale-105')
            : (isDark ? 'text-zinc-600 hover:text-zinc-400' : 'text-zinc-400 hover:text-zinc-600')
            }`}
    >
        <div className={`p-1 rounded-xl transition-all ${active ? (isDark ? 'bg-green-500/10' : 'bg-zinc-100') : ''}`}>
            {children}
        </div>
        <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'} transition-all duration-300`}>
            {label}
        </span>
    </button>
);

export default BottomNav;
