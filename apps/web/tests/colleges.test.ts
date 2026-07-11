import assert from "node:assert/strict";
import test from "node:test";
import {
  filterCollegesBySearchAndOwnership,
  filterPublishedColleges,
  getCollegeEmptyStateMessage
} from "../src/features/colleges/collegeFilters.ts";
import type { CollegeListItem } from "../src/features/colleges/collegeSchemas.ts";

const colleges: CollegeListItem[] = [
  {
    id: "published-1",
    slug: "published-college",
    name: "Published College",
    short_name: "Published",
    ownership: "GOVERNMENT",
    city: "Demo City",
    state: "Demo State",
    is_published: true
  },
  {
    id: "draft-1",
    slug: "draft-demo-college",
    name: "AdmitWise Draft Demo College",
    short_name: "Draft Demo College",
    ownership: "OTHER",
    city: "Demo City",
    state: "Demo State",
    is_published: false
  }
];

test("keeps draft colleges hidden from public results", () => {
  const result = filterPublishedColleges(colleges);

  assert.equal(result.length, 1);
  assert.equal(result[0]?.slug, "published-college");
});

test("filters published colleges by search and ownership", () => {
  const result = filterCollegesBySearchAndOwnership(colleges, "published", "GOVERNMENT");

  assert.equal(result.length, 1);
  assert.equal(result[0]?.name, "Published College");
});

test("returns a clear empty state message", () => {
  assert.equal(
    getCollegeEmptyStateMessage("", "ALL"),
    "No published colleges are available yet. Draft colleges stay hidden until they are verified and published."
  );
  assert.equal(
    getCollegeEmptyStateMessage("missing", "PRIVATE"),
    "No published colleges match the current search or ownership filter."
  );
});
