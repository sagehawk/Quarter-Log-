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

  const personas: { id: AIPersona; name: string; desc: string; requiredStreak: number; icon: React.ReactNode }[] = [
    {
      id: 'LOGIC',
      name: 'The Operator',
      desc: 'Input/Output Neutrality. Identify constraints. Solve for X.',
      requiredStreak: 0,
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    },
    {
      id: 'AGGRESSIVE',
      name: 'The Savage',
      desc: 'Feelings are irrelevant. Volume negates luck. Pain is the price of entry.',
      requiredStreak: 7,
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
    },
    {
      id: 'STOIC',
      name: 'The Grandfather',
      desc: 'The long game is the only game. This moment is a blip.',
      requiredStreak: 14,
      icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M16 12l-2 2-2-2-2 2"></path><path d="M12 16h.01"></path></svg>
    }
  ];

  const handleSelect = (p: typeof personas[0]) => {
      if (currentStreak < p.requiredStreak) {
          try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
          return;
      }
      try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
      setSelected(p.id);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden animate-slide-up shadow-2xl">
        <div className="p-6 border-b border-white/5">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                AI Personality
            </h2>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">
                Select your Tactical Advisor
            </p>
        </div>

        <div className="p-6 space-y-4">
            {personas.map((p) => {
                const isLocked = currentStreak < p.requiredStreak;
                const isSelected = selected === p.id;
                
                return (
                    <button
                        key={p.id}
                        onClick={() => handleSelect(p)}
                        className={`w-full relative group overflow-hidden rounded-2xl p-4 text-left transition-all border ${
                            isSelected 
                            ? 'bg-yellow-500/10 border-yellow-500 shadow-[0_0_20px_rgba(234,179,8,0.2)]' 
                            : isLocked
                                ? 'bg-black/40 border-white/5 opacity-60 grayscale'
                                : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                    >
                        <div className="flex items-start gap-4 relative z-10">
                            <div className={`p-3 rounded-xl ${isSelected ? 'bg-yellow-500 text-black' : 'bg-white/10 text-white/40'}`}>
                                {p.icon}
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <h3 className={`font-black uppercase tracking-wide text-sm ${isSelected ? 'text-yellow-500' : 'text-white'}`}>
                                        {p.name}
                                    </h3>
                                    {isLocked && (
                                        <div className="flex items-center gap-1 text-[10px] font-mono text-red-500 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                            REQ: {p.requiredStreak} DAY STREAK
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-white/40 leading-relaxed font-medium">
                                    {p.desc}
                                </p>
                            </div>
                        </div>
                    </button>
                );
            })}
        </div>

        <div className="p-6 pt-0 flex gap-3">
             <button
              onClick={onClose}
              className="flex-1 py-4 rounded-xl font-black text-white/30 hover:text-white bg-black border border-white/10 transition-all uppercase tracking-widest text-xs"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                  onSelect(selected);
                  onClose();
              }}
              className="flex-[2] py-4 rounded-xl font-black bg-white text-black hover:bg-yellow-400 transition-all uppercase tracking-[0.2em] text-xs shadow-xl"
            >
              Confirm
            </button>
        </div>
      </div>
    </div>
  );
};

export default PersonaSelector;