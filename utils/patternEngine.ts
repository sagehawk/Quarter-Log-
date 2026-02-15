import { LogEntry } from '../types';

// --- Types ---

export interface Insight {
    id: string;
    icon: string;      // emoji
    headline: string;
    detail: string;
    severity: 'info' | 'warning' | 'positive';
    score: number;      // Used to rank insights (higher = more notable)
}

interface HourBucket {
    hour: number;
    wins: number;
    losses: number;
    draws: number;
    total: number;
    winRate: number;
}

interface DayBucket {
    day: number;        // 0=Sun, 6=Sat
    dayName: string;
    wins: number;
    losses: number;
    total: number;
    winRate: number;
}

// --- Constants ---

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MIN_ENTRIES = 20;
const MIN_BUCKET_SIZE = 3; // Minimum entries in a time bucket to be statistically meaningful

// --- Helper ---

const getHour = (ts: number) => new Date(ts).getHours();
const getDay = (ts: number) => new Date(ts).getDay();
const getDateKey = (ts: number) => new Date(ts).toDateString();

// --- Core Analysis Functions ---

/**
 * Detect time-of-day and day-of-week patterns
 */
export const detectTimePatterns = (logs: LogEntry[]): Insight[] => {
    const insights: Insight[] = [];
    if (logs.length < MIN_ENTRIES) return insights;

    // --- Hourly analysis ---
    const hourMap: Record<number, HourBucket> = {};
    logs.forEach(l => {
        const h = getHour(l.timestamp);
        if (!hourMap[h]) hourMap[h] = { hour: h, wins: 0, losses: 0, draws: 0, total: 0, winRate: 0 };
        hourMap[h].total++;
        if (l.type === 'WIN') hourMap[h].wins++;
        else if (l.type === 'LOSS') hourMap[h].losses++;
        else hourMap[h].draws++;
    });

    // Calculate win rates
    Object.values(hourMap).forEach(b => {
        if (b.total > 0) b.winRate = b.wins / b.total;
    });

    // Find best and worst hours (min bucket size)
    const validHours = Object.values(hourMap).filter(b => b.total >= MIN_BUCKET_SIZE);
    if (validHours.length >= 2) {
        const best = validHours.reduce((a, b) => a.winRate > b.winRate ? a : b);
        const worst = validHours.reduce((a, b) => a.winRate < b.winRate ? a : b);

        if (best.winRate - worst.winRate > 0.15) {
            const formatHour = (h: number) => {
                const suffix = h >= 12 ? 'PM' : 'AM';
                const hr = h % 12 || 12;
                return `${hr}${suffix}`;
            };

            insights.push({
                id: 'peak-hour',
                icon: '⏰',
                headline: `Peak performance: ${formatHour(best.hour)}-${formatHour(best.hour + 1)}`,
                detail: `${Math.round(best.winRate * 100)}% win rate (${best.total} entries). Worst: ${formatHour(worst.hour)} at ${Math.round(worst.winRate * 100)}%.`,
                severity: 'positive',
                score: (best.winRate - worst.winRate) * 100
            });
        }
    }

    // --- Day-of-week analysis ---
    const dayMap: Record<number, DayBucket> = {};
    logs.forEach(l => {
        const d = getDay(l.timestamp);
        if (!dayMap[d]) dayMap[d] = { day: d, dayName: DAY_NAMES[d], wins: 0, losses: 0, total: 0, winRate: 0 };
        dayMap[d].total++;
        if (l.type === 'WIN') dayMap[d].wins++;
        else if (l.type === 'LOSS') dayMap[d].losses++;
    });

    Object.values(dayMap).forEach(b => {
        if (b.total > 0) b.winRate = b.wins / b.total;
    });

    const validDays = Object.values(dayMap).filter(b => b.total >= MIN_BUCKET_SIZE);
    if (validDays.length >= 2) {
        const bestDay = validDays.reduce((a, b) => a.winRate > b.winRate ? a : b);
        const worstDay = validDays.reduce((a, b) => a.winRate < b.winRate ? a : b);

        if (bestDay.winRate - worstDay.winRate > 0.15) {
            insights.push({
                id: 'day-pattern',
                icon: '📅',
                headline: `${bestDay.dayName}s are your strongest day`,
                detail: `${Math.round(bestDay.winRate * 100)}% win rate vs ${worstDay.dayName}s at ${Math.round(worstDay.winRate * 100)}%.`,
                severity: bestDay.winRate > 0.7 ? 'positive' : 'info',
                score: (bestDay.winRate - worstDay.winRate) * 80
            });
        }
    }

    return insights;
};

