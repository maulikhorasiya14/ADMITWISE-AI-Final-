# Gemini → Ollama/Tavily Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Gemini (chat/tool-calling brain and embeddings) with a local Ollama model (`qwen2.5:7b` + `nomic-embed-text`), merge the agentic-pipeline branch into `master`, push the pending hybrid-search migration to the linked remote Supabase project, and verify the full `pnpm run eval-counsellor` suite runs end-to-end with no quota limits.

**Architecture:** `OllamaAIProvider` replaces `GeminiAIProvider`, implementing the same `AIProvider` interface plus `streamWithAgent`. The provider-agnostic `agentLoop.ts` and tool executors in `agentTools.ts` are untouched; only the `callModel` closure, tool-declaration schema format, and embedding calls change, all via raw `fetch()` to Ollama's local REST API (`http://localhost:11434`).

**Tech Stack:** TypeScript, Next.js, Ollama HTTP API (`qwen2.5:7b`, `nomic-embed-text`), Supabase/pgvector, Zod, `node --test`.

## Global Constraints

- No new npm dependency for Ollama — use raw `fetch`, matching the existing Tavily pattern in `webSearchService.ts`.
- Embedding dimensionality stays 768 (`nomic-embed-text` output matches the existing `vector(768)` schema — verified locally).
- `agentLoop.ts` and the tool executors in `agentTools.ts` (`executeSearchCollegeDb`, `executeSearchInternet`) must not change.
- Files that are imported directly by `node --test` tests (`agentLoop.ts`, `agentTools.ts`, `counsellorCore.ts`, `counsellorTypes.ts`, and the new `groundingFormat.ts`/`ollamaMessages.ts`) must not import `"server-only"` or `"@/"`-aliased modules — those only resolve inside Next.js's webpack build.
- `GEMINI_API_KEY`/`GEMINI_MODEL` are fully removed, not kept as a fallback.

---

### Task 1: Merge the agentic-pipeline branch into `master`

**Files:** none (git operation) — affects the whole repo working tree.

**Interfaces:** N/A.

- [ ] **Step 1: Confirm both trees are clean**

Run (from the worktree):
```bash
cd ".claude/worktrees/ai-counsellor-agentic-pipeline" && git status --short
```
Expected: empty output.

Run (from the main repo root):
```bash
git status --short
```
Expected: only pre-existing untracked entries (`.claude/`, `supabase/.temp/*`) — no modified/staged files.

- [ ] **Step 2: Merge the branch into `master`**

From the main repo root (currently on `master`):
```bash
git merge worktree-ai-counsellor-agentic-pipeline --no-edit
```
Expected: a clean merge commit, no `CONFLICT` lines in the output (a dry-run `git merge-tree` confirmed no real conflicts — the only "conflict" string match was the literal code snippet `onConflict: "source_table,source_row_id"`).

- [ ] **Step 3: Verify the merge**

```bash
git status --short
git log --oneline -5
```
Expected: working tree clean; log shows the merge commit on top of `703e6a8` (the spec commit) and `31a22bb`.

- [ ] **Step 4: Install dependencies for the merged package set**

```bash
pnpm install
```
Expected: exits 0, lockfile unchanged (or updated only if pnpm normalizes it) — no new packages yet at this point.

- [ ] **Step 5: Commit**

No separate commit needed — Step 2's merge commit covers this task. Proceed to Task 2.

---

### Task 2: Extract shared `groundingFormat.ts` to remove the documented duplication

**Files:**
- Create: `apps/web/src/features/counsellor/groundingFormat.ts`
- Modify: `apps/web/src/features/counsellor/webSearchService.ts:78-95`
- Modify: `apps/web/src/features/counsellor/agentTools.ts:1-4,76-83,96-106`
- Test: `apps/web/tests/groundingFormat.test.ts`

**Interfaces:**
- Produces: `webSearchResultsToGroundingRecords(results: WebSearchResult[]): GroundingRecord[]` — the single shared implementation, importable both by `webSearchService.ts` (re-export) and `agentTools.ts` (direct import). No `"server-only"` or `"@/"` imports in this file.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/groundingFormat.test.ts`:
```ts
import assert from "node:assert/strict";
import test from "node:test";
import { webSearchResultsToGroundingRecords } from "../src/features/counsellor/groundingFormat.ts";

test("webSearchResultsToGroundingRecords maps web results to unpublished grounding records", () => {
  const records = webSearchResultsToGroundingRecords([
    { title: "NIRF 2026", url: "https://example.com/nirf", content: "Ranking details go here.", score: 0.9 }
  ]);

  assert.equal(records.length, 1);
  assert.equal(records[0].publicationStatus, "unpublished");
  assert.equal(records[0].evidence.sourceId, "web:https://example.com/nirf");
  assert.equal(records[0].evidence.sourceType, "web_search");
  assert.match(records[0].summary, /NIRF 2026/);
});

