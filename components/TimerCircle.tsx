import React from 'react';
import { DEFAULT_INTERVAL_MS } from '../types';

interface TimerCircleProps {
  timeLeft: number;
  isActive: boolean;
  totalTime?: number;
}

const TimerCircle: React.FC<TimerCircleProps> = ({ timeLeft, isActive, totalTime = DEFAULT_INTERVAL_MS }) => {
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  // Prevent division by zero
  const safeTotalTime = totalTime || DEFAULT_INTERVAL_MS;
  const progress = Math.max(0, Math.min(1, timeLeft / safeTotalTime));
  const dashoffset = circumference * (1 - progress);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="relative flex items-center justify-center w-72 h-72 mx-auto my-8">
      {/* Background Circle */}
      <svg className="absolute w-full h-full transform -rotate-90" viewBox="0 0 260 260">
        <circle
          cx="130"
          cy="130"
          r={radius}
          stroke="#1e293b"
          strokeWidth="12"
          fill="none"
        />
        {/* Progress Circle */}
        <circle
          cx="130"
          cy="130"
          r={radius}
          stroke={isActive ? "#3b82f6" : "#64748b"}
          strokeWidth="12"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      
      {/* Time Text */}
      <div className="relative z-10 text-center">
        <div className={`text-6xl font-mono font-bold tracking-tighter ${isActive ? 'text-white' : 'text-slate-400'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <p className="text-slate-500 mt-2 text-sm font-medium uppercase tracking-widest">
          {isActive ? 'Focusing' : 'Paused'}
        </p>
      </div>
    </div>
  );
};

export default TimerCircle;