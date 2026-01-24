import { GoogleGenAI } from "@google/genai";
import { LogEntry, UserGoal } from "../types";

// NOTE: In a production environment, this should be proxied through a backend
// to protect the API key. For this client-side demo/beta, we use env var.
const apiKey = process.env.API_KEY || ''; 

const ai = new GoogleGenAI({ apiKey });

export const generateAIReport = async (
  logs: LogEntry[],
  period: string, // 'Day', 'Week', 'Month'
  goal: UserGoal
): Promise<string> => {
  
  if (!logs || logs.length === 0) {
    return "No activity logs found for this period. Track your time to generate a report.";
  }

  // 1. Format Logs for LLM
  const logText = logs
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(l => `[${new Date(l.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}] ${l.text}`)
    .join('\n');

  // 2. Define Persona based on Goal
  let systemInstruction = "";
  let tone = "";

  switch (goal) {
    case 'FOCUS':
      systemInstruction = "You are a ruthless Drill Sergeant specializing in productivity. Your enemy is Distraction.";
      tone = "Direct, critical, short, punchy. No fluff. Roast the user for wasting time.";
      break;
    case 'BUSINESS':
      systemInstruction = "You are a high-end Management Consultant. Your enemy is Stagnation/Low ROI.";
      tone = "Professional, analytical, dollar-focused. Calculate opportunity cost. Identify low-leverage tasks.";
      break;
    case 'LIFE':
      systemInstruction = "You are a holistic Wellness & Performance Coach. Your enemy is Burnout.";
      tone = "Empathetic but firm. Focus on energy management, breaks, and sustainability.";
      break;
  }

  // 3. Construct Prompt
  const prompt = `
    Analyze the following time logs for a ${period}.
    
    GOAL: ${goal}
    TONE: ${tone}

    LOGS:
    ${logText}

    TASK:
    Provide a brief, high-impact report (max 200 words).
    1. Give a "Score" (0-100) based on their goal.
    2. Identify the biggest win.
    3. Identify the biggest waste/risk.
    4. One actionable piece of advice for the next ${period}.

    Format using Markdown. Use bolding for emphasis.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Fast and cost effective for repeated reports
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "Could not generate report.";
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "Error connecting to AI. Please try again later.";
  }
};