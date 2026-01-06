
import { GoogleGenAI, Type } from "@google/genai";

// Initialization - API key should be set in environment or config
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyBcB8-7RTl9IjJDpffY_8Dt13_offWNYOI';

// Initialize AI client
let ai: GoogleGenAI | null = null;
try {
  if (apiKey && apiKey.trim() !== '') {
    ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    console.log('✅ Gemini AI initialized successfully');
  } else {
    console.warn('⚠️ Gemini API key not found');
  }
} catch (error) {
  console.error('❌ Failed to initialize Gemini AI:', error);
  ai = null;
}

// Check if AI is available
export const isAIAvailable = () => {
  const available = !!ai;
  if (!available) {
    console.warn('AI not available - API key:', apiKey ? 'Set' : 'Not set');
  }
  return available;
};

// For Article Generation (Text only)
export const checkSymptoms = async (prompt: string, language: 'en' | 'sw' = 'en'): Promise<string> => {
  if (!ai) {
    // Mock response when AI is not configured
    console.warn('Gemini AI not configured. Using mock response.');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return language === 'sw' 
      ? "Huduma ya AI haijasanidiwa. Tafadhali ongeza VITE_GEMINI_API_KEY kwenye mazingira yako. Kwa sasa, tafadhali wasiliana na daktari kwa usaidizi zaidi."
      : "AI service is not configured. Please add VITE_GEMINI_API_KEY to your environment variables. For now, please consult with a doctor for further assistance.";
  }
  
  const systemInstruction = `
    You are NexaFya's medical content assistant. 
    Write professional, medically accurate, yet accessible content.
    Language: ${language === 'sw' ? 'Swahili' : 'English'}.
  `;

  try {
    if (!ai) {
      throw new Error('AI not initialized');
    }

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // Stable model - change to 'gemini-pro' if needed
      contents: typeof prompt === 'string' ? prompt : prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });
    return response.text || "";
  } catch (error: any) {
    console.error("Gemini Text Error:", error);
    return error?.message?.includes('API key') 
      ? "AI service configuration error. Please check API key."
      : "AI Service unavailable. Please try again later.";
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
    // Mock assessment when AI is not configured
    console.warn('Gemini AI not configured. Using mock assessment.');
    await new Promise(resolve => setTimeout(resolve, 1200));
    const lastMessage = history[history.length - 1]?.text || '';
    return {
      reply: language === 'sw'
        ? `Asante kwa kutoa maelezo yako. Kwa sasa, huduma ya AI haijasanidiwa. Tafadhali wasiliana na mtaalamu wa afya kwa tathmini kamili.`
        : `Thank you for providing your symptoms. Currently, AI service is not configured. Please consult with a healthcare provider for a complete assessment.`,
      careLevel: 'Doctor',
      title: language === 'sw' ? "Wasiliana na Daktari" : "Consult a Doctor",
      action: language === 'sw' 
        ? "Panga miadi na mtaalamu wa afya."
        : "Schedule an appointment with a healthcare professional."
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
    if (!ai) {
      throw new Error('AI not initialized');
    }

    console.log('🤖 Calling Gemini API with history length:', history.length);
    
    // Convert history to proper format
    const contents = history.map(h => ({
      role: h.role === 'model' ? 'model' : 'user',
      parts: [{ text: h.text }]
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash', // Stable model - change to 'gemini-pro' if needed
      contents: contents,
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
        },
        temperature: 0.7,
      }
    });

    const jsonText = response.text;
    console.log('✅ Gemini response received:', jsonText?.substring(0, 100));
    
    if (!jsonText) {
      throw new Error("Empty response from API");
    }
    
    const parsed = JSON.parse(jsonText) as SymptomAssessment;
    console.log('✅ Parsed assessment:', parsed.careLevel);
    return parsed;

  } catch (error: any) {
    console.error("❌ Gemini Assessment Error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      status: error?.status,
      apiKey: apiKey ? 'Set (length: ' + apiKey.length + ')' : 'Not set'
    });
    
    // Return user-friendly error message
    return {
      reply: language === 'sw' 
        ? "Samahani, kuna tatizo la kiufundi. Tafadhali jaribu tena baadaye au wasiliana na mtaalamu wa afya." 
        : error?.message?.includes('API key') || error?.message?.includes('authentication')
          ? "AI service configuration error. Please contact support."
          : "I'm having trouble analyzing right now. Please try again or consult a healthcare provider.",
      careLevel: 'Info',
      title: 'Service Unavailable',
      action: 'Please try again in a moment or consult a healthcare provider directly.'
    };
  }
};

