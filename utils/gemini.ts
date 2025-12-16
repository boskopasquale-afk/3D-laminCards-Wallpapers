import { GoogleGenAI, SchemaType } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface SubjectCoordinates {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

// We ask Gemini to "look" at the image and tell us where the subject is.
// This is much more reliable than asking for a pixel-perfect image generation in this context.
export async function detectSubjectLocation(imageBase64: string): Promise<SubjectCoordinates> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Flash is fast and good at multimodal vision tasks
      contents: [
        {
          text: "Analyze this image and identify the main foreground subject. Return a JSON object with the bounding box coordinates (ymin, xmin, ymax, xmax) on a scale of 0 to 100. If there are multiple subjects, bound the group. If unclear, return a central box."
        },
        {
          inlineData: {
            mimeType: 'image/png',
            data: imageBase64.split(',')[1]
          }
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            ymin: { type: "NUMBER" },
            xmin: { type: "NUMBER" },
            ymax: { type: "NUMBER" },
            xmax: { type: "NUMBER" }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const coords = JSON.parse(text) as SubjectCoordinates;
    return coords;
  } catch (error) {
    console.error("Error detecting subject:", error);
    // Fallback to center if AI fails
    return { ymin: 20, xmin: 20, ymax: 80, xmax: 80 };
  }
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}