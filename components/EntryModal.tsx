import React, { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import TacticalCoachView, { CoachMood } from './TacticalCoachView';

interface EntryModalProps {
  isOpen: boolean;
  onSave: (text: string) => void; 
  onClose: () => void;
  initialEntry?: { text: string; } | null;
}

const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onSave, onClose, initialEntry = null }) => {
  const [text, setText] = useState('');
  const [coachMood, setCoachMood] = useState<CoachMood>('ASKING');
  const [coachMsg, setCoachMsg] = useState("Report Status. What did you accomplish?");

  useEffect(() => {
    if (isOpen) {
      if (initialEntry) {
        setText(initialEntry.text);
        setCoachMood('IDLE');
        setCoachMsg("Update your intel, Operator.");
      } else {
        setText('');
        setCoachMood('ASKING');
        setCoachMsg("Report Status. What did you accomplish?");
      }
      try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
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
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="> e.g. Deep work on Q3 report, 45 mins."
                    className="w-full bg-black/50 text-white font-mono p-4 rounded-xl border border-white/20 focus:border-green-500 outline-none h-32 resize-none"
                />
                
                <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-4 bg-white/10 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/20">
                            Abort
                        </button>
                        <button onClick={handleSubmit} disabled={!text.trim()} className="flex-[2] py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50">
                            Transmit
                        </button>
                </div>
            </div>
        </TacticalCoachView>
    </div>
  );
};

export default EntryModal;