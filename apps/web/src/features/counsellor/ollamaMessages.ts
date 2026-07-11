import type { AgentContent, ModelFunctionCall } from "./agentLoop.ts";


export type OllamaToolCall = { function: { name: string; arguments: Record<string, unknown> } };

export type OllamaMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OllamaToolCall[];
};


export function agentContentsToOllamaMessages(contents: AgentContent[]): OllamaMessage[] {
  const messages: OllamaMessage[] = [];

  for (const entry of contents) {
    const functionCalls = entry.parts.filter((part) => part.functionCall).map((part) => part.functionCall!);
    const functionResponses = entry.parts.filter((part) => part.functionResponse).map((part) => part.functionResponse!);
    const text = entry.parts.filter((part) => part.text !== undefined).map((part) => part.text).join("");

    if (functionCalls.length > 0) {
      messages.push({
        role: "assistant",
        content: text,
        tool_calls: functionCalls.map((call) => ({ function: { name: call.name, arguments: call.args ?? {} } }))
      });
      continue;
    }

    if (functionResponses.length > 0) {
      for (const response of functionResponses) {
        messages.push({ role: "tool", content: JSON.stringify(response.response ?? {}) });
      }
      continue;
    }

    messages.push({ role: entry.role === "model" ? "assistant" : "user", content: text });
  }

  return messages;
}


export function ollamaToolCallsToFunctionCalls(toolCalls: OllamaToolCall[] | undefined): ModelFunctionCall[] {
  if (!toolCalls) return [];
  return toolCalls.map((call) => ({ name: call.function.name, args: call.function.arguments ?? {} }));
}


export const providerResponseJsonSchema = {
  type: "object",
  properties: {
    answer: { type: "string" },
    status: { type: "string", enum: ["grounded", "insufficient_data", "configuration_error"] },
    evidenceSourceIds: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
    missingData: { type: "array", items: { type: "string" } }
  },
  required: ["answer", "status", "evidenceSourceIds", "warnings", "missingData"]
};
