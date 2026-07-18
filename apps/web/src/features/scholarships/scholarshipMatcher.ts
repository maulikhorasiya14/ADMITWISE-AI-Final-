import { calculateEffectiveCost } from "@admitwise/scoring";
import type { SavedStudentProfile } from "../profile/profileSchema.ts";
import type { CollegeScholarshipRecord, ScholarshipMatch, ScholarshipRecord } from "./scholarshipTypes.ts";

type MatchScholarshipsInput = {
  profile: SavedStudentProfile;
  scholarships: ScholarshipRecord[];
  collegeScholarships?: CollegeScholarshipRecord[];
  selectedCollegeId?: string;
  fourYearCollegeCost?: number | null;
  asOf?: Date;
};

export function matchScholarships(input: MatchScholarshipsInput): ScholarshipMatch[] {
  const publishedLinks = (input.collegeScholarships ?? []).filter(isPublishedCollegeScholarship);
  const allowedScholarshipIds = input.selectedCollegeId
    ? new Set(publishedLinks.filter((link) => link.college_id === input.selectedCollegeId).map((link) => link.scholarship_id))
    : null;

  return input.scholarships
    .filter(isPublishedScholarship)
    .filter((scholarship) => !allowedScholarshipIds || allowedScholarshipIds.has(scholarship.id))
    .map((scholarship) => evaluateScholarship({
      scholarship,
      profile: input.profile,
      fourYearCollegeCost: input.fourYearCollegeCost ?? null,
      availabilityNotes: publishedLinks.find((link) => link.scholarship_id === scholarship.id)?.availability_notes ?? null,
      asOf: input.asOf ?? new Date()
    }));
}

function evaluateScholarship(input: {
  scholarship: ScholarshipRecord;
  profile: SavedStudentProfile;
  fourYearCollegeCost: number | null;
  availabilityNotes: string | null;
  asOf: Date;
}): ScholarshipMatch {
  const reasons: string[] = [];
  const missingInformation: string[] = [];
  let disqualified = false;
  let deadlinePassed = false;

  const { scholarship, profile } = input;

  if (scholarship.application_deadline && isDeadlinePassed(scholarship.application_deadline, input.asOf)) {
    deadlinePassed = true;
    reasons.push("Application deadline has passed.");
  }

  if (scholarship.applicable_categories.length > 0 && !matchesList(scholarship.applicable_categories, profile.category)) {
    disqualified = true;
    reasons.push("Student category does not match this scholarship.");
  }

  if (scholarship.applicable_states.length > 0 && !matchesList(scholarship.applicable_states, profile.homeState)) {
    disqualified = true;
    reasons.push("Home state does not match this scholarship.");
  }

  if (scholarship.gender_requirement && !matchesGender(scholarship.gender_requirement, profile.gender)) {
    if (profile.gender === "PREFER_NOT_TO_SAY" || profile.gender === "OTHER") {
      missingInformation.push("gender eligibility");
    } else {
      disqualified = true;
      reasons.push("Gender requirement does not match this profile.");
    }
  }

  if (scholarship.maximum_family_income !== null) {
    const income = parseFamilyIncome(profile.familyIncomeBand);
    if (income === null) {
      missingInformation.push("family income");
    } else if (income > scholarship.maximum_family_income) {
      disqualified = true;
      reasons.push("Family income appears above the listed limit.");
    }
  }

  const bestRank = profile.exams.map(e => e.rank).filter((r): r is number => r !== undefined).sort((a, b) => a - b)[0];
  const bestPercentile = profile.exams.map(e => e.percentile ?? e.marks).filter((m): m is number => m !== undefined).sort((a, b) => b - a)[0];

  if (scholarship.minimum_rank !== null) {
    if (bestRank === undefined) {
      missingInformation.push("exam rank");
    } else if (bestRank > scholarship.minimum_rank) {
      disqualified = true;
      reasons.push("Rank does not meet the listed scholarship threshold.");
    }
  }

  if (scholarship.minimum_marks !== null) {
    if (bestPercentile === undefined) {
      missingInformation.push("marks or percentile");
    } else if (bestPercentile < scholarship.minimum_marks) {
      disqualified = true;
      reasons.push("Marks or percentile do not meet the listed scholarship threshold.");
    }
  }

  const status = deadlinePassed
    ? "deadline_passed"
    : disqualified
      ? "not_eligible"
      : missingInformation.length > 0
        ? "more_information_required"
        : "potentially_eligible";

  return {
    scholarship,
    status,
    reasons,
    missingInformation,
    possibleBenefitAmount: scholarship.benefit_amount,
    possibleBenefitDescription: scholarship.benefit_description,
    estimatedEffectiveCost: scholarship.benefit_amount !== null && input.fourYearCollegeCost !== null
      ? calculateEffectiveCost({
          fourYearCost: input.fourYearCollegeCost,
          scholarshipAmount: scholarship.benefit_amount
        }).score
      : null,
    availabilityNotes: input.availabilityNotes
  };
}

function isPublishedScholarship(scholarship: ScholarshipRecord) {
  return scholarship.is_published && scholarship.verification_status === "published";
}

function isPublishedCollegeScholarship(link: CollegeScholarshipRecord) {
  return link.is_published && link.verification_status === "published";
}

function isGlobalScholarship(scholarship: ScholarshipRecord) {
  return scholarship.applicable_states.length === 0 && scholarship.applicable_categories.length === 0;
}

function matchesList(values: string[], profileValue: string) {
  const normalizedProfileValue = normalize(profileValue);
  return values.some((value) => {
    const normalizedValue = normalize(value);
    return normalizedValue === "ALL" || normalizedValue === "ANY" || normalizedValue === normalizedProfileValue;
  });
}

function matchesGender(requirement: string, gender: SavedStudentProfile["gender"]) {
  const normalizedRequirement = normalize(requirement);
  if (["ALL", "ANY", "NO_REQUIREMENT"].includes(normalizedRequirement)) {
    return true;
  }

  return normalizedRequirement === normalize(gender);
}

function parseFamilyIncome(value?: string) {
  if (!value) {
    return null;
  }

  const normalized = value.toLowerCase().replaceAll(",", "");
  const matches = [...normalized.matchAll(/(\d+(?:\.\d+)?)\s*(lakh|lakhs|lac|l|k)?/g)];
  if (matches.length === 0) {
    return null;
  }

  const rupeeValues = matches.map((match) => {
    const amount = Number(match[1]);
    const unit = match[2];
    if (unit === "k") return amount * 1000;
    if (unit) return amount * 100000;
    return amount <= 100 ? amount * 100000 : amount;
  });

  return Math.max(...rupeeValues);
}

function isDeadlinePassed(deadline: string, asOf: Date) {
  const parsedDeadline = new Date(`${deadline}T23:59:59`);
  return Number.isFinite(parsedDeadline.getTime()) && parsedDeadline < asOf;
}

function normalize(value: string) {
  return value.trim().toUpperCase().replaceAll("-", "_").replaceAll(" ", "_");
}
