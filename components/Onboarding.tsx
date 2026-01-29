
import React, { useState } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { UserGoal, ScheduleConfig } from '../types';
import { requestNotificationPermission } from '../utils/notifications';

interface OnboardingProps {
  onComplete: (goal: UserGoal, schedule: ScheduleConfig) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<UserGoal | null>(null);
  
  // Schedule State
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri default

  const handleNext = () => {
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    setStep(prev => prev + 1);
  };

  const handleGoalSelect = (selectedGoal: UserGoal) => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    setGoal(selectedGoal);
    setTimeout(() => setStep(2), 200);
  };

  const toggleDay = (dayIndex: number) => {
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    setDaysOfWeek(prev => {
      if (prev.includes(dayIndex)) {
        // Don't allow removing the last day
        if (prev.length === 1) return prev;
        return prev.filter(d => d !== dayIndex);
      }
      return [...prev, dayIndex].sort();
    });
  };

  const handlePermissionRequest = async () => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    const granted = await requestNotificationPermission();
    if (granted) {
      setTimeout(() => setStep(4), 500);
    } else {
        alert("Notifications are required for the audit to work.");
    }
  };

  const handleFinish = () => {
     if (goal) {
         try { Haptics.notification({ type: NotificationType.Success }); } catch(e) {}
         onComplete(goal, {
             enabled: true,
             startTime,
             endTime,
             daysOfWeek
         });
     }
  };

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-radial-at-tr from-yellow-500/5 to-black" />

      {/* Progress */}
      <div className="absolute top-12 left-0 w-full flex justify-center gap-2 safe-top">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= step ? 'w-10 bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' : 'w-2 bg-white/5'}`} />
        ))}
      </div>

      <div className="max-w-md w-full animate-slide-up mt-8 relative z-10">
        
        {/* Step 1: Goal */}
        {step === 1 && (
            <>
                <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-4 leading-none">Declare Your<br /><span className="text-yellow-500">Mission</span></h1>
                <p className="text-white/30 font-black uppercase tracking-[0.3em] text-[10px] mb-12 italic">The Cornerman needs to know your stakes.</p>
                
                <div className="space-y-4">
                    <button onClick={() => handleGoalSelect('FOCUS')} className="w-full bg-white/5 border border-white/5 hover:border-yellow-500/40 hover:bg-white/10 p-6 rounded-[2rem] transition-all group text-left">
                        <div className="text-yellow-500 font-black uppercase tracking-widest text-xl mb-1 italic group-hover:text-white">CONQUER DRIFT</div>
                        <div className="text-white/40 text-[10px] font-black uppercase tracking-widest italic">"I am bleeding time to distractions."</div>
                    </button>
                    
                    <button onClick={() => handleGoalSelect('BUSINESS')} className="w-full bg-white/5 border border-white/5 hover:border-yellow-500/40 hover:bg-white/10 p-6 rounded-[2rem] transition-all group text-left">
                        <div className="text-yellow-500 font-black uppercase tracking-widest text-xl mb-1 italic group-hover:text-white">SCALE DOMINANCE</div>
                        <div className="text-white/40 text-[10px] font-black uppercase tracking-widest italic">"I am not making high-status progress."</div>
                    </button>

                    <button onClick={() => handleGoalSelect('LIFE')} className="w-full bg-white/5 border border-white/5 hover:border-yellow-500/40 hover:bg-white/10 p-6 rounded-[2rem] transition-all group text-left">
                        <div className="text-yellow-500 font-black uppercase tracking-widest text-xl mb-1 italic group-hover:text-white">PROTECT MOMENTUM</div>
                        <div className="text-white/40 text-[10px] font-black uppercase tracking-widest italic">"I am exhausted and losing my edge."</div>
                    </button>
                </div>
            </>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
            <>
                <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">Operational Window</h1>
                <p className="text-white/30 font-black uppercase tracking-[0.2em] text-[10px] mb-12 italic">Define the hours where winning counts.</p>
                
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 mb-8 shadow-2xl">
                   {/* Days Selector */}
                   <div className="mb-8">
                      <label className="text-[9px] font-black uppercase text-white/20 block mb-4 text-left italic tracking-[0.3em]">Active Battlegrounds</label>
                      <div className="flex justify-between gap-1.5">
                        {days.map((day, idx) => (
                          <button
                            key={idx}
                            onClick={() => toggleDay(idx)}
                            className={`w-10 h-10 rounded-xl text-xs font-black transition-all duration-300 ${
                              daysOfWeek.includes(idx)
                                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20 scale-110'
                                : 'bg-white/5 text-white/20 hover:bg-white/10'
                            }`}
                          >
                            {day}
                          </button>
                        ))}
                      </div>
                   </div>

                   {/* Time Selector */}
                   <div className="flex gap-4">
                       <div className="flex-1 text-left">
                           <label className="text-[9px] font-black uppercase text-white/20 block mb-3 italic tracking-[0.3em]">START OPS</label>
                           <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-black/40 text-white font-black text-xl p-4 rounded-xl border border-white/10 focus:border-yellow-500 outline-none transition-all" />
                       </div>
                       <div className="flex-1 text-left">
                           <label className="text-[9px] font-black uppercase text-white/20 block mb-3 italic tracking-[0.3em]">END OPS</label>
                           <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-black/40 text-white font-black text-xl p-4 rounded-xl border border-white/10 focus:border-yellow-500 outline-none transition-all" />
                       </div>
                   </div>
                </div>

                <button onClick={handleNext} className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-yellow-500 transition-all shadow-2xl italic text-lg">
                    Confirm Schedule
                </button>
            </>
        )}

        {/* Step 3: Permissions */}
        {step === 3 && (
            <>
                <div className="w-24 h-24 bg-yellow-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-yellow-500 border border-yellow-500/20 shadow-2xl">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                </div>
                <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-4">Comms Authorization</h1>
                <p className="text-white/30 font-black uppercase tracking-[0.2em] text-[10px] mb-12 italic leading-relaxed max-w-xs mx-auto">
                    The Cornerman requires high-priority access to alert you for tactical decisions.
                </p>
                
                <button onClick={handlePermissionRequest} className="w-full py-5 bg-yellow-500 text-black font-black uppercase tracking-[0.3em] rounded-2xl shadow-2xl shadow-yellow-500/20 hover:bg-yellow-400 transition-all italic text-lg">
                    Authorize Alerts
                </button>
                
                <div className="mt-12 bg-white/5 border border-white/5 p-6 rounded-[2rem] text-left">
                    <p className="text-[9px] text-white/20 font-black uppercase tracking-[0.3em] mb-3 italic">Operational Reliability</p>
                    <p className="text-[10px] text-white/40 font-black uppercase tracking-widest leading-relaxed italic">
                        Critical: Set battery optimization to <span className="text-white">Unrestricted</span> to prevent cycle failure.
                    </p>
                </div>
            </>
        )}

        {/* Step 4: Kickout */}
        {step === 4 && (
            <>
                <div className="w-24 h-24 bg-yellow-500/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-yellow-500 border border-yellow-500/20 shadow-2xl animate-pulse">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <h1 className="text-5xl font-black text-white italic uppercase tracking-tighter mb-4 leading-none">System<br /><span className="text-yellow-500">Primed</span></h1>
                <p className="text-white/30 font-black uppercase tracking-[0.2em] text-[10px] mb-12 italic leading-relaxed max-w-xs mx-auto">
                    The cycle is active. Momentum starts now.
                </p>
                
                <button onClick={handleFinish} className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.3em] rounded-2xl hover:bg-yellow-500 transition-all italic text-lg">
                    Begin Mission
                </button>
            </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
