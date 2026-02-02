import React, { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { UserGoal } from '../types';

const PROMPTS: Record<UserGoal, { title: string, text: string }> = {
  'FOCUS': {
    title: 'Performance Audit (Focus)',
    text: 'Audit my operational efficiency. Be direct and objective. Identify distractions and procrastination as "resource leakage". Quantify the wasted time and demand immediate correction.'
  },
  'BUSINESS': {
    title: 'CEO Audit ($ Value)',
    text: 'Analyze the dollar value of my time. Identify low-leverage tasks ($10/hr) vs high-leverage tasks ($1,000/hr). Tell me exactly what I should have delegated and calculate the estimated cost of my inefficiency.'
  },
  'LIFE': {
    title: 'Energy Audit (Balance)',
    text: 'Analyze my day based on implied energy levels. Which tasks seemed to drain me? Which put me in a flow state? Suggest how I can restructure my schedule to match my natural energy peaks.'
  }
};

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logsText: string;
  onCopySuccess: () => void;
  filter: string;
}

const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({ isOpen, onClose, logsText, onCopySuccess }) => {
  const [goals, setGoals] = useState<UserGoal[]>(['FOCUS']);

  useEffect(() => {
    if (isOpen) {
        const storedGoal = localStorage.getItem('ironlog_goal'); // Updated key to match App.tsx
        if (storedGoal) {
             try {
                const parsed = JSON.parse(storedGoal);
                if (Array.isArray(parsed)) {
                    setGoals(parsed);
                } else {
                    setGoals([storedGoal as UserGoal]);
                }
            } catch (e) {
                setGoals([storedGoal as UserGoal]);
            }
        }
    }
  }, [isOpen]);

  const handleCopy = async () => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    
    const combinedPrompts = goals.map(g => PROMPTS[g]?.text).filter(Boolean).join('\n\nALSO:\n');
    const finalContent = `${combinedPrompts}\n\n---\n\n${logsText}`;

    try {
      await navigator.clipboard.writeText(finalContent);
      onCopySuccess();
      onClose();
    } catch (err) {
      alert('Failed to copy to clipboard');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-brand-950/90 backdrop-blur-lg animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
        
        <div className="p-8 pb-4 text-center">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight italic mb-2">AI Audit Ready</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">
                Based on your active stack
            </p>
        </div>

        <div className="px-6 py-2 max-h-[50vh] overflow-y-auto custom-scrollbar">
            {goals.map(goal => (
                <div key={goal} className="bg-slate-800/50 rounded-2xl p-6 border border-white/5 mb-3">
                    <h3 className="text-white font-black uppercase tracking-wider text-sm mb-3">{PROMPTS[goal]?.title}</h3>
                    <p className="text-slate-300 text-sm leading-relaxed font-medium">
                        "{PROMPTS[goal]?.text}"
                    </p>
                </div>
            ))}
            
            <p className="text-center text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-4 mb-2">
                Copied to clipboard with your logs
            </p>
        </div>

        <div className="p-6 bg-slate-900 space-y-3">
             <button
              onClick={handleCopy}
              className="w-full py-4 rounded-xl font-black uppercase text-sm bg-brand-600 text-white hover:bg-brand-500 shadow-lg shadow-brand-900/40 transition-all tracking-widest flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              Copy AI Prompt
            </button>

             <button
              onClick={onClose}
              className="w-full py-3 rounded-xl font-bold uppercase text-xs text-slate-500 hover:bg-white/5 hover:text-white transition-colors tracking-widest"
            >
              Cancel
            </button>
        </div>

      </div>
    </div>
  );
};

export default PromptLibraryModal;