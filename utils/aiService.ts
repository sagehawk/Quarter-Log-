
import { GoogleGenAI } from "@google/genai";
import { LogEntry, UserGoal, ScheduleConfig } from "../types";

export const generateAIReport = async (
  logs: LogEntry[],
  period: string, // 'Day', 'Week', 'Month'
  goal: UserGoal,
  schedule: ScheduleConfig,
  type: 'FULL' | 'BRIEF' = 'FULL'
): Promise<string> => {
  
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return "API Key is missing. Please create a .env file and add API_KEY=your_key_here to enable intelligence.";
  }

  // Initialize client here to ensure we use the latest key
  const ai = new GoogleGenAI({ apiKey });

  if (!logs || logs.length === 0) {
    return "No activity logs found for this period.";
  }

  // 1. Format Logs
  const logText = logs
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(l => `[${new Date(l.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}] ${l.text}`)
    .join('\n');

  // 2. Define Persona
  let systemInstruction = "";
  let tone = "";

  switch (goal) {
    case 'FOCUS':
      systemInstruction = "You are a ruthless Drill Sergeant specializing in productivity. Your enemy is Distraction.";
      tone = "Direct, critical, short, punchy. No fluff.";
      break;
    case 'BUSINESS':
      systemInstruction = "You are a high-end Management Consultant. Your enemy is Stagnation/Low ROI.";
      tone = "Professional, analytical, dollar-focused. Calculate opportunity cost.";
      break;
    case 'LIFE':
      systemInstruction = "You are a holistic Wellness & Performance Coach. Your enemy is Burnout.";
      tone = "Empathetic but firm. Focus on energy management.";
      break;
  }

  // 3. Format Schedule Info
  const scheduleInfo = schedule.enabled 
    ? `Working Hours: ${schedule.startTime} to ${schedule.endTime}. Active Days: ${schedule.daysOfWeek.join(',')}.` 
    : "Schedule: Flexible/24-7.";

  // 4. Construct Prompt based on Type
  let prompt = "";
  
  if (type === 'BRIEF') {
      prompt = `
      Analyze these logs for a ${period}.
      GOAL: ${goal}
      TONE: ${tone}
      SCHEDULE: ${scheduleInfo}
      
      LOGS:
      ${logText}

      TASK:
      Write a single, 1-sentence notification summary (max 15 words).
      Start with "Report Ready:" and then give a punchy summary of how they did.
      Example: "Report Ready: You wasted 3 hours on social media today."
      `;
  } else {
      prompt = `
      Analyze these logs for a ${period}.
      GOAL: ${goal}
      TONE: ${tone}
      SCHEDULE: ${scheduleInfo}

      LOGS:
      ${logText}

      TASK:
      Provide a high-impact report (max 250 words).
      
      STRUCTURE (Use Markdown):
      1. **Score**: (0-100)
      2. ### The Good
         - (Bullet point big win)
      3. ### The Bad
         - (Bullet point main waste/risk)
      4. ### Action Plan
         - (One concrete advice)

      FORMATTING RULES:
      - Use **Bold** for emphasis.
      - Use *Italics* for tone.
      - Use ### for Section Headers.
      `;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "Could not generate report.";
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    if (error.message?.includes("API key")) {
        return "Invalid API Key. Please check your .env configuration.";
    }
    return "Error connecting to AI. Please try again later.";
  }
};
