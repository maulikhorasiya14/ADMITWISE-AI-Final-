import assert from "node:assert/strict";
import test from "node:test";
import {
  buildEmbeddingText,
  selectRowsNeedingEmbedding,
  type EmbeddingSourceRow,
  type ExistingEmbeddingRow
} from "../src/features/counsellor/embeddingSync.ts";

test("buildEmbeddingText formats campus_reality from jsonb summary fields", () => {
  const text = buildEmbeddingText({
    sourceTable: "campus_reality",
    collegeName: "Demo College",
    data: {
      hostel_life: { summary: "Hostels are well maintained." },
      empty_field: { note: "no summary key here" }
    }
  });

  assert.match(text, /Demo College campus reality/);
  assert.match(text, /hostel life: Hostels are well maintained\./);
  assert.doesNotMatch(text, /empty_field/);
});

test("buildEmbeddingText formats a club record", () => {
  const text = buildEmbeddingText({
    sourceTable: "college_clubs",
    collegeName: "Demo College",
    clubName: "Robotics Club",
    clubCategory: "Technical",
    description: "Builds autonomous robots for national competitions."
  });

  assert.equal(
    text,
    "Demo College club: Robotics Club (Technical). Builds autonomous robots for national competitions."
  );
});

test("buildEmbeddingText formats a scholarship record", () => {
  const text = buildEmbeddingText({
    sourceTable: "scholarships",
    name: "Merit Scholarship",
    provider: "State Government",
    benefitDescription: "Covers full tuition for top rankers."
  });

  assert.equal(text, "Merit Scholarship by State Government: Covers full tuition for top rankers.");
});

test("selectRowsNeedingEmbedding includes rows with no existing embedding", () => {
  const rows: EmbeddingSourceRow[] = [
    {
      sourceTable: "college_clubs",
      sourceRowId: "club-1",
      collegeId: "college-1",
      contentType: "club",
      textContent: "Demo club",
      updatedAt: "2026-07-01T00:00:00.000Z"
    }
  ];

  const result = selectRowsNeedingEmbedding(rows, []);

  assert.deepEqual(result, rows);
});

test("selectRowsNeedingEmbedding excludes rows whose embedding is already current", () => {
  const rows: EmbeddingSourceRow[] = [
    {
      sourceTable: "college_clubs",
      sourceRowId: "club-1",
      collegeId: "college-1",
      contentType: "club",
      textContent: "Demo club",
      updatedAt: "2026-07-01T00:00:00.000Z"
    }
  ];
  const existing: ExistingEmbeddingRow[] = [
    { sourceTable: "college_clubs", sourceRowId: "club-1", updatedAt: "2026-07-02T00:00:00.000Z" }
  ];

  const result = selectRowsNeedingEmbedding(rows, existing);

  assert.deepEqual(result, []);
});

test("selectRowsNeedingEmbedding re-includes rows whose source changed after the last embedding", () => {
  const rows: EmbeddingSourceRow[] = [
    {
      sourceTable: "campus_reality",
      sourceRowId: "college-1",
      collegeId: "college-1",
      contentType: "campus_reality",
      textContent: "Updated campus reality text",
      updatedAt: "2026-07-05T00:00:00.000Z"
    }
  ];
  const existing: ExistingEmbeddingRow[] = [
    { sourceTable: "campus_reality", sourceRowId: "college-1", updatedAt: "2026-07-01T00:00:00.000Z" }
  ];

  const result = selectRowsNeedingEmbedding(rows, existing);

  assert.deepEqual(result, rows);
});
