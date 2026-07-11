import assert from "node:assert/strict";
import test from "node:test";
import {
  agentContentsToOllamaMessages,
  ollamaToolCallsToFunctionCalls
} from "../src/features/counsellor/ollamaMessages.ts";
import type { AgentContent } from "../src/features/counsellor/agentLoop.ts";

test("agentContentsToOllamaMessages maps plain text turns to user/assistant messages", () => {
  const contents: AgentContent[] = [
    { role: "user", parts: [{ text: "Hello" }] },
    { role: "model", parts: [{ text: "Hi there" }] }
  ];

  const messages = agentContentsToOllamaMessages(contents);

  assert.deepEqual(messages, [
    { role: "user", content: "Hello" },
    { role: "assistant", content: "Hi there" }
  ]);
});

test("agentContentsToOllamaMessages maps a model functionCall turn to an assistant message with tool_calls", () => {
  const contents: AgentContent[] = [
    { role: "model", parts: [{ functionCall: { name: "search_college_db", args: { query: "cutoffs" } } }] }
  ];

  const messages = agentContentsToOllamaMessages(contents);

  assert.deepEqual(messages, [
    {
      role: "assistant",
      content: "",
      tool_calls: [{ function: { name: "search_college_db", arguments: { query: "cutoffs" } } }]
    }
  ]);
});

test("agentContentsToOllamaMessages maps a functionResponse turn to one tool message per response", () => {
  const contents: AgentContent[] = [
    {
      role: "user",
      parts: [
        { functionResponse: { name: "search_college_db", response: { output: "No relevant college data found." } } }
      ]
    }
  ];

  const messages = agentContentsToOllamaMessages(contents);

  assert.deepEqual(messages, [{ role: "tool", content: JSON.stringify({ output: "No relevant college data found." }) }]);
});

test("ollamaToolCallsToFunctionCalls returns an empty array for undefined tool_calls", () => {
  assert.deepEqual(ollamaToolCallsToFunctionCalls(undefined), []);
});

test("ollamaToolCallsToFunctionCalls maps Ollama tool_calls to ModelFunctionCall", () => {
  const result = ollamaToolCallsToFunctionCalls([
    { function: { name: "search_internet", arguments: { query: "NIRF 2026" } } }
  ]);

  assert.deepEqual(result, [{ name: "search_internet", args: { query: "NIRF 2026" } }]);
});
