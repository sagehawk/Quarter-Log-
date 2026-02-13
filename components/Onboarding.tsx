import React, { useState } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { UserGoal, ScheduleConfig } from '../types';
import { requestNotificationPermission } from '../utils/notifications';

interface OnboardingProps {
  onComplete: (goals: UserGoal[], schedule: ScheduleConfig, priority?: string, startChallenge?: boolean, startWithWin?: boolean) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [initials, setInitials] = useState("");
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  
  const [schedule, setSchedule] = useState<ScheduleConfig>({
      enabled: true,
      startTime: '09:00',
      endTime: '17:00',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
  });

  const handleNext = () => {
    try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
    setStep(prev => prev + 1);
  };

  const handleSealContract = async () => {
      try { Haptics.impact({ style: ImpactStyle.Heavy }); } catch(e) {}
      setStep(4);
      // Trigger permission request seamlessly if possible, or wait for final confirm
      // For now, we just move to the "Instant Win" screen
  };

  const handleFinalize = async () => {
      try { Haptics.notification({ type: NotificationType.Success }); } catch(e) {}
      
      // Request Permission as part of "Entering"
      const granted = await requestNotificationPermission();
      
      // Complete Onboarding with "Win" flag
      onComplete(['BUSINESS'], schedule, "WIN THE DAY", true, true);
  };

  const calculateTotalBlocks = () => {
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);
      const startTotal = startH * 60 + startM;
      let endTotal = endH * 60 + endM;
      if (endTotal < startTotal) endTotal += 1440;
      const duration = endTotal - startTotal;
      return Math.max(0, Math.floor(duration / 15));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black overflow-hidden flex flex-col items-center justify-center font-sans text-white">
      
      {/* Background Texture */}
      <div className="fixed inset-0 -z-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20 pointer-events-none" />

      {/* Screen 1: The Identity Frame */}
      {step === 1 && (
        <div className="w-full max-w-md px-8 text-center space-y-12 animate-fade-in">
             <div className="space-y-4">
                <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-none text-white drop-shadow-2xl">
                    MOST PEOPLE<br/><span className="text-zinc-500">DRIFT.</span>
                </h1>
                <p className="text-white/60 font-bold text-lg leading-relaxed max-w-xs mx-auto">
                    You downloaded this because you refuse to be most people.
                </p>
             </div>

             <button 
                onClick={handleNext}
                className="w-full py-6 bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-[0.25em] rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all scale-100 active:scale-95 text-xl"
             >
                I AM READY
             </button>
        </div>
      )}

