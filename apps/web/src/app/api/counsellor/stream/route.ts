import { NextResponse } from "next/server";
import { buildStreamingContext } from "@/features/counsellor/counsellorService";
import { GeminiAIProvider, getGeminiConfig } from "@/features/counsellor/geminiProvider";
import { counsellorStreamRequestSchema, type StreamChunk } from "@/features/counsellor/counsellorTypes";
import { counsellorSystemInstruction, buildEvidenceBlock, validateProviderResponse } from "@/features/counsellor/counsellorCore";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow Vercel up to 60s for streaming

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = counsellorStreamRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body format." },
        { status: 400 }
      );
    }

    const geminiConfig = getGeminiConfig();
    const encoder = new TextEncoder();

    if (!geminiConfig.success) {
      const stream = new ReadableStream({
        start(controller) {
          const chunk: StreamChunk = {
            type: "meta",
            warnings: ["Missing GEMINI_API_KEY."],
            missingData: ["AI provider configuration is incomplete."],
            status: "configuration_error"
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));

          const textChunk: StreamChunk = {
            type: "text",
            content: "Gemini is not configured yet. Add GEMINI_API_KEY on the server to enable grounded counsellor answers."
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunk)}\n\n`));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        }
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
    }

    const contextResult = await buildStreamingContext(
      parsed.data,
      parsed.data.recommendationCollegeIds
    );
    if (!contextResult.success) {
      return NextResponse.json(
        { success: false, error: contextResult.message },
        { status: contextResult.status }
      );
    }

    const provider = new GeminiAIProvider({
      apiKey: geminiConfig.apiKey,
      model: geminiConfig.model
    });

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const streamGen = provider.stream({
            question: contextResult.data.question,
            history: contextResult.data.history,
            systemInstruction: counsellorSystemInstruction,
            evidenceBlock: buildEvidenceBlock(contextResult.data),
            allowedEvidenceIds: [...contextResult.data.deterministicRecommendations, ...contextResult.data.records].map(r => r.evidence.sourceId)
          });

          while (true) {
            const { value, done } = await streamGen.next();
            if (done) {
              const providerResponse = value;
              
              if (providerResponse.evidenceSourceIds && providerResponse.evidenceSourceIds.length > 0) {
                const allowedEvidence = [...contextResult.data.deterministicRecommendations, ...contextResult.data.records].map(r => r.evidence);
                const validatedResponse = validateProviderResponse(providerResponse, allowedEvidence);
                
                const evChunk: StreamChunk = { type: "evidence", data: validatedResponse.evidence };
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(evChunk)}\n\n`));
              }

              const metaChunk: StreamChunk = {
                type: "meta",
                status: providerResponse.status,
                warnings: providerResponse.warnings,
                missingData: providerResponse.missingData
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(metaChunk)}\n\n`));
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
              break;
            } else {
              const chunk: StreamChunk = { type: "text", content: value as string };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
          }
        } catch (error) {
          console.error("Streaming error:", error);
          const chunk: StreamChunk = { type: "error", message: "Failed to generate response." };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });

  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
