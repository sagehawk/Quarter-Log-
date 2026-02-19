import { LogCategory, LogType } from '../types';
import { analyzeEntry } from './aiService';

export interface ParsedLog {
    text: string;
    category: LogCategory;
    type: LogType;
    feedback?: string;
}

const KEYWORD_MAP: Record<string, LogCategory> = {
    'meeting': 'MEETINGS',
    'call': 'MEETINGS',
    'email': 'MEETINGS',
    'admin': 'ADMIN',
    'chore': 'ADMIN',
    'code': 'DEEP WORK',
    'dev': 'DEEP WORK',
    'design': 'DEEP WORK',
    'write': 'DEEP WORK',
    'research': 'RESEARCH',
    'learn': 'RESEARCH',
    'study': 'RESEARCH',
    'gym': 'EXERCISE',
    'workout': 'EXERCISE',
    'exercise': 'EXERCISE',
    'sleep': 'BREAK',
    'eat': 'BREAK',
    'lunch': 'BREAK',
    'dinner': 'BREAK',
    'break': 'BREAK',
    'relax': 'BREAK',
    'family': 'BREAK',
    'waste': 'BURN',
    'scroll': 'BURN',
    'tv': 'BURN',
};

export const parseLogInput = async (text: string, strategicPriority?: string): Promise<ParsedLog> => {
    // 1. Try AI Analysis if available
    const aiResult = await analyzeEntry(text, strategicPriority);

    // Check if AI actually ran (feedback won't be "Log recorded (Offline)" or similar fallback)
    const isOffline = aiResult.feedback.includes('(Offline)') || aiResult.category === 'ADMIN';

    if (!isOffline) {
        return {
            text,
            category: isValidCategory(aiResult.category) ? aiResult.category as LogCategory : 'ADMIN',
            type: aiResult.type as LogType || 'WIN',
            feedback: aiResult.feedback
        };
    }

    // 2. Fallback to Heuristics
    const lowerText = text.toLowerCase();
    let category: LogCategory = 'ADMIN';
    let type: LogType = 'WIN';

    for (const [keyword, cat] of Object.entries(KEYWORD_MAP)) {
        if (lowerText.includes(keyword)) {
            category = cat;
            break;
        }
    }

    // Simple heuristic for WIN/LOSS
    if (category === 'BURN') type = 'LOSS';

    return {
        text,
        category,
        type,
        feedback: undefined
    };
};

const isValidCategory = (cat: string): boolean => {
    const valid: LogCategory[] = ['DEEP WORK', 'MEETINGS', 'RESEARCH', 'BREAK', 'EXERCISE', 'ADMIN', 'BURN'];
    return valid.includes(cat as LogCategory);
};
