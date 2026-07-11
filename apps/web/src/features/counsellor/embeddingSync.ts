export type EmbeddableSourceTable =
  | "campus_reality"
  | "college_clubs"
  | "college_facilities"
  | "college_location_details"
  | "scholarships";

export type EmbeddingSourceInput =
  | { sourceTable: "campus_reality"; collegeName: string; data: Record<string, unknown> }
  | { sourceTable: "college_facilities"; collegeName: string; data: Record<string, unknown> }
  | {
      sourceTable: "college_clubs";
      collegeName: string;
      clubName: string;
      clubCategory: string | null;
      description: string | null;
    }
  | {
      sourceTable: "college_location_details";
      collegeName: string;
      campusName: string | null;
      locality: string | null;
    }
  | { sourceTable: "scholarships"; name: string; provider: string; benefitDescription: string };

function isSummaryEntry(value: unknown): value is { summary: string } {
  return typeof value === "object" && value !== null && "summary" in value && typeof (value as { summary?: unknown }).summary === "string";
}

export function buildEmbeddingText(input: EmbeddingSourceInput): string {
  switch (input.sourceTable) {
    case "campus_reality":
    case "college_facilities": {
      const label = input.sourceTable === "campus_reality" ? "campus reality" : "facilities";
      const entries = Object.entries(input.data)
        .filter((entry): entry is [string, { summary: string }] => isSummaryEntry(entry[1]))
        .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value.summary}`);
      return `${input.collegeName} ${label}: ${entries.join("; ")}`;
    }
    case "college_clubs":
      return `${input.collegeName} club: ${input.clubName} (${input.clubCategory ?? "General"}). ${input.description ?? ""}`.trim();
    case "college_location_details":
      return `${input.collegeName} location: campus ${input.campusName ?? "Main"} in ${input.locality ?? "N/A"}.`;
    case "scholarships":
      return `${input.name} by ${input.provider}: ${input.benefitDescription}`;
  }
}

export type EmbeddingSourceRow = {
  sourceTable: EmbeddableSourceTable;
  sourceRowId: string;
  collegeId: string | null;
  contentType: string;
  textContent: string;
  updatedAt: string;
};

export type ExistingEmbeddingRow = {
  sourceTable: string;
  sourceRowId: string;
  updatedAt: string;
};

/** Pure diff: which source rows need a new or refreshed embedding. */
export function selectRowsNeedingEmbedding(
  sourceRows: EmbeddingSourceRow[],
  existing: ExistingEmbeddingRow[]
): EmbeddingSourceRow[] {
  const existingByKey = new Map(existing.map((row) => [`${row.sourceTable}:${row.sourceRowId}`, row.updatedAt]));

  return sourceRows.filter((row) => {
    const key = `${row.sourceTable}:${row.sourceRowId}`;
    const existingUpdatedAt = existingByKey.get(key);
    if (!existingUpdatedAt) return true;
    return new Date(row.updatedAt).getTime() > new Date(existingUpdatedAt).getTime();
  });
}
