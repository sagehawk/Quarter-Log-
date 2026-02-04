import { GoogleGenAI } from "@google/genai";
import { LogEntry, UserGoal, ScheduleConfig, AIPersona } from "../types";

export const generateAIReport = async (
  logs: LogEntry[],
  period: string, // 'Day', 'Week', 'Month'
  goals: UserGoal[],
  persona: AIPersona, // Keeping argument for compatibility, but ignoring it logic-wise
  schedule: ScheduleConfig,
  type: 'FULL' | 'BRIEF' = 'FULL',
  strategicPriority?: string
): Promise<string> => {
  
  // Check both process.env (from vite define) and import.meta.env (standard Vite)
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  console.log("Debug: API Key present?", !!apiKey);

  if (!apiKey) {
    return "Configuration Error: API Key is missing. Create a .env file in your project root with VITE_GEMINI_API_KEY=your_key.";
  }

  const ai = new GoogleGenAI({ apiKey });

  if (!logs || logs.length === 0) {
    return "No field data. The leaderboard remains empty.";
  }

  // 1. Calculate Win Rate
  const totalLogs = logs.length;
  const wins = logs.filter(l => l.type === 'WIN').length;
  const losses = logs.filter(l => l.type === 'LOSS').length;
  const winRate = totalLogs > 0 ? Math.round((wins / totalLogs) * 100) : 0;

  // 2. Format Logs
  const logText = logs
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(l => `[${l.type || 'NEUTRAL'}] ${l.text}`)
    .join('\n');

  // 3. Define Context & Persona based on Battlefields (Goals)
  const goalDefinitions: Record<UserGoal, { persona: string, context: string }> = {
    'FOCUS': {
      persona: "EFFICIENCY AUDITOR (Objective, systems-oriented, waste-reduction)",
      context: "User optimizes for deep work. Identify time leakage and distraction patterns."
    },
    'BUSINESS': {
      persona: "ROI ANALYST (Data-driven, output-focused, leverage-obsessed)",
      context: "User optimizes for high-value output. Distinguish between 'activity' and 'productivity'."
    },
    'LIFE': {
      persona: "BEHAVIORAL STRATEGIST (Pattern-seeking, holistic, sustainability-focused)",
      context: "User optimizes for balance and momentum. Identify energy drains vs. sources."
    }
  };

  // Default to FOCUS if empty
  const activeGoals = goals.length > 0 ? goals : ['FOCUS' as UserGoal];

  const combinedPersona = activeGoals.map(g => goalDefinitions[g].persona).join(" + ");
  const combinedContext = activeGoals.map(g => goalDefinitions[g].context).join(" ");
  const priorityContext = strategicPriority ? `\nSTRATEGIC PRIORITY: "${strategicPriority}"\n` : "";

  const systemInstruction = `
  You are a ${combinedPersona}.
  ${priorityContext}
  YOUR ROLE: Conduct a "CEO Audit" of the user's recent performance logs.
  
  CORE DIRECTIVE:
  - EXTREME BREVITY: No fluff. No filler words. Use "telegram style".
  - REVEAL HIDDEN PATTERNS: Look for non-obvious clusters (e.g., "Losses spike after 2 PM").
  - NO OBVIOUS OBSERVATIONS: Do NOT say "You won because you worked."
  - DATA, NOT FLUFF: Use the logs as raw data.
  - REVEAL, DON'T PREACH: State the observed pattern clearly.
  - SUGGEST LEVERAGE: Provide specific, high-leverage process adjustments.

  TONE: Clinical, Data-Driven, Ultra-Concise.
  `;

  // 4. Construct Prompt
  let prompt = "";
  
  if (type === 'BRIEF') {
      prompt = `
      AUDIT TARGET: ${period} Logs
      METRICS: ${winRate}% Win Rate (${wins} Wins, ${losses} Losses)
      CONTEXT: ${combinedContext}
      
      LOGS:
      ${logText}

      TASK:
      Write a single, data-driven insight (max 10 words).
      Start with "Report Ready:" and then give the insight.
      `;
  } else {
      prompt = `
      AUDIT TARGET: ${period} Logs
      METRICS: ${winRate}% Win Rate (${wins} Wins, ${losses} Losses)
      CONTEXT: ${combinedContext}

      LOGS:
      ${logText}

      TASK:
      Generate a CEO Performance Audit (max 100 words).
      
      STRUCTURE (Use Markdown):
      
      ## EXECUTIVE SUMMARY
      One sentence on the trend.

      ## PATTERNS
      Directly state the causal link between time/context and outcome. (e.g. "After 2pm, efficiency drops 40%.")

      ## FIX
      One specific, high-leverage adjustment.

      FORMATTING RULES:
      - Use **Bold** for key data points.
      - Be clinical. No introductions.
      `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      }
    });

    return response.text || "Could not analyze the battlefield.";
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return `Analysis Failed: ${error.message || "Unknown Error"}`;
  }
};