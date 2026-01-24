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
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [permissionGranted, setPermissionGranted] = useState(false);

  const handleNext = () => {
    try { Haptics.impact({ style: ImpactStyle.Light }); } catch(e) {}
    setStep(prev => prev + 1);
  };

  const handleGoalSelect = (selectedGoal: UserGoal) => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    setGoal(selectedGoal);
    setTimeout(() => setStep(2), 200);
  };

  const handlePermissionRequest = async () => {
    try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
    const granted = await requestNotificationPermission();
    if (granted) {
      setPermissionGranted(true);
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
             daysOfWeek: [1,2,3,4,5] // Default Mon-Fri
         });
     }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-fade-in">
      
      {/* Progress */}
      <div className="absolute top-10 left-0 w-full flex justify-center gap-2">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-brand-500' : 'w-2 bg-slate-800'}`} />
        ))}
      </div>

      <div className="max-w-md w-full animate-slide-up">
        
        {/* Step 1: Goal */}
        {step === 1 && (
            <>
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">What is your enemy?</h1>
                <p className="text-slate-400 font-bold uppercase tracking-wide text-xs mb-8">We will adapt the AI personality to fix this.</p>
                
                <div className="space-y-4">
                    <button onClick={() => handleGoalSelect('FOCUS')} className="w-full bg-slate-900 border border-slate-800 hover:border-brand-500 hover:bg-slate-800 p-6 rounded-2xl transition-all group text-left">
                        <div className="text-brand-400 font-black uppercase tracking-wider text-sm mb-1 group-hover:text-white">Distraction</div>
                        <div className="text-slate-400 text-xs leading-relaxed">I scroll too much. I need a drill sergeant to keep me on task.</div>
                    </button>
                    
                    <button onClick={() => handleGoalSelect('BUSINESS')} className="w-full bg-slate-900 border border-slate-800 hover:border-brand-500 hover:bg-slate-800 p-6 rounded-2xl transition-all group text-left">
                        <div className="text-emerald-400 font-black uppercase tracking-wider text-sm mb-1 group-hover:text-white">Stagnation</div>
                        <div className="text-slate-400 text-xs leading-relaxed">I'm busy but not making money. I need a CEO Audit to check the dollar value of my time.</div>
                    </button>

                    <button onClick={() => handleGoalSelect('LIFE')} className="w-full bg-slate-900 border border-slate-800 hover:border-brand-500 hover:bg-slate-800 p-6 rounded-2xl transition-all group text-left">
                        <div className="text-amber-400 font-black uppercase tracking-wider text-sm mb-1 group-hover:text-white">Overwhelm</div>
                        <div className="text-slate-400 text-xs leading-relaxed">I feel burnt out. I need an Energy Audit to find balance.</div>
                    </button>
                </div>
            </>
        )}

        {/* Step 2: Schedule */}
        {step === 2 && (
            <>
                <h1 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Working Hours?</h1>
                <p className="text-slate-400 font-bold uppercase tracking-wide text-xs mb-8">We will only interrupt you during this window.</p>
                
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 mb-8">
                   <div className="flex gap-4 mb-4">
                       <div className="flex-1 text-left">
                           <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">Start Time</label>
                           <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-black/40 text-white font-bold text-xl p-4 rounded-xl border border-white/10 focus:border-brand-500 outline-none" />
                       </div>
                       <div className="flex-1 text-left">
                           <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">End Time</label>
                           <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-black/40 text-white font-bold text-xl p-4 rounded-xl border border-white/10 focus:border-brand-500 outline-none" />
                       </div>
                   </div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide text-center">Mon - Fri</p>
                </div>

                <button onClick={handleNext} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-colors">
                    Continue
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
                    We are going to interrupt you every 15 minutes. It will be annoying. But it works. We need permission to buzz you.
                </p>
                
                <button onClick={handlePermissionRequest} className="w-full py-4 bg-brand-600 text-white font-black uppercase tracking-widest rounded-xl shadow-lg shadow-brand-900/50 hover:bg-brand-500 transition-colors">
                    Allow Interruptions
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