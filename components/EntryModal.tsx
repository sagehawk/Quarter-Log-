import React, { useState, useEffect, useRef } from 'react';

interface EntryModalProps {
  isOpen: boolean;
  onSave: (text: string) => void;
  onClose: () => void; // Used if user wants to skip
}

const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onSave, onClose }) => {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-6 transform transition-all scale-100">
        <h2 className="text-2xl font-bold text-white mb-2">15 Minutes Check-in</h2>
        <p className="text-slate-400 mb-6">What did you accomplish in the last block?</p>
        
        <form onSubmit={handleSubmit}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full bg-slate-800 text-white rounded-xl border border-slate-600 p-4 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none placeholder-slate-500 text-lg mb-6 resize-none"
            placeholder="I worked on..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Skip
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="flex-1 py-3 px-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 transition-all"
            >
              Log Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;