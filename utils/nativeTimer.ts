import { registerPlugin } from '@capacitor/core';

export interface TimerPlugin {
  start(options: { duration: number, totalCycles: number, cyclesLeft: number }): Promise<void>;
  stop(): Promise<void>;
  checkPendingLog(): Promise<{ input: string, type: 'WIN' | 'LOSS', activeEndTime?: number, cyclesLeft?: number } | undefined>;
  scheduleDailyStart(options: { hour: number, minute: number, duration: number, totalCycles: number }): Promise<void>;
  cancelDailyStart(): Promise<void>;
}

const Timer = registerPlugin<TimerPlugin>('TimerPlugin');

export default Timer;