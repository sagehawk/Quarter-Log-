
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

  // 2. Define Context based on Goal (What we are fighting)
  let goalContext = "";
  switch (goal) {
    case 'FOCUS':
      goalContext = "The user struggles with distraction and focus.";
      break;
    case 'BUSINESS':
      goalContext = "The user feels stuck and wants to be more effective.";
      break;
    case 'LIFE':
      goalContext = "The user is tired and potentially facing burnout.";
      break;
  }

  // 3. Define Persona/Tone (How we speak)
  let systemInstruction = "";
  let tone = "";

  switch (persona) {
    case 'TOUGH':
        systemInstruction = "You are a strict Drill Sergeant. You do not accept excuses. You are harsh, direct, and loud.";
        tone = "Critical, Short, Punchy, Aggressive.";
        break;
    case 'LOGIC':
        systemInstruction = "You are a Data Analyst. You are objective, emotionless, and factual. You care only about efficiency.";
        tone = "Professional, Analytical, Dry, Concise.";
        break;
    case 'KIND':
        systemInstruction = "You are a supportive Life Coach or best friend. You are gentle, validating, and encouraging. You focus on small wins and mental well-being.";
        tone = "Warm, Gentle, Optimistic, Forgiving.";
        break;
    default:
        systemInstruction = "You are a helpful assistant.";
        tone = "Neutral.";
  }

  // 4. Format Schedule Info
  const scheduleInfo = schedule.enabled 
    ? `Working Hours: ${schedule.startTime} to ${schedule.endTime}. Active Days: ${schedule.daysOfWeek.join(',')}.` 
    : "Schedule: Flexible/24-7.";

  // 5. Construct Prompt based on Type
  let prompt = "";
  
  if (type === 'BRIEF') {
      prompt = `
      Analyze these logs for a ${period}.
      USER CONTEXT: ${goalContext}
      YOUR PERSONA: ${tone}
      SCHEDULE: ${scheduleInfo}
      
      LOGS:
      ${logText}

      TASK:
      Write a single, 1-sentence notification summary (max 15 words) acting in your PERSONA.
      Start with "Report Ready:" and then give the summary.
      `;
  } else {
      prompt = `
      Analyze these logs for a ${period}.
      USER CONTEXT: ${goalContext}
      YOUR PERSONA: ${tone}
      SCHEDULE: ${scheduleInfo}

      LOGS:
      ${logText}

      TASK:
      Provide a report (max 200 words) acting strictly in your PERSONA.
      
      STRUCTURE (Use Markdown):
      1. **Score**: (0-100) - Be generous if Kind, harsh if Tough.
      2. ### Analysis
         - (What went right and what went wrong, based on your persona)
      3. ### Advice
         - (One concrete step to take next)

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
