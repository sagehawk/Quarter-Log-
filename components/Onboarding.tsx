import React, { useState } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { UserGoal, ScheduleConfig } from '../types';
import { requestNotificationPermission } from '../utils/notifications';

interface OnboardingProps {
  onComplete: (goals: UserGoal[], schedule: ScheduleConfig) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [goals, setGoals] = useState<UserGoal[]>([]);
  
  // Default Schedule - active immediately
  const [schedule] = useState<ScheduleConfig>({
      enabled: true,
      startTime: '00:00', // Default to all day or standard hours, user can tweak later
      endTime: '23:59',
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

  const isSelected = (g: UserGoal) => goals.includes(g);

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-6 text-center animate-fade-in font-sans text-white">
      
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-radial-at-tr from-yellow-600/10 to-black" />

      {/* Progress */}
      <div className="absolute top-12 left-0 w-full flex justify-center gap-2 safe-top z-20">
        {[1, 2, 3, 4].map(i => (
            <div key={i} className={`h-1 rounded-full transition-all duration-500 ${i <= step ? 'w-12 bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.6)]' : 'w-2 bg-white/10'}`} />
        ))}
      </div>

      <div className="max-w-md w-full animate-slide-up mt-8 relative z-10 flex flex-col h-full justify-center">
        
        {/* Step 1: Biological Reality Check */}
        {step === 1 && (
            <div className="space-y-8">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-6 leading-none">
                        Your Brain is a <br/><span className="text-yellow-500">Leaderboard</span>
                    </h1>
                    <div className="space-y-6 text-left">
                        <p className="text-white/80 font-bold text-lg leading-relaxed">
                            Testosterone isn't just about muscle. It is the chemical that makes <span className="text-yellow-500">effort feel good</span>.
                        </p>
                        <div className="bg-white/5 border-l-4 border-red-600 p-6 rounded-r-xl">
                            <p className="text-white/60 font-medium text-sm uppercase tracking-wider mb-2 text-red-500 font-black">The Pain</p>
                            <p className="text-white/90 text-sm leading-relaxed font-bold">
                                When you slack off, your brain signals that you are a "loser." Your T-levels can plunge by 40%, forcing you into a downward spiral of anxiety and hesitation.
                            </p>
                        </div>
                        <p className="text-white/80 font-bold text-lg leading-relaxed">
                            We are here to trigger the <span className="text-yellow-500 italic">Testosterone Momentum Effect</span>. Every win raises your level.
                        </p>
                    </div>
                </div>
                
                <button onClick={handleNext} className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-yellow-500 transition-all shadow-2xl italic text-lg mt-8">
                    Accept Reality
                </button>
            </div>
        )}

        {/* Step 2: The Winner vs Loser Switch (The Stack) */}
        {step === 2 && (
            <div className="space-y-6">
                <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-2">
                    Select Your <br/><span className="text-yellow-500">Arena</span>
                </h1>
                <p className="text-white/40 font-black uppercase tracking-[0.2em] text-[10px] mb-6 italic">Stack multiple protocols if you are built for it.</p>
                
                <div className="space-y-3">
                    <button 
                        onClick={() => toggleGoal('FOCUS')} 
                        className={`w-full p-5 rounded-[2rem] transition-all group text-left active:scale-95 border ${isSelected('FOCUS') ? 'bg-yellow-500 border-yellow-400 shadow-lg shadow-yellow-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                    >
                        <div className={`font-black uppercase tracking-widest text-lg mb-1 italic ${isSelected('FOCUS') ? 'text-black' : 'text-yellow-500'}`}>COGNITIVE DRIVE</div>
                        <div className={`text-[9px] font-black uppercase tracking-widest italic ${isSelected('FOCUS') ? 'text-black/60' : 'text-white/40'}`}>"End the distraction spiral."</div>
                    </button>
                    
                    <button 
                        onClick={() => toggleGoal('BUSINESS')} 
                        className={`w-full p-5 rounded-[2rem] transition-all group text-left active:scale-95 border ${isSelected('BUSINESS') ? 'bg-yellow-500 border-yellow-400 shadow-lg shadow-yellow-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                    >
                        <div className={`font-black uppercase tracking-widest text-lg mb-1 italic ${isSelected('BUSINESS') ? 'text-black' : 'text-yellow-500'}`}>CEO DOMINANCE</div>
                        <div className={`text-[9px] font-black uppercase tracking-widest italic ${isSelected('BUSINESS') ? 'text-black/60' : 'text-white/40'}`}>"Eliminate low-status tasks."</div>
                    </button>

                    <button 
                        onClick={() => toggleGoal('LIFE')} 
                        className={`w-full p-5 rounded-[2rem] transition-all group text-left active:scale-95 border ${isSelected('LIFE') ? 'bg-yellow-500 border-yellow-400 shadow-lg shadow-yellow-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
                    >
                        <div className={`font-black uppercase tracking-widest text-lg mb-1 italic ${isSelected('LIFE') ? 'text-black' : 'text-yellow-500'}`}>SOCIAL MOMENTUM</div>
                        <div className={`text-[9px] font-black uppercase tracking-widest italic ${isSelected('LIFE') ? 'text-black/60' : 'text-white/40'}`}>"Kill social anxiety."</div>
                    </button>
                </div>

                <button 
                    onClick={handleConfirmGoals} 
                    disabled={goals.length === 0}
                    className={`w-full py-4 mt-4 font-black uppercase tracking-[0.2em] rounded-2xl transition-all italic text-lg ${goals.length > 0 ? 'bg-white text-black hover:bg-white/90 shadow-2xl' : 'bg-white/10 text-white/20 cursor-not-allowed'}`}
                >
                    Confirm Protocol
                </button>
            </div>
        )}

        {/* Step 3: The 15-Minute Contract */}
        {step === 3 && (
            <div className="space-y-8">
                <div>
                    <div className="w-20 h-20 bg-yellow-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-yellow-500 border border-yellow-500/20 shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    </div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-6">
                        The 15-Minute<br/><span className="text-yellow-500">Contract</span>
                    </h1>
                    <div className="bg-white/5 p-6 rounded-2xl text-left space-y-4 border border-white/10">
                        <p className="text-white/90 font-bold text-sm leading-relaxed">
                            Every 15 minutes, I will ask you one question:
                        </p>
                        <p className="text-2xl font-black text-center py-4 bg-black/40 rounded-xl border border-white/5 italic">
                            <span className="text-yellow-500">WIN</span> <span className="text-white/30 text-sm align-middle px-2">OR</span> <span className="text-red-500">LOSS</span>
                        </p>
                        <p className="text-white/60 text-xs font-medium leading-relaxed">
                            Logging a "Win" physically raises your T-levels. We are forcing your brain to identify as a winner, 4 times an hour.
                        </p>
                    </div>
                </div>
                
                <button onClick={handleNext} className="w-full py-5 bg-white text-black font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-yellow-500 transition-all shadow-2xl italic text-lg">
                    Sign The Contract
                </button>
            </div>
        )}

        {/* Step 4: The Permission */}
        {step === 4 && (
            <div className="space-y-8">
                <div>
                    <div className="w-24 h-24 bg-yellow-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-black shadow-[0_0_50px_rgba(234,179,8,0.4)] animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                    </div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tighter mb-4">
                        The Weapon<br/><span className="text-yellow-500">Request</span>
                    </h1>
                    <p className="text-white/60 font-bold text-sm mb-8 leading-relaxed max-w-xs mx-auto">
                        "To change your chemistry, I need to be able to interrupt your losing streaks. If I can't reach you, I can't help you win."
                    </p>
                </div>
                
                <button onClick={handlePermissionRequest} className="w-full py-5 bg-yellow-500 text-black font-black uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:bg-white transition-all italic text-lg">
                    Grant Access
                </button>
                <p className="text-[9px] text-white/30 font-black uppercase tracking-widest mt-6">
                    We start the first sprint immediately.
                </p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;