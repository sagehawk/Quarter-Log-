import React, { useState } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AIPersona } from '../types';

interface PersonaSelectorProps {
  isOpen: boolean;
  currentPersona: AIPersona;
  currentStreak: number;
  onSelect: (persona: AIPersona) => void;
  onClose: () => void;
}

const PersonaSelector: React.FC<PersonaSelectorProps> = ({
  isOpen,
  currentPersona,
  currentStreak,
  onSelect,
  onClose
}) => {
  const [selected, setSelected] = useState<AIPersona>(currentPersona);

  if (!isOpen) return null;

  const personas: { id: AIPersona; name: string; desc: string; requiredStreak: number; preview: string; icon: React.ReactNode }[] = [
    {
      id: 'LOGIC',
      name: 'The Operator',
      desc: 'Calm and analytical. Keeps you focused with clear, logical feedback.',
      requiredStreak: 0,
      preview: '/character/coach-idle.jpg',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    },
    {
      id: 'AGGRESSIVE',
      name: 'The Savage',
      desc: 'Intense and direct. Pushes you hard with no sugarcoating.',
      requiredStreak: 7,
      preview: '/character/coach-savage.jpg',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
    },
    {
      id: 'STOIC',
      name: 'The Grandfather',
      desc: 'Wise and patient. Gives you the big-picture perspective on your progress.',
      requiredStreak: 14,
      preview: '/character/coach-processing.jpg',
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M16 12l-2 2-2-2-2 2"></path><path d="M12 16h.01"></path></svg>
    }
  ];

  const handleSelect = (p: typeof personas[0]) => {
    if (currentStreak < p.requiredStreak) {
      try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch (e) { }
      return;
    }
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }
    setSelected(p.id);
  };

  // Milestone thresholds
  const milestones = [0, 7, 14];
  const maxMilestone = milestones[milestones.length - 1];
  const streakClamped = Math.min(currentStreak, maxMilestone);
  const milestoneProgress = maxMilestone > 0 ? (streakClamped / maxMilestone) * 100 : 100;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden animate-slide-up shadow-2xl">

        {/* Header with streak display */}
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">
              AI Coach
            </h2>
            <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-xl px-3 py-1.5">
              <span className={`${currentStreak > 0 ? 'text-orange-500' : 'text-white/20'}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
                </svg>
              </span>
              <span className="text-sm font-black text-white">{currentStreak}</span>
              <span className="text-[9px] font-bold text-orange-500/60 uppercase tracking-widest">Day{currentStreak !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <p className="text-white/30 text-xs font-bold uppercase tracking-widest mt-1">
            Unlock new personalities with streaks
          </p>

          {/* Milestone Timeline */}
          <div className="mt-4 relative">
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-700"
                style={{ width: `${milestoneProgress}%` }}
              />
            </div>
            {/* Milestone dots */}
            <div className="flex justify-between mt-1.5">
              {milestones.map((m) => {
                const reached = currentStreak >= m;
                const pos = maxMilestone > 0 ? (m / maxMilestone) * 100 : 0;
                return (
                  <div key={m} className="flex flex-col items-center" style={{ width: 'auto' }}>
                    <div className={`w-3 h-3 rounded-full border-2 transition-all ${reached
                      ? 'bg-orange-500 border-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                      : 'bg-zinc-800 border-zinc-700'
                      }`} />
                    <span className={`text-[9px] font-black mt-1 ${reached ? 'text-orange-500' : 'text-white/20'}`}>
                      {m === 0 ? 'Start' : `${m}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Character Cards */}
        <div className="p-4 space-y-3">
          {personas.map((p) => {
            const isLocked = currentStreak < p.requiredStreak;
            const isSelected = selected === p.id;
            const daysToUnlock = p.requiredStreak - currentStreak;

            return (
              <button
                key={p.id}
                onClick={() => handleSelect(p)}
                className={`w-full relative group overflow-hidden rounded-2xl text-left transition-all border ${isSelected
                  ? 'bg-green-500/10 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)]'
                  : isLocked
                    ? 'bg-black/40 border-white/5 opacity-70'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                  }`}
              >
                <div className="flex items-stretch relative z-10">
                  {/* Character Preview Image */}
                  <div className={`w-20 h-24 flex-shrink-0 overflow-hidden ${isLocked ? 'grayscale blur-[2px]' : ''}`}>
                    <img
                      src={p.preview}
                      alt={p.name}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-3 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div className={`${isSelected ? 'text-green-500' : isLocked ? 'text-zinc-600' : 'text-white/40'}`}>
                          {p.icon}
                        </div>
                        <h3 className={`font-black uppercase tracking-wide text-sm ${isSelected ? 'text-green-500' : isLocked ? 'text-zinc-500' : 'text-white'}`}>
                          {p.name}
                        </h3>
                      </div>
                      {isSelected && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Active</span>
                      )}
                    </div>
                    <p className={`text-xs leading-relaxed font-medium ${isLocked ? 'text-zinc-600' : 'text-white/40'}`}>
                      {p.desc}
                    </p>
                    {isLocked && (
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500/40 rounded-full"
                            style={{ width: `${Math.max(0, ((currentStreak) / p.requiredStreak) * 100)}%` }}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-orange-500/50 whitespace-nowrap">
                          {daysToUnlock}d left
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 rounded-xl font-black text-white/30 hover:text-white bg-black border border-white/10 transition-all uppercase tracking-widest text-xs"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSelect(selected);
              onClose();
            }}
            className="flex-[2] py-3.5 rounded-xl font-black bg-white text-black hover:bg-green-400 transition-all uppercase tracking-[0.2em] text-xs shadow-xl"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default PersonaSelector;