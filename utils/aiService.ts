import { GoogleGenAI } from "@google/genai";
import { LogEntry, UserGoal, ScheduleConfig, AIPersona } from "../types";

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
    return "No field data. The leaderboard remains empty.";
  }

  // Metrics for Target Period (Current Day Only)
  const targetWins = targetLogs.filter(l => l.type === 'WIN').length;
  const winRate = targetLogs.length > 0 ? Math.round((targetWins / targetLogs.length) * 100) : 0;

  // Formatting Logs for Prompt (12-Hour Format)
  const formatTime12h = (timestamp: number) => {
    const date = new Date(timestamp);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const strMinutes = minutes < 10 ? '0'+minutes : minutes;
    return `${hours}:${strMinutes} ${ampm}`;
  };

  const logText = targetLogs
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(l => `[${formatTime12h(l.timestamp)}] ${l.type}: ${l.text}`)
    .join('\n');

  const priorityContext = strategicPriority ? `MARKET DOMINANCE: ${strategicPriority}` : "MARKET DOMINANCE: Scaled Execution";

  const systemInstruction = `
  You are the BIOLOGICAL STRATEGIST.
  ${priorityContext}

  YOUR ROLE: Conduct a tactical audit of the CURRENT DAY'S logs.

  CORE DIRECTIVES:
  - TELEGRAM STYLE: Strip auxiliary verbs. Use high-status directives.
  - REAL-TIME ANALYSIS: Analyze the provided logs as the current state of the day. Do not assume the day is over.
  - IDENTIFY FRICTION: Pinpoint specific times where momentum was lost.
  - STATUS-DRIVEN: Address user as Elite Operator.
  - NO HISTORY: Do not reference past days or long-term trends. Focus ONLY on the provided logs.

  TONE: Brutal, Clinical, High-Resolution, Sovereign.
  `;

  let prompt = "";
  if (type === 'BRIEF') {
    prompt = `
    AUDIT TARGET: Current Session
    METRICS: ${winRate}% Velocity
    
    TASK:
    Generate a single, high-status biological insight (max 15 words).
    Start with "Report Ready:"
    `;
  } else {
    prompt = `
    AUDIT TARGET: Current Day Logs
    METRICS: ${winRate}% Velocity (${targetWins} Successes, ${targetLogs.length - targetWins} Failures)

    LOG DATA:
    ${logText}

    TASK:
    Generate a Sovereign Performance Debrief (max 100 words).

    STRUCTURE:
    ## MOMENTUM ANALYSIS
    One sentence on the current trajectory.

    ## TACTICAL FRICTION
    Identify specific windows where velocity was lost based on the logs.

    ## STRATEGIC REFEED
    One high-status directive to restore or maintain the "Winner Effect" immediately.

    FORMATTING:
    - **Bold** percentages and time-stamps.
    - Clinical language. Zero filler.
    - Use 12-hour time format.
    `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "Could not analyze the battlefield.";
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return `Analysis Failed: ${error.message || "Unknown Error"}`;
  }
};