
export interface Rank {
  name: string;
  threshold: number;
  icon: string; // SVG path or Emoji for now, let's use Lucide-like SVG paths for "cool" geometric look
  color: string;
}

export const RANKS: Rank[] = [
  { name: "INITIATE", threshold: 0, icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5", color: "text-slate-400" }, // Stacked Layers
  { name: "SCOUT", threshold: 10, icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", color: "text-cyan-400" }, // Shield
  { name: "VANGUARD", threshold: 25, icon: "M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.78 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.78", color: "text-emerald-400" }, // Star/Badge
  { name: "OPERATIVE", threshold: 50, icon: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6m12 0h1.5a2.5 2.5 0 0 1 0 5H18M2 22h20M6 5h12l-2 17H8L6 5z", color: "text-violet-400" }, // Trophy/Cup vibe
  { name: "COMMANDER", threshold: 100, icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z", color: "text-amber-400" }, // Star
  { name: "WARLORD", threshold: 250, icon: "M5 3v4M19 3v4M5 21v-4M19 21v-4M12 8L8 12l4 4 4-4-4-4zM2 12h2M20 12h2", color: "text-red-500" }, // Crosshair/Target
  { name: "TITAN", threshold: 500, icon: "M12 2L2 22h20L12 2zm0 4l6.5 13H5.5L12 6z", color: "text-fuchsia-500" }, // Pyramid/Apex
  { name: "APEX", threshold: 1000, icon: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z", color: "text-yellow-300" } // Sun/God
];

export const getRankProgress = (totalWins: number) => {
  let currentRankIndex = 0;
  
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (totalWins >= RANKS[i].threshold) {
      currentRankIndex = i;
      break;
    }
  }

  const currentRank = RANKS[currentRankIndex];
  const nextRank = RANKS[currentRankIndex + 1] || null;

  let progress = 0;
  let winsToNext = 0;

  if (nextRank) {
    const range = nextRank.threshold - currentRank.threshold;
    const gained = totalWins - currentRank.threshold;
    progress = Math.min(100, Math.max(0, (gained / range) * 100));
    winsToNext = nextRank.threshold - totalWins;
  } else {
    progress = 100; // Max level
  }

  return {
    currentRank,
    nextRank,
    progress,
    winsToNext
  };
};
