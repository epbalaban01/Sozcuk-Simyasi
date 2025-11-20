import { GoogleGenAI, Type } from "@google/genai";
import { CombinationResult } from "../types";

// Initialize the Gemini API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Cache for combinations to save API calls and provide instant results for known recipes
const recipeCache = new Map<string, CombinationResult>();

export const combineElements = async (
  elementA: string,
  elementB: string
): Promise<CombinationResult | null> => {
  // Sort to ensure Fire + Water is same as Water + Fire
  const sorted = [elementA, elementB].sort();
  const key = `${sorted[0]}+${sorted[1]}`;

  if (recipeCache.has(key)) {
    return recipeCache.get(key) || null;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Combine the concepts of "${elementA}" and "${elementB}" to create a new single object, concept, or entity. 
      Return the result in Turkish.
      Examples:
      Fire + Water = Steam (Buhar)
      Earth + Water = Mud (Çamur)
      Wind + Earth = Dust (Toz)
      
      Be creative, funny, or logical. Avoid creating sentences, just a noun or short phrase.
      Provide a matching emoji.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: {
              type: Type.STRING,
              description: "The resulting name in Turkish",
            },
            emoji: {
              type: Type.STRING,
              description: "A single emoji representing the result",
            },
          },
          required: ["name", "emoji"],
        },
        temperature: 0.7, // Slightly creative but consistent
      },
    });

    const text = response.text;
    if (!text) return null;

    const result = JSON.parse(text) as CombinationResult;
    
    // Cache the result
    recipeCache.set(key, result);
    
    return result;
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Fallback in case of error to allow game to continue gracefully
    return null;
  }
};