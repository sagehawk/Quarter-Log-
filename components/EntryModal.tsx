import React, { useState, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface EntryModalProps {
  isOpen: boolean;
  onSave: (text: string) => void;
  onClose: () => void;
  isManual?: boolean;
}

const MAX_CHARS = 500;

const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onSave, onClose, isManual = false }) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setText('');
      // Subtle impact on open
      try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSave(text);
      setText('');
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
      
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 transform transition-all animate-slide-up">
        <div className="flex justify-between items-start mb-6">
           <div>
              <h2 className="text-3xl font-black text-white mb-1 uppercase tracking-tight italic">
                {isManual ? 'Log Activity' : 'What did you do?'}
              </h2>
              <p className="text-slate-400 text-sm font-bold uppercase tracking-wide">
                {isManual ? 'Detailed or brief—even 1-2 words is fine.' : 'Be honest. Even 1-2 words is enough.'}
              </p>
           </div>
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 ${isManual ? 'bg-brand-500/10 border-brand-500/30 text-brand-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
             {isManual ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
             )}
           </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_CHARS}
                className="w-full bg-black/40 text-white rounded-2xl border-2 border-white/10 p-5 min-h-[160px] focus:ring-0 focus:border-brand-500 outline-none placeholder-slate-600 text-xl font-bold mb-2 resize-none shadow-inner"
                placeholder="e.g. EMAILS, MEETING, PROJECT WORK, LUNCH..."
            />
            <div className={`text-right text-[10px] font-bold uppercase tracking-wider mb-6 ${text.length >= MAX_CHARS ? 'text-brand-500' : 'text-slate-600'}`}>
                {text.length} / {MAX_CHARS} Characters
            </div>
          </div>
          
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                  try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
                  onClose();
              }}
              className="flex-1 py-4 px-4 rounded-xl font-black text-slate-400 hover:text-white hover:bg-white/5 transition-all uppercase tracking-wider"
            >
              {isManual ? 'Cancel' : 'Skip'}
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex-1 py-4 px-4 rounded-xl font-black bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-900/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all uppercase tracking-widest text-lg"
            >
              Save Entry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;