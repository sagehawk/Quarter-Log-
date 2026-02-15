import React, { useRef, useEffect } from 'react';
import { AIPersona, AppTheme } from '../types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface PersonaSelectorProps {
  currentPersona: AIPersona;
  onSelect: (persona: AIPersona) => void;
  onClose: () => void;
  theme?: AppTheme;
}

const PERSONAS = [
  {
    id: 'LOGIC' as AIPersona,
    name: 'The Operator',
    title: 'Logical & Fact-Based',
    desc: "Cold, analytical, and efficient. Focuses purely on data and outcomes. No fluff.",
    quote: "Show me the data.",
    color: 'text-green-500',
    bg: 'from-green-500/20 to-green-900/40',
    icon: '📊'
  },
  {
    id: 'AGGRESSIVE' as AIPersona,
    name: 'The Savage',
    title: 'Ruthless Accountability',
    desc: "Direct, painful truths. Doesn't care about your feelings, only your results.",
    quote: "Work harder.",
    color: 'text-red-500',
    bg: 'from-red-500/20 to-red-900/40',
    icon: '🔥'
  },
  {
    id: 'STOIC' as AIPersona,
    name: 'The Guardian',
    title: 'Calm & Long-Term',
    desc: "Unshakeable. Focuses on what you can control. Sees obstacles as the way.",
    quote: "The obstacle is the way.",
    color: 'text-blue-400',
    bg: 'from-blue-500/20 to-blue-900/40',
    icon: '🗿'
  },
  {
    id: 'HYPE' as AIPersona,
    name: 'The Hype Man',
    title: 'Unstoppable Energy',
    desc: "Pure enthusiasm and belief. Focuses on momentum, wins, and massive action.",
    quote: "LET'S GOOO!",
    color: 'text-amber-400',
    bg: 'from-amber-500/20 to-amber-900/40',
    icon: '⚡'
  },
  {
    id: 'STRATEGIST' as AIPersona,
    name: 'The Architect',
    title: 'Vision & Systems',
    desc: "Sees the big picture. Focuses on leverage, trends, and 2nd order effects.",
    quote: "Checkmate.",
    color: 'text-purple-400',
    bg: 'from-purple-500/20 to-purple-900/40',
    icon: '♟️'
  }
];

const PersonaSelector: React.FC<PersonaSelectorProps> = ({ currentPersona, onSelect, onClose, theme = 'dark' }) => {
  const isDark = theme === 'dark';

  return (
    <div className={`fixed inset-0 z-[60] flex items-center justify-center p-6 animate-fade-in ${isDark ? 'bg-black/95 backdrop-blur-xl' : 'bg-zinc-200/95 backdrop-blur-xl'}`}>
      <div className="w-full max-w-md flex flex-col h-full max-h-[800px]">

        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className={`text-3xl font-black uppercase tracking-tighter ${isDark ? 'text-white' : 'text-zinc-900'}`}>Coach Mode</h2>
            <p className={`text-xs font-mono uppercase tracking-[0.2em] mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Select your AI Personality</p>
          </div>
          <button onClick={onClose} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/10' : 'bg-white text-zinc-400 hover:text-zinc-900 border border-zinc-200 shadow-sm'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-4">
          {PERSONAS.map(p => {
            const isSelected = currentPersona === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  try { Haptics.impact({ style: ImpactStyle.Medium }); } catch (e) { }
                  onSelect(p.id);
                  onClose();
                }}
                className={`
                                    w-full text-left relative overflow-hidden transition-all duration-300 group
                                    rounded-3xl border
                                    ${isDark
                    ? (isSelected ? 'bg-zinc-900 border-white/20 scale-[1.02] shadow-2xl' : 'bg-zinc-900/50 border-white/5 hover:bg-zinc-800 hover:border-white/10 opacity-70 hover:opacity-100')
                    : (isSelected ? 'bg-white border-zinc-300 scale-[1.02] shadow-xl' : 'bg-white border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 opacity-80 hover:opacity-100')
                  }
                                `}
              >
                {/* Background Gradient */}
                {isSelected && <div className={`absolute inset-0 bg-gradient-to-r ${p.bg} opacity-20`} />}

                <div className="relative p-6 z-10 flex items-center gap-5">
                  <div className={`
                                        w-16 h-16 rounded-2xl flex items-center justify-center text-3xl transition-colors
                                        ${isDark
                      ? (isSelected ? 'bg-white/10 text-white shadow-lg' : 'bg-black/40 text-white/50 group-hover:bg-white/5 group-hover:text-white')
                      : (isSelected ? 'bg-zinc-100 text-zinc-900 shadow-sm' : 'bg-zinc-50 text-zinc-400 group-hover:bg-zinc-100 group-hover:text-zinc-700')
                    }
                                    `}>
                    {p.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className={`text-xl font-black italic tracking-tighter ${isSelected ? (isDark ? 'text-white' : 'text-zinc-900') : (isDark ? 'text-zinc-400 group-hover:text-white' : 'text-zinc-500 group-hover:text-zinc-900')}`}>
                        {p.name}
                      </h3>
                      {isSelected && <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-white' : 'bg-zinc-900 text-white'}`}>Active</span>}
                    </div>

                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${p.color}`}>
                      {p.title}
                    </p>

                    <p className={`text-xs font-medium line-clamp-2 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {p.desc}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PersonaSelector;