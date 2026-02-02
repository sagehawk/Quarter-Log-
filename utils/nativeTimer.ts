import { registerPlugin } from '@capacitor/core';

export interface TimerPlugin {
  start(options: { duration: number, totalCycles: number, cyclesLeft: number }): Promise<void>;
  stop(): Promise<void>;
}

const Timer = registerPlugin<TimerPlugin>('TimerPlugin');

export default Timer;