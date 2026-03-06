export type AIPersona = 'LOGIC' | 'AGGRESSIVE' | 'STOIC' | 'HYPE' | 'STRATEGIST';

export type AppTheme = 'light' | 'dark';

export type UserGoal = 'FOCUS' | 'BUSINESS' | 'LIFE';

export interface Strategy {
  text: string;
  completed: boolean;
  completedAt?: number; // timestamp when checked off
}

export interface BattlePlan {
  id: string;
  dateKey: string; // "2026-03-06"
  northStar: string;
  victoryCondition: string;
  strategies: Strategy[];
  sacrifice: string;
  createdAt: number;
}

export interface SacrificeLog {
  dateKey: string;
  failCount: number;
  failTimestamps: number[];
}

export interface NotificationConfig {
  morningTime: string; // "08:00"
  eveningTime: string; // "21:00"
  enabled: boolean;
}

export interface ScheduleConfig {
  enabled: boolean;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
}
