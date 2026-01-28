
import React from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface AIFeedbackModalProps {
  isOpen: boolean;
  isLoading: boolean;
  report: string | null;
  period: string;
  isSaved?: boolean;
  canUpdate?: boolean; // New Prop
  onClose: () => void;
  onGenerate: () => void;
}

const AIFeedbackModal: React.FC<AIFeedbackModalProps> = ({ 
  isOpen, 
  isLoading, 
  report, 
  period,
  isSaved = false,
  canUpdate = false,
  onClose,
  onGenerate 
}) => {
  
  if (!isOpen) return null;

  // Robust Markdown Renderer
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim();

      // 1. Headers (###) - Handle potential numbering prefix (e.g. "2. ### Analysis")
      // Regex: Optional number/dot/space, then ###, then content
      const headerMatch = trimmed.match(/^(\d+\.?\s*)?###\s*(.+)/);
      if (headerMatch) {
          return <h3 key={i} className="text-xl font-black text-brand-400 mt-6 mb-3 uppercase tracking-wide italic">{headerMatch[2]}</h3>;
      }

      // 2. Score Line Special Rendering
      // Matches "**Score**:" or "Score:" with optional numbering
      const scoreMatch = trimmed.match(/^(\d+\.?\s*)?\**Score\**:\s*(.*)/i);
      if (scoreMatch) {
          const scoreValue = scoreMatch[2].trim();
          return (
             <div key={i} className="bg-slate-800/50 rounded-xl p-4 border border-white/5 mb-6 flex items-center justify-between">
                <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Productivity Score</span>
                <span className="text-3xl font-black text-white italic tracking-tighter">{scoreValue}</span>
             </div>
          );
      }
      
      // 3. Bullets (- or *)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
         // Trim first to handle indentation, then strip the dash/star
         const content = trimmed.replace(/^[-*]\s*/, '');
         return (
            <div key={i} className="flex gap-3 mb-2 pl-2">
                <span className="text-brand-500 font-bold mt-1">•</span>
                <span className="text-slate-300 leading-relaxed">{parseInlineStyles(content)}</span>
            </div>
         );
      }

      // 4. Empty lines
      if (trimmed === '') return <div key={i} className="h-2"></div>;

      // 5. Standard Paragraph
      return (
        <p key={i} className="text-slate-300 mb-2 leading-relaxed font-medium">
            {parseInlineStyles(trimmed)}
        </p>
      );
    });
  };

  // Helper to handle **bold** and *italics*
  const parseInlineStyles = (text: string) => {
      // Split by bold (**...**)
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
              // It's bold
              return <strong key={index} className="text-white font-extrabold">{part.slice(2, -2)}</strong>;
          }
          
          // Check for italics inside the non-bold parts
          // Note: This is a simple parser, might not handle nested perfectly, but sufficient for this AI output
          const subParts = part.split(/(\*.*?\*)/g); 
          return subParts.map((sub, subIndex) => {
             if (sub.startsWith('*') && sub.endsWith('*')) {
                 return <em key={`${index}-${subIndex}`} className="text-brand-200 italic">{sub.slice(1, -1)}</em>;
             }
             return sub;
          });
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
        <div className="p-6 pb-2 flex justify-between items-start bg-slate-900 z-10 shrink-0">
            <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                    AI Analysis
                </h2>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wide">
                        {period} Report
                    </span>
                    {isSaved && (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-black uppercase px-2 py-0.5 rounded">
                            Saved
                        </span>
                    )}
                </div>
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
                <div className="prose prose-invert prose-sm max-w-none">
                    {renderMarkdown(report)}
                </div>
            ) : (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-800 rounded-2xl mx-auto mb-4 flex items-center justify-center text-slate-600">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </div>
                    <p className="text-slate-400 mb-6 font-medium text-sm px-4">
                        Generate a customized report for this {period.toLowerCase()}. The AI will analyze your logs based on your goal, identify wins, and expose inefficiencies.
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
        
        {/* Footer Actions - Show if not loading AND (not saved OR (saved AND update available)) */}
        {report && !isLoading && (!isSaved || (isSaved && canUpdate)) && (
            <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
                <button 
                    onClick={() => {
                        try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
                        onGenerate();
                    }}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wide rounded-xl transition-all text-xs"
                >
                    {isSaved ? 'Update Analysis' : 'Regenerate'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default AIFeedbackModal;
