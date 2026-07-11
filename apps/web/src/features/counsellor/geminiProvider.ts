import "server-only";

import { getServerEnv } from "@/lib/env";
import {
  aiProviderTimeoutMs,
  providerResponseSchema,
  type AIProvider,
  type AIProviderRequest,
  type HistoryMessage,
  type ProviderResponse
} from "./counsellorTypes";
import { buildMultiTurnContents } from "./counsellorCore";

// ── Config helper ─────────────────────────────────────────────────────────────

export function getGeminiConfig() {
  const env = getServerEnv();
  if (!env.GEMINI_API_KEY) {
    return {
      success: false as const,
      message: "GEMINI_API_KEY is not configured."
    };
  }

  return {
    success: true as const,
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL ?? "gemini-2.5-flash"
  };
}

// ── Types for SDK response shapes ─────────────────────────────────────────────

type GeminiContent = {
  role?: string;
  parts: Array<{ text?: string }>;
};

type GeminiCandidate = {
  content?: GeminiContent;
};

type GeminiGenerateResponse = {
  candidates?: GeminiCandidate[];
};

type GeminiChunk = {
  text?: string;
};

// ── Gemini AI Provider ────────────────────────────────────────────────────────

export class GeminiAIProvider implements AIProvider {
  constructor(
    private readonly config: {
      apiKey: string;
      model: string;
    }
  ) {}

  // ── Non-streaming answer (backward compat) ──────────────────────────────────

  async answer(input: AIProviderRequest): Promise<ProviderResponse> {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: this.config.apiKey });

    const contents = buildMultiTurnContents(
      input.history,
      input.question,
      input.evidenceBlock,
      input.allowedEvidenceIds
    );

    const response = await ai.models.generateContent({
      model: this.config.model,
      config: {
        systemInstruction: input.systemInstruction,
        temperature: 0.2,
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      },
      contents
    }) as GeminiGenerateResponse;

    const text = response.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();

    if (!text) {
      throw new Error("Gemini response was empty.");
    }

    const parsedJson = JSON.parse(text) as unknown;
    return providerResponseSchema.parse(parsedJson);
  }

  // ── Streaming response ──────────────────────────────────────────────────────

  async *stream(input: AIProviderRequest): AsyncGenerator<string, ProviderResponse, unknown> {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: this.config.apiKey });

    const contents = buildMultiTurnContents(
      input.history,
      input.question,
      input.evidenceBlock,
      input.allowedEvidenceIds
    );

    // Stream plain text first for real-time display
    const streamResult = await ai.models.generateContentStream({
      model: this.config.model,
      config: {
        systemInstruction: input.systemInstruction,
        temperature: 0.2,
        tools: [{ googleSearch: {} }]
      },
      contents
    });

    let fullText = "";
    for await (const chunk of streamResult) {
      const chunkText = (chunk as GeminiChunk).text ?? "";
      if (chunkText) {
        fullText += chunkText;
        yield chunkText;
      }
    }

    // After streaming is done, do a second focused call to extract structured evidence
    // This avoids mid-stream JSON parsing issues while keeping streaming UX
    const structuredResponse = await this.extractStructuredEvidence({
      answer: fullText,
      input,
      ai
    });

    return structuredResponse;
  }

  // ── Evidence extraction post-stream ────────────────────────────────────────

  private async extractStructuredEvidence(opts: {
    answer: string;
    input: AIProviderRequest;
    ai: unknown;
  }): Promise<ProviderResponse> {
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: this.config.apiKey });

      const extractionPrompt = [
        "Given this AI counsellor answer and the list of allowed evidence IDs, extract which evidence IDs were actually referenced or relevant.",
        "Return strict JSON: { answer, status, evidenceSourceIds, warnings, missingData }",
        `Allowed evidence IDs: ${opts.input.allowedEvidenceIds.join(", ") || "none"}`,
        `Answer to analyse:\n${opts.answer}`,
        "Rules:",
        "- status must be 'grounded' if the answer uses published evidence, 'insufficient_data' if it cannot be grounded.",
        "- evidenceSourceIds must only include IDs from the allowed list above.",
        "- warnings: array of any caveats.",
        "- missingData: array of what data was unavailable.",
        "- answer: copy the answer text exactly as provided, do not modify it."
      ].join("\n");

      const extractResponse = await ai.models.generateContent({
        model: this.config.model,
        config: {
          temperature: 0,
          responseMimeType: "application/json"
        },
        contents: [{ role: "user" as const, parts: [{ text: extractionPrompt }] }]
      }) as GeminiGenerateResponse;

      const text = extractResponse.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .trim();

      if (!text) throw new Error("Empty extraction response");

      return providerResponseSchema.parse(JSON.parse(text));
    } catch {
      // Fallback: return the answer with no evidence IDs
      return {
        answer: opts.answer,
        status: "grounded",
        evidenceSourceIds: [],
        warnings: [],
        missingData: []
      };
    }
  }
}

// ── Streaming helper: read SSE stream from the API route ──────────────────────

export type StreamChunkPayload =
  | { type: "text"; content: string }
  | { type: "evidence"; data: import("./counsellorTypes").EvidenceReference[] }
  | { type: "meta"; warnings: string[]; missingData: string[]; status: string }
  | { type: "done" }
  | { type: "error"; message: string };

export async function* readCounsellorStream(
  response: Response
): AsyncGenerator<StreamChunkPayload> {
  if (!response.body) {
    yield { type: "error", message: "No response body from server." };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;
        try {
          const chunk = JSON.parse(jsonStr) as StreamChunkPayload;
          yield chunk;
        } catch {
          // malformed chunk — ignore
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
