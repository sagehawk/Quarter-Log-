import React, { useState } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { UserGoal, ScheduleConfig } from '../types';
import { requestNotificationPermission } from '../utils/notifications';

interface OnboardingProps {
  onComplete: (goals: UserGoal[], schedule: ScheduleConfig, priority?: string, startChallenge?: boolean) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [priority, setPriority] = useState("");
  const [isChallenge, setIsChallenge] = useState(true); // Default to challenge mode
  
  const [schedule, setSchedule] = useState<ScheduleConfig>({
      enabled: true,
      startTime: '09:00', // Default typical workday
      endTime: '17:00',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
  });

  const handleNext = () => {
    try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
    setStep(prev => prev + 1);
  };

  const handlePermissionRequest = async () => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    const granted = await requestNotificationPermission();
    if (granted) {
      handleFinish();
    } else {
        // Fallback for denial / incognito / desktop
        if (confirm("Notifications are disabled. You will need to manually check the app. Proceed?")) {
            handleFinish();
        }
    }
  };

  const handleSkipPermission = () => {
      try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
      if (confirm("Without notifications, you lose the tactical advantage of interrupts. Confirm Manual Mode?")) {
          handleFinish();
      }
  };

  const handleFinish = () => {
     try { Haptics.notification({ type: NotificationType.Success }); } catch(e) {}
     onComplete(['BUSINESS'], schedule, priority, isChallenge);
  };

  const calculateTotalBlocks = () => {
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      let endTotal = endH * 60 + endM;
      
      if (endTotal < startTotal) {
          endTotal += 1440; // Handle overnight schedule
      }

      const duration = endTotal - startTotal;
      return Math.max(0, Math.floor(duration / 15));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] overflow-y-auto custom-scrollbar">
      
      {/* Cinematic Background */}
      <div className="fixed inset-0 -z-10 bg-[linear-gradient(160deg,_#2a220a_0%,_#050505_40%,_#000000_100%)]" />
      <div className="fixed inset-0 -z-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJnoiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2cpIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] opacity-[0.05] pointer-events-none mix-blend-overlay" />

      <div className="min-h-full flex flex-col items-center justify-center p-6 py-24 text-center font-sans text-white relative">
        
        {/* Progress Bars */}
        <div className="absolute top-12 left-0 w-full flex justify-center gap-1.5 safe-top z-20 px-10">
            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-1 rounded-full transition-all duration-700 ease-out ${i <= step ? 'flex-1 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'flex-1 bg-white/5'}`} />
            ))}
        </div>

        <div className="max-w-md w-full relative z-10 flex flex-col justify-center">
        
        {/* Step 1: The Hook (Rebranded for Challenge) */}
        {step === 1 && (
            <div className="space-y-10 animate-fade-in">
                <div className="space-y-2">
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.8] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
                        7-Day<br/><span className="text-yellow-500">Reset</span>
                    </h1>
                </div>
                
                <div className="space-y-6 text-left px-2">
                    <p className="text-white/60 font-medium text-lg leading-relaxed">
                        You aren't lazy. Your dopamine receptors are fried.
                    </p>
                    <div className="pl-4 border-l-2 border-yellow-500/50 space-y-4">
                        <p className="text-xl font-bold text-white leading-tight">
                            The Protocol:
                        </p>
                        <ul className="space-y-2 text-sm text-white/80 font-mono uppercase tracking-widest">
                            <li>1. 15-Minute Cycles</li>
                            <li>2. Binary Scoring (Win/Loss)</li>
                            <li>3. Radical Accountability</li>
                        </ul>
                    </div>
                    <p className="text-white/60 font-medium text-lg leading-relaxed">
                        Commit to the 7-Day Challenge. Fix your brain.
                    </p>
                </div>
                
                <button onClick={handleNext} className="w-full py-5 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] text-lg animate-slide-up">
                    Accept Challenge
                </button>
            </div>
        )}

        {/* Step 2: The Rules (Mechanic Explanation) */}
        {step === 2 && (
            <div className="space-y-10 animate-fade-in">
                <div className="text-center">
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-none text-white">
                        The<br/><span className="text-slate-500">Rules</span>
                    </h1>
                </div>

                <div className="flex flex-col gap-6 text-left px-4">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/5 space-y-6">
                        
                        <div className="flex items-baseline gap-4">
                            <span className="text-yellow-500 font-black text-4xl italic tracking-tighter">01</span>
                            <div>
                                <h3 className="text-2xl font-black uppercase italic tracking-wide text-white">15 Min Cycles</h3>
                                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">The app wakes up. You report in.</p>
                            </div>
                        </div>

                        <div className="h-px bg-white/5 w-full" />

                        <div className="flex items-baseline gap-4">
                            <span className="text-yellow-500 font-black text-4xl italic tracking-tighter">02</span>
                            <div>
                                <h3 className="text-2xl font-black uppercase italic tracking-wide text-white">Stack Wins</h3>
                                <p className="text-white/40 font-bold uppercase tracking-widest text-xs">Prove your status. Climb the ranks.</p>
                            </div>
                        </div>

                        <div className="h-px bg-white/5 w-full" />

                        <div className="flex items-baseline gap-4">
                            <span className="text-red-500 font-black text-4xl italic tracking-tighter">03</span>
                            <div>
                                <h3 className="text-2xl font-black uppercase italic tracking-wide text-white">Don't Lose</h3>
                                <p className="text-red-500/60 font-bold uppercase tracking-widest text-xs">Avoid the miss.</p>
                            </div>
                        </div>

                    </div>
                </div>
                
                <button onClick={handleNext} className="w-full py-6 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-2xl text-xl">
                    Understood
                </button>
            </div>
        )}

        {/* Step 3: Sync Your Cycle */}
        {step === 3 && (
            <div className="space-y-12 animate-fade-in">
                <div className="text-center space-y-4">
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-none">
                        Sync<br/><span className="text-yellow-500">Cycle</span>
                    </h1>
                </div>

                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 space-y-10">
                    <div className="space-y-4">
                        <input 
                            type="time" 
                            value={schedule.startTime}
                            onChange={(e) => setSchedule({...schedule, startTime: e.target.value})}
                            className="w-full bg-black/50 text-white font-black text-5xl p-6 rounded-2xl border border-white/10 focus:border-yellow-500 outline-none transition-all text-center italic"
                        />
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-white/20">Start Operations</p>
                    </div>
                    
                    <div className="space-y-4">
                        <input 
                            type="time" 
                            value={schedule.endTime}
                            onChange={(e) => setSchedule({...schedule, endTime: e.target.value})}
                            className="w-full bg-black/50 text-white font-black text-5xl p-6 rounded-2xl border border-white/10 focus:border-yellow-500 outline-none transition-all text-center italic"
                        />
                        <p className="text-xs font-black uppercase tracking-[0.4em] text-white/20">End Operations</p>
                    </div>

                    <div className="pt-4 border-t border-white/5">
                        <div className="text-4xl font-black text-white italic tracking-tighter">
                            {calculateTotalBlocks()} <span className="text-xl text-yellow-500">Cycles</span>
                        </div>
                    </div>
                </div>

                <button onClick={handleNext} className="w-full py-6 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-2xl text-xl">
                    Confirm Schedule
                </button>
            </div>
        )}

        {/* Step 4: Strategic Priority (New) */}
        {step === 4 && (
            <div className="space-y-10 animate-fade-in">
                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
                        North<br/><span className="text-yellow-500">Star</span>
                    </h1>
                    <p className="text-white/60 font-bold text-base leading-relaxed max-w-xs mx-auto">
                        What is the ONE strategic outcome you must achieve?
                    </p>
                </div>

                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10 space-y-4">
                     <textarea
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        placeholder="e.g. Launch the MVP, Close $50k deals, Finish the Thesis..."
                        className="w-full bg-black/50 text-white font-bold text-xl p-6 rounded-2xl border border-white/10 focus:border-yellow-500 outline-none transition-all italic min-h-[120px]"
                        autoFocus
                     />
                </div>

                <div className="space-y-4">
                    <button 
                        onClick={handleNext} 
                        disabled={!priority.trim()}
                        className={`w-full py-6 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-2xl text-xl ${!priority.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Set Priority
                    </button>
                    <button 
                        onClick={handleNext}
                        className="text-white/30 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                    >
                        Skip for Now
                    </button>
                </div>
            </div>
        )}

        {/* Step 5: Permission */}
        {step === 5 && (
            <div className="space-y-12 animate-fade-in flex flex-col items-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
                    <div className="w-32 h-32 bg-yellow-500 rounded-[2.5rem] flex items-center justify-center text-black shadow-[0_0_60px_rgba(234,179,8,0.6)] relative z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    </div>
                </div>

                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
                        Arm The<br/><span className="text-yellow-500">System</span>
                    </h1>
                    <p className="text-white/60 font-bold text-base leading-relaxed max-w-xs mx-auto">
                        To break the cycle, I need permission to interrupt it.
                    </p>
                </div>
                
                <button 
                    onClick={handlePermissionRequest} 
                    className="w-full py-6 bg-yellow-500 hover:bg-white text-black font-black uppercase tracking-[0.25em] rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.4)] transition-all scale-105 active:scale-95 text-xl animate-pulse-slow"
                >
                    Authorize
                </button>

                <button 
                    onClick={handleSkipPermission} 
                    className="text-white/30 hover:text-white text-xs font-black uppercase tracking-widest transition-colors mt-4"
                >
                    Continue Without Notifications
                </button>
                
                <p className="text-xs text-white/20 font-black uppercase tracking-widest mt-8">
                    Deployment Immediate.
                </p>
            </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default Onboarding;