test("webSearchResultsToGroundingRecords truncates content to 400 characters", () => {
  const longContent = "x".repeat(500);
  const records = webSearchResultsToGroundingRecords([
    { title: "Long", url: "https://example.com/long", content: longContent, score: 0.5 }
  ]);

  assert.equal(records[0].summary.length, "[WEB SOURCE — unverified] Long: ".length + 400);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @admitwise/web exec node --test tests/groundingFormat.test.ts`
Expected: FAIL — cannot find module `../src/features/counsellor/groundingFormat.ts`.

- [ ] **Step 3: Create `groundingFormat.ts`**

Create `apps/web/src/features/counsellor/groundingFormat.ts`:
```ts
import type { WebSearchResult } from "./webSearchService.ts";
import type { GroundingRecord } from "./counsellorTypes.ts";

export function webSearchResultsToGroundingRecords(results: WebSearchResult[]): GroundingRecord[] {
  return results.map((r) => ({
    publicationStatus: "unpublished" as const,
    evidence: { sourceId: `web:${r.url}`, sourceLabel: r.title, sourceType: "web_search", officialUrl: r.url },
    summary: `[WEB SOURCE — unverified] ${r.title}: ${r.content.slice(0, 400)}`
  }));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @admitwise/web exec node --test tests/groundingFormat.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Point `webSearchService.ts` at the shared function**

In `apps/web/src/features/counsellor/webSearchService.ts`, replace lines 78-95 (the `import type { GroundingRecord }` line and the local `webSearchResultsToGroundingRecords` function) with:
```ts
// ── Convert to grounding records ──────────────────────────────────────────────

export { webSearchResultsToGroundingRecords } from "./groundingFormat.ts";
```

- [ ] **Step 6: Point `agentTools.ts` at the shared function**

In `apps/web/src/features/counsellor/agentTools.ts`, replace lines 76-83 (the `webResultsToGroundingRecords` comment + function) with nothing (delete them), then update the import block at the top (lines 1-4) to:
```ts
import { Type, type FunctionDeclaration } from "@google/genai";
import type { fetchPublishedGroundingRecords } from "./counsellorService.ts";
import type { WebSearchResult } from "./webSearchService.ts";
import type { GroundingRecord } from "./counsellorTypes.ts";
import { webSearchResultsToGroundingRecords } from "./groundingFormat.ts";
```

(The `Type`/`FunctionDeclaration` import from `@google/genai` is removed in Task 4 — leave it for now so this task's diff stays focused on the duplication fix.)

Then in `executeSearchInternet` (originally lines 85-114), update the two references:
- The call site `const records = webResultsToGroundingRecords(results);` → `const records = webSearchResultsToGroundingRecords(results);`
- The comment above the function (originally lines 96-104) — replace with:
```ts
  try {
    // Lazily imported (not statically) so this module — which agentTools.test.ts
    // imports directly under plain `node --test` — never has to load
    // webSearchService.ts's `searchWeb`, which pulls in `server-only` and
    // `@/`-aliased modules that only resolve inside Next.js's webpack build.
    // Every test supplies deps.search, so this dynamic import never actually
    // runs during `node --test`. webSearchResultsToGroundingRecords is a
    // static import (from groundingFormat.ts, which has no server-only/@
    // imports), so it's safe to use directly here.
    const search = deps.search ?? (await import("./webSearchService.ts")).searchWeb;
    const results = await search(query, { maxResults: 5 });
    const records = webSearchResultsToGroundingRecords(results);
```

- [ ] **Step 7: Run the full test suite to verify nothing broke**

Run: `pnpm --filter @admitwise/web run test`
Expected: PASS — `agentTools.test.ts` still passes unmodified (it tests behavior, not which module the formatting function lives in).

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/features/counsellor/groundingFormat.ts apps/web/src/features/counsellor/webSearchService.ts apps/web/src/features/counsellor/agentTools.ts apps/web/tests/groundingFormat.test.ts
git commit -m "refactor: extract shared webSearchResultsToGroundingRecords into groundingFormat.ts"
```

---

### Task 3: Ollama env config (replace Gemini config)

**Files:**
- Modify: `apps/web/src/lib/env.ts`
- Modify: `.env.example`
- Modify: `apps/web/tests/counsellor.test.ts:61-87`

**Interfaces:**
- Produces: `getServerEnv()` now returns `{ ..., TAVILY_API_KEY, OLLAMA_BASE_URL, OLLAMA_MODEL, OLLAMA_EMBED_MODEL }` (no more `GEMINI_API_KEY`/`GEMINI_MODEL`). `OLLAMA_BASE_URL` defaults to `"http://localhost:11434"`, `OLLAMA_MODEL` to `"qwen2.5:7b"`, `OLLAMA_EMBED_MODEL` to `"nomic-embed-text"`.

- [ ] **Step 1: Write the failing test (update the existing browser-env test)**

In `apps/web/tests/counsellor.test.ts`, replace the test at lines 61-87 (`"browser environment never includes Gemini or service-role secrets"`) with:
```ts
test("browser environment never includes service-role secrets", () => {
  const previous = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
    serviceRole: process.env.SUPABASE_SERVICE_ROLE_KEY
  };

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";

  try {
    const env = getBrowserEnv();
    assert.equal("SUPABASE_SERVICE_ROLE_KEY" in env, false);
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previous.url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previous.anon;
    process.env.NEXT_PUBLIC_APP_URL = previous.appUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = previous.serviceRole;
  }
});
```

- [ ] **Step 2: Run the test to verify it still passes against the current (Gemini) schema**

Run: `pnpm --filter @admitwise/web exec node --test tests/counsellor.test.ts`
Expected: PASS (this step is just confirming the renamed test is valid before the schema changes under it — the assertion no longer references `GEMINI_API_KEY` so it should already pass).

- [ ] **Step 3: Update `env.ts`**

Replace `apps/web/src/lib/env.ts` in full:
```ts
import { z } from "zod";

const browserEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().transform((url) => url.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000")
});

const optionalSecretSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().min(1).optional()
);

const serverEnvSchema = browserEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: optionalSecretSchema,
  TAVILY_API_KEY: optionalSecretSchema,
  OLLAMA_BASE_URL: z.string().url().optional().default("http://localhost:11434"),
  OLLAMA_MODEL: z.string().min(1).optional().default("qwen2.5:7b"),
  OLLAMA_EMBED_MODEL: z.string().min(1).optional().default("nomic-embed-text")
});

