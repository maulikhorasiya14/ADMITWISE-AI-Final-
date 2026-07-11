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
