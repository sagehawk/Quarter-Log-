import React, { useState, useEffect, useRef } from 'react';

interface EntryModalProps {
  isOpen: boolean;
  onSave: (text: string) => void;
  onClose: () => void;
  isManual?: boolean;
}

const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onSave, onClose, isManual = false }) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setText('');
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
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-slate-900/90 backdrop-filter backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 md:p-8 transform transition-all animate-slide-up">
        <div className="flex justify-between items-start mb-6">
           <div>
              <h2 className="text-2xl font-bold text-white mb-1">
                {isManual ? 'New Entry' : 'Check-in'}
              </h2>
              <p className="text-slate-400 text-sm">
                {isManual ? 'Capture what you are doing right now.' : 'How did the last 15 minutes go?'}
              </p>
           </div>
           <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isManual ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
             {isManual ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
             ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
             )}
           </div>
        </div>
        
        <form onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-black/20 text-white rounded-2xl border border-white/10 p-5 min-h-[140px] focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none placeholder-slate-500 text-lg mb-8 resize-none shadow-inner"
            placeholder={isManual ? "Drafting the project roadmap..." : "Responded to emails and..."}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 px-4 rounded-xl font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-all"
            >
              {isManual ? 'Cancel' : 'Skip'}
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex-1 py-3.5 px-4 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-900/40 hover:shadow-blue-900/60 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all"
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