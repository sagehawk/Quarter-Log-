
import { GoogleGenAI } from "@google/genai";
import { LogEntry, UserGoal, ScheduleConfig, AIPersona } from "../types";

export const generateAIReport = async (
  logs: LogEntry[],
  period: string, // 'Day', 'Week', 'Month'
  goal: UserGoal,
  persona: AIPersona,
  schedule: ScheduleConfig,
  type: 'FULL' | 'BRIEF' = 'FULL'
): Promise<string> => {
  
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return "API Key is missing. Tactical analysis disabled.";
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

  // 3. Define Context
  const systemInstruction = `You are "The Cornerman." Your job is to build a winner. You analyze a user's 15-minute "Win/Loss" blocks. 
  Winning raises testosterone and momentum. Losing triggers a downward spiral. 
  Your tone is High-Status, Tactical, and Direct. 
  You use terms like: Momentum, The Leaderboard, Hierarchy, Biological Edge, and Stacking Wins. 
  You are not a therapist. You are a coach for a high-performance athlete/executive. 
  Speak in short, powerful sentences. 5th-grade reading level.`;

  const tone = "Tactical, Dominant, Direct, Momentum-focused. 5th-grade reading level.";

  // 4. Construct Prompt
  let prompt = "";
  
  if (type === 'BRIEF') {
      prompt = `
      Analyze these tactical logs for a ${period}.
      WIN RATE: ${winRate}% (${wins} Wins, ${losses} Losses)
      YOUR PERSONA: ${tone}
      
      LOGS:
      ${logText}

      TASK:
      Write a single, 1-sentence tactical summary (max 15 words).
      Start with "Report Ready:" and then give the summary.
      Focus on the momentum.
      `;
  } else {
      prompt = `
      Analyze these tactical logs for a ${period}.
      WIN RATE: ${winRate}% (${wins} Wins, ${losses} Losses)
      YOUR PERSONA: ${tone}

      LOGS:
      ${logText}

      TASK:
      Provide a tactical report (max 200 words).
      
      STRUCTURE (Use Markdown):
      **Momentum Score**: ${winRate}%

      ### Tactical Analysis
      - (Analyze the Win/Loss distribution. Identify where momentum was gained or bled out.)

      ### The Command
      - (Give one direct order to improve status or protect the streak.)

      FORMATTING RULES:
      - Use **Bold** for emphasis.
      - Use *Italics* for tactical terminology.
      - Use ### for Section Headers.
      - No corporate jargon. Primal and biological focus.
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
    return "The Cornerman is currently unavailable. Hold your position.";
  }
};