// Generate medical article content
export const generateArticleContent = async (
  topic: string, 
  language: 'en' | 'sw' = 'en',
  targetLength: 'short' | 'medium' | 'long' = 'medium'
): Promise<string> => {
  if (!ai) {
    return "AI service is not configured. Please add VITE_GEMINI_API_KEY to your environment variables.";
  }

  const lengthMap = {
    short: '300-500 words',
    medium: '800-1200 words',
    long: '1500-2000 words'
  };

  const systemInstruction = `
    You are NexaFya's medical content writer. 
    Write professional, medically accurate, evidence-based health articles.
    Target length: ${lengthMap[targetLength]}.
    Language: ${language === 'sw' ? 'Swahili' : 'English'}.
    Format: Use clear headings, bullet points where appropriate, and include practical advice.
    Always include a disclaimer that this is informational and not a substitute for professional medical advice.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Write a comprehensive health article about: ${topic}`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        maxOutputTokens: targetLength === 'short' ? 1000 : targetLength === 'medium' ? 2000 : 4000,
      }
    });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Article Generation Error:", error);
    return "AI Service unavailable. Please try again later.";
  }
};

// Generate health tips
export const generateHealthTips = async (
  category: string,
  language: 'en' | 'sw' = 'en',
  count: number = 5
): Promise<string[]> => {
  if (!ai) {
    return ["AI service is not configured."];
  }

  const systemInstruction = `
    You are NexaFya's health tips generator.
    Generate ${count} practical, actionable health tips about ${category}.
    Language: ${language === 'sw' ? 'Swahili' : 'English'}.
    Format: Return as a JSON array of strings, each string is one tip.
    Make tips concise (1-2 sentences each) and evidence-based.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Generate ${count} health tips about ${category}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
        temperature: 0.8,
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response");
    return JSON.parse(jsonText) as string[];
  } catch (error) {
    console.error("Gemini Health Tips Error:", error);
    return ["Unable to generate tips at this time."];
  }
};

// Analyze prescription text (OCR or manual input)
export const analyzePrescription = async (
  prescriptionText: string,
  language: 'en' | 'sw' = 'en'
): Promise<{
  medications: Array<{ name: string; dosage: string; frequency: string; duration: string }>;
  doctorName?: string;
  date?: string;
  notes?: string;
}> => {
  if (!ai) {
    return { medications: [] };
  }

  const systemInstruction = `
    You are NexaFya's prescription analyzer.
    Extract structured information from prescription text.
    Language: ${language === 'sw' ? 'Swahili' : 'English'}.
    
    OUTPUT FORMAT: JSON object with:
    - medications: Array of { name, dosage, frequency, duration }
    - doctorName: Doctor's name if found
    - date: Prescription date if found
    - notes: Any additional notes
    
    Be accurate and only extract information that is clearly stated.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Analyze this prescription and extract structured information:\n\n${prescriptionText}`,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            medications: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  dosage: { type: Type.STRING },
                  frequency: { type: Type.STRING },
                  duration: { type: Type.STRING }
                },
                required: ["name", "dosage", "frequency", "duration"]
              }
            },
            doctorName: { type: Type.STRING },
            date: { type: Type.STRING },
            notes: { type: Type.STRING }
          },
          required: ["medications"]
        },
        temperature: 0.3, // Lower temperature for more accurate extraction
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("Empty response");
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Prescription Analysis Error:", error);
    return { medications: [] };
  }
};

// Translate medical content
export const translateMedicalContent = async (
  text: string,
  targetLanguage: 'en' | 'sw'
): Promise<string> => {
  if (!ai) {
    return text; // Return original if AI unavailable
  }

  const systemInstruction = `
    You are NexaFya's medical translator.
    Translate medical content accurately while preserving medical terminology.
    Target language: ${targetLanguage === 'sw' ? 'Swahili' : 'English'}.
    Maintain professional tone and accuracy of medical terms.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Translate this medical content:\n\n${text}`,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      }
    });
    return response.text || text;
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return text;
  }
};
