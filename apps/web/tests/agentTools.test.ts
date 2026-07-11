import assert from "node:assert/strict";
import test from "node:test";
import { executeSearchCollegeDb, executeSearchInternet } from "../src/features/counsellor/agentTools.ts";
import type { GroundingRecord } from "../src/features/counsellor/counsellorTypes.ts";

const sampleRecord: GroundingRecord = {
  publicationStatus: "published",
  evidence: { sourceId: "cutoff:1", sourceLabel: "Demo cutoff", sourceType: "cutoff" },
  summary: "Demo College CSE closing rank 2000."
};

test("executeSearchCollegeDb returns formatted evidence when records are found", async () => {
  const result = await executeSearchCollegeDb(
    { query: "Demo College cutoff" },
    { fetchRecords: async () => ({ success: true, data: [sampleRecord] }) }
  );

  assert.equal(result.records.length, 1);
  assert.match(result.responseForModel.output as string, /Demo College CSE closing rank 2000/);
  assert.match(result.responseForModel.output as string, /\[cutoff:1\]/);
});

test("executeSearchCollegeDb returns the 'no data' sentinel when nothing matches", async () => {
  const result = await executeSearchCollegeDb(
    { query: "irrelevant" },
    { fetchRecords: async () => ({ success: true, data: [] }) }
  );

  assert.equal(result.records.length, 0);
  assert.equal(result.responseForModel.output, "No relevant college data found.");
});

test("executeSearchCollegeDb surfaces service errors without throwing", async () => {
  const result = await executeSearchCollegeDb(
    { query: "test" },
    { fetchRecords: async () => ({ success: false, code: "DATA_INCOMPLETE", message: "Supabase down", status: 500 }) }
  );

  assert.equal(result.records.length, 0);
  assert.match(result.responseForModel.output as string, /Supabase down/);
});

test("executeSearchCollegeDb passes through explicit collegeIds", async () => {
  let receivedCollegeIds: string[] | undefined;
  await executeSearchCollegeDb(
    { query: "compare", collegeIds: ["college-a", "college-b"] },
    {
      fetchRecords: async (opts) => {
        receivedCollegeIds = opts.collegeIds;
        return { success: true, data: [] };
      }
    }
  );

  assert.deepEqual(receivedCollegeIds, ["college-a", "college-b"]);
});

test("executeSearchInternet returns formatted evidence for web results", async () => {
  const result = await executeSearchInternet(
    { query: "latest NIRF ranking" },
    {
      search: async () => [{ title: "NIRF 2026", url: "https://example.com/nirf", content: "Ranking details.", score: 0.9 }]
    }
  );

  assert.equal(result.records.length, 1);
  assert.match(result.responseForModel.output as string, /NIRF 2026/);
});

test("executeSearchInternet returns a no-results sentinel", async () => {
  const result = await executeSearchInternet({ query: "obscure query" }, { search: async () => [] });

  assert.equal(result.responseForModel.output, "No web results found.");
});

test("executeSearchInternet rejects overly short queries without calling search", async () => {
  let called = false;
  const result = await executeSearchInternet(
    { query: "ab" },
    { search: async () => { called = true; return []; } }
  );

  assert.equal(called, false);
  assert.match(result.responseForModel.output as string, /too short/);
});
