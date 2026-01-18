import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  currentDurationMs: number;
  onSave: (minutes: number) => void;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, currentDurationMs, onSave, onClose }) => {
  const [minutes, setMinutes] = useState(15);

  useEffect(() => {
    if (isOpen) {
      setMinutes(Math.floor(currentDurationMs / 60000));
    }
  }, [isOpen, currentDurationMs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (minutes > 0) {
      onSave(minutes);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xs rounded-2xl shadow-2xl p-6 transform transition-all scale-100">
        <h2 className="text-xl font-bold text-white mb-4">Timer Settings</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="duration" className="block text-sm font-medium text-slate-400 mb-2">
              Duration (minutes)
            </label>
            <div className="relative">
              <input
                id="duration"
                type="number"
                min="1"
                max="120"
                value={minutes}
                onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-800 text-white text-center text-2xl font-bold rounded-xl border border-slate-600 p-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-xl font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 transition-all"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;