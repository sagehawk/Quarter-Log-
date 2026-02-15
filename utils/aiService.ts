import { GoogleGenAI } from "@google/genai";
import { LogEntry, UserGoal, ScheduleConfig, AIPersona, DayPlan } from "../types";

const getPersonaInstruction = (persona: AIPersona = 'LOGIC'): string => {
  switch (persona) {
    case 'AGGRESSIVE':
      return `
            IDENTITY: The Savage (Hormozi "Gym Launch" Mode).
            - PRINCIPLES: Feelings don't matter. Only action counts. Hard work beats luck.
            - TONE: Direct, punchy, commanding.
            - KEY PHRASES: "Do the work.", "Stop stalling.", "You're better than this."
            `;
    case 'STOIC':
      return `
            IDENTITY: The Grandfather (Hormozi "Old Man" Perspective).
            - PRINCIPLES: Think long term. This moment is small. Stay calm.
            - TONE: Calm, wise, steady.
            - KEY PHRASES: "In 10 years, this won't matter.", "Keep going.", "Patience pays off."
            `;
    case 'HYPE':
      return `
            IDENTITY: The Hype Man (Tony Robbins / Goggins hybrid).
            - PRINCIPLES: Energy is everything. State management. Massive action.
            - TONE: High energy, enthusiastic, intense, use exclamation marks!
            - KEY PHRASES: "LET'S GO!", "You are a machine!", "Dominate the day!"
            `;
    case 'STRATEGIST':
      return `
            IDENTITY: The 4D Chess Player (Robert Greene / Sun Tzu).
            - PRINCIPLES: Zoom out. Look for leverage. Execute with precision.
            - TONE: Analytical, detached, visionary.
            - KEY PHRASES: "What is the second-order effect?", "Align with the macro goal.", "Optimize the system."
            `;
    case 'LOGIC':
    default:
      return `
            IDENTITY: The Operator (Hormozi "Acquisition.com" Mode).
            - PRINCIPLES: Look at the facts. Find the problem. Fix it.
            - TONE: Simple, clear, practical.
            - KEY PHRASES: "What does the data say?", "Make it easier.", "Focus on what works."
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
  allLogs: LogEntry[] = [],
  dayPlan: DayPlan | null = null
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
    const strMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${hours}:${strMinutes} ${ampm}`;
  };

  const logText = targetLogs
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(l => `[${formatTime12h(l.timestamp)}] ${l.type}: ${l.text}`)
    .join('\n');

  const priorityContext = strategicPriority ? `Target Objective: ${strategicPriority}` : "Target: General Self-Improvement";
  const personaStyle = getPersonaInstruction(persona);

  let planContext = "NO SPECIFIC PLAN SET.";
  if (dayPlan && dayPlan.blocks.length > 0) {
    const blockList = dayPlan.blocks
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
      .map(b => `[${b.startTime}] ${b.label} (${b.category})`)
      .join('\n');
    planContext = `PLANNED SCHEDULE:\n${blockList}`;
  }

  const systemInstruction = `
  You are the Chief of Staff.
  ${personaStyle}
  
  Your Goal: Review the user's day simply and honestly.

  METHODOLOGY:
  1. CHECK the Score (Wins vs Losses).
  2. FIND the #1 Problem (What caused the most losses?).
  3. PREDICT: "If you lived this day for a year, where would you be?"

  STRICT OUTPUT TEMPLATE:
  "Score: [Win %]. The Problem: [Main blocker]. Prediction: If you repeat today for a year, you [Succeed/Fail] at [Target Objective]."

  RULES:
  - Keep it simple. No big words.
  - Be honest, but helpful.
  `;

  const prompt = `
  LOGS:
  ${logText}

  ${planContext}

  TARGET OBJECTIVE:
  ${priorityContext}

  GENERATE AUDIT:
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

    return response.text || "Since you are here, you can probably try again.";
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    return `Analysis Failed: ${error.message} `;
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
    .map(l => `[${new Date(l.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ${l.type}: ${l.text} `)
    .join('\n');

  const priorityContext = strategicPriority ? `Target Objective: ${strategicPriority} ` : "";
  const personaStyle = getPersonaInstruction(persona);

  const systemInstruction = `
  You are a hype man and coach.
    ${personaStyle}
  
  Your Goal: Prove to the user they are winning based on their action.

    METHODOLOGY:
  1. LOOK at the WIN.
  2. MATCH it to a good trait(e.g., worked hard -> Disciplined).
  3. SAY: "Because you did [Action], you are [Trait], so go do [Next Step]."

  STRICT OUTPUT RULES:
  - Write ONE simple, natural sentence.
  - No jargon.Speak like a normal person.
  - START with a mood tag: [MOOD: WIN], [MOOD: LOSS], [MOOD: SAVAGE], [MOOD: STOIC], or[MOOD: IDLE].
  - Example: "[MOOD: WIN] You finished that report early, which shows focus, so start the next task now."
    - Max 40 words(excluding tag).
      ${priorityContext}
  `;

  const prompt = `
  RECENT CONTEXT:
  ${contextLogs}

  LATEST ENTRY(WIN):
  ${latestLog.text}

  GENERATE IDENTITY PROOF:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
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

  const priorityContext = strategicPriority ? `Target Objective: ${strategicPriority} ` : "";
  const personaStyle = getPersonaInstruction(persona);

  const systemInstruction = `
  You are a Recovery Coach.
    ${personaStyle}
  
  The user messed up.Don't let them feel bad. Fix it fast.

  METHODOLOGY:
  1. GUESS why they failed: (Didn't know how? Didn't want to ? Distracted ?)
  2. TELL them one tiny thing to do right now to fix it.
  3. Remind them: "New moment, new start."

  STRICT OUTPUT RULES:
  - Format: "[MOOD: LOSS] Problem: [Reason]. Fix: [Tiny Action]."
    - Keep it super simple.
  - Max 15 words.
    ${priorityContext}
  `;

  const prompt = `
  FAILURE LOG: "${latestLog.text}" GENERATE IMMEDIATE RESET:
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
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

export const analyzeEntry = async (
  text: string,
  strategicPriority: string = "General Productivity",
  persona: AIPersona = 'LOGIC',
  schedule?: ScheduleConfig,
  currentTime: number = Date.now(),
  recentLogs: LogEntry[] = [],
  dailyStats?: { wins: number; losses: number; categoryBreakdown: Record<string, number> }
): Promise<{ category: string, type: 'WIN' | 'LOSS' | 'DRAW', feedback: string }> => {
  const apiKey = process.env.API_KEY || import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return { category: 'OTHER', type: 'WIN', feedback: "Log recorded." };

  const ai = new GoogleGenAI({ apiKey });
  const personaStyle = getPersonaInstruction(persona);

  // Time Context
  const date = new Date(currentTime);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  let scheduleContext = "";

  if (schedule && schedule.enabled) {
    const day = date.getDay(); // 0-6
    const isWorkDay = schedule.daysOfWeek.includes(day);
    scheduleContext = `
      CURRENT TIME: ${timeStr}
  SCHEDULE: ${schedule.startTime} to ${schedule.endTime}
      IS WORK DAY: ${isWorkDay}
  `;
  }

  // Recent History Context
  const historyContext = recentLogs.length > 0
    ? "RECENT HISTORY:\n" + recentLogs.slice(0, 5).map(l => `- [${l.category}] ${l.text} `).join('\n')
    : "NO RECENT LOGS";

  // Daily Scorecard Context
  let dailyScorecardContext = "DAILY SCORECARD: No Data";
  if (dailyStats) {
    const total = dailyStats.wins + dailyStats.losses;
    const winRate = total > 0 ? Math.round((dailyStats.wins / total) * 100) : 0;
    const breakdown = Object.entries(dailyStats.categoryBreakdown)
      .map(([cat, count]) => `${cat}: ${count} `)
      .join(', ');

    dailyScorecardContext = `
      DAILY SCORECARD:
  - Wins: ${dailyStats.wins} | Losses: ${dailyStats.losses} | Win Rate: ${winRate}%
    - Breakdown: ${breakdown}
  `;
  }

  const systemInstruction = `
  You are a Tactical Analyst.
    ${personaStyle}
  
  Your Task: Analyze the user's log entry.
  ${scheduleContext}
  ${dailyScorecardContext}
  ${historyContext}

  1. CATEGORIZE it into one of the High - Performance Buckets:
  - MAKER: High Leverage, Revenue Generating, Deep Work. (The Goal)
    - MANAGER: Low Leverage, Admin, Calls, Maintenance. (Necessary Evil)
      - R & D: Learning, Skill Acquisition, Research. (Investing)
        - FUEL: Health, Sleep, Gym, Bio - Support. (Foundation)
          - RECOVERY: Active Rest, Family, Leisure. (Recharging)
            - BURN: Wasted time, Scrolling, Drifting. (The Enemy)

  2. JUDGE it:
  - WIN: Moving forward(MAKER, R & D, Strategic FUEL, Planned RECOVERY).
     - LOSS: Moving backward(BURN, Procrastination, Avoidance).
     - DRAW: Neutral / Maintenance / Holding Pattern(Routine FUEL, Commuting, Chores, Necessary but non - strategic Admin).
     
     * SPECIAL RULE: Routine meals(Lunch / Dinner) are a DRAW unless combined with "Networking".

  3. FEEDBACK: One short, punchy sentence.
     - CRITICAL: Do NOT repeat advice given in the RECENT HISTORY.Be fresh.
     - TRIGGER[MOOD: SAVAGE]if 'BURN' count > 2 in the DAILY SCORECARD.

  4. TIME AWARENESS RULES(CRITICAL):
  - If CURRENT TIME is past SCHEDULE END TIME(by > 1 hour) on a WORK DAY:
  - DO NOT encourage "grinding" or "pushing harder".
       - DO suggest sleep, rest, or winding down.
       - If the log is "Coding" or "Work" late at night, mark it as a 'WIN' but warn about burnout in the feedback.
     - If CURRENT TIME is very late(e.g., 1 AM - 4 AM):
  - Be concerned.Suggest sleep immediately.
       - Use[MOOD: STOIC]or[MOOD: DRAW] to signal concern.

  STRICT OUTPUT FORMAT(JSON ONLY):
  {
    "category": "CATEGORY_NAME",
      "type": "WIN" or "LOSS" or "DRAW",
        "feedback": "[MOOD: TAG] Your feedback text."
  }
  
  Mood Tags:
  -[MOOD: WIN]: Progress.
  - [MOOD: LOSS]: Setback.
  - [MOOD: DRAW]: Holding pattern / Maintenance.
  - [MOOD: SAVAGE]: Call out laziness.
  - [MOOD: STOIC]: Serious, philosophical advice.
  - [MOOD: IDLE]: Low - key acknowledgement, no strong judgment.
  `;

  const prompt = `LOG: "${text}"`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.5,
      }
    });

    const result = JSON.parse(response.text || "{}");
    return {
      category: result.category || 'OTHER',
      type: result.type || 'WIN',
      feedback: result.feedback || "[MOOD: IDLE] Entry logged."
    };
  } catch (error) {
    console.error("Analysis Error:", error);
    return { category: 'OTHER', type: 'WIN', feedback: "[MOOD: IDLE] Log recorded (Offline)." };
  }
};
