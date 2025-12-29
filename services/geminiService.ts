
import { GoogleGenAI, Type } from "@google/genai";

// Initialization - API key should be set in environment or config
// For now, we'll make it optional to prevent app crashes
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// For Article Generation (Text only)
export const checkSymptoms = async (prompt: string, language: 'en' | 'sw' = 'en'): Promise<string> => {
  if (!ai) {
    return "AI service is not configured. Please add VITE_GEMINI_API_KEY to your environment variables.";
  }
  
  const systemInstruction = `
    You are NexaFya's medical content assistant. 
    Write professional, medically accurate, yet accessible content.
    Language: ${language === 'sw' ? 'Swahili' : 'English'}.
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
    return response.text || "";
  } catch (error) {
    console.error("Gemini Text Error:", error);
    return "AI Service unavailable.";
  }
};

// For Symptom Checker (Structured Data)
export interface SymptomAssessment {
  reply: string;
  careLevel: 'Emergency' | 'Doctor' | 'SelfCare' | 'Info';
  title: string;
  action: string;
}

export const assessSymptoms = async (history: {role: string, text: string}[], language: 'en' | 'sw' = 'en'): Promise<SymptomAssessment> => {
  if (!ai) {
    return {
      reply: "AI symptom checker is not available. Please consult with a healthcare provider.",
      careLevel: 'Doctor',
      title: "Consult a Doctor",
      action: "Schedule an appointment with a healthcare professional."
    };
  }
  
  const systemInstruction = `
    You are NexaFya, an empathetic, medical-grade AI health assistant.
    
    Your goal is to:
    1. Acknowledge user symptoms with empathy.
    2. Ask one clarifying question if vague.
    3. Provide triage assessment.
    
    OUTPUT FORMAT: JSON.
    - reply: Conversational message.
    - careLevel: 'Emergency', 'Doctor', 'SelfCare', 'Info'.
    - title: Short recommendation title.
    - action: Bold action step.

    Language: ${language === 'sw' ? 'Swahili' : 'English'}.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: history.map(h => ({ role: h.role === 'model' ? 'model' : 'user', parts: [{ text: h.text }] })),
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            careLevel: { type: Type.STRING, enum: ["Emergency", "Doctor", "SelfCare", "Info"] },
            title: { type: Type.STRING },
            action: { type: Type.STRING }
          },
          required: ["reply", "careLevel", "title", "action"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response");
    return JSON.parse(jsonText) as SymptomAssessment;

  } catch (error) {
    console.error("Gemini Assessment Error:", error);
    return {
      reply: language === 'sw' ? "Samahani, jaribu tena baadaye." : "I'm having trouble analyzing right now.",
      careLevel: 'Info',
      title: 'Analysis Error',
      action: 'Please try again'
    };
  }
};
