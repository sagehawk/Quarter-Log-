
export interface Rank {
  name: string;
  icon: string; 
  color: string;
}

export const RANKS: Rank[] = [
  { name: "INTERN", icon: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", color: "text-zinc-500" }, 
  { name: "ASSOCIATE", icon: "M20 7h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v3H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V9c0-1.1-.9-2-2-2zM10 4h4v3h-4V4z", color: "text-blue-400" }, 
  { name: "PRODUCER", icon: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z", color: "text-emerald-400" }, 
  { name: "DIRECTOR", icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", color: "text-cyan-400" }, 
  { name: "EXECUTIVE", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4", color: "text-indigo-400" }, 
  { name: "CEO", icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", color: "text-amber-400" }, 
  { name: "TYCOON", icon: "M6 9l6-7 6 7-6 13-6-13z", color: "text-fuchsia-500" }, 
  { name: "MONARCH", icon: "M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14", color: "text-yellow-500" } 
];

const RANK_THRESHOLDS: Record<string, number[]> = {
    'D': [0, 4, 8, 12, 16, 24, 32, 40],
    'W': [0, 20, 40, 60, 80, 120, 160, 200],
    'M': [0, 80, 160, 240, 320, 480, 640, 800],
    '3M': [0, 240, 480, 720, 960, 1440, 1920, 2400],
    'Y': [0, 960, 1920, 2880, 3840, 5760, 7680, 9600],
    'LIFETIME': [0, 10, 25, 50, 100, 250, 500, 1000]
};

export const getThresholdsForPeriod = (period: string) => {
    // Map UI filter keys to internal keys if needed, or just standardise
    // The app uses 'D', 'W', 'M', '3M', 'Y'. Lifetime is internal.
    return RANK_THRESHOLDS[period] || RANK_THRESHOLDS['D'];
};

export const getRankProgress = (totalWins: number, period: string = 'LIFETIME') => {
  const thresholds = getThresholdsForPeriod(period);
  let currentRankIndex = 0;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalWins >= thresholds[i]) {
      currentRankIndex = i;
      break;
    }
  }
  const currentRank = RANKS[currentRankIndex];
  const nextRank = RANKS[currentRankIndex + 1] || null;
  const currentThreshold = thresholds[currentRankIndex];
  const nextThreshold = nextRank ? thresholds[currentRankIndex + 1] : 0;

  let progress = 0;
  let winsToNext = 0;
  if (nextRank) {
    const range = nextThreshold - currentThreshold;
    const gained = totalWins - currentThreshold;
    progress = Math.min(100, Math.max(0, (gained / range) * 100));
    winsToNext = nextThreshold - totalWins;
  } else {
    progress = 100;
  }
  return { currentRank, nextRank, progress, winsToNext };
};

export const getDailyRank = (dailyWins: number) => {
    return getRankForPeriod(dailyWins, 'D');
};

export const getRankForPeriod = (wins: number, period: string) => {
    const thresholds = getThresholdsForPeriod(period);
    let rankIndex = 0;
    for (let i = thresholds.length - 1; i >= 0; i--) {
        if (wins >= thresholds[i]) {
            rankIndex = i;
            break;
        }
    }
    return RANKS[rankIndex];
};
