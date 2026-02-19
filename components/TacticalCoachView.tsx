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
  mode?: 'FULL' | 'MINI';
}

const TYPE_SPEED = 30; // ms per char

const TacticalCoachView: React.FC<TacticalCoachViewProps> = ({
  mood,
  message,
  onFinishedTyping,
  children,
  bgImage,
  theme = 'dark',
  mode = 'FULL'
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const bufferedChildrenRef = useRef<React.ReactNode>(children);

  // Only update buffered children when typing is complete
  if (displayedText === message) {
    bufferedChildrenRef.current = children;
  }

  const isDark = theme === 'dark';
  const isMini = mode === 'MINI';

  useEffect(() => {
    setDisplayedText('');
    setIsTyping(true);
    let i = 0;

    const timer = setInterval(() => {
      if (i < message.length) {
        setDisplayedText(message.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        setIsTyping(false);
        if (onFinishedTyping) onFinishedTyping();
      }
    }, TYPE_SPEED);

    return () => clearInterval(timer);
  }, [message]);

  if (isMini) {
    return (
      <div className={`flex flex-col h-full pointer-events-none ${isDark ? 'bg-black text-white' : 'bg-[#F4F5F7] text-zinc-900'}`}>
        {/* Main Content Area (For Planner) - Pushed to top via flex-1 */}
        <div className="flex-1 overflow-hidden relative pointer-events-auto">
          {children}
        </div>

        {/* Bottom Message Area */}
        <div className="min-h-[120px] relative flex items-end justify-between p-4 pb-6 bg-gradient-to-t from-black via-black/90 to-transparent z-20 pointer-events-auto">
          <div className="w-full mb-2">
            <div className="bg-black/60 backdrop-blur-md border md:border-l-2 border-green-500/30 rounded-xl p-3 relative">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-green-500 font-mono uppercase tracking-widest">SYSTEM</span>
              </div>
              <p className="font-mono text-xs md:text-sm leading-relaxed text-white/90">
                {displayedText}
                {displayedText !== message && <span className="inline-block w-1.5 h-4 bg-green-500 ml-1 animate-blink align-middle" />}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[50] overflow-hidden pointer-events-none ${isDark ? 'bg-black/80 text-white' : 'bg-[#F4F5F7]/90 text-zinc-900'}`}>

      {/* Dialogue Box */}
      <div className={`absolute bottom-0 left-0 right-0 z-20 p-6 pb-12 pointer-events-auto bg-gradient-to-t from-black via-black/90 to-transparent`}>

        <div className="max-w-xl mx-auto space-y-6">
          {/* System Tag */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-green-500 font-mono text-xs uppercase tracking-[0.2em]">
              SYSTEM
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