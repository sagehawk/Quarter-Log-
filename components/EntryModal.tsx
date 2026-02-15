import React, { useState, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import TacticalCoachView, { CoachMood } from './TacticalCoachView';

interface EntryModalProps {
  isOpen: boolean;
  onSave: (text: string) => void;
  onClose: () => void;
  initialEntry?: { text: string; } | null;
  isTutorial?: boolean;
}

const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onSave, onClose, initialEntry = null, isTutorial = false }) => {
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

  return (
    <div className="fixed inset-0 z-50">
      <TacticalCoachView mood={coachMood} message={coachMsg}>
        <div className="space-y-4 animate-fade-in">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="> e.g. Deep work on Q3 report, 45 mins."
            className="w-full bg-black/50 text-white font-mono p-4 rounded-xl border border-white/20 focus:border-green-500 outline-none h-32 resize-none"
          />

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-4 bg-white/10 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/20">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={!text.trim()} className="flex-[2] py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50">
              Submit
            </button>
          </div>
        </div>
      </TacticalCoachView>
    </div>
  );
};

export default EntryModal;