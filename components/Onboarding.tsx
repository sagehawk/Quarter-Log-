import React, { useState } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { UserGoal, ScheduleConfig } from '../types';
import { requestNotificationPermission } from '../utils/notifications';
import { RANKS } from '../utils/rankSystem';

interface OnboardingProps {
  onComplete: (goals: UserGoal[], schedule: ScheduleConfig) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<UserGoal[]>([]);
  
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

  const toggleGoal = (selectedGoal: UserGoal) => {
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    setGoals(prev => {
        if (prev.includes(selectedGoal)) {
            return prev.filter(g => g !== selectedGoal);
        } else {
            return [...prev, selectedGoal];
        }
    });
  };

  const handleConfirmGoals = () => {
      if (goals.length === 0) return;
      try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
      setStep(3);
  };

  const handlePermissionRequest = async () => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    const granted = await requestNotificationPermission();
    if (granted) {
      handleFinish();
    } else {
        alert("If I can't interrupt you, I can't help you win.");
    }
  };

  const handleFinish = () => {
     if (goals.length > 0) {
         try { Haptics.notification({ type: NotificationType.Success }); } catch(e) {}
         onComplete(goals, schedule);
     }
  };

  const calculateTotalBlocks = () => {
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      const endTotal = endH * 60 + endM;
      const duration = endTotal - startTotal;
      return Math.max(0, Math.floor(duration / 15));
  };

  const isSelected = (g: UserGoal) => goals.includes(g);

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center p-6 text-center font-sans text-white overflow-hidden">
      
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#2e3248] via-[#050505] to-[#000000]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIj48ZmlsdGVyIGlkPSJnoiPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjY1IiBudW1PY3RhdmVzPSIzIiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2cpIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] opacity-[0.05] pointer-events-none mix-blend-overlay" />

      {/* Progress Bars */}
      <div className="absolute top-12 left-0 w-full flex justify-center gap-1.5 safe-top z-20 px-10">
        {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all duration-700 ease-out ${i <= step ? 'flex-1 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'flex-1 bg-white/5'}`} />
        ))}
      </div>

      <div className="max-w-md w-full relative z-10 flex flex-col h-full justify-center">
        
        {/* Step 1: The Hook */}
        {step === 1 && (
            <div className="space-y-10 animate-fade-in">
                <div className="space-y-2">
                    <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-[0.8] text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50">
                        Biology<br/>is a<br/><span className="text-yellow-500">Ladder</span>
                    </h1>
                </div>
                
                <div className="space-y-6 text-left px-2">
                    <p className="text-white/60 font-medium text-lg leading-relaxed">
                        Your brain constantly scans for evidence of your status. 
                    </p>
                    <div className="pl-4 border-l-2 border-yellow-500/50 space-y-4">
                        <p className="text-xl font-bold text-white leading-tight">
                            Every time you win, T-levels rise.
                        </p>
                        <p className="text-xl font-bold text-red-500 leading-tight">
                            Every time you lose, they fall.
                        </p>
                    </div>
                    <p className="text-white/60 font-medium text-lg leading-relaxed">
                        We are here to rig the game in your favor.
                    </p>
                </div>
                
                <button onClick={handleNext} className="w-full py-5 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(234,179,8,0.4)] text-lg animate-slide-up">
                    Enter The Arena
                </button>
            </div>
        )}

        {/* Step 2: The Stack */}
        {step === 2 && (
            <div className="space-y-8 animate-fade-in">
                <div className="text-center space-y-2">
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
                        Define Your<br/><span className="text-yellow-500">Protocol</span>
                    </h1>
                    <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px]">Multi-Select Active Battlefields</p>
                </div>
                
                <div className="space-y-3">
                    <button 
                        onClick={() => toggleGoal('FOCUS')} 
                        className={`w-full p-6 rounded-2xl transition-all group text-left active:scale-95 border relative overflow-hidden ${isSelected('FOCUS') ? 'bg-yellow-500/10 border-yellow-500 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                        {isSelected('FOCUS') && <div className="absolute inset-0 bg-yellow-500/5 animate-pulse" />}
                        <div className={`font-black uppercase tracking-widest text-xl mb-1 italic ${isSelected('FOCUS') ? 'text-yellow-500' : 'text-white/60'}`}>COGNITIVE DRIVE</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">"End the distraction spiral."</div>
                    </button>
                    
                    <button 
                        onClick={() => toggleGoal('BUSINESS')} 
                        className={`w-full p-6 rounded-2xl transition-all group text-left active:scale-95 border relative overflow-hidden ${isSelected('BUSINESS') ? 'bg-yellow-500/10 border-yellow-500 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                        {isSelected('BUSINESS') && <div className="absolute inset-0 bg-yellow-500/5 animate-pulse" />}
                        <div className={`font-black uppercase tracking-widest text-xl mb-1 italic ${isSelected('BUSINESS') ? 'text-yellow-500' : 'text-white/60'}`}>CEO DOMINANCE</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">"Eliminate low-status tasks."</div>
                    </button>

                    <button 
                        onClick={() => toggleGoal('LIFE')} 
                        className={`w-full p-6 rounded-2xl transition-all group text-left active:scale-95 border relative overflow-hidden ${isSelected('LIFE') ? 'bg-yellow-500/10 border-yellow-500 text-white' : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'}`}
                    >
                        {isSelected('LIFE') && <div className="absolute inset-0 bg-yellow-500/5 animate-pulse" />}
                        <div className={`font-black uppercase tracking-widest text-xl mb-1 italic ${isSelected('LIFE') ? 'text-yellow-500' : 'text-white/60'}`}>SOCIAL MOMENTUM</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest opacity-60">"Kill social anxiety."</div>
                    </button>
                </div>

                <button 
                    onClick={handleConfirmGoals} 
                    disabled={goals.length === 0}
                    className={`w-full py-5 font-black uppercase tracking-[0.2em] rounded-xl transition-all text-lg ${goals.length > 0 ? 'bg-white text-black hover:bg-yellow-500 shadow-[0_0_30px_rgba(255,255,255,0.2)]' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
                >
                    Confirm Protocol
                </button>
            </div>
        )}

        {/* Step 3: The Rank System */}
        {step === 3 && (
            <div className="space-y-6 animate-fade-in">
                <div className="text-center">
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter leading-none mb-4">
                        Your Starting<br/><span className="text-slate-400">Rank</span>
                    </h1>
                    
                    <div className="relative inline-flex items-center justify-center p-6 mb-4">
                        <div className="absolute inset-0 bg-slate-500/10 blur-2xl rounded-full animate-pulse" />
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-24 h-24 text-slate-400 drop-shadow-2xl">
                            <path d={RANKS[0].icon} />
                        </svg>
                    </div>
                    
                    <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{RANKS[0].name}</h2>
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest max-w-xs mx-auto">
                        0 Wins Recorded. Status: Unproven.
                    </p>
                </div>

                <div className="bg-white/5 p-5 rounded-2xl text-left border border-white/10 relative overflow-hidden">
                    <div className="relative z-10 space-y-3">
                        <p className="text-white/80 font-bold text-xs leading-relaxed">
                            Every 15 minutes, you will receive a tactical query.
                        </p>
                        <div className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                            <span className="text-yellow-500 font-black text-lg italic">WIN</span>
                            <span className="text-white/20 text-[10px] font-mono">VS</span>
                            <span className="text-red-500 font-black text-lg italic">LOSS</span>
                        </div>
                        <p className="text-white/50 text-[10px] font-medium leading-relaxed">
                            Log wins to climb the hierarchy. Log losses and you will freeze.
                        </p>
                    </div>
                </div>
                
                <button onClick={handleNext} className="w-full py-5 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-2xl text-lg">
                    Accept Conditions
                </button>
            </div>
        )}

        {/* Step 4: Sync Your Cycle */}
        {step === 4 && (
            <div className="space-y-10 animate-fade-in">
                <div className="text-center space-y-2">
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
                        Sync Your<br/><span className="text-yellow-500">Cycle</span>
                    </h1>
                    <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px]">Define Operational Window</p>
                </div>

                <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-8">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-white/40 block text-left">Start Ops</label>
                        <input 
                            type="time" 
                            value={schedule.startTime}
                            onChange={(e) => setSchedule({...schedule, startTime: e.target.value})}
                            className="w-full bg-black/50 text-white font-black text-3xl p-4 rounded-xl border border-white/10 focus:border-yellow-500 outline-none transition-all text-center"
                        />
                    </div>
                    
                    <div className="flex justify-center">
                        <div className="h-8 w-0.5 bg-white/10" />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-white/40 block text-left">End Ops</label>
                        <input 
                            type="time" 
                            value={schedule.endTime}
                            onChange={(e) => setSchedule({...schedule, endTime: e.target.value})}
                            className="w-full bg-black/50 text-white font-black text-3xl p-4 rounded-xl border border-white/10 focus:border-yellow-500 outline-none transition-all text-center"
                        />
                    </div>

                    {/* Total Opportunities Display */}
                    <div className="pt-2 text-center">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">Daily Capacity</p>
                        <div className="text-2xl font-black text-white italic tracking-tighter">
                            {calculateTotalBlocks()} <span className="text-sm text-yellow-500">Wins Possible</span>
                        </div>
                    </div>
                </div>

                <button onClick={handleNext} className="w-full py-5 bg-white hover:bg-yellow-500 text-black font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-2xl text-lg">
                    Confirm Schedule
                </button>
            </div>
        )}

        {/* Step 5: The Weapon (Permission) */}
        {step === 5 && (
            <div className="space-y-12 animate-fade-in flex flex-col items-center">
                <div className="relative">
                    <div className="absolute inset-0 bg-yellow-500/20 blur-3xl rounded-full animate-pulse" />
                    <div className="w-28 h-28 bg-yellow-500 rounded-[2.5rem] flex items-center justify-center text-black shadow-[0_0_60px_rgba(234,179,8,0.6)] relative z-10">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    </div>
                </div>

                <div className="text-center space-y-4">
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">
                        Arm The<br/><span className="text-yellow-500">System</span>
                    </h1>
                    <p className="text-white/60 font-bold text-sm leading-relaxed max-w-xs mx-auto">
                        To break the cycle, I need permission to interrupt it.
                    </p>
                </div>
                
                <button 
                    onClick={handlePermissionRequest} 
                    className="w-full py-6 bg-yellow-500 hover:bg-white text-black font-black uppercase tracking-[0.25em] rounded-2xl shadow-[0_0_40px_rgba(234,179,8,0.4)] transition-all scale-105 active:scale-95 text-lg animate-pulse-slow"
                >
                    Authorize
                </button>
                
                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest">
                    Deployment Immediate.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;