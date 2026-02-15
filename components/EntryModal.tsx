import React, { useState, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import TacticalCoachView, { CoachMood } from './TacticalCoachView';
import { AppTheme } from '../types';

interface EntryModalProps {
  isOpen: boolean;
  onSave: (text: string) => void;
  onClose: () => void;
  initialEntry?: { text: string; } | null;
  isTutorial?: boolean;
  theme?: AppTheme;
}

const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onSave, onClose, initialEntry = null, isTutorial = false, theme = 'dark' }) => {
  const [text, setText] = useState('');
  const [coachMood, setCoachMood] = useState<CoachMood>('ASKING');
  const [coachMsg, setCoachMsg] = useState("Report Status. What did you accomplish?");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (isTutorial && initialEntry) {
        setText(initialEntry.text);
        setCoachMood('IDLE');
        setCoachMsg("Hit submit to log your first win.");
      } else if (initialEntry) {
        setText(initialEntry.text);
        setCoachMood('IDLE');
        setCoachMsg("Edit your entry.");
      } else {
        setText('');
        setCoachMood('IDLE');
        setCoachMsg("What did you work on?");
      }
      try { Haptics.impact({ style: ImpactStyle.Light }); } catch (e) { }

      // Defer focus to allow keyboard animation to complete/initiate properly without overlap
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          // Optional: ensure it's visible
          textareaRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 450);
    }
  }, [isOpen, initialEntry]);

  const handleSubmit = () => {
    if (text.trim()) {
      onSave(text.trim());
    }
  };

  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div className="fixed inset-0 z-50">
      <TacticalCoachView mood={coachMood} message={coachMsg} theme={theme}>
        <div className="space-y-4 animate-fade-in">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="> e.g. Deep work on Q3 report, 45 mins."
            className={`w-full font-mono p-4 rounded-xl border outline-none h-32 resize-none transition-colors ${isDark
              ? 'bg-black/50 text-white border-white/20 focus:border-green-500'
              : 'bg-white text-zinc-900 border-zinc-300 focus:border-green-600 shadow-sm placeholder:text-zinc-400'
              }`}
          />

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className={`flex-1 py-4 font-black uppercase tracking-widest rounded-xl transition-colors ${isDark
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-zinc-200 text-zinc-600 hover:bg-zinc-300'
                }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className={`flex-[2] py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50 transition-all ${!isDark && 'hover:bg-green-400 shadow-none'}`}
            >
              Submit
            </button>
          </div>
        </div>
      </TacticalCoachView>
    </div>
  );
};

export default EntryModal;