      {/* Screen 2: The Lazy Setup */}
      {step === 2 && (
        <div className="w-full max-w-md px-8 text-center space-y-10 animate-slide-up">
            <div className="space-y-2">
                <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none text-white">
                    WE SET YOUR<br/><span className="text-green-500">BATTLE RHYTHM.</span>
                </h1>
            </div>

            <div className="bg-zinc-900/50 p-8 rounded-3xl border border-white/10 space-y-6">
                {!isEditingSchedule ? (
                    <div className="space-y-2">
                         <div className="text-4xl font-black text-white font-mono tracking-tight">
                            {schedule.startTime} - {schedule.endTime}
                         </div>
                         <div className="text-green-500 font-bold uppercase tracking-widest text-sm">
                            {calculateTotalBlocks()} CYCLES / DAY
                         </div>
                    </div>
                ) : (
                    <div className="space-y-4 animate-fade-in">
                        <div className="flex gap-4">
                            <input 
                                type="time" 
                                value={schedule.startTime}
                                onChange={(e) => setSchedule({...schedule, startTime: e.target.value})}
                                className="flex-1 bg-black/50 text-white font-bold p-4 rounded-xl border border-white/10 focus:border-green-500 outline-none text-center"
                            />
                            <input 
                                type="time" 
                                value={schedule.endTime}
                                onChange={(e) => setSchedule({...schedule, endTime: e.target.value})}
                                className="flex-1 bg-black/50 text-white font-bold p-4 rounded-xl border border-white/10 focus:border-green-500 outline-none text-center"
                            />
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <button 
                    onClick={handleNext}
                    className="w-full py-6 bg-green-500 hover:bg-green-400 text-black font-black uppercase tracking-[0.25em] rounded-2xl shadow-[0_0_40px_rgba(34,197,94,0.4)] transition-all scale-100 active:scale-95 text-xl animate-pulse-slow"
                >
                    CONFIRM
                </button>
                <button 
                    onClick={() => setIsEditingSchedule(!isEditingSchedule)}
                    className="text-white/30 hover:text-white text-xs font-black uppercase tracking-widest transition-colors"
                >
                    {isEditingSchedule ? 'Use Defaults' : 'Edit Times'}
                </button>
            </div>
        </div>
      )}

      {/* Screen 3: The Contract */}
      {step === 3 && (
        <div className="w-full max-w-md px-8 text-center space-y-8 animate-slide-up">
            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none text-white">
                THE<br/><span className="text-white/50">AGREEMENT.</span>
            </h1>

            <div className="bg-white text-black p-8 rounded-xl shadow-2xl rotate-1 transform transition-transform hover:rotate-0 duration-500">
                <div className="border-2 border-black p-6 space-y-6">
                    <h3 className="font-black uppercase tracking-widest text-2xl border-b-2 border-black pb-4">
                        OFFICIAL PROTOCOL
                    </h3>
                    <p className="font-serif italic text-lg leading-relaxed text-left">
                        "I agree to grade myself honestly every 15 minutes. No excuses. No negotiation."
                    </p>
                    <div className="pt-4">
                        <input 
                            type="text" 
                            placeholder="Sign Initials" 
                            value={initials}
                            onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0, 3))}
                            className="w-full bg-zinc-100 font-serif italic text-4xl p-4 border-b-2 border-black outline-none placeholder:text-black/20 text-center uppercase"
                            autoFocus
                        />
                    </div>
                </div>
            </div>

            <button 
                onClick={handleSealContract}
                disabled={!initials}
                className={`w-full py-6 bg-white hover:bg-zinc-200 text-black font-black uppercase tracking-[0.25em] rounded-2xl shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all scale-100 active:scale-95 text-xl ${!initials ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
                SEAL IT
            </button>
        </div>
      )}

      {/* Screen 4: The Instant Win */}
      {step === 4 && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-green-500 animate-flash-green relative overflow-hidden">
            {/* Confetti / Particle Effect Placeholder */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjMDAwIiBmaWxsLW9wYWNpdHk9IjAuMSIvPjwvc3ZnPg==')] opacity-20 pointer-events-none" />
            
            <div className="relative z-10 text-center space-y-8 px-8 animate-scale-up-bounce">
                <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center mx-auto shadow-2xl mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>

                <div className="space-y-2">
                    <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none text-black">
                        PROTOCOL<br/>INITIATED.
                    </h1>
                    <p className="text-black/60 font-black uppercase tracking-widest text-sm">
                        FIRST VICTORY RECORDED
                    </p>
                </div>

                <div className="bg-black/10 p-6 rounded-2xl border-2 border-black/10 inline-block">
                    <div className="text-6xl font-black text-black font-mono tracking-tighter">
                        1
                    </div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-black/50 mt-2">
                        WIN STREAK
                    </div>
                </div>
            </div>

            <div className="absolute bottom-12 w-full px-8 animate-fade-in delay-1000">
                <button 
                    onClick={handleFinalize}
                    className="w-full py-6 bg-black text-white hover:bg-zinc-900 font-black uppercase tracking-[0.25em] rounded-2xl shadow-2xl transition-all scale-100 active:scale-95 text-xl"
                >
                    ENTER ARENA
                </button>
                <p className="text-black/40 text-[10px] font-black uppercase tracking-widest text-center mt-4">
                    Tap to enable systems & begin
                </p>
            </div>
        </div>
      )}

    </div>
  );
};

export default Onboarding;