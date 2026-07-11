/**
 * Detects college names and branch keywords in a user question.
 * Uses simple substring/keyword matching against published college data.
 * No external NLP or vector search — fast and deterministic.
 */

export type CollegeSummaryForDetection = {
  id: string;
  name: string;
  shortName?: string | null;
  slug: string;
  city: string;
  state: string;
};

export type DetectionResult = {
  collegeIds: string[];
  detectedNames: string[];
  branchKeywords: string[];
};

/** Common branch name aliases used in student questions. */
const BRANCH_KEYWORD_MAP: Record<string, string[]> = {
  "Computer Science": ["cse", "cs", "computer science", "computer engineering", "comps", "b.tech cse"],
  "Information Technology": ["it", "information technology", "infotech"],
  "Electronics": ["ece", "electronics", "electrical and electronics", "e&tc", "entc", "extc"],
  "Electrical": ["eee", "electrical engineering", "ee"],
  "Mechanical": ["mechanical", "mech", "me"],
  "Civil": ["civil", "civil engineering", "ce"],
  "Chemical": ["chemical", "chem eng"],
  "Aerospace": ["aerospace", "aeronautical", "aero"],
  "Biotechnology": ["biotech", "biotechnology", "bioinformatics"],
  "Data Science": ["data science", "ds", "ai", "artificial intelligence", "machine learning", "ml"]
};

/**
 * Normalise text for matching: lowercase, collapse whitespace, strip punctuation.
 */
function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Build a set of searchable tokens for a college.
 */
function collegeTokens(college: CollegeSummaryForDetection): string[] {
  const tokens: string[] = [
    normalise(college.name),
    normalise(college.slug.replace(/-/g, " ")),
    normalise(college.city)
  ];
  if (college.shortName) {
    tokens.push(normalise(college.shortName));
  }
  // Also add abbreviation (first letters of each word)
  const abbrev = college.name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .toLowerCase();
  if (abbrev.length >= 2) {
    tokens.push(abbrev);
  }
  return tokens.filter((t) => t.length >= 2);
}

/**
 * Detect which published colleges are referenced in the question.
 */
export function detectCollegesInQuestion(
  question: string,
  colleges: CollegeSummaryForDetection[]
): DetectionResult {
  const normQuestion = normalise(question);
  const matched: CollegeSummaryForDetection[] = [];

  for (const college of colleges) {
    const tokens = collegeTokens(college);
    const isMatch = tokens.some((token) => {
      // Full token match (e.g. "iit bombay" in question)
      if (normQuestion.includes(token)) return true;
      // Word-boundary match for short tokens like abbreviations (e.g. "VJTI")
      if (token.length <= 6) {
        const wordBoundaryRegex = new RegExp(`\\b${token}\\b`);
        return wordBoundaryRegex.test(normQuestion);
      }
      return false;
    });

    if (isMatch) {
      matched.push(college);
    }
  }

  // Detect branch keywords
  const detectedBranches: string[] = [];
  for (const [branchName, aliases] of Object.entries(BRANCH_KEYWORD_MAP)) {
    const found = aliases.some((alias) => normQuestion.includes(alias));
    if (found) {
      detectedBranches.push(branchName);
    }
  }

  return {
    collegeIds: matched.map((c) => c.id),
    detectedNames: matched.map((c) => c.name),
    branchKeywords: detectedBranches
  };
}

/**
 * Fetch college summaries suitable for detection.
 * Called once per counsellor request and cached for that request.
 */
export function buildCollegeDetectionIndex(
  colleges: CollegeSummaryForDetection[]
): CollegeSummaryForDetection[] {
  return colleges;
}
