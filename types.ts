export interface LogEntry {
  id: string;
  timestamp: number; // Date.now()
  text: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  WAITING_FOR_INPUT = 'WAITING_FOR_INPUT',
}

export const DEFAULT_INTERVAL_MINUTES = 15;
export const DEFAULT_INTERVAL_MS = DEFAULT_INTERVAL_MINUTES * 60 * 1000;
