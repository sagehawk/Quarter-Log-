import React from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface AIFeedbackModalProps {
  isOpen: boolean;
  isLoading: boolean;
  report: string | null;
  period: string;
  onClose: () => void;
  onGenerate: () => void;
}

const AIFeedbackModal: React.FC<AIFeedbackModalProps> = ({ 
  isOpen, 
  isLoading, 
  report, 
  period,
  onClose,
  onGenerate 
}) => {
  
  if (!isOpen) return null;

  // Simple Markdown Renderer (for bolding and bullets)
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('###')) return <h3 key={i} className="text-lg font-bold text-brand-400 mt-4 mb-2">{line.replace('###', '')}</h3>;
      if (line.startsWith('**')) return <p key={i} className="font-bold text-white mb-2">{line.replace(/\*\*/g, '')}</p>;
      
      // Bullets
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
         return (
            <div key={i} className="flex gap-2 mb-1 pl-2">
                <span className="text-brand-500">•</span>
                <span className="text-slate-300">
                    {line.replace(/^[-*]\s/, '').split('**').map((part, j) => 
                        j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
                    )}
                </span>
            </div>
         );
      }

      // Standard Paragraph with Bold support
      return (
        <p key={i} className="text-slate-300 mb-2 leading-relaxed">
            {line.split('**').map((part, j) => 
                j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
            )}
        </p>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-brand-950/90 backdrop-blur-lg animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-slate-900 border-2 border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 pb-2 flex justify-between items-start bg-slate-900 z-10">
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                    AI Analysis <span className="text-brand-500 text-sm align-top not-italic ml-1 bg-brand-900/50 px-1.5 py-0.5 rounded">BETA</span>
                </h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wide">
                    {period} Report
                </p>
            </div>
            <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 space-y-4">
                    <div className="w-12 h-12 border-4 border-brand-500/30 border-t-brand-500 rounded-full animate-spin"></div>
                    <p className="text-brand-400 font-bold uppercase tracking-widest animate-pulse text-sm">Crunching Data...</p>
                </div>
            ) : report ? (
                <div className="prose prose-invert prose-sm">
                    {renderMarkdown(report)}
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto mb-4 flex items-center justify-center text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </div>
                    <p className="text-slate-400 mb-6 font-medium text-sm px-4">
                        Generate a customized report for this {period.toLowerCase()}. The AI will analyze your logs based on your goal.
                    </p>
                    
                    <button 
                        onClick={() => {
                            try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
                            onGenerate();
                        }}
                        className="w-full py-4 bg-brand-600 hover:bg-brand-500 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-900/40 transition-all active:scale-[0.98]"
                    >
                        Generate Report
                    </button>
                </div>
            )}
        </div>
        
        {report && !isLoading && (
            <div className="p-4 bg-slate-900 border-t border-slate-800">
                <button 
                    onClick={() => {
                        try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
                        onGenerate();
                    }}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wide rounded-xl transition-all text-xs"
                >
                    Regenerate
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default AIFeedbackModal;