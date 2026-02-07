import React, { useState, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface EntryModalProps {
  isOpen: boolean;
  onSave: (text: string, type: 'WIN' | 'LOSS', timestamp?: number, duration?: number) => void;
  onClose: () => void;
  isManual?: boolean;
  initialEntry?: { text: string; type: 'WIN' | 'LOSS'; timestamp?: number; duration?: number } | null;
  defaultDuration?: number; // ms
}

const MAX_CHARS = 500;

const EntryModal: React.FC<EntryModalProps> = ({ isOpen, onSave, onClose, isManual = false, initialEntry = null, defaultDuration = 900000 }) => {
  const [text, setText] = useState('');
  const [type, setType] = useState<'WIN' | 'LOSS' | null>(null);
  const [dateStr, setDateStr] = useState('');
  const [timeStr, setTimeStr] = useState('');
  const [durationMin, setDurationMin] = useState(15);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialEntry) {
        setText(initialEntry.text);
        setType(initialEntry.type);
        const d = initialEntry.timestamp ? new Date(initialEntry.timestamp) : new Date();
        // Adjust for local timezone offset when using toISOString-like formatting manually
        // or just use valueAsDate-like approach, but strings are easier for inputs
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        
        setDateStr(`${year}-${month}-${day}`);
        setTimeStr(`${hours}:${minutes}`);
        setDurationMin(initialEntry.duration ? Math.round(initialEntry.duration / 60000) : Math.round(defaultDuration / 60000));
      } else {
        setText('');
        setType(null);
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        
        setDateStr(`${year}-${month}-${day}`);
        setTimeStr(`${hours}:${minutes}`);
        setDurationMin(Math.round(defaultDuration / 60000));
      }
      try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    }
  }, [isOpen, initialEntry, defaultDuration]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type) {
      // Construct timestamp
      const [year, month, day] = dateStr.split('-').map(Number);
      const [hours, minutes] = timeStr.split(':').map(Number);
      const d = new Date(year, month - 1, day, hours, minutes);
      const timestamp = d.getTime();
      const duration = durationMin * 60 * 1000;

      onSave(text.trim() || (type === 'WIN' ? 'Focused on priority.' : 'Distracted / Off-track.'), type, timestamp, duration);
      setText('');
      setType(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-black border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,1)] p-8 transform transition-all animate-slide-up overflow-hidden">
        {/* Terminal Header */}
        <div className="flex justify-between items-start mb-6 border-b border-white/10 pb-4">
           <div>
               <div className="flex items-center gap-2 mb-1">
                   <div className="w-2 h-2 bg-yellow-500 animate-pulse rounded-sm"></div>
                   <span className="text-[10px] font-mono uppercase tracking-widest text-yellow-500">Uplink Active</span>
               </div>
               <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                 {initialEntry ? 'EDIT LOG' : isManual ? 'MANUAL ENTRY' : 'TACTICAL REPORT'}
               </h2>
           </div>
           <div className="text-right">
               <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">SEQ-ID</div>
               <div className="text-lg font-mono font-bold text-white/60">
                   {new Date().getHours().toString().padStart(2,'0')}{new Date().getMinutes().toString().padStart(2,'0')}
               </div>
           </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => {
                setType('WIN');
                try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
              }}
              className={`group relative overflow-hidden h-28 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all duration-300 ${
                type === 'WIN' 
                ? 'bg-yellow-500 border-yellow-500 text-black shadow-[0_0_30px_rgba(234,179,8,0.4)]' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-yellow-500/50 hover:text-yellow-500'
              }`}
            >
                <div className="p-2 rounded-lg bg-inherit border border-current opacity-80">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                </div>
                <span className="text-sm font-black uppercase tracking-widest">PRIORITY</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setType('LOSS');
                try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
              }}
              className={`group relative overflow-hidden h-28 flex flex-col items-center justify-center gap-2 rounded-xl border transition-all duration-300 ${
                type === 'LOSS' 
                ? 'bg-red-600 border-red-500 text-white shadow-[0_0_30px_rgba(220,38,38,0.4)]' 
                : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-red-500/50 hover:text-red-500'
              }`}
            >
                <div className="p-2 rounded-lg bg-inherit border border-current opacity-80">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </div>
                <span className="text-sm font-black uppercase tracking-widest">NON-PRIORITY</span>
            </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          {/* Time & Duration Controls */}
          <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest ml-1">Date</label>
                  <input 
                      type="date" 
                      value={dateStr}
                      onChange={(e) => setDateStr(e.target.value)}
                      className="bg-zinc-900 text-white text-xs font-mono rounded-xl border border-zinc-800 p-3 outline-none focus:border-white/20"
                  />
              </div>
              <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest ml-1">Time</label>
                  <input 
                      type="time" 
                      value={timeStr}
                      onChange={(e) => setTimeStr(e.target.value)}
                      className="bg-zinc-900 text-white text-xs font-mono rounded-xl border border-zinc-800 p-3 outline-none focus:border-white/20"
                  />
              </div>
              <div className="flex flex-col gap-1">
                  <label className="text-[9px] font-mono text-white/40 uppercase tracking-widest ml-1">Dur (Min)</label>
                  <input 
                      type="number" 
                      value={durationMin}
                      onChange={(e) => setDurationMin(Math.max(1, parseInt(e.target.value) || 0))}
                      min="1"
                      className="bg-zinc-900 text-white text-xs font-mono rounded-xl border border-zinc-800 p-3 outline-none focus:border-white/20"
                  />
              </div>
          </div>

          <div className="relative mb-6 group">
            <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={MAX_CHARS}
                className="w-full bg-zinc-900 text-white rounded-xl border border-zinc-800 p-5 min-h-[100px] focus:border-white/20 outline-none placeholder-white/10 text-base font-mono leading-relaxed resize-none transition-all shadow-inner"
                placeholder="> Enter tactical details..."
            />
            <div className="absolute bottom-3 right-4 text-[9px] font-mono text-white/20">
                {text.length}/{MAX_CHARS}
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-xl font-black text-white/30 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-all uppercase tracking-widest text-xs"
            >
              ABORT
            </button>
            <button
              type="submit"
              disabled={!type}
              className={`flex-[2] py-4 rounded-xl font-black transition-all uppercase tracking-[0.2em] text-sm shadow-xl ${
                type 
                ? 'bg-white text-black hover:bg-yellow-400 hover:shadow-yellow-500/20' 
                : 'bg-zinc-900 border border-zinc-800 text-white/10 cursor-not-allowed'
              }`}
            >
              TRANSMIT LOG
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EntryModal;