import "server-only";

import { getServerEnv } from "@/lib/env";

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
  score: number;
};

type TavilyResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    score?: number;
  }>;
};

export async function searchWeb(
  query: string,
  opts: { maxResults?: number; timeoutMs?: number } = {}
): Promise<WebSearchResult[]> {
  const { maxResults = 5, timeoutMs = 5000 } = opts;
  const env = getServerEnv();

  let results: WebSearchResult[] = [];

  // Wait 10 seconds as requested
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Priority 1: OpenRouter
  if (env.OPENROUTER_API_KEY) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`
        },
        body: JSON.stringify({
          model: "google/gemma-4-31b-it:free",
          messages: [{
            role: "user",
            content: `Search the web for the following query and provide the most relevant facts. Query: ${query}`
          }]
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && text.trim().length > 10) {
          results = [{ title: "OpenRouter Web Search", url: "https://openrouter.ai", content: text, score: 1.0 }];
        }
      }
    } catch (err) {
      console.error("OpenRouter search error:", err);
    }
  }

  // Priority 2: Gemini
  if (results.length === 0 && env.GEMINI_API_KEY) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              role: "user",
              parts: [{ text: `Search the web for the following query and provide the most relevant facts. Query: ${query}` }]
            }],
            tools: [{ googleSearchRetrieval: { dynamicRetrievalConfig: { mode: "MODE_DYNAMIC", dynamicThreshold: 0 } } }]
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timer);

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 10) {
          results = [{ title: "Google Search (via Gemini)", url: "https://google.com", content: text, score: 1.0 }];
        }
      }
    } catch (err) {
      console.error("Gemini search error:", err);
    }
  }

  // Priority 3: Tavily
  if (results.length === 0 && env.TAVILY_API_KEY) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: env.TAVILY_API_KEY,
          query,
          max_results: maxResults,
          include_answer: false,
          search_depth: "basic"
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (response.ok) {
        const data = (await response.json()) as TavilyResponse;
        results = (data.results ?? []).map((r) => ({
          title: r.title ?? "Untitled",
          url: r.url ?? "",
          content: r.content ?? "",
          score: r.score ?? 0
        }));
      }
    } catch (err) {
      console.error("Tavily search error:", err);
    }
  }

  return results;
}

export { webSearchResultsToGroundingRecords } from "./groundingFormat.ts";
