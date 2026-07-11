# Gemini → Ollama/Tavily Migration Design

Date: 2026-07-11

## Context

The AI-counsellor agentic pipeline (`agentTools.ts`, `agentLoop.ts`, pgvector hybrid search,
`eval-counsellor.ts`) currently lives entirely on the branch/worktree
`worktree-ai-counsellor-agentic-pipeline`, not on `master`. It uses Gemini
(`@google/genai`) in two places:

1. **Chat / tool-calling brain** — `GeminiAIProvider.streamWithAgent()` in
   `geminiProvider.ts`, driving the provider-agnostic `runAgentToolLoop()` in
   `agentLoop.ts` via a `callModel` closure.
2. **Embeddings** — `embeddingService.ts`'s `embedText()`, used by the pgvector
   hybrid-search retrieval (`fetchHybridRecords()` in `counsellorService.ts`).

Web search already goes through Tavily directly (`webSearchService.ts`, raw
`fetch` to `api.tavily.com`) — there is no Gemini "grounding" feature in use, so
that part of the original ask is already satisfied.

Four outstanding items motivate this migration:

1. `pnpm run eval-counsellor`'s 18-question live smoke test hits Gemini's free-tier
   quota (20 requests/day, paced at 5 req/min) and can't complete a full run.
2. The hybrid-search Supabase migration (`20260711120000_agent_hybrid_search.sql`)
   only exists on the feature branch and has not reached the linked remote project.
3. `agentTools.ts` has a deliberate ~6-line duplicate of
   `webSearchResultsToGroundingRecords` (documented inline) to avoid pulling
   `server-only` imports into a plain-`node --test` file.
4. The embedding-backfill script fails locally — root-caused during design to a
   missing `.env.local` in the worktree (git worktrees don't share untracked
   files), not a genuine Docker/DB permission issue.

## Decisions (confirmed with user)

- Merge the agentic-pipeline branch into `master` first; do the Ollama swap on `master`.
- Address all four outstanding items in this pass.
- Move **both** the chat brain and embeddings off Gemini (full removal, not a
  fallback) — confirmed via local `ollama` install: `qwen2.5:7b` does native
  tool-calling and structured JSON-schema output; `nomic-embed-text` produces
  768-dim vectors, matching the existing `vector(768)` schema exactly (no
  migration changes needed).
- This is a local-dev/eval migration. Keep the `AIProvider` interface so a
  hosted provider could be plugged in for production later, but no Gemini
  fallback code is kept around now.
- Call Ollama via raw `fetch()` to `http://localhost:11434`, matching the
  existing Tavily pattern in `webSearchService.ts`. No new dependency.

## Architecture

`OllamaAIProvider` replaces `GeminiAIProvider`, implementing the same
`AIProvider` interface (`answer`/`stream`) plus a `streamWithAgent` method with
the same external behavior as today's. `agentLoop.ts` and the tool executors in
`agentTools.ts` require **no changes** — `AgentContent`, `CallModelResult`, and
`ToolExecutor` are already plain, provider-agnostic types with no `@google/genai`
coupling. The swap is isolated to: the `callModel` closure, the tool
*declaration* schema format, `embeddingService.ts`, and env/config plumbing.

## Components

- **New file** `ollamaProvider.ts` (replaces `geminiProvider.ts`):
  - `callModel` closure: POSTs `AgentContent[]` (mapped to Ollama's
    `messages`/`tool_calls` shape) to `${OLLAMA_BASE_URL}/api/chat` with
    `tools`, reads `message.tool_calls`, maps each to
    `{ name: tool_call.function.name, args: tool_call.function.arguments }` —
    the exact `CallModelResult` shape `agentLoop.ts` expects.
  - Structured-evidence extraction (equivalent of today's second Gemini call):
    uses Ollama's `format: <json-schema>` parameter (verified working against
    the local server).
  - `stream()`: `stream: true` against `/api/chat`, parsing newline-delimited
    JSON chunks into the same text-chunk contract `synthesizeStream` produces
    today.

- **`agentTools.ts`**: replace the `@google/genai` `Type`/`FunctionDeclaration`
  import with plain JSON Schema literals (`Type.OBJECT` → `"object"`,
  `Type.STRING` → `"string"`, `Type.ARRAY` → `"array"`), and wrap each
  declaration in Ollama's `{ type: "function", function: {...} }` envelope.
  Executors (`executeSearchCollegeDb`, `executeSearchInternet`) are untouched —
  zero SDK coupling.

  While touching this file: resolve the documented duplicate of
  `webSearchResultsToGroundingRecords`. Since the constraint driving the
  duplication (plain `node --test` can't resolve `server-only`/`@/`-aliased
  imports) is unrelated to the provider swap, fix it by extracting the shared
  formatting function into a small module with no `server-only`/aliased
  imports (e.g. `groundingFormat.ts`) that both `webSearchService.ts` and
  `agentTools.ts` import directly — removing the duplication without changing
  the test-isolation constraint that caused it.

