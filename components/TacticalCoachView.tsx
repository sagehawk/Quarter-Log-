import React, { useState, useEffect } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export type CoachMood = 'IDLE' | 'ASKING' | 'PROCESSING' | 'WIN' | 'LOSS' | 'DRAW' | 'SAVAGE' | 'STOIC';

interface TacticalCoachViewProps {
  mood: CoachMood;
  message: string; // The text to animate
  onFinishedTyping?: () => void;
  children?: React.ReactNode; // Buttons/Inputs overlay
  bgImage?: string; // Optional override
}

const TYPE_SPEED = 30; // ms per char

const TacticalCoachView: React.FC<TacticalCoachViewProps> = ({ 
  mood, 
  message, 
  onFinishedTyping, 
  children,
  bgImage 
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const moodImages: Record<CoachMood, string> = {
    'IDLE': '/character/coach-idle.jpg',
    'ASKING': '/character/coach-asking.jpg',
    'PROCESSING': '/character/coach-processing.jpg',
    'WIN': '/character/coach-win.jpg',
    'LOSS': '/character/coach-loss.jpg',
    'DRAW': '/character/coach-draw.jpg',
    'SAVAGE': '/character/coach-savage.jpg',
    'STOIC': '/character/coach-idle.jpg',
  };

  const currentImage = bgImage === 'transparent' ? null : (bgImage || moodImages[mood]);
  const isTransparent = bgImage === 'transparent';

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;
    
    const timer = setInterval(() => {
      if (i < message.length) {
        setDisplayedText(message.slice(0, i + 1));
        i++;
        // Optional: Very subtle haptic tick for typing feel
        // if (i % 3 === 0) Haptics.impact({ style: ImpactStyle.Light });
      } else {
        clearInterval(timer);
        setIsTyping(false);
        if (onFinishedTyping) onFinishedTyping();
      }
    }, TYPE_SPEED);

    return () => clearInterval(timer);
  }, [message]);

  return (
    <div className={`fixed inset-0 z-[50] text-white overflow-hidden pointer-events-none ${isTransparent ? '' : 'bg-black'}`}>
      
      {/* Background Image Layer */}
      {currentImage && (
        <div className="absolute inset-0 z-0 pointer-events-auto">
            <div className="absolute inset-0 bg-black/20 z-10" /> {/* Dimmer */}
            <img 
                src={currentImage} 
                alt="Tactical Coach" 
                className="w-full h-full object-cover transition-all duration-1000 ease-in-out opacity-90"
            />
        </div>
      )}

      {/* CRT / Scanline Effect Overlay (Optional Style) */}
      {currentImage && (
         <div className="absolute inset-0 z-10 pointer-events-none bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] opacity-[0.03] mix-blend-screen" />
      )}

      {/* Dialogue Box */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pb-12 bg-gradient-to-t from-black via-black/90 to-transparent pointer-events-auto">
         
         <div className="max-w-xl mx-auto space-y-6">
             {/* Character Name Tag */}
             <div className="flex items-center gap-2 mb-2">
                 <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                 <span className="text-green-500 font-mono text-xs uppercase tracking-[0.2em]">
                     handler_v1.0
                 </span>
             </div>

             {/* Text Area */}
             <div className="min-h-[100px] border-l-2 border-green-500/50 pl-4 bg-black/40 backdrop-blur-sm p-4 rounded-r-xl">
                 <p className="font-mono text-lg md:text-xl leading-relaxed text-white/90 shadow-black drop-shadow-md">
                     {displayedText}
                     {isTyping && <span className="inline-block w-2 h-5 bg-green-500 ml-1 animate-blink"/>}
                 </p>
             </div>

             {/* Interaction Area (Buttons/Inputs) */}
             <div className={`transition-all duration-500 ${isTyping ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                 {children}
             </div>
         </div>
      </div>

    </div>
  );
};

export default TacticalCoachView;