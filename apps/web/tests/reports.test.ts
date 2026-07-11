import assert from "node:assert/strict";
import test from "node:test";
import {
  buildReportSnapshot,
  canGenerateReport,
  canViewReport,
  isSafeReportEvidence,
  parseReportSnapshot
} from "../src/features/reports/reportCore.ts";
import { defaultReportSectionSelection, reportDisclaimer, reportGenerateRequestSchema } from "../src/features/reports/reportTypes.ts";
import type { CounsellorResponse } from "../src/features/counsellor/counsellorTypes.ts";
import type { ComparisonResult } from "../src/features/comparison/comparisonTypes.ts";
import type { SavedStudentProfile } from "../src/features/profile/profileSchema.ts";
import type { RecommendationViewModel } from "../src/features/recommendations/recommendationTypes.ts";
import type { ScholarshipMatch } from "../src/features/scholarships/scholarshipTypes.ts";

const profile: SavedStudentProfile = {
  id: "profile-1",
  exam: "JEE Main",
  examYear: 2025,
  rank: 9000,
  category: "GENERAL",
  gender: "PREFER_NOT_TO_SAY",
  homeState: "Maharashtra",
  homeCity: "Pune",
  preferredBranches: ["Computer Science"],
  preferredStates: ["Maharashtra"],
  collegeTypePreference: "BOTH",
  hostelRequired: true,
  maximumAnnualBudget: 200000,
  familyIncomeBand: "500000-800000",
  careerGoal: "SOFTWARE",
  weights: {
    admissionChance: 20,
    branchFit: 20,
    placement: 20,
    affordability: 15,
    scholarship: 10,
    location: 10,
    culture: 5
  }
};

const recommendation: RecommendationViewModel = {
  cutoffId: "cutoff-1",
  collegeId: "college-1",
  collegeSlug: "demo-college",
  collegeName: "Demo College",
  branchId: "branch-1",
  branchName: "Computer Science",
  classification: "SMART",
  overallScore: 76,
  componentScores: {
    admission: 70,
    branchFit: 100,
    placement: 0,
    affordability: 0,
    scholarship: 0,
    location: 60,
    culture: 0,
    confidence: 80
  },
  cutoff: {
    exam: "JEE Main",
    admissionYear: 2025,
    counsellingSystem: "JoSAA",
    round: "1",
    category: "GENERAL",
    quota: "HS",
    genderPool: "OPEN",
    openingRank: 5000,
    closingRank: 10000,
    sourceId: "source-cutoff-1"
  },
  missingData: ["fees"],
  warnings: ["Placement data is unavailable."]
};

const comparison: ComparisonResult = {
  mode: "student",
  winner: "left",
  options: [
    {
      side: "left",
      optionId: "college-1:branch-1",
      collegeName: "Demo College",
      collegeSlug: "demo-college",
      branchName: "Computer Science",
      admissionClassification: "SMART",
      admissionScore: 70,
      branchFitScore: 100,
      fourYearCost: 800000,
      effectiveCost: 750000,
      placementPercentage: 80,
      medianPackage: 8,
      averagePackage: 10,
      preferredPackageSource: "median",
      roiScore: 78,
      affordabilityScore: 72,
      placementScore: 80,
      dataConfidenceScore: 85,
      modeScore: 83,
      missingInformation: [],
      sourceLabels: ["Official fee notice (2025-26)", "Official placement report (2025)"]
    },
    {
      side: "right",
      optionId: "college-2:branch-2",
      collegeName: "Second College",
      collegeSlug: "second-college",
      branchName: "Electronics",
      admissionClassification: "AMBITIOUS",
      admissionScore: 45,
      branchFitScore: 20,
      fourYearCost: null,
      effectiveCost: null,
      placementPercentage: null,
      medianPackage: null,
      averagePackage: null,
      preferredPackageSource: "missing",
      roiScore: null,
      affordabilityScore: null,
      placementScore: null,
      dataConfidenceScore: 20,
      modeScore: 21,
      missingInformation: ["fees", "placements"],
      sourceLabels: []
    }
  ],
  categoryWinners: {
    admission: "left",
    branchFit: "left",
    fourYearCost: "insufficient_data",
    placementPercentage: "insufficient_data",
    package: "insufficient_data",
    roi: "insufficient_data",
    affordability: "insufficient_data",
    dataConfidence: "left",
    winner: "left"
  }
};

const scholarship: ScholarshipMatch = {
  scholarship: {
    id: "scholarship-1",
    name: "Demo Merit Support",
    provider: "Demo Provider",
    description: "Published scholarship fixture.",
    applicable_states: ["Maharashtra"],
    applicable_categories: ["GENERAL"],
    gender_requirement: null,
    maximum_family_income: 800000,
    minimum_marks: null,
    minimum_rank: 10000,
    benefit_amount: 50000,
    benefit_description: "INR 50,000 possible benefit",
    required_documents: ["Income certificate"],
    renewal_conditions: ["Renew annually"],
    application_deadline: "2026-12-31",
    official_url: "https://example.edu/scholarship",
    source_id: "source-scholarship-1",
    verification_status: "published",
    is_published: true,
    sources: {
      id: "source-scholarship-1",
      title: "Official scholarship notice",
      source_type: "official_college",
      academic_year: "2025-26",
      confidence_level: "A"
    }
  },
  status: "potentially_eligible",
  reasons: [],
  missingInformation: [],
  possibleBenefitAmount: 50000,
  possibleBenefitDescription: "INR 50,000 possible benefit",
  estimatedEffectiveCost: 750000,
  availabilityNotes: null
};

