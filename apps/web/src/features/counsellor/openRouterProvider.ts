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
  type OllamaMessage
} from "./ollamaMessages";
import type { AgentContent } from "./agentLoop";
import { OpenRouter } from "@openrouter/sdk";

// Define the 3 models as requested
const OPENROUTER_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free"
];

function getRandomModel(): string {
  const randomIndex = Math.floor(Math.random() * OPENROUTER_MODELS.length);
  return OPENROUTER_MODELS[randomIndex];
}

export function getOpenRouterConfig() {
  const env = getServerEnv();
  return {
    apiKey: env.OPENROUTER_API_KEY
  };
}

export class OpenRouterAIProvider implements AIProvider {
  private openrouter: OpenRouter;

  constructor(private readonly config: { apiKey?: string }) {
    if (!this.config.apiKey) {
      throw new Error("OPENROUTER_API_KEY is not configured.");
    }
    this.openrouter = new OpenRouter({ apiKey: this.config.apiKey });
  }

  private async chatWithFallback(messages: OllamaMessage[], isExtraction = false): Promise<string> {
    // Try to pick a random model, and fallback to others if it fails
    const shuffledModels = [...OPENROUTER_MODELS].sort(() => 0.5 - Math.random());

    for (let i = 0; i < shuffledModels.length; i++) {
      const model = shuffledModels[i];
      try {
        const response = await this.openrouter.chat.send({
          chatRequest: {
            model,
            messages: messages as any,
            stream: false
          }
        });
        
        // Handle extraction for JSON 
        // @openrouter/sdk format might not natively have response_format yet, so we just rely on prompt for :free models
        // @ts-ignore
        const content = response.choices?.[0]?.message?.content || "";
        if (content) return content;
      } catch (err) {
        console.error(`OpenRouter model ${model} failed:`, err);
        // If this is the last model, throw
        if (i === shuffledModels.length - 1) {
          throw err;
        }
      }
    }
    throw new Error("All OpenRouter models failed.");
  }

  async answer(input: AIProviderRequest): Promise<ProviderResponse> {
    const contents = buildMultiTurnContents(input.history, input.question, input.evidenceBlock, input.allowedEvidenceIds);
    const messages: OllamaMessage[] = [
      { role: "system", content: input.systemInstruction },
      ...agentContentsToOllamaMessages(contents as AgentContent[])
    ];

    const content = await this.chatWithFallback(messages);

    if (!content) {
      throw new Error("OpenRouter response was empty.");
    }

    return await this.extractStructuredEvidence({ answer: content, allowedEvidenceIds: input.allowedEvidenceIds });
  }

  async *stream(input: AIProviderRequest): AsyncGenerator<string, ProviderResponse, unknown> {
    return yield* this.synthesizeStream(input);
  }

  private async *synthesizeStream(input: AIProviderRequest): AsyncGenerator<string, ProviderResponse, unknown> {
    const contents = buildMultiTurnContents(input.history, input.question, input.evidenceBlock, input.allowedEvidenceIds);
    const messages: OllamaMessage[] = [
      { role: "system", content: input.systemInstruction },
      ...agentContentsToOllamaMessages(contents as AgentContent[])
    ];

    let fullText = "";
    
    // Auto fallback for streaming
    const shuffledModels = [...OPENROUTER_MODELS].sort(() => 0.5 - Math.random());
    let streamSuccess = false;

    for (let i = 0; i < shuffledModels.length; i++) {
      const model = shuffledModels[i];
      try {
        const stream = await this.openrouter.chat.send({
          chatRequest: {
            model,
            messages: messages as any,
            stream: true
          }
        });

        for await (const chunk of stream) {
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            yield content;
          }
        }
        
        streamSuccess = true;
        break; // Stop after first successful stream
      } catch (err) {
        console.error(`OpenRouter stream with ${model} failed:`, err);
        if (i === shuffledModels.length - 1) {
          throw err;
        }
      }
    }

    if (!streamSuccess) {
      throw new Error("All OpenRouter models failed during streaming.");
    }

    return await this.extractStructuredEvidence({ answer: fullText, allowedEvidenceIds: input.allowedEvidenceIds });
  }

  async *streamWithAgent(input: {
    question: string;
    history: HistoryMessage[];
    systemInstruction: string;
    profileSummary?: string;
    recommendationRecords: GroundingRecord[];
    recommendationCollegeIds: string[];
  }): AsyncGenerator<string, ProviderResponse & { allowedEvidence: EvidenceReference[] }, unknown> {
    const { executeSearchCollegeDb, executeSearchInternet } = await import("./agentTools");
    const { buildEvidenceBlock } = await import("./counsellorCore");

    // Strict internet search only
    const [webResult] = await Promise.all([
      executeSearchInternet({ query: input.question })
    ]);

    const combinedRecords = [
      ...webResult.records
    ];

    const evidenceBlock = buildEvidenceBlock({
      question: input.question,
      history: input.history,
      profileSummary: input.profileSummary,
      records: [...webResult.records],
      deterministicRecommendations: [],
      warnings: [],
      missingData: []
    });

    const finalResponse = yield* this.synthesizeStream({
      question: input.question,
      history: input.history,
      systemInstruction: input.systemInstruction,
      evidenceBlock,
      allowedEvidenceIds: combinedRecords.map((record) => record.evidence.sourceId)
    });

    return { ...finalResponse, allowedEvidence: combinedRecords.map((record) => record.evidence) };
  }

  private async extractStructuredEvidence(opts: {
    answer: string;
    allowedEvidenceIds: string[];
  }): Promise<ProviderResponse> {
    try {
      const extractionPrompt = [
        "You are a strict JSON formatter. ONLY output valid JSON. DO NOT wrap in markdown blocks like ```json.",
        "Given this AI counsellor answer and the list of allowed evidence IDs, extract which evidence IDs were actually referenced or relevant.",
        `Allowed evidence IDs: ${opts.allowedEvidenceIds.join(", ") || "none"}`,
        `Answer to analyse:\n${opts.answer}`,
        "Rules:",
        "- status must be 'grounded' if the answer uses ANY of the allowed evidence (including web search results). It must only be 'insufficient_data' if you truly couldn't answer the question.",
        "- evidenceSourceIds must only include IDs from the allowed list above. Include the IDs of sources that were used, including web search results.",
        "- warnings: array of any caveats.",
        "- missingData: array of what data was unavailable.",
        "- answer: copy the answer text exactly as provided, do not modify it."
      ].join("\n");

      const responseText = await this.chatWithFallback([{ role: "user", content: extractionPrompt }], true);
      
      // Cleanup markdown block if model ignored the prompt
      let cleanJson = responseText.trim();
      if (cleanJson.startsWith("```json")) {
        cleanJson = cleanJson.replace(/```json/g, "").replace(/```/g, "").trim();
      }

      return providerResponseSchema.parse(JSON.parse(cleanJson));
    } catch {
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
