import React, { useState, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface EntryModalProps {
  isOpen: boolean;
  onSave: (text: string, type: 'WIN' | 'LOSS') => void;
  onClose: () => void;
  isManual?: boolean;
}

const MAX_CHARS = 500;

const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onSave, onClose, isManual = false }) => {
  const [text, setText] = useState('');
  const [type, setType] = useState<'WIN' | 'LOSS' | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setText('');
      setType(null);
      // Subtle impact on open
      try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type) {
      onSave(text.trim() || (type === 'WIN' ? 'Stacked a win.' : 'Took a loss.'), type);
      setText('');
      setType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-yellow-500/20 rounded-[2rem] shadow-[0_0_50px_rgba(234,179,8,0.1)] p-6 md:p-8 transform transition-all animate-slide-up">
        <div className="text-center mb-8">
           <h2 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter italic">
             {isManual ? 'Manual Entry' : 'Win or Loss?'}
           </h2>
           <p className="text-yellow-500/60 text-xs font-black uppercase tracking-[0.2em]">
             {isManual ? 'Declare your status' : 'Did you handle this block like a winner?'}
           </p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
            <button
              type="button"
              onClick={() => {
                setType('WIN');
                try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
              }}
              className={`group relative overflow-hidden flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 transition-all duration-300 ${
                type === 'WIN' 
                ? 'bg-yellow-500 border-yellow-400 text-black scale-[1.02] shadow-[0_0_30px_rgba(234,179,8,0.4)]' 
                : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-500/40 hover:border-yellow-500/40 hover:bg-yellow-500/10'
              }`}
            >
                <div className={`p-3 rounded-xl transition-colors ${type === 'WIN' ? 'bg-black/10' : 'bg-yellow-500/10 group-hover:bg-yellow-500/20'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                </div>
                <span className="text-xl font-black uppercase tracking-tighter italic">WIN</span>
                {type === 'WIN' && <div className="absolute top-0 right-0 p-2"><div className="w-2 h-2 bg-black rounded-full animate-pulse" /></div>}
            </button>

            <button
              type="button"
              onClick={() => {
                setType('LOSS');
                try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
              }}
              className={`group relative overflow-hidden flex flex-col items-center justify-center gap-3 py-8 rounded-2xl border-2 transition-all duration-300 ${
                type === 'LOSS' 
                ? 'bg-red-600 border-red-500 text-white scale-[1.02] shadow-[0_0_30px_rgba(220,38,38,0.4)]' 
                : 'bg-red-500/5 border-red-500/20 text-red-500/40 hover:border-red-500/40 hover:bg-red-500/10'
              }`}
            >
                <div className={`p-3 rounded-xl transition-colors ${type === 'LOSS' ? 'bg-white/10' : 'bg-red-500/10 group-hover:bg-red-500/20'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>
                </div>
                <span className="text-xl font-black uppercase tracking-tighter italic">LOSS</span>
                {type === 'LOSS' && <div className="absolute top-0 right-0 p-2"><div className="w-2 h-2 bg-white rounded-full animate-pulse" /></div>}
            </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="relative mb-6">
            <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_CHARS}
                className="w-full bg-white/5 text-white rounded-2xl border border-white/10 p-5 min-h-[120px] focus:ring-0 focus:border-yellow-500/50 outline-none placeholder-white/20 text-lg font-bold resize-none transition-all shadow-inner"
                placeholder="Optional details (e.g. focused work, gym, distraction...)"
            />
            <div className={`absolute bottom-3 right-4 text-[9px] font-black uppercase tracking-widest ${text.length >= MAX_CHARS ? 'text-red-500' : 'text-white/20'}`}>
                {text.length} / {MAX_CHARS}
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button
              type="submit"
              disabled={!type}
              className={`w-full py-5 rounded-2xl font-black transition-all uppercase tracking-[0.2em] text-lg shadow-xl ${
                type 
                ? 'bg-white text-black hover:-translate-y-1 active:translate-y-0' 
                : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              STACK RECORD
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-xl font-black text-white/30 hover:text-white transition-all uppercase tracking-widest text-[10px]"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;