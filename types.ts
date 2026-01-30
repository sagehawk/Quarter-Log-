
export interface LogEntry {
  id: string;
  timestamp: number; // Date.now()
  text: string;
  type?: 'WIN' | 'LOSS';
  isFrozenWin?: boolean;
}

export interface FreezeState {
  isFrozen: boolean;
  recoveryWins: number;
  lastLossTimestamp: number | null;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  WAITING_FOR_INPUT = 'WAITING_FOR_INPUT',
}

export interface ScheduleConfig {
  enabled: boolean;
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
}

export type UserGoal = 'FOCUS' | 'BUSINESS' | 'LIFE';

export type AIPersona = 'TOUGH' | 'LOGIC' | 'KIND';

export interface AIReport {
  id: string;
  dateKey: string; // e.g., "D_2023-10-25" or "W_2023-W42"
  content: string;
  summary: string; // Brief version for notifications/previews
  timestamp: number;
  period: string;
  logCount: number; // NEW: Tracks log count at generation time
  read?: boolean; // Tracks if the user has opened/seen this report
}

export const DEFAULT_INTERVAL_MINUTES = 15;
export const DEFAULT_INTERVAL_MS = DEFAULT_INTERVAL_MINUTES * 60 * 1000;
