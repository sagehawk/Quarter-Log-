export type LogCategory = 'DEEP WORK' | 'MEETINGS' | 'RESEARCH' | 'BREAK' | 'EXERCISE' | 'ADMIN' | 'BURN';

export type LogType = 'WIN' | 'LOSS' | 'DRAW';

export interface LogEntry {
  id: string;
  timestamp: number; // Date.now()
  text: string;
  type?: LogType;
  category?: LogCategory;
  isInsuranceWin?: boolean;
  duration?: number; // Duration in ms
  pillarsMatches?: number[]; // Indices of pillars (1-3) matched
  isVerified?: boolean; // True if this log verified a planned block
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

export type AIPersona = 'LOGIC' | 'AGGRESSIVE' | 'STOIC' | 'HYPE' | 'STRATEGIST';

export type AppTheme = 'light' | 'dark';

export type FilterType = 'D' | 'W' | 'M' | '3M' | 'Y';

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

export interface PlannedBlock {
  id: string;
  startTime: string;      // "09:00"
  label: string;           // "Deep work on landing page"
  category: LogCategory;
}

export interface DayPlan {
  dateKey: string;          // "2026-02-15"
  // The Crown / The Dragon
  dragon: string;
  // The Pillars (Strategy) - Max 3
  pillars: string[];
  // The Constraints (Rules)
  constraints: string[];
  // The Logistics (Timeline)
  blocks: PlannedBlock[];
  createdAt: number;
  pillarsCompleted?: boolean[];
  constraintViolated?: boolean;
}
