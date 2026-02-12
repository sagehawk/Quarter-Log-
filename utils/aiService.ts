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

  const systemInstruction = `
  You are a Psychological Conditioning Agent. 
  Your Goal: Irrefutably prove to the user they are capable of more by using their own past actions as evidence.
  ${priorityContext}

  METHODOLOGY:
  1. ANALYZE the provided logs (which represent the user's recent past).
  2. FIND concrete evidence of ability (a specific "WIN" or completed task).
  3. EXTRAPOLATE that ability to a harder or broader task related to their Target Objective.
  4. IF NO WINS: Break down the failure. Find the missing prerequisite step and challenge them to do JUST that.

  STRICT OUTPUT TEMPLATE:
  "Since you could [Action X from logs], you can probably [Action Y - expanded/harder version]."

  RULES:
  - NO "Good job" or "Keep it up".
  - NO Markdown headers.
  - Tone: Logical, Grounded, Challenging.
  - If they did X (e.g., worked out), challenge them to apply that discipline to Y (e.g., focused work).
  - If they failed (LOSS), identifying the blocker (e.g., "didn't apply to jobs") and pivoting to the immediate fix (e.g., "Since you didn't apply, you can probably just spend 15 minutes fixing your resume").
  - Keep it under 50 words.
  `;

  const prompt = `
  LOGS:
  ${logText}

  GENERATE INSIGHT:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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
  recentLogs: LogEntry[], // Context from the day
  strategicPriority?: string
): Promise<string> => {
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return "Log recorded.";

  const ai = new GoogleGenAI({ apiKey });

  const contextLogs = recentLogs
    .slice(0, 5) // Last 5 logs for immediate context
    .map(l => `[${new Date(l.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}] ${l.type}: ${l.text}`)
    .join('\n');

  const priorityContext = strategicPriority ? `Target Objective: ${strategicPriority}` : "";

  const systemInstruction = `
  You are a Psychological Conditioning Agent. 
  Your Goal: Irrefutably prove to the user they are capable of more by using their own past actions as evidence.
  ${priorityContext}

  METHODOLOGY:
  1. ANALYZE the provided logs, focusing on the LATEST ENTRY.
  2. FIND evidence of ability in that latest action.
  3. CHALLENGE the user to apply that ability to a harder or broader task immediately.

  STYLE GUIDANCE:
  - Ideally use the format: "Since you could [Action X], you can probably [Action Y]."
  - NO "Good job", "Keep it up", or fluff.
  - Tone: Logical, Grounded, Challenging.
  - Keep response under 50 words.
  `;

  const prompt = `
  RECENT CONTEXT:
  ${contextLogs}

  LATEST ENTRY (${latestLog.type}):
  ${latestLog.text}

  GENERATE INSIGHT:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
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