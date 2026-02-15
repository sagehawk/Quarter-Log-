import React from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { LogEntry, AppTheme } from '../types';
import { exportToClipboard, exportToTXT, exportToCSV } from '../utils/export';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    logs: LogEntry[];
    onSuccess: (message: string) => void;
    theme?: AppTheme;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, logs, onSuccess, theme = 'dark' }) => {
    if (!isOpen) return null;

    const isDark = theme === 'dark';

    const handleAction = async (action: 'COPY' | 'TXT' | 'CSV') => {
        try {
            Haptics.impact({ style: ImpactStyle.Medium });
            if (action === 'COPY') {
                await exportToClipboard(logs);
                onSuccess("Copied to Clipboard (Note: Large datasets may be truncated by OS)");
            } else if (action === 'TXT') {
                await exportToTXT(logs);
                // Share handling is async, usually we assume it opened
            } else if (action === 'CSV') {
                await exportToCSV(logs);
            }
            onClose();
        } catch (e) {
            console.error("Export failed", e);
            // Error handling could be improved but keeping it simple
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className={`absolute inset-0 backdrop-blur-md animate-fade-in ${isDark ? 'bg-black/95' : 'bg-zinc-200/95'}`}
                onClick={onClose}
            />

            <div className={`relative w-full max-w-sm border rounded-3xl shadow-[0_0_50px_rgba(0,0,0,1)] p-6 transform transition-all animate-slide-up ${isDark ? 'bg-zinc-900 border-white/10' : 'bg-zinc-50 border-zinc-200 shadow-xl'}`}>
                <h2 className={`text-xl font-black uppercase tracking-tighter italic mb-6 border-b pb-4 ${isDark ? 'text-white border-white/10' : 'text-zinc-900 border-zinc-100'}`}>
                    Export Data
                </h2>

                <div className="space-y-3">
                    <button
                        onClick={() => handleAction('COPY')}
                        className={`w-full p-4 border rounded-xl flex items-center justify-between group transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 hover:border-zinc-300'}`}
                    >
                        <div className="flex flex-col items-start">
                            <span className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-white' : 'text-zinc-900'}`}>Copy to Clipboard</span>
                            <span className="text-[10px] text-yellow-500/80 font-mono mt-1">Warning: OS limits may truncate large text</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isDark ? 'text-white/20 group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    </button>

                    <button
                        onClick={() => handleAction('TXT')}
                        className={`w-full p-4 border rounded-xl flex items-center justify-between group transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 hover:border-zinc-300'}`}
                    >
                        <div className="flex flex-col items-start">
                            <span className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-white' : 'text-zinc-900'}`}>Export as .TXT</span>
                            <span className={`text-[10px] font-mono mt-1 ${isDark ? 'text-white/40' : 'text-zinc-500'}`}>Plain text format</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isDark ? 'text-white/20 group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </button>

                    <button
                        onClick={() => handleAction('CSV')}
                        className={`w-full p-4 border rounded-xl flex items-center justify-between group transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10' : 'bg-zinc-50 hover:bg-zinc-100 border-zinc-200 hover:border-zinc-300'}`}
                    >
                        <div className="flex flex-col items-start">
                            <span className={`text-sm font-bold uppercase tracking-widest ${isDark ? 'text-white' : 'text-zinc-900'}`}>Export as .CSV</span>
                            <span className={`text-[10px] font-mono mt-1 ${isDark ? 'text-white/40' : 'text-zinc-500'}`}>Spreadsheet compatible</span>
                        </div>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isDark ? 'text-white/20 group-hover:text-white' : 'text-zinc-400 group-hover:text-zinc-900'}`}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line><line x1="10" y1="9" x2="8" y2="9"></line></svg>
                    </button>
                </div>

                <button
                    onClick={onClose}
                    className={`w-full mt-6 py-4 border rounded-xl font-black uppercase tracking-[0.2em] text-xs transition-colors ${isDark ? 'bg-zinc-900 border-white/5 hover:bg-zinc-800 text-white/40 hover:text-white' : 'bg-zinc-100 border-zinc-200 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-900'}`}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default ExportModal;
