
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes the uploaded long image to provide context or smart splitting advice
 */
export async function analyzeDocument(base64DataUrl: string): Promise<string> {
  try {
    // Extract actual base64 data
    const base64 = base64DataUrl.split(',')[1];
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: "Briefly describe the contents of this long document image. Is it a webpage, a chat, or a technical document? Mention if there are natural section breaks. Keep it under 40 words." },
            { 
              inlineData: {
                mimeType: "image/jpeg",
                data: base64
              }
            }
          ]
        }
      ],
      config: {
        maxOutputTokens: 100,
        temperature: 0.7
      }
    });

    return response.text || "Analyzed document structure.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Ready to convert your document.";
  }
}
