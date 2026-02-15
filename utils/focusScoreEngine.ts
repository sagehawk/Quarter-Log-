import { LogEntry, ScheduleConfig } from '../types';

export interface ScoreBreakdown {
    winRate: number;
    makerRatio: number;
    consistency: number;
    streakBonus: number;
    total: number;
}

export interface DayScore {
    date: string;
    score: number;
    breakdown?: ScoreBreakdown;
}

export const calculateFocusScore = (
    dailyLogs: LogEntry[],
    currentStreak: number,
    schedule?: ScheduleConfig
): { score: number; breakdown: ScoreBreakdown } => {
    // 1. Win Rate (Max 40 pts)
    const wins = dailyLogs.filter(l => l.type === 'WIN').length;
    const losses = dailyLogs.filter(l => l.type === 'LOSS').length;
    const total = wins + losses;
    const winRate = total > 0 ? wins / total : 0;
    const winScore = Math.round(winRate * 40);

    // 2. Maker Ratio (Max 25 pts)
    const makerCategories = ['MAKER', 'R&D', 'LEARNING']; // Adjust based on your categories
    const makerLogs = dailyLogs.filter(l => makerCategories.includes((l.category || '').toUpperCase()));
    const makerRatio = total > 0 ? makerLogs.length / total : 0;
    const makerScore = Math.round(makerRatio * 25);

    // 3. Consistency/Volume (Max 20 pts)
    // Target: 8 blocks (2 hours) for max points? Or based on schedule duration?
    // Let's assume 16 blocks (4 hours) is "full day" equivalent for now, or just use raw count.
    // Logic: 1.25 pts per log, max 20 (16 logs = 4 hours)
    const consistencyScore = Math.min(20, Math.round(total * 1.25));

    // 4. Streak Bonus (Max 15 pts)
    // 1 pt per day of streak, max 15
    const streakScore = Math.min(15, currentStreak);

    const totalScore = winScore + makerScore + consistencyScore + streakScore;

    return {
        score: totalScore,
        breakdown: {
            winRate: winScore,
            makerRatio: makerScore,
            consistency: consistencyScore,
            streakBonus: streakScore,
            total: totalScore
        }
    };
};

export const calculateHistoricalScores = (
    allLogs: LogEntry[],
    days: number = 14
): DayScore[] => {
    const scores: DayScore[] = [];
    const now = new Date();

    // Create map of logs by date
    const logsByDate: Record<string, LogEntry[]> = {};
    allLogs.forEach(l => {
        const dateKey = new Date(l.timestamp).toDateString();
        if (!logsByDate[dateKey]) logsByDate[dateKey] = [];
        logsByDate[dateKey].push(l);
    });

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const dateKey = d.toDateString();
        const dayLogs = logsByDate[dateKey] || [];

        // Approximate streak for history? 
        // For now, assume 0 or just calculate raw score without streak bonus for history to keep it simple,
        // or we'd need to recalculate streak for every day which is expensive.
        // Let's use a simplified score for history.

        // Simple calc for history:
        const { score } = calculateFocusScore(dayLogs, 0); // treating streak as 0 for history for now

        scores.push({
            date: dateKey,
            score: score
        });
    }

    return scores;
};