export function getBrowserEnv() {
  return browserEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  });
}

export function getServerEnv() {
  return serverEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    TAVILY_API_KEY: process.env.TAVILY_API_KEY,
    OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
    OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL
  });
}
```

- [ ] **Step 4: Update `.env.example`**

Replace `.env.example` (repo root) in full:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Web search for the AI counsellor's search_internet tool.
TAVILY_API_KEY=

# Local Ollama server for the AI counsellor's chat/tool-calling brain and embeddings.
# Defaults assume `ollama serve` is running locally with `ollama pull qwen2.5:7b`
# and `ollama pull nomic-embed-text` already done.
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_EMBED_MODEL=nomic-embed-text
```

- [ ] **Step 5: Run the test to verify it passes against the new schema**

Run: `pnpm --filter @admitwise/web exec node --test tests/counsellor.test.ts`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `pnpm --filter @admitwise/web run type-check`
Expected: FAILS at this point — `geminiProvider.ts`, `embeddingService.ts`, and `counsellorService.ts` still reference `GEMINI_API_KEY`/`GEMINI_MODEL`, which no longer exist on the schema. This is expected; those files are fixed in Tasks 6-8. Confirm the errors are only in those files (not in `env.ts` or `counsellor.test.ts`).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/lib/env.ts .env.example apps/web/tests/counsellor.test.ts
git commit -m "feat: replace Gemini env config with Ollama config"
```

---

### Task 4: Convert `agentTools.ts` tool declarations to Ollama's function-tool schema

**Files:**
- Modify: `apps/web/src/features/counsellor/agentTools.ts:1-37`
- Modify: `apps/web/tests/agentTools.test.ts:1-4`

**Interfaces:**
- Produces: `agentToolDeclarations: OllamaToolDeclaration[]`, `OllamaToolDeclaration` type — shape `{ type: "function"; function: { name: string; description: string; parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] } } }`. Task 6 (`ollamaProvider.ts`) consumes `agentToolDeclarations` by this exact shape.

- [ ] **Step 1: Write the failing test**

In `apps/web/tests/agentTools.test.ts`, update the import at line 3 to also bring in `agentToolDeclarations`:
```ts
import { agentToolDeclarations, executeSearchCollegeDb, executeSearchInternet } from "../src/features/counsellor/agentTools.ts";
```

Append this test at the end of the file:
```ts
test("agentToolDeclarations exposes search_college_db and search_internet as Ollama function-tool schemas", () => {
  assert.equal(agentToolDeclarations.length, 2);
  assert.deepEqual(agentToolDeclarations.map((decl) => decl.function.name), ["search_college_db", "search_internet"]);
  for (const decl of agentToolDeclarations) {
    assert.equal(decl.type, "function");
    assert.equal(decl.function.parameters.type, "object");
    assert.ok(decl.function.parameters.required?.includes("query"));
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @admitwise/web exec node --test tests/agentTools.test.ts`
Expected: FAIL — `decl.type` and `decl.function` are `undefined` on the current Gemini-shaped (`{ name, description, parameters: { type: Type.OBJECT, ... } }`) declarations.

- [ ] **Step 3: Rewrite the tool declarations**

Replace `apps/web/src/features/counsellor/agentTools.ts` lines 1-37 (imports through `agentToolDeclarations`) with:
```ts
import type { fetchPublishedGroundingRecords } from "./counsellorService.ts";
import type { WebSearchResult } from "./webSearchService.ts";
import type { GroundingRecord } from "./counsellorTypes.ts";
import { webSearchResultsToGroundingRecords } from "./groundingFormat.ts";

export type OllamaToolDeclaration = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

export const searchCollegeDbDeclaration: OllamaToolDeclaration = {
  type: "function",
  function: {
    name: "search_college_db",
    description:
      "Search AdmitWise's published college database: cutoffs, fees, placements, scholarships, campus life, clubs, facilities and location. Always call this before search_internet.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query, reformulated from the student's question." },
        collegeIds: {
          type: "array",
          items: { type: "string" },
          description: "Optional: restrict the search to these specific college IDs."
        }
      },
      required: ["query"]
    }
  }
};

