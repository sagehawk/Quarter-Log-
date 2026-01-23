import React, { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface Prompt {
  id: string;
  title: string;
  text: string;
  isDefault?: boolean;
}

const DEFAULT_PROMPTS: Prompt[] = [
  {
    id: 'raw',
    title: 'Raw Logs (No Prompt)',
    text: '',
    isDefault: true
  },
  {
    id: '8020',
    title: '80/20 Analysis',
    text: 'Apply the Pareto Principle to these logs. Identify the 20% of activities that likely produced 80% of the value. Also highlight the "busy work" that provided little value but took up time.',
    isDefault: true
  },
  {
    id: 'energy',
    title: 'Energy Audit',
    text: 'Analyze my day based on implied energy levels. Which tasks seemed to drain me? Which put me in a flow state? Suggest how I can restructure my schedule to match my natural energy peaks.',
    isDefault: true
  },
  {
    id: 'coach',
    title: 'Tough Love Coach',
    text: 'Roast my time management. Be direct, critical, and short. Point out where I was distracted, procrastinating, or lying to myself about being productive.',
    isDefault: true
  },
  {
    id: 'summary',
    title: 'Executive Summary',
    text: 'Create a concise, bulleted executive summary of what was accomplished today. Group by project or category. Ignore minor interruptions.',
    isDefault: true
  },
  {
    id: 'timesheet',
    title: 'Timesheet / Billing',
    text: 'Format these logs into a professional timesheet table with columns for Time, Duration, and Task Description. Round durations to the nearest 15 minutes.',
    isDefault: true
  }
];

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logsText: string;
  onCopySuccess: () => void;
  filter: string;
}

const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({ isOpen, onClose, logsText, onCopySuccess, filter }) => {
  const [prompts, setPrompts] = useState<Prompt[]>(DEFAULT_PROMPTS);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');

  // Load custom prompts
  useEffect(() => {
    if (isOpen) {
        const saved = localStorage.getItem('quarterlog_custom_prompts');
        if (saved) {
        try {
            const parsed = JSON.parse(saved);
            setPrompts([...DEFAULT_PROMPTS, ...parsed]);
        } catch(e) { console.error(e); }
        }
    }
  }, [isOpen]);

  const getCombinedText = (promptText: string) => {
    return promptText 
      ? `${promptText}\n\n---\n\n${logsText}`
      : logsText;
  };

  const handleCopy = async (promptText: string) => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    
    const finalContent = getCombinedText(promptText);

    try {
      await navigator.clipboard.writeText(finalContent);
      onCopySuccess();
      onClose();
    } catch (err) {
      alert('Failed to copy to clipboard');
    }
  };

  const handleDownload = async (promptText: string) => {
     try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
     
     const finalContent = getCombinedText(promptText);
     const fileName = `timelog_${filter}_${Date.now()}.txt`;
     
     if (Capacitor.isNativePlatform()) {
        try {
            await Filesystem.writeFile({ path: fileName, data: finalContent, directory: Directory.Cache, encoding: Encoding.UTF8 });
            const uriResult = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
            await Share.share({ title: 'Time Log Export', url: uriResult.uri });
            onClose();
        } catch (e) { alert("Export failed: " + (e as any).message); }
     } else {
        const blob = new Blob([finalContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
        onClose();
     }
  };

  const handleSavePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newText.trim()) return;
    
    const newPrompt: Prompt = {
      id: crypto.randomUUID(),
      title: newTitle,
      text: newText,
      isDefault: false
    };

    const currentCustoms = prompts.filter(p => !p.isDefault);
    const updatedCustoms = [...currentCustoms, newPrompt];
    
    localStorage.setItem('quarterlog_custom_prompts', JSON.stringify(updatedCustoms));
    setPrompts([...DEFAULT_PROMPTS, ...updatedCustoms]);
    
    setIsAdding(false);
    setNewTitle('');
    setNewText('');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if(window.confirm('Delete this custom prompt?')) {
        const currentCustoms = prompts.filter(p => !p.isDefault);
        const updatedCustoms = currentCustoms.filter(p => p.id !== id);
        localStorage.setItem('quarterlog_custom_prompts', JSON.stringify(updatedCustoms));
        setPrompts([...DEFAULT_PROMPTS, ...updatedCustoms]);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-brand-950/90 backdrop-blur-lg animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up">
        
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-slate-900 z-10">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight italic">Export Library</h2>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">
                        Choose a format to Copy or Save
                    </p>
                </div>
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className={`p-2 rounded-xl border transition-all ${isAdding ? 'bg-slate-800 border-slate-600 text-white' : 'bg-brand-600/20 border-brand-500/30 text-brand-400 hover:bg-brand-600/30'}`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={isAdding ? 'rotate-45 transition-transform' : 'transition-transform'}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </button>
            </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar">
            
            {isAdding && (
                <form onSubmit={handleSavePrompt} className="bg-slate-800/50 rounded-2xl p-4 border border-brand-500/30 mb-4 animate-fade-in">
                    <input 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-bold text-sm mb-3 focus:outline-none focus:border-brand-500"
                        placeholder="Prompt Title (e.g. Life Coach)"
                        value={newTitle}
                        onChange={e => setNewTitle(e.target.value)}
                        autoFocus
                    />
                    <textarea 
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm mb-3 focus:outline-none focus:border-brand-500 min-h-[80px]"
                        placeholder="Enter the prompt text here..."
                        value={newText}
                        onChange={e => setNewText(e.target.value)}
                    />
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-2 rounded-lg bg-slate-700 text-xs font-bold uppercase text-slate-300">Cancel</button>
                        <button type="submit" className="flex-1 py-2 rounded-lg bg-brand-600 text-xs font-bold uppercase text-white">Save Prompt</button>
                    </div>
                </form>
            )}

            {prompts.map((prompt) => (
                <div
                    key={prompt.id}
                    className="w-full bg-slate-800/40 border-2 border-transparent hover:border-white/10 rounded-xl p-4 transition-all duration-200"
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-black uppercase tracking-wider ${prompt.id === 'raw' ? 'text-emerald-400' : 'text-white'}`}>
                            {prompt.title}
                        </span>
                        {!prompt.isDefault && (
                            <button 
                                onClick={(e) => handleDelete(e, prompt.id)}
                                className="p-1 text-slate-600 hover:text-red-400 transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        )}
                    </div>
                    {prompt.text && (
                        <p className="text-xs text-slate-400 line-clamp-2 font-medium leading-relaxed mb-1">
                            {prompt.text}
                        </p>
                    )}
                    {prompt.id === 'raw' && (
                        <p className="text-xs text-slate-500 font-medium italic mb-1">
                            Copy just the log entries without any additional context.
                        </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4 pt-3 border-t border-white/5">
                        <button 
                            onClick={() => handleCopy(prompt.text)}
                            className="flex-1 bg-slate-700/50 hover:bg-slate-700 hover:text-white text-slate-300 py-2.5 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            Copy
                        </button>
                        <button 
                            onClick={() => handleDownload(prompt.text)}
                            className="flex-1 bg-slate-700/50 hover:bg-slate-700 hover:text-white text-slate-300 py-2.5 rounded-lg flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Save .txt
                        </button>
                    </div>
                </div>
            ))}
        </div>

        <div className="p-4 border-t border-white/5 bg-slate-900">
             <button
              type="button"
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