/**
 * Detect category-based patterns and correlations
 */
export const detectCategoryCorrelations = (logs: LogEntry[]): Insight[] => {
    const insights: Insight[] = [];
    if (logs.length < MIN_ENTRIES) return insights;

    // Category win rates
    const catMap: Record<string, { wins: number; losses: number; draws: number; total: number }> = {};
    logs.forEach(l => {
        const cat = l.category || 'OTHER';
        if (!catMap[cat]) catMap[cat] = { wins: 0, losses: 0, draws: 0, total: 0 };
        catMap[cat].total++;
        if (l.type === 'WIN') catMap[cat].wins++;
        else if (l.type === 'LOSS') catMap[cat].losses++;
        else catMap[cat].draws++;
    });

    // Find dominant category
    const sorted = Object.entries(catMap).sort((a, b) => b[1].total - a[1].total);
    if (sorted.length >= 2) {
        const [topCat, topData] = sorted[0];
        const topPct = Math.round((topData.total / logs.length) * 100);
        if (topPct > 40) {
            insights.push({
                id: 'dominant-category',
                icon: '📊',
                headline: `${topPct}% of your time goes to ${topCat}`,
                detail: `${topData.wins} wins, ${topData.losses} losses across ${topData.total} entries.`,
                severity: 'info',
                score: topPct * 0.5
            });
        }
    }

    // Detect BURN clustering
    const burnLogs = logs.filter(l => (l.category || '').toUpperCase() === 'BURN');
    if (burnLogs.length >= 3) {
        // Check if BURN clusters on specific days
        const burnDays: Record<number, number> = {};
        burnLogs.forEach(l => {
            const d = getDay(l.timestamp);
            burnDays[d] = (burnDays[d] || 0) + 1;
        });
        const worstBurnDay = Object.entries(burnDays).sort((a, b) => b[1] - a[1])[0];
        if (worstBurnDay && Number(worstBurnDay[1]) >= 3) {
            insights.push({
                id: 'burn-cluster',
                icon: '🔥',
                headline: `BURN entries cluster on ${DAY_NAMES[Number(worstBurnDay[0])]}s`,
                detail: `${worstBurnDay[1]} wasted blocks on ${DAY_NAMES[Number(worstBurnDay[0])]}s. What's triggering this pattern?`,
                severity: 'warning',
                score: Number(worstBurnDay[1]) * 15
            });
        }
    }

    // Check if FUEL/RECOVERY absence correlates with next-day losses
    const logsByDate: Record<string, LogEntry[]> = {};
    logs.forEach(l => {
        const dk = getDateKey(l.timestamp);
        if (!logsByDate[dk]) logsByDate[dk] = [];
        logsByDate[dk].push(l);
    });

    const dates = Object.keys(logsByDate).sort();
    let daysWithFuel = 0, daysWithoutFuel = 0;
    let nextDayWinRateWithFuel = 0, nextDayWinRateWithoutFuel = 0;

    for (let i = 0; i < dates.length - 1; i++) {
        const todayLogs = logsByDate[dates[i]];
        const tomorrowLogs = logsByDate[dates[i + 1]];
        if (tomorrowLogs.length < 2) continue;

        const hasFuel = todayLogs.some(l => ['FUEL', 'RECOVERY'].includes((l.category || '').toUpperCase()));
        const tomorrowWins = tomorrowLogs.filter(l => l.type === 'WIN').length;
        const tomorrowWR = tomorrowWins / tomorrowLogs.length;

        if (hasFuel) {
            daysWithFuel++;
            nextDayWinRateWithFuel += tomorrowWR;
        } else {
            daysWithoutFuel++;
            nextDayWinRateWithoutFuel += tomorrowWR;
        }
    }

    if (daysWithFuel >= 3 && daysWithoutFuel >= 3) {
        const avgWith = nextDayWinRateWithFuel / daysWithFuel;
        const avgWithout = nextDayWinRateWithoutFuel / daysWithoutFuel;
        const diff = avgWith - avgWithout;

        if (diff > 0.10) {
            insights.push({
                id: 'fuel-correlation',
                icon: '🍎',
                headline: `Self-care boosts next-day wins by ${Math.round(diff * 100)}%`,
                detail: `Days after FUEL/RECOVERY: ${Math.round(avgWith * 100)}% win rate. Without: ${Math.round(avgWithout * 100)}%.`,
                severity: 'positive',
                score: diff * 150
            });
        }
    }

    return insights;
};

