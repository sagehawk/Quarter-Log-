import React, { useState, useEffect } from 'react';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { UserGoal, ScheduleConfig } from '../types';
import { requestNotificationPermission } from '../utils/notifications';
import TacticalCoachView, { CoachMood } from './TacticalCoachView';

interface OnboardingProps {
  onComplete: (goals: UserGoal[], schedule: ScheduleConfig, priority?: string, startChallenge?: boolean, startWithWin?: boolean) => void;
}

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [scene, setScene] = useState(0);
  const [mood, setMood] = useState<CoachMood>('IDLE');
  const [text, setText] = useState('');
  
  // Data State
  const [schedule, setSchedule] = useState<ScheduleConfig>({
      enabled: true,
      startTime: '09:00',
      endTime: '17:00',
      daysOfWeek: [0, 1, 2, 3, 4, 5, 6]
  });
  const [priority, setPriority] = useState("");
  const [initials, setInitials] = useState("");

  const nextScene = () => {
      try { Haptics.impact({ style: ImpactStyle.Medium }); } catch(e) {}
      setScene(prev => prev + 1);
  };

  useEffect(() => {
      // Scene Director
      switch(scene) {
          case 0:
              setMood('IDLE');
              setText("Welcome, Operator. The signal is clear. The noise is gone.");
              break;
          case 1:
              setMood('ASKING');
              setText("This tool has one purpose: To force you to achieve your goals. Business. Fitness. Skills. Whatever the target.");
              break;
          case 2:
              setMood('PROCESSING');
              setText("How? By tracking 15-minute blocks. Build your 'Streak' by logging wins. If you drift, the Streak resets. Momentum is your currency.");
              break;
          case 3:
              setMood('IDLE');
              setText("Set your Battle Rhythm. When does your operation begin and end?");
              break;
          case 4:
              setMood('ASKING');
              setText("Define the Mission. What is the ONE strategic objective you must secure?");
              break;
          case 5:
              setMood('STOIC'); // Calm request
              setText("I require authorization to interrupt your pattern. It is necessary to break the cycle.");
              break;
          case 6: // Contract
              setMood('LOSS'); // Serious tone
              setText("This is a binding agreement. You grade yourself honestly. Sign to confirm.");
              break;
      }
  }, [scene]);

  const handleFinish = () => {
      try { Haptics.notification({ type: NotificationType.Success }); } catch(e) {}
      onComplete(['BUSINESS'], schedule, priority || "WIN THE DAY", true, false);
  };

  const renderContent = () => {
      switch(scene) {
          case 0: 
            return (
                <button onClick={nextScene} className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all">
                    Initialize System
                </button>
            );
          case 1:
            return (
                <button onClick={nextScene} className="w-full py-4 bg-white/10 border border-white/20 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all">
                    Affirmative. I am drifting.
                </button>
            );
          case 2:
            return (
                <button onClick={nextScene} className="w-full py-4 bg-white/10 border border-white/20 text-white font-black uppercase tracking-widest rounded-xl hover:bg-white/20 transition-all">
                    Understood. Proceed.
                </button>
            );
          case 3:
            return (
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <input 
                            type="time" 
                            value={schedule.startTime}
                            onChange={(e) => setSchedule({...schedule, startTime: e.target.value})}
                            className="flex-1 bg-black/50 text-white font-bold p-4 rounded-xl border border-green-500/30 focus:border-green-500 outline-none text-center"
                        />
                        <input 
                            type="time" 
                            value={schedule.endTime}
                            onChange={(e) => setSchedule({...schedule, endTime: e.target.value})}
                            className="flex-1 bg-black/50 text-white font-bold p-4 rounded-xl border border-green-500/30 focus:border-green-500 outline-none text-center"
                        />
                    </div>
                    <button onClick={nextScene} className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all">
                        Confirm Schedule
                    </button>
                </div>
            );
          case 4:
            return (
                <div className="space-y-4">
                    <textarea 
                        placeholder="e.g. Launch MVP, Close 3 Deals..."
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                        className="w-full bg-black/50 text-white font-bold p-4 rounded-xl border border-green-500/30 focus:border-green-500 outline-none min-h-[100px]"
                    />
                    <button onClick={nextScene} disabled={!priority} className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all disabled:opacity-50">
                        Set Objective
                    </button>
                </div>
            );
          case 5:
             return (
                 <div className="space-y-3">
                     <button onClick={async () => { await requestNotificationPermission(); nextScene(); }} className="w-full py-4 bg-green-500 text-black font-black uppercase tracking-widest rounded-xl hover:bg-white transition-all">
                         Authorize Access
                     </button>
                     <button onClick={nextScene} className="w-full py-3 text-white/40 text-xs font-black uppercase tracking-widest hover:text-white">
                         Continue Without Intel
                     </button>
                 </div>
             );
          case 6:
             return (
                 <div className="space-y-4">
                     <input 
                        type="text" 
                        placeholder="INTLS" 
                        value={initials}
                        onChange={(e) => setInitials(e.target.value.toUpperCase().slice(0,3))}
                        className="w-full bg-black/50 text-white font-serif italic text-4xl p-4 border-b border-green-500 outline-none text-center"
                     />
                     <button onClick={handleFinish} disabled={!initials} className="w-full py-4 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-green-500 transition-all disabled:opacity-50">
                         Seal Contract
                     </button>
                 </div>
             );
          default: return null;
      }
  };

  return (
    <div className="fixed inset-0 z-[200]">
        <TacticalCoachView 
            mood={mood} 
            message={text}
        >
            {renderContent()}
        </TacticalCoachView>
    </div>
  );
};

export default Onboarding;