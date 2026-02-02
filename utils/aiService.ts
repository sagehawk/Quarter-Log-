import { GoogleGenAI } from "@google/genai";
import { LogEntry, UserGoal, ScheduleConfig, AIPersona } from "../types";

export const generateAIReport = async (
  logs: LogEntry[],
  period: string, // 'Day', 'Week', 'Month'
  goals: UserGoal[],
  persona: AIPersona, // Keeping argument for compatibility, but ignoring it logic-wise
  schedule: ScheduleConfig,
  type: 'FULL' | 'BRIEF' = 'FULL'
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
      persona: "CHIEF OF STAFF / PERFORMANCE AUDITOR (Objective, analytical, high-stakes efficiency)",
      context: "User fights inefficiency. Call out wasted time as 'ROI leakage'."
    },
    'BUSINESS': {
      persona: "CFO / HIGH-PERFORMANCE INVESTOR (Cold, rational, ROI-obsessed)",
      context: "User fights low-value work. Identify 'busy work' vs 'wealth-generating wins'."
    },
    'LIFE': {
      persona: "SOCIAL ARCHITECT / ALPHA MENTOR (Focus on energy, dominance, social momentum)",
      context: "User fights anxiety/passivity. Call out hesitation as 'submission'."
    }
  };

  // Default to FOCUS if empty
  const activeGoals = goals.length > 0 ? goals : ['FOCUS' as UserGoal];

  const combinedPersona = activeGoals.map(g => goalDefinitions[g].persona).join(" + ");
  const combinedContext = activeGoals.map(g => goalDefinitions[g].context).join(" ");

  const systemInstruction = `
  You are a hybrid AI System: ${combinedPersona}.
  
  YOUR CORE DIRECTIVE: Build the "Winner Effect" through high-performance auditing.
  
  THE TRAP: Do NOT label the user as a "loser" or "pathetic." This lowers testosterone and causes a downward spiral.
  
  THE STRATEGY:
  1. THE AUDIT (The Reality): If they lost, analyze the leakage objectively. "You allocated 15 minutes to low-value distraction. This is a negative compounding asset."
  2. THE PROJECTION (The Correction): Frame the NEXT block as a critical correction to the daily P&L. "The next 15 minutes must generate a win to balance the ledger. Execute."
  
  TONE: Analytical, Direct, High-Status, Concise. CEO-to-CEO candor. No fluff. No therapy speak.
  `;

  // 4. Construct Prompt
  let prompt = "";
  
  if (type === 'BRIEF') {
      prompt = `
      Analyze these tactical logs for a ${period}.
      WIN RATE: ${winRate}% (${wins} Wins, ${losses} Losses)
      CONTEXT: ${combinedContext}
      
      LOGS:
      ${logText}

      TASK:
      Write a single, 1-sentence tactical summary (max 15 words) using your persona.
      Start with "Report Ready:" and then give the summary.
      `;
  } else {
      prompt = `
      Analyze these tactical logs for a ${period}.
      WIN RATE: ${winRate}% (${wins} Wins, ${losses} Losses)
      CONTEXT: ${combinedContext}

      LOGS:
      ${logText}

      TASK:
      Provide a tactical report (max 200 words).
      
      STRUCTURE (Use Markdown):
      **Momentum Score**: ${winRate}%

      ### Tactical Analysis
      - (Analyze the Wins vs Losses. Be fierce but strategic. Identify where momentum was lost or gained.)

      ### The Command
      - (Give one direct, actionable order for the next block to protect the streak or break the downward spiral.)

      FORMATTING RULES:
      - Use **Bold** for emphasis.
      - Use *Italics* for tone.
      - Use ### for Section Headers.
      - Do NOT use bullet points for the main paragraphs, keep it punchy.
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