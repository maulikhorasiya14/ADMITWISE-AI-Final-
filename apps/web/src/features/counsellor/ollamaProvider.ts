import "server-only";

import { getServerEnv } from "@/lib/env";
import {
  providerResponseSchema,
  type AIProvider,
  type AIProviderRequest,
  type EvidenceReference,
  type GroundingRecord,
  type HistoryMessage,
  type ProviderResponse
} from "./counsellorTypes";
import { buildMultiTurnContents } from "./counsellorCore";
import {
  agentContentsToOllamaMessages,
  ollamaToolCallsToFunctionCalls,
  providerResponseJsonSchema,
  type OllamaMessage,
  type OllamaToolCall
} from "./ollamaMessages";
import type { AgentContent, CallModelResult } from "./agentLoop";

// ── Config ────────────────────────────────────────────────────────────────────

export function getOllamaConfig() {
  const env = getServerEnv();
  return {
    baseUrl: env.OLLAMA_BASE_URL,
    model: env.OLLAMA_MODEL,
    embedModel: env.OLLAMA_EMBED_MODEL
  };
}

export async function checkOllamaReachable(baseUrl: string): Promise<{ success: boolean; message?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const response = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timer);
    if (!response.ok) {
      return { success: false, message: `Ollama responded with HTTP ${response.status}.` };
    }
    return { success: true };
  } catch {
    return { success: false, message: `Cannot reach Ollama at ${baseUrl}.` };
  }
}

// ── Ollama HTTP calls ────────────────────────────────────────────────────────

type OllamaChatResponse = {
  message: { role: string; content: string; tool_calls?: OllamaToolCall[] };
  done: boolean;
};

async function ollamaChat(opts: {
  baseUrl: string;
  model: string;
  messages: OllamaMessage[];
  tools?: unknown[];
  format?: unknown;
}): Promise<OllamaChatResponse> {
  const response = await fetch(`${opts.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.model,
      messages: opts.messages,
      tools: opts.tools,
      format: opts.format,
      stream: false
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama chat request failed: HTTP ${response.status}`);
  }

  return (await response.json()) as OllamaChatResponse;
}

async function* ollamaChatStream(opts: {
  baseUrl: string;
  model: string;
  messages: OllamaMessage[];
}): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${opts.baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: opts.model, messages: opts.messages, stream: true })
  });

  if (!response.ok || !response.body) {
    throw new Error(`Ollama chat stream request failed: HTTP ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      const chunk = JSON.parse(line) as OllamaChatResponse;
      if (chunk.message?.content) {
        yield chunk.message.content;
      }
    }
  }
}

// ── Ollama AI Provider ───────────────────────────────────────────────────────

export class OllamaAIProvider implements AIProvider {
  constructor(private readonly config: { baseUrl: string; model: string }) {}

  // ── Non-streaming answer (backward compat) ──────────────────────────────────

  async answer(input: AIProviderRequest): Promise<ProviderResponse> {
    const contents = buildMultiTurnContents(input.history, input.question, input.evidenceBlock, input.allowedEvidenceIds);
    const messages: OllamaMessage[] = [
      { role: "system", content: input.systemInstruction },
      ...agentContentsToOllamaMessages(contents as AgentContent[])
    ];

    const response = await ollamaChat({
      baseUrl: this.config.baseUrl,
      model: this.config.model,
      messages,
      format: providerResponseJsonSchema
    });

    if (!response.message.content) {
      throw new Error("Ollama response was empty.");
    }

    return providerResponseSchema.parse(JSON.parse(response.message.content));
  }

  // ── Streaming response ──────────────────────────────────────────────────────

  async *stream(input: AIProviderRequest): AsyncGenerator<string, ProviderResponse, unknown> {
    return yield* this.synthesizeStream(input);
  }

  // ── Shared streaming synthesis (used by stream() and streamWithAgent()) ─────

  private async *synthesizeStream(input: AIProviderRequest): AsyncGenerator<string, ProviderResponse, unknown> {
    const contents = buildMultiTurnContents(input.history, input.question, input.evidenceBlock, input.allowedEvidenceIds);
    const messages: OllamaMessage[] = [
      { role: "system", content: input.systemInstruction },
      ...agentContentsToOllamaMessages(contents as AgentContent[])
    ];

    let fullText = "";
    for await (const chunkText of ollamaChatStream({ baseUrl: this.config.baseUrl, model: this.config.model, messages })) {
      fullText += chunkText;
      yield chunkText;
    }

    return await this.extractStructuredEvidence({ answer: fullText, allowedEvidenceIds: input.allowedEvidenceIds });
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
    const { agentToolDeclarations, executeSearchCollegeDb, executeSearchInternet } = await import("./agentTools");
    const { runAgentToolLoop } = await import("./agentLoop");
    const { buildAgentPrimerText, buildAgentToolContents, buildEvidenceBlock } = await import("./counsellorCore");

    const primerText = buildAgentPrimerText(input.profileSummary, input.recommendationRecords);
    const initialContents = buildAgentToolContents(input.history, input.question, primerText);

    const callModel = async (contents: AgentContent[]): Promise<CallModelResult> => {
      const messages: OllamaMessage[] = [
        { role: "system", content: input.systemInstruction },
        ...agentContentsToOllamaMessages(contents)
      ];
      const response = await ollamaChat({
        baseUrl: this.config.baseUrl,
        model: this.config.model,
        messages,
        tools: agentToolDeclarations
      });
      return { functionCalls: ollamaToolCallsToFunctionCalls(response.message.tool_calls) };
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
    allowedEvidenceIds: string[];
  }): Promise<ProviderResponse> {
    try {
      const extractionPrompt = [
        "Given this AI counsellor answer and the list of allowed evidence IDs, extract which evidence IDs were actually referenced or relevant.",
        `Allowed evidence IDs: ${opts.allowedEvidenceIds.join(", ") || "none"}`,
        `Answer to analyse:\n${opts.answer}`,
        "Rules:",
        "- status must be 'grounded' if the answer uses published evidence, 'insufficient_data' if it cannot be grounded.",
        "- evidenceSourceIds must only include IDs from the allowed list above.",
        "- warnings: array of any caveats.",
        "- missingData: array of what data was unavailable.",
        "- answer: copy the answer text exactly as provided, do not modify it."
      ].join("\n");

      const response = await ollamaChat({
        baseUrl: this.config.baseUrl,
        model: this.config.model,
        messages: [{ role: "user", content: extractionPrompt }],
        format: providerResponseJsonSchema
      });

      if (!response.message.content) throw new Error("Empty extraction response");

      return providerResponseSchema.parse(JSON.parse(response.message.content));
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
