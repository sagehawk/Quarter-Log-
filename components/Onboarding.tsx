
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
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      
      {/* Progress */}
      <div className="absolute top-6 left-0 w-full flex justify-center gap-2 safe-top">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-brand-500' : 'w-2 bg-slate-800'}`} />
        ))}
      </div>

      <div className="max-w-md w-full animate-slide-up mt-8">
        
        {/* Step 1: Goal */}
        {step === 1 && (
            <>
                <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter mb-2">How are you feeling?</h1>
                <p className="text-slate-400 font-bold uppercase tracking-wide text-xs mb-8">We will help you fix this.</p>
                
                <div className="space-y-4">
                    <button onClick={() => handleGoalSelect('FOCUS')} className="w-full bg-slate-900 border border-slate-800 hover:border-brand-500 hover:bg-slate-800 p-6 rounded-2xl transition-all group text-left">
                        <div className="text-brand-400 font-black uppercase tracking-wider text-2xl mb-1 group-hover:text-white">I can't focus</div>
                        <div className="text-slate-400 text-sm font-medium">"I get distracted easily."</div>
                    </button>
                    
                    <button onClick={() => handleGoalSelect('BUSINESS')} className="w-full bg-slate-900 border border-slate-800 hover:border-emerald-500 hover:bg-slate-800 p-6 rounded-2xl transition-all group text-left">
                        <div className="text-emerald-400 font-black uppercase tracking-wider text-2xl mb-1 group-hover:text-white">I'm stuck</div>
                        <div className="text-slate-400 text-sm font-medium">"I'm not making progress."</div>
                    </button>

                    <button onClick={() => handleGoalSelect('LIFE')} className="w-full bg-slate-900 border border-slate-800 hover:border-amber-500 hover:bg-slate-800 p-6 rounded-2xl transition-all group text-left">
                        <div className="text-amber-400 font-black uppercase tracking-wider text-2xl mb-1 group-hover:text-white">I'm tired</div>
                        <div className="text-slate-400 text-sm font-medium">"I feel exhausted."</div>
                    </button>
                </div>
            </>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
            <>
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">When do you work?</h1>
                <p className="text-slate-400 font-bold uppercase tracking-wide text-xs mb-8">The AI only interrupts you during these hours.</p>
                
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 mb-6">
                   {/* Days Selector */}
                   <div className="mb-6">
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-3 text-left">Active Days</label>
                      <div className="flex justify-between gap-1">
                        {days.map((day, idx) => (
                          <button
                            key={idx}
                            onClick={() => toggleDay(idx)}
                            className={`w-10 h-10 rounded-xl text-sm font-black transition-all ${
                              daysOfWeek.includes(idx)
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/50 scale-105'
                                : 'bg-slate-800 text-slate-600 hover:bg-slate-700'
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
                           <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Start Time</label>
                           <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-black/40 text-white font-bold text-xl p-4 rounded-xl border border-white/10 focus:border-brand-500 outline-none" />
                       </div>
                       <div className="flex-1 text-left">
                           <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">End Time</label>
                           <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-black/40 text-white font-bold text-xl p-4 rounded-xl border border-white/10 focus:border-brand-500 outline-none" />
                       </div>
                   </div>
                </div>

                <button onClick={handleNext} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors shadow-lg shadow-white/10">
                    Next Step
                </button>
            </>
        )}

        {/* Step 3: Permissions */}
        {step === 3 && (
            <>
                <div className="w-20 h-20 bg-brand-600/20 rounded-full flex items-center justify-center mx-auto mb-6 text-brand-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                </div>
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">One Condition.</h1>
                <p className="text-slate-400 font-bold uppercase tracking-wide text-xs mb-8 leading-relaxed max-w-xs mx-auto">
                    To hold you accountable, we need permission to send system alerts (Sound & Vibration).
                </p>
                
                <button onClick={handlePermissionRequest} className="w-full py-4 bg-brand-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-900/50 hover:bg-brand-500 transition-colors">
                    Allow Alerts
                </button>
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wide mt-4">
                    Required for the app to function.
                </p>
            </>
        )}

        {/* Step 4: Kickout */}
        {step === 4 && (
            <>
                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400 animate-bounce">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">You're Set.</h1>
                <p className="text-slate-300 font-bold text-sm mb-8 leading-relaxed max-w-xs mx-auto">
                    The audit is active. You can close the app now. We'll see you in 15 minutes.
                </p>
                
                <button onClick={handleFinish} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors">
                    Get To Work
                </button>
            </>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
