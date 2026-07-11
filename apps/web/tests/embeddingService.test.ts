import assert from "node:assert/strict";
import test from "node:test";
import { embedText } from "../src/features/counsellor/embeddingService.ts";

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

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
    restoreEnv("NEXT_PUBLIC_SUPABASE_URL", previous.url);
    restoreEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", previous.anon);
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
