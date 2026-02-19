import { registerPlugin } from '@capacitor/core';

export interface TimerPlugin {
  start(options: { duration: number, totalCycles: number, cyclesLeft: number }): Promise<void>;
  stop(): Promise<void>;
  checkPendingLog(): Promise<{ input: string, type: 'WIN' | 'LOSS', activeEndTime?: number, cyclesLeft?: number } | undefined>;
  scheduleDailyStart(options: { hour: number, minute: number, duration: number, totalCycles: number }): Promise<void>;
  cancelDailyStart(): Promise<void>;
}

const Timer = registerPlugin<TimerPlugin>('TimerPlugin', {
  web: {
    start: async () => { console.log('TimerPlugin.start called on web'); },
    stop: async () => { console.log('TimerPlugin.stop called on web'); },
    checkPendingLog: async () => { console.log('TimerPlugin.checkPendingLog called on web'); return undefined; },
    scheduleDailyStart: async (options) => { console.log('TimerPlugin.scheduleDailyStart called on web', options); },
    cancelDailyStart: async () => { console.log('TimerPlugin.cancelDailyStart called on web'); }
  }
});

export default Timer;