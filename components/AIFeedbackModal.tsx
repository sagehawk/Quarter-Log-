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

      // 1. Headers
      const headerMatch = trimmed.match(/^(\d+\.?\s*)?(#{2,3})\s*(.+)/);
      if (headerMatch) {
          const text = headerMatch[3];
          return (
            <div key={i} className="mt-8 mb-4 border-b border-white/10 pb-1">
                <h3 className="text-green-500 font-mono font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                    <span className="w-1 h-3 bg-green-500"></span>
                    {text}
                </h3>
            </div>
          );
      }

      // 2. Score Line
      const scoreMatch = trimmed.match(/^(\d+\.?\s*)?\**Momentum Score\**:\s*(.*)/i);
      if (scoreMatch) {
          const scoreValue = scoreMatch[2].trim();
          return (
             <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8 flex items-center justify-between">
                <span className="text-white/40 font-mono text-xs uppercase tracking-widest">MOMENTUM_VELOCITY</span>
                <span className="text-3xl font-black text-white font-mono tracking-tighter">{scoreValue}</span>
             </div>
          );
      }
      
      // 3. Bullets
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
         const content = trimmed.replace(/^[-*]\s*/, '');
         return (
            <div key={i} className="flex gap-4 mb-3 pl-1 relative">
                <span className="text-green-500/50 font-mono mt-1 text-xs">{'>'}</span>
                <span className="text-white/90 font-mono text-sm leading-relaxed">{parseInlineStyles(content)}</span>
            </div>
         );
      }

      if (trimmed === '') return <div key={i} className="h-4"></div>;

      return (
        <p key={i} className="text-white/80 mb-4 font-mono text-sm leading-relaxed">
            {parseInlineStyles(trimmed)}
        </p>
      );
    });
  };

  const parseInlineStyles = (text: string) => {
      const parts = text.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, index) => {
          if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={index} className="text-white font-bold">{part.slice(2, -2)}</strong>;
          }
          const subParts = part.split(/(\*.*?\*)/g); 
          return subParts.map((sub, subIndex) => {
             if (sub.startsWith('*') && sub.endsWith('*')) {
                 return <em key={`${index}-${subIndex}`} className="text-green-500 not-italic">{sub.slice(1, -1)}</em>;
             }
             return sub;
          });
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in"
        onClick={onClose}
      />
      
      <div className="relative w-full h-full bg-black flex flex-col animate-slide-up">
        
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex justify-between items-start bg-zinc-900/30 pt-[calc(2rem+env(safe-area-inset-top))]">
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 animate-pulse rounded-sm" />
                    <span className="text-xs font-mono uppercase tracking-[0.3em] text-green-500">
                        CLASSIFIED // {period.toUpperCase()} // {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase()}
                    </span>
                </div>
                <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">
                    Strategic Debrief
                </h2>
            </div>
            {/* Top Close Button (Optional / Secondary) */}
             <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-white/40 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
        </div>

        {/* Content */}
        <div 
            className="flex-1 overflow-y-auto custom-scrollbar p-6 pb-32 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:30px_30px]"
            onTouchMove={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
        >
            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-8">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-white/10 border-t-green-500 rounded-full animate-spin"></div>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-green-500 font-mono text-sm uppercase tracking-widest animate-pulse">Decrypting Biometrics...</p>
                        <p className="text-white/20 font-mono text-xs">SECURE_CHANNEL_ESTABLISHED</p>
                    </div>
                </div>
            ) : report ? (
                <div className="animate-fade-in max-w-2xl mx-auto select-text cursor-text">
                    {renderMarkdown(report)}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center h-full">
                    <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mb-8 text-white/20">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    </div>
                    <p className="text-white/40 mb-10 font-mono text-sm max-w-xs mx-auto leading-relaxed">
                        {'>'} Awaiting command to generate tactical assessment for this sector.
                    </p>
                    
                    <button 
                        onClick={() => {
                            try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
                            onGenerate();
                        }}
                        className="w-full max-w-xs py-5 bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-[0.2em] rounded-xl shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-all active:scale-[0.98] text-base"
                    >
                        INITIATE ANALYSIS
                    </button>
                </div>
            )}
        </div>
        
        {/* Sticky Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-zinc-900/90 border-t border-white/10 backdrop-blur-xl pb-[calc(1.5rem+env(safe-area-inset-bottom))] z-20 flex flex-col gap-3">
             {report && !isLoading && (!isSaved || (isSaved && canUpdate)) && (
                <button 
                    onClick={() => {
                        try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
                        onGenerate();
                    }}
                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white font-black uppercase tracking-[0.2em] rounded-xl transition-all text-xs border border-white/5 hover:border-white/10"
                >
                    {isSaved ? 'RE-EVALUATE DATA' : 'RETRY UPLINK'}
                </button>
            )}
            <button 
                onClick={onClose}
                className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.2em] rounded-xl shadow-lg transition-all active:scale-[0.98] text-sm"
            >
                CLOSE DEBRIEF
            </button>
        </div>
      </div>
    </div>
  );
};

export default AIFeedbackModal;