- **`embeddingService.ts`**: `embedText()` calls
  `${OLLAMA_BASE_URL}/api/embed` with `OLLAMA_EMBED_MODEL` (default
  `nomic-embed-text`) instead of Gemini's `embedContent`. Same
  `(text: string) => Promise<number[]>` signature; `embeddingDimensions`
  stays `768`.

- **`env.ts`**: remove `GEMINI_API_KEY`/`GEMINI_MODEL` from `serverEnvSchema`;
  add `OLLAMA_BASE_URL` (default `http://localhost:11434`), `OLLAMA_MODEL`
  (default `qwen2.5:7b`), `OLLAMA_EMBED_MODEL` (default `nomic-embed-text`).
  `TAVILY_API_KEY` stays as-is (already present, already required for web
  search). Update `.env.example` to match (also currently missing
  `TAVILY_API_KEY`, which will be added here too).

- **`counsellorService.ts` / `route.ts`**: replace the "Gemini not configured"
  hardcoded-message branch with an Ollama-reachability check (attempt a
  lightweight call, e.g. `GET /api/tags`) producing an actionable message
  (`ollama serve` / `ollama pull qwen2.5:7b`) if it fails — same place in the
  flow the old check lived.

- **`package.json`**: remove `@google/genai`. No new runtime dependency added.

- **`eval-counsellor.ts`**: remove the 20s Gemini-rate-limit pacing (and its
  explanatory comment) between questions — Ollama has no request quota, so all
  18 questions run back-to-back.

## Data flow

Unchanged end-to-end shape: question → `hasPromptInjectionAttempt` guard (still
short-circuits before any model call, unit-tested, now finally exercised live
since eval can complete a full run) → `search_college_db` (DB-first hybrid
search, unchanged) → `search_internet` (Tavily, unchanged) → tool loop (now
driven by Ollama's `callModel`) → evidence block → streamed answer (Ollama
`stream()`) → structured-evidence extraction (now an Ollama JSON-schema call)
→ `validateProviderResponse` citation cross-check (unchanged — this is the
mechanism that prevents a fabricated `[SOURCE:id]` from reaching the user).

## Migration steps (ordered)

1. **Merge** `worktree-ai-counsellor-agentic-pipeline` into `master`. Check for
   conflicts first (master hasn't diverged much since the branch point).
2. **Swap** Gemini → Ollama on `master`, per the components above.
3. **Re-embed**: run `sync-embeddings` (backfill script) against Ollama. This
   also confirms the `.env.local` root cause (item 4) is resolved now that
   there's a single working tree sharing the repo-root `.env.local`.
4. **Push migration**: `supabase db push` to apply
   `20260711120000_agent_hybrid_search.sql` to the linked remote project
   (already authenticated/linked — confirmed via `supabase projects list`).
5. **Verify live**: run `pnpm run eval-counsellor` end-to-end — all 18
   questions, no rate limiting, including the two prompt-injection cases and
   the fabrication-refusal case that were previously never reached live.

## Testing

- `agentLoop.test.ts` and `agentTools.test.ts` (executor logic) need **no
  changes** — confirmed pure and provider-agnostic.
- `counsellor.test.ts` needs **no changes** — it uses `MockAIProvider`
  (`implements AIProvider`), never touches Gemini/Ollama directly.
- Add new unit tests for: the Ollama tool-call → `CallModelResult` mapping,
  and the JSON-schema structured-extraction response parsing — coverage the
  Gemini closure never had, now written against Ollama's equivalent logic.
- The consolidated `groundingFormat.ts` extraction should keep both existing
  call sites' behavior identical; existing tests for both should continue to
  pass unmodified (they test behavior, not which module the function lives in).

## Error handling

If Ollama isn't reachable or the configured model isn't pulled, surface a
clear, actionable message at the same point in the flow the old
"Add GEMINI_API_KEY..." message lived — telling the user to run `ollama serve`
and/or `ollama pull <model>`.

## Out of scope

- Production deployment of Ollama (self-hosted or otherwise) — this migration
  targets local dev/eval; the `AIProvider` interface is kept generic enough
  that a hosted provider could be added later without touching `agentLoop.ts`.
- Changing the pgvector index type, similarity weighting, or `match_documents`
  RPC — untouched, since embedding dimensionality is unchanged (768).