const counsellor: CounsellorResponse = {
  answer: "Demo College is a reasonable SMART option based on the listed cutoff evidence.",
  status: "grounded",
  evidence: [
    {
      sourceId: "source-cutoff-1",
      sourceLabel: "Official cutoff source",
      sourceType: "counselling_authority",
      recordYear: 2025
    },
    {
      sourceId: "unknown-source",
      sourceLabel: "Unknown source",
      sourceType: "counselling_authority"
    }
  ],
  warnings: [],
  missingData: []
};

function snapshot(overrides: Partial<Parameters<typeof buildReportSnapshot>[0]> = {}) {
  return buildReportSnapshot({
    title: "Report fixture",
    generatedAt: new Date("2026-06-25T00:00:00.000Z"),
    includedSections: defaultReportSectionSelection,
    profile,
    recommendations: [recommendation],
    comparison,
    scholarships: [scholarship],
    counsellorResponse: counsellor,
    ...overrides
  });
}

test("blocks report generation without a saved profile", () => {
  assert.equal(canGenerateReport(null), false);
  assert.equal(canGenerateReport(profile), true);
});

test("allows only the report owner to view a saved report", () => {
  assert.equal(canViewReport("user-1", "user-1"), true);
  assert.equal(canViewReport("user-1", "user-2"), false);
  assert.equal(canViewReport("user-1", null), false);
});

test("preserves recommendation classification and score breakdown", () => {
  const report = snapshot();

  assert.equal(report.recommendations[0]?.classification, "SMART");
  assert.equal(report.recommendations[0]?.componentScores.branchFit, 100);
});

test("includes optional comparison and missing fee or placement warnings", () => {
  const report = snapshot();

  assert.equal(report.comparison?.winner, "left");
  assert.ok(report.missingDataWarnings.includes("Second College: fees"));
  assert.ok(report.missingDataWarnings.includes("Second College: placements"));
});

test("handles report generation without comparison", () => {
  const report = snapshot({ comparison: null });

  assert.equal(report.comparison, null);
  assert.ok(report.missingDataWarnings.includes("No two-college comparison was included in this report."));
});

test("preserves scholarship eligibility status and effective-cost estimate", () => {
  const report = snapshot();

  assert.equal(report.scholarships[0]?.status, "potentially_eligible");
  assert.equal(report.scholarships[0]?.estimatedEffectiveCost, 750000);
});

test("excludes unsafe staging and raw evidence", () => {
  assert.equal(isSafeReportEvidence({ id: "staging-1", sourceType: "staging" }), false);
  assert.equal(isSafeReportEvidence({ id: "source-1", sourceType: "raw_extraction" }), false);
  assert.equal(isSafeReportEvidence({ id: "source-1", sourceType: "official_college" }), true);
});

test("includes only grounded counsellor summaries with known evidence", () => {
  const report = snapshot();

  assert.equal(report.counsellor?.status, "grounded");
  assert.deepEqual(report.counsellor?.evidenceIds, ["source-cutoff-1"]);
});

test("excludes insufficient counsellor summaries", () => {
  const report = snapshot({
    counsellorResponse: {
      ...counsellor,
      status: "insufficient_data",
      evidence: []
    }
  });

  assert.equal(report.counsellor, null);
});

test("includes source references and disclaimer", () => {
  const report = snapshot();

  assert.ok(report.evidence.some((item) => item.id === "source-cutoff-1"));
  assert.ok(report.evidence.some((item) => item.id === "source-scholarship-1"));
  assert.equal(report.disclaimer, reportDisclaimer);
});

test("validates malformed saved report snapshots", () => {
  const report = snapshot();
  const malformed = { ...report, schemaVersion: 999 };

  assert.equal(parseReportSnapshot(report).success, true);
  assert.equal(parseReportSnapshot(malformed).success, false);
});

test("report generation request ignores browser-supplied counsellor content", () => {
  const parsed = reportGenerateRequestSchema.parse({
    title: "Report fixture",
    profile,
    sections: defaultReportSectionSelection,
    counsellorResponse: counsellor
  });

  assert.equal("counsellorResponse" in parsed, false);
});

test("saved snapshot stays stable when source data changes later", () => {
  const saved = JSON.parse(JSON.stringify(snapshot())) as ReturnType<typeof snapshot>;
  const rebuilt = snapshot({
    recommendations: [
      {
        ...recommendation,
        classification: "UNLIKELY",
        overallScore: 10
      }
    ]
  });

  assert.equal(saved.recommendations[0]?.classification, "SMART");
  assert.equal(rebuilt.recommendations[0]?.classification, "UNLIKELY");
});