export const searchInternetDeclaration: OllamaToolDeclaration = {
  type: "function",
  function: {
    name: "search_internet",
    description:
      "Search the public internet. Only call this when search_college_db evidence is missing or insufficient to answer the question.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Web search query." }
      },
      required: ["query"]
    }
  }
};

export const agentToolDeclarations: OllamaToolDeclaration[] = [searchCollegeDbDeclaration, searchInternetDeclaration];
```

(This also removes the `@google/genai` `Type`/`FunctionDeclaration` import entirely from this file — it's no longer needed.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @admitwise/web exec node --test tests/agentTools.test.ts`
Expected: PASS (all 7 tests, including the new one).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/counsellor/agentTools.ts apps/web/tests/agentTools.test.ts
git commit -m "feat: convert agent tool declarations to Ollama function-tool schema"
```

---

### Task 5: `ollamaMessages.ts` — pure `AgentContent` ↔ Ollama chat-message translation

**Files:**
- Create: `apps/web/src/features/counsellor/ollamaMessages.ts`
- Test: `apps/web/tests/ollamaMessages.test.ts`

**Interfaces:**
- Consumes: `AgentContent`, `ModelFunctionCall` from `./agentLoop.ts` (already defined, unchanged).
- Produces: `OllamaMessage` type, `OllamaToolCall` type, `agentContentsToOllamaMessages(contents: AgentContent[]): OllamaMessage[]`, `ollamaToolCallsToFunctionCalls(toolCalls: OllamaToolCall[] | undefined): ModelFunctionCall[]`, `providerResponseJsonSchema` (a plain JSON-schema object matching `ProviderResponse`'s shape, for Ollama's `format` parameter). Task 6 (`ollamaProvider.ts`) imports all of these.

This module must have **no** `"server-only"` or `"@/"`-aliased imports — it's imported directly by `ollamaMessages.test.ts` under plain `node --test`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/ollamaMessages.test.ts`:
```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @admitwise/web exec node --test tests/ollamaMessages.test.ts`
Expected: FAIL — cannot find module `../src/features/counsellor/ollamaMessages.ts`.

- [ ] **Step 3: Create `ollamaMessages.ts`**

Create `apps/web/src/features/counsellor/ollamaMessages.ts`:
```ts
import type { AgentContent, ModelFunctionCall } from "./agentLoop.ts";

// ── Ollama chat message types ─────────────────────────────────────────────────

export type OllamaToolCall = { function: { name: string; arguments: Record<string, unknown> } };

export type OllamaMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OllamaToolCall[];
};

// ── AgentContent -> Ollama messages ───────────────────────────────────────────

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

// ── Ollama tool_calls -> ModelFunctionCall ────────────────────────────────────

export function ollamaToolCallsToFunctionCalls(toolCalls: OllamaToolCall[] | undefined): ModelFunctionCall[] {
  if (!toolCalls) return [];
  return toolCalls.map((call) => ({ name: call.function.name, args: call.function.arguments ?? {} }));
}

// ── Structured-response JSON schema (for Ollama's `format` parameter) ─────────

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @admitwise/web exec node --test tests/ollamaMessages.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/counsellor/ollamaMessages.ts apps/web/tests/ollamaMessages.test.ts
git commit -m "feat: add pure AgentContent<->Ollama message translation helpers"
```

---

### Task 6: `ollamaProvider.ts` — `OllamaAIProvider` (replaces `GeminiAIProvider`)

**Files:**
- Create: `apps/web/src/features/counsellor/ollamaProvider.ts`

**Interfaces:**
- Consumes: `agentContentsToOllamaMessages`, `ollamaToolCallsToFunctionCalls`, `OllamaMessage`, `OllamaToolCall`, `providerResponseJsonSchema` from `./ollamaMessages.ts` (Task 5); `agentToolDeclarations`, `executeSearchCollegeDb`, `executeSearchInternet` from `./agentTools.ts` (Task 4); `runAgentToolLoop` from `./agentLoop.ts`; `buildAgentPrimerText`, `buildAgentToolContents`, `buildEvidenceBlock`, `buildMultiTurnContents` from `./counsellorCore.ts`; `getServerEnv` from `@/lib/env` (Task 3).
- Produces: `getOllamaConfig(): { baseUrl: string; model: string; embedModel: string }`, `checkOllamaReachable(baseUrl: string): Promise<{ success: boolean; message?: string }>`, `class OllamaAIProvider implements AIProvider` with `answer`, `stream`, and `streamWithAgent` (same signature as `GeminiAIProvider.streamWithAgent`). Task 7 consumes `OllamaAIProvider`, `getOllamaConfig`, `checkOllamaReachable`.

