import React, { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { UserGoal } from '../types';

const PROMPTS: Record<UserGoal, { title: string, text: string }> = {
  'FOCUS': {
    title: 'Drill Sergeant (Focus)',
    text: 'Roast my time management. Be direct, critical, and short. Point out where I was distracted, procrastinating, or lying to myself about being productive. Tell me how many hours I wasted.'
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
  const [goal, setGoal] = useState<UserGoal>('FOCUS');

  useEffect(() => {
    if (isOpen) {
        const storedGoal = localStorage.getItem('quarterlog_goal') as UserGoal;
        if (storedGoal && PROMPTS[storedGoal]) {
            setGoal(storedGoal);
        }
    }
  }, [isOpen]);

  const currentPrompt = PROMPTS[goal];

  const handleCopy = async () => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    
    const finalContent = `${currentPrompt.text}\n\n---\n\n${logsText}`;

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
                Based on your goal: <span className="text-brand-400">{goal}</span>
            </p>
        </div>

        <div className="px-6 py-2">
            <div className="bg-slate-800/50 rounded-2xl p-6 border border-white/5">
                <h3 className="text-white font-black uppercase tracking-wider text-sm mb-3">{currentPrompt.title}</h3>
                <p className="text-slate-300 text-sm leading-relaxed font-medium">
                    "{currentPrompt.text}"
                </p>
            </div>
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