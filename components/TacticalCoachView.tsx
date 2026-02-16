import React, { useState, useEffect, useRef } from 'react';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { AppTheme } from '../types';

export type CoachMood = 'IDLE' | 'ASKING' | 'PROCESSING' | 'WIN' | 'LOSS' | 'DRAW' | 'SAVAGE' | 'STOIC';

interface TacticalCoachViewProps {
  mood: CoachMood;
  message: string; // The text to animate
  onFinishedTyping?: () => void;
  children?: React.ReactNode; // Buttons/Inputs overlay
  bgImage?: string; // Optional override
  theme?: AppTheme;
}

const TYPE_SPEED = 30; // ms per char

const TacticalCoachView: React.FC<TacticalCoachViewProps> = ({
  mood,
  message,
  onFinishedTyping,
  children,
  bgImage,
  theme = 'dark'
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const bufferedChildrenRef = useRef<React.ReactNode>(children);

  // Only update buffered children when typing is complete
  if (displayedText === message) {
    bufferedChildrenRef.current = children;
  }

  const moodImages: Record<CoachMood, string> = {
    'IDLE': '/character/coach-idle.jpg',
    'ASKING': '/character/coach-asking.jpg',
    'PROCESSING': '/character/coach-processing.jpg',
    'WIN': '/character/coach-win.jpg',
    'LOSS': '/character/coach-loss.jpg',
    'DRAW': '/character/coach-draw.jpg',
    'SAVAGE': '/character/coach-savage.jpg',
    'STOIC': '/character/coach-stoic.jpg',
  };

  const currentImage = bgImage === 'transparent' ? null : (bgImage || moodImages[mood]);
  const isTransparent = bgImage === 'transparent';
  const isDark = theme === 'dark';

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
    <div className={`fixed left-0 right-0 top-0 z-[50] overflow-hidden pointer-events-none ${isTransparent ? '' : isDark ? 'bg-black text-white' : 'bg-[#F4F5F7] text-zinc-900'}`} style={{ height: '100dvh' }}>

      {/* Background Image Layer */}
      {currentImage && (
        <div className="absolute inset-0 z-0 pointer-events-auto flex items-end justify-center">
          <div className="absolute inset-0 z-10 bg-black/20" /> {/* Dimmer */}
          <img
            src={currentImage}
            alt="Tactical Coach"
            className="w-full h-full object-cover object-bottom md:object-[center_25%] transition-all duration-1000 ease-in-out opacity-90"
          />
        </div>
      )}

      {/* CRT / Scanline Effect Overlay (Optional Style) */}
      {currentImage && isDark && (
        <div className="absolute inset-0 z-10 pointer-events-none bg-[url('https://media.giphy.com/media/oEI9uBYSzLpBK/giphy.gif')] opacity-[0.03] mix-blend-screen" />
      )}

      {/* Dialogue Box */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 p-6 pb-12 pointer-events-auto bg-gradient-to-t from-black via-black/90 to-transparent`}>

        <div className="max-w-xl mx-auto space-y-6">
          {/* Character Name Tag */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-500 font-mono text-xs uppercase tracking-[0.2em]">
              handler_v1.0
            </span>
          </div>

          {/* Text Area */}
          <div className="min-h-[100px] border-l-2 border-green-500/50 pl-4 p-4 rounded-r-xl relative backdrop-blur-sm bg-black/40">
            {/* Invisible full message to pre-set height */}
            <p className="font-mono text-lg md:text-xl leading-relaxed text-transparent select-none" aria-hidden="true">
              {message}
            </p>
            {/* Visible typed text overlaid on top */}
            <p className="font-mono text-lg md:text-xl leading-relaxed shadow-black drop-shadow-sm absolute top-4 left-4 right-4 pl-4 text-white/90">
              {displayedText}
              {displayedText !== message && <span className="inline-block w-2 h-5 bg-green-500 ml-1 animate-blink" />}
            </p>
          </div>

          {/* Interaction Area (Buttons/Inputs) */}
          <div className={`transition-all ${displayedText !== message ? 'duration-300 opacity-0 translate-y-4 pointer-events-none' : 'duration-500 opacity-100 translate-y-0'}`}>
            {bufferedChildrenRef.current}
          </div>
        </div>
      </div>

    </div>
  );
};

export default TacticalCoachView;