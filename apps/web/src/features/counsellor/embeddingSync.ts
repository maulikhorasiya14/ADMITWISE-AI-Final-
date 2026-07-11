import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "../../lib/env.ts";
import { serviceRoleAuthOptions } from "../../lib/supabase/adminCore.ts";
import { embedText } from "./embeddingService.ts";

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


function createEmbeddingSyncSupabaseClient() {
  const env = getServerEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for privileged server-side operations.");
  }
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: serviceRoleAuthOptions
  });
}

type CollegeNameRow = { id: string; name: string };

async function collectEmbeddingCandidates(
  supabase: ReturnType<typeof createEmbeddingSyncSupabaseClient>
): Promise<EmbeddingSourceRow[]> {
  const [campusReality, clubs, facilities, location, scholarships] = await Promise.all([
    supabase
      .from("campus_reality")
      .select("college_id, data, updated_at, colleges(id, name)")
      .eq("verification_status", "published"),
    supabase
      .from("college_clubs")
      .select("id, college_id, club_name, club_category, description, updated_at, colleges(id, name)")
      .eq("verification_status", "published"),
    supabase
      .from("college_facilities")
      .select("college_id, data, updated_at, colleges(id, name)")
      .eq("verification_status", "published"),
    supabase
      .from("college_location_details")
      .select("college_id, campus_name, locality, updated_at, colleges(id, name)")
      .eq("verification_status", "published"),
    supabase
      .from("scholarships")
      .select("id, name, provider, benefit_description, updated_at")
      .eq("verification_status", "published")
      .eq("is_published", true)
  ]);

  const rows: EmbeddingSourceRow[] = [];
  const college = (value: CollegeNameRow | CollegeNameRow[] | null) => (Array.isArray(value) ? value[0] : value ?? undefined);

  for (const row of campusReality.data ?? []) {
    const c = college(row.colleges as CollegeNameRow | CollegeNameRow[] | null);
    if (!c) continue;
    rows.push({
      sourceTable: "campus_reality",
      sourceRowId: row.college_id,
      collegeId: row.college_id,
      contentType: "campus_reality",
      textContent: buildEmbeddingText({ sourceTable: "campus_reality", collegeName: c.name, data: row.data ?? {} }),
      updatedAt: row.updated_at
    });
  }

  for (const row of clubs.data ?? []) {
    const c = college(row.colleges as CollegeNameRow | CollegeNameRow[] | null);
    if (!c) continue;
    rows.push({
      sourceTable: "college_clubs",
      sourceRowId: row.id,
      collegeId: row.college_id,
      contentType: "club",
      textContent: buildEmbeddingText({
        sourceTable: "college_clubs",
        collegeName: c.name,
        clubName: row.club_name,
        clubCategory: row.club_category,
        description: row.description
      }),
      updatedAt: row.updated_at
    });
  }

  for (const row of facilities.data ?? []) {
    const c = college(row.colleges as CollegeNameRow | CollegeNameRow[] | null);
    if (!c) continue;
    rows.push({
      sourceTable: "college_facilities",
      sourceRowId: row.college_id,
      collegeId: row.college_id,
      contentType: "facility",
      textContent: buildEmbeddingText({ sourceTable: "college_facilities", collegeName: c.name, data: row.data ?? {} }),
      updatedAt: row.updated_at
    });
  }

  for (const row of location.data ?? []) {
    const c = college(row.colleges as CollegeNameRow | CollegeNameRow[] | null);
    if (!c) continue;
    rows.push({
      sourceTable: "college_location_details",
      sourceRowId: row.college_id,
      collegeId: row.college_id,
      contentType: "location",
      textContent: buildEmbeddingText({
        sourceTable: "college_location_details",
        collegeName: c.name,
        campusName: row.campus_name,
        locality: row.locality
      }),
      updatedAt: row.updated_at
    });
  }

  for (const row of scholarships.data ?? []) {
    rows.push({
      sourceTable: "scholarships",
      sourceRowId: row.id,
      collegeId: null,
      contentType: "scholarship",
      textContent: buildEmbeddingText({
        sourceTable: "scholarships",
        name: row.name,
        provider: row.provider,
        benefitDescription: row.benefit_description
      }),
      updatedAt: row.updated_at
    });
  }

  return rows;
}

export async function syncContentEmbeddings(): Promise<{ embedded: number; skipped: number; errors: string[] }> {
  const supabase = createEmbeddingSyncSupabaseClient();
  const errors: string[] = [];
  let embedded = 0;

  const { data: existingRows, error: existingError } = await supabase
    .from("content_embeddings")
    .select("source_table, source_row_id, updated_at");
  if (existingError) {
    return { embedded: 0, skipped: 0, errors: [`Failed to load existing embeddings: ${existingError.message}`] };
  }

  const existing: ExistingEmbeddingRow[] = (existingRows ?? []).map((row) => ({
    sourceTable: row.source_table,
    sourceRowId: row.source_row_id,
    updatedAt: row.updated_at
  }));

  const candidates = await collectEmbeddingCandidates(supabase);
  const pending = selectRowsNeedingEmbedding(candidates, existing);

  for (const row of pending) {
    try {
      const vector = await embedText(row.textContent);
      const { error } = await supabase
        .from("content_embeddings")
        .upsert(
          {
            college_id: row.collegeId,
            content_type: row.contentType,
            source_table: row.sourceTable,
            source_row_id: row.sourceRowId,
            text_content: row.textContent,
            embedding: vector,
            verification_status: "published"
          },
          { onConflict: "source_table,source_row_id" }
        );
      if (error) {
        errors.push(`${row.sourceTable}:${row.sourceRowId} — ${error.message}`);
        continue;
      }
      embedded += 1;
    } catch (err) {
      errors.push(`${row.sourceTable}:${row.sourceRowId} — ${(err as Error).message}`);
    }
  }

  return { embedded, skipped: candidates.length - pending.length, errors };
}
