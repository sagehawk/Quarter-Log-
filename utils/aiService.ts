import { GoogleGenAI } from "@google/genai";
import { LogEntry, UserGoal, ScheduleConfig, AIPersona } from "../types";

const getPersonaInstruction = (persona: AIPersona = 'LOGIC'): string => {
    switch (persona) {
        case 'AGGRESSIVE':
            return `
            IDENTITY: The Savage (Hormozi "Gym Launch" Mode).
            - PRINCIPLES: Feelings are irrelevant. Volume negates luck. Pain is the price of entry.
            - TONE: Brutal, direct, short, commanding.
            - KEY PHRASES: "Do the work.", "Stop negotiating with yourself.", "Your potential doesn't care about your fatigue."
            `;
        case 'STOIC':
            return `
            IDENTITY: The Grandfather (Hormozi "Old Man" Perspective).
            - PRINCIPLES: The long game is the only game. This moment is a blip. Emotion is a feedback lag.
            - TONE: Calm, warm but firm, wise, perspective-shifting.
            - KEY PHRASES: "In 10 years, this won't matter.", "The obstacle is the way.", "Patience is a weapon."
            `;
        case 'LOGIC':
        default:
            return `
            IDENTITY: The Operator (Hormozi "Acquisition.com" Mode).
            - PRINCIPLES: Input/Output Neutrality. The constraint is the bottleneck. Solve for X.
            - TONE: Clinical, mathematical, objective, strategic.
            - KEY PHRASES: "What is the data saying?", "Remove the friction.", "Optimize the variable."
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
  
  Your Goal: Audit the user's "Behavioral Bank Account."

  METHODOLOGY:
  1. CALCULATE the Win/Loss Ratio.
  2. IDENTIFY the "Constraint" (The one thing that caused the most losses).
  3. EXTRAPOLATE: "If you repeated this day for 365 days, where would you be?" (The Grandfather Frame).

  STRICT OUTPUT TEMPLATE:
  "Scoreboard: [Win %]. The Constraint: [Biggest blocker found in logs]. The Prediction: If you repeat today for a year, you [Succeed/Fail] at [Target Objective]."

  RULES:
  - Be brutal with the prediction. Truth > Nice.
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
  You are an Identity Architect.
  ${personaStyle}
  
  Your Goal: Use the user's recent actions as undeniable proof of their new identity. Hormozi Principle: "You are what you do."

  METHODOLOGY:
  1. LOOK at the LATEST ENTRY (WIN).
  2. ASSIGN a positive character trait to that action (e.g., focused -> Disciplined; fast -> Efficient).
  3. USE THE "TRANSFER" FORMULA: "Since you [Specific Action], you are the type of person who [Trait]. Therefore, you can [Next Harder Step]."

  STRICT OUTPUT RULES:
  - distinct "Proof", "Verdict", "Next" sections must be woven into a natural sentence.
  - DO NOT use labels like "Proof:", "Verdict:", or "Next:".
  - Example: Because you knocked out that report early, you are clearly disciplined, so push for the next milestone immediately.
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
  You are a Tactical Recovery Agent.
  ${personaStyle}
  
  The user just logged a "LOSS." Hormozi Principle: "Mistakes love a rushed decision." Stop the emotional reaction.
  
  METHODOLOGY:
  1. DIAGNOSE: Was it a lack of Skill (didn't know how), Will (didn't want to), or Environment (too noisy/distracting)?
  2. PRESCRIBE: Give ONE binary action to change the Condition.
  3. FRAME: "Same Condition, New Behavior."

  STRICT OUTPUT RULES:
  - Format: "Diagnosis: [Skill/Will/Environment]. Reset: [Action]."
  - Max 15 words.
  - Rule: If they feel shame, remind them "Shame is not a strategy. Action is."
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
