import "server-only";

import { getServerEnv } from "@/lib/env";

export const embeddingModel = "text-embedding-004";
export const embeddingDimensions = 768;

export async function embedText(text: string): Promise<number[]> {
  const env = getServerEnv();
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is required to generate embeddings.");
  }

  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  const response = await ai.models.embedContent({
    model: embeddingModel,
    contents: [text],
    config: { outputDimensionality: embeddingDimensions }
  });

  const values = response.embeddings?.[0]?.values;
  if (!values || values.length === 0) {
    throw new Error("Gemini embedding response did not include vector values.");
  }

  return values;
}
