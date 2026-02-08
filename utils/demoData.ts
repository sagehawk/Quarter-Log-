import { LogEntry } from '../types';

const WIN_PHRASES = [
  "Deep Work: Strategic Planning",
  "Code Review & Refactoring",
  "Client Meeting: Q3 Roadmap",
  "Workout: High Intensity",
  "Learning: Advanced React Patterns",
  "Project Delivery: Milestone Alpha",
  "Networking Event",
  "Market Research Analysis",
  "UI/UX Design Sprint",
  "Financial Audit",
  "Team Sync: Blocker Resolution",
  "Writing: Blog Post Draft",
  "Meditation & Mindfulness",
  "Deployed Production Fix",
  "Customer Support Resolution"
];

const LOSS_PHRASES = [
  "Distracted by Social Media",
  "Procrastination: YouTube Loop",
  "Unplanned Nap",
  "Loss of Focus: Noise",
  "Gaming Session (Unscheduled)",
  "Endless Scrolling",
  "Missed Deadline",
  "Late Start",
  "Inefficient Meeting",
  "Overwhelmed / Paralysis"
];

export const generateDemoData = (): LogEntry[] => {
  const logs: LogEntry[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const startDate = new Date(currentYear, 0, 1); // Jan 1st
  
  // Helper to add log
  const addLog = (date: Date, type: 'WIN' | 'LOSS') => {
    const phrases = type === 'WIN' ? WIN_PHRASES : LOSS_PHRASES;
    const text = phrases[Math.floor(Math.random() * phrases.length)];
    
    // Randomize time within working hours (9 AM - 6 PM)
    const hour = 9 + Math.floor(Math.random() * 9);
    const minute = Math.floor(Math.random() * 60);
    const logDate = new Date(date);
    logDate.setHours(hour, minute, 0, 0);

    logs.push({
      id: crypto.randomUUID(),
      timestamp: logDate.getTime(),
      text,
      type,
      isFrozenWin: false,
      duration: 15 * 60 * 1000 // 15 mins default
    });
  };

  let currentDate = new Date(startDate);

  while (currentDate <= now) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    let numLogs = 0;
    let winRate = 0;

    // Simulation Logic
    if (isWeekend) {
        // 40% chance of working on weekends
        if (Math.random() > 0.6) {
            numLogs = Math.floor(Math.random() * 4) + 1; // 1-4 logs
            winRate = 0.9; // Mostly wins if working on weekend
        }
    } else {
        // Weekdays: High consistency
        // 90% chance of a "Good Day", 10% "Bad Day"
        if (Math.random() > 0.1) {
            numLogs = Math.floor(Math.random() * 6) + 4; // 4-10 logs
            winRate = 0.85; // High win rate
        } else {
            numLogs = Math.floor(Math.random() * 5) + 2; // 2-7 logs
            winRate = 0.4; // Mixed/Bad day
        }
    }

    for (let i = 0; i < numLogs; i++) {
        const isWin = Math.random() < winRate;
        addLog(currentDate, isWin ? 'WIN' : 'LOSS');
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Ensure today has some impressive data
  const todayStart = new Date();
  todayStart.setHours(9,0,0,0);
  for(let i=0; i<6; i++) {
      addLog(todayStart, 'WIN');
      todayStart.setMinutes(todayStart.getMinutes() + 45); 
  }

  return logs.sort((a, b) => b.timestamp - a.timestamp);
};
