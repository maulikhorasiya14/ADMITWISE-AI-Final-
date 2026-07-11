import type { WebSearchResult } from "./webSearchService.ts";
import type { GroundingRecord } from "./counsellorTypes.ts";

export function webSearchResultsToGroundingRecords(results: WebSearchResult[]): GroundingRecord[] {
  return results.map((r) => ({
    publicationStatus: "unpublished" as const,
    evidence: { sourceId: `web:${r.url}`, sourceLabel: r.title, sourceType: "web_search", officialUrl: r.url },
    summary: `[WEB SOURCE — unverified] ${r.title}: ${r.content.slice(0, 400)}`
  }));
}
