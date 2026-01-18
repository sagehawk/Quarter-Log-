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

export const INTERVAL_MINUTES = 15;
// export const INTERVAL_MS = INTERVAL_MINUTES * 60 * 1000;
export const INTERVAL_MS = 5000; // Set to 5 seconds per request
