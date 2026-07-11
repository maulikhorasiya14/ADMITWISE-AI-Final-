import { z } from "zod";
import { studentProfileSchema } from "../profile/profileSchema.ts";

export const counsellorQuestionMaxLength = 700;
export const aiProviderTimeoutMs = 20000;

export const counsellorQuestionSchema = z
  .string()
  .trim()
  .min(8, "Ask a little more detail so the counsellor can ground the answer.")
  .max(counsellorQuestionMaxLength, `Question must be ${counsellorQuestionMaxLength} characters or fewer.`);

export const counsellorRequestSchema = z.object({
  question: counsellorQuestionSchema,
  profile: studentProfileSchema.optional()
});

// ── Streaming request (new) ───────────────────────────────────────────────────

export const historyMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string()
});

export const counsellorStreamRequestSchema = z.object({
  question: counsellorQuestionSchema,
  history: z.array(historyMessageSchema).max(20).default([]),
  profile: studentProfileSchema.optional(),
  recommendationCollegeIds: z.array(z.string()).optional()
});

// ── Evidence ──────────────────────────────────────────────────────────────────

export const evidenceReferenceSchema = z.object({
  sourceId: z.string().min(1),
  sourceLabel: z.string().min(1),
  sourceType: z.string().min(1),
  recordYear: z.number().int().optional(),
  officialUrl: z.string().url().optional(),
  sourceCategory: z.enum(["database", "web_search", "recommendation"]).optional()
});

export const counsellorResponseSchema = z.object({
  answer: z.string().min(1),
  status: z.enum(["grounded", "insufficient_data", "configuration_error"]),
  evidence: z.array(evidenceReferenceSchema),
  warnings: z.array(z.string()),
  missingData: z.array(z.string())
});

export const providerResponseSchema = counsellorResponseSchema.omit({
  evidence: true
}).extend({
  evidenceSourceIds: z.array(z.string())
});

// ── Chat message (new) ────────────────────────────────────────────────────────

export const chatMessageStatusSchema = z.enum([
  "grounded",
  "insufficient_data",
  "configuration_error",
  "streaming",
  "error"
]);

export const chatMessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  evidence: z.array(evidenceReferenceSchema).default([]),
  warnings: z.array(z.string()).default([]),
  missingData: z.array(z.string()).default([]),
  status: chatMessageStatusSchema.optional(),
  timestamp: z.number()
});

// ── Stream chunk types (new) ──────────────────────────────────────────────────

export type StreamChunk =
  | { type: "text"; content: string }
  | { type: "evidence"; data: EvidenceReference[] }
  | { type: "meta"; warnings: string[]; missingData: string[]; status: string }
  | { type: "done" }
  | { type: "error"; message: string };

// ── Exported types ────────────────────────────────────────────────────────────

export type CounsellorRequest = z.infer<typeof counsellorRequestSchema>;
export type CounsellorStreamRequest = z.infer<typeof counsellorStreamRequestSchema>;
export type HistoryMessage = z.infer<typeof historyMessageSchema>;
export type EvidenceReference = z.infer<typeof evidenceReferenceSchema>;
export type CounsellorResponse = z.infer<typeof counsellorResponseSchema>;
export type ProviderResponse = z.infer<typeof providerResponseSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatMessageStatus = z.infer<typeof chatMessageStatusSchema>;

export type GroundingRecord = {
  evidence: EvidenceReference;
  summary: string;
  publicationStatus: "published" | "unpublished" | "staging";
};

export type GroundingContext = {
  question: string;
  history: HistoryMessage[];
  profileSummary?: string;
  records: GroundingRecord[];
  deterministicRecommendations: GroundingRecord[];
  warnings: string[];
  missingData: string[];
};

export type AIProviderRequest = {
  question: string;
  history: HistoryMessage[];
  systemInstruction: string;
  evidenceBlock: string;
  allowedEvidenceIds: string[];
};

export interface AIProvider {
  answer(input: AIProviderRequest): Promise<ProviderResponse>;
  stream(input: AIProviderRequest): AsyncGenerator<string, ProviderResponse, unknown>;
}