This file is not imported directly by any `node --test` test (mirrors `geminiProvider.ts`, which also had no direct test coverage — the pure logic it depends on is tested via `ollamaMessages.test.ts` instead). It is verified via type-check and the live `pnpm run eval-counsellor` run (Task 13).

- [ ] **Step 1: Create `ollamaProvider.ts`**

Create `apps/web/src/features/counsellor/ollamaProvider.ts`:
```ts
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
```

- [ ] **Step 2: Type-check just this file's syntax**

Run: `pnpm --filter @admitwise/web run type-check`
Expected: still FAILS overall (Task 7 hasn't wired this in yet, and `counsellorService.ts`/`route.ts`/`embeddingService.ts` still reference removed Gemini env vars) — but confirm there are **no** errors reported inside `ollamaProvider.ts` itself. If there are, fix them before proceeding.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/features/counsellor/ollamaProvider.ts
git commit -m "feat: add OllamaAIProvider implementing AIProvider and streamWithAgent"
```

---

### Task 7: Wire `OllamaAIProvider` into `counsellorService.ts` and `route.ts`; remove `geminiProvider.ts` and `@google/genai`

**Files:**
- Modify: `apps/web/src/features/counsellor/counsellorService.ts:10,135-151`
- Modify: `apps/web/src/app/api/counsellor/stream/route.ts:3,22-47,76`
- Delete: `apps/web/src/features/counsellor/geminiProvider.ts`
- Modify: `apps/web/package.json` (remove `@google/genai` dependency)

**Interfaces:**
- Consumes: `OllamaAIProvider`, `getOllamaConfig`, `checkOllamaReachable` from `./ollamaProvider` (Task 6).

- [ ] **Step 1: Confirm `geminiProvider.ts`'s exports are unused elsewhere**

Run:
```bash
grep -rn "readCounsellorStream\|StreamChunkPayload\|from ['\"].*geminiProvider['\"]\|from ['\"]@/features/counsellor/geminiProvider['\"]" apps/web/src
```
Expected: matches only inside `geminiProvider.ts` itself, `counsellorService.ts:10`, and `route.ts:3` (the two import sites being fixed in this task). `CounsellorChat.tsx` and `DashboardCounsellorChat.tsx` each define their own local `readCounsellorStream` — they don't import `geminiProvider.ts`'s copy.

- [ ] **Step 2: Update `counsellorService.ts`**

Replace line 10:
```ts
import { GeminiAIProvider, getGeminiConfig } from "./geminiProvider";
```
with:
```ts
import { OllamaAIProvider, getOllamaConfig, checkOllamaReachable } from "./ollamaProvider";
```

Replace lines 135-151 (the `if (!activeProvider) { ... }` block inside `answerCounsellorQuestion`):
```ts
  let activeProvider = provider;
  if (!activeProvider) {
    const ollamaConfig = getOllamaConfig();
    const reachable = await checkOllamaReachable(ollamaConfig.baseUrl);
    if (!reachable.success) {
      return {
        success: true,
        data: {
          answer: `Ollama is not reachable yet. ${reachable.message ?? ""} Run "ollama serve" and "ollama pull ${ollamaConfig.model}" on the server.`.trim(),
          status: "configuration_error",
          evidence: [],
          warnings: ["Ollama is not reachable."],
          missingData: ["AI provider configuration is incomplete."]
        }
      };
    }
    activeProvider = new OllamaAIProvider({ baseUrl: ollamaConfig.baseUrl, model: ollamaConfig.model });
  }
```

- [ ] **Step 3: Update `route.ts`**

Replace line 3:
```ts
import { GeminiAIProvider, getGeminiConfig } from "@/features/counsellor/geminiProvider";
```
with:
```ts
import { OllamaAIProvider, getOllamaConfig, checkOllamaReachable } from "@/features/counsellor/ollamaProvider";
```

Replace lines 22-47 (from `const geminiConfig = getGeminiConfig();` through the closing of the `if (!geminiConfig.success) { ... }` block):
```ts
    const ollamaConfig = getOllamaConfig();
    const reachability = await checkOllamaReachable(ollamaConfig.baseUrl);
    const encoder = new TextEncoder();

    if (!reachability.success) {
      const stream = new ReadableStream({
        start(controller) {
          const chunk: StreamChunk = {
            type: "meta",
            warnings: ["Ollama is not reachable."],
            missingData: ["AI provider configuration is incomplete."],
            status: "configuration_error"
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));

          const textChunk: StreamChunk = {
            type: "text",
            content: `Ollama is not reachable yet. ${reachability.message ?? ""} Run "ollama serve" and "ollama pull ${ollamaConfig.model}" on the server.`.trim()
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunk)}\n\n`));

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
          controller.close();
        }
      });
      return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
    }
```

Replace line 76:
```ts
    const provider = new GeminiAIProvider({ apiKey: geminiConfig.apiKey, model: geminiConfig.model });
```
with:
```ts
    const provider = new OllamaAIProvider({ baseUrl: ollamaConfig.baseUrl, model: ollamaConfig.model });
```

- [ ] **Step 4: Delete `geminiProvider.ts`**

```bash
rm apps/web/src/features/counsellor/geminiProvider.ts
```

- [ ] **Step 5: Remove `@google/genai` from `package.json`**

In `apps/web/package.json`, remove the line:
```json
    "@google/genai": "^2.10.0",
```
from `dependencies`.

Run:
```bash
pnpm install
```
Expected: exits 0, `@google/genai` removed from the lockfile.

- [ ] **Step 6: Confirm no remaining references to `@google/genai` or Gemini config**

Run:
```bash
grep -rn "@google/genai\|GEMINI_API_KEY\|GEMINI_MODEL\|GeminiAIProvider\|getGeminiConfig" apps/web/src apps/web/package.json
```
Expected: no matches.

- [ ] **Step 7: Type-check**

Run: `pnpm --filter @admitwise/web run type-check`
Expected: still FAILS at this point only on `embeddingService.ts` (Task 8 fixes it) — confirm `counsellorService.ts`, `route.ts`, and `ollamaProvider.ts` report no errors.

- [ ] **Step 8: Run the full test suite**

Run: `pnpm --filter @admitwise/web run test`
Expected: PASS — no test imports `geminiProvider.ts` or `counsellorService.ts`/`route.ts` directly (confirmed during design research), so this wiring change shouldn't break existing coverage.

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/features/counsellor/counsellorService.ts apps/web/src/app/api/counsellor/stream/route.ts apps/web/package.json pnpm-lock.yaml
git rm apps/web/src/features/counsellor/geminiProvider.ts
git commit -m "feat: wire OllamaAIProvider into counsellorService and the stream route, remove GeminiAIProvider"
```

---

### Task 8: `embeddingService.ts` — Ollama embeddings (replaces Gemini `text-embedding-004`)

**Files:**
- Modify: `apps/web/src/features/counsellor/embeddingService.ts`
- Test: `apps/web/tests/embeddingService.test.ts`

**Interfaces:**
- Consumes: `getServerEnv` from `../../lib/env.ts` (Task 3, for `OLLAMA_BASE_URL`/`OLLAMA_EMBED_MODEL`).
- Produces: `embedText(text: string, deps?: { fetchImpl?: typeof fetch }): Promise<number[]>` (same external signature as before, plus an optional injectable `fetchImpl` for testing — matches the `deps` injection pattern already used in `agentTools.ts`). `embeddingDimensions = 768` (unchanged, exported for `embeddingSync.ts` and the pgvector schema).

- [ ] **Step 1: Write the failing test**

Create `apps/web/tests/embeddingService.test.ts`:
```ts
import assert from "node:assert/strict";
import test from "node:test";
import { embedText } from "../src/features/counsellor/embeddingService.ts";

function withRequiredEnv<T>(fn: () => T): T {
  const previous = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  };
  process.env.NEXT_PUBLIC_SUPABASE_URL = previous.url ?? "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previous.anon ?? "anon-key";
  try {
    return fn();
  } finally {
    process.env.NEXT_PUBLIC_SUPABASE_URL = previous.url;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previous.anon;
  }
}

test("embedText posts to Ollama's /api/embed and returns the first embedding vector", async () => {
  await withRequiredEnv(async () => {
    let capturedUrl = "";
    let capturedBody: { model?: string; input?: string } = {};
    const fakeFetch = (async (url: string | URL, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ embeddings: [[0.1, 0.2, 0.3]] }), { status: 200 });
    }) as typeof fetch;

    const values = await embedText("Demo College campus reality", { fetchImpl: fakeFetch });

    assert.deepEqual(values, [0.1, 0.2, 0.3]);
    assert.match(capturedUrl, /\/api\/embed$/);
    assert.equal(capturedBody.model, "nomic-embed-text");
    assert.equal(capturedBody.input, "Demo College campus reality");
  });
});

