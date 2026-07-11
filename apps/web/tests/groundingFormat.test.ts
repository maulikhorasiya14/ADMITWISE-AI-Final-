import assert from "node:assert/strict";
import test from "node:test";
import { webSearchResultsToGroundingRecords } from "../src/features/counsellor/groundingFormat.ts";

test("webSearchResultsToGroundingRecords maps web results to unpublished grounding records", () => {
  const records = webSearchResultsToGroundingRecords([
    { title: "NIRF 2026", url: "https://example.com/nirf", content: "Ranking details go here.", score: 0.9 }
  ]);

  assert.equal(records.length, 1);
  assert.equal(records[0].publicationStatus, "unpublished");
  assert.equal(records[0].evidence.sourceId, "web:https://example.com/nirf");
  assert.equal(records[0].evidence.sourceType, "web_search");
  assert.match(records[0].summary, /NIRF 2026/);
});

test("webSearchResultsToGroundingRecords truncates content to 400 characters", () => {
  const longContent = "x".repeat(500);
  const records = webSearchResultsToGroundingRecords([
    { title: "Long", url: "https://example.com/long", content: longContent, score: 0.5 }
  ]);

  assert.equal(records[0].summary.length, "[WEB SOURCE — unverified] Long: ".length + 400);
});
