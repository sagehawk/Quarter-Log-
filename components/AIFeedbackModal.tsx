
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
      const headerMatch = trimmed.match(/^(\d+\.?\s*)?###\s*(.+)/);
      if (headerMatch) {
          return <h3 key={i} className="text-xl font-black text-yellow-500 mt-8 mb-4 uppercase tracking-tighter italic border-l-4 border-yellow-500 pl-4">{headerMatch[2]}</h3>;
      }

      // 2. Score Line Special Rendering
      const scoreMatch = trimmed.match(/^(\d+\.?\s*)?\**Momentum Score\**:\s*(.*)/i);
      if (scoreMatch) {
          const scoreValue = scoreMatch[2].trim();
          return (
             <div key={i} className="bg-white/5 rounded-2xl p-6 border border-yellow-500/20 mb-8 flex items-center justify-between shadow-2xl">
                <span className="text-yellow-500/60 font-black uppercase tracking-[0.2em] italic text-[10px]">Current Momentum</span>
                <span className="text-4xl font-black text-white italic tracking-tighter shadow-yellow-500/20 drop-shadow-2xl">{scoreValue}</span>
             </div>
          );
      }
      
      // 3. Bullets (- or *)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
         const content = trimmed.replace(/^[-*]\s*/, '');
         return (
            <div key={i} className="flex gap-4 mb-3 pl-2">
                <span className="text-yellow-500 font-black mt-1">/</span>
                <span className="text-white/80 leading-relaxed font-bold tracking-tight">{parseInlineStyles(content)}</span>
            </div>
         );
      }

      // 4. Empty lines
      if (trimmed === '') return <div key={i} className="h-2"></div>;

      // 5. Standard Paragraph
      return (
        <p key={i} className="text-white/60 mb-4 leading-relaxed font-bold tracking-tight italic">
            {parseInlineStyles(trimmed)}
        </p>
      );
    });
  };

  // Helper to handle **bold** and *italics*
  const parseInlineStyles = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={index} className="text-white font-black italic">{part.slice(2, -2)}</strong>;
          }
          
          const subParts = part.split(/(\*.*?\*)/g); 
          return subParts.map((sub, subIndex) => {
             if (sub.startsWith('*') && sub.endsWith('*')) {
                 return <em key={`${index}-${subIndex}`} className="text-yellow-500/80 italic font-black">{sub.slice(1, -1)}</em>;
             }
             return sub;
          });
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col animate-slide-up max-h-[85vh]">
        
        {/* Header */}
        <div className="p-8 pb-4 flex justify-between items-start z-10 shrink-0">
            <div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                    Tactical Debrief
                </h2>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-yellow-500/40 text-[10px] font-black uppercase tracking-[0.2em] italic">
                        {period} Intel
                    </span>
                    {isSaved && (
                        <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 text-[9px] font-black uppercase px-2 py-0.5 rounded italic">
                            Recorded
                        </span>
                    )}
                </div>
            </div>
            <button onClick={onClose} className="p-2.5 bg-white/5 rounded-xl hover:bg-white/10 text-white/40 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pt-2">
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 space-y-6">
                    <div className="relative">
                        <div className="w-16 h-16 border-2 border-yellow-500/20 border-t-yellow-500 rounded-2xl animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                    <p className="text-yellow-500 font-black uppercase tracking-[0.3em] animate-pulse text-[10px] italic">Processing Field Data...</p>
                </div>
            ) : report ? (
                <div className="prose prose-invert prose-sm max-w-none">
                    {renderMarkdown(report)}
                </div>
            ) : (
                <div className="text-center py-12">
                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] mx-auto mb-6 flex items-center justify-center text-white/20 border border-white/5 shadow-inner">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </div>
                    <p className="text-white/40 mb-10 font-black uppercase tracking-widest text-xs px-8 italic leading-relaxed">
                        Request a tactical assessment for this {period.toLowerCase()}. The Cornerman will analyze your momentum and expose your weaknesses.
                    </p>
                    
                    <button 
                        onClick={() => {
                            try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
                            onGenerate();
                        }}
                        className="w-full py-5 bg-yellow-500 hover:bg-yellow-400 text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl shadow-yellow-500/20 transition-all active:scale-[0.98] italic text-lg"
                    >
                        GET DEBRIEF
                    </button>
                </div>
            )}
        </div>
        
        {report && !isLoading && (!isSaved || (isSaved && canUpdate)) && (
            <div className="p-6 bg-white/5 border-t border-white/5 shrink-0">
                <button 
                    onClick={() => {
                        try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
                        onGenerate();
                    }}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 font-black uppercase tracking-[0.2em] rounded-xl transition-all text-[10px] italic"
                >
                    {isSaved ? 'Refresh Assessment' : 'Request Recalculation'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default AIFeedbackModal;
