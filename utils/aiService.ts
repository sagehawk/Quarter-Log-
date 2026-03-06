import { GoogleGenAI } from "@google/genai";
import { BattlePlan, SacrificeLog, AIPersona } from "../types";

const getPersonaInstruction = (persona: AIPersona = 'LOGIC'): string => {
  switch (persona) {
    case 'AGGRESSIVE':
      return `IDENTITY: The Savage. TONE: Direct, punchy, commanding. No excuses tolerated.`;
    case 'STOIC':
      return `IDENTITY: The Grandfather. TONE: Calm, wise, steady. Long-term perspective.`;
    case 'HYPE':
      return `IDENTITY: The Hype Man. TONE: High energy, enthusiastic, intense!`;
    case 'STRATEGIST':
      return `IDENTITY: The 4D Chess Player. TONE: Analytical, detached, visionary.`;
    case 'LOGIC':
    default:
      return `IDENTITY: The Operator. TONE: Simple, clear, practical. Data-driven.`;
  }
};

export const generateBattleReport = async (
  battlePlan: BattlePlan,
  sacrificeLog: SacrificeLog | null,
  persona: AIPersona = 'LOGIC'
): Promise<string> => {
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return "Configuration Error: API Key is missing.";

  const ai = new GoogleGenAI({ apiKey });

  const completedStrategies = battlePlan.strategies.filter(s => s.completed);
  const totalStrategies = battlePlan.strategies.length;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    let h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const strategyDetails = battlePlan.strategies.map((s, i) => {
    const status = s.completed ? `✅ DONE at ${formatTime(s.completedAt!)}` : '❌ NOT DONE';
    return `${i + 1}. "${s.text}" — ${status}`;
  }).join('\n');

  const sacrificeDetails = sacrificeLog
    ? `Sacrifice: "${battlePlan.sacrifice}"\nFail count: ${sacrificeLog.failCount} time(s) today`
    : `Sacrifice: "${battlePlan.sacrifice}"\nFail count: 0 — held strong`;

  const personaStyle = getPersonaInstruction(persona);

  const systemInstruction = `
  You are a Battle Plan Coach giving an end-of-day report.
  ${personaStyle}
  
  METHODOLOGY:
  1. Score: How many of 3 strategies were completed?
  2. Sacrifice discipline: How many times did they fail their sacrifice?
  3. Overall verdict: Did they WIN the day or not?
  4. One actionable tip for tomorrow.

  RULES:
  - Keep it under 100 words.
  - Be honest but encouraging.
  - Reference their specific strategies and sacrifice by name.
  - End with a forward-looking statement.
  `;

  const prompt = `
  BATTLE PLAN REPORT:
  
  North Star: "${battlePlan.northStar}"
  Victory Condition: "${battlePlan.victoryCondition}"
  
  STRATEGIES:
  ${strategyDetails}
  
  ${sacrificeDetails}
  
  Score: ${completedStrategies.length}/${totalStrategies} strategies completed.
  
  GENERATE BATTLE REPORT:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });
    return response.text || "Report generation failed. Keep pushing.";
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return `Report Failed: ${error.message}`;
  }
};