test("embedText throws when Ollama returns no vector values", async () => {
  await withRequiredEnv(async () => {
    const fakeFetch = (async () => new Response(JSON.stringify({ embeddings: [] }), { status: 200 })) as typeof fetch;

    await assert.rejects(() => embedText("test", { fetchImpl: fakeFetch }), /did not include vector values/);
  });
});

test("embedText throws when the Ollama request fails", async () => {
  await withRequiredEnv(async () => {
    const fakeFetch = (async () => new Response("", { status: 500 })) as typeof fetch;

    await assert.rejects(() => embedText("test", { fetchImpl: fakeFetch }), /HTTP 500/);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm --filter @admitwise/web exec node --test tests/embeddingService.test.ts`
Expected: FAIL — current `embedText` doesn't accept a `deps` parameter and calls Gemini, so `GEMINI_API_KEY is required to generate embeddings.` is thrown instead.

- [ ] **Step 3: Rewrite `embeddingService.ts`**

Replace `apps/web/src/features/counsellor/embeddingService.ts` in full:
```ts
import { getServerEnv } from "../../lib/env.ts";

export const embeddingDimensions = 768;

type OllamaEmbedResponse = { embeddings?: number[][] };

export async function embedText(text: string, deps: { fetchImpl?: typeof fetch } = {}): Promise<number[]> {
  const env = getServerEnv();
  const fetchImpl = deps.fetchImpl ?? fetch;

  const response = await fetchImpl(`${env.OLLAMA_BASE_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: env.OLLAMA_EMBED_MODEL, input: text })
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding request failed: HTTP ${response.status}`);
  }

  const data = (await response.json()) as OllamaEmbedResponse;
  const values = data.embeddings?.[0];
  if (!values || values.length === 0) {
    throw new Error("Ollama embedding response did not include vector values.");
  }

  return values;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm --filter @admitwise/web exec node --test tests/embeddingService.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Type-check the whole project**

Run: `pnpm --filter @admitwise/web run type-check`
Expected: PASS with zero errors — this was the last file with a Gemini reference.

- [ ] **Step 6: Run the full test suite**

Run: `pnpm --filter @admitwise/web run test`
Expected: PASS — all test files, including `embeddingSync.test.ts` (its tests don't call `embedText` directly, only the pure `buildEmbeddingText`/`selectRowsNeedingEmbedding`, so they're unaffected).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/counsellor/embeddingService.ts apps/web/tests/embeddingService.test.ts
git commit -m "feat: switch embeddings from Gemini text-embedding-004 to Ollama nomic-embed-text"
```

---

### Task 9: Remove the Gemini rate-limit pacing from `eval-counsellor.ts`

**Files:**
- Modify: `apps/web/scripts/eval-counsellor.ts:11-16,85-93`

**Interfaces:** none (script only).

- [ ] **Step 1: Remove the pacing constants and comment**

In `apps/web/scripts/eval-counsellor.ts`, delete lines 11-16:
```ts
// Gemini's free tier caps generateContent at 5 requests/minute per model, and
// each question here can trigger several calls (tool-loop rounds + synthesis +
// evidence extraction), so questions are paced with a delay to avoid 429s
// drowning out the actual behavioral signal.
const delayBetweenQuestionsMs = 20000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
```

- [ ] **Step 2: Remove the pacing call from `main()`**

Replace the `main()` function (originally lines 85-93):
```ts
async function main() {
  console.log(`Running counsellor evaluation against ${baseUrl} with dummy profile "${dummyStudentProfile.id}"`);
  for (const entry of questions) {
    await askQuestion(entry);
  }
}
```

- [ ] **Step 3: Verify the script still parses/type-checks**

Run: `pnpm --filter @admitwise/web run type-check`
Expected: PASS (no new errors — `eval-counsellor.ts` isn't included in the test glob but is checked by `tsc`).

- [ ] **Step 4: Commit**

```bash
git add apps/web/scripts/eval-counsellor.ts
git commit -m "perf: remove Gemini rate-limit pacing from eval-counsellor now that Ollama has no quota"
```

---

### Task 10: Full local verification (install, type-check, full test suite)

**Files:** none — verification only.

- [ ] **Step 1: Clean install**

```bash
pnpm install
```
Expected: exits 0.

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @admitwise/web run type-check
```
Expected: PASS, zero errors.

- [ ] **Step 3: Lint**

```bash
pnpm --filter @admitwise/web run lint
```
Expected: PASS, no new lint errors introduced by this migration (pre-existing lint issues elsewhere in the repo, if any, are out of scope).

- [ ] **Step 4: Full test suite**

```bash
pnpm --filter @admitwise/web run test
```
Expected: PASS — every file under `apps/web/tests/*.test.ts`, including the five new/updated ones from Tasks 2-8 (`groundingFormat.test.ts`, `agentTools.test.ts`, `ollamaMessages.test.ts`, `embeddingService.test.ts`, `counsellor.test.ts`).

- [ ] **Step 5: Confirm Ollama models are pulled and the server is reachable**

```bash
ollama list
curl -s http://localhost:11434/api/tags
```
Expected: `qwen2.5:7b` and `nomic-embed-text` both listed; `curl` returns a JSON model list (HTTP 200). If `ollama serve` isn't running, start it before continuing to Task 12/13.

No commit for this task — it's a checkpoint before the live/remote steps.

---

### Task 11: Push the hybrid-search migration to the linked remote Supabase project

**Files:** none — infra operation. Migration file: `supabase/migrations/20260711120000_agent_hybrid_search.sql` (now on `master` after Task 1's merge).

This must happen **before** Task 12 — `.env.local`'s `NEXT_PUBLIC_SUPABASE_URL` points at the remote project (`fowasgrwksfekxjsklfa.supabase.co`), so the re-embed backfill in Task 12 needs the `content_embeddings` table to already exist remotely.

- [ ] **Step 1: Confirm the CLI is linked and authenticated**

```bash
npx supabase projects list
```
Expected: JSON listing the `admitwise-ai` project (`fowasgrwksfekxjsklfa`) with `"linked": true` (already confirmed during design).

- [ ] **Step 2: Check migration status against remote**

```bash
npx supabase migration list
```
Expected: `20260711120000_agent_hybrid_search` shows as present locally but not yet applied remotely (no matching remote timestamp).

- [ ] **Step 3: Push migrations**

```bash
npx supabase db push
```
Expected: prompts to confirm, applies `20260711120000_agent_hybrid_search.sql` (and any other unapplied migrations) to the remote database, exits 0.

**⚠️ This modifies the shared remote database.** Confirm with the user before running this step if not already explicitly authorized.

- [ ] **Step 4: Verify**

```bash
npx supabase migration list
```
Expected: `20260711120000_agent_hybrid_search` now shows as applied on both local and remote.

No commit — infra-only step.

---

### Task 12: Re-embed published content against Ollama

**Files:** none — runs the existing `apps/web/scripts/backfill-embeddings.ts` (unchanged by this plan; it calls `syncContentEmbeddings()`, which now calls the Task 8 `embedText()`).

- [ ] **Step 1: Run the backfill**

```bash
cd apps/web && pnpm run sync-embeddings
```
Expected: `Syncing content embeddings...` followed by `Embedded: N, skipped (already current): M` with `errors.length === 0`. This also confirms the `.env.local`-loading issue (item 4 from the original ask) is resolved — the script now runs from `apps/web` inside the single merged `master` tree, using the repo-root `.env.local` that's always been there (no more separate worktree without its own env file).

- [ ] **Step 2: Spot-check one embedded row**

```bash
cd "D:\Mehul\IIIT Pune\Hackathon\FlowZint 2026\AdmitWiseAI" && npx supabase db execute --linked --sql "select source_table, source_row_id, array_length(embedding::real[], 1) as dims from content_embeddings limit 3;"
```
Expected: 3 rows (or fewer if fewer than 3 exist), each with `dims = 768`.

No commit — this only writes data to Supabase, not to git.

---

### Task 13: Run `pnpm run eval-counsellor` end-to-end

**Files:** none — final live verification, using the script updated in Task 9.

- [ ] **Step 1: Start the dev server**

```bash
cd apps/web && pnpm dev
```
Leave this running in a separate terminal/background process.

- [ ] **Step 2: Run the eval script**

```bash
cd apps/web && pnpm run eval-counsellor
```
Expected: all 18 questions run back-to-back with no 20-second pacing delay and no 429/quota errors. Total runtime should be dramatically shorter than before (previously capped at ~4 completed questions before the daily quota hit).

- [ ] **Step 3: Manually review the console output against the checklist**

For each labeled question, confirm:
- `comparison` / `campus life` / `budget/ROI` / `placement reality` / `scholarship eligibility` / `multi-part` / `location` / `branch trade-off` / `college outside recommendations`: answer contains `[SOURCE:...]` citations backed by real evidence IDs from the printed `Evidence` array.
- `web search required` (NIRF ranking): evidence includes at least one entry with `sourceType: "web_search"` and a real `https://` URL.
- `no DB match` (stray dogs): `Meta` shows `status: "insufficient_data"`, answer does not fabricate a number.
- `prompt injection` and `prompt injection 2`: answer matches the refusal wording ("I can only answer from published AdmitWise evidence...") and `Meta` shows `status: "insufficient_data"` — confirming these are now actually exercised live, not just unit-tested.
- `safety - fabrication attempt`: answer refuses to invent a placement number (same refusal path as prompt injection, since `hasPromptInjectionAttempt`'s `fabricate|make up|invent` pattern catches it).
- `ambiguous` / `clarifying question expected`: answer asks a clarifying question rather than guessing.
- `out of scope`: answer declines the off-topic request.
- `follow-up (needs history)`: answer correctly resolves "the second one" using the supplied history.

If any of these fail, that's real signal to go fix the underlying agent/prompt behavior (in `counsellorCore.ts`'s system instruction or `ollamaProvider.ts`'s message translation) before considering this migration done — do not just relax the checklist.

- [ ] **Step 4: Stop the dev server**

Stop the `pnpm dev` process once review is complete.

No commit — this is a verification run, not a code change. If Step 3 surfaces a real bug, open a new task (not part of this plan) to fix it, following the systematic-debugging skill.

---

## Post-migration note (not a task — just a heads-up)

The old worktree at `.claude/worktrees/ai-counsellor-agentic-pipeline` (branch `worktree-ai-counsellor-agentic-pipeline`) is now redundant after Task 1's merge. It's left in place rather than auto-removed by this plan — removing a git worktree is a mildly destructive operation worth a deliberate `git worktree remove` from you when convenient, not something to bundle into an automated task.
