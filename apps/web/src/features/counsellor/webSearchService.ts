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
  if (!env.TAVILY_API_KEY) {
    return [];
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.TAVILY_API_KEY}`
      },
      body: JSON.stringify({
        query,
        max_results: maxResults,
        include_answer: false,
        search_depth: "basic"
      }),
      signal: controller.signal
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.error(`Tavily search failed: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as TavilyResponse;

    return (data.results ?? []).map((r) => ({
      title: r.title ?? "Untitled",
      url: r.url ?? "",
      content: r.content ?? "",
      score: r.score ?? 0
    }));
  } catch (err) {
    if ((err as Error)?.name !== "AbortError") {
      console.error("Tavily search error:", err);
    }
    return [];
  }
}

export { webSearchResultsToGroundingRecords } from "./groundingFormat.ts";
