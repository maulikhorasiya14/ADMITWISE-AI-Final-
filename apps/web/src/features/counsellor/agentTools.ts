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
      "Search the public internet for current information. Use this for: (1) external rankings like NIRF, QS, Times Higher Education; (2) recent news or events about colleges; (3) any topic where search_college_db returned no relevant results. Do NOT use for data that is already in the college DB.",
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

export async function executeSearchInternet(
  args: { query?: unknown },
  deps: { search?: (query: string, opts?: { maxResults?: number }) => Promise<WebSearchResult[]> } = {}
): Promise<ToolExecutionResult> {
  const query = typeof args.query === "string" ? args.query : "";

  if (query.trim().length < 3) {
    return { records: [], responseForModel: { output: "search_internet error: query too short." } };
  }

  try {
    const search = deps.search ?? (await import("./webSearchService.ts")).searchWeb;
    const results = await search(query, { maxResults: 3 });
    const records = webSearchResultsToGroundingRecords(results);
    if (records.length === 0) {
      return { records: [], responseForModel: { output: "No web results found." } };
    }
    return { records, responseForModel: { output: formatRecordsForModel(records) } };
  } catch (err) {
    return { records: [], responseForModel: { output: `search_internet error: ${(err as Error).message}` } };
  }
}
