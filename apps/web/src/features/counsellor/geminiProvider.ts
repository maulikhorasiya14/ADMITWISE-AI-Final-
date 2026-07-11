import "server-only";

import { getServerEnv } from "@/lib/env";
import {
  aiProviderTimeoutMs,
  providerResponseSchema,
  type AIProvider,
  type AIProviderRequest,
  type EvidenceReference,
  type GroundingRecord,
  type HistoryMessage,
  type ProviderResponse
} from "./counsellorTypes";
import { buildMultiTurnContents } from "./counsellorCore";
import type { AgentContent } from "./agentLoop";

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
        responseMimeType: "application/json"
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
    return yield* this.synthesizeStream(input);
  }

  // ── Shared streaming synthesis (used by stream() and streamWithAgent()) ─────

  private async *synthesizeStream(input: AIProviderRequest): AsyncGenerator<string, ProviderResponse, unknown> {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: this.config.apiKey });

    const contents = buildMultiTurnContents(input.history, input.question, input.evidenceBlock, input.allowedEvidenceIds);

    const streamResult = await ai.models.generateContentStream({
      model: this.config.model,
      config: { systemInstruction: input.systemInstruction, temperature: 0.2 },
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

    return await this.extractStructuredEvidence({ answer: fullText, input, ai });
  }

  // ── Tool-calling agent streaming ─────────────────────────────────────────────

  async *streamWithAgent(input: {
    question: string;
    history: HistoryMessage[];
    systemInstruction: string;
    profileSummary?: string;
    recommendationRecords: GroundingRecord[];
    recommendationCollegeIds: string[];
  }): AsyncGenerator<string, ProviderResponse & { allowedEvidence: EvidenceReference[] }, unknown> {
    const { GoogleGenAI } = await import("@google/genai");
    const { agentToolDeclarations, executeSearchCollegeDb, executeSearchInternet } = await import("./agentTools");
    const { runAgentToolLoop } = await import("./agentLoop");
    const { buildAgentPrimerText, buildAgentToolContents, buildEvidenceBlock } = await import("./counsellorCore");

    const ai = new GoogleGenAI({ apiKey: this.config.apiKey });
    const primerText = buildAgentPrimerText(input.profileSummary, input.recommendationRecords);
    const initialContents = buildAgentToolContents(input.history, input.question, primerText);

    const callModel = async (contents: AgentContent[]): Promise<{ functionCalls: Array<{ name: string; args: Record<string, unknown> }> }> => {
      const response = (await ai.models.generateContent({
        model: this.config.model,
        config: {
          systemInstruction: input.systemInstruction,
          temperature: 0.2,
          tools: [{ functionDeclarations: agentToolDeclarations }],
          automaticFunctionCalling: { disable: true }
        },
        contents: contents as unknown as import("@google/genai").Content[]
      })) as GeminiGenerateResponse;

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
      for (const part of parts as Array<{ functionCall?: { name?: string; args?: Record<string, unknown> } }>) {
        if (part.functionCall?.name) {
          functionCalls.push({ name: part.functionCall.name, args: part.functionCall.args ?? {} });
        }
      }
      return { functionCalls };
    };

    const loopResult = await runAgentToolLoop({
      initialContents,
      callModel,
      executors: {
        search_college_db: executeSearchCollegeDb,
        search_internet: executeSearchInternet
      }
    });

    const allRecords = [...input.recommendationRecords, ...loopResult.records];
    const evidenceBlock = buildEvidenceBlock({
      question: input.question,
      history: input.history,
      profileSummary: input.profileSummary,
      records: loopResult.records,
      deterministicRecommendations: input.recommendationRecords,
      warnings: [],
      missingData: []
    });

    const finalResponse = yield* this.synthesizeStream({
      question: input.question,
      history: input.history,
      systemInstruction: input.systemInstruction,
      evidenceBlock,
      allowedEvidenceIds: allRecords.map((record) => record.evidence.sourceId)
    });

    return { ...finalResponse, allowedEvidence: allRecords.map((record) => record.evidence) };
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