/**
 * Detect streak-related patterns
 */
export const detectStreakFactors = (logs: LogEntry[]): Insight[] => {
    const insights: Insight[] = [];
    if (logs.length < MIN_ENTRIES) return insights;

    // Analyze what happens after consecutive losses
    const sorted = [...logs].sort((a, b) => a.timestamp - b.timestamp);
    let consecutiveLosses = 0;
    let maxConsecutiveLosses = 0;
    let lossStreakStarts: number[] = [];

    sorted.forEach(l => {
        if (l.type === 'LOSS') {
            consecutiveLosses++;
            if (consecutiveLosses > maxConsecutiveLosses) maxConsecutiveLosses = consecutiveLosses;
        } else {
            if (consecutiveLosses >= 2) {
                lossStreakStarts.push(getHour(l.timestamp));
            }
            consecutiveLosses = 0;
        }
    });

    if (maxConsecutiveLosses >= 3) {
        insights.push({
            id: 'loss-spiral',
            icon: '⚠️',
            headline: `You've hit ${maxConsecutiveLosses} losses in a row before`,
            detail: `Loss spirals tend to snowball. Consider taking a break after 2 consecutive losses.`,
            severity: 'warning',
            score: maxConsecutiveLosses * 10
        });
    }

    // Morning vs afternoon start pattern
    const morningStarts = sorted.filter(l => getHour(l.timestamp) < 12 && l.type === 'WIN').length;
    const afternoonStarts = sorted.filter(l => getHour(l.timestamp) >= 12 && l.type === 'WIN').length;
    const morningTotal = sorted.filter(l => getHour(l.timestamp) < 12).length;
    const afternoonTotal = sorted.filter(l => getHour(l.timestamp) >= 12).length;

    if (morningTotal >= 5 && afternoonTotal >= 5) {
        const morningWR = morningStarts / morningTotal;
        const afternoonWR = afternoonStarts / afternoonTotal;
        const diff = morningWR - afternoonWR;

        if (Math.abs(diff) > 0.15) {
            const better = diff > 0 ? 'mornings' : 'afternoons';
            const betterWR = diff > 0 ? morningWR : afternoonWR;
            const worseWR = diff > 0 ? afternoonWR : morningWR;
            insights.push({
                id: 'am-pm-split',
                icon: '🌅',
                headline: `You win ${Math.round(Math.abs(diff) * 100)}% more in ${better}`,
                detail: `${better === 'mornings' ? 'AM' : 'PM'}: ${Math.round(betterWR * 100)}% win rate. ${better === 'mornings' ? 'PM' : 'AM'}: ${Math.round(worseWR * 100)}%.`,
                severity: 'positive',
                score: Math.abs(diff) * 80
            });
        }
    }

    return insights;
};

// --- Master Function ---

/**
 * Generate top insights from all analysis functions, ranked by score
 */
export const generateInsights = (logs: LogEntry[], maxInsights: number = 5): Insight[] => {
    if (logs.length < MIN_ENTRIES) return [];

    const allInsights = [
        ...detectTimePatterns(logs),
        ...detectCategoryCorrelations(logs),
        ...detectStreakFactors(logs),
    ];

    // Sort by score (most notable first) and take top N
    return allInsights
        .sort((a, b) => b.score - a.score)
        .slice(0, maxInsights);
};

export const PATTERN_MIN_ENTRIES = MIN_ENTRIES;
