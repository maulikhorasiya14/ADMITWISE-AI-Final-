import { Type, type FunctionDeclaration } from "@google/genai";
import type { fetchPublishedGroundingRecords } from "./counsellorService.ts";
import type { WebSearchResult } from "./webSearchService.ts";
import type { GroundingRecord } from "./counsellorTypes.ts";

export const searchCollegeDbDeclaration: FunctionDeclaration = {
  name: "search_college_db",
  description:
    "Search AdmitWise's published college database: cutoffs, fees, placements, scholarships, campus life, clubs, facilities and location. Always call this before search_internet.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Search query, reformulated from the student's question." },
      collegeIds: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Optional: restrict the search to these specific college IDs."
      }
    },
    required: ["query"]
  }
};

export const searchInternetDeclaration: FunctionDeclaration = {
  name: "search_internet",
  description:
    "Search the public internet. Only call this when search_college_db evidence is missing or insufficient to answer the question.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Web search query." }
    },
    required: ["query"]
  }
};

export const agentToolDeclarations: FunctionDeclaration[] = [searchCollegeDbDeclaration, searchInternetDeclaration];

export type ToolExecutionResult = {
  records: GroundingRecord[];
  responseForModel: Record<string, unknown>;
};

function formatRecordsForModel(records: GroundingRecord[]): string {
  return records.map((record) => `[${record.evidence.sourceId}] ${record.summary}`).join("\n");
}

export async function executeSearchCollegeDb(
  args: { query?: unknown; collegeIds?: unknown },
  deps: { fetchRecords?: typeof fetchPublishedGroundingRecords } = {}
): Promise<ToolExecutionResult> {
  // Lazily imported (not statically) so this module — which agentTools.test.ts
  // imports directly under plain `node --test` — never has to load
  // counsellorService.ts, which pulls in `server-only` and `@/`-aliased
  // modules that only resolve inside Next.js's webpack build. Every test
  // supplies deps.fetchRecords, so this dynamic import never actually runs
  // during `node --test`.
  const fetchRecords = deps.fetchRecords ?? (await import("./counsellorService.ts")).fetchPublishedGroundingRecords;
  const query = typeof args.query === "string" ? args.query : "";
  const collegeIds = Array.isArray(args.collegeIds) ? args.collegeIds.filter((id): id is string => typeof id === "string") : undefined;

  const result = await fetchRecords({
    question: query,
    collegeIds: collegeIds && collegeIds.length > 0 ? collegeIds : undefined
  });

  if (!result.success) {
    return { records: [], responseForModel: { output: `search_college_db error: ${result.message}` } };
  }
  if (result.data.length === 0) {
    return { records: [], responseForModel: { output: "No relevant college data found." } };
  }
  return { records: result.data, responseForModel: { output: formatRecordsForModel(result.data) } };
}

/** Mirrors webSearchService.ts's webSearchResultsToGroundingRecords exactly (see note below). */
function webResultsToGroundingRecords(results: WebSearchResult[]): GroundingRecord[] {
  return results.map((r) => ({
    publicationStatus: "unpublished" as const,
    evidence: { sourceId: `web:${r.url}`, sourceLabel: r.title, sourceType: "web_search", officialUrl: r.url },
    summary: `[WEB SOURCE — unverified] ${r.title}: ${r.content.slice(0, 400)}`
  }));
}

export async function executeSearchInternet(
  args: { query?: unknown },
  deps: { search?: (query: string, opts?: { maxResults?: number }) => Promise<WebSearchResult[]> } = {}
): Promise<ToolExecutionResult> {
  const query = typeof args.query === "string" ? args.query : "";

  if (query.trim().length < 3) {
    return { records: [], responseForModel: { output: "search_internet error: query too short." } };
  }

  try {
    // Lazily imported (not statically) so this module — which agentTools.test.ts
    // imports directly under plain `node --test` — never has to load
    // webSearchService.ts, which pulls in `server-only` and `@/`-aliased
    // modules that only resolve inside Next.js's webpack build. Every test
    // supplies deps.search, so this dynamic import never actually runs during
    // `node --test`. Records are built with the local webResultsToGroundingRecords
    // above (identical output to webSearchService.ts's version) so this path
    // never has to load that module either.
    const search = deps.search ?? (await import("./webSearchService.ts")).searchWeb;
    const results = await search(query, { maxResults: 5 });
    const records = webResultsToGroundingRecords(results);
    if (records.length === 0) {
      return { records: [], responseForModel: { output: "No web results found." } };
    }
    return { records, responseForModel: { output: formatRecordsForModel(records) } };
  } catch (err) {
    return { records: [], responseForModel: { output: `search_internet error: ${(err as Error).message}` } };
  }
}
