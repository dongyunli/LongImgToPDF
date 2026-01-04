
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
            { text: "简要描述这张长图的内容。它是网页、聊天记录还是技术文档？是否包含自然的章节分割？请用中文回答，字数控制在40字以内。" },
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

    return response.text || "正在分析文档结构。";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "准备好转换您的文档。";
  }
}
