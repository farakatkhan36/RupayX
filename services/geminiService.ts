import { GoogleGenAI } from "@google/genai";

// Ideally this comes from process.env.API_KEY, but user might need to input it or it is injected.
// Since the prompt asks to use process.env.API_KEY, we follow that.
// If API_KEY is missing, we handle it gracefully in the UI.

const apiKey = process.env.API_KEY || '';

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const askGemini = async (prompt: string): Promise<string> => {
  if (!ai) {
    return "AI Assistant is not configured (Missing API Key).";
  }

  try {
    const model = 'gemini-2.5-flash';
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful customer support agent for RupayX, a fintech app. Keep answers short, professional, and friendly.",
      }
    });
    return response.text || "Sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I am having trouble connecting right now.";
  }
};