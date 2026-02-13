import { GoogleGenAI } from "@google/genai";
import { LogEntry, UserGoal, ScheduleConfig, AIPersona } from "../types";

const getPersonaInstruction = (persona: AIPersona = 'LOGIC'): string => {
    switch (persona) {
        case 'AGGRESSIVE':
            return `
            IDENTITY: The Savage (Hormozi "Gym Launch" Mode).
            - PRINCIPLES: Feelings don't matter. Only action counts. Hard work beats luck.
            - TONE: Direct, punchy, commanding.
            - KEY PHRASES: "Do the work.", "Stop stalling.", "You're better than this."
            `;
        case 'STOIC':
            return `
            IDENTITY: The Grandfather (Hormozi "Old Man" Perspective).
            - PRINCIPLES: Think long term. This moment is small. Stay calm.
            - TONE: Calm, wise, steady.
            - KEY PHRASES: "In 10 years, this won't matter.", "Keep going.", "Patience pays off."
            `;
        case 'LOGIC':
        default:
            return `
            IDENTITY: The Operator (Hormozi "Acquisition.com" Mode).
            - PRINCIPLES: Look at the facts. Find the problem. Fix it.
            - TONE: Simple, clear, practical.
            - KEY PHRASES: "What does the data say?", "Make it easier.", "Focus on what works."
            `;
    }
};

export const generateAIReport = async (
  targetLogs: LogEntry[],
  period: string, // 'Day', 'Week', 'Month'
  goals: UserGoal[],
  persona: AIPersona, 
  schedule: ScheduleConfig,
  type: 'FULL' | 'BRIEF' = 'FULL',
  strategicPriority?: string,
  allLogs: LogEntry[] = []
): Promise<string> => {
  
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    return "Configuration Error: API Key is missing.";
  }

  const ai = new GoogleGenAI({ apiKey });

  if (!targetLogs || targetLogs.length === 0) {
    return "Since you have no data recorded, you can probably start by simply defining what you want to achieve today.";
  }

  // Formatting Logs for Prompt
  const formatTime12h = (timestamp: number) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const strMinutes = minutes < 10 ? '0'+minutes : minutes;
    return `${hours}:${strMinutes} ${ampm}`;
  };

  const logText = targetLogs
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(l => `[${formatTime12h(l.timestamp)}] ${l.type}: ${l.text}`)
    .join('\n');

  const priorityContext = strategicPriority ? `Target Objective: ${strategicPriority}` : "Target: General Self-Improvement";
  const personaStyle = getPersonaInstruction(persona);

  const systemInstruction = `
  You are the Chief of Staff.
  ${personaStyle}
  
  Your Goal: Review the user's day simply and honestly.

  METHODOLOGY:
  1. CHECK the Score (Wins vs Losses).
  2. FIND the #1 Problem (What caused the most losses?).
  3. PREDICT: "If you lived this day for a year, where would you be?"

  STRICT OUTPUT TEMPLATE:
  "Score: [Win %]. The Problem: [Main blocker]. Prediction: If you repeat today for a year, you [Succeed/Fail] at [Target Objective]."

  RULES:
  - Keep it simple. No big words.
  - Be honest, but helpful.
  `;

  const prompt = `
  LOGS:
  ${logText}

  TARGET OBJECTIVE:
  ${priorityContext}

  GENERATE AUDIT:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "Since you are here, you can probably try again.";
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return `Analysis Failed: ${error.message}`;
  }
};

export const generateInstantFeedback = async (
  latestLog: LogEntry,
  recentLogs: LogEntry[], 
  strategicPriority?: string,
  persona: AIPersona = 'LOGIC'
): Promise<string> => {
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return "Log recorded.";

  const ai = new GoogleGenAI({ apiKey });

  const contextLogs = recentLogs
    .slice(0, 5) // Last 5 logs for immediate context
    .map(l => `[${new Date(l.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}] ${l.type}: ${l.text}`)
    .join('\n');

  const priorityContext = strategicPriority ? `Target Objective: ${strategicPriority}` : "";
  const personaStyle = getPersonaInstruction(persona);

  const systemInstruction = `
  You are a hype man and coach.
  ${personaStyle}
  
  Your Goal: Prove to the user they are winning based on their action.

  METHODOLOGY:
  1. LOOK at the WIN.
  2. MATCH it to a good trait (e.g., worked hard -> Disciplined).
  3. SAY: "Because you did [Action], you are [Trait], so go do [Next Step]."

  STRICT OUTPUT RULES:
  - Write ONE simple, natural sentence.
  - No jargon. Speak like a normal person.
  - Example: "You finished that report early, which shows focus, so start the next task now."
  - Max 40 words.
  ${priorityContext}
  `;

  const prompt = `
  RECENT CONTEXT:
  ${contextLogs}

  LATEST ENTRY (WIN):
  ${latestLog.text}

  GENERATE IDENTITY PROOF:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        maxOutputTokens: 1000,
      }
    });
    return response.text || "Log acknowledged. Keep moving.";
  } catch (error) {
    console.error("Instant Feedback Error:", error);
    return "Log recorded.";
  }
};

export const generateProtocolRecovery = async (
  latestLog: LogEntry,
  recentLogs: LogEntry[], 
  strategicPriority?: string,
  persona: AIPersona = 'LOGIC'
): Promise<string> => {
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return "Reset and re-engage.";

  const ai = new GoogleGenAI({ apiKey });

  const priorityContext = strategicPriority ? `Target Objective: ${strategicPriority}` : "";
  const personaStyle = getPersonaInstruction(persona);

  const systemInstruction = `
  You are a Recovery Coach.
  ${personaStyle}
  
  The user messed up. Don't let them feel bad. Fix it fast.
  
  METHODOLOGY:
  1. GUESS why they failed: (Didn't know how? Didn't want to? Distracted?)
  2. TELL them one tiny thing to do right now to fix it.
  3. Remind them: "New moment, new start."

  STRICT OUTPUT RULES:
  - Format: "Problem: [Reason]. Fix: [Tiny Action]."
  - Keep it super simple.
  - Max 15 words.
  ${priorityContext}
  `;

  const prompt = `
  FAILURE LOG: "${latestLog.text}" GENERATE IMMEDIATE RESET:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.6,
        maxOutputTokens: 50,
      }
    });
    return response.text || "Protocol Reset: Stand up and deep breathe.";
  } catch (error) {
    console.error("Recovery Generation Error:", error);
    return "Protocol Reset: Stand up and deep breathe.";
  }
};
